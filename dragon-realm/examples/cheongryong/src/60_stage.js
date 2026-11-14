// 청룡 · 여의주 — the stage: where the buildings stand and where the trees grow.
// Pines frame the view from both sides as on the 일월오봉도 screen; maples burn along the shore; pines cling to the peaks.
const Stage = {};
{
  const { smooth, pulse, sat, lerp } = DR;
  Stage.build = (scene) => {
    const S = World.SITE, H = World.height, land = World.land, yaw = (g, a) => { g.rotation.y = a; return g; }, at = (g, x, z, y) => { g.position.set(x, y ?? H(x, z), z); scene.add(g); return g; };
    // ── buildings ──
    Stage.nugak = at(yaw(Hanok.nugak({ seed: 3 }), Math.PI / 2), S.nugak[0], S.nugak[2], S.nugak[1] - 0.05);
    Stage.jeongja = at(yaw(Hanok.jeongja({ seed: 5 }), -Math.PI / 2), S.jeongja[0], S.jeongja[2], World.kioskTop ?? 15.6);
    at(Hanok.pagoda({ seed: 7 }), S.pagoda[0], S.pagoda[2], S.pagoda[1] - 0.05);
    at(Hanok.seokdeung({ seed: 1 }), -59.5, -15.5); at(Hanok.seokdeung({ seed: 2 }), -59.5, -28.5); at(Hanok.seokdeung({ seed: 3 }), -80.5, -1);
    at(yaw(Hanok.sotdae({ seed: 4 }), 0.4), 27, 73);
    // the warm lights: bright at blue hour, guttering in the storm, pale by day
    const glow = DR.track([[0, 1], [B.OMEN, 1], [B.PEARL, 0.8], [B.DAWN, 0.7], [B.DAWN + 6, 0.3], [B.TABLEAU, 0.18]]);
    DR.onFrame((t) => { Hanok.glow.value = glow(t) * (1 - 0.25 * pulse(t, B.BURST, B.BURST + 0.5, 0.05, 0.4)); }, 20);
    // what makes the chimes and lanterns swing: the storm's gusts, the eruption, the dragon's pass
    Hanok.events.push({ t0: B.OMEN + 0.5, strength: 0.35, dir: [0.9, 0.3] }, { t0: B.THUNDER1 + 1, strength: 0.5, dir: [0.9, 0.3] }, { t0: B.BURST + 0.25, strength: 0.7, dir: [-1, 0.2] }, { t0: B.BOLT1, strength: 0.4, dir: [0.9, 0.3] }, { t0: B.BOLT3, strength: 0.45, dir: [0.9, 0.3] }, { t0: 62.75, strength: 1.0, dir: [0.25, -1] }, { t0: 67.9, strength: 0.3, dir: [0, 1] });
    if (typeof Flora === 'undefined' || !DR.on('flora')) return;

    // ── where the lens goes and where the dragon flies low: plants keep clear of both, and detail follows the lens ──
    const cams = [], C = Yong.C;
    for (const s of DR.F.shots) { const t1 = s.t1 ?? DR.F.shots[DR.F.shots.indexOf(s) + 1]?.t0 ?? DR.F.duration; for (let k = 0; k <= 8; k++) { const t = lerp(s.t0, t1 - 0.02, k / 8), c = s.cam(k / 8, t); if (c.p[1] < 60) cams.push(c.p); } }
    const near = (p) => { let d = 1e9; for (const c of cams) d = Math.min(d, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])); return d; };
    const low = []; for (let s = 0; s < C.rail.length; s += 4) { const p = C.rail.at(s); if (p[1] > 0.5 && p[1] < 26) low.push(p); }
    const builds = [...World.falls.map((f) => [f.spec.lip[0], f.spec.lip[2] + 5, 9]), [S.nugak[0], S.nugak[2], 15], [S.jeongja[0], S.jeongja[2], 6], [S.pagoda[0], S.pagoda[2], 5], [27, 73, 3], [-59.5, -15.5, 2], [-59.5, -28.5, 2], [-80.5, -1, 2]];
    const clear = (x, z, r, tall) => { for (const b of builds) if (Math.hypot(x - b[0], z - b[1]) < b[2] + r) return false; for (const c of cams) if (Math.hypot(x - c[0], z - c[2]) < (tall ? 7 : 2.2)) return false;
      if (tall) for (const p of low) if (Math.hypot(x - p[0], z - p[2]) < 10) return false; return true; };
    // sight lines that must stay open: from the home lens to the lake, from the pavilion shot to the water
    const lane = (x, z) => (Math.abs(x - 4) < 16 && z > 20 && z < 130) || (x > -92 && x < -40 && z > -44 && z < 12 && Math.abs((z + 40) - (x + 90) * 0.95) < 9);
    const R = (seed) => DR.rng(seed), finish = (list, r, smin, smax) => { for (const s of list) { s.s = r.range(smin, smax); } return list; };
    const shoreD = World.shore;
    // trees near the water are seen in the lake's mirror; the rest are left out of that pass.  Detail (full / mid / far)
    // is chosen once from the distance to the nearest lens position; the bias pulls the cheaper levels in.
    const plant = (sp, sites, bias = 0.42) => { const a = sites.filter((q) => shoreD(q.p[0], q.p[2]) < 42), b2 = sites.filter((q) => shoreD(q.p[0], q.p[2]) >= 42);
      if (a.length) sp.plant(scene, a, { near, lodBias: bias, cluster: CL }); if (b2.length) { const g = sp.plant(scene, b2, { near, lodBias: bias, cluster: CL }); if (g && g.traverse) g.traverse((o) => { o.userData.noMirror = true; }); } };
    const CL = DR.num('cluster', 2.5);   // bigger instance groups: fewer draw calls (each costs more than its triangles on a CPU rasteriser)
    // ── trees ──
    const pines = finish(land.scatter({ count: 270, seed: 11, bounds: [-300, -330, 300, 150], minDist: 9, filter: (x, z, h, ny) => (h > 1.6 && h < 175 && ny > 0.72 && clear(x, z, 3, true) && !lane(x, z) ? 0.25 + 0.75 * smooth(4, 40, shoreD(x, z)) * (1 - 0.6 * smooth(260, 330, Math.hypot(x, z + 60))) : 0) }), R(1), 0.85, 1.3);
    // the framing pines of the home view, placed by hand
    for (const [x, z, v, s, r] of [[-38, 78, 3, 1.25, 0.4], [-48, 66, 0, 1.1, 2.1], [-56, 90, 2, 0.9, 1.0], [40, 82, 3, 1.3, 3.4], [50, 70, 1, 1.1, 5.2], [60, 92, 2, 0.95, 2.5], [-84, -44, 0, 1.0, 1.2], [-92, -12, 1, 1.05, 3.0], [-60, 4, 2, 0.8, 0.3]]) pines.push({ p: [x, H(x, z), z], s, r, seed: Math.round(x * 31 + z * 7 + 500), variant: v });
    plant(Flora.pine, pines);
    const maples = finish(land.scatter({ count: 200, seed: 12, bounds: [-200, -180, 200, 130], minDist: 6, filter: (x, z, h, ny) => (h > 1.3 && h < 80 && ny > 0.74 && clear(x, z, 2.5, true) && !lane(x, z) ? smooth(70, 6, shoreD(x, z)) * 0.9 + 0.1 : 0) }), R(2), 0.8, 1.35);
    for (const [x, z, t] of [[-56, -40, 0.1], [-52, 0, 0.35], [-84, 14, 0.55], [-96, -30, 0.2], [18, 60, 0.15], [-14, 62, 0.5], [60, 66, 0.3], [74, -30, 0.25], [80, -64, 0.6]]) maples.push({ p: [x, H(x, z), z], s: 1.25, r: x, seed: Math.round(900 + x * 3 + z), tint: t });
    plant(Flora.maple, maples, 0.4);
    plant(Flora.oak, finish(land.scatter({ count: 170, seed: 13, bounds: [-300, -330, 300, 150], minDist: 9, filter: (x, z, h, ny) => (h > 4 && h < 150 && ny > 0.7 && clear(x, z, 3, true) && !lane(x, z) ? 0.3 + 0.7 * smooth(20, 90, shoreD(x, z)) : 0) }), R(3), 0.8, 1.3));
    // pines on the rock: on ledges, and out of the faces
    const ledge = [], face = [], r4 = R(4);
    const byFalls = (p) => World.falls.some((f) => Math.hypot(p[0] - f.spec.lip[0], p[2] - (f.spec.lip[2] + 4)) < 10);   // nothing grows in front of the white water
    World.peaks.forEach((pk, i) => { const top = pk.spec.at[1] + pk.spec.height; for (const s of pk.sites) { if (s.p[1] < 4 || s.p[1] > top - 3 || byFalls(s.p)) continue;
      if (s.n[1] > 0.8 && s.r < 0.10 && ledge.length < 190) ledge.push({ p: [s.p[0], s.p[1] - 0.3, s.p[2]], s: r4.range(0.5, 0.95), r: s.r * 60, seed: ledge.length + 1, variant: 2 + (s.r * 100 < 3 ? 1 : 0) - 0 });
      else if (s.n[1] > 0.12 && s.n[1] < 0.62 && s.r < 0.05 && face.length < 150) face.push({ p: [s.p[0] - s.n[0] * 0.5, s.p[1], s.p[2] - s.n[2] * 0.5], n: s.n, s: r4.range(0.7, 1.2), r: 0, seed: face.length + 1 }); } });
    plant(Flora.pine, ledge.map((s) => ({ ...s, variant: [0, 1, 2][s.seed % 3] })));
    plant(Flora.cliffPine, face);
    // ── the ground: plume grass on the banks, reeds in the shallows, turf, ferns and shrubs under the trees ──
    const nearBank = (x, z) => smooth(150, 60, Math.hypot(x - 4, z - 80));
    const small = (g) => { if (g && g.traverse) g.traverse((o) => { o.userData.noMirror = true; o.castShadow = false; }); };
    small(Flora.grass.plant(scene, finish(land.scatter({ count: 620, seed: 21, bounds: [-130, -60, 130, 135], minDist: 1.6, filter: (x, z, h, ny) => (h > 0.9 && h < 22 && ny > 0.8 && clear(x, z, 0.5) ? (0.15 + 0.85 * DR.smooth(0.05, 0.4, DR.fbm2(x * 0.045, z * 0.045, 3, 77))) * (0.25 + 0.75 * nearBank(x, z)) : 0) }), R(5), 0.8, 1.3), { near, lodBias: 0.6, cluster: CL }));
    Flora.reed.plant(scene, finish(land.scatter({ count: 300, seed: 22, bounds: [-100, -110, 100, 40], minDist: 1.2, filter: (x, z, h) => (h > -0.45 && h < 0.5 && clear(x, z, 0.5) ? DR.smooth(-0.1, 0.5, DR.fbm2(x * 0.06, z * 0.06, 3, 78)) : 0) }), R(6), 0.8, 1.2), { near });
    small(Flora.turf.plant(scene, finish(land.scatter({ count: 1500, seed: 23, bounds: [-110, -50, 110, 130], minDist: 0.7, filter: (x, z, h, ny) => (h > 0.8 && h < 16 && ny > 0.85 && near([x, h + 2, z]) < 45 ? 0.9 : 0) }), R(7), 0.8, 1.4), { near, lodBias: 0.6, cluster: CL }));
    small(Flora.shrub.plant(scene, finish(land.scatter({ count: 520, seed: 24, bounds: [-200, -180, 200, 135], minDist: 2.2, filter: (x, z, h, ny) => (h > 1.2 && h < 70 && ny > 0.7 && clear(x, z, 1) ? 0.5 : 0) }), R(8), 0.8, 1.5), { near, lodBias: 0.6, cluster: CL }));
    small(Flora.fern.plant(scene, finish(land.scatter({ count: 420, seed: 25, bounds: [-130, -70, 130, 130], minDist: 1.5, filter: (x, z, h, ny) => (h > 1.2 && h < 30 && ny > 0.75 && clear(x, z, 0.6) && near([x, h + 2, z]) < 60 ? 0.5 : 0) }), R(9), 0.8, 1.3), { near, lodBias: 0.6, cluster: CL }));
    if (DR.P.has('log')) console.log('[flora]', JSON.stringify(Flora.report().map((s) => [s.name, s.planted, s.draws])));
  };
}
