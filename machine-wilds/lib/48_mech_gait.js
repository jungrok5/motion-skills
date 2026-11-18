// machine-wilds · 48_mech_gait — walking on land that is not level.  A machine follows a closed way; where each foot
// comes down is decided once, from the land (its height, its slope, what stands there), and everything else is a pure
// function of time: a planted foot is a fixed point of the world, a swinging foot clears the ground between two such
// points, the body's height and tilt come from the feet that carry it (eased over part of a cycle: mass), and each
// leg bends as much as its own patch of ground asks.  Numbers only — it runs in Node too (scripts/gym.mjs).
//
//   LR.mech.route(name, [[x, z], …])                       a closed way (Catmull-Rom through the points)
//   LR.mech.spawn(kind, { route, offset, halts:[{ at, hold, move }] } | { post:[x, z], yaw, moves:[…] })
//   LR.mech.plan()                                         footfalls for every unit (needs LR.land), cylinder anchors per kind
//   LR.mech.cmd(unit, t) → a command for Kin.pose          LR.mech.audit(unit) → numbers for the checks
{
  const M = LR.mech, V = M.v, D2R = M.D2R, TAU = Math.PI * 2;
  const fract = (x) => x - Math.floor(x), sat = LR.sat;
  const smooth5 = (x) => { x = sat(x); return x * x * x * (x * (6 * x - 15) + 10); };
  // key poses → a value: [[t, v], …], eased between keys (the method of machine-build-reel: key poses, numbers, interpolation)
  const track = (keys, t) => { if (!keys || !keys.length) return 0; if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * smooth5((t - a[0]) / Math.max(1e-9, b[0] - a[0])); } return keys[keys.length - 1][1]; };
  M.track = track;
  const land = () => LR.land;

  // ── ways ───────────────────────────────────────────────────────────────────────────────────────────────────────
  M.route = (name, pts, o = {}) => {
    const n = pts.length, cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const raw = (u) => { const i = Math.floor(u), t = u - i, p = (k) => pts[(((i + k) % n) + n) % n]; return [cr(p(-1)[0], p(0)[0], p(1)[0], p(2)[0], t), cr(p(-1)[1], p(0)[1], p(1)[1], p(2)[1], t)]; };
    const NS = n * 40, tab = new Float64Array(NS + 1), sx = new Float32Array(NS + 1), sz = new Float32Array(NS + 1); let prev = raw(0), total = 0; sx[0] = prev[0]; sz[0] = prev[1];
    for (let i = 1; i <= NS; i++) { const q = raw((i / NS) * n); total += Math.hypot(q[0] - prev[0], q[1] - prev[1]); tab[i] = total; sx[i] = q[0]; sz[i] = q[1]; prev = q; }
    const R = { name, pts, len: total, width: o.width || 0, sx, sz };
    R.at = (s) => { s = ((s % total) + total) % total; let lo = 0, hi = NS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] <= s) lo = m; else hi = m; } const f = (s - tab[lo]) / Math.max(1e-9, tab[hi] - tab[lo]); return [sx[lo] + (sx[hi] - sx[lo]) * f, sz[lo] + (sz[hi] - sz[lo]) * f]; };
    // how far a point is from the way (for keeping trees, ruins and scans off it)
    R.dist = (x, z) => { let d = 1e18; for (let i = 0; i < NS; i += 2) { const dx = sx[i] - x, dz = sz[i] - z, q = dx * dx + dz * dz; if (q < d) d = q; } return Math.sqrt(d); };
    M.routes[name] = R; return R;
  };
  // the nearest way to a point, and whether a point is on one (within its half-width, or `pad` more)
  M.wayDist = (x, z) => { let d = 1e9; for (const k in M.routes) { const r = M.routes[k]; d = Math.min(d, r.dist(x, z) - r.width / 2); } return d; };

  // ── units ──────────────────────────────────────────────────────────────────────────────────────────────────────
  M.spawn = (kind, o = {}) => { const K = M.kinds[kind]; if (!K) throw new Error('no machine kind ' + kind); const u = Object.assign({ kind, K, kin: K.kin, name: o.name || kind + (M.units.length + 1), offset: 0, halts: [], seed: M.units.length + 1 }, o); M.units.push(u); return u; };
  const offsets = (kin, g) => {
    if (g.offsets) return Object.assign({}, g.offsets); const out = {}, legs = kin.limbs, pat = g.pattern || 'lateral';
    for (const side of [-1, 1]) { const s = legs.filter((l) => l.side === side).sort((a, b) => (pat === 'tripod' ? b.at[0] - a.at[0] : a.at[0] - b.at[0])), n = s.length;
      s.forEach((l, i) => { out[l.name] = pat === 'tripod' ? 0.5 * ((i + (side < 0 ? 0 : 1)) % 2) : pat === 'wave' ? fract((i / Math.max(1, n)) * (1 - g.duty) + (side < 0 ? 0 : 0.5)) : fract((side < 0 ? 0 : 0.5) + (n > 1 ? (0.25 * i) / (n - 1) : 0)); }); }
    return out;
  };
  // the widest stretch of a cycle in which every foot is down: where a machine can stand still
  const allDown = (off, duty) => { let best = [0, -1], run = 0, start = 0; const NQ = 720; const down = (f) => Object.values(off).every((o) => fract(f - o) < duty - 0.012 && fract(f - o) > 0.012);
    for (let i = 0; i < NQ * 2; i++) { const f = (i % NQ) / NQ; if (down(f)) { if (!run) start = i; run++; if (run > best[1]) best = [start + run / 2, run]; } else run = 0; }
    return best[1] > 0 ? fract(best[0] / NQ) : null; };

  // what is built and stands in a foot's way (ruins, placed scans — whatever has registered a solid by the time the walk is planned)
  M.blocked = (x, z, r) => { const W = LR.world; if (!W || !W.solids) return false; for (const s of W.solids) { if (s.mech) continue; if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + r) return true; } else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; if (Math.abs(lx) < s.hx + r && Math.abs(lz) < s.hz + r) return true; } } return false; };
  // where a foot may come down near (x, z): not on a face too steep to stand on, not on something built, not in deep water
  const footing = (u, l, x, z) => {
    const L = land(), g = u.K.spec.gait, maxS = g.maxSlope === undefined ? 1 - Math.cos((g.footTilt || 26) * D2R) : g.maxSlope, e = Math.max(0.5, l.ball * 1.6), n = [0, 1, 0];
    const cost = (px, pz) => { L.normal(px, pz, e, n); let c = Math.max(0, 1 - n[1] - maxS) * 30; if (M.blocked && M.blocked(px, pz, l.ball * 2.2, u)) c += 8; if (LR.water && LR.water.levelAt) { const d = LR.water.levelAt(px, pz) - L.h(px, pz); if (d > (g.wade === undefined ? 2.5 : g.wade)) c += 4 + d; } return c; };
    let best = [x, z], bc = cost(x, z); if (bc < 1e-6) return [x, z, 0];
    const adj = g.adjust === undefined ? g.stride * 0.34 : g.adjust;
    for (const r of [0.25, 0.5, 0.75, 1]) for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + r, px = x + Math.cos(a) * adj * r, pz = z + Math.sin(a) * adj * r, c = cost(px, pz) + 0.25 * r; if (c < bc) { bc = c; best = [px, pz]; } }
    return [best[0], best[1], Math.hypot(best[0] - x, best[1] - z)];
  };
  // a foot's place on the ground: the height under the ball, the tilt of the patch it stands on, each toe's droop to the ground under its tip
  const setFoot = (u, l, P) => {
    const L = land(), nrm = L.normal(P.x, P.z, Math.max(0.5, l.ball * 1.5), [0, 1, 0]), maxTilt = (u.K.spec.gait.footTilt || 26) * D2R;
    // a sole follows the ground only as far as its ball joint turns
    const tilt = Math.acos(LR.clamp(nrm[1], -1, 1)); if (tilt > maxTilt) { const k = Math.sin(maxTilt) / Math.max(1e-6, Math.hypot(nrm[0], nrm[2])); nrm[0] *= k; nrm[2] *= k; nrm[1] = Math.cos(maxTilt); }
    P.y = L.h(P.x, P.z); P.n = nrm; P.c = [P.x + nrm[0] * l.ball, P.y + nrm[1] * l.ball, P.z + nrm[2] * l.ball];
    let fw = [Math.cos(P.yaw), 0, Math.sin(P.yaw)]; fw = V.norm(V.sub(fw, V.mul(nrm, V.dot(fw, nrm)))); const F = { x: fw, y: nrm, z: V.cross(fw, nrm), p: P.c };
    P.toes = l.toes.map((a) => { const tb = u.kin.toeBase(l, F, a), tip = V.mad(tb.base, tb.h, l.toeLen), gy = L.h(tip[0], tip[2]) + 0.16 * l.ball;
      const A = tb.h[1] * l.toeLen, B = nrm[1] * l.toeLen, R = Math.hypot(A, B), d = Math.acos(LR.clamp((gy - tb.base[1]) / R, -1, 1)) - Math.atan2(B, A); return LR.clamp(d / D2R, -22, 55); });
    return P;
  };

  M.planUnit = (u) => {
    const K = u.K, S = K.spec, g = S.gait, kin = u.kin, legs = kin.limbs, L = land();
    u.off = offsets(kin, g); u.T = g.cycle; u.duty = g.duty;
    const xs = legs.map((l) => l.home[0]), zs = legs.map((l) => Math.abs(l.home[1])); u.wb = Math.max(...xs) - Math.min(...xs); u.track = 2 * Math.max(...zs);
    u.front = legs.filter((l) => l.home[0] > (Math.max(...xs) + Math.min(...xs)) / 2).map((l) => l.name);
    // how high a hip may stand over the ground its foot is on before the leg runs out (and how low before it folds): from the
    // leg's lengths, the farthest its foot gets from under the hip in a stance, and how far out it stands
    { const lim = g.reachMax || 0.955, low = g.reachMin || 0.4; u.hip = {};
      for (const l of legs) { const dx0 = l.home[0] - l.at[0], half = g.stride * 0.5 + (g.adjust === undefined ? g.stride * 0.2 : g.adjust * 0.6), tar = l.n === 3 ? l.segs[2] : 0, gm = l.gamma * D2R, off = l.n === 3 ? -l.knee * Math.sin(gm) * tar : 0;
        const dxm = Math.max(Math.abs(dx0 + half + off), Math.abs(dx0 - half + off)), dzl = l.kind === 'insect' ? 0 : l.home[1] - l.at[2], up = (l.n === 3 ? Math.cos(gm) * tar : 0) + l.ball;
        const inPlane = (R) => Math.sqrt(Math.max(0.01, R * R - (l.kind === 'insect' ? Math.max(0, Math.hypot(dx0, l.home[1] - l.at[2]) + half * 0.7 - l.coxa) ** 2 : dxm * dxm)));
        const vert = (d) => (l.kind === 'insect' ? d : Math.sqrt(Math.max(0.01, d * d - dzl * dzl)));
        u.hip[l.name] = { max: vert(inPlane(lim * l.reach)) + up + l.hipDrop, min: vert(inPlane(Math.max(low * l.reach, Math.abs(dx0 + off) + 0.2))) * 0 + (low * l.reach) + up + l.hipDrop }; } }
    if (u.post) {                                       // standing where it is: feet at their homes on the land, the idle and its moves in a loop
      const h = (u.yaw || 0) * D2R, fw = [Math.cos(h), Math.sin(h)], rt = [-Math.sin(h), Math.cos(h)]; u.N = 1; u.h0 = h; u.plants = {}; for (const l of legs) u.off[l.name] = 0;
      for (const l of legs) { const f = footing(u, l, u.post[0] + fw[0] * l.home[0] + rt[0] * l.home[1], u.post[1] + fw[1] * l.home[0] + rt[1] * l.home[1]); u.plants[l.name] = [setFoot(u, l, { x: f[0], z: f[1], yaw: h, moved: f[2] })]; }
      const mv = (u.moves || []).map((n) => S.moves[n]).filter(Boolean); u.loop = (S.idle ? S.idle.period : 12) * Math.max(1, u.rest || 1) + mv.reduce((a, m) => a + m.dur + 4, 0); return u;
    }
    const R = (u.R = typeof u.route === 'string' ? M.routes[u.route] : u.route), per = g.stride / g.duty;
    // the body's place on the way: its front and rear girders both follow it (a long body cuts the inside of a bend)
    u.bodyAt = (s) => { const a = R.at(s + u.wb / 2), b = R.at(s - u.wb / 2); return { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, h: Math.atan2(a[1] - b[1], a[0] - b[0]) }; };
    // shorter steps where the way is steep: level ground keeps the stride the kind was given, a grade shortens it (to 55 % at
    // most), and the number of cycles in a lap is whatever that adds up to (a whole number: one lap later every foot is where it was)
    { const NQ = Math.max(64, Math.round(R.len / 1.5)), U = new Float64Array(NQ + 1), ds = R.len / NQ; let acc = 0, wp = 1; const k = g.steepSlow === undefined ? 1 : g.steepSlow;
      for (let i = 0; i <= NQ; i++) { const s = i * ds, a = R.at(s - u.wb / 2), b = R.at(s + u.wb / 2), gr = Math.abs(L.h(b[0], b[1]) - L.h(a[0], a[1])) / Math.max(1, u.wb), w = 1 / (1 + 0.82 * k * Math.min(1, (gr / 0.3) ** 2)); if (i) acc += ds / ((w + wp) / 2); wp = w; U[i] = acc; }
      const N = (u.N = Math.max(4, Math.round(acc / per))); for (let i = 0; i <= NQ; i++) U[i] *= N / acc; u.stride = (acc / N) * g.duty;
      u.Sof = (uu) => { const lap = Math.floor(uu / N), f = uu - lap * N; let lo = 0, hi = NQ; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (U[m] <= f) lo = m; else hi = m; } return lap * R.len + (lo + (f - U[lo]) / Math.max(1e-9, U[hi] - U[lo])) * ds; }; }
    const N = u.N;
    // footfalls: step k of a leg is where its home is when the body is at the middle of that stance
    u.plants = {};
    for (const l of legs) { const list = (u.plants[l.name] = []);
      for (let k = 0; k < N; k++) { const b = u.bodyAt(u.Sof(k + u.off[l.name] + g.duty / 2)), fw = [Math.cos(b.h), Math.sin(b.h)], rt = [-Math.sin(b.h), Math.cos(b.h)];
        const f = footing(u, l, b.x + fw[0] * l.home[0] + rt[0] * l.home[1], b.z + fw[1] * l.home[0] + rt[1] * l.home[1]); list.push(setFoot(u, l, { x: f[0], z: f[1], yaw: b.h, moved: f[2] })); } }
    M.swings(u);
    // standing still: at a moment when every foot is down, eased into and out of; the timetable of one lap
    const gap = allDown(u.off, g.duty), E = g.ease || u.T * 0.9, seg = []; let t = 0, uu = 0;
    const halts = gap === null ? [] : (u.halts || []).map((h) => { const mv = h.move && S.moves ? S.moves[h.move] : null; return { u: Math.floor(h.at * N) + gap, hold: Math.max(h.hold || 10, mv ? mv.dur + 5.5 : 0), move: mv, name: h.move }; }).sort((a, b) => a.u - b.u);
    for (const h of halts) { const u0 = h.u - E / (2 * u.T); if (u0 <= uu + 0.25) continue; seg.push({ k: 'walk', t0: t, t1: t + (u0 - uu) * u.T, u0: uu }); t += (u0 - uu) * u.T;
      seg.push({ k: 'dec', t0: t, t1: t + E, u0 }); t += E; h.t0 = t; seg.push({ k: 'hold', t0: t, t1: t + h.hold, u0: h.u, h }); t += h.hold; seg.push({ k: 'acc', t0: t, t1: t + E, u0: h.u, h }); t += E; uu = h.u + E / (2 * u.T); }
    seg.push({ k: 'walk', t0: t, t1: t + (N - uu) * u.T, u0: uu }); t += (N - uu) * u.T; u.seg = seg; u.lap = t; u.haltList = halts.filter((h) => h.t0 !== undefined); u.ease = E;
    return u;
  };
  // how much higher than its plain arc a swinging foot must go to clear the ground between two footfalls
  M.swings = (u) => { const L = land(), g = u.K.spec.gait; for (const l of u.kin.limbs) { const list = u.plants[l.name], N = list.length;
    for (let k = 0; k < N; k++) { const A = list[k], B = list[(k + 1) % N]; let extra = 0; const clear = g.clear === undefined ? 0.35 * l.ball + 0.25 : g.clear;
      for (const s of [0.16, 0.3, 0.45, 0.6, 0.75, 0.88]) { const e = smooth5((s - 0.08) / 0.84), x = A.x + (B.x - A.x) * e, z = A.z + (B.z - A.z) * e, base = A.y + (B.y - A.y) * e + g.lift * Math.sin(Math.PI * s ** 0.75) ** 1.4, need = L.h(x, z) + clear - base; if (need > 0) extra = Math.max(extra, need / Math.sin(Math.PI * s)); }
      A.extra = extra; } } };
  // after the land changes under the feet (footprints pressed in): heights, tilts and toes again
  M.reseat = (u) => { for (const l of u.kin.limbs) for (const P of u.plants[l.name]) setFoot(u, l, P); if (!u.post) M.swings(u); };

  // time → where in the walk: the phase (cycles since the lap began, laps included), how fast it runs (1 walking, 0 standing), the halt it is in or near
  const phase = (u, t) => {
    const lap = Math.floor(t / u.lap), tl = t - lap * u.lap, T = u.T; let s = u.seg[u.seg.length - 1]; for (const q of u.seg) if (tl < q.t1) { s = q; break; }
    const d = tl - s.t0, E = s.t1 - s.t0; let uu, rate;
    if (s.k === 'walk') { uu = s.u0 + d / T; rate = 1; } else if (s.k === 'hold') { uu = s.u0; rate = 0; }
    else if (s.k === 'dec') { uu = s.u0 + (d / 2 + (E / (2 * Math.PI)) * Math.sin((Math.PI * d) / E)) / T; rate = 0.5 + 0.5 * Math.cos((Math.PI * d) / E); }
    else { uu = s.u0 + (d / 2 - (E / (2 * Math.PI)) * Math.sin((Math.PI * d) / E)) / T; rate = 0.5 - 0.5 * Math.cos((Math.PI * d) / E); }
    // the nearest halt in time: τ seconds since it came to rest (negative while still arriving)
    let halt = null, tau = 0; for (const h of u.haltList) for (const o of [-u.lap, 0, u.lap]) { const q = tl - (h.t0 + o); if (q > -u.ease - 1 && q < h.hold + u.ease + 6 && (!halt || Math.abs(q) < Math.abs(tau))) { halt = h; tau = q; } }
    return { u: uu + lap * u.N, rate, halt, tau };
  };
  M.phase = phase;
  // one leg at phase uu: planted (a fixed point of the world) or swinging between two footfalls
  const legAt = (u, l, uu, out) => {
    const g = u.K.spec.gait, x = uu - u.off[l.name], k = Math.floor(x), p = x - k, list = u.plants[l.name], N = list.length, A = list[((k % N) + N) % N];
    out.k = k; out.p = p; out.A = A;
    if (p < g.duty) { out.s = 0; out.sw = false; out.c = A.c; out.n = A.n; out.yaw = A.yaw; out.toes = A.toes; out.pitch = 0; out.curl = 0; out.gamma = l.gamma; out.hy = A.y; return out; }
    const B = list[(((k + 1) % N) + N) % N], s = (p - g.duty) / (1 - g.duty), e = smooth5((s - 0.08) / 0.84), sp = s ** 0.75;      // leaves late, travels fast, eases into the set-down
    const up = g.lift * Math.sin(Math.PI * sp) ** 1.4 + A.extra * Math.sin(Math.PI * s);                                              // quick lift, slow set-down; higher where the ground asks
    const cl = sat(up / Math.max(1e-6, 1.1 * l.toeLen * 0.5, 0.45 * g.lift)) ** 1.5;                                                  // tipped and curled only once it is clear
    let dy = B.yaw - A.yaw; dy = LR.wrapPi(dy);
    out.s = s; out.sw = true; out.B = B; out.c = [A.c[0] + (B.c[0] - A.c[0]) * e, A.c[1] + (B.c[1] - A.c[1]) * e + up, A.c[2] + (B.c[2] - A.c[2]) * e];
    out.n = V.norm(V.lerp(A.n, B.n, e)); out.yaw = A.yaw + dy * e; out.pitch = cl * (g.footPitch || 16) * (s < 0.55 ? 1 : -0.6); out.curl = cl * (g.toeCurl || 22);
    out.toes = A.toes.map((a, i) => a + (B.toes[i] - a) * e); out.gamma = l.gamma + (g.swingGamma || 0) * Math.sin(Math.PI * s) ** 1.2; out.hy = A.y + (B.y - A.y) * smooth5(s);
    return out;
  };
  M.legAt = legAt;
  // what the feet say about the ground under the body at phase uu: its height, its fall along the body, its fall across it
  const _l = {}; const groundAt = (u, uu) => {
    let sum = 0, fr = 0, re = 0, nf = 0, nr = 0, rt = 0, lf = 0, nR = 0, nL = 0; const legs = u.kin.limbs, hs = [];
    for (const l of legs) { const h = legAt(u, l, uu, _l).hy; hs.push(h); sum += h; if (u.front.includes(l.name)) { fr += h; nf++; } else { re += h; nr++; } if (l.side > 0) { rt += h; nR++; } else { lf += h; nL++; } }
    const g = u.K.spec.gait, fol = g.follow || [0.6, 0.35], pitch = Math.atan2(fr / Math.max(1, nf) - re / Math.max(1, nr), Math.max(1, u.wb * (nf && nr ? 0.75 : 1))) * fol[0], roll = Math.atan2(lf / Math.max(1, nL) - rt / Math.max(1, nR), Math.max(1, u.track)) * fol[1];
    // the body's height: its ride over the mean of its feet — but never so high that the lowest foot's leg runs out, never
    // so low that the highest foot's leg folds (each hip's own height counted: the body is tilted)
    let y = sum / legs.length + u.K.spec.ride - (g.crouch || 0), hi = 1e9, lo = -1e9; const sp = Math.sin(pitch), sr = Math.sin(roll);
    legs.forEach((l, i) => { const oy = l.at[1] + l.at[0] * sp - l.at[2] * sr, H = u.hip[l.name]; hi = Math.min(hi, hs[i] + H.max - oy); lo = Math.max(lo, hs[i] + H.min - oy); });
    // (a soft limit: the body starts to come down before a leg is at its end, and never with a jerk)
    if (lo > hi) lo = hi = (lo + hi) / 2; const kS = Math.max(0.12, u.K.spec.ride * 0.03), smin = (a, b) => (a - b > 8 * kS ? b : b - a > 8 * kS ? a : -kS * Math.log(Math.exp(-a / kS) + Math.exp(-b / kS))), yc = -smin(-smin(y, hi), -lo);
    return [yc, pitch, roll, yc - y];
  };
  // a mass eases through what its feet tell it: a raised-cosine window, 13 taps wide
  // which side carries (−1 left … 1 right) and how much of the front is off the ground, from the phases alone
  const carry = (u, uu) => { const g = u.K.spec.gait, e = 0.06, nF = Math.max(1, u.front.length); let sz = 0, sw = 0, fa = 0;
    for (const l of u.kin.limbs) { const x = uu - u.off[l.name], p = x - Math.floor(x), w = p < e ? 0.5 + (0.5 * p) / e : p < g.duty - e ? 1 : p < g.duty ? 0.5 + (0.5 * (g.duty - p)) / e : p > 1 - e ? (0.5 * (p - (1 - e))) / e : 0; sz += w * l.side; sw += w; if (u.front.includes(l.name)) fa += (1 - w) / nF; }
    return [sz / Math.max(1e-6, sw), fa]; };
  const FIR = []; { let sum = 0; for (let i = -6; i <= 6; i++) { const w = 0.5 + 0.5 * Math.cos((Math.PI * i) / 7); FIR.push([i / 6, w]); sum += w; } for (const f of FIR) f[1] /= sum; }

  // ── the command at time t ──────────────────────────────────────────────────────────────────────────────────────
  M.cmd = (u, t) => {
    const K = u.K, S = K.spec, g = S.gait, kin = u.kin, legs = kin.limbs, I = S.idle || {}; t += u.offset || 0;
    const ph = u.post ? { u: 0, rate: 0, halt: null, tau: 0 } : phase(u, t), uu = ph.u, cmd = { limbs: {}, t, rate: ph.rate };
    // the legs
    let dip = 0; const tauD = g.dipTime || 0.4;
    for (const l of legs) { const a = legAt(u, l, uu, {}); cmd.limbs[l.name] = { p: a.c, n: a.n, yaw: a.yaw, pitch: a.pitch, curl: a.curl, toes: a.toes, gamma: a.gamma, sw: a.sw, s: a.s, k: a.k };
      if (u.post) continue;
      for (const kk of [a.k, a.k - 1, a.k - 2]) { const d = (uu - (kk + u.off[l.name])) * u.T / tauD; if (d >= 0 && d < 2) dip += ((g.dip || 0) / legs.length) * 2 * (0.5 - 0.5 * Math.cos(Math.PI * d)); } }      // the body sinks into each landing and comes back (heavier: slower) — it starts without a jolt: the leg gives first
    // which side carries, and how much of the front is in the air — eased over a part of the cycle: a mass sways, it does not jump
    let lat = 0, frontAir = 0; if (!u.post) { const win = g.swaySmooth === undefined ? 0.2 : g.swaySmooth; for (const f of FIR) { const q = carry(u, uu + f[0] * win); lat += q[0] * f[1]; frontAir += q[1] * f[1]; } }
    // the ground under the body, eased over part of a cycle (a big mass does not follow every stone)
    let gy = 0, gp = 0, gr = 0, low = 0; if (u.post) { const q = groundAt(u, 0); gy = q[0]; gp = q[1]; gr = q[2]; low = q[3]; } else { const win = g.smooth === undefined ? 0.45 : g.smooth; for (const f of FIR) { const q = groundAt(u, uu + f[0] * win); gy += q[0] * f[1]; gp += q[1] * f[1]; gr += q[2] * f[1]; low += q[3] * f[1]; } }
    const walk = ph.rate;
    let bx, bz, h; if (u.post) { bx = u.post[0]; bz = u.post[1]; h = u.h0; } else { const b = u.bodyAt(u.Sof(uu)); bx = b.x; bz = b.z; h = b.h; }
    let dx = (g.surge || 0) * Math.sin(TAU * 2 * uu) * walk, dz = (g.sway || 0) * lat * walk, dy = -dip, roll = gr + (g.roll || 0) * D2R * lat * walk, pitch = gp - (g.nod || 0) * D2R * frontAir * walk, yaw = (g.yaw || 0) * D2R * lat * walk;
    const neck = { pitch: (g.neckRock || 0) * frontAir * walk, yaw: -(g.neckSway || 0) * lat * walk }, head = { pitch: 0, yaw: (g.neckSway || 0) * lat * 0.8 * walk, roll: 0 }; let light = 1;
    // standing: it arrives carrying its speed (the body runs on over its feet and comes back), breathes while it waits, and
    // gathers before it leaves (sinks and leans back, then pushes off)
    let idleW = u.post ? 1 : 0, mt = -1, mv = null;
    if (ph.halt) { const tau = ph.tau, H = ph.halt.hold, E = u.ease, A = Math.min(g.gather || 2.2, H * 0.3), kS = (g.settle || 0.5), tp = (g.settleTime || 0.8);
      if (tau > -E * 0.5) { const q = Math.min(2, Math.max(0, tau + E * 0.5) / tp), s = 0.5 - 0.5 * Math.cos(Math.PI * q); dx += kS * s; pitch -= kS * 0.012 * s * (10 / Math.max(4, u.wb)); dy -= kS * 0.25 * s; }
      idleW = smooth5((tau - 0.6) / 2.2) * smooth5((H - A * 0.4 - tau) / 1.6);
      const gk = track([[H - A, 0], [H - 0.3 * A, 1], [H + 0.45 * E, -0.3], [H + E, 0]], tau), gb = track([[H - A, 0], [H - 0.3 * A, 1], [H + 0.5 * E, 0]], tau);
      dy -= (g.gatherDip || 0.35) * gk; dx -= (g.gatherBack || 0.4) * gb; pitch += (g.gatherPitch || 0.8) * D2R * gb;
      if (ph.halt.move) { mv = ph.halt.move; mt = tau - 2.5; } }
    if (u.post && u.moves && u.moves.length) { const tl = ((t % u.loop) + u.loop) % u.loop; let t0 = (I.period || 12) * (u.rest || 1); for (const n of u.moves) { const m = S.moves[n]; if (!m) continue; if (tl >= t0 && tl < t0 + m.dur) { mv = m; mt = tl - t0; } t0 += m.dur + 4; } }
    if (idleW > 0 && I.period) { const w = TAU / I.period, s = idleW;
      dy += (I.breath || 0) * Math.sin(3 * w * t) * s; dz += (I.shift || 0) * Math.sin(2 * w * t + 0.4) * s; pitch += 0.5 * D2R * Math.sin(3 * w * t + 1.1) * s; roll += 0.7 * D2R * Math.sin(2 * w * t + 0.4) * s;
      const sc = (I.scan || 0) * (0.7 * Math.sin(w * t) + 0.3 * Math.sin(5 * w * t + 0.7)) * s * (mv && mt >= 0 && mt <= mv.dur ? 0.15 : 1);
      neck.pitch += -1.5 * Math.sin(3 * w * t) * s; neck.yaw += sc * 0.4; head.pitch += 2.5 * Math.sin(2 * w * t + 2.0) * s; head.yaw += sc * 0.6; light = 1 - 0.18 * s * (0.5 + 0.5 * Math.sin(6 * w * t)); }
    // a move in key poses, played while it stands (every channel gathers first and settles after: the keys say so)
    if (mv && mt >= 0 && mt <= mv.dur) { const Kk = mv.keys, ch = (c) => (Kk[c] ? track(Kk[c], mt) : 0);
      dx += ch('body.dx'); dy += ch('body.dy'); dz += ch('body.dz'); roll += ch('body.roll') * D2R; pitch += ch('body.pitch') * D2R; yaw += ch('body.yaw') * D2R;
      neck.pitch += ch('neck.pitch'); neck.yaw += ch('neck.yaw'); head.pitch += ch('head.pitch'); head.yaw += ch('head.yaw'); head.roll += ch('head.roll'); if (Kk.light) light *= ch('light');
      cmd.extras = {}; for (const c in Kk) if (c.startsWith('extra.')) cmd.extras[c.slice(6)] = track(Kk[c], mt); cmd.move = mv; cmd.mt = mt; }
    // someone near (set by the live page, eased there): the head turns to them
    if (u.aware && u.aware.w > 0.001) { neck.yaw += u.aware.yaw * 0.45 * u.aware.w; head.yaw += u.aware.yaw * 0.55 * u.aware.w; head.pitch += u.aware.pitch * u.aware.w; }
    const fw = [Math.cos(h), Math.sin(h)], rt = [-Math.sin(h), Math.cos(h)], P = [bx + fw[0] * dx + rt[0] * dz, gy + dy, bz + fw[1] * dx + rt[1] * dz];
    // no leg is ever asked for more than it has: where the ground falls away under a foot the body comes down to it, where it
    // rises under a folded leg the body lifts (a continuous correction; the checks report how often and how much)
    let B = M.bodyFrame(P, h + yaw, pitch, roll), fix = 0; const lim = 0.992, lowR = 0.3;
    for (let it = 0; it < 4; it++) { let over = 0, under = 0;
      for (const l of legs) { const c = cmd.limbs[l.name], sol = l.solve(B, c.p, c.gamma), d = sol.span * l.reach; if (d > lim * l.reach) over = Math.max(over, d - lim * l.reach); if (d < lowR * l.reach) under = Math.max(under, lowR * l.reach - d); }
      if (over < 1e-4 && under < 1e-4) break; const d = over > 0 ? -over * 1.15 : under * 1.1; fix += d; P[1] += d; B = M.bodyFrame(P, h + yaw, pitch, roll); if (over > 0 && under > 0) break; }
    cmd.body = B; cmd.fix = fix; cmd.low = low; cmd.neck = neck; cmd.head = head; cmd.light = light; cmd.lat = lat; cmd.idle = idleW; cmd.ground = gy; cmd.u = uu; cmd.h = h;
    return cmd;
  };
  M.poseAt = (u, t) => { const c = M.cmd(u, t), r = u.kin.pose(c, (q) => M.cmd(u, q - (u.offset || 0)), c.t); r.cmd = c; return r; };

  // ── cylinder anchors for a kind, from everything its units do ──────────────────────────────────────────────────
  M.fit = () => {
    const rel = {}, rep = {};
    for (const u of M.units) { const r = (rel[u.kind] = rel[u.kind] || {}), span = u.post ? u.loop : u.lap, n = Math.min(2400, Math.ceil(span / 0.15));
      for (let i = 0; i < n; i++) { const c = M.cmd(u, (span * i) / n - (u.offset || 0)); for (const l of u.kin.limbs) { const sol = l.solve(c.body, c.limbs[l.name].p, c.limbs[l.name].gamma), hg = l.hinges(sol); for (let j = 0; j < l.n; j++) { const k = l.name + '/' + j, q = r[k] || (r[k] = [9, -9]); if (hg[j] < q[0]) q[0] = hg[j]; if (hg[j] > q[1]) q[1] = hg[j]; } } } }
    // both sides of a machine share one range per joint (left and right cylinders are the same part)
    for (const kind in rel) { const K = M.kinds[kind], r = rel[kind]; for (const l of K.kin.limbs) for (let j = 0; j < l.n; j++) { const tw = K.kin.limbs.find((q) => q !== l && q.at[0] === l.at[0] && q.side === -l.side); if (tw) { const a = r[l.name + '/' + j], b = r[tw.name + '/' + j]; if (a && b) { a[0] = b[0] = Math.min(a[0], b[0]); a[1] = b[1] = Math.max(a[1], b[1]); } } }
      rep[kind] = M.actAssign(K.kin, r); K.ranges = r; }
    M.fitted = rep; return rep;
  };
  // what decades of the same footfalls do to a way: the ground across it is eased toward level, and every footfall is a
  // pressed hollow with a raised rim, bare of grass.  Units of one kind on one way share their footfalls.
  M.press = () => {
    const L = land(), seen = new Set();
    for (const k in M.routes) { const r = M.routes[k]; if (r.pressed || !r.width) continue; r.pressed = true;
      // What walking the same line for decades does: across the way the ground is brought toward level (far enough out to hold
      // the feet), along it the rises and falls stay but no stretch is steeper than these legs climb (cut where it was, filled
      // where it was not), and a skirt on either side, longer where the cut is deeper, leaves no bank standing.  Then the
      // way gets its own unevenness back: a worn track is never a road.
      const us = M.units.filter((u) => u.R === r || u.route === r.name), wb = Math.max(4, ...us.map((u) => u.wb || 4)), G = r.grade === undefined ? 0.2 : r.grade, hw = r.width * 0.45, step = 2, ns = Math.ceil(r.len / step), k0 = r.ease === undefined ? 0.8 : r.ease, half = L.half, res = L.res, n = L.n;
      const raw = [], ys = []; for (let i = 0; i < ns; i++) { const p = r.at(i * step); raw.push(L.h(p[0], p[1])); }
      const win = Math.max(2, Math.round(wb / 2 / step)); for (let i = 0; i < ns; i++) { let y = 0, c = 0; for (let j = -win; j <= win; j++) { const w = 1 - Math.abs(j) / (win + 1); y += raw[(((i + j) % ns) + ns) % ns] * w; c += w; } ys.push(y / c); }
      for (let it = 0; it < 4; it++) { for (let i = 1; i <= ns; i++) { const a = ys[i - 1], q = i % ns; ys[q] = LR.clamp(ys[q], a - G * step, a + G * step); } for (let i = ns - 1; i >= 0; i--) { const a = ys[(i + 1) % ns]; ys[i] = LR.clamp(ys[i], a - G * step, a + G * step); } }
      if (k0 > 0) { const acc = new Float32Array(n * n), wgt = new Float32Array(n * n);
        for (let i = 0; i < ns; i++) { const p = r.at(i * step), skirt = Math.max(6, hw * 1.2, Math.abs(ys[i] - raw[i]) * 2.6), R = hw + skirt, i0 = Math.max(0, Math.floor((p[0] - R + half) / res)), i1 = Math.min(n - 1, Math.ceil((p[0] + R + half) / res)), j0 = Math.max(0, Math.floor((p[1] - R + half) / res)), j1 = Math.min(n - 1, Math.ceil((p[1] + R + half) / res));
          for (let j = j0; j <= j1; j++) for (let q = i0; q <= i1; q++) { const d = Math.hypot(-half + q * res - p[0], -half + j * res - p[1]); if (d >= R) continue; const w = LR.sm(R, hw * 0.85, d), e = j * n + q; if (w > wgt[e]) { wgt[e] = w; acc[e] = ys[i]; } } }
        const amp = r.rough === undefined ? 0.3 * Math.sqrt(r.width / 15) : r.rough, f = 1.4 / Math.max(6, r.width);
        for (let e = 0; e < n * n; e++) if (wgt[e] > 0) { const x = -half + (e % n) * res, z = -half + Math.floor(e / n) * res, rim = LR.sm(half - 4, half - 28, Math.max(Math.abs(x), Math.abs(z))), w = wgt[e] * k0 * rim;
          L.H[e] += (acc[e] - L.H[e]) * w + ((LR.fbm(x * f + 31, z * f + 7, 3) - 0.5) * 2 * amp + (LR.fbm(x * f * 3.1, z * f * 3.1 + 5, 2) - 0.5) * amp * 0.5) * w; } }
      const pts = []; for (let s2 = 0; s2 <= r.len; s2 += 3) pts.push(r.at(s2)); pts.push(r.at(0)); L.road(pts, r.width * 0.62, { kind: 'dirt', strength: r.worn === undefined ? 0.4 : r.worn, wobble: 2.2, soft: 3, ease: false }); }
    for (const u of M.units) M.planUnit(u);                                                   // the eased ground moves the footfalls: plan on it
    const half = L.half, res = L.res, n = L.n;
    for (const u of M.units) { const key = u.kind + '/' + (u.R ? u.R.name : u.name); if (seen.has(key)) continue; seen.add(key); const g = u.K.spec.gait;
      for (const l of u.kin.limbs) for (const P of u.plants[l.name]) { const R = l.ball * 1.1 + l.toeLen * 0.85, depth = g.print === undefined ? 0.06 * R : g.print;      /* shallow and wide: a deep print is a wall the next foot would land on */ if (Math.abs(P.x) > half - R - 2 || Math.abs(P.z) > half - R - 2) continue;
        const i0 = Math.floor((P.x - R * 1.7 + half) / res), i1 = Math.ceil((P.x + R * 1.7 + half) / res), j0 = Math.floor((P.z - R * 1.7 + half) / res), j1 = Math.ceil((P.z + R * 1.7 + half) / res);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(-half + i * res - P.x, -half + j * res - P.z) / R; L.H[j * n + i] += -depth * LR.sm(1.05, 0.3, d) + depth * 0.22 * LR.sm(0.8, 1.2, d) * LR.sm(1.7, 1.25, d); }
        if (L.patch) L.patch(P.x, P.z, R * 0.9, { kind: 'dirt', strength: 0.95, soft: R * 0.5, wobble: 0.5 }); } }
    for (const u of M.units) M.reseat(u);
  };
  M.plan = (o = {}) => { for (const u of M.units) M.planUnit(u); if (o.press !== false) M.press(); M.planned = true; return M.fit(); };

  // ── the numbers the checks read ────────────────────────────────────────────────────────────────────────────────
  // Sampled over a whole lap: is every leg within its reach, does any joint bend the wrong way or fold shut, does a planted foot
  // stay where it was put, is its sole on the ground and tilted as the ground is, how many feet carry, do the rods stay in
  // their barrels, does the belly clear the land, does the walk close on itself, is the same instant the same pose.
  M.audit = (u, o = {}) => {
    const kin = u.kin, legs = kin.limbs, L = land(), span = u.post ? u.loop : u.lap, dt = o.dt || 0.05, n = Math.ceil(span / dt), g = u.K.spec.gait;
    const A = { unit: u.name, kind: u.kind, tonnes: u.K.spec.tonnes || 100, lap: span, cycles: u.N, stride: u.stride || 0, samples: n, clamp: 0, spanMax: 0, spanMin: 9, slip: 0, gap: 0, sole: 0, bendFlip: 0, foldMax: 0, straight: 180, supportMin: 99, fixMax: 0, fixShare: 0, belly: 1e9, kneeLow: 1e9, swingLow: 1e9, overlapMin: 9, leverMin: 9, speedMax: 0, moved: 0, tiltMax: 0, tiltOver: 0, lowMax: 0, lowMean: 0, jerk: 0, hinge: {}, steepest: 0, bodyAcc: 0 };
    const bsign = {}, planted = {}, hist = []; let fixN = 0;
    for (let i = 0; i <= n; i++) { const t = (span * i) / n - (u.offset || 0), r = M.poseAt(u, t), c = r.cmd; let sup = 0;
      if (Math.abs(c.fix) > 1e-4) { fixN++; A.fixMax = Math.max(A.fixMax, Math.abs(c.fix)); } A.lowMax = Math.max(A.lowMax, -c.low); A.lowMean += -c.low / (n + 1);
      for (const l of legs) { const sol = r.sols[l.name], q = c.limbs[l.name]; A.clamp = Math.max(A.clamp, sol.clamp); A.spanMax = Math.max(A.spanMax, sol.span); A.spanMin = Math.min(A.spanMin, sol.span);
        l.bends(sol).forEach((b, j) => { const key = l.name + j, want = bsign[key] === undefined ? (bsign[key] = Math.sign(b) || 1) : bsign[key]; if (Math.sign(b) !== want) A.bendFlip++; A.foldMax = Math.max(A.foldMax, Math.abs(b) / D2R); A.straight = Math.min(A.straight, Math.abs(b) / D2R); });
        for (let j = 1; j < l.n; j++) A.kneeLow = Math.min(A.kneeLow, sol.J[j][1] - L.h(sol.J[j][0], sol.J[j][2]));
        const end = sol.J[l.n];
        if (!q.sw) { sup++; const key = l.name + ':' + q.k, was = planted[key]; if (was) A.slip = Math.max(A.slip, Math.hypot(end[0] - was[0], end[1] - was[1], end[2] - was[2])); else planted[key] = end.slice();
          const P = legAt(u, l, c.u, {}).A; A.gap = Math.max(A.gap, Math.abs(end[1] - P.n[1] * l.ball - L.h(end[0] - P.n[0] * l.ball, end[2] - P.n[2] * l.ball)));
          const tn = L.normal(P.x, P.z, Math.max(0.5, l.ball * 1.5), [0, 1, 0]); A.sole = Math.max(A.sole, Math.acos(LR.clamp(V.dot(P.n, r.W['foot_' + l.name].y), -1, 1)) / D2R); const tl = Math.acos(LR.clamp(tn[1], -1, 1)) / D2R; A.tiltMax = Math.max(A.tiltMax, tl); A.tiltOver = Math.max(A.tiltOver, tl - (g.footTilt || 26)); }
        else if (q.s > 0.14 && q.s < 0.9) A.swingLow = Math.min(A.swingLow, end[1] - l.ball - L.h(end[0], end[2]));
        for (let j = 0; j < l.n; j++) { const an = l.anchors[l.jointNames[j]]; if (!l.acts[j] || !an) continue; const pts = M.actPoints(l, sol, j, an), len = V.len(V.sub(pts[1], pts[0])), eyes = 2.2 * an.r;
          A.overlapMin = Math.min(A.overlapMin, (an.Bl + an.Rl + eyes - len) / an.Bl); if (len < an.Bl + eyes + 1.4 * an.r) A.overlapMin = Math.min(A.overlapMin, -(an.Bl + eyes + 1.4 * an.r - len)); const pv = sol.J[j], d = V.norm(V.sub(pts[1], pts[0])), w = V.sub(pv, pts[0]); A.leverMin = Math.min(A.leverMin, V.len(V.sub(w, V.mul(d, V.dot(w, d))))); } }
      A.supportMin = Math.min(A.supportMin, sup);
      // the belly over the land: the body's box corners and middle, a quarter of its ride under the hips
      const B = c.body, S = u.K.spec, bb = S.belly || [u.wb * 0.6, S.ride * 0.12, u.track * 0.3]; for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) { const p = M.apply(B, [sx * bb[0], -bb[1], sz * bb[2]]); A.belly = Math.min(A.belly, p[1] - L.h(p[0], p[2])); }
      hist.push(B.p); const q3 = Math.max(1, Math.round(0.3 / (span / n))); if (hist.length > 2 * q3) { const a = hist[hist.length - 1 - 2 * q3], b = hist[hist.length - 1 - q3], hh = q3 * (span / n); A.speedMax = Math.max(A.speedMax, V.len(V.sub(B.p, b)) / hh); A.bodyAcc = Math.max(A.bodyAcc, V.len([B.p[0] - 2 * b[0] + a[0], B.p[1] - 2 * b[1] + a[1], B.p[2] - 2 * b[2] + a[2]]) / (hh * hh)); } }
    A.fixShare = fixN / (n + 1);
    for (const l of legs) for (const P of u.plants[l.name]) { A.moved = Math.max(A.moved, P.moved || 0); A.steepest = Math.max(A.steepest, Math.acos(LR.clamp(L.normal(P.x, P.z, Math.max(0.5, l.ball * 1.5), [0, 1, 0])[1], -1, 1)) / D2R); }
    // the walk closes (one lap later is the same pose) and is deterministic (the same instant twice)
    const a = M.poseAt(u, 7.31), b = M.poseAt(u, 7.31), c2 = M.poseAt(u, 7.31 + span); let det = 0, loop = 0; const bp = u.post ? [0, 0, 0] : V.sub(c2.W.body.p, a.W.body.p);
    for (const k in a.W) { det = Math.max(det, V.len(V.sub(a.W[k].p, b.W[k].p))); loop = Math.max(loop, V.len(V.sub(V.sub(c2.W[k].p, a.W[k].p), bp))); } A.determinism = det; A.loop = loop + V.len(bp);
    // idle: while it stands, something must still move — the body breathes, the head looks about, the lights pulse
    A.idle = null; const I = u.K.spec.idle;
    { let t0 = null; if (u.post) t0 = 0.5 - (u.offset || 0); else if (u.haltList && u.haltList.length) { const hh = u.haltList.find((q) => !q.move) || u.haltList[0]; t0 = hh.t0 + 0.4 - (u.offset || 0); }
      if (t0 !== null && I) { let y0 = 1e9, y1 = -1e9, h0 = 1e9, h1 = -1e9, l0 = 9, l1 = -9, slip = 0; const first = {}; for (let i = 0; i < 80; i++) { const r = M.poseAt(u, t0 + i * 0.1); y0 = Math.min(y0, r.W.body.p[1]); y1 = Math.max(y1, r.W.body.p[1]); if (r.W.head) { const hy = LR.wrapPi(Math.atan2(r.W.head.x[2], r.W.head.x[0]) - r.cmd.h); h0 = Math.min(h0, hy); h1 = Math.max(h1, hy); } l0 = Math.min(l0, r.cmd.light); l1 = Math.max(l1, r.cmd.light);
          for (const l of legs) { const e = r.sols[l.name].J[l.n]; if (first[l.name]) slip = Math.max(slip, V.len(V.sub(e, first[l.name]))); else first[l.name] = e; } }
        A.idle = { breath: y1 - y0, scan: r2d(h1 - h0), light: l1 - l0, slip }; } }
    // moves: the main channel must gather against its direction first and overshoot rest on the way back
    A.moves = {}; const mvs = u.K.spec.moves || {}; for (const name in mvs) { const m = mvs[name], keys = m.keys[m.main]; if (!keys) continue; let peak = 0, pt = 0; for (let i = 0; i <= 400; i++) { const tt = (m.dur * i) / 400, v = track(keys, tt) - keys[0][1]; if (Math.abs(v) > Math.abs(peak)) { peak = v; pt = tt; } }
      let ant = 0, rec = 0; for (let i = 0; i <= 400; i++) { const tt = (m.dur * i) / 400, v = (track(keys, tt) - keys[0][1]) / (peak || 1); if (tt < pt) ant = Math.min(ant, v); else rec = Math.min(rec, v); } A.moves[name] = { main: m.main, peak, anticipation: -ant, recovery: -rec }; }
    return A;
  };
  const r2d = (a) => a / D2R;
}
