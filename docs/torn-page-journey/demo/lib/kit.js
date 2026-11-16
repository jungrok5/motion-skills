// torn-page-journey · kit.js — scenery drawn THROUGH a medium (M), so the same tree is a crayon tree on one page and a woodcut
// tree on the next. Every function takes (ctx, M, …) in world units (y grows down, groundY = the road line there).
// Plates call these once; live layers (birds, rain, critters, people) take t and are drawn every frame.
// New props for a topic are written the same way in the page: build points, then M.shape / M.line (references/KIT.md).
import { TAU, clamp, lerp, rng, hash, n1, mix, shade, tweak, rgba, ellipse, rect, arc, blob, xf, resample, spring } from './core.js';

const sd = (x, y = 0, s = 0) => Math.floor(Math.abs(x * 13.7 + y * 7.1 + s * 101)) % 100000 + 1;

/** the sky (a medium's own idea of it: a crayon band, a watercolour wash, the bare board …) */
export function sky(ctx, M, x, y, w, h, o = {}) { M.wash(ctx, x, y, w, h, o.top || '#8fb8de', o.bottom || o.top || '#d9e8f0', o); }

/** sun: disc + optional rays (wedges) + optional face */
export function sun(ctx, M, x, y, r, o = {}) {
  const col = o.col || '#f5c33b', n = o.rays ?? 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (o.spin || 0), L = r * (o.rayLen || 1.6) * (i % 2 ? .75 : 1), wd = o.rayW ?? .16;
    M.shape(ctx, [[x + Math.cos(a - wd) * r * 1.15, y + Math.sin(a - wd) * r * 1.15], [x + Math.cos(a) * (r + L), y + Math.sin(a) * (r + L)], [x + Math.cos(a + wd) * r * 1.15, y + Math.sin(a + wd) * r * 1.15]], { fill: o.rayCol || col, seed: sd(x, i), smooth: false, line: o.line ?? false });
  }
  M.shape(ctx, ellipse(x, y, r, r, 28), { fill: col, seed: sd(x, y, 1), line: o.line });
  if (o.face) {   // a child's sun smiles
    for (const s of [-1, 1]) M.line(ctx, arc(x + s * r * .32, y - r * .1, r * .13, Math.PI * 1.1, Math.PI * 1.9, 6), { w: 3, seed: sd(x, s) });
    M.shape(ctx, [...arc(x, y + r * .12, r * .42, 0, Math.PI, 10)], { fill: '#c8442e', seed: sd(x, 9), lw: 2.5 });
  }
}
export function moon(ctx, M, x, y, r, o = {}) {
  M.shape(ctx, ellipse(x, y, r, r, 26), { fill: o.col || '#ece6c8', seed: sd(x, y), line: o.line });
  if (o.craters !== false) for (let i = 0; i < 4; i++) { const a = hash(i, 3) * TAU, d = hash(i, 4) * r * .55; M.shape(ctx, ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.12 + hash(i, 5) * .12)), { fill: shade(o.col || '#ece6c8', -.15), line: false, seed: sd(x, i) }); }
}
/** stars: little four-point crosses and dots; twinkle with t (live) or still (t undefined) */
export function stars(ctx, M, x, y, w, h, n, o = {}) {
  const R = rng(o.seed || 5);
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h, s = (1.5 + R() * 4) * (o.t === undefined ? 1 : .7 + .3 * Math.sin(o.t * (1 + R() * 2) + i));
    if (R() < .3) M.line(ctx, [[px - s * 1.6, py], [px + s * 1.6, py]], { w: 1.4, col: o.col || '#f7f1cf', seed: i }), M.line(ctx, [[px, py - s * 1.6], [px, py + s * 1.6]], { w: 1.4, col: o.col || '#f7f1cf', seed: i + 1 });
    else { ctx.fillStyle = M.col(o.col || '#f7f1cf', 'ink'); ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(px, py, s * .45, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
}
/** a constellation: dots joined by thin lines (a shape in the stars that says what the chapter is about) */
export function constellation(ctx, M, pts, o = {}) {
  M.line(ctx, pts, { w: 1.2, col: o.col || '#f2e7b8', a: o.a ?? .6, seed: 3, smooth: false });
  for (const [x, y] of pts) { ctx.fillStyle = M.col(o.col || '#f2e7b8', 'ink'); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); }
}
/** a cloud: bumps on top, flatter underneath */
export function cloud(ctx, M, x, y, w, o = {}) {
  const h = w * (o.tall || .42), n = 30, R = rng(sd(x, y));
  const bumps = 3 + Math.floor(R() * 3), P = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + i / (n - 1) * Math.PI, bx = Math.cos(a), top = Math.sin(a) < 0;
    const k = top ? 1 + .22 * Math.abs(Math.sin((i / (n - 1)) * Math.PI * bumps + R())) : .35;
    P.push([x + bx * w / 2, y + Math.sin(a) * h * k]);
  }
  P.push([x + w * .42, y + h * .12], [x - w * .42, y + h * .12]);
  M.shape(ctx, P, { fill: o.col || '#ffffff', seed: sd(x, y, 2), line: o.line, dir: 0 });
}
/** a band of hills from x0 to x1 whose top is base + noise·amp, filled down to bottom */
export function hills(ctx, M, x0, x1, base, amp, bottom, o = {}) {
  const f = o.freq || 1 / 420, P = [[x0 - 20, bottom]];
  for (let x = x0 - 20; x <= x1 + 20; x += 24) P.push([x, base - amp * (.5 + .5 * n1(x * f, o.seed || 1)) - amp * .35 * n1(x * f * 3.1, (o.seed || 1) + 7)]);
  P.push([x1 + 20, bottom]);
  M.shape(ctx, P, { fill: o.col || '#8fbf6a', seed: sd(x0, base), line: o.line, dir: o.dir ?? 0 });
}
export function mountains(ctx, M, x0, x1, base, amp, o = {}) {
  const R = rng(o.seed || 2), P = [[x0 - 40, base + 400]]; let x = x0 - 40;
  while (x < x1 + 40) { const w = 160 + R() * 260; P.push([x, base - R() * amp * .3], [x + w / 2, base - amp * (.5 + R() * .5)]); x += w; }
  P.push([x, base], [x, base + 400]);
  M.shape(ctx, P, { fill: o.col || '#8792a8', seed: sd(x0, base, 3), smooth: false, line: o.line, dir: -.6 });
  if (o.snow) for (let i = 2; i < P.length - 2; i += 2) { const [px, py] = P[i]; if (py < base - amp * .6) M.shape(ctx, [[px, py], [px + 34, py + 40], [px + 10, py + 32], [px - 8, py + 44], [px - 30, py + 36]], { fill: '#f4f4f0', seed: i, smooth: false, line: false }); }
}
/** trees: kind 'round' | 'pine' | 'willow' | 'bare' | 'poplar' | 'umbrella' */
export function tree(ctx, M, x, gy, h, o = {}) {
  const kind = o.kind || 'round', leaf = o.leaf || '#5f9f45', trunk = o.trunk || '#7b5534', s = sd(x, gy, 4);
  const tw = Math.max(8, h * .07);
  const trunkPts = (top, w = tw) => [[x - w, gy + 4], [x - w * .6, gy - top], [x + w * .6, gy - top], [x + w, gy + 4]];
  if (kind === 'pine') {
    M.shape(ctx, trunkPts(h * .3, tw * .8), { fill: trunk, seed: s, smooth: false });
    for (let i = 0; i < 4; i++) { const y0 = gy - h * (.18 + i * .2), w = h * (.36 - i * .07); M.shape(ctx, [[x - w, y0], [x, y0 - h * .34], [x + w, y0]], { fill: leaf, seed: s + i, smooth: false }); }
  } else if (kind === 'poplar') {
    M.shape(ctx, trunkPts(h * .25), { fill: trunk, seed: s, smooth: false });
    M.shape(ctx, blob(x, gy - h * .6, h * .16, h * .42, s, .08, 18), { fill: leaf, seed: s + 1, dir: -1.4 });
  } else if (kind === 'willow') {
    M.shape(ctx, [[x - tw * 1.2, gy + 4], [x - tw * .5, gy - h * .55], [x + tw * .3, gy - h * .7], [x + tw, gy + 4]], { fill: trunk, seed: s });
    M.shape(ctx, blob(x, gy - h * .72, h * .38, h * .26, s + 2, .1), { fill: leaf, seed: s + 3, dir: 1.5 });
    const R = rng(s);
    for (let i = 0; i < 26; i++) { const sx = x + (R() - .5) * h * .75, sy = gy - h * (.62 + R() * .2), L = h * (.35 + R() * .3), sw = o.sway || 0; M.line(ctx, [[sx, sy], [sx + sw * 6 + 3, sy + L * .5], [sx + sw * 14 + 2, sy + L]], { col: shade(leaf, -.15), w: 2.2, seed: s + i, role: 'world' }); }
  } else if (kind === 'bare') {
    const R = rng(s), br = (x0, y0, a, L, d) => { const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; M.line(ctx, [[x0, y0], [x1, y1]], { w: Math.max(1.2, d * 2.2), col: trunk, seed: s + d * 7 + Math.floor(L) }); if (d > 0) { br(x1, y1, a - .45 - R() * .3, L * .7, d - 1); br(x1, y1, a + .4 + R() * .3, L * .68, d - 1); } };
    M.shape(ctx, trunkPts(h * .45), { fill: trunk, seed: s, smooth: false }); br(x, gy - h * .45, -Math.PI / 2, h * .28, 3);
  } else if (kind === 'umbrella') {   // stone pine: a long bare trunk and a flat crown
    M.shape(ctx, [[x - tw * .8, gy + 4], [x - tw * .3, gy - h * .5], [x + tw * .6, gy - h * .78], [x + tw * .9, gy - h * .76], [x + tw * .4, gy - h * .5], [x + tw * .8, gy + 4]], { fill: trunk, seed: s });
    M.shape(ctx, blob(x + tw, gy - h * .86, h * .34, h * .12, s + 1, .12), { fill: leaf, seed: s + 2, dir: 0 });
  } else {
    M.shape(ctx, trunkPts(h * .5), { fill: trunk, seed: s, smooth: false });
    M.shape(ctx, blob(x, gy - h * .66, h * .3, h * .28, s + 1, .1), { fill: leaf, seed: s + 2 });
    if (o.fruit) { const R = rng(s + 5); for (let i = 0; i < 9; i++) { const a = R() * TAU, d = R() * h * .22; M.shape(ctx, ellipse(x + Math.cos(a) * d, gy - h * .66 + Math.sin(a) * d, h * .025 + 2), { fill: o.fruit, seed: s + i, line: false }); } }
  }
}
/** a house: kind 'cottage' (child's house) | 'town' (tall gabled townhouse) | 'hut' (round, thatched) */
export function house(ctx, M, x, gy, w, h, o = {}) {
  const s = sd(x, gy, 5), kind = o.kind || 'cottage', wall = o.wall || '#e9b04f', roof = o.roof || '#c84c3a';
  if (kind === 'hut') {
    M.shape(ctx, [[x, gy], [x, gy - h * .55], [x + w, gy - h * .55], [x + w, gy]], { fill: wall, seed: s, smooth: false });
    M.shape(ctx, [[x - w * .12, gy - h * .5], [x + w / 2, gy - h], [x + w * 1.12, gy - h * .5]], { fill: roof, seed: s + 1, dir: 1.2 });
    M.shape(ctx, rect(x + w * .4, gy - h * .32, w * .2, h * .32), { fill: shade(wall, -.45), seed: s + 2, smooth: false });
    return;
  }
  const top = kind === 'town' ? gy - h * .82 : gy - h * .62;
  M.shape(ctx, [[x, gy], [x, top], [x + w, top], [x + w, gy]], { fill: wall, seed: s, smooth: false, dir: Math.PI / 2 });
  if (kind === 'town') M.shape(ctx, [[x - 4, top + 2], [x + w * .5, gy - h], [x + w + 4, top + 2]], { fill: roof, seed: s + 1, smooth: false });
  else M.shape(ctx, [[x - w * .1, top + 4], [x + w * .5, gy - h], [x + w * 1.1, top + 4]], { fill: roof, seed: s + 1, smooth: false, dir: .3 });
  const rows = kind === 'town' ? Math.max(2, Math.round((gy - top) / (w * .5))) : 1, cols = kind === 'town' ? 2 : 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ww = w * .2, wh = kind === 'town' ? (gy - top) / rows * .45 : h * .17, wx = x + w * (.18 + c * .44), wy = top + (gy - top) * ((r + .3) / (rows + (kind === 'town' ? .3 : .6)));
    if (kind !== 'town' && c === 1) continue;
    M.shape(ctx, rect(wx, wy, ww, wh), { fill: o.window || '#9cc9e6', seed: s + 10 + r * 3 + c, smooth: false });
  }
  if (o.door !== false) M.shape(ctx, rect(x + w * (kind === 'town' ? .38 : .58), gy - h * .26, w * .22, h * .26), { fill: o.door || '#7b4b2e', seed: s + 3, smooth: false });
  if (o.chimney) M.shape(ctx, rect(x + w * .7, gy - h * .98, w * .1, h * .2), { fill: roof, seed: s + 4, smooth: false });
}
export function fence(ctx, M, x0, x1, gy, o = {}) {
  const col = o.col || '#a06a3c', kind = o.kind || 'picket', step = o.step || (kind === 'picket' ? 26 : 120), h = o.h || (kind === 'picket' ? 56 : 80);
  const g = typeof gy === 'function' ? gy : () => gy;
  M.shape(ctx, [[x0, g(x0) - h * .65], [x1, g(x1) - h * .65], [x1, g(x1) - h * .5], [x0, g(x0) - h * .5]], { fill: col, seed: sd(x0, 1), smooth: false, lw: 2 });
  if (kind === 'post') M.shape(ctx, [[x0, g(x0) - h * .3], [x1, g(x1) - h * .3], [x1, g(x1) - h * .2], [x0, g(x0) - h * .2]], { fill: col, seed: sd(x0, 2), smooth: false, lw: 2 });
  for (let x = x0; x <= x1; x += step) { const y = g(x), w = kind === 'picket' ? 10 : 12; M.shape(ctx, kind === 'picket' ? [[x - w / 2, y + 2], [x - w / 2, y - h + 8], [x, y - h], [x + w / 2, y - h + 8], [x + w / 2, y + 2]] : rect(x - w / 2, y - h, w, h + 2), { fill: col, seed: sd(x, 3), smooth: false, lw: 2 }); }
}
export function lamp(ctx, M, x, gy, h, o = {}) {
  const col = o.col || '#2e3436', s = sd(x, gy, 6);
  M.shape(ctx, rect(x - 4, gy - h, 8, h), { fill: col, seed: s, smooth: false, lw: 2 });
  M.shape(ctx, [[x - 14, gy - h - 4], [x - 10, gy - h - 34], [x + 10, gy - h - 34], [x + 14, gy - h - 4]], { fill: o.lit ? '#f7d27a' : '#d9d2b8', seed: s + 1, smooth: false, lw: 2 });
  M.shape(ctx, [[x - 16, gy - h - 34], [x, gy - h - 48], [x + 16, gy - h - 34]], { fill: col, seed: s + 2, smooth: false, lw: 2 });
}
/** a soft light (lamp, window, sun on water) — drawn additively, the same in every medium */
export function glow(ctx, x, y, r, col = '#ffd27a', a = .5) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
/** flowers: kind 'daisy' | 'sunflower' | 'tulip' | 'dot' */
export function flower(ctx, M, x, gy, h, o = {}) {
  const kind = o.kind || 'daisy', s = sd(x, gy, 7), hx = x + (o.lean || 0) * h, hy = gy - h, petal = o.petal || '#f06a8b';
  M.line(ctx, [[x, gy], [x + (hx - x) * .4, gy - h * .5], [hx, hy]], { col: o.stem || '#4f8c3a', w: 2.6, seed: s, role: 'world' });
  if (kind !== 'dot') M.shape(ctx, [[x, gy - h * .35], [x + h * .2, gy - h * .5], [x + h * .05, gy - h * .32]], { fill: o.stem || '#4f8c3a', seed: s + 1, lw: 1.5 });
  const r = h * (kind === 'sunflower' ? .2 : .13);
  if (kind === 'tulip') { M.shape(ctx, [[hx - r, hy], [hx - r * 1.1, hy - r * 1.5], [hx - r * .3, hy - r * .9], [hx, hy - r * 1.7], [hx + r * .3, hy - r * .9], [hx + r * 1.1, hy - r * 1.5], [hx + r, hy], [hx, hy + r * .6]], { fill: petal, seed: s + 2, smooth: false }); return; }
  if (kind === 'dot') { M.shape(ctx, ellipse(hx, hy, r), { fill: petal, seed: s + 2, line: false }); return; }
  const n = kind === 'sunflower' ? 12 : 7;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; M.shape(ctx, ellipse(hx + Math.cos(a) * r * 1.1, hy + Math.sin(a) * r * 1.1, r * .75, r * .38, 10, a), { fill: kind === 'sunflower' ? '#f2b928' : petal, seed: s + 3 + i, lw: 1.6 }); }
  M.shape(ctx, ellipse(hx, hy, r * .7), { fill: o.centre || (kind === 'sunflower' ? '#6b4423' : '#f7d148'), seed: s + 20, lw: 1.6 });
}
/** tufts of grass along the ground (gy may be a function of x) */
export function grass(ctx, M, x0, x1, gy, o = {}) {
  const g = typeof gy === 'function' ? gy : () => gy, R = rng(o.seed || sd(x0, 8)), col = o.col || '#4f8f3c', h = o.h || 26;
  for (let x = x0; x < x1; x += (o.gap || 14) * (.5 + R())) { const y = g(x) + (o.drop || 0), k = .6 + R() * .8, lean = (o.lean || 0) + (R() - .5) * .5; M.line(ctx, [[x, y], [x + lean * h * k * .5, y - h * k * .55], [x + lean * h * k, y - h * k]], { col: shade(col, (R() - .5) * .2), w: o.w || 2, seed: Math.floor(x), role: 'world' }); }
}
/** the road: from the ground line down to `bottom`. kind 'dirt' | 'cobble' | 'path' | 'grass' | 'boards' */
export function road(ctx, M, x0, x1, gy, bottom, o = {}) {
  const g = typeof gy === 'function' ? gy : () => gy, P = [[x0 - 20, bottom]];
  for (let x = x0 - 20; x <= x1 + 20; x += 20) P.push([x, g(x)]);
  P.push([x1 + 20, bottom]);
  const col = o.col || '#b9a07a', kind = o.kind || 'dirt';
  M.shape(ctx, P, { fill: col, seed: sd(x0, 9), dir: 0, line: o.line ?? true, lw: o.lw || 3 });
  const R = rng(o.seed || 9);
  if (kind === 'cobble') for (let y0 = 0; y0 < 4; y0++) for (let x = x0 + R() * 30; x < x1; x += 34 + R() * 12) { const y = g(x) + 18 + y0 * 30 + R() * 6; if (y > bottom - 10) continue; M.shape(ctx, blob(x, y, 15 + R() * 4, 10 + R() * 3, Math.floor(x + y0), .15, 10), { fill: shade(col, (R() - .5) * .25), seed: Math.floor(x * 3 + y0), lw: 1.6 }); }
  if (kind === 'boards') for (let x = x0; x < x1; x += 46) M.line(ctx, [[x, g(x) + 4], [x - 10, bottom]], { w: 2, col: shade(col, -.35), seed: Math.floor(x) });
  if (kind === 'path' || kind === 'dirt') for (let i = 0; i < (x1 - x0) / 30; i++) { const x = x0 + R() * (x1 - x0), y = g(x) + 14 + R() * (bottom - g(x) - 20); M.shape(ctx, ellipse(x, y, 3 + R() * 6, 2 + R() * 3), { fill: shade(col, -.25), seed: i, line: false }); }
  if (o.dash) for (let x = x0; x < x1; x += 90) { const y = g(x) + (o.dashY || 40); M.shape(ctx, [[x, y], [x + 46, y], [x + 46, y + 5], [x, y + 5]], { fill: o.dash, seed: Math.floor(x), smooth: false, line: false }); }
}
/** water: a band with glints; t makes the glints move (live) */
export function water(ctx, M, x0, x1, y, h, o = {}) {
  M.shape(ctx, rect(x0, y, x1 - x0, h), { fill: o.col || '#4f84a8', seed: sd(x0, y, 10), smooth: false, dir: 0, line: false });
  const R = rng(o.seed || 10), t = o.t || 0;
  for (let i = 0; i < (x1 - x0) * h / 4000; i++) { const x = x0 + R() * (x1 - x0) + Math.sin(t * .8 + i) * 6, yy = y + 6 + R() * (h - 12), L = 12 + R() * 40; M.line(ctx, [[x, yy], [x + L, yy]], { col: o.glint || '#d8ecf2', w: 2, seed: i, a: .6, role: 'world' }); }
}
export function boat(ctx, M, x, y, w, o = {}) {
  const s = sd(x, y, 11);
  M.shape(ctx, [[x - w / 2, y - w * .12], [x + w / 2, y - w * .12], [x + w * .38, y + w * .06], [x - w * .4, y + w * .06]], { fill: o.hull || '#c8553d', seed: s, smooth: false, lw: 2 });
  if (o.sail !== false) { M.line(ctx, [[x, y - w * .12], [x, y - w * .7]], { w: 2.5, seed: s + 1 }); M.shape(ctx, [[x + 3, y - w * .66], [x + w * .34, y - w * .18], [x + 3, y - w * .18]], { fill: o.sail || '#f2ead6', seed: s + 2, smooth: false, lw: 2 }); }
  if (o.cabin) M.shape(ctx, rect(x - w * .2, y - w * .3, w * .3, w * .18), { fill: o.cabin, seed: s + 3, smooth: false, lw: 2 });
}
export function rock(ctx, M, x, gy, w, h, o = {}) { M.shape(ctx, [[x - w / 2, gy + 3], [x - w * .42, gy - h * .6], [x - w * .1, gy - h], [x + w * .3, gy - h * .85], [x + w / 2, gy + 3]], { fill: o.col || '#8b8a84', seed: sd(x, gy, 12), dir: -.6 }); }
export function rainbow(ctx, M, cx, cy, r, o = {}) {
  const cols = o.cols || ['#e8524a', '#f39a3b', '#f4d04a', '#69b858', '#4c8fd0', '#7a5bb3'], bw = o.w || 16;
  cols.forEach((c, i) => { const r0 = r - i * bw, P = [...arc(cx, cy, r0, Math.PI, TAU, 30), ...arc(cx, cy, r0 - bw, TAU, Math.PI, 30)]; M.shape(ctx, P, { fill: c, seed: sd(cx, i, 13), line: false, a: o.a ?? 1, dir: 0 }); });
}
/** a market stall: striped awning, a counter of goods */
export function stall(ctx, M, x, gy, w, h, o = {}) {
  const s = sd(x, gy, 14), cols = o.stripes || ['#d9483b', '#f4efe2'], goods = o.goods || ['#e2a33a', '#d0563c', '#7aa345'];
  M.shape(ctx, rect(x + 6, gy - h, 10, h), { fill: '#6b4a30', seed: s, smooth: false, lw: 2 }); M.shape(ctx, rect(x + w - 16, gy - h, 10, h), { fill: '#6b4a30', seed: s + 1, smooth: false, lw: 2 });
  M.shape(ctx, rect(x, gy - h * .36, w, h * .36), { fill: o.counter || '#8a6a46', seed: s + 2, smooth: false });
  const n = 7; for (let i = 0; i < n; i++) M.shape(ctx, [[x - 10 + i * (w + 20) / n, gy - h], [x - 10 + (i + 1) * (w + 20) / n, gy - h], [x - 10 + (i + 1) * (w + 20) / n, gy - h * .78], [x - 10 + (i + .5) * (w + 20) / n, gy - h * .72], [x - 10 + i * (w + 20) / n, gy - h * .78]], { fill: cols[i % cols.length], seed: s + 3 + i, smooth: false, lw: 2 });
  const R = rng(s); for (let i = 0; i < w / 18; i++) M.shape(ctx, ellipse(x + 14 + R() * (w - 28), gy - h * .38 - R() * 10, 8 + R() * 4), { fill: goods[i % goods.length], seed: s + 20 + i, lw: 1.5 });
}
export function bunting(ctx, M, x0, x1, y, sag, o = {}) {
  const cols = o.cols || ['#d9483b', '#f2c14e', '#3f7fbf', '#5aa05a'], n = Math.round((x1 - x0) / 46), yy = x => y + sag * Math.sin(Math.PI * (x - x0) / (x1 - x0));
  M.line(ctx, Array.from({ length: 13 }, (_, i) => { const x = lerp(x0, x1, i / 12); return [x, yy(x)]; }), { w: 1.6, seed: sd(x0, 15) });
  for (let i = 0; i < n; i++) { const a = lerp(x0, x1, (i + .1) / n), b = lerp(x0, x1, (i + .9) / n); M.shape(ctx, [[a, yy(a)], [b, yy(b)], [(a + b) / 2, yy((a + b) / 2) + 30]], { fill: cols[i % cols.length], seed: sd(a, 16), smooth: false, lw: 1.5 }); }
}
export function puddle(ctx, M, x, y, w, o = {}) { M.shape(ctx, blob(x, y, w / 2, w * .09, sd(x, y), .1, 16), { fill: o.col || '#9cc0d8', seed: sd(x, y, 17), line: false, dir: 0 }); }

