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
  // ── the shelled ones ────────────────────────────────────────────────────────────────────────────────────────────
  // 자라: a soft-shelled turtle of a machine — a dome of plates as wide as a house on four sprawled legs, its belly a man's height
  // off the ground, a head on a short neck that looks about.  150 t: a step every seven seconds, three feet down at any moment.
  const JL = { kind: 'insect', width: 0.5, drum: 0.56, bar: 0.11, ball: 0.42, toes: 4, toeLen: 0.9, act: [1, 1], coxa: 1.4, style: 'girder' };
  const jaraLegs = [[3.4, 4.3, 'F'], [-3.4, -4.3, 'R']].map(([x, hx, n]) => Object.assign({}, JL, { name: n + 'L', at: [x, -0.4, -2.7], segs: [3.5, 4.3], knee: 1, home: [hx, -6.5] }));
  M.define('jara', { title: '자라', age: 1, tonnes: 150, ride: 3.0, belly: [4.4, 1.7, 2.4], aware: 34, lensGain: 20, build: (k) => V.parts.jara(k),
    palette: { shell: ['ceramic', '#b9bfae'], rust: ['rustplate', '#c4b8a2'], frame: ['paintmetal', '#5f6a58'], dark: ['paintmetal', '#2c302b'] },
    limbs: [...jaraLegs, ...jaraLegs.map(M.mirror)], neck: { at: [5.3, -0.2, 0], links: [[1.5, 10], [1.3, 3]] }, head: { len: 1.7 },
    extras: [{ name: 'tail', type: 'lag', parent: 'body', at: [-5.5, -0.4, 0], dir: [-1, -0.2, 0], len: 2.2, lag: 0.5, gain: 1.2, maxDeg: 18 }],
    gait: { cycle: 7.0, duty: 0.8, stride: 2.5, lift: 0.65, pattern: 'lateral', crouch: 0.1, dip: 0.14, dipTime: 1.0, sway: 0.3, roll: 1.4, nod: 0.6, yaw: 1.2, footPitch: 8, toeCurl: 14, neckRock: 1.5, neckSway: 5, follow: [0.7, 0.5], smooth: 0.6, footTilt: 26, settle: 0.3, settleTime: 1.6, gather: 3, gatherDip: 0.3, gatherBack: 0.3, wade: 1.8, reachMax: 0.93 },
    idle: { period: 20, breath: 0.1, shift: 0.12, scan: 20 },
    moves: {
      // it settles: rises a hand first, lowers its shell until the belly is a step off the ground and looks down, waits, comes up past its height and settles
      tuck: { dur: 16, main: 'body.dy', sound: [4.6, 72, 5, 0.9], keys: { 'body.dy': [[0, 0], [1.4, 0.16], [5, -0.9], [11, -0.9], [14, 0.13], [16, 0]], 'body.pitch': [[0, 0], [1.4, 0.6], [5, -1.6], [11, -1.6], [14, 0.4], [16, 0]], 'neck.pitch': [[0, 0], [1.4, -6], [5.2, 16], [11, 16], [14, -4], [16, 0]], 'head.pitch': [[0, 0], [1.6, -5], [5.4, 12], [11, 10], [14.2, -3], [16, 0]], light: [[0, 1], [4.4, 1], [5.2, 0.35], [10.6, 0.35], [11.6, 1.3], [16, 1]] } } } });
  // 가재: the one to keep clear of — a crayfish as long as two lorries on eight legs, a shell of overlapping plates the red of old
  // oxide, two claws carried low, feelers, a jointed tail, eyes on stalks that burn red in the mist.  64 t; it walks the brook.
  const GL = { kind: 'insect', width: 0.36, drum: 0.42, ball: 0.26, toes: 2, toeLen: 0.9, act: [1, 1], coxa: 0.9, style: 'girder' };
  const gajaeLegs = [[3.3, 4.6, -4.6, 'A'], [1.4, 1.9, -5.0, 'B'], [-0.5, -0.9, -5.0, 'C'], [-2.4, -3.6, -4.6, 'D']].map(([x, hx, hz, n]) => Object.assign({}, GL, { name: n + 'L', at: [x, -0.35, -1.5], segs: [3.2, 4.0], knee: 1, home: [hx, hz] }));
  M.define('gajae', { title: '가재', age: 0.9, tonnes: 64, ride: 3.4, belly: [3.6, 1.35, 1.2], aware: 46, lensGain: 30, build: (k) => V.parts.gajae(k),
    palette: { shell: ['paintmetal', '#8a4032'], rust: ['rustplate', '#b59f8c'], frame: ['paintmetal', '#4a4441'], dark: ['paintmetal', '#242223'], accent: ['paintmetal', '#b0452e'] },
    limbs: [...gajaeLegs, ...gajaeLegs.map(M.mirror)], neck: { at: [4.5, 0.5, 0], links: [[0.8, 24]] }, head: { len: 1.2 },
    extras: [{ name: 'claw_L', type: 'lag', parent: 'body', at: [4.0, -0.3, -1.8], dir: [1, -0.14, -0.4], len: 4.4, lag: 0.35, gain: 0.8, maxDeg: 12 }, { name: 'claw_R', type: 'lag', parent: 'body', at: [4.0, -0.3, 1.8], dir: [1, -0.14, 0.4], len: 4.4, lag: 0.4, gain: 0.8, maxDeg: 12 },
      { name: 'feeler_L', type: 'lag', parent: 'head', at: [0.7, 0.2, -0.3], dir: [0.8, 0.45, -0.4], len: 3.6, lag: 0.3, gain: 1.2, maxDeg: 26 }, { name: 'feeler_R', type: 'lag', parent: 'head', at: [0.7, 0.2, 0.3], dir: [0.8, 0.45, 0.4], len: 3.6, lag: 0.34, gain: 1.2, maxDeg: 26 },
      { name: 'tail_1', type: 'lag', parent: 'body', at: [-4.5, 0.25, 0], dir: [-1, 0.05, 0], len: 1.7, lag: 0.3, gain: 1.0, maxDeg: 14 }, { name: 'tail_2', type: 'lag', parent: 'tail_1', at: [0, 1.7, 0], dir: [0, 1, 0], len: 1.9, lag: 0.3, gain: 1.0, maxDeg: 16 }],
    gait: { cycle: 4.4, duty: 0.68, stride: 3.2, lift: 1.0, offsets: { AL: 0, BL: 0.535, CL: 0.07, DL: 0.605, AR: 0.5, BR: 0.035, CR: 0.57, DR: 0.105 }, crouch: 0.12, dip: 0.12, dipTime: 0.7, sway: 0.2, roll: 1.2, nod: 0.8, yaw: 1.4, footPitch: 10, toeCurl: 16, neckSway: 6, follow: [0.75, 0.55], smooth: 0.45, footTilt: 28, settle: 0.26, settleTime: 1.1, gather: 2.4, gatherDip: 0.25, gatherBack: 0.3, wade: 2.2, reachMax: 0.93 },
    idle: { period: 8, breath: 0.08, shift: 0.1, scan: 34 },
    moves: {
      // it rears: sinks at the front first, throws its fore end up with every lamp burning and holds, comes down past level and settles
      rear: { dur: 11, main: 'body.pitch', sound: [3.0, 58, 3.8, 1.3], keys: { 'body.pitch': [[0, 0], [1.0, -2.6], [3.2, 12], [7.4, 12], [9.5, -2], [11, 0]], 'body.dy': [[0, 0], [1.0, -0.25], [3.2, 0.45], [7.4, 0.45], [9.5, -0.12], [11, 0]], 'head.pitch': [[0, 0], [1.0, 8], [3.4, -14], [7.4, -12], [9.6, 4], [11, 0]], 'head.yaw': [[0, 0], [3.4, 0], [4.8, 22], [6.4, -20], [7.6, 0], [11, 0]], light: [[0, 1], [2.8, 1], [3.4, 2.4], [7.2, 2.4], [8.4, 1], [11, 1]] } } } });
  // 공벌레: woodlice the size of a small car, four of them in file — arches of plate from nose to tail over six quick legs.
  // 1.6 t: a step every 0.6 s.  They keep to the lower shelf and duck under their shells when they stop.
  const BL = { kind: 'insect', width: 0.1, drum: 0.11, bar: 0.014, ball: 0.07, toes: 2, toeLen: 0.2, act: [1, 1], coxa: 0.22, style: 'girder' };
  const gongLegs = [[0.85, 1.05, 'F'], [0, 0, 'M'], [-0.85, -1.05, 'R']].map(([x, hx, n]) => Object.assign({}, BL, { name: n + 'L', at: [x, -0.08, -0.42], segs: [0.7, 0.86], knee: 1, home: [hx, n === 'M' ? -1.12 : -1.02] }));
  M.define('gong', { title: '공벌레', age: 0.85, tonnes: 1.6, ride: 0.95, belly: [0.9, 0.22, 0.3], aware: 12, lensGain: 16, lodK: 2.2, build: (k) => V.parts.gong(k),
    palette: { shell: ['ceramic', '#cfd1c8'], rust: ['rustplate', '#c9bca8'], frame: ['paintmetal', '#6b7468'], dark: ['paintmetal', '#2b2e2c'] },
    limbs: [...gongLegs, ...gongLegs.map(M.mirror)], neck: { at: [1.2, 0.06, 0], links: [[0.22, 6]] }, head: { len: 0.4 },
    extras: [{ name: 'feeler_L', type: 'lag', parent: 'head', at: [0.3, 0.05, -0.12], dir: [0.8, 0.4, -0.45], len: 0.8, lag: 0.16, gain: 1.4, maxDeg: 30 }, { name: 'feeler_R', type: 'lag', parent: 'head', at: [0.3, 0.05, 0.12], dir: [0.8, 0.4, 0.45], len: 0.8, lag: 0.19, gain: 1.4, maxDeg: 30 }],
    gait: { cycle: 1.25, duty: 0.62, stride: 0.75, lift: 0.16, pattern: 'tripod', crouch: 0.02, dip: 0.012, dipTime: 0.35, sway: 0.03, roll: 1.2, nod: 1.0, yaw: 1.4, footPitch: 10, toeCurl: 16, neckSway: 6, follow: [0.8, 0.6], smooth: 0.4, footTilt: 28, settle: 0.05, settleTime: 0.5, gather: 0.9, gatherDip: 0.05, gatherBack: 0.05, reachMax: 0.93, print: 0.01, clear: 0.04 },      // (clear: the default swing clearance is a quarter of a metre — a quarter of this thing's height)
    idle: { period: 5, breath: 0.03, shift: 0.02, scan: 30 },
    moves: {
      // it ducks: lifts a finger's breadth, drops until its plates are near the ground, waits, pops up past its height and settles
      duck: { dur: 6, main: 'body.dy', keys: { 'body.dy': [[0, 0], [0.5, 0.025], [1.6, -0.1], [4, -0.1], [5.2, 0.02], [6, 0]], 'head.pitch': [[0, 0], [0.5, -8], [1.7, 22], [4, 20], [5.2, -5], [6, 0]], light: [[0, 1], [1.4, 1], [1.8, 0.3], [3.9, 0.3], [4.3, 1.3], [6, 1]] } } } });
  // 물떼새: the walker's own body — a scout on two heron legs, as tall as a person and a head more.  A third of a tonne: it steps
  // five times in two seconds at a walk, leaves the ground between steps at a run, gathers before a hop and gives at the knees after.
  const PV = { kind: 'mammal', width: 0.09, drum: 0.09, ball: 0.07, toes: 3, toeLen: 0.22, act: [0, 1, 1], hipDrop: 0.06, style: 'shell', bar: 0.012 };      // (the hip turns on a drive inside its drum: it swings through a right angle, more than a cylinder follows)
  const ploverLeg = Object.assign({}, PV, { name: 'L', at: [0, -0.06, -0.25], segs: [0.5, 0.48, 0.3], knee: 1, gamma: 12, home: [0.05, -0.23] });
  M.define('plover', { title: '물떼새', age: 0.5, tonnes: 0.3, ride: 1.3, belly: [0.36, 0.16, 0.2], aware: 0, lensGain: 22, lodK: 2.5, build: (k) => V.parts.plover(k),
    palette: { shell: ['ceramic', '#dfe0dc'], dark: ['paintmetal', '#2a2e31'], frame: ['paintmetal', '#566068'], accent: ['paintmetal', '#b8742a'] },
    limbs: [ploverLeg, M.mirror(ploverLeg)], neck: { at: [0.34, 0.24, 0], links: [[0.2, 62]] }, head: { len: 0.34 },
    extras: [{ name: 'whip', type: 'lag', parent: 'body', at: [-0.42, 0.3, 0.1], dir: [-0.3, 1, 0], len: 0.9, lag: 0.22, gain: 1.3, maxDeg: 24 }],
    avatar: { stepWalk: 0.8, stepRun: 1.45, reach: 0.32, lift: [0.09, 0.12], swingGamma: 12, lean: [4, 12], gather: 0.1, tuck: 0.1 } });
  for (const k in V.ways) M.route(k, V.ways[k], { width: { rim: 38, round: 15, bank: 13, brook: 13, east: 14, shelf: 3.4 }[k] || 13, grade: k === 'rim' ? 0.12 : 0.2 });
  M.spawn('crane', { name: '두루미 1', route: 'round', offset: 0, halts: [{ at: 0.179, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
  M.spawn('crane', { name: '두루미 2', route: 'round', offset: 330, halts: [{ at: 0.179, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
  for (let i = 0; i < 3; i++) M.spawn('porter', { name: '등짐 ' + (i + 1), route: 'bank', offset: i * 42, halts: [{ at: 0.45, hold: 16, move: 'kneel' }, { at: 0.9, hold: 8 }] });
  // five kites in a string: each two seconds behind the one before, a little to one side and above, each beating in its own time
  // (closer, or abreast, and their wings cross in the tight turn over the saddle: check.mjs measures every pair)
  [[0, 0, 0], [2, 5, 2], [4, -5, 3], [6, 5, 4.5], [8, -4, 2.5]].forEach((q, i) => M.spawn('kite', { name: '솔개 ' + (i + 1), fly: V.sky, offset: -q[0], shift: [q[1], q[2]], phase: i * 0.23 }));
  M.spawn('ridge', { name: '마루', route: 'rim', offset: 120, halts: [{ at: 0.3, hold: 34, move: 'call' }] });
  // the shelled ones: the crayfish in the brook west of the viaduct, a turtle on the eastern floor and one standing at the tarn, four woodlice in file on the lower shelf
  M.spawn('gajae', { name: '가재', route: 'brook', offset: 40, halts: [{ at: 0.32, hold: 14, move: 'rear' }, { at: 0.78, hold: 9 }] });
  M.spawn('jara', { name: '자라 1', route: 'east', offset: 0, halts: [{ at: 0.55, hold: 22, move: 'tuck' }] });
  M.spawn('jara', { name: '자라 2', post: [97, 82], yaw: 60, moves: ['tuck'], rest: 4 });
  // four in file, five cycles (5.3 m, 6.25 s) apart, that stop together: each one's halts lie its own place in the file further along the way, and its clock
  // runs that much ahead (same halts on one clock would walk each into the one stopped in front of it)
  for (let i = 0; i < 4; i++) { const d = (i * 5.295) / 177.9; M.spawn('gong', { name: '공벌레 ' + (i + 1), route: 'shelf', offset: i * 6.25, halts: [{ at: 0.4 + d, hold: 7, move: 'duck' }, { at: 0.8 + d, hold: 9 }] }); }
  // the walker's body stands where the walk starts; the page hands it to whoever holds the keys
  M.spawn('plover', { name: '물떼새', avatar: true, at: [V.spawn.x, V.spawn.z], yaw: 90 });
};
// the gym (scripts/gym.mjs): the land and the machines, nothing else
// (o.studio: the cast sheet wants the kinds only — no land)
LR.gym = (o = {}) => { if (!o.studio) V.land(); V.machines(); };
