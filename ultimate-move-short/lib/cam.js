// ultimate-move-short · cam.js — the 3D side of a 2.5D film: a camera that projects metres to stage pixels on Canvas 2D,
// near-plane clipping, and a few helpers for the ground plane. The fighter, ink, cracks and watchers are placed in 3D and
// drawn as flat 2D shapes from their projected points, so a camera can orbit the fighter like an anime "sphere shot".
//
//   const v = view(cam, W, H)     cam = { at:[x,y,z], yaw, pitch, dist, fov, roll }  (an orbit around `at`)
//                                 or   { pos:[x,y,z], at:[x,y,z], fov, roll }       (a placed camera)
//   v.p([x,y,z]) → [sx, sy, depth] or null behind the lens     v.k(depth) = stage px per metre at that depth
//   v.poly(pts) / v.seg(a, b)     clipped to the near plane
//   v.horizon()                   the horizon line → [y at x = 0, y at x = W] (pitch and roll aware)
//
// World units are metres, y is up, the ground is y = 0. yaw 0 puts the camera on +z looking toward −z.
import { dir, v3 } from './core.js';

const NEAR = .06;

export function view(c, W, H) {
  const at = c.at || [0, 1.2, 0], fov = (c.fov || 40) * Math.PI / 180;
  const pos = c.pos || v3.add(at, v3.mul(dir(c.yaw || 0, c.pitch || 0), c.dist || 6));
  let f = v3.norm(v3.sub(at, pos)), r = v3.norm(v3.cross(f, [0, 1, 0])), u = v3.cross(r, f);
  if (c.roll) { const cs = Math.cos(c.roll), s = Math.sin(c.roll), r2 = v3.add(v3.mul(r, cs), v3.mul(u, s)), u2 = v3.sub(v3.mul(u, cs), v3.mul(r, s)); r = r2; u = u2; }
  const focal = (H / 2) / Math.tan(fov / 2), cx = W / 2 + (c.sx || 0), cy = H / 2 + (c.sy || 0);
  const cam = p => { const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]]; return [d[0] * r[0] + d[1] * r[1] + d[2] * r[2], d[0] * u[0] + d[1] * u[1] + d[2] * u[2], d[0] * f[0] + d[1] * f[1] + d[2] * f[2]]; };
  const scr = q => [cx + q[0] * focal / q[2], cy - q[1] * focal / q[2], q[2]];
  const v = {
    W, H, pos, f, r, u, focal, cam, scr, near: NEAR, c, cx, cy,
    p: pt => { const q = cam(pt); return q[2] > NEAR ? scr(q) : null; },
    k: z => focal / z,
    depth: pt => cam(pt)[2],
    // does the point face the camera? (n = outward normal at p)
    faces: (p, n) => v3.dot(n, v3.sub(pos, p)) > 0,
    poly(pts) {
      const q = pts.map(cam), out = [];
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length], ia = a[2] > NEAR, ib = b[2] > NEAR;
        if (ia) out.push(scr(a));
        if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push(scr([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR])); }
      }
      return out.length > 2 ? out : null;
    },
    seg(a, b) {
      let A = cam(a), B = cam(b);
      if (A[2] <= NEAR && B[2] <= NEAR) return null;
      if (A[2] <= NEAR) { const k = (NEAR - A[2]) / (B[2] - A[2]); A = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, NEAR]; }
      if (B[2] <= NEAR) { const k = (NEAR - B[2]) / (A[2] - B[2]); B = [B[0] + (A[0] - B[0]) * k, B[1] + (A[1] - B[1]) * k, NEAR]; }
      return [scr(A), scr(B)];
    },
    // the horizon (the ground's vanishing line) → [y at x = 0, y at x = W], or null when looking straight down/up
    horizon() {
      const pr = d => { const x = v3.dot(d, r), y = v3.dot(d, u), z = v3.dot(d, f); return z > 1e-4 ? [cx + x / z * focal, cy - y / z * focal] : null; };
      const h = Math.hypot(f[0], f[2]); if (h < 1e-3) return null;
      const fh = [f[0] / h, 0, f[2] / h], side = [-fh[2], 0, fh[0]];
      const a = pr(v3.add(fh, v3.mul(side, -.3))), b = pr(v3.add(fh, v3.mul(side, .3)));
      if (!a || !b) return null;
      const m = (b[1] - a[1]) / (b[0] - a[0] || 1e-6);
      return [a[1] - m * a[0], a[1] + m * (W - a[0])];
    },
  };
  return v;
}

export const tracePoly = (ctx, s) => { ctx.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]); ctx.closePath(); };
export function fillPoly(ctx, s) { if (!s || s.length < 3) return; ctx.beginPath(); tracePoly(ctx, s); ctx.fill(); }

// 2D convex hull (monotone chain) of [[x, y], …] — the silhouette of a set of projected 3D points
export function hull(pts) {
  const p = pts.filter(Boolean).map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// a smooth closed path through screen points (Catmull-Rom → Bézier), for organic silhouettes
export function smoothClosed(ctx, s, k = .5) {
  const n = s.length; if (n < 3) return;
  ctx.moveTo(s[0][0], s[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = s[(i - 1 + n) % n], p1 = s[i], p2 = s[(i + 1) % n], p3 = s[(i + 2) % n];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3, p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]);
  }
  ctx.closePath();
}
export function smoothOpen(ctx, s, k = .5, move = true) {
  const n = s.length; if (n < 2) return;
  if (move) ctx.moveTo(s[0][0], s[0][1]); else ctx.lineTo(s[0][0], s[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = s[Math.max(0, i - 1)], p1 = s[i], p2 = s[i + 1], p3 = s[Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3, p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]);
  }
}
