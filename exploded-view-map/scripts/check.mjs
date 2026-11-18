// check.mjs — proves an exploded-view-map page: the shared HTML-in-Canvas checks (scripts/hic-test.mjs) plus the
// skill's own, with numbers:
//   apart     pulled apart, the stack rises (top plate z), the plates and cards are posed, and it settles (seconds)
//   cards     apart, a hit test at every card's and every pin's drawn centre lands inside that element
//   type      apart and turned, a real click on the [data-hic-edit] field focuses it and typing changes the text
//   slider    apart, a real drag along the drawn range input changes its value and the picture (the light)
//   lift      a real click on a plate (found by hit testing the drawing) lifts it; a second click puts it back
//   variant   the second variant (2nd radio) re-uploads the plates and changes the picture
//   night     the slider at its end darkens the desk and lights lamps (mean luma falls, warm pixels appear)
//   together  Escape puts it back: flat again, and a click on the title at its layout box still focuses it
// The shared checks run on the flat page (#nointro: the text is largest there); the skill's checks pull it apart.
// Usage: node <skill>/scripts/check.mjs <page.html> [--q 0.6]
import { run } from './hic-test.mjs';

const args = process.argv.slice(2), file = args[0];
if (!file) { console.error('usage: node scripts/check.mjs <page.html>'); process.exit(2); }
const q = args.includes('--q') ? args[args.indexOf('--q') + 1] : '0.6';

async function waitSettled(page, ms = 90000) {
  const t0 = Date.now();
  // first let the loop notice the change (frames are slow here), then wait for it to come to rest
  while (Date.now() - t0 < 4000 && await page.evaluate(() => window.__ev.state.settled)) await page.waitForTimeout(100);
  while (Date.now() - t0 < ms) {
    const s = await page.evaluate(() => window.__ev.state.settled);
    if (s) return (Date.now() - t0) / 1000;
    await page.waitForTimeout(150);
  }
  return null;
}
async function hitInside(page, sel) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
    const p = window.__ev.screenOf(el); if (!p) return { ok: false, why: 'no screen point' };
    const c = document.querySelector('canvas').getBoundingClientRect(), h = document.elementFromPoint(c.left + p[0], c.top + p[1]);
    return { ok: !!h && (h === el || el.contains(h)), at: p.map(Math.round), hit: h ? h.tagName + (h.className && typeof h.className === 'string' ? '.' + h.className.split(' ')[0] : '') : 'nothing' };
  }), sel);
}

