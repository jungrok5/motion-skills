// Tarn Cabin — the smallest realm that uses every part: land, water, one building made from the kit's parts, props,
// trees and ground cover, scanned surfaces and objects (assets.json, 90_main.js ⓪), named places, a tour and views.  Steps ①–⑧ are the order to work in; replace every one of
// them for your own topic (this cabin is an example of the style, not a template to fill in).
const R = { tarn: { x: 14, z: -10, r: 15 }, cabin: { x: -12, z: 6 } };

// ① the land: one height function in metres (x east, z south).  Keep the walked middle gentle; let it rise beyond.
R.height = (x, z) => {
  const r = Math.hypot(x, z);
  return 2.5 + (LR.fbm(x * 0.02 + 3, z * 0.02 + 8, 4) - 0.5) * 2.0 + (LR.fbm(x * 0.006 + 1, z * 0.006 + 5, 5) - 0.38) * 70 * LR.sm(55, 300, r) + LR.ridge(x * 0.0007, z * 0.0007 + 2, 5) * 700 * LR.sm(600, 2600, r);
};
// how wooded a spot is, 0..1 — one function drives the leaf litter, the planting and the far forest
R.woods = (x, z) => LR.sm(26, 44, Math.hypot(x, z) + (LR.fbm(x * 0.03, z * 0.03 + 4, 3) - 0.5) * 18) * LR.sm(20, 28, Math.hypot(x - R.tarn.x, z - R.tarn.z));

