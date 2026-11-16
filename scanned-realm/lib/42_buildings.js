// scanned-realm · 42_buildings — the buildings a settlement is known by, made from the parts in 40_arch:
// a smithy with an open forge, a chapel with a tower, a windmill and a water wheel that turn, a palisade and gate,
// an arched stone bridge you can walk over, a well, a fountain, market stalls.  Each takes a site and options,
// writes one mesh, and registers what the world needs to know (solids, floors, lights, smoke, sounds).
{
  const T = THREE, F = LR.FLAG, A = LR.arch, W = LR.world;
  const wpt = (g, x, y, z) => new T.Vector3(x, y, z).applyMatrix4(g.m);
  const fire = (g, x, y, z, o = {}) => { const p = wpt(g, x, y, z); W.light(Object.assign({ x: p.x, y: p.y, z: p.z, r: 10, power: 5, color: [1, 0.48, 0.16], kind: 'fire', flicker: 0.32, day: 0.5 }, o)); W.fires.push({ x: p.x, y: p.y, z: p.z, size: o.size || 0.5 }); return p; };
  A.fire = fire; A.wpt = wpt;

  // turning things: A.spin(mesh, axis:'x'|'y'|'z', radPerSec, windShare)
  A.spin = (mesh, axis, speed, wind = 0) => { A.spinners.push({ mesh, axis, speed, wind, a: 0 }); };
  LR.on('frame', (time, dt) => { for (const s of A.spinners) { const k = s.speed * (1 - s.wind + s.wind * (0.25 + LR.wx.wind * 2.2)) * (s.freeze ? 1 - LR.sm(0.6, 0.95, LR.wx.snow) : 1); s.a = LR.RENDER ? time * k : s.a + dt * k; s.mesh.rotation[s.axis] = s.a; s.mesh.updateMatrix(); s.mesh.updateMatrixWorld(true); } }, 20);

  // ── smithy: a stone house with an open lean-to, hearth, anvil, quench trough ─────────────────────────────────────
  A.smithy = (o) => {
    const H = A.house(Object.assign({ w: 7.5, d: 6, floors: 1, floorH: 3.0, ground: 'stone', roof: { mat: 'slate', pitch: 48 }, chimneys: [[0.3, 0.1, 2.2]], door: { side: '+z', at: 0.3 }, dormers: 0, name: 'smithy' }, o));
    const g = new LR.Geo(), w = H.w, d = 6, sw = 4.6;                       // the shed stands off the +x gable
    g.at(o.x, H.y, o.z, o.yaw || 0); g.at(w / 2, 0, 0, 0);
    g.mat('timber', { soft: 0.25 }); for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) { g.box(sw - 0.1, 1.35, z, 0.2, 2.7, 0.2, { grain: 'y' }); g.beam([sw - 0.9, 2.6, z], [sw - 0.1, 2.0, z], 0.12, 0.12); }
    g.box(sw - 0.1, 2.78, 0, 0.22, 0.2, d, { grain: 'z' }); for (let i = 0; i <= 5; i++) { const z = -d / 2 + 0.2 + (i / 5) * (d - 0.4); g.beam([0, 3.75, z], [sw + 0.35, 2.82, z], 0.1, 0.14); }
    g.mat('slate'); g.poly([[0, 3.9, d / 2 + 0.3], [sw + 0.5, 2.9, d / 2 + 0.3], [sw + 0.5, 2.9, -d / 2 - 0.3], [0, 3.9, -d / 2 - 0.3]], { hint: [0.2, 1, 0] });
    g.mat('planks', { tint: '#b0a090', ao: 0.5 }); g.poly([[0, 3.82, d / 2 + 0.3], [sw + 0.5, 2.82, d / 2 + 0.3], [sw + 0.5, 2.82, -d / 2 - 0.3], [0, 3.82, -d / 2 - 0.3]], { hint: [-0.2, -1, 0] });
    // the hearth against the house wall, with a hood
    g.mat('brick', { soft: 0.12 }); g.box(0.75, 0.5, -0.6, 1.5, 1.0, 1.7); g.box(0.4, 2.3, -0.6, 0.8, 2.6, 1.3, { skip: '-y' }); g.box(0.4, 4.6, -0.6, 0.6, 2.2, 0.7);
    g.mat('rock', { tint: '#6a5a50', flags: F.FIRE | F.NOWEATHER, weight: 0.5 }); g.blob(0.85, 1.02, -0.6, 0.42, { squash: [1, 0.3, 1.2], seg: 8, rings: 5, amp: 0.3, seed: 3 });
    fire(g, 0.9, 1.35, -0.6, { r: 9, power: 6, size: 0.55 });
    const fp = wpt(g, 0.9, 1.2, -0.6); W.sounds.push({ x: fp.x, y: fp.y, z: fp.z, kind: 'forge', r: 30, gain: 1 });
    // anvil on a stump
    g.mat('bark'); g.cyl(2.3, 0, 0.5, 0.34, 0.3, 0.55, { sides: 10 });
    g.mat('iron', { soft: 0.15 }); g.box(2.3, 0.62, 0.5, 0.26, 0.14, 0.2); g.box(2.3, 0.75, 0.5, 0.62, 0.14, 0.2); g.poly([[2.61, 0.82, 0.6], [2.61, 0.82, 0.4], [2.95, 0.78, 0.5]]); g.poly([[2.61, 0.68, 0.4], [2.61, 0.68, 0.6], [2.95, 0.78, 0.5]]);
    // quench trough and a rack of bars
    g.mat('planks'); g.box(3.4, 0.3, -1.6, 1.3, 0.6, 0.55); g.mat('glass', { tint: '#5a5a5a' }); g.box(3.4, 0.56, -1.6, 1.16, 0.06, 0.42, { skip: '-y+x-x+z-z' });
    g.mat('iron'); for (let i = 0; i < 6; i++) g.beam([0.12, 0.05, 1.4 + i * 0.12], [0.3 + i * 0.03, 1.9 + (i % 3) * 0.15, 1.45 + i * 0.12], 0.03, 0.03);
    g.pop(); g.pop();
    W.add(g, { name: 'smithy-shed' });
    const c = Math.cos(o.yaw || 0), s = Math.sin(o.yaw || 0), at = (lx, lz) => [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
    for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) { const p = at(w / 2 + sw - 0.1, z); W.solidCircle(p[0], p[1], 0.22); }
    { const p = at(w / 2 + 0.75, -0.6); W.solidBox(p[0], p[1], 0.85, 0.95, o.yaw || 0); const q = at(w / 2 + 2.3, 0.5); W.solidCircle(q[0], q[1], 0.45); const t = at(w / 2 + 3.4, -1.6); W.solidBox(t[0], t[1], 0.7, 0.32, o.yaw || 0); }
    return H;
  };

  // ── chapel: stone nave, buttresses, lancet windows, a tower with a spire and a bell ──────────────────────────────
  A.chapel = (o) => {
    const r = LR.rng(o.seed || 'chapel'), g = new LR.Geo(16384), w = o.w || 7.5, d = o.d || 14, h = o.h || 5.2, tw = o.tower || 4.6, th = o.towerH || 13;
    const y0 = LR.land.level(o.x, o.z, w / 2 + 2, d / 2 + tw + 2, o.yaw || 0, o.y);
    g.at(o.x, y0, o.z, o.yaw || 0);
    g.aoFn = (x, y) => 0.62 + 0.38 * LR.sm(-0.2, 0.7, y);
    g.mat('ashlar', { soft: 0.15 }); g.box(0, 0.05, 0, w + 0.5, 0.7, d + 0.5, { skip: '-y' }); g.aoFn = null;
    // the nave runs along z here: long walls on ±x
    for (const side of ['+x', '-x']) A.side(g, side, w, d, 0.4, 0, (len) => { const items = [], n = 4; for (let i = 0; i < n; i++) items.push({ type: 'window', at: ((i + 0.5) / n) * len, w: 0.85, h: 2.6, y: h * 0.56, arch: true, point: true, seed: r.int(999) }); A.wall(g, len, h, items, { style: 'stone', mat: o.mat || 'rubble', rng: r, quoinPhase: 1 });
      g.mat('ashlar', { soft: 0.18 }); for (let i = 0; i <= n; i++) { const x = (i / n) * len; g.box(x, h * 0.36, 0.35, 0.7, h * 0.72, 0.7, { skip: '-y-z' }); g.poly([[x - 0.35, h * 0.72, 0.7], [x + 0.35, h * 0.72, 0.7], [x + 0.35, h * 0.95, 0], [x - 0.35, h * 0.95, 0]]); g.poly([[x - 0.35, h * 0.72, 0.7], [x - 0.35, h * 0.95, 0], [x - 0.35, h * 0.72, 0]], { hint: [-1, 0, 0] }); g.poly([[x + 0.35, h * 0.72, 0.7], [x + 0.35, h * 0.95, 0], [x + 0.35, h * 0.72, 0]], { hint: [1, 0, 0] }); } });
    A.side(g, '-z', w, d, 0.4, 0, (len) => A.wall(g, len, h, [{ type: 'window', at: len / 2, w: 1.5, h: 3.2, y: h * 0.58, arch: true, point: true, seed: 41 }], { style: 'stone', mat: o.mat || 'rubble', rng: r }));
    A.side(g, '+z', w, d, 0.4, 0, (len) => A.wall(g, len, h, [], { style: 'stone', mat: o.mat || 'rubble', rng: r }));
    // roof: ridge along z → build it turned a quarter
    g.at(0, 0, 0, Math.PI / 2); const R = A.gableRoof(g, d, w, h + 0.4, { pitch: 58, mat: 'slate', eave: 0.35, verge: 0.25, gables: 'stone', gableMat: o.mat || 'rubble', rng: r, sag: 0.04 }); g.pop();
    // tower at the front (+z)
    const tz = d / 2 + tw / 2 - 0.4;
    g.at(0, 0.4, tz, 0);
    for (const side of ['+z', '-z', '+x', '-x']) A.side(g, side, tw, tw, 0, 0, (len) => {
      const items = side === '+z' ? [{ type: 'door', at: len / 2, w: 1.5, h: 2.9, arch: true, tint: '#8a6a4a', lantern: false }] : [];
      if (side !== '-z') items.push({ type: 'window', at: len / 2 + (side === '+z' ? 1e-3 : 0), w: 0.6, h: 1.6, y: th * 0.45, arch: true, seed: 1 });
      // split the wall so the door and the slit are both cut
      if (side === '+z') { A.wall(g, len, th * 0.3, [items[0]], { style: 'stone', mat: o.mat || 'rubble', rng: r }); g.at(0, th * 0.3, 0); A.wall(g, len, th * 0.7, [{ type: 'window', at: len / 2, w: 0.6, h: 1.6, y: th * 0.16, arch: true, seed: 2 }, ], { style: 'stone', mat: o.mat || 'rubble', rng: r, quoinPhase: 1 }); g.pop(); }
      else A.wall(g, len, th, items.filter((i) => i.type === 'window'), { style: 'stone', mat: o.mat || 'rubble', rng: r, quoinPhase: side[1] === 'x' ? 1 : 0 });
      // belfry openings: louvres
      g.mat('planks', { tint: '#8a7a6a', ao: 0.6 }); for (let k = 0; k < 6; k++) g.poly([[len / 2 - 0.55, th - 3.0 + k * 0.3, 0.02], [len / 2 + 0.55, th - 3.0 + k * 0.3, 0.02], [len / 2 + 0.55, th - 2.82 + k * 0.3, -0.12], [len / 2 - 0.55, th - 2.82 + k * 0.3, -0.12]], { two: true });
      g.mat('ashlar', { soft: 0.2 }); g.box(len / 2, th - 3.12, 0.04, 1.4, 0.14, 0.2); g.box(len / 2 - 0.62, th - 2.1, 0.03, 0.14, 2.0, 0.16); g.box(len / 2 + 0.62, th - 2.1, 0.03, 0.14, 2.0, 0.16); g.box(len / 2, th - 1.05, 0.04, 1.4, 0.16, 0.2);
    });
    g.mat('ashlar', { soft: 0.2 }); g.box(0, th + 0.12, 0, tw + 0.36, 0.26, tw + 0.36);
    const sh = o.spire || 7.5, e = tw / 2 + 0.3, top = [0, th + 0.25 + sh, 0];
    g.mat('slate'); for (const [a, b] of [[[-e, e], [e, e]], [[e, e], [e, -e]], [[e, -e], [-e, -e]], [[-e, -e], [-e, e]]]) g.poly([[a[0], th + 0.25, a[1]], [b[0], th + 0.25, b[1]], top]);
    g.mat('iron'); g.box(0, th + 0.25 + sh + 0.55, 0, 0.07, 1.3, 0.07); g.box(0, th + 0.25 + sh + 0.8, 0, 0.6, 0.07, 0.07);
    const bp = wpt(g, 0, th - 2, 0); W.sounds.push({ x: bp.x, y: bp.y, z: bp.z, kind: 'bell', r: 220, gain: 1 });
    g.mat('ashlar', { soft: 0.2 }); for (let i = 0; i < 3; i++) g.box(0, -0.33 + i * 0.13 - 0.07, tw / 2 + 0.9 - i * 0.28, 2.6 - i * 0.2, 0.14, 0.6);
    g.pop(); g.pop();
    W.add(g, { name: 'chapel' });
    const yaw = o.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw); W.solidBox(o.x, o.z, w / 2 + 0.75, d / 2 + 0.3, yaw); W.solidBox(o.x + tz * s, o.z + tz * c, tw / 2 + 0.2, tw / 2 + 0.2, yaw);
    return { y: y0, door: [o.x + (tz + tw / 2 + 1.6) * s, o.z + (tz + tw / 2 + 1.6) * c], top: y0 + th + sh };
  };

  // ── windmill: a tapered stone tower, a boarded cap, four sails that turn with the wind ────────────────────────────
  A.windmill = (o) => {
    const g = new LR.Geo(16384), r0 = o.r || 3.3, r1 = r0 * 0.7, h = o.h || 9.5, yaw = o.yaw || 0, y0 = LR.land.levelDisc(o.x, o.z, r0 + 1.5, o.y);
    g.at(o.x, y0, o.z, yaw);
    g.aoFn = (x, y) => 0.62 + 0.38 * LR.sm(-0.2, 0.8, y);
    g.mat('rubble'); g.lathe(0, 0, [[r0 + 0.12, -0.5], [r0 + 0.1, 0.5], [r0, 0.55], [LR.lerp(r0, r1, 0.5), h * 0.5], [r1, h]], { sides: 24 }); g.aoFn = null;
    g.mat('ashlar', { soft: 0.2 }); g.lathe(0, 0, [[r1, h], [r1 + 0.16, h + 0.02], [r1 + 0.16, h + 0.22], [r1 - 0.1, h + 0.24]], { sides: 24 });
    // door and windows set on the curve
    g.at(0, 0, r0 - 0.05, 0); A.door(g, 0, { w: 1.1, h: 2.1, depth: 0.2, frame: 'ashlar', arch: true, tint: '#8a6a4a' }); A.lantern(g, 0.95, 2.2, {}); g.pop();
    for (const [a, yy] of [[2.2, 3.4], [-1.9, 5.6], [0.3, 6.8], [3.6, 6.2]]) { const rr = LR.lerp(r0, r1, yy / h) - 0.04; g.at(Math.sin(a) * rr, yy, Math.cos(a) * rr, a); A.window(g, 0, 0, { w: 0.6, h: 0.85, depth: 0.2, frame: 'ashlar', seed: Math.round(a * 10) }); g.pop(); }
    // the cap: a boarded roof like an upturned boat, the windshaft out of its front
    g.mat('boards', { tint: '#b8a48a' }); const cp = []; for (let i = 0; i <= 6; i++) { const t = i / 6; cp.push([(r1 + 0.35) * Math.cos(t * Math.PI / 2) + 0.02, h + 0.24 + 2.5 * Math.sin(t * Math.PI / 2)]); } g.lathe(0, 0, cp, { sides: 16 });
    g.mat('timber', { soft: 0.2 }); g.beam([0, h + 1.15, r1 - 0.4], [0, h + 1.5, r1 + 1.3], 0.32, 0.32);
    g.beam([0, h + 0.8, -r1 + 0.3], [0, h - 2.6, -r1 - 2.6], 0.14, 0.14); g.beam([0, h - 2.6, -r1 - 2.6], [0, y0 * 0 + 0.9, -r1 - 3.0], 0.12, 0.12);
    const hub = wpt(g, 0, h + 1.5, r1 + 1.3); g.pop();
    W.add(g, { name: 'windmill' }); W.solidCircle(o.x, o.z, r0 + 0.25);
    // the sails: written round the origin, turning about z; the mesh sits at the hub, tilted back a little
    const sg = new LR.Geo(), L = o.sail || 7.2;
    for (let k = 0; k < 4; k++) { sg.at(0, 0, 0, 0, 0, (k * Math.PI) / 2);
      sg.mat('timber', { soft: 0.2 }); sg.beam([0, 0, 0], [0, L, 0], 0.16, 0.14); const sw = 1.45;
      sg.beam([sw, 1.2, 0.02], [sw, L - 0.1, 0.02], 0.06, 0.06); for (let i = 0; i <= 8; i++) { const yy = 1.2 + (i / 8) * (L - 1.3); sg.beam([0, yy, 0.03], [sw, yy, 0.03], 0.05, 0.05); } for (const xx of [0.5, 1.0]) sg.beam([xx, 1.2, 0.03], [xx, L - 0.1, 0.03], 0.035, 0.035);
      sg.mat('cloth', { tint: '#e8dcc4', flags: F.SWAY, weight: 0.12 }); sg.poly([[0.06, 1.3, 0.06], [sw - 0.04, 1.3, 0.06], [sw - 0.04, L * 0.86, 0.06], [0.06, L * 0.86, 0.06]], { two: true });
      sg.pop(); }
    sg.mat('iron'); sg.cyl(0, -0.001, 0, 0.3, 0.3, 0.002, { sides: 8 });
    const sm = W.add(sg, { kinetic: true, name: 'sails', double: true });
    sm.position.copy(hub); sm.rotation.order = 'YXZ'; sm.rotation.set(-0.2, yaw, 0); A.spin(sm, 'z', 0.55, 0.85);
    W.sounds.push({ x: hub.x, y: hub.y, z: hub.z, kind: 'mill', r: 45, gain: 0.8 });
    return { y: y0, hub };
  };

  // a water wheel on an axle; returns the kinetic mesh.  centre (x, y, z) in the world, axis along the yaw's x
  A.waterWheel = (x, y, z, yaw, o = {}) => {
    const g = new LR.Geo(), R = o.r || 2.2, wd = o.width || 1.0, n = 16;
    for (const s of [-1, 1]) { g.mat('timber', { soft: 0.2 }); for (let i = 0; i < n; i++) { const a0 = (i / n) * LR.TAU, a1 = ((i + 1) / n) * LR.TAU; g.beam([s * wd / 2, Math.cos(a0) * R, Math.sin(a0) * R], [s * wd / 2, Math.cos(a1) * R, Math.sin(a1) * R], 0.09, 0.22, { up: [s, 0, 0], caps: false }); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * LR.TAU; g.beam([s * wd / 2, 0, 0], [s * wd / 2, Math.cos(a) * (R - 0.1), Math.sin(a) * (R - 0.1)], 0.08, 0.1, { caps: false }); } }
    g.mat('planks', { tint: '#b8a898' }); for (let i = 0; i < n; i++) { const a = (i / n) * LR.TAU, c = Math.cos(a), s = Math.sin(a); g.poly([[-wd / 2, c * (R - 0.42), s * (R - 0.42)], [wd / 2, c * (R - 0.42), s * (R - 0.42)], [wd / 2, c * (R + 0.08), s * (R + 0.08)], [-wd / 2, c * (R + 0.08), s * (R + 0.08)]], { two: true }); }
    g.mat('timber'); g.beam([-wd / 2 - 0.7, 0, 0], [wd / 2 + 0.5, 0, 0], 0.26, 0.26);
    const m = W.add(g, { kinetic: true, name: 'wheel', double: true }); m.position.set(x, y, z); m.rotation.order = 'YXZ'; m.rotation.set(0, yaw, 0); A.spin(m, 'x', o.speed || -0.7, 0); A.spinners[A.spinners.length - 1].freeze = true;
    W.sounds.push({ x, y, z, kind: 'waterwheel', r: 38, gain: 1 });
    return m;
  };

  // ── palisade and gate ───────────────────────────────────────────────────────────────────────────────────────────
  // pts: [[x,z],…] in the world.  o: { h, r, gap: [[x,z,width]…] left open }
  A.palisade = (pts, o = {}) => {
    const g = new LR.Geo(32768), r = LR.rng(o.seed || 'pal'), h = o.h || 3.3, rad = o.r || 0.16, step = rad * 2.05;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step)), dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.05, z = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.05, y = LR.land.h(x, z) - 0.3, hh = h + (r() - 0.5) * 0.5, rr = rad * (0.85 + r() * 0.3), lean = (r() - 0.5) * 0.06;
        g.mat(i % 7 === 3 ? 'pinebark' : 'timber', { tint: A.vary('#e8e0d4', r, 0.14), uv: i % 9 === 0 }); g.aoFn = (px, py) => 0.6 + 0.4 * LR.sm(y, y + 1.0, py);
        g.tube([[x, y, z], [x + lean, y + hh - 0.35, z + lean * 0.5], [x + lean * 1.2, y + hh + 0.3, z + lean * 0.6]], [rr, rr * 0.92, 0.02], { sides: 6 }); }
      g.aoFn = null; g.mat('timber', { soft: 0.2 }); const y0 = LR.land.h(a[0], a[1]), y1 = LR.land.h(b[0], b[1]), nx = -dz * (rad + 0.07), nz = dx * (rad + 0.07);
      for (const hh of [0.9, h - 0.7]) g.beam([a[0] + nx, y0 + hh, a[1] + nz], [b[0] + nx, y1 + hh, b[1] + nz], 0.14, 0.16);
      W.solidBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len / 2, rad + 0.15, Math.atan2(-dz, dx));
    }
    W.add(g, { name: 'palisade' }); return g;
  };
  // a gate: two timber towers either side of an opening `gap` wide, facing along yaw.  returns { y }
  A.gate = (o) => {
    const g = new LR.Geo(16384), gap = o.gap || 4.6, tw = 3.2, h = o.h || 6.2, yaw = o.yaw || 0, y0 = LR.land.level(o.x, o.z, gap / 2 + tw + 1, 2.5, yaw, o.y), r = LR.rng(o.seed || 'gate');
    g.at(o.x, y0, o.z, yaw);
    for (const s of [-1, 1]) {
      const cx = s * (gap / 2 + tw / 2);
      g.aoFn = (x, y) => 0.6 + 0.4 * LR.sm(-0.2, 0.8, y); g.mat('rubble'); g.box(cx, 1.3, 0, tw, 3.2, tw, { skip: '-y' }); g.aoFn = null;
      g.at(cx, 2.9, 0); for (const side of ['+z', '-z', '+x', '-x']) A.side(g, side, tw + 0.5, tw + 0.5, 0, 0, (len) => A.wall(g, len, h - 2.9, [{ type: 'window', at: len / 2, w: 0.5, h: 0.8, y: (h - 2.9) * 0.55, shutters: null, seed: r.int(99) }], { style: 'timber', rng: r, bay: 1.9, brace: 'cross', skipCorners: side[1] === 'x' }));
      g.at(0, 0, 0, Math.PI / 2); A.gableRoof(g, tw + 0.5, tw + 0.5, h - 2.9, { pitch: 55, mat: 'slate', eave: 0.4, verge: 0.3, gables: 'timber', rng: r, sag: 0.02, atticWindow: false }); g.pop(); g.pop();
      // a torch by the opening
      g.mat('iron'); g.tube([[cx - s * (tw / 2 + 0.02), 2.3, 1.2], [cx - s * (tw / 2 + 0.3), 2.5, 1.2]], 0.02, { sides: 5 }); g.mat('timber'); g.cyl(cx - s * (tw / 2 + 0.3), 2.3, 1.2, 0.035, 0.05, 0.5, { sides: 6 });
      g.mat('rock', { flags: F.FIRE | F.NOWEATHER, weight: 0.6 }); g.blob(cx - s * (tw / 2 + 0.3), 2.86, 1.2, 0.09, { seg: 5, rings: 4 }); fire(g, cx - s * (tw / 2 + 0.3), 3.0, 1.2, { r: 9, power: 4, size: 0.28, day: 0.25 });
      // the leaf of the gate, standing open
      g.mat('planks'); g.at(cx - s * tw / 2, 0, 0.3, s * 1.25); g.box(-s * gap / 4, 1.7, 0, gap / 2 - 0.1, 3.3, 0.1, { grain: 'y' }); g.mat('iron'); for (const yy of [0.6, 1.7, 2.8]) g.box(-s * gap / 4, yy, 0.06, gap / 2 - 0.2, 0.08, 0.02); g.pop();
    }
    g.mat('timber', { soft: 0.2 }); g.box(0, 3.95, 0, gap + 0.6, 0.34, 0.4, { grain: 'x' }); g.box(0, 4.6, 0, gap + 0.6, 0.2, 2.2, { grain: 'x' });
    for (let i = 0; i <= 6; i++) g.box(-gap / 2 + (i / 6) * gap, 5.15, 1.05, 0.1, 0.9, 0.1, { grain: 'y' }); g.box(0, 5.6, 1.05, gap + 0.4, 0.1, 0.12, { grain: 'x' });
    // banners
    for (const s of [-1, 1]) { g.mat('cloth', { tint: o.banner || '#b8433a', flags: F.SWAY, weight: 0.5 }); const bx = s * (gap / 2 + tw / 2); g.poly([[bx - 0.45, 5.0, tw / 2 + 0.34], [bx + 0.45, 5.0, tw / 2 + 0.34], [bx + 0.45, 3.3, tw / 2 + 0.36], [bx, 2.9, tw / 2 + 0.37], [bx - 0.45, 3.3, tw / 2 + 0.36]], { two: true, hint: [0, 0, 1] }); g.mat('timber'); g.box(bx, 5.05, tw / 2 + 0.36, 1.1, 0.07, 0.07); }
    g.pop(); W.add(g, { name: 'gate', double: true });
    const c = Math.cos(yaw), s = Math.sin(yaw); for (const k of [-1, 1]) { const lx = k * (gap / 2 + tw / 2); W.solidBox(o.x + lx * c, o.z - lx * s, tw / 2 + 0.3, tw / 2 + 0.3, yaw); }
    return { y: y0, ends: [-1, 1].map((k) => { const lx = k * (gap / 2 + tw + 0.1); return [o.x + lx * c, o.z - lx * s]; }) };
  };

  // ── an arched stone bridge.  from a to b ([x,z]) at deck level y (at the ends); width; rise of the deck ──────────
  A.bridge = (a, b, o = {}) => {
    const g = new LR.Geo(8192), len = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), wd = o.width || 3.6, rise = o.rise === undefined ? 0.7 : o.rise, ya = o.ya !== undefined ? o.ya : LR.land.h(a[0], a[1]), yb = o.yb !== undefined ? o.yb : LR.land.h(b[0], b[1]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, n = 14, par = 0.85, span = o.span || len * 0.56, ah = o.arch || span * 0.42, bot = o.bottom !== undefined ? o.bottom : Math.min(ya, yb) - 2.6;
    const deck = (x) => LR.lerp(ya, yb, x / len + 0.5) + rise * (1 - Math.pow((2 * x) / len, 2));
    const under = (x) => { const t = x / (span / 2); return Math.abs(t) < 1 ? Math.min(deck(x) - 0.45, Math.min(ya, yb) - 0.55 + rise * 0.3) - (1 - Math.sqrt(Math.max(0, 1 - t * t))) * ah : bot; };
    g.at(cx, 0, cz, yaw);
    for (let i = 0; i < n; i++) {
      const x0 = -len / 2 + (i / n) * len, x1 = -len / 2 + ((i + 1) / n) * len, d0 = deck(x0), d1 = deck(x1), u0 = under(x0), u1 = under(x1);
      g.mat('cobble', { uv: i === 0 }); g.poly([[x0, d0, wd / 2], [x1, d1, wd / 2], [x1, d1, -wd / 2], [x0, d0, -wd / 2]], { hint: [0, 1, 0] });
      for (const s of [-1, 1]) {
        g.mat('rubble', { uv: i === 0 }); g.poly([[x0, u0, s * (wd / 2 + 0.28)], [x1, u1, s * (wd / 2 + 0.28)], [x1, d1 + par, s * (wd / 2 + 0.28)], [x0, d0 + par, s * (wd / 2 + 0.28)]], { hint: [0, 0, s], ao: [0.6, 0.6, 1, 1] });
        g.poly([[x0, d0, s * (wd / 2)], [x1, d1, s * (wd / 2)], [x1, d1 + par, s * (wd / 2)], [x0, d0 + par, s * (wd / 2)]], { hint: [0, 0, -s], ao: [0.7, 0.7, 1, 1] });
        g.mat('ashlar', { uv: i === 0 }); g.poly([[x0, d0 + par, s * (wd / 2 - 0.03)], [x1, d1 + par, s * (wd / 2 - 0.03)], [x1, d1 + par, s * (wd / 2 + 0.31)], [x0, d0 + par, s * (wd / 2 + 0.31)]], { hint: [0, 1, 0] });
      }
      g.mat('rubble', { ao: 0.55, uv: false }); g.poly([[x0, u0, wd / 2 + 0.28], [x1, u1, wd / 2 + 0.28], [x1, u1, -wd / 2 - 0.28], [x0, u0, -wd / 2 - 0.28]], { hint: [0, -1, 0] });
    }
    for (const e of [-1, 1]) { g.mat('rubble'); g.poly([[e * len / 2, bot, wd / 2 + 0.28], [e * len / 2, bot, -wd / 2 - 0.28], [e * len / 2, deck(e * len / 2) + par, -wd / 2 - 0.28], [e * len / 2, deck(e * len / 2) + par, wd / 2 + 0.28]], { hint: [e, 0, 0] }); g.mat('ashlar', { soft: 0.2 }); for (const s of [-1, 1]) g.box(e * (len / 2 - 0.2), deck(e * len / 2) + par / 2 + 0.1, s * (wd / 2 + 0.14), 0.5, par + 0.3, 0.5, { skip: '-y' }); }
    g.pop(); W.add(g, { name: 'bridge' });
    const c = Math.cos(yaw), s = Math.sin(yaw);
    W.floors.push({ x: cx, z: cz, hx: len / 2, hz: wd / 2, yaw, c, s, h: (lx) => deck(lx) });
    for (const k of [-1, 1]) { const lz = k * (wd / 2 + 0.14); W.solidBox(cx + lz * s, cz + lz * c, len / 2, 0.2, yaw, { rail: true }); }
    return { deck, len, yaw };
  };

  // ── a well with a roof ──────────────────────────────────────────────────────────────────────────────────────────
  A.well = (o) => {
    const g = new LR.Geo(), y0 = o.y !== undefined ? o.y : LR.land.h(o.x, o.z); g.at(o.x, y0, o.z, o.yaw || 0);
    g.aoFn = (x, y) => 0.6 + 0.4 * LR.sm(-0.1, 0.5, y); g.mat('rubble', { scale: 0.7 }); g.lathe(0, 0, [[1.12, -0.3], [1.1, 0.85], [0.8, 0.85], [0.78, 0.2]], { sides: 16 }); g.aoFn = null;
    g.mat('ashlar', { soft: 0.2 }); g.lathe(0, 0, [[1.16, 0.83], [1.18, 0.95], [0.74, 0.95], [0.76, 0.83]], { sides: 16 });
    g.mat('glass', { tint: '#404848', ao: 0.4 }); g.cyl(0, 0.2, 0, 0.78, 0.78, 0.02, { sides: 16 });
    g.mat('timber', { soft: 0.25 }); for (const s of [-1, 1]) { g.box(s * 1.0, 1.55, 0, 0.16, 2.3, 0.16, { grain: 'y' }); g.beam([s * 1.0, 2.2, 0], [s * 0.55, 2.62, 0], 0.09, 0.09); }
    g.cyl(0, 2.05, 0, 0.09, 0.09, 0, { sides: 6 }); g.beam([-1.0, 2.1, 0], [1.25, 2.1, 0], 0.14, 0.14); g.mat('iron'); g.tube([[1.25, 2.1, 0], [1.42, 2.1, 0], [1.42, 1.86, 0], [1.6, 1.86, 0]], 0.018, { sides: 5 });
    g.mat('cloth', { tint: '#b8a680' }); g.tube([[0.1, 2.1, 0.07], [0.12, 1.2, 0.3]], 0.015, { sides: 4 }); g.mat('planks'); g.lathe(0.12, 0.3, [[0.13, 0.96], [0.17, 1.24], [0.15, 1.24], [0.11, 0.99]], { sides: 9 });
    g.at(0, 0, 0, 0); A.gableRoof(g, 2.6, 1.7, 2.62, { pitch: 42, mat: o.roof || 'tiles', eave: 0.2, verge: 0.2, rafters: false, sag: 0.02, thick: 0.07 }); g.pop();
    g.pop(); W.add(g, { name: 'well' }); W.solidCircle(o.x, o.z, 1.3);
  };

  // ── a fountain: stone basin, a pillar with a bowl; the water kit fills it ────────────────────────────────────────
  A.fountain = (o) => {
    const g = new LR.Geo(), r = o.r || 2.7, y0 = o.y !== undefined ? o.y : LR.land.h(o.x, o.z); g.at(o.x, y0, o.z, 0);
    g.aoFn = (x, y) => 0.65 + 0.35 * LR.sm(-0.1, 0.4, y); g.mat('ashlar', { soft: 0.15 }); g.lathe(0, 0, [[r + 0.35, -0.3], [r + 0.35, 0.16], [r + 0.2, 0.2], [r + 0.2, 0.72], [r + 0.28, 0.76], [r + 0.28, 0.9], [r - 0.12, 0.9], [r - 0.1, 0.1], [0, 0.08]], { sides: 12 }); g.aoFn = null;
    g.mat('ashlar', { soft: 0.15, scale: 0.6 }); g.lathe(0, 0, [[0.55, 0.05], [0.5, 0.5], [0.3, 0.7], [0.26, 1.7], [0.4, 1.9], [1.05, 2.15], [1.1, 2.3], [0.95, 2.3], [0.35, 2.12], [0.2, 2.2], [0.16, 3.0], [0.3, 3.15], [0.12, 3.5], [0.0, 3.55]], { sides: 12 });
    g.pop(); W.add(g, { name: 'fountain' }); W.solidCircle(o.x, o.z, r + 0.45);
    if (LR.water) { LR.water.disc(o.x, y0 + 0.68, o.z, r - 0.1); LR.water.disc(o.x, y0 + 2.26, o.z, 0.98); }
    W.sounds.push({ x: o.x, y: y0 + 1, z: o.z, kind: 'fountain', r: 26, gain: 1 });
    W.fountains = W.fountains || []; W.fountains.push({ x: o.x, y: y0 + 2.28, z: o.z, r: 1.0, fall: 1.6, basin: r - 0.3 });
    return { y: y0 };
  };

  // ── a market stall: posts, a counter, a striped awning, goods ────────────────────────────────────────────────────
  A.stall = (o) => {
    const g = new LR.Geo(), r = LR.rng(o.seed || 'stall' + o.x + o.z), w = o.w || 3.2, d = o.d || 2.1, y0 = o.y !== undefined ? o.y : LR.land.h(o.x, o.z), cols = o.colors || r.pick([['#c9473a', '#efe6d2'], ['#3f6f9a', '#efe6d2'], ['#d8a03a', '#efe6d2'], ['#5f8a55', '#efe6d2']]);
    g.at(o.x, y0, o.z, o.yaw || 0);
    g.mat('timber', { soft: 0.25 }); for (const sx of [-1, 1]) { g.box(sx * w / 2, 1.2, d / 2, 0.11, 2.4, 0.11, { grain: 'y' }); g.box(sx * w / 2, 1.45, -d / 2, 0.11, 2.9, 0.11, { grain: 'y' }); g.beam([sx * w / 2, 2.4, d / 2], [sx * w / 2, 2.9, -d / 2], 0.08, 0.08); }
    g.beam([-w / 2, 2.4, d / 2], [w / 2, 2.4, d / 2], 0.08, 0.08); g.beam([-w / 2, 2.9, -d / 2], [w / 2, 2.9, -d / 2], 0.08, 0.08);
    g.mat('planks'); g.box(0, 0.86, d / 2 - 0.35, w, 0.07, 0.8); g.box(0, 0.42, d / 2 - 0.02, w, 0.84, 0.05, { grain: 'x' }); g.box(0, 0.5, -d / 2 + 0.25, w * 0.9, 0.06, 0.5);
    const ns = 8; for (let i = 0; i < ns; i++) { const x0 = -w / 2 - 0.15 + (i / ns) * (w + 0.3), x1 = -w / 2 - 0.15 + ((i + 1) / ns) * (w + 0.3); g.mat('cloth', { tint: cols[i % 2], flags: F.SWAY, weight: 0.12, uv: i === 0 });
      g.poly([[x0, 2.36, d / 2 + 0.45], [x1, 2.36, d / 2 + 0.45], [x1, 2.98, -d / 2 - 0.15], [x0, 2.98, -d / 2 - 0.15]], { two: true, hint: [0, 1, 0] });
      g.mat('cloth', { tint: cols[i % 2], flags: F.SWAY, weight: 0.5, uv: false }); g.poly([[x0, 2.36, d / 2 + 0.45], [x1, 2.36, d / 2 + 0.45], [x1, 2.12, d / 2 + 0.47], [(x0 + x1) / 2, 2.02, d / 2 + 0.47], [x0, 2.12, d / 2 + 0.47]], { two: true, hint: [0, 0, 1] }); }
    // goods on the counter
    const goods = o.goods || r.pick(['fruit', 'bread', 'cloth', 'pots', 'greens']);
    for (let i = 0; i < 5; i++) { const gx = -w / 2 + 0.35 + (i / 4) * (w - 0.7), gz = d / 2 - 0.35 + (r() - 0.5) * 0.2;
      if (goods === 'cloth') { g.mat('cloth', { tint: r.pick(['#a4423a', '#3f5f8a', '#c8a23a', '#5a7a4a', '#7a4a7a', '#e8dcc0']) }); g.box(gx, 0.96 + r() * 0.05, gz, 0.42, 0.12 + r() * 0.1, 0.5, { soft: 0.4 }); continue; }
      if (goods === 'pots') { g.mat('tiles', { tint: r.pick(['#f0d8c0', '#c8a890', '#e8e0d0']) }); const s = 0.8 + r() * 0.5; g.lathe(gx, gz, [[0.07 * s, 0.9], [0.14 * s, 0.98], [0.15 * s, 1.1], [0.08 * s, 1.2], [0.1 * s, 1.24]], { sides: 9 }); continue; }
      g.mat('planks'); g.box(gx, 0.96, gz, 0.46, 0.14, 0.4);
      const tint = goods === 'fruit' ? r.pick(['#c83a2e', '#d8a02e', '#7a9a3a', '#b84a6a']) : goods === 'bread' ? '#c89a5a' : r.pick(['#5f8a3f', '#7aa04a', '#d8d0b0']);
      for (let k = 0; k < 7; k++) { g.mat(goods === 'greens' ? 'moss' : 'cloth', { tint: A.vary(tint, r, 0.12) }); g.blob(gx + (r() - 0.5) * 0.32, 1.06 + r() * 0.04, gz + (r() - 0.5) * 0.26, goods === 'bread' ? 0.09 : 0.065, { seg: 6, rings: 4, squash: goods === 'bread' ? [1.5, 0.7, 1] : [1, 1, 1], amp: 0.12, seed: k + i * 9 }); } }
    g.pop(); W.add(g, { name: 'stall', double: true });
    W.solidBox(o.x, o.z, w / 2 + 0.1, d / 2 + 0.15, o.yaw || 0);
  };

  // What people leave against their walls.  h: what A.house() returned; o: { seed, climbers (0–3), pots, planters, stuff }
  // — everything stands within a metre of the wall (keep ways clear: check.mjs --walk).  Climbers need LR.flora.
  A.dress = (h, o = {}) => {
    const r = LR.rng('dress' + (o.seed || h.w + ':' + h.d)), P = LR.props, w = h.w, d = h.d, c0 = h.toW(0, 0), cx = h.toW(1, 0), cz = h.toW(0, 1);
    const yaw = Math.atan2(-(cx[1] - c0[1]), cx[0] - c0[0]), at = (lx, lz) => h.toW(lx, lz), free = (x, z) => !LR.water || LR.water.levelAt(x, z) < LR.land.h(x, z) + 0.05;
    const sides = [['+z', (t, out) => at((t - 0.5) * w, d / 2 + out), 0], ['-z', (t, out) => at((t - 0.5) * w, -d / 2 - out), Math.PI], ['+x', (t, out) => at(w / 2 + out, (t - 0.5) * d), Math.PI / 2], ['-x', (t, out) => at(-w / 2 - out, (t - 0.5) * d), -Math.PI / 2]];
    const nc = o.climbers === undefined ? 1 + r.int(2) : o.climbers;
    if (LR.flora) for (let i = 0; i < nc; i++) { const sd = r.pick(sides), t = r.pick([0.06, 0.94, 0.12 + r() * 0.2, 0.7 + r() * 0.2]), p = sd[1](t, 0.1); if (free(p[0], p[1])) LR.flora.plant('climber', p[0], p[1], { scale: 0.8 + r() * 0.5 }); }
    // by the door: a pot or two
    if (o.pots !== false && h.door) { const dx = cx[0] - c0[0], dz = cx[1] - c0[1], ox = cz[0] - c0[0], oz = cz[1] - c0[1]; for (const s of r() < 0.6 ? [-1, 1] : [r() < 0.5 ? -1 : 1]) { const x = h.door[0] + dx * s * 0.95 + ox * 0.32, z = h.door[1] + dz * s * 0.95 + oz * 0.32; if (free(x, z)) P.pot(x, z, { size: 1.0 + r() * 0.5 }); } }
    // under the windows: a planter on the front or a side
    const np = o.planters === undefined ? r.int(3) : o.planters;
    for (let i = 0; i < np; i++) { const sd = sides[i === 0 ? 0 : 2 + r.int(2)], t = 0.14 + r() * 0.16 + (r() < 0.5 ? 0.56 : 0), p = sd[1](t, 0.3); if (free(p[0], p[1])) P.planter(p[0], p[1], { yaw: yaw + sd[2], len: 0.9 + r() * 0.5 }); }
    // round the side or the back: what there was no room for indoors
    const ns = o.stuff === undefined ? 1 + r.int(2) : o.stuff;
    for (let i = 0; i < ns; i++) { const sd = sides[1 + r.int(3)], t = 0.15 + r() * 0.7, kind = r.pick(['barrel', 'barrel', 'crate', 'sack', 'woodpile']), p = sd[1](t, kind === 'woodpile' ? 0.42 : 0.5); if (!free(p[0], p[1])) continue;
      if (kind === 'barrel') { P.barrel(p[0], p[1]); if (r() < 0.4) { const q = sd[1](t + 0.9 / (sd[2] % Math.PI === 0 ? w : d), 0.5); P.barrel(q[0], q[1]); } }
      else if (kind === 'crate') P.crate(p[0], p[1], { yaw: yaw + sd[2] + (r() - 0.5) * 0.5 }); else if (kind === 'sack') P.sack(p[0], p[1], { yaw: r() * 6 }); else P.woodpile(p[0], p[1], { yaw: yaw + sd[2], len: 1.4 + r() * 0.8, rows: 3 }); }
  };
}
