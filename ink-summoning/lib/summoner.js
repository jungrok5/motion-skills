// ink-summoning · summoner.js — the masked figure with the giant brush: a keyframed pose → a 3D rig (joints, staff,
// brush) → drawn as tubes, cloth and hair from any camera angle. The brush tip's path over time IS the ink stroke
// (trace()), so the ink always leaves the brush exactly where it is.
//
//   const hero = summoner({ mask: 'oni', keys: moves([[0, 'ready'], [.6, 'coil', { yaw: .4 }], [1.1, 'sweepR', …]]) })
//   hero.rig(t)                    joints + staff for time t (pure)
//   hero.trace(t0, t1, o)          { pts, wid } — the ribbon the brush lays between t0 and t1 (o.reach flings it wider)
//   drawSummoner(ctx, v, hero, t)  (the Film calls this for you through w.summoner(hero))
//
// Pose params (all keyable; angles in radians; yaw 0 faces +z):
//   x, z      position on the floor            yaw    body facing (keep it continuous — spins go past 2π)
//   crouch    0 standing … 1 deep stance        jump   lift off the floor (m)
//   lean      torso pitch forward               side   torso roll            twist  chest yaw relative to hips
//   stance    feet apart (m)                    step   left foot forward (m; negative = right foot forward)
//   sY, sP    staff yaw (relative to the chest) and pitch — where the brush points
//   gx,gy,gz  where the hands hold the staff, relative to the chest (right, up, forward; m)
//   look, lookP  head yaw / pitch relative to the chest
import { clamp, lerp, keys, v3, dir, ik, noise2, sn, hash, TAU, smooth } from './core.js';
import { tube, blob, soft3, taper, line3, depth, facing, cpos } from './shape.js';
import { INK } from './ink.js';
import { brush } from './beasts.js';

export const DEFAULT_POSE = { x: 0, z: 0, yaw: 0, crouch: .25, jump: 0, lean: .12, side: 0, twist: 0, stance: .6, step: .22, sY: .5, sP: -.35, gx: .05, gy: -.12, gz: .32, look: 0, lookP: 0 };

// named poses: partial param sets; moves() merges them with per-key overrides
export const POSES = {
  ready:    { crouch: .3, lean: .12, stance: .62, step: .25, sY: .55, sP: -.4, gx: .08, gy: -.15, gz: .3, twist: 0 },
  coil:     { crouch: .55, lean: .32, stance: .8, step: .1, twist: -.9, sY: -1.9, sP: .15, gx: -.15, gy: .05, gz: .1, look: .7 },        // wound up, brush behind the left shoulder
  sweepR:   { crouch: .5, lean: .22, stance: .85, step: -.15, twist: .75, sY: 1.3, sP: -.15, gx: .2, gy: -.08, gz: .3, look: -.4 },     // follow-through to the right
  sweepL:   { crouch: .5, lean: .22, stance: .85, step: .3, twist: -.75, sY: -1.3, sP: -.15, gx: -.2, gy: -.08, gz: .3, look: .4 },
  overhead: { crouch: .2, lean: -.05, stance: .55, step: .2, twist: 0, sY: 0, sP: 1.25, gx: 0, gy: .35, gz: .2, lookP: .3 },          // brush raised high
  chop:     { crouch: .65, lean: .45, stance: .9, step: .45, twist: .1, sY: .05, sP: -.75, gx: 0, gy: -.15, gz: .42, lookP: -.2 },       // brought down to the floor in front
  lowSweep: { crouch: .85, lean: .5, stance: 1.05, step: .1, twist: .5, sY: 1.1, sP: -.85, gx: .15, gy: -.2, gz: .35, look: -.2 },     // brush skims the floor
  thrust:   { crouch: .45, lean: .25, stance: .9, step: .5, twist: .25, sY: .1, sP: .05, gx: .05, gy: 0, gz: .45 },
  plant:    { crouch: .05, lean: 0, stance: .5, step: .05, twist: .1, sY: .25, sP: -1.45, gx: .25, gy: -.05, gz: .22, look: 0 },       // finale: staff planted upright at the side
  spinHigh: { crouch: .35, lean: .15, stance: .7, step: 0, twist: .3, sY: 1.45, sP: .35, gx: .2, gy: .1, gz: .25 },                     // brush held out level and high for a spin
  spinLow:  { crouch: .6, lean: .3, stance: .8, step: 0, twist: .3, sY: 1.45, sP: -.25, gx: .2, gy: -.05, gz: .25 },
};
// moves([[t, 'pose', {overrides, e: 'io'}], …]) → keyframe list
export const moves = list => list.map(([t, name, o = {}]) => ({ t, ...(POSES[name] || {}), ...o }));

