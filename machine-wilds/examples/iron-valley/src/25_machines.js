// 쇠울림 골짜기 · the machines.  Three kinds, each designed for this valley (numbers here, parts in 26_parts.js):
//   두루미 (crane)   a 25 m four-legged watcher on heron legs with a long neck — it walks the long round and wades the tarn
//   등짐 (porter)    a 9 m six-legged carrier with an overgrown load — a string of three works the north bank
//   마루 (ridge)     a 58 m eight-legged relic that keeps to the rim; from the valley only its lights show
// A machine's numbers follow from its mass: heavier → a longer cycle, more of it on the ground, a lower lift, a deeper,
// slower sink into each step.  references/MACHINES.md lists every key.
V.machines = () => {
  const M = LR.mech;
  const CL = { kind: 'mammal', width: 0.7, drum: 0.76, ball: 0.44, toes: 3, toeLen: 1.5, act: [1, 1, 1], hipDrop: 0.35 };
  const craneLegs = [Object.assign({}, CL, { name: 'FL', at: [3.2, -1.0, -1.5], segs: [6.4, 5.7, 3.4], knee: 1, gamma: 11, home: [4.4, -2.9] }), Object.assign({}, CL, { name: 'RL', at: [-3.5, -1.0, -1.7], segs: [6.4, 5.7, 3.4], knee: -1, gamma: 11, home: [-4.9, -3.2] })];
  M.define('crane', { title: '두루미', age: 0.6, tonnes: 86, ride: 15.6, belly: [4.6, 1.9, 1.2], aware: 60, build: (k) => V.parts.crane(k),
    palette: { shell: ['ceramic', '#dfe0dc'], dark: ['paintmetal', '#2a2e31'], frame: ['paintmetal', '#566068'], accent: ['paintmetal', '#4f8f96'] },
    limbs: [...craneLegs, ...craneLegs.map(M.mirror)],
    neck: { at: [5.0, 0.4, 0], links: [[2.5, 68], [2.4, 60], [2.2, 48], [2.0, 34], [1.7, 20]] }, head: { len: 3.0 },
    extras: [{ name: 'mast', type: 'lag', parent: 'body', at: [-5.6, 1.2, 0], dir: [-0.35, 1, 0], len: 5.2, lag: 0.5, gain: 1.4, maxDeg: 14 },
      { name: 'feeler_L', type: 'lag', parent: 'head', at: [0.9, -0.2, -0.45], dir: [0.5, -0.8, -0.3], len: 2.4, lag: 0.25, gain: 0.9 }, { name: 'feeler_R', type: 'lag', parent: 'head', at: [0.9, -0.2, 0.45], dir: [0.5, -0.8, 0.3], len: 2.4, lag: 0.25, gain: 0.9 }],
    gait: { cycle: 6.4, duty: 0.78, stride: 5.6, lift: 1.9, pattern: 'lateral', crouch: 0.2, dip: 0.24, dipTime: 1.05, sway: 0.6, roll: 1.8, nod: 1.4, yaw: 0.7, swingGamma: 14, footPitch: 16, toeCurl: 24, neckRock: 2.4, neckSway: 3,
      follow: [0.55, 0.3], smooth: 0.7, footTilt: 26, settle: 0.4, settleTime: 1.5, gather: 3.4, gatherDip: 0.4, gatherBack: 0.45 },
    idle: { period: 12, breath: 0.14, shift: 0.2, scan: 16 },
    moves: {
      // it lifts its head above the mist and sweeps the valley: the neck dips first (gathers), rises and holds while the head
      // turns left and right, then comes down past rest and settles
      survey: { dur: 13, main: 'neck.pitch', sound: [3.8, 98, 4.6, 0.8], keys: {
        'neck.pitch': [[0, 0], [1.1, 6], [3.6, -22], [9.4, -22], [11.6, 4.5], [13, 0]], 'body.dy': [[0, 0], [1.1, -0.22], [3.6, 0.3], [9.4, 0.3], [11.6, -0.12], [13, 0]], 'body.pitch': [[0, 0], [1.1, -0.8], [3.6, 1.6], [9.4, 1.6], [11.6, -0.4], [13, 0]],
        'head.pitch': [[0, 0], [1.2, 8], [3.8, 4], [9.4, 6], [11.6, -3], [13, 0]], 'head.yaw': [[0, 0], [3.4, 0], [4.0, -8], [5.6, 56], [6.0, 54], [8.2, -50], [8.7, -48], [10.4, 4], [11, 0], [13, 0]], 'neck.yaw': [[0, 0], [3.6, 0], [5.6, 14], [8.2, -12], [10.4, 0], [13, 0]],
        light: [[0, 1], [3.2, 1], [3.8, 1.7], [9.2, 1.7], [10.4, 1], [13, 1]] } } } });
  // 등짐: six insect legs under a flat bed; it carries what it was last given and has not been unloaded since
  const PL = { kind: 'insect', width: 0.42, drum: 0.5, ball: 0.3, toes: 4, toeLen: 0.8, act: [1, 1], coxa: 1.2, style: 'girder' };
  const porterLegs = [[3.6, 4.4, 'F'], [0, 0, 'M'], [-3.6, -4.4, 'R']].map(([x, hx, n]) => Object.assign({}, PL, { name: n + 'L', at: [x, -0.3, -1.5], segs: [4.4, 5.6], knee: 1, home: [hx, n === 'M' ? -5.0 : -4.6] }));
  M.define('porter', { title: '등짐', age: 0.8, tonnes: 38, ride: 4.9, belly: [3.6, 0.9, 1.0], aware: 26, lensGain: 18, build: (k) => V.parts.porter(k),
    palette: { frame: ['paintmetal', '#8f9468'], rust: ['rustplate', '#cfc6b6'], dark: ['paintmetal', '#33362f'] },
    limbs: [...porterLegs, ...porterLegs.map(M.mirror)], head: { len: 1.4 }, neck: { at: [4.3, 0.35, 0], links: [[0.9, 12]] },
    extras: [{ name: 'radar', type: 'spin', parent: 'body', at: [-2.6, 5.3, 0.6], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0], rate: 34, len: 0.6 },
      { name: 'chain_L', type: 'lag', parent: 'body', at: [-1.2, -0.6, -1.0], dir: [0, -1, 0], len: 1.8, lag: 0.35, gain: 1.6, maxDeg: 30 }, { name: 'chain_R', type: 'lag', parent: 'body', at: [1.6, -0.6, 1.0], dir: [0, -1, 0], len: 1.4, lag: 0.3, gain: 1.6, maxDeg: 30 }],
    gait: { cycle: 3.6, duty: 0.62, stride: 3.4, lift: 1.1, pattern: 'tripod', crouch: 0.1, dip: 0.12, dipTime: 0.6, sway: 0.16, roll: 1.2, nod: 0.8, yaw: 1.0, footPitch: 10, toeCurl: 18, neckRock: 0, neckSway: 4, follow: [0.75, 0.6], smooth: 0.4, footTilt: 28, settle: 0.22, settleTime: 1.0, gather: 2.2, gatherDip: 0.22, gatherBack: 0.25, reachMax: 0.93 },
    idle: { period: 9, breath: 0.07, shift: 0.1, scan: 22 },
    moves: {
      // it sets its load down: rises a little first, folds until the bed is low, waits, then stands past its height and settles
      kneel: { dur: 12, main: 'body.dy', keys: { 'body.dy': [[0, 0], [1.0, 0.2], [4.0, -1.7], [8.2, -1.7], [10.6, 0.22], [12, 0]], 'body.pitch': [[0, 0], [1.0, 0.8], [4.0, -2.2], [8.2, -2.2], [10.6, 0.6], [12, 0]], 'head.pitch': [[0, 0], [1.0, -6], [4.2, 14], [8.2, 12], [10.8, -3], [12, 0]], light: [[0, 1], [3.6, 1], [4.2, 0.45], [8, 0.45], [8.6, 1.2], [12, 1]] } } } });
  // 마루: a relic on eight legs — a relay station that never stopped walking its rounds
  const TL = { kind: 'mammal', width: 2.6, drum: 3.0, bar: 0.5, ball: 1.6, toes: 4, toeLen: 5.0, act: [1, 1], hipDrop: 1.5, style: 'girder', actLat: 1.5 };
  const titanLegs = [[18, 2.5, 1, 'A'], [6, 1.5, 1, 'B'], [-6, -1.5, -1, 'C'], [-18, -2.5, -1, 'D']].map(([x, dx, knee, n]) => Object.assign({}, TL, { name: n + 'L', at: [x, -2, -9], segs: [17, 18.5], knee, home: [x + dx, -12.5] }));
  M.define('ridge', { title: '마루', age: 1, tonnes: 5200, ride: 34, belly: [20, 4, 7], aware: 0, lensGain: 22, build: (k) => V.parts.ridge(k),
    palette: { frame: ['rustplate', '#bdb4a4'], rust: ['rustplate', '#d9cfbf'], dark: ['paintmetal', '#3a3d3b'], shell: ['concrete', '#c9c6be'] },
    limbs: [...titanLegs, ...titanLegs.map(M.mirror)], neck: { at: [24, -3.5, 0], links: [[3.2, -62]] }, head: { len: 6 },
    extras: [{ name: 'mast', type: 'lag', parent: 'body', at: [-14, 16, 2], dir: [0, 1, 0], len: 22, lag: 0.9, gain: 1.2, maxDeg: 5 }, { name: 'cable_1', type: 'lag', parent: 'body', at: [10, -4.5, -5], dir: [0, -1, 0], len: 13, lag: 1.1, gain: 1.4, maxDeg: 16 }, { name: 'cable_2', type: 'lag', parent: 'body', at: [-9, -4.5, 4], dir: [0, -1, 0], len: 17, lag: 1.3, gain: 1.4, maxDeg: 16 }, { name: 'cable_3', type: 'lag', parent: 'body', at: [-2, -4.5, -6], dir: [0, -1, 0], len: 9, lag: 0.9, gain: 1.4, maxDeg: 16 }],
    gait: { cycle: 15, duty: 0.68, stride: 15, lift: 3.4, offsets: { AL: 0, BL: 0.535, CL: 0.07, DL: 0.605, AR: 0.5, BR: 0.035, CR: 0.57, DR: 0.105 }, crouch: 0.6, dip: 0.9, dipTime: 1.7, sway: 1.1, roll: 0.9, nod: 0.5, yaw: 0.3, footPitch: 8, toeCurl: 10, neckSway: 2, follow: [0.5, 0.25], smooth: 0.5, footTilt: 30, settle: 0.9, settleTime: 3.2, gather: 6, gatherDip: 0.9, gatherBack: 0.8, ease: 16, clear: 1.6 },
    idle: { period: 26, breath: 0.3, shift: 0.5, scan: 18 },
    moves: {
      // it calls: sinks, then rises to its full height with every light up, holds, comes down past rest and settles
      call: { dur: 24, main: 'body.dy', sound: [7.6, 46, 9, 2.2], keys: { 'body.dy': [[0, 0], [2.6, -0.7], [8, 1.5], [16, 1.5], [20.5, -0.3], [24, 0]], 'body.pitch': [[0, 0], [2.6, -0.5], [8, 1.2], [16, 1.2], [20.5, -0.2], [24, 0]], 'head.pitch': [[0, 0], [2.6, 6], [8, -10], [16, -8], [21, 2], [24, 0]], 'head.yaw': [[0, 0], [8, 0], [11, 26], [14, -24], [17, 0], [24, 0]], light: [[0, 1], [6.6, 1], [8.2, 2.2], [15.5, 2.2], [18, 1], [24, 1]] } } } });
  // 솔개: a kite — it has no legs to speak of.  Two-part wings on a keel, a fan of a tail, one eye that looks down into the mist.
  // 0.9 t on a 9 m span: 14 m/s, a beat every 1.15 s in bouts of nine seconds, banked by what each turn asks.
  M.define('kite', { title: '솔개', age: 0.45, tonnes: 0.9, ride: 1.2, tall: 2, aware: 80, lensGain: 30, lodK: 5, cry: [47, 560, 0.8, 0.5], build: (k) => V.parts.kite(k),
    palette: { shell: ['ceramic', '#dcdedb'], dark: ['paintmetal', '#262a2d'], frame: ['paintmetal', '#4d565c'], accent: ['paintmetal', '#4f8f96'] },
    limbs: [], neck: { at: [1.25, 0.12, 0], links: [[0.5, 8]] }, head: { len: 0.9 },
    extras: [{ name: 'wing_L1', type: 'spin', parent: 'body', at: [0.25, 0.22, -0.42], dir: [0, 0, -1], axis: [1, 0, 0], xdir: [1, 0, 0], len: 2.1 }, { name: 'wing_L2', type: 'spin', parent: 'wing_L1', at: [0, 2.1, 0], dir: [0, 1, 0], axis: [1, 0, 0], xdir: [1, 0, 0], len: 2.3 },
      { name: 'wing_R1', type: 'spin', parent: 'body', at: [0.25, 0.22, 0.42], dir: [0, 0, 1], axis: [-1, 0, 0], xdir: [1, 0, 0], len: 2.1 }, { name: 'wing_R2', type: 'spin', parent: 'wing_R1', at: [0, 2.1, 0], dir: [0, 1, 0], axis: [-1, 0, 0], xdir: [1, 0, 0], len: 2.3 },
      { name: 'tail', type: 'spin', parent: 'body', at: [-1.5, 0.05, 0], dir: [-1, 0, 0], axis: [1, 0, 0], xdir: [0, 0, 1], len: 1.5 }, { name: 'streamer', type: 'lag', parent: 'body', at: [-1.6, -0.1, 0], dir: [-1, -0.15, 0], len: 1.8, lag: 0.18, gain: 0.5, maxDeg: 30 }],
    flight: { speed: 14, beat: 0.87, stroke: [30, 20], fold: 16, dihedral: 7, bout: 9, bob: 0.16, lead: 0.7, bankMax: 52, span: 9.4, gaze: 24, tail: 'tail', wings: [['wing_L1', 'wing_L2'], ['wing_R1', 'wing_R2']] } });
  for (const k in V.ways) M.route(k, V.ways[k], { width: k === 'rim' ? 38 : k === 'round' ? 15 : 13, grade: k === 'rim' ? 0.12 : 0.2 });
  M.spawn('crane', { name: '두루미 1', route: 'round', offset: 0, halts: [{ at: 0.179, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
  M.spawn('crane', { name: '두루미 2', route: 'round', offset: 330, halts: [{ at: 0.179, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
  for (let i = 0; i < 3; i++) M.spawn('porter', { name: '등짐 ' + (i + 1), route: 'bank', offset: i * 42, halts: [{ at: 0.45, hold: 16, move: 'kneel' }, { at: 0.9, hold: 8 }] });
  // five kites in a string: each two seconds behind the one before, a little to one side and above, each beating in its own time
  // (closer, or abreast, and their wings cross in the tight turn over the saddle: check.mjs measures every pair)
  [[0, 0, 0], [2, 5, 2], [4, -5, 3], [6, 5, 4.5], [8, -4, 2.5]].forEach((q, i) => M.spawn('kite', { name: '솔개 ' + (i + 1), fly: V.sky, offset: -q[0], shift: [q[1], q[2]], phase: i * 0.23 }));
  M.spawn('ridge', { name: '마루', route: 'rim', offset: 120, halts: [{ at: 0.3, hold: 34, move: 'call' }] });
};
// the gym (scripts/gym.mjs): the land and the machines, nothing else
// (o.studio: the cast sheet wants the kinds only — no land)
LR.gym = (o = {}) => { if (!o.studio) V.land(); V.machines(); };
