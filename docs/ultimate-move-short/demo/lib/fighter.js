// ultimate-move-short · fighter.js — the one fighter of a film: a 3D skeleton (two-bone IK legs and arms with fixed bone
// lengths and fixed bend directions), cloth, hair, sash and scarf that trail the motion by sampling the pose a moment
// earlier (so every frame is still a pure function of t), a sphere head with anime features placed on it, and the weapon.
// Everything is drawn as flat 2D ink shapes from projected joints — black cloth with a grey rim light on the lit edge,
// pale skin, one accent colour for the eyes and the edge of the blade.
//
//   const H = fighter(DESIGN, [ { t: 0, pose: 'ready', x: 0, z: 0, yaw: 1.57 }, { t: .4, pose: 'dash', x: 2, e: 'snap' }, … ]);
//   H.pose(t)  → every pose number at t            H.rig(t) → joints in world metres
//   H.tip(t)   → the blade tip (world)             H.limits(t) → [] or the joints out of range (check.mjs fails on these)
//   drawFighter(ctx, v, H, t, { flat, alpha, tone })   (film.js calls it through w.fighter)
//
// Pose numbers (all root-local: x = the fighter's right, y = up, z = forward; metres and radians):
//   x z y yaw      root position on the ground (y = height in the air), facing (keeps counting through spins)
//   px py pz       pelvis offset (py = pelvis height; 0.95 standing, 0.55 deep crouch)
//   hipYaw lean side twist arch   pelvis turn · torso pitch forward · sideways tilt · chest turn vs pelvis · chest pitch
//   lfx lfy lfz · rfx rfy rfz     left / right ankle targets (y = lift off the ground);  lft rft = toe turn-out
//   gx gy gz       the weapon hand (right) ·  by bp br = blade yaw (vs facing) / pitch (up +) / roll of the edge
//   both           0 = one hand, 1 = the left hand on the hilt (or on the spear shaft) ·  ls = where on the shaft the
//                  left hand holds, metres along the blade direction from the right hand (0 = the weapon's default)
//   lhx lhy lhz    the free left hand ·  lby lbp = the left blade's yaw / pitch (weapon.kind 'twin' only)
//   hy hp          head yaw (vs chest) / pitch ·  glow 0…1 = accent eyes ·  edge 0…1 = accent light along the blade
//   back           1 = this move is meant to go backwards (a slide back, a recoil) — otherwise check.mjs fails a fast
//                  move against the facing
import { clamp, lerp, keys as keyAt, v3, ik, sn, hash, rgba, mix, TAU } from './core.js';
import { hull, smoothClosed, smoothOpen } from './cam.js';

// ---------- defaults ----------
export const DESIGN = {
  build: { scale: 1, head: 1.12, shoulder: .155, hip: .095, thigh: .44, shin: .44, upper: .29, fore: .26, torso: .34, neck: .17 },
  hair: { style: 'messy', len: 1, spikes: 30, seed: 3 },      // messy · long · tied · bob · cropped
  coat: { len: .82, back: 1.25, flare: .22, rag: .7, collar: .1, open: .5, panels: 7, layers: 2 },
  sash: { col: '#f1eee8', tails: 2, len: .62, knot: .7 },       // tails: 0 = none
  scarf: null,                                                   // { len: 1.2, col: '#0d0d10', w: .16 }
  weapon: { kind: 'katana', len: .78, curve: .035, guard: 'round' },   // katana · odachi · spear · twin
  skin: '#e9e0d5', gloves: false,
  face: { brow: .8, jaw: .5, lash: 0 },                          // brow: sternness · jaw: 0 soft … 1 sharp · lash: 0…1
  ink: '#0b0b0e', cloth: '#1d1e23', rim: '#5a5c63', accent: '#e0142d',
};
export const LIGHT = v3.norm([-.55, .75, .45]);    // key light (world): from upper left, a little toward the lens

export const POSE0 = {
  x: 0, z: 0, y: 0, yaw: 0,
  px: 0, py: .95, pz: 0, hipYaw: 0, lean: .04, side: 0, twist: 0, arch: 0,
  lfx: -.12, lfy: 0, lfz: .02, rfx: .12, rfy: 0, rfz: -.02, lft: -.15, rft: .25,
  gx: .24, gy: .9, gz: .1, by: .35, bp: -1.1, br: 0, both: 0,
  lhx: -.24, lhy: .86, lhz: .04, lby: -.4, lbp: -1.1,
  hy: 0, hp: 0, glow: 0, edge: 0, back: 0, ls: 0,
};
// a pose library (root-local, facing +z, the weapon in the right hand). Start from these and override per key.
export const POSES = {
  stand: {},
  ready: { py: .74, lean: .32, hipYaw: -.25, twist: .15, lfx: -.13, lfz: .42, rfx: .2, rfz: -.42, lft: -.1, rft: .9, gx: .34, gy: .78, gz: .26, by: .95, bp: -.55, lhx: -.3, lhy: .98, lhz: -.08, hp: .12 },
  crouch: { py: .6, lean: .55, lfx: -.16, lfz: .34, rfx: .2, rfz: -.36, rfy: .02, rft: .8, gx: .36, gy: .58, gz: -.05, by: 2.3, bp: -.35, lhx: -.25, lhy: .7, lhz: .35, hp: .2 },
  dash: { py: .62, lean: .8, lfx: -.12, lfz: .58, rfx: .14, rfy: .16, rfz: -.66, rft: .3, gx: 0.23, gy: 0.7, gz: -0.25, by: 2.7, bp: -.2, lhx: -.18, lhy: .82, lhz: .5, hp: .38 },
  slashEnd: { py: .7, lean: .38, hipYaw: .35, twist: -.5, lfx: -.2, lfz: .5, rfx: .2, rfz: -.45, rft: .8, gx: -0.33, gy: 1.02, gz: 0.33, by: -1.35, bp: .05, br: 0, lhx: .05, lhy: .9, lhz: -.3, hp: .1 },
  rise: { py: .98, lean: -.08, arch: -.12, lfx: -.1, lfz: .2, rfx: .14, rfy: .4, rfz: -.15, gx: .22, gy: 1.62, gz: .3, by: .25, bp: 1.15, lhx: -.32, lhy: 1.0, lhz: -.15, hp: -.15 },
  tuck: { py: .78, lean: .3, lfx: -.1, lfy: .38, lfz: .2, rfx: .12, rfy: .28, rfz: -.08, gx: .5, gy: 1.08, gz: .05, by: 1.57, bp: 0, lhx: -.3, lhy: 1.1, lhz: .1 },
  raise: { py: .86, lean: -.15, arch: -.1, lfx: -.1, lfy: .3, lfz: .1, rfx: .12, rfy: .22, rfz: -.15, gx: .05, gy: 1.72, gz: .12, by: 0, bp: 1.25, both: 1, hp: -.2 },
  plunge: { py: .52, lean: .55, lfx: -.15, lfz: .32, rfx: .16, rfy: .02, rfz: -.42, rft: .4, gx: .02, gy: .66, gz: .36, by: 0, bp: -1.45, both: 1, hp: .25 },
  skid: { py: .6, lean: .25, hipYaw: -.4, lfx: -.18, lfz: .7, rfx: .18, rfz: -.25, rft: 1, gx: .38, gy: .66, gz: -.2, by: 2.4, bp: -.3, lhx: -.4, lhy: .55, lhz: .35, hp: .1 },
  standUp: { py: .95, lean: 0, lfx: -.13, lfz: .08, rfx: .13, rfz: -.06, gx: .04, gy: 1.12, gz: .28, by: 0, bp: 1.5, br: 1.57, lhx: -.22, lhy: .84, lhz: .05, hp: -.04 },
  guard: { py: .9, lean: .05, lfx: -.15, lfz: .12, rfx: .15, rfz: -.1, gx: .22, gy: 1.18, gz: .3, by: -1.57, bp: 0, br: 1.57, lhx: -.32, lhy: 1.2, lhz: .3, hp: .02 },
  drawBack: { py: .66, lean: .3, hipYaw: .3, twist: .75, lfx: -.2, lfz: .5, rfx: .2, rfz: -.45, rft: .9, gx: 0.25, gy: 0.94, gz: -0.29, by: 2.8, bp: -.15, both: 1, hp: .1, hy: -.5 },
  finalCut: { py: .66, lean: .38, hipYaw: -.3, twist: -.65, lfx: -.24, lfz: .55, rfx: .22, rfz: -.48, rft: .9, gx: -0.3, gy: 1.03, gz: 0.22, by: -1.62, bp: .04, lhx: .2, lhy: .95, lhz: -.35, hp: .1 },
  endStand: { py: .94, lean: .05, lfx: -.14, lfz: .06, rfx: .14, rfz: -.05, rft: .35, gx: .27, gy: .84, gz: .08, by: .5, bp: -1.15, lhx: -.25, lhy: .84, lhz: 0 },
  land: { py: .5, lean: .5, lfx: -.2, lfz: .4, rfx: .2, rfy: 0, rfz: -.3, rft: .5, gx: .45, gy: .55, gz: .1, by: 1.9, bp: -.4, lhx: -.3, lhy: .25, lhz: .3, hp: .3 },
};
// a run / sprint cycle → pose overrides for phase (cycles) — feet stay on the ground in stance
export function run(phase, o = {}) {
  const s = o.stride ?? .55, l = Math.sin(phase * TAU), c = Math.cos(phase * TAU), lift = o.lift ?? .22;
  return {
    py: (o.py ?? .82) + Math.abs(c) * .04, lean: o.lean ?? .55,
    lfx: -.11, lfz: l * s, lfy: Math.max(0, -c) * lift, rfx: .11, rfz: -l * s, rfy: Math.max(0, c) * lift,
    hipYaw: l * .18, twist: -l * .22,
  };
}

