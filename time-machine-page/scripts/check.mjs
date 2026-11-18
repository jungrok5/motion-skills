// check.mjs — proves a time-machine page with numbers.   node scripts/check.mjs <page.html>
// The shared HTML-in-Canvas checks (scripts/hic-test.mjs: loads, draws, a real click focuses the headline, typing
// re-uploads, a real click reaches the log button, frames, phone width, the plain-page fallback), then this style's own:
//   eras      every era compiles, draws (luma spread, colours) and looks unlike every other era (pairwise pixel diff)
//   live      in every era a real click through the drawing (warps inverted) focuses the note field, typing lands, and
//             the button files the note; the notes written in one era are still there in the next
//   dial      a real drag on the dial starts a journey: the camera dives (peak zoom), the era changes, and it lands
//             (simulated seconds to arrive); the dial and ← → keys also travel
//   motion    an era with film passes keeps moving at rest; a static era is still; #calm is still everywhere
//   magnify   the wheel magnifies toward the pointer (zoom ≥ 2) and a click still lands on what is drawn
//   xray      the X-ray button shows the raw page (pixels change) and back
//   sound     no audio before a gesture; the sound button turns it on and off
//   fallback  with the feature off the dial still changes the era of the plain page
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check.mjs <page.html>'); process.exit(2); }
const HASH = 'nohint&q=0.5';
const ev = (page, f, a) => page.evaluate(f, a);
const wait = ms => new Promise(r => setTimeout(r, ms));

async function waitTex(page, i, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await ev(page, i => __tm.state().texReady[i], i)) return true; await wait(120); }
  return false;
}
async function toEra(page, i) { await ev(page, i => __tm.go(i, { instant: true }), i); await waitTex(page, i); await wait(500); }
async function clickThrough(page, sel) {
  const pt = await ev(page, sel => { const el = document.querySelector(sel), c = document.querySelector('canvas').getBoundingClientRect(), p = __hic.screenOf(el); return { x: c.left + p[0], y: c.top + p[1] }; }, sel);
  await page.mouse.move(pt.x - 20, pt.y); await wait(80);
  await page.mouse.move(pt.x, pt.y); await wait(260);
  await page.mouse.click(pt.x, pt.y); await wait(160);
  return pt;
}
// run the journey on simulated time: 0.1 s steps, watching zoom; returns seconds until it lands (or -1)
async function ride(page, limit = 8) {
  let t = 0;
  while (t < limit) {
    await ev(page, () => __tm.advance(0.1)); await wait(70); t += 0.1;
    if (!(await ev(page, () => __tm.busy))) return t;
  }
  return -1;
}

