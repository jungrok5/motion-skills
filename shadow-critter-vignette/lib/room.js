// shadow-critter-vignette · room.js — the painted place, in one-point perspective.
// A pinhole camera looks straight into a box-shaped room. World units are pixels at the reference depth `refZ`
// (so a thing at refZ is drawn at scale 1). X is across (0 = the camera's axis), Y is up from the floor, Z is depth.
//   proj(X, Y, Z) → [sx, sy]     scaleAt(Z) → px per world unit     floor(X, Z) → the floor point on screen
// Everything here paints once into a plate (Vignette caches it): washes and pen lines, the window's backlight, light shafts
// on the floor. Faces of walls and boxes are painted through face maps — (u, v) in 0..1 → screen — so a shelf, a poster,
// a panel of buttons sits on its wall in perspective without any 3D library.
import * as P from './paint.js';

/**
 * makeRoom(o) — o: W, H, horizon (screen y of the eye line), vpX (screen x of the vanishing point), eye (camera height,
 * world), refZ, left / right (wall X), back (back wall Z), ceiling (world Y), near (closest Z painted)
 */
export function makeRoom(o = {}) {
  const R = { W: 1080, H: 1440, horizon: 640, vpX: 560, eye: 520, refZ: 1000, left: -700, right: 600, back: 2600, ceiling: 1500, near: 500, ...o };
  R.f = R.refZ;
  R.proj = (X, Y, Z) => [R.vpX + R.f * X / Z, R.horizon + R.f * (R.eye - Y) / Z];
  R.scaleAt = Z => R.f / Z;
  R.floor = (X, Z) => R.proj(X, 0, Z);
  /** the depth whose floor line is at screen y */
  R.zAtY = sy => R.f * R.eye / (sy - R.horizon);
  /** face map for a planar rectangle given by 4 world corners [tl, tr, br, bl]: (u, v) → screen, perspective-correct */
  R.face = (c) => { const m = (u, v) => { const top = c[0].map((a, i) => P.lerp(a, c[1][i], u)), bot = c[3].map((a, i) => P.lerp(a, c[2][i], u)); const p = top.map((a, i) => P.lerp(a, bot[i], v)); return R.proj(p[0], p[1], p[2]); }; m.corners = c; return m; };
  R.walls = {
    back: R.face([[R.left, R.ceiling, R.back], [R.right, R.ceiling, R.back], [R.right, 0, R.back], [R.left, 0, R.back]]),
    left: R.face([[R.left, R.ceiling, R.near], [R.left, R.ceiling, R.back], [R.left, 0, R.back], [R.left, 0, R.near]]),
    right: R.face([[R.right, R.ceiling, R.back], [R.right, R.ceiling, R.near], [R.right, 0, R.near], [R.right, 0, R.back]]),
    floor: R.face([[R.left, 0, R.back], [R.right, 0, R.back], [R.right, 0, R.near], [R.left, 0, R.near]]),
    ceiling: R.face([[R.left, R.ceiling, R.near], [R.right, R.ceiling, R.near], [R.right, R.ceiling, R.back], [R.left, R.ceiling, R.back]]),
  };
  R.light = { x: 0, y: 1, color: '#ffd889', ...(o.light || {}) }; // screen direction the light travels across the floor (from the window towards the camera)
  return R;
}

/** a polygon on a face: the rectangle u0..u1 × v0..v1, subdivided so a rough edge follows the perspective */
export function quad(map, u0, v0, u1, v1, n = 6) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(map(P.lerp(u0, u1, i / n), v0));
  for (let i = 0; i < n; i++) pts.push(map(u1, P.lerp(v0, v1, i / n)));
  for (let i = 0; i < n; i++) pts.push(map(P.lerp(u1, u0, i / n), v1));
  for (let i = 0; i < n; i++) pts.push(map(u0, P.lerp(v1, v0, i / n)));
  return pts;
}
/** a sub-face: a rectangle of a face as its own face map */
export const sub = (map, u0, v0, u1, v1) => { const m = (u, v) => map(P.lerp(u0, u1, u), P.lerp(v0, v1, v)); m.corners = map.corners; return m; };

