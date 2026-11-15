// living-realm · 50_flora — trees and bushes.  A species is a set of numbers (LR.flora.species); from them the page
// grows a branch skeleton per seeded variant, wraps it in bark tubes, hangs leaf cards on the twigs (the leaf sprays
// are painted in code into an atlas, with a twig layer that stays when the leaves fall), and makes three levels of
// detail: the full tree, a lighter one, and a billboard baked from the tree itself (colour + normal, summer and bare).
// Every frame each planted tree is tested against the view and handed to the level its distance asks for; neighbouring
// levels cross-dissolve.  Season, snow, rain and wind arrive as the shared weather uniforms.
{
  const T = THREE, U = LR.U, TAU = Math.PI * 2;
  const F = (LR.flora = { defs: {}, order: [], inst: [], farInst: [], variants: [], stats: {}, built: false });

  // ── species ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // LR.flora.species(name, def) — see 51_flora_species.js for the stock ones and every field in use.
  F.defaults = {
    kind: 'broadleaf', variants: 2, seed: 1, height: [9, 12], bark: 'bark', evergreen: false,
    trunk: { len: 0.5, radius: 0.4, taper: 0.7, lean: 0.06, gnarl: 0.25, flare: 0.8, segs: 9 },
    levels: [{ count: [6, 7], from: 0.4, to: 1, angle: [45, 75], len: [0.8, 1.1], rad: 0.55, up: 0.2, gnarl: 0.5, taper: 0.8 }],
    crown: { r: 0.5, ry: 0.4, cy: 0.65 },
    leaf: { spray: 'ovate', size: [0.8, 1.2], perTwig: 5, from: 0.3, droop: 0.25, mode: 'tip', trans: 0.75, snow: 0.6,
      summer: ['#3f6a22', '#55802a', '#2f5519'], autumn: ['#c9a227', '#b8651c', '#8f3a1a'], twig: '#4a3f33' },
    wind: { trunk: 0.5, branch: 1, flutter: 1 }, collide: true, lod1: { keep: 0.5, grow: 1.45, levels: 1 },
  };
  F.species = (name, def) => {
    const D = F.defaults, d = Object.assign({}, D, def, { name });
    d.trunk = Object.assign({}, D.trunk, def.trunk); d.crown = Object.assign({}, D.crown, def.crown); d.leaf = Object.assign({}, D.leaf, def.leaf);
    d.wind = Object.assign({}, D.wind, def.wind); d.lod1 = Object.assign({}, D.lod1, def.lod1); d.levels = def.levels || D.levels;
    if (!(name in F.defs)) F.order.push(name); F.defs[name] = d; return d;
  };
  // one plant.  o: { scale, yaw, variant, hero }
  F.plant = (name, x, z, o = {}) => {
    const d = F.defs[name]; if (!d) throw new Error('unknown species "' + name + '" (have: ' + F.order.join(', ') + ')');
    const k = F.inst.length, h = LR.hash2(Math.round(x * 31) + k * 7, Math.round(z * 17) - k * 3);
    const i = { sp: name, x, z, y: o.y !== undefined ? o.y : LR.land.h(x, z) - 0.06, scale: o.scale || 1, yaw: o.yaw !== undefined ? o.yaw : h * TAU, variant: o.variant !== undefined ? o.variant % d.variants : Math.floor(LR.hash2(k * 13 + 5, Math.round(x * 7)) * d.variants), hero: !!o.hero, seed: LR.hash2(Math.round(z * 29) + 11, k * 5 + 1) };
    F.inst.push(i); return i;
  };
  const pick = (list, r) => { let tot = 0; for (const s of list) tot += s[1]; let v = r() * tot; for (const s of list) { v -= s[1]; if (v <= 0) return s[0]; } return list[list.length - 1][0]; };
  const okGround = (x, z, maxSlope = 0.3) => { const n = LR.land.normal(x, z, 1.2); if (1 - n[1] > maxSlope) return false; if (LR.land.h(x, z) < LR.land.waterY + 0.25) return false; return true; };
  // LR.flora.scatter({ species:[[name, weight],…], density:(x,z)=>0..1, area:[x0,z0,x1,z1], spacing, seed, avoid:(x,z)=>bool, scale:[lo,hi], hero })
  F.scatter = (o) => {
    const r = LR.rng(o.seed || 7), sp = o.spacing || 7, [x0, z0, x1, z1] = o.area, sc = o.scale || [0.8, 1.25]; let n = 0;
    for (let z = z0; z < z1; z += sp) for (let x = x0; x < x1; x += sp) {
      const px = x + r() * sp * 0.9, pz = z + r() * sp * 0.9, u = r(), su = r(), yaw = r() * TAU, name = pick(o.species, r), vv = r();
      const dn = o.density ? o.density(px, pz) : 1; if (u >= dn) continue;
      if (o.avoid && o.avoid(px, pz)) continue; if (!okGround(px, pz, o.maxSlope)) continue;
      F.plant(name, px, pz, { scale: LR.lerp(sc[0], sc[1], su), yaw, variant: Math.floor(vv * 8), hero: o.hero }); n++;
    }
    return n;
  };
  // far country: billboards only.  { density:(x,z)=>0..1, inner, outer, spacing, species:[[name, weight],…], seed, scale }
  F.far = (o) => {
    const r = LR.rng(o.seed || 23), sp = o.spacing || 14, R = o.outer, sc = o.scale || [1.0, 1.6]; let n = 0;
    const list = o.species || F.order.filter((s) => F.defs[s].kind !== 'bush').map((s) => [s, 1]);
    for (let z = -R; z < R; z += sp) for (let x = -R; x < R; x += sp) {
      const px = x + r() * sp, pz = z + r() * sp, u = r(), su = r(), name = pick(list, r), vv = r(), sd = r(), fl = r();
      const d = Math.max(Math.abs(px), Math.abs(pz)), dr = Math.hypot(px, pz); if ((o.square ? d : dr) < o.inner || dr > R) continue;
      const dn = o.density ? o.density(px, pz) : 1; if (u >= dn) continue; if (!okGround(px, pz, 0.45)) continue;
      F.farInst.push({ sp: name, x: px, z: pz, y: LR.land.h(px, pz) - 0.3, scale: LR.lerp(sc[0], sc[1], su), variant: Math.floor(vv * 8), seed: sd, flip: fl < 0.5 ? -1 : 1 }); n++;
    }
    return n;
  };

  // ── small vector kit (plain arrays) ─────────────────────────────────────────────────────────────────────────────
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const perp = (a) => norm(Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0]));
  const hex = (c) => LR.rgb(c);
  const val = (v, r) => (Array.isArray(v) ? r.range(v[0], v[1]) : v);

  // ── the leaf atlas: sprays painted by a small software rasteriser, so every channel is exact ─────────────────────
  // A: rgb albedo (gamma 2), a coverage of leaves + twigs · B: r twig coverage, g leaf id, b leaf mask, a snow clumps
  const SHAPES = {
    ovate: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 5))),
    oak: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 1.25)), 0.75) * (0.58 + 0.42 * Math.pow(Math.abs(Math.cos(u * Math.PI * 3.6 + 0.4)), 0.8)),
    birch: (u) => Math.pow(Math.min(1, u * 3.4), 0.8) * Math.pow(Math.max(0, 1 - u), 0.6) * 1.55 * (1 + 0.07 * Math.sin(u * 70)),
    lance: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.9)), 1.3),
  };
  const paintAtlas = (species, CELL) => {
    const COLS = 4, ROWS = 4, W = COLS * CELL, H = ROWS * CELL, A = new Float32Array(W * H * 4), B = new Float32Array(W * H * 4);
    let cx0 = 0, cy0 = 0;                                                        // current cell origin in pixels
    const px = (v) => v * CELL;
    const over = (i, c, cov) => { const a0 = A[i + 3], ao = cov + a0 * (1 - cov); if (ao < 1e-5) return; const k0 = (a0 * (1 - cov)) / ao, k1 = cov / ao; A[i] = A[i] * k0 + c[0] * k1; A[i + 1] = A[i + 1] * k0 + c[1] * k1; A[i + 2] = A[i + 2] * k0 + c[2] * k1; A[i + 3] = ao; };
    // a tapered line; kind 0 twig, 1 needle (counts as leaf)
    const line = (x0, y0, x1, y1, w0, w1, col, kind, id) => {
      x0 = px(x0); y0 = px(y0); x1 = px(x1); y1 = px(y1); w0 = Math.max(px(w0) * 0.5, 0.35); w1 = Math.max(px(w1) * 0.5, 0.3);
      const m = Math.max(w0, w1) + 1.5, ax = Math.max(1, Math.floor(Math.min(x0, x1) - m)), bx = Math.min(CELL - 2, Math.ceil(Math.max(x0, x1) + m)), ay = Math.max(1, Math.floor(Math.min(y0, y1) - m)), by = Math.min(CELL - 2, Math.ceil(Math.max(y0, y1) + m));
      const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-6;
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
        const t = LR.sat(((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / l2), d = Math.hypot(x + 0.5 - x0 - dx * t, y + 0.5 - y0 - dy * t), hw = w0 + (w1 - w0) * t;
        const cov = LR.sat(0.5 - (d - hw)); if (cov <= 0) continue; const i = ((cy0 + y) * W + cx0 + x) * 4;
        over(i, col, cov);
        if (kind === 0) { B[i] = Math.max(B[i], cov); B[i + 2] *= 1 - cov; } else { B[i + 2] = B[i + 2] + (1 - B[i + 2]) * cov; if (cov > 0.4) B[i + 1] = id; }
      }
    };
    // a leaf: base point, direction, length, half-width, outline
    const leaf = (bx_, by_, ang, len, wid, shape, col, id) => {
      const X = px(bx_), Y = px(by_), Lp = px(len), Wp = px(wid), c = Math.cos(ang), s = Math.sin(ang), m = Math.max(Lp, Wp) + 2;
      const mx = X + c * Lp * 0.5, my = Y + s * Lp * 0.5, ax = Math.max(1, Math.floor(mx - m * 0.75)), bx = Math.min(CELL - 2, Math.ceil(mx + m * 0.75)), ay = Math.max(1, Math.floor(my - m * 0.75)), by = Math.min(CELL - 2, Math.ceil(my + m * 0.75));
      const f = SHAPES[shape] || SHAPES.ovate;
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
        const dx = x + 0.5 - X, dy = y + 0.5 - Y, u = (dx * c + dy * s) / Lp, v = (-dx * s + dy * c) / Wp; if (u < -0.03 || u > 1.03) continue;
        const w = f(LR.sat(u)), sd = (Math.abs(v) - w) * Wp, cov = LR.sat(0.5 - sd) * LR.sat((u + 0.01) * Lp + 0.5) * LR.sat((1.01 - u) * Lp + 0.5); if (cov <= 0) continue;
        const mid = 1 - LR.sat(Math.abs(v) / Math.max(w, 1e-3)), rib = LR.sm(1.6 / Wp + 0.05, 0, Math.abs(v)), sv = Math.pow(Math.abs(Math.sin((u * 7.5 - Math.abs(v) * 1.6) * Math.PI)), 8) * 0.12 * (1 - rib);
        const sh = (0.8 + 0.22 * Math.sqrt(mid)) * (v > 0 ? 1 : 0.88) * (0.84 + 0.2 * u) * (1 + rib * 0.22 + sv);
        const i = ((cy0 + y) * W + cx0 + x) * 4; over(i, [col[0] * sh, col[1] * sh, col[2] * sh], cov); B[i + 2] = B[i + 2] + (1 - B[i + 2]) * cov; if (cov > 0.4) B[i + 1] = id;
      }
    };
    const leafCol = (pal, r) => { const a = pal[r.int(pal.length)], b = pal[r.int(pal.length)], t = r(), k = r.range(0.8, 1.12); return [LR.lerp(a[0], b[0], t) * k, LR.lerp(a[1], b[1], t) * k, LR.lerp(a[2], b[2], t) * k]; };
    const sprayBroad = (L, r) => {                                               // a leafy branchlet: an axis, side twigs, twiglets, small leaves all along
      const pal = L.summer.map(hex), tw = hex(L.twig), sh = L.spray, ll = L.leafLen || 0.078, la = L.leafAspect || 0.3, fill = L.leafFill === undefined ? 0.92 : L.leafFill, leaves = [];
      const inside = (x, y) => x > 0.035 && x < 0.965 && y > 0.03 && y < 0.97;
      const twig = (x0, y0, ang, len, w0, depth, tone) => {
        const n = Math.max(2, Math.round(len / 0.042)); let x = x0, y = y0, a = ang; const bend = r.range(-0.3, 0.3); tone = tone || r.range(0.62, 1.28);
        for (let i = 0; i < n; i++) { const nx = x + Math.cos(a) * len / n, ny = y + Math.sin(a) * len / n; if (!inside(nx, ny)) break; line(x, y, nx, ny, w0 * (1 - i / n * 0.7), w0 * (1 - (i + 1) / n * 0.7), tw, 0, 0);
          for (const sd of [-1, 1]) if (r() < fill) leaves.push([x + (nx - x) * r(), y + (ny - y) * r(), a + sd * r.range(0.5, 1.15), ll * r.range(0.75, 1.2), tone * (0.8 + 0.3 * i / n)]);
          if (depth > 0 && i > 0 && r() < 0.5) twig(nx, ny, a + (r() < 0.5 ? -1 : 1) * r.range(0.6, 1.0), len * r.range(0.3, 0.45), w0 * 0.6, depth - 1, tone * r.range(0.85, 1.15));
          x = nx; y = ny; a += bend * 0.3 + r.range(-0.15, 0.15); }
        leaves.push([x, y, a + r.range(-0.3, 0.3), ll * r.range(0.9, 1.25), tone * 1.1]);
      };
      let x = 0.5, y = 0.03, a = Math.PI / 2 + r.range(-0.1, 0.1); const n = L.twigs || 9, mainLen = 0.68;
      for (let i = 0; i < n; i++) {
        const nx = x + Math.cos(a) * mainLen / n, ny = y + Math.sin(a) * mainLen / n, k = 1 - 0.42 * i / n; line(x, y, nx, ny, 0.017 * (1 - i / n * 0.6), 0.017 * (1 - (i + 1) / n * 0.6), tw, 0, 0);
        if (i > 0) { const sd = i % 2 ? 1 : -1; twig(nx, ny, a + sd * r.range(0.6, 1.0), r.range(0.26, 0.4) * k, 0.009, 1); if (r() < 0.7) twig(x + (nx - x) * 0.5, y + (ny - y) * 0.5, a - sd * r.range(0.65, 1.05), r.range(0.22, 0.36) * k, 0.008, 1); }
        x = nx; y = ny; a += r.range(-0.14, 0.14);
      }
      twig(x, y, a, 0.24, 0.01, 1); twig(x, y, a + r.range(0.5, 0.8), 0.18, 0.008, 0); twig(x, y, a - r.range(0.5, 0.8), 0.18, 0.008, 0);
      leaves.sort((p, q) => p[1] - q[1]);                                        // low ones first so the upper overlap them
      for (const l of leaves) { let len = Math.min(l[3], 0.3); for (let k = 0; k < 4 && !inside(l[0] + Math.cos(l[2]) * len, l[1] + Math.sin(l[2]) * len); k++) { l[2] = Math.atan2(0.5 - l[1], 0.5 - l[0]) + r.range(-0.8, 0.8); len *= 0.85; }
        const c = leafCol(pal, r), tn = l[4] || 1; c[0] *= tn; c[1] *= tn; c[2] *= tn; if (r() < 0.05) { c[0] *= 1.5; c[1] *= 1.15; }
        leaf(l[0], l[1], l[2], len, len * la, sh, c, r()); }
    };
    const sprayNeedle = (L, r) => {                                              // a flat spruce branchlet: herringbone twigs, needles all along
      const pal = L.summer.map(hex), tw = hex(L.twig), nl = L.leafLen || 0.034, nw = L.needleWidth || 0.0065;
      const needles = (x0, y0, x1, y1, id, k) => { const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), n = Math.max(2, Math.round(len / 0.011)); const c = leafCol(pal, r);
        for (let i = 0; i < n; i++) for (const sd of [-1, 1]) { const t = (i + r()) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, na = a + sd * r.range(0.75, 1.2), l = nl * k * r.range(0.8, 1.15); const sh = r.range(0.75, 1.15); line(x, y, x + Math.cos(na) * l, y + Math.sin(na) * l, nw, nw * 0.5, [c[0] * sh, c[1] * sh, c[2] * sh], 1, id); } };
      const x0 = 0.5, y0 = 0.02, y1 = 0.96, bend = r.range(-0.04, 0.04), steps = 12, segs = [];
      for (let i = 0; i < steps; i++) { const t0 = i / steps, t1 = (i + 1) / steps, xa = x0 + bend * Math.sin(t0 * 3), xb = x0 + bend * Math.sin(t1 * 3), ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1; line(xa, ya, xb, yb, 0.016 * (1 - t0 * 0.7), 0.016 * (1 - t1 * 0.7), tw, 0, 0); segs.push([xa, ya, xb, yb, t0]);
        if (i > 0) for (const sd of [-1, 1]) { const l = (0.43 * (1 - t0) + 0.07) * r.range(0.85, 1.1), a = Math.PI / 2 - sd * r.range(0.8, 1.02), ex = LR.clamp(xa + Math.cos(a) * l, 0.04, 0.96), ey = Math.min(0.96, ya + Math.sin(a) * l); line(xa, ya, ex, ey, 0.009, 0.004, tw, 0, 0); segs.push([xa, ya, ex, ey, t0]);
          if (l > 0.2) { const mx = (xa + ex) / 2, my = (ya + ey) / 2, a2 = a + sd * 0.55, l2 = l * 0.42; const fx = LR.clamp(mx + Math.cos(a2) * l2, 0.04, 0.96), fy = Math.min(0.96, my + Math.sin(a2) * l2); line(mx, my, fx, fy, 0.006, 0.003, tw, 0, 0); segs.push([mx, my, fx, fy, t0]); } } }
      for (const s of segs) needles(s[0], s[1], s[2], s[3], r(), 1 - 0.25 * s[4]);
    };
    const sprayPine = (L, r) => {                                                // long needles in tufts at the twig ends
      const pal = L.summer.map(hex), tw = hex(L.twig), nl = L.leafLen || 0.3;
      const tuft = (x, y, a) => { const c = leafCol(pal, r), id = r(), n = 46; for (let i = 0; i < n; i++) { const na = a + r.range(-1.35, 1.35), l = nl * r.range(0.6, 1.1) * (1 - 0.3 * Math.abs(na - a) / 1.35), sh = r.range(0.7, 1.2); const ex = LR.clamp(x + Math.cos(na) * l, 0.03, 0.97), ey = LR.clamp(y + Math.sin(na) * l, 0.03, 0.97); line(x, y, ex, ey, 0.0075, 0.004, [c[0] * sh, c[1] * sh, c[2] * sh], 1, id); } };
      let x = 0.5, y = 0.03, a = Math.PI / 2 + r.range(-0.1, 0.1); const ends = [];
      for (let i = 0; i < 3; i++) { const nx = x + Math.cos(a) * 0.14, ny = y + Math.sin(a) * 0.14; line(x, y, nx, ny, 0.022 - i * 0.004, 0.018 - i * 0.004, tw, 0, 0); const sd = i % 2 ? 1 : -1, ba = a + sd * r.range(0.6, 0.95), bl = r.range(0.16, 0.24), bx = nx + Math.cos(ba) * bl, by = ny + Math.sin(ba) * bl; line(nx, ny, bx, by, 0.012, 0.008, tw, 0, 0); ends.push([bx, by, ba]); x = nx; y = ny; a += r.range(-0.2, 0.2); }
      ends.push([x, y, a]); for (const e of ends) tuft(e[0], e[1], e[2]);
    };
    let cell = 0;
    for (const sp of species) {
      sp.cells = [];
      for (let k = 0; k < 2; k++) {
        if (cell >= COLS * ROWS) throw new Error('flora: the leaf atlas holds ' + (COLS * ROWS / 2) + ' species');
        cx0 = (cell % COLS) * CELL; cy0 = Math.floor(cell / COLS) * CELL; const r = LR.rng('spray' + sp.name + k + sp.seed);
        (sp.leaf.spray === 'needle' ? sprayNeedle : sp.leaf.spray === 'pine' ? sprayPine : sprayBroad)(sp.leaf, r);
        // snow clumps; fill what nothing covered with the cell's mean colour so edges do not darken
        let sr = 0, sg = 0, sb = 0, sw = 0;
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const i = ((cy0 + y) * W + cx0 + x) * 4; B[i + 3] = LR.sm(0.42, 0.6, LR.fbm(x / CELL * 5 + cell * 3.7, y / CELL * 5 + 1.3, 3)); if (B[i + 2] > 0.5) { sr += A[i]; sg += A[i + 1]; sb += A[i + 2]; sw++; } }
        if (sw) { sr /= sw; sg /= sw; sb /= sw; }
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const i = ((cy0 + y) * W + cx0 + x) * 4, a = A[i + 3]; if (a < 0.999) { const k2 = a; A[i] = A[i] * k2 + sr * (1 - k2); A[i + 1] = A[i + 1] * k2 + sg * (1 - k2); A[i + 2] = A[i + 2] * k2 + sb * (1 - k2); } }
        sp.cells.push(cell); cell++;
      }
    }
    const a8 = new Uint8Array(W * H * 4), b8 = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H * 4; i += 4) { a8[i] = Math.round(Math.sqrt(LR.sat(A[i])) * 255); a8[i + 1] = Math.round(Math.sqrt(LR.sat(A[i + 1])) * 255); a8[i + 2] = Math.round(Math.sqrt(LR.sat(A[i + 2])) * 255); a8[i + 3] = Math.round(LR.sat(A[i + 3]) * 255); b8[i] = Math.round(LR.sat(B[i]) * 255); b8[i + 1] = Math.round(LR.sat(B[i + 1]) * 255); b8[i + 2] = Math.round(LR.sat(B[i + 2]) * 255); b8[i + 3] = Math.round(LR.sat(B[i + 3]) * 255); }
    // mip chains that keep coverage: a thinner level is scaled until as much of each cell passes the alpha test as at full size
    const chain = (d0, ch) => {
      const mips = [{ data: d0, width: W, height: H }]; let w = W, h = H, src = d0, cs = CELL;
      const cover = (d, w_, x0, y0, n, s) => { let c = 0; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[((y0 + y) * w_ + x0 + x) * 4 + ch] * s > 127) c++; return c / (n * n); };
      const base = []; for (let c = 0; c < COLS * ROWS; c++) base.push(cover(d0, W, (c % COLS) * CELL, Math.floor(c / COLS) * CELL, CELL, 1));
      while (w > 1 || h > 1) {
        const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), d = new Uint8Array(nw * nh * 4);
        for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 4; c++) { const x2 = Math.min(w - 1, x * 2 + 1), y2 = Math.min(h - 1, y * 2 + 1); d[(y * nw + x) * 4 + c] = (src[(y * 2 * w + x * 2) * 4 + c] + src[(y * 2 * w + x2) * 4 + c] + src[(y2 * w + x * 2) * 4 + c] + src[(y2 * w + x2) * 4 + c] + 2) >> 2; }
        cs >>= 1;
        if (cs >= 4) for (let c = 0; c < COLS * ROWS; c++) { const x0 = (c % COLS) * cs, y0 = Math.floor(c / COLS) * cs; if (base[c] < 0.004) continue; let lo = 1, hi = 6; for (let it = 0; it < 9; it++) { const m = (lo + hi) / 2; if (cover(d, nw, x0, y0, cs, m) < base[c]) lo = m; else hi = m; }
          const s = (lo + hi) / 2; for (let y = 0; y < cs; y++) for (let x = 0; x < cs; x++) { const i = ((y0 + y) * nw + x0 + x) * 4 + ch; d[i] = Math.min(255, Math.round(d[i] * s)); } }
        mips.push({ data: d, width: nw, height: nh }); src = d; w = nw; h = nh;
      }
      return mips;
    };
    const mk = (mips) => { const t = new T.DataTexture(mips[0].data, W, H, T.RGBAFormat, T.UnsignedByteType); t.mipmaps = mips; t.generateMipmaps = false; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = Math.min(4, LR.gpu.maxAniso); t.needsUpdate = true; return t; };
    return { A: mk(chain(a8, 3)), B: mk(chain(b8, 0)), COLS, ROWS, CELL, W, H, rawA: a8, rawB: b8 };
  };
  const cellRect = (at, c) => { const m = 1.5 / at.W, x = (c % at.COLS) / at.COLS, y = Math.floor(c / at.COLS) / at.ROWS; return [x + m, y + m * at.W / at.H, x + 1 / at.COLS - m, y + 1 / at.ROWS - m * at.W / at.H]; };

  // ── growing a tree: a skeleton of tapering branches, and where the leaf cards hang ───────────────────────────────
  const sampleAt = (b, t) => { const n = b.pts.length - 1, f = LR.sat(t) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, p0 = b.pts[i], p1 = b.pts[i + 1]; return { p: [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u], d: norm(sub(p1, p0)), r: b.rads[i] + (b.rads[i + 1] - b.rads[i]) * u, bw: b.bw0 + (b.bw1 - b.bw0) * LR.sat(t) }; };
  const growTree = (def, seed) => {
    const r = LR.rng(seed), H = r.range(def.height[0], def.height[1]), Hm = (def.height[0] + def.height[1]) / 2, tr = def.trunk, lv = def.levels, L = def.leaf;
    const tree = { H, branches: [], cards: [], def }, cc = [0, def.crown.cy * H, 0], cr = [def.crown.r * H, def.crown.ry * H];
    const inCrown = (p) => Math.hypot(p[0] / cr[0], (p[1] - cc[1]) / cr[1], p[2] / cr[0]);
    const clumpLevel = def.clumpLevel !== undefined ? def.clumpLevel : Math.max(1, lv.length - 1); let clumpN = 0;
    // a leaf card on branch b at t.  Most face outward from the crown and hang along its surface (so the crown is dense
    // from the side), the rest lie flat (so it is dense from below).
    const cardAt = (b, t, o = {}) => {
      const s0 = sampleAt(b, t), d = s0.d, a = perp(d), bb = cross(d, a), az = r() * TAU, side = add(mul(a, Math.cos(az)), mul(bb, Math.sin(az)));
      const tilt = L.tilt === undefined ? 0.4 : L.tilt, jit = () => [r.gauss() * tilt, r.gauss() * tilt * 0.6, r.gauss() * tilt];
      let s, n;
      if (o.dir) { s = o.dir; n = o.n || cross(cross(s, [0, 1, 0]), s); if (vlen(n) < 1e-3) n = perp(s); n = norm(add(norm(n), jit())); }
      else if (r() < (L.outward === undefined ? 0.6 : L.outward)) {
        const q = sub(s0.p, cc); n = norm(add(norm([q[0], q[1] * 0.6 + 0.15 * cr[1], q[2]]), jit()));
        s = add(add(mul(d, 0.45), mul(side, 0.55)), [0, -(0.35 + L.droop), 0]);
      } else {
        s = norm(add(add(mul(d, L.forward === undefined ? 0.55 : L.forward), mul(side, L.spread === undefined ? 0.8 : L.spread)), [0, -L.droop, 0]));
        n = cross(cross(s, [0, 1, 0]), s); if (vlen(n) < 1e-3) n = perp(s); n = norm(add(norm(n), jit())); if (n[1] < 0) n = mul(n, -1);
      }
      s = sub(s, mul(n, dot(s, n))); if (vlen(s) < 1e-3) s = perp(n); s = norm(s); n = norm(sub(n, mul(s, dot(n, s))));
      tree.cards.push({ p: sub(s0.p, mul(s, 0.05)), s, n, size: r.range(L.size[0], L.size[1]) * (o.k || 1), cell: r.int(2), rnd: r(), phase: b.phase, bw: Math.max(s0.bw, 0.55), clump: b.clump, upright: o.upright });
    };
    const grow = (level, o, dir, len, rad0, phase, bw0, tParent, clumpIn) => {
      const Ld = level === 0 ? tr : lv[level - 1], segs = Ld.segs || [9, 6, 4, 3, 3][level], pts = [o.slice()], rads = [rad0]; let p = o.slice(), d = dir.slice(), w = [0, 0, 0];
      const gn = Ld.gnarl || 0, taper = Ld.taper === undefined ? 0.8 : Ld.taper;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs; w = [w[0] * 0.55 + r.gauss() * 1.3, w[1] * 0.55 + r.gauss() * 1.3, w[2] * 0.55 + r.gauss() * 1.3];
        const up = typeof Ld.up === 'function' ? Ld.up(t) : Ld.up || 0;
        d = norm([d[0] + w[0] * gn * 0.3, d[1] + w[1] * gn * 0.22 + up * 0.36 + (level === 0 ? 0.25 : 0), d[2] + w[2] * gn * 0.3]);
        p = add(p, mul(d, len / segs)); pts.push(p.slice()); rads.push(Math.max(0.006, rad0 * (1 - taper * Math.pow(t, Ld.tpow || 1))));
      }
      const bw1 = level === 0 ? 0 : Math.min(1, bw0 + [0, 0.55, 0.3, 0.25, 0.2][level]);
      const b = { level, pts, rads, phase, bw0, bw1, len, tParent, clump: level <= clumpLevel ? clumpN++ : clumpIn }; tree.branches.push(b);
      // children
      if (level < lv.length) {
        const C = lv[level], list = [];
        if (C.whorl) { const span = len * (C.to - C.from), nW = Math.max(2, Math.floor(span / C.whorl.step)); let az0 = r() * TAU; for (let wi = 0; wi < nW; wi++) { const t = C.from + (C.to - C.from) * (wi + 0.5) / nW, per = Math.round(val(C.whorl.per, r)); az0 += 0.9; for (let k = 0; k < per; k++) list.push([t + r.range(-0.3, 0.3) / nW * (C.to - C.from), az0 + (k / per) * TAU + r.range(-0.25, 0.25)]); } }
        else { const n = Math.max(1, Math.round(val(C.count, r))); let az = r() * TAU; for (let k = 0; k < n; k++) { az += 2.39996 + r.range(-0.45, 0.45); list.push([C.from + (C.to - C.from) * (k + r.range(0.15, 0.85)) / n, az]); } }
        for (const [t, az] of list) {
          const s0 = sampleAt(b, t), a = perp(s0.d), bb = cross(s0.d, a), tn = LR.sat((t - C.from) / Math.max(1e-3, C.to - C.from));
          let ang = (typeof C.angle === 'function' ? C.angle(tn) : val(C.angle, r)) * Math.PI / 180; if (C.topAngle !== undefined) ang *= LR.lerp(1, C.topAngle, tn * tn);
          let cd = norm(add(mul(s0.d, Math.cos(ang)), mul(add(mul(a, Math.cos(az)), mul(bb, Math.sin(az))), Math.sin(ang))));
          if (C.minY !== undefined && cd[1] < C.minY) { cd[1] = C.minY; cd = norm(cd); }
          let clen = C.lenAbs ? C.lenAbs(tn, H) * r.range(0.85, 1.12) : len * val(C.len, r) * (C.lenByT ? C.lenByT(tn) : 1);
          if (!C.lenAbs && !C.free) { const e = inCrown(add(s0.p, mul(cd, clen))); if (e > 1) clen *= Math.max(0.4, 1 / e); }
          grow(level + 1, s0.p, cd, clen, Math.max(0.008, Math.min(s0.r * 0.92, s0.r * val(C.rad, r) + 0.004)), level === 0 ? r() : phase, s0.bw, t, b.clump);
        }
      }
      // leaves on the last level (and on earlier ones that ask for them)
      if (level > 0) {
        const C = lv[level - 1], last = level === lv.length, n = C.leaves !== undefined ? C.leaves : last ? L.perTwig : 0;
        if (n > 0 && L.mode === 'fan') {                                      // conifer bough: sprays to both sides all along, curtains hanging under it, one at the tip
          const step = L.step || 0.55, cnt = Math.max(1, Math.round(len / step)), k = LR.lerp(1, 0.62, tParent || 0);
          for (let i = 0; i < cnt; i++) { const t = (i + 0.6) / (cnt + 0.3), s0 = sampleAt(b, t), h = norm(cross(s0.d, [0, 1, 0])), out = norm([s0.d[0], 0, s0.d[2]]);
            for (const sd of [-1, 1]) cardAt(b, t, { dir: norm(add(add(mul(s0.d, 0.62), mul(h, sd * 0.72)), [0, -L.droop, 0])), k });
            if (L.hang !== 0) cardAt(b, t, { dir: norm(add([0, -1, 0], mul(out, 0.3 + 0.3 * r()))), n: i & 1 ? h : out, k: k * (L.hang || 0.9) }); }
          cardAt(b, 1, { dir: norm(add(sampleAt(b, 1).d, [0, -L.droop * 0.5, 0])), k });
        } else if (n > 0) { const from = L.from; for (let i = 0; i < n; i++) cardAt(b, from + (1 - from) * (i + r.range(0.2, 0.9)) / n); }
      }
      return b;
    };
    const la = r() * TAU, lean = tr.lean * r.range(0.4, 1.3);
    if (def.kind === 'bush') {                                                  // no trunk: stems straight from the ground
      const n = Math.round(val(def.stems || [6, 8], r)); for (let k = 0; k < n; k++) { const az = (k / n) * TAU + r.range(-0.3, 0.3), ang = r.range(0.2, 0.85); grow(1, [Math.cos(az) * 0.12, -0.05, Math.sin(az) * 0.12], norm([Math.cos(az) * Math.sin(ang), Math.cos(ang), Math.sin(az) * Math.sin(ang)]), H * r.range(0.7, 1.05), tr.radius * r.range(0.7, 1.1), r(), 0.1, 0); }
    } else {
      const trunk = grow(0, [0, -0.35, 0], norm([Math.cos(la) * lean, 1, Math.sin(la) * lean]), H * tr.len, tr.radius * (H / Hm), 0, 0, 0);
      if (def.kind === 'conifer') { const top = sampleAt(trunk, 1); for (let k = 0; k < 4; k++) { const az = (k / 4) * TAU; tree.cards.push({ p: sub(top.p, [0, L.size[0] * 0.55, 0]), s: norm([Math.cos(az) * 0.22, 1, Math.sin(az) * 0.22]), n: [Math.cos(az + 1.57), 0, Math.sin(az + 1.57)], size: L.size[0] * 0.85, cell: k & 1, rnd: r(), phase: 0.5, bw: 0.5, upright: true }); } }
    }
    // the crown as it turned out, and each clump of it: centre and reach, for volume shading
    const ctr = (k) => add(k.p, mul(k.s, k.size * 0.5));
    let c = [0, 0, 0]; for (const k of tree.cards) c = add(c, ctr(k)); const nC = Math.max(1, tree.cards.length); c = mul(c, 1 / nC);
    let rx = 0.5, ry = 0.5; for (const k of tree.cards) { const q = sub(ctr(k), c); rx = Math.max(rx, Math.hypot(q[0], q[2])); ry = Math.max(ry, Math.abs(q[1])); }
    tree.cc = c; tree.cr = [rx, ry];
    const cl = {}; for (const k of tree.cards) { const g = cl[k.clump] || (cl[k.clump] = { c: [0, 0, 0], n: 0, r: 0.3 }); g.c = add(g.c, ctr(k)); g.n++; }
    for (const id in cl) cl[id].c = mul(cl[id].c, 1 / cl[id].n);
    for (const k of tree.cards) { const g = cl[k.clump]; g.r = Math.max(g.r, vlen(sub(ctr(k), g.c))); }
    const cw = def.clumpShade === undefined ? 0.6 : def.clumpShade;
    for (const k of tree.cards) {
      const q = sub(add(k.p, mul(k.s, k.size * 0.55)), c), e = [q[0] / rx, q[1] / ry, q[2] / rx], dd = LR.sat(vlen(e)), g = cl[k.clump], gq = sub(ctr(k), g.c), gd = LR.sat(vlen(gq) / g.r);
      const crownP = def.kind === 'conifer' ? norm([q[0] / rx * 1.1, 0.55, q[2] / rx * 1.1]) : norm([e[0], e[1] + 0.3, e[2]]);
      k.puff = norm(add(add(mul(crownP, 1 - cw * 0.5), mul(norm(gq), cw * gd)), [0, 0.12, 0]));
      k.ao = LR.lerp(0.6, 1, LR.sm(0.2, 0.95, dd)) * LR.lerp(0.88, 1, LR.sm(-0.7, 0.3, e[1])) * LR.lerp(1 - cw * 0.25, 1, LR.sm(0.15, 0.9, gd));
    }
    return tree;
  };

  // ── tree → vertex buffers.  vertex: position f32x3 · normal i8x4 (xyz, ao) · uv f32x2 · aux u8x4 (phase, branch, flutter, rnd) · meta u8x4 (0 wood | 1 leaf, bark layer) ──
  class TBuf {
    constructor() { this.n = 0; this.ni = 0; this.cap(2048, 4096); this.min = [1e9, 1e9, 1e9]; this.max = [-1e9, -1e9, -1e9]; }
    cap(nv, ni) { const g = (C, n, o) => { const a = new C(n); if (o) a.set(o); return a; }; this.P = g(Float32Array, nv * 3, this.P); this.N = g(Int8Array, nv * 4, this.N); this.UV = g(Float32Array, nv * 2, this.UV); this.X = g(Uint8Array, nv * 4, this.X); this.M = g(Uint8Array, nv * 4, this.M); this.I = g(Uint32Array, ni, this.I); this.cv = nv; this.ci = ni; }
    v(p, n, ao, u, v, a0, a1, a2, a3, kind, layer) { if (this.n + 1 > this.cv) this.cap(this.cv * 2, this.ci); const i = this.n++; this.P[i * 3] = p[0]; this.P[i * 3 + 1] = p[1]; this.P[i * 3 + 2] = p[2]; this.N[i * 4] = Math.round(n[0] * 127); this.N[i * 4 + 1] = Math.round(n[1] * 127); this.N[i * 4 + 2] = Math.round(n[2] * 127); this.N[i * 4 + 3] = Math.round(LR.sat(ao) * 127); this.UV[i * 2] = u; this.UV[i * 2 + 1] = v; this.X[i * 4] = Math.round(LR.sat(a0) * 255); this.X[i * 4 + 1] = Math.round(LR.sat(a1) * 255); this.X[i * 4 + 2] = Math.round(LR.sat(a2) * 255); this.X[i * 4 + 3] = Math.round(LR.sat(a3) * 255); this.M[i * 4] = kind; this.M[i * 4 + 1] = layer; for (let k = 0; k < 3; k++) { if (p[k] < this.min[k]) this.min[k] = p[k]; if (p[k] > this.max[k]) this.max[k] = p[k]; } return i; }
    tri(a, b, c) { if (this.ni + 3 > this.ci) this.cap(this.cv, this.ci * 2); this.I[this.ni++] = a; this.I[this.ni++] = b; this.I[this.ni++] = c; }
    attrs() { return { position: new T.BufferAttribute(this.P.slice(0, this.n * 3), 3), normal: new T.BufferAttribute(this.N.slice(0, this.n * 4), 4, true), uv: new T.BufferAttribute(this.UV.slice(0, this.n * 2), 2), aux: new T.BufferAttribute(this.X.slice(0, this.n * 4), 4, true), meta: new T.BufferAttribute(this.M.slice(0, this.n * 4), 4, false), index: new T.BufferAttribute(this.n > 65535 ? this.I.slice(0, this.ni) : new Uint16Array(this.I.subarray(0, this.ni)), 1) }; }
  }
  const tube = (buf, b, sides, rings, layer, tile, flare, aoA, aoB, seed) => {
    const n = b.pts.length, idx = []; for (let i = 0; i < rings; i++) idx.push(Math.round((i / (rings - 1)) * (n - 1)));
    const base = buf.n, rep = Math.max(1, Math.round((TAU * b.rads[0]) / tile)); let px = null, len = 0;
    for (let j = 0; j < rings; j++) {
      const i = idx[j], p = b.pts[i], q = b.pts[Math.min(i + 1, n - 1)], pr = b.pts[Math.max(i - 1, 0)], tz = norm(sub(q, pr));
      if (j > 0) len += vlen(sub(p, b.pts[idx[j - 1]]));
      let x = px ? sub(px, mul(tz, dot(px, tz))) : perp(tz); x = norm(x); px = x; const y = cross(tz, x), t = j / (rings - 1);
      let rr = b.rads[i]; const fl = flare > 0 ? flare * Math.exp(-Math.max(0, p[1] + 0.2) / 0.55) : 0;
      for (let k = 0; k <= sides; k++) { const a = (k / sides) * TAU, c = Math.cos(a), s = Math.sin(a), nn = [x[0] * c + y[0] * s, x[1] * c + y[1] * s, x[2] * c + y[2] * s]; const rk = rr * (1 + fl * (0.75 + 0.45 * Math.sin((k % sides) / sides * TAU * 4 + seed * 9)));
        buf.v([p[0] + nn[0] * rk, p[1] + nn[1] * rk, p[2] + nn[2] * rk], fl > 0.05 ? norm([nn[0], nn[1] + fl * 0.5, nn[2]]) : nn, LR.lerp(aoA, aoB, t) * (b.level === 0 ? LR.lerp(0.72, 1, LR.sm(0, 1.1, p[1])) : 1), (k / sides) * rep, len / tile, b.phase, b.bw0 + (b.bw1 - b.bw0) * t, 0, 0, 0, layer); }
    }
    for (let j = 0; j < rings - 1; j++) for (let k = 0; k < sides; k++) { const a = base + j * (sides + 1) + k, bq = a + 1, c = a + sides + 1, d = c + 1; buf.tri(a, c, bq); buf.tri(bq, c, d); }
  };
  const card = (buf, k, rect, grow, bent, shapeN) => {
    const L = k.size * grow, hw = L * 0.5, s = k.s, n = k.n, w = cross(n, s), base = buf.n, [u0, v0, u1, v1] = rect, um = (u0 + u1) / 2;
    const p0 = sub(k.p, mul(s, (grow - 1) * k.size * 0.35));
    const nf = dot(n, k.puff) < 0 ? mul(n, -1) : n, nn = norm(add(mul(k.puff, 0.9), mul(nf, 0.14))), row = (t, lift) => add(add(p0, mul(s, L * t)), mul(n, lift));
    const rows = bent ? [[0, 0], [0.5, L * 0.09], [1, k.upright ? 0 : -L * 0.06]] : [[0, 0], [1, 0]];
    for (const [t, lift] of rows) { const c = row(t, lift), nl = norm(add(nn, mul(w, -0.12))), nr = norm(add(nn, mul(w, 0.12)));
      buf.v(sub(c, mul(w, hw)), nl, k.ao, u0, v0 + (v1 - v0) * t, k.phase, k.bw, t, k.rnd, 1, 0); buf.v(add(c, mul(w, hw)), nr, k.ao, u1, v0 + (v1 - v0) * t, k.phase, k.bw, t, k.rnd, 1, 0); }
    for (let j = 0; j < rows.length - 1; j++) { const a = base + j * 2; buf.tri(a, a + 1, a + 2); buf.tri(a + 1, a + 3, a + 2); }
  };
  const meshTree = (tree, at, lod) => {
    const def = tree.def, buf = new TBuf(), layer = LR.mat.L(def.bark), tile = LR.mat.tile(def.bark), sd = tree.H;
    const sides = lod === 0 ? [10, 7, 5, 3, 3] : [6, 4, 3, 3, 3], maxLevel = lod === 0 ? 9 : def.lod1.levels;
    for (const b of tree.branches) {
      if (b.level > maxLevel) continue; if (lod === 1 && b.level >= 1 && b.rads[0] < (def.lod1.minRad || 0.035)) continue;
      const rings = lod === 0 ? b.pts.length : Math.max(2, Math.ceil(b.pts.length * 0.5) + (b.level === 0 ? 1 : 0));
      tube(buf, b, sides[b.level], rings, layer, tile, b.level === 0 ? def.trunk.flare : 0, b.level === 0 ? 1 : 0.85, b.level === 0 ? 0.8 : b.level === 1 ? 0.7 : 0.62, sd);
    }
    buf.woodTris = buf.ni / 3;
    const keep = lod === 0 ? 1 : def.lod1.keep, step = Math.max(1, Math.round(1 / keep)), grow = lod === 0 ? 1 : def.lod1.grow;
    for (let i = 0; i < tree.cards.length; i += step) { const k = tree.cards[i]; card(buf, k, cellRect(at, def.cells[k.cell]), grow, lod === 0); }
    return buf;
  };

  // ── shaders ─────────────────────────────────────────────────────────────────────────────────────────────────────
  LR.chunk.treewind = `
// uTree: height, trunk flex, branch flex, flutter
vec3 treeWind(vec3 wp, vec3 lp, vec3 n, vec4 aux, vec4 iPos, vec4 iRot){
  float st = uWind.z, g = gustAt(iPos.xz, uTime), h01 = sat(lp.y / uTree.x);
  float sway = (0.012 + 0.07 * st) * (g * 1.5 + 0.3 * sin(uTime * 1.25 + iRot.z * 40.0));
  wp.xz += uWind.xy * sway * h01 * h01 * uTree.x * iPos.w * uTree.y;
  float ph = aux.x * TAU + iRot.z * 20.0;
  float bob = sin(uTime * (1.5 + aux.x * 0.9) + ph + wp.x * 0.21) * (0.02 + 0.11 * st) * (0.5 + g) * aux.y * uTree.z;
  wp.y += bob * 0.7; wp.xz += uWind.xy * bob * 0.8;
  float fl = sin(uTime * (5.5 + aux.w * 5.0) + ph * 3.0 + wp.x * 2.1 + wp.z * 1.7) * aux.z * (0.008 + 0.045 * st) * (0.4 + g) * uTree.w;
  return wp + n * fl;
}`;
  LR.chunk.lodfade = `
// two levels of detail share one noise, so where one lets a pixel go the other takes it
bool lodGone(float f, float n){ return f >= 0.0 ? n >= f : n < 1.0 + f; }
float treeNoise(){ return ign(gl_FragCoord.xy + mod(uFrame, 16.0) * vec2(2.17, 5.31)); }`;
  LR.chunk.leafseason = `
// what the season does to a leaf pixel.  returns coverage; outputs whether a leaf is still there
float leafAlpha(vec4 A, vec4 B, float seasonI, float rnd, float evergreen, out float present){
  float key = fract(B.g * 9.7 + rnd * 3.1);
  float drop = evergreen > 0.5 ? 0.0 : smoothstep(0.42, 0.80, seasonI);
  present = step(drop + 1e-3, key);
  return mix(B.r, A.a, present);
}`;
  const treeVS = `//#include head
//#include frame
//#include wind
in vec3 position; in vec4 normal; in vec2 uv; in vec4 aux; in vec4 meta; in vec4 iPos; in vec4 iRot;
uniform mat4 projectionMatrix, viewMatrix; uniform vec4 uTree;
out vec3 vWorld; out vec3 vN; out vec2 vUv; out vec4 vAux; flat out vec4 vMeta; flat out vec4 vInst;
//#include treewind
void main(){
  vec3 lp = position * iPos.w; float c = iRot.x, s = iRot.y;
  vec3 wp = iPos.xyz + vec3(c * lp.x + s * lp.z, lp.y, -s * lp.x + c * lp.z);
  vec3 n = vec3(c * normal.x + s * normal.z, normal.y, -s * normal.x + c * normal.z);
  wp = treeWind(wp, position, n, aux, iPos, iRot);
  vWorld = wp; vN = n; vUv = uv; vAux = vec4(normal.w, aux.w, aux.z, aux.y); vMeta = meta; vInst = iRot;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
  const treeFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include mats
//#include weather
#ifdef BAKE
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;
#else
//#include gout
#endif
//#include lodfade
//#include leafseason
in vec3 vWorld; in vec3 vN; in vec2 vUv; in vec4 vAux; flat in vec4 vMeta; flat in vec4 vInst;
uniform sampler2D uLeafA, uLeafB; uniform vec4 uMatP[32]; uniform vec3 uTwig; uniform vec3 uAut[3]; uniform vec4 uLeafP;   // evergreen, translucency, snow hold, leaf gloss
void main(){
  float n0 = treeNoise(), n1 = fract(n0 * 7.31 + 0.413);
#ifndef BAKE
  if (lodGone(vInst.w, n0)) discard;
#endif
  vec3 Ng = normalize(vN); vec2 dx = dFdx(vUv), dy = dFdy(vUv);
  vec3 gn = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  mat3 tbn = cotFrame(Ng, vWorld, vUv);
  vec3 albedo, N; float rough, ao, trans = 0.0, snow = 0.0, leafy = 0.0;
  if (vMeta.x < 0.5) {
    float layer = floor(vMeta.y + 0.5); vec4 a = textureGrad(uMatA, vec3(vUv, layer), dx, dy), b = textureGrad(uMatB, vec3(vUv, layer), dx, dy);
    albedo = a.rgb * a.rgb; N = normalize(tbn * nrmDec(b.xy)); rough = b.z; ao = b.w * vAux.x;
#ifndef BAKE
    vec4 P = uMatP[int(layer)]; snow = applyWeather(albedo, N, rough, ao, a.a, vWorld, Ng, P.x, 0.0, P.z);
#endif
  } else {
    vec4 A = textureGrad(uLeafA, vUv, dx * LEAF_BIAS, dy * LEAF_BIAS), B = textureGrad(uLeafB, vUv, dx * LEAF_BIAS, dy * LEAF_BIAS);   // sharper than the screen asks for: leaves stay grains, the temporal resolve averages them
    float sI = sat(uWx.w + (vInst.z - 0.5) * 0.16), present;
    float alpha = leafAlpha(A, B, sI, vAux.y, uLeafP.x, present);
#ifdef BAKE
    if (alpha < 0.5) discard;
#else
    alpha *= smoothstep(0.05, 0.3, abs(dot(normalize(uCamPos - vWorld), gn)));          // a card seen edge-on is a smear: let it go
    if (alpha < 0.5 + (n1 - 0.5) * LEAF_HASH) discard;
#endif
    leafy = sat(B.b * present * 1.6);
    vec3 leaf = A.rgb * A.rgb;
    if (uLeafP.x < 0.5) {                                                           // the turn: each leaf in its own time, toward its own colour
      float k2 = fract(B.g * 5.3 + vAux.y * 7.9), k3 = fract(B.g * 3.1 + vInst.z * 5.7 + vAux.y * 0.6);
      float turn = smoothstep(0.17, 0.46, sI + (k2 - 0.5) * 0.2);
      vec3 aut = k3 < 0.4 ? uAut[0] : k3 < 0.75 ? uAut[1] : uAut[2];
      float lum = dot(leaf, vec3(0.3, 0.6, 0.1));
      leaf = mix(leaf, aut * clamp(lum / 0.10, 0.45, 1.9), turn);
      leaf = mix(leaf, vec3(0.085, 0.052, 0.026) * clamp(lum / 0.10, 0.5, 1.6), smoothstep(0.52, 0.8, sI + (k2 - 0.5) * 0.2));
    }
    float vr = 0.84 + 0.3 * vInst.z; leaf *= vec3(vr * (1.0 + (fract(vInst.z * 7.7) - 0.5) * 0.3), vr, vr * 0.9);
    vec4 mz = texture(uNoise, vWorld.xz * 0.31 + vWorld.y * 0.23), mz2 = texture(uNoise, vWorld.xz * 0.073 + vWorld.y * 0.051 + 0.37);
    float mot = mz.r * 0.6 + mz2.g * 0.4; leaf *= 0.62 + 0.76 * mot;                    // light and dark through the crown, whatever the cards do
    albedo = mix(uTwig, leaf, leafy);
    vec3 tilt = (hash33(vec3(B.g * 91.0, vAux.y * 37.0, 3.0)) - 0.5) * 0.4 * leafy;
    N = normalize(Ng + tilt + (vec3(mz.g, mz.b, mz.a) - 0.5) * 0.5 * leafy); rough = mix(0.86, uLeafP.w, leafy); ao = vAux.x * mix(0.85, 1.0, vAux.z) * (0.72 + 0.28 * smoothstep(0.25, 0.65, mot));
    trans = uLeafP.y * leafy;
#ifndef BAKE
    albedo *= mix(1.0, 0.72, uWx.x); rough = mix(rough, rough * 0.5, uWx.x * leafy);
    if (uWx.z > 0.01) {                                                             // snow lies on whatever faces up: needle sprays, bare twigs
      float sm_ = uWx.z * uLeafP.z * smoothstep(0.05, 0.45, gn.y) * smoothstep(0.62 - uWx.z * 0.45, 0.8 - uWx.z * 0.4, B.a * 0.6 + n1 * 0.12 + 0.3 * sat(Ng.y));
      albedo = mix(albedo, vec3(0.82, 0.86, 0.92), sm_); N = normalize(mix(N, vec3(0.0, 1.0, 0.0), sm_ * 0.6)); rough = mix(rough, 0.72, sm_); trans *= 1.0 - sm_; snow = sm_;
    }
#endif
  }
#ifdef BAKE
  o0 = vec4(sqrt(sat(albedo * ao)), 1.0); o1 = vec4(N * 0.5 + 0.5, leafy);
#else
  writeG(albedo, ao, N, rough, 0.0, trans, 0.0, snow);
#endif
}`;
  const treeShadowFS = `//#include head
//#include hash
//#include frame
//#include leafseason
in vec2 vUv; in vec4 vAux; flat in vec4 vMeta; flat in vec4 vInst; in vec3 vWorld; in vec3 vN;
uniform sampler2D uLeafA, uLeafB; uniform vec4 uLeafP; out vec4 o;
void main(){
  if (vMeta.x > 0.5) { vec4 A = texture(uLeafA, vUv, -1.0), B = texture(uLeafB, vUv, -1.0); float present; float alpha = leafAlpha(A, B, sat(uWx.w + (vInst.z - 0.5) * 0.16), vAux.y, uLeafP.x, present); if (alpha < 0.42) discard; }
  o = vec4(1.0);
}`;
  // billboards: one quad per far tree, colour and normal baked from the tree itself
  const impVS = `//#include head
//#include frame
//#include wind
in vec3 position; in vec4 iPos; in vec4 iRot;                                     // iRot: variant, seed, fade, flip
uniform mat4 projectionMatrix, viewMatrix; uniform vec4 uImpDim[16]; uniform vec4 uImpGrid;   // half width, height, evergreen, bottom · cols, rows
out vec2 vUvS; out vec2 vUvW; out vec3 vRight; out vec3 vTo; out vec3 vWorld; flat out vec4 vInst; flat out float vEver;
void main(){
  int vi = int(iRot.x + 0.5); vec4 dim = uImpDim[vi];
  vec3 to = vec3(uCamPos.x - iPos.x, 0.0, uCamPos.z - iPos.z); to = normalize(to); vec3 right = vec3(to.z, 0.0, -to.x);
  float fx = position.x * iRot.w, h = dim.w + position.y * (dim.y - dim.w);
  vec3 wp = iPos.xyz + (right * fx * dim.x + vec3(0.0, h, 0.0)) * iPos.w;
  float g = gustAt(iPos.xz, uTime); wp.xz += uWind.xy * (0.012 + 0.07 * uWind.z) * (g * 1.5 + 0.3 * sin(uTime * 1.25 + iRot.y * 40.0)) * position.y * position.y * dim.y * iPos.w * 0.5;
  float col = mod(float(vi), uImpGrid.x), rowp = floor(float(vi) / uImpGrid.x);
  vec2 q = vec2(position.x * 0.5 + 0.5, position.y); q = q * (1.0 - 5.0 / 256.0) + 2.5 / 256.0;
  vUvS = vec2((col + q.x) / uImpGrid.x, (rowp * 2.0 + q.y) / uImpGrid.y); vUvW = vec2(vUvS.x, vUvS.y + 1.0 / uImpGrid.y);
  vRight = right * iRot.w; vTo = to; vWorld = wp; vInst = iRot; vEver = dim.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
  const impFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include gout
//#include lodfade
in vec2 vUvS; in vec2 vUvW; in vec3 vRight; in vec3 vTo; in vec3 vWorld; flat in vec4 vInst; flat in float vEver;
uniform sampler2D uImpA, uImpB;
void main(){
  float n0 = treeNoise(), n1 = fract(n0 * 7.31 + 0.413);
  if (lodGone(vInst.z, n0)) discard;
  vec4 sA = texture(uImpA, vUvS), sB = texture(uImpB, vUvS), wA = texture(uImpA, vUvW), wB = texture(uImpB, vUvW);
  float sI = sat(uWx.w + (vInst.y - 0.5) * 0.16);
  vec2 cl = floor(vUvS * vec2(2048.0, 1024.0) / 3.0); float k = hash12(cl + vInst.y * 91.0), k2 = hash12(cl * 1.7 + 3.0), k3 = fract(k2 * 5.3 + vInst.y * 5.7);
  float gone = vEver > 0.5 ? 0.0 : step(k, smoothstep(0.42, 0.80, sI));
  float leafy = sB.a * (1.0 - gone);
  vec4 A = sA, Bn = sB;
  if (gone > 0.5 && sB.a > 0.5) { A = wA; Bn = wB; leafy = 0.0; }
  if (A.a < mix(0.38, 0.6, n1)) discard;
  vec3 albedo = A.rgb * A.rgb;
  if (vEver < 0.5 && leafy > 0.3) {
    float turn = smoothstep(0.14, 0.46, sI + (k2 - 0.5) * 0.26); vec3 aut = k3 < 0.4 ? vec3(0.50, 0.33, 0.035) : k3 < 0.75 ? vec3(0.44, 0.13, 0.02) : vec3(0.27, 0.045, 0.015);
    float lum = dot(albedo, vec3(0.3, 0.6, 0.1)); albedo = mix(albedo, aut * clamp(lum / 0.07, 0.4, 1.9), turn);
    albedo = mix(albedo, vec3(0.085, 0.052, 0.026) * clamp(lum / 0.07, 0.5, 1.6), smoothstep(0.52, 0.8, sI + (k2 - 0.5) * 0.2));
  }
  float vr = 0.84 + 0.3 * vInst.y; albedo *= mix(vec3(1.0), vec3(vr * (1.0 + (fract(vInst.y * 7.7) - 0.5) * 0.3), vr, vr * 0.9), leafy);
  vec3 nb = Bn.rgb * 2.0 - 1.0; vec3 N = normalize(vRight * nb.x + vec3(0.0, nb.y, 0.0) + vTo * nb.z);
  float rough = mix(0.88, 0.5, leafy), trans = 0.6 * leafy, snow = 0.0;
  albedo *= mix(1.0, 0.72, uWx.x);
  if (uWx.z > 0.01) { float nz = hash12(floor(vUvS * vec2(2048.0, 1024.0) / 2.0)); float sm_ = uWx.z * smoothstep(0.55 - uWx.z * 0.5, 0.95 - uWx.z * 0.45, nb.y * 0.6 + 0.4 + (nz - 0.5) * 0.35) * (vEver > 0.5 ? 1.0 : 0.8);
    albedo = mix(albedo, vec3(0.82, 0.86, 0.92), sm_); N = normalize(mix(N, vec3(0.0, 1.0, 0.0), sm_ * 0.5)); trans *= 1.0 - sm_; rough = mix(rough, 0.72, sm_); snow = sm_; }
  writeG(albedo, 1.0, N, rough, 0.0, trans, 0.0, snow);
}`;

  // ── build ───────────────────────────────────────────────────────────────────────────────────────────────────────
  const FRAME = () => LR.render.FRAME;
  F.build = () => {
    if (F.built) return F; F.built = true;
    const G = LR.gpu, tier = G.tier, W = LR.world, r = G.renderer, gl = G.gl, t0 = performance.now();
    const used = F.order.filter((n) => F.inst.some((i) => i.sp === n) || F.farInst.some((i) => i.sp === n)).map((n) => F.defs[n]);
    if (!used.length) return F;
    const at = (F.atlas = paintAtlas(used, LR.qn('leafpx', tier.name === 'low' ? 256 : 512)));
    const leafU = { uLeafA: { value: at.A }, uLeafB: { value: at.B } };
    // variants
    const V = (F.variants = []);
    for (const def of used) { def.vars = []; for (let k = 0; k < def.variants; k++) {
      const tree = growTree(def, LR.strHash(def.name + ':' + def.seed + ':' + k)), b0 = meshTree(tree, at, 0), b1 = meshTree(tree, at, 1);
      const R = Math.max(Math.abs(b0.min[0]), Math.abs(b0.max[0]), Math.abs(b0.min[2]), Math.abs(b0.max[2])) * 1.02;
      const v = { def, k, tree, idx: V.length, b: [b0, b1], R, top: b0.max[1] * 1.01, bottom: Math.min(0, b0.min[1]), tris: [b0.ni / 3, b1.ni / 3], trunkR: tree.branches.length && def.kind !== 'bush' ? tree.branches[0].rads[0] * (1 + def.trunk.flare * 0.5) : 0 };
      V.push(v); def.vars.push(v);
    } }
    if (V.length > 16) throw new Error('flora: at most 16 tree variants in use (have ' + V.length + ')');
    const mkU = (v, own) => Object.assign(own || LR.uni(FRAME() + ' uMatA uMatB uTopo uTopoRect'), leafU, {
      uMatP: { value: LR.mat.params }, uTree: { value: new T.Vector4(v.top, v.def.wind.trunk, v.def.wind.branch, v.def.wind.flutter) }, uTwig: { value: new T.Vector3(...hex(v.def.leaf.twig)) },
      uAut: { value: v.def.leaf.autumn.map((c) => new T.Vector3(...hex(c))) }, uLeafP: { value: new T.Vector4(v.def.evergreen ? 1 : 0, v.def.leaf.trans, v.def.leaf.snow, v.def.leaf.gloss || 0.74) } });
    const defsG = { SNOW_LAYER: LR.mat.L('snow'), LEAF_BIAS: LR.qn('leafbias', 0.5).toFixed(3), LEAF_HASH: LR.qn('leafhash', 0.06).toFixed(3) };
    const geo = (buf, max) => { const g = new T.InstancedBufferGeometry(), a = buf.attrs(); for (const k of ['position', 'normal', 'uv', 'aux', 'meta']) g.setAttribute(k, a[k]); g.setIndex(a.index);
      const ib = new T.InstancedInterleavedBuffer(new Float32Array(Math.max(1, max) * 8), 8, 1); ib.setUsage(T.DynamicDrawUsage); g.setAttribute('iPos', new T.InterleavedBufferAttribute(ib, 4, 0)); g.setAttribute('iRot', new T.InterleavedBufferAttribute(ib, 4, 4)); g.instanceCount = 0; g.userData.ib = ib; g.userData.attrs = a; return g; };
    const twin = (g0, max) => { const g = new T.InstancedBufferGeometry(), a = g0.userData.attrs; for (const k of ['position', 'normal', 'uv', 'aux', 'meta']) g.setAttribute(k, a[k]); g.setIndex(a.index); const ib = new T.InstancedInterleavedBuffer(new Float32Array(Math.max(1, max) * 8), 8, 1); ib.setUsage(T.DynamicDrawUsage); g.setAttribute('iPos', new T.InterleavedBufferAttribute(ib, 4, 0)); g.setAttribute('iRot', new T.InterleavedBufferAttribute(ib, 4, 4)); g.instanceCount = 0; g.userData.ib = ib; return g; };
    // instances per variant
    for (const i of F.inst) { const d = F.defs[i.sp]; i.v = d.vars[i.variant % d.vars.length]; (i.v.list = i.v.list || []).push(i); }
    for (const v of V) {
      const n = (v.list || []).length; v.count = n;
      v.mat = LR.material({ vertexShader: treeVS, fragmentShader: treeFS, defines: defsG, side: T.DoubleSide, uniforms: mkU(v) });
      v.smat = LR.material({ vertexShader: treeVS, fragmentShader: treeShadowFS, side: T.DoubleSide, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2.0, polygonOffsetUnits: 3, uniforms: Object.assign(LR.uni(FRAME()), leafU, { uTree: v.mat.uniforms.uTree, uLeafP: v.mat.uniforms.uLeafP }) });
      v.g = [geo(v.b[0], n), geo(v.b[1], n)]; v.gs = twin(v.g[1], n);
      v.mesh = v.g.map((g, l) => { const m = new T.Mesh(g, v.mat); m.frustumCulled = false; m.matrixAutoUpdate = false; m.visible = false; m.name = 'tree:' + v.def.name + v.k + ':' + l; W.scene.add(m); return m; });
      v.smesh = new T.Mesh(v.gs, v.smat); v.smesh.frustumCulled = false; v.smesh.matrixAutoUpdate = false; v.smesh.visible = false; v.scount = [0, 0, 0];
      v.smesh.onBeforeRender = (rr, sc, cam) => { const ci = LR.render.shadow.cams.indexOf(cam); v.gs.instanceCount = v.scount[ci < 0 ? 2 : LR.render.shadow.n === 3 ? ci : ci === 0 ? 0 : 2]; };
      W.shadowScene.add(v.smesh);
    }
    // the billboard atlas: each variant seen from the side, in leaf and bare
    const IC = 8, IRW = 2 * Math.ceil(V.length / IC), CP = 256, impRT = LR.rt(IC * CP, IRW * CP, { count: 2, depth: true, mips: true, min: T.LinearMipmapLinearFilter, filter: T.LinearFilter });
    for (const t of impRT.textures) t.anisotropy = 2;
    r.setRenderTarget(impRT); r.setClearColor(new T.Color(0.3, 0.33, 0.2), 0); r.clear(true, true, false); gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.82, 0.78, 0]));
    for (const t of impRT.textures) t.generateMipmaps = false;
    const bcam = new T.OrthographicCamera(-1, 1, 1, -1, 1, 200), bscene = new T.Scene();
    for (const v of V) for (let st = 0; st < 2; st++) {
      const own = { uTime: { value: 0 }, uFrame: { value: 0 }, uRes: U.uRes, uCamPos: { value: new T.Vector3(0, 0, 100) }, uNearFar: U.uNearFar, uViewProj: U.uViewProj, uInvViewProj: U.uInvViewProj, uPrevViewProj: U.uPrevViewProj, uView: U.uView, uProj: U.uProj, uInvProj: U.uInvProj,
        uWx: { value: new T.Vector4(0, 0, 0, st) }, uWx2: { value: new T.Vector4() }, uWind: { value: new T.Vector4(1, 0, 0, 0) }, uNoise: U.uNoise, uMatA: U.uMatA, uMatB: U.uMatB, uTopo: U.uTopo, uTopoRect: U.uTopoRect };
      const bm = LR.material({ vertexShader: treeVS, fragmentShader: treeFS, defines: Object.assign({ BAKE: 1 }, defsG), side: T.DoubleSide, uniforms: mkU(v, own) }); bm.uniforms.uTree.value = new T.Vector4(v.top, 0, 0, 0);
      const g = geo(v.b[0], 1), ia = g.userData.ib.array; ia.set([0, 0, 0, 1, 1, 0, 0.5, 1]); g.userData.ib.needsUpdate = true; g.instanceCount = 1;
      const m = new T.Mesh(g, bm); m.frustumCulled = false; bscene.add(m);
      bcam.left = -v.R; bcam.right = v.R; bcam.bottom = v.bottom; bcam.top = v.top; bcam.updateProjectionMatrix(); bcam.position.set(0, 0, 100); bcam.lookAt(0, 0, 0); bcam.updateMatrixWorld();
      const cx = (v.idx % IC) * CP, cy = (Math.floor(v.idx / IC) * 2 + st) * CP;
      impRT.viewport.set(cx + 2, cy + 2, CP - 4, CP - 4); impRT.scissor.set(cx, cy, CP, CP); impRT.scissorTest = true;
      const last = v.idx === V.length - 1 && st === 1; if (last) for (const t of impRT.textures) t.generateMipmaps = true;
      r.setRenderTarget(impRT); r.render(bscene, bcam); bscene.remove(m); g.dispose(); bm.dispose();
    }
    r.setRenderTarget(null); impRT.scissorTest = false; r.setClearColor(0x000000, 1);
    F.impRT = impRT;
    const dims = []; for (let i = 0; i < 16; i++) { const v = V[i]; dims.push(v ? new T.Vector4(v.R, v.top, v.def.evergreen ? 1 : 0, v.bottom) : new T.Vector4(1, 1, 0, 0)); }
    const impMat = LR.material({ vertexShader: impVS, fragmentShader: impFS, side: T.DoubleSide, uniforms: Object.assign(LR.uni(FRAME()), { uImpA: { value: impRT.textures[0] }, uImpB: { value: impRT.textures[1] }, uImpDim: { value: dims }, uImpGrid: { value: new T.Vector4(IC, IRW, 0, 0) } }) });
    const quad = () => { const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setIndex(new T.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1)); return g; };
    // near trees that have gone to billboards (changes every frame)
    const gi = quad(), ibI = new T.InstancedInterleavedBuffer(new Float32Array(Math.max(1, F.inst.length) * 8), 8, 1); ibI.setUsage(T.DynamicDrawUsage); gi.setAttribute('iPos', new T.InterleavedBufferAttribute(ibI, 4, 0)); gi.setAttribute('iRot', new T.InterleavedBufferAttribute(ibI, 4, 4)); gi.instanceCount = 0;
    F.impMesh = new T.Mesh(gi, impMat); F.impMesh.frustumCulled = false; F.impMesh.matrixAutoUpdate = false; F.impMesh.visible = false; W.scene.add(F.impMesh); F.impIB = ibI;
    // the far country (never changes)
    if (F.farInst.length) { const gf = quad(), a = new Float32Array(F.farInst.length * 8); let k = 0; for (const i of F.farInst) { const d = F.defs[i.sp], v = d.vars[i.variant % d.vars.length]; a.set([i.x, i.y, i.z, i.scale, v.idx, i.seed, 1, i.flip], k * 8); k++; }
      const ib = new T.InstancedInterleavedBuffer(a, 8, 1); gf.setAttribute('iPos', new T.InterleavedBufferAttribute(ib, 4, 0)); gf.setAttribute('iRot', new T.InterleavedBufferAttribute(ib, 4, 4)); gf.instanceCount = F.farInst.length;
      const m = new T.Mesh(gf, impMat); m.frustumCulled = false; m.matrixAutoUpdate = false; m.name = 'trees:far'; W.scene.add(m); F.farMesh = m; }
    // what the walker bumps into
    F.trunks = [];
    for (const i of F.inst) { const d = F.defs[i.sp]; i.rad = Math.max(i.v.R, i.v.top * 0.5) * i.scale; i.cy = i.y + i.v.top * 0.5 * i.scale; i.c = Math.cos(i.yaw); i.s = Math.sin(i.yaw);
      if (d.collide && i.v.trunkR > 0.05) { const tr = i.v.trunkR * i.scale * 0.85 + 0.1; W.solidCircle(i.x, i.z, tr, { tree: true }); F.trunks.push({ x: i.x, z: i.z, r: tr, crown: i.v.R * i.scale, sp: i.sp }); } }
    F.stats = { species: used.length, variants: V.length, planted: F.inst.length, far: F.farInst.length, buildMs: Math.round(performance.now() - t0), tris: V.map((v) => v.def.name + v.k + ' ' + v.tris.join('/')) };
    LR.on('frame', F.update, 30);
    return F;
  };

  // ── every frame: who is in view, and at which level ─────────────────────────────────────────────────────────────
  const fr = new T.Frustum(), pm = new T.Matrix4(), sph = new T.Sphere(), lastS = new T.Vector3(1e9, 0, 0); let sFrame = -99;
  F.update = (time, dt, cam) => {
    const V = F.variants, tier = LR.gpu.tier, near = tier.treeNear, mid = tier.treeMid, band0 = near * 0.22, band1 = 14;
    cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z, cnt = V.map(() => [0, 0]), ia = F.impIB.array; let ni = 0, full = 0, half = 0;
    const put = (v, l, i, fade) => { const a = v.g[l].userData.ib.array, o = cnt[v.idx][l]++ * 8; a[o] = i.x; a[o + 1] = i.y; a[o + 2] = i.z; a[o + 3] = i.scale; a[o + 4] = i.c; a[o + 5] = i.s; a[o + 6] = i.seed; a[o + 7] = fade; };
    for (const i of F.inst) {
      sph.center.set(i.x, i.cy, i.z); sph.radius = i.rad * 1.15; if (!fr.intersectsSphere(sph)) continue;
      const v = i.v, d = Math.hypot(i.x - cx, i.y + v.top * i.scale * 0.4 - cy, i.z - cz), k = (i.hero ? 2.4 : 1) * Math.sqrt(i.scale), n0 = near * k, m0 = Math.max(mid * (i.hero ? 1.5 : 1), n0 + band0 + 10);
      if (d < n0) { put(v, 0, i, 1); full++; }
      else if (d < n0 + band0) { const f = (d - n0) / band0; put(v, 0, i, Math.max(0.001, 1 - f)); put(v, 1, i, -Math.max(0.001, f)); full++; half++; }
      else if (d < m0) { put(v, 1, i, 1); half++; }
      else { const f = Math.min(1, (d - m0) / band1); if (f < 1) { put(v, 1, i, Math.max(0.001, 1 - f)); half++; }
        const o = ni++ * 8; ia[o] = i.x; ia[o + 1] = i.y; ia[o + 2] = i.z; ia[o + 3] = i.scale; ia[o + 4] = v.idx; ia[o + 5] = i.seed; ia[o + 6] = f < 1 ? -Math.max(0.001, f) : 1; ia[o + 7] = i.seed < 0.5 ? -1 : 1; }
    }
    for (const v of V) for (let l = 0; l < 2; l++) { const n = cnt[v.idx][l], g = v.g[l], ib = g.userData.ib; g.instanceCount = n; v.mesh[l].visible = n > 0; if (n) { ib.clearUpdateRanges(); ib.addUpdateRange(0, n * 8); ib.needsUpdate = true; } }
    F.impMesh.geometry.instanceCount = ni; F.impMesh.visible = ni > 0; if (ni) { F.impIB.clearUpdateRanges(); F.impIB.addUpdateRange(0, ni * 8); F.impIB.needsUpdate = true; }
    // shadow casters: the lighter tree, nearest first, so each cascade can stop early
    const sf = LR.render.frame;
    if (LR.RENDER || sf - sFrame > 20 || lastS.distanceToSquared(cam.position) > 9) {
      sFrame = sf; lastS.copy(cam.position); const SD = tier.shadowDist + 45, sp = LR.render.shadow.splits, nC = LR.render.shadow.n; let sc = 0;
      const lim = nC === 3 ? [sp[1] + 45, sp[2] + 45, SD] : [sp[1] + 45, SD, SD];
      for (const v of V) { const L = v.list || [], sel = []; for (const i of L) { const d = Math.hypot(i.x - cx, i.z - cz); if (d < SD) sel.push([d, i]); } sel.sort((a, b) => a[0] - b[0]);
        const a = v.gs.userData.ib.array; let c0 = 0, c1 = 0; sel.forEach(([d, i], k) => { a.set([i.x, i.y, i.z, i.scale, i.c, i.s, i.seed, 1], k * 8); if (d < lim[0]) c0 = k + 1; if (d < lim[1]) c1 = k + 1; });
        v.scount = [c0, c1, sel.length]; v.smesh.visible = sel.length > 0; v.gs.instanceCount = sel.length; if (sel.length) { const ib = v.gs.userData.ib; ib.clearUpdateRanges(); ib.addUpdateRange(0, sel.length * 8); ib.needsUpdate = true; } sc += sel.length; }
      F.stats.shadowCasters = sc;
    }
    F.stats.full = full; F.stats.mid = half; F.stats.billboards = ni;
  };
  F.info = () => F.stats;
}
