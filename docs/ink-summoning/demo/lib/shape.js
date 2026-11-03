// ink-summoning · shape.js — drawing 3D bodies with Canvas 2D: everything is projected tubes (capsules along a polyline
// with radii), blobs (spheres), flat world polygons and lines. A tube's silhouette is the same from every angle, so a
// figure built from tubes stays correct while the camera orbits it.
//   tube(ctx, v, pts, radii, fill, o)   o: { rim: lighter colour for the top-lit edge, rimA, cap: true }
//   blob(ctx, v, p, r, fill, o)  ·  poly3(ctx, v, pts, fill)  ·  line3(ctx, v, a, b, w, col)  ·  depth(v, p)
import { clamp, v3, TAU, lerp } from './core.js';

export const depth = (v, p) => v.cam(p)[2];

// screen-space outline of a tube; returns null when (part of) it is behind the camera
function outline(v, pts, radii) {
  const P = [], R = [];
  for (let i = 0; i < pts.length; i++) { const q = v.p(pts[i]); if (!q) return null; P.push(q); R.push((typeof radii === 'number' ? radii : radii[i]) * v.k(q[2])); }
  const L = [], Rt = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty); if (l < 1e-6) { tx = 1; ty = 0; } else { tx /= l; ty /= l; }
    L.push([P[i][0] - ty * R[i], P[i][1] + tx * R[i]]); Rt.push([P[i][0] + ty * R[i], P[i][1] - tx * R[i]]);
  }
  return { P, R, L, Rt };
}
export function tube(ctx, v, pts, radii, fill, o = {}) {
  const ol = outline(v, pts, radii); if (!ol) return;
  const { P, R, L, Rt } = ol, n = P.length;
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  if (o.cap !== false) { const a0 = Math.atan2(L[n - 1][1] - P[n - 1][1], L[n - 1][0] - P[n - 1][0]); ctx.arc(P[n - 1][0], P[n - 1][1], R[n - 1], a0, a0 - Math.PI, true); }
  else ctx.lineTo(Rt[n - 1][0], Rt[n - 1][1]);
  for (let i = n - 2; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]);
  if (o.cap !== false) { const a0 = Math.atan2(Rt[0][1] - P[0][1], Rt[0][0] - P[0][0]); ctx.arc(P[0][0], P[0][1], R[0], a0, a0 - Math.PI, true); }
  ctx.closePath(); ctx.fill();
  // rim light: a thin lighter band along the edge that faces up the screen (the key light is overhead)
  if (o.rim) {
    const up = (i) => { const a = L[i], b = Rt[i]; return a[1] < b[1] ? [a, 1] : [b, -1]; };
    ctx.save(); ctx.globalAlpha = o.rimA ?? .5; ctx.strokeStyle = o.rim; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const [e, s] = up(i), k = .22; const x = lerp(e[0], P[i][0], k), y = lerp(e[1], P[i][1], k); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.lineWidth = Math.max(.7, (R[Math.floor(n / 2)] || 1) * (o.rimW ?? .28)); ctx.stroke(); ctx.restore();
  }
}
export function blob(ctx, v, p, r, fill, o = {}) {
  const q = v.p(p); if (!q) return null;
  const rr = r * v.k(q[2]); ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(q[0], q[1], rr * (o.sx || 1), rr * (o.sy || 1), o.rot || 0, 0, TAU); ctx.fill();
  return [q[0], q[1], rr];
}
export function poly3(ctx, v, pts, fill) { const s = v.poly(pts); if (!s) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (const p of s) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); }
// a smooth closed world polygon (quadratic through midpoints) — cloth, ears, flames
export function soft3(ctx, v, pts, fill) {
  const s = pts.map(p => v.p(p)); if (s.some(q => !q)) return; const n = s.length;
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo((s[n - 1][0] + s[0][0]) / 2, (s[n - 1][1] + s[0][1]) / 2);
  for (let i = 0; i < n; i++) { const a = s[i], b = s[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  ctx.closePath(); ctx.fill();
}
export function line3(ctx, v, pts, w, col, o = {}) {
  const s = pts.map(p => v.p(p)); if (s.some(q => !q)) return;
  ctx.strokeStyle = col; ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(o.min ?? .6, w * v.k(s[0][2]));
  ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]); ctx.stroke();
}
// a tapered stroke along world points: width w at the root → 0 at the end (hair strands, whiskers, claws, feathers)
export function taper(ctx, v, pts, w, col, o = {}) {
  const n = pts.length, radii = pts.map((_, i) => w / 2 * Math.pow(1 - i / (n - 1) * (o.end ?? 1), o.pow ?? 1) + (o.min ?? 0));
  tube(ctx, v, pts, radii, col, { cap: false, ...o });
}
// is the surface at p with normal n facing the camera?
export const facing = (v, p, n) => v3.dot(n, v3.sub(v.mirrored ? [v.pos[0], -v.pos[1], v.pos[2]] : v.pos, p)) > 0;
// for the mirrored view the camera position is reflected instead of the points; facing() above handles it
export const cpos = v => v.mirrored ? [v.pos[0], -v.pos[1], v.pos[2]] : v.pos;
