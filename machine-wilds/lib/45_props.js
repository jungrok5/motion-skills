// machine-wilds · 45_props — the small things that make a place lived in.  Every prop writes into a batch for its
// part of the world (LR.props.g(x, z): one mesh per 48 m cell), stands on the land, and registers a solid if you
// would bump into it.  LR.props.flush() adds the batches to the world (the app calls it after build).
{
  const T = THREE, F = LR.FLAG, A = LR.arch, W = LR.world;
  const P = (LR.props = { cells: new Map(), CELL: 48 });
  P.g = (x, z) => { const k = Math.floor(x / P.CELL) + ':' + Math.floor(z / P.CELL); let g = P.cells.get(k); if (!g) { g = new LR.Geo(4096); P.cells.set(k, g); } return g; };
  P.flush = () => { for (const g of P.cells.values()) W.add(g, { name: 'props', double: true }); P.cells.clear(); };
  LR.on('built', () => P.flush(), 10);
  const Y = (x, z, o) => (o && o.y !== undefined ? o.y : LR.land.h(x, z));
  const rngAt = (x, z, tag) => LR.rng(tag + ':' + Math.round(x * 10) + ':' + Math.round(z * 10));
  const begin = (x, z, o = {}) => { const g = P.g(x, z); g.at(x, Y(x, z, o), z, o.yaw || 0); if (o.scale) g.push(new T.Matrix4().makeScale(o.scale, o.scale, o.scale)); return g; };
  const end = (g, o = {}) => { if (o.scale) g.pop(); g.pop(); };
  const ground = (g) => { const base = g.m.elements[13]; g.aoFn = (x, y, z, wx, wy) => 0.55 + 0.45 * LR.sm(0, 0.35, wy - base); }, noAo = (g) => { g.aoFn = null; };

  P.barrel = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'b'); ground(g);
    if (o.lying) g.at(0, 0.36, 0, 0, 0, Math.PI / 2);
    g.mat('planks', { tint: A.vary('#d8c8b0', r, 0.1) }); g.lathe(0, 0, [[0.27, 0], [0.33, 0.25], [0.35, 0.45], [0.33, 0.68], [0.27, 0.9], [0.24, 0.9], [0.24, 0.86], [0.0, 0.86]], { sides: 12 }); g.cyl(0, 0, 0, 0.27, 0.27, 0.001, { sides: 12 });
    g.mat('iron'); for (const [yy, rr] of [[0.1, 0.305], [0.35, 0.352], [0.58, 0.345], [0.82, 0.3]]) g.lathe(0, 0, [[rr, yy - 0.025], [rr + 0.012, yy], [rr, yy + 0.025]], { sides: 12 });
    if (o.lying) g.pop(); noAo(g); end(g, o); if (o.solid !== false) W.solidCircle(x, z, 0.4 * (o.scale || 1)); };
  P.crate = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'c'), s = o.size || 0.62; ground(g);
    g.mat('planks', { tint: A.vary('#d8c8b0', r, 0.12) }); g.box(0, s / 2, 0, s, s, s, { skip: '-y' });
    g.mat('timber', { soft: 0.2 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * (s / 2), s / 2, sz * (s / 2), 0.06, s + 0.02, 0.06, { grain: 'y' });
    for (const sy of [0.05, s - 0.05]) { g.box(0, sy, s / 2, s, 0.06, 0.04, { grain: 'x' }); g.box(0, sy, -s / 2, s, 0.06, 0.04, { grain: 'x' }); g.box(s / 2, sy, 0, 0.04, 0.06, s, { grain: 'z' }); g.box(-s / 2, sy, 0, 0.04, 0.06, s, { grain: 'z' }); }
    noAo(g); end(g, o); if (o.solid !== false) W.solidBox(x, z, s / 2 + 0.08, s / 2 + 0.08, o.yaw || 0); };
  P.sack = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 's'); ground(g); g.mat('cloth', { tint: A.vary('#b8a47c', r, 0.1) }); g.blob(0, 0.26, 0, 0.3, { squash: [1, 0.95, 0.8], seg: 9, rings: 6, amp: 0.14, seed: r.int(99), flat: 0.8 }); g.blob(0, 0.56, 0, 0.09, { squash: [1.3, 0.8, 1], seg: 6, rings: 4, amp: 0.3 }); noAo(g); end(g, o); };
  P.haystack = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'h'), s = o.size || 1.5; ground(g); g.mat('hay', { tint: A.vary('#f0e2c0', r, 0.08) }); g.blob(0, s * 0.62, 0, s, { squash: [1, 0.85, 1], seg: 14, rings: 8, amp: 0.1, seed: r.int(99), flat: 0.72 }); noAo(g); end(g, o); W.solidCircle(x, z, s * 0.92); };
  P.woodpile = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'w'), len = o.len || 2.2, rows = o.rows || 4; ground(g);
    for (let j = 0; j < rows; j++) { const n = Math.floor(len / 0.24) - (j % 2); for (let i = 0; i < n; i++) { const rr = 0.1 + r() * 0.03, xx = -len / 2 + 0.13 + i * 0.24 + (j % 2) * 0.12, yy = 0.12 + j * 0.2, l = 0.5 + r() * 0.08; g.mat(r() < 0.5 ? 'bark' : 'pinebark', { uv: i === 0 }); g.tube([[xx, yy, -l / 2], [xx, yy, l / 2]], rr, { sides: 7 }); g.mat('timber', { tint: '#f0dcc0', uv: false }); for (const e of [-1, 1]) { const pts = []; for (let k = 0; k < 7; k++) { const a = (k / 7) * LR.TAU; pts.push([xx + Math.cos(a) * rr, yy + Math.sin(a) * rr, e * l / 2]); } g.poly(pts, { hint: [0, 0, e] }); } } }
    g.mat('timber'); for (const e of [-1, 1]) g.box(e * (len / 2 + 0.06), rows * 0.1 + 0.1, 0, 0.09, rows * 0.2 + 0.3, 0.09, { grain: 'y' });
    noAo(g); end(g, o); W.solidBox(x, z, len / 2 + 0.15, 0.4, o.yaw || 0); };
  P.bench = (x, z, o = {}) => { const g = begin(x, z, o); ground(g); g.mat('planks'); g.box(0, 0.46, 0, 1.7, 0.07, 0.42); g.mat('timber', { soft: 0.2 }); for (const sx of [-0.7, 0.7]) { g.box(sx, 0.22, 0, 0.09, 0.44, 0.36, { grain: 'y' }); if (o.back !== false) g.box(sx, 0.72, -0.2, 0.07, 0.6, 0.07, { grain: 'y' }); } if (o.back !== false) { g.mat('planks'); g.box(0, 0.85, -0.2, 1.7, 0.22, 0.04); } noAo(g); end(g, o); W.solidBox(x, z, 0.9, 0.3, o.yaw || 0); };
  P.cart = (x, z, o = {}) => { const g = begin(x, z, o); ground(g);
    g.mat('planks'); g.box(0, 0.78, 0, 2.3, 0.08, 1.2); for (const s of [-1, 1]) g.box(0, 1.02, s * 0.6, 2.3, 0.44, 0.05); g.box(-1.15, 1.02, 0, 0.05, 0.44, 1.2);
    g.mat('timber', { soft: 0.2 }); g.beam([-1.0, 0.7, 0], [1.0, 0.7, 0], 0.1, 0.1); for (const s of [-1, 1]) g.beam([1.15, 0.78, s * 0.45], [2.9, 0.42, s * 0.36], 0.07, 0.07);
    for (const s of [-1, 1]) { g.at(0, 0.56, s * 0.72, 0, 0, 0); g.mat('timber', { soft: 0.2 }); const n = 12; for (let i = 0; i < n; i++) { const a0 = (i / n) * LR.TAU, a1 = ((i + 1) / n) * LR.TAU; g.beam([Math.cos(a0) * 0.55, Math.sin(a0) * 0.55, 0], [Math.cos(a1) * 0.55, Math.sin(a1) * 0.55, 0], 0.07, 0.09, { up: [0, 0, 1], caps: false }); } for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; g.beam([Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0], [-Math.cos(a) * 0.52, -Math.sin(a) * 0.52, 0], 0.045, 0.05, { caps: false }); } g.mat('iron'); g.tube([[0, 0, -0.07], [0, 0, 0.07]], 0.07, { sides: 8, caps: true }); g.pop(); }
    if (o.load === 'hay') { g.mat('thatch', { tint: '#f0e2c0' }); g.blob(0, 1.25, 0, 0.95, { squash: [1.15, 0.6, 0.6], seg: 10, rings: 6, amp: 0.15 }); }
    else if (o.load === 'barrels') { /* placed by the caller */ }
    noAo(g); end(g, o); W.solidBox(x, z, 1.5, 0.85, o.yaw || 0); };
  // a street lamp: iron post, bracket, lantern
  P.lampPost = (x, z, o = {}) => { const g = begin(x, z, o), h = o.h || 3.3; ground(g);
    g.mat('ashlar', { soft: 0.2, scale: 0.5 }); g.box(0, 0.16, 0, 0.42, 0.34, 0.42, { skip: '-y' });
    g.mat('iron'); g.tube([[0, 0.3, 0], [0, h * 0.5, 0], [0, h, 0]], [0.06, 0.045, 0.035], { sides: 7 }); g.tube([[0, h - 0.05, 0], [0, h + 0.18, 0.2], [0, h + 0.1, 0.55]], 0.02, { sides: 5 }); g.tube([[0, h - 0.5, 0], [0, h - 0.1, 0.3], [0, h + 0.1, 0.5]], 0.012, { sides: 4 });
    noAo(g); A.lamp(g, 0, h - 0.2, 0.55, { r: o.r || 16, power: o.power || 9 }); end(g, o); W.solidCircle(x, z, 0.24); };
  // post-and-rail or wattle fence along [[x,z],…]
  P.fence = (pts, o = {}) => { const kind = o.kind || 'rail', h = o.h || 1.05, r = LR.rng(o.seed || 'f' + pts[0][0]);
    for (let s = 0; s < pts.length - 1; s++) { const a = pts[s], b = pts[s + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / (kind === 'picket' ? 1.6 : 2.0))); const g = P.g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      let prev = null;
      for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = LR.land.h(x, z), lean = (r() - 0.5) * 0.08, top = [x + lean, y + h + (r() - 0.5) * 0.1, z + lean];
        g.mat(kind === 'wattle' ? 'bark' : 'timber', { tint: A.vary('#e8dccc', r, 0.12), uv: i === 0 }); g.aoFn = (px, py) => 0.6 + 0.4 * LR.sm(y, y + 0.4, py); g.tube([[x, y - 0.25, z], top], [0.055, 0.045], { sides: 6, caps: true }); g.aoFn = null;
        if (prev) { if (kind === 'wattle') { g.mat('bark', { tint: '#d8c8b0', uv: false }); for (let k = 0; k < 7; k++) { const yy = 0.12 + (k / 7) * (h - 0.2), wv = (k % 2 ? 1 : -1) * 0.05, dx = -(b[1] - a[1]) / len, dz = (b[0] - a[0]) / len; g.tube([[prev[0], prev[1] - h + yy, prev[2]], [(prev[0] + x) / 2 + dx * wv, (prev[1] + y + h) / 2 - h + yy + 0.0, (prev[2] + z) / 2 + dz * wv], [x, y + yy, z]], 0.022, { sides: 4 }); } }
          else for (const yy of kind === 'picket' ? [0.3, 0.8] : [0.4, 0.82]) { g.mat('timber', { tint: A.vary('#e8dccc', r, 0.12), uv: false }); g.beam([prev[0], prev[1] - h + yy + (r() - 0.5) * 0.04, prev[2]], [x, y + yy + (r() - 0.5) * 0.04, z], 0.04, 0.09); }
          if (kind === 'picket') { const m = 9; for (let k = 1; k < m; k++) { const u = k / m, px = prev[0] + (x - prev[0]) * u, pz = prev[2] + (z - prev[2]) * u, py = LR.land.h(px, pz); g.mat('boards', { tint: o.paint || '#f0ece0', uv: k === 1 }); g.tube([[px, py + 0.08, pz], [px, py + h - 0.06, pz], [px, py + h + 0.06, pz]], [0.04, 0.04, 0.005], { sides: 4 }); } } }
        prev = [x, y + h, z]; }
      W.solidBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len / 2, 0.12, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), { rail: true }); } };
  // a dry-stone wall along points
  P.stoneWall = (pts, o = {}) => { const h = o.h || 0.95, th = o.thick || 0.5;
    for (let s = 0; s < pts.length - 1; s++) { const a = pts[s], b = pts[s + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.5)), g = P.g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz * th / 2, nz = dx * th / 2;
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1, y0 = LR.land.h(x0, z0), y1 = LR.land.h(x1, z1), w0 = LR.noise(x0 * 0.7, z0 * 0.7) * 0.16, w1 = LR.noise(x1 * 0.7, z1 * 0.7) * 0.16;
        g.mat('rubble', { scale: 0.8, uv: i === 0 }); for (const sd of [-1, 1]) g.poly([[x0 + sd * nx * 1.15, y0 - 0.3, z0 + sd * nz * 1.15], [x1 + sd * nx * 1.15, y1 - 0.3, z1 + sd * nz * 1.15], [x1 + sd * nx * 0.8, y1 + h + w1, z1 + sd * nz * 0.8], [x0 + sd * nx * 0.8, y0 + h + w0, z0 + sd * nz * 0.8]], { hint: [sd * nx, 0, sd * nz], ao: [0.55, 0.55, 1, 1] });
        g.poly([[x0 - nx * 0.8, y0 + h + w0, z0 - nz * 0.8], [x1 - nx * 0.8, y1 + h + w1, z1 - nz * 0.8], [x1 + nx * 0.8, y1 + h + w1, z1 + nz * 0.8], [x0 + nx * 0.8, y0 + h + w0, z0 + nz * 0.8]], { hint: [0, 1, 0] }); }
      for (const e of [a, b]) { const y = LR.land.h(e[0], e[1]); g.mat('rubble', { scale: 0.8 }); g.poly([[e[0] - nx * 1.15, y - 0.3, e[1] - nz * 1.15], [e[0] + nx * 1.15, y - 0.3, e[1] + nz * 1.15], [e[0] + nx * 0.8, y + h, e[1] + nz * 0.8], [e[0] - nx * 0.8, y + h, e[1] - nz * 0.8]], { two: true }); }
      W.solidBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len / 2, th / 2 + 0.1, Math.atan2(-dz, dx)); } };
  // mossy boulders: P.rock(x, z, { size, squash, seed })
  P.rock = (x, z, o = {}) => { const r = rngAt(x, z, 'r'), s = o.size || 0.8 + r() * 0.9, g = P.g(x, z), y = Y(x, z, o) + s * (o.sink === undefined ? 0.12 : o.sink);
    g.at(x, y, z, r() * 6.28, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4); g.aoFn = (px, py) => 0.55 + 0.45 * LR.sm(-s * 0.5, s * 0.1, py);
    g.mat('rock', { scale: 0.6 + r() * 0.3 }); g.blob(0, 0, 0, s, { squash: o.squash || [1 + r() * 0.5, 0.55 + r() * 0.3, 0.8 + r() * 0.4], seg: 12, rings: 8, amp: 0.26, freq: 1.5 + r(), seed: r.int(999) });
    g.aoFn = null; g.pop(); if (s > 0.55 && o.solid !== false) W.solidCircle(x, z, s * 0.85); };
  P.rocks = (x, z, n, spread, o = {}) => { const r = rngAt(x, z, 'rs'); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * spread; P.rock(x + Math.cos(a) * d, z + Math.sin(a) * d, Object.assign({}, o, { size: (o.size || 0.9) * (0.35 + r() * (i === 0 ? 1 : 0.7)) })); } };
  P.log = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'l'), len = o.len || 3.2, rad = o.r || 0.28; ground(g); g.mat('bark'); g.tube([[-len / 2, rad * 0.8, 0], [0, rad * 0.86, 0.06], [len / 2, rad * 0.75, 0]], [rad, rad * 0.94, rad * 0.86], { sides: 10 }); g.mat('timber', { tint: '#f0dcc0' }); for (const e of [-1, 1]) { const pts = [], rr = e < 0 ? rad : rad * 0.86; for (let k = 0; k < 10; k++) { const a = (k / 10) * LR.TAU; pts.push([e * len / 2, rad * 0.78 + Math.sin(a) * rr, Math.cos(a) * rr]); } g.poly(pts, { hint: [e, 0, 0] }); } noAo(g); end(g, o); W.solidBox(x, z, len / 2, rad, o.yaw || 0); };
  P.stump = (x, z, o = {}) => { const g = begin(x, z, o), rad = o.r || 0.4; ground(g); g.mat('bark'); g.lathe(0, 0, [[rad * 1.5, -0.1], [rad * 1.12, 0.12], [rad, 0.5], [rad * 0.96, 0.52]], { sides: 11 }); g.mat('timber', { tint: '#f0dcc0' }); g.cyl(0, 0.52, 0, rad * 0.96, rad * 0.96, 0.001, { sides: 11 }); noAo(g); end(g, o); W.solidCircle(x, z, rad + 0.1); };
  // a finger post
  P.signpost = (x, z, o = {}) => { const g = begin(x, z, o); ground(g); g.mat('timber', { soft: 0.2 }); g.box(0, 1.3, 0, 0.11, 2.6, 0.11, { grain: 'y' }); g.mat('boards', { tint: '#e8dcc0' }); for (const [yy, a, l] of o.arms || [[2.3, 0.3, 0.9], [2.0, 2.2, 0.8]]) { g.at(0, yy, 0, a); g.poly([[0.06, -0.1, 0.02], [l, -0.1, 0.02], [l + 0.14, 0, 0.02], [l, 0.1, 0.02], [0.06, 0.1, 0.02]], { two: true }); g.pop(); } noAo(g); end(g, o); W.solidCircle(x, z, 0.15); };
  // a hanging shop sign on an iron arm, in a wall's frame is awkward — this one is free-standing at a world point, facing yaw
  P.hangSign = (x, y, z, yaw, o = {}) => { const g = P.g(x, z); g.at(x, y, z, yaw); g.mat('iron'); g.tube([[0, 0, 0], [0, 0.05, 0.5], [0, 0, 1.05]], 0.016, { sides: 5 }); g.tube([[0, -0.45, 0.02], [0, -0.05, 0.5]], 0.01, { sides: 4 }); for (const zz of [0.4, 0.9]) g.tube([[0, 0.0, zz], [0, -0.14, zz]], 0.007, { sides: 4 });
    g.mat('boards', { tint: o.paint || '#d8c8a8', flags: F.SWAY, weight: 0.06 }); g.box(0, -0.42, 0.65, 0.05, 0.55, 0.72, { grain: 'z' });
    if (o.shape) { g.mat('iron', { flags: F.SWAY, weight: 0.06 }); for (const sx of [-1, 1]) { g.flip = sx < 0; g.poly(o.shape.map((p) => [sx * 0.03, -0.42 + p[1] * 0.2, 0.65 + p[0] * 0.2])); } g.flip = false; }
    g.pop(); };
  P.SHAPES = { mug: [[-0.9, -1], [0.6, -1], [0.6, -0.3], [1.1, -0.3], [1.1, 0.5], [0.6, 0.5], [0.6, 1], [-0.9, 1]], anvil: [[-1.3, 0.9], [1.4, 0.9], [0.9, 0.3], [0.35, 0.2], [0.35, -0.5], [0.9, -0.9], [-0.9, -0.9], [-0.35, -0.5], [-0.35, 0.2], [-0.8, 0.4]], loaf: [[-1.2, -0.5], [1.2, -0.5], [1.3, 0.1], [0.8, 0.7], [-0.8, 0.7], [-1.3, 0.1]], key: [[-1.3, 0.2], [0.2, 0.2], [0.5, 0.7], [1.2, 0.7], [1.4, 0], [1.2, -0.7], [0.5, -0.7], [0.2, -0.2], [-0.7, -0.2], [-0.7, -0.7], [-1.0, -0.7], [-1.0, -0.2], [-1.3, -0.2]] };
  // bunting or washing between two points [x,y,z]
  P.bunting = (a, b, o = {}) => { const g = P.g((a[0] + b[0]) / 2, (a[2] + b[2]) / 2), r = LR.rng('bu' + a[0] + b[2]), n = o.n || Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.55)), sag = o.sag || 0.6, cols = o.colors || ['#c9473a', '#e8c14a', '#3f6f9a', '#efe6d2', '#5f8a55'];
    const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; const line = []; for (let i = 0; i <= n; i++) line.push(at(i / n)); g.mat('cloth', { tint: '#8a7a60' }); g.tube(line, 0.008, { sides: 3 });
    for (let i = 0; i < n; i++) { const p = at((i + 0.2) / n), q = at((i + 0.8) / n), m = at((i + 0.5) / n); g.mat('cloth', { tint: A.vary(cols[i % cols.length], r, 0.08), flags: F.SWAY, weight: 0.4, uv: false });
      if (o.washing) { const hh = 0.5 + r() * 0.5; g.poly([p, q, [q[0], q[1] - hh, q[2]], [p[0], p[1] - hh, p[2]]], { two: true }); } else if (!o.bare) g.poly([p, q, [m[0], m[1] - 0.34, m[2]]], { two: true }); }
    // lights: true — a bulb between every two flags (or along a bare line), lit when the lamps are
    if (o.lights) for (let i = 0; i < n; i++) { const p = at(i / n); g.mat('glass', { tint: '#f4d9a0', flags: F.GLOW | F.NOWEATHER, weight: 1, uv: false }); g.blob(p[0], p[1] - 0.07, p[2], 0.045, { seg: 6, rings: 4 }); } };
  P.trough = (x, z, o = {}) => { const g = begin(x, z, o); ground(g); g.mat('ashlar', { soft: 0.2 }); g.box(0, 0.3, 0, 2.0, 0.6, 0.7, { skip: '-y' }); g.mat('glass', { tint: '#586060' }); g.box(0, 0.56, 0, 1.76, 0.08, 0.48, { skip: '-y+x-x+z-z' }); noAo(g); end(g, o); W.solidBox(x, z, 1.05, 0.4, o.yaw || 0); };
  P.tombstone = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 't'), h = 0.7 + r() * 0.4; g.at(0, 0, 0, 0, (r() - 0.5) * 0.14, (r() - 0.5) * 0.1); ground(g); g.mat('ashlar', { soft: 0.3, scale: 0.6 }); if (r() < 0.6) { g.box(0, h / 2, 0, 0.5, h, 0.12, { skip: '-y' }); const pts = []; for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI; pts.push([Math.cos(a) * 0.25, h + Math.sin(a) * 0.2, 0.06]); } g.poly(pts, { two: true }); } else { g.box(0, h / 2, 0, 0.14, h + 0.3, 0.12, { skip: '-y' }); g.box(0, h * 0.8, 0, 0.5, 0.14, 0.12); } noAo(g); g.pop(); end(g, o); W.solidCircle(x, z, 0.25); };
  P.scarecrow = (x, z, o = {}) => { const g = begin(x, z, o); g.mat('timber'); g.box(0, 1.0, 0, 0.07, 2.0, 0.07, { grain: 'y' }); g.beam([-0.75, 1.5, 0], [0.75, 1.5, 0], 0.05, 0.05); g.mat('cloth', { tint: '#8a6a4a', flags: F.SWAY, weight: 0.2 }); g.blob(0, 1.25, 0, 0.3, { squash: [1.1, 1.5, 0.6], seg: 8, rings: 5, amp: 0.2 }); for (const s of [-1, 1]) g.poly([[s * 0.2, 1.56, 0.02], [s * 0.78, 1.56, 0.02], [s * 0.82, 1.2, 0.02], [s * 0.3, 1.34, 0.02]], { two: true }); g.mat('cloth', { tint: '#c8b48a' }); g.blob(0, 1.86, 0, 0.17, { seg: 8, rings: 6, amp: 0.1 }); g.mat('thatch', { tint: '#f0e0b0' }); g.lathe(0, 0, [[0.34, 1.96], [0.16, 2.02], [0.1, 2.2], [0.0, 2.24]], { sides: 9 }); end(g, o); W.solidCircle(x, z, 0.2); };
  // a plank pier out over water from a to b at deck height y
  P.pier = (a, b, y, o = {}) => { const g = P.g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), len = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), wd = o.width || 1.8, cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    g.at(cx, y, cz, yaw); g.mat('planks', { tint: '#d0c4b4' }); const n = Math.round(len / 0.24); for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * (len / n); g.box(x, -0.03 + (LR.hash2(i, 7) - 0.5) * 0.02, 0, len / n - 0.02, 0.05, wd + (LR.hash2(i, 3) - 0.5) * 0.12, { grain: 'z', skip: '-y' }); }
    g.mat('timber', { soft: 0.2 }); for (const s of [-1, 1]) g.beam([-len / 2, -0.12, s * (wd / 2 - 0.15)], [len / 2, -0.12, s * (wd / 2 - 0.15)], 0.12, 0.14);
    g.mat('pinebark'); const np = Math.max(2, Math.round(len / 2.2)); for (let i = 0; i <= np; i++) for (const s of [-1, 1]) { const x = -len / 2 + (i / np) * len; g.tube([[x, -2.6, s * (wd / 2 - 0.05)], [x, 0.5 + (i === np ? 0.3 : 0), s * (wd / 2 - 0.05)]], 0.09, { sides: 7, caps: true }); }
    g.pop(); const c = Math.cos(yaw), s = Math.sin(yaw); W.floors.push({ x: cx, z: cz, hx: len / 2, hz: wd / 2, yaw, c, s, h: () => y }); };
  // a plank trough of flowers for the foot of a wall or under a window (about 1 m long)
  P.planter = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'pl'), len = o.len || 1.0, col = o.bloom || r.pick(['#d8453a', '#e8a23a', '#e9e2d0', '#c85a9a', '#7a6ac8', '#e06a8a']); ground(g);
    g.mat('planks', { tint: '#b9a78e' }); g.box(0, 0.16, 0, len, 0.32, 0.34, { grain: 'x', skip: '-y' }); g.mat('timber', { soft: 0.2 }); for (const sx of [-1, 1]) g.box(sx * (len / 2 - 0.06), 0.17, 0, 0.07, 0.36, 0.38, { grain: 'y' }); noAo(g);
    g.mat('dirt', { tint: '#6a5a4a' }); g.box(0, 0.3, 0, len - 0.08, 0.04, 0.26, { skip: '-y' });
    const nb = Math.round(len * 5); for (let i = 0; i < nb; i++) { const fx = -len / 2 + 0.12 + (i + r() * 0.6) * ((len - 0.24) / nb), fz = (r() - 0.5) * 0.16;
      g.mat('moss', { tint: A.vary('#86a44e', r, 0.2), flags: F.SWAY, weight: 0.16 }); g.blob(fx, 0.44 + r() * 0.06, fz, 0.15 + r() * 0.05, { seg: 6, rings: 4, amp: 0.35, seed: r.int(99) });
      for (let k = 0; k < 4; k++) { g.mat('cloth', { tint: A.vary(col, r, 0.12), flags: F.SWAY, weight: 0.22 }); g.blob(fx + (r() - 0.5) * 0.22, 0.56 + r() * 0.12, fz + (r() - 0.5) * 0.2, 0.04 + r() * 0.018, { seg: 5, rings: 3, amp: 0.2, seed: k }); } }
    end(g, o); W.solidBox(x, z, len / 2 + 0.05, 0.22, o.yaw || 0); };
  P.pot = (x, z, o = {}) => { const g = begin(x, z, o), r = rngAt(x, z, 'p'), s = o.size || 1; ground(g); g.mat('tiles', { tint: '#e8d0b8' }); g.lathe(0, 0, [[0.14 * s, 0], [0.2 * s, 0.3 * s], [0.22 * s, 0.34 * s], [0.18 * s, 0.34 * s], [0.0, 0.3 * s]], { sides: 10 }); noAo(g);
    g.mat('moss', { tint: A.vary('#8aa850', r, 0.2), flags: F.SWAY, weight: 0.15 }); g.blob(0, 0.5 * s, 0, 0.24 * s, { seg: 7, rings: 5, amp: 0.3, seed: r.int(99) });
    if (o.bloom !== false) for (let i = 0; i < 11; i++) { g.mat('cloth', { tint: A.vary(o.bloom || r.pick(['#d8453a', '#e8a23a', '#e9e2d0', '#c85a9a', '#7a6ac8']), r, 0.1), flags: F.SWAY, weight: 0.2 }); g.blob((r() - 0.5) * 0.36 * s, 0.6 * s + r() * 0.14 * s, (r() - 0.5) * 0.36 * s, 0.05 * s, { seg: 5, rings: 3, amp: 0.2, seed: i }); }
    end(g, o); };
}
