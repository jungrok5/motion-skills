// sight-gag-short · core.js — the maths every other file uses: clamps and eases, keyframe tracks (K), damped springs for
// settles, seeded randoms and smooth noise. Everything here is a pure function of its inputs, so a frame is a pure
// function of t.

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerpA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const remap = (x, a, b) => clamp((x - a) / (b - a));
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** easing curves by name. "back" overshoots, "snap" is a hard ease-out (the cartoon whip), "hold" steps. */
export const EASE = {
  lin: (u) => u,
  i: (u) => u * u * u,
  o: (u) => 1 - (1 - u) ** 3,
  io: (u) => u * u * (3 - 2 * u),
  io2: (u) => u * u * u * (u * (6 * u - 15) + 10),
  i2: (u) => u * u,
  o2: (u) => 1 - (1 - u) * (1 - u),
  snap: (u) => 1 - (1 - u) ** 5,
  back: (u) => { const c = 1.9; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
  backIn: (u) => { const c = 1.7; return (c + 1) * u * u * u - c * u * u; },
  elastic: (u) => u <= 0 ? 0 : u >= 1 ? 1 : 1 + Math.pow(2, -9 * u) * Math.sin((u * 7 - 0.75) * (TAU / 3)),
  bounce: (u) => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375; return n * (u -= 2.625 / d) * u + 0.984375; },
  hold: (u) => (u < 1 ? 0 : 1),
};
export const ease = (name, u) => (EASE[name] || EASE.io)(clamp(u));

/**
 * K(t, track) — sample a keyframe track at time t.
 *   track = [[t0, v0], [t1, v1, "back"], [t2, v2, "snap"], …]   v = number or array (same length)
 * The ease on key i shapes the segment that ARRIVES at key i (default "io"). Before t0 → v0, after the last → last.
 */
export function K(t, track) {
  if (!track.length) return 0;
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, e] = track[i];
    if (t <= t1) {
      const [t0, v0] = track[i - 1];
      const u = ease(e || "io", t1 > t0 ? (t - t0) / (t1 - t0) : 1);
      return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * u) : v0 + (v1 - v0) * u;
    }
  }
  return track[track.length - 1][1];
}

/** a damped spring "settle" after an event at t0: 0 before, then amp·e^(−d·τ)·sin(ω·τ) — overshoot wobbles */
export const wob = (t, t0, amp = 1, hz = 3, decay = 6) => {
  const s = t - t0; if (s < 0) return 0;
  return amp * Math.exp(-decay * s) * Math.sin(TAU * hz * s);
};
/** 0 → 1 between a and b with a smoothstep */
export const win = (t, a, b, e = "io") => ease(e, (t - a) / (b - a));
/** 1 inside [a, b] with soft edges of length f */
export const band = (t, a, b, f = 0.1) => clamp(Math.min((t - a) / f + 1, (b - t) / f + 1));

/** seeded randoms: const r = rng(7); r() → [0, 1) */
export function rng(seed = 1) {
  let s = (Math.abs(Math.floor(seed)) * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** hash of (x, y) → [0, 1) */
export const hash = (x, y = 0) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
/** smooth value noise in 1D → [−1, 1] */
export const noise1 = (x, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
};
/** smooth value noise in 2D → [0, 1] */
export const noise2 = (x, y, seed = 0) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(i + seed * 17, j), b = hash(i + 1 + seed * 17, j), c = hash(i + seed * 17, j + 1), d = hash(i + 1 + seed * 17, j + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
};
export const fbm = (x, y, oct = 4, seed = 0) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < oct; o++) { v += a * noise2(x * f, y * f, seed + o); f *= 2; a *= 0.5; } return v / (1 - 0.5 ** oct); };

/** cubic Bézier point and tangent for arrays [x,y,z] */
export function bez(p0, p1, p2, p3, u) {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [0, 1, 2].map((i) => a * p0[i] + b * p1[i] + c * p2[i] + d * p3[i]);
}
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const dist = (a, b) => len(sub(a, b));
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** a ballistic arc from p0 to p1 with apex height h above the higher end, u in [0,1] */
export function arc(p0, p1, h, u) {
  const top = Math.max(p0[1], p1[1]) + h;
  const y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * (2 * top - (p0[1] + p1[1]) / 2) + u * u * p1[1];
  return [lerp(p0[0], p1[0], u), y, lerp(p0[2], p1[2], u)];
}