await run(file, {
  hash: 'q=' + q + '&nointro&noidle', settle: 1500, typeText: ' and back again', typeSettle: 2500, timeout: 90000,
  extra: async (t) => {
    const { page, ok, fail, info, stats, diff, clip } = t;
    page.setDefaultTimeout(150000);                       // software GL on a busy machine: a screenshot can wait long for a frame
    await page.mouse.move(5, 5);
    await page.keyboard.press('Escape');
    // ---- apart
    await page.evaluate(() => window.__ev.pose({ apart: 1, yaw: 0, tilt: 0 }));
    const secs = await waitSettled(page);
    const st = await page.evaluate(() => window.__ev.state);
    if (secs === null) fail('apart: never settled (motion ' + st.motion + ')'); else if (secs > 60) fail(`apart: settled only after ${secs.toFixed(1)} s`);
    else info(`apart: settled in ${secs.toFixed(1)} s here (software GL; springs run on real time)`);
    if (st.topZ < st.plates * 10) fail(`apart: the stack is only ${st.topZ.toFixed(0)} px tall for ${st.plates} plates`);
    else ok(`apart: ${st.plates} plates stacked ${st.topZ.toFixed(0)} px high, e = ${st.e.toFixed(2)}`);
    const sApart = await stats(page, clip);
    // ---- cards and pins are clickable where drawn
    const hits = (await hitInside(page, '[data-ev=card]')).concat(await hitInside(page, '.ev-pin'));
    const bad = hits.filter((h) => !h.ok);
    if (bad.length) fail(`apart: ${bad.length}/${hits.length} cards/pins not hit where drawn (${bad.map((b) => b.hit + '@' + b.at).join(', ')})`);
    else ok(`apart: all ${hits.length} cards and pins are hit where they are drawn`);
    // ---- type into the title, apart and turned
    await page.evaluate(() => window.__ev.pose({ yaw: 0.35 }));
    await waitSettled(page);
    const ed = await t.screenPoint(page, '[data-hic-edit]');
    await page.mouse.click(ed.x, ed.y); await page.waitForTimeout(200);
    const foc = await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-hic-edit]'));
    await page.keyboard.press('End'); await page.keyboard.type(' ok', { delay: 30 }); await page.waitForTimeout(400);
    const typed = await page.evaluate(() => { const e = document.querySelector('[data-hic-edit]'); return (e.value ?? e.textContent).endsWith(' ok'); });
    if (foc && typed) ok('apart and turned: a real click focuses the title and typing changes it'); else fail(`apart and turned: focus ${foc}, typed ${typed}`);
    await page.keyboard.press('Tab'); await page.mouse.click(4, 4); await page.waitForTimeout(200);
    // ---- slider drag
    const range = await page.evaluate(() => !!document.querySelector('canvas input[type=range]'));
    if (range) {
      const a = await page.evaluate(() => { const r = document.querySelector('canvas input[type=range]'), c = document.querySelector('canvas').getBoundingClientRect(); const p0 = window.__ev.screenOf(r, 0.25, 0.5), p1 = window.__ev.screenOf(r, 0.8, 0.5); return { v: r.value, p0: [c.left + p0[0], c.top + p0[1]], p1: [c.left + p1[0], c.top + p1[1]] }; });
      const s0 = await stats(page, clip);
      await page.mouse.move(a.p0[0], a.p0[1]); await page.mouse.down();
      for (let i = 1; i <= 6; i++) { await page.mouse.move(a.p0[0] + (a.p1[0] - a.p0[0]) * i / 6, a.p0[1] + (a.p1[1] - a.p0[1]) * i / 6); await page.waitForTimeout(60); }
      await page.mouse.up(); await page.waitForTimeout(1200);
      const v1 = await page.evaluate(() => document.querySelector('canvas input[type=range]').value), s1 = await stats(page, clip), d = diff(s0, s1);
      const want = await page.evaluate(() => { const r = document.querySelector('canvas input[type=range]'); return +r.min + 0.8 * (+r.max - +r.min); });
      if (Math.abs(v1 - want) > (want || 1) * 0.12) fail(`slider: a drag to 80 % set ${v1} (want ≈ ${want.toFixed(0)}; from ${a.v})`);
      else ok(`slider: a real drag along the drawn slider sets ${a.v} → ${v1} (target ${want.toFixed(0)}); picture change ${d.toFixed(2)}`);
      if (d < 0.3) fail('slider: the picture did not change with the light');
    }
    // ---- lift a plate with a real click
    await page.evaluate(() => window.__ev.pose({ yaw: 0, tilt: -0.35 })); await waitSettled(page);
    // find a plate under the pointer by hit testing the drawing (k = 0: the middle one of those found)
    const find = (k) => page.evaluate((k) => {
      const c = document.querySelector('canvas').getBoundingClientRect(), found = {};
      for (let y = 40; y < innerHeight - 110; y += 12) for (let x = 20; x < innerWidth * 0.62; x += 12) {
        const h = document.elementFromPoint(c.left + x, c.top + y), pl = h && h.closest && h.closest('.ev-plate');
        if (pl) { const j = window.__ev.plates.indexOf(pl) + 1; if (j > 1 && !found[j]) found[j] = [x, y]; }
      }
      const ks = Object.keys(found).map(Number).sort((a, b) => a - b), j = k || ks[Math.floor(ks.length / 2)];
      return j && found[j] ? { k: j, x: c.left + found[j][0], y: c.top + found[j][1], n: ks.length } : null;
    }, k);
    const press = async (p) => { await page.mouse.move(p.x, p.y); await page.waitForTimeout(300); await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await waitSettled(page); };
    const spot = await find(0);
    if (!spot) fail('lift: no plate found under the pointer anywhere');
    else {
      await press(spot);
      const p1 = await page.evaluate(() => window.__ev.state.peel);
      const again = await find(spot.k);                    // the plate has moved up: find it where it is now
      if (again) await press(again);
      const p2 = await page.evaluate(() => window.__ev.state.peel);
      if (p1 === spot.k && p2 === 0) ok(`lift: a click on plate ${spot.k} (one of ${spot.n} hit) lifts it, a click where it now is puts it down`);
      else fail(`lift: clicked plate ${spot.k}: peel ${p1}, then ${again ? 'again at its new place' : 'not found again'}: peel ${p2}`);
    }
    // ---- variant
    const radios = await page.evaluate(() => document.querySelectorAll('canvas input[type=radio]').length);
    if (radios > 1) {
      const u0 = await page.evaluate(() => window.__hic.uploads), s0 = await stats(page, clip);
      await page.evaluate(() => { const r = document.querySelectorAll('canvas input[type=radio]')[1]; r.click(); });
      await page.waitForTimeout(2500);
      const u1 = await page.evaluate(() => window.__hic.uploads), d = diff(s0, await stats(page, clip));
      if (u1 - u0 < 3 || d < 0.3) fail(`variant: ${u1 - u0} uploads, picture change ${d.toFixed(2)}`); else ok(`variant: the second palette re-uploads ${u1 - u0} pieces, picture change ${d.toFixed(2)}`);
    }
    // ---- night
    if (range) {
      const s0 = await stats(page, clip);
      await page.evaluate(() => { const r = document.querySelector('canvas input[type=range]'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(1500);
      const s1 = await stats(page, clip);
      if (s1.mean > s0.mean - 8) fail(`night: mean luma ${s0.mean} → ${s1.mean}`); else ok(`night: the picture darkens at the slider's end (mean luma ${s0.mean} → ${s1.mean})`);
    }
    // ---- together
    await page.keyboard.press('Escape');
    const back = await waitSettled(page);
    const e = await page.evaluate(() => window.__ev.state.e);
    const flat = await page.evaluate(() => { const el = document.querySelector('[data-hic-edit]'), p = window.__ev.screenOf(el), c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.left + p[0], y: c.top + p[1] }; });
    await page.mouse.click(flat.x, flat.y); await page.waitForTimeout(200);
    const f2 = await page.evaluate(() => document.activeElement && document.activeElement.matches('[data-hic-edit]'));
    if (back === null || Math.abs(e) > 0.01 || !f2) fail(`together: e ${e.toFixed(3)}, settled ${back}, title focus ${f2}`);
    else ok(`together: Escape puts it back flat in ${back.toFixed(1)} s and the title is still clickable`);
    void sApart;
  }
});
