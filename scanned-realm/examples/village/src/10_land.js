// 은여울 마을 · the land.  A plateau tilted gently from the north-west down to the mill pond in the south-east, a brook
// off the hills that passes north of the square and turns south into the pond, a knoll for the chapel, a hill for the
// windmill, woods all round, mountains beyond.  V is this realm's shared sheet: places other sources build on.
const V = {
  plaza: { x: 0, z: 0, r: 15.5 }, chapel: { x: -60, z: 6 }, mill: { x: 80, z: -62 }, pond: { x: 62, z: 50, r: 18 }, gate: { x: 0, z: 100 },
  bridge: { x: 3, z: -41.5 }, meadow: { x: -6, z: -82, rx: 52, rz: 30 }, farm: { x: -56, z: 58 }, glade: { x: -110, z: -82, r: 8 }, fort: { x: -9, z: -132 },
  brook: [[-175, -70], [-140, -66], [-108, -58], [-78, -50], [-48, -45], [-18, -42], [12, -40], [36, -31], [51, -12], [59, 9], [62, 26]],
  out: [[62, 66], [72, 84], [92, 104], [124, 132], [160, 170]],
};
{
  const knoll = (x, z, cx, cz, R) => { const t = LR.sm(R, 0, Math.hypot(x - cx, z - cz)); return t * t; };
  V.base = (x, z) => {
    const r = Math.hypot(x, z);
    let h = 3.0 + LR.clamp((-x - z) * 0.008, -1.4, 2.6);
    h += (LR.fbm(x * 0.012 + 5, z * 0.012 + 9, 4) - 0.5) * 2.4 * LR.sm(24, 100, r);
    h += knoll(x, z, V.chapel.x, V.chapel.z, 36) * 4.4 + knoll(x, z, V.mill.x, V.mill.z, 44) * 7.0;
    h += (LR.fbm(x * 0.0045 + 3, z * 0.0045 + 7, 5) - 0.40) * 78 * LR.sm(125, 480, r);
    h += LR.ridge(x * 0.00055 + 1, z * 0.00055 + 4, 5) * 760 * LR.sm(820, 2900, r);
    return h;
  };
  // woods: 0 open … 1 deep forest
  const ell = (x, z, c, rx, rz) => Math.hypot((x - c.x) / rx, (z - c.z) / rz);
  V.woods = (x, z) => {
    const r = Math.hypot(x, z); let f = LR.sm(84, 118, r + (LR.fbm(x * 0.02 + 1, z * 0.02 + 2, 3) - 0.5) * 34);
    f *= LR.sm(0.85, 1.25, ell(x, z, V.meadow, V.meadow.rx, V.meadow.rz));                  // the flower meadow north of the brook
    f *= LR.sm(0.8, 1.2, ell(x, z, V.farm, 40, 34));                                        // the fields
    f *= LR.sm(0.95, 1.3, ell(x, z, V.fort, 27, 23));                                       // the old fort keeps its clearing
    if (z > 60) f *= LR.sm(7, 18, Math.abs(x));                                             // the road out of the gate
    f *= LR.sm(24, 40, Math.hypot(x - V.pond.x, z - V.pond.z)); f *= LR.sm(30, 46, Math.hypot(x - V.mill.x, z - V.mill.z)); f *= LR.sm(V.glade.r - 2, V.glade.r + 5, Math.hypot(x - V.glade.x, z - V.glade.z));
    return LR.sat(f);
  };
  V.land = () => {
    const L = LR.land.create({ height: V.base, half: 256, res: 0.5,
      biome: (x, z, h, slope) => { const r = Math.hypot(x, z), n = LR.noise(x * 0.004 + 3, z * 0.004 + 1); return [LR.sm(215, 300, r) * LR.sm(0.55, 0.32, slope) * LR.sm(560, 400, h + n * 60) * LR.sm(0.2, 0.5, n + 0.35), LR.sm(0.36, 0.6, slope) * LR.sm(240, 420, r), LR.sm(450, 600, h + n * 90)]; } });
    // water levels: just under the land, never rising downstream
    const lv = []; let prev = 1e9; for (const p of V.brook) { let y = V.base(p[0], p[1]) - 1.2; y = Math.min(y, prev - 0.04); lv.push(y); prev = y; }
    V.pond.level = Math.min(prev - 0.1, V.base(V.pond.x, V.pond.z) - 1.3);
    V.brook3 = V.brook.map((p, i) => [p[0], p[1], lv[i]]); V.brook3.push([V.pond.x, V.pond.z - V.pond.r + 3, V.pond.level]);
    L.carve(V.brook3, 5.2, 1.25, { bank: 4 });
    L.pond(V.pond.x, V.pond.z, V.pond.r, V.pond.level, 2.4);
    let po = V.pond.level; V.out3 = [[V.pond.x, V.pond.z + V.pond.r - 3, po], ...V.out.map((p) => { po = Math.min(po - 0.06, V.base(p[0], p[1]) - 1.1); return [p[0], p[1], po]; })];
    L.carve(V.out3, 4.6, 1.1, { bank: 4 });
    // the square and the ways
    V.y0 = L.levelDisc(0, 0, V.plaza.r + 2, undefined, 10);
    V.fort.y = L.level(V.fort.x, V.fort.z, 19.5, 15.5, 0, undefined, 8);                     // the fort stands level, its yard trodden bare
    L.patch(0, 0, V.plaza.r, { kind: 'paved', soft: 1.8 });
    V.roads = {
      south: [[0, 14], [0.5, 34], [-0.5, 56], [0.8, 78], [0, 100], [0, 124], [3, 150]],
      north: [[1, -14], [2.4, -28], [3, -36]], beyond: [[3, -47], [2, -56], [-4, -66], [-14, -76], [-30, -84]],
      west: [[-14, -1], [-28, 1], [-42, 3], [-52, 5]], east: [[14, 2], [28, 6], [40, 12], [50, 16]],
      farm: [[-28, 1], [-34, 18], [-40, 34], [-50, 46]], woods: [[-30, -84], [-52, -97], [-76, -103], [-97, -95], [-109, -84]], millhill: [[14, -3], [30, -16], [50, -38], [70, -54]], pond: [[40, 12], [44.5, 19], [48, 25.5], [49.5, 33], [50, 44]],
      alley: [[-1.5, 56], [-11, 55.2], [-21, 53], [-31, 45], [-39, 37]], fort: [[-14, -76], [-13.5, -91], [-11, -105], [-9, -117], [-9, -127]],
    };
    L.road(V.roads.south.slice(0, 5), 4.4, { kind: 'paved', wobble: 0.5, soft: 1.2 }); L.road(V.roads.south.slice(4), 4.2, { kind: 'dirt' });
    L.road(V.roads.north, 3.8, { kind: 'paved', wobble: 0.5 }); L.road(V.roads.beyond, 2.4, { kind: 'dirt', strength: 0.85 });
    L.road(V.roads.west, 3.6, { kind: 'paved', wobble: 0.6 }); L.road(V.roads.east, 3.6, { kind: 'paved', wobble: 0.6 });
    L.road(V.roads.farm, 2.6, { kind: 'dirt' }); L.road(V.roads.woods, 1.7, { kind: 'dirt', strength: 0.8, wobble: 1.1 }); L.patch(V.glade.x, V.glade.z, V.glade.r - 3, { kind: 'dirt', strength: 0.5, wobble: 1.6 }); L.road(V.roads.millhill, 2.4, { kind: 'dirt', strength: 0.9 }); L.road(V.roads.pond, 2.2, { kind: 'dirt', strength: 0.85 }); L.road(V.roads.alley, 1.5, { kind: 'dirt', strength: 0.75, wobble: 0.8 });
    L.road(V.roads.fort, 2.0, { kind: 'dirt', strength: 0.7, wobble: 1.2, ease: false }); L.patch(V.fort.x + 1.5, V.fort.z + 1, 7, { kind: 'dirt', strength: 0.5, wobble: 2.0 });
    // what grows where
    L.paint('litter', (x, z) => LR.sm(0.3, 0.75, V.woods(x, z)) * (0.55 + 0.45 * LR.fbm(x * 0.06, z * 0.06, 3)), 'max');
    L.paint('grass', (x, z) => 1 - 0.55 * LR.sm(0.4, 0.9, V.woods(x, z)), 'min');
    L.paint('tall', (x, z) => { const m = LR.sm(1.15, 0.7, ell(x, z, V.meadow, V.meadow.rx, V.meadow.rz)), town = LR.sm(70, 30, Math.hypot(x, z)); return LR.sat(0.5 + 0.45 * m - 0.22 * town + (LR.fbm(x * 0.03 + 4, z * 0.03, 3) - 0.5) * 0.4); });
    L.paint('flowers', (x, z, k) => { const m = LR.sm(1.1, 0.6, ell(x, z, V.meadow, V.meadow.rx, V.meadow.rz)); const drift = LR.sm(0.5, 0.72, LR.fbm(x * 0.05 + 7, z * 0.05 + 3, 3)); const verge = LR.sm(0.56, 0.7, LR.fbm(x * 0.09, z * 0.09 + 20, 2)) * 0.35 * LR.sm(0.5, 0.2, V.woods(x, z)); return Math.min(LR.land.splat[k * 4 + 3] / 255, Math.max(m * drift, verge)); });
    L.paint('fern', (x, z, k) => Math.min(LR.land.splat[k * 4 + 3] / 255 + 0.5, LR.sm(0.35, 0.8, V.woods(x, z)) * LR.sm(0.42, 0.62, LR.fbm(x * 0.07 + 11, z * 0.07 + 5, 3))));
    LR.water.stream(V.brook3, 5.2); LR.water.stream(V.out3, 4.6);
    LR.water.pond(V.pond.level, [V.pond.x - V.pond.r - 7, V.pond.z - V.pond.r - 7, V.pond.x + V.pond.r + 7, V.pond.z + V.pond.r + 7]);
    // nothing is level or even: a swell under everything, patches of rank grass and weeds, worn earth where feet turn
    L.roughen(0.10, { radius: 140 });
    { const inV = (x, z) => LR.sm(118, 96, Math.hypot(x, z)), free = (x, z) => 1 - LR.sat(L.coverAt('paved', x, z) * 3);
      L.paint('tall', (x, z) => LR.sm(0.60, 0.74, LR.fbm(x * 0.10 + 3, z * 0.10, 3)) * 0.95 * inV(x, z), 'max');
      L.paint('dirt', (x, z) => LR.sm(0.69, 0.79, LR.fbm(x * 0.16 + 31, z * 0.16 + 5, 3)) * 0.75 * inV(x, z) * free(x, z), 'max');
      L.paint('grass', (x, z) => 1 - LR.sm(0.69, 0.79, LR.fbm(x * 0.16 + 31, z * 0.16 + 5, 3)) * 0.85 * inV(x, z), 'mul');
      L.paint('flowers', (x, z) => LR.sm(0.66, 0.78, LR.fbm(x * 0.13 + 71, z * 0.13 + 9, 3)) * 0.8 * inV(x, z), 'max'); }
    LR.world.radius = 150; LR.world.baseY = V.y0 - 1.5;
    return L;
  };
}
