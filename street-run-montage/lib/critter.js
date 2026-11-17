// street-run-montage · critter.js — the companion: a four-legged animal that runs with the rider.
//
//   const buddy = new Buddy(SPEC.buddy, route, rider, { dur })
//   buddy.plan({ lead: [{t, v}], side: [{t, v}], y: [{t, v}], moves: [{ at, do: 'leap' | 'sit' | 'call' | 'look', … }] })
//   buddy.pose(tau) → numbers (paws, contacts, gait, bad joints)
//
// Gait from speed (walk < 1.2 m/s ≤ trot < 3.4 m/s ≤ gallop), stride from speed and size; the gait phase is the
// integral of distance / stride (a table), so a planted paw is at a fixed world point from touch-down to lift-off
// (computed from the touch-down time — no slip by construction; the check measures it). Front legs: elbow bends
// back, the wrist folds the paw back when lifted. Hind legs: knee forward, the hock back, the foot folds forward when
// lifted. The spine flexes in the gallop; the tail trails with speed and swishes at rest; the idle breathes.
import * as THREE from 'three';
import { clamp, lerp, keys, smooth, bump, n1, hash, span, Table, DEG, TAU, shade, lum } from './core.js';
import { cel, inked, flat } from './look.js';
import { ik2 } from './rider.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ell = (rx, ry, rz, seg = 14) => new THREE.SphereGeometry(1, seg, Math.max(8, seg * .6 | 0)).scale(rx, ry, rz);
function limb(l, r0, r1 = r0, seg = 8) {
  const g = new THREE.CylinderGeometry(r1, r0, l, seg, 1, true); g.translate(0, -l / 2, 0);
  const a = new THREE.SphereGeometry(r0, seg, 5, 0, TAU, 0, Math.PI / 2), b = new THREE.SphereGeometry(r1, seg, 5, 0, TAU, Math.PI / 2, Math.PI / 2); b.translate(0, -l, 0);
  const parts = [g, a, b].map(x => x.toNonIndexed()); let n = 0; for (const p of parts) n += p.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  for (const p of parts) { P.set(p.attributes.position.array, o * 3); N.set(p.attributes.normal.array, o * 3); U.set(p.attributes.uv.array, o * 2); o += p.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return out;
}

export const KINDS = {
  cat:  { len: .42, height: .25, snout: .15, ears: 'pointy', tail: 'long', head: .075, girth: .085, neck: .07, mass: 4, tailUp: true },
  dog:  { len: .5, height: .3, snout: .5, ears: 'pointy', tail: 'curl', head: .095, girth: .125, neck: .09, mass: 12, tailUp: true },
  corgi:{ len: .52, height: .22, snout: .5, ears: 'big', tail: 'fluffy', head: .085, girth: .115, neck: .08, mass: 12, tailUp: false },
  fox:  { len: .5, height: .32, snout: .6, ears: 'big', tail: 'fluffy', head: .075, girth: .09, neck: .09, mass: 6, tailUp: false },
};
/** joint limits for the check (degrees) */
export const LIM4 = { knee: [0, 150], elbow: [0, 140], neckYaw: 70 };

export function buildCritter(spec) {
  const K = { ...KINDS[spec.kind || 'cat'], ...spec }, ink = spec.ink || shade(spec.coat || '#222', -.5), iw = spec.inkW || 1.8;
  const h = K.height, L = K.len, g0 = K.girth, coat = spec.coat || '#222228', belly = spec.belly || coat;
  const bones = {}, root = new THREE.Group(); root.name = spec.name || 'buddy';
  const bone = (name, parent, x, y, z) => { const b = new THREE.Group(); b.name = name; b.position.set(x, y, z); parent.add(b); bones[name] = b; return b; };
  const warm = spec.shade || (lum(coat) > .45 ? '#e0b8b4' : null), cm = c => cel(c, warm && c !== '#121214' && c !== '#ffffff' ? { shade: warm } : {});
  const part = (b, geo, color, o = {}) => { const m = new THREE.Mesh(geo, typeof color === 'string' ? cm(color) : color); m.castShadow = true; m.receiveShadow = true; if (o.ink !== false) inked(m, ink, o.inkW || iw); if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); b.add(m); return m; };
  const hips = bone('hips', root, 0, 0, -L * .25), chest = bone('chest', root, 0, 0, L * .25);
  part(hips, ell(g0 * .95, g0 * .92, L * .34), coat, { pos: [0, 0, -.01] });
  part(chest, ell(g0 * 1.02, g0 * 1.04, L * .34), coat, { pos: [0, .005, .01] });
  if (belly !== coat) part(chest, ell(g0 * .7, g0 * .6, L * .26), belly, { pos: [0, -g0 * .5, .03], ink: false });
  // neck + head
  const neck = bone('neck', chest, 0, g0 * .55, L * .2), head = bone('head', neck, 0, K.neck, K.neck * .3);
  part(neck, limb(K.neck + .02, g0 * .55, g0 * .5).rotateX(Math.PI), coat, { pos: [0, -.02, 0] });
  const hr = K.head;
  part(head, ell(hr * 1.05, hr * .92, hr * .95, 18), coat);
  const sn = K.snout;
  part(head, ell(hr * (.42 + sn * .12), hr * (.34 + sn * .05), hr * (.35 + sn * .75)), spec.muzzle || coat, { pos: [0, -hr * .32, hr * (.62 + sn * .45)] });
  part(head, ell(hr * .14, hr * .1, hr * .1, 8), spec.nose || shade(coat, -.6), { pos: [0, -hr * .22, hr * (.95 + sn * 1.08)], ink: false });
  const jaw = bone('jaw', head, 0, -hr * .45, hr * .4); part(jaw, ell(hr * .3, hr * .1, hr * (.3 + sn * .6)), spec.muzzle || coat, { pos: [0, -hr * .02, hr * (.25 + sn * .5)], inkW: iw * .6 });
  part(jaw, ell(hr * .2, hr * .05, hr * (.2 + sn * .4)), '#c4505a', { pos: [0, hr * .05, hr * (.25 + sn * .45)], ink: false });
  const eyeC = spec.eyes || '#f2c230';
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * hr * .5, hr * .12, hr * .72); e.rotation.y = sx * .45; head.add(e);
    part(e, ell(hr * .26, hr * .3, hr * .12, 12), eyeC, { inkW: iw * .8 });
    part(e, ell(K.kind === 'cat' || spec.kind === 'cat' ? hr * .06 : hr * .14, hr * .22, hr * .06, 10), '#121214', { pos: [0, 0, hr * .08], ink: false });
    part(e, ell(hr * .06, hr * .07, hr * .03, 8), '#ffffff', { pos: [-sx * hr * .07, hr * .1, hr * .11], ink: false });
  }
  const earC = spec.earInner || '#d98a8a';
  for (const sx of [-1, 1]) {
    const big = K.ears === 'big' ? 1.35 : 1, ear = new THREE.Group(); ear.position.set(sx * hr * .55, hr * .7, -hr * .05); ear.rotation.set(-.1, 0, -sx * .32); head.add(ear); bones['ear' + (sx > 0 ? 'L' : 'R')] = ear;
    if (K.ears === 'floppy') part(ear, ell(hr * .3, hr * .55, hr * .1), coat, { pos: [sx * hr * .15, -hr * .35, 0], rot: [0, 0, sx * .9] });
    else { part(ear, new THREE.ConeGeometry(hr * .36 * big, hr * .8 * big, 4).scale(1, 1, .45), coat, { pos: [0, hr * .3 * big, 0] }); part(ear, new THREE.ConeGeometry(hr * .2 * big, hr * .5 * big, 4).scale(1, 1, .3), earC, { pos: [0, hr * .26 * big, hr * .04], ink: false }); }
  }
  if (spec.collar) part(neck, new THREE.TorusGeometry(g0 * .55, .012, 6, 16).rotateX(Math.PI / 2), spec.collar, { pos: [0, -.005, 0], ink: false });
  // tail: a chain of tapering segments
  const tail = [], nT = K.tail === 'stub' ? 1 : 6, tl = (K.tail === 'long' ? L * 1.05 : K.tail === 'fluffy' ? L * .75 : K.tail === 'curl' ? L * .5 : .05) / nT;
  let tp = bone('tail0', hips, 0, g0 * .55, -L * .32); tail.push(tp);
  for (let i = 0; i < nT; i++) {
    const r0 = (K.tail === 'fluffy' ? .045 + .03 * Math.sin(Math.PI * (i + .5) / nT) : .022 * (1 - i / nT * .5)) * (h / .25) ** .5;
    part(tp, limb(tl, r0, r0 * .92, 7).rotateX(Math.PI), i === nT - 1 && spec.tailTip ? spec.tailTip : coat, { inkW: iw * .8 });
    if (i < nT - 1) { tp = bone('tail' + (i + 1), tp, 0, tl, 0); tail.push(tp); }
  }
  // legs (front: upper, lower, paw; hind: thigh, shin, metatarsal, paw)
  const legs = {};
  const LG = { fu: h * .44, fl: h * .44, fp: h * .09, hu: h * .43, hl: h * .45, hm: h * .27, hp: h * .09 };
  for (const [nm, sx, front] of [['FL', 1, true], ['FR', -1, true], ['HL', 1, false], ['HR', -1, false]]) {
    const parent = front ? chest : hips, top = bone('top' + nm, parent, sx * g0 * .55, -g0 * .15, front ? L * .14 : -L * .12);
    const c = (front ? spec.socksF : spec.socksH) || coat;
    const u = bone('u' + nm, top, 0, 0, 0); part(u, limb(front ? LG.fu : LG.hu, g0 * (front ? .38 : .5), g0 * .28), coat);
    const l = bone('l' + nm, u, 0, -(front ? LG.fu : LG.hu), 0); part(l, limb(front ? LG.fl : LG.hl, g0 * .26, g0 * .2), front ? coat : coat);
    let m = null; if (!front) { m = bone('m' + nm, l, 0, -LG.hl, 0); part(m, limb(LG.hm, g0 * .2, g0 * .17), c); }
    const p = bone('p' + nm, front ? l : m, 0, -(front ? LG.fl : LG.hm), 0); part(p, ell(g0 * .24, g0 * .14, g0 * .32), c, { pos: [0, -g0 * .06, g0 * .12], inkW: iw * .8 });
    legs[nm] = { top, u, l, m, p, front, sx };
  }
  return { root, bones, legs, LG, tail, K, jaw, head, neck, chest, hips };
}