const PROPS = Object.keys(DEFAULT_POSE);
export function summoner(o = {}) {
  const S = {
    o: { mask: 'oni', hair: '#f3f3f1', robe: '#101013', staffLen: 2.55, brushLen: .5, height: 1, ...o },
    keys: o.keys || [{ t: 0 }],
    pose(t) { const p = {}; for (const k of PROPS) p[k] = keys(this.keys, t, k, (o.base || DEFAULT_POSE)[k] ?? DEFAULT_POSE[k]); return p; },
    rig(t) { return rigFrom(this.pose(t), this.o, t); },
    // the brush tip: { p, axis } — p is the middle of the bristle tuft, axis is the bristles' direction
    tip(t, reach = 0) { const r = this.rig(t); return { p: v3.mad(r.brushMid, r.D, reach), axis: r.D }; },
    trace(t0, t1, o = {}) {
      const n = o.n || Math.max(24, Math.round((t1 - t0) * 120)), pts = [], wid = [];
      for (let i = 0; i < n; i++) {
        const t = lerp(t0, t1, i / (n - 1)), u = i / (n - 1), r = this.rig(t);
        const reach = typeof o.reach === 'function' ? o.reach(u) : (o.reach || 0);
        let p = v3.mad(r.brushMid, r.D, reach);
        if (o.lift) p = v3.add(p, [0, typeof o.lift === 'function' ? o.lift(u) : o.lift, 0]);
        if (o.floor) p[1] = Math.max(p[1], o.floor);
        pts.push(p); wid.push(r.D);
      }
      return { pts, wid };
    },
  };
  return S;
}

