// 쇠울림 골짜기 (Soeullim, "the valley where iron rings") · the land.  A valley running west to east with a brook in it:
// the north side climbs steeply to a ridge of crags, the south side rises in two shelves — the first holds a tarn in a
// bog, the second ends at a lookout rock.  Nothing is level: 36 m of height inside the walk.  V is this realm's shared
// sheet (places, the ways the machines walk, what other sources build on).
const V = {
  spawn: { x: -150, z: 118 }, lookout: { x: -96, z: 104, r: 16 }, tarn: { x: 122, z: 84, r: 24 }, hall: { x: 34, z: 122 }, viaduct: { x: -22, y: 22, piers: [-72, -36, 0, 36, 72, 108], gone: [0, 36] },
  wreck: { x: -72, z: 6 }, ford: { x: 62, z: -1 }, saddle: { x: 150, z: -70 }, yard: { x: 96, z: -104 },
  // the valley's axis: where the brook runs (z as a function of x)
  axis: (x) => 18 * Math.sin(x / 95 + 0.4) + 0.05 * x - 20,
};
{
  const sm = LR.sm, knoll = (x, z, cx, cz, R) => { const t = sm(R, 0, Math.hypot(x - cx, z - cz)); return t * t * (3 - 2 * t); };
  // smooth crags: a noise raised to a power stands up in knobs with room between them
  const knobs = (x, z, f) => { const n = LR.fbm(x * f + 9, z * f + 2, 3, 0.55); return Math.pow(LR.sat((n - 0.36) * 2.4), 1.6); };
  V.base = (x, z) => {
    const r = Math.hypot(x, z), d = z - V.axis(x), wob = (LR.fbm(x * 0.011 + 3, z * 0.011 + 7, 3) - 0.5) * 38, ds = d + wob * sm(6, 60, Math.abs(d));
    let h = 2.2 - x * 0.012;                                                                  // the floor falls to the east with the brook
    h += ds > 0 ? 11 * sm(12, 58, ds) + 13 * sm(100, 180, ds) : 20 * sm(9, 66, -ds) + 15 * sm(92, 190, -ds);     // south: two shelves · north: a steep bank, then the ridge
    const off = sm(8, 40, Math.abs(d));                                                       // the floor itself stays quiet
    h += (LR.fbm(x * 0.0085 + 5, z * 0.0085 + 9, 4) - 0.5) * 17 * off;                        // long swells
    h += (LR.fbm(x * 0.024 + 1, z * 0.024 + 4, 4) - 0.5) * 7.5 * (0.25 + 0.75 * off);         // hummocks and hollows, 40 m across
    h += (LR.fbm(x * 0.075 + 6, z * 0.075 + 1, 3) - 0.5) * 1.5 * (0.4 + 0.6 * off);           // and what a walker feels underfoot
    h += knobs(x, z, 0.019) * 9 * sm(34, 96, -ds) + knobs(x + 300, z, 0.03) * 3.5 * sm(60, 120, ds);     // the north bank breaks into crags; rock knolls on the high shelf
    h += knoll(x, z, V.lookout.x, V.lookout.z, 44) * 10 + knoll(x, z, V.saddle.x + 40, V.saddle.z - 30, 80) * 9 - knoll(x, z, V.saddle.x, V.saddle.z, 44) * 7;
    { const T = V.tarn, q = sm(T.r + 34, T.r + 6, Math.hypot(x - T.x, z - T.z)); h = LR.lerp(h, 9.6, q); }       // the bog round the tarn lies level
    h += (LR.fbm(x * 0.0045 + 3, z * 0.0045 + 7, 5) - 0.36) * 120 * sm(300, 660, r);          // the country beyond
    h += LR.ridge(x * 0.0005 + 1, z * 0.0005 + 4, 5) * 820 * sm(760, 2800, r);
    return h;
  };
  // the ways the machines keep (closed; trees, scans and ruins stay off them).  Laid from the land: the long round goes
  // down the valley floor, through the tarn's shallows and home along the first shelf; the short one works the north bank;
  // the colossus keeps to the rim
  V.ways = {
    round: [[-168, -6], [-118, 8], [-74, 28], [-34, 20], [8, 14], [44, 6], [84, 10], [118, 34], [142, 66], [134, 106], [100, 134], [58, 148], [14, 151], [-30, 149], [-74, 147], [-118, 146], [-158, 136], [-182, 100], [-190, 56], [-188, 22]],
    bank: [[-62, -78], [-16, -92], [30, -84], [72, -76], [112, -80], [122, -108], [90, -132], [40, -122], [-6, -126], [-52, -114], [-82, -96]],
    // the crayfish keeps to the brook west of the viaduct: down its north side, across, back along the south side and across again
    brook: [[-186, -42], [-172, -54], [-140, -57], [-108, -53], [-80, -47], [-58, -41], [-46, -31], [-56, -22], [-84, -23], [-116, -27], [-148, -30], [-174, -31]],
    // a turtle walks the eastern floor, through the brook twice a lap
    east: [[168, -15], [179, -11], [184, 1], [182, 15], [170, 22], [157, 19], [150, 7], [154, -8]],
    // woodlice on the lower shelf, between the cranes' way and the bank under the old road
    shelf: [[-140, 58], [-128, 49], [-104, 47], [-80, 48], [-64, 54], [-62, 63], [-76, 69], [-100, 68], [-124, 68], [-138, 66]],
    rim: [[-236, -30], [-214, -150], [-120, -222], [-10, -238], [110, -224], [206, -160], [240, -50], [236, 60], [200, 160], [112, 226], [-10, 238], [-130, 222], [-212, 150], [-240, 50]],
  };
  // the line the kites fly, [x, z, height]: a wide ring over the valley that swings in low over the viaduct and the fallen crane
  // and climbs away over the banks — turns no tighter than forty metres, no climb steeper than one in four, never under
  // 30 m over the land (the trees are 22, a crane's lifted head 37), well inside the relic's rim.  (given as heights; kept as metres over the land)
  V.sky = [[-150, 30, 76], [-100, -60, 80], [-10, -95, 78], [80, -60, 72], [130, 10, 62], [110, 90, 60], [40, 130, 66], [-40, 120, 70], [-20, 50, 57], [-70, 20, 55], [-130, 70, 70]].map((p) => [p[0], p[1], p[2] - V.base(p[0], p[1])]);
  // how wooded a spot is, 0…1: one function for the litter, the planting and the far forest
  V.woods = (x, z) => {
    const r = Math.hypot(x, z), d = z - V.axis(x); let f = 0.25 + 0.75 * sm(4, 26, Math.abs(d)) + (LR.fbm(x * 0.017 + 2, z * 0.017 + 6, 3) - 0.5) * 0.7;
    f *= sm(V.tarn.r + 2, V.tarn.r + 22, Math.hypot(x - V.tarn.x, z - V.tarn.z)); f *= sm(7, 20, Math.hypot(x - V.lookout.x, z - V.lookout.z)); f *= sm(10, 26, Math.hypot(x - V.hall.x, z - V.hall.z)) * sm(8, 22, Math.hypot(x - V.yard.x, z - V.yard.z));
    return LR.sat(f);
  };
}
V.land = () => {
  // the far hills are wooded to their shoulders; above the trees they are bare rock (not lawn), with a little snow at the very top
  const sm = LR.sm, L = LR.land.create({ height: V.base, half: 320, res: 0.5,
    biome: (x, z, h, slope) => { const r = Math.hypot(x, z), n = LR.noise(x * 0.004 + 3, z * 0.004 + 1); return [sm(300, 380, r) * sm(0.72, 0.42, slope) * sm(700, 520, h + n * 60) * (0.72 + 0.28 * sm(0.15, 0.45, n + 0.4)), Math.max(sm(0.5, 0.74, slope), 0.9 * sm(540, 700, h + n * 60)) * sm(300, 360, r), sm(700, 800, h + n * 50)]; } });
  // the brook: down the valley's axis, its level just under the land and never rising downstream
  const pts = []; for (let x = -316; x <= 316; x += 14) pts.push([x, V.axis(x) + (LR.fbm(x * 0.05, 3, 2) - 0.5) * 7]);
  let prev = 1e9; V.brook = pts.map((p) => { const y = Math.min(V.base(p[0], p[1]) - 1.15, prev - 0.03); prev = y; return [p[0], p[1], y]; });
  L.carve(V.brook, 6.2, 1.3, { bank: 6 });
  // the tarn on the first shelf, in a bog; its water leaves north to the brook
  const T = V.tarn; T.level = V.base(T.x, T.z) - 1.5; L.pond(T.x, T.z, T.r, T.level, 2.0, { wobble: 0.3 });
  { const n = L.n, R = T.r * 2.3; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -L.half + i * L.res, z = -L.half + j * L.res, d = Math.hypot(x - T.x, z - T.z); if (d > T.r * 1.34 && d < R) L.H[j * n + i] = Math.max(L.H[j * n + i], T.level + 0.45 * sm(R, R - 9, d)); } }      // the bog's rim holds its water on every side
  { let y = T.level; V.outflow = [[T.x - 6, T.z - T.r + 2], [T.x - 14, T.z - T.r - 16], [T.x - 20, 30], [T.x - 16, 12], [T.x - 8, V.axis(T.x - 8) + 2]].map((p, i) => { y = Math.min(y - 0.05, i ? V.base(p[0], p[1]) - 1.0 : y); return [p[0], p[1], y]; }); L.carve(V.outflow, 3.6, 0.9, { bank: 4 }); }
  LR.water.stream(V.brook, 6.2); LR.water.stream(V.outflow, 3.6);
  LR.water.pond(T.level, [T.x - T.r * 1.4 - 2, T.z - T.r * 1.4 - 2, T.x + T.r * 1.4 + 2, T.z + T.r * 1.4 + 2]);
  // what is left of the road: it came in from the south-west, passed the hall and went under the viaduct
  V.road = [[-196, 150], [-150, 122], [-112, 128], [-70, 128], [-30, 124], [4, 122], [22, 122]];
  L.road(V.road, 5.2, { kind: 'paved', wobble: 1.4, soft: 1.6, strength: 0.8 });
  V.paths = { lookout: [[-112, 128], [-104, 116], [-96, 104]], down: [[-40, 126], [-44, 96], [-50, 62], [-58, 34], [-70, 14]], tarn: [[46, 118], [66, 110], [88, 98], [100, 90]], ford: [[-58, 34], [-20, 26], [22, 16], [56, 4], [62, -8], [74, -30], [92, -66], [96, -96]] };
  for (const k in V.paths) L.road(V.paths[k], 1.5, { kind: 'dirt', strength: 0.75, wobble: 1.1, ease: k !== 'ford' });
  L.patch(V.lookout.x, V.lookout.z, 5, { kind: 'dirt', strength: 0.6, wobble: 1.6 });
  // what grows where: leaf litter under the trees, grass thin in deep wood, rank growth by the water, ferns in the damp
  const wet = (x, z) => sm(26, 4, Math.abs(z - V.axis(x))) * 0.6 + sm(T.r + 26, T.r, Math.hypot(x - T.x, z - T.z));
  L.paint('litter', (x, z) => sm(0.3, 0.75, V.woods(x, z)) * (0.55 + 0.45 * LR.fbm(x * 0.06, z * 0.06, 3)), 'max');
  L.paint('grass', (x, z) => 1 - 0.5 * sm(0.45, 0.95, V.woods(x, z)), 'min');
  L.paint('tall', (x, z) => LR.sat(0.42 + 0.5 * wet(x, z) + (LR.fbm(x * 0.03 + 4, z * 0.03, 3) - 0.5) * 0.7));
  L.paint('flowers', (x, z) => sm(0.62, 0.78, LR.fbm(x * 0.07 + 7, z * 0.07 + 3, 3)) * (1 - V.woods(x, z)) * 0.5);
  L.paint('fern', (x, z) => sm(0.35, 0.8, V.woods(x, z)) * sm(0.4, 0.6, LR.fbm(x * 0.07 + 11, z * 0.07 + 5, 3)) + 0.5 * wet(x, z));
  // the viaduct's ends: the road ran onto it from banks of fill
  { const D = V.viaduct; L.level(D.x, D.piers[5] + 9, 7.5, 10, 0, D.y - 0.15, 14); L.level(D.x, D.piers[0] - 9, 7.5, 9, 0, D.y - 0.15, 12);
    L.road([[D.x, D.piers[5] - 1], [D.x - 1, D.piers[5] + 14], [-30, 134], [-52, 138], [-70, 128]], 6, { kind: 'paved', wobble: 1.2, strength: 0.85 }); L.road([[D.x, D.piers[0] + 1], [D.x + 1, D.piers[0] - 20], [D.x + 6, -110], [D.x + 20, -140], [D.x + 30, -176]], 6, { kind: 'paved', wobble: 1.4, strength: 0.8 }); }
  V.hall.y = L.level(V.hall.x, V.hall.z, 15, 10, 0, undefined, 9); V.yard.y = L.level(V.yard.x, V.yard.z, 15, 11, 0.3, undefined, 10); L.patch(V.yard.x, V.yard.z, 12, { kind: 'dirt', strength: 0.7, wobble: 2.2 });
  L.roughen(0.13, { radius: 330 });
};
