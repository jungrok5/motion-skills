// principle-pass · rig.js — a side-view creature skeleton: spine curve, neck, head, ears, tail chain and limbs with
// three segments solved by two-bone IK to a planted foot (or posed free). Everything is solved in the creature's local
// side (forward = +x, y up, origin under the hips) and mirrored for face = -1.
//
// spec (all lengths in px at zoom 1):
//   plan: 'quad' | 'biped'
//   body:  { len, girth, hip: .9, belly: 1, chest: 1.05, upright: false }
//   neck:  { len, girth }
//   head:  { len, girth, snout: .45, beak: false, eye: [u, v], eyeR, ear: { len, w, shape: 'point'|'round'|'none' } }
//   tail:  { len, girth, segs: 6, bushy: 1, tip: .25 }                       (len 0 = no tail)
//   limbs: { fore: { len: [a, b, c], girth, slant, knee: -1, foot: 'paw' }, hind: { …, knee: 1 } }   (quad)
//          { leg: { len, girth, knee: 1, foot: 'flat' }, arm: { len: [a, b], girth, free: true } }   (biped)
//   attach: optional { fore: [along, across], hind: […], leg: […], arm: […] } in body lengths / girths
//   palette: { coat, shade, light, belly, dark, tip, eye, nose, beak, feet }
//   daub: 14 (stroke size), seed
export const ANG = (a, l) => [Math.cos(a) * l, Math.sin(a) * l];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k], len = a => Math.hypot(a[0], a[1]), angOf = v => Math.atan2(v[1], v[0]);
const PI = Math.PI;

const LIMB_SETS = { quad: [['fore', 'chest'], ['hind', 'hip']], biped: [['leg', 'hip'], ['arm', 'chest']] };
export class Critter {
  constructor(spec) {
    const s = this.spec = structuredClone(spec);
    s.plan ||= 'quad'; s.body = { hip: .9, belly: 1, chest: 1.05, upright: s.plan === 'biped', ...s.body };
    s.neck = { len: 0, girth: s.body.girth * .5, ...s.neck };
    s.head = { snout: .45, eye: [.42, .22], eyeR: 4.5, ...s.head }; s.head.ear = { len: 0, w: 10, shape: 'point', ...(s.head.ear || {}) };
    s.tail = { len: 0, girth: 16, segs: 6, bushy: 1, tip: .22, ...s.tail };
    s.daub ||= 14; s.seed ||= 7;
    this.limbs = [];
    for (const [kind, at] of LIMB_SETS[s.plan]) {
      const L = s.limbs?.[kind]; if (!L) continue;
      const d = { kind, at, len: [...L.len, 0, 0, 0].slice(0, 3), girth: L.girth || 12, knee: L.knee ?? (kind === 'fore' ? -1 : 1),
        slant: L.slant ?? (kind === 'hind' ? .38 : kind === 'fore' ? .08 : 0), foot: L.foot || (s.plan === 'biped' ? 'flat' : 'paw'),
        free: !!L.free, fold: L.fold ?? (kind === 'fore' ? 1.2 : kind === 'hind' ? -.9 : 0), attach: s.attach?.[kind] };
      for (const near of [false, true]) this.limbs.push({ ...d, id: kind[0].toUpperCase() + (near ? 'N' : 'F'), near });
    }
    this.reach = Object.fromEntries(this.limbs.map(l => [l.id, l.len[0] + l.len[1]]));
    this.bodyLen = s.body.len;
    this.rest = null; // knee/ankle bend signs of a neutral stance, set by calibrate()
  }
  // Neutral standing pose: hips at their natural height, feet under their roots.
  stand(x = 0, extra = {}) {
    const s = this.spec, P = { x, y: this.hipHeight(), pitch: 0, bend: 0, neck: s.plan === 'biped' ? 0 : .55, head: s.plan === 'biped' ? -1.45 : -.55,
      tail: .25, curl: .05, ear: 0, jaw: 0, lid: 0, sq: 1, face: 1, ...extra };
    return P;
  }
  // The hips' height when every standing leg is a little bent (92 % of its reach) — the lowest leg sets it.
  hipHeight() {
    if (this._hip) return this._hip;
    const S = this.solve({ x: 0, y: 0, pitch: 0, bend: 0, neck: 0, head: 0, tail: 0, curl: 0, face: 1, sq: 1 }, {}); let h = Infinity;
    for (const l of this.limbs) if (!l.free) { const [a, b, c] = l.len, foot = l.foot === 'flat' ? c * .2 : c * Math.cos(l.slant); h = Math.min(h, (a + b) * .92 + foot - S.limbs[l.id].root[1]); }
    return this._hip = isFinite(h) ? h : 60;
  }
  // Where each foot sits under its root in a pose (local x offset from the hips), for laying out plants.
  footHome(P, id) { const S = this.solve({ ...P, face: 1, x: 0 }, {}), l = this.limbs.find(l => l.id === id); return S.limbs[id].root[0] + (l.foot === 'flat' ? l.len[2] * .6 : 0); }

