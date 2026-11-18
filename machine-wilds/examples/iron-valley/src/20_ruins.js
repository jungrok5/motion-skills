// 쇠울림 골짜기 · what people left.  A viaduct that carried a road over the valley (the machines' way goes through where
// one span is gone; the southern half can still be walked, out to the broken edge), a maintenance hall with a camp in it,
// a line of pylons on the north ridge, a yard of containers the carriers still call at.  Concrete, asphalt and plate are
// the engine's recipes with scans laid over them (90_main.js); moss, rain and grime come from the engine.
V.ruins = () => {
  const L = LR.land, W = LR.world, r = LR.rng('ruins'), TAU = Math.PI * 2;
  const rebar = (g, x, y, z, dir, n, len, spread) => { g.mat('iron', { tint: '#8a6a58' }); for (let i = 0; i < n; i++) { const a = [x + (r() - 0.5) * spread[0], y + (r() - 0.5) * spread[1], z + (r() - 0.5) * spread[2]], l = len * (0.4 + r() * 0.8), b = [a[0] + dir[0] * l * 0.5 + (r() - 0.5) * 0.3, a[1] + dir[1] * l * 0.5 - r() * 0.15, a[2] + dir[2] * l * 0.5 + (r() - 0.5) * 0.3], c = [b[0] + dir[0] * l * 0.5 + (r() - 0.5) * 0.5, b[1] + dir[1] * l * 0.5 - r() * 0.6, b[2] + dir[2] * l * 0.5 + (r() - 0.5) * 0.5]; g.tube([a, b, c], 0.022, { sides: 4 }); } };
  // ── the viaduct ──
  { const D = V.viaduct, g = new LR.Geo(), Y = D.y, w = 11, x = D.x;
    const pier = (z, broken) => { const y0 = Math.min(L.h(x - 3.2, z), L.h(x + 3.2, z)) - 1.2, top = Y - 1.7 - 1.5;
      g.mat('concrete', { seed: z & 255 }); for (const s of [-1, 1]) { g.box(x + s * 3.1, (y0 + top) / 2, z, 1.9, top - y0, 1.7, { soft: 0.12, ao: [0.55, 1] }); g.box(x + s * 3.1, L.h(x + s * 3.1, z) + 0.3, z, 2.9, 1.2, 2.7, { soft: 0.2, ao: [0.5, 0.9] }); W.solidBox(x + s * 3.1, z, 1.5, 1.4); }
      g.box(x, top + 0.75, z, w - 0.8, 1.5, 2.3, { soft: 0.1 }); g.box(x, (y0 + top) / 2 + 2, z, 4.6, 0.9, 1.0, { soft: 0.15 }); if (broken) rebar(g, x, top + 1.6, z + broken * 1.2, [0, 0.25, broken], 16, 1.6, [w - 2, 0.5, 0.2]); };
    const span = (z0, z1) => { const zc = (z0 + z1) / 2, len = z1 - z0;
      g.mat('concrete', { seed: (z0 + 300) & 255 }); g.box(x, Y - 0.25 - 0.75, zc, w, 1.5, len, { soft: 0.08, grain: 'z' }); for (const s of [-1, 1]) { g.box(x + s * (w / 2 - 0.18), Y + 0.45, zc, 0.36, 0.9, len, { soft: 0.15, grain: 'z' }); W.solidBox(x + s * (w / 2 - 0.1), zc, 0.3, len / 2); }
      for (let z = z0 + 3; z < z1; z += 6) for (const s of [-1, 1]) g.box(x + s * (w / 2 + 0.25), Y - 0.9, z, 0.5, 1.2, 0.5, { soft: 0.2 });
      g.mat('asphalt', { seed: (z0 + 90) & 255 }); g.box(x, Y - 0.02, zc, w - 0.72, 0.1, len, { skip: '-y', grain: 'z' });
      W.floors.push({ x, z: zc, hx: w / 2 - 0.4, hz: len / 2, yaw: 0, c: 1, s: 0, h: () => Y + 0.03 }); };
    D.piers.forEach((z, i) => { if (i > 0 && i < D.piers.length - 1) pier(z, z === D.gone[0] ? 1 : z === D.gone[1] ? -1 : 0); });
    for (let i = 0; i < D.piers.length - 1; i++) if (D.piers[i] !== D.gone[0]) span(D.piers[i] - (i === 0 ? 6 : 0), D.piers[i + 1] + (i === D.piers.length - 2 ? 6 : 0));
    // the broken edges: torn concrete, steel hanging out
    for (const [z, dir] of [[D.gone[0], 1], [D.gone[1], -1]]) { g.mat('concrete', { seed: 77 }); for (let i = 0; i < 7; i++) { const px = x - w / 2 + 0.8 + i * 1.55; g.at(px, Y - 0.8 - r() * 0.3, z + dir * (0.3 + r() * 0.8), r() * 0.5, dir * (0.25 + r() * 0.5), (r() - 0.5) * 0.5); g.box(0, 0, 0, 1.5 + r() * 0.5, 0.9 + r() * 0.6, 1.2 + r(), { soft: 0.25 }); g.pop(); }
      rebar(g, x, Y - 0.7, z + dir * 0.8, [0, -0.5, dir], 26, 2.4, [w - 1, 1.2, 0.3]); }
    // what fell: three slabs of the lost span, off the machines' way (it passes between the piers)
    for (const [dx, z, yaw, pitch, roll] of [[-9.5, 5, 0.2, 0.34, 0.08], [9.5, 33.5, -0.15, -0.3, -0.1], [13, -3, 0.9, 0.12, 0.22]]) { const y = L.h(x + dx, z) + 1.3; g.mat('concrete', { seed: 31 + (z | 0) }); g.at(x + dx, y, z, yaw, pitch, roll); g.box(0, 0, 0, 7.5, 1.5, 9.5, { soft: 0.1 }); g.mat('asphalt'); g.box(0, 0.8, 0, 6.8, 0.1, 9, { skip: '-y' }); rebar(g, 0, 0, 4.9, [0, 0, 1], 10, 1.4, [6.5, 1.2, 0.2]); g.pop(); W.solidBox(x + dx, z, 4.2, 5.2, yaw); }
    // a lamp standard still up on the south half, another bent over the edge
    g.mat('iron', { tint: '#7c8a86' }); g.tube([[x - 5.1, Y + 0.9, 84], [x - 5.1, Y + 7.5, 84], [x - 3.2, Y + 8.4, 84]], [0.11, 0.08, 0.06], { sides: 6 }); g.tube([[x + 5.1, Y + 0.9, 46], [x + 5.3, Y + 4.5, 45.4], [x + 6.6, Y + 5.4, 42.6], [x + 7.4, Y + 4.2, 40]], [0.11, 0.09, 0.07, 0.06], { sides: 6 });
    W.add(g, { name: 'viaduct', double: true });
    V.deck = { x, y: Y, z0: D.gone[1], z1: D.piers[5] + 6, w }; }
  // ── the hall: a concrete frame, its roof half down, a camp under what is left ──
  { const H = V.hall, g = new LR.Geo(), y = H.y, bx = 6, bz = 7, nx = 4, nz = 2, x0 = H.x - (nx * bx) / 2, z0 = H.z - (nz * bz) / 2, fh = 4.4, col = 0.55;
    g.aoFn = (lx, ly) => 0.55 + 0.45 * LR.sat((ly - y) / 1.4);
    g.mat('slab', { seed: 4 }); g.box(H.x, y + 0.08, H.z, nx * bx + 1.2, 0.3, nz * bz + 1.2, { soft: 0.05 });
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { const gone = (i === 3 && j === 0) || (i === 4 && j === 1); const hh = gone ? fh * (0.5 + r() * 0.3) : fh * 2; g.mat('concrete', { seed: i * 7 + j }); g.box(x0 + i * bx, y + hh / 2, z0 + j * bz, col, hh, col, { soft: 0.1 }); W.solidBox(x0 + i * bx, z0 + j * bz, col / 2 + 0.05, col / 2 + 0.05); if (gone) rebar(g, x0 + i * bx, y + hh, z0 + j * bz, [0.2, 1, 0.1], 6, 1.1, [0.4, 0.1, 0.4]); }
    // beams of both floors where their columns stand; the first floor's slab over the two western bays
    for (const lv of [1, 2]) { g.mat('concrete', { seed: 40 + lv }); for (let j = 0; j <= nz; j++) g.box(H.x - bx * (lv === 2 ? 0.5 : 0), y + fh * lv - 0.3, z0 + j * bz, nx * bx - (lv === 2 ? bx : 0), 0.6, 0.4, { soft: 0.1 }); for (let i = 0; i <= (lv === 2 ? 2 : nx); i++) g.box(x0 + i * bx, y + fh * lv - 0.3, H.z, 0.4, 0.6, nz * bz, { soft: 0.1 }); }
    g.mat('slab', { seed: 9 }); g.box(x0 + bx, y + fh + 0.1, H.z, bx * 2, 0.22, nz * bz, { soft: 0.05 }); g.box(x0 + bx * 0.75, y + fh * 2 + 0.1, H.z - bz * 0.5, bx * 1.5, 0.22, bz, { soft: 0.05 });
    // the roof slab that came down: one end still on its beam
    g.at(x0 + bx * 3.1, y + fh * 0.95, H.z + 1, 0.06, 0, -0.62); g.mat('slab', { seed: 12 }); g.box(0, 0, 0, bx * 1.9, 0.24, nz * bz * 0.8, { soft: 0.05 }); rebar(g, bx * 0.95, 0, 0, [1, 0.2, 0], 12, 1.3, [0.1, 0.2, nz * bz * 0.7]); g.pop(); W.solidBox(x0 + bx * 3.1, H.z + 1, 3.6, 5, 0.06);
    // infill walls with window holes on the north and west sides (concrete panels), what is left of them
    const panel = (px, pz, len, along, hgt, holes) => { g.mat('concrete', { seed: (px * 3 + pz) & 255, tint: '#d8d4cc' }); const ax = along === 'x'; let c = -len / 2; for (const [a, b] of [...holes, [len / 2, len / 2]]) { if (a > c) g.box(px + (ax ? (c + a) / 2 : 0), y + hgt / 2, pz + (ax ? 0 : (c + a) / 2), ax ? a - c : 0.22, hgt, ax ? 0.22 : a - c, { soft: 0.05 }); c = b; }
      for (const [a, b] of holes) { g.box(px + (ax ? (a + b) / 2 : 0), y + 0.5, pz + (ax ? 0 : (a + b) / 2), ax ? b - a : 0.22, 1.0, ax ? 0.22 : b - a, { soft: 0.05 }); if (hgt > 3) g.box(px + (ax ? (a + b) / 2 : 0), y + hgt - 0.5, pz + (ax ? 0 : (a + b) / 2), ax ? b - a : 0.22, 1.0, ax ? 0.22 : b - a, { soft: 0.05 }); }
      W.solidBox(px, pz, ax ? len / 2 : 0.15, ax ? 0.15 : len / 2); };
    for (let i = 0; i < nx; i++) if (i !== 2) panel(x0 + i * bx + bx / 2, z0, bx - col, 'x', i === 3 ? 2.2 : fh - 0.6, [[-1.4, 1.4]]);
    panel(x0, z0 + bz / 2, bz - col, 'z', fh - 0.6, [[-1.6, 1.6]]); panel(x0, z0 + bz * 1.5, bz - col, 'z', fh - 0.6, [[-1.8, 0.2]]);
    // roofing sheets: some still fixed over the western bays, some hanging, some on the floor
    g.mat('corrugated', { tint: '#b6a898' }); for (let i = 0; i < 9; i++) { const px = x0 + 0.6 + (i % 5) * 2.1, pz = z0 + 1 + Math.floor(i / 5) * 3.4; g.at(px, y + fh * 2 + 0.3, pz, (r() - 0.5) * 0.2, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08); g.box(0, 0, 0, 2.0, 0.03, 3.3, {}); g.pop(); }
    for (const [px, pz, yy, yaw, pitch, roll] of [[x0 + bx * 2.2, z0 - 0.4, y + fh * 1.5, 0.1, 1.35, 0.1], [x0 + bx * 3.4, z0 + bz * 1.8, y + 0.2, 0.7, 0.05, 0.12], [x0 + bx * 2.6, z0 + bz + 2, y + 0.25, -0.4, -0.08, 0.05], [x0 - 0.5, z0 + bz * 1.2, y + fh * 1.6, 1.5, 1.2, 0]]) { g.at(px, yy, pz, yaw, pitch, roll); g.box(0, 0, 0, 2.0, 0.03, 3.3, {}); g.pop(); }
    g.aoFn = null; W.add(g, { name: 'hall', double: true });
    // the camp: a fire under the slab that still holds — the one warm light in the valley
    const fx = x0 + bx * 1.1, fz = H.z + 1.2, fy = y + 0.25; V.camp = { x: fx, z: fz, y: fy };
    W.light({ x: fx, y: fy + 0.6, z: fz, r: 13, power: 6, color: [1, 0.48, 0.16], kind: 'fire', flicker: 0.3, day: 0.7 }); W.fires.push({ x: fx, y: fy + 0.35, z: fz, size: 0.55 }); W.sounds.push({ x: fx, y: fy, z: fz, kind: 'fire', r: 18, gain: 1 }); W.smokers.push({ x: fx, y: fy + 1, z: fz, amount: 0.5 }); W.solidCircle(fx, fz, 0.6);
    { const p = LR.props.g(fx, fz); p.mat('rock', { scale: 0.5 }); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; p.blob(fx + Math.cos(a) * 0.55, fy + 0.06, fz + Math.sin(a) * 0.55, 0.17, { seg: 6, rings: 4, seed: i }); } p.mat('rock', { flags: LR.FLAG.FIRE | LR.FLAG.NOWEATHER, weight: 0.5 }); p.blob(fx, fy + 0.04, fz, 0.32, { squash: [1, 0.3, 1], seg: 7, rings: 4 }); } }
  // ── pylons on the north ridge: two standing, the middle one down across the slope, lines sagging to the ground ──
  { const g = new LR.Geo(), tower = (x, z, yaw, lean) => { const y = L.h(x, z) - 0.6, Ht = 31, base = 3.6, top = 0.75, N = 9; g.at(x, y, z, yaw, lean[0], lean[1]);
      const w = (t) => LR.lerp(base, top, Math.pow(t, 0.8)), c = (t, sx, sz) => [sx * w(t), t * Ht, sz * w(t)]; g.mat('iron', { tint: '#8c8a84' });
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < N; i++) g.beam(c(i / N, sx, sz), c((i + 1) / N, sx, sz), 0.16, 0.16, { caps: false });
      for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N; for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) { g.beam(c(t0, a[0], a[1]), c(t1, b[0], b[1]), 0.07, 0.07, { caps: false }); g.beam(c(t0, b[0], b[1]), c(t1, a[0], a[1]), 0.07, 0.07, { caps: false }); g.beam(c(t1, a[0], a[1]), c(t1, b[0], b[1]), 0.07, 0.07, { caps: false }); } }
      const arms = []; for (const [t, len] of [[0.7, 7.5], [0.83, 6.2], [0.96, 4.6]]) for (const s of [-1, 1]) { const a = [s * w(t), t * Ht, 0], b = [s * len, t * Ht + 0.3, 0]; g.beam([a[0], a[1] + 0.6, -0.5], b, 0.09, 0.09, { caps: false }); g.beam([a[0], a[1] + 0.6, 0.5], b, 0.09, 0.09, { caps: false }); g.beam([a[0], a[1] - 0.5, 0], b, 0.09, 0.09, { caps: false }); g.mat('glass', { tint: '#6a7f78' }); g.cyl(b[0], b[1] - 1.5, 0, 0.09, 0.12, 1.4, { sides: 6 }); g.mat('iron', { tint: '#8c8a84' }); arms.push(new THREE.Vector3(b[0], b[1] - 1.5, 0).applyMatrix4(g.m)); }
      g.pop(); for (const [sx, sz] of [[-1, -1], [1, 1]]) W.solidCircle(x + sx * 1.8, z + sz * 1.8, 0.5); return arms; };
    const P = [[-150, -138, 0.1], [-52, -150, 0.05], [58, -142, -0.05]], A = P.map((p, i) => tower(p[0], p[1], p[2], i === 1 ? [1.38, 0.2] : [0.02 * (i - 1), 0.03]));
    // lines: from the standing towers they run down to the ground toward the fallen one, and on to the next ridge
    g.mat('iron', { tint: '#3c3c3c' }); const line = (a, b, sag) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; pts.push([x, Math.max(L.h(x, z) + 0.05, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t)), z]); } g.tube(pts, 0.03, { sides: 4 }); };
    for (const k of [0, 1, 2, 3, 4, 5]) { line(A[0][k], new THREE.Vector3(-100 + k * 2, L.h(-100, -146) + 0.1, -146 + k), 9); line(A[2][k], new THREE.Vector3(4 + k * 2, L.h(4, -148) + 0.1, -148 + k), 10); line(A[0][k], new THREE.Vector3(-262, L.h(-262, -120) + 24, -120 + k * 2), 12); line(A[2][k], new THREE.Vector3(170, L.h(170, -150) + 26, -150 + k * 2), 11); }
    W.add(g, { name: 'pylons', double: true }); }
  // ── the yard: containers the carriers still call at, a loading frame they stand under ──
  { const Yd = V.yard, g = new LR.Geo(), y = Yd.y, c0 = Math.cos(0.3), s0 = Math.sin(0.3), at = (lx, lz) => [Yd.x + lx * c0 + lz * s0, Yd.z - lx * s0 + lz * c0];
    const box = (lx, lz, yy, yaw, tint, open) => { const p = at(lx, lz); g.at(p[0], y + yy, p[1], 0.3 + yaw, 0, 0); g.mat('corrugated', { tint, seed: (lx * 5 + lz) & 255 }); g.box(0, 1.3, 0, 6.06, 2.6, 2.44, { skip: open ? '+x' : '', soft: 0.04, grain: 'y', ao: [0.6, 1] }); g.mat('rustplate', { tint: '#b0a79a' }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 2.98, 1.3, sz * 1.17, 0.16, 2.66, 0.16); g.box(0, 2.62, 0, 6.1, 0.08, 2.48); g.pop(); if (yy < 1) W.solidBox(p[0], p[1], 3.05, 1.24, 0.3 + yaw); };
    box(-7, -5, 0, 0, '#7f9aa6'); box(-7, -2.4, 0, 0.02, '#a8584a'); box(-6.6, -3.8, 2.62, 0.05, '#8d9a6a'); box(2, -6.5, 0, -0.04, '#a8a08c', true); box(9, -5.6, 0, 0.3, '#7f9aa6'); box(-9, 5.5, 0, 1.5, '#a8584a'); box(4, 7, 0, 0.1, '#6f7f8a'); box(4.3, 7.1, 2.62, 0.16, '#b89a5a');
    // the frame: a portal of plate girders with a beam trolley, long dead
    g.mat('rustplate', { tint: '#c8b9a0' }); for (const lx of [-3.5, 8.5]) for (const lz of [-1.2, 3.4]) { const p = at(lx, lz); g.box(p[0], y + 5.5, p[1], 0.5, 11, 0.5, { soft: 0.1, ao: [0.6, 1] }); W.solidBox(p[0], p[1], 0.35, 0.35); }
    for (const lz of [-1.2, 3.4]) { const a = at(-4.2, lz), b = at(9.2, lz); g.beam([a[0], y + 11, a[1]], [b[0], y + 11, b[1]], 0.5, 0.9); } { const a = at(2.5, -1.8), b = at(2.5, 4); g.beam([a[0], y + 11.7, a[1]], [b[0], y + 11.7, b[1]], 0.6, 0.5); const h = at(2.5, 1.1); g.mat('iron', { tint: '#5a5a5a' }); g.tube([[h[0], y + 11.4, h[1]], [h[0], y + 7.2, h[1]]], 0.03, { sides: 4 }); g.box(h[0], y + 7, h[1], 0.5, 0.5, 0.3, { soft: 0.3 }); }
    W.add(g, { name: 'yard', double: true }); }
};
