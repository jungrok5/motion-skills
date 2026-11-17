// check.mjs — proves a sheet-city page with numbers.   node scripts/check.mjs <page.html> [--quick]
// The shared HTML-in-Canvas checks (scripts/hic-test.mjs: loads, draws, a real click focuses the formula field, typing
// re-uploads, a real click reaches Undo, frames, phone width, the plain-page fallback), then this style's own:
//   city      the city range is a uniform grid; buildings stand (count, tallest px); props are on the desk
//   roof      a real click on a rooftop (projected from the scene) selects exactly that cell
//   edit      typing a number + Enter on that cell: the value lands, the building moves ≥ 3 storeys, it overshoots and
//             settles within 3 simulated seconds, light runs to the dependants (pulses ≥ 1), a ring spreads, the
//             dependants hold their old figure until the light arrives, the pixels change
//   undo      Ctrl+Z puts the value and the height back
//   slider    a real drag on the slider (drawn on the sheet) moves the bound cell and the buildings that read it
//   orbit     a drag on the desk turns the camera, and a rooftop click still lands on the cell drawn there
//   still     two loads at #still=1 give the same picture;  calm: #calm has no intro and no motion at rest
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check.mjs <page.html> [--quick]'); process.exit(2); }
const quick = process.argv.includes('--quick');

const ev = (page, f, a) => page.evaluate(f, a);
async function settle(page) { await ev(page, () => { __city.stopDemo(); __city.settle(900); }); await page.waitForTimeout(300); }
// a lot whose number is typed (not a formula), that others read, and whose roof is in plain view
async function pickLot(page, exclude) {
  return await ev(page, (exclude) => {
    const B = __city.book, out = [];
    for (const l of __city.lots()) {
      if (l.addr === exclude || l.h < 8 || !l.dependents || /^=/.test(B.raw(l.i)) || typeof l.value !== 'number') continue;
      const p = __city.roofPoint(l.addr); if (!p) continue;
      const W = innerWidth, H = innerHeight; if (p[0] < 40 || p[1] < 40 || p[0] > W - 40 || p[1] > H - 90) continue;
      const k = __city.pick(p[0], p[1]); if (k.kind !== 'roof' || k.addr !== l.addr) continue;
      out.push({ addr: l.addr, i: l.i, x: p[0], y: p[1], value: l.value, h: l.h, deps: l.dependents });
    }
    out.sort((a, b) => (b.deps - a.deps) || (b.y - a.y));
    return out[0] || null;
  }, exclude);
}
async function clickAt(page, x, y) {
  const c = await ev(page, () => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top]; });
  await page.mouse.move(c[0] + x - 25, c[1] + y); await page.waitForTimeout(60);
  await page.mouse.move(c[0] + x, c[1] + y); await page.waitForTimeout(160);
  await page.mouse.click(c[0] + x, c[1] + y); await page.waitForTimeout(200);
}

