// 쇠울림 골짜기 · the small things, and the scans placed by name: what stands on the old road and on the viaduct, the
// camp in the hall, crags on the north bank, mossy rocks on the slopes, and what the machines have knocked down along
// their ways.  Every placed scan has a generated stand-in or is simply absent without scans (?scan=0).
V.details = () => {
  const MD = LR.models, L = LR.land, W = LR.world, P = LR.props, M = LR.mech, r = LR.rng('details'), TAU = Math.PI * 2, D = V.deck;
  const car = (x, z, yaw, o = {}) => MD.place('covered_car#4', x, z, Object.assign({ yaw, sink: 0.04, solid: 'box' }, o)) || (() => { const g = P.g(x, z), y = o.y === undefined ? L.h(x, z) : o.y; g.at(x, y, z, yaw, 0, 0); g.mat('cloth', { tint: '#5c6468' }); g.box(0, 0.5, 0, 1.75, 0.9, 4.3, { soft: 0.5 }); g.box(0, 1.05, -0.2, 1.5, 0.45, 2.2, { soft: 0.6 }); g.pop(); W.solidBox(x, z, 0.95, 2.2, yaw); })();
  // the old road: three cars where they stopped, one in the ditch
  car(-128, 129.4, 1.72); car(-88, 124.2, 1.45); car(-51, 132.5, 0.6, { roll: 0.2 }); car(-9, 126.8, 1.65);
  // on the viaduct: two more, a line of barriers before each broken edge (they stop the walker too)
  if (D) { car(D.x - 2.4, 84, 0.1, { y: D.y + 0.03 }); car(D.x + 2.6, 58, 2.9, { y: D.y + 0.03 });
    for (const [z, k] of [[D.z0 + 2.0, 1], [V.viaduct.gone[0] - 2.0, -1]]) { for (let i = 0; i < 6; i++) { const x = D.x - 4.4 + i * 1.72; if (!MD.place('concrete_road_barrier_02', x, z + (r() - 0.5) * 0.3, { y: D.y + 0.03, yaw: (r() - 0.5) * 0.25, scale: 1.05, solid: false })) { const g = P.g(x, z); g.mat('concrete'); g.box(x, D.y + 0.5, z, 1.5, 1.0, 0.4, { soft: 0.2 }); } } W.solidBox(D.x, z, D.w / 2, 0.35, 0, { y0: D.y - 0.5, y1: D.y + 1.03 }); }
    // saplings have taken the cracks in the deck
    for (const [dx, z, s] of [[-3.8, 96, 1.9], [3.2, 79, 1.5], [-4.2, 66, 2.2], [4.1, 47, 1.4], [-1.2, 41, 1.7], [3.6, -22, 2.0], [-3.9, -44, 1.6]]) MD.place('fir_sapling#' + ((z & 1) + 1), D.x + dx, z, { y: D.y + 0.02, scale: s, yaw: z, solid: false }); }
  // the camp in the hall: fuel, a generator that still runs the one lamp, boxes to sit on
  { const H = V.hall, C = V.camp, y = H.y + 0.25, put = (id, dx, dz, o = {}) => MD.place(id, C.x + dx, C.z + dz, Object.assign({ y, yaw: r() * TAU }, o));
    put('portable_generator#0', -3.2, -2.6, { yaw: 0.4 }) || P.crate(C.x - 3.2, C.z - 2.6, { y }); put('metal_jerrycan', -2.5, -3.1); put('metal_jerrycan', -2.1, -2.7, { lie: true }); put('barrel_03', 3.1, -2.2) || P.barrel(C.x + 3.1, C.z - 2.2, { y }); put('barrel_03', 3.9, -2.6); put('barrel_03', 3.4, -3.1, { lie: true });
    put('old_military_crate#4', 1.5, 1.4, { scale: 1.3 }) || P.crate(C.x + 1.5, C.z + 1.4, { y }); put('old_military_crate#4', -1.6, 1.2, { scale: 1.3 }); put('old_military_crate#3', -1.9, 1.5, { scale: 1.3, y: y + 0.34 });
    for (const [dx, dz] of [[5.5, 1], [5.9, 1.5], [6.4, 0.6]]) put('old_tyre', dx, dz, { lie: r() < 0.6 }); put('rusted_wheel_rim_01', 5.2, 2.2, { lie: true }); put('rusted_wheel_rim_01', 6.8, 1.8);
    MD.place('utility_box_01', H.x - 12 + 0.45, H.z - 2, { y: H.y + 1.1, yaw: Math.PI / 2, solid: false });
    // a work light on a pole by the door, lit when the lamps are
    P.lampPost(C.x - 5.5, C.z + 4.8, { yaw: 0.6, h: 3.2 }); }
  // crags: the north bank's rock comes through in faces (a scanned rock face, set large, wearing the engine's rock near the eye)
  { const tor = (x, z, s, yaw, o = {}) => MD.place('rock_face_02', x, z, Object.assign({ scale: s, yaw, sink: 0.6, solid: 0.72 }, o)) || P.rocks(x, z, 3, s * 1.2, { size: s * 0.8 });
    for (const [x, z, s, yaw] of [[-118, -66, 4.2, 0.3], [-108, -72, 3.0, 1.9], [-64, -54, 3.6, 4.0], [6, -52, 4.6, 2.4], [16, -56, 3.2, 0.9], [54, -34, 4.0, 5.1], [138, -40, 4.4, 1.2], [148, -36, 3.0, 3.3], [-176, -58, 3.8, 2.7], [-96, 108, 3.4, 0.5], [-90, 100, 2.6, 2.2], [-102, 99, 2.8, 4.4], [176, 20, 3.6, 0.2], [-6, 62, 2.8, 1.1], [72, 62, 3.0, 3.9]]) tor(x, z, s, yaw); }
  // boulders that came down the banks, mossy rocks in the woods
  const way = (x, z) => M.wayDist(x, z), paved = (x, z) => L.coverAt('paved', x, z) > 0.2, wet = (x, z) => LR.water.levelAt(x, z) > L.h(x, z) - 0.3, steep = (x, z) => 1 - L.normal(x, z, 2.5)[1];
  MD.scatter({ ids: ['boulder_01'], seed: 'boulders', spacing: 13, scale: [1.2, 3.4], sink: 0.25, tilt: 0.25, tintVar: 0.08, density: (x, z) => LR.sm(0.05, 0.16, steep(x, z)) * LR.sm(0.45, 0.7, LR.fbm(x * 0.03 + 5, z * 0.03, 2)) * 0.8, avoid: (x, z) => way(x, z) < 2 || paved(x, z) });
  MD.scatter({ ids: Array.from({ length: 6 }, (_, k) => 'rock_moss_set_01#' + k), seed: 'mossrocks', spacing: 9, scale: [0.6, 1.5], sink: 0.2, tilt: 0.15, tintVar: 0.06, density: (x, z) => LR.sm(0.4, 0.8, V.woods(x, z)) * LR.sm(0.5, 0.72, LR.fbm(x * 0.045 + 1, z * 0.045 + 7, 2)) * 0.55, avoid: (x, z) => way(x, z) < 1.5 || paved(x, z) || wet(x, z) });
  MD.scatter({ ids: Array.from({ length: 7 }, (_, k) => 'rock_moss_set_02#' + k), seed: 'stones', spacing: 5, scale: [0.6, 1.3], sink: 0.12, tilt: 0.2, tintVar: 0.06, density: (x, z) => LR.sm(22, 6, Math.abs(z - V.axis(x))) * 0.35 + LR.sm(0.08, 0.2, steep(x, z)) * 0.25, avoid: (x, z) => way(x, z) < 1 || paved(x, z) });
  // what the machines leave: along every way trunks pushed aside and snapped stumps; in the woods, deadfall
  MD.scatter({ ids: ['dead_tree_trunk'], seed: 'felled', spacing: 11, scale: [3.2, 5.4], sink: 0.06, tilt: 0.1, tintVar: 0.1, area: [-200, -200, 200, 200], density: (x, z) => { const d = way(x, z); return LR.sm(0.5, 2, d) * LR.sm(8, 4, d) * 0.55; }, avoid: (x, z) => paved(x, z) || wet(x, z) });
  MD.scatter({ ids: ['tree_stump_02'], seed: 'stumps', spacing: 9, scale: [0.7, 1.3], sink: 0.1, tintVar: 0.1, area: [-200, -200, 200, 200], density: (x, z) => { const d = way(x, z); return LR.sm(-2, 1, d) * LR.sm(7, 3, d) * 0.4 * LR.sm(0.2, 0.5, V.woods(x, z)); }, avoid: (x, z) => paved(x, z) || wet(x, z) || way(x, z) < -3 });
  MD.scatter({ ids: ['dead_tree_trunk'], seed: 'deadfall', spacing: 16, scale: [1.6, 3.2], sink: 0.05, tilt: 0.12, tintVar: 0.1, density: (x, z) => LR.sm(0.5, 0.85, V.woods(x, z)) * 0.5, avoid: (x, z) => way(x, z) < 6 || paved(x, z) || wet(x, z) });
  MD.scatter({ ids: [0, 1, 2].map((k) => 'dry_branches_medium_01#' + k), seed: 'twigs', spacing: 5, scale: [0.9, 1.7], tilt: 0.05, tintVar: 0.08, density: (x, z) => LR.sm(0.4, 0.8, V.woods(x, z)) * 0.5, avoid: (x, z) => paved(x, z) || wet(x, z) });
  // a crane that went down long ago, by the brook: its body on the ground, its legs folded under and over it, its neck along the bank
  V.fallen = LR.mech.wreck('crane', { x: V.wreck.x, z: V.wreck.z, yaw: 205, moss: 0.6, pose: (cmd, q) => { const h = q.h, fw = [Math.cos(h), Math.sin(h)], rt = [-Math.sin(h), Math.cos(h)], x = V.wreck.x, z = V.wreck.z, gy = L.h(x, z);
    cmd.body = q.bodyFrame([x, gy + 2.4, z], h, -0.1, 0.42); for (const l of q.kin.limbs) { const k = l.side > 0 ? 0.55 : 1.5, px = x + fw[0] * l.home[0] * 1.25 + rt[0] * l.home[1] * k, pz = z + fw[1] * l.home[0] * 1.25 + rt[1] * l.home[1] * k; cmd.limbs[l.name] = { p: [px, L.h(px, pz) + l.ball * 0.6, pz], n: [0.3 * l.side, 0.9, 0.1], yaw: h + l.side * 0.6, gamma: 38, curl: 20 }; }
    cmd.neck = { pitch: 74, yaw: -16 }; cmd.head = { pitch: 18, yaw: -10, roll: 24, level: 0 }; } });
  // the names of things, the sounds placed in them
  W.places.push({ x: V.spawn.x, z: V.spawn.z, r: 14, name: '들목', sub: '옛길이 숲으로 들어가는 곳' }, { x: V.lookout.x, z: V.lookout.z, r: 9, name: '망바위', sub: '골짜기가 한눈에' }, { x: D.x, z: 50, r: 16, name: '끊어진 고가', sub: '거인들이 지나며 무너뜨린 다리' },
    { x: V.hall.x, z: V.hall.z, r: 15, name: '정비창 터', sub: '누군가 아직 불을 피운다' }, { x: V.tarn.x - 30, z: V.tarn.z + 6, r: 14, name: '쇠늪', sub: '두루미가 물을 건너는 곳' }, { x: V.wreck.x, z: V.wreck.z + 14, r: 16, name: '누운 두루미', sub: '이끼가 덮은 지 오래' },
    { x: V.yard.x, z: V.yard.z, r: 16, name: '짐터', sub: '등짐들이 들르는 야적장' }, { x: V.ford.x, z: V.ford.z, r: 9, name: '여울', sub: '개울을 건너는 얕은 곳' });
  for (let i = 4; i < V.brook.length - 3; i += 3) W.sounds.push({ x: V.brook[i][0], y: V.brook[i][2], z: V.brook[i][1], kind: 'stream', r: 26, gain: 0.8 });
  W.sounds.push({ x: V.tarn.x, y: V.tarn.level, z: V.tarn.z, kind: 'frogs', r: 46, gain: 0.8 }); W.fireflyAreas = [{ x: V.tarn.x, z: V.tarn.z, r: 40 }, { x: V.hall.x, z: V.hall.z + 14, r: 18 }];
};
