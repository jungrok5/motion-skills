// 은여울 마을 · start.  Land first, then the town on it, then the details, then what grows.
LR.start({
  strings: V.strings,
  weather: { tod: 17.6, weather: 'clear' },
  // named viewpoints for stills and checks: cam = [x, z, compass yaw°, pitch°, (y)]
  views: [
    { name: 'gate', cam: [0.5, 92, 0, 3] }, { name: 'lane', cam: [0.5, 60, 0, 1] }, { name: 'square', cam: [3, 17.5, -6, 4] }, { name: 'inn', cam: [3.5, -6.5, -42, 9] },
    { name: 'smithy', cam: [17.5, 1.5, 62, 3] }, { name: 'mill', cam: [43, 20.5, 62, 2] }, { name: 'bridge', cam: [12.5, -30.5, -34, 0] }, { name: 'meadow', cam: [-3, -62, -6, -3, undefined] },
    { name: 'chapel', cam: [-40, 5, -87, 10] }, { name: 'farm', cam: [-36, 36, -128, 2] }, { name: 'pond', cam: [41, 50, 84, -3] }, { name: 'woods', cam: [-62, -100.5, 82, 5] }, { name: 'glade', cam: [-100, -93, -52, 6] },
  ],
  build: async (LR) => {
    V.land(); LR.progress(0.42, '집을 짓는 중'); await LR.breath();
    V.town(); LR.progress(0.6, '살림을 놓는 중'); await LR.breath();
    V.details(); LR.progress(0.68, '나무를 심는 중'); await LR.breath();
    V.plants();
    LR.world.spawn = { x: 0.5, z: 88, yaw: 0 };
  },
  // the walk: in at the gate, up the lane, round the square, to the smithy and the mill, over the bridge into the
  // meadow and back, out to the chapel, home by the farm
  tour: [
    { x: 0.5, z: 88, look: [0, 40] }, { x: 0.8, z: 64, look: [0, 20] }, { x: -0.2, z: 40, look: [0, 0], pull: 0.4 }, { x: 1.5, z: 19, look: [0, -4], pull: 0.5 },
    { x: 9.5, z: 4.5, look: [-11, -24], pull: 0.6 }, { x: 5, z: -8.5, look: [-12, -25], pull: 0.6 }, { x: 16, z: -6.5, look: [29, -4], pull: 0.7 }, { x: 19.5, z: 3.5, look: [30, -5], pull: 0.6 },
    { x: 30, z: 8.5, look: [56, 13], pull: 0.4 }, { x: 43, z: 13.5, look: [58, 13], pull: 0.7 }, { x: 46.5, z: 21, look: [62, 48], pull: 0.6 }, { x: 36, z: 10.5, look: [0, 0], pull: 0.3 },
    { x: 17.5, z: -9.5, look: [3, -40], pull: 0.3 }, { x: 5, z: -24, look: [3, -41], pull: 0.3 }, { x: 3, z: -35, look: [3, -70], pull: 0.4 }, { x: 3, z: -47.5, look: [0, -86], pull: 0.5 },
    { x: 0, z: -60, look: [1, -85], pull: 0.7 }, { x: -12, z: -72, look: [1, -85], pull: 0.7 }, { x: -30, z: -84, look: [-76, -103], pull: 0.3 }, { x: -52, z: -97, look: [-97, -95], pull: 0.3 }, { x: -76, z: -103, look: [-110, -82], pull: 0.4 }, { x: -97, z: -95.5, look: [-110, -82], pull: 0.6 }, { x: -107, z: -84, look: [-112, -80], pull: 0.5 },
    { x: -98, z: -93.5, look: [-52, -97], pull: 0.3 }, { x: -76, z: -101.5, look: [-30, -84], pull: 0.3 }, { x: -52, z: -95.5, look: [-6, -80], pull: 0.4 }, { x: -30, z: -82.5, look: [1, -85], pull: 0.5 }, { x: -6, z: -64, look: [3, -41], pull: 0.3 }, { x: 2.6, z: -48, look: [0, -20], pull: 0.3 },
    { x: 3, z: -35, look: [0, 0], pull: 0.3 }, { x: 1, z: -14.5, look: [-25, -8], pull: 0.4 }, { x: -7, z: -9, look: [-25, -8], pull: 0.4 }, { x: -16, z: -1, look: [-60, 6], pull: 0.3 }, { x: -34, z: 2, look: [-60, 6], pull: 0.6 },
    { x: -46, z: 4.5, look: [-60, 6], pull: 0.8, pitch: 0.12 }, { x: -33, z: 16, look: [-56, 52], pull: 0.4 }, { x: -41, z: 36, look: [-58, 52], pull: 0.6 }, { x: -30, z: 44, look: [0, 60], pull: 0.2 },
    { x: -19, z: 56, look: [0, 70], pull: 0.2 }, { x: -3.5, z: 70, look: [0, 100], pull: 0.4 },
  ],
});