// ── the shell ──
/**
 * shell(g, R, o) — walls, floor, ceiling of the room. o: wall (colour), back (back wall colour), floor, ceiling,
 * planks (true: vertical boards on the walls), boards (floor boards count), beams (ceiling beams count), seed, dark (0..1
 * how much the side walls fall into shadow)
 */
export function shell(g, R, o = {}) {
  const s = o.seed || 11, wall = o.wall || '#7a6650', back = o.back || wall, floor = o.floor || '#b08a62', ceil = o.ceiling || P.shade(wall, -.35), dark = o.dark ?? .35;
  const W = R.walls;
  // the sheet under everything: where the paint skips, warm paper shows (granulation), never a hole
  g.drawImage(P.paper(R.W, R.H, o.paper || '#efe2c8', s), 0, 0);
  // ceiling and walls first (big washes), then floor
  P.wash(g, quad(W.ceiling, 0, 0, 1, 1, 10), { color: ceil, seed: s, alpha: .95, bloom: .9, dir: 0 });
  P.wash(g, quad(W.left, 0, 0, 1, 1, 10), { color: P.shade(wall, -dark * .6), seed: s + 1, alpha: .95, dir: 1.57 });
  P.wash(g, quad(W.right, 0, 0, 1, 1, 10), { color: P.shade(wall, -dark * .5), seed: s + 2, alpha: .95, dir: 1.57 });
  P.wash(g, quad(W.back, 0, 0, 1, 1, 10), { color: back, seed: s + 3, alpha: .95, dir: 1.57 });
  P.wash(g, quad(W.floor, 0, 0, 1, 1, 10), { color: floor, seed: s + 4, alpha: .95, dir: 0, bloom: .9 });
  const r = P.rng(s + 9);
  if (o.planks !== false) for (const [k, map, n] of [['left', W.left, 9], ['right', W.right, 9], ['back', W.back, 14]]) {
    for (let i = 1; i < n; i++) { const u = i / n + (r() - .5) * .02; P.pen(g, [map(u, 0), map(u, .5 + (r() - .5) * .2), map(u, 1)], { seed: s + i * 7 + k.length, alpha: .42 + r() * .25 }); }
    // a few boards a shade lighter or darker
    for (let i = 0; i < n; i += 2 + Math.floor(r() * 2)) P.wash(g, quad(map, i / n, 0, (i + 1) / n, 1, 4), { color: P.shade(k === 'back' ? back : wall, r() < .5 ? -.18 : .1), alpha: .35, seed: s + 40 + i, edge: .2, bloom: .4 });
  }
  // grain and knots: short loose strokes along the boards
  for (const [map, n] of [[W.left, 60], [W.right, 60], [W.back, 90], [W.floor, 90]]) for (let i = 0; i < n; i++) { const u = r(), v = r(), L = .03 + r() * .08, flo = map === W.floor; const a = flo ? map(u, v) : map(u, v), b = flo ? map(u + (r() - .5) * .01, Math.min(1, v + L)) : map(u + (r() - .5) * .004, Math.min(1, v + L)); P.pen(g, [a, b], { seed: s + 500 + i, alpha: .14 + r() * .14, width: .9 }); if (r() < .08) { P.pen(g, [...P.ellipse(a[0], a[1], 3 + r() * 3, 1.5 + r() * 2, 10), [a[0] + 4, a[1]]], { seed: s + 600 + i, alpha: .3, width: 1 }); } }
  // floor boards: lines that run to the vanishing point
  const nb = o.boards ?? 12;
  for (let i = 1; i < nb; i++) { const u = i / nb; P.pen(g, [W.floor(u, 0), W.floor(u, 1)], { seed: s + 80 + i, alpha: .5, width: 1.6 }); }
  for (let j = 0; j < 9; j++) { const v = Math.pow((j + r()) / 9, 1.8); for (let i = 0; i < nb; i++) if (r() < .45) { const u = (i + .1) / nb, u2 = (i + .9) / nb; P.pen(g, [W.floor(u, v), W.floor(u2, v)], { seed: s + 200 + j * 20 + i, alpha: .22, width: 1.1 }); } }
  // ceiling beams
  for (let i = 0; i < (o.beams ?? 4); i++) { const v = (i + .5) / (o.beams ?? 4); const a = W.ceiling(0, v), b = W.ceiling(1, v); const w = 26 * R.scaleAt(P.lerp(R.near, R.back, v)); P.wash(g, [[a[0], a[1] - w], [b[0], b[1] - w], [b[0], b[1] + w], [a[0], a[1] + w]], { color: P.shade(ceil, -.25), seed: s + 300 + i, alpha: .9, dir: 0 }); P.pen(g, [[a[0], a[1] + w], [b[0], b[1] + w]], { seed: s + 310 + i, alpha: .5 }); }
  // the corners of the room: a soft dark seam
  for (const [x, z] of [[R.left, R.back], [R.right, R.back]]) { const a = R.proj(x, R.ceiling, z), b = R.proj(x, 0, z); P.pen(g, [a, b], { seed: s + 400 + x, alpha: .55, width: 1.8 }); }
  P.pen(g, [R.proj(R.left, 0, R.back), R.proj(R.right, 0, R.back)], { seed: s + 410, alpha: .55, width: 1.8 });
}

