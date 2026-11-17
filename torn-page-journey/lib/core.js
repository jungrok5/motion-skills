// torn-page-journey · core.js — numbers, noise, easing, keys, colour and point helpers shared by every module.
// Everything here is a pure function (no Math.random, no Date): a frame is a function of t.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const span = (t, a, b) => clamp((t - a) / (b - a));

/** integer hash → [0, 1) */
export function hash(a, b = 0, c = 0) {
  let h = (Math.floor(a) * 374761393 + Math.floor(b) * 668265263 + Math.floor(c) * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2654435761); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
/** seeded generator → [0, 1) */
export function rng(seed = 1) {
  let s = (Math.floor(seed * 2654435761) ^ 0x5bd1e995) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** smooth 1-D value noise → [-1, 1] */
export function n1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1; }

export const ease = {
  lin: k => k,
  in: k => k * k, out: k => 1 - (1 - k) * (1 - k), inOut: k => k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k),
  sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)),
  cubic: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  back: k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },   // overshoots, settles
};
/** keyed value: list [{t, [prop]: v, e: 'sine'}] → value at t (the key's ease shapes the segment INTO it) */
export function keys(list, t, prop = 'v', def = 0) {
  let prev = null;
  for (const k of list) {
    if (k[prop] === undefined) continue;
    if (t < k.t) { if (!prev) return k[prop]; const e = ease[k.e || 'sine'] || ease.sine; return lerp(prev[prop], k[prop], e((t - prev.t) / (k.t - prev.t))); }
    prev = k;
  }
  return prev ? prev[prop] : def;
}
/** damped spring response to a unit step at time 0, evaluated at dt (overshoot then settle) — pure, for follow-through */
export const spring = (dt, f = 2.2, z = .32) => dt <= 0 ? 0 : 1 - Math.exp(-z * TAU * f * dt) * Math.cos(TAU * f * Math.sqrt(1 - z * z) * dt);

// ── colour ──
const cache = new Map();
export function rgb(c) {
  if (Array.isArray(c)) return c;
  let v = cache.get(c); if (v) return v;
  let s = c.replace('#', ''); if (s.length === 3) s = s.split('').map(x => x + x).join('');
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; cache.set(c, v); return v;
}
export const hex = a => '#' + a.map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const p = rgb(a), q = rgb(b); return hex([lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)]); };
export const rgba = (c, a = 1) => { const p = rgb(c); return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${clamp(a)})`; };
export const lum = c => { const p = rgb(c); return (.299 * p[0] + .587 * p[1] + .114 * p[2]) / 255; };
export const grey = (c, k = 1) => { const l = lum(c) * 255; return mix(c, hex([l, l, l]), k); };
export const shade = (c, k) => k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k);
export function hsl(c) {
  const [r, g, b] = rgb(c).map(x => x / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)); let h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
export function fromHsl(h, s, l) {
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  const [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
/** shift hue (deg), saturation (×) and lightness (+) */
export const tweak = (c, dh = 0, ks = 1, dl = 0) => { const [h, s, l] = hsl(c); return fromHsl((h + dh + 360) % 360, clamp(s * ks), clamp(l + dl)); };

// ── points ──
export const ellipse = (cx, cy, rx, ry = rx, n = 24, rot = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const arc = (cx, cy, r, a0, a1, n = 16, ry = r) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * ry]; });
/** a closed blob: a circle whose radius wobbles (seeded) */
export const blob = (cx, cy, rx, ry, seed = 1, wob = .12, n = 20) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, k = 1 + wob * n1(i * .9 + seed * 7.3, seed); return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]; });
/** move points by f(x, y) → [dx, dy] */
export const warp = (pts, f) => pts.map(([x, y]) => { const d = f(x, y); return [x + d[0], y + d[1]]; });
export const jitter = (pts, a, seed = 1) => pts.map(([x, y], i) => [x + n1(i * 1.7 + seed, seed) * a, y + n1(i * 1.3 + seed * 2.1, seed + 9) * a]);
export const xf = (pts, x = 0, y = 0, s = 1, rot = 0, sy = s) => { const c = Math.cos(rot), d = Math.sin(rot); return pts.map(([px, py]) => [x + (px * c - py * d) * s, y + (px * d + py * c) * sy]); };
export const flipX = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]).reverse();
export function bounds(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; } return { x: a, y: b, w: c - a, h: d - b, cx: (a + c) / 2, cy: (b + d) / 2 }; }
/** resample a polyline so points are ~step apart (for strokes that follow a contour) */
export function resample(pts, step, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts, out = [P[0]]; let carry = 0;
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], L = Math.hypot(x1 - x0, y1 - y0); let d = step - carry;
    while (d <= L) { const k = d / L; out.push([lerp(x0, x1, k), lerp(y0, y1, k)]); d += step; }
    carry = L - (d - step);
  }
  return out;
}
/** trace pts as a path: smooth (quadratic through midpoints) or sharp */
export function trace(ctx, pts, closed = true, smooth = true) {
  const n = pts.length; if (n < 2) return;
  if (!smooth || n < 3) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (closed) ctx.closePath(); return; }
  if (closed) {
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s = m(pts[n - 1], pts[0]); ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const p = pts[i], q = [(p[0] + pts[i + 1][0]) / 2, (p[1] + pts[i + 1][1]) / 2]; ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
/** a cached offscreen canvas factory (one per size) for pattern tiles */
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