// ── live things: drawn every frame, take t; each one breathes or moves (nothing in the world stands dead still) ──
/** a bird in flight: a wing-beat 'v' (or a gull) moving along; flap is a function of t */
export function bird(ctx, M, x, y, s, t, o = {}) {
  const f = Math.sin(t * (o.rate || 7) * TAU / 2 + (o.phase || 0)), wy = -f * s * .5;
  M.line(ctx, [[x - s, y + wy], [x - s * .45, y - s * .1 + wy * .3], [x, y + s * .15], [x + s * .45, y - s * .1 + wy * .3], [x + s, y + wy]], { col: o.col || '#3a3833', w: o.w || 2.4, seed: Math.floor(t * 6) });
}
/** a butterfly fluttering on a path */
export function butterfly(ctx, M, x, y, s, t, o = {}) {
  const k = Math.abs(Math.sin(t * 11 + (o.phase || 0))), col = o.col || '#f2b134';
  for (const d of [-1, 1]) M.shape(ctx, ellipse(x + d * s * .5 * (.3 + .7 * k), y - s * .2, s * .5 * (.3 + .7 * k), s * .45, 12, d * .4), { fill: col, seed: Math.floor(t * 6) + d, lw: 1.5, role: 'hero' });
  M.line(ctx, [[x, y - s * .5], [x, y + s * .3]], { w: 2, seed: 1 });
}
/** rain on screen: streaks falling at an angle (screen space; call in front of everything) */
export function rain(ctx, M, W, H, t, o = {}) {
  const R = rng(o.seed || 21), n = o.n || 160, a = o.angle ?? .25, sp = o.speed || 1500, L = o.len || 34;
  ctx.save(); ctx.strokeStyle = M.col(o.col || '#e6e9ec', 'world'); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x0 = R() * (W + 400) - 200, ph = R(), y = ((ph * (H + 200) + t * sp * (.8 + R() * .4)) % (H + 200)) - 100, x = x0 + Math.tan(a) * y;
    ctx.globalAlpha = (o.a || .45) * (.4 + R() * .6); ctx.lineWidth = 1 + R() * 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(a) * L, y - Math.cos(a) * L); ctx.stroke();
  }
  ctx.restore();
}
/** a sitting critter with an idle: breathing body, blinking, a tail that flicks, ears that twitch. kind 'cat' | 'rabbit' | 'owl' | 'dog' | 'hen' */
export function critter(ctx, M, x, gy, s, t, o = {}) {
  const kind = o.kind || 'cat', col = o.col || '#3b3a37', f = o.face || 1, seed = o.seed || sd(x, gy, 18), bo = Math.floor(t * 6) * 7;
  const br = 1 + .03 * Math.sin(t * TAU / (2.6 + hash(seed, 1)) + seed), blink = (t * 1.0 + hash(seed, 2) * 4) % (3.1 + hash(seed, 3) * 2) < .14;
  const P = pts => pts.map(([px, py]) => [x + px * s * f, gy + py * s]);
  const look = o.look ?? 0;   // −1 … 1: head turn towards the viewer's left / right
  if (kind === 'owl') {
    M.shape(ctx, P(ellipse(0, -.55 * br, .32, .52 * br, 20)), { fill: col, seed, role: 'world' });
    M.shape(ctx, P(ellipse(0, -.5, .2, .34, 16)), { fill: shade(col, .25), seed: seed + 1, line: false });
    for (const e of [-1, 1]) { M.shape(ctx, P(ellipse(e * .12 + look * .05, -.82, .1, .1, 12)), { fill: '#f2e3a0', seed: seed + 2 + e, lw: 1.5 }); if (!blink) M.shape(ctx, P(ellipse(e * .12 + look * .07, -.82, .04, .05, 8)), { fill: '#1d1b18', seed: seed + 4 + e, line: false }); }
    M.shape(ctx, P([[-.04, -.74], [.04, -.74], [0, -.66]]), { fill: '#d29a3a', seed: seed + 6, smooth: false, lw: 1.2 });
    for (const e of [-1, 1]) M.shape(ctx, P([[e * .22, -1.0], [e * .3, -1.18 - .03 * Math.sin(t * 3 + e)], [e * .1, -1.02]]), { fill: col, seed: seed + 7 + e, smooth: false, lw: 1.5 });
    return;
  }
  if (kind === 'hen') {
    const peck = Math.max(0, Math.sin(t * 2.3 + seed)) ** 8 * .25;
    M.shape(ctx, P(ellipse(0, -.42 * br, .42, .34 * br, 20)), { fill: col, seed, role: 'world' });
    M.shape(ctx, P([[-.38, -.5], [-.62, -.82], [-.5, -.4]]), { fill: shade(col, -.15), seed: seed + 1, smooth: false });
    M.shape(ctx, P(ellipse(.32, -.78 + peck, .15, .15, 12)), { fill: col, seed: seed + 2 });
    M.shape(ctx, P([[.44, -.8 + peck], [.58, -.76 + peck], [.44, -.72 + peck]]), { fill: '#e2a33a', seed: seed + 3, smooth: false, lw: 1.2 });
    M.shape(ctx, P(ellipse(.3, -.94 + peck, .07, .06, 8)), { fill: '#d9483b', seed: seed + 4, line: false });
    for (const e of [-.1, .1]) M.line(ctx, P([[e, -.1], [e, 0]]), { w: 2, col: '#d29a3a', seed: seed + 5 });
    return;
  }
  // cat / dog / rabbit: body seated, head, ears, tail
  const tailA = Math.sin(t * (kind === 'dog' ? 7 : 1.7) + seed) * (kind === 'dog' ? .5 : .35) + (Math.sin(t * .37 + seed) > .7 ? .4 : 0);
  if (kind !== 'rabbit') {
    const tx = -.34, ty = -.12, L = kind === 'dog' ? .32 : .5;
    M.line(ctx, P([[tx, ty], [tx - L * .5 * Math.cos(tailA - .6), ty - L * .6 * Math.sin(1 + tailA)], [tx - L * .6 * Math.cos(tailA + .3), ty - L * Math.cos(tailA * .5)]]), { col, w: s * .07, seed: seed + 9 + bo, role: 'world' });
  }
  const bodyH = kind === 'rabbit' ? .62 : .58;
  M.shape(ctx, P(ellipse(-.06, -bodyH / 2 * br - .02, .3, bodyH / 2 * br, 20)), { fill: col, seed: seed + bo % 3, role: 'world' });
  const hx = .14 + look * .03, hy = -bodyH - .14, hr = kind === 'rabbit' ? .17 : .19;
  if (kind === 'rabbit') for (const e of [-1, 1]) M.shape(ctx, P(ellipse(hx + e * .05 - .02, hy - .36 + Math.sin(t * 2 + e) * .01 * (hash(Math.floor(t * .7), seed) > .8 ? 3 : 0), .05, .24, 12, e * .15 - .12)), { fill: col, seed: seed + 3 + e, role: 'world' });
  else for (const e of [-1, 1]) M.shape(ctx, P(kind === 'dog' ? ellipse(hx + e * .1 - .04, hy - .02, .06, .14, 10, -e * .3) : [[hx + e * .14 - .05, hy - .08], [hx + e * .1, hy - .3 + (hash(Math.floor(t * 1.3), seed + e) > .85 ? .04 : 0)], [hx + e * .02, hy - .12]]), { fill: col, seed: seed + 3 + e, smooth: kind === 'dog', role: 'world' });
  M.shape(ctx, P(ellipse(hx, hy, hr, hr * .88, 16)), { fill: col, seed: seed + 5, role: 'world' });
  M.shape(ctx, P([[hx + hr * .7, hy - .02], [hx + hr * 1.35, hy + .05], [hx + hr * .7, hy + .1]]), { fill: col, seed: seed + 6, smooth: true, line: kind !== 'cat', role: 'world' });
  const ex = hx + hr * .45, ey = hy - .03;
  if (blink) M.line(ctx, P([[ex - .03, ey], [ex + .03, ey]]), { w: 2, seed: seed + 7 }); else M.shape(ctx, P(ellipse(ex, ey, .035, .045, 8)), { fill: kind === 'cat' ? '#e8d24a' : '#1d1b18', seed: seed + 7, lw: 1.2 });
}
/** a standing person in the background, small and simple, who breathes and shifts weight (never a frozen cut-out) */
export function person(ctx, M, x, gy, h, t, o = {}) {
  const s = o.seed || sd(x, gy, 19), br = Math.sin(t * TAU / (3 + hash(s, 1)) + s) * .012, sway = Math.sin(t * .6 + s) * h * .008, f = o.face || 1;
  const coat = o.coat || '#5b7f9a', skin = o.skin || '#e5b48e', legs = o.legs || '#3b3a40';
  for (const e of [-1, 1]) M.shape(ctx, rect(x + e * h * .05 - h * .03, gy - h * .45, h * .06, h * .45), { fill: legs, seed: s + e, smooth: false, lw: 1.5 });
  M.shape(ctx, [[x - h * .13 + sway, gy - h * .42], [x - h * .11 + sway, gy - h * (.8 + br)], [x + h * .11 + sway, gy - h * (.8 + br)], [x + h * .14 + sway, gy - h * .42]], { fill: coat, seed: s + 2, smooth: false });
  M.shape(ctx, ellipse(x + sway * 1.2, gy - h * (.89 + br), h * .085, h * .095, 14), { fill: skin, seed: s + 3, lw: 1.5 });
  if (o.hat) M.shape(ctx, [[x - h * .12 + sway, gy - h * (.95 + br)], [x - h * .06 + sway, gy - h * (1.04 + br)], [x + h * .07 + sway, gy - h * (1.04 + br)], [x + h * .12 + sway, gy - h * (.95 + br)]], { fill: o.hat, seed: s + 4, smooth: false, lw: 1.5 });
  if (o.carry) M.shape(ctx, ellipse(x + f * h * .17 + sway, gy - h * .52, h * .07, h * .06, 10), { fill: o.carry, seed: s + 5, lw: 1.5 });
}

