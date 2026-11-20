/* pixel-world-compiler · fw-body.js
   Bodies as reasons: a person and a quadruped, rigged in rows derived from measured proportions, moved by
   gait laws, drawn into channel sprites. Code-only: motion is keyed here, never taken from generated video.

   Authorities
   - Human segment ratios: Drillis & Contini (1966), fractions of stature. Stature = 26 rows (fw-core).
   - Medium law: a head under 6 rows does not read, so the head takes 6 and the torso gives back 2 rows.
   - Gait speed and stride: dynamic similarity, Alexander (1976, 1989): v = sqrt(Fr·g·leg),
     stride / leg ≈ 2.3·Fr^0.3. Walks sit at Fr 0.05–0.3.
   - Quadruped contact schedule: Hildebrand (1965): duty factor + lag of the forefoot behind its hindfoot.
   - Planted feet: a foot lands at a ground point and stays on it until it lifts; the body is solved to its
     feet (two-bone IK), never the feet to the body. A turn is made of steps.
   - Bend directions: human knee points forward, elbow back; quadruped carpus (fore) points forward, hock
     (hind) points back, so a lifted fore cannon folds back and a lifted hind cannon folds forward.

   Ground plane for locomotion (Frostwind's seam): an actor's root and its feet live in screen-ground px,
   with travel north advancing rows 1:1 with columns. Static things use cabinet k = 1/2. */
