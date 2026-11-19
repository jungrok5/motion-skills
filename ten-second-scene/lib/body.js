/* ten-second-scene · body.js — one human rig for every renderer.
   A body is a 3D skeleton in metres (y up), posed by numbers and projected by a camera, so a Canvas 2D figure and a
   three.js figure come from the same joints, and front / back / left / right are always one body (the near limb is
   near because it IS nearer). Legs are two-bone IK with the knee pointing where the foot points, bones never stretch,
   joints report when they leave their range, and walking is planned as footsteps: a planted foot does not move until
   it lifts (references/BODY.md). */
(function (g) {
  'use strict';
  const T = g.TSS, { v3, clamp, lerp, ease, noise2, hash, css, col, shade, mix, PI } = T;
  const deg = d => d * PI / 180;

  // Joint ranges (radians). Elbows and knees only fold one way; numbers from CONTRIBUTING.md "몸이 물리적으로 가능한지".
  const LIM = {
    elbow: [0, deg(150)], knee: [0, deg(155)], hip: [deg(-35), deg(130)], shoulderPitch: [deg(-60), deg(185)],
    shoulderAbd: [deg(-25), deg(175)], neckYaw: [deg(-90), deg(90)], neckPitch: [deg(-45), deg(45)], twist: [deg(-45), deg(45)], lean: [deg(-30), deg(95)], side: [deg(-30), deg(30)],
  };

  // Rodrigues rotation of v about unit axis k
  function rot(v, k, a) {
    const c = Math.cos(a), s = Math.sin(a), d = v3.dot(k, v), x = v3.cross(k, v);
    return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
  }
  const yawFrame = y => ({ R: [-Math.cos(y), 0, Math.sin(y)], U: [0, 1, 0], F: [Math.sin(y), 0, Math.cos(y)] });
  const lean = (f, a) => ({ R: f.R, U: rot(f.U, f.R, -a), F: rot(f.F, f.R, -a) });     // + tips the top forward
  const side = (f, a) => ({ R: rot(f.R, f.F, a), U: rot(f.U, f.F, a), F: f.F });       // + tips the top to the body's right
  const twist = (f, a) => ({ R: rot(f.R, f.U, a), U: f.U, F: rot(f.F, f.U, a) });      // + turns to the body's left (as yaw)
  const at = (o, f, x, y, z) => [o[0] + f.R[0] * x + f.U[0] * y + f.F[0] * z, o[1] + f.R[1] * x + f.U[1] * y + f.F[1] * z, o[2] + f.R[2] * x + f.U[2] * y + f.F[2] * z];

  // ---------- the body spec ----------
  // spec: { id, seed, height m, build (width ×, ~0.85–1.25), mass kg, shoulders (0 narrow … 1 broad), hair: 'short'|'long'|'bun'|'cap'|'bald'|'hood',
  //         coat: false|true (to the knee), bag: null|'back'|'side', colors: { skin, hair, top, bottom, shoes, coat, bag, hat } }
  function make(o = {}) {
    const r = T.rng((o.seed ?? 1) * 7919 + 13);
    const H = o.height ?? 1.7, b = o.build ?? 1, sh = o.shoulders ?? .5;
    const s = {
      id: o.id ?? 'p' + (o.seed ?? 1), seed: o.seed ?? 1, height: H, build: b, mass: o.mass ?? Math.round(62 * b * b * Math.pow(H / 1.7, 2.6)),
      hair: o.hair ?? 'short', child: !!o.child, coat: !!o.coat, padded: !!o.padded, scarf: o.scarf ?? null, bag: o.bag ?? null, hat: o.hat ?? null, skirt: !!o.skirt,
      colors: Object.assign({ skin: '#d9a888', hair: '#1d1714', top: '#5a6b7c', bottom: '#2b2f38', shoes: '#1a1a1c', coat: '#4a3b34', bag: '#3a3430', hat: '#2a2a30' }, o.colors || {}),
      // segment lengths (metres) from canonical proportions: 7.5 heads tall
      L: { head: H / (o.child ? 6.2 : 7.5), neck: .04 * H, spine: .27 * H, upper: .186 * H, fore: .150 * H, thigh: .243 * H, shin: .243 * H, foot: .15 * H, ankle: .042 * H },
      W: { shoulder: (.098 + .03 * sh) * H * b, hip: .052 * H * b, waist: (.072 + .012 * (1 - sh)) * H * b, limb: .034 * H * b },
      phase: r(), breathP: 3.4 + 1.6 * r(), swayP: 6 + 4 * r(),
    };
    s.L.hipH = s.L.thigh + s.L.shin + s.L.ankle;          // standing pelvis (hip joint) height
    return s;
  }

  // ---------- pose: numbers → joints ----------
  // P: { x, z, yaw, ground, pelvisY?, drop, fwd, lean, side, twist, headYaw, headPitch, breath (0..1),
  //      armL/armR: { pitch, abd, elbow }, footL/footR: { p:[x,y,z] (ground point under the ankle), yaw } }
  function pose(s, P) {
    const L = s.L, viol = [];
    const lim = (name, v, key = name) => { const [a, b] = LIM[key]; if (v < a - 1e-3 || v > b + 1e-3) viol.push(`${s.id} ${name} ${(v * 180 / PI).toFixed(0)}° outside ${(a * 180 / PI).toFixed(0)}…${(b * 180 / PI).toFixed(0)}°`); return v; };
    const g0 = P.ground ?? 0, yaw = P.yaw ?? 0, fr0 = yawFrame(yaw);
    const breath = P.breath ?? 0;
    const lean0 = P.lean ?? .03, pel = lean(fr0, lean0 * .25);
    const root = [P.x ?? 0, g0, P.z ?? 0];
    const fpos = (f, sgn) => f && f.p ? f.p : at(root, fr0, sgn * s.W.hip * 1.15, 0, 0);
    const feet = { L: { p: fpos(P.footL, -1), yaw: P.footL?.yaw ?? yaw - .12, planted: P.footL?.planted ?? true }, R: { p: fpos(P.footR, 1), yaw: P.footR?.yaw ?? yaw + .12, planted: P.footR?.planted ?? true } };
    // pelvis height: wanted height, then lowered until both feet are reachable with a slightly soft knee
    const fwd = P.fwd ?? 0, lat = P.lat ?? 0;
    const pxz = at(root, fr0, lat, 0, fwd);
    let py = P.pelvisY ?? (g0 + L.hipH - (P.drop ?? 0) + breath * .004 * s.height);
    const Lmax = (L.thigh + L.shin) * .992;
    for (const [k, sgn] of [['L', -1], ['R', 1]]) {
      const hip = at([pxz[0], 0, pxz[2]], pel, sgn * s.W.hip, 0, 0), an = feet[k].p;
      const dh = Math.hypot(hip[0] - an[0], hip[2] - an[2]);
      if (dh > Lmax) viol.push(`${s.id} ${k} foot out of reach (${dh.toFixed(2)} m > ${Lmax.toFixed(2)} m)`);
      py = Math.min(py, an[1] + L.ankle + Math.sqrt(Math.max(0, Lmax * Lmax - dh * dh)));
    }
    const pelvis = [pxz[0], py, pxz[2]];
    const J = { pelvis, feet };
    // spine
    let ch = lean(fr0, lim('lean', lean0)); ch = side(ch, lim('side', P.side ?? 0)); ch = twist(ch, lim('twist', P.twist ?? 0, 'twist'));
    const chest = at(pelvis, ch, 0, L.spine + breath * .011 * s.height, 0);
    J.chest = chest; J.frame = ch; J.waist = at(pelvis, ch, 0, L.spine * .45, 0);
    const shW = s.W.shoulder * (1 + breath * .015);
    J.shL = at(chest, ch, -shW, (-.01 + breath * .006) * s.height, 0); J.shR = at(chest, ch, shW, (-.01 + breath * .006) * s.height, 0);
    J.hipL = at(pelvis, pel, -s.W.hip, 0, 0); J.hipR = at(pelvis, pel, s.W.hip, 0, 0);
    // head
    let hf = twist(ch, lim('neck yaw', P.headYaw ?? 0, 'neckYaw')); hf = lean(hf, lim('neck pitch', P.headPitch ?? 0, 'neckPitch'));
    J.neck = at(chest, ch, 0, L.neck * .5, 0);
    J.head = at(J.neck, hf, 0, L.neck * .5 + L.head * .5, L.head * .06); J.headFrame = hf;
    // arms
    for (const [k, sgn] of [['L', -1], ['R', 1]]) {
      const a = P['arm' + k] || {}, pitch = lim(`${k} shoulder pitch`, a.pitch ?? 0, 'shoulderPitch'), abd = lim(`${k} shoulder out`, a.abd ?? .07, 'shoulderAbd'), elbow = lim(`${k} elbow`, a.elbow ?? .2, 'elbow');
      const sh = J['sh' + k];
      let d = rot(v3.mul(ch.U, -1), ch.R, pitch); d = rot(d, ch.F, -sgn * abd);
      const ax = rot(ch.R, ch.F, -sgn * abd);
      const el = v3.add(sh, v3.mul(d, L.upper)), fd = rot(d, ax, elbow);
      J['el' + k] = el; J['wr' + k] = v3.add(el, v3.mul(fd, L.fore)); J['hand' + k] = v3.add(el, v3.mul(fd, L.fore + .035 * s.height));
    }
    // legs: two-bone IK, knee toward where the foot points
    for (const [k, sgn] of [['L', -1], ['R', 1]]) {
      const hip = J['hip' + k], ft = feet[k], an = [ft.p[0], ft.p[1] + L.ankle, ft.p[2]];
      const ff = [Math.sin(ft.yaw), 0, Math.cos(ft.yaw)];
      let dv = v3.sub(an, hip), d = v3.len(dv);
      const dmax = (L.thigh + L.shin) * .9995, dmin = Math.abs(L.thigh - L.shin) + .02;
      if (d > dmax) { dv = v3.mul(dv, dmax / d); d = dmax; }
      if (d < dmin) { dv = v3.mul(dv, dmin / d); d = dmin; }
      const dir = v3.mul(dv, 1 / d), aLen = (L.thigh * L.thigh - L.shin * L.shin + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L.thigh * L.thigh - aLen * aLen));
      let kf = v3.add(v3.mul(ff, .7), v3.mul(pel.F, .3)); kf = v3.norm(v3.sub(kf, v3.mul(dir, v3.dot(kf, dir))));
      const knee = v3.add(v3.add(hip, v3.mul(dir, aLen)), v3.mul(kf, h));
      const ankle = v3.add(hip, dv);
      J['knee' + k] = knee; J['ankle' + k] = ankle;
      J['toe' + k] = [ft.p[0] + ff[0] * L.foot * .72, ft.p[1] + (ankle[1] - an[1]) * .4, ft.p[2] + ff[2] * L.foot * .72];
      J['heel' + k] = [ankle[0] - ff[0] * L.foot * .22, ankle[1] - L.ankle * .8, ankle[2] - ff[2] * L.foot * .22];
      const th = v3.norm(v3.sub(knee, hip)), sn = v3.norm(v3.sub(ankle, knee));
      lim(`${k} knee`, Math.acos(clamp(v3.dot(th, sn), -1, 1)), 'knee');
      lim(`${k} hip`, Math.atan2(v3.dot(th, pel.F), -v3.dot(th, pel.U)), 'hip');
    }
    return { J, P, viol, spec: s };
  }

  // ---------- footsteps: plan where and when each foot steps, from the root's motion ----------
  // root(t) → { x, z, yaw } (ease it: heavy bodies start and stop late). Precomputed once; feet(t) is then a lookup.
  function walker(s, root, o = {}) {
    const t0 = o.t0 ?? 0, t1 = o.t1 ?? 10, dt = 1 / 240, k = Math.sqrt(s.height / 1.7);
    const swingBase = (o.swing ?? .40) * k, gap = (o.gap ?? .07) * k, thr = o.threshold ?? .035, lead = o.lead ?? .22;
    const vel = t => { const a = root(t - .02), b = root(t + .02); return [(b.x - a.x) / .04, 0, (b.z - a.z) / .04]; };
    const ideal = (t, sgn, withLead) => { const r = root(t), f = yawFrame(r.yaw), v = vel(t); const p = at([r.x, o.ground ?? 0, r.z], f, sgn * s.W.hip * 1.15, 0, 0); return withLead ? v3.add(p, v3.mul(v, lead)) : p; };
    const feet = { L: { p: ideal(t0, -1), yaw: root(t0).yaw - .1 }, R: { p: ideal(t0, 1), yaw: root(t0).yaw + .1 } };
    const steps = [], plants = { L: [{ t: -1e9, p: feet.L.p, yaw: feet.L.yaw }], R: [{ t: -1e9, p: feet.R.p, yaw: feet.R.yaw }] };
    let swing = null, lastLand = t0 - 1, lastFoot = null;
    for (let t = t0; t <= t1 + .5; t += dt) {
      if (swing && t >= swing.te) { feet[swing.foot] = { p: swing.b, yaw: swing.yawB }; plants[swing.foot].push({ t: swing.te, p: swing.b, yaw: swing.yawB }); lastLand = swing.te; lastFoot = swing.foot; swing = null; }
      if (swing || t - lastLand < gap) continue;
      const v = Math.hypot(...vel(t)), sw = clamp(swingBase - .04 * v, .26 * k, swingBase);
      const err = {};
      for (const [f, sgn] of [['L', -1], ['R', 1]]) {
        const ip = ideal(t + sw, sgn, false), ry = root(t + sw).yaw + sgn * .1;
        err[f] = Math.hypot(feet[f].p[0] - ip[0], feet[f].p[2] - ip[2]) + Math.abs(ry - feet[f].yaw) * .25;
      }
      let f = err.L > err.R ? 'L' : 'R';
      if (f === lastFoot && err[f === 'L' ? 'R' : 'L'] > thr * .5) f = f === 'L' ? 'R' : 'L';
      if (err[f] < thr) continue;
      const sgn = f === 'L' ? -1 : 1, b = ideal(t + sw, sgn, true);
      swing = { foot: f, ts: t, te: t + sw, a: feet[f].p, b, yawA: feet[f].yaw, yawB: root(t + sw).yaw + sgn * .1 };
      steps.push(swing);
    }
    const lift = (o.lift ?? .055) * s.height;
    function footAt(f, t) {
      for (const st of steps) if (st.foot === f && t >= st.ts && t < st.te) {
        const q = (t - st.ts) / (st.te - st.ts), e = ease.inOut(q, 1.7), len = Math.hypot(st.b[0] - st.a[0], st.b[2] - st.a[2]);
        return { p: [lerp(st.a[0], st.b[0], e), lerp(st.a[1], st.b[1], e) + lift * Math.min(1, len / .35 + .25) * Math.sin(PI * q), lerp(st.a[2], st.b[2], e)], yaw: lerp(st.yawA, st.yawB, e), planted: false, q };
      }
      const pl = plants[f]; let cur = pl[0]; for (const p of pl) if (p.t <= t) cur = p;
      return { p: cur.p, yaw: cur.yaw, planted: true, since: cur.t };
    }
    return { steps, feet: t => ({ L: footAt('L', t), R: footAt('R', t) }), vel };
  }

  // ---------- an actor: root path + footsteps + a breathing idle + the scene's overlay ----------
  // o: { root(t)→{x,z,yaw}, walk (bool, default true), ground, overlay(t, P, info) mutates pose params,
  //      actions: [{ name, t0, antic, dur, channel: 'pelvisY'|'handL'|'handR'|'head', dir: +1|-1 }], t0, t1 }
  function actor(s, o) {
    const root = o.root, wk = o.walk === false ? null : walker(s, root, o);
    const idleAmp = o.idle ?? 1;
    function params(t) {
      const r = root(t), P = { x: r.x, z: r.z, yaw: r.yaw, ground: o.ground ?? 0 };
      const ph = s.phase * 100;
      P.breath = .5 + .5 * Math.sin((t / s.breathP + s.phase) * PI * 2);
      const sway = (noise2(t / s.swayP * 3, ph) + .35 * Math.sin(t / s.swayP * 6.283 + ph)) * idleAmp;
      P.side = sway * .035; P.lat = sway * .012 * s.height; P.twist = noise2(t * .21, ph + 7) * .06 * idleAmp;
      P.headYaw = noise2(t * .3, ph + 3) * .3 * idleAmp; P.headPitch = .05 + noise2(t * .37, ph + 5) * .07 * idleAmp;
      P.lean = .035;
      P.armL = { pitch: .03, abd: .07, elbow: .2 }; P.armR = { pitch: .03, abd: .07, elbow: .2 };
      let info = { walking: false, speed: 0 };
      if (wk) {
        const f = wk.feet(t); P.footL = f.L; P.footR = f.R;
        const v = wk.vel(t), sp = Math.hypot(v[0], v[2]), v2 = wk.vel(t + .1), acc = (Math.hypot(v2[0], v2[2]) - sp) / .1;
        const fr = yawFrame(r.yaw);
        const off = ft => v3.dot(v3.sub(ft.p, [r.x, 0, r.z]), fr.F) / s.height;
        // arms swing against the same-side leg; torso leans into acceleration (weight)
        P.armL.pitch = clamp(-off(f.L) * 2.2, -.6, .7) + .02; P.armR.pitch = clamp(-off(f.R) * 2.2, -.6, .7) + .02;
        P.armL.elbow = .25 + Math.max(0, P.armL.pitch) * .6; P.armR.elbow = .25 + Math.max(0, P.armR.pitch) * .6;
        P.twist += (off(f.L) - off(f.R)) * .35;
        P.lean = .035 + sp * .03 + clamp(acc, -1.5, 1.5) * .03;
        P.side += (f.L.planted && !f.R.planted ? -1 : !f.L.planted && f.R.planted ? 1 : 0) * .02 * Math.min(1, sp);
        info = { walking: sp > .15, speed: sp, feet: f };
      }
      if (o.overlay) o.overlay(t, P, info);
      return P;
    }
    const poseAt = t => pose(s, params(t));
    // what check.mjs / audit.mjs read: everything in world metres plus the projection's px-per-metre
    function probe(t, cam) {
      const { J, viol, P } = poseAt(t);
      const pr = cam ? cam.project(J.head) : null, pf = cam ? cam.project(J.pelvis) : null;
      const feetW = ['L', 'R'].map(k => ({ k, p: J.feet[k].p, planted: J.feet[k].planted !== false }));
      const top = v3.add(J.head, [0, s.L.head * .5, 0]), bottom = [J.pelvis[0], P.ground ?? 0, J.pelvis[2]];
      const px = cam ? cam.project(bottom).s : 1;
      return {
        id: s.id, mass: s.mass, heightM: s.height, pxPerM: px,
        heightPx: cam ? s.height * cam.project(J.pelvis).s : null, headPx: cam ? s.L.head * cam.project(J.pelvis).s : null, // body length at its depth (seated people too)
        screen: cam ? { x: pf.x, y: cam.project(bottom).y } : null,
        feet: feetW, joints: { head: J.head, handL: J.handL, handR: J.handR, pelvis: J.pelvis, chest: J.chest },
        channels: { pelvisY: J.pelvis[1], head: J.head[1], handL: J.handL[1], handR: J.handR[1] },
        actions: o.actions || [], viol,
      };
    }
    return { spec: s, params, pose: poseAt, probe, steps: wk ? wk.steps : [], walker: wk };
  }

  // ---------- Canvas 2D drawing ----------
  // style: { light: [x,y,z] (towards the light), lightColor, ambient (0..1), rim: css colour or null, fog: [colour, amount] , shadow: alpha }
  function draw2d(ctx, posed, cam, style = {}) {
    const { J, spec: s } = posed, C = s.colors;
    const Ld = v3.norm(style.light || [-.4, .8, .4]), amb = style.ambient ?? .55, lc = col(style.lightColor || '#fff4e0');
    const fog = style.fog;
    const P = p => cam.project(p);
    const head = P(J.head); if (head.z < .2) return;
    const tone = (c, n) => { let k = amb + (1 - amb) * Math.max(0, v3.dot(n, Ld)); let r = col(c).map((v, i) => clamp(v * k * (.6 + .4 * lc[i] / Math.max(...lc)))); if (fog) r = mix(r, fog[0], fog[1]); return r; };
    const toCam = v3.norm(v3.sub(cam.pos, J.chest));
    const faceCam = v3.dot(J.frame.F, toCam);
    const sp = head.s;
    // contact shadow (on the ground under both feet)
    if ((style.shadow ?? .35) > 0) {
      const m = v3.lerp(J.feet.L.p, J.feet.R.p, .5), c0 = P(m), c1 = P(v3.add(m, [.32 * s.height, 0, 0])), c2 = P(v3.add(m, [0, 0, .32 * s.height]));
      const rx = Math.hypot(c1.x - c0.x, c1.y - c0.y), ry = Math.max(1, Math.hypot(c2.x - c0.x, c2.y - c0.y) * .5);
      const gr = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, rx);
      gr.addColorStop(0, `rgba(0,0,0,${style.shadow ?? .35})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(c0.x, c0.y); ctx.scale(1, ry / rx); ctx.translate(-c0.x, -c0.y); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c0.x, c0.y, rx, 0, PI * 2); ctx.fill(); ctx.restore();
    }
    const parts = [];
    const rimS = style.rimScreen, rimC = style.rim, rimW = style.rimWidth ?? .1;
    const rimLine = (pa, pb, wa, wb) => { if (!rimS || !rimC) return; const dx = pb.x - pa.x, dy = pb.y - pa.y, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; const d = nx * rimS[0] + ny * rimS[1]; if (Math.abs(d) < .15) return; if (d < 0) { nx = -nx; ny = -ny; } if (d < 0) return; ctx.strokeStyle = rimC; ctx.globalAlpha = Math.min(1, d) * .75; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(.6, (wa + wb) / 2 * rimW); ctx.beginPath(); ctx.moveTo(pa.x + nx * wa * .38, pa.y + ny * wa * .38); ctx.lineTo(pb.x + nx * wb * .38, pb.y + ny * wb * .38); ctx.stroke(); ctx.globalAlpha = 1; };
    const limb = (a, b, wa, wb, c, n, extra) => parts.push({ z: (P(a).z + P(b).z) / 2 + (extra || 0), draw: () => { const pa = P(a), pb = P(b); capsule(ctx, pa, pb, wa * sp, wb * sp, css(tone(c, n))); rimLine(pa, pb, wa * sp, wb * sp); } });
    const H = s.height, b = s.build;
    for (const k of ['L', 'R']) {
      const sideN = v3.mul(J.frame.R, k === 'L' ? -1 : 1);
      // legs (trousers / skirt / bare)
      limb(J['hip' + k], J['knee' + k], .072 * H * b, .052 * H * b, s.skirt ? C.skin : C.bottom, sideN, s.coat ? .5 : 0);
      limb(J['knee' + k], J['ankle' + k], .056 * H * b, .042 * H * b, s.skirt ? C.skin : C.bottom, sideN);
      limb(J['heel' + k], J['toe' + k], .034 * H, .03 * H, C.shoes, [0, 1, 0], -.005);
      // arms
      const sleeve = s.coat ? C.coat : C.top;
      limb(J['sh' + k], J['el' + k], (s.coat ? .062 : .052) * H * b, (s.coat ? .052 : .044) * H * b, sleeve, sideN);
      if (s.padded) { const a0 = J['sh' + k], a1 = J['el' + k], a2 = J['wr' + k]; parts.push({ z: (P(a0).z + P(a2).z) / 2 - .001, draw: () => { ctx.strokeStyle = css(shade(tone(sleeve, sideN), .55), .8); ctx.lineWidth = Math.max(.5, .005 * H * sp); for (const [p0, p1, w] of [[a0, a1, .06], [a1, a2, .05]]) for (let u = .3; u < 1; u += .35) { const c = P(v3.lerp(p0, p1, u)), d = P(p1), e = P(p0), ang = Math.atan2(d.y - e.y, d.x - e.x) + PI / 2, r = w * H * b * sp * .5; ctx.beginPath(); ctx.moveTo(c.x - Math.cos(ang) * r, c.y - Math.sin(ang) * r); ctx.quadraticCurveTo(c.x + Math.cos(ang - PI / 2) * r * .3, c.y + Math.sin(ang - PI / 2) * r * .3 + r * .2, c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r); ctx.stroke(); } } }); }
      limb(J['el' + k], J['wr' + k], (s.coat ? .05 : .042) * H * b, (s.coat ? .042 : .034) * H * b, sleeve, sideN);
      limb(J['wr' + k], J['hand' + k], .026 * H, .022 * H, C.gloves || C.skin, sideN);
    }
    // torso: the convex hull of a box (shoulders → waist → hips, front and back), so it has depth from every side
    const f = J.frame, dz = .062 * H * b, hw = s.W.waist;
    const pelvF = yawFrame(posed.P.yaw ?? 0);
    const hullPts = [];
    for (const zz of [-dz, dz]) {
      hullPts.push(at(J.shL, f, .01 * H, -.01 * H, zz * .9), at(J.shR, f, -.01 * H, -.01 * H, zz * .9));
      hullPts.push(at(J.waist, f, -hw, 0, zz * 1.05), at(J.waist, f, hw, 0, zz * 1.05));
      hullPts.push(at(J.pelvis, pelvF, -hw * 1.12, -.03 * H, zz), at(J.pelvis, pelvF, hw * 1.12, -.03 * H, zz));
    }
    if (s.coat) for (const k of ['L', 'R']) { const kn = v3.lerp(J['knee' + k], J['hip' + k], .2); hullPts.push(at(kn, pelvF, (k === 'L' ? -1 : 1) * .04 * H, 0, dz * .7), at(kn, pelvF, (k === 'L' ? -1 : 1) * .04 * H, 0, -dz * .7)); }
    // hips / seat of the trousers (under the torso)
    const seat = [];
    for (const zz of [-dz, dz]) for (const k of ['L', 'R']) { seat.push(at(J['hip' + k], pelvF, (k === 'L' ? -1 : 1) * .045 * H * b, .02 * H, zz * .9), at(v3.lerp(J['hip' + k], J['knee' + k], .25), pelvF, (k === 'L' ? -1 : 1) * .03 * H * b, 0, zz * .8)); }
    parts.push({ z: P(J.pelvis).z + .001, draw: () => roundPoly(ctx, hull(seat.map(P)), .02 * H * sp, css(tone(s.skirt ? (C.skirt || C.bottom) : C.bottom, faceCam >= 0 ? f.F : v3.mul(f.F, -1)))) });
    const tz = P(J.chest).z;
    parts.push({ z: tz, draw: () => {
      const n = faceCam >= 0 ? f.F : v3.mul(f.F, -1);
      const hp = hull(hullPts.map(P));
      roundPoly(ctx, hp, .03 * H * sp, css(tone(s.coat ? C.coat : C.top, n)));
      if (rimS && rimC) { const cx = hp.reduce((a, p) => a + p.x, 0) / hp.length, cy = hp.reduce((a, p) => a + p.y, 0) / hp.length; ctx.strokeStyle = rimC; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(.7, .012 * H * sp * rimW * 6); for (let i = 0; i < hp.length; i++) { const a = hp[i], b2 = hp[(i + 1) % hp.length], mx = (a.x + b2.x) / 2 - cx, my = (a.y + b2.y) / 2 - cy, dx = b2.x - a.x, dy = b2.y - a.y, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; } const d = nx * rimS[0] + ny * rimS[1]; if (d < .3) continue; ctx.globalAlpha = Math.min(1, d * 1.2); ctx.beginPath(); ctx.moveTo(a.x - nx * 1.2, a.y - ny * 1.2); ctx.lineTo(b2.x - nx * 1.2, b2.y - ny * 1.2); ctx.stroke(); } ctx.globalAlpha = 1; }
      // clothing details on the side we see: quilting, a zip or buttons, pockets, a bag strap
      const det = (pts, col, w) => { const q = pts.map(P); ctx.strokeStyle = col; ctx.lineWidth = Math.max(.5, w * sp); ctx.lineCap = 'round'; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); };
      const base = s.coat ? C.coat : C.top, dark = css(shade(tone(base, n), .6), .9), lite = css(mix(tone(base, n), '#ffffff', .18), .7);
      ctx.save(); ctx.beginPath(); hp.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
      const zf = faceCam >= 0 ? dz * 1.02 : -dz * 1.02, bot = s.coat ? -.27 * H : -.05 * H;
      if (s.padded) for (let y = .0; y > bot - .02; y -= .065 * H) { const pts = []; for (let u = -1; u <= 1.001; u += .25) pts.push(at(J.waist, f, u * hw * 1.25, y + .02 * H * (1 - u * u) * .4 + (J.chest[1] - J.waist[1]) * .9, zf)); det(pts, dark, .006 * H); }
      if (faceCam > .15) {
        det([at(J.chest, f, 0, -.02 * H, zf), at(J.pelvis, pelvF, 0, bot, zf * .95)], s.padded ? dark : lite, .005 * H);
        for (const sx of [-1, 1]) det([at(J.pelvis, pelvF, sx * hw * .55, .02 * H, zf), at(J.pelvis, pelvF, sx * hw * .85, -.03 * H, zf)], dark, .007 * H);
      }
      if (s.bag === 'side' || s.bag === 'back') { const sxs = s.bag === 'side' ? [-1] : [-1, 1]; for (const sx of sxs) det([at(J.chest, f, sx * s.W.shoulder * .6, -.005 * H, faceCam >= 0 ? dz : -dz), at(J.waist, f, (s.bag === 'side' ? 1 : sx) * hw * .9, -.04 * H, faceCam >= 0 ? dz * 1.05 : -dz * 1.05)], css(C.bag), .012 * H); }
      ctx.restore();
      // a soft value step on the side away from the light (form, not a flat sticker)
      const lsc = v3.dot(f.R, Ld) > 0 ? -1 : 1, sideK = Math.abs(v3.dot(f.R, Ld));
      if (sideK > .15) { ctx.save(); ctx.globalAlpha = .18 * sideK; const sh = [at(J.shL, f, 0, 0, 0), at(J.shR, f, 0, 0, 0)]; const q = hull([P(at(J.chest, f, lsc * s.W.shoulder, -.01 * H, 0)), P(at(J.waist, f, lsc * hw, 0, 0)), P(at(J.pelvis, pelvF, lsc * hw, -.03 * H, 0)), P(at(J.pelvis, pelvF, lsc * hw * .3, -.03 * H, 0)), P(at(J.chest, f, lsc * s.W.shoulder * .35, -.01 * H, 0))]); roundPoly(ctx, q, .02 * H * sp, 'rgba(10,8,20,1)'); ctx.restore(); }
    } });
    if (s.bag === 'back') {
      const f = J.frame, c = at(J.chest, f, 0, -.11 * H, -.075 * H);
      parts.push({ z: P(c).z, draw: () => { const a = P(at(c, f, -.09 * H, .07 * H, 0)), bb = P(at(c, f, .09 * H, .07 * H, 0)), cc = P(at(c, f, .085 * H, -.1 * H, -.02 * H)), d = P(at(c, f, -.085 * H, -.1 * H, -.02 * H)); roundPoly(ctx, [a, bb, cc, d], .03 * H * sp, css(tone(C.bag, v3.mul(f.F, -1)))); } });
    }
    if (s.bag === 'side') {
      const f = J.frame, c = at(J.pelvis, f, .14 * H * b, .02 * H, .0);
      parts.push({ z: P(c).z - .01, draw: () => { const a = P(at(c, f, 0, .08 * H, -.06 * H)), bb = P(at(c, f, 0, .08 * H, .06 * H)), cc = P(at(c, f, 0, -.04 * H, .06 * H)), d = P(at(c, f, 0, -.04 * H, -.06 * H)); roundPoly(ctx, [a, bb, cc, d], .015 * H * sp, css(tone(C.bag, f.R))); } });
    }
    // neck + head (hair placed by which way the face points)
    if (s.scarf) { const f = J.frame; parts.push({ z: head.z + .002, draw: () => { const zf = faceCam >= 0 ? 1 : -1, nk = at(J.neck, f, 0, -.012 * H, 0); const l = P(at(nk, f, -.06 * H, 0, .02 * H * zf)), r2 = P(at(nk, f, .06 * H, 0, .02 * H * zf)); capsule(ctx, l, r2, .05 * H * sp, .05 * H * sp, css(tone(s.scarf, f.F))); if (faceCam > -.2) { const t0 = P(at(nk, f, .03 * H, -.01 * H, .045 * H)), t1 = P(at(nk, f, .045 * H, -.17 * H, .05 * H)); capsule(ctx, t0, t1, .04 * H * sp, .034 * H * sp, css(shade(tone(s.scarf, f.F), .9))); } } }); }
    parts.push({ z: head.z, draw: () => drawHead(ctx, J, s, cam, tone, sp, style) });
    parts.sort((a, b2) => b2.z - a.z);
    for (const p of parts) p.draw();
  }

  function drawHead(ctx, J, s, cam, tone, sp, style) {
    const H = s.height, C = s.colors, hf = J.headFrame, h = cam.project(J.head);
    const nk = cam.project(J.neck);
    capsule(ctx, nk, h, .03 * H * sp, .028 * H * sp, css(tone(C.skin, hf.F)));
    const rx = .058 * H * sp, ry = .068 * H * sp;
    const toCam = v3.norm(v3.sub(cam.pos, J.head)), face = v3.dot(hf.F, toCam);   // 1 = looking at camera, -1 = away
    const fx = v3.dot(hf.F, cam.r);                                                  // + = face points to screen right
    const up = cam.project(v3.add(J.head, hf.U)), ang = Math.atan2(up.x - h.x, -(up.y - h.y));
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(ang);
    // long hair behind the head and shoulders
    if (s.hair === 'long') { ctx.fillStyle = css(tone(C.hair, v3.mul(hf.F, -1))); ctx.beginPath(); ctx.ellipse(-fx * rx * .35, ry * .55, rx * 1.05, ry * 1.25, 0, 0, PI * 2); ctx.fill(); }
    ctx.fillStyle = css(tone(C.skin, hf.F)); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, PI * 2); ctx.fill();
    // nose / chin bump towards the face side, eyes when the face is towards us and big enough
    if (face > -.3 && Math.abs(fx) > .25) { ctx.beginPath(); ctx.ellipse(fx * rx * .92, ry * .12, rx * .22, ry * .16, 0, 0, PI * 2); ctx.fill(); }
    if (s.hair !== 'bald') {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.06, ry * 1.04, 0, 0, PI * 2); ctx.clip();
      const back = clamp(-face, 0, 1), sideK = Math.abs(fx);
      // hair mass: a cap on top when facing us, the back half when side-on, nearly all when facing away
      const cx = -fx * rx * .55 * (1 - back * .6), cy = lerp(-ry * .72, -ry * .1, Math.max(back, sideK * .55));
      const rrx = lerp(rx * 1.15, rx * 1.25, back), rry = lerp(ry * .55, ry * 1.02, Math.max(back, sideK * .6));
      ctx.fillStyle = css(tone(C.hair, hf.U)); ctx.beginPath(); ctx.ellipse(cx, cy, rrx, rry, 0, 0, PI * 2); ctx.fill();
      ctx.restore();
      if (s.hair === 'bun') { ctx.fillStyle = css(tone(C.hair, hf.U)); ctx.beginPath(); ctx.arc(-fx * rx * .7, -ry * .85, rx * .42, 0, PI * 2); ctx.fill(); }
    }
    if (s.hat === 'cap' || s.hair === 'cap' || s.hat === 'beanie') {
      ctx.fillStyle = css(tone(C.hat, hf.U)); ctx.beginPath(); ctx.ellipse(0, -ry * .45, rx * 1.08, ry * .66, 0, PI, 0); ctx.fill();
      if (s.hat !== 'beanie') { ctx.beginPath(); ctx.ellipse(fx * rx * .9, -ry * .42, rx * (.25 + .45 * Math.abs(fx)), ry * .12, 0, 0, PI * 2); ctx.fill(); }
    }
    if (face > .15 && rx > 5) {
      ctx.fillStyle = 'rgba(25,18,16,.85)';
      const ex = fx * rx * .35, gap = rx * .38 * Math.sqrt(1 - Math.min(1, fx * fx));
      for (const e of [-1, 1]) { if (Math.abs(fx) > .75 && e === -Math.sign(fx)) continue; ctx.beginPath(); ctx.ellipse(ex + e * gap, -ry * .02, Math.max(.6, rx * .1), Math.max(.6, ry * .07), 0, 0, PI * 2); ctx.fill(); }
    }
    if (style.rim) { ctx.strokeStyle = style.rim; ctx.lineWidth = Math.max(.6, rx * .12); ctx.beginPath(); const la = style.rimSide ?? -1; ctx.ellipse(0, 0, rx * .96, ry * .96, 0, la > 0 ? -1.2 : PI + 1.2 - PI, la > 0 ? 1.2 : PI + 1.2); ctx.stroke(); }
    ctx.restore();
  }

  function hull(pts) {
    const p = pts.map(q => ({ x: q.x, y: q.y })).sort((a, b) => a.x - b.x || a.y - b.y);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  function capsule(ctx, a, b, wa, wb, fill) {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-6, nx = -dy / l, ny = dx / l, ang = Math.atan2(dy, dx);
    ctx.fillStyle = fill; ctx.beginPath();
    ctx.moveTo(a.x + nx * wa / 2, a.y + ny * wa / 2); ctx.lineTo(b.x + nx * wb / 2, b.y + ny * wb / 2);
    ctx.arc(b.x, b.y, wb / 2, ang + PI / 2, ang - PI / 2, true);
    ctx.lineTo(a.x - nx * wa / 2, a.y - ny * wa / 2);
    ctx.arc(a.x, a.y, wa / 2, ang - PI / 2, ang + PI / 2, true);
    ctx.closePath(); ctx.fill();
  }
  function roundPoly(ctx, pts, r, fill) {
    ctx.fillStyle = fill; ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const m0 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, m1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      if (i === 0) ctx.moveTo(m0.x, m0.y);
      ctx.arcTo(p1.x, p1.y, m1.x, m1.y, Math.max(0, Math.min(r, Math.hypot(p1.x - m0.x, p1.y - m0.y) * .9, Math.hypot(p1.x - m1.x, p1.y - m1.y) * .9)));
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------- cast sheet: every figure turned all the way round, then walk / stepped turn / big move both ways ----------
  const CELL = 150, ROWH = 300;
  const castSize = specs => ({ W: CELL * 10, H: 90 + specs.length * (ROWH * 3 + 40) });
  function castSheet(ctx, specs) {
    const { W, H } = castSize(specs);
    ctx.fillStyle = '#ece8e0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#222'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('cast sheet — 8 turns · walk · stepped turn · big move (anticipation → action → recovery), facing right and left', 20, 40);
    ctx.font = '15px sans-serif';
    let y0 = 70; const all = [];
    for (const sp0 of specs) {
      const s = sp0.height ? sp0 : make(sp0);
      const cam = camera1(s);
      ctx.fillStyle = '#222'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(`${s.id} · ${s.height.toFixed(2)} m · ${s.mass} kg`, 20, y0 + 18); ctx.font = '13px sans-serif';
      // row 1: eight yaws
      const names = ['front', 'front-3/4 L', 'side L', 'back-3/4 L', 'back', 'back-3/4 R', 'side R', 'front-3/4 R'];
      for (let i = 0; i < 8; i++) {
        const yaw = -i * PI / 4, a = actor(s, { root: () => ({ x: 0, z: 0, yaw }), walk: false, idle: 0 });
        const p = a.pose(0); all.push(...p.viol);
        cell(ctx, cam, p, 10 + i * CELL, y0 + 26, names[i]);
      }
      // rows 2–3: motion, right then left
      for (const [ri, dir] of [[1, 1], [2, -1]]) {
        const yRow = y0 + 26 + ri * ROWH;
        const walk = actor(s, { root: t => ({ x: dir * (-1.6 + 1.1 * Math.max(0, t - .3) - .55 * (1 - Math.exp(-Math.max(0, t - .3) * 2)) ), z: 0, yaw: dir * PI / 2 }), t1: 3 });
        const turn = actor(s, { root: t => ({ x: 0, z: 0, yaw: dir * PI / 2 + ease.inOut(clamp((t - .2) / 1.2), 2) * dir * -PI / 2 }), t1: 3 });
        const big = actor(s, { root: () => ({ x: 0, z: 0, yaw: dir * PI / 2 }), walk: false, idle: 0, overlay: (t, P) => { const v = T.act(t, { t0: .6, antic: .35, dur: .3, depth: 1, over: .12, back: { at: 1.4, dur: .4, bounce: .15 } }); P.drop = Math.max(0, -v) * .12 * s.height + Math.max(0, v - 1) * .05 * s.height; P.lean = .04 + Math.max(0, -v) * .35; const up = clamp(v, 0, 1.2); P.armL = { pitch: up * 2.9, abd: .15, elbow: .25 }; P.armR = { pitch: up * 2.9, abd: .15, elbow: .25 }; P.headPitch = -up * .25; }, actions: [{ name: 'reach', t0: .6, antic: .35, dur: .3, channel: 'handR', dir: 1 }] });
        const frames = [[walk, 1.0, 'walk'], [walk, 1.15, ''], [walk, 1.3, ''], [walk, 1.45, ''], [turn, .45, 'turn (steps)'], [turn, .9, ''], [turn, 1.35, ''], [big, .55, 'antic'], [big, .95, 'action'], [big, 1.9, 'recover']];
        frames.forEach(([a, t, lab], i) => { const p = a.pose(t); all.push(...p.viol); cell(ctx, cam, p, 10 + i * CELL, yRow, lab + (i === 0 ? (dir > 0 ? ' → right' : ' ← left') : ''), a, t); });
      }
      y0 += ROWH * 3 + 40;
    }
    ctx.fillStyle = all.length ? '#b00' : '#063'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(all.length ? `joint limits: ${all.length} out of range — ${all[0]}` : 'joint limits: all in range', 20, H - 14);
    g.castReport = () => ({ violations: all });
  }
  function camera1(s) { return T.camera({ pos: [0, s.height * .55, 9], target: [0, s.height * .55, 0], fov: 16, W: CELL, H: ROWH }); }
  function cell(ctx, cam, p, x, y, label, a, t) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, CELL - 4, ROWH - 10); ctx.clip();
    ctx.fillStyle = '#f7f4ee'; ctx.fillRect(0, 0, CELL, ROWH);
    const gy = cam.project([0, 0, 0]).y; ctx.strokeStyle = '#bbb'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CELL, gy); ctx.stroke();
    // centre the figure in its cell (walks travel)
    const off = cam.project(p.J.pelvis).x - CELL / 2; ctx.translate(-off, 0);
    draw2d(ctx, p, cam, { light: [-.5, .7, .6], ambient: .6 });
    if (a && a.walker) for (const k of ['L', 'R']) { const f = p.J.feet[k]; if (f.planted !== false) { const q = cam.project(f.p); ctx.fillStyle = '#0a6'; ctx.fillRect(q.x - 2, q.y - 2, 4, 4); } }
    ctx.restore();
    ctx.fillStyle = '#444'; ctx.font = '12px sans-serif'; ctx.fillText(label, x + 4, y + ROWH - 14);
  }

  T.Body = { hull, LIM, make, pose, walker, actor, draw2d, capsule, roundPoly, castSheet, castSize, yawFrame, lean, side, twist, at, rot };
})(window);
