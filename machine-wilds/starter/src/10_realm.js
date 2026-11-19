// Lantern Quarry — the smallest realm that uses every part: land with real relief (a quarry cut in benches, flooded), one
// kind of machine designed for it (numbers, parts, a move), a way it walks and a post it stands at, scans, plants, places.
// Steps ①–⑧ are the order to work in.  Replace every one of them for your own topic: this quarry and its wardens are an
// example of the style, not a template to fill in.
const R = { pit: { x: 0, z: 0, r: 30, floor: -9, water: -5.2 }, ramp: [[4, 96], [10, 62], [22, 40], [26, 22], [18, 8]] };

// ① the land: one height function in metres (x east, z south).  The pit is cut in three benches (a quarry is stepped);
//    round it the ground rolls, and rises to hills beyond the walk
R.height = (x, z) => {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), edge = R.pit.r * (1 + 0.14 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 7));
  let h = 1.5 + (LR.fbm(x * 0.02 + 3, z * 0.02 + 8, 4) - 0.5) * 6 + (LR.fbm(x * 0.07, z * 0.07 + 2, 3) - 0.5) * 1.2;
  const d = edge - r; if (d > -6) { const t = LR.sat((d + 6) / (edge + 6)), benches = Math.floor(t * 3.2) / 3.2 + LR.sm(0.82, 1, (t * 3.2) % 1) / 3.2; h = LR.lerp(h, R.pit.floor, LR.sat(benches * 1.25)); }      // steps, each with a short steep face
  return h + (LR.fbm(x * 0.006 + 1, z * 0.006 + 5, 5) - 0.38) * 70 * LR.sm(90, 320, r) + LR.ridge(x * 0.0007, z * 0.0007 + 2, 5) * 600 * LR.sm(600, 2600, r);
};
R.woods = (x, z) => LR.sm(R.pit.r + 12, R.pit.r + 30, Math.hypot(x, z) + (LR.fbm(x * 0.03, z * 0.03 + 4, 3) - 0.5) * 16);
R.land = () => {
  const L = LR.land.create({ height: R.height, half: 128, biome: (x, z, h, slope) => [LR.sm(118, 170, Math.hypot(x, z)) * LR.sm(0.55, 0.3, slope) * LR.sm(520, 380, h), LR.sm(0.36, 0.6, slope), LR.sm(430, 560, h)] });
  // ② water: the pit has filled to its second bench
  LR.water.pond(R.pit.water, [-R.pit.r - 8, -R.pit.r - 8, R.pit.r + 8, R.pit.r + 8]);
  // ③ ways and ground: the haul road down to the water's edge, leaf litter under the trees, ferns in the damp
  // (the benches' faces are cliffs: the road is a ramp cut through them, falling evenly from the rim to the water's edge)
  { const pts = R.ramp, len = []; let tot = 0; for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(tot); } const y0 = L.h(pts[1][0], pts[1][1]), y1 = R.pit.water + 0.5, l0 = len[0];
    for (let i = 1; i < pts.length - 0; i++) { const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2); for (let k = 0; k <= n; k++) { const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n, d = (i > 1 ? len[i - 2] : 0) + (Math.hypot(b[0] - a[0], b[1] - a[1]) * k) / n; if (d < l0) continue; L.levelDisc(x, z, 2.4, LR.lerp(y0, y1, (d - l0) / (tot - l0)), 3.5); } } }
  L.road(R.ramp, 3.2, { kind: 'dirt', wobble: 1.2 });
  L.paint('litter', (x, z) => LR.sm(0.3, 0.8, R.woods(x, z)), 'max'); L.paint('grass', (x, z) => 1 - 0.5 * R.woods(x, z), 'min');
  L.paint('tall', (x, z) => 0.4 + 0.4 * LR.fbm(x * 0.05, z * 0.05, 3)); L.paint('fern', (x, z) => LR.sm(0.4, 0.8, R.woods(x, z)) * LR.sm(0.45, 0.6, LR.fbm(x * 0.09 + 2, z * 0.09 + 7, 3)));
  L.roughen(0.1, { radius: 120 });
};

