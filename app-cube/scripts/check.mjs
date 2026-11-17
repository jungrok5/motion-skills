// app-cube · check.mjs — proves an app-cube page with numbers. Run from anywhere:
//   node <skill>/scripts/check.mjs <page.html>
// The shared checks (scripts/hic-test.mjs: loads, draws, a real click types into the live page, a real click reaches a
// button, frames, phone width, fallback) plus this style's own:
//   tiles      every visible tile hit-tests to its own ninth of its own app (a real mouse move, then elementFromPoint)
//   grid       every control (button, input, select; not [data-span]) sits inside one tile with an 8 px margin
//   twist      a real drag on a tile turns its layer: one move recorded, the picture changes, it settles within 1.5 s
//   live       after the twist, a real click on a tile of the text field still focuses it and typing still works
//   scramble   a seeded scramble, then the tiles still map; Undo takes one move back; Solve returns to solved
//   orbit      dragging the backdrop turns the view, and the inertia comes to rest within 3 s
//   sound      no AudioContext before a gesture; #still is deterministic; #calm holds still
import { run, open, waitReady, stats, diff } from './hic-test.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html>'); process.exit(1); }
const sleep = (page, ms) => page.waitForTimeout(ms);
const busy = (page) => page.evaluate(() => window.__cube.state().busy);
async function settleTime(page, limit = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limit) { if (!(await busy(page))) return Date.now() - t0; await sleep(page, 50); }
  return Infinity;
}
// move the real mouse onto every visible tile and ask the browser what is under it
async function tiles(t, label) {
  const { page, ok, fail } = t;
  const list = await page.evaluate(() => {
    const c = window.__cube, T = c.faces[0].offsetWidth / 3, cr = document.querySelector('canvas').getBoundingClientRect();
    return c.visibleTiles().filter(s => s.top).map(s => {
      const p = c.toScreen(s.face, s.col * T + T / 2, s.row * T + T / 2);
      return p && { ...s, sx: cr.left + p[0], sy: cr.top + p[1], lx: s.col * T + T / 2, ly: s.row * T + T / 2 };
    }).filter(Boolean);
  });
  let good = 0; const bad = [];
  for (const s of list) {
    await page.mouse.move(s.sx, s.sy, { steps: 2 }); await sleep(page, 90);
    const r = await page.evaluate((s) => {
      const c = window.__cube, h = document.elementFromPoint(s.sx, s.sy);
      if (!h) return 'nothing';
      const f = c.faceOf(h); if (f !== s.face) return `face ${f} (${h.tagName}${h.id ? '#' + h.id : ''})`;
      const b = c.localBox(h);
      return b && s.lx >= b[0] - 3 && s.lx <= b[0] + b[2] + 3 && s.ly >= b[1] - 3 && s.ly <= b[1] + b[3] + 3 ? '' : `wrong part (${h.tagName}${h.id ? '#' + h.id : ''})`;
    }, s);
    if (!r) good++; else bad.push(`f${s.face} r${s.row} c${s.col}: ${r}`);
  }
  if (list.length >= 9 && good === list.length) ok(`tiles ${label}: ${good}/${list.length} visible tiles hit their own part of their own app`);
  else fail(`tiles ${label}: ${good}/${list.length} visible tiles map right; ${bad.slice(0, 4).join(' | ')}`);
}