function rigFrom(p, o, t) {
  const H = o.height, up = [0, 1, 0];
  const f = dir(p.yaw), r = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
  const f2 = dir(p.yaw + p.twist), r2 = [Math.cos(p.yaw + p.twist), 0, -Math.sin(p.yaw + p.twist)];
  const pelvis = [p.x, (.98 - p.crouch * .4) * H + p.jump, p.z];
  let spine = v3.add(v3.mul(up, Math.cos(p.lean)), v3.mul(f2, Math.sin(p.lean)));
  spine = v3.norm(v3.add(v3.mul(spine, Math.cos(p.side)), v3.mul(r2, Math.sin(p.side))));
  const chest = v3.mad(pelvis, spine, .34 * H), neck = v3.mad(pelvis, spine, .53 * H);
  const fh = v3.norm(v3.add(dir(p.yaw + p.twist + p.look, p.lookP - p.lean * .6), v3.mul(spine, 0)));
  const head = v3.mad(v3.mad(neck, spine, .12 * H), fh, .025);
  const hr = v3.norm(v3.cross(up, fh)), hu = v3.norm(v3.cross(fh, hr));
  const shL = v3.mad(v3.mad(neck, spine, -.07), r2, -.21 * H), shR = v3.mad(v3.mad(neck, spine, -.07), r2, .21 * H);
  const hipL = v3.mad(pelvis, r, -.1 * H), hipR = v3.mad(pelvis, r, .1 * H);
  // feet planted around the root; they leave the floor when jumping
  const fy = Math.max(0, p.jump * .75);
  const footL = [p.x - r[0] * p.stance / 2 + f[0] * p.step / 2, fy, p.z - r[2] * p.stance / 2 + f[2] * p.step / 2];
  const footR = [p.x + r[0] * p.stance / 2 - f[0] * p.step / 2, fy * .8, p.z + r[2] * p.stance / 2 - f[2] * p.step / 2];
  const kneeL = ik(hipL, v3.add(footL, [0, .08, 0]), .46 * H, .45 * H, v3.add(f, v3.mul(r, -.35))).mid;
  const kneeR = ik(hipR, v3.add(footR, [0, .08, 0]), .46 * H, .45 * H, v3.add(f, v3.mul(r, .35))).mid;
  // staff: direction D from the chest frame, held at G; the lead hand is toward the brush
  const D = v3.norm(dir(p.yaw + p.twist + p.sY, p.sP));
  let G = v3.add(v3.add(v3.mad(chest, r2, p.gx), v3.mul(spine, p.gy)), v3.mul(f2, p.gz));
  let hLead = v3.mad(G, D, .3), hRear = v3.mad(G, D, -.28);
  // keep both hands within reach of their shoulders: slide the staff toward the body if needed
  const reach = .58 * H;
  for (let k = 0; k < 2; k++) {
    const dl = v3.sub(hLead, shR), dr = v3.sub(hRear, shL), el = v3.len(dl) - reach, er = v3.len(dr) - reach;
    let fix = [0, 0, 0];
    if (el > 0) fix = v3.mad(fix, v3.norm(dl), -el);
    if (er > 0) fix = v3.mad(fix, v3.norm(dr), -er);
    if (el <= 0 && er <= 0) break;
    G = v3.add(G, fix); hLead = v3.mad(G, D, .3); hRear = v3.mad(G, D, -.28);
  }
  const elR = ik(shR, hLead, .3 * H, .29 * H, v3.add(v3.mul(r2, .8), [0, -.7, 0])), elL = ik(shL, hRear, .3 * H, .29 * H, v3.add(v3.mul(r2, -.8), [0, -.7, 0]));
  const butt = v3.mad(G, D, -.95), ferrule = v3.mad(G, D, o.staffLen - .95 - o.brushLen), tipEnd = v3.mad(G, D, o.staffLen - .95);
  const brushMid = v3.lerp(ferrule, tipEnd, .55);
  return { p, t, f, r, f2, r2, spine, pelvis, chest, neck, head, fh, hr, hu, shL, shR, hipL, hipR, footL, footR, kneeL, kneeR, elL: elL.mid, elR: elR.mid, hL: elL.end, hR: elR.end, D, G, butt, ferrule, tipEnd, brushMid };
}

// ---------- drawing ----------
const COL = { robe: '#101013', robeRim: '#6b7078', hakama: '#141418', obi: '#4b4c52', skin: '#bdb7ae', skinD: '#8f8981', hair: '#f3f3f1', hairD: '#959aa0', mask: '#efebe1', maskD: '#c9c2b4', line: '#141414', staff: '#2b2521', staffRim: '#857a6c', ferrule: '#9a978f' };