const _y = V(), _z = V(), _x = V(), M = new THREE.Matrix4();
function aim(bone, yDir, zHint) {
  const y = _y.copy(yDir).normalize(), z = _z.copy(zHint).addScaledVector(y, -zHint.dot(y)); if (z.lengthSq() < 1e-8) z.set(0, 0, 1); z.normalize();
  const x = _x.crossVectors(y, z).normalize(); M.makeBasis(x, y, z);
  const qw = new THREE.Quaternion().setFromRotationMatrix(M), qp = new THREE.Quaternion(); bone.parent.getWorldQuaternion(qp);
  bone.quaternion.copy(qp.invert().multiply(qw)); bone.updateMatrixWorld(true);
}

export class Buddy {
  constructor(spec, route, rider, o = {}) {
    this.spec = spec; this.R = route; this.rider = rider; this.dur = o.dur || 60;
    Object.assign(this, buildCritter(spec)); this.group = this.root;
    this.plan({});
  }
  plan({ lead = [{ t: 0, v: 1 }], side = [{ t: 0, v: 1.1 }], y = [{ t: 0, v: 0 }], moves = [] } = {}) {
    const hz = 120, D = this.dur + 2, h = this.K.height;
    this.leadK = lead; this.sideK = side; this.yK = y; this.moves = moves.map(m => ({ ...m })).sort((a, b) => a.at - b.at);
    for (const m of this.moves) if (m.do === 'leap') { m.h = m.h ?? .5; m.air = m.air ?? Math.max(.32, 2 * Math.sqrt(2 * (Math.max(m.h, .1) + .15) / 9.81) * .8); m.land = m.at + m.air; }
    this.S = new Table(D, hz, t => this.rider.sAt(t) + keys(lead, t));
    this.Vt = this.S.slope(); this.Vs = this.Vt.follow(1.6, 1);
    // stride from speed and size; the gait phase is ∫ v / stride dt
    this.stride = v => clamp((.55 + .2 * v) * (h / .25), .3 * h / .25, 1.6 * h / .25 + .4);
    const ph = new Table(D, hz, t => Math.max(0, this.Vs.at(t)) / this.stride(Math.max(0, this.Vs.at(t))));
    this.Ph = ph.integral(0);
    this.Bob = new Table(D, hz, t => this.yAt(t)); this.BobLag = this.Bob.follow(2.5, .4);
    return this;
  }
  sAt(t) { return this.S.at(t); }
  sideAt(t) { return keys(this.sideK, t); }
  /** the surface height the buddy stands on (0 = the route, a wall top …), with leaps as ballistic arcs */
  yAt(t) {
    for (const m of this.moves) if (m.do === 'leap' && t >= m.at && t < m.land) { const q = (t - m.at) / m.air, y0 = keys(this.yK, m.at - .01), y1 = keys(this.yK, m.land + .01), peak = Math.max(y0, y1) + .18; return lerp(y0, y1, q) + (peak - lerp(y0, y1, .5)) * 4 * q * (1 - q); }
    return keys(this.yK, t);
  }
  gait(v) { return v < .08 ? 'stand' : v < 1.2 ? 'walk' : v < 3.4 ? 'trot' : 'gallop'; }
  _sit(t) { let k = 0; for (const m of this.moves) if (m.do === 'sit') k = Math.max(k, smooth(span(t, m.at, m.at + .5)) * (1 - smooth(span(t, m.at + (m.dur || 3) - .4, m.at + (m.dur || 3))))); return k; }
  _leap(t) { for (const m of this.moves) if (m.do === 'leap' && t > m.at - .32 && t < m.land + .4) return m; return null; }