// #quality lowers only the backing resolution, so a busy machine (software GL) keeps up; set QUALITY=1 for full size
const Q = process.env.QUALITY || '0.6';
await run(file, {
  hash: 'quality=' + Q,
  typeText: ' and it keeps working',
  extra: async (t) => {
    const { page, ok, fail, info, clip } = t;
    if (!(await page.evaluate(() => !!window.__cube))) { fail('no window.__cube (is lib/cube.js loaded and AppCube.create called?)'); return; }

    // grid: controls inside one tile
    const grid = await page.evaluate(() => {
      const c = window.__cube, T = c.faces[0].offsetWidth / 3, out = [];
      let n = 0;
      c.faces.forEach(f => f.querySelectorAll('button, input, select, textarea').forEach(el => {
        if (el.closest('[data-span]')) return;
        n++; const b = c.localBox(el), m = 8;
        const c0 = Math.floor((b[0] - m) / T), c1 = Math.floor((b[0] + b[2] + m - 1) / T), r0 = Math.floor((b[1] - m) / T), r1 = Math.floor((b[1] + b[3] + m - 1) / T);
        if (c0 !== c1 || r0 !== r1 || b[0] < m || b[1] < m) out.push((el.id || el.textContent.trim().slice(0, 12) || el.tagName) + ` [${b.map(Math.round)}]`);
      }));
      return { n, out };
    });
    if (grid.out.length) fail(`grid: ${grid.out.length}/${grid.n} controls straddle a tile seam: ${grid.out.slice(0, 5).join(', ')} (move them, or mark data-span)`);
    else ok(`grid: all ${grid.n} controls sit inside one tile (8 px margin)`);

    await tiles(t, 'solved');

    // twist: a real drag on a tile that is not text
    const before = await stats(page, clip);
    // a tile whose element is not text or a control (hover it first: only the tile under the pointer is live)
    const cands = await page.evaluate(() => {
      const c = window.__cube, T = c.faces[0].offsetWidth / 3, cr = document.querySelector('canvas').getBoundingClientRect();
      const cand = c.visibleTiles().filter(s => s.top).map(s => ({ s, p: c.toScreen(s.face, s.col * T + T / 2, s.row * T + T / 2) })).filter(o => o.p);
      cand.sort((a, b) => Math.hypot(a.p[0] - cr.width / 2, a.p[1] - cr.height * .62) - Math.hypot(b.p[0] - cr.width / 2, b.p[1] - cr.height * .62));
      return cand.map(o => ({ x: cr.left + o.p[0], y: cr.top + o.p[1], face: o.s.face, row: o.s.row, col: o.s.col }));
    });
    let tgt = null;
    for (const o of cands) {
      await page.mouse.move(o.x, o.y, { steps: 2 }); await sleep(page, 120);
      const textish = await page.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); return !h || !!(h.closest && h.closest('[contenteditable],input,textarea,select,[data-drag],button,label')); }, [o.x, o.y]);
      if (!textish) { tgt = o; break; }
    }
    if (!tgt) tgt = { ...cands[0], shift: true };
    await page.mouse.move(tgt.x, tgt.y); await sleep(page, 150);
    if (tgt.shift) await page.keyboard.down('Shift');
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(tgt.x + i * 14, tgt.y + i * 1.5); await sleep(page, 16); }
    await page.mouse.up();
    if (tgt.shift) await page.keyboard.up('Shift');
    const st = await settleTime(page);
    const s1 = await page.evaluate(() => window.__cube.state());
    const after = await stats(page, clip), d = diff(before, after);
    if (s1.moves === 1 && !s1.solved) ok(`twist: a real drag on tile f${tgt.face} r${tgt.row} c${tgt.col} turned a layer (${s1.last}), picture change ${d.toFixed(1)}`);
    else fail(`twist: after a drag, moves ${s1.moves}, solved ${s1.solved}`);
    const es = s1.settle;
    if (st !== Infinity && es > 0.05 && es <= 1.2) ok(`twist: the released layer swung home on its spring in ${es.toFixed(2)} s of engine time (≤ 1.2; ${st} ms wall here)`);
    else fail(`twist: the layer settled in ${es} s engine time (${st} ms wall)`);
    await sleep(page, 900);   // recoil

    // live after the twist: click a tile of the text field, type
    const ed = await page.evaluate(() => {
      const c = window.__cube, el = document.querySelector('canvas [data-hic-edit]') || document.querySelector('canvas [contenteditable]');
      if (!el) return null;
      const f = c.faceOf(el), b = c.localBox(el), T = c.faces[0].offsetWidth / 3, cr = document.querySelector('canvas').getBoundingClientRect();
      const tiles = c.visibleTiles().filter(s => s.top && s.face === f);
      for (const s of tiles) {
        const x = s.col * T + T / 2, y = s.row * T + T / 2;
        if (x < b[0] || x > b[0] + b[2] || y < b[1] || y > b[1] + b[3]) continue;
        const p = c.toScreen(f, x, y); if (p) return { id: el.id, x: cr.left + p[0], y: cr.top + p[1], tile: `r${s.row} c${s.col}`, moved: JSON.stringify(c.slotOf(f, s.row, s.col)) };
      }
      return { id: el.id, none: true };
    });
    if (!ed || ed.none) fail('live: no visible tile of the text field after the twist');
    else {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.mouse.move(ed.x - 20, ed.y); await sleep(page, 80); await page.mouse.move(ed.x, ed.y); await sleep(page, 200);
      await page.mouse.click(ed.x, ed.y); await sleep(page, 150);
      const foc = await page.evaluate(id => document.activeElement && document.activeElement.id === id, ed.id);
      const up0 = await page.evaluate(() => window.__hic.uploads), txt0 = await page.evaluate(id => document.getElementById(id).textContent, ed.id);
      await page.keyboard.type(' still', { delay: 30 }); await sleep(page, 600);
      const up1 = await page.evaluate(() => window.__hic.uploads), txt1 = await page.evaluate(id => document.getElementById(id).textContent, ed.id);
      if (foc && txt1 !== txt0 && up1 > up0) ok(`live: after the twist a real click on tile ${ed.tile} focuses #${ed.id}; typing changes it (${up1 - up0} uploads)`);
      else fail(`live: after the twist focus ${foc}, text changed ${txt1 !== txt0}, uploads +${up1 - up0}`);
    }

    // scramble, tiles, undo, solve
    await page.evaluate(() => { window.__cube.solve(); });
    await settleTime(page, 60000);
    await page.evaluate(() => { window.__cube.scramble(9); });   // short, so a loaded machine finishes it
    const sc = await settleTime(page, 180000);
    const s2 = await page.evaluate(() => window.__cube.state());
    if (!s2.solved && s2.moves >= 6 && sc !== Infinity) ok(`scramble: ${s2.moves} moves (seeded), done in ${(sc / 1000).toFixed(1)} s wall`); else fail(`scramble: solved ${s2.solved}, moves ${s2.moves}`);
    await sleep(page, 900);
    await tiles(t, 'scrambled');
    await page.evaluate(() => window.__cube.undo()); await settleTime(page);
    const s3 = await page.evaluate(() => window.__cube.state());
    if (s3.moves === s2.moves - 1) ok(`undo: ${s2.moves} → ${s3.moves} moves`); else fail(`undo: ${s2.moves} → ${s3.moves}`);
    await page.evaluate(() => window.__cube.solve()); const so = await settleTime(page, 180000);
    const s4 = await page.evaluate(() => window.__cube.state());
    if (s4.solved && s4.moves === 0) ok(`solve: back to solved in ${(so / 1000).toFixed(1)} s`); else fail(`solve: solved ${s4.solved}, moves ${s4.moves}`);

    // orbit
    await sleep(page, 900);
    const o0 = await stats(page, clip);
    const vp = page.viewportSize();
    const bx = 60, by = vp.height - 60;
    const hitBg = await page.evaluate(([x, y]) => window.__cube.tileAt(x, y) === null, [bx, by]);
    if (!hitBg) info('orbit: skipped (no backdrop at the corner)');
    else {
      await page.mouse.move(bx, by); await page.mouse.down();
      for (let i = 1; i <= 10; i++) { await page.mouse.move(bx + i * 18, by - i * 3); await sleep(page, 16); }
      const c0 = await page.evaluate(() => window.__cube.state().clock);
      await page.mouse.up();
      await sleep(page, 300); const o1 = await stats(page, clip);
      let rest = null; const t0 = Date.now();
      while (Date.now() - t0 < 60000) { const s = await page.evaluate(() => window.__cube.state()); if (!s.spinning) { rest = s.clock - c0; break; } await sleep(page, 60); }
      const o2 = await stats(page, clip); await sleep(page, 500); const o3 = await stats(page, clip);
      const turned = diff(o0, o1), still = diff(o2, o3);
      if (turned > 1 && rest !== null && rest <= 3 && still < 0.5) ok(`orbit: the view turned (change ${turned.toFixed(1)}), the inertia came to rest in ${rest.toFixed(2)} s of engine time (≤ 3)`);
      else fail(`orbit: turned ${turned.toFixed(2)}, rest after ${rest} s, then change ${still.toFixed(2)}`);
    }
    const snd = await page.evaluate(() => window.__cube.sound.running);
    info(`sound: AudioContext ${snd ? 'running after the gestures' : 'not running (sound toggled off?)'}`);
  }
});

