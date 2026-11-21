// printmade-scene · figure.js — the style's people: tall and thin, small long heads on long necks, narrow shoulders in
// a flat jacket, stick legs in speckled trousers, a flush on the cheeks, dot eyes under heavy lids. Flat shapes with a
// thin key line and a grain that rides on the body.
// The rig is a 3D stick figure seen through the folded view: a body frame (forward, right, up) at the pelvis, yaw 0 faces
// the viewer and +π/2 faces screen right (so a figure facing right shows its RIGHT side, near limbs on the right), legs
// solved by two-bone IK to planted ankles (knees point forward → shins fold back), arms by FK angles or IK reaches
// (elbows bend forward only), a head that turns on the neck. drawFigure returns the joints so the checks can read them.
import * as P from './print.js';

export const KD = .5;                       // one px of floor depth (toward the viewer) is KD px down the screen
const D = Math.PI / 180;
/** Joint limits in degrees. The checks fail any frame outside them. */
export const JOINTS = { knee: [0, 150], hip: [-45, 110], elbow: [0, 150], shoulder: [-70, 175], neckYaw: [-90, 90], neckPitch: [-45, 45], lean: [-30, 35] };

const DEF = {
  name: 'figure', h: 330, mass: 1, headScale: 1, skin: '#ebc7ab', blush: '#d9776f', lips: '#b7524c', eye: '#231b18',
  hair: { style: 'short', color: '#5a4032' }, glasses: false,
  top: { kind: 'jacket', color: '#2b2523', inner: '#cfd8db', pattern: 'check', length: .06 },
  bottom: { kind: 'pants', color: '#3e5a79', pattern: 'speckle' }, legs: null, shoes: '#6b3b2a',
};
export class Figure {
  constructor(o = {}) { this.o = { ...DEF, ...o, hair: { ...DEF.hair, ...(o.hair || {}) }, top: { ...DEF.top, ...(o.top || {}) }, bottom: { ...DEF.bottom, ...(o.bottom || {}) } }; this.name = this.o.name; this.h = this.o.h; this.mass = this.o.mass; }
  geom() { const h = this.h, hs = this.o.headScale ?? 1; return { thigh: .262 * h, shin: .25 * h, ankle: .028 * h, hipW: .1 * h, shW: .2 * h, torso: .3 * h, sideW: .11 * h, neck: .052 * h, headRx: .052 * h * hs, headRy: .083 * h * hs, upper: .175 * h, fore: .165 * h, hand: .03 * h, foot: .075 * h }; }
  /** standing hip height (knees a hair soft) */
  hipH() { const g = this.geom(); return g.ankle + (g.thigh + g.shin) * .985; }
}

