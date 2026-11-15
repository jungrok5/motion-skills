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
    P.barrel(10.6, 10.9); P.barrel(11.5, 10.4); P.crate(6.3, 10.9, { yaw: 0.3 }); P.crate(6.5, 11.1, { y: h(6.5, 11.1) + 0.62, size: 0.5, yaw: 0.9, solid: false }); P.sack(-6.6, 10.6); P.sack(-7.1, 10.1, { yaw: 1 }); P.crate(-10.9, 10.7, { yaw: 0.2 });
    P.cart(13.5, 5.2, { yaw: 0.9, load: 'hay' }); P.pot(2.2, -7.2, { size: 1.3 }); P.pot(-2.2, -7.2, { size: 1.3 });
    // bunting over the square and the south lane
    const Y = y0 + 6.4; P.bunting([-17.5, Y, -6], [-6, Y + 0.6, -19.5], { sag: 0.9 }); P.bunting([6.5, Y + 0.6, -19.5], [20, Y - 0.8, -3], { sag: 0.9 }); P.bunting([-8.2, h(-8, 31) + 6.2, 31], [8.6, h(8, 30) + 6.6, 30], { sag: 0.8 }); P.bunting([-8.8, h(-8, 47) + 5.6, 47], [8.4, h(8, 46.5) + 5.8, 46.5], { sag: 0.8, washing: true, colors: ['#efe6d2', '#b8c4d0', '#d8c8a8', '#a8433a'] });
    // ── the inn's front: sign, benches, barrels, a hitching rail ──
    P.hangSign(-2 + 2.6, V.inn.y + 3.9, -25.5 + 4.35, 0.03, { shape: P.SHAPES.mug, paint: '#d8c090' });
    P.bench(-7.5, -19.4, { yaw: 0.03 }); P.bench(4.2, -19.6, { yaw: 0.03, back: false }); P.barrel(-10.6, -19.9); P.barrel(-11.4, -19.6); P.barrel(-11.0, -20.4, { lying: true, yaw: 1.2 }); P.pot(-4.3, -20.4); P.pot(-0.6, -20.4);
    P.woodpile(13.6, -23.5, { yaw: Math.PI / 2 }); P.trough(-12.5, -15.2, { yaw: 0.6 });
    // ── smithy, baker, chandler, hall ──
    P.hangSign(27 - 3.2, V.smithy.y + 3.3, -4 - 1.6, -Math.PI / 2, { shape: P.SHAPES.anvil }); P.barrel(22.4, 0.6); P.crate(22.2, -7.9, { yaw: 0.2 }); P.woodpile(31.5, 1.6, { yaw: 0.2, rows: 5 });
    P.hangSign(-25.5 + 3.55, V.baker.y + 3.4, -9 + 1.4, Math.PI / 2, { shape: P.SHAPES.loaf, paint: '#e0cfa0' }); P.sack(-21.2, -12.4); P.sack(-21.0, -11.6, { yaw: 0.8 }); P.pot(-21.6, -5.6);
    P.hangSign(-25 + 3.3, V.chandler.y + 3.4, 8.5 - 1.2, Math.PI / 2 + 0.06, { shape: P.SHAPES.key, paint: '#cfd4c8' }); P.crate(-20.8, 11.4); P.barrel(-20.9, 5.2);
    P.pot(19.2, 13.2, { size: 1.2 }); P.pot(21.6, 11.2, { size: 1.2 }); P.bench(16.6, 12.8, { yaw: -2.2 });
    // lamps along the ways
    for (const [x, z, a] of [[3.2, 24, -1.6], [-3.2, 40, 1.6], [3.2, 56, -1.6], [-3.2, 72, 1.6], [3.4, 90, -1.6], [-20, 3.6, 0], [-36, -1.2, 3.1], [21, 6.6, 3.1], [34, 12.4, 3.1], [5.6, -26.5, -1.6], [5.4, -33.5, -1.6], [-48, 8.6, 0], [46, 18.6, 3.1]]) P.lampPost(x, z, { yaw: a });
    // doorsteps: pots, piles, a barrel here and there
    for (const hh of V.houses) { const d = hh.door, c = [hh.toW(0, 0)[0], hh.toW(0, 0)[1]], ox = d[0] - c[0], oz = d[1] - c[1], l = Math.hypot(ox, oz) || 1, nx = ox / l, nz = oz / l, tx = -nz, tz = nx;
      if (r() < 0.8) P.pot(d[0] + nx * 0.55 + tx * 1.05, d[1] + nz * 0.55 + tz * 1.05, { size: 0.9 + r() * 0.4 }); if (r() < 0.45) P.barrel(d[0] + nx * 0.5 - tx * 1.5, d[1] + nz * 0.5 - tz * 1.5); if (r() < 0.4) P.bench(d[0] + nx * 0.55 - tx * 2.7, d[1] + nz * 0.55 - tz * 2.7, { yaw: Math.atan2(nx, nz) }); }
    P.woodpile(-17.5, 33.5, { yaw: 0 }); P.woodpile(17.2, 66.8, { yaw: 0.1 }); P.cart(-6.8, 87, { yaw: 1.3, load: 'barrels' }); P.barrel(-6.4, 86.6, { y: h(-6.4, 86.6) + 0.83, solid: false }); P.barrel(-7.3, 87.3, { y: h(-7.3, 87.3) + 0.83, solid: false });
    P.signpost(2.6, 13.2, { arms: [[2.35, 0.1, 0.95], [2.05, 1.7, 0.85], [1.75, 3.3, 0.9]] }); P.signpost(4.8, -34.5, { arms: [[2.3, 3.2, 0.9], [2.0, 0.3, 0.8]] }); P.signpost(-3.4, 106, { arms: [[2.3, 3.14, 1.0]] });
    // ── the chapel yard: a wall, stones, a bench ──
    { const c = V.chapel; P.stoneWall([[c.x - 13, c.z - 14], [c.x + 3, c.z - 15.5], [c.x + 13, c.z - 11]]); P.stoneWall([[c.x - 13, c.z - 14], [c.x - 17, c.z + 2], [c.x - 14, c.z + 15]]); P.stoneWall([[c.x - 14, c.z + 15], [c.x + 2, c.z + 17], [c.x + 12, c.z + 13]]);
      for (let i = 0; i < 16; i++) { const gx = c.x - 12 + (i % 4) * 2.5 + (r() - 0.5) * 0.7, gz = c.z + 8.5 + Math.floor(i / 4) * 2.1 + (r() - 0.5) * 0.5; if (gz < c.z + 15.5) P.tombstone(gx, gz, { yaw: Math.PI / 2 + (r() - 0.5) * 0.3 }); }
      P.bench(c.x + 9.5, c.z - 6, { yaw: -Math.PI / 2 }); P.lampPost(c.x + 12, c.z + 5.5, { yaw: 1.6 }); }
    // ── the farm ──
    { const f = V.farm; P.fence([[f.x + 26, f.z - 26], [f.x + 4, f.z - 30], [f.x - 20, f.z - 24], [f.x - 30, f.z - 6]], { kind: 'rail', seed: 'f1' }); P.fence([[f.x + 26, f.z - 26], [f.x + 30, f.z - 4], [f.x + 22, f.z + 18]], { kind: 'rail', seed: 'f2' });
      P.fence([[f.x + 16, f.z + 2], [f.x + 22, f.z + 18], [f.x + 8, f.z + 26]], { kind: 'wattle', seed: 'f3' });
      P.haystack(f.x + 10, f.z - 16, { size: 1.7 }); P.haystack(f.x + 15, f.z - 12, { size: 1.3 }); P.haystack(f.x + 2, f.z - 20, { size: 1.5 }); P.scarecrow(f.x - 6, f.z - 14, { yaw: 0.6 }); P.cart(f.x + 6, f.z - 2, { yaw: -0.5 }); P.woodpile(f.x + 5.5, f.z + 9, { yaw: 0.5 }); P.trough(f.x + 12, f.z + 2, { yaw: 1.1 }); P.barrel(f.x + 3.6, f.z + 1.2); }
    // ── the pond: a pier, a boat-length of planks, reeds are the grass kit's ──
    { const p = V.pond; P.pier([p.x - p.r - 2.5, p.z + 2], [p.x - p.r + 7.5, p.z + 1.2], p.level + 0.55, { width: 1.9 }); P.barrel(p.x - p.r - 3.6, p.z + 3.6); P.crate(p.x - p.r - 4.4, p.z + 0.4, { yaw: 0.5 }); P.lampPost(p.x - p.r - 3.2, p.z - 1.6, { yaw: 1.6 }); P.bench(p.x - p.r - 6.5, p.z + 8, { yaw: 1.2 }); }
    // ── rocks: along the brook, in the meadow, in the woods ──
    for (let i = 1; i < V.brook3.length - 1; i++) { const p = V.brook3[i], q = V.brook3[i + 1]; for (let k = 0; k < 3; k++) { const t = r(), sx = p[0] + (q[0] - p[0]) * t, sz = p[1] + (q[1] - p[1]) * t, dx = -(q[1] - p[1]), dz = q[0] - p[0], l = Math.hypot(dx, dz) || 1, s = r.sign() * (2.6 + r() * 2.4); const x = sx + (dx / l) * s, z = sz + (dz / l) * s; if (Math.hypot(x - V.bridge.x, z - V.bridge.z) > 7 && Math.hypot(x - V.wheel[0], z - V.wheel[1]) > 6) P.rocks(x, z, 1 + r.int(3), 1.1, { size: 0.55 + r() * 0.5 }); } }
    P.rocks(V.meadow.x + 14, V.meadow.z - 6, 5, 3.2, { size: 1.5 }); P.rocks(V.meadow.x - 22, V.meadow.z + 8, 4, 2.6, { size: 1.2 }); P.rocks(-16, -58, 3, 2, { size: 1.0 });
    for (let i = 0; i < 46; i++) { const a = r() * LR.TAU, d = 96 + r() * 46, x = Math.cos(a) * d, z = Math.sin(a) * d; if (V.woods(x, z) > 0.5 && LR.water.levelAt(x, z) < -1e8) { if (r() < 0.6) P.rocks(x, z, 2 + r.int(4), 2.4, { size: 0.8 + r() * 1.1 }); else if (r() < 0.5) P.log(x, z, { yaw: r() * 6.28, len: 2.4 + r() * 2.4 }); else P.stump(x, z, { r: 0.3 + r() * 0.25 }); } }
    P.log(-18, -74, { yaw: 0.7, len: 4.2, r: 0.34 }); P.stump(V.meadow.x + 30, V.meadow.z + 12);
    W.fireflyAreas = [{ x: V.pond.x - 6, z: V.pond.z, r: 26 }, { x: V.meadow.x, z: V.meadow.z, r: 36 }, { x: 20, z: -40, r: 22 }, { x: -50, z: -46, r: 20 }];
    W.sounds.push({ x: V.pond.x, y: V.pond.level, z: V.pond.z, kind: 'frogs', r: 34, gain: 0.8 });
  };
}
