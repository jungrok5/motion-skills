// speedpaint-replay · core.js — numbers, randomness and paths. Pure: no DOM, so the checks can import it in Node too.

export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => (u = clamp(u), u * u * (3 - 2 * u));
export const easeInOut = u => (u = clamp(u), u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const easeOut = u => 1 - (1 - clamp(u)) ** 3;
export const easeIn = u => clamp(u) ** 3;
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const TAU = Math.PI * 2;

// seeded random (mulberry32): same seed → same layout, every frame, every machine
export function rng(seed = 1) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.pm = a => (r() * 2 - 1) * a;
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  return r;
}
export const hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= Math.floor(v * 1000) | 0; h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u); }

// "x,y x,y x,y" → [[x,y], …]   (also accepts an array of pairs and returns a copy)
export function P(s) {
  if (Array.isArray(s)) return s.map(p => [p[0], p[1]]);
  const n = s.trim().split(/[\s,]+/).map(Number), out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
}

// Catmull-Rom (centripetal-ish, tension .5) through the control points → dense polyline (~`step` units apart)
export function spline(ctrl, closed = false, step = 4) {
  const c = ctrl, n = c.length;
  if (n < 2) return c.map(p => [...p]);
  if (n === 2 && !closed) return resample(c, step);
  const at = i => closed ? c[(i + n) % n] : c[clamp(i, 0, n - 1)];
  const out = [], segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(L / step));
    for (let j = 0; j < k; j++) {
      const u = j / k, u2 = u * u, u3 = u2 * u;
      const f = (a, b, cc, d) => .5 * ((2 * b) + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u2 + (-a + 3 * b - 3 * cc + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push([...c[n - 1]]);
  return out;
}

// straight segments resampled so points are ~step apart
export function resample(pts, step = 4) {
  const out = [[...pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / step));
    for (let j = 1; j <= k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  return out;
}

export function lengths(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; }

// point at arc length s on a polyline with cumulative lengths cum
export function at(pts, cum, s) {
  if (s <= 0) return [...pts[0]];
  const L = cum[cum.length - 1]; if (s >= L) return [...pts[pts.length - 1]];
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
  const u = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [lerp(pts[lo][0], pts[hi][0], u), lerp(pts[lo][1], pts[hi][1], u)];
}

export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); }

// normals of a polyline (unit, pointing left of the direction of travel)
export function normals(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  });
}

// cubic bezier → points (for helpers that think in handles)
export function bez(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]);
  }
  return out;
}

// rotate / scale / move points about an origin — reuse a drawn part (a lock, a lash) in another place
export function xf(pts, { dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, ox = 0, oy = 0 } = {}) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([x, y]) => { const X = (x - ox) * sx, Y = (y - oy) * sy; return [ox + X * c - Y * s + dx, oy + X * s + Y * c + dy]; });
}

// colour: '#rrggbb' ↔ [r,g,b]; mix
export const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export const rgb2hex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, u) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => lerp(v, B[i], u))); };
export const rgba = (h, a = 1) => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };

// points on an ellipse arc (angles in radians, 0 = right, π/2 = down), for rims, eyes, bowls, halos
export function arc(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 40, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
