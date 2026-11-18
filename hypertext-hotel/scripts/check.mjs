// check.mjs — proves a hypertext-hotel page with numbers.   node scripts/check.mjs <page.html> [--quick]
// First the shared HTML-in-Canvas checks (scripts/hic-test.mjs: loads, draws, a real click through the drawing focuses the
// [data-hic-edit] field, typing re-uploads, a real click reaches [data-hic-click], frames, phone width, the plain-page
// fallback), run at #nointro&q=.5&lens=off (software GL is slow), then this style's own:
//   rooms     every room is lit (mean luma of its rectangle) and the building fits the window
//   placed    every control is hit-testable where it is drawn: elementFromPoint at its projected centre is that control
//   switch    a real click on a lamp switch turns a light off; its room's luma drops by ≥ 12 %; a second click restores it
//   lift      a real drag on the lift lever: the car follows, then glides to the next floor, carries past it by a little
//             and settles within 3 simulated seconds; its lever (the range thumb) ends on the car
//   twins     "just HTML": every twin is hit-testable where drawn; a real click on a twin checkbox changes the styled one
//   lens      the lens over a control: under the glass a real click reaches the twin, outside it the styled control
//   still     two loads at #still=2 give the same picture
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check.mjs <page.html> [--quick]'); process.exit(2); }
const quick = process.argv.includes('--quick');
const H = 'nointro&q=0.5';
const ev = (page, f, a) => page.evaluate(f, a);
const adv = (page, s) => ev(page, (s) => __hic.dh.advance(s), s);

