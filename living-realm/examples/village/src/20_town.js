// 은여울 마을 · the town.  The square with its fountain, the inn across the north side, the smithy to the east, the
// baker and the chandler to the west, the reeve's hall, lanes of houses down to the south gate, the chapel on its
// knoll, the mill on the brook, the windmill on its hill, a farm, the bridge to the meadow.
{
  const A = LR.arch, W = LR.world, PI = Math.PI;
  // yaw so that a building's front (+z) faces a compass way
  const FACE = { south: 0, north: PI, east: PI / 2, west: -PI / 2 }, toward = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  V.town = () => {
    const y0 = V.y0;
    A.fountain({ x: 0, z: 0, r: 2.8, y: y0 });
    // ── the inn: a long three-storey house with a cross wing ──
    const inn = A.house({ x: -2, z: -25.5, yaw: 0.03, w: 16, d: 8.6, floors: 3, floorH: 2.85, ground: 'stone', seed: 'inn', plaster: '#f4ecd8', timber: '#e6dac8', shutters: '#a24a3c', roof: { mat: 'tiles', pitch: 52 }, door: { side: '+z', at: 0.42, w: 1.3, tint: '#8a4a3a' }, windows: { '+z': 0.9, '-z': 0.6, '+x': 0.5, '-x': 0.5 }, chimneys: [[-0.32, 0.12, 1.6], [0.3, -0.1, 1.2]], dormers: 2, name: 'inn' });
    A.house({ x: 8.6, z: -19.6, yaw: 0.03 + PI / 2, w: 9.5, d: 6.4, floors: 2, floorH: 2.85, ground: 'stone', seed: 'innwing', plaster: '#f4ecd8', timber: '#e6dac8', shutters: '#a24a3c', roof: { mat: 'tiles', pitch: 52 }, door: { side: '-x', at: 0.5 }, windows: { '+z': 0.7, '-z': 0.3, '+x': 0.6, '-x': 0.0 }, chimneys: [], dormers: 0, y: inn.y, name: 'inn-wing' });
    V.inn = inn;
    // ── the smithy on the east side, its open shed toward the square's north-east ──
    V.smithy = A.smithy({ x: 27, z: -4, yaw: FACE.west, seed: 'smith', stone: '#e8e2da' });
    // ── west side: the baker and the chandler ──
    V.baker = A.house({ x: -25.5, z: -9, yaw: FACE.east, w: 9, d: 6.8, floors: 2, seed: 'baker', ground: 'stone', plaster: '#f2e6cf', shutters: '#5f8a58', roof: { mat: 'tiles' }, door: { side: '+z', at: 0.3 }, chimneys: [[0.3, 0.1, 2]], dormers: 1 });
    V.chandler = A.house({ x: -25, z: 8.5, yaw: FACE.east + 0.06, w: 7.6, d: 6.2, floors: 3, seed: 'chandler', ground: 'timber', plaster: '#ffffff', shutters: '#5f7f9e', roof: { mat: 'slate', pitch: 57 }, door: { side: '+z', at: 0.5 } });
    // ── the reeve's hall, south-east of the square ──
    V.hall = A.house({ x: 24.5, z: 18.5, yaw: toward(24.5, 18.5, 4, 4), w: 11.5, d: 7.4, floors: 2, floorH: 3.0, seed: 'hall', ground: 'stone', groundMat: 'ashlar', plaster: '#efe9dc', timber: '#d2c4b4', shutters: '#8a7446', roof: { mat: 'slate', pitch: 54 }, door: { side: '+z', at: 0.5, w: 1.4, arch: false, tint: '#6a4a3a' }, dormers: 2, chimneys: [[-0.3, 0.1], [0.32, -0.1]] });
    // ── lanes of houses ──
    const H = (x, z, face, o = {}) => A.house(Object.assign({ x, z, yaw: typeof face === 'number' ? face : FACE[face], seed: 'h' + x + ':' + z }, o));
    V.houses = [
      H(-11.5, 31, 'east', { w: 8.2, d: 6.2, floors: 2, roof: { mat: 'tiles' } }), H(11.8, 30, 'west', { w: 7.4, d: 6, floors: 3, ground: 'timber', roof: { mat: 'slate', pitch: 56 } }),
      H(-12.2, 47, FACE.east - 0.08, { w: 7.2, d: 6, floors: 2, upper: 'boards', boardTint: '#d8c8b4', roof: { mat: 'slate' } }), H(12.4, 46.5, FACE.west + 0.1, { w: 8.8, d: 6.4, floors: 2, roof: { mat: 'tiles' }, dormers: 1 }),
      H(-12, 63.5, 'east', { w: 8, d: 6, floors: 1, floorH: 2.7, roof: { mat: 'thatch', pitch: 47, eave: 0.7 }, ground: 'stone' }), H(12, 64, 'west', { w: 7.6, d: 6, floors: 2, roof: { mat: 'tiles' } }),
      H(-13, 80, FACE.east + 0.05, { w: 7, d: 5.6, floors: 2, roof: { mat: 'tiles' } }), H(13.2, 81, 'west', { w: 7.4, d: 5.8, floors: 1, floorH: 2.7, roof: { mat: 'thatch', pitch: 46, eave: 0.7 } }),
      H(-40, -8, FACE.south + 0.1, { w: 8.4, d: 6.2, floors: 2, roof: { mat: 'tiles' } }), H(-41, 15.5, FACE.north - 0.05, { w: 7.8, d: 6, floors: 2, ground: 'timber', roof: { mat: 'slate' } }),
      H(38, -9.5, FACE.south - 0.12, { w: 7.6, d: 6, floors: 2, roof: { mat: 'tiles' } }), H(41, 26, toward(41, 26, 34, 12), { w: 7.2, d: 5.8, floors: 1, floorH: 2.7, roof: { mat: 'thatch', pitch: 46, eave: 0.7 } }),
      H(-27, 30, toward(-27, 30, -34, 18), { w: 7.4, d: 5.8, floors: 2, roof: { mat: 'tiles' } }), H(27, -28, toward(27, -28, 18, -18), { w: 7, d: 5.8, floors: 2, upper: 'boards', boardTint: '#cfc0aa', roof: { mat: 'slate' } }),
      H(-22, -28, toward(-22, -28, -12, -18), { w: 7.2, d: 5.8, floors: 2, roof: { mat: 'tiles' } }),
    ];
    // ── the farm: a boarded barn and a cottage ──
    V.barn = A.house({ x: -58, z: 52, yaw: toward(-58, 52, -48, 46), w: 11, d: 7.5, floors: 1, floorH: 3.6, ground: 'boards', boardTint: '#c8b8a2', seed: 'barn', roof: { mat: 'thatch', pitch: 50, eave: 0.8 }, door: { side: '+z', at: 0.5, w: 2.2, h: 2.8 }, windows: { '+z': 0.15, '-z': 0.1, '+x': 0.1, '-x': 0.1 }, chimneys: [], dormers: 0, plinth: 0.25 });
    V.cottage = H(-44, 64, toward(-44, 64, -46, 50), { w: 7, d: 5.6, floors: 1, floorH: 2.7, roof: { mat: 'thatch', pitch: 47, eave: 0.7 } });
    // ── the chapel on its knoll, door toward the town ──
    V.chapelB = A.chapel({ x: V.chapel.x, z: V.chapel.z, yaw: FACE.east + 0.08 });
    // ── the mill on the brook: the wheel stands in the water on its east side ──
    const mx = 52.6, mz = 13.5, myaw = toward(mx, mz, 59.6, 11) - PI / 2;                    // its +x gable toward the brook
    V.millB = A.house({ x: mx, z: mz, yaw: myaw, w: 9, d: 6.6, floors: 2, seed: 'mill', ground: 'stone', plaster: '#f2e6cf', roof: { mat: 'tiles' }, door: { side: '+z', at: 0.3 }, chimneys: [[-0.3, 0.1]], dormers: 0, windows: { '+z': 0.6, '-z': 0.5, '+x': 0, '-x': 0.5 } });
    { const c = Math.cos(myaw), s = Math.sin(myaw), lx = 9 / 2 + 1.05, wx = mx + lx * c, wz = mz - lx * s, wl = LR.water.levelAt(wx, wz); A.waterWheel(wx, (wl > -1e8 ? wl : V.millB.y - 1.2) + 1.55, wz, myaw, { r: 2.3, width: 1.1 }); V.wheel = [wx, wz]; }
    // ── the windmill on its hill ──
    V.windmill = A.windmill({ x: V.mill.x, z: V.mill.z, yaw: 2.3 });
    // ── the stone bridge to the meadow ──
    { const b = V.bridge; V.bridgeB = A.bridge([b.x - 0.3, b.z + 8.2], [b.x + 0.3, b.z - 8.2], { width: 3.8, rise: 0.75, span: 8.5 }); }
    // ── the south gate and its palisade ──
    const gate = A.gate({ x: V.gate.x, z: V.gate.z, yaw: 0, banner: '#3f6f9a' }); V.gateB = gate;
    A.palisade([gate.ends[0], [-22, 99], [-44, 94], [-64, 84], [-80, 70]], { seed: 'pw' });
    A.palisade([gate.ends[1], [22, 100], [42, 97], [58, 88]], { seed: 'pe' });
    A.well({ x: -33.5, z: 7.5, y: LR.land.h(-33.5, 7.5) });
    // places the walker is told about
    const T = V.T;
    W.places.push({ x: 0, z: 0, r: 13, name: T.plaza, sub: T.plazaSub }, { x: -2, z: -17, r: 6, name: T.inn, sub: T.innSub }, { x: 30, z: -4, r: 7, name: T.smithy, sub: T.smithySub }, { x: V.chapel.x + 9, z: V.chapel.z + 1, r: 9, name: T.chapel, sub: T.chapelSub },
      { x: 56, z: 15, r: 7, name: T.mill, sub: T.millSub }, { x: V.mill.x, z: V.mill.z, r: 12, name: T.windmill, sub: T.windmillSub }, { x: V.bridge.x, z: V.bridge.z, r: 6, name: T.bridge, sub: T.bridgeSub }, { x: V.meadow.x, z: V.meadow.z, r: 24, name: T.meadow, sub: T.meadowSub },
      { x: V.gate.x, z: V.gate.z - 2, r: 8, name: T.gate, sub: T.gateSub }, { x: V.pond.x - 12, z: V.pond.z, r: 10, name: T.pond, sub: T.pondSub }, { x: V.farm.x + 6, z: V.farm.z - 4, r: 14, name: T.farm, sub: T.farmSub });
  };
}
