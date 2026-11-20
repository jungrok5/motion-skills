// 쇠울림 골짜기 · start.  The land, what people left on it, the machines and their ways (footfalls pressed into the land),
// the small things, then what grows around all of it.
LR.start({
  // scans (assets.json → fetch-assets.mjs): each surface takes the place of the recipe of the same name at its real size
  materials: async (LR) => { const P = LR.mat.photo, MD = LR.models;
    P('litter', 'forest_leaves_03', { tile: 2.3 }); P('dirt', 'mud_forest', { tile: 2.4 }); P('gravel', 'river_small_rocks'); P('rock', 'mossy_rock', { gain: 0.9 }); P('barkpine', 'pine_bark', { tile: 1.6 }); P('bark', 'pine_bark', { tile: 1.4 });
    P('cobble', 'asphalt_02', { pom: 0.006, moss: 0.6 }); P('asphalt', 'asphalt_02'); P('concrete', 'dirty_concrete', { gain: 0.92 }); P('slab', 'cracked_concrete', { like: 'concrete', gain: 0.85, pom: 0.008 });
    P('paintmetal', 'rusty_metal_02', { gain: 0.9 }); P('rustplate', 'rust_coarse_01'); P('corrugated', 'corrugated_iron_02', { like: 'rustplate', moss: 0.5 });
    await MD.load(['covered_car', 'concrete_road_barrier_02', 'old_tyre', 'rusted_wheel_rim_01', { id: 'barrel_03', metal: 0.5 }, 'old_military_crate', { id: 'metal_jerrycan', metal: 0.5 }, 'portable_generator', 'utility_box_01',
      { id: 'rock_moss_set_01', moss: 0.6 }, { id: 'rock_moss_set_02', moss: 0.6 }, { id: 'boulder_01', detail: 'rock', moss: 0.95, tint: [0.78, 0.82, 0.8] }, { id: 'rock_face_02', detail: 'rock', moss: 0.95, tint: [0.8, 0.84, 0.82], detailTile: 3, detailReach: 26 },
      { id: 'dead_tree_trunk', moss: 0.8 }, { id: 'tree_stump_02', moss: 0.7 }, { id: 'dry_branches_medium_01', far: 40 }, { id: 'fern_02', plant: true }, { id: 'shrub_02', plant: true },
      { id: 'fir_sapling', tree: true, turn: 0 }]);
    MD.stand('barrel', 'barrel_03'); MD.stand('stump', 'tree_stump_02'); MD.stand('rock', 'boulder_01', { min: 0.5 });
    await LR.atlas.load(['fir_tree_01:twig', 'pine_tree_01:twig', 'fern_02']);
    LR.flora.defs.spruce.leaf.scan = { atlas: 'fir_tree_01:twig', kind: 'spray', parts: [[0.306, 0.399, 0.645, 0.775], [0.635, 0.452, 0.953, 0.830]], own: 0.45 };
    LR.flora.defs.pine.leaf.scan = { atlas: 'pine_tree_01:twig', parts: [[0.035, 0.044, 0.195, 0.432], [0.651, 0.342, 0.937, 0.518, 1]], size: 1.7, own: 0.5 };
    LR.grass.scan = { frond: ['fern_02', [0.089, 0.111, 0.235, 0.948, 0]] }; },
  strings: V.strings, film: V.film, cine: V.cine,
  weather: { tod: 20.4, weather: 'mist' },
  // the automatic round of this valley: mist at dusk, into the night, a grey dawn with shafts through the trees, a clear noon, rain, and back
  round: [{ t: 0, weather: 'mist' }, { t: 26, tod: 23.2 }, { t: 60, tod: 5.6 }, { t: 92, weather: 'haze', tod: 7.4 }, { t: 110, weather: 'clear', tod: 11.5 }, { t: 138, weather: 'rain', tod: 16.5 }, { t: 176, weather: 'mist', tod: 18.8 }, { t: 200, tod: 20.4 }, { t: 226, end: true }],
  build: async () => {
    V.land(); V.ruins(); V.machines(); LR.mech.plan(); V.details(); V.plants(); LR.mech.start();
    LR.canopy.mist = 1.5; LR.wx.key = 0.2; LR.world.radius = 262;      /* out past the rim way (240 m, 38 m wide): the walker can go in under the relic */ LR.world.spawn = { x: V.spawn.x, z: V.spawn.z, yaw: 70 };
  },
  // the tour: in along the old road, out on the viaduct to its broken edge (the cranes pass below it), back, to the hall and its
  // fire, then down the path to the valley floor where the fallen crane lies beside the machines' way, and up again
  tour: [{ x: -150, z: 120, look: [-96, 104] }, { x: -112, z: 127.5, look: [-22, 80], pull: 0.4 }, { x: -72, z: 127.6, look: [-22, 60] }, { x: -38, z: 125.4, look: [-22, 60], pull: 0.6 }, { x: -24.5, z: 118, look: [-22, 20], pull: 0.8 }, { x: -22, z: 96, look: [-22, 20], pull: 0.8 }, { x: -22.4, z: 66, look: [-70, 16], pull: 0.7 }, { x: -22.6, z: 44.5, look: [-74, 12], pull: 0.85 },
    { x: -21, z: 70, look: [34, 122], pull: 0.5 }, { x: -20.6, z: 110, look: [34, 122], pull: 0.6 }, { x: -8, z: 122.2, look: [34, 122], pull: 0.8 }, { x: 11, z: 122, look: [28, 123], pull: 0.9 }, { x: -6, z: 121.6, look: [-44, 96] }, { x: -36, z: 124.6, look: [-50, 62], pull: 0.7 }, { x: -43.6, z: 100, look: [-58, 34], pull: 0.8 }, { x: -49.6, z: 64, look: [-72, 6], pull: 0.8 }, { x: -57, z: 38, look: [-72, 6], pull: 0.9 },
    { x: -50.4, z: 62, look: [-22, 40], pull: 0.5 }, { x: -44, z: 98, look: [-40, 126] }, { x: -44, z: 124.6, look: [-96, 104], pull: 0.5 }, { x: -100, z: 127.6, look: [-150, 118] }],
  views: [{ name: 'arrival', cam: [-150, 120, 70, 2] }, { name: 'edge', cam: [-22.5, 42, -28, 3] }, { name: 'floor', cam: [-57, 38, -38, 8] }, { name: 'hall', cam: [9, 122.4, 88, 6] }, { name: 'tarn', cam: [92, 100, 62, 4] }, { name: 'lookout', cam: [-97, 114, 12, -5] }, { name: 'ford', cam: [61, -7, 205, 8] }, { name: 'yard', cam: [84, -96, 128, 6] }, { name: 'road', cam: [-70, 127.6, 80, 4] }],
});