/**
 * windowLight(g, R, map, o) — a window cut into a wall (face map region), backlit: the bright outside (sky + haze of
 * foliage), the frame and mullions in dark wood, a bloom that spills over the frame. o: cols, rows, outside ([sky, haze]),
 * frame colour, seed. Returns the opening's corners on screen (for lightShaft).
 */
export function windowLight(g, R, map, o = {}) {
  const s = o.seed || 21, [sky, haze, low] = o.outside || ['#fff4cf', '#f2d77a', '#c9b45a'], frame = o.frame || '#5a4330';
  const open = quad(map, 0, 0, 1, 1, 8), bb = P.bounds(open);
  g.save(); P.path(g, open); g.clip();
  const gr = g.createLinearGradient(0, bb[1], 0, bb[3]); gr.addColorStop(0, P.css(sky)); gr.addColorStop(.55, P.css(haze)); gr.addColorStop(1, P.css(low)); g.fillStyle = gr; g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
  // soft foliage haze outside, very washed out by the light
  const r = P.rng(s);
  for (let i = 0; i < 26; i++) { const x = P.lerp(bb[0], bb[2], r()), y = P.lerp(bb[1] + (bb[3] - bb[1]) * .35, bb[3], r()), rr = 30 + r() * 90; const gg = g.createRadialGradient(x, y, 0, x, y, rr); const c = r() < .5 ? P.mix(low, '#8fa04a', .4) : P.mix(haze, '#e8c050', .3); gg.addColorStop(0, P.css(c, .22)); gg.addColorStop(1, P.css(c, 0)); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  P.tooth(g, bb, .12, 1, s + 3);
  g.restore();
  // frame and mullions
  const cols = o.cols ?? 2, rows = o.rows ?? 3, fw = o.frameW ?? .035;
  const bar = (u0, v0, u1, v1, k) => P.wash(g, quad(map, u0, v0, u1, v1, 3), { color: P.shade(frame, k), alpha: .97, seed: s + 50 + u0 * 100 + v0 * 10, edge: .3, rough: 1.1, bloom: .3, tooth: .08 });
  bar(-fw, -fw * 1.2, 1 + fw, fw * .3, 0); bar(-fw, 1 - fw * .3, 1 + fw, 1 + fw * 1.4, -.05); bar(-fw, 0, fw * .3, 1, 0); bar(1 - fw * .3, 0, 1 + fw, 1, 0);
  for (let i = 1; i < cols; i++) bar(i / cols - fw * .7, 0, i / cols + fw * .7, 1, .05);
  for (let j = 1; j < rows; j++) bar(0, j / rows - fw * .2, 1, j / rows + fw * .2, .1);
  // bloom: the light eats the edges of the bars
  const c = [P.lerp(bb[0], bb[2], .5), P.lerp(bb[1], bb[3], .55)];
  const big = Math.max(bb[2] - bb[0], bb[3] - bb[1]);
  P.glow(g, c[0], c[1], big * .7, sky, .7);
  P.glow(g, c[0], c[1], big * 1.3, '#ffcf7a', .35);
  P.glow(g, c[0], c[1] + big * .4, big * 2.2, '#ffb860', .18);
  return open;
}

/** lightShaft(g, R, open, o) — the window's light falling across the room: a patch on the floor and a faint beam. o: dz (how
 *  far into the room the patch reaches, world), drop, k (strength), color */
export function lightShaft(g, R, winMap, o = {}) {
  const k = o.k ?? .5, col = o.color || R.light.color, dz = o.dz ?? 1200, dx = o.dx ?? 0;
  // the patch: the window's opening projected onto the floor along the light (from back towards the camera)
  const c = winMap.corners, cols = o.cols ?? 2, rows = o.rows ?? 3;
  const patch = (u0, v0, u1, v1) => { const pts = []; for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) { const top = c[0].map((a, i) => P.lerp(a, c[1][i], u)), bot = c[3].map((a, i) => P.lerp(a, c[2][i], u)), p = top.map((a, i) => P.lerp(a, bot[i], v)); const t = p[1] / (o.height ?? (c[0][1])); pts.push(R.floor(p[0] + dx * t, p[2] - dz * t)); } return pts; };
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const p = patch(i / cols + .02, j / rows + .02, (i + 1) / cols - .02, (j + 1) / rows - .02); P.path(g, P.rough(p, 3, 7 + i * 3 + j, 6)); g.fillStyle = P.css(col, k * .8); g.fill(); }
  // the beam: a wide soft wedge from the window to the patch
  const top = [R.proj(...c[0]), R.proj(...c[1])], all = patch(0, 0, 1, 1);
  const beam = [top[0], top[1], all[1], all[2], all[3]];
  const bb = P.bounds(beam), gr = g.createLinearGradient(0, bb[1], 0, bb[3]); gr.addColorStop(0, P.css(col, k * .18)); gr.addColorStop(1, P.css(col, k * .04));
  g.filter = 'blur(18px)'; P.path(g, beam); g.fillStyle = gr; g.fill(); g.filter = 'none';
  g.restore();
  return all;
}

