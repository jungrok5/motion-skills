// lit-room · check.mjs — proves a lit-room page with numbers (headless Chromium, HTML-in-Canvas on, software GL).
//   node <skill>/scripts/check.mjs <page.html> [--full]      (--full: render scale 1 and MSAA; default #q=0.5 for speed)
// The shared checks (scripts/hic-test.mjs): loads, draws, a real click through the drawing types into the page, a click
// reaches [data-hic-click], frames keep coming, phone width, the fallback. Then this skill's own:
//   room     the room builds: vertices, triangles, build time, the screen faces into the room, no NaN, props inside the room
//   light    the page lights the room: a red page turns the desk red, a blue page turns it blue (colour ratios, > 15 %)
//   lamps    a page lamp dragged with the real mouse across the screen moves in the page (> 300 px) and moves the light
//            (the left / right balance of the desk drops by more than 40 %)
//   look     a real drag on the room turns the camera (> .2 rad), it settles within 3 s, and the page is still clickable
//            where it is drawn afterwards; the wheel zooms
//   keys     typing sinks the matching keys of the 3D keyboard and they come back up
//   switch   a room lamp switched off changes the picture
import { run, open, waitReady, stats, diff } from './hic-test.mjs';
const file = process.argv[2];
if (!file) { console.error('usage: check.mjs <page.html> [--full]'); process.exit(1); }
const hash = process.argv.includes('--full') ? 'nointro' : 'q=0.5&nointro';

const settled = async (page, n = 2, max = 120) => {
  let same = 0;
  for (let i = 0; i < max && same < n; i++) { await page.waitForTimeout(300); same = (await page.evaluate(() => window.__lit.settled)) ? same + 1 : 0; }
};
const after = async (page) => { const r0 = await page.evaluate(() => window.__lit.renders); for (let i = 0; i < 100; i++) { await page.waitForTimeout(200); if ((await page.evaluate(() => window.__lit.renders)) > r0 + 1) break; } await settled(page); };
// mean colour of a small square around canvas point p
async function colourAt(page, p, r = 22) {
  const png = await page.screenshot({ clip: { x: Math.max(0, p[0] - r), y: Math.max(0, p[1] - r), width: 2 * r, height: 2 * r }, timeout: 120000 });
  return await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let s = [0, 0, 0], n = 0;
    for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; }
    return s.map(v => v / n);
  }, png.toString('base64'));
}
const share = (c, k) => c[k] / Math.max(1, c[0] + c[1] + c[2]);
const luma = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

