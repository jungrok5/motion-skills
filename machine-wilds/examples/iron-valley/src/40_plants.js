// 쇠울림 골짜기 · what grows.  A dark wood of spruce and pine that has had the valley to itself for a long time, birch and
// brush by the water and wherever a machine has opened the canopy, young firs at every edge and in the cracks of what
// people built.  Nothing grows on the machines' ways: they are walked too often.
V.plants = () => {
  const F = LR.flora, MD = LR.models, L = LR.land, M = LR.mech, W = LR.world;
  const wet = (x, z) => LR.water.levelAt(x, z) > L.h(x, z) - 0.35, paved = (x, z) => L.coverAt('paved', x, z) > 0.3, way = (x, z) => M.wayDist(x, z);
  const clear = (x, z, pad = 0.9) => { for (const s of W.solids) { if (s.mech || s.y0 !== undefined) continue; if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return false; } else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; if (Math.abs(lx) < s.hx + pad && Math.abs(lz) < s.hz + pad) return false; } } return true; };
  const onDeck = (x, z) => V.deck && Math.abs(x - V.deck.x) < V.deck.w / 2 + 2.5 && z > V.viaduct.piers[0] - 8 && z < V.viaduct.piers[5] + 8;
  const avoid = (x, z) => wet(x, z) || paved(x, z) || way(x, z) < 2.6 || !clear(x, z, 1.8) || onDeck(x, z) || L.coverAt('dirt', x, z) > 0.45;
  // heroes: the pines of the lookout, a great spruce over the hall, birches at the tarn
  F.plant('pine', V.lookout.x + 7, V.lookout.z + 8, { scale: 1.35, hero: true, yaw: 1.1 }); F.plant('pine', V.lookout.x - 9, V.lookout.z + 3, { scale: 1.1, hero: true, yaw: 4.0 }); F.plant('spruce', V.hall.x - 19, V.hall.z + 6, { scale: 1.6, hero: true });
  F.plant('birch', V.tarn.x - 30, V.tarn.z - 10, { scale: 1.1 }); F.plant('birch', V.tarn.x - 33, V.tarn.z - 6, { scale: 0.9 }); F.plant('birch', V.tarn.x - 16, V.tarn.z + 24, { scale: 1.0 });      // (clear of the cranes' way, which rounds the bog to the south)
  // the wood
  F.scatter({ species: [['spruce', 5], ['pine', 2.6], ['birch', 0.7]], area: [-316, -316, 316, 316], spacing: 6.2, seed: 'wood', density: (x, z) => LR.sm(0.22, 0.75, V.woods(x, z)) * (0.5 + 0.45 * LR.sm(0.34, 0.66, LR.fbm(x * 0.04 + 4, z * 0.04 + 9, 2))), avoid, scale: [0.95, 1.6] });
  // light-loving trees where the canopy is open: by the brook, round the tarn, beside the ways
  F.scatter({ species: [['birch', 3], ['bush', 2.4], ['spruce', 0.6]], area: [-250, -250, 250, 250], spacing: 6.4, seed: 'edges', density: (x, z) => { const d = Math.abs(z - V.axis(x)), wd = way(x, z), t = Math.hypot(x - V.tarn.x, z - V.tarn.z); return Math.max(LR.sm(4, 8, d) * LR.sm(26, 12, d) * 0.4, LR.sm(3, 5, wd) * LR.sm(13, 7, wd) * 0.34, LR.sm(V.tarn.r + 3, V.tarn.r + 8, t) * LR.sm(V.tarn.r + 30, V.tarn.r + 14, t) * 0.42); }, avoid, scale: [0.7, 1.15] });
  F.scatter({ species: [['bush', 1]], area: [-230, -230, 230, 230], spacing: 5.5, seed: 'brush', density: (x, z) => { const w = V.woods(x, z); return LR.sm(0.1, 0.35, w) * LR.sm(0.8, 0.45, w) * 0.5; }, avoid, scale: [0.8, 1.4] });
  // beyond the walk: forest as billboards, parted where the colossus goes
  F.far({ density: (x, z) => LR.sm(0.2, 0.6, LR.noise(x * 0.004 + 3, z * 0.004 + 1) + 0.4) * LR.sm(600, 430, L.h(x, z)) * 0.85 * LR.sm(2, 9, way(x, z)), inner: 314, outer: 820, spacing: 12, species: [['spruce', 4], ['pine', 2]] });
  // scanned plants: ferns in the damp, shrubs at the edges, young firs wherever light gets in
  const set = (id, n) => Array.from({ length: n }, (_, k) => id + '#' + k), C = (n, x, z) => L.coverAt(n, x, z), bare = (x, z) => paved(x, z) || way(x, z) < 0.5 || C('dirt', x, z) > 0.5;
  MD.scatter({ ids: set('fern_02', 4), seed: 'ferns', spacing: 1.8, scale: [1.0, 2.0], area: [-190, -190, 190, 190], density: (x, z) => C('fern', x, z) * LR.sm(0.3, 0.6, V.woods(x, z)) * 0.55, avoid: bare });
  MD.scatter({ ids: set('shrub_02', 4), seed: 'shrubs', spacing: 3.4, scale: [0.9, 1.7], tintVar: 0.1, area: [-200, -200, 200, 200], density: (x, z) => { const w = V.woods(x, z), wd = way(x, z); return Math.max(LR.sm(0.1, 0.3, w) * LR.sm(0.7, 0.4, w) * 0.4, LR.sm(1, 3, wd) * LR.sm(9, 5, wd) * 0.3); }, avoid: (x, z) => bare(x, z) || wet(x, z) || !clear(x, z, 0.6) });
  MD.scatter({ ids: set('fir_sapling', 3), seed: 'young', spacing: 3.2, scale: [1.2, 2.6], tintVar: 0.1, tilt: 0.05, sink: 0.03, area: [-200, -200, 200, 200],
    density: (x, z) => { const w = V.woods(x, z), wd = way(x, z); return Math.max(LR.sm(0.08, 0.28, w) * LR.sm(0.72, 0.42, w) * 0.34, LR.sm(2, 4, wd) * LR.sm(10, 6, wd) * 0.3) * LR.sm(205, 170, Math.hypot(x, z)); }, avoid: (x, z) => bare(x, z) || wet(x, z) || !clear(x, z, 0.8) || way(x, z) < 2 });
  // the hall's floor has let them in too
  { const H = V.hall, rg = LR.rng('hallfirs'); for (let i = 0; i < 7; i++) { const x = H.x + 4 + rg() * 8, z = H.z - 6 + rg() * 12; if (clear(x, z, 0.5)) MD.place('fir_sapling#' + rg.int(3), x, z, { scale: 1.2 + rg() * 1.5, yaw: rg() * 6.28, solid: false }); } }
  LR.grass.flowers = [{ color: '#e9e4d2', center: '#d8b23a', size: 0.026, height: 0.07, share: 0.5, petals: 9 }, { color: '#6d5fc0', center: '#e2d8a0', size: 0.022, height: 0.05, share: 0.3, petals: 5 }, { color: '#d9c13a', center: '#7a5a10', size: 0.02, height: 0.03, share: 0.2, petals: 8 }];
};