(function () {
  'use strict';
  const FW = window.FW, P = FW.SCALE.PX_PER_M, G = 9.81;
  const mod1 = (v) => ((v % 1) + 1) % 1, TAU = Math.PI * 2;
  const ease = (t) => t * t * (3 - 2 * t);
  const B = (FW.body = {});

  /* ---------- a ground path (screen-ground px), extrapolated past both ends ---------- */
  /* corners become arcs (radius r px), so the heading turns over distance and never snaps */
  function fillet(pts, r) {
    if (pts.length < 3 || !r) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], p = pts[i], b = pts[i + 1], la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const d = Math.min(r, la / 2, lb / 2), u = [(p[0] - a[0]) / la, (p[1] - a[1]) / la], w = [(b[0] - p[0]) / lb, (b[1] - p[1]) / lb];
      const s0 = [p[0] - u[0] * d, p[1] - u[1] * d], s1 = [p[0] + w[0] * d, p[1] + w[1] * d];
      for (let k = 0; k <= 8; k++) { const t = k / 8, m = 1 - t; out.push([m * m * s0[0] + 2 * m * t * p[0] + t * t * s1[0], m * m * s0[1] + 2 * m * t * p[1] + t * t * s1[1]]); }
    }
    out.push(pts[pts.length - 1]); return out;
  }
  B.fillet = fillet;
  class Path {
    constructor(pts) {
      this.p = pts; this.c = [0];
      for (let i = 1; i < pts.length; i++) this.c.push(this.c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      this.len = this.c[this.c.length - 1];
    }
    at(s) {
      const p = this.p, c = this.c; let i = 1;
      if (s > 0) while (i < p.length - 1 && c[i] < s) i++;
      const a = p[i - 1], b = p[i], L = c[i] - c[i - 1] || 1, u = (s - c[i - 1]) / L;
      const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, dx, dy, phi: Math.atan2(-dy, dx) };
    }
  }
  B.Path = Path;
  /* facing yaw: 0 = screen right (east), 90° = away (north), 180° = left, 270° = toward the camera */
  const fwd = (phi) => [Math.cos(phi), -Math.sin(phi)];
  const left = (phi) => [-Math.sin(phi), -Math.cos(phi)];
  /* a body-frame ground offset (f forward, l left, px) to screen-ground, and back */
  const toGround = (root, phi, f, l) => { const F = fwd(phi), Lf = left(phi); return [root[0] + F[0] * f + Lf[0] * l, root[1] + F[1] * f + Lf[1] * l]; };
  const toBody = (root, phi, g) => { const F = fwd(phi), Lf = left(phi), dx = g[0] - root[0], dy = g[1] - root[1]; return [dx * F[0] + dy * F[1], dx * Lf[0] + dy * Lf[1]]; };
  /* project a body-frame joint (f, l, u) to sprite px. Upper joints: lateral gives no rows, forward gives
     half rows (cabinet). Depth: bigger = nearer the camera. */
  const proj = (o, phi, j) => { const c = Math.cos(phi), s = Math.sin(phi);
    return { x: o[0] + j[0] * c - j[1] * s, y: o[1] - j[2] - 0.5 * j[0] * s, d: -(j[0] * s + j[1] * c) }; };

  /* ---------- gait ---------- */
  B.gait = {
    froude(legM, fr) { const v = Math.sqrt(fr * G * legM), stride = legM * 2.3 * Math.pow(fr, 0.3); return { v, stride }; },
    /* Hildebrand: symmetrical gait from a lag; LH strikes at 0 */
    symmetric: (lag) => ({ LH: 0, LF: mod1(lag), RH: 0.5, RF: mod1(0.5 + lag) }),
    name(lag) { const d = mod1(lag); return Math.abs(d) < 1e-9 ? 'pace' : Math.abs(d - 0.5) < 1e-9 ? 'trot' : d < 0.5 ? 'lateral-sequence' : 'diagonal-sequence'; },
  };

  /* feet of `body` walking `path` at distance s (px), stopping at Send. Each foot: {x, y, lift, planted}.
     A landing before the start or past the end is the stand position there, so walking starts from and
     stops on the stance the idle uses; no foot ever moves while planted. */
  function walkFeet(body, path, s, Send) {
    const L = body.stride, beta = body.duty, out = [];
    const stand = (ds, ft) => { const a = path.at(ds + ft.f0), phi = path.at(ds).phi; return toGround([a.x, a.y], phi, 0, ft.l); };
    const land = (sS, ft) => {
      const ds = sS + (beta * L) / 2;
      if (sS <= 0) return { pos: stand(0, ft), s: 0 };
      if (ds >= Send) return { pos: stand(Send, ft), s: Math.min(sS, Send) };
      return { pos: stand(ds, ft), s: sS };
    };
    for (const ft of body.feet) {
      const ph = body.phase0 + ft.strike, p = mod1(s / L - ph);
      const sS = s - p * L; // the strike that began the current cycle
      const cur = land(sS, ft);
      let liftAt = sS + beta * L;
      if (sS <= 0) liftAt = Math.min(liftAt, (beta * L) / 2); // a pre-start stance foot lifts before it overstretches
      if (s < liftAt || (cur.s >= Send && sS > 0)) { out.push({ x: cur.pos[0], y: cur.pos[1], lift: 0, planted: true, name: ft.name }); continue; }
      const nxt = land(sS + L, ft), s1 = Math.min(sS + L, Send);
      const q = s1 > liftAt ? FW.clamp((s - liftAt) / (s1 - liftAt), 0, 1) : 1;
      if (q >= 1) { out.push({ x: nxt.pos[0], y: nxt.pos[1], lift: 0, planted: true, name: ft.name }); continue; }
      const e = ease(q), h = body.liftH * Math.sin(Math.PI * q);
      out.push({ x: FW.lerp(cur.pos[0], nxt.pos[0], e), y: FW.lerp(cur.pos[1], nxt.pos[1], e), lift: h, planted: false, name: ft.name, q });
    }
    return out;
  }
  B.walkFeet = walkFeet;
  const standFeet = (body, root, phi) => body.feet.map((ft) => { const g = toGround(root, phi, ft.f0, ft.l); return { x: g[0], y: g[1], lift: 0, planted: true, name: ft.name }; });

  /* ---------- two-bone IK in the body frame; bend = unit hint the joint apex points toward ---------- */
  function ik2(Hp, T, a, b, bend, stats) {
    let v = [T[0] - Hp[0], T[1] - Hp[1], T[2] - Hp[2]], d = Math.hypot(...v);
    const max = (a + b) * 0.999;
    if (d > max) { if (stats) stats.reach = Math.max(stats.reach || 0, d - max); v = v.map((x) => (x * max) / d); d = max; }
    const u = v.map((x) => x / (d || 1));
    let pdot = bend[0] * u[0] + bend[1] * u[1] + bend[2] * u[2];
    let pp = [bend[0] - u[0] * pdot, bend[1] - u[1] * pdot, bend[2] - u[2] * pdot]; const pm = Math.hypot(...pp) || 1; pp = pp.map((x) => x / pm);
    const x = (a * a - b * b + d * d) / (2 * d), y = Math.sqrt(Math.max(0, a * a - x * x));
    return [Hp[0] + u[0] * x + pp[0] * y, Hp[1] + u[1] * x + pp[1] * y, Hp[2] + u[2] * x + pp[2] * y];
  }
  /* interior angle at a joint, degrees (180 = straight) and which side of the root→end line it lies on */
  const angleAt = (A, J, C) => { const u = [A[0] - J[0], A[1] - J[1], A[2] - J[2]], w = [C[0] - J[0], C[1] - J[1], C[2] - J[2]];
    return (Math.acos(FW.clamp((u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w) || 1), -1, 1)) * 180) / Math.PI; };
  const sideOf = (A, J, C) => { const m = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2]; return J[0] - m[0]; }; // + = forward of the line

  /* ---------- raster: capsule limbs and discs, normals from the camera ---------- */
  function capsule(s, a, b, w, mat, ao, dBias) {
    const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L * 2)), r = w / 2;
    const tx = (b.x - a.x) / (L || 1), ty = (b.y - a.y) / (L || 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n, cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t, cd = a.d + (b.d - a.d) * t;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r - 0.01); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r - 0.01); x++) {
        const px_ = x + 0.5 - cx, py = y + 0.5 - cy, across = px_ * -ty + py * tx;
        if (px_ * px_ + py * py > r * r + 0.3) continue;
        const k = FW.clamp(across / (r || 1), -1, 1), sq = Math.sqrt(1 - k * k);
        /* screen perpendicular (-ty, tx) to world: x stays x, screen-down is world -z */
        s.put(x, y, mat, FW.normalize([-ty * k, -sq, -tx * k]), ao, null, cd + dBias + sq * 0.2);
      }
    }
  }
  function disc(s, c, rx, ry, mat, ao, dBias, normalR) {
    for (let y = Math.floor(c.y - ry); y <= Math.ceil(c.y + ry); y++) for (let x = Math.floor(c.x - rx); x <= Math.ceil(c.x + rx); x++) {
      const dx = (x + 0.5 - c.x) / rx, dy = (y + 0.5 - c.y) / ry; if (dx * dx + dy * dy > 1) continue;
      s.put(x, y, mat, FW.sphereN(dx, dy, normalR || 1.05), ao, null, c.d + dBias + (1 - dx * dx - dy * dy) * 0.3);
    }
  }

  /* =====================================================================================
     A person. look: { skin, hair, coat, legs, boots, hat:{kind:'cone'|'fur'|'cap'|'band', mat}, coatLen:'hip'|'knee',
     belt, carry, mass (kg), fr (Froude number of the walk) }
     ===================================================================================== */
  B.human = function (look, ctx) {
    const Hs = FW.SCALE.PLAYER_H; // 26 rows = 1.70 m
    const head = FW.floor('head rows (0.130·H)', 0.13 * Hs, 6);
    const d = {
      ankle: 1, hip: Math.round(0.53 * Hs), thigh: 0.245 * Hs, shin: 0.246 * Hs - 0.4,
      top: Hs, chin: Hs - head, shoulder: Hs - head - 0.5, upper: 0.186 * Hs, fore: (0.146 + 0.054) * Hs - 1,
      shW: 0.23 * Hs / 2, hipW: 0.19 * Hs / 2, chest: 0.12 * Hs / 2, footLen: FW.floor('foot length (0.152·H)', 0.152 * Hs * 0.75, 3),
      headR: head / 2, footL: 1,
    };
    FW.floors.push({ what: 'torso rows (shoulder 0.818·H → ' + (d.shoulder / Hs).toFixed(3) + '·H, gives the head its 6 rows)', derived: +(0.818 * Hs).toFixed(1), used: d.shoulder });
    const legM = (d.hip / Hs) * FW.SCALE.HUMAN_M, fr = look.fr ?? 0.2, g = B.gait.froude(legM, fr);
    const mass = look.mass ?? 65;
    const body = {
      kind: 'human', look, d, mass, legM,
      v: g.v * P, stride: g.stride * P, duty: 0.62, liftH: 1.6, phase0: 0.31,
      feet: [{ name: 'L', f0: 0, l: d.footL, strike: 0 }, { name: 'R', f0: 0, l: -d.footL, strike: 0.5 }],
      /* weight sets timing: heavier bodies take longer to get going and to stop (authored scaling) */
      accel: 0.32 * Math.pow(mass / 65, 0.25), stepT: 0.26 * Math.pow(mass / 65, 0.2),
      m: (k) => (look[k] ? ctx.m(look[k]) : 0),
      size: { w: 30, h: 40, ax: 15, ay: 35 },
    };
    return body;
  };

  /* pose of a person: feet (screen-ground), yaw, and posture params → joints + sprite */
  function drawHuman(body, st, stats) {
    const d = body.d, lk = body.look, m = body.m, sz = body.size;
    const phi = st.phi, root = st.root;
    /* the sprite origin carries the root's fraction, so a planted foot lands on the same pixel every frame */
    const s = new FW.Spr(sz.w, sz.h, sz.ax, sz.ay), o = [sz.ax + root[0] - Math.floor(root[0]), sz.ay + root[1] - Math.floor(root[1])];
    /* feet into the body frame */
    const feet = st.feet.map((f) => { const b = toBody(root, phi, [f.x, f.y]); return { f: b[0], l: b[1], u: d.ankle + f.lift, g: f }; });
    /* the hip settles to what the planted legs can reach: bob is derived from geometry */
    const reach = d.thigh + d.shin;
    let hipU = d.hip - (st.crouch || 0);
    const lean = st.lean || 0, hipF = st.hipF || 0, sway = st.sway || 0;
    for (const f of feet) if (f.g.planted) { const dx = f.f - hipF, dl = f.l - Math.sign(f.l) * d.hipW * 0.5; hipU = Math.min(hipU, d.ankle + Math.sqrt(Math.max(0, (reach * 0.985) ** 2 - dx * dx - dl * dl * 0.2))); }
    const breath = st.breath || 0;
    const hipC = [hipF, sway, hipU];
    const tor = d.shoulder - d.hip; // torso length in rows
    const sh = [hipF + Math.sin(lean) * tor, sway, hipU + Math.cos(lean) * tor + breath];
    const joints = { hipC, sh, legs: [], arms: [] };
    /* legs */
    feet.forEach((f, i) => {
      const side = f.l >= 0 ? 1 : -1, Hj = [hipC[0], hipC[1] + side * d.hipW * 0.5, hipC[2]];
      const T = [f.f, f.l, f.u];
      const K = ik2(Hj, T, d.thigh, d.shin, [1, 0, 0.15], stats);
      joints.legs.push({ H: Hj, K, A: T, side, planted: f.g.planted });
    });
    /* arms: forward kinematics, swing opposes the opposite leg */
    for (const side of [1, -1]) {
      const S = [sh[0], sh[1] + side * d.shW * 0.85, sh[2] - 1];
      const th = (side > 0 ? st.armL : st.armR) ?? 0, el = Math.max(0, (side > 0 ? st.elbowL : st.elbowR) ?? 0.25);
      let E = [S[0] + Math.sin(th) * d.upper, S[1], S[2] - Math.cos(th) * d.upper];
      let Hn = [E[0] + Math.sin(th + el) * d.fore, E[1], E[2] - Math.cos(th + el) * d.fore];
      if (st.hands && st.handsK > 0) {
        /* the hands go toward the target as far as the bend allows: blended from the hanging arm, never past arm's length */
        const goal = st.hands[side > 0 ? 0 : 1], k = FW.clamp(st.handsK, 0, 1);
        let T = [FW.lerp(Hn[0], goal[0], k), FW.lerp(Hn[1], goal[1], k), FW.lerp(Hn[2], goal[2], k)];
        const v = [T[0] - S[0], T[1] - S[1], T[2] - S[2]], dist = Math.hypot(...v), max = (d.upper + d.fore) * 0.97;
        if (dist > max) T = S.map((c, i) => c + (v[i] * max) / dist);
        E = ik2(S, T, d.upper, d.fore, [-1, 0, 0], stats); Hn = T;
      }
      joints.arms.push({ S, E, Hn, side });
    }
    /* draw: far things first by depth, materials by part */
    const coat = m('coat'), legs = m('legs') || coat, boots = m('boots') || legs, skin = m('skin'), hair = m('hair') || skin, sleeve = m('sleeve') || coat;
    const far = 0.72; // a far limb sits one rung darker so overlapping limbs read
    const depthOf = (pt) => proj(o, phi, pt).d;
    for (const L of joints.legs) {
      const near = depthOf(L.H) >= depthOf(hipC) ? 1 : far, b = near === 1 ? 2 : -2;
      const h = proj(o, phi, L.H), k = proj(o, phi, L.K), a = proj(o, phi, L.A);
      a.x = o[0] + (L.A[0] * Math.cos(phi) - L.A[1] * Math.sin(phi)); // feet sit on the ground plane (k = 1)
      a.y = o[1] - (L.A[0] * Math.sin(phi) + L.A[1] * Math.cos(phi)) - L.A[2];
      if (stats) (stats.feet = stats.feet || []).push({ planted: L.planted, x: Math.floor(a.x) - sz.ax + Math.floor(root[0]), y: Math.floor(a.y) - sz.ay + Math.floor(root[1]) });
      capsule(s, h, k, 2.2, legs, 0.95 * near, b);
      const bootTop = { x: FW.lerp(a.x, k.x, 0.45), y: FW.lerp(a.y, k.y, 0.45), d: FW.lerp(a.d, k.d, 0.45) };
      capsule(s, k, bootTop, 2.1, legs, 0.95 * near, b);
      capsule(s, bootTop, a, 2.2, boots, 0.9 * near, b + 0.1);
      /* the foot: toes point where the body faces */
      const tx = Math.cos(phi) * d.footLen, ty = -Math.sin(phi) * d.footLen * 0.5;
      const toe = { x: a.x + tx, y: a.y + 1 + ty, d: a.d + 0.2 };
      capsule(s, { x: a.x, y: a.y + 1, d: a.d }, toe, 1.6, boots, 0.85 * near, b + 0.2);
    }
    const shP = proj(o, phi, sh), hpP = proj(o, phi, hipC);
    const sp = Math.sin(phi), cp = Math.cos(phi);
    const halfW = (wl, wd) => wl * Math.abs(sp) + wd * Math.abs(cp);
    const armOrder = joints.arms.map((A) => ({ A, d: depthOf(A.S) })).sort((p, q) => p.d - q.d);
    const drawArm = (A, nearK, b) => { const S = proj(o, phi, A.S), E = proj(o, phi, A.E), Hn = proj(o, phi, A.Hn);
      capsule(s, S, E, 2.0, sleeve, 0.95 * nearK, b); capsule(s, E, Hn, 1.7, sleeve, 0.92 * nearK, b);
      s.put(Math.round(Hn.x - 0.5), Math.round(Hn.y - 0.5), skin, FW.N.FRONT, 0.95 * nearK, null, Hn.d + b + 1); return Hn; };
    drawArm(armOrder[0].A, far, -3);
    /* torso: rows from hip to shoulder, width from the yaw */
    const rows = Math.max(1, Math.round(hpP.y - shP.y));
    for (let r = 0; r <= rows; r++) {
      const t = r / rows, cx = FW.lerp(hpP.x, shP.x, t), cy = Math.round(FW.lerp(hpP.y, shP.y, t));
      const hw = halfW(FW.lerp(d.hipW, d.shW, t), FW.lerp(d.chest * 1.05, d.chest * 1.1, t));
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw - 1); x++) {
        const k = FW.clamp((x + 0.5 - cx) / (hw || 1), -1, 1);
        const belt = lk.belt && r === 1 ? m('belt') : coat;
        s.put(x, cy, belt, FW.normalize([k, -Math.sqrt(1 - k * k), 0.15]), 0.95, null, hpP.d + 0.5 + Math.sqrt(1 - k * k) * 0.4);
      }
    }
    /* a long coat covers the thighs: an occluder that hides limb work (and is honest dress) */
    if (lk.coatLen === 'knee') {
      const kneeY = Math.max(...joints.legs.map((L) => proj(o, phi, L.K).y)) - 1, hemSpread = 0.6;
      for (let y = Math.round(hpP.y) + 1; y <= kneeY; y++) {
        const t = (y - hpP.y) / Math.max(1, kneeY - hpP.y), hw = halfW(d.hipW, d.chest * 1.1) + hemSpread * t * 2;
        const ks = joints.legs.map((L) => proj(o, phi, L.K).x), cx = FW.lerp(hpP.x, (ks[0] + ks[1]) / 2, t);
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw - 1); x++) {
          const k = FW.clamp((x + 0.5 - cx) / (hw || 1), -1, 1);
          s.put(x, y, coat, FW.normalize([k, -Math.sqrt(1 - k * k), 0]), y === kneeY && lk.hem ? 0.5 : 0.9, null, hpP.d + 3);
        }
      }
    }
    /* carried load sits in the hands, drawn between the arms */
    if (st.load && lk.carry) {
      const hands = joints.arms.map((A) => proj(o, phi, A.Hn)), cx = (hands[0].x + hands[1].x) / 2, cy = (hands[0].y + hands[1].y) / 2 + 1;
      disc(s, { x: cx + Math.cos(phi) * 1.5, y: cy, d: hpP.d + 4 }, 2.6, 2.1, m('carry'), 0.95, 1);
    }
    drawArm(armOrder[1].A, 1, 5);
    /* head: a 6-row disc above the shoulders, gaze turns it at most 90° from the chest */
    const gaze = FW.clamp(st.gaze || 0, -Math.PI / 2, Math.PI / 2), hphi = phi + gaze;
    const hc = proj(o, phi, [sh[0] + (st.nod || 0) * 0.6 + Math.sin(lean) * 1.2, sh[1], d.shoulder + (sh[2] - d.shoulder) + 0.5 + d.headR + (st.headLag || 0)]);
    const hr = d.headR, hw = 2.5 * Math.abs(Math.sin(hphi)) + 2.2 * Math.abs(Math.cos(hphi));
    for (let y = Math.floor(hc.y - hr); y < Math.ceil(hc.y + hr); y++) for (let x = Math.floor(hc.x - hw); x < Math.ceil(hc.x + hw); x++) {
      const dx = (x + 0.5 - hc.x) / hw, dy = (y + 0.5 - hc.y) / hr; if (dx * dx + dy * dy > 1.08) continue;
      /* hair on the back of the head and the crown; the face looks where hphi points */
      const facing = dx * Math.cos(hphi), back = Math.sin(hphi) > 0.7 ? 1 : 0; // seen from behind: all hair
      const isHair = dy < -0.45 || back || (Math.abs(Math.cos(hphi)) > 0.3 && facing < -0.35);
      s.put(x, y, isHair ? hair : skin, FW.sphereN(dx, dy, 1.1), 0.95, null, hc.d + 6);
    }
    /* eyes: on the facing side; a blink closes them */
    if (!st.blink && Math.sin(hphi) < 0.7) {
      const ey = Math.round(hc.y + 0.2), eyeMat = hair;
      if (Math.abs(Math.cos(hphi)) < 0.35) { s.put(Math.round(hc.x - 1.4), ey, eyeMat, FW.N.FRONT, 0.2, null, hc.d + 7); s.put(Math.round(hc.x + 0.9), ey, eyeMat, FW.N.FRONT, 0.2, null, hc.d + 7); }
      else { const ex = Math.round(hc.x + Math.sign(Math.cos(hphi)) * (hw - 1.4) - 0.5); s.put(ex, ey, eyeMat, FW.N.FRONT, 0.2, null, hc.d + 7); }
    }
    /* hat */
    const hat = lk.hat; if (hat) {
      const hm = ctx_m(body, hat.mat), top = Math.round(hc.y - hr);
      if (hat.kind === 'cone') { // a broad conical hat: brim wider than the shoulders
        for (let r = 0; r < 3; r++) { const half = 1 + r * 2.2; for (let x = Math.round(hc.x - half); x <= Math.round(hc.x + half); x++) s.put(x, top - 2 + r + 1, hm, FW.normalize([(x - hc.x) / 6, -0.4, 0.8]), r === 2 ? 0.75 : 1, null, hc.d + 9); }
      } else if (hat.kind === 'fur') {
        for (let y = top - 1; y <= top + 1; y++) for (let x = Math.round(hc.x - hw - 0.5); x <= Math.round(hc.x + hw - 0.5); x++) s.put(x, y, hm, FW.sphereN((x - hc.x) / (hw + 1), (y - top) / 2, 1.2), 0.9, null, hc.d + 9);
      } else if (hat.kind === 'peak') { // the four-winds cap: a tall soft crown, tips at the back
        for (let y = top - 3; y <= top + 1; y++) { const half = y < top - 1 ? 1.5 : hw; for (let x = Math.round(hc.x - half - 0.5); x <= Math.round(hc.x + half - 0.5); x++) s.put(x, y, hm, FW.sphereN((x - hc.x) / 4, (y - top) / 4, 1.2), 0.95, null, hc.d + 9); }
        if (lk.accent) for (let x = Math.round(hc.x - hw); x <= Math.round(hc.x + hw - 1); x++) s.put(x, top + 1, ctx_m(body, lk.accent), FW.N.FRONT, 0.95, null, hc.d + 10);
      } else { for (let x = Math.round(hc.x - hw); x <= Math.round(hc.x + hw - 1); x++) s.put(x, top, hm, FW.N.TOP, 0.9, null, hc.d + 9); }
    }
    /* joint metrics for check.mjs */
    if (stats) {
      for (const L of joints.legs) {
        const knee = angleAt(L.H, L.K, L.A), fwdSide = (L.K[0] - (L.H[0] + L.A[0]) / 2);
        stats.knee = Math.min(stats.knee ?? 999, knee);
        if (knee < 175 && fwdSide < -0.05) stats.kneeBack = (stats.kneeBack || 0) + 1;
      }
      for (const A of joints.arms) { const el = angleAt(A.S, A.E, A.Hn); stats.elbow = Math.min(stats.elbow ?? 999, el);
        /* elbow apex must point back: the forearm folds forward */
        if (el < 175 && (A.E[0] - (A.S[0] + A.Hn[0]) / 2) > 0.3) stats.elbowFwd = (stats.elbowFwd || 0) + 1; }
      stats.neck = Math.max(stats.neck || 0, Math.abs(gaze) * 180 / Math.PI);
      stats.hipU = hipU;
    }
    return s;
  }
  const ctx_m = (body, k) => body.ctx.m(k);

  /* =====================================================================================
     A quadruped. spec (metres): { shoulderH, length (shoulder joint to hip joint), chest (barrel depth),
     neck, neckUp (deg, at rest), head, legW (px), tail, ears, antlers:{kind:'branch'|'crescent', span},
     coat, belly, legs, hoof, antler, mass, fr, duty, lag }
     ===================================================================================== */
  B.quad = function (sp, ctx) {
    const S = (m) => m * P;
    const legM = sp.shoulderH * 0.95, fr = sp.fr ?? 0.15, g = B.gait.froude(legM, fr);
    const half = S(sp.length) / 2, w = Math.max(1, S(sp.width ?? 0.36) / 2);
    const strikes = B.gait.symmetric(sp.lag ?? 0.25);
    const body = {
      kind: 'quad', sp, mass: sp.mass ?? 100, legM,
      v: g.v * P, stride: g.stride * P, duty: sp.duty ?? 0.68, liftH: Math.max(1.5, S(sp.shoulderH) * 0.1), phase0: 0.15,
      feet: [{ name: 'LH', f0: -half, l: w, strike: strikes.LH }, { name: 'LF', f0: half, l: w, strike: strikes.LF },
        { name: 'RH', f0: -half, l: -w, strike: strikes.RH }, { name: 'RF', f0: half, l: -w, strike: strikes.RF }],
      gaitName: B.gait.name(sp.lag ?? 0.25),
      accel: 0.35 * Math.pow((sp.mass ?? 100) / 65, 0.25), stepT: 0.24 * Math.pow((sp.mass ?? 100) / 65, 0.2),
      /* SOURCE (informal zoometry): the shoulder joint stands at ~0.72 of withers height; the barrel hangs above it */
      dims: { half, w, joint: S(sp.shoulderH) * 0.72, upper: S(sp.shoulderH) * 0.72 * 0.54, lower: S(sp.shoulderH) * 0.72 * 0.5,
        chest: S(sp.chest) / 2, neck: S(sp.neck), head: S(sp.head), tail: S(sp.tail ?? 0.2), shoulderH: S(sp.shoulderH) },
      ctx,
    };
    const W = Math.ceil(half * 2 + body.dims.neck + body.dims.head + 14), Ht = Math.ceil(body.dims.shoulderH + body.dims.neck + S(sp.antlers?.span ?? 0) + 10);
    body.size = { w: W * 2, h: Ht, ax: W, ay: Ht - 3 };
    return body;
  };

  function drawQuad(body, st, stats) {
    const sp = body.sp, D = body.dims, ctx = body.ctx, sz = body.size;
    const phi = st.phi, root = st.root;
    const s = new FW.Spr(sz.w, sz.h, sz.ax, sz.ay), o = [sz.ax + root[0] - Math.floor(root[0]), sz.ay + root[1] - Math.floor(root[1])];
    const coat = ctx.m(sp.coat), belly = sp.belly ? ctx.m(sp.belly) : coat, legs = sp.legs ? ctx.m(sp.legs) : coat, hoof = sp.hoof ? ctx.m(sp.hoof) : legs;
    const feet = st.feet.map((f) => { const b = toBody(root, phi, [f.x, f.y]); return { f: b[0], l: b[1], u: f.lift, g: f }; });
    /* each girdle sits at what its two planted feet can reach */
    const reach = (D.upper + D.lower) * 0.985;
    const girdle = (fore) => { let u = D.joint - (st.crouch || 0) * (fore ? st.foreCrouch ?? 1 : 1); const c = fore ? D.half : -D.half;
      for (const f of feet) if ((f.g.name[1] === 'F') === fore && f.g.planted) { const dx = f.f - c; u = Math.min(u, Math.sqrt(Math.max(0, reach * reach - dx * dx))); } return u; };
    const shU = girdle(true), hpU = girdle(false);
    const Sj = [D.half, 0, shU], Hj = [-D.half, 0, hpU];
    const breath = st.breath || 0;
    /* legs: far first */
    const legList = feet.map((f) => {
      const fore = f.g.name[1] === 'F', top = [fore ? D.half : -D.half, f.l, fore ? shU : hpU];
      const T = [f.f, f.l, f.u + 0.5];
      const J = ik2(top, T, D.upper, D.lower, fore ? [1, 0, 0.1] : [-1, 0, 0.1], stats);
      return { top, J, T, fore, f };
    });
    const depth = (pt) => proj(o, phi, pt).d, bodyD = depth([0, 0, D.joint]);
    for (const L of legList) {
      const near = depth(L.top) >= bodyD ? 1 : 0.7, b = near === 1 ? 4 : -4;
      const a = proj(o, phi, L.top), j = proj(o, phi, L.J), t = proj(o, phi, L.T);
      t.x = o[0] + (L.T[0] * Math.cos(phi) - L.T[1] * Math.sin(phi)); t.y = o[1] - (L.T[0] * Math.sin(phi) + L.T[1] * Math.cos(phi)) - L.T[2];
      if (stats) (stats.feet = stats.feet || []).push({ planted: L.f.g.planted, x: Math.floor(t.x) - sz.ax + Math.floor(root[0]), y: Math.floor(t.y) - sz.ay + Math.floor(root[1]) });
      capsule(s, a, j, (sp.legW ?? 2) + 0.4, legs, 0.95 * near, b); capsule(s, j, t, sp.legW ?? 2, legs, 0.9 * near, b);
      s.put(Math.round(t.x - 0.5), Math.round(t.y), hoof, FW.N.FRONT, 0.6 * near, null, t.d + b + 1);
      s.put(Math.round(t.x + 0.5 * Math.cos(phi)), Math.round(t.y), hoof, FW.N.FRONT, 0.6 * near, null, t.d + b + 1);
      if (stats) { const ang = angleAt(L.top, L.J, L.T), apex = L.J[0] - (L.top[0] + L.T[0]) / 2;
        stats.minLegAngle = Math.min(stats.minLegAngle ?? 999, ang);
        if (ang < 176 && ((L.fore && apex < -0.05) || (!L.fore && apex > 0.05))) stats.legWrong = (stats.legWrong || 0) + 1; }
    }
    /* barrel: discs along the spine (any yaw), belly a shade under it */
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n, c = [FW.lerp(-D.half * 1.12, D.half * 1.02, t), 0, FW.lerp(hpU, shU, t) + D.chest * 0.25 + breath * 0.5];
      const r = D.chest * (0.86 + 0.18 * Math.sin(Math.PI * t)) + breath * 0.3, cp = proj(o, phi, c);
      const rx = r * (Math.abs(Math.cos(phi)) * 1.15 + Math.abs(Math.sin(phi)) * 0.85);
      for (let y = Math.floor(cp.y - r); y <= Math.ceil(cp.y + r); y++) for (let x = Math.floor(cp.x - rx); x <= Math.ceil(cp.x + rx); x++) {
        const dx = (x + 0.5 - cp.x) / rx, dy = (y + 0.5 - cp.y) / r; if (dx * dx + dy * dy > 1) continue;
        s.put(x, y, dy > 0.45 ? belly : coat, FW.sphereN(dx, dy, 1.1), 0.92, null, cp.d + (1 - dx * dx - dy * dy) * 0.5);
      }
    }
    /* tail: follows the rump with a lag (follow-through) */
    const tl = [-D.half * 1.12 - 1, 0, hpU + D.chest * 0.6], ta = (st.tail || 0) - 0.6;
    capsule(s, proj(o, phi, tl), proj(o, phi, [tl[0] - Math.cos(ta) * D.tail, 0, tl[2] + Math.sin(ta) * D.tail]), 1.6, sp.tailMat ? ctx.m(sp.tailMat) : coat, 0.85, -0.5);
    /* neck and head: neck angle = rest + (graze, toss) */
    const na = ((sp.neckUp ?? 40) * Math.PI) / 180 + (st.neck || 0);
    const nb = [D.half * 1.05, 0, shU + D.chest * 0.55], nt = [nb[0] + Math.cos(na) * D.neck, 0, nb[2] + Math.sin(na) * D.neck];
    const nk = 6;
    for (let i = 0; i <= nk; i++) { const t = i / nk, c = proj(o, phi, [FW.lerp(nb[0], nt[0], t), 0, FW.lerp(nb[2], nt[2], t)]);
      const r = FW.lerp(D.chest * 0.62, D.chest * 0.36, t); disc(s, c, r * (Math.abs(Math.cos(phi)) + 0.8 * Math.abs(Math.sin(phi))), r, coat, 0.93, 1); }
    const ha = na - Math.PI / 2 - 0.25 + (st.headPitch || 0), muzzle = [nt[0] + Math.cos(ha) * D.head, 0, nt[2] + Math.sin(ha) * D.head];
    const hP = proj(o, phi, nt), mP = proj(o, phi, muzzle);
    capsule(s, hP, mP, Math.max(2, D.chest * 0.5), coat, 0.95, 3);
    capsule(s, { x: FW.lerp(hP.x, mP.x, 0.6), y: FW.lerp(hP.y, mP.y, 0.6), d: hP.d }, mP, Math.max(1.6, D.chest * 0.36), sp.muzzle ? ctx.m(sp.muzzle) : coat, 0.85, 3.2);
    /* eye on the facing side; ears flick */
    if (Math.sin(phi) < 0.7) s.put(Math.round(FW.lerp(hP.x, mP.x, 0.28)), Math.round(FW.lerp(hP.y, mP.y, 0.28) - 1), hoof, FW.N.FRONT, 0.15, null, hP.d + 6);
    const ear = (st.ear || 0), eb = proj(o, phi, [nt[0] - 0.5, 0, nt[2] + 1]);
    capsule(s, eb, { x: eb.x - Math.cos(phi) * (sp.ears ? sp.ears * P : 2) * (1 - ear * 0.3), y: eb.y - 1.5 - ear, d: eb.d }, 1.2, coat, 0.8, 5);
    /* antlers / horns */
    const an = sp.antlers; if (an) {
      const am = ctx.m(an.mat), span = an.span * P, base = proj(o, phi, [nt[0] - 0.4, 0, nt[2] + 1.2]);
      for (const side of [-1, 1]) {
        const sx = Math.sin(phi) * side * 1.5;
        if (an.kind === 'crescent') { // buffalo: back and out, then up
          let px0 = base.x + sx, py0 = base.y;
          for (let i = 1; i <= 6; i++) { const t = i / 6, x = base.x + sx * (1 + t * 2) - Math.cos(phi) * span * 0.7 * Math.sin(t * 1.6), y = base.y - span * 0.35 * (t * t);
            capsule(s, { x: px0, y: py0, d: base.d + 2 + side }, { x, y, d: base.d + 2 + side }, 1.6, am, 0.95, 2); px0 = x; py0 = y; }
        } else { // a branched antler: beam back and up, tines forward
          const top = { x: base.x + sx * 2 - Math.cos(phi) * span * 0.35, y: base.y - span, d: base.d + side };
          capsule(s, { x: base.x + sx, y: base.y, d: base.d + side }, top, 1, am, 0.9, 2);
          for (const t of [0.35, 0.6, 0.85]) { const p0 = { x: FW.lerp(base.x + sx, top.x, t), y: FW.lerp(base.y, top.y, t), d: top.d };
            capsule(s, p0, { x: p0.x + Math.cos(phi) * span * 0.22, y: p0.y - span * 0.12, d: top.d }, 1, am, 0.9, 2); }
        }
      }
    }
    if (stats) { stats.shU = shU; stats.hpU = hpU; stats.headU = muzzle[2]; }
    return s;
  }

  /* =====================================================================================
     clips: idle (breathes), a big move (anticipation → action → recovery), a turn made of steps
     ===================================================================================== */
  /* irregular blink: hash-spaced, so it never lines up with a cut */
  const blinkAt = (t, seed) => { const k = Math.floor(t / 0.9); for (let j = k - 1; j <= k; j++) { const at = j * 0.9 + FW.hash(j, seed, 41) * 0.9; if (FW.hash(j, seed, 42) < 0.3 && t >= at && t < at + 0.12) return true; } return false; };
  function idleParams(body, t, seed) {
    const br = 0.5 + 0.5 * Math.sin((TAU * t) / (body.kind === 'quad' ? 2.9 : 3.7) + seed);
    if (body.kind === 'human') return { breath: br > 0.62 ? 1 : 0, headLag: br > 0.75 ? 0.5 : 0, sway: Math.sin((TAU * t) / 7.3 + seed) * 0.5, blink: blinkAt(t, seed),
      armL: 0.04 * br, armR: 0.04 * br, gaze: Math.sin(TAU * t / 11.1 + seed) > 0.85 ? 0.6 : 0 };
    /* a grazing animal: head down, chewing, ears and tail flick on irregular beats */
    const graze = body.sp.graze !== false;
    const flick = FW.hash(Math.floor(t / 1.3), seed, 5) < 0.35 ? Math.sin(((t % 1.3) / 1.3) * Math.PI * 4) : 0;
    return { breath: br, neck: graze ? -1.15 + 0.06 * Math.sin(TAU * t / 0.7) : 0, headPitch: graze ? 0.5 : 0, tail: 0.35 * flick, ear: FW.hash(Math.floor(t / 2.1), seed, 9) < 0.4 ? (((t % 2.1) < 0.25) ? 1 : 0) : 0 };
  }
  B.idleParams = idleParams;

  /* key poses per big move: [time (s), params]. The check reads `phases` to verify the gather and the land. */
  const BIG = {
    lift: { dur: 2.6, phases: { anticipation: [0.0, 1.25], action: [1.25, 1.9], recovery: [1.9, 2.6] },
      keys: [[0, { crouch: 0, lean: 0 }], [0.35, { crouch: -0.6, breath: 1, lean: -0.05 }], [0.9, { crouch: 5.5, lean: 0.9, reach: 1 }],
        [1.25, { crouch: 5.8, lean: 0.95, reach: 1, grip: 1 }], [1.9, { crouch: -0.4, lean: -0.12, load: 1, hold: 1 }], [2.2, { crouch: 1.8, lean: 0.08, load: 1, hold: 1 }], [2.6, { crouch: 0, lean: 0, load: 1, hold: 1 }]] },
    toss: { dur: 2.2, phases: { anticipation: [0.0, 0.55], action: [0.55, 0.9], recovery: [0.9, 2.2] },
      keys: [[0, { neck: 0, crouch: 0 }], [0.55, { neck: -0.55, crouch: 1.2, foreCrouch: 1.4 }], [0.9, { neck: 0.55, crouch: -0.6, headPitch: -0.3 }],
        [1.2, { neck: 0.38, crouch: -0.2, tail: 0.6 }], [1.6, { neck: -0.08, crouch: 0.3, tail: -0.3 }], [2.2, { neck: 0, crouch: 0, tail: 0 }]] },
  };
  B.BIG = BIG;
  const keyAt = (keys, t) => {
    let i = 1; while (i < keys.length - 1 && keys[i][0] < t) i++;
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], u = ease(FW.clamp((t - t0) / (t1 - t0 || 1), 0, 1)), out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = FW.lerp(a[k] ?? 0, b[k] ?? 0, u);
    return out;
  };

  /* =====================================================================================
     an actor: a body plus a plan, a pure function of t
     plan items: ['idle', seconds] · ['walk', [[x,y],…]] (screen-ground px) · ['big', name] · ['face', phi] (stepped turn)
     ===================================================================================== */
  B.actor = function (body, start, phi0, plan, opts = {}) {
    const segs = []; let t = 0, pos = start.slice(), phi = phi0;
    const turnSeg = (to) => {
      let dphi = Math.atan2(Math.sin(to - phi), Math.cos(to - phi));
      /* a heading change may skip the steps only if no foot would move more than 0.8 px */
      const rMax = Math.max(...body.feet.map((f) => Math.hypot(f.f0, f.l)));
      if (Math.abs(dphi) * rMax < 0.8) { const sg = { type: 'snap', t0: t, dur: 0, pos: pos.slice(), phi0: phi, phi1: to }; segs.push(sg); phi = to; return; }
      const k = Math.ceil(Math.abs(dphi) / (Math.PI / 4)), steps = k * body.feet.length;
      const sg = { type: 'turn', t0: t, dur: steps * body.stepT, pos: pos.slice(), phi0: phi, phi1: phi + dphi, steps };
      segs.push(sg); t += sg.dur; phi = phi + dphi;
    };
    for (const it of plan) {
      if (it[0] === 'idle') { segs.push({ type: 'idle', t0: t, dur: it[1], pos: pos.slice(), phi }); t += it[1]; }
      else if (it[0] === 'face') turnSeg(it[1]);
      else if (it[0] === 'big') { const bm = BIG[it[1]]; segs.push({ type: 'big', t0: t, dur: bm.dur, pos: pos.slice(), phi, big: it[1] }); t += bm.dur; }
      else if (it[0] === 'walk') {
        const pts = fillet([pos.slice(), ...it[1]], body.stride * 0.8), path = new Path(pts), ph0 = path.at(0).phi;
        turnSeg(ph0);
        const v = body.v * (it[2]?.speed ?? 1), ta = body.accel, Lw = path.len;
        /* speed profile: weight sets the ramp; distance under each ramp is v·ta/2 */
        const tc = Math.max(0, (Lw - v * ta) / v), dur = 2 * ta + tc;
        const settle = body.feet.length * body.stepT;
        segs.push({ type: 'walk', t0: t, dur: dur + settle, walk: dur, path, v, ta, tc, pos: pos.slice() });
        t += dur + settle; const e = path.at(Lw); pos = [e.x, e.y]; phi = path.at(Lw - 0.01).phi;
      }
    }
    /* a loop must end on the stance it began on: turn back to the first facing */
    if (opts.loop !== false) turnSeg(phi0);
    const T = t;
    const sOf = (sg, u) => { const { v, ta, tc } = sg; if (u <= ta) return 0.5 * v * u * u / ta; if (u <= ta + tc) return 0.5 * v * ta + v * (u - ta);
      const w = Math.min(u - ta - tc, ta); return 0.5 * v * ta + v * tc + v * w - 0.5 * v * w * w / ta; };
    const actor = { body, T, segs, loop: opts.loop !== false, seed: opts.seed ?? 1 };
    /* the state at time t: root, yaw, feet, posture params */
    actor.state = function (time) {
      let tt = actor.loop && T > 0 ? ((time % T) + T) % T : FW.clamp(time, 0, T - 1e-6);
      let sg = segs[segs.length - 1]; for (const g of segs) if (tt >= g.t0 && tt < g.t0 + g.dur) { sg = g; break; }
      const u = tt - sg.t0, seed = actor.seed, idle = idleParams(body, time, seed);
      if (sg.type === 'walk') {
        const path = sg.path, Lw = path.len;
        if (u < sg.walk) {
          const s = sOf(sg, u), a = path.at(s), sp = s / Math.max(1e-6, u) ;
          const feet = walkFeet(body, path, s, Lw), root = [a.x, a.y];
          const st = { mode: 'walk', root, phi: a.phi, feet, s, ...lean(body, s, path, Lw, feet, a.phi) };
          if (body.kind === 'quad') Object.assign(st, { breath: idle.breath * 0.5, tail: 0.15 * Math.sin(TAU * s / body.stride - 1.2), neck: -0.05 * Math.cos(2 * TAU * s / body.stride) });
          return st;
        }
        /* stopped: settle steps bring each foot to its stand position, one foot at a time */
        const end = path.at(Lw), phi = path.at(Lw - 0.01).phi, root = [end.x, end.y];
        const from = walkFeet(body, path, Lw, Lw), to = standFeet(body, root, phi);
        const k = (u - sg.walk) / body.stepT, feet = from.map((f, i) => {
          const q = FW.clamp(k - i, 0, 1); if (q <= 0) return { ...f, planted: true, lift: 0 }; if (q >= 1) return to[i];
          return { x: FW.lerp(f.x, to[i].x, ease(q)), y: FW.lerp(f.y, to[i].y, ease(q)), lift: body.liftH * Math.sin(Math.PI * q), planted: false, name: f.name };
        });
        return { mode: 'settle', root, phi, feet, ...idle, armL: 0, armR: 0 };
      }
      if (sg.type === 'turn') {
        /* rounds: in each round every foot steps once, in order, to the yaw the round ends on */
        const n = sg.steps, nf = body.feet.length, k = u / body.stepT, i = Math.min(n - 1, Math.floor(k)), q = Math.min(1, k - i);
        const yawAt = (j) => FW.lerp(sg.phi0, sg.phi1, j / n);
        const roundEnd = (j) => yawAt(Math.min(n, (Math.floor(j / nf) + 1) * nf));
        const phiNow = FW.lerp(yawAt(i), yawAt(i + 1), ease(q));
        const feet = body.feet.map((ft, fi) => {
          let last = -1; for (let j = fi; j < i; j += nf) last = j;
          const yaw0 = last < 0 ? sg.phi0 : roundEnd(last), g0 = toGround(sg.pos, yaw0, ft.f0, ft.l);
          if (i % nf !== fi) return { x: g0[0], y: g0[1], lift: 0, planted: true, name: ft.name };
          const g1 = toGround(sg.pos, roundEnd(i), ft.f0, ft.l);
          return { x: FW.lerp(g0[0], g1[0], ease(q)), y: FW.lerp(g0[1], g1[1], ease(q)), lift: body.liftH * 0.8 * Math.sin(Math.PI * q), planted: q >= 1, name: ft.name };
        });
        return { mode: 'turn', root: sg.pos, phi: phiNow, feet, ...idle, gaze: FW.clamp((sg.phi1 - phiNow) * 0.5, -1, 1) };
      }
      const phi = sg.type === 'snap' ? sg.phi1 : sg.phi, feet = standFeet(body, sg.pos, phi);
      if (sg.type === 'big') {
        const bm = BIG[sg.big], kp = keyAt(bm.keys, u);
        const st = { mode: 'big', root: sg.pos, phi, feet, ...idle, ...kp, bigT: u, big: sg.big };
        if (body.kind === 'human') {
          const d = body.d, reachK = kp.reach || 0, holdK = kp.hold || 0;
          st.armL = st.armR = FW.lerp(0.1, 0.0, holdK); st.elbowL = st.elbowR = FW.lerp(0.2, 1.4, holdK);
          /* the load sits on the ground a step ahead; the hands reach it as the body folds */
          st.hands = [[5.5, 2, 1.4], [5.5, -2, 1.4]]; st.handsK = reachK * (1 - holdK);
          st.load = (kp.load || 0) > 0.5 || (kp.grip || 0) > 0.5;
          st.blink = false; st.gaze = 0; st.nod = (kp.lean || 0) * 0.8; void d;
        }
        return st;
      }
      return { mode: 'idle', root: sg.pos, phi, feet, ...idle };
    };
    actor.draw = function (time, stats) {
      const st = actor.state(time);
      /* relief: the plan lives on a flat plane; the root and each foot rise by the ground height under them.
         A planted foot keeps its plane point, so its lift is constant while it is down. */
      if (actor.lift) { const L = actor.lift; st.root = [st.root[0], st.root[1] - L(st.root[0], st.root[1])]; st.feet = st.feet.map((f) => ({ ...f, y: f.y - L(f.x, f.y) + 0 })); }
      return { st, spr: body.kind === 'human' ? drawHuman(body, st, stats) : drawQuad(body, st, stats) };
    };
    return actor;
  };
  /* walking posture: lean into speed, arms swing against the opposite leg with a lag */
  function lean(body, s, path, Lw, feet, phi) {
    if (body.kind !== 'human') return {};
    const lagS = Math.max(0, s - body.v * 0.06);
    const f2 = walkFeet(body, path, lagS, Lw), root = path.at(lagS), half = (body.duty * body.stride) / 2;
    const off = f2.map((f) => toBody([root.x, root.y], phi, [f.x, f.y])[0] / half);
    return { lean: 0.07, armL: -0.42 * (off[1] ?? 0), armR: -0.42 * (off[0] ?? 0), elbowL: 0.3, elbowR: 0.3, breath: 0 };
  }
  B.drawHuman = drawHuman; B.drawQuad = drawQuad; B.toBody = toBody; B.toGround = toGround;
  /* build a body from a cast row */
  B.make = (row, ctx) => { const b = row.kind === 'quad' ? B.quad(row, ctx) : B.human(row, ctx); b.ctx = ctx; b.id = row.id; return b; };
})();
