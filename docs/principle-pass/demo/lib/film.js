// principle-pass · film.js — one story, two passes. The same story keys play twice, one panel over the other:
//   before — what a first pass gives: story keys only, linear in-betweens, every part on the same curve, legs posed
//            at the keys and tweened (so feet slide), tail and ears rigid, no squash, no breath, no blink;
//   after  — the principles pass: eased spacing, a root path through the keys on smooth arcs (Hermite), the pass's
//            own keys (anticipation, overshoot, settle), planted feet with swing arcs, tail and ears on springs
//            (follow-through, overlap), squash & stretch that keeps area, breath, blinks and flicks.
// Then a study: both panels hold while the paths of the nose, hips and tail tip are drawn with a dot every 1/12 s
// (spacing and arcs made visible).
import * as Pr from './principles.js';
import { Critter, ANG, add, sub, len } from './rig.js';
import { hex, rgb, shadeC, mixC, seedDaubs, drawPart, paintGround, shadow, drawProp, chip } from './paint.js';

const PI = Math.PI, wrap = a => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
const CH = ['pitch', 'bend', 'neck', 'head', 'jaw', 'tail', 'curl', 'ear', 'lid', 'sq', 'face',
  'fore', 'foreTuck', 'foreSplit', 'hind', 'hindTuck', 'hindSplit', 'leg', 'legTuck', 'legSplit', 'legToe', 'arm', 'armTuck', 'armSplit'];

