// core.js — seeded randomness, noise, easing, colour, geometry. No DOM, no Node: runs in both.

// ---------- random ----------
export function rng(seed = 1) {
  let a = (typeof seed === 'string' ? hashStr(seed) : seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  r.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / 0.577; };
  r.chance = (p) => r() < p;
  r.fork = (k = 0) => rng((Math.floor(r() * 4294967296) ^ (k * 2654435761)) >>> 0);
  return r;
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// integer hash → [0,1)
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// a value range [lo,hi] or a number → number
export function val(v, r) { return Array.isArray(v) ? v[0] + (v[1] - v[0]) * r() : v; }

// ---------- noise ----------
const fade = (t) => t * t * (3 - 2 * t);
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, s + i * 31); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}
export function noise1(x, s = 0) { const i = Math.floor(x), f = x - i; const a = hash2(i, 0, s), b = hash2(i + 1, 0, s); return a + (b - a) * fade(f); }

// ---------- easing / math ----------
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------- colour ----------
// colours are [r,g,b] in 0..1 (sRGB). hex strings are accepted wherever a colour is.
const hexCache = new Map();
export function rgb(c) {
  if (Array.isArray(c)) return c;
  let v = hexCache.get(c);
  if (v) return v;
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  v = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  hexCache.set(c, v);
  return v;
}
export function hex(c) { return '#' + c.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join(''); }
export function mix(a, b, t) { a = rgb(a); b = rgb(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
export function luma(c) { c = rgb(c); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
// rgb <-> hsl for jitter
export function toHsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
export function fromHsl([h, s, l]) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
// shift a colour a little: hue (turns), saturation, lightness — the hand never picks the exact same stick twice
export function vary(c, r, amt = 0.04) {
  if (!amt) return rgb(c);
  const [h, s, l] = toHsl(rgb(c));
  return fromHsl([h + (r() - 0.5) * amt * 0.5, clamp(s + (r() - 0.5) * amt * 1.5), clamp(l + (r() - 0.5) * amt * 1.6)]);
}
// a ramp: list of colours (evenly spaced) or [[t, colour], …] → t ∈ [0,1] → colour
export function ramp(stops) {
  const st = stops.map((s, i) => (Array.isArray(s) && typeof s[0] === 'number' && s.length === 2 ? [s[0], rgb(s[1])] : [i / (stops.length - 1), rgb(s)]));
  return (t) => {
    t = clamp(t);
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [t0, c0] = st[i - 1], [t1, c1] = st[i]; return mix(c0, c1, (t - t0) / (t1 - t0 || 1)); }
    return st[st.length - 1][1];
  };
}

// ---------- geometry ----------
export function catmull(pts, seg = 8) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export function pathLength(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
// hand wobble: displace a polyline sideways with low-frequency noise (amp in px)
export function wobble(pts, r, amp = 1.5, freq = 0.02) {
  const s = Math.floor(r() * 1e6), out = [];
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const o = (noise1(L * freq, s) - 0.5) * 2 * amp;
    out.push([pts[i][0] - dy * o, pts[i][1] + dx * o]);
  }
  return out;
}
// split a straight segment into n points (so wobble has something to bend)
export function seg(a, b, n = 0) {
  n = n || Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
  const out = []; for (let i = 0; i <= n; i++) out.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return out;
}
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function bboxOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
