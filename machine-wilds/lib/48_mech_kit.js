// machine-wilds · 48_mech_kit — a machine's parts, written as code.  Every part is built in the frame of the one bone it
// rides (after machine-build-reel: no part on two bones, every joint a mechanism — a drum between fork cheeks on a pin
// with bolted caps, a two-part cylinder across each powered hinge on lugs the script placed), then set into the rest
// pose; the vertex keeps its bone's number and the renderer moves it rigidly.  Three levels of detail are three builds
// of the same code with fewer sides and without the small things (k.fine, k.n(sides)).
//
//   spec.palette   role → [material, '#tint', { options }]     roles: shell frame joint steel rod rubber rust dark lamp
//   spec.build(k)  k.limbs() for the stock legs, then the body, neck, head and cargo of this machine with k.bone(name, (g) => …)
{
  const M = LR.mech, T = THREE, D2R = M.D2R, V = M.v, TAU = Math.PI * 2;
  const m4 = (f) => new T.Matrix4().set(f.x[0], f.y[0], f.z[0], f.p[0], f.x[1], f.y[1], f.z[1], f.p[1], f.x[2], f.y[2], f.z[2], f.p[2], 0, 0, 0, 1);
  M.m4 = m4;
  const PALETTE = { shell: ['ceramic', '#e4e1da'], frame: ['paintmetal', '#4a5258'], joint: ['steel', '#7c7e82'], steel: ['steel', '#b9bbbe'], rod: ['chrome', '#ffffff'], rubber: ['rubber', '#5a5a5a'], rust: ['rustplate', '#d8d2c8'], dark: ['paintmetal', '#26292c'] };
  LR.FLAG.LAMP = 64;

  class Kit {
    constructor(K, lod = 0) { this.K = K; this.S = K.spec; this.kin = K.kin; this.lod = lod; this.g = new LR.Geo(16384); this.ranges = []; this.lamps = []; this.rest = this.kin.pose(this.kin.restCmd()).W; this.pal = Object.assign({}, PALETTE, this.S.palette || {}); this.seed = 1; }
    n(sides) { return this.lod === 0 ? sides : this.lod === 1 ? Math.max(5, Math.round(sides * 0.6)) : Math.max(4, Math.round(sides * 0.36)); }
    get fine() { return this.lod === 0; }
    get mid() { return this.lod <= 1; }
    mat(role, o = {}) { const p = this.pal[role] || [role]; return this.g.mat(p[0], Object.assign({ tint: p[1], seed: this.seed++ }, p[2] || {}, o)); }
    // everything written inside fn rides this bone; coordinates are the bone's own
    bone(name, fn) { const g = this.g, i = this.kin.index[name]; if (i === undefined) throw new Error(`machine ${this.K.name}: no bone "${name}"`); g.push(m4(this.rest[name])); const a = g.n; fn(g, this); this.ranges.push([a, g.n, i]); g.pop(); return this; }
    // ── shapes ──
    xcyl(x0, x1, y, z, r, o = {}) { this.g.tube([[x0, y, z], [x1, y, z]], r, { sides: this.n(o.sides || 14), caps: o.caps !== false }); return this; }
    ycyl(y0, y1, x, z, r0, r1, o = {}) { this.g.tube([[x, y0, z], [x, y1, z]], [r0, r1 === undefined ? r0 : r1], { sides: this.n(o.sides || 12), caps: o.caps !== false }); return this; }
    zcyl(z0, z1, x, y, r, o = {}) { this.g.tube([[x, y, z0], [x, y, z1]], r, { sides: this.n(o.sides || 12), caps: o.caps !== false }); return this; }
    ball(x, y, z, r, o = {}) { this.g.blob(x, y, z, r, Object.assign({ amp: 0, seg: this.n(o.seg || 14), rings: this.n(o.rings || 9) }, o)); return this; }
    // a ring of bolt heads round an axis ('x' | 'y' | 'z') at c, radius R — only on the near build
    bolts(axis, c, R, count, size, o = {}) { if (!this.fine) return this; const g = this.g, a0 = o.phase || 0;
      for (let i = 0; i < count; i++) { const a = a0 + (i / count) * TAU, u = Math.cos(a) * R, v = Math.sin(a) * R, h = o.h || size * 0.7;
        const p = axis === 'x' ? [[c[0], c[1] + u, c[2] + v], [c[0] + h * (o.dir || 1), c[1] + u, c[2] + v]] : axis === 'y' ? [[c[0] + u, c[1], c[2] + v], [c[0] + u, c[1] + h * (o.dir || 1), c[2] + v]] : [[c[0] + u, c[1] + v, c[2]], [c[0] + u, c[1] + v, c[2] + h * (o.dir || 1)]];
        g.tube(p, size, { sides: 6, caps: true }); } return this; }
    // a skin through cross-sections along an axis.  secs: [[t, a, b, ca, cb, pow]] — t along the axis, half-sizes a (first other
    // axis) and b (second), centre offsets, and how square it is (2 round … 6 nearly a box).  axis 'x': others y, z · 'y': z, x · 'z': x, y
    loft(axis, secs, o = {}) {
      const g = this.g, n = this.n(o.sides || 20), s = 1 / g.tile, base = g.n, a0 = o.from === undefined ? 0 : o.from, a1 = o.to === undefined ? TAU : o.to, open = a1 - a0 < TAU - 1e-6, cols = open ? n : n, P = [];
      const map = (t, u, v) => (axis === 'x' ? [t, u, v] : axis === 'y' ? [v, t, u] : [u, v, t]); let len = 0;
      const pt = (sec, a) => { const pw = sec[5] || 2.4, c = Math.cos(a), sn = Math.sin(a), k = Math.pow(Math.pow(Math.abs(c), pw) + Math.pow(Math.abs(sn), pw), -1 / pw); return [(sec[3] || 0) + c * k * sec[1], (sec[4] || 0) + sn * k * sec[2]]; };
      for (let i = 0; i < secs.length; i++) { const sec = secs[i]; if (i) len += Math.abs(sec[0] - secs[i - 1][0]); const row = []; for (let k = 0; k <= cols; k++) { const a = a0 + ((a1 - a0) * k) / cols, q = pt(sec, a); row.push(map(sec[0], q[0], q[1])); } P.push({ row, len }); }
      const circ = Math.max(1, Math.round(TAU * Math.max(secs[0][1], secs[0][2]) * s));
      for (let i = 0; i < P.length; i++) for (let k = 0; k <= cols; k++) { const p = P[i].row[k], a = P[Math.max(0, i - 1)].row[k], b = P[Math.min(P.length - 1, i + 1)].row[k], c = P[i].row[(k + 1) % (cols + 1) || (open ? k : 1)], d = P[i].row[k === 0 ? (open ? 0 : cols - 1) : k - 1];
        let n3 = V.cross(V.sub(c, d), V.sub(b, a)); if (V.len(n3) < 1e-9) n3 = V.sub(p, map(secs[i][0], secs[i][3] || 0, secs[i][4] || 0)); n3 = V.norm(n3); if (o.inside) n3 = V.mul(n3, -1);
        g.vert(p[0], p[1], p[2], n3[0], n3[1], n3[2], (k / cols) * circ + g.uo, P[i].len * s + g.vo); }
      for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < cols; k++) { const a = base + i * (cols + 1) + k, b = a + 1, c = a + cols + 1, d = c + 1; if (o.inside) { g.idx(a, c, b); g.idx(b, c, d); } else { g.idx(a, b, c); g.idx(b, d, c); } }
      if (o.caps !== false && !open) for (const e of [0, P.length - 1]) { const sec = secs[e]; if (sec[1] < 1e-4 || sec[2] < 1e-4) continue; const nrm = map(e ? 1 : -1, 0, 0), c0 = g.n; for (let k = 0; k < cols; k++) { const p = P[e].row[k]; g.vert(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], p[axis === 'x' ? 1 : 0] * s, p[axis === 'z' ? 1 : 2] * s); } for (let k = 1; k < cols - 1; k++) { if (e) g.idx(c0, c0 + k, c0 + k + 1); else g.idx(c0, c0 + k + 1, c0 + k); } }
      return this;
    }
    // a light: a lens that glows (its colour and strength ride the vertex) and, for the renderer, a lamp that throws a cone
    // through the air.  o: { at, dir, color:[r,g,b] linear, power, cone° (half angle), range, lens (radius), beam: false for a mere running light }
    lamp(bone, o) { const g = this.g, dir = V.norm(o.dir || [1, 0, 0]), r = o.lens || 0.2, col = o.color || [0.6, 0.85, 1], w = LR.sat((o.glow === undefined ? 1 : o.glow));
      this.bone(bone, () => { const up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], x = V.norm(V.cross(up, dir)), y = V.cross(dir, x), c = V.mad(o.at, dir, o.proud === undefined ? 0.02 : o.proud), nS = this.n(o.sides || 12), base = g.n;
        g.layer = LR.mat.L(this.pal.steel[0]); g.tint = col.map((v) => Math.round(LR.sat(Math.sqrt(LR.sat(v)) * 0.5) * 255)); g.flags = LR.FLAG.LAMP | LR.FLAG.NOWEATHER; g.weight = Math.round(w * 255); g.aoV = 1;
        g.vert(c[0], c[1], c[2], dir[0], dir[1], dir[2], 0.5, 0.5); for (let k = 0; k <= nS; k++) { const a = (k / nS) * TAU, p = [c[0] + (x[0] * Math.cos(a) + y[0] * Math.sin(a)) * r, c[1] + (x[1] * Math.cos(a) + y[1] * Math.sin(a)) * r, c[2] + (x[2] * Math.cos(a) + y[2] * Math.sin(a)) * r]; g.vert(p[0], p[1], p[2], dir[0], dir[1], dir[2], 0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)); }
        for (let k = 0; k < nS; k++) g.idx(base, base + 1 + k, base + 2 + k); g.flags = 0; g.weight = 0; });
      if (this.lod === 0) this.lamps.push({ bone: this.kin.index[bone], at: o.at.slice(), dir, color: col, power: o.power === undefined ? 1 : o.power, cone: (o.cone || 0) * D2R, range: o.range || 30, beam: o.beam !== false && (o.cone || 0) > 0, lens: r, name: o.name || '' });
      return this; }

    // ── the stock legs ──────────────────────────────────────────────────────────────────────────────────────────
    // style 'shell': a dark spar inside pale covers (the newer machines) · 'girder': riveted box girders, bare and rusted
    limbs(o = {}) { for (const l of this.kin.limbs) this.limb(l, Object.assign({}, o, l.s.style ? { style: l.s.style } : {})); return this; }
    limb(l, o = {}) {
      const k = this, w = l.width, d = l.drum, style = o.style || 'shell', cover = style === 'shell' ? 'shell' : 'rust', spar = style === 'shell' ? 'dark' : 'frame';
      const cheek = (g, y0, y1, depth) => { for (const sx of [-1, 1]) g.box(sx * w * 0.56, (y0 + y1) / 2, 0, w * 0.17, y1 - y0, depth, { soft: 0.25 }); };
      const pin = (y, z = 0) => { k.mat('steel'); k.xcyl(-w * 0.72, w * 0.72, y, z, d * 0.2); k.mat('joint'); for (const sx of [-1, 1]) { k.xcyl(sx * w * 0.645, sx * w * 0.72, y, z, d * 0.37, { sides: 16 }); k.bolts('x', [sx * w * 0.72, y, z], d * 0.28, 8, d * 0.035, { dir: sx }); } k.fitPin(l, y, z); };
      // the hip: a bearing the whole leg swings out on, and the yoke the thigh hangs in (mammal) — or a turret with an arm (insect)
      k.bone(`hip_${l.name}`, (g) => {
        if (l.kind === 'insect') { k.mat('joint'); k.zcyl(-d * 0.55, d * 0.55, 0, 0, d * 0.62, { sides: 16 }); k.bolts('z', [0, 0, d * 0.55], d * 0.48, 10, d * 0.04);
          k.mat(spar); g.box(0, l.coxa * 0.5, 0, w * 0.8, l.coxa, d * 0.7, { soft: 0.3 }); k.mat('frame'); cheek(g, l.coxa - d * 0.55, l.coxa + d * 0.55, d * 1.05); pin(l.coxa); }
        else { k.mat('joint'); k.zcyl(-w * 0.95, w * 0.95, 0, 0, d * 0.58, { sides: 16 }); k.bolts('z', [0, 0, w * 0.95], d * 0.44, 10, d * 0.04); k.bolts('z', [0, 0, -w * 0.95], d * 0.44, 10, d * 0.04, { dir: -1 });
          k.mat('frame'); if (l.hipDrop > 0.01) { cheek(g, -d * 0.2, l.hipDrop + d * 0.55, d * 1.1); pin(l.hipDrop); } }
        k.fitHip(l);
      });
      for (let i = 0; i < l.n; i++) { const L = l.segs[i], last = i === l.n - 1, t0 = d * 0.5, t1 = L - (last ? l.ball * 0.9 : d * 0.62);
        k.bone(l.bone(i), (g) => {
          // the drum this segment turns on, between the cheeks above it
          k.mat('joint'); k.xcyl(-w * 0.46, w * 0.46, 0, 0, d * 0.5, { sides: 18 }); if (k.mid) { k.mat('steel'); for (const sx of [-1, 1]) k.xcyl(sx * w * 0.46, sx * w * 0.485, 0, 0, d * 0.42, { sides: 16 }); }
          // the spar, and its covers
          const taper = last ? 0.72 : 0.88, sw = w * (style === 'shell' ? 0.36 : 0.56), sd = d * (style === 'shell' ? 0.5 : 0.78);
          k.mat(spar); k.loft('y', [[t0 * 0.6, sd * 0.5, sw * 0.5, 0, 0, 5], [L * 0.5, sd * 0.5 * (1 + taper) / 2, sw * 0.5, 0, 0, 5], [t1 + d * 0.2, sd * 0.5 * taper, sw * 0.5 * 0.94, 0, 0, 5]], { sides: 12 });
          if (style === 'shell') { k.mat(cover); const a = t0 + L * 0.06, b = t1 - L * 0.05, bulge = 0.5 + 0.12 * (1 - i / l.n);
            // two covers, front and back, with the spar showing in the gap between them at the sides
            for (const [f0, f1, off] of [[-0.42 * Math.PI, 0.42 * Math.PI, d * 0.1], [0.58 * Math.PI, 1.42 * Math.PI, -d * 0.1]])
              k.loft('y', [[a, d * 0.28, w * 0.3, off, 0, 3], [a + L * 0.08, d * bulge, w * 0.5, off, 0, 3], [L * 0.5, d * bulge * 0.94, w * 0.5, off, 0, 3], [b - L * 0.1, d * bulge * taper, w * 0.46, off, 0, 3], [b, d * 0.26, w * 0.28, off, 0, 3]], { sides: 14, from: f0, to: f1, caps: false });
            if (k.mid) { k.mat('joint'); for (const y of [a + L * 0.1, L * 0.5, b - L * 0.12]) g.box(0, y, 0, w * 0.42, d * 0.07, d * 0.62, { soft: 0.2 }); } }
          else { // a girder: flange plates front and back, lightening holes implied by ribs, a row of rivets
            k.mat(cover); for (const sz of [-1, 1]) g.box(0, (t0 + t1) / 2, sz * sd * 0.5 * (1 + taper) / 2, w * 0.66, t1 - t0, d * 0.07, { soft: 0.15 });
            if (k.mid) { k.mat('frame'); const nr = Math.max(3, Math.round((t1 - t0) / (d * 1.5))); for (let q = 0; q <= nr; q++) { const y = t0 + ((t1 - t0) * q) / nr; g.box(0, y, 0, w * 0.6, d * 0.06, sd * 0.98, { soft: 0.1 }); } } }
          // the fork at its lower end, the pin through it — or, on the last segment, the cup the foot's ball sits in
          if (!last) { k.mat('frame'); g.box(0, L - d * 0.9, 0, w * 1.28, d * 0.5, d * 0.9, { soft: 0.25 }); cheek(g, L - d * 0.9, L + d * 0.52, d * 1.08); pin(L); }
          else { k.mat('joint'); g.lathe(0, 0, [[d * 0.34, L - l.ball * 1.5], [l.ball * 0.86, L - l.ball * 0.9], [l.ball * 0.9, L - l.ball * 0.2], [l.ball * 0.74, L - l.ball * 0.05]], { sides: k.n(16) }); k.bolts('y', [0, L - l.ball * 0.9, 0], l.ball * 0.78, 8, l.ball * 0.05, { dir: -1 }); }
          if (k.fine) { // a hose down the back of the spar, clipped to it
            k.mat('rubber'); const hz = -sd * 0.5 - d * 0.12, hx = w * 0.16, pts = []; for (let q = 0; q <= 8; q++) { const y = t0 + (t1 - t0) * (q / 8); pts.push([hx + Math.sin(q * 1.7) * w * 0.03, y, hz - Math.sin((q / 8) * Math.PI) * d * 0.05]); } g.tube(pts, d * 0.045, { sides: 6 }); g.tube(pts.map((p) => [p[0] - w * 0.3, p[1], p[2] + d * 0.02]), d * 0.035, { sides: 5 });
            k.mat('steel'); for (const q of [1, 4, 7]) g.box(hx - w * 0.15, pts[q][1], hz + d * 0.02, w * 0.5, d * 0.05, d * 0.12); }
          k.fitSegment(l, i, { L, t0, t1, sd, sw, style, last, taper });
        });
      }
      // the foot: a ball in the cup, a hub under it, toes on pins
      k.bone(`foot_${l.name}`, (g) => { const b = l.ball; k.mat('steel'); k.ball(0, 0, 0, b * 0.64); k.mat('frame'); g.lathe(0, 0, [[b * 0.5, -b * 0.25], [b * 1.02, -b * 0.42], [b * 1.12, -b * 0.8], [b * 0.9, -b], [0.01, -b]], { sides: k.n(16) });
        if (k.mid) { k.mat('joint'); for (const a of l.toes) { const ca = Math.cos(a * D2R), sa = Math.sin(a * D2R); g.box(ca * b * 0.75, -b * 0.42, sa * b * 0.75, b * 0.5, b * 0.46, b * 0.5, { soft: 0.3 }); } } k.fitFoot(l); });
      l.toes.forEach((a, t) => k.bone(`toe${t}_${l.name}`, (g) => { const b = l.ball, L = l.toeLen, heel = Math.abs(a) > 120, LL = heel ? L * 0.62 : L;
        k.mat('joint'); k.xcyl(-b * 0.36, b * 0.36, 0, 0, b * 0.3, { sides: 12 });
        k.mat(style === 'shell' ? 'dark' : 'frame'); k.loft('y', [[b * 0.1, b * 0.3, b * 0.3, 0, 0, 4], [LL * 0.45, b * 0.26, b * 0.36, -b * 0.03, 0, 4], [LL * 0.86, b * 0.17, b * 0.28, -b * 0.1, 0, 4], [LL, b * 0.05, b * 0.06, -b * 0.2, 0, 3]], { sides: 10 });
        if (style === 'shell' && k.mid) { k.mat('shell'); k.loft('y', [[LL * 0.14, b * 0.2, b * 0.33, b * 0.14, 0, 3], [LL * 0.45, b * 0.2, b * 0.4, b * 0.12, 0, 3], [LL * 0.8, b * 0.12, b * 0.26, b * 0.03, 0, 3]], { sides: 10, from: -0.38 * Math.PI, to: 0.38 * Math.PI, caps: false }); }
        k.mat('rubber'); g.box(0, LL * 0.6, -b * 0.3, b * 0.5, LL * 0.6, b * 0.14, { soft: 0.3 }); k.fitToe(l, LL, style); }));
      // cylinders: the barrel on the part above the hinge, the rod on the part below, each on a lug the anchor search placed
      for (let j = 0; j < l.n; j++) { const an = l.anchors[l.jointNames[j]]; if (!l.acts[j] || !an) continue; const r = an.r, jn = l.jointNames[j], upB = j === 0 ? `hip_${l.name}` : l.bone(j - 1), upY = j === 0 ? (l.kind === 'insect' ? l.coxa : l.hipDrop) : l.segs[j - 1];
        const lug = (g, y, h) => { k.mat('frame'); const s = Math.sign(h) || 1; g.box(an.lat * 0.5, y, h * 0.55, Math.abs(an.lat) + r * 2.2, r * 1.5, r * 1.3, { soft: 0.2 }); for (const sx of [-1, 1]) g.box(an.lat + sx * r * 0.95, y, h * 0.6, r * 0.34, r * 2.3, Math.abs(h) * 0.9 + r * 0.6, { soft: 0.2 }); if (Math.abs(h) > d * 0.6) g.box(0, y, h * 0.3, w * 0.5, r * 1.6, Math.abs(h) * 0.62, { soft: 0.2 });
          k.mat('steel'); k.xcyl(an.lat - r * 1.35, an.lat + r * 1.35, y, h, r * 0.42, { sides: 10 }); };
        k.bone(upB, (g) => lug(g, upY - an.a_up, an.h_up)); k.bone(l.bone(j), (g) => lug(g, an.a_lo, an.h_lo));
        k.bone(`act_${jn}_${l.name}_cyl`, (g) => { k.mat('joint'); k.xcyl(-r * 0.78, r * 0.78, 0, 0, r * 0.98, { sides: 12 }); k.mat(style === 'shell' ? 'dark' : 'frame'); k.ycyl(r * 0.9, r * 1.1 + an.Bl, 0, 0, r, r, { sides: 14 });
          k.mat('joint'); k.ycyl(r * 1.1 + an.Bl - r * 0.5, r * 1.1 + an.Bl + r * 0.12, 0, 0, r * 1.16, r * 1.16, { sides: 14 }); k.ycyl(r * 0.9, r * 1.5, 0, 0, r * 1.12, r * 1.12, { sides: 14 }); k.bolts('y', [0, r * 1.1 + an.Bl + r * 0.12, 0], r * 0.92, 6, r * 0.09);
          k.fitCylinder(l, an, style); });
        k.bone(`act_${jn}_${l.name}_rod`, (g) => { k.mat('joint'); k.xcyl(-r * 0.7, r * 0.7, 0, 0, r * 0.9, { sides: 12 }); k.ycyl(r * 0.6, r * 1.5, 0, 0, r * 0.62, r * 0.62, { sides: 10 }); k.mat('rod'); k.ycyl(r * 1.3, r * 1.1 + an.Rl, 0, 0, r * 0.5, r * 0.5, { sides: 12 }); });
      }
    }
    // a neck: a ladder boom of links, each a drum, two rails, a keel and (on the pale machines) a cover along its back
    neckLinks(o = {}) { const k = this, wn = o.width || 1.0, style = o.style || 'shell';
      this.kin.neck.forEach((lk, i) => k.bone(`neck_${String(i + 1).padStart(2, '0')}`, (g) => { const L = lk[0], t = 1 - 0.09 * i, w2 = wn * t;
        k.mat('joint'); k.xcyl(-w2 * 0.5, w2 * 0.5, 0, 0, w2 * 0.3, { sides: 14 }); k.mat('steel'); k.xcyl(-w2 * 0.6, w2 * 0.6, 0, 0, w2 * 0.1, { sides: 8 });
        k.mat(style === 'shell' ? 'dark' : 'frame'); for (const sx of [-1, 1]) g.tube([[sx * w2 * 0.42, w2 * 0.1, w2 * 0.16], [sx * w2 * 0.4, L - w2 * 0.1, w2 * 0.14]], w2 * 0.07, { sides: k.n(8) }); g.tube([[0, w2 * 0.2, -w2 * 0.3], [0, L - w2 * 0.2, -w2 * 0.27]], w2 * 0.085, { sides: k.n(8) });
        if (k.mid) for (const y of [L * 0.3, L * 0.7]) { g.tube([[-w2 * 0.42, y, w2 * 0.15], [0, y + L * 0.12, -w2 * 0.3], [w2 * 0.42, y, w2 * 0.15]], w2 * 0.04, { sides: 5 }); }
        for (const sx of [-1, 1]) g.box(sx * w2 * 0.52, L - w2 * 0.05, 0, w2 * 0.1, w2 * 0.7, w2 * 0.5, { soft: 0.25 });
        if (style === 'shell') { k.mat('shell'); k.loft('y', [[L * 0.12, w2 * 0.3, w2 * 0.5, w2 * 0.12, 0, 3], [L * 0.5, w2 * 0.36, w2 * 0.54, w2 * 0.12, 0, 3], [L * 0.9, w2 * 0.28, w2 * 0.46, w2 * 0.1, 0, 3]], { sides: 12, from: -0.45 * Math.PI, to: 0.45 * Math.PI, caps: false }); }
        if (k.fine) { k.mat('rubber'); g.tube([[w2 * 0.2, 0, -w2 * 0.38], [w2 * 0.22, L * 0.5, -w2 * 0.42], [w2 * 0.2, L, -w2 * 0.38]], w2 * 0.035, { sides: 5 }); } k.fitNeck(L, w2); })); return this; }
    // age: nothing here left a works this decade.  spec.age (0…1; 0.55) lowers the vertex's alpha in patches laid in the
    // machine's own space — more on what faces up, where water stands — and the surface shader turns that into grime, into
    // rust that has run down from seams, and (on tops and north sides) into moss.  Lamps, rods and rubber are left alone.
    weather() { const G = this.g, age = this.S.age === undefined ? 0.55 : this.S.age; if (!(age > 0)) return; const size = Math.max(G.max[0] - G.min[0], G.max[1] - G.min[1], G.max[2] - G.min[2], 1), f = 1.5 / Math.sqrt(size), skip = new Set(['chrome', 'rubber'].map((n) => LR.mat.L(n)));
      for (let i = 0; i < G.n; i++) { if ((G.M[i * 4 + 1] & (LR.FLAG.LAMP | 8 | 32)) || skip.has(G.M[i * 4])) continue; const x = G.P[i * 3], y = G.P[i * 3 + 1], z = G.P[i * 3 + 2], ny = G.N[i * 4 + 1] / 127;
        const n1 = LR.fbm(x * f + y * f * 0.6 + 11.3, z * f - y * f * 0.5 + 4.1, 3), n2 = LR.fbm(x * f * 3.1 + 2.7, z * f * 3.1 + y * f * 2.2, 2), k = age * LR.sat((n1 - 0.5) * 3.2 + (n2 - 0.5) * 0.9 + 0.3 + Math.max(0, ny) * 0.55 - Math.max(0, -ny) * 0.15);
        G.C[i * 4 + 3] = Math.round(G.C[i * 4 + 3] * (1 - 0.62 * k)); } }
    done() { this.weather(); const g = this.g.geometry(), bone = new Float32Array(this.g.n); for (const r of this.ranges) bone.fill(r[2], r[0], r[1]); g.setAttribute('bone', new T.BufferAttribute(bone, 1)); return { geometry: g, lamps: this.lamps, tris: this.g.tris, min: this.g.min.slice(), max: this.g.max.slice() }; }
  }
  M.Kit = Kit;
  // the three builds of a kind (near, middle, far), made once
  M.geometry = (kind, lod) => { const K = M.kinds[kind]; K.geo = K.geo || []; if (!K.geo[lod]) { const k = new Kit(K, lod); K.spec.build(k); K.geo[lod] = k.done(); } return K.geo[lod]; };
}