// ---------------------------------------------------------------- the motion of one side
export class Motion {
  constructor(C, def, mode) {
    this.C = C; this.def = def; this.mode = mode; const after = mode === 'after';
    const stand = C.stand(0); delete stand.x; delete stand.y;
    const ks = def.keys.filter(k => after || !k.pass).map(k => ({ ...k })).sort((a, b) => a.t - b.t);
    Object.assign(ks[0], { ...Object.fromEntries(CH.filter(c => c in stand).map(c => [c, stand[c]])), ...ks[0] });
    for (const k of ks) if (k.face != null) k.face = k.face; // face holds (eased flip happens in one frame below)
    this.ks = ks;
    const chanKeys = ks.map(k => { const o = { t: k.t, e: k.e }; for (const c of CH) if (c in k) o[c] = k[c]; return o; });
    this.ch = Pr.keys(chanKeys, { ease: after ? null : 'linear' });
    // the root path
    const R = []; let last = [ks[0].x ?? 0, ks[0].y ?? C.hipHeight()];
    for (const k of ks) if ('x' in k || 'y' in k) { last = [k.x ?? last[0], k.y ?? last[1]]; R.push({ t: k.t, p: last, stop: k.stop, impact: k.impact }); }
    if (!R.length || R[0].t > 0) R.unshift({ t: 0, p: R[0]?.p || last, stop: true });
    this.R = R;
    if (after) R.forEach((k, i) => {
      const prev = R[i - 1], next = R[i + 1];
      const fd = prev && next ? [(next.p[0] - prev.p[0]) / (next.t - prev.t), (next.p[1] - prev.p[1]) / (next.t - prev.t)] : [0, 0];
      k.mIn = k.stop || !prev || !next ? [0, 0] : fd; k.mOut = k.stop || k.impact || !prev || !next ? [0, 0] : fd;
      if (k.impact && prev) k.mIn = [(k.p[0] - prev.p[0]) / (k.t - prev.t) * 1.1, (k.p[1] - prev.p[1]) / (k.t - prev.t) * 1.1];
      if (k.impact === 'skid' && next) k.mOut = [k.mIn[0] * .9, 0]; // lands and keeps going along the ground (a belly slide, a skid)
    });
    const T1 = (def.duration || 10) + 1;
    if (after) {
      const F = def.follow || {}, life = def.life || {}, bl = C.bodyLen;
      const vy = t => (this.root(t + .01)[1] - this.root(t - .01)[1]) / .02 / bl, vx = t => (this.root(t + .01)[0] - this.root(t - .01)[0]) / .02 / bl;
      const tf = { f: 1.6, z: .42, droop: .5, delay: .03, ...F.tail }, ef = { f: 3.2, z: .3, ...F.ears };
      const segs = C.spec.tail.len ? C.spec.tail.segs : 0;
      this.tailDyn = Array.from({ length: segs }, (_, i) => Pr.dynamics(Pr.lag(t => {
        const c = this.ch(t), a0 = (C.spec.body.upright ? PI / 2 : 0) + c.pitch;
        return a0 + PI - c.tail - c.curl * i + tf.droop * Math.tanh(vy(t) * .6) * (i + 1) / segs * 1.4 - (C.spec.body.upright ? 0 : .12 * Math.tanh(vx(t) * .5) * (i + 1) / segs)
          + (life.sway ?? .05) * Pr.noise(t * .55 + i * .12, 9) * (i + 1) / segs;
      }, tf.delay * i), { f: tf.f * Math.pow(.93, i), z: tf.z, t0: -1, t1: T1 }));
      const earIn = k => t => { const c = this.ch(t); const S = C.solve({ ...c, x: 0, y: 80, breath: 0 }); return S.headAng + PI / 2 + .42 + c.ear + k * .12 * .6 - .55 * this.flicks(t, k); };
      this.earDyn = [0, 1].map(k => Pr.dynamics(earIn(k), { ...ef, f: ef.f * (k ? .9 : 1), t0: -1, t1: T1 }));
      const sf = { f: 4.2, z: .3, ...F.sq }, st = F.stretch ?? .018;
      this.sqDyn = Pr.dynamics(t => this.ch(t).sq * (1 + Math.min(.1, st * Math.hypot(vx(t), vy(t)))), { f: sf.f, z: sf.z, t0: -1, t1: T1 });
      if (F.head) this.headDyn = Pr.dynamics(t => { const c = this.ch(t); return C.solve({ ...c, x: 0, y: 80 }).headAng; }, { f: 2.6, z: .55, ...F.head, t0: -1, t1: T1 });
    }
    // feet
    this.plants = Object.fromEntries(Object.entries(def.plants || {}).map(([id, L]) => [id, [...L].sort((a, b) => a.t0 - b.t0)]));
    if (!after) { // capture each limb's angles at the story keys, then tween those angles (the classic sliding feet)
      const times = [...new Set([0, ...ks.map(k => k.t)])].sort((a, b) => a - b);
      this.fkKeys = {};
      for (const l of C.limbs) {
        if (!this.plants[l.id]) continue;
        const th = times.map(t => { const P = this.pose0(t), fr = C.solve(P), ff = fr.toW(fr.limbs[l.id].foot); return C.solve(P, { feet: { [l.id]: this.footTarget(l, t, P, ff) } }).limbs[l.id].th; });
        for (let i = 1; i < th.length; i++) th[i] = th[i].map((v, j) => th[i - 1][j] + wrap(v - th[i - 1][j]));
        this.fkKeys[l.id] = { times, th };
      }
    }
  }
  flicks(t, k) { return Math.max(0, ...(this.def.life?.flicks || []).filter(f => f.part === 'ear' && (f.side ?? k) === k).map(f => Pr.flick(t, f.t))); }
  root(t) {
    const R = this.R; if (t <= R[0].t) return R[0].p; if (t >= R[R.length - 1].t) return R[R.length - 1].p;
    let i = 1; while (R[i].t < t) i++;
    const a = R[i - 1], b = R[i], dt = b.t - a.t, s = (t - a.t) / dt;
    if (this.mode !== 'after') return [a.p[0] + (b.p[0] - a.p[0]) * s, a.p[1] + (b.p[1] - a.p[1]) * s];
    const s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    return [0, 1].map(j => h00 * a.p[j] + h10 * dt * a.mOut[j] + h01 * b.p[j] + h11 * dt * b.mIn[j]);
  }
  pose0(t) { const c = this.ch(t), r = this.root(t); return { ...c, x: r[0], y: r[1], face: (c.face ?? 1) >= 0 ? 1 : -1 }; }
  pose(t) {
    const P = this.pose0(t);
    if (this.mode === 'after') {
      const life = this.def.life || {};
      P.breath = Pr.breath(t, { period: life.breath ?? 2.4 });
      if (life.blink !== false) P.lid = Math.max(P.lid || 0, Pr.blinks(t, { seed: life.blinkSeed || 3, mean: life.blink || 3.4 }));
      P.sq = this.sqDyn(t);
    } else P.sq = 1;
    return P;
  }
  footTarget(l, t, P, freeFoot) {
    const L = this.plants[l.id]; if (!L || l.free) return null;
    const pt = q => [q.x, q.y || 0];
    if (t <= L[0].t1) return pt(L[0]);
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[i + 1];
      if (t >= a.t0 && t <= a.t1) return pt(a);
      if (b && t > a.t1 && t < b.t0) {
        const u = (t - a.t1) / (b.t0 - a.t1), d = Math.abs(b.x - a.x), legL = l.len[0] + l.len[1];
        const arcP = Pr.swing(pt(a), pt(b), b.h ?? Math.min(legL * .45, legL * .14 + d * .22), u);
        if (!freeFoot) return arcP;
        const w = Pr.smooth(u / .3) * Pr.smooth((1 - u) / .35) * Pr.clamp((b.t0 - a.t1 - .22) / .3); // a long swing (a leap) rides the body
        return [arcP[0] + (freeFoot[0] - arcP[0]) * w, arcP[1] + (freeFoot[1] - arcP[1]) * w];
      }
    }
    // after its last plant a foot with `release` lets go: it eases into the body's free pose over `release` seconds
    const z = L[L.length - 1];
    if (z.release && t > z.t1) { const u = Pr.smooth((t - z.t1) / z.release); if (u >= 1 || !freeFoot) return u >= 1 ? null : pt(z); return [z.x + (freeFoot[0] - z.x) * u, (z.y || 0) + (freeFoot[1] - (z.y || 0)) * u]; }
    return pt(z);
  }
  // Solve the whole body at t.
  frame(t) {
    const C = this.C, P = this.pose(t), after = this.mode === 'after';
    const dyn = {};
    if (after) {
      if (this.tailDyn.length) dyn.tail = this.tailDyn.map(f => f(t));
      dyn.ears = this.earDyn.map(f => f(t));
      if (this.headDyn) dyn.head = this.headDyn(t);
      const free = C.solve(P, { dyn }), feet = {};
      for (const l of C.limbs) { const fl = free.limbs[l.id]; const ft = this.footTarget(l, t, P, fl ? free.toW(fl.foot) : null); if (ft) feet[l.id] = ft; }
      return C.solve(P, { feet, dyn });
    }
    const fk = {};
    for (const [id, K] of Object.entries(this.fkKeys)) {
      const T = K.times; let i = 1; while (i < T.length - 1 && T[i] < t) i++;
      const u = Pr.clamp((t - T[i - 1]) / ((T[i] - T[i - 1]) || 1));
      fk[id] = K.th[i - 1].map((v, j) => v + (K.th[i][j] - v) * u);
    }
    return C.solve(P, { fk });
  }
}