R.build = () => {
  const L = LR.land.create({ height: R.height, half: 128,
    biome: (x, z, h, slope) => [LR.sm(110, 170, Math.hypot(x, z)) * LR.sm(0.55, 0.3, slope) * LR.sm(520, 380, h), LR.sm(0.36, 0.6, slope), LR.sm(430, 560, h)] });
  // ② water: a tarn (a bowl cut into the land, then a water surface at its level)
  const T = R.tarn; T.level = R.height(T.x, T.z) - 1.2;
  L.pond(T.x, T.z, T.r, T.level, 2.6);
  LR.water.pond(T.level, [T.x - T.r - 7, T.z - T.r - 7, T.x + T.r + 7, T.z + T.r + 7]);
  // ③ ways and ground: strokes on the cover maps (dirt, paved, litter, grass, tall, flowers, fern)
  L.road([[-10, 8.5], [-2, 6], [4, 0], [5.5, -6]], 1.8, { kind: 'dirt' }); L.road([[-10, 8.5], [-22, 20], [-40, 34], [-70, 60]], 2.0, { kind: 'dirt' });
  L.patch(R.cabin.x + 1, R.cabin.z + 5.5, 3.2, { kind: 'dirt' }); L.road([[-5.0, 10.0], [-1.6, 9.2]], 3.4, { kind: 'dirt', ease: false });       // the yard before the door; a trodden stretch round the fire (no blades there)
  L.paint('litter', (x, z) => LR.sm(0.3, 0.8, R.woods(x, z)), 'max'); L.paint('grass', (x, z) => 1 - 0.5 * R.woods(x, z), 'min');
  L.paint('tall', (x, z) => 0.45 + 0.4 * LR.fbm(x * 0.05, z * 0.05, 3)); L.paint('flowers', (x, z) => LR.sm(0.6, 0.75, LR.fbm(x * 0.08 + 9, z * 0.08, 3)) * (1 - R.woods(x, z)) * 0.7);
  L.paint('fern', (x, z) => LR.sm(0.4, 0.8, R.woods(x, z)) * LR.sm(0.45, 0.6, LR.fbm(x * 0.09 + 2, z * 0.09 + 7, 3)));
  LR.land.roughen(0.09, { radius: 60 });                                              // nothing people use is level: a swell under everything, before building
  // ④ a building from the parts: here LR.arch.house does it from a few numbers (see lib/40_arch.js for wall, window,
  //    door, gableRoof, chimney if you need a kind of building the kit does not have)
  const A = LR.arch, P = LR.props, C = R.cabin;
  R.house = A.house({ x: C.x, z: C.z, yaw: 0.5, w: 7.2, d: 5.4, floors: 1, floorH: 2.6, ground: 'boards', boardTint: '#c9b9a0', roof: { mat: 'thatch', pitch: 48, eave: 0.7 }, door: { side: '+z', at: 0.35 }, chimneys: [[0.3, 0, 1.5]], seed: 'cabin' });
  // ⑤ small things: each stands on the land and registers a solid if you would bump into it
  P.woodpile(C.x + 5.2, C.z - 0.6, { yaw: 2.1 }); P.barrel(C.x - 1.6, C.z + 4.4); P.stump(-4.5, 9.5); P.log(-1.5, 11.5, { yaw: 0.5 }); P.bench(-6.4, 10.6, { yaw: 2.6, back: false });
  P.pier([T.x - T.r - 1.5, T.z + 6], [T.x - T.r + 7, T.z + 4.5], T.level + 0.5); P.rocks(T.x - 6, T.z + T.r + 1.5, 4, 2.2, { size: 1.1 }); P.rocks(-20, -8, 3, 2); P.lampPost(-7.5, 5.5, { yaw: 2.2, h: 2.8 });
  A.dress(R.house, { seed: 'tarn', climbers: 1, planters: 1, stuff: 1 });          // and what collects against a wall: a climber, a planter, a barrel
  // a camp fire: a ring of stones (the scanned fire pit when it is there, else eight generated stones), a light, a flame, a sound
  { const fx = -3.2, fz = 9.6, fy = LR.land.h(fx, fz), g = P.g(fx, fz); if (!LR.models.place('stone_fire_pit', fx, fz, { scale: 0.75, yaw: 0.4, solid: false })) for (let i = 0; i < 8; i++) { const a = (i / 8) * LR.TAU; g.mat('rock', { scale: 0.5 }); g.blob(fx + Math.cos(a) * 0.5, fy + 0.08, fz + Math.sin(a) * 0.5, 0.16, { seg: 6, rings: 4, seed: i }); }
    g.mat('rock', { flags: LR.FLAG.FIRE | LR.FLAG.NOWEATHER, weight: 0.5 }); g.blob(fx, fy + 0.05, fz, 0.3, { squash: [1, 0.3, 1], seg: 7, rings: 4 });
    LR.world.light({ x: fx, y: fy + 0.5, z: fz, r: 9, power: 5, color: [1, 0.5, 0.18], kind: 'fire', flicker: 0.3, day: 0.6 }); LR.world.fires.push({ x: fx, y: fy + 0.45, z: fz, size: 0.5 }); LR.world.sounds.push({ x: fx, y: fy, z: fz, kind: 'fire', r: 16, gain: 1 }); LR.world.solidCircle(fx, fz, 0.6); }
  // ⑥ what grows: named trees first, then scatter by the woods function; the far country as billboards
  const F = LR.flora, wet = (x, z) => LR.water.levelAt(x, z) > LR.land.h(x, z) - 0.4, way = (x, z) => LR.land.coverAt('dirt', x, z) > 0.2;
  F.plant('pine', -18, -2, { scale: 1.2, hero: true }); F.plant('birch', 5.6, 13.6, { scale: 0.9 });
  F.scatter({ species: [['spruce', 4], ['pine', 2], ['birch', 1], ['bush', 1]], area: [-126, -126, 126, 126], spacing: 7.5, seed: 'tarn', density: (x, z) => R.woods(x, z) * 0.85, avoid: (x, z) => wet(x, z) || way(x, z) });
  F.far({ density: (x, z) => 0.7 * LR.sm(520, 400, LR.land.h(x, z)), inner: 124, outer: 600, spacing: 13, species: [['spruce', 3], ['pine', 2]] });
  // scanned ferns under the trees, by the woods function and a noise — in drifts, with bare floor between (nothing when the scans are not there)
  LR.models.scatter({ ids: ['fern_02#0', 'fern_02#1', 'fern_02#2', 'fern_02#3'], seed: 'ferns', spacing: 1.8, scale: [1.0, 1.9], area: [-70, -70, 70, 70],
    density: (x, z) => LR.sm(0.35, 0.7, R.woods(x, z)) * LR.sm(0.45, 0.65, LR.fbm(x * 0.08 + 3, z * 0.08, 2)) * 0.55, avoid: (x, z) => wet(x, z) || way(x, z) });
  // young firs where the wood thins out toward the clearing — whole scanned trees, the three of the set (out in the
  // light a sapling is a young tree; under a closed canopy it is a dark stick).  Nothing where they are not loaded:
  // a phone has the engine's spruces only
  LR.models.scatter({ ids: ['fir_sapling#0', 'fir_sapling#1', 'fir_sapling#2'], seed: 'young', spacing: 3.2, scale: [1.1, 2.3], tilt: 0.05, tintVar: 0.1, sink: 0.03, area: [-60, -60, 60, 60],
    density: (x, z) => { const w = R.woods(x, z); return LR.sm(0.04, 0.25, w) * LR.sm(0.7, 0.4, w) * 0.45; }, avoid: (x, z) => wet(x, z) || way(x, z) });
  // ⑦ what the walker is told, where they start, how far they may go
  LR.world.places.push({ x: C.x + 2, z: C.z + 4, r: 6, name: 'The Cabin', sub: 'smoke and split wood' }, { x: T.x - T.r, z: T.z + 5, r: 7, name: 'The Tarn', sub: 'cold and clear' });
  LR.world.fireflyAreas = [{ x: T.x, z: T.z, r: 24 }]; LR.world.radius = 62; LR.world.spawn = { x: -30, z: 26, yaw: 40 };
};