await run(file, {
  hash, settle: 1500, typeSettle: 2500, timeout: 180000,
  extra: async ({ page, ok, fail, info }) => {
    // ---- room
    const room = await page.evaluate(() => {
      const R = window.__lit, V = R.builder.V, S = R.room.size, s = R.screen; let nan = 0, out = 0, n = V.length / 20;
      for (let i = 0; i < n; i++) { const o = i * 20; if (V[o + 12] === 15) continue; for (let k = 0; k < 3; k++) { const x = V[o + k]; if (!isFinite(x)) nan++; else if (x < -0.25 || x > S[k] + 0.25) out++; } }
      const mid = [S[0] / 2, S[1] / 2, S[2] / 2], d = [mid[0] - s.c[0], mid[1] - s.c[1], mid[2] - s.c[2]];
      return { info: window.__hic.info, nan, out, faces: s.n[0] * d[0] + s.n[1] * d[1] + s.n[2] * d[2] > 0, lamps: R.lamps.length, keys: Object.keys(R.builder.keys).length };
    });
    if (room.nan) fail(`room: ${room.nan} vertex coordinates are not numbers`);
    else if (room.out) fail(`room: ${room.out} vertex coordinates lie outside the room (props placed through a wall?)`);
    else if (!room.faces) fail('room: the screen faces away from the room');
    else ok(`room: ${room.info.verts} vertices, ${room.info.tris | 0} triangles, built + AO baked in ${room.info.buildMs} ms, ${room.lamps} lamps, ${room.keys} keys, light grid ${room.info.grid.join('×')}`);
    await page.evaluate(() => { window.__lit.home(); }); await settled(page);
    await page.evaluate(() => { const R = window.__lit; R.view(R.cam.ty, R.cam.tp, R.cam.td, true); }); await after(page);
    // where to look: the desk in front of the screen (the bounce card), its left and right
    const pts = await page.evaluate(() => {
      const R = window.__lit, s = R.screen, B = R.room.bounce, c = B ? B.at : [s.c[0], s.c[1] - 0.15, s.c[2] + 0.2];
      const fwd = [c[0] + s.n[0] * 0.12, c[1] + 0.001, c[2] + s.n[2] * 0.12], u = [s.u[0] / s.w, 0, s.u[2] / s.w], half = Math.min(0.45, (B ? B.w : 1) * 0.36);
      const P = p => { const q = R.project(p); return q ? [q[0], q[1]] : null; };
      return { mid: P(fwd), left: P([fwd[0] - u[0] * half, fwd[1], fwd[2] - u[2] * half]), right: P([fwd[0] + u[0] * half, fwd[1], fwd[2] + u[2] * half]) };
    });
    const canvasBox = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top]; });
    const abs = p => [p[0] + canvasBox[0], p[1] + canvasBox[1]];
    // ---- light: cover the page with a colour (a real DOM change), read the desk
    const cover = async (colour) => { await page.evaluate(c => { let d = document.getElementById('lr-check-cover'); if (!d) { d = document.createElement('div'); d.id = 'lr-check-cover'; d.style.cssText = 'position:absolute;inset:0;z-index:99;pointer-events:none'; document.getElementById('page').appendChild(d); } d.style.background = c; d.style.display = c ? 'block' : 'none'; }, colour); await after(page); };
    // switch room lamps off so only the screen lights the desk
    const lampState = await page.evaluate(() => window.__lit.lamps.map((l, i) => { const on = window.__lit.lamp(i); window.__lit.lamp(i, false); return on; }));
    await cover('#ff1030'); const red = await colourAt(page, abs(pts.mid));
    await cover('#1040ff'); const blue = await colourAt(page, abs(pts.mid));
    const dr = share(red, 0) - share(blue, 0), db = share(blue, 2) - share(red, 2);
    if (dr > 0.15 && db > 0.15) ok(`light: a red page reddens the desk (red share ${share(red, 0).toFixed(2)}) and a blue one blues it (blue share ${share(blue, 2).toFixed(2)})`);
    else fail(`light: the desk barely follows the page colour (red share Δ ${dr.toFixed(3)}, blue share Δ ${db.toFixed(3)})`);
    // ---- lamps: on a black page, drag the first page lamp from the left edge to the right edge with the real mouse
    const hasLamp = await page.evaluate(() => !!document.querySelector('#page [data-lamp]'));
    if (hasLamp) {
      await cover('');
      await page.evaluate(() => { const p = document.getElementById('page'); p.querySelectorAll('[data-lamp]').forEach((l, i) => { if (i) l.style.display = 'none'; }); const d = document.createElement('style'); d.id = 'lr-check-style'; d.textContent = '#page, #page section { background: #000 !important; } #page .bar, #page [data-hic-edit], #page [data-panel] > :not([data-lamp]) { visibility: hidden }'; p.appendChild(d); });
      const lamp = await page.evaluate(() => { const l = document.querySelector('#page [data-lamp]'), par = l.offsetParent; let ox = 0, oy = 0; for (let n = par; n && n.id !== 'page'; n = n.offsetParent) { ox += n.offsetLeft; oy += n.offsetTop; } return { w: par.clientWidth, h: par.clientHeight, ox, oy }; });
      const setAt = async (fx) => { await page.evaluate(([fx, L]) => { const l = document.querySelector('#page [data-lamp]'); l.style.left = (L.w * fx) + 'px'; l.style.top = (L.h * 0.5) + 'px'; }, [fx, lamp]); await after(page); };
      await setAt(0.12);
      const L1 = [luma(await colourAt(page, abs(pts.left))), luma(await colourAt(page, abs(pts.right)))];
      const from = await page.evaluate(() => { const l = document.querySelector('#page [data-lamp]'); const b = window.__hic.screenOf(l); return { s: b, x: l.offsetLeft }; });
      const to = await page.evaluate(([L]) => window.__lit.pageToCanvas(L.ox + L.w * 0.88, L.oy + L.h * 0.5), [lamp]);
      const A = abs(from.s), Bp = abs(to);
      await page.mouse.move(A[0], A[1]); await page.waitForTimeout(200); await page.mouse.down();
      for (let k = 1; k <= 12; k++) { await page.mouse.move(A[0] + (Bp[0] - A[0]) * k / 12, A[1] + (Bp[1] - A[1]) * k / 12); await page.waitForTimeout(60); }
      await page.mouse.up(); await after(page);
      const moved = await page.evaluate(() => document.querySelector('#page [data-lamp]').offsetLeft) - from.x;
      const L2 = [luma(await colourAt(page, abs(pts.left))), luma(await colourAt(page, abs(pts.right)))];
      const b1 = L1[0] / Math.max(1, L1[1]), b2 = L2[0] / Math.max(1, L2[1]);
      if (moved < 300) fail(`lamps: a real drag moved the page lamp only ${moved | 0} px`);
      else ok(`lamps: a real mouse drag through the 3D screen moved the page lamp ${moved | 0} px`);
      if (b2 < b1 * 0.6) ok(`lamps: the light on the desk follows it (left/right ${b1.toFixed(2)} → ${b2.toFixed(2)})`);
      else fail(`lamps: the desk light did not follow the lamp (left/right ${b1.toFixed(2)} → ${b2.toFixed(2)})`);
      await page.evaluate(() => { document.getElementById('lr-check-style').remove(); document.querySelectorAll('#page [data-lamp]').forEach(l => { l.style.display = ''; }); });
    } else info('lamps: this page has no [data-lamp]; skipped');
    await cover('');
    await page.evaluate(s => s.forEach((on, i) => window.__lit.lamp(i, on)), lampState); await after(page);
    // ---- switch: a room lamp off and on again changes the picture
    if (room.lamps) {
      const s0 = await stats(page);
      await page.evaluate(() => window.__lit.lamp(0, !window.__lit.lamp(0))); await after(page);
      const s1 = await stats(page), d = diff(s0, s1);
      await page.evaluate(() => window.__lit.lamp(0, !window.__lit.lamp(0))); await after(page);
      if (d > 1) ok(`switch: turning "${await page.evaluate(() => window.__lit.lamps[0].name)}" over changes the picture (diff ${d.toFixed(1)})`); else fail(`switch: a room lamp switched over changed nothing (diff ${d.toFixed(2)})`);
    }
    // ---- look: drag the room (an empty spot of the canvas, not the page), it turns, settles, the page stays clickable
    const empty = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); for (const [fx, fy] of [[0.06, 0.9], [0.94, 0.9], [0.06, 0.12], [0.94, 0.12], [0.5, 0.95]]) { const x = c.left + c.width * fx, y = c.top + c.height * fy; if (document.elementFromPoint(x, y) === document.querySelector('canvas')) return [x, y]; } return null; });
    if (!empty) fail('look: no empty spot of the room to drag');
    else {
      const y0 = await page.evaluate(() => window.__lit.cam.yaw);
      await page.mouse.move(empty[0], empty[1]); await page.mouse.down();
      for (let k = 1; k <= 10; k++) { await page.mouse.move(empty[0] - 14 * k, empty[1] - 3 * k); await page.waitForTimeout(40); }
      await page.mouse.up();
      const t0 = Date.now(); let st = false;
      for (let i = 0; i < 60 && !st; i++) { await page.waitForTimeout(100); st = await page.evaluate(() => { const c = window.__lit.cam; return Math.abs(c.yaw - c.ty) < 2e-3 && Math.abs(c.pitch - c.tp) < 2e-3; }); }
      // the camera's own clock is the frame loop: on software GL a second of easing can take longer in wall time
      const y1 = await page.evaluate(() => window.__lit.cam.yaw), dy = Math.abs(y1 - y0);
      if (dy < 0.2) fail(`look: dragging the room turned the camera only ${dy.toFixed(3)} rad`);
      else if (!st) fail('look: the camera did not settle after the drag');
      else ok(`look: a drag turned the camera ${dy.toFixed(2)} rad and it settled (${((Date.now() - t0) / 1000).toFixed(1)} s wall time)`);
      await after(page);
      const sel = await page.evaluate(() => { const e = document.querySelector('#page [data-hic-edit]'); if (!e.id) e.id = 'lr-edit'; return '#' + e.id; });
      const p = abs(await page.evaluate(s => window.__hic.screenOf(document.querySelector(s)), sel));
      await page.mouse.move(p[0] - 20, p[1]); await page.waitForTimeout(150); await page.mouse.move(p[0], p[1]); await page.waitForTimeout(300); await page.mouse.click(p[0], p[1]); await page.waitForTimeout(200);
      const focused = await page.evaluate(s => { const e = document.querySelector(s); return document.activeElement === e || e.contains(document.activeElement); }, sel);
      if (focused) ok(`look: after turning, a real click on the screen still lands in ${sel}`); else fail(`look: after turning, a click at (${p[0] | 0}, ${p[1] | 0}) missed ${sel}`);
      const d0 = await page.evaluate(() => window.__lit.cam.td);
      await page.mouse.move(empty[0], empty[1]); await page.mouse.wheel(0, -300); await page.waitForTimeout(300);
      const d1 = await page.evaluate(() => window.__lit.cam.td);
      if (d1 < d0 * 0.8) ok(`look: the wheel zooms (distance ${d0.toFixed(2)} → ${d1.toFixed(2)} m)`); else fail(`look: the wheel did not zoom (${d0.toFixed(2)} → ${d1.toFixed(2)})`);
    }
    // ---- keys
    if (room.keys) {
      await page.keyboard.down('KeyF'); await page.waitForTimeout(400);
      const down = await page.evaluate(() => window.__lit.keyDepth('KeyF'));
      await page.keyboard.up('KeyF'); await page.waitForTimeout(600);
      const up = await page.evaluate(() => window.__lit.keyDepth('KeyF'));
      if (down > 0.5 && up < 0.05) ok(`keys: holding F sinks the 3D key (${down.toFixed(2)}) and it springs back (${up.toFixed(2)})`);
      else fail(`keys: the 3D key did not follow the keyboard (down ${down}, up ${up})`);
    }
  }
});
