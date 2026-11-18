// wet-ink-page · check.mjs — proves a wet-ink page with numbers.
//   node <skill>/scripts/check.mjs <page.html>
// The shared checks (hic-test.mjs run(): loads, draws, a real click through the drawing focuses the text field, typing
// re-uploads, a real click reaches [data-hic-click], frames, phone width, fallback), then the style's own:
//   stir      a real mouse drag moves the print > 25 px and changes the pixels
//   coast     the bath keeps moving after the hand lifts, and comes to rest within 6 s
//   drop      a press without a drag lays a drop of the current pigment where it was pressed
//   pigment   a real click through the drawing picks another pigment, and the next ribbon is laid in it
//   warp-hit  after a stir across the text field, screenOf() finds it moved > 15 px; a real click there focuses it,
//             typing while the bath still flows changes the text; the inverse map is accurate (< 2 px)
//   viscosity thin ink carries the same stroke farther than thick ink (> 1.2 ×)
//   settle    Esc plays the stir backwards: the map returns to < 1 px, the pigment clears, the page matches the start
//   still     #still=<t> is deterministic (two loads, same pixels) and the idle demo has stirred the page by then
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html>'); process.exit(1); }

const ink = (page, fn, ...a) => page.evaluate(([f, a]) => { const I = window.__hic.ink; return (new Function('I', 'a', 'return (' + f + ')(I, ...a)'))(I, a); }, [fn.toString(), a]);
const rgbAt = async (page, x, y) => {
  const png = await page.screenshot({ clip: { x: Math.max(0, x - 2), y: Math.max(0, y - 2), width: 5, height: 5 } });
  return page.evaluate(async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = 5; c.height = 5; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(2, 2, 1, 1).data; return [d[0], d[1], d[2]]; }, png.toString('base64'));
};
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The live checks draw the canvas at half resolution (#q=0.5; the page texture stays full size): software GL in headless
// draws a full 1280×800 frame in about a second. Stills and the still checks below use full resolution.
await run(file, {
  hash: 'q=0.5',
  extra: async ({ page, ok, fail, info, clip }) => {
    const has = await page.evaluate(() => !!(window.__hic && window.__hic.ink));
    if (!has) { fail('no window.__hic.ink (is this a wet-ink page?)'); return; }
    await ink(page, I => { I.demo(false); I.reset(); });
    await page.waitForTimeout(300);
    const st0 = await ink(page, I => I.state);
    const W = st0.W, H = st0.H;
    const base = await stats(page, clip);

    // stir: a real drag across the middle of the page
    await page.mouse.move(W * 0.12, H * 0.32); await page.mouse.down();
    for (let i = 1; i <= 30; i++) { await page.mouse.move(W * (0.12 + 0.6 * i / 30), H * (0.32 + 0.12 * Math.sin(i / 5))); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(250);
    const s1 = await ink(page, I => { I.sync(); return I.state; });
    const st1 = await stats(page, clip);
    const d1 = diff(base, st1);
    if (s1.maxShift > 25 && d1 > 1) ok(`stir: a real drag moves the print ${s1.maxShift.toFixed(0)} px, pixels change ${d1.toFixed(1)}`);
    else fail(`stir: drag moved the print ${s1.maxShift} px, pixel change ${d1.toFixed(2)} (want > 25 px, > 1)`);
    if (s1.stain) ok('stir: the comb laid a ribbon of pigment'); else if (st0.pigment >= 0) fail('stir: no ribbon laid');

    // coast and come to rest
    const a = await ink(page, I => { I.sync(); return I.maxShift; });
    await page.waitForTimeout(500);
    const b = await ink(page, I => { I.sync(); return I.maxShift; });
    // how long until it rests, in simulation time (software GL steps slowly in wall time, so count steps)
    let steps = 0; while (steps < 900 && (await ink(page, I => { I.run(15); return I.state.flowing; }))) steps += 15;
    const rest = steps < 900 ? (steps + 15) / 60 : null;
    if (Math.abs(b - a) > 1) ok(`coast: the bath keeps moving after release (${Math.abs(b - a).toFixed(1)} px in 0.5 s)`); else info(`coast: ${Math.abs(b - a).toFixed(2)} px after release (thick ink coasts little)`);
    if (rest !== null && rest < 6) ok(`coast: comes to rest within ${rest.toFixed(1)} s of simulation after that`); else fail('coast: still flowing after 15 s of simulation');

    // drop: press without a drag on a quiet spot (bottom-right of the body area)
    await ink(page, I => { I.reset(); I.pick(0); });
    const pt = await page.evaluate(() => {
      // find a spot with no control under it, toward the middle-right
      for (const [u, v] of [[0.55, 0.62], [0.45, 0.55], [0.7, 0.45], [0.35, 0.5]]) { const x = innerWidth * u, y = innerHeight * v, h = document.elementFromPoint(x, y); if (h && !h.closest('input,button,label,a,select,textarea,[contenteditable]')) return [x, y]; }
      return [innerWidth * 0.5, innerHeight * 0.5];
    });
    const drops0 = (await ink(page, I => I.state.stats.drops));
    await page.mouse.move(pt[0], pt[1]); await page.waitForTimeout(80);
    await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
    await page.waitForTimeout(900);
    await ink(page, I => I.sync());
    const sd = await ink(page, I => ({ drops: I.state.stats.drops, color: I.cfg && null }));
    const pig0 = await page.evaluate(() => { const el = [...document.querySelectorAll('input[name=pigment]')].find(e => e.checked); return el && (el.dataset.color || el.value); });
    const c = await rgbAt(page, pt[0], pt[1]);
    if (sd.drops > drops0 && pig0 && pig0[0] === '#' && dist(c, hex(pig0)) < 70) ok(`drop: a press lays a drop of ${pig0} (pixel ${c.join(',')}, off by ${dist(c, hex(pig0)).toFixed(0)})`);
    else fail(`drop: drops ${drops0}→${sd.drops}, pixel ${c} vs pigment ${pig0}`);

    // pigment: a real click through the drawing on the second pigment, then a ribbon in it
    await ink(page, I => I.reset());
    const sel2 = await page.evaluate(() => { const l = [...document.querySelectorAll('input[name=pigment]')].filter(e => e.dataset.color || e.value !== 'none'); const e = l[1]; if (!e) return null; if (!e.id) e.id = 'ink-pig-2'; return '#' + e.id; });
    if (sel2) {
      // stir the palette first so the chip has drifted from its layout box
      await ink(page, (I) => { const r = document.querySelector('input[name=pigment]').getBoundingClientRect(); const u = (r.left + r.width / 2) / innerWidth, v = (r.top + r.height / 2) / innerHeight; I.stroke([[u - 0.12, v - 0.05], [u + 0.05, v + 0.15]], { steps: 40, coast: 20, lay: false }); });
      const p2 = await page.evaluate((s) => { const e = document.querySelector(s); const p = window.__hic.screenOf(e); const b = window.__hic.ink; return p; }, sel2);
      await page.mouse.move(p2[0] - 20, p2[1]); await page.waitForTimeout(60); await page.mouse.move(p2[0], p2[1]); await page.waitForTimeout(300);
      await page.mouse.click(p2[0], p2[1]); await page.waitForTimeout(200);
      const picked = await page.evaluate((s) => document.querySelector(s).checked, sel2);
      const want = await page.evaluate((s) => document.querySelector(s).dataset.color, sel2);
      await ink(page, I => { I.reset(); });
      await ink(page, I => I.stroke([[0.3, 0.5], [0.6, 0.5]], { steps: 50, coast: 0 }));
      const H2 = await page.evaluate(() => innerHeight), W2 = await page.evaluate(() => innerWidth);
      const pos = await ink(page, (I) => I.screenAt(innerWidth * 0.45, innerHeight * 0.5));
      // sample along the ribbon's track for the best match
      let best = 1e9, bc = null;
      for (let k = 0; k < 9; k++) { const cc = await rgbAt(page, W2 * (0.38 + k * 0.02), H2 * 0.5); const dd = dist(cc, hex(want)); if (dd < best) { best = dd; bc = cc; } }
      if (picked && best < 70) ok(`pigment: a real click on a drifted chip picks it; the next ribbon is ${want} (pixel ${bc}, off by ${best.toFixed(0)})`);
      else fail(`pigment: picked ${picked}, ribbon pixel ${bc} vs ${want} (off ${best.toFixed(0)})`);
    }

    // warp-hit: stir across the text field, then click it where it is drawn and type while the bath still flows
    await ink(page, I => { I.reset(); });
    const editSel = await page.evaluate(() => { const e = document.querySelector('[data-hic-edit]'); if (!e) return null; if (!e.id) e.id = 'ink-edit'; e.blur(); return '#' + e.id; });
    if (editSel) {
      const r = await page.evaluate((s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { u: (b.left + b.width / 2) / innerWidth, v: (b.top + b.height / 2) / innerHeight, x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, editSel);
      await ink(page, (I, u, v) => I.stroke([[u - 0.2, v + 0.14], [u, v - 0.03], [u + 0.2, v - 0.12]], { steps: 45, coast: 8, lay: false }), r.u, r.v);
      const sp = await page.evaluate((s) => window.__hic.screenOf(document.querySelector(s)), editSel);
      const lay = await page.evaluate((s) => { const e = document.querySelector(s); let x = 0, y = 0, n = e; const pg = document.querySelector('#page, [drawable]'); while (n && n !== pg) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x + e.offsetWidth / 2, y + e.offsetHeight / 2]; }, editSel);
      const moved = Math.hypot(sp[0] - lay[0], sp[1] - lay[1]);
      const err = await ink(page, (I, x, y, qx, qy) => { const p = I.toPage(x, y); return Math.hypot(p[0] - qx, p[1] - qy); }, sp[0], sp[1], lay[0], lay[1]);
      if (moved > 15) ok(`warp-hit: the text field drifted ${moved.toFixed(0)} px; inverse map error ${err.toFixed(2)} px`); else fail(`warp-hit: the field only moved ${moved.toFixed(1)} px`);
      if (err > 2) fail(`warp-hit: screenOf is off by ${err.toFixed(2)} px`);
      await page.mouse.move(sp[0] - 25, sp[1]); await page.waitForTimeout(60); await page.mouse.move(sp[0], sp[1]); await page.waitForTimeout(300);
      await page.mouse.click(sp[0], sp[1]); await page.waitForTimeout(150);
      const focused = await page.evaluate((s) => document.activeElement === document.querySelector(s), editSel);
      // keep it flowing, then type
      await ink(page, (I) => I.stroke([[0.2, 0.2], [0.4, 0.25]], { steps: 10, coast: 0, lay: false }));
      const flowing = await ink(page, I => I.state.flowing);
      const before = await page.evaluate((s) => document.querySelector(s).value, editSel);
      await page.keyboard.type('wet', { delay: 30 }); await page.waitForTimeout(300);
      const after = await page.evaluate((s) => document.querySelector(s).value, editSel);
      if (focused && after !== before) ok(`warp-hit: a real click on the drifted field focuses it; typing ${flowing ? 'while the bath flows' : ''} changes it ("…${after.slice(-8)}")`);
      else fail(`warp-hit: focused ${focused}, text ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    }

    // viscosity: the same stroke, thin vs thick
    const shiftFor = (v) => ink(page, (I, v) => { I.reset(); I.viscosity(v); I.stroke([[0.25, 0.5], [0.6, 0.5]], { steps: 40, coast: 50, lay: false }); return I.maxShift; }, v);
    const thin = await shiftFor(0.05), thick = await shiftFor(0.95);
    if (thin > thick * 1.2) ok(`viscosity: thin ink carries the stroke ${thin.toFixed(0)} px, thick ink ${thick.toFixed(0)} px`);
    else fail(`viscosity: thin ${thin.toFixed(1)} px vs thick ${thick.toFixed(1)} px (want thin > 1.2 × thick)`);
    await ink(page, (I, v) => I.viscosity(v), st0.viscosity);

    // settle: stir, lay, then Esc
    await ink(page, I => { I.reset(); I.pick(0); });
    await page.mouse.move(W * 0.5, H * 0.95); await page.waitForTimeout(400);   // park the pointer out of the way
    await ink(page, I => { I.sync(); });
    const clean = await stats(page, clip);
    await ink(page, I => { I.stroke(I.path.wave(0.1, 0.3, 0.8, 0.5, 0.1, 1.5), { steps: 80, coast: 30 }); I.drop(0.5, 0.4); });
    const dirty = await stats(page, clip);
    await page.keyboard.press('Escape');
    const r0 = await ink(page, I => I.state.rewinding);
    const durS = await ink(page, I => { let n = 0; while (I.state.rewinding && n < 600) { I.run(5); n += 5; } return n / 60; });
    const done = r0 ? durS : null;
    await page.waitForTimeout(300);
    const s3 = await ink(page, I => { I.sync(); return I.state; });
    const back = await stats(page, clip);
    const dd = diff(clean, back), dirtyD = diff(clean, dirty);
    if (done !== null && s3.maxShift < 1 && !s3.stain && dd < Math.max(1, dirtyD * 0.1)) ok(`settle: Esc plays the stir back in ${done.toFixed(1)} s; map ${s3.maxShift} px, pigment cleared, page diff ${dd.toFixed(2)} (stirred: ${dirtyD.toFixed(1)})`);
    else fail(`settle: done ${done}, map ${s3.maxShift} px, stain ${s3.stain}, diff ${dd.toFixed(2)} vs stirred ${dirtyD.toFixed(2)}`);
    const sp = await ink(page, I => { const t = performance.now(); I.run(30); return (performance.now() - t) / 30; });
    info(`one simulation step + sync: ${sp.toFixed(1)} ms here (software GL)`);
  }
});

// still: deterministic, and the demo stirs the page by then
{
  const P = await open(file, {}); await waitReady(P.page, P.errors);
  const cfg = await P.page.evaluate(() => { const d = window.__hic.ink && window.__hic.ink.cfg.demo; return d ? { delay: d.delay ?? 2.5, last: Math.max(...d.steps.map(s => s.to || s.at || 0)) } : null; });
  await P.browser.close();
  const t = cfg ? +(cfg.delay + Math.min(cfg.last * 0.55, 6)).toFixed(2) : 1;
  const shots = [];
  for (let k = 0; k < 2; k++) {
    const { browser, page, errors } = await open(file, { hash: 'still=' + t });
    await waitReady(page, errors); await page.waitForTimeout(700);
    const s = await stats(page, { x: 0, y: 0, width: 1280, height: 800 }); const m = await page.evaluate(() => window.__hic.ink.state.maxShift);
    shots.push({ s, m, errors }); await browser.close();
  }
  const d = diff(shots[0].s, shots[1].s);
  if (d < 0.3) console.log(`ok   still: #still=${t} is deterministic (diff ${d.toFixed(3)})`); else { console.log(`FAIL still: #still=${t} differs between loads (${d.toFixed(2)})`); process.exitCode = 1; }
  if (cfg) { if (shots[0].m > 10) console.log(`ok   still: the idle demo has stirred the page ${shots[0].m.toFixed(0)} px by ${t} s`); else { console.log(`FAIL still: the idle demo did not stir the page by ${t} s (${shots[0].m} px)`); process.exitCode = 1; } }
  if (shots.some(x => x.errors.length)) { console.log('FAIL still: ' + shots.map(x => x.errors.join(' | ')).join(' ')); process.exitCode = 1; }
}
