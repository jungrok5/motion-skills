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
  M.define('crane', { title: '두루미', tonnes: 86, ride: 15.6, belly: [4.6, 1.9, 1.2], aware: 60, build: (k) => V.parts.crane(k),
    palette: { shell: ['ceramic', '#dfe0dc'], dark: ['paintmetal', '#2a2e31'], frame: ['paintmetal', '#566068'] },
    limbs: [...craneLegs, ...craneLegs.map(M.mirror)],
    neck: { at: [5.0, 0.4, 0], links: [[2.5, 68], [2.4, 60], [2.2, 48], [2.0, 34], [1.7, 20]] }, head: { len: 3.0 },
    extras: [{ name: 'mast', type: 'lag', parent: 'body', at: [-5.6, 1.2, 0], dir: [-0.35, 1, 0], len: 5.2, lag: 0.5, gain: 1.4, maxDeg: 14 },
      { name: 'feeler_L', type: 'lag', parent: 'head', at: [0.9, -0.2, -0.45], dir: [0.5, -0.8, -0.3], len: 2.4, lag: 0.25, gain: 0.9 }, { name: 'feeler_R', type: 'lag', parent: 'head', at: [0.9, -0.2, 0.45], dir: [0.5, -0.8, 0.3], len: 2.4, lag: 0.25, gain: 0.9 }],
    gait: { cycle: 6.4, duty: 0.78, stride: 5.6, lift: 1.9, pattern: 'lateral', crouch: 0.2, dip: 0.3, dipTime: 0.6, sway: 0.6, roll: 1.8, nod: 1.4, yaw: 0.7, swingGamma: 14, footPitch: 16, toeCurl: 24, neckRock: 2.4, neckSway: 3,
      follow: [0.55, 0.3], smooth: 0.3, maxSlope: 0.14, footTilt: 24, print: 0.22, settle: 0.4, settleTime: 1.5, gather: 3.4, gatherDip: 0.4, gatherBack: 0.45 },
    idle: { period: 12, breath: 0.14, shift: 0.2, scan: 16 },
    moves: {
      // it lifts its head above the mist and sweeps the valley: the neck dips first (gathers), rises and holds while the head
      // turns left and right, then comes down past rest and settles
      survey: { dur: 13, main: 'neck.pitch', keys: {
        'neck.pitch': [[0, 0], [1.1, 6], [3.6, -22], [9.4, -22], [11.6, 4.5], [13, 0]], 'body.dy': [[0, 0], [1.1, -0.22], [3.6, 0.3], [9.4, 0.3], [11.6, -0.12], [13, 0]], 'body.pitch': [[0, 0], [1.1, -0.8], [3.6, 1.6], [9.4, 1.6], [11.6, -0.4], [13, 0]],
        'head.pitch': [[0, 0], [1.2, 8], [3.8, 4], [9.4, 6], [11.6, -3], [13, 0]], 'head.yaw': [[0, 0], [3.4, 0], [4.0, -8], [5.6, 56], [6.0, 54], [8.2, -50], [8.7, -48], [10.4, 4], [11, 0], [13, 0]], 'neck.yaw': [[0, 0], [3.6, 0], [5.6, 14], [8.2, -12], [10.4, 0], [13, 0]],
        light: [[0, 1], [3.2, 1], [3.8, 1.7], [9.2, 1.7], [10.4, 1], [13, 1]] } } } });
  for (const k in V.ways) M.route(k, V.ways[k], { width: k === 'rim' ? 34 : k === 'round' ? 15 : 9 });
  M.spawn('crane', { name: '두루미 1', route: 'round', offset: 0, halts: [{ at: 0.2, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
  M.spawn('crane', { name: '두루미 2', route: 'round', offset: 190, halts: [{ at: 0.2, hold: 18, move: 'survey' }, { at: 0.62, hold: 12 }] });
};
// the gym (scripts/gym.mjs): the land and the machines, nothing else
LR.gym = () => { V.land(); V.machines(); };
