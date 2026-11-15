// paper-cutout-short · puppet.js — cut-out puppets: paper parts pinned at joints (like brass paper fasteners), posed by angle,
// moved on twos with a little hand-placed jitter, every joint audited against its range.
//
//   const FOX = P.puppet({ name: 'Wren', parts: [ { id: 'hip', bounds, paint }, { id: 'torso', parent: 'hip', at: [0, 0], … } ] })
//   const FOX = P.biped({ name: 'Wren', … head / torso painters, limb lengths and colours … })   → the standard two-legged rig
//   P.draw(ctx, FOX, { x, ground: 900, facing: 1, angles: P.walk(phase), swap: { head: 'blink' } })
//   P.where(FOX, pose, 'foreN', [0, 40])   → stage point of a spot on a part (aim a prop, a hand, a hit)
//
// A part = { id, parent, at: [x, y] (its pin in the parent's local px), z (draw order; near limbs > 0, far limbs < 0),
//            bounds: [x0, y0, x1, y1] + paint(ctx) (cut in code)  or  img: sprite (cut from a generated sheet, P.image()),
//            alts: { name: paint | sprite } (replacement parts: blink, open mouth, pointing hand …),
//            rest: deg (angle added before the pose), lim: [min, max] deg, sole: [[x, y] …] (points that touch the ground) }
// Local px: a part's pin is its origin. Angles in degrees, positive = clockwise on screen, for a puppet facing right (+x).
// facing: -1 mirrors the whole puppet (cut-out theatre turns a puppet by flipping it); the shadow and the light stay put. A
// fractional facing (.3, −.3) squeezes it edge-on: one or two such steps between 1 and −1 read as the paper turning over.
import { sprite, put, opts, audit, hash, sid, clamp, piece, capsule, tone, darker } from './paper.js';

const RAD = Math.PI / 180;
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const T = (x, y) => [1, 0, 0, 1, x, y], R = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; }, Sc = (x, y) => [x, 0, 0, y, 0, 0];
const app = (M, [x, y]) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

/** joint ranges for the standard biped (deg, facing right; + = clockwise). Knees fold back (+), elbows forward (−). */
export const LIM = {
  torso: [-30, 30],     // waist, relative to the hip
  head: [-40, 40],      // neck: nod / tilt (a profile puppet does not turn its head — flip the whole puppet)
  thighN: [-110, 60], thighF: [-110, 60],   // hip: forward (−) to back (+)
  shinN: [0, 150], shinF: [0, 150],         // knee: only folds back
  footN: [-40, 45], footF: [-40, 45],       // ankle
  armN: [-185, 70], armF: [-185, 70],       // shoulder: forward / overhead (−) to back (+)
  foreN: [-150, 0], foreF: [-150, 0],       // elbow: only folds forward
};

/** build a puppet: rasterise every part (and its alternates) once */
export function puppet(spec) {
  const res = spec.res || 1, parts = [], byId = {};
  for (const p0 of spec.parts) {
    const p = { z: 0, at: [0, 0], rest: 0, ...p0 };
    const mkS = f => typeof f === 'function' ? sprite(p.bounds, f, { res, shadow: spec.shadow ?? 7, pad: 6 }) : f;
    p.s = p.img || (p.paint ? mkS(p.paint) : null);
    p.alt = {}; for (const [k, f] of Object.entries(p.alts || {})) p.alt[k] = mkS(f);
    if (!p.lim && LIM[p.id] && spec.standard) p.lim = LIM[p.id];
    p.seed = sid(spec.name + p.id);
    parts.push(p); byId[p.id] = p;
  }
  for (const p of parts) if (p.parent && !byId[p.parent]) throw new Error(`${spec.name}: part ${p.id} has unknown parent ${p.parent}`);
  const order = [...parts].sort((a, b) => a.z - b.z);
  return { ...spec, parts, byId, order, lift: spec.lift ?? 12 };
}