// ---------- frames ----------
function frame(yaw, pitch = 0, roll = 0) {
  let F = [Math.sin(yaw), 0, Math.cos(yaw)], R = [-Math.cos(yaw), 0, Math.sin(yaw)], U = [0, 1, 0];
  if (pitch) { const c = Math.cos(pitch), s = Math.sin(pitch), F2 = v3.sub(v3.mul(F, c), v3.mul(U, s)), U2 = v3.add(v3.mul(U, c), v3.mul(F, s)); F = F2; U = U2; }
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll), R2 = v3.add(v3.mul(R, c), v3.mul(U, s)), U2 = v3.sub(v3.mul(U, c), v3.mul(R, s)); R = R2; U = U2; }
  return { F, R, U, at: (o, x, y, z) => [o[0] + R[0] * x + U[0] * y + F[0] * z, o[1] + R[1] * x + U[1] * y + F[1] * z, o[2] + R[2] * x + U[2] * y + F[2] * z], dir: (x, y, z) => [R[0] * x + U[0] * y + F[0] * z, R[1] * x + U[1] * y + F[1] * z, R[2] * x + U[2] * y + F[2] * z] };
}
const dirOf = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];

// ---------- the fighter ----------
let UID = 0;
export function fighter(design = {}, list = [{ t: 0 }], o = {}) {
  const D = deep(DESIGN, design), B = D.build, sc = B.scale;
  // expand keys: defaults ← POSES[pose] ← key overrides; `pose` may also be an object (e.g. run(phase))
  const K = list.map(k => {
    const base = typeof k.pose === 'string' ? POSES[k.pose] || {} : (k.pose || {});
    return { ...POSE0, ...base, ...k };
  }).sort((a, b) => a.t - b.t);
  const props = Object.keys(POSE0);
  const H = { id: 'f' + (++UID), D, K, cache: new Map(), name: o.name || 'fighter' };
  H.pose = t => {
    const out = {};
    if (t <= K[0].t || K.length === 1) { for (const p of props) out[p] = K[0][p]; return out; }
    if (t >= K[K.length - 1].t) { for (const p of props) out[p] = K[K.length - 1][p]; return out; }
    let i = 0; while (t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], s = (t - a.t) / (b.t - a.t);
    if (b.e === 'snap') { for (const p of props) out[p] = a[p]; return out; }                 // hold, then cut to b
    if (b.e && b.e !== 'cubic') {
      const f = b.e === 'lin' ? s : b.e === 'in' ? s * s * s : b.e === 'out' ? 1 - (1 - s) ** 3 : b.e === 'whip' ? 1 - (1 - s) ** 5 : (s < .5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2);
      for (const p of props) out[p] = a[p] + (b[p] - a[p]) * f; return out;
    }
    for (const p of props) out[p] = keyAt(K, t, p, POSE0[p]);                                  // monotone cubic
    return out;
  };
  H.rig = t => {
    const key = Math.round(t * 1e4);
    let r = H.cache.get(key); if (r) return r;
    r = rigOf(H.pose(t), D); r.t = t;
    if (H.cache.size > 4000) H.cache.clear();
    H.cache.set(key, r); return r;
  };
  H.tip = t => H.rig(t).blade.tip;
  // the centre of an eye (sx = −1 left, 1 right) in world metres — for close-ups that draw on the eye
  H.eye = (t, sx = 1) => { const r = H.rig(t), hs = (D.build.head || 1) * sc; return r.HF.at(r.head, sx * .036 * hs, -.012 * hs, .095 * hs); };
  H.limits = t => {
    const out = limitsOf(H.pose(t), H.rig(t), D), a = H.rig(t - .05).root, b = H.rig(t).root, vel = [(b[0] - a[0]) / .05, 0, (b[2] - a[2]) / .05], sp = Math.hypot(vel[0], vel[2]);
    // faster than 25 m/s is a blink (a cut between two places), not a run
    if (sp > 3 && sp < 25 && H.pose(t).back < .5) { const P = H.pose(t), f = [Math.sin(P.yaw), 0, Math.cos(P.yaw)]; if ((f[0] * vel[0] + f[2] * vel[2]) / sp < -.6) out.push('moving backwards against the facing (set back: 1 if meant)'); }
    return out;
  };
  // world points of a body part across [t0, t1] (for smears and afterimages): part = 'tip' | 'mid' | 'chest' | 'pelvis' | 'hem'
  H.trace = (t0, t1, part = 'tip', n = 24) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * i / n, r = H.rig(t);
      pts.push(part === 'tip' ? r.blade.tip : part === 'mid' ? v3.lerp(r.blade.guard, r.blade.tip, .55) : part === 'hem' ? v3.add(r.pelvis, [0, -.55, 0]) : r[part]);
    }
    return pts;
  };
  return H;
}

function deep(a, b) { const o = { ...a }; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...b[k] } : b[k]; return o; }

