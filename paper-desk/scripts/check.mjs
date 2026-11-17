// paper-desk · check.mjs — proves a paper-desk page: the shared HTML-in-Canvas checks (scripts/hic-test.mjs) plus the
// physical acts with real mouse input and numbers. Run from anywhere:
//   node <skill>/scripts/check.mjs index.html            (fast: #q=low = no MSAA, coarser grid; same behaviour)
//   node <skill>/scripts/check.mjs index.html --full     (the page's own quality)
// Times are in the desk's simulation seconds (desk.state.clock), so a slow software-GL machine does not fail them.
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html> [--full]'); process.exit(1); }
const q = process.argv.includes('--full') ? '' : 'q=low';

const sleep = (page, ms) => page.waitForTimeout(ms);
// wait until fn(desk) is true, or until `sim` simulated seconds pass (real-time cap `ms`)
async function until(page, fnSrc, sim = 4, ms = 120000) {
  const t0 = Date.now(), c0 = await page.evaluate(() => __desk.state.clock);
  while (Date.now() - t0 < ms) {
    const r = await page.evaluate(new Function('return (' + fnSrc + ')(window.__desk)'));
    const c = await page.evaluate(() => __desk.state.clock);
    if (r) return { ok: true, sim: c - c0 };
    if (c - c0 > sim) return { ok: false, sim: c - c0 };
    await sleep(page, 150);
  }
  return { ok: false, sim: -1 };
}
const frames = async (page, n = 2) => { const f0 = await page.evaluate(() => __hic.frames); for (let i = 0; i < 200; i++) { await sleep(page, 60); if ((await page.evaluate(() => __hic.frames)) >= f0 + n) return; } };
// wait until the desk has drawn n more frames (with back-pressure a state change reaches the screen a frame or two later)
const drawn = async (page, n = 2) => { const r0 = await page.evaluate(() => __desk.renders); for (let i = 0; i < 300; i++) { await sleep(page, 100); if ((await page.evaluate(() => __desk.renders)) >= r0 + n) return; } };
const canvasPt = async (page, uv) => page.evaluate(([u, v]) => { const c = document.querySelector('canvas').getBoundingClientRect(), p = __desk.toScreen(__desk.surface(u, v)); return { x: c.left + p[0], y: c.top + p[1] }; }, uv);
const elPt = async (page, sel) => page.evaluate(s => { const c = document.querySelector('canvas').getBoundingClientRect(), p = __desk.screenOf(document.querySelector(s)); return { x: c.left + p[0], y: c.top + p[1] }; }, sel);
const hitIs = async (page, pt, sel) => page.evaluate(([p, s]) => { const h = document.elementFromPoint(p.x, p.y), el = document.querySelector(s); return !!h && (h === el || el.contains(h)); }, [pt, sel]);
const hitSheet = async (page, pt) => page.evaluate(p => { const h = document.elementFromPoint(p.x, p.y); return !!h && !!h.closest('#sheet, [drawable]'); }, pt);
// the sheet's on-screen area, from a 21 × 21 grid of its surface points (bounding box)
const area = async page => page.evaluate(() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) { const p = __desk.toScreen(__desk.surface(i / 20, j / 20)); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return (x1 - x0) * (y1 - y0); });
async function tool(page, name) { const b = await page.$(`[data-pd-tool="${name}"]`); if (b && await b.isVisible()) { await b.click(); } else await page.evaluate(n => __desk.tool(n), name); await frames(page, 1); return page.evaluate(() => __desk.state.tool); }
async function clickType(page, sel, text, t) {
  const pt = await elPt(page, sel);
  await page.mouse.move(pt.x - 20, pt.y); await frames(page, 1); await page.mouse.move(pt.x, pt.y); await frames(page, 2);
  await page.mouse.click(pt.x, pt.y); await sleep(page, 200);
  const focused = await page.evaluate(s => { const e = document.querySelector(s); return document.activeElement === e || e.contains(document.activeElement); }, sel);
  const before = await page.evaluate(s => document.querySelector(s).textContent, sel), up0 = await page.evaluate(() => __desk.uploads);
  await page.keyboard.press('End'); await page.keyboard.type(text, { delay: 30 }); await sleep(page, 600);
  const after = await page.evaluate(s => document.querySelector(s).textContent, sel), up1 = await page.evaluate(() => __desk.uploads);
  return { focused, typed: after !== before && after.includes(text.trim()), uploads: up1 - up0, pt };
}