// ---------------------------------------------------------------- drawing a creature
function partsOf(C) {
  if (C._parts) return C._parts;
  const s = C.spec, p = Object.fromEntries(Object.entries(s.palette).map(([k, v]) => [k, hex(v)])), sz = s.daub;
  p.shade ||= shadeC(p.coat, .8); p.light ||= mixC(p.coat, [255, 250, 240], .35); p.belly ||= p.light; p.dark ||= p.coat; p.tip ||= p.coat;
  const pick = (base, k, R) => k < .08 ? mixC(base, p.light, .3 + R() * .25) : k > .93 ? mixC(base, p.shade, .45) : mixC(base, k < .5 ? p.light : p.shade, R() * .16);
  let sd = s.seed * 1000;
  const P = {
    body: seedDaubs(++sd, s.body.len * s.body.girth * 1.05, sz, (u, v, k, R) => pick(v < (s.body.bellyFrom ?? -.42) ? p.belly : v > .6 && !s.body.upright ? mixC(p.coat, p.shade, .35) : p.coat, k, R)),
    neck: seedDaubs(++sd, (s.neck.len + 10) * s.neck.girth * 1.2, sz, (u, v, k, R) => pick(v < -.3 ? p.belly : p.coat, k, R)),
    head: seedDaubs(++sd, s.head.len * s.head.girth * .9, sz * .82, (u, v, k, R) => pick(s.head.beak && u > .7 ? (p.beak || p.dark) : v < -.3 && u > .25 ? p.belly : s.head.mask && v > -.05 && u > .35 && u < .62 ? p.dark : p.coat, k, R)),
    jaw: seedDaubs(++sd, s.head.len * s.head.girth * .22, sz * .7, (u, v, k, R) => pick(s.head.beak ? (p.beak || p.dark) : p.belly, k, R)),
    tail: s.tail.len ? seedDaubs(++sd, s.tail.len * s.tail.girth * 1.5 * s.tail.bushy, sz, (u, v, k, R) => pick(u > 1 - s.tail.tip ? p.tip : v < -.5 ? mixC(p.coat, p.belly, .5) : p.coat, k, R)) : [],
    ear: s.head.ear.len ? seedDaubs(++sd, s.head.ear.len * s.head.ear.w * 2, sz * .6, (u, v, k, R) => pick(u > .5 ? p.dark : p.coat, k, R)) : [],
  };
  P.limb = {};
  for (const l of C.limbs) P.limb[l.id] = seedDaubs(++sd + (l.near ? 0 : 50), (l.len[0] + l.len[1] + l.len[2]) * l.girth * 1.1, sz * .72,
    (u, v, k, R) => pick(l.kind === 'arm' ? (v < -.5 ? p.belly : p.coat) : l.foot === 'flat' && u > .62 ? (p.feet || p.dark) : u > .48 ? p.dark : p.coat, k, R));
  return C._parts = { P, pal: p };
}
export function drawCritter(g, cam, C, S, { alpha = 1, ghost = false } = {}) {
  const { P, pal } = partsOf(C), s = C.spec, o = { alpha, under: !ghost };
  const limb = (near, kinds) => { for (const l of C.limbs) if (l.near === near && kinds.includes(l.kind)) { const L = S.limbs[l.id]; drawPart(g, cam, S, L.pts, L.w, P.limb[l.id], l.kind === 'arm' ? pal.coat : pal.coat, { ...o, dim: near ? 1 : .76 }); } };
  const ear = near => { for (const e of S.ears) if (e.near !== near) continue; else if (s.head.ear.shape === 'round') drawPart(g, cam, S, [e.root, e.tip], [s.head.ear.w * 1.6, s.head.ear.w * .9], P.ear, pal.coat, { ...o, dim: near ? 1 : .78 });
    else { // a pointed ear: a painted triangle, darker toward the tip, a warm inside on the near ear
      const n = ANG(e.ang + PI / 2, s.head.ear.w * .55), b1 = add(e.root, n), b2 = sub(e.root, n), pt = q => { const w = S.toW(q); return [cam.X(w[0]), cam.Y(w[1])]; };
      const tri = (a, b, c, col) => { g.fillStyle = col; g.beginPath(); for (const q of [a, b, c].map(pt)) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); };
      const dm = near ? 1 : .78, mid = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      tri(b1, b2, e.tip, rgb(shadeC(pal.coat, .9 * dm), alpha));
      if (near && !ghost && pal.inner) tri(mid(b1, e.tip, .15), mid(b2, e.tip, .15), mid(e.root, e.tip, .78), rgb(shadeC(pal.inner, dm), alpha * .9));
      tri(mid(b1, e.tip, .55), mid(b2, e.tip, .55), e.tip, rgb(shadeC(pal.dark, .85 * dm), alpha));
    } };
  limb(false, ['fore', 'hind', 'leg']); limb(false, ['arm']); ear(false);
  if (S.tail.length) drawPart(g, cam, S, S.tail, S.tailW, P.tail, pal.coat, o);
  drawPart(g, cam, S, S.bodyPts, S.bodyW, P.body, pal.coat, { ...o, band: { color: pal.belly, to: (s.body.bellyFrom ?? -.42) - .05, skip: 1 } });
  if (s.neck.len) drawPart(g, cam, S, [S.neckBase, S.neckEnd], S.neckW, P.neck, pal.coat, o);
  drawPart(g, cam, S, S.head.jaw, [s.head.girth * .36, s.head.girth * .2], P.jaw, s.head.beak ? (pal.beak || pal.dark) : pal.belly, o);
  drawPart(g, cam, S, S.head.pts, S.head.w, P.head, pal.coat, o);
  limb(true, ['fore', 'hind', 'leg']);
  if (!ghost) { // eye, lid, nose
    const z = cam.zoom, e = S.toW(S.head.eye), r = s.head.eyeR * z, X = cam.X(e[0]), Y = cam.Y(e[1]);
    g.fillStyle = rgb(pal.eye || [24, 20, 18], alpha); g.beginPath(); g.ellipse(X, Y, r, r * 1.05, 0, 0, 2 * PI); g.fill();
    g.fillStyle = `rgba(255,255,255,${.85 * alpha})`; g.beginPath(); g.arc(X + r * .3 * S.f, Y - r * .35, r * .3, 0, 2 * PI); g.fill();
    const lid = S.P.lid || 0;
    if (lid > .02) { g.fillStyle = rgb(pal.coat, alpha); g.beginPath(); g.ellipse(X, Y - r * 1.1 + r * 1.15 * lid, r * 1.5, r * 1.2 * Math.min(1, lid + .2), 0, 0, 2 * PI); g.fill(); }
    if (!s.head.beak) { const n = S.toW(S.head.pts[2]); g.fillStyle = rgb(pal.nose || [30, 24, 22], alpha); g.beginPath(); g.ellipse(cam.X(n[0]), cam.Y(n[1]) - 1, 5 * z, 4 * z, 0, 0, 2 * PI); g.fill(); }
  }
  limb(true, ['arm']); ear(true);
}