// pose numbers → joints (world)
function rigOf(P, D) {
  const B = D.build, s = B.scale, root = [P.x, P.y, P.z], RF = frame(P.yaw);
  const pelvis = RF.at(root, P.px * s, P.py * s, P.pz * s);
  const PF = frame(P.yaw + P.hipYaw, P.lean * .45, P.side * .5);
  const spineTop = PF.at(pelvis, 0, B.torso * s, 0);
  const CF = frame(P.yaw + P.hipYaw + P.twist, P.lean + P.arch, P.side);
  const chest = v3.lerp(spineTop, CF.at(pelvis, 0, B.torso * s, 0), .6);
  const neck = CF.at(chest, 0, B.neck * s, -.01 * s);
  const HF = frame(P.yaw + P.hipYaw + P.twist + P.hy, P.lean * .55 + P.arch + P.hp, P.side * .6);
  const head = HF.at(neck, 0, .135 * s * (B.head || 1), .012 * s);
  const shL = CF.at(chest, -B.shoulder * s, .065 * s, -.01 * s), shR = CF.at(chest, B.shoulder * s, .065 * s, -.01 * s);
  const hipL = PF.at(pelvis, -B.hip * s, -.05 * s, 0), hipR = PF.at(pelvis, B.hip * s, -.05 * s, 0);
  // feet: ankle targets (root-local), knees bend toward the toes
  const foot = (fx, fy, fz, turn, side) => {
    const ank = RF.at(root, fx * s, (fy + .08) * s, fz * s), toeYaw = P.yaw + turn * (side < 0 ? -1 : 1) * -1;
    const fwd = [Math.sin(toeYaw), 0, Math.cos(toeYaw)], lift = clamp((fy - .02) / .25);
    const tp = lift * .9;      // a lifted foot points its toes down
    const toe = v3.add(ank, [fwd[0] * .17 * s * Math.cos(tp), (-.06 - .1 * Math.sin(tp)) * s, fwd[2] * .17 * s * Math.cos(tp)]);
    const heel = v3.add(ank, [-fwd[0] * .05 * s, -.07 * s, -fwd[2] * .05 * s]);
    return { ank, toe, heel, fwd };
  };
  const fL = foot(P.lfx, P.lfy, P.lfz, P.lft, -1), fR = foot(P.rfx, P.rfy, P.rfz, P.rft, 1);
  const kL = ik(hipL, fL.ank, B.thigh * s, B.shin * s, v3.add(fL.fwd, [0, .15, 0])), kR = ik(hipR, fR.ank, B.thigh * s, B.shin * s, v3.add(fR.fwd, [0, .15, 0]));
  // weapon(s)
  const W = D.weapon, grip = RF.at(root, P.gx * s, P.gy * s, P.gz * s);
  const bd = (() => { const d = dirOf(P.yaw + P.by, P.bp); return d; })();
  const blade = weaponOf(W, grip, bd, P.br + P.yaw, s, false);
  // the left hand: on the hilt (both), on the second blade (twin), or free
  const free = RF.at(root, P.lhx * s, P.lhy * s, P.lhz * s);
  let handL = free, blade2 = null;
  if (W.kind === 'twin') blade2 = weaponOf(W, free, dirOf(P.yaw + P.lby, P.lbp), P.yaw, s, true);
  else if (P.both > 0) handL = v3.lerp(free, v3.mad(grip, bd, (P.ls || (W.kind === 'spear' ? -.48 : -.115)) * s), clamp(P.both));
  const pole = (side, F) => v3.norm(v3.add(v3.add(v3.mul(CF.R, side * .7), v3.mul(CF.U, -.8)), v3.mul(F, -.5)));
  const aR = ik(shR, grip, B.upper * s, B.fore * s, pole(1, CF.F)), aL = ik(shL, handL, B.upper * s, B.fore * s, pole(-1, CF.F));
  return {
    P, D, root, RF, PF, CF, HF, pelvis, chest, neck, head, shL, shR, hipL, hipR,
    kneeL: kL.mid, kneeR: kR.mid, ankL: kL.end, ankR: kR.end, fL, fR,
    elbL: aL.mid, elbR: aR.mid, wrL: aL.end, wrR: aR.end, grip, handL, blade, blade2,
    reachL: v3.dist(shL, handL) - (B.upper + B.fore) * s, reachR: v3.dist(shR, grip) - (B.upper + B.fore) * s,
    legL: v3.dist(hipL, fL.ank) - (B.thigh + B.shin) * s, legR: v3.dist(hipR, fR.ank) - (B.thigh + B.shin) * s,
  };
}
// blade geometry: points from pommel to tip, with the curve toward the spine
function weaponOf(W, grip, d, roll, s, second) {
  const kind = W.kind, len = (kind === 'twin' ? (W.len2 || .5) : kind === 'odachi' ? (W.len || 1.05) : W.len) * s;
  let up = Math.abs(d[1]) > .95 ? [1, 0, 0] : [0, 1, 0];
  let side = v3.norm(v3.cross(d, up)); up = v3.cross(side, d);
  const c = Math.cos(roll), si = Math.sin(roll), edgeN = v3.add(v3.mul(up, -c), v3.mul(side, si));   // the edge faces edgeN (down at roll 0)
  if (kind === 'spear') {
    const butt = v3.mad(grip, d, -1.05 * s), neck = v3.mad(grip, d, .78 * s), tip = v3.mad(neck, d, .34 * s);
    return { kind, grip, d, edgeN, pommel: butt, guard: neck, tip, pts: [neck, tip], shaft: [butt, neck], len };
  }
  const pommel = v3.mad(grip, d, -.2 * s), guard = v3.mad(grip, d, .07 * s), pts = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12, bend = (W.curve || 0) * s * Math.sin(k * Math.PI * .5) * k * 2.2; pts.push(v3.mad(v3.mad(guard, d, len * k), edgeN, -bend)); }
  return { kind, grip, d, edgeN, pommel, guard, tip: pts[12], pts, len };
}

// joint limits: [] when every joint is in range, else names with the value (check.mjs fails on these)
export const LIM = { neckYaw: 1.57, neckPitch: .8, twist: .8, lean: 1.05, side: .5, kneeMin: .35, hipBack: 1.3, reach: .002, ground: -.015 };
function limitsOf(P, r, D) {
  const out = [];
  if (Math.abs(P.hy) > LIM.neckYaw) out.push(`neck yaw ${P.hy.toFixed(2)}`);
  if (Math.abs(P.hp) > LIM.neckPitch) out.push(`neck pitch ${P.hp.toFixed(2)}`);
  if (Math.abs(P.twist) > LIM.twist) out.push(`waist twist ${P.twist.toFixed(2)}`);
  if (P.lean > LIM.lean || P.lean < -.5) out.push(`lean ${P.lean.toFixed(2)}`);
  if (Math.abs(P.side) > LIM.side) out.push(`side tilt ${P.side.toFixed(2)}`);
  for (const [n, hp, k, a] of [['left', r.hipL, r.kneeL, r.ankL], ['right', r.hipR, r.kneeR, r.ankR]]) {
    const th = v3.norm(v3.sub(k, hp)), sh = v3.norm(v3.sub(a, k)), kneeAng = Math.acos(clamp(v3.dot(th, sh), -1, 1));
    if (Math.PI - kneeAng < LIM.kneeMin) out.push(`${n} knee folded past ${(Math.PI - kneeAng).toFixed(2)}`);
    // hip extension: thigh behind the torso line, measured against the torso's down axis in the forward plane
    const down = v3.mul(r.PF.U, -1), fwd = v3.dot(th, r.PF.F), dn = v3.dot(th, down), ext = Math.atan2(-fwd, dn);
    if (ext > LIM.hipBack) out.push(`${n} hip extended ${ext.toFixed(2)}`);
  }
  if (r.reachR > LIM.reach) out.push(`right hand out of reach by ${r.reachR.toFixed(3)} m`);
  if (r.reachL > LIM.reach && P.both > .5) out.push(`left hand out of reach by ${r.reachL.toFixed(3)} m`);
  if (r.legL > .01 || r.legR > .01) out.push(`foot target out of reach (${Math.max(r.legL, r.legR).toFixed(3)} m)`);
  if (P.y <= .001) for (const f of [r.fL, r.fR]) if (f.toe[1] < LIM.ground || f.heel[1] < LIM.ground) { out.push('foot below the ground'); break; }
  if (r.blade && P.y <= .001 && P.bp > -1.3 && Math.min(...r.blade.pts.map(p => p[1])) < -.02) out.push('blade through the ground');
  return out;
}

// ---------- secondary motion: things that trail ----------
// a chain hanging from anchor(t): each sample s ∈ [0, 1] follows where the anchor was τ·s seconds ago, sags with gravity,
// flares along `out`, flutters with speed, and is kept at its length (segments renormalised)
function chain(H, t, anchorFn, o) {
  const n = o.n || 7, L = o.len, tau = o.tau ?? .22, pts = [anchorFn(H.rig(t))];
  const a0 = pts[0], prev = anchorFn(H.rig(t - .04)), vel = v3.mul(v3.sub(a0, prev), 1 / .04), speed = v3.len(vel);
  const out = o.out ? o.out(H.rig(t)) : [0, 0, 0];
  for (let i = 1; i <= n; i++) {
    const s = i / n, past = anchorFn(H.rig(t - tau * s)), trail = v3.sub(past, a0);
    const hang = v3.add([0, -L * s * (o.sag ?? 1), 0], v3.mul(out, L * s * (o.flare ?? .3)));
    const wob = Math.min(1, speed / 4) * (o.flutter ?? .12) * L * s;
    const fl = [sn(t * 7.1 + i * .8, o.seed || 1) * wob, sn(t * 6.3 + i * .7, (o.seed || 1) + 5) * wob * .6, sn(t * 7.7 + i * .9, (o.seed || 1) + 9) * wob];
    pts.push(v3.add(v3.add(a0, v3.add(trail, hang)), fl));
  }
  // keep the chain length: walk the polyline and renormalise each segment to L / n
  const seg = L / n;
  for (let i = 1; i < pts.length; i++) { const d = v3.sub(pts[i], pts[i - 1]), l = v3.len(d) || 1; pts[i] = v3.mad(pts[i - 1], d, seg / l); }
  return pts;
}

// ---------- drawing ----------
const _sl = (v, L) => { const a = v.p([0, 0, 0]), b = v.p(L); return null; };
// screen-space light direction (for the rim): which way the key light falls on the frame
function screenLight(v) { const x = v3.dot(LIGHT, v.r), y = -v3.dot(LIGHT, v.u), l = Math.hypot(x, y) || 1; return [x / l, y / l]; }

