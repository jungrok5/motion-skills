// engraving-collage-film · core.js — seeded randomness, noise, easing and small maths. No Math.random, no Date:
// every frame is a pure function of t, every engraved line a pure function of its plate's seed.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** 32-bit integer hash of any number of numbers */
export function hash(...n) {
  let h = 0x811c9dc5 | 0;
  for (const v of n) {
    let k = (v | 0) ^ Math.imul((v * 1000003) | 0, 0x27d4eb2d);
    h = Math.imul(h ^ k, 0x01000193);
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  }
  return h >>> 0;
}
export const hash01 = (...n) => hash(...n) / 4294967296;
export const sid = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/** mulberry32: a small seeded generator with helpers */
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

/** smooth 1-D value noise in [-1, 1] */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash01(i, seed) * 2 - 1, hash01(i + 1, seed) * 2 - 1, u);
}
/** smooth 2-D value noise in [-1, 1] */
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash01(i, j, seed), b = hash01(i + 1, j, seed), c = hash01(i, j + 1, seed), d = hash01(i + 1, j + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}

export const ease = {
  linear: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  sine: t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)),
  /** overshoot then settle (follow-through): passes 1 by ~6 % and comes back */
  back: t => { const c = 1.4, u = clamp(t) - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
  /** a crane / dolly: gentle start and stop, mostly constant speed */
  dolly: t => { const a = 0.2; t = clamp(t); if (t < a) return (t * t) / (2 * a * (1 - a)); if (t > 1 - a) return 1 - ((1 - t) * (1 - t)) / (2 * a * (1 - a)); return (t - a / 2) / (1 - a); },
};

/** keys [{t?, ...}] → the keyed value at u ∈ [0, 1]; one ease over the whole move, Catmull-Rom between keys */
export function keyed(keys, u, ease_ = ease.dolly) {
  if (!Array.isArray(keys) || !keys.length) return keys;
  if (keys.length === 1) return { ...keys[0] };
  const ts = keys.map((k, i) => k.t ?? i / (keys.length - 1)), ue = ease_(clamp(u));
  let i = 0; while (i < keys.length - 2 && ue > ts[i + 1]) i++;
  const local = clamp((ue - ts[i]) / (ts[i + 1] - ts[i] || 1));
  const k0 = keys[Math.max(0, i - 1)], a = keys[i], b = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)], out = {};
  const cr = (p0, p1, p2, p3, s) => 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
  for (const k of Object.keys(a)) {
    if (k === 't') continue;
    const va = a[k], vb = b[k] ?? va, v0 = k0[k] ?? va, v3 = k3[k] ?? vb;
    out[k] = Array.isArray(va) ? va.map((v, j) => cr(v0[j], v, vb[j], v3[j], local)) : typeof va === 'number' ? cr(v0, va, vb, v3, local) : va;
  }
  return out;
}
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
};
