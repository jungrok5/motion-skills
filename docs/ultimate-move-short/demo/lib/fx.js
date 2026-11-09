// ultimate-move-short · fx.js — the battle-animation effects: slash arcs (a wide black brush crescent with a fine accent
// line inside), smears of the blade's own path, speed lines (focus lines and parallel motion lines), black shards that
// tumble in 3D, cracks across space, the accent cut line, ink vortex, and the painters for impact frames.
//
//   slash(ctx, v, { c, r, a0, a1, axis, w, head, fade, red, seed })    an arc in 3D (c centre, axis = plane normal)
//   smear(ctx, v, H, t0, t1, t, { w, red, part, seed, fade })        the blade tip's path from t0 to min(t, t1)
//   focusLines(ctx, W, H, { x, y, n, r0, col, seed, t, a })           radial anime speed lines toward a point
//   motionLines(ctx, W, H, { angle, n, col, seed, t, a, band })       parallel streaks
//   shardList(seed, n, o) / shards(ctx, v, list, t, o)                black quads tumbling (positions are functions of t)
//   spaceCrack(ctx, x, y, len, angle, { seed, grow, col, w, branch }) a crack drawn on the frame (sky, eyes, glass)
//   cutLine(ctx, a, b, { w, col, glow, core })                         the accent line, glowing
//   burst(ctx, W, H, { x, y, col, bg, n, seed })                       a red impact frame with black radial spikes
import { clamp, lerp, hash, noise2, sn, rgba, mix, v3, TAU, ease } from './core.js';
import { brush, brush3, INK } from './ink.js';
import { smoothOpen, smoothClosed } from './cam.js';

// basis for a plane with normal `axis`
function basis(axis) { const n = v3.norm(axis), t = Math.abs(n[1]) > .9 ? [1, 0, 0] : [0, 1, 0], a = v3.norm(v3.cross(t, n)), b = v3.cross(n, a); return { n, a, b }; }

export function arcPts(c, r, a0, a1, axis, n = 28, wob = 0, seed = 1) {
  const B = basis(axis), out = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = r * (1 + wob * sn(i * .4, seed)); out.push(v3.add(c, v3.add(v3.mul(B.a, Math.cos(a) * rr), v3.mul(B.b, Math.sin(a) * rr)))); }
  return out;
}
// a slash: brush crescent along an arc; head 0…1 draws it on, fade 0…1 dries it away
export function slash(ctx, v, o) {
  const pts = arcPts(o.c, o.r, o.a0, o.a1, o.axis || [0, 0, 1], 32, o.wob ?? .03, o.seed || 1);
  const n = pts.length, w = o.w ?? .25, ws = pts.map((_, i) => w * Math.sin(Math.PI * Math.min(1, (i / (n - 1)) * 1.05)) ** .6);
  brush3(ctx, v, pts, ws, { seed: o.seed || 1, head: o.head ?? 1, tail0: o.tail0 ?? 0, fade: o.fade ?? 0, dry: o.dry ?? .4, red: o.red, splatter: o.splatter ?? .7, alpha: o.alpha ?? 1, core: o.core ?? .5, col: o.col });
}
// the blade's own path as a smear (the stroke is exactly where the tip went)
export function smear(ctx, v, H, t0, t1, t, o = {}) {
  const te = Math.min(t, t1); if (te <= t0) return;
  const n = o.n || 22, pts = [], inner = [];
  for (let i = 0; i <= n; i++) { const tt = lerp(t0, te, i / n), r = H.rig(tt); pts.push(o.part === 'mid' ? v3.lerp(r.blade.guard, r.blade.tip, .6) : r.blade.tip); inner.push(r.blade.guard); }
  // width = the blade's swept band, so the smear is a crescent between guard and tip paths
  const ws = pts.map((p, i) => (o.w ?? .35) * (.35 + .65 * Math.sin(Math.PI * i / n) ** .5));
  const mid = pts.map((p, i) => v3.lerp(p, inner[i], o.inset ?? .22));
  brush3(ctx, v, mid, ws, { seed: o.seed || 7, dry: o.dry ?? .45, red: o.red, splatter: .6, fade: o.fade ?? 0, alpha: o.alpha ?? 1, core: .5, col: o.col });
}

// radial focus lines (集中線): thin white or black wedges converging on (x, y), leaving a clear centre
export function focusLines(ctx, W, H, o = {}) {
  const n = o.n || 90, x = o.x ?? W / 2, y = o.y ?? H / 2, r0 = o.r0 ?? H * .28, col = o.col || '#ffffff', seed = o.seed || 1, f = Math.floor((o.t || 0) * 24);
  ctx.save(); ctx.fillStyle = col; ctx.globalAlpha *= o.a ?? 1;
  const R = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    const a = (i + hash(seed + f, i)) / n * TAU, rs = r0 * (1 + hash(seed + f, i + 99) * .9), w = (o.w ?? .012) * (.3 + hash(seed + f, i + 199)) ;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rs, y + Math.sin(a) * rs);
    ctx.lineTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R); ctx.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// parallel motion lines: streaks along `angle`, in a band (0…1 of the frame height around `y`), flickering per frame