// ---------------------------------------------------------------- the film
const LAYOUT = { stack: { W: 1080, H: 1350, panels: [[0, 0, 1080, 673], [0, 677, 1080, 673]] }, side: { W: 1920, H: 1080, panels: [[0, 0, 958, 1080], [962, 0, 958, 1080]] } };
export class Film {
  constructor(def) {
    this.def = def; const L = LAYOUT[def.layout || 'stack']; this.W = L.W; this.H = L.H;
    this.C = def.critter instanceof Critter ? def.critter : new Critter(def.critter); this.C.calibrate();
    this.DURATION = def.duration; this.FPS = def.fps || 30;
    this.sides = ['before', 'after'];
    this.motion = { before: new Motion(this.C, def, 'before'), after: new Motion(this.C, def, 'after') };
    const cam = { x: 0, ground: .8, zoom: 1, ...def.cam };
    this.panels = this.sides.map((side, i) => { const [x, y, w, h] = L.panels[i], gy = h * cam.ground;
      return { side, x, y, w, h, gy, cam: { zoom: cam.zoom, X: wx => x + w / 2 + (wx - cam.x) * cam.zoom, Y: wy => y + gy - wy * cam.zoom } }; });
    this._tracks = {};
  }
  get studyT0() { return this.def.study?.t0 ?? this.DURATION; }
  solved(side, t) { return this.motion[side].frame(Math.min(t, side === 'before' ? this.studyT0 : 1e9)); }
  points(S, cam) {
    const W = p => { const w = S.toW(p); return [cam.X(w[0]), cam.Y(w[1])]; }, o = { pelvis: W(S.pelvis), chest: W(S.chest), head: W(S.head.pts[1]), nose: W(S.head.pts[2]) };
    if (S.tail.length) { o.tailMid = W(S.tail[Math.floor(S.tail.length / 2)]); o.tailTip = W(S.tail[S.tail.length - 1]); }
    if (S.ears.length) o.earTip = W(S.ears[0].tip);
    for (const id in S.limbs) o['foot' + id] = W(S.limbs[id].foot);
    return o;
  }
  track(side, fps = 60) {
    const key = side + fps; if (this._tracks[key]) return this._tracks[key];
    const d = this.def, cam = this.panels[1].cam, to = Math.min(d.study?.t0 ?? d.duration, d.duration), n = Math.round(to * fps) + 1, pts = {}, sq = [];
    for (let i = 0; i < n; i++) { const t = i / fps, S = this.motion[side].frame(t), p = this.points(S, cam); for (const k in p) (pts[k] ||= []).push(p[k]); sq.push([1 / (S.P.sq || 1), S.P.sq || 1]); }
    const chains = [['pelvis', 'tailTip', 'chest'], ['head', 'earTip', 'nose']].filter(([a, b]) => pts[a] && pts[b]);
    const planted = [];
    for (const [id, L] of Object.entries(d.plants || {})) for (const p of L) if (p.t1 - p.t0 > .1 && pts['foot' + id]) planted.push({ point: 'foot' + id, t0: p.t0 + .02, t1: Math.min(p.t1, to) - .02 });
    return this._tracks[key] = { fps, scale: this.C.bodyLen * cam.zoom, root: 'pelvis', points: pts, squash: sq,
      beats: (d.beats || []).map(b => ({ name: b.name, t0: b.t0, t1: b.t1, big: !!b.big, point: b.point || 'pelvis', parts: b.parts })),
      chains, planted: planted.filter(p => p.t1 > p.t0), rest: (d.rest || []).map(r => ({ t0: r.t0, t1: r.t1 })), impacts: d.keys.filter(k => k.impact).map(k => k.t) };
  }
  audit() { return Pr.compare(this.track('before'), this.track('after')); }
  rigReport(fps = 30) {
    const out = { before: { frames: 0, bad: [] }, after: { frames: 0, bad: [] } };
    for (const side of this.sides) for (let t = 0; t <= this.DURATION; t += 1 / fps) {
      const S = this.motion[side].frame(t), J = this.C.joints(S); out[side].frames++;
      for (const j of J) if (j.bad && (j.joint !== 'reach' || side === 'after' && this.plantedAt(j.id, t))) out[side].bad.push({ t: +t.toFixed(2), ...j });
    }
    return out;
  }
  plantedAt(id, t) { return (this.def.plants?.[id] || []).some(p => t >= p.t0 && t <= p.t1); }
  ground(p) { return p._g ||= paintGround(p.w, p.h, p.gy, { paper: '#f1ece2', ground: '#e4ddd0', ...this.def.look }, (this.def.look?.seed || 11)); }
  beatAt(t) { return (this.def.beats || []).find(b => t >= b.t0 && t < b.t1 + (b.hold ?? .25)); }
  render(g, t) {
    const d = this.def; g.save(); g.fillStyle = '#9a958c'; g.fillRect(0, 0, this.W, this.H);
    for (const p of this.panels) {
      g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
      g.drawImage(this.ground(p), p.x, p.y);
      const S = this.solved(p.side, t), tt = p.side === 'before' ? Math.min(t, this.studyT0) : t;
      for (const pr of d.props || []) if (!pr.front) drawProp(g, p.cam, pr, tt);
      this.shadows(g, p, S);
      if (t >= this.studyT0) this.ghosts(g, p);
      drawCritter(g, p.cam, this.C, S);
      for (const pr of d.props || []) if (pr.front) drawProp(g, p.cam, pr, tt);
      if (t >= this.studyT0) this.study(g, p, t);
      this.labels(g, p, t);
      g.restore();
    }
    g.restore();
  }
  shadows(g, p, S) {
    const c = p.cam, z = c.zoom, gy = c.Y(0), mid = S.toW([(S.pelvis[0] + S.chest[0]) / 2, 0]);
    const h = Math.min(S.pelvis[1], S.chest[1]) - this.C.hipHeight() * .6, k = Pr.clamp(1 - h / 220);
    shadow(g, c.X(mid[0]), gy + 3, (this.C.bodyLen * .62 + 20) * z * (1 + Math.max(0, h) / 400), 16 * z, k * .9);
    for (const id in S.limbs) { const f = S.toW(S.limbs[id].foot); if (S.limbs[id].pts.length < 4 && this.C.spec.plan === 'biped' && id[0] === 'A') continue;
      shadow(g, c.X(f[0]), gy + 2, 16 * z, 5 * z, Pr.clamp(1 - f[1] / 40) * .8); }
  }
  ghosts(g, p) {
    const st = this.def.study || {}, n = st.ghosts ?? 5, to = this.studyT0, from = st.from ?? 0;
    for (let i = 0; i < n; i++) { const t = from + (to - from) * (i + .5) / n; drawCritter(g, p.cam, this.C, this.motion[p.side].frame(t), { alpha: .16, ghost: true }); }
  }
  study(g, p, t) {
    const st = this.def.study || {}, u = Pr.E.inOut((t - this.studyT0) / (st.draw ?? 1.2)), tr = this.track(p.side, 60), from = Math.round((st.from ?? 0) * 60);
    const names = (st.points || ['nose', 'pelvis', 'tailTip']).filter(n => tr.points[n]), cols = st.colors || ['#c2412d', '#2f5d8a', '#3f7a4a', '#7a4a8a'];
    const pts = names.map(n => tr.points[n].slice(from)), N = pts[0].length, upto = Math.max(2, Math.round(N * u));
    const oy = p.side === 'after' ? 0 : p.y - this.panels[1].y; // the track was taken in the after panel's frame
    names.forEach((n, j) => {
      const P = pts[j]; g.strokeStyle = cols[j % cols.length]; g.globalAlpha = .55; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < upto; i++) i ? g.lineTo(P[i][0], P[i][1] + oy) : g.moveTo(P[i][0], P[i][1] + oy); g.stroke();
      g.globalAlpha = .95; g.fillStyle = cols[j % cols.length];
      for (let i = 0; i < upto; i += 5) { g.beginPath(); g.arc(P[i][0], P[i][1] + oy, 3.4, 0, 2 * PI); g.fill(); }
      g.globalAlpha = 1;
    });
    if (p.side === 'after' && u > .2) {
      g.globalAlpha = Pr.clamp((u - .2) * 3); const lab = st.legend || names.map(n => ({ nose: 'nose', pelvis: 'hips', tailTip: 'tail tip', head: 'head', earTip: 'ear tip', chest: 'chest' }[n] || n));
      let x = p.x + 24; const y = p.y + p.h - 58;
      lab.forEach((s, j) => { g.fillStyle = cols[j % cols.length]; g.beginPath(); g.arc(x + 8, y + 18, 7, 0, 2 * PI); g.fill(); x += 22; x += chip(g, s, x, y, { size: 20, bg: 'rgba(255,255,255,0)', pad: .2 }) + 10; });
      chip(g, 'one dot = 1/12 s', x + 4, y, { size: 20, bg: 'rgba(255,255,255,0)', fg: '#5b554c', pad: .2 });
      g.globalAlpha = 1;
    }
  }
  labels(g, p, t) {
    const d = this.def, L = d.labels || {};
    chip(g, p.side === 'before' ? (L.before || 'before') : (L.after || 'after'), p.x + 20, p.y + 18, { size: 26 });
    const b = t < this.studyT0 ? this.beatAt(t) : null;
    if (p.side === 'after') {
      if (b) {
        chip(g, b.label || b.name, p.x + p.w / 2, p.y + p.h - (d.layout === 'side' ? 120 : 64), { size: 28, align: 'center' });
        if (b.tags?.length && d.tags !== false) { let y = p.y + 18; const x = p.x + p.w - 20;
          for (const tg of b.tags) { chip(g, tg, x, y, { size: 19, align: 'right', bg: 'rgba(255,255,255,.72)', fg: '#3b3630' }); y += 34; } }
      } else if (t >= this.studyT0) chip(g, L.study || 'spacing · arcs', p.x + p.w / 2, p.y + 18, { size: 24, align: 'center' });
    }
  }
  // ---- the cast sheet: turnaround, the beat's keys both ways, the idle, a turn
  castSheet(cell = 220) {
    const C = this.C, cols = 7, rows = [], d = this.def, cx = d.cam?.x || 0;
    const mirror = def => ({ ...def, keys: def.keys.map(k => ({ ...k, ...(k.x != null ? { x: 2 * cx - k.x } : {}), face: -1 })),
      plants: Object.fromEntries(Object.entries(def.plants || {}).map(([id, L]) => [id, L.map(q => ({ ...q, x: 2 * cx - q.x }))])),
      props: (def.props || []).map(pr => ({ ...pr, at: typeof pr.at === 'function' ? (t => { const a = pr.at(t); return [2 * cx - a[0], a[1]]; }) : [2 * cx - pr.at[0], pr.at[1]] })) });
    const mR = this.motion.after, mL = new Motion(C, mirror(d), 'after');
    const keyT = [...new Set(d.keys.filter(k => !k.cast_skip).map(k => k.t))].sort((a, b) => a - b), pickT = keyT.length > cols ? Array.from({ length: cols }, (_, i) => keyT[Math.round(i * (keyT.length - 1) / (cols - 1))]) : keyT;
    rows.push({ name: 'beat keys →', cells: pickT.map(t => ({ S: mR.frame(t), lab: t.toFixed(2) + ' s' })) });
    rows.push({ name: 'beat keys ←', cells: pickT.map(t => ({ S: mL.frame(t), lab: t.toFixed(2) + ' s' })) });
    const r0 = d.rest?.[0] || { t0: 0, t1: 1 };
    rows.push({ name: 'idle (breath, blink)', cells: Array.from({ length: cols }, (_, i) => { const t = r0.t0 + (r0.t1 - r0.t0) * i / (cols - 1); return { S: mR.frame(t), lab: t.toFixed(2) + ' s' }; }) });
    const turn = turnMotion(C), tT = [0, .3, .5, .62, .63, .8, 1.05];
    rows.push({ name: 'turn: gather, flip, step out', cells: tT.map(t => ({ S: turn.frame(t), lab: t.toFixed(2) + ' s' })) });
    const W = cols * cell + 180, H = rows.length * cell * .8 + 20, c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#f1ece2'; g.fillRect(0, 0, W, H);
    const k = cell / (C.bodyLen * 2.6);
    rows.forEach((r, ri) => {
      const y0 = 10 + ri * cell * .8; g.fillStyle = '#3b3630'; g.font = '600 15px PPInter, sans-serif'; g.fillText(r.name, 10, y0 + cell * .4);
      r.cells.forEach((cl, ci) => {
        const x0 = 170 + ci * cell, gyy = y0 + cell * .66, S = cl.S, px = S.P.x;
        const off = C.spec.body.upright && Math.abs(S.P.pitch || 0) < .8 ? 0 : C.bodyLen * .35, cam = { zoom: k, X: wx => x0 + cell / 2 + (wx - px - S.f * off) * k, Y: wy => gyy - wy * k };
        g.strokeStyle = '#cfc6b6'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 + 6, gyy); g.lineTo(x0 + cell - 6, gyy); g.stroke();
        drawCritter(g, cam, C, S);
        g.fillStyle = '#7a7266'; g.font = '500 11px PPInter, sans-serif'; g.fillText(cl.lab, x0 + 8, y0 + 14);
        const bad = C.joints(S).filter(j => j.bad && j.joint !== 'reach'); if (bad.length) { g.fillStyle = '#c0392b'; g.fillText('✗ ' + bad[0].id + ' ' + bad[0].joint, x0 + 8, y0 + 28); }
      });
    });
    return c;
  }
}
// A stepped 2D turn on the spot for the cast sheet: feet gather under the body, it flips on one frame, feet step out.
export function turnMotion(C) {
  const st = C.stand(0), quad = C.spec.plan === 'quad', L = C.bodyLen, keys = [{ t: 0, ...st, stop: true }, { t: .3, x: 0, y: st.y - 4, stop: true }, { t: .62, x: 0, y: st.y - 8, stop: true, face: 1 },
    { t: .63, x: quad ? L : 0, y: st.y - 8, face: -1, stop: true }, { t: 1.05, x: quad ? L : 0, y: st.y, stop: true }];
  const plants = {};
  for (const l of C.limbs) {
    if (l.free) continue; const home = C.footHome(st, l.id), mid = quad ? L / 2 : 0, g = quad ? (l.kind === 'fore' ? mid + L * .32 : mid - L * .32) : home, dl = l.near ? 0 : .06;
    const g2 = quad ? 2 * mid - g : -home + (l.near ? 0 : 0), back = quad ? (l.kind === 'fore' ? L - home : L - home) : -home;
    plants[l.id] = [{ t0: 0, t1: .12 + dl + (l.kind === 'hind' ? .12 : 0), x: home }, { t0: .3 + dl + (l.kind === 'hind' ? .12 : 0), t1: .625, x: g },
      { t0: .63, t1: .72 + dl, x: g2 }, { t0: .92 + dl, t1: 2, x: quad ? L - home : back }];
  }
  return new Motion(C, { keys, plants, duration: 2, life: { blink: false } }, 'after');
}

