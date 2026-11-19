// machine-wilds · 30_geo — LR.Geo, a geometry writer for built things (walls, beams, roofs, props), and LR.world,
// the registry everything in a realm is added to: meshes, solids to walk into, lights, smoke points, floors.
// Units are metres.  Texture coordinates are laid in metres too (1 / the material's tile), so a stone is the same
// size on every wall.  Vertex: position f32x3 · normal i8x4 · uv f32x2 · colour u8x4 (tint rgb, ao) · meta u8x4 (layer, flags, seed, weight)
{
  const T = THREE;
  const FLAG = (LR.FLAG = { WINDOW: 1, NOWEATHER: 2, SWAY: 4, GLOW: 8, FOLIAGE: 16, FIRE: 32 });
  class Geo {
    constructor(cap = 4096) { this.n = 0; this.ni = 0; this._alloc(cap, cap * 2); this.stack = []; this.m = new T.Matrix4(); this.nm = new T.Matrix3(); this.layer = 0; this.tile = 2; this.tint = [128, 128, 128]; this.flags = 0; this.seed = 0; this.weight = 0; this.aoV = 1; this.aoFn = null; this.uo = 0; this.vo = 0; this.soft = 0; this.flip = false; this.min = [1e9, 1e9, 1e9]; this.max = [-1e9, -1e9, -1e9]; }
    _alloc(nv, ni) { const g = (C, n, old) => { const a = new C(n); if (old) a.set(old); return a; }; this.P = g(Float32Array, nv * 3, this.P); this.N = g(Int8Array, nv * 4, this.N); this.UV = g(Float32Array, nv * 2, this.UV); this.C = g(Uint8Array, nv * 4, this.C); this.M = g(Uint8Array, nv * 4, this.M); this.I = g(Uint32Array, ni, this.I); this.cv = nv; this.ci = ni; }
    _need(nv, ni) { if (this.n + nv > this.cv || this.ni + ni > this.ci) this._alloc(Math.max(this.cv * 2, this.n + nv + 1024), Math.max(this.ci * 2, this.ni + ni + 2048)); }
    // ── state ──
    // mat('plaster', { tint: '#e8dcc0' | [r,g,b] 0..1 where .5 is neutral ×1, flags, seed, weight, ao, soft })
    mat(name, o = {}) {
      this.layer = LR.mat.L(name); this.tile = LR.mat.tile(name) * (o.scale || 1);
      let t = o.tint; if (typeof t === 'string') { const n = parseInt(t.slice(1), 16); t = [(n >> 16 & 255) / 255 * 0.5, (n >> 8 & 255) / 255 * 0.5, (n & 255) / 255 * 0.5]; }
      this.tint = t ? [Math.round(LR.sat(t[0]) * 255), Math.round(LR.sat(t[1]) * 255), Math.round(LR.sat(t[2]) * 255)] : [128, 128, 128];
      this.flags = o.flags || 0; this.seed = o.seed !== undefined ? o.seed & 255 : this.seed; this.weight = Math.round(LR.sat(o.weight || 0) * 255); this.soft = o.soft || 0;
      this.aoV = o.ao !== undefined ? o.ao : 1; if (o.uv !== false) { this.uo = (o.uo !== undefined ? o.uo : (this.uo * 7.31 + 0.37) % 1); this.vo = (o.vo !== undefined ? o.vo : (this.vo * 5.17 + 0.61) % 1); }
      return this;
    }
    push(m) { this.stack.push(this.m.clone()); if (m) this.m.multiply(m); this.nm.setFromMatrix4(this.m); return this; }
    pop() { this.m.copy(this.stack.pop()); this.nm.setFromMatrix4(this.m); return this; }
    at(x, y, z, yaw = 0, pitch = 0, roll = 0) { const m = new T.Matrix4().makeRotationFromEuler(new T.Euler(pitch, yaw, roll, 'YXZ')); m.setPosition(x, y, z); return this.push(m); }
    // ── raw ──
    vert(x, y, z, nx, ny, nz, u, v, ao) {
      this._need(1, 0); const i = this.n++, e = this.m.elements, k = this.nm.elements;
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (this.aoFn) ao = (ao === undefined ? 1 : ao) * this.aoFn(x, y, z, wx, wy, wz);
      let ax = k[0] * nx + k[3] * ny + k[6] * nz, ay = k[1] * nx + k[4] * ny + k[7] * nz, az = k[2] * nx + k[5] * ny + k[8] * nz; const l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
      if (this.flip) { ax = -ax; ay = -ay; az = -az; }
      this.P[i * 3] = wx; this.P[i * 3 + 1] = wy; this.P[i * 3 + 2] = wz;
      this.N[i * 4] = Math.round(ax * 127); this.N[i * 4 + 1] = Math.round(ay * 127); this.N[i * 4 + 2] = Math.round(az * 127);
      this.UV[i * 2] = u; this.UV[i * 2 + 1] = v;
      this.C[i * 4] = this.tint[0]; this.C[i * 4 + 1] = this.tint[1]; this.C[i * 4 + 2] = this.tint[2]; this.C[i * 4 + 3] = Math.round(LR.sat((ao === undefined ? 1 : ao) * this.aoV) * 255);
      this.M[i * 4] = this.layer; this.M[i * 4 + 1] = this.flags; this.M[i * 4 + 2] = this.seed; this.M[i * 4 + 3] = this.weight;
      if (wx < this.min[0]) this.min[0] = wx; if (wy < this.min[1]) this.min[1] = wy; if (wz < this.min[2]) this.min[2] = wz; if (wx > this.max[0]) this.max[0] = wx; if (wy > this.max[1]) this.max[1] = wy; if (wz > this.max[2]) this.max[2] = wz;
      return i;
    }
    idx(a, b, c) { this._need(0, 3); if (this.flip) { const t = b; b = c; c = t; } this.I[this.ni++] = a; this.I[this.ni++] = b; this.I[this.ni++] = c; }
    // ── faces ──
    // a convex polygon, counter-clockwise seen from outside.  o: { u:[x,y,z], v:[x,y,z] texture axes, n: normal override per vertex [[x,y,z]…], ao: [..] per vertex, hint:[x,y,z] flips it to face that way, two: both sides }
    poly(pts, o = {}) {
      const a = pts[0], b = pts[1], c = pts[pts.length - 1];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (pts.length > 3) { const d = pts[2]; const mx = (d[1] - b[1]) * (a[2] - b[2]) - (d[2] - b[2]) * (a[1] - b[1]); if (Math.abs(nx) + Math.abs(ny) + Math.abs(nz) < 1e-9) { nx = -mx; } }
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (o.hint && nx * o.hint[0] + ny * o.hint[1] + nz * o.hint[2] < 0) { pts = pts.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; if (o.ao) o = Object.assign({}, o, { ao: o.ao.slice().reverse() }); if (o.n) o = Object.assign({}, o, { n: o.n.slice().reverse() }); }
      let u = o.u, v = o.v;
      if (!u) { if (Math.abs(ny) > 0.92) { u = [1, 0, 0]; v = [0, 0, ny > 0 ? 1 : -1]; } else { const hl = Math.hypot(nz, nx) || 1; u = [nz / hl, 0, -nx / hl]; v = [ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0]]; } }
      else if (!v) v = [ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0]];
      const s = 1 / this.tile, base = this.n;
      for (let i = 0; i < pts.length; i++) { const p = pts[i], n = o.n ? o.n[i] : null; this.vert(p[0], p[1], p[2], n ? n[0] : nx, n ? n[1] : ny, n ? n[2] : nz, (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) * s + this.uo, (p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) * s + this.vo, o.ao ? o.ao[i] : undefined); }
      for (let i = 1; i < pts.length - 1; i++) this.idx(base, base + i, base + i + 1);
      if (o.two) { const f = this.flip; this.flip = !f; const b2 = this.n; for (let i = 0; i < pts.length; i++) { const p = pts[i]; this.vert(p[0], p[1], p[2], nx, ny, nz, this.UV[(base + i) * 2], this.UV[(base + i) * 2 + 1], o.ao ? o.ao[i] : undefined); } for (let i = 1; i < pts.length - 1; i++) this.idx(b2, b2 + i, b2 + i + 1); this.flip = f; }
      return this;
    }
    quad(a, b, c, d, o) { return this.poly([a, b, c, d], o); }
    // an axis-aligned box in local space: centre and full sizes.  o: { skip: '+y-y…' faces to leave out, soft, grain: 'x'|'y'|'z' (texture u runs along it), ao: [bottom, top] }
    box(cx, cy, cz, sx, sy, sz, o = {}) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2, skip = o.skip || '', soft = o.soft !== undefined ? o.soft : this.soft, g = o.grain || (sx >= sy && sx >= sz ? 'x' : sy >= sz ? 'y' : 'z');
      const ax = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[g], aoB = o.ao ? o.ao[0] : 1, aoT = o.ao ? o.ao[1] : 1;
      const F = [['+x', [1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]], ['-x', [-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]], ['+y', [0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]], ['-y', [0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]], ['+z', [0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]], ['-z', [0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]]];
      for (const [name, n, cs] of F) {
        if (skip.includes(name)) continue;
        const pts = cs.map((c) => [cx + c[0] * hx, cy + c[1] * hy, cz + c[2] * hz]);
        let u = null, v = null; const along = Math.abs(n[0] * ax[0] + n[1] * ax[1] + n[2] * ax[2]) > 0.5;
        if (!along) { u = ax; }
        const no = soft > 0 ? cs.map((c) => { const x = n[0] + c[0] * soft * (n[0] ? 0 : 1), y = n[1] + c[1] * soft * (n[1] ? 0 : 1), z = n[2] + c[2] * soft * (n[2] ? 0 : 1), l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; }) : null;
        this.poly(pts, { u, n: no, ao: cs.map((c) => (c[1] < 0 ? aoB : aoT)) });
      }
      return this;
    }
    // a beam from a to b with cross-section w (sideways) × h (up-ish).  grain runs along it.  o: { up:[x,y,z], soft, caps:true, ao }
    beam(a, b, w, h, o = {}) {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]); if (L < 1e-6) return this;
      const z = [d[0] / L, d[1] / L, d[2] / L]; let up = o.up || (Math.abs(z[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]);
      let x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; const xl = Math.hypot(x[0], x[1], x[2]); x = [x[0] / xl, x[1] / xl, x[2] / xl];
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      const m = new T.Matrix4().set(x[0], y[0], z[0], (a[0] + b[0]) / 2, x[1], y[1], z[1], (a[1] + b[1]) / 2, x[2], y[2], z[2], (a[2] + b[2]) / 2, 0, 0, 0, 1);
      this.push(m); this.box(0, 0, 0, w, h, L, { grain: 'z', soft: o.soft, skip: o.caps === false ? '+z-z' : '', ao: o.ao }); this.pop(); return this;
    }
    // a tube along points with a radius per point (number or list).  o: { sides, caps, vScale, uTwist }
    tube(pts, rad, o = {}) {
      const sides = o.sides || 8, n = pts.length, s = 1 / this.tile, base = this.n; let len = 0; let px = null, pn = null;
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[Math.min(i + 1, n - 1)], pr = pts[Math.max(i - 1, 0)]; let tz = [q[0] - pr[0], q[1] - pr[1], q[2] - pr[2]]; const tl = Math.hypot(tz[0], tz[1], tz[2]) || 1; tz = [tz[0] / tl, tz[1] / tl, tz[2] / tl];
        if (i > 0) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]);
        let x; if (!px) { const up = Math.abs(tz[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]; x = [up[1] * tz[2] - up[2] * tz[1], up[2] * tz[0] - up[0] * tz[2], up[0] * tz[1] - up[1] * tz[0]]; } else { const dt = px[0] * tz[0] + px[1] * tz[1] + px[2] * tz[2]; x = [px[0] - tz[0] * dt, px[1] - tz[1] * dt, px[2] - tz[2] * dt]; }
        const xl = Math.hypot(x[0], x[1], x[2]) || 1; x = [x[0] / xl, x[1] / xl, x[2] / xl]; px = x; const y = [tz[1] * x[2] - tz[2] * x[1], tz[2] * x[0] - tz[0] * x[2], tz[0] * x[1] - tz[1] * x[0]];
        const r = Array.isArray(rad) ? rad[i] : rad, circ = Math.max(LR.TAU * (Array.isArray(rad) ? rad[0] : rad), 0.05);
        for (let k = 0; k <= sides; k++) { const a = (k / sides) * LR.TAU, c = Math.cos(a), sn = Math.sin(a), nx = x[0] * c + y[0] * sn, ny = x[1] * c + y[1] * sn, nz = x[2] * c + y[2] * sn; this.vert(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r, nx, ny, nz, (k / sides) * Math.max(1, Math.round(circ * s)) + this.uo, len * s * (o.vScale || 1) + this.vo, o.ao ? o.ao[i] : undefined); }
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) { const a = base + i * (sides + 1) + k, b = a + 1, c = a + sides + 1, d = c + 1; this.idx(a, c, b); this.idx(b, c, d); }
      if (o.caps) { for (const e of [0, n - 1]) { const p = pts[e], r = Array.isArray(rad) ? rad[e] : rad; if (r < 1e-4) continue; const q = pts[e === 0 ? 1 : n - 2], dn = [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; const ring = []; for (let k = 0; k < sides; k++) { const vi = base + e * (sides + 1) + k; ring.push([0, 0, 0]); } const c0 = this.n; const il = Math.hypot(dn[0], dn[1], dn[2]) || 1;
          // cap vertices are written in world space already, so write them with an identity transform
          const sm = this.m, snm = this.nm; const inv = new T.Matrix4().copy(sm).invert();
          for (let k = 0; k < sides; k++) { const vi = base + e * (sides + 1) + k; const w = new T.Vector3(this.P[vi * 3], this.P[vi * 3 + 1], this.P[vi * 3 + 2]).applyMatrix4(inv); this.vert(w.x, w.y, w.z, dn[0] / il, dn[1] / il, dn[2] / il, w.x * s, w.z * s); }
          for (let k = 1; k < sides - 1; k++) { if (e === 0) this.idx(c0, c0 + k + 1, c0 + k); else this.idx(c0, c0 + k, c0 + k + 1); } } }
      return this;
    }
    cyl(cx, y0, cz, r0, r1, h, o = {}) { return this.tube([[cx, y0, cz], [cx, y0 + h, cz]], [r0, r1], Object.assign({ caps: true }, o)); }
    // a turned shape: profile [[radius, y], …] bottom to top, around the y axis at (cx, cz)
    lathe(cx, cz, prof, o = {}) {
      const sides = o.sides || 12, s = 1 / this.tile, base = this.n; let len = 0;
      for (let i = 0; i < prof.length; i++) {
        const [r, y] = prof[i], a = prof[Math.max(i - 1, 0)], b = prof[Math.min(i + 1, prof.length - 1)]; let tr = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tr, ty) || 1; tr /= tl; ty /= tl;
        if (i > 0) len += Math.hypot(r - prof[i - 1][0], y - prof[i - 1][1]);
        const circ = Math.max(1, Math.round(LR.TAU * Math.max(...prof.map((p) => p[0])) * s));
        for (let k = 0; k <= sides; k++) { const an = (k / sides) * LR.TAU, c = Math.cos(an), sn = Math.sin(an); this.vert(cx + c * r, y, cz + sn * r, c * ty, -tr, sn * ty, (k / sides) * circ + this.uo, len * s + this.vo); }
      }
      for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < sides; k++) { const a = base + i * (sides + 1) + k, b = a + 1, c = a + sides + 1, d = c + 1; this.idx(a, c, b); this.idx(b, c, d); }
      return this;
    }
    // a lumpy ball (rocks, bushes' cores, sacks): radius r, squash [sx,sy,sz], noise amplitude
    blob(cx, cy, cz, r, o = {}) {
      const seg = o.seg || 10, rings = o.rings || 7, sq = o.squash || [1, 1, 1], amp = o.amp === undefined ? 0.18 : o.amp, f = o.freq || 1.7, sd = o.seed || 1, s = 1 / this.tile, base = this.n;
      const P = []; for (let j = 0; j <= rings; j++) { const v = j / rings, ph = v * Math.PI; for (let i = 0; i <= seg; i++) { const u = i / seg, th = u * LR.TAU; let x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th); const ii = i % seg; const xx = Math.sin(ph) * Math.cos((ii / seg) * LR.TAU), zz = Math.sin(ph) * Math.sin((ii / seg) * LR.TAU);
          const d = 1 + amp * ((LR.fbm(xx * f + sd * 3.1 + 9, y * f + zz * f * 1.3 + sd, 3) - 0.5) * 2); const flat = o.flat ? Math.max(y, -o.flat) : y; P.push([x * d * sq[0] * r, flat * d * sq[1] * r, z * d * sq[2] * r, u, v]); } }
      const at = (i, j) => P[j * (seg + 1) + i];
      for (let j = 0; j <= rings; j++) for (let i = 0; i <= seg; i++) {
        const p = at(i, j), a = at((i + 1) % (seg + 1) || 1, j), b = at(i === 0 ? seg - 1 : i - 1, j), c = at(i, Math.min(j + 1, rings)), d = at(i, Math.max(j - 1, 0));
        let tx = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], ty = [c[0] - d[0], c[1] - d[1], c[2] - d[2]]; let nx = tx[1] * ty[2] - tx[2] * ty[1], ny = tx[2] * ty[0] - tx[0] * ty[2], nz = tx[0] * ty[1] - tx[1] * ty[0]; let l = Math.hypot(nx, ny, nz);
        if (l < 1e-6 || j === 0 || j === rings) { nx = p[0] / sq[0]; ny = p[1] / sq[1] + (j === 0 ? 1e-3 : j === rings ? -1e-3 : 0); nz = p[2] / sq[2]; l = Math.hypot(nx, ny, nz) || 1; }
        const circ = Math.max(1, Math.round(LR.TAU * r * s));
        this.vert(cx + p[0], cy + p[1], cz + p[2], nx / l, ny / l, nz / l, p[3] * circ + this.uo, p[4] * Math.max(1, Math.round(Math.PI * r * s)) + this.vo, o.aoLow !== undefined ? LR.lerp(o.aoLow, 1, LR.sat(p[1] / (r * sq[1]) * 0.5 + 0.6)) : undefined);
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; this.idx(a, b, c); this.idx(b, d, c); }
      return this;
    }
    // append another writer's vertices (already in world space)
    merge(g) { this._need(g.n, g.ni); const o = this.n; this.P.set(g.P.subarray(0, g.n * 3), o * 3); this.N.set(g.N.subarray(0, g.n * 4), o * 4); this.UV.set(g.UV.subarray(0, g.n * 2), o * 2); this.C.set(g.C.subarray(0, g.n * 4), o * 4); this.M.set(g.M.subarray(0, g.n * 4), o * 4); for (let i = 0; i < g.ni; i++) this.I[this.ni + i] = g.I[i] + o; this.n += g.n; this.ni += g.ni; for (let k = 0; k < 3; k++) { this.min[k] = Math.min(this.min[k], g.min[k]); this.max[k] = Math.max(this.max[k], g.max[k]); } return this; }
    geometry() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.P.slice(0, this.n * 3), 3));
      g.setAttribute('normal', new T.BufferAttribute(this.N.slice(0, this.n * 4), 4, true));
      g.setAttribute('uv', new T.BufferAttribute(this.UV.slice(0, this.n * 2), 2));
      g.setAttribute('color', new T.BufferAttribute(this.C.slice(0, this.n * 4), 4, true));
      g.setAttribute('meta', new T.BufferAttribute(this.M.slice(0, this.n * 4), 4, false));
      g.setIndex(new T.BufferAttribute(this.n > 65535 ? this.I.slice(0, this.ni) : new Uint16Array(this.I.subarray(0, this.ni)), 1));
      const c = new T.Vector3((this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2, (this.min[2] + this.max[2]) / 2);
      g.boundingSphere = new T.Sphere(c, Math.hypot(this.max[0] - this.min[0], this.max[1] - this.min[1], this.max[2] - this.min[2]) / 2 + 0.5);
      g.boundingBox = new T.Box3(new T.Vector3(...this.min), new T.Vector3(...this.max));
      return g;
    }
    get tris() { return this.ni / 3; }
  }
  LR.Geo = Geo;

  // ── the world registry ───────────────────────────────────────────────────────────────────────────────────────────
  const W = (LR.world = {
    scene: new T.Scene(), shadowScene: new T.Scene(), topoScene: new T.Scene(), forward: new T.Scene(),
    solids: [],      // what the walker cannot pass: { x, z, r } circles and { x, z, hx, hz, yaw } boxes
    floors: [],      // raised places to stand: { x, z, hx, hz, yaw, y | h(x, z) }
    lights: [],      // { x, y, z, r, color:[r,g,b], kind:'lamp'|'fire'|'window', flicker, glow }
    smokers: [], fires: [], sounds: [], places: [],
    stats: { tris: 0, meshes: 0 },
    radius: 150, spawn: { x: 0, z: 0, yaw: 0 },
  });
  // add built geometry (a Geo) to the world: drawn, casting shadow, and — unless told not to — in the rain map
  W.add = (geo, o = {}) => {
    if (!geo.n) return null;
    const g = geo.geometry();
    const m = new T.Mesh(g, o.material || LR.render.matWorld(o)); m.matrixAutoUpdate = !!o.kinetic; m.name = o.name || 'built';
    W.scene.add(m); W.stats.tris += geo.tris; W.stats.meshes++;
    if (o.shadow !== false) { const s = new T.Mesh(g, o.shadowMaterial || LR.render.matShadow(o)); s.matrixAutoUpdate = false; if (o.kinetic) { s.matrix = m.matrix; s.matrixWorld = m.matrixWorld; s.matrixWorldAutoUpdate = false; s.frustumCulled = false; } W.shadowScene.add(s); m.userData.shadow = s; }
    if (o.topo !== false && !o.kinetic) { const t = new T.Mesh(g, LR.render.matTopo()); t.matrixAutoUpdate = false; W.topoScene.add(t); }
    return m;
  };
  W.solidBox = (x, z, hx, hz, yaw = 0, o = {}) => { W.solids.push(Object.assign({ x, z, hx, hz, yaw, c: Math.cos(yaw), s: Math.sin(yaw) }, o)); };
  W.solidCircle = (x, z, r, o = {}) => { W.solids.push(Object.assign({ x, z, r }, o)); };
  W.light = (l) => { W.lights.push(Object.assign({ r: 9, color: [1, 0.62, 0.28], power: 3, kind: 'lamp', flicker: 0.12, glow: 1, phase: (W.lights.length * 37.7) % 100 }, l)); };
}