export function motionLines(ctx, W, H, o = {}) {
  const n = o.n || 40, ang = o.angle || 0, col = o.col || '#ffffff', seed = o.seed || 2, f = Math.floor((o.t || 0) * 24), c = Math.cos(ang), s = Math.sin(ang);
  ctx.save(); ctx.globalAlpha *= o.a ?? 1; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const yc = o.y ?? H / 2, band = (o.band ?? 1) * H;
  for (let i = 0; i < n; i++) {
    const h = k => hash(seed * 7 + f, i * 13 + k), off = (h(1) - .5) * band, len = W * (.15 + h(2) * .5), x0 = h(3) * W * 1.4 - W * .2;
    const px = W / 2 - s * off, py = yc + c * off, ax = x0 - W / 2;
    ctx.lineWidth = (o.w ?? 2) * (.3 + h(4) * 1.4); ctx.globalAlpha = (o.a ?? 1) * (.25 + h(5) * .75);
    ctx.beginPath(); ctx.moveTo(px + c * ax, py + s * ax); ctx.lineTo(px + c * (ax + len), py + s * (ax + len)); ctx.stroke();
  }
  ctx.restore();
}

// shards: black (or white-faced) quads in 3D, each a function of t: born at tb at p0, flying with v, tumbling, optional
// attractor (they fly INTO a point after `pull.t`), optional freeze window (hang in the air)
export function shardList(seed, n, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = k => hash(seed * 97 + i, k);
    const c = o.center || [0, 1, 0], R = o.radius ?? 3;
    const dirv = v3.norm([(h(1) - .5) * 2, (h(2) - .3) * (o.flat ? .4 : 1.6), (h(3) - .5) * 2]);
    out.push({ c, dir: dirv, sp: (o.speed ?? 6) * (.4 + h(4)), r0: (o.r0 ?? .2) * h(5), size: (o.size ?? .18) * (.25 + h(6) * 1.1), ax: v3.norm([h(7) - .5, h(8) - .5, h(9) - .5]), spin: (o.spin ?? 4) * (h(10) - .5) * 2, tb: (o.tb ?? 0) + h(11) * (o.spread ?? 0), seed: seed * 97 + i, white: h(12) < (o.white ?? 0), ar: .5 + h(13) * .6, R, drag: o.drag ?? 2.2 });
  }
  return out;
}
// effective time: during o.freeze = [t0, t1] the shards slow to 4 % (the world holds its breath)
const warp = (t, fr) => !fr || t <= fr[0] ? t : fr[0] + (Math.min(t, fr[1]) - fr[0]) * .04 + Math.max(0, t - fr[1]);
export function shardPos(s, t, o = {}) {
  const te = warp(t, o.freeze), a = te - s.tb; if (a < 0) return null;
  const d = s.r0 + s.sp * (1 - Math.exp(-s.drag * a)) / s.drag;
  let p = v3.mad(s.c, s.dir, d);
  if (o.swirl) { const ang = o.swirl * a * (1 + hash(s.seed, 41)), q = v3.sub(p, s.c); p = v3.add(s.c, [q[0] * Math.cos(ang) - q[2] * Math.sin(ang), q[1], q[0] * Math.sin(ang) + q[2] * Math.cos(ang)]); }
  if (o.pull) { const k = ease.in(clamp((t - o.pull.t - hash(s.seed, 40) * (o.pull.spread ?? .4)) / (o.pull.d ?? .8))); if (k >= 1) return null; if (k > 0) p = v3.lerp(p, o.pull.to, k); }
  return p;
}
export function shards(ctx, v, list, t, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const items = [];
  for (const s of list) {
    const p = shardPos(s, t, o); if (!p) continue;
    const ang = s.spin * (warp(t, o.freeze) - s.tb) * (o.spinK ?? 1) + hash(s.seed, 30) * TAU, B = basis(s.ax), c = Math.cos(ang), si = Math.sin(ang);
    const e1 = v3.add(v3.mul(B.a, c), v3.mul(B.b, si)), e2 = v3.add(v3.mul(B.a, -si), v3.mul(B.b, c)), hs = s.size / 2;
    const corners = [[-1, -s.ar], [1, -s.ar * (.8 + hash(s.seed, 31) * .4)], [1, s.ar], [-1 + hash(s.seed, 32) * .4, s.ar]].map(([x, y]) => v3.add(p, v3.add(v3.mul(e1, x * hs), v3.mul(e2, y * hs))));
    const q = corners.map(cc => v.p(cc)); if (q.some(x => !x) || q[0][2] < (o.near ?? 1.5)) continue;
    items.push({ q, z: q[0][2], white: s.white, face: v3.dot(v3.cross(e1, e2), v3.sub(v.pos, p)) });
  }
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    ctx.beginPath(); ctx.moveTo(it.q[0][0], it.q[0][1]); for (const p of it.q) ctx.lineTo(p[0], p[1]); ctx.closePath();
    if (it.white) { ctx.fillStyle = it.face > 0 ? '#f6f5f2' : '#d9d8d4'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); if (o.red) { ctx.strokeStyle = o.red; ctx.lineWidth = 1; ctx.stroke(); } }
    else { ctx.fillStyle = o.col || INK; ctx.fill(); if (o.red) { ctx.save(); ctx.strokeStyle = o.red; ctx.shadowColor = o.red; ctx.shadowBlur = 6; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } }
  }
  ctx.restore();
}

