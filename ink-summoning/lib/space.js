// ink-summoning · space.js — the 3D side: a camera that projects metres to stage pixels (Canvas 2D, no WebGL), polygon
// clipping at the near plane, a mirrored view for the glossy floor, and the white studio itself.
//
//   const v = view(cam, W, H)            cam = { at:[x,y,z], yaw, pitch, dist, fov, roll }  (an orbit around `at`)
//   v.p([x, y, z]) → [sx, sy, depth]     depth ≤ near → null.  v.k(depth) = stage px per metre at that depth
//   v.mirror()                           the same camera looking at the world reflected in the floor (y → −y)
//   studio(ctx, v, room)                 walls, light slots, ceiling, doorway — call with v and v.mirror()
//
// World units are metres, y is up, the floor is y = 0. yaw 0 puts the camera on +z looking toward −z.
import { clamp, dir, v3, rgba, mix } from './core.js';

const NEAR = .08;

export function view(c, W, H) {
  const at = c.at || [0, 1.2, 0], fov = (c.fov || 40) * Math.PI / 180;
  const pos = c.pos || v3.add(at, v3.mul(dir(c.yaw || 0, c.pitch || 0), c.dist || 6));
  let f = v3.norm(v3.sub(at, pos)), r = v3.norm(v3.cross(f, [0, 1, 0])), u = v3.cross(r, f);
  if (c.roll) { const cs = Math.cos(c.roll), s = Math.sin(c.roll), r2 = v3.add(v3.mul(r, cs), v3.mul(u, s)), u2 = v3.sub(v3.mul(u, cs), v3.mul(r, s)); r = r2; u = u2; }
  const focal = (H / 2) / Math.tan(fov / 2), cx = W / 2 + (c.sx || 0), cy = H / 2 + (c.sy || 0);
  const mk = m => {
    const cam = p => { const d = [p[0] - pos[0], (m ? -p[1] : p[1]) - pos[1], p[2] - pos[2]]; return [d[0] * r[0] + d[1] * r[1] + d[2] * r[2], d[0] * u[0] + d[1] * u[1] + d[2] * u[2], d[0] * f[0] + d[1] * f[1] + d[2] * f[2]]; };
    const scr = q => [cx + q[0] * focal / q[2], cy - q[1] * focal / q[2], q[2]];
    const v = {
      W, H, pos, f, r, u, focal, mirrored: m, cam, scr, near: NEAR, c,
      p: pt => { const q = cam(pt); return q[2] > NEAR ? scr(q) : null; },
      k: z => focal / z,
      depth: pt => cam(pt)[2],
      // world-space polygon → clipped screen polygon (array of [sx, sy]) or null
      poly(pts) {
        const q = pts.map(cam), out = [];
        for (let i = 0; i < q.length; i++) {
          const a = q[i], b = q[(i + 1) % q.length], ia = a[2] > NEAR, ib = b[2] > NEAR;
          if (ia) out.push(scr(a));
          if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push(scr([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR])); }
        }
        return out.length > 2 ? out : null;
      },
      // a segment clipped to the near plane → two screen points or null
      seg(a, b) {
        let A = cam(a), B = cam(b);
        if (A[2] <= NEAR && B[2] <= NEAR) return null;
        if (A[2] <= NEAR) { const k = (NEAR - A[2]) / (B[2] - A[2]); A = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, NEAR]; }
        if (B[2] <= NEAR) { const k = (NEAR - B[2]) / (A[2] - B[2]); B = [B[0] + (A[0] - B[0]) * k, B[1] + (A[1] - B[1]) * k, NEAR]; }
        return [scr(A), scr(B)];
      },
      mirror: () => m ? v : mk(true),
      plain: () => m ? mk(false) : v,
    };
    return v;
  };
  return mk(false);
}

export function fillPoly(ctx, s) { ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]); ctx.closePath(); ctx.fill(); }
const tracePoly = (ctx, s) => { ctx.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]); ctx.closePath(); };