await run(file, {
  hash: q, timeout: 180000, settle: 1500, typeSettle: 1200,
  extra: async ({ page, ok, fail, info, clip }) => {
    const acts = await page.evaluate(() => __desk.config.acts);
    const edit = await page.evaluate(() => { const e = document.querySelector('#sheet [data-hic-edit]') || document.querySelector('[data-hic-edit]'); if (!e.id) e.id = 'pd-edit'; return '#' + e.id; });
    await page.evaluate(() => { const s = getSelection(); s.removeAllRanges(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); });

    // A · flat: the homography puts every element under the pointer where it is drawn
    {
      const sels = await page.evaluate(() => [...document.querySelectorAll('#sheet [data-hic-edit], #sheet [data-hic-click], #sheet input, #sheet select, #sheet h1, #sheet h2')].slice(0, 8).map((e, i) => { if (!e.id) e.id = 'pd-a' + i; return '#' + e.id; }));
      let good = 0;
      for (const s of sels) { const pt = await elPt(page, s); await page.mouse.move(pt.x, pt.y); await frames(page, 2); if (await hitIs(page, pt, s)) good++; }
      if (good === sels.length) ok(`flat sheet: ${good}/${sels.length} elements are hit exactly where they are drawn`); else fail(`flat sheet: only ${good}/${sels.length} elements hit where drawn`);
    }
    // B · curl with a real drag: the corner lifts, then springs back and settles
    if (acts.curl) {
      await tool(page, 'curl');
      const c = await canvasPt(page, [0.97, 0.97]), m = await canvasPt(page, [0.55, 0.5]);
      await page.mouse.move(c.x, c.y); await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(c.x + (m.x - c.x) * i / 8, c.y + (m.y - c.y) * i / 8); await frames(page, 1); }
      await until(page, 'd => Math.hypot(d.peel.m[0]-d.peel.mt[0], d.peel.m[1]-d.peel.mt[1]) < 0.05', 3);
      const lifted = await page.evaluate(() => __desk.surface(1, 1)[2]), moved = await canvasPt(page, [0.97, 0.97]);
      const px = Math.hypot(moved.x - c.x, moved.y - c.y);
      if (lifted > 0.15 && px > 80) ok(`curl: the corner lifts ${lifted.toFixed(2)} units and travels ${px | 0} px with the drag`); else fail(`curl: corner lift ${lifted.toFixed(3)}, moved ${px | 0} px`);
      await page.mouse.up();
      const back = await until(page, 'd => !d.peel.on', 4);
      if (back.ok && back.sim <= 3) ok(`curl: let go, it springs back and settles in ${back.sim.toFixed(2)} s`); else fail(`curl: did not settle within 3 s (${back.sim.toFixed(2)} s)`);
    }
    // C · a curled sheet stays typeable
    if (acts.curl) {
      await tool(page, 'type');
      await page.evaluate(() => __desk.stage('curl', { to: [0.0, -0.1] })); await until(page, 'd => d.peel.on', 1); await frames(page, 3);
      const r = await clickType(page, edit, ' ok', 'curl');
      if (r.focused && r.typed && r.uploads > 0) ok(`curled: a click through the bend focuses ${edit}, typing changes it (${r.uploads} uploads)`); else fail(`curled: focus ${r.focused}, typed ${r.typed}, uploads ${r.uploads}`);
      await page.evaluate(() => { __desk.peel.drag = false; __desk.peel.mt = __desk.peel.g.slice(); }); await until(page, 'd => !d.peel.on', 5);
    }
    // D · fold with a real drag, then smooth it out: the fold opens, the crease line stays
    if (acts.fold) {
      await tool(page, 'fold');
      const a = await canvasPt(page, [0.5, 0.97]), b = await canvasPt(page, [0.5, 0.45]);
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(a.x, a.y + (b.y - a.y) * i / 8); await frames(page, 1); }
      await until(page, 'd => Math.hypot(d.peel.m[0]-d.peel.mt[0], d.peel.m[1]-d.peel.mt[1]) < 0.05', 3);
      await page.mouse.up(); await frames(page, 3);
      const f = await page.evaluate(() => ({ folds: __desk.state.folds.length, top: __desk.surface(0.5, 0.99)[2] }));
      if (f.folds === 1 && f.top > 0.01) ok(`fold: a drag and release leaves 1 fold, the flap lies on top (z ${f.top.toFixed(3)})`); else fail(`fold: folds ${f.folds}, flap z ${f.top.toFixed(3)}`);
      await page.click('[data-pd=flatten]').catch(() => page.evaluate(() => __desk.flatten()));
      const fl = await until(page, 'd => d.state.folds.length === 0', 4);
      const cr = await page.evaluate(() => __desk.state.creases);
      if (fl.ok && cr >= 1) ok(`flatten: the fold opens in ${fl.sim.toFixed(2)} s and its crease stays (${cr})`); else fail(`flatten: folds left after ${fl.sim.toFixed(2)} s, creases ${cr}`);
    }
    // E · crumple: hold → a ball much smaller than the sheet; let go → it opens, wrinkled
    if (acts.crumple) {
      await tool(page, 'crumple');
      const A0 = await area(page), c = await canvasPt(page, [0.5, 0.5]);
      await page.mouse.move(c.x, c.y); await page.mouse.down();
      const got = await until(page, 'd => d.state.cr > 0.97', 5);
      const A1 = await area(page);
      if (got.ok && A1 < 0.45 * A0) ok(`crumple: holding gathers it in ${got.sim.toFixed(2)} s to ${(100 * A1 / A0).toFixed(0)} % of its flat area`); else fail(`crumple: cr ${got.ok}, area ${(100 * A1 / A0).toFixed(0)} %`);
      await page.mouse.up();
      const op = await until(page, 'd => d.state.cr === 0', 4);
      const wr = await page.evaluate(() => __desk.state.wrinkle);
      if (op.ok && wr > 0.3) ok(`crumple: let go, it opens in ${op.sim.toFixed(2)} s and keeps its wrinkles (${wr.toFixed(2)})`); else fail(`crumple: open ${op.ok}, wrinkle ${wr.toFixed(2)}`);
      // half crumpled, the visible text still takes clicks and keys
      await tool(page, 'type');
      await page.evaluate(() => __desk.stage('half', { amount: 0.35, at: [0.15, -0.6] })); await frames(page, 3);
      const pt = await elPt(page, edit), h = await page.evaluate(p => { const c = document.querySelector('canvas').getBoundingClientRect(); const k = __desk.pick(p.x - c.left, p.y - c.top); return k && k.front; }, pt);
      if (!h) info('half crumpled: the editable is folded out of sight here; skipped the click');
      else { const r = await clickType(page, edit, ' yes', 'half'); if (r.focused && r.typed) ok(`half crumpled: a click on the bent text focuses ${edit} and typing works`); else fail(`half crumpled: focus ${r.focused}, typed ${r.typed}`); }
      await page.evaluate(() => { __desk.state.crFreeze = false; __desk.state.crHold = false; }); await until(page, 'd => d.state.cr === 0', 4);
    }
    // F · burn: a click lights it; the hole grows along noise, embers fly, the hole is not hittable, the rest still is
    if (acts.burn) {
      await page.evaluate(() => __desk.fresh()); await until(page, 'd => !d.state.sliding', 4);
      await tool(page, 'burn');
      const at = await canvasPt(page, [0.62, 0.62]);
      await page.mouse.click(at.x, at.y);
      const g = await until(page, 'd => d.burns.length && d.burns[0][2] > 0.2', 4);
      const n = await page.evaluate(() => ({ r: __desk.burns.length ? __desk.burns[0][2] : 0, parts: __desk.particles }));
      if (g.ok && n.parts > 0) ok(`burn: the front reaches r ${n.r.toFixed(2)} in ${g.sim.toFixed(2)} s, ${n.parts} embers / smoke`); else fail(`burn: r ${n.r.toFixed(2)}, particles ${n.parts}`);
      await tool(page, 'type');
      await page.mouse.move(at.x, at.y); await frames(page, 3);
      if (!(await hitSheet(page, at))) ok('burn: a click in the hole reaches the desk, not the page'); else fail('burn: the hole still hits the page');
      const r = await clickType(page, edit, ' !', 'burn');
      if (r.focused && r.typed) ok(`burning: ${edit} is still focusable and typeable`); else fail(`burning: focus ${r.focused}, typed ${r.typed}`);
    }
    // G · stain (when the topic has one)
    if (acts.stain) {
      await tool(page, 'stain');
      const at = await canvasPt(page, [0.3, 0.3]); await page.mouse.click(at.x, at.y);
      const s = await until(page, 'd => d.state.stains.length && d.state.stains[0].age > 1.2', 3);
      if (s.ok) ok(`stain: a click spills one that spreads for ${s.sim.toFixed(2)} s`); else fail('stain: no spill');
      await tool(page, 'type');
    }
    // H · lamp off darkens the desk
    {
      const s0 = await stats(page, clip);
      await page.evaluate(() => __desk.lamp(false)); await until(page, 'd => d.state.lamp < 0.03', 4); await page.evaluate(() => __desk.redraw()); await drawn(page, 2);
      const s1 = await stats(page, clip);
      if (s1.mean < s0.mean * 0.75) ok(`lamp off: mean luma ${s0.mean} → ${s1.mean}`); else fail(`lamp off: luma ${s0.mean} → ${s1.mean}`);
      await page.evaluate(() => __desk.lamp(true));
    }
    // I · a fresh sheet resets every act
    {
      await page.evaluate(() => __desk.fresh());
      const f = await until(page, 'd => !d.state.sliding && !d.state.burns.length && !d.state.folds.length && d.state.cr === 0', 4);
      if (f.ok) ok(`fresh sheet: slides in clean in ${f.sim.toFixed(2)} s`); else fail('fresh sheet: state not reset');
    }
    // J · sound: synthesised, started by a gesture, with a toggle
    {
      const s = await page.evaluate(() => ({ ctx: !!__desk.audio, toggle: !!document.querySelector('[data-pd=sound]') }));
      if (s.ctx && s.toggle) ok('sound: an AudioContext started by the gestures, toggle present'); else fail(`sound: context ${s.ctx}, toggle ${s.toggle}`);
    }
  }
});

// K · before any gesture there is no sound, and #still pages are the same picture on every load
{
  const shots = [];
  for (let k = 0; k < 2; k++) {
    const { browser, page, errors } = await open(file, { hash: 'still=1&' + q });
    await waitReady(page, errors, 180000); await page.waitForTimeout(2500);
    let same = 0; for (let i = 0; i < 240 && same < 3; i++) { await page.waitForTimeout(500); same = (await page.evaluate(() => __desk.settled)) ? same + 1 : 0; }
    if (k === 0) { const a = await page.evaluate(() => __desk.audio); console.log(a === null ? 'ok   no audio before a gesture' : 'FAIL audio started before a gesture'); if (a !== null) process.exitCode = 1; }
    const c = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    shots.push(await stats(page, c)); await browser.close();
  }
  const d = diff(shots[0], shots[1]);
  if (d < 1.0) console.log(`ok   #still=1 is deterministic (pixel diff ${d.toFixed(2)})`); else { console.log(`FAIL #still=1 differs between loads (diff ${d.toFixed(2)})`); process.exitCode = 1; }
}
