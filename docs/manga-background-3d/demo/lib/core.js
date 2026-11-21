// manga-background-3d · core.js — seeded randomness, noise, easing and small maths. No Math.random anywhere:
// every frame is a pure function of t, and every stroke's wobble is a pure function of its edge.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// 32-bit integer hash of any number of integers (or floats, truncated)
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

// mulberry32: a small seeded generator
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

// smooth 1-D value noise in [-1, 1]
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash01(i, seed) * 2 - 1, hash01(i + 1, seed) * 2 - 1, u);
}

export const ease = {
  linear: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  // a slow, even dolly: gentle start and stop, mostly constant speed (what a camera on a slider does)
  dolly: t => { const a = 0.18; if (t < a) return (t * t) / (2 * a * (1 - a)); if (t > 1 - a) return 1 - ((1 - t) * (1 - t)) / (2 * a * (1 - a)); return (t - a / 2) / (1 - a); },
};

// a value that is a list of keys [{t, ...}] or a pair → the keyed value at u ∈ [0, 1]
export function keyed(keys, u, ease_ = ease.dolly) {
  if (!Array.isArray(keys) || !keys.length) return keys;
  if (keys.length === 1) return keys[0];
  // one ease over the whole move (no stop at the middle keys), then straight between keys
  const ts = keys.map((k, i) => (k.t ?? i / (keys.length - 1))), ue = ease_(clamp(u));
  let i = 0; while (i < keys.length - 2 && ue > ts[i + 1]) i++;
  const span = ts[i + 1] - ts[i] || 1, local = clamp((ue - ts[i]) / span);
  const a = keys[i], b = keys[i + 1], out = {};
  for (const k of Object.keys(a)) {
    if (k === 't') continue;
    const va = a[k], vb = b[k] ?? va;
    out[k] = Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], local)) : typeof va === 'number' ? lerp(va, vb, local) : va;
  }
  return out;
}
