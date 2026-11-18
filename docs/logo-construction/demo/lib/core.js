// logo-construction · core.js — seeded random, easing, line / polygon geometry, rounded paths, offscreen canvases.
// Everything here is a pure function: the film is a function of t, so nothing reads the clock or Math.random.

export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < .5 ? -1 : 1);
  return r;
}
// smooth 1D value noise (seeded): n(x) in -1…1, period-free
export function noise1(seed = 1) {
  const r = rng(seed), v = Array.from({ length: 512 }, () => r() * 2 - 1);
  return x => { const i = Math.floor(x), f = x - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512], u = f * f * (3 - 2 * f); return a + (b - a) * u; };
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const ease = {
  lin: k => k,
  in: k => k * k * k,
  out: k => 1 - (1 - k) ** 3,
  io: k => (k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  sine: k => .5 - Math.cos(Math.PI * k) / 2,
  // a hand on a mouse: gets going, overshoots a hair, settles
  // a hand on a mouse: eases out of rest, travels, settles (peak speed ≈ 1.6× the average)
  hand: k => .5 - Math.cos(Math.PI * k) / 2 + Math.sin(Math.PI * k) ** 2 * Math.sin(Math.PI * k * 2) * -.02,
  back: k => { const c = 1.6; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};

// ---- vectors / lines -------------------------------------------------------------------------------------------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = a => Math.hypot(a[0], a[1]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// a line is { p: point on it, d: unit direction }
export function crossLines(L1, L2) {
  const [x1, y1] = L1.p, [dx1, dy1] = L1.d, [x2, y2] = L2.p, [dx2, dy2] = L2.d;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-9) return null;
  const s = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
  return [x1 + dx1 * s, y1 + dy1 * s];
}
export const distToLine = (pt, L) => Math.abs((pt[0] - L.p[0]) * L.d[1] - (pt[1] - L.p[1]) * L.d[0]);
// clip an infinite line to a rectangle {x0,y0,x1,y1}: returns [a, b] ordered along d, or null
export function clipLine(L, R) {
  let t0 = -1e9, t1 = 1e9;
  const { p, d } = L;
  for (const [pi, di, lo, hi] of [[p[0], d[0], R.x0, R.x1], [p[1], d[1], R.y0, R.y1]]) {
    if (Math.abs(di) < 1e-12) { if (pi < lo || pi > hi) return null; continue; }
    let a = (lo - pi) / di, b = (hi - pi) / di; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (t0 > t1) return null;
  return [[p[0] + d[0] * t0, p[1] + d[1] * t0], [p[0] + d[0] * t1, p[1] + d[1] * t1]];
}

// ---- polygons --------------------------------------------------------------------------------------------------
export function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
export function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export function segDist(p, a, b) { const ab = sub(b, a), t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)); return dist(p, add(a, mul(ab, t))); }
// a point well inside a polygon (where the cursor clicks with the shape builder): best of a sample grid
export function interior(poly, avoid = []) {
  const b = bbox(poly); let best = [b.cx, b.cy], bd = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const p = [b.x0 + b.w * i / 24, b.y0 + b.h * j / 24];
    if (!inside(p, poly) || avoid.some(c => dist(p, [c.x, c.y]) < c.r + 6)) continue;
    let d = Infinity; for (let k = 0; k < poly.length; k++) d = Math.min(d, segDist(p, poly[k], poly[(k + 1) % poly.length]));
    for (const c of avoid) d = Math.min(d, dist(p, [c.x, c.y]) - c.r);
    if (d > bd) { bd = d; best = p; }
  }
  return best;
}

// polygon with rounded corners → canvas path. radii[i] for corner i (0 = sharp). Radius is limited so arcs never cross.
export function roundedPath(ctx, poly, radii, move = true) {
  const n = poly.length;
  const lim = poly.map((p, i) => { const a = poly[(i + n - 1) % n], b = poly[(i + 1) % n]; return Math.min(dist(p, a), dist(p, b)) * .5; });
  for (let i = 0; i < n; i++) {
    const p = poly[i], a = poly[(i + n - 1) % n], b = poly[(i + 1) % n];
    const r = Math.max(0, Math.min(radii[i] || 0, lim[i]));
    if (r < .01) { i === 0 && move ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); continue; }
    // arcTo needs the tangent distance, not the radius; keep the visible cut ≈ r on any angle
    const u = norm(sub(a, p)), v = norm(sub(b, p)), cos = clamp(u[0] * v[0] + u[1] * v[1], -.999, .999), half = Math.acos(cos) / 2;
    const tl = Math.min(r, lim[i]), rad = tl * Math.tan(half);
    const s = add(p, mul(u, tl));
    if (i === 0 && move) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]);
    ctx.arcTo(p[0], p[1], b[0], b[1], Math.max(.01, rad));
  }
  ctx.closePath();
}
// the same rounded outline as a point list (for the sketch, which wobbles it)
export function roundedPoints(poly, radii, step = 4) {
  const n = poly.length, out = [];
  const lim = poly.map((p, i) => Math.min(dist(p, poly[(i + n - 1) % n]), dist(p, poly[(i + 1) % n])) * .5);
  for (let i = 0; i < n; i++) {
    const p = poly[i], a = poly[(i + n - 1) % n], b = poly[(i + 1) % n], r = Math.min(radii[i] || 0, lim[i]);
    if (r < .5) { out.push(p); continue; }
    const s = add(p, mul(norm(sub(a, p)), r)), e = add(p, mul(norm(sub(b, p)), r));
    const k = Math.max(3, Math.ceil(r / step));
    for (let j = 0; j <= k; j++) { const q = j / k; out.push(mix(mix(s, p, q), mix(p, e, q), q)); } // quadratic corner
  }
  return out;
}
export function densify(pts, step = 6, closed = true) {
  const out = [];
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], k = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let j = 0; j < k; j++) out.push(mix(a, b, j / k));
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}

// ---- canvas helpers --------------------------------------------------------------------------------------------
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  // software canvases throughout: GPU and CPU rasters differ by a pixel here and there, and the film must be exact
  c.getContext('2d', { willReadFrequently: true });
  return c;
}
export function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgba(h, a = 1) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
export function shade(h, k) { // k < 0 darker, > 0 lighter
  const [r, g, b] = hexRgb(h), f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return '#' + [f(r), f(g), f(b)].map(c => clamp(c, 0, 255).toString(16).padStart(2, '0')).join('');
}
export function luminance(h) { const [r, g, b] = hexRgb(h).map(c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }
export const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// per-pixel grain on a canvas (seeded): amp in 0…255
export function grain(c, amp = 14, seed = 3, mono = true) {
  const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - .5) * amp;
    d[i] += n; d[i + 1] += mono ? n : (r() - .5) * amp; d[i + 2] += mono ? n : (r() - .5) * amp;
  }
  g.putImageData(im, 0, 0); return c;
}