export function drawSummoner(ctx, v, S, t, o = {}) {
  const R = S.rig(t), P = S.o, col = { ...COL, robe: P.robe, hair: P.hair, ...(P.colors || {}) };
  // velocities (for cloth and hair lag) from the rig a moment ago
  const R1 = S.rig(t - .06), vel = (a, b) => v3.mul(v3.sub(a, b), 1 / .06);
  const parts = [];
  const add = (p, fn) => parts.push({ z: depth(v, p), fn });
  const down = [0, -1, 0];

  // hakama: two wide trouser legs (open hems, no caps) + front and back apron panels between them so it reads as a
  // pleated skirt; the hems trail the body's motion and flutter
  const pv = vel(R.pelvis, R1.pelvis), waist = v3.mad(R.pelvis, R.spine, .1);
  const hems = [];
  for (const [hip, knee, foot, s] of [[R.hipL, R.kneeL, R.footL, -1], [R.hipR, R.kneeR, R.footR, 1]]) {
    const wob = sn(t * 3.1 + s, 4) * .03, hem = v3.add(v3.add(foot, [0, .07, 0]), v3.mul(pv, -.035));
    hems.push(hem);
    add(v3.lerp(hip, knee, .5), () => {
      const toe = v3.mad(foot, R.f, .16);
      tube(ctx, v, [v3.add(foot, [0, .035, 0]), v3.add(toe, [0, .022, 0])], [.04, .03], col.skin);
      tube(ctx, v, [v3.mad(waist, R.r, s * .08), hip, knee, v3.lerp(knee, hem, .55), hem], [.13, .15, .165, .185 + wob, .2 + wob], col.hakama, { rim: col.robeRim, rimA: .3, cap: false });
      const k = v.p(knee), a = v.p(hip), b = v.p(hem);
      if (k && a && b) { ctx.save(); ctx.strokeStyle = '#2c2d33'; ctx.globalAlpha = .8; ctx.lineWidth = Math.max(.7, .01 * v.k(k[2])); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(k[0], k[1], b[0], b[1]); ctx.stroke(); ctx.restore(); }
    });
  }
  // aprons: from the waist down to just above the knees between the legs (front and back)
  for (const s of [1, -1]) {
    const o2 = v3.mul(R.f, s * .12), kL = v3.lerp(R.kneeL, hems[0], .25), kR = v3.lerp(R.kneeR, hems[1], .25);
    add(v3.add(v3.lerp(R.pelvis, v3.lerp(kL, kR, .5), .5), o2), () => soft3(ctx, v, [v3.add(v3.mad(waist, R.r, -.17), o2), v3.add(v3.mad(waist, R.r, .17), o2), v3.add(v3.mad(kR, R.r, .06), o2), v3.add(v3.lerp(kL, kR, .5), v3.add(o2, [0, -.08, 0])), v3.add(v3.mad(kL, R.r, -.06), o2)], col.hakama));
  }
  // torso: kimono jacket, wide at the hips, an obi belt, the collar V
  add(R.chest, () => {
    tube(ctx, v, [v3.mad(R.pelvis, R.spine, -.22), R.pelvis, v3.mad(R.pelvis, R.spine, .18), R.chest, v3.mad(R.neck, R.spine, -.04), R.neck], [.25, .22, .19, .22, .19, .09], col.robe, { rim: col.robeRim, rimA: .45 });
    tube(ctx, v, [v3.mad(R.pelvis, R.spine, .06), v3.mad(R.pelvis, R.spine, .15)], .205, col.obi, { cap: false });
    const front = v3.mad(R.chest, R.f2, .2);
    if (facing(v, front, R.f2)) {
      // collar: two lighter bands crossing at the chest (left over right)
      const n0 = v3.mad(R.neck, R.f2, .06), cL = v3.mad(v3.mad(R.neck, R.r2, -.08), R.f2, .04), cR = v3.mad(v3.mad(R.neck, R.r2, .08), R.f2, .04);
      const x = v3.mad(v3.mad(R.pelvis, R.spine, .16), R.f2, .2);
      blob(ctx, v, n0, .05, col.skinD);
      // the white under-collar (juban) showing as a V, with the black outer collar beside it
      line3(ctx, v, [cL, v3.lerp(cL, x, .5), x], .03, '#e6e6e3'); line3(ctx, v, [cR, v3.lerp(cR, x, .5), x], .03, '#d9d9d6');
      line3(ctx, v, [v3.mad(cL, R.r2, -.035), v3.mad(v3.lerp(cL, x, .5), R.r2, -.03), v3.mad(x, R.r2, -.01)], .03, '#202126');
      line3(ctx, v, [v3.mad(cR, R.r2, .035), v3.mad(v3.lerp(cR, x, .5), R.r2, .03), v3.mad(x, R.r2, .01)], .03, '#1c1d22');
    }
  });
  // arms + big sleeves; each sleeve hangs from the arm under gravity and trails the wrist's motion
  for (const [sh, el, hd, s] of [[R.shL, R.elL, R.hL, -1], [R.shR, R.elR, R.hR, 1]]) {
    const wv = vel(hd, s < 0 ? R1.hL : R1.hR), hang = v3.norm(v3.add(down, v3.mul(wv, -.09)));
    const drop = .38 + Math.min(.28, v3.len(wv) * .025);
    add(v3.lerp(sh, hd, .5), () => {
      tube(ctx, v, [sh, el, hd], [.09, .08, .07], col.robe, { rim: col.robeRim, rimA: .4 });
      const wr = v3.lerp(el, hd, .8), flap = sn(t * 4 + s * 2, 7) * .05;
      const hem = [v3.mad(wr, hang, drop * .75 + flap), v3.mad(v3.lerp(el, wr, .55), hang, drop + flap), v3.mad(v3.lerp(el, wr, .1), hang, drop * .92 + flap * .5), v3.mad(el, hang, drop * .62)];
      soft3(ctx, v, [sh, el, wr, ...hem, v3.mad(sh, hang, .14)], col.robe);
      // folds: two soft grey creases running down to the hem, a rim of light along the hem
      line3(ctx, v, [v3.mad(v3.lerp(el, wr, .3), hang, .05), hem[1]], .022, '#33343a');
      line3(ctx, v, [v3.mad(v3.lerp(sh, el, .6), hang, .06), hem[3]], .016, '#2c2d33');
      ctx.save(); ctx.globalAlpha = .45; line3(ctx, v, [hem[0], hem[1], hem[2]], .012, col.robeRim); ctx.restore();
      blob(ctx, v, v3.mad(hd, R.D, s * .0), .04, col.skin);
    });
  }
  // staff (three pieces so the body can sit between them) and the brush
  const seg = (a, b) => add(v3.lerp(a, b, .5), () => tube(ctx, v, [a, b], .022, col.staff, { rim: col.staffRim, rimA: .6, cap: false }));
  seg(R.butt, R.hL); seg(R.hL, R.hR); seg(R.hR, R.ferrule);
  add(R.brushMid, () => drawBrush(ctx, v, R, R1, col));
  // head, mask and hair
  add(R.head, () => drawHead(ctx, v, S, R, t, col));
  parts.sort((a, b) => b.z - a.z);
  ctx.save(); for (const p of parts) p.fn(); ctx.restore();
}

