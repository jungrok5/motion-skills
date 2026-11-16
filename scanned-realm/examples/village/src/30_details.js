// 은여울 마을 · the small things: lamps round the square, market stalls, the inn's yard, signs, bunting over the
// lanes, the graveyard wall, the farm's fences and ricks, the pier on the pond, rocks along the brook.
{
  const A = LR.arch, P = LR.props, W = LR.world, h = (x, z) => LR.land.h(x, z);
  V.details = () => {
    const r = LR.rng('details'), y0 = V.y0;
    // ── the square ──
    for (let i = 0; i < 6; i++) { const a = (i / 6) * LR.TAU + 0.5; P.lampPost(Math.sin(a) * 13.2, Math.cos(a) * 13.2, { yaw: a + Math.PI }); }
    A.stall({ x: 8.5, z: 8.5, yaw: -2.35, seed: 's1', goods: 'fruit', colors: ['#c9473a', '#efe6d2'] }); A.stall({ x: -8.8, z: 8.8, yaw: 2.35, seed: 's2', goods: 'bread', colors: ['#d8a03a', '#efe6d2'] });
    A.stall({ x: 11.5, z: -2.5, yaw: -1.75, seed: 's3', goods: 'cloth', colors: ['#3f6f9a', '#efe6d2'] }); A.stall({ x: -11.2, z: -5, yaw: 1.2, seed: 's4', goods: 'pots', colors: ['#5f8a55', '#efe6d2'] });
    P.bench(4.6, 4.2, { yaw: -2.3 }); P.bench(-4.8, 4.0, { yaw: 2.3 }); P.bench(0, -5.6, { yaw: 0 });
    // what a market leaves round its stalls: in groups that say what is sold there, with open paving between them
    P.crate(10.7, 9.7, { yaw: 0.3 }); P.crate(11.2, 8.9, { yaw: -0.4, size: 0.5 }); P.barrel(9.9, 10.7); P.sack(10.2, 9.0, { yaw: 1.1 });
    P.sack(-10.7, 9.9, { yaw: 0.4 }); P.sack(-11.0, 9.1, { yaw: 2.0 }); P.sack(-10.2, 10.6, { yaw: 1.2 }); P.crate(-9.8, 11.0, { yaw: 0.6 });
    P.barrel(13.3, -4.5); P.barrel(13.8, -3.7); P.crate(13.1, -1.2, { yaw: 0.2, size: 0.5 });
    P.crate(-13.2, -6.5, { yaw: -0.3 }); P.pot(-12.9, -3.3, { size: 1.3 }); P.pot(-13.5, -3.9, { size: 1.0 }); P.pot(-12.6, -6.9, { size: 0.9 });
    P.cart(14.2, 6.6, { yaw: 0.7 }); P.sack(13.2, 7.9, { yaw: 0.2 }); P.barrel(15.4, 5.2);
    P.barrel(10.6, 10.9); P.barrel(11.5, 10.4); P.crate(6.3, 10.9, { yaw: 0.3 }); P.crate(6.5, 11.1, { y: h(6.5, 11.1) + 0.62, size: 0.5, yaw: 0.9, solid: false }); P.sack(-6.6, 10.6); P.sack(-7.1, 10.1, { yaw: 1 }); P.crate(-10.9, 10.7, { yaw: 0.2 });
    P.cart(13.5, 5.2, { yaw: 0.9, load: 'hay' }); P.pot(2.2, -7.2, { size: 1.3 }); P.pot(-2.2, -7.2, { size: 1.3 });
    // what people leave against their walls: climbers, pots by the door, planters under windows, barrels and wood
    [...V.houses, V.baker, V.chandler, V.hall, V.millB, V.cottage].forEach((hs, i) => { if (hs) A.dress(hs, { seed: 'silverford' + i }); });
    if (V.inn) A.dress(V.inn, { seed: 'inn', climbers: 3, planters: 2, stuff: 1 });
    // strings of bulbs for the evening: from lamp post to lamp post round the square, and one up to the inn
    { const lp = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * LR.TAU + 0.5, x = Math.sin(a) * 13.2, z = Math.cos(a) * 13.2; lp.push([x, h(x, z) + 3.12, z]); }
      for (let i = 0; i < 6; i++) { const a = lp[i], b = lp[(i + 1) % 6]; P.bunting(a, b, { bare: true, lights: true, sag: 0.55, n: 15 }); }
      P.bunting(lp[3], [-5.6, y0 + 5.9, -21.05], { bare: true, lights: true, sag: 0.5, n: 11 }); }
    // bunting over the square and the south lane
    const Y = y0 + 6.4; P.bunting([-20.5, Y - 0.6, -9], [-13, Y + 0.6, -15.5], { sag: 0.6 }); P.bunting([-5, Y + 0.8, -21.4], [22.5, Y - 1.2, -6], { sag: 1.3 }); P.bunting([-8.2, h(-8, 31) + 6.2, 31], [8.6, h(8, 30) + 6.6, 30], { sag: 0.8 }); P.bunting([-8.8, h(-8, 47) + 5.6, 47], [8.4, h(8, 46.5) + 5.8, 46.5], { sag: 0.8, washing: true, colors: ['#efe6d2', '#b8c4d0', '#d8c8a8', '#a8433a'] });
    // ── the inn's front: sign, benches, barrels, a hitching rail ──
    P.hangSign(-12.5 + 4.4, V.inn.y + 3.9, -25.5 + 4.35, 0.03, { shape: P.SHAPES.mug, paint: '#d8c090' });
    P.bench(-7.2, -19.9, { yaw: 0.03 }); P.bench(-12.6, -17.6, { yaw: -1.5, back: false }); P.barrel(-5.4, -20.2); P.barrel(-4.7, -19.8); P.barrel(-5.1, -19.2, { lying: true, yaw: 1.2 }); P.pot(-12.3, -20.5); P.pot(-9.0, -20.5);
    P.woodpile(-2.9, -26.5, { yaw: Math.PI / 2 }); P.trough(-22.5, -17.6, { yaw: 1.5 });
    // ── smithy, baker, chandler, hall ──
    P.hangSign(27 - 3.2, V.smithy.y + 3.3, -4 - 1.6, -Math.PI / 2, { shape: P.SHAPES.anvil }); P.barrel(22.4, 0.6); P.crate(22.2, -7.9, { yaw: 0.2 }); P.woodpile(31.5, 1.6, { yaw: 0.2, rows: 5 });
    P.hangSign(-25.5 + 3.55, V.baker.y + 3.4, -9 + 1.4, Math.PI / 2, { shape: P.SHAPES.loaf, paint: '#e0cfa0' }); P.sack(-21.2, -12.4); P.sack(-21.0, -11.6, { yaw: 0.8 }); P.pot(-21.6, -5.6);
    P.hangSign(-25 + 3.3, V.chandler.y + 3.4, 8.5 - 1.2, Math.PI / 2 + 0.06, { shape: P.SHAPES.key, paint: '#cfd4c8' }); P.crate(-20.8, 11.4); P.barrel(-20.9, 5.2);
    P.pot(19.2, 13.2, { size: 1.2 }); P.pot(21.6, 11.2, { size: 1.2 }); P.bench(16.6, 12.8, { yaw: -2.2 });
    // lamps along the ways
    for (const [x, z, a] of [[3.2, 24, -1.6], [-3.2, 40, 1.6], [3.2, 56, -1.6], [-3.2, 72, 1.6], [3.4, 90, -1.6], [-20, 3.6, 0], [-36, -1.2, 3.1], [21, 6.6, 3.1], [34, 12.4, 3.1], [5.2, -22.5, -1.6], [5.6, -33.5, -1.6], [-48, 8.6, 0], [42.4, 19.6, 1.6]]) P.lampPost(x, z, { yaw: a });
    // doorsteps: pots, piles, a barrel here and there
    for (const hh of V.houses) { const d = hh.door, c = [hh.toW(0, 0)[0], hh.toW(0, 0)[1]], ox = d[0] - c[0], oz = d[1] - c[1], l = Math.hypot(ox, oz) || 1, nx = ox / l, nz = oz / l, tx = -nz, tz = nx;
      if (r() < 0.8) P.pot(d[0] + nx * 0.55 + tx * 1.05, d[1] + nz * 0.55 + tz * 1.05, { size: 0.9 + r() * 0.4 }); if (r() < 0.45) P.barrel(d[0] + nx * 0.5 - tx * 1.5, d[1] + nz * 0.5 - tz * 1.5); if (r() < 0.4) P.bench(d[0] + nx * 0.55 - tx * 2.7, d[1] + nz * 0.55 - tz * 2.7, { yaw: Math.atan2(nx, nz) }); }
    P.woodpile(-17.5, 33.5, { yaw: 0 }); P.woodpile(17.2, 66.8, { yaw: 0.1 }); P.cart(-6.8, 87, { yaw: 1.3, load: 'barrels' }); P.barrel(-6.4, 86.6, { y: h(-6.4, 86.6) + 0.83, solid: false }); P.barrel(-7.3, 87.3, { y: h(-7.3, 87.3) + 0.83, solid: false });
    P.signpost(7.4, 15.4, { arms: [[2.35, 0.1, 0.95], [2.05, 1.7, 0.85], [1.75, 3.3, 0.9]] }); P.signpost(4.8, -34.5, { arms: [[2.3, 3.2, 0.9], [2.0, 0.3, 0.8]] }); P.signpost(-3.4, 106, { arms: [[2.3, 3.14, 1.0]] });
    // ── the chapel yard: a wall, stones, a bench ──
    { const c = V.chapel; P.stoneWall([[c.x - 13, c.z - 14], [c.x + 3, c.z - 15.5], [c.x + 13, c.z - 11]]); P.stoneWall([[c.x - 13, c.z - 14], [c.x - 17, c.z + 2], [c.x - 14, c.z + 15]]); P.stoneWall([[c.x - 14, c.z + 15], [c.x + 2, c.z + 17], [c.x + 12, c.z + 13]]);
      for (let i = 0; i < 16; i++) { const gx = c.x - 12 + (i % 4) * 2.5 + (r() - 0.5) * 0.7, gz = c.z + 8.5 + Math.floor(i / 4) * 2.1 + (r() - 0.5) * 0.5; if (gz < c.z + 15.5) P.tombstone(gx, gz, { yaw: Math.PI / 2 + (r() - 0.5) * 0.3 }); }
      P.bench(c.x + 9.5, c.z - 6, { yaw: -Math.PI / 2 }); P.lampPost(c.x + 12, c.z + 5.5, { yaw: 1.6 }); }
    // ── the farm ──
    { const f = V.farm; // the fences leave a gap where the farm road and the footpath to the lane come through
      P.fence([[f.x + 26, f.z - 26], [f.x + 18.8, f.z - 27.3]], { kind: 'rail', seed: 'f1' }); P.fence([[f.x + 14.6, f.z - 28.1], [f.x + 4, f.z - 30], [f.x - 20, f.z - 24], [f.x - 30, f.z - 6]], { kind: 'rail', seed: 'f1b' });
      P.fence([[f.x + 26, f.z - 26], [f.x + 28.7, f.z - 11]], { kind: 'rail', seed: 'f2' }); P.fence([[f.x + 29.4, f.z - 7.4], [f.x + 30, f.z - 4], [f.x + 22, f.z + 18]], { kind: 'rail', seed: 'f2b' });
      P.fence([[f.x + 16, f.z + 2], [f.x + 22, f.z + 18], [f.x + 8, f.z + 26]], { kind: 'wattle', seed: 'f3' });
      P.haystack(f.x + 10, f.z - 16, { size: 1.7 }); P.haystack(f.x + 15, f.z - 12, { size: 1.3 }); P.haystack(f.x + 2, f.z - 20, { size: 1.5 }); P.scarecrow(f.x - 6, f.z - 14, { yaw: 0.6 }); P.cart(f.x + 6, f.z - 2, { yaw: -0.5 }); P.woodpile(f.x + 5.5, f.z + 9, { yaw: 0.5 }); P.trough(f.x + 12, f.z + 2, { yaw: 1.1 }); P.barrel(f.x + 3.6, f.z + 1.2); }
    // ── the pond: a pier, a boat-length of planks, reeds are the grass kit's ──
    { const p = V.pond; P.pier([p.x - p.r - 2.5, p.z + 2], [p.x - p.r + 7.5, p.z + 1.2], p.level + 0.55, { width: 1.9 }); P.barrel(p.x - p.r - 3.6, p.z + 3.6); P.crate(p.x - p.r - 4.4, p.z + 0.4, { yaw: 0.5 }); P.lampPost(p.x - p.r - 3.2, p.z - 1.6, { yaw: 1.6 }); P.bench(p.x - p.r - 6.5, p.z + 8, { yaw: 1.2 }); }
    // ── rocks: along the brook, in the meadow, in the woods ──
    for (let i = 1; i < V.brook3.length - 1; i++) { const p = V.brook3[i], q = V.brook3[i + 1]; for (let k = 0; k < 3; k++) { const t = r(), sx = p[0] + (q[0] - p[0]) * t, sz = p[1] + (q[1] - p[1]) * t, dx = -(q[1] - p[1]), dz = q[0] - p[0], l = Math.hypot(dx, dz) || 1, s = r.sign() * (2.6 + r() * 2.4); const x = sx + (dx / l) * s, z = sz + (dz / l) * s; if (Math.hypot(x - V.bridge.x, z - V.bridge.z) > 7 && Math.hypot(x - V.wheel[0], z - V.wheel[1]) > 6) P.rocks(x, z, 1 + r.int(3), 1.1, { size: 0.55 + r() * 0.5 }); } }
    P.rocks(V.meadow.x + 14, V.meadow.z - 6, 5, 3.2, { size: 1.5 }); P.rocks(V.meadow.x - 22, V.meadow.z + 8, 4, 2.6, { size: 1.2 }); P.rocks(-16, -58, 3, 2, { size: 1.0 });
    for (let i = 0; i < 46; i++) { const a = r() * LR.TAU, d = 96 + r() * 46, x = Math.cos(a) * d, z = Math.sin(a) * d; if (V.woods(x, z) > 0.5 && LR.water.levelAt(x, z) < -1e8) { if (r() < 0.6) P.rocks(x, z, 2 + r.int(4), 2.4, { size: 0.8 + r() * 1.1 }); else if (r() < 0.5) P.log(x, z, { yaw: r() * 6.28, len: 2.4 + r() * 2.4 }); else P.stump(x, z, { r: 0.3 + r() * 0.25, generated: true }); } }
    { const g = V.glade; if (!LR.models.place('dead_tree_trunk', g.x + 2.5, g.z - 1.5, { yaw: 0.4, scale: 1.7, sink: 0.05, solid: 'box' })) P.log(g.x + 2.5, g.z - 1.5, { yaw: 0.4, len: 4.6, r: 0.36 }); P.stump(g.x - 2.2, g.z + 1.6, { r: 0.45, hero: true }); P.stump(g.x - 3.4, g.z - 2.4, { r: 0.3, hero: true }); P.rocks(g.x + 0.5, g.z + 4.5, 4, 2.0, { size: 1.2 }); P.rocks(g.x - 5, g.z - 0.5, 3, 1.5, { size: 0.8 }); }
    P.log(-22.5, -70.5, { yaw: 0.7, len: 4.2, r: 0.34 }); P.stump(V.meadow.x + 30, V.meadow.z + 12, { hero: true });
    // ── scanned objects with no generated twin (they are simply not there when the scans are not) ──
    { const MD = LR.models, g = V.glade, on = (id, x, z, top, o = {}) => MD.place(id, x, z, Object.assign({ y: h(x, z) + top, solid: false }, o));
      // bedrock comes through: a rock face is a scan of one side of a cliff, so two stand back to back, with boulders at their feet
      const tor = (x, z, yaw, k = 1) => { const fx = Math.sin(yaw), fz = Math.cos(yaw);
        MD.place('rock_face_01', x, z, { yaw, scale: k, sink: 0.45 * k, solid: 'box' }); MD.place('rock_face_02', x - fx * 3.4 * k, z - fz * 3.4 * k, { yaw: yaw + Math.PI + 0.3, scale: 1.25 * k, sink: 0.5 * k, solid: 'box' });
        P.rocks(x + fx * 3.6 * k + fz * 2.5, z + fz * 3.6 * k - fx * 2.5, 3, 1.6, { size: 1.3 }); P.rocks(x - fz * 4.6 * k, z + fx * 4.6 * k, 2, 1.2, { size: 1.1 }); };
      if (MD.defs.rock_face_01 && MD.defs.rock_face_02) { tor(g.x - 6.5, g.z + 8.5, 2.36); tor(-24, -106, 0.2, 1.15); tor(V.pond.x + 24, V.pond.z - 15, -1.3, 0.9); }
      // the inn's front: a laid table at the bench, stools, something to eat
      if (MD.place('dining_table', -7.2, -18.45, { yaw: 0.03, solid: 'box' })) { MD.place('painted_wooden_stool', -7.9, -17.25, { yaw: 0.4, solid: 0.6 }); MD.place('painted_wooden_stool', -6.4, -17.3, { yaw: 2.1, solid: 0.6 });
        on('metal_jug', -7.55, -18.5, 0.88, { scale: 0.85 }); on('croissant', -6.85, -18.3, 0.88, { yaw: 0.7 }); on('croissant', -6.7, -18.62, 0.88, { yaw: 2.2 }); on('food_apple_01', -7.9, -18.25, 0.88); on('food_apple_01', -7.98, -18.42, 0.88, { yaw: 2 }); on('brass_pot_01', -6.25, -18.45, 0.88, { scale: 0.7 }); }
      // the market: a low table of baskets, a painted table of pots, baskets at the stalls' corners
      if (MD.place('WoodenTable_01', -5.2, 11.8, { yaw: -0.25, scale: 1.2, solid: 'box' })) { on('wicker_basket_01', -5.65, 11.7, 0.66, { scale: 1.5, yaw: 0.3 }); for (let i = 0; i < 6; i++) on('food_apple_01', -5.65 + (r() - 0.5) * 0.32, 11.7 + (r() - 0.5) * 0.24, 0.7 + (i > 3 ? 0.06 : 0), { yaw: r() * 6, pitch: r() - 0.5 });
        on('wicker_basket_02#0', -4.6, 11.95, 0.66, { scale: 1.5 }); on('brass_pot_01', -5.0, 11.62, 0.66, { scale: 0.8, yaw: 1 }); }
      if (MD.place('painted_wooden_table', -6.4, -9.6, { yaw: 0.5, scale: 0.9, solid: 'box' })) { const t = (lx, lz) => [-6.4 + lx * Math.cos(0.5) + lz * Math.sin(0.5), -9.6 - lx * Math.sin(0.5) + lz * Math.cos(0.5)];
        [['ceramic_pot', -0.7, 0.1, 0.6], ['ceramic_pot', -0.2, -0.2, 0.45], ['metal_jug', 0.25, 0.15, 0.9], ['brass_pot_01', 0.7, -0.1, 0.9], ['metal_jug', 0.55, 0.28, 0.7], ['wicker_basket_02#0', -0.75, -0.25, 1.3]].forEach(([id, lx, lz, sc]) => { const q = t(lx, lz); on(id, q[0], q[1], 0.865, { scale: sc, yaw: r() * 6 }); }); }
      { const st = (x, z, yaw, lx, lz) => [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
        let q = st(8.5, 8.5, -2.35, 2.0, 1.25); if (MD.place('wicker_basket_01', q[0], q[1], { scale: 1.9, yaw: 1.1, solid: false })) for (let i = 0; i < 7; i++) on('food_apple_01', q[0] + (r() - 0.5) * 0.4, q[1] + (r() - 0.5) * 0.3, 0.05 + (i > 4 ? 0.07 : 0), { yaw: r() * 6, pitch: r() - 0.5 });
        q = st(-8.8, 8.8, 2.35, -2.0, 1.2); MD.place('wicker_basket_02#0', q[0], q[1], { scale: 2.2, solid: 0.6 }); q = st(-8.8, 8.8, 2.35, 2.05, 1.1); MD.place('wicker_basket_02#0', q[0], q[1], { scale: 1.8, yaw: 2, solid: 0.6 });
        q = st(-11.2, -5, 1.2, -2.05, 1.2); MD.place('ceramic_pot', q[0], q[1], { scale: 1.25, yaw: 0.6, solid: 0.7 }); q = st(-11.2, -5, 1.2, 2.1, 1.0); MD.place('planter_box_01', q[0], q[1], { yaw: 1.2, solid: 'box' });
        q = st(11.5, -2.5, -1.75, 2.0, 1.2); MD.place('wooden_crate_01', q[0], q[1], { scale: 1.25, yaw: -1.4, solid: 'box' }); }
      MD.place('wooden_bucket_02', 2.6, 3.4, { scale: 0.9, yaw: 0.4, solid: 0.7 });
      // the smithy: a bench with its tools, a shield against the wall
      if (MD.place('small_wooden_table_01', 23.25, 1.95, { yaw: Math.PI / 2, scale: 1.4, solid: 'box' })) { on('cross_pein_hammer', 23.2, 1.7, 0.75, { lie: true, yaw: 0.6, scale: 1.3 }); on('hatchet', 23.3, 2.25, 0.75, { lie: true, yaw: 2.4, scale: 1.2 }); }
      MD.place('kite_shield', 23.52, -0.35, { yaw: -Math.PI / 2, pitch: -0.2, scale: 0.9, solid: false }); MD.place('wooden_axe', 22.75, -8.6, { lie: true, yaw: 0.8, scale: 1.3, solid: false });
      // the farm and the cottage: a ladder at the rick, tools by the wood, a spinning wheel at the door, a statue in the chapel yard
      { const f = V.farm, c = V.chapel; MD.place('wooden_ladder_02', f.x + 8.7, f.z - 14.3, { yaw: 0.9, solid: 0.5 }); MD.place('picke_dirty_01', f.x + 4.1, f.z + 10.4, { lie: true, yaw: 0.5, solid: false }); MD.place('wooden_axe', f.x + 6.9, f.z + 7.7, { lie: true, yaw: 2.2, scale: 1.3, solid: false });
        MD.place('rusted_spade_01', f.x - 4.5, f.z - 12.5, { sink: 0.2, pitch: 0.09, yaw: 1.1, solid: false }); MD.place('watering_can_metal_01', f.x - 3.9, f.z - 12.9, { yaw: 2.6, scale: 1.2, solid: false });
        MD.place('gothic_statue', c.x + 7.5, c.z - 10.5, { yaw: 1.2, scale: 1.1, solid: 0.7 });
        if (V.cottage && V.cottage.door) { const hh = V.cottage, d = hh.door, c0 = hh.toW(0, 0), ox = d[0] - c0[0], oz = d[1] - c0[1], l = Math.hypot(ox, oz) || 1, nx = ox / l, nz = oz / l; MD.place('spinning_wheel_01', d[0] + nx * 0.75 + nz * 1.6, d[1] + nz * 0.75 - nx * 1.6, { yaw: Math.atan2(nx, nz) + 0.5, solid: 0.5 }); } }
      MD.place('stone_fire_pit', g.x - 0.4, g.z + 0.2, { yaw: 0.6, sink: 0.02, solid: 0.9 });
      MD.place('wooden_bucket_01', -32.2, 8.6, { yaw: 0.8, solid: false }); MD.place('wooden_bucket_01', -34.9, 8.3, { yaw: 2.3, solid: false, lie: true });
      MD.place('wooden_bucket_01', 23.4, -1.2, { yaw: 0.2, solid: false }); MD.place('wooden_bucket_01', -57.5, 52.4, { yaw: 1.2, solid: false }); }
    W.fireflyAreas = [{ x: V.pond.x - 6, z: V.pond.z, r: 26 }, { x: V.meadow.x, z: V.meadow.z, r: 36 }, { x: 20, z: -40, r: 22 }, { x: -50, z: -46, r: 20 }];
    W.sounds.push({ x: V.pond.x, y: V.pond.level, z: V.pond.z, kind: 'frogs', r: 34, gain: 0.8 });
  };
}