/** world matrices of every part for a pose (no drawing). pose = { x, y | ground, rot, facing, scale, angles, jitter, step } */
export function solve(pp, pose = {}) {
  const A = pose.angles || {}, f = pose.facing ?? 1, s = (pose.scale ?? 1) * (pp.scale ?? 1), M = {}, jit = pose.jitter ?? 0, st = pose.step ?? 0;
  const root = T(pose.x ?? 0, pose.y ?? 0);
  const base = mul(mul(root, Sc(f * s, s)), R((pose.rot || 0) * RAD));
  for (const p of pp.parts) {
    const a = (p.rest + (A[p.id] || 0)) * RAD;
    const jx = jit ? (hash(st, p.seed) - .5) * jit : 0, jy = jit ? (hash(st, p.seed + 1) - .5) * jit : 0, ja = jit ? (hash(st, p.seed + 2) - .5) * jit * .6 * RAD : 0;
    const P0 = p.parent ? M[p.parent] : base;
    M[p.id] = mul(mul(P0, T(p.at[0] + jx, p.at[1] + jy)), R(a + ja));
  }
  // plant: shift so the lowest sole point sits on the ground line
  if (pose.ground != null) {
    let low = -1e9; for (const p of pp.parts) for (const q of p.sole || []) low = Math.max(low, app(M[p.id], q)[1]);
    if (low > -1e9) { const dy = pose.ground - low; for (const k in M) M[k][5] += dy; }
  }
  return M;
}
/** the stage point of a local point on a part */
export function where(pp, pose, id, pt = [0, 0]) { return app(solve(pp, pose)[id], pt); }
/** lowest sole y and the x of each sole (for "feet on the ground" checks) */
export function soles(pp, pose) {
  const M = solve(pp, pose), out = [];
  for (const p of pp.parts) for (const q of p.sole || []) out.push(app(M[p.id], q));
  return out;
}
/** audit the pose's angles against each part's range: pushes "body: …" into the frame's audit (check.mjs fails on it) */
export function audit_(pp, pose) {
  const A = pose.angles || {};
  for (const p of pp.parts) {
    if (!p.lim) continue; const a = A[p.id] || 0;
    if (a < p.lim[0] - .5 || a > p.lim[1] + .5) audit.push(`body: ${pp.name} ${p.id} out of range (${a.toFixed(0)}°, allowed ${p.lim[0]}…${p.lim[1]})`);
  }
  for (const p of pp.parts) if (p.s && (p.s.w < 1 || p.s.h < 1)) audit.push(`body: ${pp.name} ${p.id} has an empty sprite`);
}
/** draw a puppet. o: { shadow: true, lift: px (how far it stands off the backdrop), a: alpha } */
export function draw(ctx, pp, pose = {}, o = {}) {
  audit_(pp, pose);
  const M = solve(pp, pose), sw = pose.swap || {}, hide = new Set(pose.hide || []), lift = o.lift ?? pp.lift;
  const items = pp.order.filter(p => !hide.has(p.id)).map(p => ({ p, s: sw[p.id] ? (p.alt[sw[p.id]] || p.s) : p.s })).filter(i => i.s);
  const a0 = ctx.globalAlpha; if (o.a != null) ctx.globalAlpha = a0 * o.a;
  // one shadow pass for the whole puppet (all parts), then the parts — so parts never shade each other twice
  if (o.shadow !== false && lift > 0) for (const { p, s } of items) { ctx.save(); ctx.transform(...M[p.id]); drawShadow(ctx, s, lift, o.shA); ctx.restore(); }
  for (const { p, s } of items) {
    ctx.save(); ctx.transform(...M[p.id]); put(ctx, s);
    if (o.extra && o.extra[p.id]) o.extra[p.id](ctx);   // something held or worn on this part (drawn in the part's local px)
    ctx.restore();
  }
  ctx.globalAlpha = a0;
  return M;
}
function drawShadow(ctx, s, lift, shA = .4) {
  if (!s.sh) return;
  const m = ctx.getTransform(), [lx, ly] = opts.light, k = lift / 10, d = 1 / s.k;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(lx * k * opts.res, ly * k * opts.res); ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.globalAlpha *= shA; ctx.drawImage(s.sh.c, s.x0 - s.pad - s.sh.pad * d, s.y0 - s.pad - s.sh.pad * d, s.sh.c.width * d, s.sh.c.height * d); ctx.restore();
}

// ── the standard two-legged rig ──
/**
 * biped(o) — a two-legged cut-out puppet with the standard joints (hip → torso → head; thighs → shins → feet; arms → forearms),
 * facing right. You design the look for the topic: o.paintHead(ctx) and o.paintTorso(ctx) paint those parts in their local px (head pin =
 * the neck at [0, 0], drawn upward; torso pin = the hip at [0, 0], drawn up to the neck at [0, -torso]); limbs are cut from
 * o.colours unless you pass painters (o.paintThigh, o.paintShin, o.paintFoot, o.paintArm, o.paintFore: (ctx, near) => …,
 * each drawn from its pin down +y to the next joint at its length; a foot points +x).
 *   o = { name, torso: 120 (hip → neck px), hipW: 14, thigh: 62, shin: 58, foot: 34, arm: 56, fore: 52,
 *         limbW: 13 (limb half-width at the top), shoulder: [8, 10] (from the neck, forward / down),
 *         colours: { leg, legFar, sleeve, sleeveFar, hand, shoe }, headBounds, torsoBounds, alts: { head: { blink: fn } }, res,
 *         z: { partId: drawOrder } overrides (a long coat hides the near thigh: { thighN: -5 }), extraParts: [tail, ears …] }
 * The far limbs get a darker paper (colours.*Far or a toned copy) so the two sides never merge.
 */