// The shared checks run with #nointro (the page at rest, no opening swoop) so software-GL screenshots stay quick;
// the opening itself is checked at the end.
await run(file, {
  hash: 'nointro', settle: 600, typeSettle: 2500,
  extra: async ({ page, ok, fail, info, clip }) => {
    await settle(page);
    // ---- city
    const city = await ev(page, () => { const L = __city.lots(), s = __city.state(); return { n: L.length, up: L.filter(l => l.h > 1).length, pits: L.filter(l => l.h < -1).length, tall: Math.max(...L.map(l => l.h)), uniform: s.uniformGrid, props: (__city.config.props ? 1 : 0) }; });
    if (!city.uniform) fail('the city range is not a uniform grid (give its columns one width and its rows one height)');
    if (city.up < 3) fail(`only ${city.up} buildings stand`); else ok(`city: ${city.n} lots, ${city.up} buildings, ${city.pits} pits, tallest ${city.tall.toFixed(0)} px`);
    // ---- roof click
    const lot = await pickLot(page);
    if (!lot) { fail('no typed-in cell with dependants has a roof in plain view'); return; }
    await clickAt(page, lot.x, lot.y);
    const sel = await ev(page, () => __city.book.selected);
    if (sel !== lot.i) { fail(`a click on the roof of ${lot.addr} selected ${sel >= 0 ? await ev(page, i => __city.book.addr(i), sel) : 'nothing'}`); return; }
    ok(`a real click on the rooftop of ${lot.addr} at (${lot.x | 0}, ${lot.y | 0}) selects that cell`);
    // ---- edit
    const cfg = await ev(page, () => ({ unit: __city.config.unit, storey: __city.config.storey, tallest: __city.config.tallest, calm: HIC.calm, rowUnit: __city.book.unitOf(__city.book.selected) }));
    const unit = cfg.rowUnit || cfg.unit, room = (cfg.tallest - lot.h) / cfg.storey;
    const target = Math.round(room > 5 ? lot.value + 4 * unit : Math.max(unit * 0.5, lot.value - 4 * unit));
    const before = await ev(page, (i) => { const B = __city.book; const deps = []; const seen = new Set([i]); const q = [i];
      while (q.length) { const p = q.shift(); for (const d of B.dependents(p)) if (!seen.has(d)) { seen.add(d); q.push(d); deps.push(d); } }
      return { deps: deps.map(d => ({ d, v: B.value(d), h: __city.heightOf(d), lot: __city.book.inCity(d) })), spawned: __city.state().spawned };
    }, lot.i);
    const s0 = await stats(page, clip);
    await page.keyboard.type(String(target), { delay: 50 });
    const typing = await ev(page, () => __city.book.editing >= 0 ? __city.book.editor.value : null);
    await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    const after = await ev(page, ([i, deps]) => {
      const B = __city.book, st = __city.state();
      const held = deps.filter(x => x.lot && B.value(x.d) !== x.v && Math.abs(__city.heightOf(x.d) - x.h) < 0.5).length;
      return { v: B.value(i), raw: B.raw(i), changed: deps.filter(x => B.value(x.d) !== x.v).length, held, spawned: st.spawned, goal: __city.goalOf(i), h0: __city.heightOf(i) };
    }, [lot.i, before.deps]);
    if (typing === null) fail('typing on a selected cell did not open it for editing');
    if (after.v !== target) { fail(`after typing ${target} + Enter, ${lot.addr} holds ${after.raw}`); return; }
    ok(`typing ${target} + Enter on the roof of ${lot.addr} sets the cell (it was ${lot.value})`);
    if (after.changed < 1) fail('no dependant changed'); else ok(`${after.changed} dependant cells recalculated`);
    const pulses = after.spawned.pulses - before.spawned.pulses, rings = after.spawned.rings - before.spawned.rings;
    if (!cfg.calm) {
      if (pulses < 1) fail('no light ran along the streets to the dependants'); else ok(`light runs to the dependants: ${pulses} pulses, ${rings} ring`);
      if (rings < 1) fail('no ring spread from the edited building');
      info(`dependant buildings holding their height until the light arrives: ${after.held}`);
    }
    // the motion, stepped in simulated time (frame rate free): growth, overshoot, settle
    const motion = await ev(page, ([addr, goal, h0]) => {
      let t = 0, peak = h0, low = h0, last = -1; const up = goal > h0;
      for (let n = 0; n < 360; n++) { __city.advance(1 / 60, true); t += 1 / 60; const h = __city.heightOf(addr); peak = Math.max(peak, h); low = Math.min(low, h); if (Math.abs(h - goal) > 0.5) last = t; }
      return { moved: Math.abs(__city.heightOf(addr) - h0), over: up ? peak - goal : goal - low, settle: last, still: !__city.state().moving };
    }, [lot.addr, after.goal, lot.h]);
    if (motion.moved < 3 * cfg.storey - 1) fail(`the building moved only ${motion.moved.toFixed(1)} px`); else ok(`the building moves ${motion.moved.toFixed(0)} px (${(motion.moved / cfg.storey).toFixed(1)} storeys)`);
    if (!cfg.calm && motion.over < 0.5) fail(`no overshoot (${motion.over.toFixed(2)} px): the change has no weight`); else info(`overshoot ${motion.over.toFixed(1)} px`);
    if (motion.settle > 3 || !motion.still) fail(`it has not settled after 3 s (last off-goal at ${motion.settle.toFixed(2)} s)`); else ok(`settles in ${motion.settle.toFixed(2)} s of simulated time; everything is at rest after 6 s`);
    await page.waitForTimeout(600);
    const s1 = await stats(page, clip), d = diff(s0, s1);
    if (d < 0.3) fail(`the picture barely changed after the edit (${d.toFixed(2)})`); else info(`picture change after the edit: ${d.toFixed(2)}`);
    // ---- undo
    await ev(page, () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await page.keyboard.press('Control+z'); await page.waitForTimeout(150);
    const undone = await ev(page, ([i, addr]) => { __city.settle(600); return { v: __city.book.value(i), h: __city.heightOf(addr) }; }, [lot.i, lot.addr]);
    if (undone.v !== lot.value || Math.abs(undone.h - lot.h) > 0.6) fail(`undo left ${lot.addr} at ${undone.v} / ${undone.h.toFixed(1)} px (was ${lot.value} / ${lot.h.toFixed(1)})`);
    else ok(`Ctrl+Z puts ${lot.addr} back to ${lot.value} and ${lot.h.toFixed(0)} px`);
    // ---- slider
    const sl = await ev(page, () => { const k = document.getElementById('knob'); if (!k) return null; const a = __city.screenOf(k, 0.08, 0.5), b = __city.screenOf(k, 0.92, 0.5); return { a, b, v: +k.value, goals: __city.lots().map(l => l.goal) }; });
    if (sl) {
      const c = await ev(page, () => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top]; });
      await page.mouse.move(c[0] + sl.a[0] - 10, c[1] + sl.a[1]); await page.waitForTimeout(80);
      await page.mouse.move(c[0] + sl.a[0], c[1] + sl.a[1]); await page.waitForTimeout(200);
      await page.mouse.down(); await page.waitForTimeout(80);
      for (let n = 1; n <= 6; n++) { await page.mouse.move(c[0] + sl.a[0] + (sl.b[0] - sl.a[0]) * n / 6, c[1] + sl.a[1] + (sl.b[1] - sl.a[1]) * n / 6); await page.waitForTimeout(60); }
      await page.mouse.up(); await page.waitForTimeout(200);
      const s2 = await ev(page, () => ({ v: +document.getElementById('knob').value, goals: __city.lots().map(l => l.goal) }));
      const movedLots = s2.goals.filter((g, k) => Math.abs(g - sl.goals[k]) > 0.5).length;
      if (s2.v === sl.v) fail(`a real drag on the slider did not move it (value ${s2.v})`);
      else if (movedLots < 1) fail('the slider moved but no building follows it');
      else ok(`a real drag on the drawn slider moves it ${sl.v} → ${s2.v}; ${movedLots} buildings follow`);
      await ev(page, () => __city.settle(600));
    } else info('no slider on this page');
    // ---- orbit, then a click still lands where it is drawn
    const desk = await ev(page, () => { for (let y = innerHeight - 30; y > 30; y -= 20) for (let x = 30; x < innerWidth - 30; x += 40) if (__city.pick(x, y).kind === 'none') return [x, y]; return null; });
    if (desk) {
      const yaw0 = await ev(page, () => __city.camera().yaw);
      const c = await ev(page, () => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top]; });
      await page.mouse.move(c[0] + desk[0], c[1] + desk[1]); await page.mouse.down();
      for (let n = 1; n <= 6; n++) { await page.mouse.move(c[0] + desk[0] - n * 18, c[1] + desk[1] - n * 3); await page.waitForTimeout(40); }
      await page.mouse.up(); await ev(page, () => __city.settle(300)); await page.waitForTimeout(200);
      const yaw1 = await ev(page, () => __city.camera().yaw);
      if (Math.abs(yaw1 - yaw0) < 0.1) fail(`a drag on the desk did not turn the camera (yaw ${yaw0.toFixed(2)} → ${yaw1.toFixed(2)})`);
      else ok(`a drag on the desk orbits the camera (yaw ${yaw0.toFixed(2)} → ${yaw1.toFixed(2)})`);
      const lot2 = await pickLot(page, lot.addr);
      if (lot2) {
        await clickAt(page, lot2.x, lot2.y);
        const s3 = await ev(page, () => __city.book.selected);
        if (s3 !== lot2.i) fail(`after orbiting, a click on the roof of ${lot2.addr} missed`); else ok(`after orbiting, a rooftop click selects ${lot2.addr}`);
      }
    }
  }
});

