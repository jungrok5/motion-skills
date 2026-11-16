// ⑧ start: the build, the hour the page opens on, the tour (way-points and what each stretch looks at), named views
LR.start({
  // ⓪ the scans (assets.json → fetch-assets.mjs → assets/).  On the live page nothing here is waited for but the
  //    leaf atlases: the walk begins on the generated place and each scan arrives in it.
  materials: async (LR) => { const P = LR.mat.photo, MD = LR.models;
    // surfaces: a photographed surface takes the place of the generated recipe of the same name at its real size;
    // { gain, tint, rough, normal, tile, pom } tune it — look at ?view=mats
    P('planks', 'raw_plank_wall', { gain: 0.8 }); P('thatch', 'thatch_roof_angled', { gain: 1.25 }); P('rubble', 'stacked_stone_wall', { pom: 0.04 }); P('boards', 'wood_planks_grey');
    P('litter', 'forest_ground_04'); P('dirt', 'brown_mud_dry', { tile: 2.6 }); P('gravel', 'river_small_rocks'); P('barkpine', 'pine_bark'); P('bark', 'pine_bark');
    P('rock', 'rock_pitted_mossy');
    // objects and plants: instanced, with levels of detail made at load.  A big scan wears a tiling surface of the
    // engine near the eye (detail); a plant is cut out, moves in the wind and turns with the season (plant)
    await MD.load(['stone_fire_pit', 'tree_stump_01', 'wine_barrel_01', { id: 'boulder_01', detail: 'rock', moss: 0.9, tint: [0.8, 0.84, 0.86] }, { id: 'fern_02', plant: true }]);
    // stand-ins: every barrel, stump and rock the kit and the builders place is drawn from a scan
    MD.stand('barrel', 'wine_barrel_01'); MD.stand('stump', 'tree_stump_01'); MD.stand('rock', 'boulder_01', { min: 0.5 });
    // leaves: the trees are grown from numbers, their sprays are painted from photographs — a box in the atlas for
    // each piece ([u0, v0, u1, v1, turn]; references/ASSETS.md)
    await LR.atlas.load(['fir_tree_01:twig', 'pine_tree_01:twig', 'fern_02']);
    LR.flora.defs.spruce.leaf.scan = { atlas: 'fir_tree_01:twig', kind: 'spray', parts: [[0.306, 0.399, 0.645, 0.775], [0.635, 0.452, 0.953, 0.830]], own: 0.45 };
    LR.flora.defs.pine.leaf.scan = { atlas: 'pine_tree_01:twig', parts: [[0.035, 0.044, 0.195, 0.432], [0.651, 0.342, 0.937, 0.518, 1]], size: 1.7, own: 0.5 };
    LR.grass.scan = { frond: ['fern_02', [0.089, 0.111, 0.235, 0.948, 0]] }; },
  weather: { tod: 17.2, weather: 'clear' },
  build: async () => { R.build(); },
  tour: [{ x: -30, z: 26, look: [-12, 6] }, { x: -16, z: 14, look: [-12, 6], pull: 0.6 }, { x: -6, z: 8.5, look: [14, -10], pull: 0.5 }, { x: 2, z: 3, look: [14, -10], pull: 0.7 }, { x: 4, z: 9, look: [-3, 9.6], pull: 0.6 }, { x: 1, z: 14.8, look: [-3, 9.6], pull: 0.5 }, { x: -8, z: 16.5, look: [-12, 6], pull: 0.4 }, { x: -24, z: 24, look: [-60, 50], pull: 0.2 }],
  views: [{ name: 'arrival', cam: [-26, 22, 42, 2] }, { name: 'cabin', cam: [-4, 13, -58, 3] }, { name: 'tarn', cam: [1, 4, 58, -3] }, { name: 'fire', cam: [-0.5, 12.5, -42, -6] }],
});