function drawBrush(ctx, v, R, R1, col) {
  const D = R.D, len = v3.dist(R.ferrule, R.tipEnd);
  // the tuft bends against its motion
  const mv = v3.sub(R.tipEnd, R1.tipEnd), bend = v3.mul(v3.sub(mv, v3.mul(D, v3.dot(mv, D))), -.9);
  const pts = [0, .25, .5, .75, 1].map(u => v3.add(v3.mad(R.ferrule, D, u * len), v3.mul(bend, u * u)));
  tube(ctx, v, [v3.mad(R.ferrule, D, -.06), v3.mad(R.ferrule, D, .03)], .035, col.ferrule, { cap: false });
  tube(ctx, v, pts, [.055, .075, .07, .05, .015], INK);
  // a few loose hairs at the tip
  for (let k = 0; k < 5; k++) { const a = pts[3], b = v3.add(pts[4], [Math.sin(k * 2.1) * .04, Math.cos(k * 1.7) * .04, Math.sin(k * 3.3) * .04]); line3(ctx, v, [a, b], .006, INK); }
}

function drawHead(ctx, v, S, R, t, col) {
  const P = S.o, c = R.head, F = R.fh, U = R.hu, X = R.hr, rh = .118;
  const camDir = v3.norm(v3.sub(cpos(v), c)), front = v3.dot(F, camDir);
  // hair: a mane around the head and long strands down the back that trail the head's own path (pure: we look up
  // where the head was a moment ago instead of simulating)
  const hist = [1, 2, 3, 4, 5, 6].map(k => S.rig(t - k * .045).head);
  const back = v3.mul(F, -1), nS = P.strands || 34;
  const strand = (k, front2) => {
    const a = (k / nS - .5) * 2.7 + sn(k * 1.3, 3) * .15, len = .65 + .45 * hash(k, 5);
    const root = v3.add(c, v3.add(v3.mul(X, Math.sin(a) * rh * .95), v3.add(v3.mul(U, rh * (.55 + .3 * Math.cos(a))), v3.mul(back, rh * .4))));
    const pts = [root];
    for (let j = 1; j <= 6; j++) {
      const lag = v3.sub(hist[j - 1], c), u = j / 6;
      const flow = v3.add(v3.mul(U, -len * u * .9), v3.mul(back, len * u * (.35 + .2 * Math.sin(a))));
      const spread = v3.mul(X, Math.sin(a) * (.08 + u * .22));
      const wave = v3.mul(X, sn(t * 2.2 + k * .7 + j * .5, k) * .05 * u);
      pts.push(v3.add(v3.add(v3.add(root, flow), v3.add(spread, wave)), v3.mul(lag, .9 * u)));
    }
    const wd = .05 + .05 * hash(k, 6);
    brush(ctx, v, pts, pts.map((_, j) => wd * (1 - j / 7) + .008), { ink: (k % 3 === 0) ? col.hairD : col.hair, dry: .4, bristles: 9, tail: .55, entry: .05, seed: 500 + k });
  };
  const behind = front > -.2;   // seen from the front: strands are behind the head
  if (behind) for (let k = 0; k < nS; k++) strand(k);
  // the head itself (dark under the mask so the mask edge reads)
  blob(ctx, v, c, rh, '#2a2a2e');
  // mane: tufts around the face
  for (let k = 0; k < 13; k++) {
    const a = k / 13 * TAU, root = v3.add(c, v3.add(v3.mul(X, Math.cos(a) * rh * .8), v3.mul(U, Math.sin(a) * rh * .8)));
    const tipp = v3.add(root, v3.add(v3.add(v3.mul(X, Math.cos(a) * (.17 + .06 * hash(k, 9))), v3.mul(U, Math.sin(a) * .12 - .08)), v3.mul(back, .08)));
    brush(ctx, v, [root, v3.add(v3.lerp(root, tipp, .5), v3.mul(U, .02)), tipp], [.1, .07, .01], { ink: k % 2 ? col.hair : col.hairD, dry: .35, bristles: 10, tail: .6, entry: .05, seed: 600 + k });
  }
  if (front > -.25) drawMask(ctx, v, P.mask, c, F, U, X, rh, front, col);
  if (!behind) for (let k = 0; k < nS; k++) strand(k);
}