await run(file, {
  hash: H + '&lens=off', settle: 1500, typeSettle: 3500, timeout: 90000,
  extra: async ({ page, ok, fail, info, clip }) => {
    await adv(page, 0.5);
    // ---- rooms lit, building fits
    const rooms = await ev(page, () => __hic.dh.rooms.map(R => ({ id: R.id, r: __hic.dh.roomRect(R.id) })));
    let dim = [];
    for (const R of rooms) {
      const [x, y, w, h] = R.r; if (w < 20 || h < 20) { fail(`room ${R.id} is ${w | 0}×${h | 0} px on screen`); continue; }
      const s = await stats(page, { x: Math.max(0, x), y: Math.max(0, y), width: Math.min(w, 1280 - x), height: Math.min(h, 800 - y) });
      R.mean = s.mean; if (s.mean < 22) dim.push(`${R.id} ${s.mean}`);
    }
    if (dim.length) fail('rooms too dark: ' + dim.join(', ')); else ok(`rooms lit: ${rooms.map(R => R.id + ' ' + R.mean).join(' · ')}`);
    const fits = await ev(page, () => { const W = __hic.dh.world, b = W.bounds, a = __hic.dh.project([b[0], W.roofTop, 0]), c = __hic.dh.project([b[2], b[1], 0]); return [a[0], a[1], c[0], c[1], innerWidth, innerHeight]; });
    if (fits[0] < -2 || fits[1] < -2 || fits[2] > fits[4] + 2 || fits[3] > fits[5] + 2) fail(`the building does not fit the window: ${fits.slice(0, 4).map(v => v | 0)}`);
    else ok(`the whole building fits: x ${fits[0] | 0}–${fits[2] | 0}, y ${fits[1] | 0}–${fits[3] | 0}`);
    // ---- every control hit-testable where drawn
    const placed = await ev(page, () => {
      const bad = [], P = __hic.dh.panels; let n = 0;
      for (const p of P) {
        const f = p.el.matches('input,select,textarea,button,[contenteditable]') ? p.el : (p.el.querySelector('input,select,textarea,button,[contenteditable]') || p.el);
        const s = __hic.screenOf(f); if (!s || s[0] < 0 || s[1] < 0 || s[0] > innerWidth || s[1] > innerHeight) { bad.push(p.key + ' off screen'); continue; }
        const h = document.elementFromPoint(s[0], s[1]); if (h && (h === f || p.el.contains(h))) n++; else bad.push(p.key + ' → ' + (h ? h.tagName + (h.dataset && h.dataset.k ? '[' + h.dataset.k + ']' : '') : 'nothing'));
      }
      return { n, total: P.length, bad };
    });
    if (placed.n < placed.total) fail(`controls hit-testable where drawn: ${placed.n}/${placed.total} (${placed.bad.join('; ')})`); else ok(`every control is hit-testable where drawn: ${placed.n}/${placed.total}`);
    // ---- a lamp switch
    const sw = await ev(page, () => {
      for (const p of __hic.dh.panels) { const c = p.el.querySelector('input[type=checkbox]') || (p.el.matches('input[type=checkbox]') ? p.el : null); if (c && c.checked && p.zone.room) { c.id = c.id || 'chk-' + p.key.replace(/\W/g, '-'); return { sel: '#' + c.id, key: p.key, room: p.zone.id }; } }
      return null;
    });
    if (!sw) info('no checked checkbox in a room: switch check skipped');
    else {
      const lumi = async () => { const r = await ev(page, (id) => __hic.dh.roomRect(id), sw.room); return (await stats(page, { x: r[0], y: r[1], width: r[2], height: r[3] })).mean; };
      const at = await ev(page, (s) => __hic.screenOf(document.querySelector(s)), sw.sel);
      const l0 = await lumi(), lights0 = await ev(page, () => Object.values(__hic.dh.lights).map(L => L.on).join(''));
      await page.mouse.move(at[0], at[1]); await page.waitForTimeout(150); await page.mouse.click(at[0], at[1]); await adv(page, 1); await page.waitForTimeout(200);
      const l1 = await lumi(), lights1 = await ev(page, () => Object.values(__hic.dh.lights).map(L => L.on).join(''));
      const drop = (l0 - l1) / Math.max(1, l0);
      if (lights0 === lights1) fail(`a real click on the switch ${sw.key} changed no light`);
      else if (drop < 0.12) fail(`switch ${sw.key}: room ${sw.room} luma ${l0} → ${l1} (${(drop * 100) | 0} %, want ≥ 12 %)`);
      else ok(`a real click on switch ${sw.key} darkens ${sw.room}: luma ${l0} → ${l1} (−${(drop * 100) | 0} %)`);
      await page.mouse.click(at[0], at[1]); await adv(page, 1); await page.waitForTimeout(200);
      const l2 = await lumi(); if (Math.abs(l2 - l0) > Math.max(3, l0 * 0.08)) fail(`switching back: luma ${l2}, was ${l0}`); else ok(`a second click lights it again (luma ${l2})`);
    }
    // ---- the lift
    const lift = await ev(page, () => { const p = __hic.dh.panels.find(p => p.liftOwned); if (!p) return null; const f = p.el.matches('input') ? p.el : p.el.querySelector('input'); f.id = f.id || 'lift-lever'; return { sel: '#' + f.id, key: p.key, max: +f.max, thumb: +(p.el.dataset.thumb || 60), w: f.offsetWidth, h: f.offsetHeight, car: p.key + '.car' }; });
    if (!lift) info('no lift on this page');
    else {
      const carY = () => ev(page, (k) => { const D = __hic.dh, mv = Object.values(D.movers).find(m => m.name && m.name.endsWith('.car')); return mv ? D.project([mv.m[12], mv.m[13], mv.m[14]])[1] : null; }, lift.key);
      const from = await ev(page, (l) => __hic.dh.screenAt(document.querySelector(l.sel), l.w / 2, l.h - l.thumb / 2), lift);
      const to = await ev(page, (l) => __hic.dh.screenAt(document.querySelector(l.sel), l.w / 2, l.h - l.thumb / 2 - (l.h - l.thumb) / l.max * 0.85), lift);
      const y0 = await carY();
      await page.mouse.move(from[0], from[1]); await page.waitForTimeout(150); await page.mouse.down();
      for (let i = 1; i <= 6; i++) { await page.mouse.move(from[0], from[1] + (to[1] - from[1]) * i / 6); await page.waitForTimeout(60); }
      const v1 = await ev(page, (s) => +document.querySelector(s).value, lift.sel);
      await page.mouse.up(); await page.waitForTimeout(100);
      // simulated time: sample the car every 0.05 s for 3 s
      const ys = []; for (let i = 0; i < 60; i++) { await adv(page, 0.05); ys.push(await ev(page, () => { const mv = Object.values(__hic.dh.movers).find(m => m.name && m.name.endsWith('.car')); return mv.m[13]; })); }
      const st = await ev(page, () => { const W = __hic.dh.world, f = W.G.Y.map(y => y[0]); return f; });
      const v2 = await ev(page, (s) => +document.querySelector(s).value, lift.sel), y1 = await carY();
      const target = Math.round(v1), rise = Math.abs(y1 - y0);
      const goal = ys[ys.length - 1], over = Math.max(...ys.map(y => (y - goal) * Math.sign(goal - ys[0])));
      const settleAt = ys.findIndex((y, i) => ys.slice(i).every(z => Math.abs(z - goal) < 0.005)) * 0.05;
      if (v1 < 0.3) fail(`a real drag on the lever moved the range only to ${v1.toFixed(2)}`);
      else if (Math.abs(v2 - target) > 0.01) fail(`the lift did not settle on stop ${target} (value ${v2})`);
      else if (rise < 20) fail(`the car moved only ${rise | 0} px on screen`);
      else if (settleAt > 3) fail(`the car takes ${settleAt.toFixed(2)} s to settle`);
      else ok(`lift: a real drag sets the lever to ${v1.toFixed(2)}, the car rises ${rise | 0} px to stop ${target}, carries ${(over * 100).toFixed(1)} cm past and settles at ${settleAt.toFixed(2)} s`);
      const thumbOn = await ev(page, (l) => { const D = __hic.dh, el = document.querySelector(l.sel), v = +el.value, th = D.screenAt(el, l.w / 2, l.h - l.thumb / 2 - (l.h - l.thumb) * v / l.max); const mv = Object.values(D.movers).find(m => m.name && m.name.endsWith('.car')); const c = D.project([mv.m[12], mv.m[13] + 0.5, 0]); return Math.abs(th[1] - c[1]); }, lift);
      if (thumbOn > 12) fail(`the lever is ${thumbOn | 0} px off the car`); else ok(`the lever rides on the car (${thumbOn.toFixed(1)} px)`);
    }
    // ---- twins: just HTML
    await ev(page, () => __hic.dh.setPlain(true)); await adv(page, 1.5); await page.waitForTimeout(300);
    const tw = await ev(page, () => {
      let n = 0; const bad = [];
      for (const p of __hic.dh.panels) {
        const f = p.twin.querySelector('input,select,textarea,button,[contenteditable]') || p.twin.querySelector('output') || p.twin.lastElementChild;
        const s = __hic.screenOf(f); const h = s && document.elementFromPoint(s[0], s[1]);
        if (h && p.twin.contains(h)) n++; else bad.push(p.key);
      }
      return { n, total: __hic.dh.panels.length, bad };
    });
    if (tw.n < tw.total) fail(`twins hit-testable: ${tw.n}/${tw.total} (${tw.bad.join(', ')})`); else ok(`just HTML: every twin is hit-testable where drawn (${tw.n}/${tw.total})`);
    if (sw) {
      const tsel = await ev(page, (s) => { const st = document.querySelector(s), p = __hic.dh.panels.find(p => p.el.contains(st)); const c = p.twin.querySelector('input[type=checkbox]'); c.id = 'twin-probe'; return { at: __hic.screenOf(c), before: st.checked }; }, sw.sel);
      await page.mouse.click(tsel.at[0], tsel.at[1]); await page.waitForTimeout(200);
      const after = await ev(page, (s) => document.querySelector(s).checked, sw.sel);
      if (after === tsel.before) fail('a real click on a twin checkbox did not change the styled one'); else ok('a real click on a twin checkbox changes the styled checkbox (kept in step)');
      await page.mouse.click(tsel.at[0], tsel.at[1]); await page.waitForTimeout(150);
    }
    await ev(page, () => __hic.dh.setPlain(false)); await adv(page, 1.5);
    // ---- lens
    if (sw) {
      await ev(page, (k) => { __hic.dh.lensTo(k); }, sw.key); await adv(page, 0.3);
      const L = await ev(page, () => __hic.dh.lens);
      await page.mouse.move(L.x + 3, L.y + 3); await page.waitForTimeout(200);
      const r = await ev(page, (s) => { const st = document.querySelector(s), p = __hic.dh.panels.find(p => p.el.contains(st)), c = p.twin.querySelector('input[type=checkbox]'); const at = __hic.screenOf(c); const h = document.elementFromPoint(at[0], at[1]); return { via: __hic.dh.state().viaLens, hit: h === c, at }; }, sw.sel);
      if (!r.via) fail('the pointer in the glass did not switch hit testing to the twins');
      else if (!r.hit) fail('under the lens the twin checkbox is not where it is drawn');
      else ok(`under the lens, the twin is hit where it is drawn (${r.at.map(v => v | 0)})`);
      await page.mouse.move(5, 5); await page.waitForTimeout(200);
      const back = await ev(page, () => __hic.dh.state().viaLens);
      if (back) fail('leaving the glass did not give hit testing back to the styled controls'); else ok('outside the glass the styled controls take the clicks again');
    }
  }
});

// ---- deterministic stills
if (!quick) {
  const shots = [];
  for (let i = 0; i < 2; i++) {
    const { browser, page, errors } = await open(file, { hash: 'still=2&' + H });
    await waitReady(page, errors, 90000); await page.waitForTimeout(2500);
    shots.push(await stats(page, { x: 0, y: 0, width: 1280, height: 800 })); await browser.close();
  }
  const d = diff(shots[0], shots[1]);
  console.log(d < 2 ? `ok   two loads at #still=2 match (diff ${d.toFixed(2)})` : `FAIL two loads at #still=2 differ (diff ${d.toFixed(2)})`);
  if (d >= 2) process.exitCode = 1;
}
