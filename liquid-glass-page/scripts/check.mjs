// liquid-glass-page · check.mjs — proves a liquid page with numbers.
//   node <skill>/scripts/check.mjs index.html
// The shared checks (hic-test.mjs run()): loads with the feature on, draws, a real click through the water focuses the
// text field, typing re-uploads, a real click reaches [data-hic-click], frames keep coming, phone width, fallback.
// Then this skill's own checks:
//   beads      the page opens wet: ≥ 30 beads covering ≥ 0.3 % of the page, the liquid config is in range
//   refracts   the water changes the picture against the plain page (mean pixel diff ≥ 1.5), and less at n = 1.00
//              than at n = 1.52 (the index really bends the page)
//   ripple     a click on bare page raises a ripple (height ≥ 0.3) that settles to ≤ 25 % within 3 s
//   fingertip  a pointer sweep over bare page leaves ≥ 8 new beads
//   lens       the big drop follows a drag (moves ≥ 150 px), comes to rest (< 6 px/s) within 1.5 s of release, magnifies
//              (the button under it is drawn ≥ 3 px from its layout place) and a real click through it reaches the button
//   select     a double-click on live text through the water selects a word
//   splash     [data-liquid=splash] adds ≥ 25 beads; [data-liquid=wipe] dries ≥ 85 % of them within 2 s (simulated)
//   still      two loads at #still=1 give the same picture (diff < 0.5)
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html>'); process.exit(1); }

const CONTROL = 'input,button,select,textarea,a,label,summary,[contenteditable],[role=button],[role=slider],fieldset';

async function bare(page, avoid = []) {
  // a point on bare page: no control under it, away from the big drop and from the given points
  return await page.evaluate(({ CONTROL, avoid }) => {
    const st = window.__liquid.state(), h = st.hero;
    for (let j = 0; j < 400; j++) {
      const x = 40 + ((j * 97) % 23) / 23 * (innerWidth - 80), y = 60 + ((j * 61) % 19) / 19 * (innerHeight - 120);
      if (Math.hypot(x - h.x, y - h.y) < h.r + 60) continue;
      if (avoid.some(a => Math.hypot(x - a[0], y - a[1]) < 120)) continue;
      const el = document.elementFromPoint(x, y);
      if (!el || el.closest(CONTROL) || el.closest('.bench,.live,.bar,[data-liquid-dry]')) continue;
      return [x, y];
    }
    return [innerWidth * .3, innerHeight * .85];
  }, { CONTROL, avoid });
}
const S = page => page.evaluate(() => window.__liquid.state());