// ── things on faces ──
/** books(g, x, y, s, o): a stack of books lying on the floor or a table at (x, y), scale s */
export function books(g, x, y, s, o = {}) {
  const r = P.rng(o.seed || 121), n = o.n || 4, cols = o.colors || ['#7a3a2e', '#3e5a4a', '#8a6a3a', '#4a4a6a', '#a8905a'];
  let yy = y; for (let i = 0; i < n; i++) { const w = (70 + r() * 40) * s, h = (12 + r() * 8) * s, dx = (r() - .5) * 16 * s, c = cols[Math.floor(r() * cols.length)];
    const bk = [[x - w / 2 + dx, yy - h], [x + w / 2 + dx, yy - h], [x + w / 2 + dx, yy], [x - w / 2 + dx, yy]]; P.wash(g, bk, { color: c, seed: (o.seed || 121) + i, alpha: .97, edge: .5, rough: .6, bloom: .3 });
    P.wash(g, [[x - w / 2 + dx + 3 * s, yy - h * .75], [x + w / 2 + dx - 2 * s, yy - h * .75], [x + w / 2 + dx - 2 * s, yy - h * .3], [x - w / 2 + dx + 3 * s, yy - h * .3]], { color: '#efe2c4', seed: (o.seed || 121) + 30 + i, alpha: .7, rough: .4, edge: .2 });
    P.pen(g, [...bk, bk[0]], { seed: (o.seed || 121) + 60 + i, alpha: .45 }); yy -= h; }
}
/** stool(g, R, X, Z, o): a small wooden stool on the floor */
export function stool(g, R, X, Z, o = {}) {
  const H = o.h || 160, w = o.w || 120, c = o.color || '#6a4a32', s = o.seed || 131;
  for (const [dx, dz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const a = R.proj(X + dx * w * .4, H, Z + dz * w * .4), b = R.proj(X + dx * w * .48, 0, Z + dz * w * .48); P.ink(g, [a, b], { width: 9 * R.scaleAt(Z), color: P.shade(c, dz > 0 ? -.2 : 0), alpha: .95, seed: s + dx + dz * 3 }); }
  const top = R.face([[X - w / 2, H, Z + w / 2], [X + w / 2, H, Z + w / 2], [X + w / 2, H, Z - w / 2], [X - w / 2, H, Z - w / 2]]);
  P.wash(g, quad(top, 0, 0, 1, 1, 4), { color: P.shade(c, .15), seed: s + 9, alpha: .97, edge: .5 });
  const fr = R.face([[X - w / 2, H, Z - w / 2], [X + w / 2, H, Z - w / 2], [X + w / 2, H - 22, Z - w / 2], [X - w / 2, H - 22, Z - w / 2]]);
  P.wash(g, quad(fr, 0, 0, 1, 1, 4), { color: P.shade(c, -.2), seed: s + 10, alpha: .97 }); P.pen(g, [...quad(fr, 0, 0, 1, 1, 1), fr(0, 0)], { seed: s + 11, alpha: .5 });
  return top;
}
/** frame(g, map, o): a picture frame or poster on a wall face; o.paint(g, inner map) paints the picture */
export function frame(g, map, o = {}) {
  const s = o.seed || 31;
  P.wash(g, quad(map, 0, 0, 1, 1, 4), { color: o.frame || '#4a3626', seed: s, alpha: .95, edge: .4, bloom: .3 });
  const m = o.mat ?? .1, inner = sub(map, m, m, 1 - m, 1 - m);
  P.wash(g, quad(inner, 0, 0, 1, 1, 4), { color: o.color || '#9bb0a0', seed: s + 1, alpha: .9, bloom: .8 });
  if (o.paint) o.paint(g, inner, s);
  P.pen(g, [...quad(map, 0, 0, 1, 1, 2), map(0, 0)], { seed: s + 2, alpha: .45 });
}
/** note(g, map, o): a pinned paper (label, memo, ticket) */
export function note(g, map, o = {}) { const s = o.seed || 41; P.wash(g, quad(map, 0, 0, 1, 1, 3), { color: o.color || '#efe4cc', seed: s, alpha: .92, edge: .3, rough: 1, bloom: .3 }); if (o.lines) for (let i = 0; i < o.lines; i++) P.pen(g, [map(.15, .25 + i * .2), map(.85, .27 + i * .2)], { seed: s + i, alpha: .3, width: 1 }); }
/** shelf(g, R, X0, X1, Y, Z0, Z1, o): a plank shelf (top face + front edge) at height Y, o.items(g, top) paints what stands on it */
export function shelf(g, R, X0, X1, Y, Z0, Z1, o = {}) {
  const s = o.seed || 51, c = o.color || '#6a4e36', th = o.th ?? 18;
  const top = R.face([[X0, Y, Z1], [X1, Y, Z1], [X1, Y, Z0], [X0, Y, Z0]]), front = R.face([[X0, Y, Z0], [X1, Y, Z0], [X1, Y - th, Z0], [X0, Y - th, Z0]]);
  if (o.items) o.items(g, top, s);
  P.wash(g, quad(top, 0, 0, 1, 1, 6), { color: P.shade(c, .12), seed: s, alpha: .95, edge: .3, bloom: .5, dir: 0 });
  P.wash(g, quad(front, 0, 0, 1, 1, 6), { color: P.shade(c, -.15), seed: s + 1, alpha: .97, edge: .4, dir: 0 });
  P.pen(g, [front(0, 0), front(1, 0)], { seed: s + 2, alpha: .5 }); P.pen(g, [front(0, 1), front(1, 1)], { seed: s + 3, alpha: .5 });
  if (o.after) o.after(g, top, s);
  return { top, front };
}
/**
 * box(g, R, b, o) — a box in the room (cabinet, machine, counter, crate) with its visible faces painted.
 * b: { x0, x1, y0, y1, z0, z1 } world. o: color, faces: { front, left, right, top } → painter (g, map, seed) or colour,
 * seed. Visible: front (z0) always; left side (x0) if x0 > 0; right side (x1) if x1 < 0; top if y1 < eye.
 * Returns the face maps.
 */
export function box(g, R, b, o = {}) {
  const s = o.seed || 61, col = o.color || '#8a6a4c', F = o.faces || {};
  const maps = {
    front: R.face([[b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y0, b.z0], [b.x0, b.y0, b.z0]]),
    left: R.face([[b.x0, b.y1, b.z1], [b.x0, b.y1, b.z0], [b.x0, b.y0, b.z0], [b.x0, b.y0, b.z1]]),
    right: R.face([[b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y0, b.z0]]),
    top: R.face([[b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0]]),
  };
  const vis = { left: b.x0 > 0, right: b.x1 < 0, top: b.y1 < R.eye, front: true };
  const order = ['top', 'left', 'right', 'front'];
  for (const k of order) {
    if (!vis[k] || F[k] === false) continue;
    const f = F[k], light = { top: .12, front: 0, left: -.14, right: -.14 }[k];
    if (typeof f === 'function') f(g, maps[k], s + k.length);
    else { P.wash(g, quad(maps[k], 0, 0, 1, 1, 6), { color: P.shade(f || col, light), seed: s + k.length * 13, alpha: .97, edge: .4, bloom: .6 }); P.pen(g, [...quad(maps[k], 0, 0, 1, 1, 1), maps[k](0, 0)], { seed: s + k.length, alpha: .5 }); }
  }
  return maps;
}
/** paint a face with a colour (used inside custom face painters) */
export function faceWash(g, map, color, seed, o = {}) { P.wash(g, quad(map, o.u0 ?? 0, o.v0 ?? 0, o.u1 ?? 1, o.v1 ?? 1, 6), { color, seed, alpha: o.alpha ?? .97, edge: o.edge ?? .4, bloom: o.bloom ?? .6, rough: o.rough }); if (o.line !== false) P.pen(g, [...quad(sub(map, o.u0 ?? 0, o.v0 ?? 0, o.u1 ?? 1, o.v1 ?? 1), 0, 0, 1, 1, 1), map(o.u0 ?? 0, o.v0 ?? 0)], { seed: seed + 1, alpha: o.lineAlpha ?? .45 }); }
/** buttons(g, map, o): a grid of small buttons on a face. o: cols, rows, colors, r (fraction of cell), seed, shape ('round' | 'square') */
export function buttons(g, map, o = {}) {
  const r = P.rng(o.seed || 71), cols = o.cols || 4, rows = o.rows || 1, cs = o.colors || ['#d8d2c4'];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cu = (i + .5) / cols, cv = (j + .5) / rows, k = o.r ?? .32, c = map(cu, cv), e = map(cu + k / cols, cv), f = map(cu, cv + k / rows);
    const rx = Math.hypot(e[0] - c[0], e[1] - c[1]), ry = Math.hypot(f[0] - c[0], f[1] - c[1]);
    const col = cs[(i + j * cols) % cs.length];
    const poly = o.shape === 'square' ? quad(map, cu - k / cols, cv - k / rows, cu + k / cols, cv + k / rows, 2) : P.ellipse(c[0], c[1], rx, ry, 16);
    P.gouache(g, poly, { color: col, seed: Math.floor(r() * 1e5), mottle: .2, edge: .4, roughness: .6 });
    P.pen(g, [...poly, poly[0]], { seed: Math.floor(r() * 1e5), alpha: .45, width: 1 });
  }
}
/** a row of small things in a band of a face (bottles behind glass, books, jars): o.draw(g, x, y, w, h, i, r) per slot */
export function row(g, map, o = {}) {
  const r = P.rng(o.seed || 81), n = o.n || 6;
  for (let i = 0; i < n; i++) { const a = map(i / n + .08 / n, 0), b = map((i + 1) / n - .08 / n, 1); o.draw(g, a[0], a[1], b[0] - a[0], b[1] - a[1], i, r); }
}

