// lineage-glow · core.js — pure helpers. Nothing here keeps state between frames.
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const mix2 = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];

// seeded random (mulberry32) — use in layouts and caches, never Math.random
export function rng(seed = 1) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  return r;
}
// stateless hash → [0,1)
export function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// smooth 1-D value noise
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}

export const ease = {
  linear: u => u,
  in: u => u * u * u,
  out: u => 1 - Math.pow(1 - u, 3),
  inOut: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  sine: u => .5 - Math.cos(Math.PI * u) / 2,
  expoOut: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
  expoIn: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
  expoInOut: u => u <= 0 ? 0 : u >= 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  back: u => { const c = 1.4; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
const E = e => typeof e === 'function' ? e : ease[e || 'inOut'];

// progress of t through [a, b], eased
export const win = (t, a, b, e = 'linear') => E(e)(clamp((t - a) / (b - a || 1e-9)));
// envelope: 0 before t0, rises over fi, 1, falls over fo, 0 after t1
export function env(t, t0, t1, fi = .5, fo = .5) {
  if (t < t0 || t > t1) return 0;
  return Math.min(fi > 0 ? ease.sine(clamp((t - t0) / fi)) : 1, fo > 0 ? ease.sine(clamp((t1 - t) / fo)) : 1);
}

// keyframes: keys([[t, value, ease?], …]) → f(t). value: number, [x, y], or {k: number}. Each segment eases with the
// ease named on its *end* key (default inOut). Before the first key / after the last, holds.
export function keys(list) {
  const k = list.slice().sort((a, b) => a[0] - b[0]);
  const blend = (a, b, u) => typeof a === 'number' ? lerp(a, b, u)
    : Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], u))
    : Object.fromEntries(Object.keys(a).map(n => [n, lerp(a[n], b[n] ?? a[n], u)]));
  return t => {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) {
      const u = E(k[i][2])((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0] || 1e-9));
      return blend(k[i - 1][1], k[i][1], u);
    }
    return k[k.length - 1][1];
  };
}
// step function: steps([[t, v], …]) → { v, prev, since } at t (for counters)
export function steps(list) {
  const k = list.slice().sort((a, b) => a[0] - b[0]);
  return t => {
    let i = -1; for (let j = 0; j < k.length; j++) if (t >= k[j][0]) i = j;
    return { i, v: i < 0 ? null : k[i][1], prev: i > 0 ? k[i - 1][1] : null, since: i < 0 ? Infinity : t - k[i][0], at: i < 0 ? null : k[i][0] };
  };
}
// 8589934592 → "8,589,934,592"
export const fmt = n => typeof n === 'number' ? Math.round(n).toLocaleString('en-US') : String(n);

// colour: '#rrggbb' → [r,g,b]; rgba(c, a) → css
export const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgba = (c, a = 1) => { const [r, g, b] = Array.isArray(c) ? c : hex(c); return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a)})`; };
export const mixc = (c1, c2, u) => { const a = Array.isArray(c1) ? c1 : hex(c1), b = Array.isArray(c2) ? c2 : hex(c2); return a.map((v, i) => lerp(v, b[i], u)); };

// cubic bezier helpers. A curve is [p0, p1, p2, p3], each [x, y].
export function bez(c, u) {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, d = 3 * v * u * u, e = u * u * u;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}
// the part of a curve from 0 to u (de Casteljau) — for growing lines
export function bezPart(c, u) {
  if (u >= 1) return c;
  const m = (p, q) => mix2(p, q, u);
  const a = m(c[0], c[1]), b = m(c[1], c[2]), d = m(c[2], c[3]), e = m(a, b), f = m(b, d), g = m(e, f);
  return [c[0], a, e, g];
}
// the part from u0 to u1
export function bezSeg(c, u0, u1) {
  if (u0 <= 0) return bezPart(c, u1);
  const rev = q => [q[3], q[2], q[1], q[0]];
  const tail = rev(bezPart(rev(c), 1 - u0));            // u0 → 1
  return bezPart(tail, (u1 - u0) / (1 - u0));
}
// the lineage curve: leaves the child vertically, arrives at the parent vertically (the S of the reference style)
export function sCurve(child, parent, k = .5) {
  const dy = parent[1] - child[1];
  return [child, [child[0], child[1] + dy * k], [parent[0], parent[1] - dy * k], parent];
}