// masks: 'oni' (horned demon), 'fox', 'noh' (blank serene), 'crow' (beaked) — features are points on the face sphere
function drawMask(ctx, v, kind, c, F, U, X, rh, front, col) {
  const at = (f, u, x, k = 1.02) => v3.add(c, v3.mul(v3.norm(v3.add(v3.add(v3.mul(F, f), v3.mul(U, u)), v3.mul(X, x))), rh * k));
  // face plate: front hemisphere, a little taller than wide
  const plate = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; plate.push(at(.55, Math.sin(a) * 1.15 - .05, Math.cos(a) * .95, 1.06)); }
  soft3(ctx, v, plate, col.mask);
  // cheek shading toward the side turned away from the light
  soft3(ctx, v, [at(.5, -.9, -.5), at(.7, -.6, -.2), at(.65, -.9, .3), at(.4, -1.1, .2)], col.maskD);
  const dark = col.line;
  if (kind === 'fox') {
    soft3(ctx, v, [at(1, -.15, -.25, 1.1), at(1, -.15, .25, 1.1), v3.mad(at(1, -.25, 0), F, .09)], col.mask);
    for (const s of [-1, 1]) { taper(ctx, v, [at(.8, .25, s * .2), at(.6, .45, s * .6)], .018, dark); soft3(ctx, v, [at(.2, .9, s * .55, 1.05), v3.mad(at(.2, 1.1, s * .5), U, .12), at(.2, .9, s * .2, 1.05)], col.mask); }
    taper(ctx, v, [at(.9, -.45, -.25), at(.95, -.5, 0), at(.9, -.45, .25)], .012, dark);
    return;
  }
  if (kind === 'crow') {
    soft3(ctx, v, [at(.9, 0, -.25, 1.05), at(.9, 0, .25, 1.05), v3.mad(at(1, -.3, 0), v3.norm(v3.add(F, v3.mul(U, -.5))), .2)], '#1c1c1f');
    for (const s of [-1, 1]) blob(ctx, v, at(.8, .3, s * .4), .016, dark);
    return;
  }
  // eyes: sharply slanted (inner corner low, outer corner high), a small pale iris with a dark slit
  for (const s of [-1, 1]) {
    if (kind === 'oni') {
      soft3(ctx, v, [at(.9, .12, s * .1), at(.82, .3, s * .32), at(.66, .5, s * .62), at(.74, .3, s * .56), at(.84, .14, s * .3)], dark);
      blob(ctx, v, at(.8, .3, s * .4, 1.07), .016, '#d8d2bd');
      blob(ctx, v, at(.8, .3, s * .4, 1.08), .006, '#050505', { sy: 2 });
      // brows: heavy, from the middle of the forehead slashing up and out; worry creases between them
      taper(ctx, v, [at(.95, .4, s * .04), at(.84, .58, s * .3), at(.62, .74, s * .66)], .055, dark, { end: .9, pow: .55 });
      for (let k = 0; k < 2; k++) taper(ctx, v, [at(.97, .38 + k * .1, s * (.03 + k * .02)), at(.95, .62 + k * .08, s * (.08 + k * .03))], .01, '#8f8879');
      taper(ctx, v, [at(.86, .02, s * .26), at(.74, -.3, s * .66)], .016, '#8f8879');   // cheek ridge
    } else {
      soft3(ctx, v, [at(.86, .28, s * .15), at(.8, .42, s * .45), at(.75, .28, s * .62), at(.82, .2, s * .38)], dark);
      blob(ctx, v, at(.86, .33, s * .38, 1.07), .007, '#f6f3ea');
      taper(ctx, v, [at(.85, .55, s * .2), at(.75, .58, s * .55)], .012, dark);
    }
  }
  if (kind === 'oni') {
    // the grimace: stretched to the cheeks, corners pulled up, a lip line, teeth, four long fangs
    const M = [at(.62, -.22, -.86), at(.9, -.36, -.4), at(.97, -.34, 0), at(.9, -.36, .4), at(.62, -.22, .86), at(.6, -.6, .62), at(.8, -.86, .3), at(.85, -.92, 0), at(.8, -.86, -.3), at(.6, -.6, -.62)];
    soft3(ctx, v, M, dark);
    taper(ctx, v, [at(.62, -.16, -.86), at(.9, -.3, -.4), at(.97, -.28, 0), at(.9, -.3, .4), at(.62, -.16, .86)], .02, '#7d7668');
    for (let k = -4; k <= 4; k++) { const x = k * .1; blob(ctx, v, at(.95 - Math.abs(x) * .3, -.4 + Math.abs(x) * .12, x, 1.07), .013, '#f1ede3'); }
    for (let k = -3; k <= 3; k++) { const x = k * .09; blob(ctx, v, at(.86, -.82 + Math.abs(x) * .2, x, 1.07), .011, '#e4dfd2'); }
    for (const s of [-1, 1]) {
      soft3(ctx, v, [at(.85, -.33, s * .5, 1.09), at(.88, -.36, s * .36, 1.09), at(.84, -.7, s * .44, 1.11)], '#f6f2e8');   // upper fangs
      soft3(ctx, v, [at(.8, -.8, s * .24, 1.09), at(.78, -.76, s * .36, 1.09), at(.84, -.5, s * .3, 1.11)], '#efebe0');    // lower fangs
    }
    taper(ctx, v, [at(.98, .02, -.15), at(1, -.16, 0), at(.98, .02, .15)], .016, '#8f8879');   // nostrils
    // horns: slender, rising from the top of the brow, curving up and then inward, with faint rings
    for (const s of [-1, 1]) {
      const r0 = at(.4, .82, s * .5, 1.0), h1 = v3.add(r0, v3.add(v3.mul(U, .12), v3.add(v3.mul(X, s * .06), v3.mul(F, -.03)))), h2 = v3.add(h1, v3.add(v3.mul(U, .12), v3.add(v3.mul(X, s * .03), v3.mul(F, -.02)))), h3 = v3.add(h2, v3.add(v3.mul(U, .08), v3.add(v3.mul(X, -s * .045), v3.mul(F, .02))));
      taper(ctx, v, [r0, h1, h2, h3], .058, col.mask, { pow: .8 });
      taper(ctx, v, [v3.mad(r0, X, s * .01), v3.mad(h1, X, s * .01), v3.mad(h2, X, s * .006)], .02, col.maskD, { pow: 1 });
      for (let k = 1; k < 3; k++) { const p = v3.lerp(r0, h1, k / 3); line3(ctx, v, [v3.mad(p, X, -.018), v3.mad(p, X, .018)], .004, '#b3ab9b'); }
    }
  } else {
    taper(ctx, v, [at(.9, -.5, -.18), at(.95, -.45, 0), at(.9, -.5, .18)], .012, dark);
  }
}