export function biped(o) {
  const L = { torso: 120, hipW: 12, thigh: 62, shin: 58, foot: 34, arm: 56, fore: 52, limbW: 13, shoulder: [6, 12], ...o };
  const C = { leg: '#3e4a6b', sleeve: '#3e4a6b', hand: '#e9c9a6', shoe: '#5a3a2e', ...(o.colours || {}) };
  const far = (k) => C[k + 'Far'] || tone(C[k], -.22);
  const w = L.limbW, pieceO = { rim: 2.4, light: .3 };
  const thigh = near => o.paintThigh ? c => o.paintThigh(c, near) : c => piece(c, capsule(0, 0, 0, L.thigh, w, w * .82), near ? C.leg : far('leg'), pieceO);
  const shin = near => o.paintShin ? c => o.paintShin(c, near) : c => piece(c, capsule(0, 0, 0, L.shin, w * .82, w * .66), near ? C.leg : far('leg'), pieceO);
  const foot = near => o.paintFoot ? c => o.paintFoot(c, near) : c => { const col = near ? C.shoe : far('shoe'); piece(c, [[-w * .9, -6], [L.foot * .55, -6], [L.foot, 4], [L.foot * .98, 11], [-w * .9, 11]], col, pieceO); };
  const arm = near => o.paintArm ? c => o.paintArm(c, near) : c => piece(c, capsule(0, 0, 0, L.arm, w * .9, w * .75), near ? C.sleeve : far('sleeve'), pieceO);
  const fore = near => o.paintFore ? c => o.paintFore(c, near) : c => {
    piece(c, capsule(0, 0, 0, L.fore - 6, w * .75, w * .65), near ? C.sleeve : far('sleeve'), pieceO);
    piece(c, capsule(0, L.fore - 4, 4, L.fore + 8, w * .72, w * .6), near ? C.hand : far('hand'), { ...pieceO, rim: 1.6 });
  };
  const lb = r => [-r - 4, -r - 4, r + 4, r + 4];
  const ext = (len, r) => [-r - 4, -r - 4, r + 4, len + r + 4];
  const sh = L.shoulder, neck = [0, -L.torso];
  const parts = [
    { id: 'hip', bounds: [-2, -2, 2, 2], paint: () => { }, z: 0 },
    { id: 'thighF', parent: 'hip', at: [-L.hipW * .3, -4], z: -30, bounds: ext(L.thigh, w), paint: thigh(false) },
    { id: 'shinF', parent: 'thighF', at: [0, L.thigh], z: -29, bounds: ext(L.shin, w), paint: shin(false) },
    { id: 'footF', parent: 'shinF', at: [0, L.shin], z: -28, bounds: [-w - 6, -10, L.foot + 6, 16], paint: foot(false), sole: [[-w * .6, 11], [L.foot * .95, 11]] },
    { id: 'armF', parent: 'torso', at: [neck[0] + sh[0] - 4, neck[1] + sh[1]], z: -20, bounds: ext(L.arm, w), paint: arm(false) },
    { id: 'foreF', parent: 'armF', at: [0, L.arm], z: -19, bounds: ext(L.fore + 10, w), paint: fore(false) },
    { id: 'torso', parent: 'hip', at: [0, 0], z: 0, bounds: o.torsoBounds || [-50, -L.torso - 20, 50, 30], paint: o.paintTorso },
    { id: 'head', parent: 'torso', at: neck, z: 10, bounds: o.headBounds || [-70, -130, 70, 20], paint: o.paintHead, alts: (o.alts || {}).head },
    { id: 'thighN', parent: 'hip', at: [L.hipW * .3, 0], z: 20, bounds: ext(L.thigh, w), paint: thigh(true) },
    { id: 'shinN', parent: 'thighN', at: [0, L.thigh], z: 21, bounds: ext(L.shin, w), paint: shin(true) },
    { id: 'footN', parent: 'shinN', at: [0, L.shin], z: 22, bounds: [-w - 6, -10, L.foot + 6, 16], paint: foot(true), sole: [[-w * .6, 11], [L.foot * .95, 11]] },
    { id: 'armN', parent: 'torso', at: [neck[0] + sh[0], neck[1] + sh[1]], z: 30, bounds: ext(L.arm, w), paint: arm(true) },
    { id: 'foreN', parent: 'armN', at: [0, L.arm], z: 31, bounds: ext(L.fore + 10, w), paint: fore(true) },
  ];
  // torso is listed before its children in solve order: reorder so parents come first
  const ord = ['hip', 'torso', 'head', 'thighF', 'shinF', 'footF', 'thighN', 'shinN', 'footN', 'armF', 'foreF', 'armN', 'foreN'];
  const list = ord.map(id => parts.find(p => p.id === id));
  for (const [id, z] of Object.entries(o.z || {})) { const q = list.find(p => p.id === id); if (q) q.z = z; }   // e.g. a long coat: { thighN: -5, shinN: -4, footN: -3 }
  for (const p of o.extraParts || []) list.push(p);   // tails, ears that flop, a satchel flap … (parent + at + z + lim)
  return puppet({ name: o.name, res: o.res, standard: true, lift: o.lift, shadow: o.shadow, scale: o.scale, parts: list, lengths: L });
}

