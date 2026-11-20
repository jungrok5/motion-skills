// 쇠울림 골짜기 · the film (lib/89_cine): a day in the valley, dawn to night, played in the page (?film=1) and stepped by
// trailer.mjs to draw its frames.  The camera is free; the walker's body is driven by keys; every shot sets its own hour,
// weather and machines' clock.  Every machine in the cut is walking, flying or doing its big move.
{
  V.cine = (h) => { const { P, M, ease, lerp, damp, at, low, floor, goTo, U, pose, rel, yawOf } = h;
    const relic = U('마루'), jara = U('자라 1'), gajae = U('가재'), crane1 = U('두루미 1'), porter = U('등짐 1'), kite = U('솔개 3'), kp = (t) => M.cmd(kite, t).body.p;
    const q1 = pose(relic, 142.0), q2 = pose(relic, 145.4), q3 = pose(relic, 149.6), far = rel(q1, 220, 0), c3 = rel(q3, 78, 7), qh = pose(relic, 150);
    const qn = pose(relic, 1006), qw = pose(jara, 66), qc = pose(crane1, 108), qt = pose(jara, 106), sg = qt.rt[1] > 0 ? 1 : -1, tGoal = rel(qt, 30, sg * 9.5), camp = V.camp || { x: 30, z: 123 };
    const headOf = (u) => (u.pose && u.pose.W && u.pose.W.head ? u.pose.W.head.p : pose(u, 0).p), look = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)], me = (up) => [P.x, P.y + up, P.z];
    const shots = {
      // ── dawn ──
      // the valley before the sun: mist over the forest, and far off on the southern rim the relic walking its line as the light comes
      DAWN: { dur: 13, tod: 5.2, tod1: 8.7, weather: 'clear', T0: 122, rate: 3, start: [-22, 60, 0],
        act() {},
        cam(s) { const q = pose(relic, 122 + s * 3), x = -64 + 2.2 * s; return [[x, floor(x, -118, 80) + 46 - s * 0.5, -118], [q.p[0] + 6, q.p[1] - 12, q.p[2]], 40]; } },
      // ── a morning of haze ──
      // the one who walks here, on the old road: behind it (the page's own third view) …
      V1: { dur: 3.4, tod: 7.7, weather: 'haze', T0: 30, start: [-147, 119, 77], view: 'third', zoom: 4.6,
        act(s, K) { if (s > 0.2) goTo(-112, 127.5, K); } },
      // … through its eyes …
      V2: { dur: 3.0, tod: 7.8, weather: 'haze', T0: 34, start: [-136, 121.6, 77], view: 'first',
        act(s, K) { goTo(-112, 127.5, K); P.pitch = damp(P.pitch, 0.1, 1.2); } },
      // behind a kite as it glides in over the old road and the viaduct, a crane walking the floor below
      K: { dur: 7.5, tod: 8.5, weather: 'haze', T0: 116.5, start: [-22, 54, 0],
        act() {},
        cam(s) { const t = 116.5 + s, p = kp(t), a = kp(t - 0.35), b = kp(t + 0.35); let d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(d[0], d[1], d[2]) || 1; d = d.map((v) => v / l); const hl = Math.hypot(d[0], d[2]) || 1, r = [-d[2] / hl, 0, d[0] / hl], back = 12.5 - 1.5 * ease(s / 6);
          return [[p[0] - d[0] * back + r[0] * 2.6, p[1] - d[1] * back + 3.4, p[2] - d[2] * back + r[2] * 2.6], [p[0] + d[0] * 30, p[1] - 15, p[2] + d[2] * 30], 62]; } },
      // … and from above, out on the viaduct
      V3: { dur: 3.2, tod: 8.8, weather: 'haze', T0: 124, start: [-22, 70, 0], view: 'top', zoom: 15,
        act(s, K) { if (s > 0.2) K.KeyW = true; } },
      // ── noon ──
      // the whole of it from the lookout: the viaduct, the floor, the kites
      PAN: { dur: 7, tod: 11.6, weather: 'clear', T0: 112, start: [-99, 112, 20],
        act() {},
        cam(s) { const u = ease(s / 7), a = (-18 + 60 * u) * Math.PI / 180, x = -97, z = 112, y = floor(x, z, 60) + 13 + 6 * u; return [[x, y, z], [x + Math.sin(a) * 100, y - 22, z - Math.cos(a) * 100], 54]; } },      /* rising over the rocks of the lookout as it turns */
      // down the path to the one that fell long ago
      WRECK: { dur: 4.6, tod: 12.3, weather: 'clear', T0: 60, start: [-57, 38, -23], view: 'third', zoom: 5.4,
        act(s, K) { if (s > 0.2) goTo(-68, 12, K); } },
      // the camera comes down to the walker in the reeds by the tarn
      B0: { dur: 3, tod: 13.0, weather: 'clear', T0: 18.5, start: [98.0, 106.4, 14],
        act(s, K) { if (s > 0.2) goTo(101.6, 92.2, K); },
        cam(s) { const u = ease(s / 2.8), e = at(6.5 + 14 * (1 - u), -2.2 - 6 * (1 - u), 0), g = floor(e[0], e[2], P.y + 3); return [[e[0], g + 1.3 + 13 * (1 - u) * (1 - u), e[2]], at(0, 0, 1.3), 52]; } },
      // it walks beside the turtle
      T: { dur: 5.5, tod: 13.3, weather: 'clear', T0: 106, start: [rel(qt, -12, sg * 10.5)[0], rel(qt, -12, sg * 10.5)[1], yawOf(qt)],
        act(s, K) { if (s > 0.2) goTo(tGoal[0], tGoal[1], K); P.pitch = damp(P.pitch, 0.22, 1.2); },
        cam(s) { const q = pose(jara, 106 + s), f = rel(q, 3.5, 0); return [low(at(-5.6, sg * 2.2, 0), 1.9), [lerp(P.x, f[0], 0.62), lerp(P.y + 1.6, q.p[1] - 1.2, 0.62), lerp(P.z, f[1], 0.62)], 56]; } },
      // … which wades the brook
      TW: { dur: 6, tod: 13.4, weather: 'clear', T0: 64, start: [rel(qw, 9, 15)[0], rel(qw, 9, 15)[1], yawOf(qw) - 120],
        act(s, K) { P.pitch = damp(P.pitch, 0.18, 1.0); },
        cam(s) { const q = pose(jara, 64 + s), c = rel(qw, 9.5 + 0.2 * s, 20.5); return [low([c[0], 0, c[1]], 1.5), look(me(1.5), [q.p[0], q.p[1] - 2.2, q.p[2]], 0.7), 50]; } },
      // the woodlice come down their track in file; it stands aside
      G: { dur: 3.2, tod: 13.6, weather: 'clear', T0: 57, start: [-89.5, 51.4, 270],
        act() {},
        cam(s) { return [low([-86.2 - 0.25 * s, 0, 49.9], 0.6), [-100, floor(-100, 47, 30) + 0.9, 47.2], 50]; } },
      // at the yard a carrier kneels to be loaded by no one
      Y: { dur: 7, tod: 14.0, weather: 'clear', T0: 161.2, start: [113.5, -112, 150],
        act(s, K) { P.pitch = damp(P.pitch, 0.22, 1.2); },
        cam(s) { const q = pose(porter, 161.2 + s); return [low(at(-4.8 + 0.12 * s, 2.0, 0), 1.8), look(me(1.6), [q.p[0], q.p[1] - 2.5, q.p[2]], 0.6), 52]; } },
      // … and the string of them goes on along the bank
      PW: { dur: 4.2, tod: 14.2, weather: 'clear', T0: 206, start: [93.5, -122.5, 0],
        act() {},
        cam(s) { const q = pose(porter, 206 + s); return [low([96.4, 0, -118.6], 1.2), [q.p[0] - 3, q.p[1] - 1.5, q.p[2]], 56]; } },
      // ── rain ──
      // out on the broken viaduct in the rain: a crane comes through the gap, its back level with the deck …
      E1: { dur: 6.5, tod: 15.0, weather: 'rain', T0: 140.5, start: [-22, 41.6, 0],
        act(s, K) { P.pitch = damp(P.pitch, 0.1, 1.0); },
        cam(s) { const q = pose(crane1, 140.5 + s); return [at(-3.6 + 0.1 * s, 1.5, 1.55), look(me(1.5), [q.p[0] + 6, q.p[1] + 1, q.p[2]], 0.75), 54]; } },
      // … stops, and lifts its head to look
      E2: { dur: 6.2, tod: 15.05, weather: 'rain', T0: 156.4, start: [-22, 41.6, 0], pitch: 0.2,
        act(s, K) { P.pitch = damp(P.pitch, 0.5, 1.0); },
        cam(s) { const hd = headOf(crane1); return [at(-2.6, -1.7, 0.55), look(me(1.7), [hd[0], hd[1], hd[2]], 0.82), 50]; } },
      // it runs, leaps the barrier and drops to the floor in front of the crane (the page's own third view)
      JUMP: { dur: 11, tod: 15.1, weather: 'rain', T0: 162.6, start: [-22, 61, 0], view: 'third', zoom: 5.4,
        act(s, K, st) { if (P.air) st.flew = true; if (st.flew && !P.air && st.landed === undefined) st.landed = s;
          if (st.landed === undefined) { if (s > 0.3) { K.KeyW = true; K.ShiftLeft = true; } if (P.z < 39.75 && P.z > 38.9 && !P.air) K.Space = true; P.pitch = damp(P.pitch, -0.1, 1.6); }
          else { const a = s - st.landed; if (a > 0.9) K.KeyW = true; P.pitch = damp(P.pitch, a > 1.0 ? 0.32 : -0.1, 1.6); } } },
      // … and on along the old road in the rain, through its eyes
      RW: { dur: 4.2, tod: 15.3, weather: 'rain', T0: 200, start: [-112, 127.5, 90], view: 'first',
        act(s, K) { goTo(-72, 127.6, K); P.pitch = damp(P.pitch, -0.06, 1.2); } },
      // ── snow ──
      // snow at the old hall; someone has kept a fire
      SNOW: { dur: 5.6, tod: 15.8, weather: 'snow', T0: 150, start: [camp.x - 16, camp.z - 0.6, 88],
        act(s, K, st) { if (s > 0.3 && !st.there) st.there = goTo(camp.x - 3.2, camp.z - 0.4, K) ? s : 0; },
        cam(s) { return [low([camp.x - 21 + 0.5 * s, 0, camp.z - 3.4], 1.5), look(me(1.3), [camp.x, floor(camp.x, camp.z, 60) + 1.2, camp.z], 0.6), 50]; } },
      // ── evening ──
      // golden hour at the tarn: it walks up to the turtle that stands there, and looks up
      B: { dur: 8.2, tod: 17.9, weather: 'clear', T0: 20, start: [99, 102.5, 14],
        act(s, K, st) { if (s > 0.4 && !st.there) st.there = goTo(101.6, 92.2, K) ? s : 0; if (st.there) P.pitch = damp(P.pitch, 0.5, 1.5); },
        cam(s) { const u = ease((s - 4.6) / 2.6), b = at(-4.8 + 0.4 * u, 1.7 + 0.4 * u, 0); return [low(b, 2.0), [lerp(P.x, 100.5, 0.45), P.y + 2.5 + u * 0.9, lerp(P.z, 88.5, 0.45)], 54]; } },
      // haze, the sun behind it: the relic comes on along the rim
      H1: { dur: 8, tod: 18.15, weather: 'haze', T0: 146, start: [rel(qh, 76, 9)[0], rel(qh, 76, 9)[1], yawOf(qh) + 180],
        act(s, K) { P.pitch = damp(P.pitch, 0.3, 0.8); },
        cam(s) { const q = pose(relic, 146 + s), c = rel(qh, 88 - 0.6 * s, 12); return [low([c[0], 0, c[1]], 1.25), [q.p[0], q.p[1] - 15, q.p[2]], 50]; } },
      // it runs in under it from behind …
      R1: { dur: 3.45, tod: 18.3, weather: 'haze', T0: 142.0, start: [rel(q1, -26, 0)[0], rel(q1, -26, 0)[1], yawOf(q1)],
        act(s, K) { if (s > 0.1) goTo(far[0], far[1], K, true); },
        cam(s) { return [low(at(-5.5, 1.8, 0), 1.0), at(16, 0, 9), 62]; } },
      // … runs between its legs as they come down …
      R2: { dur: 6.0, tod: 18.35, weather: 'haze', T0: 145.4, start: [rel(q2, -11, 0)[0], rel(q2, -11, 0)[1], yawOf(q2)],
        act(s, K) { goTo(far[0], far[1], K, true); },
        cam(s) { return [low(at(3.5 - 0.3 * s, -5.5, 0), 0.6), at(0.5, 2, 3.4), 75]; } },
      // … and out ahead of it: the whole of it coming on
      R3: { dur: 4.25, tod: 18.4, weather: 'haze', T0: 149.6, start: [rel(q3, 7, 0)[0], rel(q3, 7, 0)[1], yawOf(q3)],
        act(s, K) { goTo(far[0], far[1], K, true); },
        cam(s) { const q = pose(relic, 149.6 + s); return [low([c3[0], 0, c3[1]], 1.5), [q.p[0], q.p[1] - 14, q.p[2]], 52]; } },
      // ── dusk mist ──
      // a crane on the floor, its light ahead of it in the mist
      CR: { dur: 6.2, tod: 19.6, weather: 'mist', T0: 105, start: [rel(qc, 7, 13)[0], rel(qc, 7, 13)[1], yawOf(qc) - 110],
        act(s, K) { P.pitch = damp(P.pitch, 0.5, 0.9); },
        cam(s) { const q = pose(crane1, 105 + s), c = rel(qc, 10, 17.5); return [low([c[0], 0, c[1]], 1.3), look(me(1.7), [q.p[0] + 2, q.p[1] - 4, q.p[2]], 0.72), 58]; } },
      // across the brook the crayfish goes by on its eight legs …
      C2: { dur: 5.5, tod: 19.75, weather: 'mist', T0: 103, start: [-61.6, -24.4, 0],
        act(s, K) { P.pitch = damp(P.pitch, 0.2, 1.4); if (s > 3.4 && s < 4.2) K.KeyS = true; },
        cam(s) { const q = pose(gajae, 103 + s); return [low([-60.4 + 0.15 * s, 0, -19.4], 1.7), [q.p[0] + 2, q.p[1] - 1.8, q.p[2]], 46]; } },
      // … and further down it rears
      C: { dur: 6.0, tod: 19.85, weather: 'mist', T0: 57.4, start: [-91.3, -29.4, -13],
        act(s, K) { if (s > 0.3 && s < 0.75) K.KeyW = true; if (s > 2.2) P.pitch = damp(P.pitch, 0.28, 1.6); if (s > 3.7 && s < 4.3) K.KeyS = true; },
        cam(s) { const k = 0.3 * s; return [low([-89.2 - 0.233 * k, 0, -25.6 - 0.973 * k], 2.1), [-94.6, 5.4 + ease((s - 3) / 2) * 0.9, -50], 38]; } },
      // ── night ──
      // on the rim way the relic comes on in the dark: lit windows, two eyes, legs coming down
      N1: { dur: 8, tod: 22.2, weather: 'mist', T0: 1006, start: [rel(qn, 27, 13.5)[0], rel(qn, 27, 13.5)[1], yawOf(qn) + 165],
        act(s, K) { P.pitch = damp(P.pitch, 0.6, 0.9); },
        cam(s) { const q = pose(relic, 1006 + s), c = rel(qn, 34, 17.5); return [low([c[0], 0, c[1]], 1.2), look(me(1.7), [q.p[0], q.p[1] - 9, q.p[2]], 0.72), 60]; } },
      // on the viaduct it stops and looks up; the kites come over
      A: { dur: 9.2, tod: 22.6, weather: 'mist', T0: 46.0, start: [-22, 64, 0],
        act(s, K) { if (s > 0.3 && s < 4.5) K.KeyW = true; if (s > 4.9) P.pitch = damp(P.pitch, 0.62, 1.6); },
        cam(s) { const u = ease((s - 5.0) / 2.6), v = ease(s / 4.6); return [at(-5.2 + 0.6 * v, -1.4, 1.0 - 0.55 * v), at(7, 0, 1.5 + 0.4 * v + u * 6.6), 60]; } },
    };
    return { fps: 24, shots, title: { big: '쇠울림 골짜기', small: 'MACHINE-WILDS', line: '브라우저에서 걷는 기계의 숲', skip: 'Esc · 직접 걷기' },
      order: ['DAWN', 'V1', 'V2', 'K', 'V3', 'PAN', 'WRECK', 'B0', 'T', 'TW', 'G', 'Y', 'PW', 'E1', 'E2', 'JUMP', 'RW', 'SNOW', 'B', 'H1', 'R1', 'R2', 'R3', 'CR', 'C2', 'C', 'N1', 'A'],
      // which frames of a shot are in the cut [from, to) — the rest is run-up (a turn at the start, leaves in front of the lens)
      range: { T: [28, 132], B: [36, 168], A: [60, 221], C: [0, 120], PW: [0, 80] } };
  };
}
