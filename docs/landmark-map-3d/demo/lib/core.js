// landmark-map-3d · core.js — small shared helpers: seeded randomness, hashing, easing, keyed tracks, colours.
// Every per-frame value in a film is a function of t; nothing here keeps state between frames.
import * as THREE from 'three';
export { THREE };

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  linear: t => t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
  out: t => 1 - (1 - t) ** 3,
  in: t => t * t * t,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  back: t => { const c = 1.70158 * 1.2; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
};
// mulberry32 — a seeded generator; rng(seed) returns () => [0, 1)
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= Math.floor(v * 1000) | 0; h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
export const strHash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function pick(r, list, weights) {
  if (!weights) return list[Math.floor(r() * list.length) % list.length];
  const sum = weights.reduce((a, b) => a + b, 0); let x = r() * sum;
  for (let i = 0; i < list.length; i++) { x -= weights[i]; if (x <= 0) return list[i]; }
  return list.at(-1);
}
// colours: hex strings in, THREE.Color (linear working space) out
export const col = c => c instanceof THREE.Color ? c.clone() : new THREE.Color(c);
export const mixc = (a, b, t) => col(a).lerp(col(b), t);
export function shade(c, k) { const o = col(c); const hsl = {}; o.getHSL(hsl); o.setHSL(hsl.h, hsl.s, clamp(hsl.l * k)); return o; }

// value noise (2D), deterministic
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export const fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2; a *= .5; } return s / (1 - .5 ** o); };

// A keyed track: keys [{t, ...values}] → value at time t. Numbers and colours interpolate; easing per key ('ease' of the
// key you arrive at). Smooth = Catmull-Rom through the keys (camera), else eased piecewise (time of day, weather).
export function track(keys, { smooth: cr = false } = {}) {
  keys = keys.slice().sort((a, b) => a.t - b.t);
  const fields = [...new Set(keys.flatMap(k => Object.keys(k)))].filter(f => f !== 't' && f !== 'ease');
  // carry missing values forward so every key has every field
  for (let i = 0; i < keys.length; i++) for (const f of fields) if (keys[i][f] === undefined) keys[i][f] = i ? keys[i - 1][f] : keys.find(k => k[f] !== undefined)[f];
  const at = t => {
    if (t <= keys[0].t) return { ...keys[0] };
    if (t >= keys.at(-1).t) return { ...keys.at(-1) };
    let i = 0; while (keys[i + 1].t < t) i++;
    const a = keys[i], b = keys[i + 1], e = ease[b.ease || (cr ? 'linear' : 'inOut')] || ease.inOut;
    const u = e((t - a.t) / (b.t - a.t)), o = { t };
    for (const f of fields) {
      const va = a[f], vb = b[f];
      if (typeof va === 'number') {
        if (cr) {                                       // Catmull-Rom with clamped ends (no overshoot past the first/last key)
          const p0 = (keys[i - 1] || a)[f], p3 = (keys[i + 2] || b)[f];
          const ta = keys[i - 1] ? (vb - p0) / ((b.t - keys[i - 1].t) || 1) * (b.t - a.t) : 0;
          const tb = keys[i + 2] ? (p3 - va) / ((keys[i + 2].t - a.t) || 1) * (b.t - a.t) : 0;
          const s = (t - a.t) / (b.t - a.t), x = b.ease ? u : s;
          const h00 = 2 * x ** 3 - 3 * x ** 2 + 1, h10 = x ** 3 - 2 * x ** 2 + x, h01 = -2 * x ** 3 + 3 * x ** 2, h11 = x ** 3 - x ** 2;
          o[f] = h00 * va + h10 * ta + h01 * vb + h11 * tb;
        } else o[f] = lerp(va, vb, u);
      } else if (Array.isArray(va) && typeof va[0] === 'number') {
        o[f] = va.map((v, k) => {
          if (!cr) return lerp(v, vb[k], u);
          const p0 = (keys[i - 1] || a)[f][k], p3 = (keys[i + 2] || b)[f][k];
          const ta = keys[i - 1] ? (vb[k] - p0) / ((b.t - keys[i - 1].t) || 1) * (b.t - a.t) : 0;
          const tb = keys[i + 2] ? (p3 - v) / ((keys[i + 2].t - a.t) || 1) * (b.t - a.t) : 0;
          const s = (t - a.t) / (b.t - a.t), x = b.ease ? u : s;
          return (2 * x ** 3 - 3 * x ** 2 + 1) * v + (x ** 3 - 2 * x ** 2 + x) * ta + (-2 * x ** 3 + 3 * x ** 2) * vb[k] + (x ** 3 - x ** 2) * tb;
        });
      } else if (typeof va === 'string' && /^#/.test(va)) o[f] = '#' + mixc(va, vb, u).getHexString();
      else o[f] = u < .5 ? va : vb;
    }
    return o;
  };
  at.keys = keys;
  return at;
}

// polylines
export function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
export function cumLen(p) { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; }
// point + unit tangent at arc length s on polyline p with cumulative lengths c
export function along(p, c, s) {
  const L = c.at(-1); s = clamp(s, 0, L);
  let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], seg = (c[hi] - c[lo]) || 1e-9, u = (s - c[lo]) / seg;
  const dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, dx, dz];
}
export const inPoly = ([x, z], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
export const polyArea = p => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return a / 2; };
export const centroid = p => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
export function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const u = clamp(((px - ax) * dx + (pz - az) * dz) / L2);
  return Math.hypot(px - ax - dx * u, pz - az - dz * u);
}
// a spatial hash for "what is near (x, z)" over many items
export class Grid {
  constructor(cell = 40) { this.c = cell; this.m = new Map(); }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  add(x0, z0, x1, z1, item) { const c = this.c; for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = this.key(i, j); let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(item); } }
  near(x, z, r = 0) { const c = this.c, out = new Set(); for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) for (const it of this.m.get(this.key(i, j)) || []) out.add(it); return out; }
}
export const q = new URLSearchParams(location.search);
