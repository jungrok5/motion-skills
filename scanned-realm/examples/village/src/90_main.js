// 은여울 마을 · start.  Land first, then the town on it, then the details, then what grows.
LR.start({
  // scanned surfaces (Poly Haven, CC0; fetched by fetch-assets.mjs) take the place of the generated ones of the same name
  // scanned surfaces (assets.json → fetch-assets.mjs): each replaces the generated recipe of the same name, at its real size
  materials: async (LR) => { const P = LR.mat.photo, MD = LR.models;
    P('cobble', 'cobblestone_floor_04', { pom: 0.035, gain: 0.6 }); P('rubble', 'rustic_stone_wall', { pom: 0.05 }); P('ashlar', 'white_sandstone_blocks_02', { pom: 0.02, gain: 0.82 });
    P('plaster', 'white_rough_plaster', { gain: 1.05 }); P('tiles', 'clay_roof_tiles_02', { pom: 0.02 }); P('slate', 'roof_slates_02', { pom: 0.012 }); P('thatch', 'reed_roof_03', { gain: 1.15 });
    P('planks', 'weathered_brown_planks', { gain: 1.2 }); P('timber', 'rough_wood', { gain: 0.75, tile: 1.2 }); P('brick', 'medieval_red_brick');
    P('dirt', 'stony_dirt_path', { tile: 3.0 }); P('litter', 'leaves_forest_ground', { tile: 2.4 }); P('gravel', 'gravel_floor_02'); P('rock', 'mossy_rock'); P('barkoak', 'bark_brown_02', { tile: 1.4 }); P('bark', 'bark_brown_02', { tile: 1.2 });
    P('barkpine', 'pine_bark', { tile: 1.6 }); P('barkspruce', 'knotted_pine_bark', { tile: 1.5, like: 'barkpine' }); P('barksmooth', 'chinese_hackberry_bark', { tile: 1.6 }); LR.flora.defs.spruce.bark = 'barkspruce';
    // scanned objects.  Barrels, crates, stumps and the bigger rocks of the kit are drawn from scans; the rest are placed by name
    // (30_details.js) or by the kits below.  Big scans wear the engine's tiling rock near the eye; small things throw no shadow of their own.
    await MD.load(['wine_barrel_01', 'wooden_crate_02', 'wooden_bucket_01', 'stone_fire_pit', 'tree_stump_01', 'dead_tree_trunk', { id: 'dry_branches_medium_01', far: 45 },
      { id: 'boulder_01', detail: 'rock', moss: 0.9, tint: [0.8, 0.84, 0.86] }, ...['rock_face_01', 'rock_face_02'].map((id) => ({ id, detail: 'rock', moss: 0.9 })),
      'WoodenTable_01', 'painted_wooden_table', 'painted_wooden_bench', 'painted_wooden_stool', 'small_wooden_table_01', 'dining_table', 'wooden_crate_01', 'wooden_bucket_02', 'wicker_basket_01', 'wicker_basket_02',
      'planter_box_01', 'wooden_ladder_02', 'spinning_wheel_01', 'gothic_statue', 'ceramic_pot', 'kite_shield', { id: 'brass_pot_01', metal: 0.85 }, { id: 'metal_jug', metal: 0.6 }, { id: 'watering_can_metal_01', metal: 0.6 },
      ...['cross_pein_hammer', 'hatchet', 'picke_dirty_01', 'rusted_spade_01', 'wooden_axe', 'croissant', 'sweet_potato', 'yellow_onion', 'lemon', 'food_apple_01', 'hamburger_buns'].map((id) => ({ id, shadow: 'none' })),
      ...['fern_02', 'weed_plant_02', 'nettle_plant', 'shrub_03', 'dandelion_01', 'periwinkle_plant', 'flower_ursinia', 'flower_empodium', 'grass_medium_02', 'celandine_01'].map((id) => ({ id, plant: true })),
      // scanned structures: a pier, the pieces of a fort (its walls tile: the engine's rock gives them grain near the eye), a wrought-iron gate, a castle door
      { id: 'modular_wooden_pier', moss: 0.3 }, { id: 'modular_fort_01', moss: 0.85, detail: 'rock', detailTile: 2.4, detailReach: 24, detailColor: 0.6 }, { id: 'large_iron_gate', metal: 0.8 }, 'large_castle_door',
      // whole scanned trees (heavy: left out on a phone and on the lowest quality — 40_plants.js grows the engine's own there), last, so they arrive last
      { id: 'fir_sapling', tree: true, turn: 0 }, { id: 'pine_sapling_small', tree: true, turn: 0 }, { id: 'searsia_lucida', tree: true, turn: 0.25, wind: 0.2 }, { id: 'island_tree_02', tree: true, fall: 0.9, leafGain: 1.45, leafTint: [0.96, 1.0, 0.8] }]);
    // photographed leaves, twigs and fronds: the trees the engine grows and its ground cover are painted from these
    await LR.atlas.load(['island_tree_02:leaves', 'fir_tree_01:twig', 'pine_tree_01:twig', 'shrub_03', 'fern_02', 'weed_plant_02']);
    { const D = LR.flora.defs, isl = 'island_tree_02:leaves', ISL = [[0.165, 0.021, 0.337, 0.392], [0.361, 0.031, 0.482, 0.361], [0.518, 0.050, 0.648, 0.362], [0.694, 0.021, 0.815, 0.413], [0.018, 0.630, 0.182, 1.000], [0.217, 0.577, 0.354, 1.000], [0.423, 0.604, 0.562, 1.000]];
      const SHR = [[0.054, 0.041, 0.264, 0.295], [0.317, 0.121, 0.510, 0.349], [0.031, 0.312, 0.311, 0.647], [0.422, 0.380, 0.590, 0.591], [0.478, 0.604, 0.749, 0.933], [0.050, 0.675, 0.242, 0.901]];
      D.oak.leaf.scan = { atlas: isl, parts: ISL, cut: 'oak', size: 1.25, own: 0.3 };
      D.beech.leaf.scan = { atlas: isl, parts: [ISL[0], ISL[2], ISL[4], ISL[5]], size: 1.5, own: 0.3 };
      D.bush.leaf.scan = { atlas: isl, parts: [ISL[1], ISL[3], ISL[6], ISL[5]], size: 1.3, own: 0.4 }; D.bush.leaf.size = [0.36, 0.58]; D.bush.leaf.perTwig = 11;     // smaller sprays, more of them: a bush of big cards is a cabbage
      D.birch.leaf.scan = { atlas: 'shrub_03', parts: SHR, size: 1.35, own: 0.3 };
      D.climber.leaf.scan = { atlas: 'shrub_03', parts: [SHR[0], SHR[2], SHR[4], SHR[5]], size: 1.3, own: 0.3 };
      D.spruce.leaf.scan = { atlas: 'fir_tree_01:twig', kind: 'spray', parts: [[0.306, 0.399, 0.645, 0.775], [0.635, 0.452, 0.953, 0.830]], own: 0.45 };
      D.pine.leaf.scan = { atlas: 'pine_tree_01:twig', parts: [[0.035, 0.044, 0.195, 0.432], [0.651, 0.342, 0.937, 0.518, 1]], size: 1.7, own: 0.5 };
      LR.grass.scan = { frond: ['fern_02', [0.089, 0.111, 0.235, 0.948, 0]], leaf: ['weed_plant_02', [0.143, 0.488, 0.745, 0.778, 3]] }; }
    MD.stand('barrel', 'wine_barrel_01'); MD.stand('crate', 'wooden_crate_02', { h: 0.72 }); MD.stand('stump', 'tree_stump_01'); MD.stand('rock', 'boulder_01', { min: 0.5 });
    // what the market sells, and what stands about a yard
    MD.set('goods:fruit', [{ id: 'food_apple_01', s: [0.8, 1.05], n: 9 }, { id: 'lemon', s: [0.9, 1.15], n: 9 }, { id: 'food_apple_01', s: [0.75, 1.0], n: 8 }]);
    MD.set('goods:bread', [{ id: 'croissant', s: [0.9, 1.15], n: 5, tumble: 0.25 }, { id: 'hamburger_buns#0', s: [1.1, 1.4], n: 6, tumble: 0.2 }, { id: 'hamburger_buns#2', s: [1.1, 1.4], n: 6, tumble: 0.2 }]);
    MD.set('goods:greens', [{ id: 'yellow_onion', s: [0.9, 1.2], n: 8 }, { id: 'sweet_potato', s: [1.0, 1.5], n: 7 }]);
    MD.set('goods:pots', [{ id: 'ceramic_pot', s: [0.5, 0.68], big: true }, { id: 'brass_pot_01', s: [0.75, 1.0], big: true }, { id: 'metal_jug', s: [0.7, 0.9], big: true }]);
    MD.set('yard', [{ id: 'wooden_bucket_02', s: [0.7, 0.9] }, { id: 'watering_can_metal_01', s: [1.0, 1.2] }, { id: 'wicker_basket_01', s: [1.2, 1.6] }, { id: 'wicker_basket_02#0', s: [1.5, 2.0] }, { id: 'metal_jug', s: [1.4, 1.8] },
      { id: 'rusted_spade_01', s: [1.0, 1.1], sink: 0.17, lean: 0.1 }, { id: 'planter_box_01', s: [0.8, 1.0], spin: false, solid: 0.6 }, { id: 'wooden_bucket_01', s: [0.9, 1.1] }]);
    // what grows at the foot of a wall
    MD.set('weeds', [{ id: 'nettle_plant#0', s: [2.2, 3.4] }, { id: 'nettle_plant#1', s: [2.4, 3.6] }, { id: 'nettle_plant#4', s: [1.8, 2.8] }, { id: 'nettle_plant#5', s: [1.8, 2.8] }, { id: 'weed_plant_02#0', s: [1.2, 2.0] }, { id: 'weed_plant_02#1', s: [1.3, 2.2] },
      { id: 'weed_plant_02#3', s: [1.4, 2.4] }, { id: 'dandelion_01#2', s: [1.4, 2.2] }, { id: 'dandelion_01#3', s: [1.5, 2.4] }, { id: 'fern_02#2', s: [0.9, 1.4] }, { id: 'fern_02#3', s: [0.9, 1.4] }, { id: 'shrub_03#2', s: [1.2, 1.8] }]); },
  strings: V.strings,
  weather: { tod: 17.6, weather: 'clear' },
  // named viewpoints for stills and checks: cam = [x, z, compass yaw°, pitch°, (y)]
  views: [
    { name: 'gate', cam: [0.5, 92, 0, 3] }, { name: 'lane', cam: [0.5, 60, 0, 1] }, { name: 'square', cam: [3, 17.5, -6, 4] }, { name: 'inn', cam: [3.5, -6.5, -42, 9] },
    { name: 'smithy', cam: [17.5, 1.5, 62, 3] }, { name: 'mill', cam: [57, 27, -4, 2] }, { name: 'bridge', cam: [12.5, -30.5, -34, 0] }, { name: 'meadow', cam: [-3, -62, -6, -3, undefined] },
    { name: 'chapel', cam: [-86, 24, 58, 8] }, { name: 'farm', cam: [-36, 36, -128, 2] }, { name: 'pond', cam: [41, 50, 84, -3] }, { name: 'woods', cam: [-62, -100.5, 82, 5] }, { name: 'glade', cam: [-100, -93, -52, 6] },
    { name: 'fort', cam: [-13.5, -98, -8, 7] }, { name: 'pier', cam: [38.5, 57, 102, -3] },
  ],
  build: async (LR) => {
    V.land(); LR.progress(0.42, '집을 짓는 중'); await LR.breath();
    V.town(); LR.progress(0.6, '살림을 놓는 중'); await LR.breath();
    V.details(); LR.progress(0.68, '나무를 심는 중'); await LR.breath();
    V.plants();
    LR.world.spawn = { x: 0.5, z: 88, yaw: 0 };
  },
  // the walk: in at the gate, up the lane, round the square, to the smithy and the mill, over the bridge into the
  // meadow and back, out to the chapel, home by the farm and the footpath between two houses
  tour: [
    { x: 0.5, z: 88, look: [0, 40] }, { x: 0.8, z: 64, look: [0, 20] }, { x: -0.2, z: 40, look: [0, 0], pull: 0.4 }, { x: 1.5, z: 19, look: [0, -4], pull: 0.5 },
    { x: 3.6, z: 12, look: [-11, -24], pull: 0.6 }, { x: 6.2, z: 5.2, look: [-11, -24], pull: 0.6 }, { x: 5, z: -8.5, look: [-12, -25], pull: 0.6 }, { x: 16, z: -6.5, look: [29, -4], pull: 0.7 }, { x: 19.5, z: 3.5, look: [30, -5], pull: 0.6 },
    { x: 30, z: 8.5, look: [56, 13], pull: 0.4 }, { x: 42.6, z: 14.5, look: [58, 13], pull: 0.7 }, { x: 47.2, z: 23.4, look: [62, 48], pull: 0.6 }, { x: 36, z: 10.5, look: [0, 0], pull: 0.3 },
    { x: 23, z: 5.6, look: [0, 0], pull: 0.3 }, { x: 16, z: -4.5, look: [3, -40], pull: 0.3 }, { x: 2.6, z: -24, look: [3, -41], pull: 0.3 }, { x: 3, z: -35, look: [3, -70], pull: 0.4 }, { x: 3, z: -47.5, look: [0, -86], pull: 0.5 },
    { x: 0, z: -60, look: [1, -85], pull: 0.7 }, { x: -12, z: -72, look: [-9, -118], pull: 0.6 },
    // up the path to the old fort, to its gate, along the wall to the tower, and back across the meadow to the wood
    { x: -13.8, z: -89, look: [-9, -122], pull: 0.8, pitch: 0.06 }, { x: -11.2, z: -104, look: [-9, -126], pull: 0.9, pitch: 0.12 }, { x: -11, z: -112.5, look: [-22, -121], pull: 0.8, pitch: 0.14 }, { x: -20.5, z: -99.5, look: [-52, -97], pull: 0.4 }, { x: -38, z: -93, look: [-76, -103], pull: 0.3 },
    { x: -52, z: -97, look: [-97, -95], pull: 0.3 }, { x: -76, z: -103, look: [-110, -82], pull: 0.4 }, { x: -97, z: -95.5, look: [-110, -82], pull: 0.6 }, { x: -104.6, z: -87.2, look: [-112, -80], pull: 0.5 },
    { x: -98, z: -93.5, look: [-52, -97], pull: 0.3 }, { x: -76, z: -101.5, look: [-30, -84], pull: 0.3 }, { x: -52, z: -95.5, look: [-6, -80], pull: 0.4 }, { x: -30, z: -82.5, look: [1, -85], pull: 0.5 }, { x: -6, z: -64, look: [3, -41], pull: 0.3 }, { x: 2.6, z: -48, look: [0, -20], pull: 0.3 },
    { x: 3, z: -35, look: [0, 0], pull: 0.3 }, { x: 1, z: -14.5, look: [-25, -8], pull: 0.4 }, { x: -5.5, z: -7.5, look: [-25, -8], pull: 0.4 }, { x: -9, z: 0.6, look: [-40, 3], pull: 0.4 }, { x: -17, z: 1.6, look: [-60, 6], pull: 0.3 }, { x: -29.5, z: 2.6, look: [-60, 6], pull: 0.8, pitch: 0.1 },
    { x: -32, z: 10.5, look: [-60, 6], pull: 0.75, pitch: 0.07 }, { x: -35, z: 20.5, look: [-56, 52], pull: 0.4 }, { x: -41, z: 36, look: [-58, 52], pull: 0.6 }, { x: -31, z: 45, look: [-11, 55], pull: 0.3 },
    { x: -21, z: 53, look: [0, 56], pull: 0.3 }, { x: -11, z: 55.2, look: [2, 58], pull: 0.4 }, { x: -1.5, z: 59.5, look: [0, 100], pull: 0.4 }, { x: 0.3, z: 74, look: [0, 100], pull: 0.4 },
  ],
});