  pose(t) {
    const R = this.R, K = this.K, h = K.height, LG = this.LG, b = this.bones;
    const s = this.sAt(t), side = this.sideAt(t), v = Math.max(0, this.Vs.at(t)), gait = this.gait(v), y0 = this.yAt(t);
    const sit = this._sit(t), leap = this._leap(t);
    const res = { t, s, side, v, gait, paws: {}, contact: {}, bad: [] };
    // heading: along the route, turned toward lateral motion; at rest, toward m.face of the last sit
    const ds = Math.max(.15, v), dside = (this.sideAt(t + .1) - this.sideAt(t - .1)) / .2;
    let yaw = R.yaw(s) - Math.atan2(dside, ds) * .9;
    for (const m of this.moves) if (m.do === 'sit' && m.face !== undefined) yaw += m.face * sit;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + Math.PI, 0));   // the rig faces +Z; the route runs -Z
    const fwd = V(0, 0, 1).applyQuaternion(q), left = V(1, 0, 0).applyQuaternion(q);
    // gait timing
    const duty = gait === 'gallop' ? .36 : gait === 'trot' ? .52 : .68;
    const offs = gait === 'gallop' ? { HL: 0, HR: .1, FL: .48, FR: .58 } : gait === 'trot' ? { FL: 0, HR: 0, FR: .5, HL: .5 } : { HL: 0, FL: .25, HR: .5, FR: .75 };
    const ph = this.Ph.at(t), stride = this.stride(v);
    // body: height, bob, gallop pitch and spine flex, crouch before a leap, stretch in the air, absorb after
    let crouch = 0, airK = 0, pitch = 0, flex = 0;
    if (gait === 'gallop') { flex = Math.sin(TAU * ph) * .22; pitch = Math.sin(TAU * ph + 1) * .07; }
    if (leap) {
      const g = keys([{ t: leap.at - .32, v: 0 }, { t: leap.at - .04, v: 1, e: 'in' }, { t: leap.at + .06, v: -.4, e: 'out' }, { t: leap.land - .05, v: -.1 }, { t: leap.land + .1, v: .8, e: 'out' }, { t: leap.land + .4, v: 0 }], t);
      crouch = g; airK = t > leap.at && t < leap.land ? 1 : 0; if (airK) { const q2 = (t - leap.at) / leap.air; pitch = lerp(-.35, .3, q2); flex = lerp(-.25, .3, q2); }
    }
    const bob = gait === 'gallop' ? Math.abs(Math.sin(Math.PI * ph * 2)) * .03 * h / .25 : gait === 'trot' ? Math.abs(Math.sin(TAU * ph)) * .012 : 0;
    const breathe = Math.sin(t * TAU / (gait === 'stand' ? 1.6 : .6)) * (gait === 'stand' ? .004 : .002);
    const standH = h * .97 - crouch * h * .28 - sit * h * .18;
    const base = R.at(s, side, 0); base.y = R.y(s) + y0;
    const pos = base.clone().add(V(0, standH + bob + breathe, 0));
    this.root.position.copy(pos);
    this.root.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch - sit * .55, 0, 0)));
    this.root.updateMatrixWorld(true);
    b.hips.rotation.set(flex * .5 + sit * .35, 0, 0); b.chest.rotation.set(-flex * .5 - sit * .25, 0, 0);
    b.chest.scale.setScalar(1 + breathe * 2);
    // head: steady on the gallop (counter-pitch), looks at the rider or ahead; call (meow / bark) opens the jaw
    let hy = .06 * n1(t * .6, 41), hp = pitch + sit * .5 - flex * .3, jaw = 0;
    for (const m of this.moves) {
      if (m.do === 'look') { const k = bump(t, m.at, m.at + (m.dur || 1)) ** .5; hy = lerp(hy, m.yaw ?? .8, k); hp = lerp(hp, m.pitch ?? -.3, k); }
      if (m.do === 'call') { const k = bump(t, m.at, m.at + (m.dur || .6)); jaw = Math.max(jaw, k); hp -= .3 * k; }
    }
    b.neck.rotation.set(-.55 + hp * .6 + crouch * .3, hy * .5, 0); b.head.rotation.set(.45 + hp * .4, hy * .5, 0); this.jaw.rotation.x = jaw * .5;
    // ears flick on irregular beats
    for (const [e, sx] of [['earL', 1], ['earR', -1]]) { const i = Math.floor(t / 1.7 + sx), f = hash(i, sx + 7) < .3 ? bump(t - (i - sx) * 1.7, 0, .25) : 0; b[e].rotation.z = -sx * (.32 + f * .4 + clamp(v / 6) * .3); b[e].rotation.x = -.1 - clamp(v / 6) * .5; }
    // tail: up in an S at rest / walking (cats), trailing straight in the gallop, swishing, lagging the bob
    const lag = (this.Bob.at(t) - this.BobLag.at(t)) * 4, run = clamp(v / 4), up = K.tailUp ? 1 - run : .2;
    this.tail.forEach((tb, i) => {
      const sw = n1(t * .9 + i * .35, 61) * (.25 + (1 - run) * .35);
      const curl = K.tail === 'curl' ? 1.1 : 0;
      tb.rotation.set(i === 0 ? lerp(-.4, -1.35, run) - up * .9 - curl * .6 + lag : (up * (i < 3 ? .25 : -.3)) + run * .05 - curl * .35 + lag * .3, 0, sw * (i ? .5 : .25));
    });
    // legs
    for (const nm of ['FL', 'FR', 'HL', 'HR']) {
      const lg = this.legs[nm], front = lg.front, top = V(); lg.top.getWorldPosition(top);
      const reach = stride * duty / 2, hipOff = front ? K.len * .38 : -K.len * .36;
      let paw, contact;
      if (gait === 'stand' || sit > 0 || v < .08) {
        // at rest: paws planted under the joints (sitting: hind paws forward under the haunch)
        const ss = this.sAt(t) + (front ? hipOff : hipOff + sit * h * .25);
        paw = R.at(ss, side + (lg.sx > 0 ? -1 : 1) * K.girth * .55 * (yaw > 0 ? 1 : 1), 0); paw.y = R.y(ss) + y0;
        paw = base.clone().addScaledVector(fwd, front ? K.len * .38 + sit * .02 : -K.len * .3 + sit * h * .35).addScaledVector(left, lg.sx * K.girth * .6); paw.y = R.y(s) + y0;
        contact = 'ground';
      } else if (airK || (leap && t > leap.at - .02 && t < leap.land)) {
        const q2 = leap ? clamp((t - leap.at) / leap.air) : .5;
        const tuck = front ? V(0, -h * lerp(.55, .8, q2), lerp(.1, .3, q2) * h) : V(0, -h * lerp(.75, .55, q2), -h * lerp(.5, .1, q2));
        paw = top.clone().add(tuck.applyQuaternion(this.root.quaternion)); contact = 'air';
      } else {
        const p = ((ph - offs[nm]) % 1 + 1) % 1, cyc = Math.floor(ph - offs[nm]);
        const footAt = c => { const tt = this.Ph.inverse(c + offs[nm]), sq = this.sAt(tt), sd = this.sideAt(tt), off = front ? hipOff : hipOff; const P = R.at(sq + off + reach, sd + (lg.sx > 0 ? -1 : 1) * K.girth * .5, 0); P.y = R.y(sq + off + reach) + this.yAt(tt); return P; };
        if (p < duty) { paw = footAt(cyc); contact = 'ground'; }
        else {
          const a = footAt(cyc), bP = footAt(cyc + 1), k = (p - duty) / (1 - duty), e = smooth(k);
          paw = a.clone().lerp(bP, e); paw.y += Math.sin(Math.PI * k) * h * (gait === 'gallop' ? .32 : .22); contact = 'air';
        }
      }
      res.paws[nm] = paw.clone(); res.contact[nm] = contact;
      // IK: front = upper + lower (elbow pole back) to the wrist; hind = thigh + shin (knee pole forward) to the hock
      const lift = contact === 'air' ? 1 : 0;
      if (front) {
        const wrist = paw.clone().add(V(0, LG.fp, 0)).addScaledVector(fwd, -lift * LG.fp * .6);
        const k = ik2(top, wrist, LG.fu, LG.fl, fwd.clone().negate());
        aim(lg.u, top.clone().sub(k.K), fwd); aim(lg.l, k.K.clone().sub(k.T2), fwd);
        lg.p.rotation.set(lift ? 1.1 : 0, 0, 0);
        if (!k.reach && k.over > .02) res.bad.push(`${nm} out of reach ${(k.over * 100).toFixed(1)} cm`);
      } else {
        const hock = paw.clone().add(V(0, LG.hm * .92, 0)).addScaledVector(fwd, -LG.hm * (.38 - lift * .5));
        const k = ik2(top, hock, LG.hu, LG.hl, fwd);
        aim(lg.u, top.clone().sub(k.K), fwd); aim(lg.l, k.K.clone().sub(k.T2), fwd);
        const md = k.T2.clone().sub(paw.clone().add(V(0, .0, 0))); aim(lg.m, md, fwd);
        lg.p.rotation.set(lift ? -.5 : 0, 0, 0);
        if (!k.reach && k.over > .02) res.bad.push(`${nm} out of reach ${(k.over * 100).toFixed(1)} cm`);
      }
      // paw level on the ground when planted
      if (contact === 'ground') { const qp = new THREE.Quaternion(); lg.p.parent.getWorldQuaternion(qp); lg.p.quaternion.copy(qp.invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + Math.PI, 0)))); }
    }
    this.root.updateMatrixWorld(true);
    res.pos = pos.clone(); res.fwd = fwd; res.travel = R.tan(s);
    const hd = V(); this.head.getWorldPosition(hd); res.head = hd;
    return res;
  }
}