await run(file, {
  hash: HASH, settle: 800, typeSettle: 1500,
  extra: async ({ page, ok, fail, info, clip }) => {
    const ids = await ev(page, () => __tm.ids);
    if (ids.length < 2 || ids.length > 6) fail(`${ids.length} eras (give 3–5)`); else ok(`${ids.length} eras: ${ids.join(' · ')}`);
    // ---- eras: draw and differ; live in every era
    const sigs = [];
    const notes0 = await ev(page, () => document.querySelectorAll('[data-log-list] li').length);
    for (let i = 0; i < ids.length; i++) {
      await toEra(page, i);
      const s = await stats(page, clip); sigs.push(s);
      if (s.spread < 6 || s.colours < 10) fail(`era ${ids[i]} looks blank (spread ${s.spread}, ${s.colours} colours)`);
      else info(`era ${ids[i]}: luma ${s.mean}, spread ${s.spread}, ${s.colours} colours`);
      const inp = await ev(page, () => { const e = document.querySelector('[data-log-input]'); if (!e) return null; if (!e.id) e.id = 'tm-note-probe'; return '#' + e.id; });
      if (!inp) { fail('no [data-log-input] in the page'); continue; }
      const pt = await clickThrough(page, inp);
      const focused = await ev(page, s => document.activeElement === document.querySelector(s), inp);
      await page.keyboard.type('n' + i, { delay: 30 });
      const val = await ev(page, s => document.querySelector(s).value, inp);
      if (!focused || !val.endsWith('n' + i)) fail(`era ${ids[i]}: a click at (${pt.x | 0}, ${pt.y | 0}) on the note field did not let me type (focused ${focused}, value "${val}")`);
      else {
        const add = await ev(page, () => { const e = document.querySelector('[data-log-add]'); if (!e.id) e.id = 'tm-add-probe'; return '#' + e.id; });
        await clickThrough(page, add);
        const n = await ev(page, () => document.querySelectorAll('[data-log-list] li').length);
        const first = await ev(page, () => { const li = document.querySelector('[data-log-list] li'); return li ? li.textContent : ''; });
        if (!first.includes('n' + i)) fail(`era ${ids[i]}: the note was not filed (list: "${first}")`);
        else ok(`era ${ids[i]}: a real click through the drawing types into the note field and files it ("${first.trim()}", ${n} notes)`);
      }
      await ev(page, () => document.activeElement && document.activeElement.blur());
    }
    const notes1 = await ev(page, () => document.querySelectorAll('[data-log-list] li').length);
    const kept = await ev(page, () => [...document.querySelectorAll('[data-log-list] li')].map(l => l.textContent).join('|'));
    if (!kept.includes('n0')) fail('the note written in the first era did not travel with the page'); else ok(`notes travel with the page (${notes0} → ${notes1}, the first era's note still there)`);
    let minD = 1e9, pair = '';
    for (let a = 0; a < sigs.length; a++) for (let b = a + 1; b < sigs.length; b++) { const d = diff(sigs[a], sigs[b]); if (d < minD) { minD = d; pair = ids[a] + '/' + ids[b]; } }
    if (minD < 10) fail(`eras ${pair} look alike (pixel diff ${minD.toFixed(1)})`); else ok(`every era looks unlike the others (closest pair ${pair}: diff ${minD.toFixed(1)})`);

    // ---- motion at rest
    const animated = await ev(page, () => __tm.animated);
    const rest = [];
    for (let i = 0; i < ids.length; i++) {
      await toEra(page, i);
      const a = await stats(page, clip); await wait(600); const b = await stats(page, clip);
      const d = diff(a, b); rest.push(ids[i] + ' ' + d.toFixed(2));
      if (animated[i] && d < 0.15) fail(`era ${ids[i]} has moving passes but stands still at rest (diff ${d.toFixed(2)})`);
      if (!animated[i] && d > 0.5) fail(`era ${ids[i]} is static but its pixels change at rest (diff ${d.toFixed(2)})`);
    }
    ok(`at rest, moving eras move and static eras hold (frame diffs: ${rest.join(', ')})`);

    // ---- dial: a real drag
    await toEra(page, 0);
    await ev(page, () => { __tm.zoomPeak = 1; });
    const drum = await ev(page, () => { const r = document.querySelector('.tm-drum').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, sp: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-sp')) || 100 }; });
    const sBefore = await stats(page, clip);
    await page.mouse.move(drum.x, drum.y); await page.mouse.down();
    for (let k = 1; k <= 8; k++) { await page.mouse.move(drum.x - drum.sp * 1.1 * k / 8, drum.y); await wait(40); }
    await page.mouse.up(); await wait(150);
    const started = await ev(page, () => ({ busy: __tm.busy, era: __tm.era }));
    if (!started.busy) fail('a drag on the dial did not start a journey');
    else {
      await ev(page, () => __tm.advance(0.62)); await wait(250);
      const sMid = await stats(page, clip);
      const t = await ride(page);
      const peak = await ev(page, () => __tm.zoomPeak);
      const end = await ev(page, () => ({ era: __tm.era, zoom: __tm.zoom, index: __tm.index }));
      if (t < 0) fail('the journey never landed (8 simulated s)');
      else if (end.index !== 1) fail(`the drag landed on era ${end.era}, not ${ids[1]}`);
      else if (peak < 6) fail(`the camera did not dive into the page (peak zoom ${peak.toFixed(1)})`);
      else ok(`a real drag on the dial travels ${ids[0]} → ${end.era}: dives to ×${peak.toFixed(1)}, lands ${t.toFixed(1)} simulated s after the stepped dive, zoom back to ${end.zoom.toFixed(2)}`);
      info(`pixel change at the bottom of the dive: ${diff(sBefore, sMid).toFixed(1)}`);
    }
    // arrows and keys
    await ev(page, () => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('ArrowRight'); await wait(150);
    const k1 = await ev(page, () => ({ busy: __tm.busy, index: __tm.index }));
    await ride(page);
    const k2 = await ev(page, () => __tm.index);
    if (k2 !== 2 || !k1.busy) fail(`→ key: busy ${k1.busy}, landed on ${k2}`); else ok('the → key travels one era on');
    const prev = await ev(page, () => { const r = document.querySelector('.tm-prev').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(prev.x, prev.y); await wait(150); await ride(page);
    if ((await ev(page, () => __tm.index)) !== 1) fail('the ‹ button did not travel back'); else ok('the ‹ button travels back');
    // a long jump passes through the eras between
    await ev(page, n => __tm.go(n - 1), ids.length);
    await ev(page, () => __tm.go(0)); await wait(100);
    const tl = await ride(page, 12);
    if ((await ev(page, () => __tm.index)) !== 0) fail('a queued journey back to the first era did not land'); else ok(`journeys queue: a jump to the last era and straight back lands on ${ids[0]} (${tl.toFixed(1)} simulated s for the second)`);

    // ---- magnify
    await toEra(page, 0);
    const hl = await ev(page, () => { const c = document.querySelector('canvas').getBoundingClientRect(), p = __hic.screenOf(document.querySelector('[data-hic-edit]')); return { x: c.left + p[0], y: c.top + p[1] }; });
    await page.mouse.move(hl.x, hl.y);
    for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, -160); await wait(80); }
    for (let k = 0; k < 10; k++) { await ev(page, () => __tm.advance(0.05)); await wait(60); }
    const z = await ev(page, () => __tm.zoom);
    await clickThrough(page, '[data-hic-edit]');
    const hf = await ev(page, () => document.activeElement === document.querySelector('[data-hic-edit]'));
    if (z < 2) fail(`the wheel did not magnify (zoom ${z.toFixed(2)})`); else if (!hf) fail(`magnified ×${z.toFixed(1)}: a click on the headline did not focus it`);
    else ok(`the wheel magnifies to ×${z.toFixed(1)} and a real click still lands on the headline`);
    await ev(page, () => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Escape'); for (let k = 0; k < 10; k++) { await ev(page, () => __tm.advance(0.05)); await wait(50); }

    // ---- x-ray
    const xb = await ev(page, () => { const r = document.querySelector('.tm-xray').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const x0 = await stats(page, clip);
    await page.mouse.click(xb.x, xb.y); await wait(500);
    const x1 = await stats(page, clip), on = await ev(page, () => __tm.xray);
    await page.mouse.click(xb.x, xb.y); await wait(400);
    if (!on || diff(x0, x1) < 5) fail(`X-ray: on ${on}, pixel change ${diff(x0, x1).toFixed(1)}`); else ok(`X-ray shows the raw page (pixel change ${diff(x0, x1).toFixed(1)}) and back`);

    // ---- sound
    const a0 = await ev(page, () => __tm.audio);
    const sb = await ev(page, () => { const r = document.querySelector('.tm-sound').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(sb.x, sb.y); await wait(200); const a1 = await ev(page, () => __tm.audio);
    await page.mouse.click(sb.x, sb.y); await wait(200); const a2 = await ev(page, () => __tm.audio);
    if (a0 !== 'off' || a1 !== 'on' || a2 !== 'muted') fail(`sound: ${a0} → ${a1} → ${a2} (want off → on → muted)`); else ok('sound is off until the button; then on, then muted');
  }
});

// ---- calm: no motion at rest in any era
{
  const { browser, page, errors } = await open(file, { hash: 'nohint&q=0.5&calm' });
  await waitReady(page, errors);
  const clip = { x: 0, y: 0, width: 1280, height: 700 };
  let worst = 0;
  const n = await ev(page, () => __tm.ids.length);
  for (let i = 0; i < n; i++) {
    await toEra(page, i);
    const a = await stats(page, clip); await wait(500); const b = await stats(page, clip);
    worst = Math.max(worst, diff(a, b));
  }
  if (worst > 0.5) { console.log(`FAIL #calm: the page still moves at rest (diff ${worst.toFixed(2)})`); process.exitCode = 1; }
  else console.log(`ok   #calm: every era is still at rest (largest frame diff ${worst.toFixed(2)})`);
  if (errors.length) { console.log('FAIL #calm: ' + errors.join(' | ')); process.exitCode = 1; }
  await browser.close();
}
// ---- the plain page keeps its dial
{
  const { browser, page, errors } = await open(file, { feature: false });
  await waitReady(page, errors, 15000);
  const e0 = await ev(page, () => document.querySelector('#page').getAttribute('data-era'));
  await page.click('.tm-next'); await wait(200);
  const e1 = await ev(page, () => document.querySelector('#page').getAttribute('data-era'));
  const over = await ev(page, () => document.documentElement.scrollWidth - innerWidth);
  if (e0 === e1) { console.log('FAIL feature off: the dial did not change the era of the plain page'); process.exitCode = 1; }
  else console.log(`ok   feature off: the dial still turns the plain page (${e0} → ${e1}), ${over}px sideways scroll`);
  await browser.close();
}