// ④ the machine, designed for this place.  A warden: four legs of two segments with the knees behind (it wades backward-kneed
//    like a wading bird seen from the side), a pump housing for a body, a short mast, and at its top a caged lantern that
//    lights the water it watches.  14 tonnes: a cycle of 4.4 s, most of it on the ground.  references/MACHINES.md has every key.
R.machines = () => {
  const M = LR.mech, LEG = { kind: 'mammal', width: 0.34, drum: 0.42, ball: 0.3, toes: 3, toeLen: 0.9, act: [1, 1], hipDrop: 0.25, style: 'girder' };
  const legs = [Object.assign({}, LEG, { name: 'FL', at: [2.2, -0.5, -1.1], segs: [3.6, 3.9], knee: -1, home: [2.9, -2.0] }), Object.assign({}, LEG, { name: 'RL', at: [-2.2, -0.5, -1.1], segs: [3.6, 3.9], knee: -1, home: [-1.5, -2.0] })];
  M.define('warden', { title: 'Warden', tonnes: 14, ride: 7.2, belly: [2.4, 1.0, 0.8], aware: 30, build: R.wardenParts,
    palette: { frame: ['paintmetal', '#7d8a86'], rust: ['rustplate', '#cdbfae'], dark: ['paintmetal', '#2b2f2e'] },
    limbs: [...legs, ...legs.map(M.mirror)], neck: { at: [1.6, 0.9, 0], links: [[2.2, 80], [1.8, 62]] }, head: { len: 1.2 },
    extras: [{ name: 'hose', type: 'lag', parent: 'body', at: [-2.4, -0.6, 0], dir: [-0.3, -1, 0], len: 2.6, lag: 0.4, gain: 1.5, maxDeg: 28 }],
    gait: { cycle: 4.4, duty: 0.78, stride: 3.0, lift: 0.9, pattern: 'lateral', crouch: 0.15, dip: 0.14, dipTime: 0.7, sway: 0.3, roll: 1.6, nod: 1.2, yaw: 0.8, footPitch: 12, toeCurl: 20, neckRock: 2, neckSway: 4, follow: [0.6, 0.35], smooth: 0.6, footTilt: 28, wade: 7, settle: 0.25, settleTime: 1.1, gather: 2.2, gatherDip: 0.22, gatherBack: 0.25 },
    idle: { period: 10, breath: 0.08, shift: 0.12, scan: 24 },
    moves: {
      // it lowers its lantern to the water and looks: rises a little first, folds forward, holds, comes up past rest and settles
      dip: { dur: 11, main: 'body.pitch', sound: [3.2, 147, 3.2, 0.5], keys: { 'body.pitch': [[0, 0], [1.0, 1.6], [3.8, -11], [7.4, -11], [9.6, 1.2], [11, 0]], 'body.dy': [[0, 0], [1.0, 0.12], [3.8, -0.9], [7.4, -0.9], [9.6, 0.1], [11, 0]], 'neck.pitch': [[0, 0], [1.0, -6], [4.0, 46], [7.4, 44], [9.8, -4], [11, 0]], 'head.pitch': [[0, 0], [4.0, 20], [7.4, 24], [10, 0], [11, 0]], light: [[0, 1], [3.6, 1], [4.2, 1.8], [7.2, 1.8], [8, 1], [11, 1]] } } } });
  // its way round the rim (closed; nothing is planted on it), and a second warden standing in the water
  const pts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; pts.push([Math.cos(a) * (46 + 5 * Math.sin(a * 3)), Math.sin(a) * (44 + 4 * Math.cos(a * 2))]); }
  M.route('rim', pts, { width: 8 });
  M.spawn('warden', { name: 'Warden 1', route: 'rim', halts: [{ at: 0.3, hold: 15, move: 'dip' }, { at: 0.8, hold: 9 }] });
  M.spawn('warden', { name: 'Warden 2', post: [7, -5], yaw: 200, moves: ['dip'], rest: 1.5 });
  // ④b the walker's own body (optional: without one a realm is walked in the first person only).  A linkboy: two legs with the
  //     knees behind, like the wardens it was built to tend, a tool chest for a body and a lantern on a short mast.  The numbers
  //     under `avatar` are how it steps; the page drives it from the keys (V: inside · behind · above; the wheel zooms).
  const LB = { kind: 'mammal', name: 'L', width: 0.09, drum: 0.1, ball: 0.075, toes: 3, toeLen: 0.2, act: [0, 1], hipDrop: 0.06, style: 'girder', bar: 0.012, at: [0, -0.06, -0.24], segs: [0.62, 0.66], knee: -1, home: [-0.04, -0.22] };
  M.define('linkboy', { title: 'Linkboy', age: 0.7, tonnes: 0.25, ride: 1.27, belly: [0.3, 0.16, 0.2], aware: 0, lodK: 2.5, build: R.linkboyParts,
    palette: { frame: ['paintmetal', '#7d8a86'], rust: ['rustplate', '#cdbfae'], dark: ['paintmetal', '#2b2f2e'] },
    limbs: [LB, M.mirror(LB)], neck: { at: [0.22, 0.26, 0], links: [[0.42, 78]] }, head: { len: 0.3 },
    avatar: { stepWalk: 0.78, stepRun: 1.4, reach: 0.32, lift: [0.09, 0.12], lean: [3.5, 11], gather: 0.1, tuck: 0.1 } });
  M.spawn('linkboy', { name: 'Linkboy', avatar: true, at: [4, 92], yaw: 0 });
};
R.linkboyParts = (k) => {
  k.limbs({ style: 'girder' });
  k.bone('body', (g) => { k.mat('frame'); k.loft('x', [[-0.4, 0.16, 0.22, 0.02, 0, 5], [0.3, 0.18, 0.24, 0.02, 0, 5], [0.42, 0.12, 0.18, 0.04, 0, 4]], { sides: 12 }); k.mat('dark'); g.box(0, -0.1, 0, 0.24, 0.16, 0.6, { soft: 0.2 });
    k.mat('rust'); g.box(-0.12, 0.27, 0, 0.5, 0.16, 0.36, { soft: 0.12 }); k.hatch([-0.12, 0.35, 0], [0, 1, 0], 0.42, 0.3, { up: [1, 0, 0] }); k.tank([-0.3, -0.18, 0], [0.12, -0.18, 0], 0.06, { role: 'rust', up: [0, -1, 0], straps: 2 });
    for (const s of [-1, 1]) { k.hose([[0.1, -0.18, s * 0.05], [0.08, -0.22, s * 0.18], [0.02, -0.14, s * 0.26]], 0.012); k.rivets([-0.36, 0.2, s * 0.215], [0.3, 0.21, s * 0.235], 8, 0.007, [0, 0, s]); k.grille([0.1, 0.02, s * 0.242], [0, 0, s], 0.2, 0.08, { up: [0, 1, 0] }); }
    k.stripes([-0.41, 0.02, 0], [-1, 0, 0], 0.36, 0.08, 5, { up: [0, 1, 0] }); });
  k.neckLinks({ width: 0.12, style: 'girder' });
  k.bone('head', (g) => { k.mat('dark'); g.box(0.06, 0.13, 0, 0.26, 0.03, 0.24, { soft: 0.2 }); for (const [x, z] of [[-0.05, -0.1], [0.17, -0.1], [0.17, 0.1], [-0.05, 0.1]]) g.tube([[x, 0.12, z], [x, -0.12, z]], 0.008, { sides: 5 }); g.box(0.06, -0.13, 0, 0.24, 0.02, 0.22, { soft: 0.2 }); });
  k.lamp('head', { name: 'lantern', at: [0.06, 0, 0], dir: [0.75, -0.66, 0], color: [1.0, 0.8, 0.5], power: 12, cone: 30, range: 40, lens: 0.07, proud: 0 });
};
// its parts: stock legs (girders), then what makes it a warden — each part in the frame of the one bone it rides
R.wardenParts = (k) => {
  k.limbs({ style: 'girder' });
  k.bone('body', (g) => { k.mat('frame'); k.loft('x', [[-2.9, 0.5, 0.8, 0, 0, 5], [-2.2, 0.8, 1.05, 0, 0, 5], [2.0, 0.8, 1.05, 0, 0, 5], [2.8, 0.55, 0.8, 0.1, 0, 4]], { sides: 14 });
    k.mat('dark'); for (const x of [2.2, -2.2]) g.box(x, -0.5, 0, 0.7, 0.5, 2.5, { soft: 0.2 }); k.mat('rust'); g.tube([[-2.0, 1.15, 0], [0.6, 1.15, 0]], 0.62, { sides: k.n(12), caps: true }); if (k.mid) { k.mat('dark'); for (const x of [-1.6, -0.4]) g.box(x, 1.15, 0, 0.12, 1.4, 1.4, { soft: 0.3 }); }
    // a pump is its fittings: a main along each flank with a line to every hip, louvres, a hatch, a stack, a gauge on the tank, a ladder
    for (const s of [-1, 1]) { k.pipe([[-2.5, -0.1, s * 1.08], [0, -0.14, s * 1.1], [2.4, -0.1, s * 1.06]], 0.06, { joints: [1] }); for (const x of [2.2, -2.2]) k.hose([[x * 1.05, -0.1, s * 1.07], [x * 1.1, -0.45, s * 1.22], [x, -0.52, s * 1.3]], 0.04); k.grille([1.2, 0.2, s * 1.045], [0, 0, s], 0.9, 0.36, { up: [0, 1, 0] }); k.rivets([-2.1, 0.74, s * 0.8], [1.9, 0.74, s * 0.8], 16, 0.018, [0, 1, 0]); }
    k.hatch([1.35, 0.8, 0], [0, 1, 0], 0.8, 0.6, { up: [1, 0, 0] }); k.stack([2.2, 0.75, -0.55], [2.25, 1.9, -0.6], 0.09); k.gauge([-0.7, 1.15, 0.62], [0, 0, 1], 0.14); k.ladder([-2.45, -0.7, -1.02], [-2.45, 0.8, -1.02], 0.36, [0, 0, -1], { off: 0.12 });
    k.tank([0.9, 1.0, 0.5], [1.9, 1.0, 0.5], 0.18, { role: 'rust', straps: 1 }); k.jbox([2.86, 0.2, 0], [1, 0.1, 0], 0.5, 0.36, 0.1, { up: [0, 1, 0], glands: 2 }); k.stripes([-2.91, 0, 0], [-1, 0, 0], 1.3, 0.24, 5, { up: [0, 1, 0] });
    g.mat('moss', { tint: '#5e6b4e', flags: LR.FLAG.SWAY, weight: 0.25 }); g.blob(-0.8, 1.75, 0.1, 0.4, { squash: [1.5, 0.4, 1.1], seg: k.n(8), rings: 4 }); });
  k.bone('hose', (g) => { k.mat('rubber'); g.tube([[0, 0, 0], [0, 1.3, 0], [0, 2.6, 0]], [0.12, 0.1, 0.09], { sides: k.n(7), caps: true }); });
  k.neckLinks({ width: 0.5, style: 'girder' });
  k.bone('head', (g) => { k.mat('dark'); g.box(0.2, 0.42, 0, 1.0, 0.1, 0.9, { soft: 0.2 }); for (const [x, z] of [[-0.2, -0.36], [0.6, -0.36], [0.6, 0.36], [-0.2, 0.36]]) g.tube([[x, 0.4, z], [x, -0.5, z]], 0.03, { sides: 5 }); g.box(0.2, -0.52, 0, 0.9, 0.06, 0.8, { soft: 0.2 }); });
  k.lamp('head', { name: 'lantern', at: [0.2, -0.05, 0], dir: [0.5, -0.86, 0], color: [1.0, 0.78, 0.46], power: 26, cone: 26, range: 60, lens: 0.24, proud: 0 });
  for (const s of [-1, 1]) k.lamp('body', { at: [2.82, 0.1, s * 0.5], dir: [1, 0, 0], color: [0.4, 0.9, 1], power: 0.7, range: 8, lens: 0.07, glow: 0.7 });
};
// the gym (scripts/gym.mjs, check.mjs, the cast sheet): the land and the machines, nothing else
LR.gym = (o = {}) => { if (!o.studio) R.land(); R.machines(); };

