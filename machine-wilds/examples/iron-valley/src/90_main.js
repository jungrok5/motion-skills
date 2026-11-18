// 쇠울림 골짜기 · start
LR.start({
  materials: async (LR) => {},
  weather: { tod: 19.4, weather: 'mist' },
  build: async () => { V.land(); V.machines(); LR.mech.plan(); LR.mech.start(); LR.world.radius = 215; LR.world.spawn = { x: V.spawn.x, z: V.spawn.z, yaw: 60 }; },
  tour: [{ x: -150, z: 118, look: [-74, 28] }, { x: -112, z: 128, look: [-74, 28] }, { x: -70, z: 126, look: [0, 20] }, { x: -30, z: 112, look: [34, 118] }],
  views: [{ name: 'arrival', cam: [-150, 118, 60, 2] }],
});