// ── free-standing things (screen space, scaled by depth) ──
/** plant(g, x, y, s, o): a potted plant standing at floor point (x, y), scale s. o: pot colour, leaf colours, leaves, seed, height */
export function plant(g, x, y, s, o = {}) {
  const r = P.rng(o.seed || 91), pot = o.pot || '#8a5a3c', leaves = o.leaves || ['#4f7a4a', '#6a9a58', '#3d6040'], H = (o.height || 160) * s, pw = (o.potW || 46) * s, ph = (o.potH || 52) * s;
  // stems + leaves first, the pot over their base
  const n = o.n || 9;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (r() - .5) * 1.7, L = H * (.45 + r() * .6), bx = x + (r() - .5) * pw * .4, by = y - ph * .8;
    const tip = [bx + Math.cos(ang) * L, by + Math.sin(ang) * L], mid = [bx + Math.cos(ang) * L * .5 + (r() - .5) * 10 * s, by + Math.sin(ang) * L * .55];
    P.ink(g, [[bx, by], mid, tip], { width: 2.2 * s, color: '#3d5a32', alpha: .8, seed: Math.floor(r() * 1e5) });
    const lw = (22 + r() * 22) * s, la = ang + (r() - .5) * .9, lc = P.pick(leaves, r);
    const leaf = []; for (let k = 0; k <= 12; k++) { const u = k / 12, w = Math.sin(u * Math.PI) * lw * .55; leaf.push([u * lw * 1.5, -w]); } for (let k = 11; k > 0; k--) { const u = k / 12, w = Math.sin(u * Math.PI) * lw * .5; leaf.push([u * lw * 1.5, w]); }
    const ca = Math.cos(la), sa = Math.sin(la), wl = leaf.map(([u, v]) => [tip[0] + u * ca - v * sa - ca * lw * .3, tip[1] + u * sa + v * ca - sa * lw * .3]);
    P.wash(g, wl, { color: lc, seed: Math.floor(r() * 1e5), alpha: .95, edge: .6, rough: .8, bloom: .5, tooth: .1 });
    P.pen(g, [wl[0], wl[6], wl[12]], { seed: Math.floor(r() * 1e5), alpha: .35, width: 1, color: '#2b3a22' });
  }
  const potPoly = [[x - pw / 2, y - ph], [x + pw / 2, y - ph], [x + pw * .4, y], [x - pw * .4, y]];
  P.wash(g, potPoly, { color: pot, seed: (o.seed || 91) + 3, alpha: .97, edge: .5, light: [x - pw * .2, y - ph * .6, .25, pw] });
  P.wash(g, [[x - pw * .55, y - ph * 1.05], [x + pw * .55, y - ph * 1.05], [x + pw * .52, y - ph * .85], [x - pw * .52, y - ph * .85]], { color: P.shade(pot, .1), seed: (o.seed || 91) + 4, alpha: .97, edge: .4 });
  P.pen(g, [...potPoly, potPoly[0]], { seed: (o.seed || 91) + 5, alpha: .45 });
}
/** jar(g, x, y, w, h, o): a glass jar on a shelf: pale wash, a highlight, maybe contents */
export function jar(g, x, y, w, h, o = {}) {
  const s = o.seed || 101, glass = o.glass || '#b9c9c0', fill = o.fill;
  const body = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; body.push([x + w / 2 - Math.cos(a) * w / 2, y - h * .12 - Math.sin(a) * h * .05]); } body.push([x + w, y - h * .85], [x + w * .8, y - h], [x + w * .2, y - h], [x, y - h * .85]);
  const poly = [[x, y - h * .85], [x + w * .12, y], [x + w * .88, y], [x + w, y - h * .85], [x + w * .8, y - h], [x + w * .2, y - h]];
  P.wash(g, poly, { color: glass, seed: s, alpha: .55, edge: .7, rough: .7, bloom: .4 });
  if (fill) P.wash(g, [[x + w * .1, y - h * (o.level ?? .5)], [x + w * .9, y - h * (o.level ?? .5)], [x + w * .85, y - 2], [x + w * .15, y - 2]], { color: fill, seed: s + 1, alpha: .8, rough: .6 });
  P.wash(g, [[x + w * .22, y - h * .92], [x + w * .78, y - h * .92], [x + w * .74, y - h * 1.08], [x + w * .26, y - h * 1.08]], { color: o.lid || '#7a6a58', seed: s + 2, alpha: .95, rough: .5 });
  g.save(); g.globalCompositeOperation = 'screen'; P.ink(g, [[x + w * .22, y - h * .75], [x + w * .2, y - h * .2]], { width: 2.4, color: '#ffffff', alpha: .5, seed: s + 3 }); g.restore();
  P.pen(g, [...poly, poly[0]], { seed: s + 4, alpha: .35, width: 1 });
}
/** lamp(g, R, X, Z, o): a shade hanging from the ceiling on a cord at (X, Z); o.lit glows */
export function lamp(g, R, X, Z, o = {}) {
  const s = o.seed || 111, y = o.y ?? R.ceiling - 260, a = R.proj(X, R.ceiling, Z), b = R.proj(X, y, Z), sc = R.scaleAt(Z), w = (o.w || 130) * sc, h = (o.h || 70) * sc;
  P.pen(g, [a, b], { seed: s, alpha: .7, width: 1.6 });
  const shade = [[b[0] - w * .25, b[1]], [b[0] + w * .25, b[1]], [b[0] + w * .5, b[1] + h], [b[0] - w * .5, b[1] + h]];
  P.wash(g, shade, { color: o.color || '#7a5a44', seed: s + 1, alpha: .97, edge: .5, light: [b[0] - w * .2, b[1] + h * .3, .2, w] });
  P.wash(g, P.ellipse(b[0], b[1] + h, w * .5, h * .16, 24), { color: o.lit ? '#ffe9b0' : '#d8c6a0', seed: s + 2, alpha: .95, rough: .6 });
  if (o.lit) P.glow(g, b[0], b[1] + h * 1.1, w * 1.6, '#ffd890', .35);
  P.pen(g, [...shade, shade[0]], { seed: s + 3, alpha: .5 });
  return [b[0], b[1] + h];
}
/** grade(g, W, H, o): the last pass over a plate — warm light, darker corners (multiply), so the room sits in one light */
export function grade(g, W, H, o = {}) {
  g.save(); g.globalCompositeOperation = 'multiply';
  if (o.light) { const [lx, ly] = o.light, f = g.createRadialGradient(lx, ly, Math.min(W, H) * .12, lx, ly, Math.max(W, H) * 1.05); f.addColorStop(0, 'rgba(255,255,255,0)'); f.addColorStop(.5, P.css(o.fall || '#a07850', (o.fallK ?? .5) * .5)); f.addColorStop(1, P.css(o.fall || '#a07850', o.fallK ?? .5)); g.fillStyle = f; g.fillRect(0, 0, W, H); }
  const v = g.createRadialGradient(W * (o.cx ?? .5), H * (o.cy ?? .45), Math.min(W, H) * .25, W * .5, H * .5, Math.max(W, H) * .78);
  v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, P.css(o.edge || '#5a4030', o.k ?? .55)); g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = P.css(o.warm || '#ffb860', o.warmK ?? .18); g.fillRect(0, 0, W, H);
  g.restore();
}
