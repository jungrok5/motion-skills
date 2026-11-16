// ⑧ start: the build, the hour the page opens on, the tour (way-points and what each stretch looks at), named views
LR.start({
  // ⓪ the scans (assets.json → fetch-assets.mjs → assets/): a photographed surface takes the place of the generated
  //    recipe of the same name at its real size; { gain, tint, rough, normal, tile, pom } tune it — look at ?view=mats.
  //    Scanned objects are read here too, before the materials are baked, and stand in for generated props.
  materials: async (LR) => { const P = LR.mat.photo, MD = LR.models;
    P('planks', 'raw_plank_wall', { gain: 0.8 }); P('thatch', 'thatch_roof_angled', { gain: 1.25 }); P('rubble', 'stacked_stone_wall', { pom: 0.04 }); P('boards', 'wood_planks_grey');
    P('litter', 'forest_ground_04'); P('dirt', 'brown_mud_dry', { tile: 2.6 }); P('gravel', 'river_small_rocks'); P('barkpine', 'pine_bark'); P('bark', 'pine_bark');
    P('rock', 'rock_pitted_mossy');
    await MD.load(['stone_fire_pit', 'tree_stump_01', 'wine_barrel_01']);
    MD.stand('barrel', 'wine_barrel_01'); MD.stand('stump', 'tree_stump_01'); },
  weather: { tod: 17.2, weather: 'clear' },
  build: async () => { R.build(); },
  tour: [{ x: -30, z: 26, look: [-12, 6] }, { x: -16, z: 14, look: [-12, 6], pull: 0.6 }, { x: -6, z: 8.5, look: [14, -10], pull: 0.5 }, { x: 2, z: 3, look: [14, -10], pull: 0.7 }, { x: 4, z: 9, look: [-3, 9.6], pull: 0.6 }, { x: 1, z: 14.8, look: [-3, 9.6], pull: 0.5 }, { x: -8, z: 16.5, look: [-12, 6], pull: 0.4 }, { x: -24, z: 24, look: [-60, 50], pull: 0.2 }],
  views: [{ name: 'arrival', cam: [-26, 22, 42, 2] }, { name: 'cabin', cam: [-4, 13, -58, 3] }, { name: 'tarn', cam: [1, 4, 58, -3] }, { name: 'fire', cam: [-0.5, 12.5, -42, -6] }],
});