// a crack across the frame: jagged, branching, growing from (x, y)
export function spaceCrack(ctx, x, y, len, angle, o = {}) {
  const seed = o.seed || 1, grow = clamp(o.grow ?? 1); if (grow <= 0) return;
  ctx.save(); ctx.strokeStyle = o.col || INK; ctx.lineCap = 'round'; ctx.lineJoin = 'miter'; ctx.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR ?? 8; }
  const walk = (px, py, a, L, w, depth, id, g) => {
    const n = Math.max(3, Math.round(L / 14)), m = Math.max(1, Math.round(n * g));
    let cx = px, cy = py; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy);
    for (let i = 1; i <= m; i++) {
      const aa = a + (hash(seed * 11 + id, i) - .5) * 1.1; cx += Math.cos(aa) * L / n; cy += Math.sin(aa) * L / n; ctx.lineTo(cx, cy);
      if (depth < (o.depth ?? 2) && hash(seed * 11 + id, i + 300) < (o.branch ?? .25)) { ctx.stroke(); walk(cx, cy, a + (hash(id, i) > .5 ? 1 : -1) * (.5 + hash(id, i + 5) * .9), L * .45, w * .6, depth + 1, id * 7 + i, g); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); }
    }
    ctx.stroke();
  };
  walk(x, y, angle, len, o.w ?? 2, 0, 1, grow);
  ctx.restore();
}

// the accent line: a hairline core, a hot white centre, a glow
export function cutLine(ctx, a, b, o = {}) {
  const col = o.col || '#e0142d', w = o.w ?? 3;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.lineCap = 'round';
  ctx.shadowColor = col; ctx.shadowBlur = o.glow ?? w * 6; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.shadowBlur = o.glow2 ?? w * 18; ctx.globalAlpha *= .5; ctx.stroke(); ctx.globalAlpha /= .5;
  ctx.shadowBlur = 0; ctx.strokeStyle = o.core || '#fff2f2'; ctx.lineWidth = Math.max(.7, w * .35); ctx.stroke();
  ctx.restore();
}

// a red impact frame: flat accent ground with black spikes bursting from a centre (the ink explosion seen as a graphic)
export function burst(ctx, W, H, o = {}) {
  const x = o.x ?? W / 2, y = o.y ?? H * .62, seed = o.seed || 3, n = o.n || 70;
  ctx.save(); ctx.fillStyle = o.bg || '#e0142d'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(x, y, 0, x, y, H * .8); g.addColorStop(0, 'rgba(255,240,240,.25)'); g.addColorStop(1, 'rgba(60,0,8,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = o.col || INK;
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i) * TAU, L = H * (.35 + hash(seed, i + 99) * .9), w = .02 + hash(seed, i + 199) * .06;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a - w) * H * .05, y + Math.sin(a - w) * H * .05); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.lineTo(x + Math.cos(a + w) * H * .05, y + Math.sin(a + w) * H * .05); ctx.fill();
  }
  const r = H * (o.core ?? .22); ctx.beginPath();
  const pts = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, rr = r * (.75 + noise2(Math.cos(a) * 2 + seed, Math.sin(a) * 2) * .5); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8]); }
  smoothClosed(ctx, pts, .4); ctx.fill();
  ctx.restore();
}

// an ink vortex: a broad black ring of brushwork around a centre, its inside pure white (a hole in the world)
export function vortex(ctx, cx, cy, r, o = {}) {
  const t = o.t || 0, seed = o.seed || 9, n = o.n || 7, sq = o.sq ?? .55;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.hole !== false) { ctx.fillStyle = o.holeCol || '#f7f6f3'; ctx.beginPath(); ctx.ellipse(cx, cy, r * .78, r * .78 * sq, 0, 0, TAU); ctx.fill(); }
  for (let k = 0; k < n; k++) {
    const rr = r * (.82 + k * .07), a0 = t * (o.spin ?? 2.2) * (1 + k * .15) + hash(seed, k) * TAU, span = 2.2 + hash(seed, k + 9) * 2.6;
    const pts = [], ws = [];
    for (let i = 0; i <= 40; i++) { const a = a0 + span * i / 40; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]); ws.push(r * (.05 + .07 * hash(seed, k + 20)) * Math.sin(Math.PI * i / 40)); }
    brush(ctx, pts, ws, { seed: seed + k, dry: .5, splatter: .5, red: o.red && k === 1 ? { col: o.red, w: .06 } : null });
  }
  ctx.restore();
}
