// swarm-world · math.js — small, pure helpers shared by world.js, kit.js and your world.html.
// Nothing here keeps state between frames: the only state is the seeded generator, and it is used while the world is laid out.
export const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (e0, e1, x) => { const t = cl((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// a seeded generator (Park–Miller): the same seed lays out the same world every time
export function rng(seed = 1) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return { rnd, rr: (a, b) => a + (b - a) * rnd(), pick: (arr) => arr[Math.floor(rnd() * arr.length)], int: (a, b) => Math.floor(a + (b - a + 1) * rnd()) };
}

// value noise and fbm over the ground plane
export const h2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h2(xi, zi), h2(xi + 1, zi), u), lerp(h2(xi, zi + 1), h2(xi + 1, zi + 1), u), v);
}
export const fbm = (x, z) => noise(x, z) * 0.5 + noise(x * 2.03 + 5, z * 2.03) * 0.25 + noise(x * 4.1, z * 4.1 + 3) * 0.125 + noise(x * 8.3 + 1, z * 8.3) * 0.0625;

// sorted-array helpers: how many build times are ≤ p
export const countTo = (arr, p) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= p) lo = m + 1; else hi = m; } return lo; };
export const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
export const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const clock = (sec) => Math.floor(sec / 60) + ':' + (sec % 60).toFixed(1).padStart(4, '0');
