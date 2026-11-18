// machine-wilds · 48_mech_fly — machines that fly.  A flyer has no legs: its wings, tail and whatever else moves are
// bones of its own (`extras` of type 'spin', driven by the command), and its flight is, like a walk, a pure function of
// time.  It follows a closed line through the air (points [x, z, metres over the land there]); it slows as it climbs
// and gathers speed as it comes down; it banks into a turn before it turns, by what the turn asks at its speed; its
// head looks into the turn before that; it beats its wings in bouts and glides between them — harder climbing, hardly
// at all coming down — the outer wing a little behind the inner; and its body rides the beat (down while the wings
// press, up after), because a body in the air is carried by nothing else.  Numbers only: it runs in Node (gym.mjs).
//
//   spec.flight = { speed (m/s), beat (Hz), stroke: [shoulder°, elbow°], fold°, dihedral°, bout (s: one bout of beating and its glide),
//                   bob (m), lead (s: how far ahead it banks), bankK, bankMax°, span (m), clear (m over the land, at least), wings: [[inner, outer] bone names a side…] }
//   LR.mech.spawn(kind, { fly: [[x, z, over]…], offset (s), shift: [right, up] (its place in a flight of several), phase })
{
  const M = LR.mech, V = M.v, D2R = M.D2R, TAU = Math.PI * 2, sat = LR.sat;
  M.planFly = (u) => {
    const S = u.K.spec, F = S.flight, L = LR.land, pts = u.fly.map((p) => [p[0], L.h(p[0], p[1]) + p[2], p[1]]), n = pts.length;
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const raw = (q) => { const i = Math.floor(q), t = q - i, p = (k) => pts[(((i + k) % n) + n) % n]; return [0, 1, 2].map((c) => cr(p(-1)[c], p(0)[c], p(1)[c], p(2)[c], t)); };
    // arc length → place, and time → arc length (it slows on a climb, gains on a descent)
    const NS = n * 48, len = new Float64Array(NS + 1), P = []; let prev = raw(0), tot = 0; P.push(prev); for (let i = 1; i <= NS; i++) { const q = raw((i / NS) * n); tot += V.len(V.sub(q, prev)); len[i] = tot; P.push(q); prev = q; }
    const at = (s) => { s = ((s % tot) + tot) % tot; let lo = 0, hi = NS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= s) lo = m; else hi = m; } const f = (s - len[lo]) / Math.max(1e-9, len[hi] - len[lo]); return V.lerp(P[lo], P[hi], f); };
    const NT = 600, T = new Float64Array(NT + 1), ds = tot / NT; let acc = 0, vp = 0; for (let i = 0; i <= NT; i++) { const a = at(i * ds - 4), b = at(i * ds + 4), g = (b[1] - a[1]) / 8, v = F.speed * LR.clamp(1 - 1.6 * g, 0.72, 1.3); if (i) acc += ds / ((v + vp) / 2); vp = v; T[i] = acc; }
    u.len = tot; u.lap = acc; u.at = at; u.fly3 = pts; u.span = F.span || 6;
    u.sAt = (t) => { const lap = Math.floor(t / acc), f = t - lap * acc; let lo = 0, hi = NT; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= f) lo = m; else hi = m; } return lap * tot + (lo + (f - T[lo]) / Math.max(1e-9, T[hi] - T[lo])) * ds; };
    u.plants = {}; u.wb = u.span; u.track = u.span; u.N = 1; u.haltList = []; return u;
  };
  // heading, climb and turn at arc length s (over a few metres: a body does not follow a kink)
  const course = (u, s, e = 5) => { const a = u.at(s - e), b = u.at(s + e), dx = b[0] - a[0], dz = b[2] - a[2], hl = Math.hypot(dx, dz) || 1e-9; return [Math.atan2(dz, dx), Math.atan2(b[1] - a[1], hl), hl / (2 * e)]; };
  M.flyCmd = (u, t) => {
    const S = u.K.spec, F = S.flight; t += u.offset || 0; const s = u.sAt(t), p = u.at(s), c0 = course(u, s), dt = 0.5, sp = (u.sAt(t + dt) - u.sAt(t - dt)) / (2 * dt);
    // the turn it is about to make, read ahead: that is what it banks for, and what its head looks into before that
    const lead = F.lead === undefined ? 0.7 : F.lead, s1 = u.sAt(t + lead), cA = course(u, s1 - 7), cB = course(u, s1 + 7), kappa = LR.wrapPi(cB[0] - cA[0]) / 14;
    const bank = LR.clamp(Math.atan((sp * sp * kappa) / 9.81) * (F.bankK === undefined ? 0.9 : F.bankK), -(F.bankMax || 55) * D2R, (F.bankMax || 55) * D2R);
    const s2 = u.sAt(t + lead * 2.6), look = LR.clamp(LR.wrapPi(course(u, s2)[0] - c0[0]) / D2R, -40, 40);
    // the beat: bouts of beating with a glide between, harder on a climb, hardly at all coming down or banked over
    const bout = F.bout || 9, ph = TAU * (F.beat || 1) * t + (u.phase || 0) * TAU, e = 0.5 + 0.5 * Math.sin(TAU * (t / bout + (u.phase || 0) * 0.37)), climb = Math.sin(c0[1]);
    let A = LR.sm(0.22, 0.6, e); A = Math.max(A, sat(climb * 7)); A *= 1 - 0.75 * sat(-climb * 9); A *= 1 - 0.5 * sat((Math.abs(bank) / D2R - 22) / 25); A = Math.max(A, F.idleBeat === undefined ? 0.1 : F.idleBeat);
    const st = F.stroke || [30, 18], dih = F.dihedral === undefined ? 6 : F.dihedral, w1 = dih * (1 - 0.4 * A) + A * st[0] * Math.sin(ph), w2 = -3 + A * (st[1] * Math.sin(ph - 1.0) - (F.fold || 14) * Math.max(0, Math.cos(ph)));
    // the body rides the beat: lowest in the middle of the downstroke, when the wings press hardest
    const bob = (F.bob === undefined ? 0.14 : F.bob) * A * Math.cos(ph), h = c0[0], rt = [-Math.sin(h), 0, Math.cos(h)], sh = u.shift || [0, 0];
    const P = [p[0] + rt[0] * sh[0], p[1] + sh[1] + bob, p[2] + rt[2] * sh[0]], pitch = c0[1] * 0.8 - 1.4 * D2R * A * Math.sin(ph) + (F.trim || 0) * D2R;
    const cmd = { fly: true, t, limbs: {}, rate: 1, body: M.bodyFrame(P, h, pitch, bank), h, light: 1, u: s, fix: 0, low: 0, idle: 0, lat: 0, ground: P[1], beat: A, phase: ph, bank, speed: sp, kappa, climb, extras: {} };
    for (const pair of F.wings || []) { cmd.extras[pair[0]] = w1; cmd.extras[pair[1]] = w2; }
    if (F.tail) cmd.extras[F.tail] = LR.clamp((bank / D2R) * 0.5, -22, 22);                            // the tail turns with the bank
    cmd.neck = { pitch: 0, yaw: look * 0.3 }; cmd.head = { pitch: (F.gaze === undefined ? 16 : F.gaze) + 6 * Math.sin(t * 0.37 + (u.phase || 0) * 9), yaw: look * 0.7 + 10 * Math.sin(t * 0.23 + (u.phase || 0) * 5), roll: 0 };
    if (u.aware && u.aware.w > 0.001) { cmd.head.yaw += u.aware.yaw * u.aware.w; cmd.head.pitch += (u.aware.pitch - cmd.head.pitch) * u.aware.w; }
    return cmd;
  };
  // the numbers a flyer must keep: clear of the land (and the trees on it), banked as its turns ask and no further, wings within
  // their hinges and really beating, the body riding the beat, no turn harder than a frame bears, a closed and repeatable flight
  M.auditFly = (u, o = {}) => {
    const S = u.K.spec, F = S.flight, L = LR.land, dt = o.dt || 0.1, n = Math.ceil(u.lap / dt), A = { fly: true, unit: u.name, kind: u.kind, tonnes: S.tonnes || 1, lap: u.lap, len: u.len, clear: 1e9, bankMax: 0, bankWrong: 0, bankSamples: 0, pitchMax: 0, load: 0, speedMin: 1e9, speedMax: 0, wing: [1e9, -1e9, 1e9, -1e9], beatShare: 0, bob: 0, glide: 0, lookLead: 0, cycles: Math.round(u.lap * (F.beat || 1)), stride: 0, moves: {} };
    let bobLo = 1e9, bobHi = -1e9; const w = (F.wings || [[]])[0];
    for (let i = 0; i <= n; i++) { const t = (u.lap * i) / n - (u.offset || 0), c = M.flyCmd(u, t), p = c.body.p; for (const [dx, dz] of [[0, 0], [u.span / 2, 0], [-u.span / 2, 0], [0, u.span / 2], [0, -u.span / 2]]) A.clear = Math.min(A.clear, p[1] - L.h(p[0] + dx, p[2] + dz));
      const bd = Math.abs(c.bank) / D2R; A.bankMax = Math.max(A.bankMax, bd); const want = Math.atan((c.speed * c.speed * c.kappa) / 9.81) / D2R; if (Math.abs(want) > 8) { A.bankSamples++; if (Math.sign(want) !== Math.sign(c.bank) || bd < Math.abs(want) * 0.45) A.bankWrong++; }
      A.pitchMax = Math.max(A.pitchMax, Math.abs(Math.asin(LR.clamp(c.body.x[1], -1, 1))) / D2R); A.load = Math.max(A.load, Math.hypot(1, (c.speed * c.speed * Math.abs(c.kappa)) / 9.81)); A.speedMin = Math.min(A.speedMin, c.speed); A.speedMax = Math.max(A.speedMax, c.speed);
      if (w.length) { const a = c.extras[w[0]], b = c.extras[w[1]]; A.wing[0] = Math.min(A.wing[0], a); A.wing[1] = Math.max(A.wing[1], a); A.wing[2] = Math.min(A.wing[2], b); A.wing[3] = Math.max(A.wing[3], b); }
      if (c.beat > 0.5) A.beatShare += 1 / (n + 1); if (c.beat < 0.2) A.glide += 1 / (n + 1); const sh = u.shift || [0, 0], path = u.at(c.u)[1] + sh[1], b = p[1] - path; bobLo = Math.min(bobLo, b); bobHi = Math.max(bobHi, b); }
    A.bob = bobHi - bobLo; A.bankShare = A.bankSamples ? A.bankWrong / A.bankSamples : 0;
    const a = M.poseAt(u, 3.21), b = M.poseAt(u, 3.21), c2 = M.poseAt(u, 3.21 + u.lap * Math.round(1 + 0)); let det = 0; for (const k in a.W) det = Math.max(det, V.len(V.sub(a.W[k].p, b.W[k].p))); A.determinism = det; A.loop = V.len(V.sub(c2.W.body.p, a.W.body.p)) > 1 ? V.len(V.sub(u.at(u.sAt(3.21 + u.lap)), u.at(u.sAt(3.21)))) : 0;
    return A;
  };
}