/** scatter along a world range on a fixed grid (so a plate painted over any range draws the same things in the same places):
 *  each(x0, x1, step, seed, (x, k, r) => …)  — r is a seeded rng for that slot */
export function each(x0, x1, step, seed, fn, jit = .6) {
  for (let k = Math.floor(x0 / step) - 1; k <= Math.ceil(x1 / step) + 1; k++) { const r = rng(k * 7919 + seed * 104729), x = k * step + (r() - .5) * step * jit; fn(x, k, r); }
}
/** a ground-line function: base + slope·x + gentle rolls (amp, wavelength) */
export const groundLine = (base, amp = 14, len = 380, slope = 0, seed = 1) => x => base + slope * x + amp * Math.sin(x / len + seed) + amp * .4 * Math.sin(x / (len * .37) + seed * 2);
/** a telegraph pole with wires to the next one */
export function pole(ctx, M, x, gy, h, next, o = {}) {
  const col = o.col || '#5a4632';
  M.shape(ctx, [[x - 5, gy + 4], [x - 4, gy - h], [x + 4, gy - h], [x + 5, gy + 4]], { fill: col, seed: Math.floor(x), smooth: false, lw: 2 });
  M.line(ctx, [[x - 26, gy - h + 16], [x + 26, gy - h + 16]], { w: 4, col, seed: Math.floor(x) + 1 });
  if (next) for (const dx of [-22, 22]) M.line(ctx, [[x + dx, gy - h + 16], [(x + next[0]) / 2 + dx, (gy + next[1]) / 2 - h + 16 + 34], [next[0] + dx, next[1] - h + 16]], { w: 1.4, col: o.wire || '#2a2622', seed: Math.floor(x) + 2 + dx });
}
/** a hot-air balloon */
export function balloon(ctx, M, x, y, r, o = {}) {
  const cols = o.cols || ['#d9483b', '#f2c14e', '#3f7fbf'];
  for (let i = 0; i < 5; i++) { const a0 = -r + i * 2 * r / 5; M.shape(ctx, [[x + a0, y], [x + a0 * .5 + (a0 < 0 ? -2 : 2), y - r * 1.05], [x + (a0 + 2 * r / 5) * .5, y - r * 1.05], [x + a0 + 2 * r / 5, y], [x + (a0 + 2 * r / 5) * .35, y + r * .9], [x + a0 * .35, y + r * .9]], { fill: cols[i % cols.length], seed: Math.floor(x) + i, lw: 2 }); }
  M.line(ctx, [[x - r * .3, y + r * .9], [x - r * .2, y + r * 1.3]], { w: 1.5, seed: 3 }); M.line(ctx, [[x + r * .3, y + r * .9], [x + r * .2, y + r * 1.3]], { w: 1.5, seed: 4 });
  M.shape(ctx, rect(x - r * .22, y + r * 1.3, r * .44, r * .3), { fill: '#a0703c', seed: Math.floor(x) + 9, smooth: false, lw: 2 });
}
/** a kite on a string from (ax, ay) */
export function kite(ctx, M, x, y, s, ax, ay, t = 0, o = {}) {
  const sw = Math.sin(t * 1.3) * s * .15;
  M.line(ctx, [[x + sw, y + s], [(x + ax) / 2 + 20, (y + ay) / 2 + 40], [ax, ay]], { w: 1.4, seed: 7, a: .8 });
  M.shape(ctx, [[x + sw, y - s], [x + s * .7 + sw, y], [x + sw, y + s], [x - s * .7 + sw, y]], { fill: o.col || '#e85a4f', seed: 8, smooth: false });
  for (let i = 0; i < 4; i++) M.shape(ctx, ellipse(x + sw + Math.sin(t * 3 + i) * 8, y + s + 18 + i * 20, 7, 4, 8, .5), { fill: ['#f2c14e', '#3f7fbf'][i % 2], seed: 9 + i, line: false });
}