// ── poses for the standard biped (angle maps; merge with {...a, ...b}) ──
export const stand = (o = {}) => ({ torso: o.lean ?? 0, head: o.nod ?? 0, thighN: -3, shinN: 4, footN: -1, thighF: 4, shinF: 3, footF: -7, armN: o.armN ?? 8, foreN: o.foreN ?? -14, armF: o.armF ?? -6, foreF: o.foreF ?? -12 });
/**
 * a walk cycle at phase p (0…1, one full stride of both legs). o = { stride: 26 (hip swing °), knee: 48, arms: 22, lean: 4, bounce }
 * The feet are planted by the rig (pose.ground); move the puppet at walkSpeed(pp, o) px per cycle so the stance foot does not slide.
 */
export function walk(p, o = {}) {
  const A = o.stride ?? 26, K = o.knee ?? 48, B = o.arms ?? 22, s = Math.sin(p * Math.PI * 2), c = Math.cos(p * Math.PI * 2);
  const leg = (sn, cn) => {
    const thigh = -A * sn;                                   // −: forward
    const knee = 6 + K * Math.max(0, cn) ** 1.4;             // swing phase (leg travelling forward) bends the knee
    const foot = clamp(-(thigh + knee) * .85 + (sn > .6 ? -8 * (sn - .6) / .4 : 0), -40, 45); // keep the sole level, toe up at heel strike
    return [thigh, knee, foot];
  };
  const [tn, kn, fn] = leg(s, c), [tf, kf, ff] = leg(-s, -c);
  return { torso: o.lean ?? 4, head: (o.nod ?? 0) + Math.sin(p * Math.PI * 4) * 1.5, thighN: tn, shinN: kn, footN: fn, thighF: tf, shinF: kf, footF: ff,
    armN: B * s + (o.armN ?? 0), foreN: -14 - 10 * Math.max(0, -s) + (o.foreN ?? 0), armF: -B * s + (o.armF ?? 0), foreF: -14 - 10 * Math.max(0, s) + (o.foreF ?? 0) };
}
/** px the puppet must travel per walk cycle so the planted foot stays put (measured on the rig) */
export function walkSpeed(pp, o = {}) {
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < 24; i++) { const ps = { angles: walk(i / 24, o), ground: 0 }; const [x] = where(pp, ps, 'footN', [0, 0]); lo = Math.min(lo, x); hi = Math.max(hi, x); }
  return (hi - lo) * 2;
}
/** blend two angle maps (k 0 → a, 1 → b) */
export function blend(a, b, k) { const out = { ...a }; for (const id in b) out[id] = (a[id] ?? 0) + ((b[id] ?? 0) - (a[id] ?? 0)) * k; return out; }