// ---------------------------------------------------------------- mount
export async function mount(def, opts = {}) {
  const q = new URLSearchParams(location.search), film = new Film(def);
  try { const ff = new FontFace('PPInter', `url(${new URL('./fonts/Inter-600.woff2', import.meta.url)})`, { weight: '500 700' }); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('font', e.message); }
  const scale = +(q.get('scale') || 1), cv = document.createElement('canvas');
  cv.width = Math.round(film.W * scale); cv.height = Math.round(film.H * scale);
  const g = cv.getContext('2d'); document.body.appendChild(cv);
  Object.assign(document.body.style, { margin: 0, background: '#1c1b19', display: 'grid', placeItems: 'center', minHeight: '100vh' });
  Object.assign(cv.style, { maxWidth: '100vw', maxHeight: '100vh', width: 'auto', height: 'auto', display: 'block' });
  const draw = t => { g.setTransform(scale, 0, 0, scale, 0, 0); film.render(g, t); };
  window.DURATION = film.DURATION; window.FPS = film.FPS;
  window.seek = t => draw(Math.max(0, Math.min(film.DURATION, t)));
  window.__film = { film, def, track: s => film.track(s), audit: () => film.audit(), rig: () => film.rigReport(), cast: null, title: def.title };
  window.__principles = { fps: 60, sides: film.sides, track: s => film.track(s) };
  if (q.has('cast')) {
    const c = film.castSheet(+(q.get('cell') || 220)); const out = document.createElement('canvas'); out.width = c.width; out.height = c.height; out.getContext('2d').drawImage(c, 0, 0);
    window.__film.cast = out; cv.replaceWith(out); Object.assign(out.style, { maxWidth: '100vw' }); window.__ready = true; return film;
  }
  if (q.has('render')) { window.seek(+(q.get('t') || 0)); window.__ready = true; return film; }
  let t0 = performance.now() - (+(q.get('t') || 0)) * 1000, paused = false, pt = 0;
  cv.addEventListener('click', () => { paused = !paused; if (!paused) t0 = performance.now() - pt * 1000; });
  const loop = () => { if (!paused) { pt = ((performance.now() - t0) / 1000) % film.DURATION; window.seek(pt); } requestAnimationFrame(loop); };
  window.seek(0); window.__ready = true; requestAnimationFrame(loop);
  return film;
}
