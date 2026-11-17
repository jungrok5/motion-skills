// shadow-critter-vignette · critter.js — the little shadow: a body of flat ink with two white eyes and one colour it wears.
// Everything black is one silhouette, so overlaps never need sorting; only the eyes and the accent (a skirt, shorts, a
// scarf, a bag, a hat) are drawn in order. The body is a rig: a big head, a small torso, thin arms and legs as two-bone
// chains. Limbs are posed in the body's own frame (forward / out / down) and turned with the facing, so a profile shows a
// forward swing and a front view shows it foreshortened. Legs are IK to feet the vignette places on the floor, so a planted
// foot is exactly where the walk put it.
//
// Local units: px at the room's reference depth; origin on the floor under the pelvis; y up is negative; lengths in head
// radii `a`. Facing `yaw`: 0 faces the camera, +π/2 faces screen right, ±π shows the back.
import * as P from './paint.js';

export const CRITTER = {
  name: 'critter', a: 50, mass: 'light', seed: 1,
  ink: '#17131a',
  head: { w: 1.1, h: .94, cheeks: .12 },
  ears: { type: 'cat', size: 1, spread: .62 },           // cat | bear | rabbit | mouse | fox | sprout | antenna | none
  eyes: { w: .25, h: .36, gap: .4, y: .06, pupil: 'oval', white: '#f7f2e8' }, // pupil: oval | dot | none
  whiskers: 2,
  body: { w: .8, h: 1.0 },
  legs: { thigh: .5, shin: .5, w: .15 },
  arms: { upper: .74, fore: .7, w: .13 },
  tail: { type: 'cat', len: 1.5, w: .13 },              // cat | fox | puff | none
  wear: { type: 'skirt', color: '#5d9a7c', len: .52 },   // skirt | shorts | scarf | bag | hat | none
};
/** joint limits (radians) — the vignette's rig report checks every frame against these */
export const JOINTS = { knee: [0, 2.5], elbow: [0, 2.6], neckTurn: 1.45, neckTilt: .5, shoulder: [-.6, 3.1], hipSwing: [-1.0, 1.1] };

const merge = (a, b) => { if (!b) return a; const o = { ...a }; for (const k of Object.keys(b)) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? merge(a[k], b[k]) : b[k]; return o; };

let tileCache = new Map();
function clothTile(color, seed) { // the accent colour as a small painted tile, so it is never a flat fill
  const k = color + '|' + seed; if (tileCache.has(k)) return tileCache.get(k);
  const c = P.canvas(80, 80), g = c.getContext('2d');
  P.gouache(g, [[-6, -6], [86, -6], [86, 86], [-6, 86]], { color, seed, mottle: .9, edge: 0, roughness: 0 });
  P.tooth(g, [0, 0, 80, 80], .12, 0, seed + 1);
  tileCache.set(k, c); return c;
}

export class Critter {
  constructor(spec = {}) {
    this.spec = merge(CRITTER, spec); this.name = this.spec.name; this.a = this.spec.a; this.buf = null; this.rimBuf = null;
  }
  geom() {
    const S = this.spec, a = this.a, hipY = -(S.legs.thigh + S.legs.shin) * .965 * a;
    const shY = hipY - S.body.h * a, headY = shY - S.head.h * a * .78;
    return { a, hipY, shY, headY, top: headY - S.head.h * a - (S.ears.type === 'rabbit' ? 1.4 : S.ears.type === 'none' ? 0 : .6) * a * S.ears.size, hipGap: .17 * a };
  }
}

/** two-bone IK in 2D (screen y down). bend ±1 picks the side of the middle joint. */
export function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  const base = Math.atan2(dy, dx), a1 = Math.acos(P.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = base - bend * a1, mid = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
  return { mid, end: [root[0] + Math.cos(base) * d, root[1] + Math.sin(base) * d], reach: Math.hypot(dx, dy) / (l1 + l2) };
}

const capsule = (ctx, p0, p1, w) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy); ctx.save(); ctx.translate(p0[0], p0[1]); ctx.rotate(Math.atan2(dy, dx)); ctx.beginPath(); ctx.roundRect(-w / 2, -w / 2, L + w, w, w / 2); ctx.fill(); ctx.restore(); };
const poly = (ctx, pts) => { P.path(ctx, pts); ctx.fill(); };

