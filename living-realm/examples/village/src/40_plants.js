// 은여울 마을 · what grows.  The old oak at the corner of the square, another alone in the flower meadow, birches along
// the brook, beech and oak woods with spruce and pine higher up, bushes at the edges; far country as painted forest.
{
  const F = LR.flora, wet = (x, z) => LR.water.levelAt(x, z) > LR.land.h(x, z) - 0.35;
  const clear = (x, z, pad = 0.9) => { for (const s of LR.world.solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return false; } else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; if (Math.abs(lx) < s.hx + pad && Math.abs(lz) < s.hz + pad) return false; } } return true; };
  const onWay = (x, z) => LR.land.coverAt('dirt', x, z) > 0.25 || LR.land.coverAt('paved', x, z) > 0.25;
  const avoid = (x, z) => wet(x, z) || onWay(x, z) || !clear(x, z, 1.6);
  V.plants = () => {
    // the named trees
    F.plant('oak', -17.5, 17.5, { scale: 1.3, hero: true, yaw: 0.6, variant: 0 });
    F.plant('oak', V.meadow.x + 7, V.meadow.z - 3, { scale: 1.45, hero: true, yaw: 2.1, variant: 1 });
    F.plant('oak', V.chapel.x + 14, V.chapel.z + 12, { scale: 1.1, hero: true, variant: 2 });
    F.plant('beech', 31, 31, { scale: 1.05, hero: true }); F.plant('birch', -32, -22, { scale: 1.1 }); F.plant('birch', -35, -24.5, { scale: 0.9 }); F.plant('beech', -46, 30, { scale: 1.0 });
    // birches and bushes keep to the water
    const near = (x, z, d) => { let m = 1e9; const lines = [V.brook3, V.out3]; for (const L of lines) for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = LR.sat(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } m = Math.min(m, Math.abs(Math.hypot(x - V.pond.x, z - V.pond.z) - V.pond.r)); return m < d; };
    F.scatter({ species: [['birch', 3], ['bush', 2], ['beech', 0.5]], area: [-150, -110, 150, 150], spacing: 7, seed: 'brook', density: (x, z) => (near(x, z, 9) && !near(x, z, 3.2) ? 0.42 : 0) * (Math.hypot(x - V.bridge.x, z - V.bridge.z) > 12 ? 1 : 0) * (Math.hypot(x - V.wheel[0], z - V.wheel[1]) > 11 ? 1 : 0), avoid, scale: [0.75, 1.15] });
    // the woods
    F.scatter({ species: [['beech', 4], ['oak', 2.4], ['birch', 1.4], ['spruce', 1.6], ['pine', 1.2]], area: [-250, -250, 250, 250], spacing: 7.0, seed: 'woods', density: (x, z) => LR.sm(0.25, 0.8, V.woods(x, z)) * (0.55 + 0.4 * LR.sm(0.35, 0.65, LR.fbm(x * 0.045 + 4, z * 0.045 + 9, 2))), avoid, scale: [0.95, 1.45] });
    F.scatter({ species: [['bush', 1]], area: [-170, -170, 170, 170], spacing: 6, seed: 'edge', density: (x, z) => { const w = V.woods(x, z); return LR.sm(0.12, 0.4, w) * LR.sm(0.8, 0.45, w) * 0.5; }, avoid, scale: [0.8, 1.4] });
    // a few trees among the houses and round the farm
    F.scatter({ species: [['beech', 1], ['birch', 1], ['oak', 0.6], ['bush', 1.6]], area: [-84, -64, 84, 96], spacing: 11, seed: 'town', density: (x, z) => (V.woods(x, z) < 0.1 && Math.hypot(x, z) > 20 && LR.land.coverAt('grass', x, z) > 0.8 ? 0.2 : 0), avoid: (x, z) => avoid(x, z) || !clear(x, z, 3.2), scale: [0.7, 1.0] });
    // bushes at the corners of houses
    { const r = LR.rng('corners'); for (const hh of [...V.houses, V.baker, V.chandler, V.hall, V.cottage, V.inn]) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { if (r() > 0.4) continue; const p = hh.toW(sx * (hh.w / 2 + 0.9), sz * (hh.d / 2 + 0.9)); if (!avoid(p[0], p[1]) && clear(p[0], p[1], 0.5)) F.plant('bush', p[0], p[1], { scale: 0.6 + r() * 0.5 }); } }
    // beyond where anyone walks: painted forest standing as billboards
    F.far({ density: (x, z) => { const r = Math.hypot(x, z), h = LR.land.h(x, z); return LR.sm(0.2, 0.6, LR.noise(x * 0.004 + 3, z * 0.004 + 1) + 0.35) * LR.sm(520, 400, h) * 0.8; }, inner: 250, outer: 720, spacing: 13, species: [['beech', 3], ['oak', 2], ['spruce', 3], ['pine', 1.5]] });
    LR.grass.flowers = [{ color: '#ee6a1e', center: '#1c1408', size: 0.055, height: 0.10, share: 0.5, petals: 5 }, { color: '#f6f3e8', center: '#e2ac12', size: 0.030, height: 0.07, share: 0.28, petals: 13 },
      { color: '#5a6fd8', center: '#ded79a', size: 0.024, height: 0.04, share: 0.14, petals: 5 }, { color: '#e8c63a', center: '#8a6a10', size: 0.020, height: 0.03, share: 0.08, petals: 8 }];
  };
}
