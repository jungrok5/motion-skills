// machine-wilds · 48_mech_kit_fit — fittings: the small things that make a mechanism of a shape.  A leg is a spar, a drum
// and a cylinder; what makes it read as a machine that was built, serviced and left out is everything bolted to those —
// hard lines and hoses with their ferrules, tie rods and valve blocks on the cylinders, rivet rows, inspection hatches,
// louvres, accumulators, junction boxes with their conduits, ladders and rails a person could use, cooling fins, gaiters.
// Every fitting is written in the frame of the bone it rides (inside k.bone), like any other part, and thins out with the
// level of detail: `fine` things are only on the near build, `mid` things on the near and middle ones.
//
//   k.along(p, dir, (g) => …, up)        a frame at p whose +Y runs along dir (and whose +Z is as near `up` as it can be)
//   k.pipe(pts, r, { role, flange, joints })      a hard line: flanges with bolts at its ends (and at `joints`: indices)
//   k.hose(pts, r, { clips })                     a rubber line with steel ferrules, clipped at the indices given
//   k.rivets(a, b, n, size, normal)               a row of heads from a to b
//   k.hatch(c, normal, w, h, { up, role })        a bolted cover with a handle and two hinges
//   k.grille(c, normal, w, h, { up, slats })      louvres in a frame
//   k.tank(a, b, r, { role, straps })             a pressure vessel with domed ends, straps and a valve
//   k.jbox(c, normal, w, h, d, { up, glands })    a junction box, glands along its lower edge
//   k.ladder(a, b, width, normal, { step })       rails, rungs, stand-offs
//   k.rail(pts, h, up)                            a handrail on stanchions
//   k.fins(c, dir, n, w, h, pitch, { up })        a stack of cooling fins
//   k.boot(p, dir, r, len, n)                     a rubber gaiter
//   k.stripes(c, normal, w, h, n, { up })         warning bars, yellow and black, what is left of them
//   k.digits('07', c, normal, h, { up, role })   a number stencilled on a plate, h tall, read from in front
//   k.gauge(c, normal, r)                         a dial
//   k.stack(a, b, r)                              an exhaust stack with a rain cap
//   k.dish(c, dir, r)                             an antenna dish on a stalk
{
  const M = LR.mech, T = THREE, V = M.v, TAU = Math.PI * 2, K = M.Kit.prototype;
  // k.digits('07', c, normal, h, { up, role, t })   stencilled figures h tall on a plate, read from in front of it (seven strokes a figure)
  K.digits = function (str, c, nrm, h, o = {}) { const k = this, t = o.t || h * 0.035, w = h * 0.5, gap = h * 0.24, s = h * 0.13, n = str.length, SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abfgcd', '-': 'g' };
    return k.along(c, nrm, (g) => { k.mat(o.role || 'dark'); for (let i = 0; i < n; i++) { const x0 = -(i - (n - 1) / 2) * (w + gap), on = SEG[str[i]] || '';      /* (the frame's +X is the reader's left) */
        const H = (z) => g.box(x0, t * 0.5, z, w - s * 0.7, t, s, { soft: 0.1 }), U = (x, z) => g.box(x0 - x, t * 0.5, z, s, t, h * 0.5 - s * 0.7, { soft: 0.1 });
        if (on.includes('a')) H(h * 0.5 - s * 0.5); if (on.includes('g')) H(0); if (on.includes('d')) H(-h * 0.5 + s * 0.5);
        if (on.includes('f')) U(-w * 0.5 + s * 0.5, h * 0.25); if (on.includes('b')) U(w * 0.5 - s * 0.5, h * 0.25); if (on.includes('e')) U(-w * 0.5 + s * 0.5, -h * 0.25); if (on.includes('c')) U(w * 0.5 - s * 0.5, -h * 0.25); } }, o.up || [0, 1, 0]); };
  K.along = function (p, dir, fn, up) { const y = V.norm(dir); let z = up ? V.sub(up, V.mul(y, V.dot(up, y))) : null; if (!z || V.len(z) < 0.2) { const a = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; z = V.sub(a, V.mul(y, V.dot(a, y))); } z = V.norm(z); const x = V.cross(y, z);
    this.g.push(new T.Matrix4().set(x[0], y[0], z[0], p[0], x[1], y[1], z[1], p[1], x[2], y[2], z[2], p[2], 0, 0, 0, 1)); fn(this.g, this); this.g.pop(); return this; };
  const dirAt = (pts, i) => V.norm(V.sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
  K.pipe = function (pts, r, o = {}) { if (this.lod === 2 && !o.far) return this; const k = this, g = this.g; k.mat(o.role || 'steel'); g.tube(pts, r, { sides: k.n(o.sides || 8), caps: true });
    if (k.mid && o.flange !== false) { const at = [0, pts.length - 1, ...(o.joints || [])]; for (const i of at) { const d = dirAt(pts, i), e = i === 0 ? 1 : i === pts.length - 1 ? -1 : 0, c = V.mad(pts[i], d, e * r * 0.6); k.mat('joint'); g.tube([V.mad(c, d, -r * 0.3), V.mad(c, d, r * 0.3)], r * 1.75, { sides: k.n(10), caps: true });
        if (k.fine) k.along(V.mad(c, d, r * 0.3), d, () => k.bolts('y', [0, 0, 0], r * 1.36, 6, r * 0.2, { h: r * 0.3 })); } }
    return this; };
  K.hose = function (pts, r, o = {}) { if (!this.mid) return this; const k = this, g = this.g; k.mat('rubber'); g.tube(pts, r, { sides: k.fine ? 7 : 5 });
    if (k.fine) { k.mat('steel'); for (const i of [0, pts.length - 1]) { const d = dirAt(pts, i), s = i ? -1 : 1; g.tube([pts[i], V.mad(pts[i], d, s * r * 3.2)], r * 1.4, { sides: 6, caps: true }); g.tube([V.mad(pts[i], d, s * r * 3.2), V.mad(pts[i], d, s * r * 4.4)], r * 1.15, { sides: 6 }); }
      for (const i of o.clips || []) { const d = dirAt(pts, i); g.tube([V.mad(pts[i], d, -r * 0.7), V.mad(pts[i], d, r * 0.7)], r * 1.5, { sides: 6, caps: true }); } }
    return this; };
  K.rivets = function (a, b, n, size, nrm, o = {}) { if (!this.fine) return this; const g = this.g; this.mat(o.role || 'steel'); const d = V.norm(nrm); for (let i = 0; i < n; i++) { const p = V.lerp(a, b, (i + 0.5) / n); g.tube([V.mad(p, d, -size * 0.2), V.mad(p, d, size * 0.55)], [size, size * 0.72], { sides: 5, caps: true }); } return this; };
  K.hatch = function (c, nrm, w, h, o = {}) { if (this.lod === 2) return this; const k = this, t = o.t || Math.min(w, h) * 0.07;
    return k.along(c, nrm, (g) => { k.mat(o.role || 'frame'); g.box(0, t * 0.5, 0, w, t, h, { soft: 0.2 }); if (!k.fine) return;
      k.mat('steel'); const nx = Math.max(2, Math.round(w / (t * 5))), nz = Math.max(2, Math.round(h / (t * 5))); for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) g.tube([[(i / nx - 0.5) * w * 0.88, t, sz * h * 0.44], [(i / nx - 0.5) * w * 0.88, t * 1.5, sz * h * 0.44]], t * 0.36, { sides: 5, caps: true });
      for (let j = 1; j < nz; j++) for (const sx of [-1, 1]) g.tube([[sx * w * 0.44, t, (j / nz - 0.5) * h * 0.88], [sx * w * 0.44, t * 1.5, (j / nz - 0.5) * h * 0.88]], t * 0.36, { sides: 5, caps: true });
      g.tube([[-w * 0.16, t, 0], [-w * 0.16, t * 2.6, 0], [w * 0.16, t * 2.6, 0], [w * 0.16, t, 0]], t * 0.3, { sides: 5 });                          // the handle
      k.mat('joint'); for (const sx of [-1, 1]) g.tube([[sx * w * 0.3 - w * 0.08, t * 0.9, h * 0.52], [sx * w * 0.3 + w * 0.08, t * 0.9, h * 0.52]], t * 0.55, { sides: 6, caps: true }); }, o.up); };
  K.grille = function (c, nrm, w, h, o = {}) { if (this.lod === 2) return this; const k = this, t = o.t || Math.min(w, h) * 0.12, n = k.fine ? o.slats || Math.max(4, Math.round(h / (t * 0.9))) : 3;
    return k.along(c, nrm, (g) => { k.mat('dark'); g.box(0, t * 0.2, 0, w, t * 0.4, h, { soft: 0.1 }); k.mat(o.role || 'frame'); for (const s of [-1, 1]) { g.box(s * w * 0.5, t * 0.5, 0, t * 0.5, t, h + t * 0.5, { soft: 0.2 }); g.box(0, t * 0.5, s * h * 0.5, w + t * 0.5, t, t * 0.5, { soft: 0.2 }); }
      for (let i = 0; i < n; i++) { g.push(new T.Matrix4().makeTranslation(0, t * 0.62, ((i + 0.5) / n - 0.5) * h * 0.94).multiply(new T.Matrix4().makeRotationX(0.6))); g.box(0, 0, 0, w * 0.96, t * 0.12, (h / n) * 0.8, {}); g.pop(); } }, o.up); };
  K.tank = function (a, b, r, o = {}) { const k = this, L = V.len(V.sub(b, a)), e = Math.min(r * 0.8, L * 0.3);
    return k.along(a, V.sub(b, a), (g) => { k.mat(o.role || 'frame'); g.lathe(0, 0, [[r * 0.06, 0], [r * 0.6, e * 0.16], [r * 0.92, e * 0.52], [r, e], [r, L - e], [r * 0.92, L - e * 0.52], [r * 0.6, L - e * 0.16], [r * 0.06, L]], { sides: k.n(o.sides || 14) });
      if (k.mid) { k.mat('joint'); const ns = o.straps === undefined ? 2 : o.straps; for (let i = 0; i < ns; i++) { const y = e + ((L - 2 * e) * (i + 0.5)) / ns; g.lathe(0, 0, [[r * 1.035, y - r * 0.11], [r * 1.06, y], [r * 1.035, y + r * 0.11]], { sides: k.n(14) }); }
        k.mat('steel'); g.tube([[0, L - e * 0.1, 0], [0, L + r * 0.3, 0]], r * 0.16, { sides: 6, caps: true }); g.tube([[0, L + r * 0.18, 0], [r * 0.5, L + r * 0.18, 0]], r * 0.09, { sides: 5, caps: true }); }
      if (k.fine && o.gauge !== false) k.gauge([0, L * 0.5, r * 1.0], [0, 0, 1], r * 0.26); }, o.up); };
  K.gauge = function (c, nrm, r) { if (!this.fine) return this; const k = this; return k.along(c, nrm, (g) => { k.mat('steel'); g.tube([[0, 0, 0], [0, r * 0.5, 0]], r, { sides: 10, caps: true }); g.mat('ceramic', { tint: '#d9d6cc' }); g.tube([[0, r * 0.5, 0], [0, r * 0.56, 0]], r * 0.8, { sides: 10, caps: true }); k.mat('dark'); g.box(r * 0.2, r * 0.58, r * 0.2, r * 0.5, r * 0.03, r * 0.07, {}); }); };
  K.jbox = function (c, nrm, w, h, d, o = {}) { if (this.lod === 2) return this; const k = this;
    return k.along(c, nrm, (g) => { k.mat(o.role || 'dark'); g.box(0, d * 0.5, 0, w, d, h, { soft: 0.15 }); k.mat('frame'); g.box(0, d, 0, w * 1.07, d * 0.14, h * 1.07, { soft: 0.2 });
      if (k.fine) { k.mat('steel'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.tube([[sx * w * 0.42, d * 1.05, sz * h * 0.42], [sx * w * 0.42, d * 1.18, sz * h * 0.42]], Math.min(w, h) * 0.05, { sides: 5, caps: true });
        const n = o.glands === undefined ? 2 : o.glands; for (let i = 0; i < n; i++) { const x = ((i + 0.5) / n - 0.5) * w * 0.7; g.tube([[x, d * 0.5, -h * 0.5], [x, d * 0.5, -h * 0.5 - d * 0.5]], d * 0.2, { sides: 6, caps: true }); } } }, o.up); };
  K.ladder = function (a, b, w, nrm, o = {}) { if (this.lod === 2) return this; const k = this, g = this.g, d = V.sub(b, a), L = V.len(d), y = V.norm(d), n3 = V.norm(nrm), side = V.norm(V.cross(y, n3)), r = o.r || w * 0.06, off = o.off === undefined ? w * 0.35 : o.off;
    k.mat(o.role || 'frame'); const P = (t, s) => V.mad(V.mad(V.mad(a, y, t), side, s * w * 0.5), n3, off); for (const s of [-1, 1]) g.tube([P(0, s), P(L, s)], r, { sides: 5, caps: true });
    const step = (o.step || w * 0.75) * (k.fine ? 1 : 3); for (let t = step * 0.5; t < L; t += step) g.tube([P(t, -1), P(t, 1)], r * 0.8, { sides: 4 });
    for (let t = L * 0.08; t <= L; t += Math.max(L * 0.42, w * 3)) for (const s of [-1, 1]) g.tube([P(t, s), V.mad(P(t, s), n3, -off)], r * 0.8, { sides: 4 }); return this; };
  K.rail = function (pts, h, up, o = {}) { if (this.lod === 2) return this; const k = this, g = this.g, u = V.norm(up || [0, 1, 0]), r = o.r || h * 0.035; k.mat(o.role || 'frame'); g.tube(pts.map((p) => V.mad(p, u, h)), r, { sides: 5, caps: true }); if (k.fine) g.tube(pts.map((p) => V.mad(p, u, h * 0.5)), r * 0.75, { sides: 4 });
    for (const p of pts) g.tube([p, V.mad(p, u, h)], r, { sides: 5 }); return this; };
  K.fins = function (c, dir, n, w, h, pitch, o = {}) { if (this.lod === 2) return this; const k = this, m = k.fine ? n : Math.ceil(n / 3), pt = (pitch * n) / m;
    return k.along(c, dir, (g) => { k.mat(o.role || 'steel'); for (let i = 0; i < m; i++) g.box(0, (i + 0.5) * pt, 0, w, pt * (k.fine ? 0.34 : 0.5), h, {}); k.mat('dark'); g.box(0, pitch * n * 0.5, 0, w * 0.6, pitch * n, h * 0.6, {}); }, o.up); };
  K.boot = function (p, dir, r, len, n = 5) { if (this.lod === 2) return this; const k = this;
    return k.along(p, dir, (g) => { k.mat('rubber'); if (!k.fine) { g.tube([[0, 0, 0], [0, len, 0]], r * 1.2, { sides: 6 }); return; } const prof = []; for (let i = 0; i <= n; i++) { prof.push([r * 1.02, (i / n) * len]); if (i < n) prof.push([r * 1.38, ((i + 0.5) / n) * len]); } g.lathe(0, 0, prof, { sides: 10 }); }); };
  K.stripes = function (c, nrm, w, h, n, o = {}) { if (this.lod === 2) return this; const k = this, t = o.t || h * 0.04;
    return k.along(c, nrm, (g) => { for (let i = 0; i < n; i++) { g.mat('paintmetal', { tint: i % 2 ? '#24262a' : '#b89a2e', seed: 40 + i }); g.box(((i + 0.5) / n - 0.5) * w, t * 0.5, 0, (w / n) * 1.0, t, h, {}); } }, o.up); };
  K.stack = function (a, b, r, o = {}) { const k = this, g = this.g, d = V.norm(V.sub(b, a)); k.mat(o.role || 'rust'); g.tube([a, b], r, { sides: k.n(10), caps: true }); if (k.mid) { k.mat('joint'); g.tube([V.mad(a, d, r * 0.4), V.mad(a, d, r * 0.9)], r * 1.3, { sides: k.n(10), caps: true }); g.tube([V.mad(b, d, -r * 0.5), b], r * 1.14, { sides: k.n(10) });
      k.mat('dark'); k.along(V.mad(b, d, r * 0.5), d, () => { g.lathe(0, 0, [[r * 1.5, 0], [r * 0.2, r * 0.7]], { sides: k.n(10) }); for (let i = 0; i < 3; i++) { const an = (i / 3) * TAU; g.tube([[Math.cos(an) * r * 0.9, -r * 0.5, Math.sin(an) * r * 0.9], [Math.cos(an) * r * 1.1, r * 0.1, Math.sin(an) * r * 1.1]], r * 0.07, { sides: 4 }); } }); } return this; };
  K.dish = function (c, dir, r, o = {}) { if (this.lod === 2) return this; const k = this; return k.along(c, dir, (g) => { k.mat('frame'); g.tube([[0, 0, 0], [0, r * 0.9, 0]], r * 0.09, { sides: 6 }); g.mat('ceramic', { tint: '#cfd0cb' }); g.lathe(0, 0, [[r * 0.1, r * 0.9], [r * 0.6, r * 1.0], [r * 0.9, r * 1.22], [r, r * 1.45]], { sides: k.n(14) }); k.mat('dark'); g.tube([[0, r * 0.95, 0], [0, r * 1.7, 0]], r * 0.05, { sides: 4 }); g.blob(0, r * 1.7, 0, r * 0.12, { amp: 0, seg: 6, rings: 4 }); }, o.up); };

  // ── what the stock legs carry ───────────────────────────────────────────────────────────────────────────────────
  // a pin's ends: a lock plate bolted across each, a grease nipple in its middle
  K.fitPin = function (l, y, z) { if (!this.fine) return this; const k = this, g = this.g, w = l.width, d = l.drum; for (const sx of [-1, 1]) { k.mat('frame'); g.box(sx * w * 0.735, y, z, w * 0.025, d * 0.14, d * 0.56, { soft: 0.2 }); k.mat('steel'); g.tube([[sx * w * 0.72, y, z], [sx * w * 0.8, y, z]], d * 0.045, { sides: 6, caps: true }); g.tube([[sx * w * 0.8, y, z], [sx * w * 0.83, y, z]], d * 0.028, { sides: 5, caps: true }); for (const sz of [-1, 1]) g.tube([[sx * w * 0.74, y, z + sz * d * 0.23], [sx * w * 0.775, y, z + sz * d * 0.23]], d * 0.03, { sides: 5, caps: true }); } return this; };
  // a segment: conduit and a junction box on the spar's side; on a girder, lacing between the flanges, rivet rows and what
  // is left of its warning bars; on a shell, an inspection hatch and louvres in the front cover, fasteners along it
  K.fitSegment = function (l, i, q) { const k = this, g = this.g, w = l.width, d = l.drum, { L, t0, t1, sd, sw, style, last, taper } = q; if (k.lod === 2) return this;
    const sideX = (style === 'shell' ? sw * 0.5 : w * 0.33) + d * 0.02;
    // a conduit down one side with a box half way, a sensor at the hinge end
    k.pipe([[sideX + d * 0.05, t0 + L * 0.06, d * 0.12], [sideX + d * 0.05, t1 - L * 0.03, d * 0.1]], d * 0.032, { flange: false, sides: 6 });
    k.jbox([sideX, L * 0.46, d * 0.08], [1, 0, 0], d * 0.34, d * 0.5, d * 0.16, { up: [0, 1, 0], glands: 2 });
    if (k.fine) { k.mat('steel'); for (const y of [t0 + L * 0.16, L * 0.3, L * 0.62, t1 - L * 0.12]) g.box(sideX + d * 0.03, y, d * 0.11, d * 0.05, d * 0.05, d * 0.12, {}); k.mat('dark'); g.box(-sideX - d * 0.04, t0 + d * 0.3, 0, d * 0.1, d * 0.3, d * 0.22, { soft: 0.3 }); k.hose([[-sideX - d * 0.06, t0 + d * 0.45, 0], [-sideX - d * 0.14, t0 + d * 0.9, -d * 0.1], [-sideX - d * 0.05, t0 + d * 1.5, -d * 0.2]], d * 0.022); }
    if (style === 'girder') { const zf = (sd * 0.5 * (1 + taper)) / 2;
      // lattice lacing on both open sides
      k.mat('frame'); const nl = Math.max(2, Math.round((t1 - t0) / (d * 1.5))), st = (t1 - t0) / nl; for (const sx of [-1, 1]) for (let j = 0; j < nl; j++) { const y0 = t0 + j * st, f = j % 2 ? 1 : -1; g.beam([sx * w * 0.3, y0 + st * 0.08, -f * zf * 0.9], [sx * w * 0.3, y0 + st * 0.92, f * zf * 0.9], d * 0.05, d * 0.09, { caps: false }); }
      const nr = Math.max(6, Math.round((t1 - t0) / (d * 0.3))); for (const sz of [-1, 1]) for (const sx of [-1, 1]) k.rivets([sx * w * 0.28, t0 + d * 0.1, sz * (zf + d * 0.036)], [sx * w * 0.28, t1 - d * 0.1, sz * (zf + d * 0.036)], nr, d * 0.02, [0, 0, sz]);
      if (last) k.stripes([0, t1 - d * 0.75, zf + d * 0.04], [0, 0, 1], w * 0.62, d * 0.55, 5, { up: [0, 1, 0] });
      else if (k.fine) { k.mat('frame'); g.box(0, L * 0.5, zf + d * 0.05, w * 0.4, d * 0.34, d * 0.025, { soft: 0.2 }); k.rivets([-w * 0.16, L * 0.5 + d * 0.13, zf + d * 0.065], [w * 0.16, L * 0.5 + d * 0.13, zf + d * 0.065], 3, d * 0.014, [0, 0, 1]); k.rivets([-w * 0.16, L * 0.5 - d * 0.13, zf + d * 0.065], [w * 0.16, L * 0.5 - d * 0.13, zf + d * 0.065], 3, d * 0.014, [0, 0, 1]); } }      // a maker's plate
    else { const bulge = 0.5 + 0.12 * (1 - i / l.n), zc = d * 0.1 + d * bulge * 0.955, a = t0 + L * 0.06, b = t1 - L * 0.05;
      k.hatch([0, a + (b - a) * 0.3, zc], [0, 0, 1], w * 0.5, Math.min(L * 0.16, w * 0.9), { up: [0, 1, 0], role: 'joint' });
      k.grille([0, a + (b - a) * 0.62, zc * 0.985], [0, 0, 1], w * 0.42, Math.min(L * 0.1, w * 0.5), { up: [0, 1, 0], role: 'dark' });
      if (k.fine) { for (const sx of [-1, 1]) k.rivets([sx * w * 0.36, a + L * 0.12, zc * 0.86], [sx * w * 0.36 * (last ? 0.84 : 0.94), b - L * 0.14, zc * 0.86 * (last ? 0.8 : 0.94)], Math.max(5, Math.round(L / (d * 0.5))), d * 0.016, [sx * 0.5, 0, 0.86]);
        k.mat(k.pal.accent ? 'accent' : 'frame'); g.box(0, b - L * 0.2, -(d * 0.1 + d * bulge * 0.93 * (last ? 0.78 : 0.9)), w * 0.44, L * 0.035, d * 0.02, {}); }
      if (last) k.stripes([0, t1 - d * 0.4, d * 0.1 + d * 0.3], [0, 0, 1], w * 0.5, d * 0.3, 5, { up: [0, 1, 0] }); }
    return this; };
  // a cylinder: tie rods between its end caps, a valve block with a hard line to each port and a hose away, a wiper boot at the gland
  K.fitCylinder = function (l, an, style) { const k = this, g = this.g, r = an.r, top = r * 1.1 + an.Bl; if (k.lod === 2) return this;
    k.mat('steel'); for (let i = 0; i < 4; i++) { const a = TAU * (i / 4 + 0.125), x = Math.cos(a) * r * 1.07, z = Math.sin(a) * r * 1.07; g.tube([[x, r * 1.3, z], [x, top + r * 0.2, z]], r * 0.075, { sides: 5 }); if (k.fine) for (const y of [r * 1.25, top + r * 0.22]) g.tube([[x, y - r * 0.07, z], [x, y + r * 0.07, z]], r * 0.13, { sides: 6, caps: true }); }
    k.mat('joint'); g.box(0, r * 2.3, r * 1.2, r * 0.95, r * 1.2, r * 0.6, { soft: 0.25 });
    if (k.fine) { k.mat('steel'); g.tube([[0, r * 2.9, r * 1.32], [0, top - r * 0.9, r * 1.3], [0, top - r * 0.25, r * 1.12]], r * 0.085, { sides: 5 }); g.tube([[r * 0.3, r * 1.75, r * 1.3], [r * 0.3, r * 1.45, r * 1.1]], r * 0.085, { sides: 5 });
      for (const sx of [-1, 1]) g.tube([[sx * r * 0.28, r * 2.3, r * 1.5], [sx * r * 0.28, r * 2.3, r * 1.68]], r * 0.13, { sides: 6, caps: true });
      k.hose([[-r * 0.28, r * 2.3, r * 1.62], [-r * 0.5, r * 1.6, r * 2.3], [-r * 0.4, r * 0.4, r * 2.0]], r * 0.11); k.hose([[r * 0.28, r * 2.3, r * 1.62], [r * 0.62, r * 1.5, r * 2.2], [r * 0.5, r * 0.3, r * 1.8]], r * 0.095);
      k.gauge([r * 0.5, r * 2.5, r * 1.2], [1, 0, 0], r * 0.2); }
    k.boot([0, top + r * 0.12, 0], [0, 1, 0], r * 0.56, r * 0.7, 3); return this; };
  // a foot: a gaiter round the ball; a toe: grousers under it, a wear plate on top
  K.fitFoot = function (l) { if (this.lod === 2) return this; const k = this, g = this.g, b = l.ball; k.mat('rubber'); g.lathe(0, 0, [[b * 0.7, b * 0.12], [b * 0.9, -b * 0.02], [b * 0.74, -b * 0.14], [b * 0.92, -b * 0.26]], { sides: k.n(14) }); if (k.fine) { k.mat('steel'); k.bolts('y', [0, -b * 0.42, 0], b * 0.98, 10, b * 0.04, { dir: 1, h: b * 0.06 }); } return this; };
  K.fitToe = function (l, LL, style) { if (this.lod === 2) return this; const k = this, g = this.g, b = l.ball; k.mat('steel'); for (const f of [0.34, 0.56, 0.78]) g.box(0, LL * f, -b * 0.4, b * (0.56 - f * 0.2), b * 0.07, b * 0.1, {});
    if (k.fine) { k.mat('joint'); g.box(0, LL * 0.3, b * 0.31, b * 0.4, LL * 0.22, b * 0.04, { soft: 0.2 }); k.rivets([-b * 0.14, LL * 0.22, b * 0.34], [-b * 0.14, LL * 0.38, b * 0.34], 2, b * 0.03, [0, 0, 1]); k.rivets([b * 0.14, LL * 0.22, b * 0.34], [b * 0.14, LL * 0.38, b * 0.34], 2, b * 0.03, [0, 0, 1]); } return this; };
  // a hip: lifting eyes and a slew sensor on the bearing
  K.fitHip = function (l) { if (!this.fine) return this; const k = this, g = this.g, w = l.width, d = l.drum; k.mat('dark'); const zz = l.kind === 'insect' ? d * 0.6 : w * 1.0; g.box(d * 0.5, 0, zz * 0.6, d * 0.2, d * 0.24, d * 0.3, { soft: 0.3 }); k.hose([[d * 0.56, 0.02 * d, zz * 0.6], [d * 0.8, d * 0.3, zz * 0.3], [d * 0.62, d * 0.62, 0]], d * 0.025); return this; };
  // a neck link: bolts on its drum, cable clips, a small box
  K.fitNeck = function (L, w2) { if (!this.fine) return this; const k = this, g = this.g; k.mat('steel'); for (const sx of [-1, 1]) k.bolts('x', [sx * w2 * 0.5, 0, 0], w2 * 0.22, 8, w2 * 0.022, { dir: sx }); for (const y of [L * 0.2, L * 0.5, L * 0.8]) g.box(w2 * 0.21, y, -w2 * 0.39, w2 * 0.1, w2 * 0.05, w2 * 0.08, {});
    k.jbox([-w2 * 0.44, L * 0.5, w2 * 0.22], [-1, 0, 0], w2 * 0.2, w2 * 0.32, w2 * 0.09, { up: [0, 1, 0], glands: 1 }); k.hose([[-w2 * 0.22, 0, -w2 * 0.36], [-w2 * 0.25, L * 0.5, -w2 * 0.4], [-w2 * 0.22, L, -w2 * 0.36]], w2 * 0.028, { clips: [1] }); return this; };
}
