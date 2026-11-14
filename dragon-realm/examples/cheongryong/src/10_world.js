// 청룡 · 여의주 — the land: a mountain lake under five granite peaks (the composition of the 일월오봉도 screen:
// five peaks, two waterfalls, water in front, pines at both sides).  x = right, −z = toward the peaks, water at y = 0.
const World = {};
{
  const { smooth, lerp, sat, fbm2, noise2, ridge2 } = DR;
  const LAKE = { x: 0, z: -40, rx: 84, rz: 62 };
  // signed "distance" to the shore in metres (negative inside the lake)
  World.shore = (x, z) => { const dx = (x - LAKE.x) / LAKE.rx, dz = (z - LAKE.z) / LAKE.rz, a = Math.atan2(dz, dx), r = Math.hypot(dx, dz);
    const wob = 0.10 * noise2(Math.cos(a) * 1.7 + 4, Math.sin(a) * 1.7, 3) + 0.05 * noise2(Math.cos(a) * 5 + 1, Math.sin(a) * 5, 4);
    return (r - 1 - wob) * 70; };
  const flat = (x, z, cx, cz, r, y, h, edge = 0.5) => lerp(h, y, smooth(r, r * edge, Math.hypot(x - cx, z - cz)));
  World.SITE = { nugak: [-70, 1.0, -22], jeongja: [66, 16, -52], pagoda: [-86, 4.6, -4], cam0: [4, 7.5, 96] };
  World.height = (x, z) => {
    const d = World.shore(x, z);
    if (d < 0) { const bed = Math.max(-9, d * 0.22) - 0.25 + fbm2(x * 0.05, z * 0.05, 3, 9) * 0.5 * smooth(0, -20, d); return lerp(bed, World.SITE.nugak[1], smooth(18, 13, Math.hypot(x - World.SITE.nugak[0], z - World.SITE.nugak[2]))); }   // the pavilion stands on a spit of land in the lake
    const n1 = fbm2(x * 0.006, z * 0.006, 5, 11), n2 = fbm2(x * 0.03, z * 0.03, 4, 12), rg = ridge2(x * 0.004 + 3, z * 0.004, 5, 13);
    let h = smooth(0, 9, d) * 1.3 + d * 0.05;                                       // beach, then a gentle bank
    const side = smooth(105, 250, Math.abs(x) + n1 * 40) ;                           // the valley walls left and right
    const far = smooth(-70, -210, z + n1 * 30);                                      // the saddle behind the lake
    const back = smooth(60, 260, z);                                                  // behind the viewer
    h += side * (55 + 95 * rg) + far * (26 + 50 * rg) * (1 - 0.3 * side) + back * (18 + 40 * rg);
    h += smooth(-320, -700, z) * (120 + 170 * ridge2(x * 0.0022, z * 0.0022, 5, 21));  // the far range
    h += smooth(300, 600, Math.abs(x)) * 90 * rg;
    h += (n1 * 9 + n2 * 1.6) * smooth(2, 40, d);
    // level ground for the buildings
    const S = World.SITE;
    h = flat(x, z, S.nugak[0], S.nugak[2], 19, S.nugak[1], h, 0.68);
    h = flat(x, z, S.jeongja[0], S.jeongja[2], 16, 6, h, 0.4);
    h = flat(x, z, S.pagoda[0], S.pagoda[2], 9, S.pagoda[1], h, 0.5);
    h = flat(x, z, S.cam0[0], S.cam0[2] - 6, 26, 6.2, h, 0.3);
    return h;
  };
  // the five peaks (오봉) and the crags of the far shore.  [x, z, height, radius, seed, extra]
  World.PEAKS = [
    { at: [0, -250], height: 285, radius: 86, seed: 3, top: 0.13, sharp: 1.5, lean: [6, 10], nu: 210, nv: 260, amp: 7, col: 17, bed: 34 },
    { at: [-112, -214], height: 205, radius: 62, seed: 5, top: 0.15, sharp: 1.6, lean: [-8, 6], nu: 150, nv: 200, amp: 6 },
    { at: [116, -220], height: 222, radius: 66, seed: 8, top: 0.14, sharp: 1.7, lean: [10, 4], nu: 150, nv: 200, amp: 6 },
    { at: [-214, -168], height: 150, radius: 58, seed: 12, top: 0.2, sharp: 1.9, lean: [-10, 0], nu: 120, nv: 150, amp: 5 },
    { at: [222, -176], height: 165, radius: 60, seed: 15, top: 0.18, sharp: 1.8, lean: [8, -4], nu: 120, nv: 150, amp: 5 },
    // crags on the far shore; the two waterfalls come down between them
    { at: [-78, -118], height: 62, radius: 30, seed: 21, top: 0.5, sharp: 2.6, nu: 130, nv: 110, amp: 3.2, col: 8, bed: 14, squash: 0.8 },
    { at: [0, -128], height: 78, radius: 36, seed: 23, top: 0.45, sharp: 2.4, nu: 150, nv: 130, amp: 3.6, col: 9, bed: 15, squash: 0.75 },
    { at: [80, -120], height: 58, radius: 30, seed: 25, top: 0.5, sharp: 2.6, nu: 130, nv: 110, amp: 3.2, col: 8, bed: 14, squash: 0.8 },
    { at: [66, -52], height: 16, radius: 15, seed: 31, nu: 90, nv: 56, amp: 1.2, col: 5, bed: 6, flute: 0.15, lobes: 0.15, profile: [[0, 1], [0.3, 0.84], [0.8, 0.70], [0.985, 0.64], [1, 0]] },   // the kiosk's rock: flat on top
    { at: [-128, -60], height: 70, radius: 34, seed: 33, top: 0.3, sharp: 2.0, nu: 130, nv: 120, amp: 4, lean: [-6, 0] },
    { at: [140, -70], height: 84, radius: 36, seed: 35, top: 0.28, sharp: 2.0, nu: 130, nv: 120, amp: 4, lean: [7, 0] },
  ];
  World.FALLS = [{ x: -40, z: -112, top: 46 }, { x: 41, z: -114, top: 50 }];
  World.build = (scene) => {
    const land = (World.land = DR.land.terrain({ size: [2600, 2600], center: [0, -300], res: 290, focus: { at: [0, -30], power: 2.3 }, height: World.height, waterY: 0,
      cover: (x, z, h, ny) => { const d = World.shore(x, z); return [sat((0.62 - ny) * 6 + smooth(170, 280, h) * 0.5) * (1 - 0.85 * smooth(-290, -400, z)) * (1 - 0.7 * smooth(260, 380, Math.abs(x))), sat(0.5 + fbm2(x * 0.02, z * 0.02, 3, 31) * 1.2 + smooth(20, 4, d) * 0.3), sat(1 - d / 5) * (h < 2.2 ? 1 : 0)]; },
      forestNear: 80, forestFar: 210,
      palette: { grass: '#6b6f32', grass2: '#a8853c', litter: '#70401f', soil: '#4a3524', gravel: '#9a9184', bed: '#26352f', rock: '#8f887c', rock2: '#6c675f', canopy: '#2c4526', canopy2: '#a24e26', canopy3: '#c08a2c' } }));
    scene.add(DR.prepass(land.mesh));
    const mat = DR.land.rockMat({ rock: '#beb7aa', rock2: '#8c8a88', stain: '#34302c', moss: '#46562a', soil: '#584430', lichen: '#b5b089' }, { waterY: 0 });
    // each of the five gets a ring of lower buttress spires so it reads as a massif (금강산), not a cone
    const all = []; World.PEAKS.forEach((p, i) => { all.push(p); if (i > 4) return; const r = DR.rng(p.seed * 13 + 1), n = i === 0 ? 6 : 4;
      for (let k = 0; k < n; k++) { const a = (k / n) * DR.TAU + r.range(-0.4, 0.4), d = p.radius * r.range(0.52, 0.8), hk = r.range(0.42, 0.78);
        all.push({ at: [p.at[0] + Math.cos(a) * d, p.at[1] + Math.sin(a) * d * 0.8], height: p.height * hk, radius: p.radius * r.range(0.28, 0.42), seed: p.seed * 31 + k, top: 0.2, lean: [Math.cos(a) * 6, Math.sin(a) * 6], nu: 72, nv: 104, amp: p.amp * 0.7, col: 9, bed: 20, lobes: 0.45,
          profile: [[0, 1], [0.2, 0.74], [0.5, 0.56], [0.8, 0.40], [0.93, 0.26], [1, 0]] }); } });
    World.peaks = all.map((p) => { const y0 = Math.min(World.height(p.at[0], p.at[1]), World.height(p.at[0] + p.radius * 0.8, p.at[1] + p.radius * 0.6), World.height(p.at[0] - p.radius * 0.8, p.at[1] + p.radius * 0.6)) - 10;
      return DR.land.peak({ ...p, at: [p.at[0], y0, p.at[1]], height: p.height - y0 }); });
    // one mesh per massif, so whatever is out of frame (or out of the shadow box, or the mirror) is not drawn
    // and each at two densities: the fine one only while the lens is near it
    World.rock = new THREE.Group(); World.rock.name = 'rock'; const lods = [];
    for (const p of World.peaks) { const S = p.spec, hi = new THREE.Mesh(p.geometry, mat), lo = new THREE.Mesh(DR.land.peak({ ...S, nu: Math.round(S.nu * 0.5), nv: Math.round(S.nv * 0.5), siteTries: 0 }).geometry, mat);
      hi.castShadow = hi.receiveShadow = lo.castShadow = lo.receiveShadow = true; World.rock.add(hi, lo); lods.push({ hi, lo, c: [S.at[0], S.at[1] + S.height * 0.45, S.at[2]], r: S.radius * 1.6 + S.height * 0.55 + 70 }); }
    scene.add(World.rock);
    DR.onFrame((t, cam) => { for (const l of lods) { const near = Math.hypot(cam.position.x - l.c[0], cam.position.y - l.c[1], cam.position.z - l.c[2]) < l.r * (cam.fov < 30 ? 1.6 : 1); l.hi.visible = near; l.lo.visible = !near; } }, 61);
    // the lake and the two falls
    const water = (World.water = DR.water({ level: 0, bounds: [-140, -140, 140, 60], height: World.height, palette: { shallow: '#4a7a68', deep: '#0a2a31', scatter: '#2f6a5c' } }));
    scene.add(water.mesh);
    World.falls = World.FALLS.map((f, i) => { const fl = DR.falls({ lip: [f.x, f.top, f.z], dir: [f.x * -0.1, 1], width: 9, drop: f.top, speed: 2.6, sheets: 3, seed: i + 1 }); scene.add(fl.mesh); return fl; });
  };
}
