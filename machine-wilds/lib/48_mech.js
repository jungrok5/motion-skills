// machine-wilds · 48_mech — LR.mech: a machine as a mechanism.  Every bone's place in the world is a pure function of
// a command (where the body is, where each foot must be, what the neck and head do) — nothing is simulated, so any
// instant can be drawn or checked in any order.  This file is numbers only (no THREE): it also runs in Node
// (scripts/gym.mjs), where the checks walk a machine across the land thousands of times in a second.
//
// Spaces.  World: x east, y up, z south, metres.  A body, a foot and a head: x forward, y up, z right.  A segment of
// a limb, a neck link, a toe, a cylinder: X the hinge pin, Y along the part (upper joint → lower joint), Z = X × Y.
//
// Limbs are planar chains (after machine-build-reel's mbr/kin.py):
//   'mammal' — the plane holds the body's fore-aft axis and swings out about it (abduction); 2 or 3 segments;
//   'insect' — a coxa sticks out and yaws about the body's up axis, the plane is upright; 2 segments.
//   3 segments: the last one (tarsus) leans `gamma` degrees off the plane's upright, away from the knee side, and the
//   first two are solved to its top (a heron's or a giraffe's leg).  2 segments: the law of cosines.
//   `knee`: +1 the middle joint goes toward the plane's +u (forward for a mammal, outward-up for an insect), −1 back.
{
  const M = (LR.mech = { kinds: {}, units: [], routes: {} });
  const D2R = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const mad = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // turn v about the unit axis k by a radians
  const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), kd = dot(k, v) * (1 - c); return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd]; };
  M.v = { add, sub, mul, mad, dot, cross, len, norm, lerp: lerp3, rot };
  // a frame: its three axes in the world and its origin.  frame(x, y, p): Y is kept, X is squared to it, Z = X × Y
  const frame = (x, y, p) => { y = norm(y); x = sub(x, mul(y, dot(x, y))); if (len(x) < 1e-7) { x = Math.abs(y[1]) < 0.9 ? cross([0, 1, 0], y) : cross([1, 0, 0], y); } x = norm(x); return { x, y, z: cross(x, y), p: [p[0], p[1], p[2]] }; };
  const fxyz = (x, y, z, p) => ({ x, y, z, p: [p[0], p[1], p[2]] });
  const apply = (f, v) => [f.p[0] + f.x[0] * v[0] + f.y[0] * v[1] + f.z[0] * v[2], f.p[1] + f.x[1] * v[0] + f.y[1] * v[1] + f.z[1] * v[2], f.p[2] + f.x[2] * v[0] + f.y[2] * v[1] + f.z[2] * v[2]];
  const fdir = (f, v) => [f.x[0] * v[0] + f.y[0] * v[1] + f.z[0] * v[2], f.x[1] * v[0] + f.y[1] * v[1] + f.z[1] * v[2], f.x[2] * v[0] + f.y[2] * v[1] + f.z[2] * v[2]];
  const local = (f, w) => { const d = sub(w, f.p); return [dot(d, f.x), dot(d, f.y), dot(d, f.z)]; };
  Object.assign(M, { frame, apply, dir: fdir, local, D2R });
  // a body's frame from where it is, its heading (radians: 0 east, +π/2 south), pitch (nose up +) and roll (right side down +)
  M.bodyFrame = (p, h, pitch = 0, roll = 0) => {
    const f0 = [Math.cos(h), 0, Math.sin(h)], r0 = [-Math.sin(h), 0, Math.cos(h)], cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const f = [f0[0] * cp, sp, f0[2] * cp], u1 = [-f0[0] * sp, cp, -f0[2] * sp];
    return fxyz(f, [r0[0] * sr + u1[0] * cr, u1[1] * cr, r0[2] * sr + u1[2] * cr], [r0[0] * cr - u1[0] * sr, -u1[1] * sr, r0[2] * cr - u1[2] * sr], p);
  };

  // planar 2-bone IK from (0,0) to (tx,tz): the middle joint, the end it reaches, and how far the target had to be pulled in (m)
  const twoBone = (tx, tz, L1, L2, side) => {
    let d = Math.hypot(tx, tz), clamp = 0; const lo = Math.abs(L1 - L2) * 1.001 + 1e-6, hi = (L1 + L2) * 0.9995;
    if (d > hi) { clamp = d - hi; tx *= hi / d; tz *= hi / d; d = hi; }
    else if (d < lo) { clamp = lo - d; if (d < 1e-9) { tx = 0; tz = -lo; } else { tx *= lo / d; tz *= lo / d; } d = lo; }
    const a = Math.atan2(tz, tx), b = Math.acos(LR.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), k = a + side * b;
    return [[L1 * Math.cos(k), L1 * Math.sin(k)], [tx, tz], clamp];
  };
  M.twoBone = twoBone;
  const SEG = { 2: ['thigh', 'shin'], 3: ['thigh', 'shin', 'tarsus'] }, JNT = { 2: ['hip', 'knee'], 3: ['hip', 'knee', 'ankle'] };

  class Limb {
    constructor(s) {
      this.s = s; this.name = s.name; this.kind = s.kind || 'mammal'; this.at = s.at.slice(); this.segs = s.segs.slice(); this.n = this.segs.length;
      if (this.n !== 2 && this.n !== 3) throw new Error(`limb ${this.name}: 2 or 3 segments`);
      this.knee = s.knee === undefined ? 1 : s.knee; this.gamma = s.gamma === undefined ? 10 : s.gamma; this.coxa = s.coxa || 0; this.hipDrop = s.hipDrop || 0;
      this.side = this.at[2] > 1e-6 ? 1 : this.at[2] < -1e-6 ? -1 : 0;                       // +1 right
      this.segNames = SEG[this.n]; this.jointNames = JNT[this.n]; this.ball = s.ball === undefined ? 0.4 : s.ball; this.width = s.width || 0.5; this.drum = s.drum || this.width * 0.9;
      const dg = s.toes === undefined ? 3 : s.toes; this.toes = Array.isArray(dg) ? dg : dg === 3 ? [-38, 38, 180] : dg === 4 ? [-40, 0, 40, 180] : Array.from({ length: dg }, (_, i) => (360 * i) / dg);
      this.toeLen = s.toeLen || this.ball * 3.2; this.acts = s.act || this.segs.map(() => 1); this.anchors = {}; this.home = s.home.slice();
      this.reach = this.segs[0] + this.segs[1];                                             // what the first two segments span, straight
    }
    bone(i) { return `${this.segNames[i]}_${this.name}`; }
    // the plane for a target in the world: the chain's root O, in-plane axes u (level-ish) and w (up-ish), the pin n = u × w
    plane(B, target) {
      const tb = local(B, target), d = sub(tb, this.at); let ub, wb, Ob, ang;
      if (this.kind === 'insect') { const psi = Math.atan2(d[2], d[0]); ub = [Math.cos(psi), 0, Math.sin(psi)]; wb = [0, 1, 0]; Ob = mad(this.at, ub, this.coxa); ang = psi; }
      else { const phi = Math.abs(d[1]) > 1e-9 || Math.abs(d[2]) > 1e-9 ? Math.atan2(d[2], -d[1]) : 0; ub = [1, 0, 0]; wb = [0, Math.cos(phi), -Math.sin(phi)]; Ob = mad(this.at, wb, -this.hipDrop); ang = phi; }
      const u = norm(fdir(B, ub)), w = norm(fdir(B, wb));
      return { A: apply(B, this.at), O: apply(B, Ob), u, w, n: cross(u, w), ang };
    }
    // joint positions for the ball of the foot at `target`
    solve(B, target, gamma) {
      const P = this.plane(B, target), p = sub(target, P.O), tx = dot(p, P.u), tz = dot(p, P.w); let pts, clamp;
      if (this.n === 3) { const g0 = (gamma === undefined ? this.gamma : gamma) * D2R, minB = (this.s.ankleMin === undefined ? 20 : this.s.ankleMin) * D2R, K = this.knee, L3 = this.segs[2]; let g = g0, r, ax, az;
        const at = (q) => { ax = tx - K * Math.sin(q) * L3; az = tz + Math.cos(q) * L3; r = twoBone(ax, az, this.segs[0], this.segs[1], K); return K * LR.wrapPi(-Math.PI / 2 + K * q - Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0])); };
        // the tarsus leans with the fold, as a heron's does: as the leg shortens the shin swings back and the tarsus goes part of
        // the way with it (so the ankle's own hinge works over a range a cylinder can follow) — and the ankle never straightens
        let b = at(g); if (this.bendRest !== undefined) { const k = this.s.ankleFollow === undefined ? 0.6 : this.s.ankleFollow; g = LR.clamp(g0 - k * (b - this.bendRest), -12 * D2R, 55 * D2R); b = at(g); }
        for (let it = 0; it < 3 && b < minB - 1e-4; it++) { g = Math.min(g + (minB - b) * 1.05, 80 * D2R); b = at(g); }
        clamp = r[2]; pts = [[0, 0], r[0], r[1], [r[1][0] + (tx - ax), r[1][1] + (tz - az)]]; P.gamma = g / D2R; P.ankle = b; }
      else { const r = twoBone(tx, tz, this.segs[0], this.segs[1], this.knee); clamp = r[2]; pts = [[0, 0], r[0], r[1]]; }
      P.J = pts.map((q) => [P.O[0] + P.u[0] * q[0] + P.w[0] * q[1], P.O[1] + P.u[1] * q[0] + P.w[1] * q[1], P.O[2] + P.u[2] * q[0] + P.w[2] * q[1]]);
      P.p2 = pts; P.th = []; for (let i = 0; i < this.n; i++) P.th.push(Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]));
      P.clamp = clamp; P.span = Math.hypot(pts[2][0], pts[2][1]) / this.reach;                 // how straight the first two segments are (1 = fully)
      return P;
    }
    parentDir() { return this.kind === 'insect' ? 0 : -Math.PI / 2; }                        // the part the first segment hinges on: a coxa sticks out, a hip block hangs
    // hinge angles (radians, each segment against the part above it) — what a cylinder has to follow
    hinges(sol) { const th = [this.parentDir(), ...sol.th], out = []; for (let i = 0; i < this.n; i++) out.push(LR.wrapPi(th[i + 1] - th[i])); return out; }
    // the bend between consecutive segments (sine of the angle): its sign must never flip, and it must never fold shut
    bends(sol) { const out = []; for (let i = 0; i < this.n - 1; i++) out.push(LR.wrapPi(sol.th[i + 1] - sol.th[i])); return out; }                          // radians: 0 straight, ±π folded shut; the sign is the side it bends to
    upLen(j) { return j > 0 ? this.segs[j - 1] : this.kind === 'insect' ? Math.max(this.coxa, 1e-3) : Math.max(2 * this.hipDrop, 0.2 * this.segs[0]); }
  }
  M.Limb = Limb;
  // the two ends of a cylinder across joint j: the barrel's eye on the upper part, the rod's eye on the lower one
  const actPoints = (limb, sol, j, anc) => {
    const th = [limb.parentDir(), ...sol.th], tu = th[j], tl = th[j + 1], u = sol.u, w = sol.w, n = sol.n, pv = sol.J[j], lat = anc.lat || 0;
    const v2 = (t, a, h) => [(Math.cos(t) * a - Math.sin(t) * h), (Math.sin(t) * a + Math.cos(t) * h)];
    const q = (c) => [pv[0] + u[0] * c[0] + w[0] * c[1] + n[0] * lat, pv[1] + u[1] * c[0] + w[1] * c[1] + n[1] * lat, pv[2] + u[2] * c[0] + w[2] * c[1] + n[2] * lat];
    return [q(v2(tu, -anc.a_up, anc.h_up)), q(v2(tl, anc.a_lo, anc.h_lo))];
  };
  M.actPoints = actPoints;
  const defaultAnchor = (l, j) => ({ a_up: 0.38 * l.upLen(j), h_up: 0.9 * l.width, a_lo: 0.22 * l.segs[j], h_lo: 0.9 * l.width, lat: 0 });

  // ── a kind of machine: its bones and its pose ──────────────────────────────────────────────────────────────────
  // spec: { ride (hip girder above the ground at rest), limbs:[{ name, at:[x,y,z], kind, segs, knee, gamma, coxa, hipDrop, home:[x,z], width, drum,
  //   ball, toes, toeLen, act }], neck:{ at, links:[[length, elevation°], …] }, head:{ len }, extras:[{ name, parent, type:'fixed'|'spin'|'lag', at, dir, len, … }] }
  class Kin {
    constructor(S) {
      this.S = S; this.limbs = S.limbs.map((l) => new Limb(l)); this.limb = {}; for (const l of this.limbs) this.limb[l.name] = l;
      this.neck = (S.neck && S.neck.links) || []; this.neckAt = (S.neck && S.neck.at) || [0, 0, 0]; this.head = S.head || null; this.extras = S.extras || [];
      const B = (this.bones = []); B.push(['body', null]);
      for (const l of this.limbs) { B.push([`hip_${l.name}`, 'body']); let par = `hip_${l.name}`; for (let i = 0; i < l.n; i++) { B.push([l.bone(i), par]); par = l.bone(i); }
        B.push([`foot_${l.name}`, par]); for (let k = 0; k < l.toes.length; k++) B.push([`toe${k}_${l.name}`, `foot_${l.name}`]);
        for (let j = 0; j < l.n; j++) if (l.acts[j]) { B.push([`act_${l.jointNames[j]}_${l.name}_cyl`, j === 0 ? `hip_${l.name}` : l.bone(j - 1)]); B.push([`act_${l.jointNames[j]}_${l.name}_rod`, l.bone(j)]); } }
      let par = 'body'; this.neck.forEach((_, i) => { const nm = `neck_${String(i + 1).padStart(2, '0')}`; B.push([nm, par]); par = nm; }); if (this.head) B.push(['head', par]);
      for (const e of this.extras) B.push([e.name, e.parent || 'body']);
      this.index = {}; B.forEach((b, i) => (this.index[b[0]] = i)); this.nb = B.length;
      // each three-segment leg remembers how its ankle is bent at rest: the bend it leans back toward as the leg folds
      { const rc = this.restCmd(); for (const l of this.limbs) if (l.n === 3) l.bendRest = l.solve(rc.body, rc.limbs[l.name].p, l.gamma).ankle; }
    }
    // every bone's frame for a command: { body: frame, limbs: { name: { p:[x,y,z] ball of the foot, n: ground normal, yaw: the foot's heading, pitch, toes:[droop°…], gamma } },
    //   neck: { pitch, yaw }, head: { pitch, yaw, roll, level }, extras: { name: angle° } }; cmdAt(t) and t let trailing parts look back in time
    pose(cmd, cmdAt, t = 0) {
      const B = cmd.body, W = { body: B }, sols = {};
      for (const l of this.limbs) {
        const c = cmd.limbs[l.name], sol = l.solve(B, c.p, c.gamma); sols[l.name] = sol; const { u, w, n } = sol;
        W[`hip_${l.name}`] = l.kind === 'insect' ? frame(n, u, sol.A) : frame(n, mul(w, -1), sol.A);
        for (let i = 0; i < l.n; i++) W[l.bone(i)] = frame(n, sub(sol.J[i + 1], sol.J[i]), sol.J[i]);
        // the foot: its sole lies on the ground it stands on (c.n), its toes point where it was set down (c.yaw), tipped by c.pitch (toe down +)
        const up0 = c.n || [0, 1, 0], yaw = c.yaw === undefined ? Math.atan2(B.x[2], B.x[0]) : c.yaw; let fw = [Math.cos(yaw), 0, Math.sin(yaw)]; fw = norm(sub(fw, mul(up0, dot(fw, up0))));
        let rt = cross(fw, up0), up = up0; if (c.pitch) { fw = rot(fw, rt, -c.pitch * D2R); up = rot(up0, rt, -c.pitch * D2R); }
        const F = (W[`foot_${l.name}`] = fxyz(fw, up, rt, sol.J[l.n]));
        for (let k = 0; k < l.toes.length; k++) W[`toe${k}_${l.name}`] = this.toe(l, F, l.toes[k], c.toes ? c.toes[k] : undefined, c.curl || 0);
        for (let j = 0; j < l.n; j++) { if (!l.acts[j]) continue; const jn = l.jointNames[j], pts = actPoints(l, sol, j, l.anchors[jn] || defaultAnchor(l, j));
          W[`act_${jn}_${l.name}_cyl`] = frame(n, sub(pts[1], pts[0]), pts[0]); W[`act_${jn}_${l.name}_rod`] = frame(n, sub(pts[0], pts[1]), pts[1]); }
      }
      // the neck: links pitch in the body's upright plane, the yaw is shared out along the chain (later links turn more)
      const nk = cmd.neck || {}, np = nk.pitch || 0, ny = nk.yaw || 0, m = this.neck.length; let P = apply(B, this.neckAt), yawAcc = 0;
      for (let i = 0; i < m; i++) { const L = this.neck[i][0], ang = this.neck[i][1]; yawAcc += (ny * (i + 1)) / ((m * (m + 1)) / 2);
        const a = (ang - (np * (i + 1)) / m) * D2R, y = yawAcc * D2R, d = fdir(B, [Math.cos(a) * Math.cos(y), Math.sin(a), Math.cos(a) * Math.sin(y)]), pin = fdir(B, [-Math.sin(y), 0, Math.cos(y)]);
        W[`neck_${String(i + 1).padStart(2, '0')}`] = frame(pin, d, P); P = mad(P, d, L); }
      if (this.head) { const hd = cmd.head || {}, hp = (hd.pitch || 0) * D2R, hr = (hd.roll || 0) * D2R;
        // the head keeps level in the world while the body pitches under it (a sensor on a gimbal), and looks where it is told
        const bh = Math.atan2(B.x[2], B.x[0]), h = bh + (ny + (hd.yaw || 0)) * D2R, lv = hd.level === undefined ? 1 : hd.level, bp = Math.asin(LR.clamp(B.x[1], -1, 1)) * (1 - lv);
        W.head = M.bodyFrame(P, h, bp - hp, hr); }
      for (const e of this.extras) W[e.name] = this.extra(e, W, cmd, cmdAt, t);
      return { W, sols };
    }
    // a toe: from under the ball, out at its spread angle, drooping until its tip meets the ground (`droop`°, given by the gait
    // from the land under the tip; the default is level ground), then curled by `curl`° when the foot is in the air
    toe(l, F, a, droop, curl) {
      const ca = Math.cos(a * D2R), sa = Math.sin(a * D2R), h = [F.x[0] * ca + F.z[0] * sa, F.x[1] * ca + F.z[1] * sa, F.x[2] * ca + F.z[2] * sa];
      const d0 = droop === undefined ? Math.asin(LR.clamp((0.58 * l.ball) / l.toeLen, -1, 1)) : droop * D2R, d = d0 + curl * D2R;
      const dv = [h[0] * Math.cos(d) - F.y[0] * Math.sin(d), h[1] * Math.cos(d) - F.y[1] * Math.sin(d), h[2] * Math.cos(d) - F.y[2] * Math.sin(d)];
      const base = [F.p[0] + h[0] * l.ball * 0.75 - F.y[0] * l.ball * 0.42, F.p[1] + h[1] * l.ball * 0.75 - F.y[1] * l.ball * 0.42, F.p[2] + h[2] * l.ball * 0.75 - F.y[2] * l.ball * 0.42];
      return frame(cross(dv, F.y), dv, base);
    }
    toeBase(l, F, a) { const ca = Math.cos(a * D2R), sa = Math.sin(a * D2R), h = [F.x[0] * ca + F.z[0] * sa, F.x[1] * ca + F.z[1] * sa, F.x[2] * ca + F.z[2] * sa]; return { h, base: [F.p[0] + h[0] * l.ball * 0.75 - F.y[0] * l.ball * 0.42, F.p[1] + h[1] * l.ball * 0.75 - F.y[1] * l.ball * 0.42, F.p[2] + h[2] * l.ball * 0.75 - F.y[2] * l.ball * 0.42] }; }
    // extra bones: 'fixed' rides its parent · 'spin' turns about its own axis at `rate`°/s (or by the command) · 'lag' trails — it
    // points where its parent was `lag` seconds ago, bending up to `maxDeg` (an antenna, a hanging cable, a chain)
    extra(e, W, cmd, cmdAt, t) {
      const par = W[e.parent || 'body'], base = apply(par, e.at || [0, 0, 0]), dl = norm(e.dir || [0, 1, 0]), xd = fdir(par, e.xdir || [0, 0, 1]);
      if (e.type === 'spin') { const ang = ((cmd.extras && cmd.extras[e.name] !== undefined ? cmd.extras[e.name] : (e.rate || 0) * t) * D2R), ax = norm(fdir(par, e.axis || [0, 1, 0])); return frame(rot(xd, ax, ang), rot(fdir(par, dl), ax, ang), base); }
      if (e.type === 'lag' && cmdAt) { const L = e.len || 1, past = this.pose(cmdAt(t - (e.lag || 0.25)), null, 0).W[e.parent || 'body'], was = apply(past, e.at || [0, 0, 0]);
        let dr = mul(sub(was, base), e.gain === undefined ? 1 : e.gain); const cap = L * Math.sin((e.maxDeg || 22) * D2R), dl2 = len(dr); if (dl2 > 1e-9) dr = mul(dr, (cap * Math.tanh(dl2 / cap)) / dl2);
        return frame(xd, add(mul(fdir(par, dl), L), dr), base); }
      return frame(xd, fdir(par, dl), base);
    }
    // the pose every part is built in: body level at the origin heading east, feet on flat ground at their homes
    restCmd() { const S = this.S, B = M.bodyFrame([0, S.ride, 0], 0), limbs = {}; for (const l of this.limbs) limbs[l.name] = { p: [l.home[0], l.ball, l.home[1]], n: [0, 1, 0], yaw: 0, gamma: l.gamma }; return { body: B, limbs, neck: {}, head: {}, light: 1 }; }
  }
  M.Kin = Kin;

  // ── cylinders: let the script pick what a person would fudge (after mbr/actuators.py) ───────────────────────────
  // For a hinge whose angle ranges over `rel` (radians, seen in every sample of every walk), find where the barrel's eye
  // (on the upper part) and the rod's eye (on the lower part) go so that: the barrel is as long as the shortest
  // pin-to-pin length allows, a fifth of the rod is still inside at the longest stretch, and the line of the cylinder
  // never comes closer to the pin than the drum plus the barrel (it cannot cut the joint, and it always has leverage).
  const lenLever = (au, hu, al, hl, d) => { const ux = -au, uy = hu, c = Math.cos(d), s = Math.sin(d), lx = al * c - hl * s, ly = al * s + hl * c, dx = lx - ux, dy = ly - uy, L = Math.hypot(dx, dy); return [L, Math.abs(dx * -uy - dy * -ux) / Math.max(L, 1e-9)]; };
  M.actSearch = (limb, j, lo, hi, width, rDrum) => {
    const upLen = limb.upLen(j), loLen = limb.segs[j], rBar = limb.s.bar || Math.max(0.06, 0.32 * width), samples = []; let best = null; for (let i = 0; i <= 24; i++) samples.push(lo + ((hi - lo) * i) / 24);
    // a wide swing asks for one eye near the pin and the other far along its part (the length then changes little with the angle)
    for (const fu of [0.1, 0.16, 0.25, 0.32, 0.4, 0.5, 0.6, 0.7, 0.85]) for (const fl of [0.08, 0.14, 0.2, 0.27, 0.34, 0.42, 0.5, 0.62]) for (const sg of [1, -1]) for (const hu of [0.5, 0.9, 1.25, 1.6, 2.0, 2.6]) for (const hl of [0.5, 0.9, 1.25, 1.6, 2.2]) {
      const a_up = fu * upLen, a_lo = fl * loLen, h_up = sg * hu * width, h_lo = sg * hl * width; let Lmin = 1e9, Lmax = 0, lev = 1e9;
      for (const d of samples) { const r = lenLever(a_up, h_up, a_lo, h_lo, d); Lmin = Math.min(Lmin, r[0]); Lmax = Math.max(Lmax, r[0]); lev = Math.min(lev, r[1]); }
      const eyes = 2.2 * rBar, Bl = Lmin - eyes - 1.4 * rBar - 0.03 * Lmin; if (Bl < 3 * rBar) continue;
      const overlap = Bl + Bl + eyes - Lmax; if (overlap < 0.2 * Bl) continue; if (lev < rDrum + rBar) continue;
      const score = lev - 0.02 * (Math.abs(h_up) + Math.abs(h_lo));
      if (!best || score > best.score) best = { score, a_up, h_up, a_lo, h_lo, Bl, Rl: Bl, r: rBar, Lmin, Lmax, lever: lev, overlap: overlap / Bl, range: [lo / D2R, hi / D2R] };
    }
    return best;
  };
  // rel: { 'limb/j': [min, max] } gathered by the gait over every walk a kind does; writes anchors into the limbs, returns a report
  M.actAssign = (kin, rel) => {
    const report = {};
    for (const l of kin.limbs) for (let j = 0; j < l.n; j++) { const r = rel[l.name + '/' + j]; if (!l.acts[j] || !r) continue; const jn = l.jointNames[j], pad = 2 * D2R;
      const res = M.actSearch(l, j, r[0] - pad, r[1] + pad, l.width, l.drum * 0.5 * (j === 0 ? 1.25 : 1));
      if (!res) { report[`${jn}_${l.name}`] = { fail: `no anchor pair keeps the rod in its barrel over ${(r[0] / D2R).toFixed(0)}…${(r[1] / D2R).toFixed(0)}°` }; continue; }
      const out = l.kind !== 'insect' && l.side ? l.side : 1; res.lat = (j % 2 === 0 ? 0.55 : -0.55) * l.width * (l.s.actLat || 1.7) * out; l.anchors[jn] = res; report[`${jn}_${l.name}`] = res; }
    return report;
  };
  // mirror a left limb (z < 0) to the right: FL → FR
  M.mirror = (l) => Object.assign({}, l, { name: l.name.replace(/L(\d*)$/, 'R$1'), at: [l.at[0], l.at[1], -l.at[2]], home: [l.home[0], -l.home[1]] });
  M.define = (name, spec) => { const K = { name, spec, kin: new Kin(spec) }; M.kinds[name] = K; return K; };
}