// a limb: a tapered stroke through projected points with radii in metres → filled outline; rim on the lit side
function limbPath(v, pts3, rad) {
  const P = pts3.map(p => v.p(p)); if (P.some(p => !p)) return null;
  const R = P.map((p, i) => rad[i] * v.k(p[2]));
  const L = [], Rt = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    L.push([P[i][0] + nx * R[i], P[i][1] + ny * R[i]]); Rt.push([P[i][0] - nx * R[i], P[i][1] - ny * R[i]]);
  }
  return { P, R, L, Rt };
}
function fillLimb(ctx, lp) {
  const { P, R, L, Rt } = lp, n = P.length;
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  smoothOpen(ctx, L, .6, false);
  const e = P[n - 1], a1 = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  ctx.arc(e[0], e[1], R[n - 1], a1, a1 + Math.PI, true);
  smoothOpen(ctx, Rt.slice().reverse(), .6, false);
  const s = P[0], a0 = Math.atan2(Rt[0][1] - s[1], Rt[0][0] - s[0]);
  ctx.arc(s[0], s[1], R[0], a0, a0 + Math.PI, true);
  ctx.closePath(); ctx.fill();
}
// rim: the lit edge of a limb, a thin lighter stroke just inside the outline
function rimLimb(ctx, lp, sl, col, w) {
  const { P, L, Rt } = lp; if (P.length < 2) return;
  const dx = P[P.length - 1][0] - P[0][0], dy = P[P.length - 1][1] - P[0][1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const side = nx * sl[0] + ny * sl[1] < 0 ? L : Rt, k = Math.abs(nx * sl[0] + ny * sl[1]);
  if (k < .15) return;
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha *= Math.min(1, k * 1.4); ctx.lineWidth = w; ctx.lineCap = 'round';
  const inset = side.map((p, i) => [p[0] + (P[i][0] - p[0]) * .16, p[1] + (P[i][1] - p[1]) * .16]);
  ctx.beginPath(); smoothOpen(ctx, inset.slice(0, Math.max(2, inset.length - (inset.length > 3 ? 1 : 0))), .6); ctx.stroke(); ctx.restore();
}
// rim on a closed screen polygon: stroke the edges whose outward normal faces the light (clipped to the shape)
function rimPoly(ctx, poly, sl, col, w) {
  ctx.save(); ctx.beginPath(); smoothClosed(ctx, poly, .35); ctx.clip();
  ctx.strokeStyle = col; ctx.lineWidth = w * 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the polygon is a convex hull in counter-clockwise screen order (y down): outward normal = (dy, -dx)
  let area = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * sgn, ny = dx / l * sgn, d = nx * sl[0] + ny * sl[1];
    if (d < -.25) { ctx.globalAlpha = Math.min(1, -d); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  ctx.restore();
}
const ring = (o, F, y, rx, rz, n = 14, z0 = 0) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push(F.at(o, Math.cos(a) * rx, y, Math.sin(a) * rz + z0)); } return out; };