// ---------- the studio ----------
// A long white room: panelled walls with recessed vertical light slots, a long ceiling light, a bright doorway in the
// far wall, a glossy pale floor. Everything is high-key: the darkest wall tone is ~#c4c8cc, the slots are pure white.
export const ROOM = {
  x: 7.5, z: 11, h: 7,            // half-width, half-length, height (metres)
  panel: 2.6, slot: .16,           // wall panel width and the light slot between panels
  wall: '#d8dbde', wallLow: '#b6bbc0', shade: '#9aa1a8', ceil: '#d0d3d6', floor: '#c9cdd1', light: '#ffffff',
  door: { w: 3.2, h: 4.6 },        // the bright opening in the far wall (−z); null for none
  spill: .7,                       // light spill around each slot (metres)
  beams: 5,                        // ceiling cross-beams (depth cue)
};

// walls as quads [[x,y,z] × 4] with a normal and a 'lit' factor (how much the key light from the doorway hits them)
function wallQuads(R) {
  const q = [], X = R.x, Z = R.z, H = R.h;
  const along = (len, fn) => { const n = Math.max(1, Math.round(len / R.panel)), w = len / n; for (let i = 0; i < n; i++) fn(-len / 2 + i * w, w, i, n); };
  // side walls (x = ±X), panels along z
  for (const sx of [-1, 1]) along(2 * Z, (z0, w, i, n) => q.push({ kind: 'panel', side: sx, lit: .9 - .3 * (i / n), pts: [[sx * X, 0, z0], [sx * X, H, z0], [sx * X, H, z0 + w], [sx * X, 0, z0 + w]], slot: i > 0 ? { a: [sx * X, 0, z0], b: [sx * X, H, z0], axis: [0, 0, 1] } : null }));
  // far wall (z = −Z) and near wall (z = +Z), panels along x
  for (const sz of [-1, 1]) along(2 * X, (x0, w, i) => q.push({ kind: 'panel', side: 0, back: sz, lit: sz < 0 ? 1 : .75, pts: [[x0, 0, sz * Z], [x0, H, sz * Z], [x0 + w, H, sz * Z], [x0 + w, 0, sz * Z]], slot: i > 0 ? { a: [x0, 0, sz * Z], b: [x0, H, sz * Z], axis: [1, 0, 0] } : null }));
  return q;
}