/**
 * drawCritter(ctx, C, pose, env) — draws the critter into ctx (screen space) and returns its joints (screen).
 * pose: X, Z (floor), yaw, feet [{ X, Z, lift, tip }] (0 = its left foot, 1 = its right), pelvis [dx, dy] (local px),
 *   lean (rad, towards the facing), arms { L, R }: { a (swing, 0 = down, + forward), out (sideways), e (elbow bend) } or
 *   { target: [sx, sy] screen, w (0..1 IK weight) } layered over FK, head { turn, tilt, nod, gaze [gx, gy] −1..1, blink
 *   0..1, lid 0..1 (heavy lids), squint }, tiptoe 0..1, breath (−1..1), tail (rad), flare (cloth lag, local px), squash
 * env: room (makeRoom), light [sx, sy] (where the window is on screen), shadow (0..1), rim (0..1)
 */
export function drawCritter(ctx, C, pose, env = {}) {
  const R = env.room, S = C.spec, a = C.a, G = C.geom();
  const O = R.floor(pose.X, pose.Z), s = R.scaleAt(pose.Z);
  const yaw = pose.yaw ?? 0, Fx = Math.sin(yaw), Rx = -Math.cos(yaw), dir = Math.sign(Fx) || 1, prof = Math.abs(Fx);
  const br = pose.breath || 0, hd = pose.head || {}, sq = pose.squash || 0;
  // offscreen buffer for the silhouette (screen pixels around the critter)
  const bw = Math.ceil(a * s * 9), bh = Math.ceil(a * s * 9.5), bx = Math.floor(O[0] - bw / 2), by = Math.floor(O[1] - bh * .82);
  if (!C.buf || C.buf.width < bw || C.buf.height < bh) { C.buf = P.canvas(bw, bh); C.rimBuf = P.canvas(bw, bh); C.shBuf = P.canvas(bw, bh); }
  const g = C.buf.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.buf.width, C.buf.height);
  const toScr = p => [O[0] + p[0] * s, O[1] + p[1] * s];
  g.setTransform(s, 0, 0, s, O[0] - bx, O[1] - by);
  const ink = P.css(S.ink); g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';

  // ── lower body: pelvis, hips, feet (IK) ──
  const tip = pose.tiptoe || 0;
  const pel = [(pose.pelvis?.[0] || 0), G.hipY + (pose.pelvis?.[1] || 0) - tip * .08 * a];
  const hips = [[pel[0] - Rx * G.hipGap, pel[1]], [pel[0] + Rx * G.hipGap, pel[1]]];
  const feetL = (pose.feet || [{ X: pose.X - Rx * 20, Z: pose.Z }, { X: pose.X + Rx * 20, Z: pose.Z }]).map(f => { const q = R.floor(f.X, f.Z); return [(q[0] - O[0]) / s, (q[1] - O[1]) / s - (f.lift || 0)]; });
  const ankleH = .05 * a, L1 = S.legs.thigh * a, L2 = S.legs.shin * a, joints = { hips: [], knees: [], ankles: [], feet: [], shoulders: [], elbows: [], hands: [], kneeBend: [], elbowBend: [], reach: [] };
  // near foot = the one closer to the camera (smaller Z): drawn last; with a silhouette only the order of colour matters
  const legs = [0, 1].map(i => {
    const f = feetL[i], tipRaise = (pose.feet?.[i]?.tip ?? tip) * .06 * a, ank = [f[0], f[1] - ankleH - tipRaise];
    const k = ik(hips[i], ank, L1, L2, dir);
    // the knee's sideways offset is what a profile shows; front-on it folds towards the camera (foreshortened)
    const line = P.lp(hips[i], k.end, L1 / (L1 + L2)), kk = P.lp(line, k.mid, Math.max(.18, prof));
    const v1 = [k.mid[0] - hips[i][0], k.mid[1] - hips[i][1]], v2 = [k.end[0] - k.mid[0], k.end[1] - k.mid[1]];
    const bend = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]));
    const cross = (v1[0] * v2[1] - v1[1] * v2[0]) * dir; // > 0: shin folds back (correct for a profile facing dir)
    return { hip: hips[i], knee: kk, ankle: k.end, foot: f, bend, cross, reach: k.reach, tipRaise };
  });

  // ── upper body frame: lean about the pelvis (a profile shows it; front-on it reads as a small dip) ──
  const lean = pose.lean || 0, up = new DOMMatrix().translate(pel[0], pel[1]).rotate(lean * Fx * 180 / Math.PI).scale(1, 1 - Math.abs(lean) * (1 - prof) * .12 - sq * .12 + br * .012).translate(-pel[0], -pel[1]);
  const U = p => { const q = up.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
  const tw = S.body.w * a * (.78 + .22 * Math.abs(Rx)), torsoTop = G.shY + (pose.pelvis?.[1] || 0) - tip * .08 * a;
  const torso = [[pel[0] - tw * .42, torsoTop + .12 * a], [pel[0] + tw * .42, torsoTop + .12 * a], [pel[0] + tw * .56, pel[1] + .12 * a], [pel[0] - tw * .56, pel[1] + .12 * a]].map(U);

  // ── arms: FK in the body frame, optional IK towards a screen target ──
  const shoulders = [-1, 1].map(sd => U([pel[0] + sd * Rx * tw * .4 + Fx * .02 * a, torsoTop + .2 * a]));
  const arms = ['L', 'R'].map((w, i) => {
    const A = pose.arms?.[w] || {}, sd = i ? 1 : -1, sh = shoulders[i];
    const la = A.a ?? .08, out = A.out ?? .12, e = A.e ?? .4, l1 = S.arms.upper * a, l2 = S.arms.fore * a;
    const dirv = (ang, o) => { const f = Math.sin(ang) * Math.cos(o), side = Math.sin(o), down = Math.cos(ang) * Math.cos(o); return [f * Fx + side * sd * Rx, down]; };
    const rot = lean * Fx; // arms hang from the leaned torso
    const rr = v => [v[0] * Math.cos(rot) - v[1] * Math.sin(rot), v[0] * Math.sin(rot) + v[1] * Math.cos(rot)];
    let el = P.lp(sh, [sh[0] + rr(dirv(la, out))[0] * l1, sh[1] + rr(dirv(la, out))[1] * l1], 1), hand = [el[0] + rr(dirv(la + e, out))[0] * l2, el[1] + rr(dirv(la + e, out))[1] * l2];
    let reach = 0;
    if (A.target && (A.w ?? 1) > 0) {
      const tl = [(A.target[0] - O[0]) / s, (A.target[1] - O[1]) / s];
      const k = ik(sh, tl, l1, l2, A.bend ?? -(Math.sign(tl[0] - sh[0]) || dir));
      const w2 = P.clamp(A.w ?? 1); el = P.lp(el, k.mid, w2); hand = P.lp(hand, k.end, w2); reach = k.reach;
    }
    const v1 = [el[0] - sh[0], el[1] - sh[1]], v2 = [hand[0] - el[0], hand[1] - el[1]];
    const bend = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]));
    return { sh, el, hand, bend, reach, near: Rx * sd < 0 ? true : false };
  });
  // which arm is nearer the camera: the one on the side facing the viewer
  // facing right (Fx > 0) the viewer sees the right side → the right arm (1) is near; front / back: both at the sides
  const near = Fx > .15 ? 1 : Fx < -.15 ? 0 : -1;

  // ── head ──
  const hTurn = P.clamp(hd.turn || 0, -JOINTS.neckTurn, JOINTS.neckTurn), hy = yaw + hTurn, hFx = Math.sin(hy), hRx = -Math.cos(hy);
  const neck = U([pel[0] + Fx * .03 * a, torsoTop + .02 * a]);
  const tilt = P.clamp((hd.tilt || 0) + (hd.nod || 0) * Math.sin(hy) * .9, -JOINTS.neckTilt * 1.6, JOINTS.neckTilt * 1.6);
  const rx = S.head.w * a * (.92 + .08 * Math.abs(hRx)), ry = S.head.h * a;
  const hc0 = [neck[0] + hFx * .04 * a, neck[1] - ry * .78 - br * .015 * a - (hd.rise || 0)];
  const HM = new DOMMatrix().translate(neck[0], neck[1]).rotate((tilt + lean * Fx * .4) * 180 / Math.PI).translate(-neck[0], -neck[1]);
  const H = p => { const q = HM.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
  const hc = H(hc0);
  // a feature on the head's surface at azimuth az (0 = the face) and elevation el (up +)
  const feat = (az, el, k = 1) => { const t = az + hy; return { p: H([hc0[0] + rx * k * Math.sin(t) * Math.cos(el), hc0[1] - ry * k * Math.sin(el)]), facing: Math.cos(t) }; };
  // nod up / down shifts the face a little on the head
  const faceDy = -(hd.nod || 0) * .12 * a;

  // ── draw: tail, far arm, legs, torso, (wear), head + ears, near arm, (eyes), whiskers ──
  const tailBase = U([pel[0] - Fx * .3 * a, pel[1] - .05 * a]);
  if (S.tail.type !== 'none') {
    const T = S.tail, sw = (pose.tail || 0), back = -dir * (prof > .2 ? 1 : .5);
    const pts = [tailBase, [tailBase[0] + back * .5 * a * T.len * .6, tailBase[1] + .05 * a], [tailBase[0] + back * (.9 + sw * .3) * a * T.len * .6, tailBase[1] - .5 * a * T.len * .6], [tailBase[0] + back * (.7 + sw) * a * T.len * .6 + sw * .4 * a, tailBase[1] - 1.05 * a * T.len * .6]];
    if (T.type === 'puff') { g.beginPath(); g.arc(tailBase[0] + back * .25 * a, tailBase[1] - .05 * a, .22 * a, 0, 7); g.fill(); }
    else { const sp = P.spline(pts, 2); g.lineWidth = (T.type === 'fox' ? T.w * 2.2 : T.w) * a; g.beginPath(); sp.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); if (T.type === 'fox') { const e = sp[sp.length - 1]; g.beginPath(); g.ellipse(e[0], e[1], .2 * a, .28 * a, 0, 0, 7); g.fill(); } }
  }
  const drawArm = (A, w) => { g.fillStyle = ink; capsule(g, A.sh, A.el, w); capsule(g, A.el, A.hand, w * .92); g.beginPath(); g.arc(A.hand[0], A.hand[1], w * .8, 0, 7); g.fill(); };
  const armW = S.arms.w * a;
  if (near === -1) { /* front / back: both arms at the sides, draw after torso */ } else drawArm(arms[1 - near], armW);
  for (const L of legs) { g.fillStyle = ink; capsule(g, L.hip, L.knee, S.legs.w * a); capsule(g, L.knee, L.ankle, S.legs.w * a * .9);
    // the foot: a small oval pointing where it faces (front-on: a round toe towards the camera)
    const fl = .17 * a * (.45 + .55 * prof), f0 = [L.ankle[0], L.ankle[1] + ankleH * .5]; g.beginPath(); g.ellipse(f0[0] + Fx * fl * .6, f0[1], fl + .07 * a, .085 * a, 0, 0, 7); g.fill(); }
  // torso: a small soft bean
  P.path(g, P.spline(torso, 4, true)); g.fill();
  // ── wear (colour) ──
  const W = S.wear || {}, accent = W.color || '#5d9a7c';
  const cloth = (pts, seed) => { g.save(); const pat = g.createPattern(clothTile(P.css(accent), seed), 'repeat'); pat.setTransform(new DOMMatrix().scale(1 / s * .8)); P.path(g, pts); g.fillStyle = P.css(accent); g.fill(); g.fillStyle = pat; g.fill();
    // the side away from the light a shade deeper
    g.clip(); const lx = env.light ? Math.sign((env.light[0] - O[0])) : 1; const bb = P.bounds(pts); const gr = g.createLinearGradient(bb[0], 0, bb[2], 0); gr.addColorStop(lx > 0 ? 0 : 1, P.css(P.shade(accent, -.35), .55)); gr.addColorStop(lx > 0 ? 1 : 0, P.css(P.shade(accent, .15), .2)); g.fillStyle = gr; g.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); g.restore(); };
  const flare = pose.flare || 0;
  if (W.type === 'skirt') { const top = pel[1] - .3 * a, bot = pel[1] + (W.len ?? .52) * a, wt = tw * .5, wb = tw * (.72 + .08 * Math.abs(Rx)); cloth([U([pel[0] - wt, top]), U([pel[0] + wt, top]), U([pel[0] + wb + flare * .5, bot + Math.abs(flare) * .1]), U([pel[0] + flare * .2, bot + .05 * a]), U([pel[0] - wb + flare * .5, bot - Math.abs(flare) * .05])], 3); }
  else if (W.type === 'shorts') { const top = pel[1] - .25 * a; cloth([U([pel[0] - tw * .55, top]), U([pel[0] + tw * .55, top]), U([pel[0] + tw * .58, pel[1] + .3 * a]), U([pel[0] + .04 * a, pel[1] + .3 * a]), U([pel[0], pel[1] + .12 * a]), U([pel[0] - .04 * a, pel[1] + .3 * a]), U([pel[0] - tw * .58, pel[1] + .3 * a])], 3); }
  else if (W.type === 'bag') { const sA = shoulders[0], hipS = U([pel[0] + Rx * tw * .55, pel[1] - .1 * a]); g.save(); g.strokeStyle = P.css(P.shade(accent, -.2)); g.lineWidth = .07 * a; g.beginPath(); g.moveTo(...sA); g.lineTo(...hipS); g.stroke(); g.restore(); const bc = [hipS[0] + Rx * .05 * a, hipS[1] + .12 * a]; cloth(P.ellipse(bc[0], bc[1], .3 * a, .24 * a, 18), 5); }
  // scarf goes under the head
  if (W.type === 'scarf') { const n0 = U([pel[0], torsoTop + .1 * a]); cloth([[n0[0] - tw * .55, n0[1] - .12 * a], [n0[0] + tw * .55, n0[1] - .12 * a], [n0[0] + tw * .5, n0[1] + .14 * a], [n0[0] - tw * .5, n0[1] + .14 * a]], 7); const back = -dir * (prof > .2 ? 1 : .3), fl2 = flare * .6; cloth([[n0[0] + back * .1 * a, n0[1]], [n0[0] + back * .25 * a, n0[1]], [n0[0] + back * (.55 + Math.abs(fl2) * .02) * a, n0[1] + .55 * a - fl2], [n0[0] + back * .38 * a, n0[1] + .6 * a - fl2]], 9); }

  // head shape: an ellipse with a little cheek fullness low on the sides; ears
  g.fillStyle = ink;
  const head = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2, ch = Math.max(0, Math.sin(t)) * Math.pow(Math.abs(Math.cos(t)), 2) * S.head.cheeks; head.push(H([hc0[0] + Math.cos(t) * rx * (1 + ch), hc0[1] + Math.sin(t) * ry * (1 - ch * .2)])); }
  P.path(g, head); g.fill();
  const E = S.ears, es = E.size ?? 1;
  const earAt = (sd, el, k = 1) => { const f = feat(sd * Math.PI / 2, el, k); return f.p; };
  for (const sd of [-1, 1]) {
    const el = E.spread ?? .62, base = earAt(sd, el * 1.0, .96), nrm = Math.atan2(base[1] - hc[1], base[0] - hc[0]) + (sd * Math.cos(hy) * 0);
    const nx = Math.cos(nrm), ny = Math.sin(nrm), tx = -ny, ty = nx;
    if (E.type === 'cat' || E.type === 'fox') { const bw2 = (E.type === 'fox' ? .38 : .33) * a * es, h2 = (E.type === 'fox' ? .75 : .58) * a * es, tipP = [base[0] + nx * h2 + tx * .05 * a * sd, base[1] + ny * h2]; poly(g, [[base[0] - tx * bw2 - nx * .15 * a, base[1] - ty * bw2 - ny * .15 * a], [tipP[0], tipP[1]], [base[0] + tx * bw2 - nx * .15 * a, base[1] + ty * bw2 - ny * .15 * a]]); }
    else if (E.type === 'bear') { g.beginPath(); g.arc(base[0] + nx * .05 * a, base[1] + ny * .05 * a, .26 * a * es, 0, 7); g.fill(); }
    else if (E.type === 'mouse') { g.beginPath(); g.arc(base[0] + nx * .2 * a, base[1] + ny * .2 * a, .42 * a * es, 0, 7); g.fill(); }
    else if (E.type === 'rabbit') { const L = 1.3 * a * es, droop = sd * (E.droop || 0); g.save(); g.translate(base[0], base[1]); g.rotate(nrm + Math.PI / 2 + droop); g.beginPath(); g.ellipse(0, -L * .5, .19 * a * es, L * .55, 0, 0, 7); g.fill(); g.restore(); }
  }
  if (E.type === 'sprout') { const top = H([hc0[0], hc0[1] - ry]); g.lineWidth = .06 * a; g.beginPath(); g.moveTo(top[0], top[1] + 4); g.quadraticCurveTo(top[0] + .1 * a, top[1] - .3 * a, top[0] + .05 * a, top[1] - .45 * a); g.stroke(); poly(g, P.ellipse(top[0] + .25 * a, top[1] - .52 * a, .24 * a, .1 * a, 14, -.4)); poly(g, P.ellipse(top[0] - .12 * a, top[1] - .46 * a, .18 * a, .08 * a, 14, .5)); }
  if (E.type === 'antenna') for (const sd of [-1, 1]) { const b = earAt(sd * .35, 1.2), t2 = [b[0] + sd * .18 * a, b[1] - .55 * a]; g.lineWidth = .05 * a; g.beginPath(); g.moveTo(...b); g.lineTo(...t2); g.stroke(); g.beginPath(); g.arc(t2[0], t2[1], .1 * a, 0, 7); g.fill(); }
  if (W.type === 'hat') { const top = H([hc0[0] - hFx * .05 * a, hc0[1] - ry * .78]), hw2 = rx * .72; cloth([[top[0] - hw2, top[1] + .1 * a], [top[0] - hw2 * .8, top[1] - .32 * a], [top[0] + hw2 * .8, top[1] - .34 * a], [top[0] + hw2 + hFx * .2 * a, top[1] + .1 * a]], 11); }

  // eyes: two white ovals on the face side; pupils lead the gaze; lids close for blinks and sit low when glum
  const Ey = S.eyes;
  const eyeOps = [];
  for (const sd of [-1, 1]) {
    const f = feat(sd * Ey.gap * 1.05, -Ey.y + faceDy / a * .0, 1); if (f.facing < .08) continue;
    const ew = Ey.w * a * (.3 + .7 * f.facing), eh = Ey.h * a, c = [f.p[0], f.p[1] + faceDy];
    eyeOps.push({ c, ew, eh, facing: f.facing });
  }
  const blink = P.clamp(hd.blink || 0), lid = P.clamp(hd.lid || 0);
  for (const e of eyeOps) {
    const h2 = e.eh * (1 - blink * .92); if (h2 < .6) { g.save(); g.strokeStyle = P.css(Ey.white, .8); g.lineWidth = .045 * a; g.beginPath(); g.moveTo(e.c[0] - e.ew * .8, e.c[1] + e.eh * .25); g.lineTo(e.c[0] + e.ew * .8, e.c[1] + e.eh * .25); g.stroke(); g.restore(); continue; }
    g.save(); g.translate(e.c[0], e.c[1] + (e.eh - h2) * .45); g.rotate(tilt);
    g.beginPath(); g.ellipse(0, 0, e.ew, h2, 0, 0, 7); g.fillStyle = P.css(Ey.white); g.fill(); g.clip();
    if (Ey.pupil !== 'none') { const gz = hd.gaze || [0, 0], px = (gz[0] * .45 + hFx * .25) * e.ew, py = gz[1] * .4 * h2; g.fillStyle = ink; g.beginPath(); if (Ey.pupil === 'dot') g.arc(px, py, Math.min(e.ew, h2) * .45, 0, 7); else g.ellipse(px, py + h2 * .05, e.ew * .5, h2 * .62, 0, 0, 7); g.fill(); }
    // heavy lid: the black of the head comes down over the top of the eye (glum, sleepy, unimpressed)
    if (lid > 0) { g.fillStyle = ink; g.beginPath(); g.rect(-e.ew * 1.2, -h2 * 1.2, e.ew * 2.4, h2 * 1.2 * (lid * 1.1)); g.fill(); }
    g.restore();
  }
  // whiskers: thin strokes from the cheeks, seen where they leave the silhouette
  if (S.whiskers) for (const sd of [-1, 1]) {
    const f = feat(sd * 1.05, -.25, .98); if (f.facing < -.55) continue;
    const ang = Math.atan2(f.p[1] - hc[1], f.p[0] - hc[0]);
    g.save(); g.strokeStyle = ink; g.lineWidth = .028 * a;
    for (let k = 0; k < S.whiskers; k++) { const aa = ang + (k - (S.whiskers - 1) / 2) * .22; g.beginPath(); g.moveTo(f.p[0] - Math.cos(aa) * .1 * a, f.p[1] - Math.sin(aa) * .1 * a); g.lineTo(f.p[0] + Math.cos(aa) * .55 * a, f.p[1] + Math.sin(aa) * .55 * a + k * .02 * a); g.stroke(); }
    g.restore();
  }
  // arms last (front / back views: both; profiles: the near one)
  if (near === -1) { drawArm(arms[0], armW); drawArm(arms[1], armW); } else drawArm(arms[near], armW);

  // ── put it in the room: cast shadow (falls away from the window), contact shadows, the silhouette, a rim of light ──
  g.setTransform(1, 0, 0, 1, 0, 0);
  const shK = env.shadow ?? .5;
  if (shK > 0) {
    const Lp = env.light || [O[0], O[1] - 600]; let dx = O[0] - Lp[0], dy = O[1] - Lp[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const k = env.shadowLen ?? .55, Oy = O[1];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = shK * .55; ctx.filter = `blur(${Math.max(1, 2.5 * s)}px)`;
    const sg = C.shBuf.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, C.shBuf.width, C.shBuf.height); sg.drawImage(C.buf, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#4a3020'; sg.fillRect(0, 0, C.shBuf.width, C.shBuf.height); sg.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, -k * dx, -k * Math.abs(dy), k * dx * Oy, Oy + k * Math.abs(dy) * Oy); ctx.drawImage(C.shBuf, bx, by);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = `blur(${Math.max(1, 2 * s)}px)`;
    for (const L of legs) { const fp = toScr([L.ankle[0], L.foot[1] + ankleH]); const lift = Math.max(0, (L.foot[1] - (L.ankle[1] + ankleH)) * 0); void lift; const hgt = Math.max(0, -((pose.feet?.[legs.indexOf(L)]?.lift) || 0)); ctx.fillStyle = P.css('#3a2418', .35 * shK / (1 + hgt * .05)); ctx.beginPath(); ctx.ellipse(fp[0] + Fx * .05 * a * s, fp[1] + ((pose.feet?.[legs.indexOf(L)]?.lift) || 0) * s, .3 * a * s, .07 * a * s, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  ctx.drawImage(C.buf, bx, by);
  const rimK = env.rim ?? .6;
  if (rimK > 0 && env.light) {
    const Lp = env.light, d = Math.hypot(Lp[0] - O[0], Lp[1] - (O[1] - 2 * a * s)) || 1, ox = (Lp[0] - O[0]) / d, oy = (Lp[1] - (O[1] - 2 * a * s)) / d;
    const rg = C.rimBuf.getContext('2d'), off = Math.max(1.2, 2.2 * s);
    rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, C.rimBuf.width, C.rimBuf.height); rg.globalCompositeOperation = 'source-over'; rg.drawImage(C.buf, 0, 0);
    rg.globalCompositeOperation = 'destination-out'; rg.drawImage(C.buf, -ox * off, -oy * off);
    rg.globalCompositeOperation = 'source-in'; rg.fillStyle = P.css(env.rimColor || R.light.color); rg.fillRect(0, 0, C.rimBuf.width, C.rimBuf.height); rg.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = rimK; ctx.drawImage(C.rimBuf, bx, by); ctx.restore();
  }

  // joints (screen) for the checks
  for (const L of legs) { joints.hips.push(toScr(L.hip)); joints.knees.push(toScr(L.knee)); joints.ankles.push(toScr(L.ankle)); (joints.toes = joints.toes || []).push(toScr([L.ankle[0], L.ankle[1] + ankleH + L.tipRaise])); joints.feet.push(toScr([L.foot[0], L.foot[1]])); joints.kneeBend.push(L.bend); joints.reach.push(L.reach); joints.kneeCross = (joints.kneeCross || []).concat(L.cross); }
  for (const A of arms) { joints.shoulders.push(toScr(A.sh)); joints.elbows.push(toScr(A.el)); joints.hands.push(toScr(A.hand)); joints.elbowBend.push(A.bend); }
  joints.head = toScr(hc); joints.origin = O; joints.scale = s; joints.headTurn = hTurn; joints.prof = prof; joints.dir = dir;
  joints.bbox = [bx, by, bx + bw, by + bh];
  return joints;
}
