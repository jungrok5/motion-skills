// street-run-montage · core.js — numbers, noise, easing, keys, tables and colour helpers shared by every module.
// Everything here is a pure function (no Math.random, no Date): a frame is a function of t.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
/** 0 → 1 → 0 bump over [a, b] (sine) */
export const bump = (t, a, b) => t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a));

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
/** smooth 2-D value noise → [-1, 1] */
export function n2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(i, j, seed), hash(i + 1, j, seed), u), lerp(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), u), v) * 2 - 1;
}
/** fractal 2-D noise (3 octaves) → about [-1, 1] */
export const fbm = (x, y, seed = 0) => n2(x, y, seed) * .55 + n2(x * 2.1, y * 2.1, seed + 7) * .3 + n2(x * 4.3, y * 4.3, seed + 13) * .15;

export const ease = {
  lin: k => k,
  in: k => k * k, out: k => 1 - (1 - k) * (1 - k), inOut: k => k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k),
  sine: k => .5 - .5 * Math.cos(Math.PI * clamp(k)),
  cubic: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  expo: k => k <= 0 ? 0 : k >= 1 ? 1 : k < .5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2,
  back: k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },   // overshoots, settles
  hold: k => k < 1 ? 0 : 1,
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

/** a sampled table of f over [0, dur] at rate hz, with linear lookup, integral and inverse (for monotone tables) */
export class Table {
  constructor(dur, hz, f) {
    this.dur = dur; this.hz = hz; this.n = Math.ceil(dur * hz) + 2; this.v = new Float64Array(this.n);
    if (f) for (let i = 0; i < this.n; i++) this.v[i] = f(i / hz);
  }
  at(t) { const x = clamp(t * this.hz, 0, this.n - 1.0001), i = Math.floor(x), k = x - i; return this.v[i] + (this.v[i + 1] - this.v[i]) * k; }
  /** running integral (trapezoid) as a new Table */
  integral(c0 = 0) { const o = new Table(this.dur, this.hz); let s = c0; o.v[0] = s; for (let i = 1; i < this.n; i++) { s += (this.v[i] + this.v[i - 1]) / 2 / this.hz; o.v[i] = s; } return o; }
  /** for a non-decreasing table: the first t where value ≥ y */
  inverse(y) {
    const v = this.v; if (y <= v[0]) return 0; if (y >= v[this.n - 1]) return (this.n - 1) / this.hz;
    let a = 0, b = this.n - 1; while (b - a > 1) { const m = (a + b) >> 1; if (v[m] < y) a = m; else b = m; }
    const k = v[b] > v[a] ? (y - v[a]) / (v[b] - v[a]) : 0; return (a + k) / this.hz;
  }
  /** a damped spring (critically damped by default) following this table, simulated once → new Table (pure as a lookup) */
  follow(f = 2, z = 1) {
    const o = new Table(this.dur, this.hz), dt = 1 / this.hz, w = TAU * f; let x = this.v[0], v = 0;
    for (let i = 0; i < this.n; i++) { const a = w * w * (this.v[i] - x) - 2 * z * w * v; v += a * dt; x += v * dt; o.v[i] = x; }
    return o;
  }
  /** derivative as a new Table */
  slope() { const o = new Table(this.dur, this.hz); for (let i = 0; i < this.n; i++) { const a = Math.max(0, i - 1), b = Math.min(this.n - 1, i + 1); o.v[i] = (this.v[b] - this.v[a]) * this.hz / (b - a); } return o; }
}

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
/** a seeded variation of a colour (for scattered pieces) */
export const vary = (c, r, a = .06) => tweak(c, (r() - .5) * 24 * a / .06, 1 + (r() - .5) * a * 2, (r() - .5) * a);

/** an offscreen canvas */
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