// fresh loads: sound off before a gesture, #still deterministic, #calm still
{
  let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m);
  const A = await open(file, { hash: 'still=1&quality=' + Q }); await waitReady(A.page, A.errors); await sleep(A.page, 1200);
  const pre = await A.page.evaluate(() => window.__cube.sound.running);
  if (pre) fail('sound: an AudioContext exists before any gesture'); else ok('sound: no AudioContext before a gesture');
  const a1 = await stats(A.page); await A.browser.close();
  const B = await open(file, { hash: 'still=1&quality=' + Q }); await waitReady(B.page, B.errors); await sleep(B.page, 1200);
  const b1 = await stats(B.page); await B.browser.close();
  const dd = diff(a1, b1);
  if (dd < 0.6) ok(`still: two loads at #still=1 match (difference ${dd.toFixed(2)})`); else fail(`still: two loads at #still=1 differ by ${dd.toFixed(2)}`);
  const C = await open(file, { hash: 'calm&quality=' + Q }); await waitReady(C.page, C.errors); await sleep(C.page, 1500);
  const c1 = await stats(C.page); await sleep(C.page, 1200); const c2 = await stats(C.page); await C.browser.close();
  const dc = diff(c1, c2);
  if (dc < 0.6) ok(`calm: no idle motion under #calm (change ${dc.toFixed(2)} over 1.2 s)`); else fail(`calm: the page moves under #calm (${dc.toFixed(2)})`);
  if (bad) { console.log(`\n${bad} more check(s) failed`); process.exitCode = 1; }
}
