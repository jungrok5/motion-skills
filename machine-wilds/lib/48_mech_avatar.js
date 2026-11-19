// machine-wilds · 48_mech_avatar — the walker's own body: a machine on two legs that goes where the walker goes.
// The machines of a realm walk ways that were planned (48_mech_gait: every pose a function of time).  This one cannot be
// planned — it follows a hand on the keys — so its walk is made as it goes, from the same rules: a foot is set down on the
// ground's real height and tilt and then does not move in the world; the other swings to where the body will be when it
// lands; the body's height comes from its feet, it leans into its speed, sways over the foot that carries, sinks into each
// landing and into a drop, gathers before a hop and breathes while it stands.  The legs are the kit's own (planar, solved in
// closed form, a cylinder across every powered hinge), so it is drawn, lit and checked like any other kind.
//
//   LR.mech.define('plover', { …, limbs: [left, mirror(left)], avatar: { stepWalk, stepRun, swing: [s, s], lift: [m, m], lean: [°, °], … } })
//   LR.mech.spawn('plover', { avatar: true, at: [x, z], yaw° })      one a realm; LR.player drives it (80_player), 48_mech_run draws it
//
// For the gym, the cylinder fit and the cast sheet it also walks an exercise — stand, walk, turn, run, stop, turn on the
// spot, back up, hop — made by the very same step() from a script of key presses, deterministic, kept as frames:
// LR.mech.cmd(unit, t) reads them until the page takes the unit over (unit.live).  Numbers only: it runs in Node.
{
  const M = LR.mech, V = M.v, D2R = M.D2R, sat = LR.sat, damp = LR.damp, lerp = LR.lerp, TAU = Math.PI * 2;
  const DEF = { walk: 2.5, run: 5.8, stepWalk: 0.8, stepRun: 1.45, reach: 0.34, swing: [0.42, 0.2], lift: [0.13, 0.24], toe: 26, swingGamma: 16, lean: [3.5, 11], accLean: 0.9, sway: 0.28, bob: 0.022, crouch: [0.03, 0.05], dip: 0.5, gather: 0.13, breath: 0.012, narrow: 0.35, settle: 0.1, roll: 5, look: 0.6, tuck: 0.09 };
  // the floor: in the page the walker's own (decks, the tops of parapets), in Node the land
  const floorY = (x, z, yNow) => (M.avatarFloor ? M.avatarFloor(x, z, yNow) : LR.land.h(x, z));      // (48_mech_run sets M.avatarFloor when the page takes the body over)
  const floorN = (x, z, y, r) => (Math.abs(LR.land.h(x, z) - y) < 0.05 ? LR.land.normal(x, z, r, [0, 1, 0]) : [0, 1, 0]);

  class Avatar {
    constructor(u) { this.u = u; this.kin = u.kin; this.S = u.K.spec; this.a = Object.assign({}, DEF, this.S.avatar || {}); this.hist = []; this.events = []; this.count = 0; this.reset({ x: (u.at || [0, 0])[0], z: (u.at || [0, 0])[1], h: ((u.yaw || 0) - 90) * D2R }); }
    home(l, x, z, h, k = 0) { const f = [Math.cos(h), Math.sin(h)], r = [-Math.sin(h), Math.cos(h)], w = l.home[1] * (1 - this.a.narrow * k); return [x + f[0] * l.home[0] + r[0] * w, z + f[1] * l.home[0] + r[1] * w]; }
    reset(st) { const y = st.y === undefined ? floorY(st.x, st.z) : st.y; this.x = st.x; this.z = st.z; this.h = st.h || 0; this.y = y; this.t = this.t || 0; this.sp = 0; this.acc = 0; this.yawRate = 0; this.sw = 0; this.pitch = 0; this.roll = 0; this.dip = 0; this.dipV = 0; this.airB = 0; this.wasAir = false; this.vy = 0; this.still = 1; this.last = -1; this.prep = 0; this.look = 0; this.k = 0;
      this.feet = this.kin.limbs.map((l) => { const p = this.home(l, st.x, st.z, this.h), gy = floorY(p[0], p[1], y); return { on: true, p: [p[0], gy, p[1]], n: floorN(p[0], p[1], gy, l.ball * 1.5), yaw: this.h, pitch: 0, u: 1, since: 1, from: null, T: 0.3, k: 0 }; });
      this.py = y + this.S.ride; this.pc = this.py; this.hist.length = 0; }
    // one frame: st = { x, y, z, h (heading, radians: forward is [cos h, sin h]), vx, vz, air, vy, prep (0…1: gathering for a hop), look (°, up +) }
    step(dt, st) {
      if (!(dt > 0)) return this; const a = this.a, S = this.S, L = this.kin.limbs, F = this.feet; this.t += dt;
      if (Math.hypot(st.x - this.x, st.z - this.z) > 2.5 || Math.abs((st.y === undefined ? this.y : st.y) - this.y) > 6 && !st.air && !this.wasAir) this.reset(st);
      const vx = st.vx || 0, vz = st.vz || 0, sp = Math.hypot(vx, vz), dir = sp > 0.15 ? [vx / sp, vz / sp] : [0, 0], k = sat((sp - a.walk * 1.15) / (a.run - a.walk * 1.15)), h = st.h, f = [Math.cos(h), Math.sin(h)], r = [-Math.sin(h), Math.cos(h)];
      this.yawRate = damp(this.yawRate, LR.wrapPi(h - this.h) / dt, 10, dt); this.acc = damp(this.acc, (sp - this.sp) / dt, 8, dt); this.sp = sp; this.k = k; this.x = st.x; this.z = st.z; this.h = h; this.y = st.y === undefined ? floorY(st.x, st.z) : st.y;
      this.still = sp < 0.2 ? this.still + dt : 0; this.prep = st.prep || 0; this.look = damp(this.look, st.look || 0, 10, dt);
      // (on a grade the steps are shorter, as anything's are: the leading foot lands lower or higher than the hip expects)
      const down = sp > 0.2 ? (this.y - floorY(st.x + dir[0] * 0.6, st.z + dir[1] * 0.6, this.y + 0.3)) / 0.6 : 0, grade = Math.abs(down), short = 1 - 0.3 * sat((grade - 0.08) / 0.4);
      const stepLen = (sp < a.walk ? Math.max(0.26, a.stepWalk * (0.4 + 0.6 * (sp / a.walk))) : lerp(a.stepWalk, a.stepRun, k)) * short, half = Math.min(stepLen * 0.5, a.reach * short), tw = (0.92 * 2 * half) / Math.max(sp, 0.3), running = (0.92 * 2 * half) / short / Math.max(sp, 0.3) < a.swing[1] * 1.12;
      const Tsw = running ? Math.max(a.swing[1], (2 * stepLen - 2 * half) / sp) : LR.clamp(tw, 0.17, a.swing[0]); this.running = running;
      const air = !!st.air; this.airB = damp(this.airB, air ? 1 : 0, 30, dt);
      if (air) { for (const q of F) { q.on = false; q.u = 1; q.since = 0; } }
      else if (this.wasAir) {   // down: both feet take the ground under the hips, the knees take the speed
        F.forEach((q, i) => { const p = this.home(L[i], st.x + vx * 0.05, st.z + vz * 0.05, h, k), gy = floorY(p[0], p[1], this.y + 0.3); q.on = true; q.p = [p[0], gy, p[1]]; q.n = floorN(p[0], p[1], gy, L[i].ball * 1.5); q.yaw = h; q.pitch = 0; q.since = 0; q.u = 1; q.k = ++this.count; this.events.push({ foot: i, p: q.p.slice(), speed: -this.vy }); });
        this.dipV += Math.min(2.9, Math.max(0, -this.vy - 1) * a.dip * 0.7); this.last = -1; this.airB = 0; this.pc = Math.min(this.pc, this.y + S.ride); }
      else {
        // which foot goes, and when.  Under the hip a foot can stand from `half` ahead to `half` behind (half a step, and no more
        // than the leg reaches).  Walking, a foot leaves when the other can carry the body for as long as the swing takes — from
        // a stand that is at once (a first, short, quick step), at a steady walk the instant the other lands, slower than that
        // both feet stand a while.  Above the speed where a swing would have to be quicker than a leg is, it runs: a foot
        // leaves when it has reached the back of its stance, whatever the other is doing, and both are in the air between.
        // A foot the hip has outrun is lifted whatever else is true.
        const legLen = (L[0].segs[0] + L[0].segs[1]) * 0.97 + (L[0].segs[2] || 0) * 0.9, hipY = this.py + L[0].at[1] - (L[0].hipDrop || 0);
        const B = F.map((q, i) => { const p = this.home(L[i], st.x, st.z, h, k), dx = p[0] - q.p[0], dz = p[1] - q.p[2], d = Math.hypot(dx, dz); return { d, b: sp > 0.2 ? dx * dir[0] + dz * dir[1] : d, far: d > 0.28 && Math.hypot(d, hipY - q.p[1] - L[i].ball) > legLen }; });
        const want = F.map((q, i) => { if (!q.on) return -1; const o = F[1 - i], ob = B[1 - i], me = B[i], moving = sp > 0.2, turn = Math.abs(LR.wrapPi(h - q.yaw));
          const free = running ? q.since > 0.02 : o.on && o.since > 0.03, carry = o.on ? ob.b + sp * Tsw : 1e9;
          const go = running ? me.b >= half - 0.01 : moving ? (me.b >= half - 0.005 || carry >= half - 0.02) && me.b >= ob.b - 1e-6 && me.b > 0.015 : this.still > 0.3 && (me.d > a.settle || (turn > 0.5 && me.d > 0.04));
          return me.far || (free && (go || me.d > half * 1.9)) ? me.b + (me.far ? 5 : 0) + (this.last === i ? 0 : 0.2) + 0.01 : -1; });
        const go = want[0] > want[1] ? 0 : 1; if (want[go] > 0) { const q = F[go], ob = B[1 - go]; q.on = false; q.u = 0; q.from = q.p.slice(); q.fromYaw = q.yaw; this.last = go;
          q.T = running ? Tsw : Tsw * (sp > 0.2 && F[1 - go].on ? LR.clamp((half - ob.b) / Math.max(0.05, sp * Tsw), 0.5, 1) : 1); }      /* (the other is already part of the way back: a shorter, quicker step) */
        F.forEach((q, i) => { q.since += dt; if (q.on) return; const l = L[i]; q.u = Math.min(1, q.u + dt / q.T); const rem = (1 - q.u) * q.T, p = this.home(l, st.x + vx * rem, st.z + vz * rem, h, k), tx = p[0] + dir[0] * half, tz = p[1] + dir[1] * half;
          if (!q.from) q.from = q.p.slice(); const gy = floorY(tx, tz, this.y + 0.3), e = q.u * q.u * (3 - 2 * q.u); q.tgt = [tx, gy, tz]; q.e = e; const x = lerp(q.from[0], tx, e), z = lerp(q.from[2], tz, e), s = Math.sin(Math.PI * q.u), lift = lerp(a.lift[0], a.lift[1], k) * (0.55 + 0.45 * sat(sp / a.walk));
          q.p = [x, Math.max(lerp(q.from[1], gy, e) + lift * s, floorY(x, z, this.y + 0.3) + 0.04 * s), z]; q.pitch = a.toe * Math.sin(TAU * q.u) * (q.u < 0.5 ? 1 : 0.55) * (0.5 + 0.5 * sat(sp / a.walk)); q.yaw = (q.fromYaw === undefined ? h : q.fromYaw) + LR.wrapPi(h - (q.fromYaw === undefined ? h : q.fromYaw)) * e; q.n = [0, 1, 0];
          if (q.u >= 1) { q.on = true; q.p = [tx, gy, tz]; q.n = floorN(tx, tz, gy, l.ball * 1.5); q.yaw = h; q.pitch = 0; q.since = 0; q.from = null; q.k = ++this.count; this.dipV += a.dip * (0.25 + 0.75 * k) * sat(sp / a.walk); this.events.push({ foot: i, p: q.p.slice(), speed: sp }); } });
      }
      this.wasAir = air; this.vy = st.vy || 0;
      // the body: over its feet, as high as they allow; down into a landing and back; a breath while it stands
      this.dipV += (-90 * this.dip - 13 * this.dipV) * dt; this.dip = Math.max(-0.02, this.dip + this.dipV * dt);
      const on = F.filter((q) => q.on), sw = F.find((q) => !q.on), gy = on.length ? on.reduce((s2, q) => s2 + q.p[1], 0) / on.length : this.y;
      const bob = air ? 0 : a.bob * ((sw ? Math.sin(Math.PI * sw.u) : 0) - 1) * sat(sp / a.walk), breath = this.still > 0.4 ? a.breath * (Math.sin(this.t * TAU * 0.26) - 1) * sat((this.still - 0.4) / 0.8) : 0;
      // (going down, the leading foot will land lower than the walker's point: the hip is already that much lower, all the way down)
      this.sink = damp(this.sink || 0, air ? 0 : LR.clamp(down, 0, 0.9) * half * 0.95, 6, dt);
      const base = air ? this.y : Math.min(this.y, 0.5 * (this.y + gy) + 0.05) - this.sink, want = base + S.ride - lerp(a.crouch[0], a.crouch[1], k) * sat(sp / a.walk) - this.prep * a.gather;
      // never higher than its legs reach: over each foot that is down — and over the place the swinging one is going to, more
      // strictly the nearer it is to landing — the hip can be only so high.  (Downhill the leading foot lands low: the body is
      // already on its way down when it does.)
      let cap = 1e9; if (!air) { const legLen = (L[0].segs[0] + L[0].segs[1]) * 0.93 + (L[0].segs[2] || 0) * 0.9, off = (L[0].hipDrop || 0) - L[0].at[1];
        F.forEach((q, i) => { const c = q.on ? q.p : q.tgt; if (!c) return; const rem = q.on ? 0 : (1 - q.u) * q.T, hx = st.x + vx * rem + r[0] * L[i].at[2], hz = st.z + vz * rem + r[1] * L[i].at[2], d = Math.hypot(c[0] - hx, c[2] - hz);      /* (a swinging foot is measured from where the hip will be when it lands) */ const o = F[1 - i], ramp = q.on ? 0 : (1 - q.u) * Math.max(0.02, (o.on ? o.p[1] : c[1]) - c[1]);      /* through the swing the limit comes down from the foot that stands to the place the other will: a descent is walked down, not dropped down */
          cap = Math.min(cap, c[1] + L[i].ball + Math.sqrt(Math.max(0.09, legLen * legLen - d * d)) + off - 0.03 + ramp); }); }
      const wantC = Math.min(want, cap);
      this.pc = air ? want + ((this.pc === undefined ? want : this.pc) - want) * Math.exp(-40 * dt) : damp(this.pc === undefined ? wantC : this.pc, wantC, wantC > this.pc ? 6 : 22, dt); this.py = this.pc - Math.max(0, this.dip) + bob + breath;      // (everything added here only lowers it: the cap is never passed from below)      // down at once (a leg has run out), up at the pace of a body being lifted
      // it sways over the foot that carries, leans into its speed and its speeding up, rolls into a turn
      const st2 = sw && on.length === 1 ? on[0] : null, lat = st2 ? (st2.p[0] - st.x) * r[0] + (st2.p[2] - st.z) * r[1] : 0; this.sw = damp(this.sw, lat * a.sway, 9, dt);
      const fwd = sp > 0.15 ? dir[0] * f[0] + dir[1] * f[1] : 0, lean = -(lerp(a.lean[0], a.lean[1], k) * sat(sp / a.walk) * fwd + LR.clamp(this.acc * a.accLean, -5, 5) * (fwd >= 0 ? 1 : -1)) * D2R + this.prep * 0.07 - this.dip * 0.35 + this.airB * 0.06;
      this.pitch = damp(this.pitch, lean, 9, dt); this.roll = damp(this.roll, LR.clamp(this.yawRate * sp * 0.012, -1, 1) * a.roll * D2R + (st2 ? Math.sign(lat) * 0.02 : 0), 8, dt);
      const c = this.build(air); this.hist.push(c); if (this.hist.length > 120) this.hist.shift(); this.now = c; return this;
    }
    build(air) { const S = this.S, a = this.a, L = this.kin.limbs, h = this.h, r = [-Math.sin(h), Math.cos(h)], f = [Math.cos(h), Math.sin(h)]; let py = this.py;
      const frame = () => M.bodyFrame([this.x + r[0] * this.sw, py, this.z + r[1] * this.sw], h, this.pitch, this.roll), limbs = {};
      let B = frame();
      this.feet.forEach((q, i) => { const l = L[i]; let p = q.p, n = q.n, pitch = q.pitch, gamma = l.gamma + (q.on ? 0 : a.swingGamma * Math.sin(Math.PI * q.u));
        if (air && this.airB > 0.001) { const t = [this.x + f[0] * (l.home[0] + (i ? 0.1 : -0.06)) + r[0] * l.home[1] * 0.85, py - S.ride * (1 - a.tuck) + (i ? 0.05 : 0), this.z + f[1] * (l.home[0] + (i ? 0.1 : -0.06)) + r[1] * l.home[1] * 0.85]; p = V.lerp(p, t, this.airB); n = [0, 1, 0]; pitch = lerp(pitch, 24, this.airB); gamma += 10 * this.airB; q.p = p; }
        limbs[l.name] = { p: [p[0] + n[0] * l.ball, p[1] + n[1] * l.ball, p[2] + n[2] * l.ball], n, yaw: q.yaw, pitch, gamma, sw: !q.on, s: q.u, k: q.k }; });
      // never ask a leg for more than it has: the body comes down to the foot that is furthest (planted feet do not move)
      if (!air) { const floor = this.py - 0.32; for (let it = 0; it < 4; it++) { let over = 0; for (const l of L) { const sol = l.solve(B, limbs[l.name].p, limbs[l.name].gamma); if (isFinite(sol.clamp)) over = Math.max(over, sol.clamp); } if (over < 1e-4 || py <= floor) break; py = Math.max(floor, py - over * 1.08 - 0.002); B = frame(); } if (py < this.py) { this.pc -= this.py - py; this.py = py; } }
      return { avatar: true, t: this.t, body: B, h, limbs, rate: 1, light: 1, u: 0, fix: 0, low: 0, idle: this.still > 0.4 ? 1 : 0, lat: 0, ground: this.y, speed: this.sp, air, running: !!this.running, neck: { pitch: -this.look * a.look * 0.4, yaw: 0 }, head: { pitch: this.look * a.look + (this.still > 1 ? 3 * Math.sin(this.t * 0.7) : 0), yaw: this.still > 1.5 ? 14 * Math.sin(this.t * 0.45) * sat((this.still - 1.5) / 2) : 0, roll: 0 }, extras: {} }; }
    at(t) { const H = this.hist; if (!H.length) return this.now || this.build(false); for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= t + 1e-9) return H[i]; return H[0]; }
  }
  M.Avatar = Avatar;

  // ── the exercise: the same step(), driven by a script instead of a hand ───────────────────────────────────────────
  // [seconds, forward (−1…1), side, turn (°/s), run, hop]
  const SCRIPT = [[2.6, 0, 0, 0, 0, 0, 'stand'], [5.2, 1, 0, 0, 0, 0, 'walk'], [2.4, 1, 0, 50, 0, 0, 'turn'], [1.2, 1, 0, 0, 0, 0, ''], [4.6, 1, 0, 0, 1, 0, 'run'], [2.2, 0, 0, 0, 0, 0, 'stop'], [2.4, 0, 0, -75, 0, 0, 'spin'], [1.2, 0, 0, 0, 0, 0, ''], [2.2, -1, 0, 0, 0, 0, 'back'], [1.6, 0, 1, 0, 0, 0, 'side'], [1.4, 0, 0, 0, 0, 0, ''], [1.8, 0, 0, 0, 0, 1, 'hop'], [1.6, 1, 0, 0, 0, 0, ''], [1.6, 1, 0, 0, 0, 1, 'leap'], [2.0, 0, 0, 0, 0, 0, 'rest']];
  M.avatarExercise = (u) => {
    const av = new Avatar(u), a = av.a, dt = 1 / 60, frames = [], marks = {}, lifts = [[], []], L = LR.land; let x = (u.at || [0, 0])[0], z = (u.at || [0, 0])[1], h = ((u.yaw || 0) - 90) * D2R, y = L.h(x, z), vx = 0, vz = 0, vy = 0, air = false, prep = 0, hopT = -1, T0 = 0;
    av.reset({ x, z, h, y }); av.t = 0;
    for (const [dur, fw, sd, turn, run, hop, name] of SCRIPT) { if (name) marks[name] = T0; const n = Math.round(dur / dt);
      for (let i = 0; i < n; i++) { const tt = i * dt, top = (run ? a.run : a.walk) * (fw < 0 ? 0.7 : 1), f = [Math.cos(h), Math.sin(h)], r = [-Math.sin(h), Math.cos(h)], wx = (f[0] * fw + r[0] * sd) * top, wz = (f[1] * fw + r[1] * sd) * top;
        h += turn * D2R * dt; vx = damp(vx, wx, 10, dt); vz = damp(vz, wz, 10, dt); x += vx * dt; z += vz * dt; const g = L.h(x, z);
        if (hop && Math.abs(tt - 0.3) < dt * 0.5 && !air && hopT < 0) hopT = 0.1;                                   // the key goes down: it gathers for a tenth of a second, then leaves
        if (hopT >= 0) { hopT -= dt; prep = 1 - Math.max(0, hopT) / 0.1; if (hopT < 0) { vy = 5; air = true; prep = 0; marks[name + ':off'] = T0 + tt; } }
        if (!air && g < y - 0.6) { air = true; vy = Math.min(vy, 0); }
        if (air) { vy = Math.max(-42, vy - 13 * dt); y += vy * dt; if (y <= g) { y = g; air = false; marks[name + ':down'] = T0 + tt; vy = 0; vx *= 0.35; vz *= 0.35; } else if (vy <= 0 && marks[name + ':apex'] === undefined) marks[name + ':apex'] = T0 + tt; } else y = damp(y, g, g > y ? 18 : 12, dt);
        const was = av.feet.map((q) => q.on); av.step(dt, { x, y, z, h, vx, vz, air, vy, prep, look: name === 'stand' ? 0 : 0 }); av.feet.forEach((q, k2) => { if (was[k2] && !q.on && !air) lifts[k2].push(T0 + tt); });
        const c = av.now; c.vp = [x, y, z]; frames.push(c); }
      T0 += n * dt; }
    // the period of the walk and of the run: the time between two lifts of the same foot
    const per = (t0, t1) => { const q = lifts[0].filter((t) => t > t0 + 1.2 && t < t1); return q.length > 2 ? (q[q.length - 1] - q[0]) / (q.length - 1) : 0.8; };
    marks.walkT = per(marks.walk, marks.turn); marks.runT = per(marks.run, marks.stop); marks.walk0 = (lifts[0].find((t) => t > marks.walk + 2) || marks.walk + 2); marks.run0 = (lifts[0].find((t) => t > marks.run + 2) || marks.run + 2);
    u.ex = { dt, frames, marks, events: av.events.length }; u.lap = frames.length * dt; u.T = marks.walkT; u.N = 1; u.plants = {}; u.haltList = []; u.wb = 1; u.track = Math.abs(u.kin.limbs[0].home[1]) * 2; u.stride = a.stepWalk * 2; return u;
  };
  M.planAvatar = (u) => M.avatarExercise(u);
  M.avatarCmd = (u, t) => { if (u.live && u.av) return u.av.at(t); const E = u.ex || M.avatarExercise(u).ex, n = E.frames.length, i = ((Math.round(t / E.dt) % n) + n) % n; return E.frames[i]; };

  // ── what the body must keep through the whole exercise ────────────────────────────────────────────────────────────
  M.auditAvatar = (u) => {
    const E = u.ex || M.avatarExercise(u).ex, kin = u.kin, L = LR.land, F = E.frames, n = F.length, mk = E.marks, A = { avatar: true, unit: u.name, kind: u.kind, tonnes: u.K.spec.tonnes || 0.3, lap: u.lap, samples: n, clamp: 0, slip: 0, gap: 0, bendFlip: 0, foldMax: 0, straight: 180, kneeLow: 1e9, swingLow: 1e9, overlapMin: 9, belly: 1e9, bodyAcc: 0, runAcc: 0, walkT: mk.walkT, runT: mk.runT, steps: E.events, hinge: {} };
    const bsign = {}, plant = {}, hist = [], hgt = []; let breathLo = 1e9, breathHi = -1e9, idleSlip = 0, walkSup = 1e9, flight = 0, runN = 0, gatherLow = 0, landLow = 0, standY = 0, sup0 = 0;
    for (let i = 0; i < n; i++) { const c = F[i], t = i * E.dt, r = kin.pose(c, (q) => F[Math.max(0, Math.min(n - 1, Math.round(q / E.dt)))], c.t); let sup = 0;
      for (const l of kin.limbs) { const sol = r.sols[l.name], q = c.limbs[l.name], end = sol.J[l.n]; A.clamp = Math.max(A.clamp, sol.clamp);
        l.bends(sol).forEach((b, j) => { const key = l.name + j, want = bsign[key] === undefined ? (bsign[key] = Math.sign(b) || 1) : bsign[key]; if (Math.sign(b) !== want) A.bendFlip++; A.foldMax = Math.max(A.foldMax, Math.abs(b) / D2R); A.straight = Math.min(A.straight, Math.abs(b) / D2R); });
        if (!c.air) for (let j = 1; j < l.n; j++) A.kneeLow = Math.min(A.kneeLow, sol.J[j][1] - L.h(sol.J[j][0], sol.J[j][2]));
        if (!q.sw) { sup++; const key = l.name + ':' + q.k, was = plant[key]; if (was) { const d = Math.hypot(end[0] - was[0], end[1] - was[1], end[2] - was[2]); A.slip = Math.max(A.slip, d); if (c.idle) idleSlip = Math.max(idleSlip, d); } else plant[key] = end.slice();
          A.gap = Math.max(A.gap, Math.abs(end[1] - q.n[1] * l.ball - L.h(end[0] - q.n[0] * l.ball, end[2] - q.n[2] * l.ball))); }
        else if (!c.air && q.s > 0.2 && q.s < 0.85) A.swingLow = Math.min(A.swingLow, end[1] - l.ball - L.h(end[0], end[2]));
        for (let j = 0; j < l.n; j++) { const an = l.anchors[l.jointNames[j]]; if (!l.acts[j] || !an) continue; const pts = M.actPoints(l, sol, j, an), len = V.len(V.sub(pts[1], pts[0])), eyes = 2.2 * an.r; A.overlapMin = Math.min(A.overlapMin, (an.Bl + an.Rl + eyes - len) / an.Bl); if (len < an.Bl + eyes + 1.4 * an.r) A.overlapMin = Math.min(A.overlapMin, -(an.Bl + eyes + 1.4 * an.r - len)); } }
      const B = c.body, S = u.K.spec, bb = S.belly || [0.4, S.ride * 0.15, 0.2]; if (!c.air) for (const sx of [-1, 1]) { const p = M.apply(B, [sx * bb[0], -bb[1], 0]); A.belly = Math.min(A.belly, p[1] - L.h(p[0], p[2])); }
      if (t > mk.walk + 1.5 && t < mk.turn) walkSup = Math.min(walkSup, sup); if (t > mk.run + 1.5 && t < mk.stop) { runN++; if (sup === 0) flight++; }
      if (t > mk.stand + 0.8 && t < mk.walk) { breathLo = Math.min(breathLo, B.p[1]); breathHi = Math.max(breathHi, B.p[1]); standY = B.p[1] - c.ground; }
      hgt.push(B.p[1] - c.ground);
      // the body's own motion: against the walker's point, so that a hop's free fall is not counted as a jolt
      const rel = [B.p[0] - c.vp[0], B.p[1] - c.vp[1], B.p[2] - c.vp[2]]; hist.push(rel); const q3 = 6; if (hist.length > 2 * q3 && !c.air && !F[i - 2 * q3].air) { const a0 = hist[hist.length - 1 - 2 * q3], b0 = hist[hist.length - 1 - q3], hh = q3 * E.dt; const acc = V.len([rel[0] - 2 * b0[0] + a0[0], rel[1] - 2 * b0[1] + a0[1], rel[2] - 2 * b0[2] + a0[2]]) / (hh * hh); if (c.running || F[i - q3].running) A.runAcc = Math.max(A.runAcc, acc); else if (acc > A.bodyAcc) { A.bodyAcc = acc; A.accAt = t; } } }
    { const at = (t) => hgt[Math.max(0, Math.min(n - 1, Math.round(t / E.dt)))], lowest = (t0, t1) => { let m = 1e9; for (let t = t0; t <= t1; t += E.dt) m = Math.min(m, at(t)); return m; };      // the hop: how far it sinks before it leaves, how far it gives after it lands
      if (mk['hop:off'] !== undefined) gatherLow = at(mk.hop + 0.2) - lowest(mk.hop + 0.25, mk['hop:off']); if (mk['hop:down'] !== undefined) landLow = at(mk['hop:down'] + 0.6) - lowest(mk['hop:down'], mk['hop:down'] + 0.45); }
    A.breath = breathHi - breathLo; A.idleSlip = idleSlip; A.walkSupport = walkSup; A.flight = runN ? flight / runN : 0; A.gather = gatherLow; A.recover = landLow;
    // the same script twice is the same walk
    const again = M.avatarExercise(Object.assign({}, u, { ex: null })).ex.frames; let det = 0; for (let i = 0; i < n; i += 37) det = Math.max(det, V.len(V.sub(again[i].body.p, F[i].body.p))); A.determinism = det; return A;
  };
}