// one pass of the studio for view v (plain or mirrored). Returns the floor polygon in screen space (for the reflection).
export function studio(ctx, v, R = ROOM, o = {}) {
  const X = R.x, Z = R.z, H = R.h, m = v.mirrored;
  ctx.save();
  // ceiling
  let s = v.poly([[-X, H, -Z], [X, H, -Z], [X, H, Z], [-X, H, Z]]);
  if (s) { ctx.fillStyle = R.ceil; fillPoly(ctx, s); }
  // ceiling light panel and cross beams
  s = v.poly([[-1.1, H - .01, -Z + .5], [1.1, H - .01, -Z + .5], [1.1, H - .01, Z - .5], [-1.1, H - .01, Z - .5]]);
  if (s) { ctx.fillStyle = R.light; fillPoly(ctx, s); }
  for (let i = 0; i < R.beams; i++) {
    const z = -Z + (i + .5) * 2 * Z / R.beams;
    s = v.poly([[-X, H, z - .25], [X, H, z - .25], [X, H - .35, z], [-X, H - .35, z]]); if (s) { ctx.fillStyle = mix(R.ceil, R.shade, .55); fillPoly(ctx, s); }
    s = v.poly([[-X, H - .35, z], [X, H - .35, z], [X, H, z + .25], [-X, H, z + .25]]); if (s) { ctx.fillStyle = mix(R.ceil, R.light, .5); fillPoly(ctx, s); }
  }
  // walls: each panel a vertical gradient (pale at the top, greyer low down) + an ambient-occlusion band at the floor
  for (const w of wallQuads(R)) {
    s = v.poly(w.pts); if (!s) continue;
    const top = v.p(v3.lerp(w.pts[1], w.pts[2], .5)), bot = v.p(v3.lerp(w.pts[0], w.pts[3], .5));
    const base = mix(R.wall, R.shade, 1 - w.lit);
    if (top && bot) {
      const g = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1]);
      g.addColorStop(0, mix(base, R.light, .35)); g.addColorStop(.55, base); g.addColorStop(.93, mix(base, R.wallLow, .8)); g.addColorStop(1, mix(base, R.shade, .9));
      ctx.fillStyle = g;
    } else ctx.fillStyle = base;
    fillPoly(ctx, s);
    // light slot between panels: a soft spill band, then the white core
    if (w.slot) {
      const ax = w.slot.axis, sp = R.spill, a = w.slot.a, b = w.slot.b;
      for (const [wd, al] of [[sp, .22], [sp * .45, .35], [sp * .18, .5]]) {
        const q = v.poly([v3.mad(a, ax, -wd), v3.mad(b, ax, -wd), v3.mad(b, ax, wd), v3.mad(a, ax, wd)]);
        if (q) { ctx.fillStyle = rgba(R.light, al); fillPoly(ctx, q); }
      }
      const q = v.poly([v3.mad(a, ax, -R.slot / 2), v3.mad(b, ax, -R.slot / 2), v3.mad(b, ax, R.slot / 2), v3.mad(a, ax, R.slot / 2)]);
      if (q) { ctx.fillStyle = R.light; fillPoly(ctx, q); }
    }
  }
  // corners: a thin shadow line where walls meet
  ctx.strokeStyle = rgba(R.shade, .6); ctx.lineWidth = 1.5;
  for (const [x, z] of [[-X, -Z], [X, -Z], [-X, Z], [X, Z]]) { const q = v.seg([x, 0, z], [x, H, z]); if (q) { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); } }
  // the doorway: a recessed bright opening in the far wall with a glow around it
  if (R.door) {
    const dw = R.door.w / 2, dh = R.door.h, z = -Z + .01;
    for (const [e, al] of [[1.4, .25], [.7, .4], [.25, .6]]) { const q = v.poly([[-dw - e, 0, z], [-dw - e, dh + e, z], [dw + e, dh + e, z], [dw + e, 0, z]]); if (q) { ctx.fillStyle = rgba(R.light, al); fillPoly(ctx, q); } }
    const q = v.poly([[-dw, 0, z], [-dw, dh, z], [dw, dh, z], [dw, 0, z]]); if (q) { ctx.fillStyle = R.light; fillPoly(ctx, q); }
  }
  ctx.restore();
  // the floor polygon (screen) for clipping reflections and floor marks
  return v.poly([[-X, 0, -Z], [X, 0, -Z], [X, 0, Z], [-X, 0, Z]]);
}

// the floor itself (plain view): base tone with a soft pool of light toward the doorway
export function floor(ctx, v, R = ROOM) {
  const s = v.poly([[-R.x, 0, -R.z], [R.x, 0, -R.z], [R.x, 0, R.z], [-R.x, 0, R.z]]);
  if (!s) return null;
  ctx.save(); ctx.fillStyle = R.floor; fillPoly(ctx, s);
  // light pool: a big soft ellipse on the floor in front of the doorway, and a darker band along the walls
  const c = v.p([0, 0, -R.z * .35]), e = v.p([R.x * .9, 0, -R.z * .35]);
  if (c && e) {
    const rad = Math.max(40, Math.hypot(e[0] - c[0], e[1] - c[1]));
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rad);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); tracePoly(ctx, s); ctx.clip(); ctx.translate(c[0], c[1]); ctx.scale(1, clamp(Math.abs(v.f[1]) * 1.6 + .15, .15, 1)); ctx.translate(-c[0], -c[1]); ctx.fillStyle = g; ctx.fillRect(c[0] - rad, c[1] - rad, rad * 2, rad * 2); ctx.restore();
  }
  ctx.restore();
  return s;
}

// a screen-space gradient that runs from the floor horizon (reflections strongest, Fresnel) to the floor under the camera
export function fresnel(ctx, v, near = .3, far = 1) {
  const fwd = v3.norm([v.f[0], 0, v.f[2]]);
  const a = v.p(v3.add([v.pos[0], 0, v.pos[2]], v3.mul(fwd, 40))), b = v.p(v3.add([v.pos[0], 0, v.pos[2]], v3.mul(fwd, Math.max(1.2, v.pos[1] * .6))));
  if (!a || !b) return `rgba(0,0,0,${far})`;
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, `rgba(0,0,0,${far})`); g.addColorStop(1, `rgba(0,0,0,${near})`);
  return g;
}
export { tracePoly };
