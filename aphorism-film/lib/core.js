// aphorism-film · core.js — math, timing and colour shared by every module. Pure functions only: the film is a pure
// function of t, so nothing here keeps state between frames.
//   math:    TAU, clamp, lerp, smooth, ease, onTwos, rng (seeded), hash, noise2, fbm, keys (monotone cubic keyframes), span
//   colour:  mix, rgba, shade, vary, lum (relative luminance 0…1)

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
export const ease = {
  io: k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - clamp(k), 3),
  in: k => Math.pow(clamp(k), 3),
  sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)),
};

// hand-drawn timing: characters move on twos (12 drawings a second); camera, type and light stay smooth
export const onTwos = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;

// mulberry32: rng(seed) → () => [0,1)
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// integer hash → [0,1)
export function hash(a, b = 0, c = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x1b873593, 0x27d4eb2f);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function noise2(x, y = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y = 0, o = 4) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= .5; f *= 2.03; } return s / n; };

// keyframes [{t, x, y, …, e:'io'?}] → value of prop at t. Monotone cubic (Fritsch–Carlson): equal keys hold still, no
// overshoot. A key with e:'io' eases the segment that ends on it (smooth stop and start) instead.
export function keys(list, t, prop, def = 0) {
  const k = list.filter(o => o[prop] !== undefined);
  if (!k.length) return def;
  if (t <= k[0].t) return k[0][prop];
  if (t >= k[k.length - 1].t) return k[k.length - 1][prop];
  let i = 0; while (t > k[i + 1].t) i++;
  const a = k[i], b = k[i + 1], h = b.t - a.t, s = (t - a.t) / h;
  if (b.e === 'io') return lerp(a[prop], b[prop], ease.io(s));
  if (b.e === 'out') return lerp(a[prop], b[prop], ease.out(s));
  if (b.e === 'in') return lerp(a[prop], b[prop], ease.in(s));
  const d = j => (k[j + 1][prop] - k[j][prop]) / (k[j + 1].t - k[j].t);
  const m = j => {
    if (j === 0) return d(0);
    if (j === k.length - 1) return d(j - 1);
    const d0 = d(j - 1), d1 = d(j);
    if (d0 * d1 <= 0) return 0;
    const w1 = 2 * (k[j + 1].t - k[j].t) + (k[j].t - k[j - 1].t), w2 = (k[j + 1].t - k[j].t) + 2 * (k[j].t - k[j - 1].t);
    return (w1 + w2) / (w1 / d0 + w2 / d1);
  };
  const m0 = m(i) * h, m1 = m(i + 1) * h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a[prop] + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * b[prop] + (s3 - s2) * m1;
}

// ---------- colour ----------
const _c = new Map();
const rgb = h => { let v = _c.get(h); if (!v) { let s = h.replace('#', ''); if (s.length === 3) s = [...s].map(c => c + c).join(''); const n = parseInt(s, 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; _c.set(h, v); } return v; };
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * k)); };
export const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
// a hand-mixed variant: brightness ± amt and a slight warm/cool shift, so no two dabs are the same paint
export const vary = (h, R, amt = .06) => { const c = rgb(h), k = (R() - .5) * 2 * amt * 255, w = (R() - .5) * amt * 90; return hex([c[0] + k + w, c[1] + k, c[2] + k - w]); };
export const shade = (h, k) => k < 0 ? mix(h, '#14161c', -k) : mix(h, '#fff6e6', k);

// relative luminance (sRGB → linear), 0 … 1
export const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
// 0 … 1 progress of t through [a, b] (clamped), eased
export const span = (t, a, b, e = 'io') => ease[e]((t - a) / (b - a));
// a palette lookup with a fallback, so painters accept partial palettes
export const pick = (pal, k, d) => (pal && pal[k]) || d;
