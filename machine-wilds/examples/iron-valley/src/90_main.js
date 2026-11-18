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
  strings: V.strings,
  weather: { tod: 20.4, weather: 'mist' },
  // the automatic round of this valley: mist at dusk, into the night, a grey dawn with shafts through the trees, a clear noon, rain, and back
  round: [{ t: 0, weather: 'mist' }, { t: 26, tod: 23.2 }, { t: 60, tod: 5.6 }, { t: 92, tod: 7.4 }, { t: 110, weather: 'clear', tod: 11.5 }, { t: 138, weather: 'rain', tod: 16.5 }, { t: 176, weather: 'mist', tod: 18.8 }, { t: 200, tod: 20.4 }, { t: 226, end: true }],
  build: async () => {
    V.land(); V.ruins(); V.machines(); LR.mech.plan(); V.details(); V.plants(); LR.mech.start();
    LR.canopy.mist = 1.5; LR.wx.key = 0.2; LR.world.radius = 222; LR.world.spawn = { x: V.spawn.x, z: V.spawn.z, yaw: 70 };
  },
  tour: [{ x: -150, z: 118, look: [-96, 104] }, { x: -118, z: 127, look: [-22, 80], pull: 0.4 }, { x: -72, z: 130, look: [-22, 60] }, { x: -36, z: 134, look: [-22, 50], pull: 0.7 }, { x: -22, z: 112, look: [-22, 20], pull: 0.8 }, { x: -22, z: 70, look: [-60, 20], pull: 0.7 }, { x: -22.5, z: 44, look: [-70, 10], pull: 0.8 },
    { x: -21, z: 78, look: [34, 122], pull: 0.5 }, { x: -18, z: 116, look: [34, 122] }, { x: 6, z: 126, look: [34, 122], pull: 0.7 }, { x: 24, z: 134, look: [40, 122], pull: 0.8 }, { x: 52, z: 132, look: [122, 84] }, { x: 74, z: 112, look: [122, 84], pull: 0.7 }, { x: 60, z: 128, look: [-20, 124] }, { x: -30, z: 138, look: [-96, 104] }, { x: -100, z: 131, look: [-150, 118] }],
  views: [{ name: 'arrival', cam: [-150, 118, 70, 2] }, { name: 'edge', cam: [-22.5, 42, -40, -4] }, { name: 'under', cam: [-40, 34, 60, 22] }, { name: 'hall', cam: [16, 136, 60, 6] }, { name: 'tarn', cam: [84, 104, 62, 2] }, { name: 'lookout', cam: [-96, 104, 20, -6] }, { name: 'ford', cam: [56, 8, 20, 4] }, { name: 'yard', cam: [78, -90, 130, 8] }],
});