const len = v => Math.hypot(v[0], v[1], v[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
/** two-bone IK in body space (f, l, u): root → target with lengths A, B, bending toward `hint`. Returns { mid, end, err, flex } */
function ik2(root, target, A, B, hint) {
  let v = sub(target, root), d = len(v), err = 0; const dmax = (A + B) * .9995;
  if (d > dmax) { err = d - dmax; v = mul(v, dmax / d); d = dmax; }
  d = Math.max(d, Math.abs(A - B) + 1e-3);
  const vh = norm(v), along = (A * A - B * B + d * d) / (2 * d), perp = Math.sqrt(Math.max(0, A * A - along * along));
  let n = sub(hint, mul(vh, dot(hint, vh))); if (len(n) < 1e-6) n = [0, 0, 1]; n = norm(n);
  const mid = add(root, add(mul(vh, along), mul(n, perp))), end = add(root, v);
  const flex = Math.PI - Math.acos(P.clamp((A * A + B * B - d * d) / (2 * A * B), -1, 1));
  return { mid, end, err, flex };
}

/**
 * drawFigure(ctx, F, pose, opt) — draw one figure. pose:
 *   X, G           pelvis ground point on screen (G = the floor line it stands on)
 *   yaw            body facing (0 viewer · +π/2 screen right · −π/2 screen left · π away)
 *   drop           pelvis lowered by px (crouch, sit); lean (rad, forward +); twist (rad, chest vs pelvis, small)
 *   feet           { L: { X, G, lift, yaw }, R: … } ankle targets on the floor (screen); lift in px
 *   arms           { L: { sh, ab, el }, R: … } radians (sh forward swing from hanging, ab outward, el elbow flex ≥ 0)
 *   reach          { L | R: [f, l, u] } hand target relative to that shoulder in body px (forward, right, up) → IK
 *   head           { yaw, pitch } relative to the chest; blink 0–1; breath −1…1; flow (px, hair / hem lag)
 *   hold           { L | R: (ctx, hand, F, pose, J) => … } a prop drawn in that hand (J.screen.hands has both hands)
 * opt.only: 'shadow' draws just the ground shadow. Returns the joints (for checks) in screen space plus the angles.
 */
export function drawFigure(ctx, F, p, opt = {}) {
  const o = F.o, g = F.geom(), y = p.yaw ?? 0, sy = Math.sin(y), cy = Math.cos(y);
  const proj = q => [p.X + q[0] * sy - q[1] * cy, p.G + (q[0] * cy + q[1] * sy) * KD - q[2]];
  const depth = q => q[0] * cy + q[1] * sy;
  const toBody = (X, G, u = 0) => { const dX = X - p.X, dD = (G - p.G) / KD; return [dX * sy + dD * cy, -dX * cy + dD * sy, u]; };
  const feet = p.feet ?? { L: { X: p.X - g.hipW / 2 * -cy, G: p.G }, R: { X: p.X + g.hipW / 2 * -cy, G: p.G } };
  // pelvis height: standing height minus drop, never more than the legs can reach
  const fb = { L: toBody(feet.L.X, feet.L.G, g.ankle + (feet.L.lift || 0)), R: toBody(feet.R.X, feet.R.G, g.ankle + (feet.R.lift || 0)) };
  let hipH = F.hipH() - (p.drop || 0);
  for (const s of ['L', 'R']) { const hl = s === 'R' ? g.hipW / 2 : -g.hipW / 2, q = fb[s], dx = q[0], dl = q[1] - hl, reach = (g.thigh + g.shin) * .992; const need = Math.sqrt(Math.max(0, reach * reach - dx * dx - dl * dl)) + q[2]; hipH = Math.min(hipH, need); }
  const lean = p.lean || 0, br = p.breath || 0;
  const pelvis = [0, 0, hipH], chest = [g.torso * Math.sin(lean), 0, hipH + g.torso * Math.cos(lean) + br * 1.4];
  const J = { pelvis: proj(pelvis), chest: proj(chest), legs: {}, arms: {}, angles: { knee: {}, hip: {}, elbow: {}, shoulder: {} }, err: {} };
  // legs
  for (const s of ['L', 'R']) {
    const hip = [0, s === 'R' ? g.hipW / 2 : -g.hipW / 2, hipH], r = ik2(hip, fb[s], g.thigh, g.shin, [1, 0, 0]);
    const th = sub(r.mid, hip);
    J.legs[s] = { hip, knee: r.mid, ankle: r.end, err: r.err, depth: depth(add(hip, r.end)) / 2 + (s === 'R' ? 1 : -1) * sy * 2 };
    J.angles.knee[s] = r.flex / D; J.angles.hip[s] = Math.atan2(th[0], -th[2]) / D; J.err[s] = r.err;
  }
  // arms
  for (const s of ['L', 'R']) {
    const side = s === 'R' ? 1 : -1, sh = add(chest, [0, side * g.shW / 2 * .86, -6]);
    let el, hand, flex, shAng;
    if (p.reach?.[s]) {
      const tgt = add(sh, p.reach[s]), r = ik2(sh, tgt, g.upper, g.fore, [-.5, side * .25, -1]);
      el = r.mid; hand = r.end; flex = r.flex; const u = sub(el, sh); shAng = Math.atan2(u[0], -u[2]); J.err['hand' + s] = r.err;
    } else {
      const a = p.arms?.[s] ?? {}, A = a.sh ?? 0, ab = a.ab ?? .07, E = Math.max(0, a.el ?? .18);
      const d1 = [Math.sin(A) * Math.cos(ab), side * Math.sin(ab), -Math.cos(A) * Math.cos(ab)];
      el = add(sh, mul(d1, g.upper)); const d2 = [Math.sin(A + E) * Math.cos(ab * .6), side * Math.sin(ab * .6), -Math.cos(A + E) * Math.cos(ab * .6)];
      hand = add(el, mul(d2, g.fore)); flex = E; shAng = A;
    }
    J.arms[s] = { sh, el, hand, depth: depth(add(sh, hand)) / 2 + side * sy * 3 };
    J.angles.elbow[s] = flex / D; J.angles.shoulder[s] = shAng / D;
  }
  // neck and head
  const hy = P.clamp(p.head?.yaw ?? 0, -Math.PI / 2, Math.PI / 2), hp = P.clamp(p.head?.pitch ?? 0, -Math.PI / 4, Math.PI / 4);
  const neckTop = add(chest, [g.neck * Math.sin(lean * .6 + hp * .5), 0, g.neck * Math.cos(lean * .6 + hp * .5)]);
  const headC = add(neckTop, [g.headRy * .12 * Math.sin(hp + lean * .5), 0, g.headRy * .82]);
  J.head = { c: proj(headC), yaw: y + hy, neckYaw: hy / D, neckPitch: hp / D };
  J.angles.lean = lean / D;
  J.screen = { feet: { L: proj(J.legs.L.ankle), R: proj(J.legs.R.ankle) }, hands: { L: proj(J.arms.L.hand), R: proj(J.arms.R.hand) }, head: J.head.c, pelvis: J.pelvis };
  if (opt.measure) return J;

  // ── ground shadow ──
  const fl = proj([J.legs.L.ankle[0], J.legs.L.ankle[1], 0]), fr = proj([J.legs.R.ankle[0], J.legs.R.ankle[1], 0]);
  if (opt.shadow !== false) {
    const sx = (fl[0] + fr[0]) / 2, sw = Math.abs(fl[0] - fr[0]) / 2 + g.foot * .9, lifted = Math.max(feet.L.lift || 0, feet.R.lift || 0) * .5;
    P.blot(ctx, sx, Math.max(fl[1], fr[1]) + 2, sw + 8 - lifted * .1, 7, '#1d1715', { alpha: .5, seed: 3, amp: 2 });
  }
  if (opt.only === 'shadow') return J;

  const ink = 'rgba(28,22,20,.62)', key = (pts, fill, lw = 1.3) => { P.path(ctx, pts); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); };
  const limb = (a, b, wa, wb, fill) => { const A = proj(a), B = proj(b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; key([[A[0] + nx * wa, A[1] + ny * wa], [B[0] + nx * wb, B[1] + ny * wb], [B[0] - nx * wb, B[1] - ny * wb], [A[0] - nx * wa, A[1] - ny * wa]], fill); return [A, B]; };
  const disc = (q, r, fill, line = false) => { const c = proj(q); ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, P.TAU); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); } };
  const top = o.top, bot = o.bottom, legCol = bot.kind === 'pants' ? bot.color : (o.legs ?? o.skin), h = g.h ?? F.h;

  const drawLeg = s => {
    const L = J.legs[s], shin = bot.kind === 'pants' ? bot.color : (o.legs ?? o.skin), thighC = bot.kind === 'skirt' ? (o.legs ?? o.skin) : bot.kind === 'shorts' ? bot.color : bot.color;
    limb(L.hip, L.knee, .034 * F.h, .024 * F.h, thighC); disc(L.knee, .024 * F.h - .5, thighC);
    if (bot.kind === 'shorts') { const mid = add(L.hip, mul(sub(L.knee, L.hip), .55)); limb(mid, L.knee, .026 * F.h, .022 * F.h, o.legs ?? o.skin); }
    limb(L.knee, L.ankle, .023 * F.h, .016 * F.h, bot.kind === 'pants' ? shin : (o.legs ?? o.skin));
    // shoe: heel behind the ankle, toe in front, along the foot's own yaw (planted feet keep theirs)
    const fy = (feet[s].yaw ?? y) - y, fd = [Math.cos(fy), Math.sin(fy) * -1, 0], a = [L.ankle[0], L.ankle[1], L.ankle[2] - g.ankle * .6];
    const heel = add(a, mul(fd, -g.foot * .28)), toe = add(a, mul(fd, g.foot * .72)), H = proj(heel), T = proj(toe), up = g.ankle * 1.1;
    const side = Math.abs(sy) > .35 || true, thick = .5 + .5 * Math.abs(Math.sin(y + fy));
    key([[H[0], H[1] + 2], [H[0], H[1] - up], [P.lerp(H[0], T[0], .6), (H[1] + T[1]) / 2 - up * .9 * thick], [T[0] + (T[0] - H[0] > 0 ? 3 : T[0] - H[0] < 0 ? -3 : 0), T[1] - 1], [T[0], T[1] + 3]], o.shoes, 1.1);
    void side;
  };
  const drawArm = s => {
    const A = J.arms[s], c = top.kind === 'dress' || top.kind === 'apron' ? (top.sleeve ?? top.color) : top.color;
    if (top.sleeves === 'short') { const mid = add(A.sh, mul(sub(A.el, A.sh), .5)); limb(A.sh, mid, .026 * F.h, .024 * F.h, c); limb(mid, A.el, .019 * F.h, .016 * F.h, o.skin); }
    else { limb(A.sh, A.el, .027 * F.h, .022 * F.h, c); disc(A.el, .021 * F.h, c); }
    limb(A.el, A.hand, top.sleeves === 'short' ? .016 * F.h : .021 * F.h, .017 * F.h, top.sleeves === 'short' ? o.skin : c);
    const hd = proj(A.hand), ea = proj(A.el), ang = Math.atan2(hd[1] - ea[1], hd[0] - ea[0]);
    ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(ang); P.path(ctx, P.ellipsePts(g.hand * .55, 0, g.hand * .75, g.hand * .45, 14)); ctx.fillStyle = o.skin; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (p.hold?.[s]) p.hold[s](ctx, { x: hd[0], y: hd[1], a: ang }, F, p, J);
  };
  const drawTorso = () => {
    const P0 = proj(pelvis), P1 = proj(chest), dx = P1[0] - P0[0], dy = P1[1] - P0[1], Lh = Math.hypot(dx, dy) || 1, nx = -dy / Lh, ny = dx / Lh;
    const ac = Math.abs(cy), as = Math.abs(sy), wHip = (g.hipW * 1.35 * ac + g.sideW * 1.05 * as) / 2 + 2, wSh = (g.shW * ac + g.sideW * 1.1 * as) / 2 + 2;
    const hem = (top.length ?? .06) * F.h, flow = P.clamp(p.flow || 0, -14, 14);
    // skirt / dress below the hips
    if (bot.kind === 'skirt' || top.kind === 'dress') {
      const sk = top.kind === 'dress' ? top.color : bot.color, kl = (top.kind === 'dress' ? (top.skirt ?? .2) : (bot.length ?? .2)) * F.h, wb = wHip * 1.45 + 6;
      key([[P0[0] - nx * wHip, P0[1] - ny * wHip], [P0[0] + nx * wHip, P0[1] + ny * wHip], [P0[0] + wb + flow, P0[1] + kl], [P0[0] - wb + flow * 1.3, P0[1] + kl]], sk);
      if ((top.kind === 'dress' ? top.pattern : bot.pattern) === 'stripe') { ctx.strokeStyle = P.alpha(P.shade(sk, -.35), .6); ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(P0[0] + k * wHip * .4, P0[1]); ctx.lineTo(P0[0] + k * wb * .4 + flow, P0[1] + kl); ctx.stroke(); } }
    } else if (bot.kind === 'pants' || bot.kind === 'shorts') { const c = bot.color; key([[P0[0] - nx * wHip, P0[1] - ny * wHip - 4], [P0[0] + nx * wHip, P0[1] + ny * wHip - 4], [P0[0] + nx * wHip * .9, P0[1] + .05 * F.h], [P0[0] - nx * wHip * .9, P0[1] + .05 * F.h]], c); }
    // the jacket / top body: sloped shoulders, a slight waist, a hem that flares and trails (flow)
    const tc = top.color, at = (k, w, dx = 0) => [P.lerp(P0[0], P1[0], k) + nx * w + dx, P.lerp(P0[1], P1[1], k) + ny * w], wN = wSh * .42;
    const pts = top.kind === 'dress'
      ? [at(1.06, -wN), at(1.06, wN), at(.93, wSh), at(.45, wHip * .9), at(0, wHip), at(0, -wHip), at(.45, -wHip * .9), at(.93, -wSh)]
      : [at(1.06, -wN), at(1.06, wN), at(.94, wSh), at(.55, wSh * .9), at(.25, wHip * 1.02), [P0[0] + nx * (wHip + 4) + flow * .4, P0[1] + ny * wHip + hem], [P0[0] - nx * (wHip + 4) + flow * .7, P0[1] - ny * wHip + hem], at(.25, -wHip * 1.02), at(.55, -wSh * .9), at(.94, -wSh)];
    P.path(ctx, pts); ctx.fillStyle = tc; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.stroke();
    // shoulders round off
    // the front: an open jacket shows the shirt on the facing side (never on the back)
    if (cy > -.12 && (top.kind === 'jacket' || top.kind === 'coat')) {
      const off = g.sideW / 2 * sy * .9, w = Math.max(2, .042 * F.h * Math.max(cy, .18)), a0 = [P1[0] + off, P1[1] + 4], a1 = [P0[0] + off * 1.05, P0[1] + hem * .4];
      key([[a0[0] - w, a0[1]], [a0[0] + w, a0[1]], [a1[0] + w * .4, a1[1]], [a1[0] - w * .4, a1[1]]], top.inner ?? '#d8dcd8', 1);
      if (top.pattern === 'check') { ctx.save(); P.path(ctx, [[a0[0] - w, a0[1]], [a0[0] + w, a0[1]], [a1[0] + w * .4, a1[1]], [a1[0] - w * .4, a1[1]]]); ctx.clip(); ctx.strokeStyle = P.alpha(P.shade(top.inner ?? '#d8dcd8', -.45), .7); ctx.lineWidth = 1; for (let k = 0; k < 40; k += 4) { ctx.beginPath(); ctx.moveTo(a0[0] - w, a0[1] + k); ctx.lineTo(a0[0] + w, a0[1] + k); ctx.stroke(); } for (let k = -w; k < w; k += 4) { ctx.beginPath(); ctx.moveTo(a0[0] + k, a0[1]); ctx.lineTo(a1[0] + k * .4, a1[1]); ctx.stroke(); } ctx.restore(); }
      if (Math.abs(sy) < .9) { ctx.strokeStyle = P.alpha(P.shade(tc, .25), .8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a0[0] - w - 2, a0[1]); ctx.lineTo(a0[0] - w * .4, a0[1] + .06 * F.h); ctx.moveTo(a0[0] + w + 2, a0[1]); ctx.lineTo(a0[0] + w * .4, a0[1] + .06 * F.h); ctx.stroke(); }
    }
    if (top.kind === 'apron' && cy > -.1) { const off = g.sideW / 2 * sy * .9, w = .05 * F.h * Math.max(cy, .3); key([[P1[0] + off - w, P1[1] + 10], [P1[0] + off + w, P1[1] + 10], [P0[0] + off * 1.1 + w * 1.6, P0[1] + .18 * F.h], [P0[0] + off * 1.1 - w * 1.6, P0[1] + .18 * F.h]], top.apron ?? '#e8e2d2', 1); }
    if (top.pattern === 'stripe' && top.kind !== 'jacket') { ctx.save(); P.path(ctx, pts); ctx.clip(); ctx.strokeStyle = P.alpha(P.shade(tc, -.3), .6); ctx.lineWidth = 2; for (let k = -40; k < 80; k += 7) { ctx.beginPath(); ctx.moveTo(P1[0] - 60, P1[1] + k); ctx.lineTo(P1[0] + 60, P1[1] + k + 6); ctx.stroke(); } ctx.restore(); }
    // neck
    limb(add(chest, [0, 0, -4]), neckTop, .016 * F.h, .014 * F.h, o.skin);
  };
  const drawLongHairBack = () => {
    if (o.hair.style !== 'long') return; const c = proj(headC), w = g.headRx * 1.15, L = (o.hair.len ?? .2) * F.h, fx = P.clamp(p.flow || 0, -10, 10);
    key([[c[0] - w - 2, c[1]], [c[0] + w + 2, c[1]], [c[0] + w * 1.1 - fx, c[1] + L], [c[0] - w * 1.1 - fx * 1.3, c[1] + L]], o.hair.color, 1);
  };
  const drawHead = () => {
    const c = proj(headC), rx = g.headRx, ry = g.headRy, fy = y + hy;
    const egg = (qx, qy) => [c[0] + qx * rx * (1 - .24 * Math.max(0, -qy)), c[1] - qy * ry];
    const sil = []; for (let i = 0; i < 40; i++) { const a = i / 40 * P.TAU; sil.push(egg(Math.cos(a), Math.sin(a))); }
    const hs = o.hair.style;
    key(sil, hs === 'bald' ? o.skin : o.hair.color, 1.2);
    // the face is a cap of the head around the facing direction, pushed to the rim where it turns away
    // the face patch: wide to the sides (so a profile shows cheek and eye), a hairline above, down past the chin
    const cap = { short: [-.2, 1.56, .78, 1.5], bob: [-.25, 1.3, .62, 1.4], long: [-.22, 1.52, .7, 1.5], bun: [-.2, 1.56, .74, 1.5], bald: [-.1, 1.8, 1.8, 1.8] }[hs] || [-.2, 1.56, .78, 1.5];
    const [lat0c, aH, aT, aB] = o.hair.cap ?? cap, lat0 = lat0c - hp * .5;
    const cdir = [Math.sin(fy) * Math.cos(lat0), Math.sin(lat0), Math.cos(fy) * Math.cos(lat0)];
    const sd = norm([cdir[2], 0, -cdir[0]]), u2 = [cdir[1] * sd[2] - cdir[2] * sd[1], cdir[2] * sd[0] - cdir[0] * sd[2], cdir[0] * sd[1] - cdir[1] * sd[0]];
    const upv = u2[1] < 0 ? mul(u2, -1) : u2, face = [];
    for (let i = 0; i < 64; i++) { const t = i / 64 * P.TAU, av = Math.sin(t) > 0 ? aT : aB, al = Math.hypot(aH * Math.cos(t), av * Math.sin(t)) / Math.hypot(Math.cos(t), Math.sin(t)); let q = add(mul(cdir, Math.cos(Math.min(al, 3))), mul(add(mul(sd, Math.cos(t)), mul(upv, Math.sin(t))), Math.sin(Math.min(al, 3)))); if (q[2] < 0) { const l = Math.hypot(q[0], q[1]) || 1; q = [q[0] / l, q[1] / l, 0]; } face.push(egg(q[0], q[1])); }
    if (Math.cos(fy) > -.55 || hs === 'bald') { ctx.save(); P.path(ctx, sil); ctx.clip(); P.path(ctx, face); ctx.fillStyle = o.skin; ctx.fill(); ctx.restore(); }
    // the near ear, over the hair, where the side of the head turns to us
    for (const side of [1, -1]) { const a = fy + side * Math.PI / 2, ex = Math.sin(a), ez = Math.cos(a); if (ez > .25) { const e = egg(ex * .12, -.1); ctx.beginPath(); ctx.ellipse(e[0], e[1], rx * .17 * ez, ry * .2, 0, 0, P.TAU); ctx.fillStyle = P.shade(o.skin, -.05); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke(); } }
    // features: placed on the sphere, shown when they face us
    const at = (lon, lat, k = 1) => { const a = fy + lon, x = Math.sin(a) * Math.cos(lat) * k, z = Math.cos(a) * Math.cos(lat); return { p: egg(x, Math.sin(lat - hp * .5)), z, w: Math.max(0, z) }; };
    const bl = P.clamp(p.blink || 0);
    for (const side of [-1, 1]) {   // side −1 = the figure's right eye (toward its right vector)
      const e = at(side * .42, .02); if (e.z > .12) {
        const ew = rx * .2 * (.35 + .65 * e.w), eh = Math.max(.6, ry * .07 * (1 - bl));
        ctx.fillStyle = o.eye; ctx.beginPath(); ctx.ellipse(e.p[0], e.p[1], ew * .55, eh, 0, 0, P.TAU); ctx.fill();
        ctx.strokeStyle = o.eye; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(e.p[0] - ew, e.p[1] - eh * .7); ctx.quadraticCurveTo(e.p[0], e.p[1] - eh * 1.6, e.p[0] + ew, e.p[1] - eh * .5); ctx.stroke();
        const b = at(side * .42, .2); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(b.p[0] - ew * 1.1, b.p[1] + 1); ctx.lineTo(b.p[0] + ew * 1.1, b.p[1] - 1); ctx.stroke();
        const ch = at(side * .58, -.32); ctx.fillStyle = P.alpha(o.blush, .55 * e.w + .1); ctx.beginPath(); ctx.ellipse(ch.p[0], ch.p[1], rx * .24 * (.4 + .6 * e.w), ry * .12, 0, 0, P.TAU); ctx.fill();
        if (o.glasses) { ctx.strokeStyle = P.alpha(o.glasses === true ? '#b35a52' : o.glasses, .9); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(e.p[0], e.p[1], rx * .28 * (.3 + .7 * e.w), ry * .17, 0, 0, P.TAU); ctx.stroke(); }
      }
    }
    const n0 = at(0, .05), n1 = at(0, -.38, 1.1);
    if (n1.z > -.1) { ctx.strokeStyle = P.alpha(P.shade(o.skin, -.45), .9); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(n0.p[0], n0.p[1]); ctx.lineTo(n1.p[0] + Math.sin(fy) * rx * .12, n1.p[1]); ctx.lineTo(n1.p[0] - Math.sin(fy) * rx * .02, n1.p[1] + 2); ctx.stroke(); }
    const m = at(0, -.6); if (m.z > .05) { ctx.fillStyle = o.lips; ctx.fillRect(m.p[0] - rx * .16 * (.4 + .6 * m.w), m.p[1] - 1, rx * .32 * (.4 + .6 * m.w), 2.4); }
    if (o.mustache) { const ms = at(0, -.5); if (ms.z > 0) { ctx.fillStyle = o.hair.color; ctx.beginPath(); ctx.ellipse(ms.p[0], ms.p[1], rx * .3 * (.4 + .6 * ms.w), 2.6, 0, 0, P.TAU); ctx.fill(); } }
    // hair volume on top / bun / bob sides, drawn over the cap edge
    if (hs !== 'bald') {
      ctx.save(); P.path(ctx, sil); ctx.clip(); ctx.strokeStyle = P.alpha(P.shade(o.hair.color, -.35), .7); ctx.lineWidth = 1.1;
      for (let k = 0; k < 9; k++) { const a = -2.6 + k * .26, pt = egg(Math.cos(a) * .95, -Math.sin(a) * .95); ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.lineTo(pt[0] + Math.cos(a) * 6, pt[1] + 8); ctx.stroke(); }
      ctx.restore();
      if (o.hair.wave) { ctx.fillStyle = o.hair.color; for (let k = 0; k < 7; k++) { const a = Math.PI + .2 + k * .4, pt = egg(Math.cos(a) * 1.02, -Math.sin(a) * 1.02); ctx.beginPath(); ctx.arc(pt[0], pt[1], rx * .32, 0, P.TAU); ctx.fill(); } }
      if (hs === 'bun') { const bk = at(Math.PI, .55), bc = egg(Math.sin(fy + Math.PI) * .7, .82); ctx.beginPath(); ctx.arc(bc[0], bc[1] - 4, rx * .45, 0, P.TAU); ctx.fillStyle = o.hair.color; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke(); void bk; }
    }
  };

  // draw order: far arm (if behind the body), long hair behind, legs far → near, torso, head, the rest of the arms by depth
  const arms = ['L', 'R'].sort((a, b) => J.arms[a].depth - J.arms[b].depth), legs = ['L', 'R'].sort((a, b) => J.legs[a].depth - J.legs[b].depth);
  const behind = arms.filter(s => J.arms[s].depth < -1.5), front = arms.filter(s => J.arms[s].depth >= -1.5);
  if (cy >= 0) drawLongHairBack();
  behind.forEach(drawArm); legs.forEach(drawLeg); drawTorso(); if (cy < 0) drawLongHairBack(); drawHead(); front.forEach(drawArm);
  return J;
}