await run(file, {
  extra: async ({ page, ok, fail, info, clip }) => {
    // beads + config
    let st = await S(page);
    if (st.drops >= 30 && st.cover >= .003) ok(`opens wet: ${st.drops} beads cover ${(st.cover * 100).toFixed(1)} % of the page`);
    else fail(`too dry: ${st.drops} beads, ${(st.cover * 100).toFixed(2)} % covered`);
    const m = await page.evaluate(() => ({ ior: window.__liquid.params.ior, mat: window.__liquid.mat }));
    const bad = [];
    if (!(m.ior >= 1 && m.ior <= 2.6)) bad.push('ior ' + m.ior);
    if (!(m.mat.cap > 0 && m.mat.cap <= 1)) bad.push('cap ' + m.mat.cap);
    if (!(m.mat.ripple.speed > 0 && m.mat.ripple.speed < 1.96)) bad.push('ripple.speed ' + m.mat.ripple.speed);
    if (!(m.mat.ripple.damp > .8 && m.mat.ripple.damp <= 1)) bad.push('ripple.damp ' + m.mat.ripple.damp);
    if (!(m.mat.bead[0] >= 1.5 && m.mat.bead[1] >= m.mat.bead[0])) bad.push('bead ' + m.mat.bead);
    if (bad.length) fail('liquid config out of range: ' + bad.join(', ')); else ok(`liquid config in range (n ${m.ior}, cap ${m.mat.cap}, slide ${m.mat.slide}, metal ${m.mat.metal})`);

    // refraction: water vs plain page, and the index matters
    const look = async (o) => {
      await page.evaluate(o => { window.__liquid.freeze(true); window.__liquid.set(o); window.__liquid.redraw(); }, o);
      await page.waitForTimeout(250);
      return await stats(page, clip);
    };
    const ior0 = await page.evaluate(() => window.__liquid.params.ior);
    const plain = await look({ plain: true });
    const wet = await look({ plain: false });
    const air = await look({ ior: 1.0 }), glass = await look({ ior: 1.52 });
    await look({ ior: ior0 }); await page.evaluate(() => window.__liquid.freeze(false));
    const dW = diff(plain, wet), dA = diff(plain, air), dG = diff(plain, glass);
    if (dW >= 1.5) ok(`the liquid bends and lights the page (diff against the plain page ${dW.toFixed(2)})`); else fail(`the liquid barely changes the page (diff ${dW.toFixed(2)})`);
    if (dA < dG) ok(`the index matters: diff at n 1.00 ${dA.toFixed(2)} < at n 1.52 ${dG.toFixed(2)}`); else fail(`n 1.00 (${dA.toFixed(2)}) looks no flatter than n 1.52 (${dG.toFixed(2)})`);

    // ripple from a click on bare page, and it settles
    const pt = await bare(page);
    await page.mouse.move(pt[0], pt[1]); await page.waitForTimeout(100);
    await page.mouse.down(); await page.mouse.up();
    let peak = 0;
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(60); peak = Math.max(peak, await page.evaluate(p => window.__liquid.rippleAt(p[0], p[1], 40), pt)); }
    await page.mouse.move(5, 5);
    await page.waitForTimeout(3000);
    const after = await page.evaluate(p => window.__liquid.rippleAt(p[0], p[1], 40), pt);
    if (peak >= .3) ok(`a click raises a ripple (height ${peak.toFixed(2)})`); else fail(`a click raised no ripple (height ${peak.toFixed(3)})`);
    if (after <= peak * .25) ok(`the ripple settles within 3 s (${after.toFixed(3)} = ${(after / Math.max(peak, 1e-6) * 100).toFixed(0)} % of peak)`); else fail(`the ripple has not settled after 3 s (${after.toFixed(3)} of ${peak.toFixed(3)})`);

    // the wet fingertip
    const a = await bare(page), b0 = await S(page);
    await page.mouse.move(a[0] - 60, a[1]); await page.mouse.move(a[0] + 60, a[1] + 10, { steps: 14 });
    const b1 = await S(page);
    if (b1.drops - b0.drops >= 8) ok(`a pointer sweep wets the page (+${b1.drops - b0.drops} beads)`); else fail(`a pointer sweep left only ${b1.drops - b0.drops} beads`);

    // the big drop: drag it over the click target, let it settle, click through it
    st = await S(page);
    const tgt = await page.evaluate(() => { const e = document.querySelector('canvas [data-hic-click]') || document.querySelector('canvas button'); if (!e.id) e.id = 'lens-target'; const b = window.__liquid.boxOf(e); return { sel: '#' + e.id, x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 }; });
    const grab = await page.evaluate(({ CONTROL }) => {
      // a point inside the drop that is not on a control (a press on a control is a click, not a grab)
      const h = window.__liquid.state().hero;
      for (let i = 0; i < 60; i++) { const a = i * 2.4, r = h.r * .5 * Math.sqrt(i / 60); const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r; const el = document.elementFromPoint(x, y); if (el && !el.closest(CONTROL)) return [x, y]; }
      return [h.x, h.y];
    }, { CONTROL });
    const h0 = st.hero, dx = grab[0] - h0.x, dy = grab[1] - h0.y;
    const goal = [tgt.x + h0.r * .28, tgt.y - h0.r * .12];
    await page.mouse.move(grab[0], grab[1]); await page.waitForTimeout(120);
    await page.mouse.down();
    await page.mouse.move(goal[0] + dx, goal[1] + dy, { steps: 24 });
    await page.waitForTimeout(700);
    await page.mouse.up();
    // settling is counted in simulated time (software GL in headless draws < 1 frame a second)
    await page.evaluate(() => window.__liquid.freeze(true));
    let rest = null, h1;
    for (let i = 1; i <= 25; i++) { h1 = await page.evaluate(() => window.__liquid.run(6).state().hero); if (Math.hypot(h1.vx, h1.vy) < 6) { rest = i * 100; break; } }
    await page.evaluate(() => window.__liquid.freeze(false));
    const moved = Math.hypot(h1.x - h0.x, h1.y - h0.y);
    if (moved >= 150) ok(`the big drop follows a drag (${moved.toFixed(0)} px)`); else fail(`the big drop moved only ${moved.toFixed(0)} px`);
    if (rest !== null && rest <= 1500) ok(`the big drop comes to rest ${rest} ms (simulated) after release`); else fail(`the big drop is still moving 1.5 s after release (${Math.hypot(h1.vx, h1.vy).toFixed(1)} px/s)`);
    const sp = await page.evaluate(sel => window.__hic.screenOf(document.querySelector(sel)), tgt.sel);
    const shift = Math.hypot(sp[0] - tgt.x, sp[1] - tgt.y);
    if (shift >= 3) ok(`the drop magnifies: the button is drawn ${shift.toFixed(1)} px from its layout place`); else fail(`the drop does not displace what is under it (${shift.toFixed(2)} px)`);
    await page.evaluate(sel => { window.__lensClicks = 0; document.querySelector(sel).addEventListener('click', () => window.__lensClicks++, { once: true }); }, tgt.sel);
    await page.mouse.move(sp[0] + 20, sp[1] + 6); await page.waitForTimeout(60);
    await page.mouse.move(sp[0], sp[1]); await page.waitForTimeout(300);
    await page.mouse.click(sp[0], sp[1]); await page.waitForTimeout(200);
    if (await page.evaluate(() => window.__lensClicks) > 0) ok(`a real click through the big drop reaches ${tgt.sel}`);
    else fail(`a click through the big drop at (${sp[0] | 0}, ${sp[1] | 0}) missed ${tgt.sel} (hit ${await page.evaluate(p => { const h = document.elementFromPoint(p[0], p[1]); return h ? h.tagName + '#' + h.id : 'nothing'; }, sp)})`);

    // live text stays selectable through the water
    const selTarget = await page.evaluate(() => { const e = document.querySelector('canvas [data-liquid-select]') || [...document.querySelectorAll('canvas p')].find(p => p.textContent.trim().length > 20); if (!e) return null; if (!e.id) e.id = 'sel-target'; return '#' + e.id; });
    if (selTarget) {
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const p = await page.evaluate(sel => { const e = document.querySelector(sel), b = window.__liquid.boxOf(e); return [b[0] + Math.min(60, b[2] * .3), b[1] + 12]; }, selTarget);
      const lensHit = await page.evaluate(p => window.__liquid.inLens(p[0], p[1]), p);
      const q = lensHit ? await page.evaluate(sel => window.__hic.screenOf(document.querySelector(sel)), selTarget) : p;
      await page.mouse.move(q[0], q[1]); await page.waitForTimeout(250);
      await page.mouse.dblclick(q[0], q[1]); await page.waitForTimeout(200);
      const s = await page.evaluate(() => String(getSelection()).trim());
      if (s.length > 0) ok(`a double-click through the water selects live text ("${s.slice(0, 24)}")`); else fail('a double-click on live text selected nothing');
      await page.evaluate(() => getSelection().removeAllRanges());
    }

    // splash and wipe
    const sp1 = await page.$('canvas [data-liquid=splash]'), wp = await page.$('canvas [data-liquid=wipe]');
    if (sp1) {
      const n0 = (await S(page)).drops;
      await page.evaluate(() => document.querySelector('canvas [data-liquid=splash]').click());
      await page.waitForTimeout(100);
      const n1 = (await S(page)).drops;
      if (n1 - n0 >= 25) ok(`splash throws ${n1 - n0} beads`); else fail(`splash added only ${n1 - n0} beads`);
    } else info('no [data-liquid=splash] control (skipped)');
    if (wp) {
      await page.evaluate(() => window.__liquid.set({ rain: 0 }));
      const n0 = (await S(page)).drops;
      // counted in simulated time: 2 s = 120 steps (headless software GL is far slower than real time)
      await page.evaluate(() => { window.__liquid.freeze(true); document.querySelector('canvas [data-liquid=wipe]').click(); window.__liquid.run(120); });
      const n1 = (await S(page)).drops;
      await page.evaluate(() => window.__liquid.freeze(false));
      if (n1 <= n0 * .15) ok(`wipe dries the page (${n0} → ${n1} beads in 2 s)`); else fail(`wipe left ${n1} of ${n0} beads after 2 s`);
    } else info('no [data-liquid=wipe] control (skipped)');
  }
});

// a still is the same picture every time
{
  const shots = [];
  for (let i = 0; i < 2; i++) {
    const { browser, page, errors } = await open(file, { hash: 'still=1' });
    if (!(await waitReady(page, errors))) { console.log('FAIL still: never ready ' + errors.join(' | ')); process.exitCode = 1; await browser.close(); break; }
    await page.waitForTimeout(900);
    shots.push(await stats(page, { x: 0, y: 0, width: 1280, height: 800 }));
    await browser.close();
  }
  if (shots.length === 2) {
    const d = diff(shots[0], shots[1]);
    if (d < .5) console.log(`ok   #still=1 is deterministic (diff ${d.toFixed(3)})`); else { console.log(`FAIL #still=1 differs between loads (diff ${d.toFixed(2)})`); process.exitCode = 1; }
  }
}
