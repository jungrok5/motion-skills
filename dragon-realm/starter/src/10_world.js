// Tarn Wyrm — ① the land: a small lake between two rock massifs.  x = right, −z = away from the lens, water at y = 0.
const World = {};
{
  const { smooth, fbm2, ridge2 } = DR;
  World.shore = (x, z) => (Math.hypot(x / 70, (z + 40) / 52) - 1 - 0.1 * DR.noise2(x * 0.02, z * 0.02, 3)) * 60;   // metres to the shore, negative in the water
  World.height = (x, z) => { const d = World.shore(x, z); if (d < 0) return Math.max(-8, d * 0.25) - 0.2;
    return smooth(0, 8, d) * 1.2 + d * 0.06 + smooth(60, 240, Math.abs(x) + fbm2(x * 0.006, z * 0.006, 4, 5) * 40) * (40 + 80 * ridge2(x * 0.004, z * 0.004, 5, 7)) + smooth(-80, -260, z) * 70 + fbm2(x * 0.02, z * 0.02, 4, 9) * 2 * smooth(3, 30, d); };
  World.build = (scene) => {
    const land = (World.land = DR.land.terrain({ size: [1800, 1800], center: [0, -200], res: 200, focus: { at: [0, -30], power: 2.2 }, height: World.height, waterY: 0,
      palette: { grass: '#5c6a3a', grass2: '#8a7d45', litter: '#5a4630', gravel: '#8d877c', rock: '#7d7b78', rock2: '#5f5e60', canopy: '#27402a', canopy2: '#4f5a2c', canopy3: '#7a6a30' } }));
    scene.add(land.mesh);
    const mat = DR.land.rockMat({ rock: '#9a9690', rock2: '#6f6e72', moss: '#3f5230' }, { waterY: 0 });
    // ② the rock: each massif is a displaced surface of revolution — see references/KIT.md for every option
    World.peaks = [{ at: [34, -6, -96], height: 96, radius: 30, seed: 4, nu: 130, nv: 170, amp: 4 }, { at: [-150, 10, -230], height: 190, radius: 70, seed: 9, nu: 130, nv: 170, amp: 6 }, { at: [170, 14, -260], height: 160, radius: 64, seed: 12, nu: 110, nv: 150, amp: 6 }]
      .map((p) => { const pk = DR.land.peak(p), m = new THREE.Mesh(pk.geometry, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return pk; });
    World.water = DR.water({ level: 0, bounds: [-120, -130, 120, 40], height: World.height, palette: { shallow: '#3f6660', deep: '#08222a' } });
    scene.add(World.water.mesh);
  };
}