/** a cast sheet page helper: draw puppet pp facing both ways in a list of poses [label, angles, poseExtra, drawOpts], pins marked */
export function sheet(ctx, pp, poses, o = {}) {
  const cw = o.cw || 300, gy = o.gy || 380, x0 = o.x0 || 40, y0 = o.y0 || 0;
  poses.forEach(([label, angles, extra = {}, dopt = {}], i) => {
    for (const f of [1, -1]) {
      const col = i * 2 + (f === 1 ? 0 : 1), cx = x0 + (col % (o.cols || 8)) * cw + cw / 2, row = Math.floor(col / (o.cols || 8)), gl = y0 + gy + row * (o.rowH || 440);
      ctx.save(); ctx.fillStyle = 'rgba(60,40,50,.18)'; ctx.fillRect(cx - cw / 2 + 12, gl, cw - 24, 2); ctx.restore();
      draw(ctx, pp, { x: cx, ground: gl, angles, ...extra, facing: f * Math.abs(extra.facing ?? 1) }, dopt);
      ctx.save(); ctx.font = '600 15px system-ui, sans-serif'; ctx.fillStyle = '#4a3a40'; ctx.textAlign = 'center';
      ctx.fillText(`${label} · ${f === 1 ? 'right →' : '← left'}`, cx, gl + 30); ctx.restore();
      if (o.pins) { const M = solve(pp, { x: cx, ground: gl, angles, ...extra, facing: f * Math.abs(extra.facing ?? 1) }); for (const p of pp.parts) { const [px, py] = [M[p.id][4], M[p.id][5]]; ctx.save(); ctx.fillStyle = 'rgba(200,160,60,.9)'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    }
  });
}

/**
 * bipedParts(imgs, o) — the standard biped from parts cut out of a sheet (P.parts(manifest, { pivots })). imgs holds sprites named
 * by the standard ids: head (pivot 'bottom' = the neck), torso (pivot 'bottom' = the hip; its top pin = the neck), armN, foreN,
 * thighN, shinN (pivot 'top'; the far end's pin is where the next part goes), footN (pivot at the ankle, toe → +x), and optionally
 * armF, foreF, thighF, shinF, footF (else a darker copy of the near part), plus anything in o.extraParts. All drawn facing right.
 * o = { name, shoulder: [x, y] (from the neck pin), hipW, z, extraParts, lift, sole: px below the ankle pin to the sole,
 *       neck: [x, y] (the torso's top pin, if its pivot was given as a point), joints: { armN: [0, 50], … } (override a part's far pin) }
 */
export function bipedParts(imgs, o = {}) {
  const need = ['head', 'torso', 'armN', 'foreN', 'thighN', 'shinN', 'footN'];
  for (const k of need) if (!imgs[k]) throw new Error(`${o.name}: bipedParts needs a "${k}" part (have: ${Object.keys(imgs).join(', ')})`);
  const J = o.joints || {}; for (const [k, v] of Object.entries(J)) if (imgs[k]) imgs[k] = { ...imgs[k], joint: v };
  const far = k => imgs[k.replace('N', 'F')] || darker(imgs[k]);
  const neck = o.neck || imgs.torso.joint, sh = o.shoulder || [0, 14], hw = o.hipW ?? 10;
  const footSole = o.sole ?? (imgs.footN.y0 + imgs.footN.h - 3);
  const P_ = (id, parent, at, z, img, extra = {}) => ({ id, parent, at, z, img, ...extra });
  const list = [
    P_('hip', null, [0, 0], 0, null),
    P_('torso', 'hip', [0, 0], 0, imgs.torso),
    P_('head', 'torso', neck, 10, imgs.head),
    P_('thighF', 'hip', [-hw * .3, -4], -30, far('thighN')), P_('shinF', 'thighF', imgs.thighN.joint, -29, far('shinN')),
    P_('footF', 'shinF', imgs.shinN.joint, -28, far('footN'), { sole: [[imgs.footN.x0 + 4, footSole], [imgs.footN.x0 + imgs.footN.w - 4, footSole]] }),
    P_('thighN', 'hip', [hw * .3, 0], 20, imgs.thighN), P_('shinN', 'thighN', imgs.thighN.joint, 21, imgs.shinN),
    P_('footN', 'shinN', imgs.shinN.joint, 22, imgs.footN, { sole: [[imgs.footN.x0 + 4, footSole], [imgs.footN.x0 + imgs.footN.w - 4, footSole]] }),
    P_('armF', 'torso', [neck[0] + sh[0] - 4, neck[1] + sh[1]], -20, far('armN')), P_('foreF', 'armF', imgs.armN.joint, -19, far('foreN')),
    P_('armN', 'torso', [neck[0] + sh[0], neck[1] + sh[1]], 30, imgs.armN), P_('foreN', 'armN', imgs.armN.joint, 31, imgs.foreN),
  ];
  for (const [id, z] of Object.entries(o.z || {})) { const q = list.find(p => p.id === id); if (q) q.z = z; }
  for (const p of o.extraParts || []) list.push(p);
  return puppet({ name: o.name, standard: true, lift: o.lift, scale: o.scale, parts: list });
}