R.build = () => {
  R.land(); R.machines();
  LR.mech.plan();                                   // ⑤ footfalls on the land, the way worn into it, cylinders fitted to everything the machines do
  // ⑥ small things: rocks the blasting left, placed scans, what the walker is told
  const MD = LR.models, L = LR.land, way = (x, z) => LR.mech.wayDist(x, z), wet = (x, z) => LR.water.levelAt(x, z) > L.h(x, z) - 0.3;
  MD.scatter({ ids: ['boulder_01'], seed: 'blocks', spacing: 9, scale: [1.0, 2.8], sink: 0.2, tilt: 0.2, density: (x, z) => LR.sm(R.pit.r + 14, R.pit.r - 6, Math.hypot(x, z)) * 0.5, avoid: (x, z) => way(x, z) < 1.5 || wet(x, z) }) || LR.props.rocks(20, 30, 5, 3);
  MD.scatter({ ids: [0, 1, 2, 3, 4, 5, 6].map((i) => 'rock_moss_set_02#' + i), seed: 'stones', spacing: 6, scale: [0.6, 1.2], sink: 0.1, density: (x, z) => LR.sm(0.3, 0.8, R.woods(x, z)) * 0.4, avoid: (x, z) => way(x, z) < 1 });
  // ⑦ what grows: pines and birches round the cut, none on the machines' way
  const F = LR.flora, avoid = (x, z) => wet(x, z) || way(x, z) < 2.4 || L.coverAt('dirt', x, z) > 0.4 || Math.hypot(x, z) < R.pit.r + 4;
  F.scatter({ species: [['pine', 3], ['birch', 2], ['spruce', 2], ['bush', 1]], area: [-124, -124, 124, 124], spacing: 6.6, seed: 'quarry', density: (x, z) => R.woods(x, z) * 0.8, avoid });
  F.far({ density: (x, z) => 0.7 * LR.sm(520, 400, L.h(x, z)), inner: 124, outer: 600, spacing: 13, species: [['spruce', 3], ['pine', 2]] });
  MD.scatter({ ids: [0, 1, 2, 3].map((i) => 'fern_02#' + i), seed: 'ferns', spacing: 1.8, scale: [1.0, 1.9], area: [-80, -80, 80, 80], density: (x, z) => L.coverAt('fern', x, z) * 0.5, avoid: (x, z) => way(x, z) < 0.5 || wet(x, z) });
  LR.mech.start();                                  // ⑧ the machines into the page — last, when the land is as it will stay
  LR.world.places.push({ x: 18, z: 10, r: 9, name: 'The Landing', sub: 'where the haul road meets the water' }, { x: 0, z: 46, r: 9, name: 'The Rim', sub: 'a warden walks it' });
  LR.world.radius = 104; LR.world.spawn = { x: 4, z: 92, yaw: 0 }; LR.canopy.mist = 1.4; LR.wx.key = 0.2;
};