if (!quick) {
  let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m);
  // ---- still: deterministic
  const shot = async () => { const o = await open(file, { hash: 'still=1' }); await waitReady(o.page, o.errors, 60000); await o.page.waitForTimeout(700); const s = await stats(o.page); await o.browser.close(); return { s, errors: o.errors }; };
  const a = await shot(), b = await shot(), d = diff(a.s, b.s);
  if (d > 0.6) fail(`#still=1 differs between loads (${d.toFixed(2)})`); else ok(`#still=1 is the same picture on every load (diff ${d.toFixed(2)})`);
  // ---- the opening: buildings rise from a flat sheet while the camera swoops
  const I = await open(file); await waitReady(I.page, I.errors, 60000);
  const i0 = await I.page.evaluate(() => ({ demo: __city.state().demo, sim: __city.state().sim, up: __city.lots().filter(l => l.h > 1).length }));
  await I.page.waitForTimeout(2500);
  const i1 = await I.page.evaluate(() => ({ sim: __city.state().sim, up: __city.lots().filter(l => l.h > 1).length, tween: __city.state().tween }));
  if (!i0.demo || i1.sim <= i0.sim || i1.up <= i0.up) fail(`the opening does not run (${JSON.stringify([i0, i1])})`);
  else ok(`the opening runs: ${i0.up} → ${i1.up} buildings up after ${(i1.sim - i0.sim).toFixed(2)} s of the swoop`);
  if (I.errors.length) fail('opening: ' + I.errors.join(' | '));
  await I.browser.close();
  // ---- calm: no intro, nothing moving at rest
  const C = await open(file, { hash: 'calm' }); await waitReady(C.page, C.errors, 60000); await C.page.waitForTimeout(800);
  const st = await C.page.evaluate(() => __city.state());
  if (st.moving || st.tween || st.demo) fail(`#calm still moves at rest (${JSON.stringify({ moving: st.moving, tween: st.tween, demo: st.demo })})`); else ok('#calm: no intro, the city stands at rest');
  await C.browser.close();
  if (bad) { console.log(`\n${bad} more check(s) failed`); process.exitCode = 1; }
}