// draws the fighter at time t. o: { flat: true (one tone, no face — afterimages, distant), alpha, tone (flat colour),
//   noCloth, noHair, glow (override), scaleRim }
export function drawFighter(ctx, v, H, t, o = {}) {
  const r = H.rig(t), D = H.D, P = r.P, s = D.build.scale, sl = screenLight(v);
  const flat = !!o.flat, INK = o.tone || D.ink, CL = flat ? INK : D.cloth, RIM = D.rim;
  const kHead = v.k(Math.max(v.near, v.depth(r.head))), rimW = Math.max(1, kHead * .006) * (o.scaleRim || 1);
  const parts = [];
  const add = (z, f) => parts.push({ z, f });
  const toCam = p => v3.norm(v3.sub(v.pos, p));

  // legs: trousers to the boot, boot, foot
  for (const [hip, knee, ank, F, side] of [[r.hipL, r.kneeL, r.ankL, r.fL, -1], [r.hipR, r.kneeR, r.ankR, r.fR, 1]]) {
    add(v.depth(knee), () => {
      const lp = limbPath(v, [hip, v3.lerp(hip, knee, .5), knee, v3.lerp(knee, ank, .55), ank], [.088, .082, .066, .062, .05].map(x => x * s));
      if (!lp) return;
      ctx.fillStyle = CL; fillLimb(ctx, lp);
      // boot: shin lower part + foot wedge
      const bt = limbPath(v, [v3.lerp(knee, ank, .45), ank], [.06 * s, .054 * s]);
      const fp = [F.heel, v3.add(ank, [0, .02 * s, 0]), v3.add(F.toe, [0, .035 * s, 0]), F.toe, v3.add(F.heel, [0, -.005, 0])].map(p => v.p(p));
      ctx.fillStyle = INK; if (bt) fillLimb(ctx, bt);
      if (fp.every(Boolean)) { ctx.beginPath(); smoothClosed(ctx, fp, .4); ctx.fill(); }
      if (!flat) { rimLimb(ctx, lp, sl, RIM, rimW); if (bt) rimLimb(ctx, bt, sl, RIM, rimW * .8); }
    });
  }
  // arms: sleeve → cuff → glove / hand
  const arm = (sh, el, wr, side, holding) => add(v.depth(el) - .001, () => {
    const lp = limbPath(v, [sh, v3.lerp(sh, el, .5), el, v3.lerp(el, wr, .55), wr], [.05, .048, .043, .043, .049].map(x => x * s));
    if (!lp) return;
    ctx.fillStyle = CL; fillLimb(ctx, lp);
    if (!flat) rimLimb(ctx, lp, sl, RIM, rimW);
    const fore = v3.norm(v3.sub(wr, el)), hc = v3.mad(wr, fore, .045 * s), hp = v.p(hc);
    if (hp) {
      const rr = .043 * s * v.k(hp[2]), a = Math.atan2(v.p(v3.mad(hc, fore, .05))?.[1] - hp[1], v.p(v3.mad(hc, fore, .05))?.[0] - hp[0]) || 0;
      ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(a);
      ctx.fillStyle = flat ? INK : D.gloves ? INK : D.skin;
      ctx.beginPath(); ctx.ellipse(0, 0, rr * 1.1, rr * .86, 0, 0, TAU); ctx.fill();
      if (!flat && !D.gloves) {   // a fist: knuckle line and shadow on the far side
        ctx.strokeStyle = 'rgba(70,52,44,.55)'; ctx.lineWidth = Math.max(.8, rr * .1);
        ctx.beginPath(); ctx.moveTo(rr * .3, -rr * .7); ctx.quadraticCurveTo(rr * .9, 0, rr * .3, rr * .7); ctx.stroke();
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(rr * .35, k * rr * .32); ctx.lineTo(rr * .95, k * rr * .3); ctx.stroke(); }
        ctx.fillStyle = 'rgba(90,64,52,.35)'; ctx.beginPath(); ctx.ellipse(-rr * .15, rr * .25, rr * .8, rr * .45, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  });
  arm(r.shL, r.elbL, r.wrL, -1); arm(r.shR, r.elbR, r.wrR, 1);

  // torso + coat (a hull of rings), the sash band, the collar
  add(v.depth(r.chest), () => drawTorso(ctx, v, r, D, sl, flat, INK, CL, RIM, rimW));
  // coat tails / skirt panels and sash tails (each panel sorted by its own depth)
  if (!o.noCloth) for (const pn of clothPanels(H, t)) add(v.depth(pn.mid) + (pn.front ? -.05 : .02), () => drawPanel(ctx, v, pn, flat ? INK : pn.white ? D.sash.col : CL, flat, sl, RIM, rimW, pn.white ? '#a9a6a1' : null));
  // weapon(s)
  for (const bl of [r.blade, r.blade2].filter(Boolean)) {
    const zb = v.depth(v3.lerp(bl.grip, bl.tip, .25));
    add(zb - .002, () => drawWeapon(ctx, v, bl, D, P, flat, INK, o));
  }
  // head (hair, face, features); the hair hanging behind the head is its own part, so it sorts behind the back
  const hs = D.build.scale * (D.build.head || 1);
  add(v.depth(r.HF.at(r.head, 0, -.12 * hs, -.13 * hs)), () => drawHead(ctx, v, H, r, t, D, sl, flat, INK, RIM, rimW, { ...o, part: 'back' }));
  add(v.depth(r.head) - .03, () => drawHead(ctx, v, H, r, t, D, sl, flat, INK, RIM, rimW, { ...o, part: 'main' }));

  parts.sort((a, b) => b.z - a.z);
  ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  for (const p of parts) p.f();
  ctx.restore();
}

function drawTorso(ctx, v, r, D, sl, flat, INK, CL, RIM, rimW) {
  const s = D.build.scale, PF = r.PF, CF = r.CF;
  const pts = [
    ...ring(r.pelvis, PF, -.04 * s, .155 * s, .115 * s), ...ring(r.pelvis, PF, .13 * s, .135 * s, .105 * s),
    ...ring(r.chest, CF, -.03 * s, .17 * s, .12 * s), ...ring(r.chest, CF, .06 * s, .178 * s, .1 * s),
    CF.at(r.chest, -.15 * s, .11 * s, 0), CF.at(r.chest, .15 * s, .11 * s, 0), CF.at(r.chest, -.06 * s, .14 * s, 0), CF.at(r.chest, .06 * s, .14 * s, 0),
  ].map(p => v.p(p));
  if (pts.some(p => !p)) return;
  const h = hull(pts);
  ctx.fillStyle = CL; ctx.beginPath(); smoothClosed(ctx, h, .35); ctx.fill();
  if (!flat) {
    rimPoly(ctx, h, sl, RIM, rimW);
    // coat details: the front opening and a few folds, only where they face the lens
    const front = CF.at(r.chest, 0, -.05 * s, .135 * s), nF = CF.F;
    if (v.faces(front, nF)) {
      ctx.save(); ctx.beginPath(); smoothClosed(ctx, h, .35); ctx.clip();
      const seam = [CF.at(r.chest, .03 * s, .1 * s, .12 * s), CF.at(r.chest, .05 * s, -.08 * s, .14 * s), PF.at(r.pelvis, .07 * s, .05 * s, .13 * s), PF.at(r.pelvis, .08 * s, -.08 * s, .14 * s)].map(p => v.p(p));
      ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = rimW * 1.6; ctx.beginPath(); smoothOpen(ctx, seam, .5); ctx.stroke();
      ctx.strokeStyle = RIM; ctx.globalAlpha = .45; ctx.lineWidth = rimW * .8;
      for (const [a, b] of [[[-.12, .02, .12], [-.06, -.1, .13]], [[.1, .03, .12], [.13, -.06, .12]], [[-.05, .08, .12], [-.1, -.02, .13]]]) {
        const A = v.p(CF.at(r.chest, a[0] * s, a[1] * s, a[2] * s)), Bp = v.p(CF.at(r.chest, b[0] * s, b[1] * s, b[2] * s)); if (!A || !Bp) continue;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo((A[0] + Bp[0]) / 2 + (Bp[1] - A[1]) * .15, (A[1] + Bp[1]) / 2, Bp[0], Bp[1]); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // the sash: a white band round the waist (front half visible), knotted at the left front
  if (D.sash && D.sash.col) {
    const band = []; const n = 16;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU; band.push([PF.at(r.pelvis, Math.cos(a) * .162 * s, .085 * s, Math.sin(a) * .122 * s), PF.at(r.pelvis, Math.cos(a) * .158 * s, .02 * s, Math.sin(a) * .12 * s), a]); }
    ctx.fillStyle = flat ? INK : D.sash.col;
    for (let i = 0; i < n; i++) {
      const a = band[i], b = band[i + 1], mid = PF.at(r.pelvis, Math.cos((a[2] + b[2]) / 2) * .16 * s, .05 * s, Math.sin((a[2] + b[2]) / 2) * .12 * s);
      const nrm = v3.norm(v3.sub(mid, v3.add(r.pelvis, v3.mul(PF.U, .05 * s))));
      if (!v.faces(mid, nrm)) continue;
      const q = [a[0], b[0], b[1], a[1]].map(p => v.p(p)); if (q.some(x => !x)) continue;
      const lit = !flat ? clamp(.55 + v3.dot(nrm, LIGHT) * .6, .35, 1) : 1;
      ctx.fillStyle = flat ? INK : mix('#8d8a86', D.sash.col, lit);
      ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (const p of q) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    }
    // knot
    const kn = PF.at(r.pelvis, -.1 * s, .05 * s, .12 * s), kp = v.p(kn);
    if (kp && v.faces(kn, PF.F)) { const rr = .03 * s * v.k(kp[2]); ctx.fillStyle = flat ? INK : D.sash.col; ctx.beginPath(); ctx.ellipse(kp[0], kp[1], rr * 1.2, rr, .3, 0, TAU); ctx.fill(); if (!flat) { ctx.strokeStyle = '#9b9893'; ctx.lineWidth = rimW * .7; ctx.stroke(); } }
  }
}

// cloth panels: coat tails / skirt hanging from the waist ring, and the sash tails
function clothPanels(H, t) {
  const D = H.D, s = D.build.scale, C = D.coat, out = [];
  const np = C.panels || 7;
  // panel angles round the waist (0 = front, π = back); the front stays open by C.open
  for (let i = 0; i < np; i++) {
    const k = i / (np - 1), ang = lerp(C.open * .9 + .25, TAU - (C.open * .9 + .25), k);
    const back = (1 - Math.cos(ang)) / 2, len = C.len * s * lerp(.78, C.back, back) * (1 + .12 * sn(i * 3.1, 2));
    const span = TAU - 2 * (C.open * .9 + .25), w = span / (np - 1) * .62;
    const anc = (da) => rr => rr.PF.at(rr.pelvis, Math.sin(ang + da) * .175 * s, -.0 * s, Math.cos(ang + da) * .13 * s);
    const outF = (da) => rr => v3.norm(rr.PF.dir(Math.sin(ang + da * 2.2), -.1, Math.cos(ang + da * 2.2)));
    const o = { len, tau: .16 + back * .12, flare: C.flare + back * .1, sag: 1, flutter: .14 + back * .1, n: 6 };
    const A = chain(H, t, anc(-w), { ...o, out: outF(-w), seed: i * 7 + 1 }), Bc = chain(H, t, anc(w), { ...o, out: outF(w), seed: i * 7 + 4 });
    out.push({ A, B: Bc, mid: v3.lerp(A[3], Bc[3], .5), rag: C.rag, seed: i, front: Math.cos(ang) > .55 });
  }
  if (D.sash && D.sash.tails) for (let j = 0; j < D.sash.tails; j++) {
    const anc = (dz) => rr => rr.PF.at(rr.pelvis, (-.12 + j * .035) * s, .045 * s, (.1 + dz) * s);
    const o = { len: D.sash.len * s * (1 - j * .18), tau: .2, flare: .25, sag: 1, flutter: .3, n: 6, out: rr => v3.norm(rr.PF.dir(-.6, -.2, .3)) };
    const A = chain(H, t, anc(0), { ...o, seed: 50 + j }), Bc = chain(H, t, anc(.045), { ...o, seed: 53 + j });
    out.push({ A, B: Bc.map((p, i) => v3.lerp(p, A[i], i / Bc.length * .6)), mid: A[2], rag: .15, seed: 40 + j, white: true, front: true });
  }
  if (D.scarf) {
    const anc = (dx) => rr => rr.CF.at(rr.neck, dx * s, -.02 * s, -.06 * s);
    const o = { len: D.scarf.len * s, tau: .32, flare: .1, sag: .5, flutter: .35, n: 8, out: rr => v3.mul(rr.CF.F, -1) };
    const A = chain(H, t, anc(-.05), { ...o, seed: 70 }), Bc = chain(H, t, anc(.05), { ...o, seed: 73 });
    out.push({ A, B: Bc.map((p, i) => v3.lerp(p, A[i], i / Bc.length * .5)), mid: A[3], rag: .5, seed: 60, scarf: true });
  }
  return out;
}
function drawPanel(ctx, v, pn, col, flat, sl, RIM, rimW, shadeCol) {
  const A = pn.A.map(p => v.p(p)), B = pn.B.map(p => v.p(p)); if (A.some(p => !p) || B.some(p => !p)) return;
  const n = A.length, poly = [];
  for (let i = 0; i < n; i++) poly.push(A[i]);
  // ragged hem: a few torn points between the two edge tips
  const a = A[n - 1], b = B[n - 1], tear = pn.rag || 0;
  for (let k = 1; k <= 4; k++) {
    const u = k / 5, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), dx = A[n - 1][0] - A[n - 2][0], dy = A[n - 1][1] - A[n - 2][1];
    const d = (k % 2 ? 1 : -.35) * tear * (.4 + hash(pn.seed, k) * .9);
    poly.push([x + dx * d, y + dy * d]);
  }
  for (let i = n - 1; i >= 0; i--) poly.push(B[i]);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]);
  smoothOpen(ctx, poly.slice(0, n), .5, false); for (let i = n; i < n + 4; i++) ctx.lineTo(poly[i][0], poly[i][1]); smoothOpen(ctx, poly.slice(n + 4), .5, false);
  ctx.closePath(); ctx.fill();
  if (shadeCol && !flat) { ctx.save(); ctx.clip(); ctx.strokeStyle = shadeCol; ctx.lineWidth = rimW * 1.5; ctx.beginPath(); smoothOpen(ctx, B, .5); ctx.stroke(); ctx.restore(); }
  else if (!flat) {   // a fold line down the middle and the rim
    ctx.save(); ctx.clip(); ctx.strokeStyle = RIM; ctx.globalAlpha = .4; ctx.lineWidth = rimW;
    const m = A.map((p, i) => [lerp(p[0], B[i][0], .45 + .1 * Math.sin(pn.seed)), lerp(p[1], B[i][1], .45)]);
    ctx.beginPath(); smoothOpen(ctx, m.slice(1), .5); ctx.stroke();
    const side = (A[2][0] - B[2][0]) * sl[0] + (A[2][1] - B[2][1]) * sl[1] < 0 ? A : B;
    ctx.globalAlpha = .7; ctx.beginPath(); smoothOpen(ctx, side, .5); ctx.stroke(); ctx.restore();
  }
}

function drawWeapon(ctx, v, bl, D, P, flat, INK, o) {
  const s = D.build.scale;
  const line = (a, b, w, col) => { const q = v.seg(a, b); if (!q) return; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * v.k(Math.max(v.near, (q[0][2] + q[1][2]) / 2))); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); };
  const edge = clamp(o.edge ?? P.edge);
  if (bl.kind === 'spear') {
    line(bl.shaft[0], bl.shaft[1], .032 * s, INK);
    const tipP = [bl.guard, v3.mad(v3.mad(bl.guard, bl.d, .12 * s), bl.edgeN, .045 * s), bl.tip, v3.mad(v3.mad(bl.guard, bl.d, .12 * s), bl.edgeN, -.045 * s)].map(p => v.p(p));
    if (tipP.every(Boolean)) { ctx.fillStyle = flat ? INK : '#26272c'; ctx.beginPath(); smoothClosed(ctx, tipP, .2); ctx.fill(); if (!flat) { ctx.strokeStyle = edge > 0 ? D.accent : '#c9ccd2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tipP[1][0], tipP[1][1]); ctx.lineTo(tipP[2][0], tipP[2][1]); ctx.stroke(); } }
    line(v3.mad(bl.guard, bl.d, -.03 * s), bl.guard, .05 * s, INK);
    return;
  }
  // hilt with wrap, guard, blade (dark steel with a bright edge line), accent light along the edge
  line(bl.pommel, bl.guard, .036 * s, INK);
  if (!flat) { const n = 6; for (let i = 1; i < n; i++) { const a = v3.lerp(bl.pommel, bl.guard, i / n), q = v.p(a); if (!q) continue; const rr = .016 * s * v.k(q[2]); ctx.fillStyle = '#3c3d43'; ctx.beginPath(); ctx.ellipse(q[0], q[1], rr * .5, rr * .9, 0, 0, TAU); ctx.fill(); } }
  // guard: a disc facing along the blade
  const gp = v.p(bl.guard);
  if (gp) {
    const k = v.k(gp[2]), R = (D.weapon.guard === 'none' ? 0 : .045) * s * k;
    if (R) {
      const ax = v.p(v3.mad(bl.guard, bl.d, .05)), dx = ax ? ax[0] - gp[0] : 0, dy = ax ? ax[1] - gp[1] : 1, l = Math.hypot(dx, dy) || 1, fs = clamp(l / (.05 * k), .12, 1);
      ctx.save(); ctx.translate(gp[0], gp[1]); ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = flat ? INK : '#121216'; ctx.beginPath(); ctx.ellipse(0, 0, R * fs, R, 0, 0, TAU); ctx.fill();
      if (!flat) { ctx.strokeStyle = '#d8d9dc'; ctx.lineWidth = Math.max(1, R * .12); ctx.beginPath(); ctx.ellipse(0, 0, R * fs * .88, R * .88, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#777a80'; ctx.lineWidth = Math.max(.7, R * .06); ctx.beginPath(); ctx.ellipse(0, 0, R * fs * .55, R * .55, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  }
  const pts = bl.pts.map(p => v.p(p)); if (pts.some(p => !p)) return;
  const back = bl.pts.map((p, i) => v.p(v3.mad(p, bl.edgeN, -.026 * s * (1 - (i / 12) ** 3 * .85))));
  if (back.some(p => !p)) return;
  ctx.fillStyle = flat ? INK : '#16171b'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]); for (let i = back.length - 1; i >= 0; i--) ctx.lineTo(back[i][0], back[i][1]); ctx.closePath(); ctx.fill();
  const wpx = Math.max(1.2, .005 * s * v.k(pts[6][2]));
  ctx.lineWidth = wpx; ctx.strokeStyle = flat ? INK : '#d9dce2'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
  if (!flat && edge > 0) {
    // accent light: travels from the guard to the tip with `edge`, glowing
    const m = Math.max(1, Math.round(edge * 12));
    ctx.save(); ctx.shadowColor = D.accent; ctx.shadowBlur = wpx * 3.5; ctx.strokeStyle = D.accent; ctx.lineWidth = wpx * .85;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= m; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffd9dd'; ctx.lineWidth = wpx * .3; ctx.stroke();
    const tp = pts[m]; ctx.fillStyle = '#fff'; ctx.shadowColor = D.accent; ctx.shadowBlur = wpx * 6; ctx.beginPath(); ctx.arc(tp[0], tp[1], wpx * .9, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ---------- the head ----------
// hair locks in head space: root (unit dir on the scalp), length, root width (m), fall (0 sticks out … 1 hangs), a
// sideways sweep, a curl at the tip, and kind (back · side · bang · long). Locks fall in WORLD down, so a tilted head's
// hair still hangs, and they trail where the head was a moment ago.
function hairLocks(D) {
  const Hh = D.hair, R = a => hash(Hh.seed * 131 + a, 7), out = [], st = Hh.style, len = Hh.len || 1;
  const add = (dir, l, w, fall, kind, sweep = 0, curl = 0) => out.push({ dir: v3.norm(dir), l: l * len, w, fall, kind, sweep, curl });
  const short = st === 'cropped' ? .55 : 1;
  // crown and back: rows of locks from the whorl at the back of the crown down to the nape
  const rows = [[.92, 5, .1], [.68, 9, .12], [.42, 12, .13], [.12, 13, .12], [-.2, 11, .1], [-.48, 8, .085]];
  rows.forEach(([el, n, l], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i + (ri % 2) * .5) / n * TAU + (R(ri * 40 + i) - .5) * .35, y = Math.sin(el), h = Math.cos(el);
      const dir = [Math.sin(a) * h, y, Math.cos(a) * h - .12];
      if (dir[2] > .3 && el < .85) continue;                       // leave the face to the bangs
      add(dir, l * short * (.8 + R(ri * 40 + i + 7) * .45), .052 + R(ri * 40 + i + 3) * .03, clamp(.3 + (1 - y) * .4 + R(i + ri) * .2), 'back', (R(i * 3 + ri) - .5) * .8, (R(i * 5 + ri) - .5) * 1.2);
    }
  });
  // side locks over the ears
  for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) add([sx * .9, .34 - j * .22, .22 - j * .14], (.1 + R(80 + j + sx) * .03) * short, .07, .9, 'side', sx * .2, (R(84 + j) - .5) * .5);
  // bangs: from the hairline over the brow, falling to the eyes, a little swept to one side
  const nf = st === 'cropped' ? 4 : 6;
  for (let j = 0; j < nf; j++) {
    const x = (j / (nf - 1) - .5) * 1.35 + (R(90 + j) - .5) * .12, main = j === 2;
    add([x, .82, .52], (st === 'cropped' ? .065 : (main ? .125 : .085) + R(100 + j) * .035) * (1 - Math.abs(x) * .2), (main ? .085 : .065) + R(110 + j) * .02, .9, 'bang', .3 + x * .35, (R(120 + j) - .5) * .9);
  }
  if (st === 'long' || st === 'bob') {
    const m = st === 'bob' ? 11 : 9, L = st === 'bob' ? .2 : .42;
    for (let j = 0; j < m; j++) { const a = Math.PI + (j / (m - 1) - .5) * 1.7; add([Math.sin(a), .25, Math.cos(a)], L * (.85 + R(130 + j) * .3), .07, 1, 'long', 0, (R(140 + j) - .5) * .5); }
  }
  return out;
}
function drawHead(ctx, v, H, r, t, D, sl, flat, INK, RIM, rimW, o) {
  const s = D.build.scale * (D.build.head || 1), HF = r.HF, c = r.head, Rh = .105 * s;
  const L = (x, y, z) => HF.at(c, x * s, y * s, z * s), toCam = v3.norm(v3.sub(v.pos, c));
  const facing = v3.dot(HF.F, toCam);                 // 1 = looking at the lens, −1 = back of the head
  const locks = (H._lk ||= hairLocks(D));
  const past = H.rig(t - .08).head, lagV = v3.sub(past, c), lagL = Math.min(.1 * s, v3.len(lagV)), lag = v3.mul(v3.norm(lagV), lagL);
  const lockPts = lk => {
    const n = HF.dir(...lk.dir), root = v3.add(c, v3.mul(n, Rh * .93));
    const side = v3.norm(v3.cross(n, [0, 1, 0])), fall = lk.fall, l = lk.l * s;
    const g = v3.norm(v3.add(v3.mul(n, 1 - fall), v3.add([0, -fall, 0], v3.mul(side, lk.sweep * .35))));
    const bangFwd = lk.kind === 'bang' ? v3.mul(HF.F, .35) : [0, 0, 0];
    const ctrl = v3.add(root, v3.mul(n, l * .42));
    const tip = v3.add(v3.add(v3.add(root, v3.mul(v3.norm(v3.add(g, bangFwd)), l)), v3.mul(lag, .9 * (lk.kind === 'long' ? 1.6 : 1))), v3.mul(side, lk.curl * l * .25));
    const pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6, a = v3.lerp(root, ctrl, u), b = v3.lerp(ctrl, tip, u); pts.push(v3.lerp(a, b, u)); }
    return { pts, n };
  };
  const drawLock = (lk, col, plain) => {
    const { pts } = lockPts(lk), P = pts.map(p => v.p(p)); if (P.some(p => !p)) return;
    const w0 = lk.w * s * v.k(P[0][2]) * .5, Lf = [], Rt = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const w = w0 * Math.pow(1 - i / (P.length - 1), .8) * (i === 0 ? 1 : 1 + .15 * Math.sin(i));
      Lf.push([P[i][0] - dy / l * w, P[i][1] + dx / l * w]); Rt.push([P[i][0] + dy / l * w, P[i][1] - dx / l * w]);
    }
    ctx.fillStyle = col; ctx.beginPath(); smoothOpen(ctx, Lf, .6); smoothOpen(ctx, Rt.slice().reverse(), .6, false); ctx.closePath(); ctx.fill();
    if (!flat && !plain && lk.kind !== 'long' && hash(lk.l * 997, 2) > .7) {   // a strand highlight
      ctx.strokeStyle = rgba(RIM, .4); ctx.lineWidth = Math.max(.5, w0 * .07); ctx.beginPath(); smoothOpen(ctx, P.slice(1, 5).map((p, i) => [lerp(p[0], Lf[i + 1][0], .4), lerp(p[1], Lf[i + 1][1], .4)]), .6); ctx.stroke();
    }
  };
  const frontish = lk => v3.dot(HF.dir(...lk.dir), toCam) > -.05;
  // ponytail ('tied'): a lagging chain from the tie at the back of the crown, drawn as a tapered tail
  let tail = null;
  if (D.hair.style === 'tied') {
    const anc = rr => rr.HF.at(rr.head, 0, .07 * s, -.09 * s);
    const pts = chain(H, t, anc, { len: (D.hair.tail || .55) * s, tau: .3, sag: 1, flare: .22, flutter: .3, n: 8, out: rr => v3.mul(rr.HF.F, -1), seed: 91 });
    const lp = limbPath(v, pts, pts.map((_, i) => { const u = i / (pts.length - 1); return (.026 + .018 * Math.sin(Math.PI * Math.min(1, u * 2.2)) - .04 * u ** 1.4) * s; }).map(x => Math.max(.003 * s, x)));
    tail = { lp, behind: v3.dot(v3.norm(v3.sub(pts[2], c)), toCam) < 0, tie: pts[0] };
  }
  const drawTail = () => { if (!tail?.lp) return; ctx.fillStyle = INK; fillLimb(ctx, tail.lp); if (!flat) { rimLimb(ctx, tail.lp, sl, RIM, rimW * .8); const tp = v.p(tail.tie); if (tp && D.hair.tie) { const rr = .014 * s * v.k(tp[2]); ctx.fillStyle = D.hair.tie; ctx.beginPath(); ctx.ellipse(tp[0], tp[1], rr * 1.3, rr, 0, 0, TAU); ctx.fill(); } } };
  // 1. hair behind the head (its own depth part: drawn before the torso when the camera is in front)
  if (o.part === 'back') { if (tail?.behind) drawTail(); for (const lk of locks) if (lk.kind !== 'bang' && !frontish(lk)) drawLock(lk, INK); return; }
  // 2. neck and the head: skull silhouette in hair colour, then the hair mass framing the face
  const skull = [];
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; for (const el of [-.35, .2, .7]) skull.push(L(Math.cos(a) * Math.cos(el) * .102, Math.sin(el) * .108 + .005, Math.sin(a) * Math.cos(el) * .104)); }
  const jw = D.face.jaw ?? .5, cy = lerp(-.106, -.12, jw), jx = lerp(.067, .058, jw), jy = lerp(-.07, -.082, jw);
  const jaw = [L(0, cy, .068), L(-jx, jy, .025), L(jx, jy, .025), L(-.068, -.035, .06), L(.068, -.035, .06), L(0, -.025, .116)];
  const SK = hull([...skull, ...jaw].map(p => v.p(p)));
  if (SK.length < 3) return;
  const neckPts = [...ring(r.neck, r.CF, -.02 * s, .046 * s, .046 * s, 10), ...ring(HF.at(c, 0, -.08 * s, -.015 * s), HF, 0, .042 * s, .042 * s, 10)].map(p => v.p(p));
  if (neckPts.every(Boolean)) { ctx.fillStyle = flat ? INK : mix(D.skin, '#6d5a50', .45); ctx.beginPath(); smoothClosed(ctx, hull(neckPts), .3); ctx.fill(); }
  const mass = [];
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; for (const el of [-.12, .3, .75, 1.2]) { const p = [Math.cos(a) * Math.cos(el) * .118, Math.sin(el) * .118 + .012, Math.sin(a) * Math.cos(el) * .118 - .006]; if (el < 0 && Math.sin(a) > .2) continue; mass.push(L(...p)); } }
  const MS = hull([...mass.map(p => v.p(p)), ...SK]);
  ctx.fillStyle = INK; ctx.beginPath(); smoothClosed(ctx, MS, .3); ctx.fill();
  // 3. the face: skin bounded by the hairline, temples, jaw and chin (front of the sphere)
  H._face = null;
  if (!flat && facing > -.35) {
    const fb = [[-.09, .02, .055], [-.055, .045, .088], [0, .052, .1], [.055, .045, .088], [.09, .02, .055], [.098, -.03, .035], [jx + .008, jy + .005, .035], [.035, cy + .012, .062], [0, cy, .068], [-.035, cy + .012, .062], [-jx - .008, jy + .005, .035], [-.098, -.03, .035]];
    const fp = fb.map(q => v.p(L(...q))), np = v.p(L(0, -.025, .116)), cp = v.p(L(0, cy, .068));
    if (fp.every(Boolean)) {
      const poly = hull([...fp, np, cp].filter(Boolean)); H._face = poly;
      ctx.save(); ctx.beginPath(); smoothClosed(ctx, SK, .3); ctx.clip();
      ctx.fillStyle = D.skin; ctx.beginPath(); smoothClosed(ctx, poly, .3); ctx.fill();
      const side = v3.dot(HF.R, LIGHT) > 0 ? 1 : -1, sh = [[-.1 * side, .04, .05], [-.035 * side, .04, .1], [-.045 * side, -.06, .095], [-.03 * side, cy + .006, .068], [-.1 * side, jy, .03]].map(q => v.p(L(...q)));
      ctx.fillStyle = 'rgba(118,88,76,.24)'; if (sh.every(Boolean)) { ctx.beginPath(); smoothClosed(ctx, sh, .4); ctx.fill(); }
      // a fine contour along the jaw and cheek, as the drawn line of a cel
      const jl = [[-.098, -.03, .035], [-jx - .008, jy + .005, .035], [-.035, cy + .012, .062], [0, cy, .068], [.035, cy + .012, .062], [jx + .008, jy + .005, .035], [.098, -.03, .035]].map(q => v.p(L(...q)));
      if (jl.every(Boolean)) { ctx.strokeStyle = 'rgba(52,38,34,.55)'; ctx.lineWidth = Math.max(.7, rimW * .55); ctx.beginPath(); smoothOpen(ctx, jl, .5); ctx.stroke(); }
      ctx.restore();
      drawFeatures(ctx, v, r, D, L, toCam, HF, c, s, o, rimW);
    }
  }
  // 4. hair on the camera side, the rim on the lit crown, then the bangs over the eyes
  for (const lk of locks) if (lk.kind !== 'bang' && frontish(lk)) drawLock(lk, INK);
  if (!flat) rimPoly(ctx, MS, sl, RIM, rimW * .8);
  if (tail && !tail.behind) drawTail();
  if (!flat && facing > -.35 && H._face) {
    // the bangs throw their shape onto the face: the same locks, shifted down-and-away from the light, in skin shadow
    const off = [(-sl[0]) * .012 * s, .016 * s];
    ctx.save(); ctx.beginPath(); smoothClosed(ctx, H._face, .3); ctx.clip();
    const k = v.k(Math.max(v.near, v.depth(c)));
    ctx.translate(off[0] * k, off[1] * k);
    for (const lk of locks) if (lk.kind === 'bang') drawLock(lk, 'rgba(96,70,62,.42)', true);
    ctx.restore();
  }
  for (const lk of locks) if (lk.kind === 'bang') drawLock(lk, INK);
  // 5. the high collar up to the chin
  const col = D.coat.collar;
  if (col > 0) {
    const base = r.CF.at(r.chest, 0, .1 * s, -.005 * s), top = HF.at(c, 0, (-.19 + col * .5) * s, -.02 * s);
    const cp = [...ring(base, r.CF, 0, .084 * s, .078 * s, 12), ...ring(top, HF, 0, .06 * s, .07 * s, 12)].map(p => v.p(p));
    if (cp.every(Boolean)) {
      const ch = hull(cp); ctx.fillStyle = flat ? INK : D.cloth; ctx.beginPath(); smoothClosed(ctx, ch, .45); ctx.fill();
      if (!flat) { rimPoly(ctx, ch, sl, RIM, rimW); const f1 = v.p(HF.at(c, -.03 * s, (-.19 + col * .5) * s, .055 * s)), f2 = v.p(r.CF.at(r.chest, -.05 * s, .1 * s, .1 * s)); if (f1 && f2 && facing > 0) { ctx.save(); ctx.beginPath(); smoothClosed(ctx, ch, .45); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = rimW * 1.4; ctx.beginPath(); ctx.moveTo(f1[0], f1[1]); ctx.quadraticCurveTo((f1[0] + f2[0]) / 2 + rimW * 4, (f1[1] + f2[1]) / 2, f2[0], f2[1]); ctx.stroke(); ctx.restore(); } }
    }
  }
}
function drawFeatures(ctx, v, r, D, L, toCam, HF, c, s, o, rimW) {
  const P = r.P, glow = clamp(o.glow ?? P.glow), F = D.face;
  for (const sx of [-1, 1]) {
    const e = L(sx * .036, -.012, .095), n = v3.norm(v3.sub(e, c)), vis = clamp(v3.dot(n, toCam) * 3.5);
    if (vis <= .02) continue;
    const pc = v.p(e), px = v.p(L(sx * .036 + .01, -.012, .095)), py = v.p(L(sx * .036, -.002, .095)); if (!pc || !px || !py) continue;
    const ax = [(px[0] - pc[0]) * 100, (px[1] - pc[1]) * 100], ay = [(py[0] - pc[0]) * 100, (py[1] - pc[1]) * 100];  // px per metre along head right / up
    ctx.save(); ctx.globalAlpha *= vis; ctx.transform(ax[0] / 1000, ax[1] / 1000, -ay[0] / 1000, -ay[1] / 1000, pc[0], pc[1]);
    // units: millimetres in the eye plane (x right, y down after the flip)
    const m = sx;  // mirror for the left/right eye so the outer corner sweeps outward
    ctx.scale(m * 1.12, 1.12);
    // sclera
    ctx.fillStyle = '#f4f1ec'; ctx.beginPath(); ctx.moveTo(-15, 1.5); ctx.quadraticCurveTo(-2, -11, 15, -3.5); ctx.quadraticCurveTo(4, 8, -15, 1.5); ctx.fill();
    ctx.save(); ctx.clip();
    // iris + pupil: accent and glowing when the power wakes
    const irisCol = glow > 0 ? mix('#3b2d2f', D.accent, glow) : '#2c2a2e';
    ctx.fillStyle = irisCol; ctx.beginPath(); ctx.ellipse(1.5, -1.5, 6.4, 7.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0809'; ctx.beginPath(); ctx.ellipse(1.5, -1.5, glow > .5 ? 1.2 : 2.6, glow > .5 ? 5 : 3.4, 0, 0, TAU); ctx.fill();
    if (glow > 0) { ctx.strokeStyle = rgba('#ffffff', .25 * glow); ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(1.5, -1.5, 4.4, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-16, -10, 32, 5);      // upper lid shadow
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-1, -4, 1.4, 0, TAU); ctx.fill();
    // upper lid: thick, sharp, sweeping out; lower lid thin
    ctx.fillStyle = '#0b0a0c'; ctx.beginPath(); ctx.moveTo(-16, 2); ctx.quadraticCurveTo(-3, -13.5, 17, -5); ctx.lineTo(18.5, -2.2); ctx.quadraticCurveTo(-2, -9.5, -14, 2.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,18,.6)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-10, 4.6); ctx.quadraticCurveTo(4, 7, 12, 1.5); ctx.stroke();
    if (F.lash > 0) { ctx.fillStyle = '#0b0a0c'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(12 + k * 2.2, -5 - k * .8); ctx.lineTo(17 + k * 2.6, -8.5 - k * 2.2 * F.lash); ctx.lineTo(13.5 + k * 2.2, -3.6 - k * .6); ctx.fill(); } }
    // brow: stern, angled down toward the nose
    ctx.fillStyle = '#0b0a0c'; ctx.beginPath(); ctx.moveTo(-15, -12 - F.brow * 2); ctx.quadraticCurveTo(0, -17, 17, -14 + F.brow * 1); ctx.lineTo(16, -11.5); ctx.quadraticCurveTo(0, -14, -14, -9.5 - F.brow * 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (glow > 0) {   // the glow sits on top, unclipped
      const ic = v.p(L(sx * .035, -.0135, .096)); if (ic) { const rr = Math.hypot(...ax) / 1000 * 10; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ic[0], ic[1], 0, ic[0], ic[1], rr * 2.4); g.addColorStop(0, rgba(D.accent, .55 * glow * vis)); g.addColorStop(1, rgba(D.accent, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ic[0], ic[1], rr * 2.4, 0, TAU); ctx.fill(); ctx.restore(); }
    }
  }
  // nose and mouth: small anime marks, visible from the front and three-quarter
  const nz = L(0, -.03, .114), np = v.p(nz), nv = clamp((v3.dot(HF.F, toCam) - .35) * 2.5);
  if (np && nv > .05) {
    const fk = v.k(Math.max(v.near, v.depth(c))) * s, nr = v.p(L(.005, -.042, .112)); ctx.strokeStyle = rgba('#7a5a50', .7 * nv); ctx.lineWidth = Math.max(.6, fk * .0018); ctx.beginPath(); ctx.moveTo(np[0], np[1]); if (nr) ctx.lineTo(nr[0], nr[1]); ctx.stroke();
    const m0 = v.p(L(-.016, -.072, .1)), m1 = v.p(L(.014, -.071, .1)); if (m0 && m1) { ctx.strokeStyle = rgba('#3c2a26', .8 * nv); ctx.lineWidth = Math.max(.7, fk * .0022); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke(); }
  }
  // ear on the near side
  for (const sx of [-1, 1]) {
    const e = L(sx * .102, -.02, -.005), n = v3.norm(v3.sub(e, c)); if (v3.dot(n, toCam) < .25) continue;
    const pe = v.p(e); if (!pe) continue; const rr = .02 * s * v.k(pe[2]);
    ctx.fillStyle = mix(D.skin, '#7a6156', .25); ctx.beginPath(); ctx.ellipse(pe[0], pe[1], rr * .55, rr, 0, 0, TAU); ctx.fill();
  }
}
