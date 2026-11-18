// start: the scans by name, the hour and weather the page opens on, the build, the tour and the named views
LR.start({
  materials: async (LR) => { const P = LR.mat.photo, MD = LR.models;
    P('rock', 'mossy_rock'); P('litter', 'forest_leaves_03', { tile: 2.3 }); P('dirt', 'mud_forest', { tile: 2.4 }); P('gravel', 'river_small_rocks'); P('barkpine', 'pine_bark'); P('bark', 'pine_bark'); P('paintmetal', 'rusty_metal_02', { gain: 0.9 });
    await MD.load([{ id: 'boulder_01', detail: 'rock', moss: 0.9 }, { id: 'rock_moss_set_02', moss: 0.6 }, { id: 'fern_02', plant: true }]); MD.stand('rock', 'boulder_01', { min: 0.5 });
    await LR.atlas.load(['fir_tree_01:twig', 'pine_tree_01:twig', 'fern_02']);
    LR.flora.defs.spruce.leaf.scan = { atlas: 'fir_tree_01:twig', kind: 'spray', parts: [[0.306, 0.399, 0.645, 0.775], [0.635, 0.452, 0.953, 0.830]], own: 0.45 };
    LR.flora.defs.pine.leaf.scan = { atlas: 'pine_tree_01:twig', parts: [[0.035, 0.044, 0.195, 0.432], [0.651, 0.342, 0.937, 0.518, 1]], size: 1.7, own: 0.5 };
    LR.grass.scan = { frond: ['fern_02', [0.089, 0.111, 0.235, 0.948, 0]] }; },
  weather: { tod: 5.9, weather: 'mist' },
  round: [{ t: 0, weather: 'mist' }, { t: 30, tod: 8 }, { t: 60, weather: 'clear', tod: 12 }, { t: 90, weather: 'mist', tod: 19.5 }, { t: 120, tod: 23 }, { t: 160, tod: 5.9 }, { t: 180, end: true }],
  build: async () => { R.build(); },
  tour: [{ x: 4, z: 92, look: [0, 40] }, { x: 9, z: 64, look: [0, 0], pull: 0.7 }, { x: 21, z: 40, look: [0, 0], pull: 0.8 }, { x: 25, z: 22, look: [7, -5], pull: 0.8 }, { x: 19, z: 10, look: [7, -5], pull: 0.9 }, { x: 25, z: 24, look: [40, 30] }, { x: 12, z: 62, look: [4, 92] }],
  views: [{ name: 'road', cam: [4, 92, 0, 2] }, { name: 'landing', cam: [19, 10, -40, 8] }, { name: 'rim', cam: [30, 52, -60, 10] }],
});