  // P: pose channels; feet: { id: [worldX, worldY] } for planted / swinging feet; fk: { id: [θ1, θ2, θ3] } (naive);
  // dyn: { tail: [world angles per seg], ears: [world angles] } overrides from follow-through.
  solve(P, { feet = {}, fk = null, dyn = {} } = {}) {
    const s = this.spec, f = P.face ?? 1, sq = P.sq ?? 1, br = P.breath || 0;
    const toW = p => [P.x + f * p[0], p[1]];
    const base = s.body.upright ? PI / 2 : 0, a0 = base + (P.pitch || 0), bend = P.bend || 0;
    const L = s.body.len * sq, G = s.body.girth / sq * (1 + .035 * br);
    const pelvis = [0, P.y], ctrl = add(pelvis, ANG(a0 - bend, L * .5)), chest = add(pelvis, ANG(a0, L));
    const chestAng = angOf(sub(chest, ctrl)) + (br * .02);
    const spine = u => { const w = 1 - u; return [w * w * pelvis[0] + 2 * w * u * ctrl[0] + u * u * chest[0], w * w * pelvis[1] + 2 * w * u * ctrl[1] + u * u * chest[1]]; };
    const bodyPts = [], bodyW = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6; bodyPts.push(spine(u)); bodyW.push(G * (u < .5 ? lerp(s.body.hip, s.body.belly, u * 2) : lerp(s.body.belly, s.body.chest, u * 2 - 1)) * (1 - .25 * Math.pow(Math.abs(u - .5) * 2, 6))); }
    // neck & head
    const up = ANG(chestAng + PI / 2, 1);
    const neckBase = add(chest, mul(up, G * (s.body.upright ? .05 : .22))), neckAng = chestAng + (P.neck || 0) + br * .015;
    const neckEnd = add(neckBase, ANG(neckAng, s.neck.len)), headAng = dyn.head ?? (neckAng + (P.head || 0));
    const H = s.head, hb = add(neckEnd, ANG(headAng, -H.len * .12)), hc = add(neckEnd, ANG(headAng, H.len * .28)), tip = add(neckEnd, ANG(headAng, H.len));
    const headN = ANG(headAng + PI / 2, 1);
    const jawAng = headAng - (P.jaw || 0) * .55, jawBase = add(neckEnd, add(ANG(headAng, H.len * .3), mul(headN, -H.girth * .18)));
    const jawTip = add(jawBase, ANG(jawAng, H.len * .62));
    const eye = add(add(neckEnd, ANG(headAng, H.len * H.eye[0])), mul(headN, H.girth * H.eye[1]));
    const ears = [];
    if (H.ear.len) for (const [k, off] of [[0, 0], [1, .12]]) {
      const root = add(add(neckEnd, ANG(headAng, H.len * (.06 - off))), mul(headN, H.girth * .36));
      const ea = dyn.ears?.[k] ?? (headAng + PI / 2 + .42 + (P.ear || 0) + off * .6);
      ears.push({ root, tip: add(root, ANG(ea, H.ear.len)), ang: ea, near: k === 0 });
    }
    // tail
    const tail = [], tailW = [], T = s.tail;
    if (T.len) {
      let p = add(pelvis, ANG(a0 + PI, G * .2)); p = add(p, mul(ANG(a0 + PI / 2, 1), G * .12)); tail.push(p);
      const seg = T.len / T.segs;
      for (let i = 0; i < T.segs; i++) {
        const a = dyn.tail?.[i] ?? (a0 + PI - (P.tail || 0) - (P.curl || 0) * i);
        p = add(p, ANG(a, seg)); tail.push(p);
      }
      for (let i = 0; i <= T.segs; i++) { const u = i / T.segs; tailW.push(T.girth * (.55 + T.bushy * .9 * Math.sin(PI * Math.min(1, u * .9 + .12))) * (u > .97 ? .5 : 1)); }
    }
    // limbs
    const limbs = {};
    for (const l of this.limbs) {
      const [a, b, c] = l.len, at = l.at === 'chest' ? 1 : 0, att = l.attach;
      let root = l.at === 'chest' ? add(chest, add(ANG(chestAng - PI / 2, G * .18), ANG(chestAng + PI, G * .2))) : add(pelvis, ANG(a0 - PI / 2, G * .12));
      if (att) root = add(at ? chest : pelvis, add(ANG(at ? chestAng : a0, (att[0] || 0) * s.body.len), ANG((at ? chestAng : a0) + PI / 2, (att[1] || 0) * G)));
      if (!l.near) root = add(root, [l.kind === 'arm' ? -2 : 3, 1.5]);
      limbs[l.id] = this.limb(l, root, P, a0, f, feet[l.id], fk?.[l.id]);
    }
    return { P, f, toW, a0, chestAng, neckAng, headAng, pelvis, chest, bodyPts, bodyW, neckBase, neckEnd, neckW: [s.neck.girth * 1.25, s.neck.girth],
      head: { pts: [hb, hc, tip], w: [H.girth * .78, H.girth, H.girth * H.snout], ang: headAng, eye, jaw: [jawBase, jawTip], n: headN }, ears, tail, tailW, limbs, G, L };
  }
  limb(l, root, P, a0, f, target, fk) {
    const [a, b, c] = l.len, kind = l.kind, tuck = P[kind + 'Tuck'] || 0, slant = l.slant + tuck * l.fold;
    const out = { root, rootL: root, id: l.id, short: 0 };
    let ankle, foot, knee;
    const fkPts = th => { knee = add(root, ANG(a0 + th[0], a)); ankle = add(knee, ANG(a0 + th[0] + th[1], b)); foot = add(ankle, ANG(a0 + th[0] + th[1] + th[2], c)); };
    if (fk) fkPts(fk);
    else {
      let T, footAng;
      if (target) T = [(target[0] - P.x) * f, target[1]];
      else { const reach = P[kind] || 0, d = (a + b + c * .8) * (1 - .42 * tuck); T = add(root, ANG(-PI / 2 + reach + (l.near ? 0 : (P[kind + 'Split'] || 0)), d)); }
      // T is always the foot's contact point (the paw, or the toe of a flat foot), planted or free, so a foot blended
      // from a plant into the free pose lands exactly where the free pose puts it
      if (l.foot === 'flat') { footAng = -.245 - .6 * tuck + (P[kind + 'Toe'] || 0); ankle = sub(T, ANG(footAng, c * .91)); }
      else if (c) { footAng = -PI / 2 + slant; ankle = sub(T, ANG(footAng, c)); }
      else ankle = T;
      // reach: past 94 % of the leg the ankle eases out toward full stretch instead of hitting it (no kink when a foot leaves)
      const v = sub(ankle, root), dRaw = len(v), m = a + b - .01, k0 = m * .94, base = angOf(v);
      const d = Math.max(Math.abs(a - b) + 1, dRaw <= k0 ? dRaw : k0 + (m - k0) * (1 - Math.exp(-(dRaw - k0) / (m - k0))));
      const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
      knee = add(root, ANG(base + l.knee * al, a));
      const ankle2 = add(root, ANG(base, d)); out.short = dRaw - d > .5 ? dRaw - d : 0;
      foot = c ? add(ankle2, sub(T, ankle)) : ankle2;
      ankle = ankle2;
      if (!target) out.short = 0;
    }
    out.knee = knee; out.ankle = ankle; out.foot = foot;
    // angles relative to the body (for the naive FK version)
    const r = x => { let v = x; while (v > PI) v -= 2 * PI; while (v < -PI) v += 2 * PI; return v; };
    const g1 = angOf(sub(knee, root)), g2 = angOf(sub(ankle, knee)), g3 = c ? angOf(sub(foot, ankle)) : g2;
    out.th = [r(g1 - a0), r(g2 - g1), r(g3 - g2)];
    out.pts = c ? [root, knee, ankle, foot] : [root, knee, ankle];
    out.w = (kind === 'hind' ? [l.girth * 2.1, l.girth * 1.05, l.girth * .7, l.girth * .62] : kind === 'arm' ? [l.girth * 1.2, l.girth, l.girth * .45] : [l.girth * 1.6, l.girth, l.girth * .75, l.girth * .68]).slice(0, out.pts.length);
    return out;
  }
  // Signs of the knee and ankle bends in the neutral stance: a joint must never bend the other way.
  calibrate() {
    const P = this.stand(0), S0 = this.solve(P), feet = {};
    for (const l of this.limbs) if (!l.free) feet[l.id] = [S0.toW(S0.limbs[l.id].root)[0] + (l.foot === 'flat' ? l.len[2] * .6 : 0), 0];
    const S = this.solve(P, { feet }), r = {};
    for (const l of this.limbs) r[l.id] = bends(S.limbs[l.id]).map(x => Math.sign(x) || 1);
    this.rest = r; return r;
  }
  // Joint report for one solved frame: [{ id, joint, deg, bad }]
  joints(S) {
    if (!this.rest) this.calibrate();
    const out = [];
    for (const l of this.limbs) {
      const L = S.limbs[l.id], bd = bends(L), names = ['knee', 'ankle'];
      bd.forEach((x, i) => { if (i === 1 && (!l.len[2] || l.foot === 'flat')) return;
        const deg = x * 180 / PI, wrong = Math.sign(x) !== this.rest[l.id][i] && Math.abs(deg) > (i ? 15 : 8), tight = Math.abs(deg) > 165;
        out.push({ id: l.id, joint: names[i], deg: +deg.toFixed(1), bad: wrong ? 'bends the wrong way' : tight ? 'folds past 165°' : '' }); });
      if (L.short > 1.5) out.push({ id: l.id, joint: 'reach', deg: +L.short.toFixed(1), bad: 'foot out of reach by ' + L.short.toFixed(1) + ' px' });
    }
    return out;
  }
}
function bends(L) {
  const p = L.pts, t = (a, b, c) => { const u = sub(b, a), v = sub(c, b); return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]); };
  return [t(p[0], p[1], p[2]), p[3] ? t(p[1], p[2], p[3]) : 0];
}
function lerp(a, b, u) { return a + (b - a) * u; }
