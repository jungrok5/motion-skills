// pencil-dream-short · pencil.js — the medium: the graphite line, the spot-colour marker, the crayon, the paper.
// Everything is a pure function of its inputs (seeded hashes, no Math.random), so a film page is a pure function of t.
//
// A drawing is a list of PARTS; a part is { knock?: poly, ops: [stroke…] }:
//   knock  a silhouette filled with paper before the part's lines, so a figure hides what is behind it (alpha follows the
//          part's own draw-on, so a figure being drawn over a landscape covers it as it appears)
//   ops    strokes in drawing order:
//          line(pts, o)   a graphite line (or o.col = 'spot' for a marker line); w = width in px at page zoom
//          fill(poly, o)  colour laid in with a zig-zag (spot marker by default) — it is coloured in, not popped in
//          dots / hatch / scribble build lists of lines
// Geometry is in WORLD units (the sketchbook spread is ~3400 × 2200); the film's camera maps it to the 1920 × 1080 stage.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth01 = k => { k = clamp(k); return k * k * (3 - 2 * k); };

/** integer-ish hash → [0,1) */
export function hash(a, b = 0, c = 0) {
  let h = Math.imul((a * 73856093) ^ (b * 19349663) ^ (c * 83492791), 2654435761) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** seeded generator → [0,1) */
export function rng(seed) { let s = (Math.floor(seed * 9301 + 49297) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
/** smooth 1-D value noise in [-1, 1] */
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1, u = f * f * (3 - 2 * f); return a + (b - a) * u; }

export const ease = {
  lin: k => clamp(k), sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)), in: k => clamp(k) ** 2, out: k => 1 - (1 - clamp(k)) ** 2,
  inOut: k => { k = clamp(k); return k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; }, out3: k => 1 - (1 - clamp(k)) ** 3,
  back: k => { k = clamp(k); const c = 1.6; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
/** 0…1 across [a, b] with an easing */
export const span = (t, a, b, e = ease.inOut) => e(b === a ? (t >= b ? 1 : 0) : (t - a) / (b - a));
/** keyframes [{t, …}] → the value of prop at t (eased between keys); missing props hold their last value */
export function keys(list, t, prop, def = 0, e = ease.inOut) {
  const L = list.filter(k => k[prop] !== undefined); if (!L.length) return def;
  if (t <= L[0].t) return L[0][prop]; const last = L[L.length - 1]; if (t >= last.t) return last[prop];
  let i = 1; while (L[i].t < t) i++;
  const a = L[i - 1], b = L[i], k = (b.ease || e)((t - a.t) / (b.t - a.t));
  return Array.isArray(a[prop]) ? a[prop].map((v, j) => lerp(v, b[prop][j], k)) : lerp(a[prop], b[prop], k);
}

// ── colour ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export function rgb(c) { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => lerp(v, B[i], k))); };
export const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
/** hue (0…360) of a colour — check.mjs uses it to hold the film to one spot colour */
export function hue(c) { const [r, g, b] = rgb(c).map(v => v / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m; if (!d) return 0; let h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; }

// ── points ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const P = (x, y) => [x, y];
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function len(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }
/** Catmull-Rom through the points, n samples per segment (closed = loop) */
export function curve(pts, n = 8, closed = false) {
  if (pts.length < 3) return pts.slice();
  const out = [], N = pts.length, get = i => closed ? pts[(i + N) % N] : pts[clamp(i, 0, N - 1)];
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(closed ? out[0].slice() : pts[N - 1].slice());
  return out;
}
/** an elliptic arc from a0 to a1 (radians, y down), rot = rotation of the ellipse */
export function arc(cx, cy, rx, ry, a0, a1, n = 24, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
export const ellipse = (cx, cy, rx, ry, rot = 0, n = 28, a0 = -Math.PI / 2) => arc(cx, cy, rx, ry, a0, a0 + TAU, n, rot);
/** quadratic / cubic bezier samples */
export function bez(a, c1, c2, b, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push(c2 ? [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k]) : [0, 1].map(k => u * u * a[k] + 2 * u * t * c1[k] + t * t * b[k])); }
  return out;
}
/** resample at a fixed step (keeps the ends) */
export function resample(pts, step) {
  const L = len(pts); if (L < 1e-6) return pts.slice(); const n = Math.max(1, Math.round(L / step)), out = [pts[0].slice()];
  let i = 1, acc = 0, segA = pts[0];
  for (let k = 1; k <= n; k++) {
    const target = L * k / n;
    while (i < pts.length) { const d = dist(segA, pts[i]); if (acc + d >= target - 1e-9) { const f = d ? (target - acc) / d : 0; out.push([lerp(segA[0], pts[i][0], f), lerp(segA[1], pts[i][1], f)]); break; } acc += d; segA = pts[i]; i++; }
  }
  return out;
}
/** the hand: a slow wobble along the normal, and an overshoot past both ends (amp and over in world units) */
export function hand(pts, amp = 1.5, seed = 1, over = 0) {
  const L = len(pts); if (L < 1e-6) return pts.slice();
  let q = resample(pts, Math.max(2, Math.min(L / 6, amp * 5)));
  if (over) { const a = q[0], b = q[1], y = q[q.length - 1], z = q[q.length - 2], da = dist(a, b) || 1, dz = dist(y, z) || 1, oa = over * (.5 + hash(seed, 3)), oz = over * (.5 + hash(seed, 4));
    q = [[a[0] + (a[0] - b[0]) / da * oa, a[1] + (a[1] - b[1]) / da * oa], ...q, [y[0] + (y[0] - z[0]) / dz * oz, y[1] + (y[1] - z[1]) / dz * oz]]; }
  let s = 0; const out = [];
  for (let i = 0; i < q.length; i++) {
    const p = q[i], a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    if (i) s += dist(q[i - 1], p);
    const o = n1(s / (amp * 22) + seed * 7.1, seed) * amp;
    out.push([p[0] - dy / d * o, p[1] + dx / d * o]);
  }
  return out;
}
/** transform points: rotate by r around (ox, oy), scale s, then move by (x, y) */
export function tf(pts, { x = 0, y = 0, s = 1, sx = s, sy = s, r = 0, ox = 0, oy = 0 } = {}) {
  const c = Math.cos(r), n = Math.sin(r);
  return pts.map(([px, py]) => { const X = (px - ox) * sx, Y = (py - oy) * sy; return [ox + X * c - Y * n + x, oy + X * n + Y * c + y]; });
}
export const bbox = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };

// ── strokes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let SEED = 1;
/** a stable default seed from the points (no global counter: a live mark rebuilt every frame must boil the same way) */
const autoSeed = pts => pts && pts.length ? (hash(Math.round(pts[0][0] / 25), Math.round(pts[0][1] / 25), pts.length) * 1e6) | 0 : 1;
/** a graphite line. o: w (px at page zoom, default 2), a (alpha), col ('lead' | 'spot' | css), passes (1–3: a looser second
 *  stroke gives the sketchy double line), taper (0…1), world (w in world units instead — for thick marker rims) */
export function line(pts, o = {}) { return { type: 'line', pts, w: o.w ?? 2, a: o.a ?? .92, col: o.col || 'lead', passes: o.passes ?? 2, taper: o.taper ?? .8, world: !!o.world, seed: o.seed ?? autoSeed(pts), speed: o.speed ?? 1 }; }
/** a closed, coloured-in shape. o: col ('spot' or css), gap (world units between zig-zags), angle (radians), a, edge (a darker
 *  marker edge, default on), off ([dx, dy] misregistration) */
export function fill(poly, o = {}) { return { type: 'fill', pts: poly, col: o.col || 'spot', gap: o.gap ?? 5, angle: o.angle ?? -.6, a: o.a ?? .85, edge: o.edge ?? true, off: o.off || [0, 0], seed: o.seed ?? autoSeed(poly), speed: o.speed ?? 1 }; }
/** a part: optional paper knock-out + its strokes */
export const part = (ops, knock = null) => ({ knock, ops: ops.flat(Infinity).filter(Boolean) });
/** shorthand: a smoothed hand line through control points */
export const stroke = (ctrl, o = {}) => line(hand(curve(ctrl, o.n ?? 8, o.closed), o.amp ?? 1.2, o.seed ?? autoSeed(ctrl), o.over ?? 2), o);

/** parallel hatching inside a polygon (world units): angle, gap → a list of graphite lines */
export function hatch(poly, o = {}) {
  const a = o.angle ?? .7, gap = o.gap ?? 6, c = Math.cos(-a), s = Math.sin(-a), rot = poly.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const bb = bbox(rot), out = [], r = rng(o.seed ?? 3);
  for (let y = bb.y0 + gap * .5; y < bb.y1; y += gap) {
    const xs = [];
    for (let i = 0; i < rot.length; i++) { const p = rot[i], q = rot[(i + 1) % rot.length]; if ((p[1] <= y) !== (q[1] <= y)) xs.push(p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const j0 = (r() - .5) * gap * .8, j1 = (r() - .5) * gap * .8, A = [xs[i] + j0, y + (r() - .5) * gap * .2], B = [xs[i + 1] + j1, y + (r() - .5) * gap * .2];
      out.push([A, B].map(([x, yy]) => [x * c + yy * s, -x * s + yy * c]));
    }
  }
  return out.map(p => line(p, { w: o.w ?? 1.1, a: o.a ?? .55, passes: 1, taper: .5, col: o.col }));
}
/** a scribbled mass (dark shading): loops inside an ellipse */
export function scribble(cx, cy, rx, ry, o = {}) {
  const r = rng(o.seed ?? 5), n = o.n ?? 40, pts = [];
  for (let i = 0; i < n; i++) { const a = r() * TAU, k = Math.sqrt(r()); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return line(curve(pts, 5), { w: o.w ?? 1.2, a: o.a ?? .6, passes: 1 });
}

// ── textures (built once per page) ───────────────────────────────────────────────────────────────────────────────────
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/** tileable value noise, octaves summed → Float32Array in [0, 1] */
function tileNoise(N, octaves, seed) {
  const out = new Float32Array(N * N); let amp = 1, tot = 0;
  for (const per of octaves) {
    const cell = N / per;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const h = (i, j) => hash(((i % per) + per) % per, ((j % per) + per) % per, seed + per);
      out[y * N + x] += amp * lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
    }
    tot += amp; amp *= .55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
/** paper tooth: a grey tile for multiply (light, with fibres and pits) */
export function toothTile(seed = 1, N = 256) {
  const c = canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), n = tileNoise(N, [8, 32, 128], seed), r = rng(seed + 9);
  for (let i = 0; i < N * N; i++) { let v = 243 + (n[i] - .5) * 22 + (r() - .5) * 12; d.data[i * 4] = v + 2; d.data[i * 4 + 1] = v; d.data[i * 4 + 2] = v - 3; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0);
  // fibres
  x.globalAlpha = .07; x.strokeStyle = '#6c665c'; x.lineWidth = .6;
  for (let i = 0; i < 60; i++) { const px = r() * N, py = r() * N, a = r() * TAU, l = 6 + r() * 18; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .6) * l * .5, py + Math.sin(a + .6) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return c;
}
/** graphite grain: the pencil's colour with a speckled alpha (a pattern for the line ribbons) */
export function graphiteTile(col = '#38383b', seed = 2, N = 128) {
  const c = canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), [R, G, B] = rgb(col), n = tileNoise(N, [8, 32, 64], seed), r = rng(seed);
  for (let i = 0; i < N * N; i++) { const v = clamp(.62 + (n[i] - .5) * .9 + (r() - .5) * .35, .18, 1); d.data[i * 4] = R; d.data[i * 4 + 1] = G; d.data[i * 4 + 2] = B; d.data[i * 4 + 3] = v * 255; }
  x.putImageData(d, 0, 0); return c;
}
/** crayon / marker tooth for colour: white with transparent pits (used with destination-in on a colour layer) */
export function crayonTile(seed = 3, N = 256) {
  const c = canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N), n = tileNoise(N, [64, 256], seed), r = rng(seed);
  for (let i = 0; i < N * N; i++) { const v = clamp((n[i] - .25) * 2 + (r() - .5) * .8, 0, 1); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = (.5 + .5 * v) * 255; }
  x.putImageData(d, 0, 0); return c;
}
/** film grain tiles (overlay) */
export function grainTiles(seed = 4, n = 3, N = 256) {
  const r = rng(seed); return Array.from({ length: n }, () => {
    const c = canvas(N, N), x = c.getContext('2d'), d = x.createImageData(N, N);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 100; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  });
}
export { canvas as makeCanvas };
