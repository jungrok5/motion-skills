// ⑧ start: the build, the hour the page opens on, the tour (way-points and what each stretch looks at), named views
LR.start({
  weather: { tod: 17.2, weather: 'clear' },
  build: async () => { R.build(); },
  tour: [{ x: -30, z: 26, look: [-12, 6] }, { x: -16, z: 14, look: [-12, 6], pull: 0.6 }, { x: -6, z: 8.5, look: [14, -10], pull: 0.5 }, { x: 2, z: 3, look: [14, -10], pull: 0.7 }, { x: 4, z: 9, look: [-3, 9.6], pull: 0.6 }, { x: 1, z: 14.8, look: [-3, 9.6], pull: 0.5 }, { x: -8, z: 16.5, look: [-12, 6], pull: 0.4 }, { x: -24, z: 24, look: [-60, 50], pull: 0.2 }],
  views: [{ name: 'arrival', cam: [-26, 22, 42, 2] }, { name: 'cabin', cam: [-4, 13, -58, 3] }, { name: 'tarn', cam: [1, 4, 58, -3] }, { name: 'fire', cam: [-0.5, 12.5, -42, -6] }],
});
