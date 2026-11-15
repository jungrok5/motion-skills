// dragon-realm · 45_arch — the builder's kit: timber-and-stone architecture written by code into a few big buffers.
// Nothing here belongs to one culture: a film supplies proportions, colours and its painted-ornament language (a GLSL
// snippet); the kit supplies the writer, the primitives, curved tiled roofs, the five materials and the pendulum.
//
//   const M = DR.arch.materials({ pattern: glsl, lamp: {value}, events: [] })   → { timber, stone, tile, paper, metal, pool() }
//   const W = DR.arch.writer({ seed, sky: DR.arch.eaveAO({...}) })              a geometry writer (see class Writer)
//     W.fam('timber'|'stone'|'tile'|'paper'|'metal') .paint('#hex'|[r,g,b] linear) .kind(id, hw, p, seed) .shade(ao)
//     W.push() .pop() .move(x,y,z) .rotX/Y/Z(a) .scale(x,y,z) .frame(o,X,Y,Z) .at(x,y,z, fn)
//     W.box(w,h,d,o) .beam(a,b,w,h,o) .lathe(profile,o) .extrude(outline,depth,o) .sweep(profile,path,o) .tube(path,r,o)
//     W.poly(pts,o) .grid(ni,nj,fn) .lattice(w,h,o) .stairs(width,n,rise,run,o) .blockWall(len,h,t,o) .railing(pts,o)
//     W.pivot([x,y,z], cordLength, seed)   (metal family) what follows hangs from this point and swings; W.pivot(null) ends it
//     W.build(M, { prepass: ['timber'] }) → THREE.Group (one mesh per family that has geometry, plus a depth-only twin
//       of the timber so its costly surface is shaded once per pixel; userData.tris = { family: n, total })
//   const R = DR.arch.roof(W, {...})        a curved tiled roof with eaves, rafters, ridges → surface functions + anchors
//   DR.arch.roofSurface({...}) / DR.arch.slabRoof(W, {...})   the bare surface maths / a stone roof slab (pagodas, lanterns)
//   DR.arch.swing(t, seed, wind, o) → [tiltX, tiltZ]   the CPU twin of the pendulum the metal material runs per vertex
//   DR.arch.audit(group) → { tris, flipped }           counts triangles whose winding disagrees with their normals
//
// Vertex layout (static, object space): position f32×3, normal i8×3, aCol u8×4 (rgb = paint, sqrt-encoded; a = baked AO;
// in the tile family rgb = the normal of the roof bed, so row relief can fade with distance), uv f32×2 in METRES
// (u along the member from its start, v across it, 0 on the centre line), aK f32×4 = (kind, half-width m, length m, seed).
// A material reads kind to choose a surface and the metric numbers to place ornament: every beam end knows where it is.
{
  const A = (DR.arch = {});
  const { sat, clamp, TAU, DEG } = DR, PI = Math.PI;
  const enc = (l) => Math.round(255 * Math.sqrt(sat(l)));
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const FAMS = ['timber', 'stone', 'tile', 'paper', 'metal'], ZERO4 = [0, 0, 0, 0];
  A.families = FAMS;

  class Buf {
    constructor(piv) { this.n = 0; this.ni = 0; this.cap = 4096; this.icap = 16384; this.pos = new Float32Array(this.cap * 3); this.nrm = new Int8Array(this.cap * 3); this.col = new Uint8Array(this.cap * 4); this.uv = new Float32Array(this.cap * 2); this.k = new Float32Array(this.cap * 4); this.piv = piv ? new Float32Array(this.cap * 4) : null; this.idx = new Uint32Array(this.icap); }
    growV() { this.cap *= 2; for (const [key, sz] of [['pos', 3], ['nrm', 3], ['col', 4], ['uv', 2], ['k', 4], ['piv', 4]]) { if (!this[key]) continue; const a = new this[key].constructor(this.cap * sz); a.set(this[key]); this[key] = a; } }
    growI() { this.icap *= 2; const a = new Uint32Array(this.icap); a.set(this.idx); this.idx = a; }
  }

  class Writer {
    // o.sky: (x,y,z, nx,ny,nz) → 0..1, multiplied into every vertex's AO (e.g. DR.arch.eaveAO)
    constructor(o = {}) { this.B = {}; for (const f of FAMS) this.B[f] = new Buf(f === 'metal'); this.b = this.B.timber; this.m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; this.st = []; this.c = [255, 255, 255]; this.K = [0, 0, 0, 0]; this.aoK = 1; this.sky = o.sky || null; this.P = null; this.nd = true; this.nm = null; this.neg = false; this.seed = o.seed || 1; this._o = new Float64Array(9); }
    fam(n) { this.b = this.B[n]; return this; }
    paint(c, k = 1) { const l = DR.rgb(c); this.c = [enc(l[0] * k), enc(l[1] * k), enc(l[2] * k)]; return this; }
    bed(n) { this.c = [Math.round(n[0] * 127 + 128), Math.round(n[1] * 127 + 128), Math.round(n[2] * 127 + 128)]; return this; }   // tile family: the roof bed's normal
    kind(id, hw = 0, p = 0, seed = 0) { this.K = [id, hw, p, seed]; return this; }
    shade(a = 1) { this.aoK = a; return this; }
    pivot(p, L = 0.5, seed = 0.5) { if (!p) { this.P = null; return this; } const q = this.pt(p[0], p[1], p[2]); this.P = [q[0], q[1], q[2], Math.max(1, Math.round(L * 64)) + clamp(seed, 0.01, 0.98)]; return this; }
    // ── the matrix stack (row-major 3×4) ──
    push() { this.st.push(this.m); return this; }
    pop() { this.m = this.st.pop(); this.nd = true; return this; }
    mul(b) { const a = this.m; this.m = [
      a[0] * b[0] + a[1] * b[4] + a[2] * b[8], a[0] * b[1] + a[1] * b[5] + a[2] * b[9], a[0] * b[2] + a[1] * b[6] + a[2] * b[10], a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3],
      a[4] * b[0] + a[5] * b[4] + a[6] * b[8], a[4] * b[1] + a[5] * b[5] + a[6] * b[9], a[4] * b[2] + a[5] * b[6] + a[6] * b[10], a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7],
      a[8] * b[0] + a[9] * b[4] + a[10] * b[8], a[8] * b[1] + a[9] * b[5] + a[10] * b[9], a[8] * b[2] + a[9] * b[6] + a[10] * b[10], a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11]]; this.nd = true; return this; }
    move(x, y = 0, z = 0) { return this.mul([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]); }
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return this.mul([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]); }
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return this.mul([1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]); }
    rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return this.mul([c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]); }
    scale(x, y = x, z = x) { return this.mul([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0]); }
    frame(o, X, Y, Z) { return this.mul([X[0], Y[0], Z[0], o[0], X[1], Y[1], Z[1], o[1], X[2], Y[2], Z[2], o[2]]); }
    at(x, y, z, fn) { this.push().move(x, y, z); fn(this); return this.pop(); }
    pt(x, y, z) { const m = this.m; return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; }
    cof() { const m = this.m, a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10], det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g), s = det < 0 ? -1 : 1;
      this.nm = [(e * i - f * h) * s, (f * g - d * i) * s, (d * h - e * g) * s, (c * h - b * i) * s, (a * i - c * g) * s, (b * g - a * h) * s, (b * f - c * e) * s, (c * d - a * f) * s, (a * e - b * d) * s]; this.neg = det < 0; this.nd = false; }
    // ── vertices and faces ──
    v(x, y, z, nx, ny, nz, u = 0, vv = 0, ao = 1) {
      const m = this.m, b = this.b; if (b.n >= b.cap) b.growV(); if (this.nd) this.cof();
      const X = m[0] * x + m[1] * y + m[2] * z + m[3], Y = m[4] * x + m[5] * y + m[6] * z + m[7], Z = m[8] * x + m[9] * y + m[10] * z + m[11], c = this.nm;
      let NX = c[0] * nx + c[1] * ny + c[2] * nz, NY = c[3] * nx + c[4] * ny + c[5] * nz, NZ = c[6] * nx + c[7] * ny + c[8] * nz; const l = Math.hypot(NX, NY, NZ) || 1; NX /= l; NY /= l; NZ /= l;
      let a = ao * this.aoK; if (this.sky) a *= this.sky(X, Y, Z, NX, NY, NZ);
      const i = b.n++, i3 = i * 3, i4 = i * 4, C = this.c, K = this.K;
      b.pos[i3] = X; b.pos[i3 + 1] = Y; b.pos[i3 + 2] = Z; b.nrm[i3] = Math.round(NX * 127); b.nrm[i3 + 1] = Math.round(NY * 127); b.nrm[i3 + 2] = Math.round(NZ * 127);
      b.col[i4] = C[0]; b.col[i4 + 1] = C[1]; b.col[i4 + 2] = C[2]; b.col[i4 + 3] = Math.round(255 * sat(a));
      b.uv[i * 2] = u; b.uv[i * 2 + 1] = vv; b.k[i4] = K[0]; b.k[i4 + 1] = K[1]; b.k[i4 + 2] = K[2]; b.k[i4 + 3] = K[3];
      if (b.piv) { const P = this.P || ZERO4; b.piv[i4] = P[0]; b.piv[i4 + 1] = P[1]; b.piv[i4 + 2] = P[2]; b.piv[i4 + 3] = P[3]; }
      return i;
    }
    idx3(a, b, c) { const B = this.b; if (B.ni + 3 > B.icap) B.growI(); B.idx[B.ni++] = a; B.idx[B.ni++] = b; B.idx[B.ni++] = c; }
    tri(a, b, c) { if (this.neg) this.idx3(a, c, b); else this.idx3(a, b, c); return this; }
    quad(a, b, c, d) { return this.tri(a, b, c).tri(a, c, d); }
    // a flat convex polygon.  o.hint: a direction its front should face (winding is fixed to match), o.uvs, o.ao [per point]
    poly(pts, o = {}) { let nx = 0, ny = 0, nz = 0; const n = pts.length;
      for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); }
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; let rev = false; const h = o.hint; if (h && nx * h[0] + ny * h[1] + nz * h[2] < 0) { rev = true; nx = -nx; ny = -ny; nz = -nz; }
      const id = pts.map((p, i) => this.v(p[0], p[1], p[2], nx, ny, nz, o.uvs ? o.uvs[i][0] : 0, o.uvs ? o.uvs[i][1] : 0, o.ao ? o.ao[i] : 1));
      for (let i = 1; i < n - 1; i++) rev ? this.tri(id[0], id[i + 1], id[i]) : this.tri(id[0], id[i], id[i + 1]); return this; }
    // a ni × nj sheet: fn(i, j, out) fills out = [x,y,z, nx,ny,nz, u,v, ao].  Winding is chosen to agree with the normals.
    grid(ni, nj, fn, flip) { const o = this._o, b0 = this.b, base = b0.n;
      for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) { o[8] = 1; fn(i, j, o); this.v(o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], o[8]); }
      const P = b0.pos, N = b0.nrm;
      if (flip === undefined) { let s = 0; for (let i = 0; i < ni - 1; i++) for (let j = 0; j < nj - 1; j++) { const a = (base + i * nj + j) * 3, c = a + nj * 3, e = a + 3, ux = P[c] - P[a], uy = P[c + 1] - P[a + 1], uz = P[c + 2] - P[a + 2], vx = P[e] - P[a], vy = P[e + 1] - P[a + 1], vz = P[e + 2] - P[a + 2];
        s += (uy * vz - uz * vy) * N[a] + (uz * vx - ux * vz) * N[a + 1] + (ux * vy - uy * vx) * N[a + 2]; } flip = s < 0; }
      for (let i = 0; i < ni - 1; i++) for (let j = 0; j < nj - 1; j++) { const a = base + i * nj + j, c = a + nj, d = c + 1, e = a + 1; if (flip) { this.idx3(a, e, d); this.idx3(a, d, c); } else { this.idx3(a, c, d); this.idx3(a, d, e); } }
      return this; }
    // ── box: w (x) × h (y) × d (z), centred on o.at (o.base: y of `at` is the bottom).  o.top [kx,kz] tapers the top face,
    //    o.skip 'tblrfk' drops faces (top bottom left −x right +x front +z back −z), o.axis 'x'|'y'|'z' is the member's long
    //    axis.  Every face gets u ∈ [0, p] and v ∈ [−hw, hw] in metres; on the four long faces u runs along the axis.
    //    o.endKind / o.endPaint dress the two faces across the axis (rafter ends, beam ends). ──
    box(w, h, d, o = {}) {
      const at = o.at || [0, 0, 0], y0 = at[1] - (o.base ? 0 : h / 2), kx = o.top ? o.top[0] : 1, kz = o.top ? (o.top[1] ?? o.top[0]) : 1, skip = o.skip || '', ai = { x: 0, y: 1, z: 2 }[o.axis || 'x'], K0 = this.K, c0 = this.c, dims = [w, h, d];
      const C = (s) => [at[0] + s[0] * w / 2 * (s[1] > 0 ? kx : 1), y0 + (s[1] > 0 ? h : 0), at[2] + s[2] * d / 2 * (s[1] > 0 ? kz : 1)];
      for (const [key, fi, sg, cs] of BOXF) { if (skip.includes(key)) continue; const end = fi === ai; let ui, vi;
        if (end) { const o1 = (fi + 1) % 3, o2 = (fi + 2) % 3; if (dims[o1] >= dims[o2]) { ui = o1; vi = o2; } else { ui = o2; vi = o1; } } else { ui = ai; vi = 3 - ai - fi; }
        this.K = [end && o.endKind !== undefined ? o.endKind : K0[0], dims[vi] / 2, dims[ui], K0[3]]; if (end && o.endPaint) this.paint(o.endPaint);
        const hint = [0, 0, 0]; hint[fi] = sg;
        this.poly(cs.map(C), { hint, uvs: cs.map((s) => [(s[ui] + 1) / 2 * dims[ui] + (end ? 0 : o.u0 || 0), s[vi] * dims[vi] / 2]), ao: o.ao ? cs.map((s) => (s[1] > 0 ? o.ao[1] : o.ao[0])) : null });
        this.c = c0; }
      this.K = K0; return this; }
    // a box member from point a to point b: width w (sideways), height h (toward o.up).  u = 0 at a.
    beam(a, b, w, h, o = {}) { const X = norm(sub(b, a)), len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); let Z = cross(X, o.up || [0, 1, 0]); if (Math.hypot(Z[0], Z[1], Z[2]) < 1e-4) Z = [0, 0, 1]; Z = norm(Z); const Y = cross(Z, X);
      this.push().frame(a, X, Y, Z).box(len, h, w, { ...o, at: [len / 2, o.dy || 0, 0], axis: 'x' }); return this.pop(); }
    // ── lathe: profile [[r, y], …] (going up) turned round the y axis; x = r·cos, z = r·sin.  o.seg sides, o.flat faceted
    //    (polygonal shafts), o.rot start angle, o.caps 'tb', o.crease° (profile corners sharper than this stay sharp),
    //    o.mod(angle, i) → radial scale (lotus petals, flutes), o.capKind, o.smooth (recompute normals after a mod). ──
    lathe(prof, o = {}) {
      const seg = o.seg || 12, rot = o.rot || 0, cr = Math.cos((o.crease ?? 40) * DEG), mod = o.mod, n = prof.length, K0 = this.K, v0 = this.b.n, i0 = this.b.ni;
      const sn = []; for (let i = 0; i < n - 1; i++) { const dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
      const runs = [[]]; let acc = 0, rmax = 0;
      for (let i = 0; i < n; i++) { if (i) acc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]); rmax = Math.max(rmax, prof[i][0]); const a = sn[i - 1], b = sn[i];
        if (a && b && a[0] * b[0] + a[1] * b[1] >= cr) { const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1; runs[runs.length - 1].push({ i, n: [(a[0] + b[0]) / l, (a[1] + b[1]) / l], u: acc }); }
        else { if (a) runs[runs.length - 1].push({ i, n: a, u: acc }); if (a && b) runs.push([]); if (b) runs[runs.length - 1].push({ i, n: b, u: acc }); } }
      const uvR = o.uvR || rmax; this.K = [K0[0], o.hw ?? uvR, o.len ?? acc, K0[3]];
      const put = (ring, ap, an, out) => { const p = prof[ring.i], r = p[0] * (mod ? mod(ap, ring.i) : 1); out[0] = r * Math.cos(ap); out[1] = p[1]; out[2] = r * Math.sin(ap); out[3] = ring.n[0] * Math.cos(an); out[4] = ring.n[1]; out[5] = ring.n[0] * Math.sin(an); out[6] = ring.u + (o.u0 || 0); out[7] = (an - rot - PI) * uvR; };
      for (const run of runs) { if (run.length < 2) continue;
        if (o.flat) for (let k = 0; k < seg; k++) { const a0 = rot + k * TAU / seg, a1 = a0 + TAU / seg; this.grid(run.length, 2, (i, j, out) => put(run[i], j ? a1 : a0, (a0 + a1) / 2, out)); }
        else this.grid(run.length, seg + 1, (i, j, out) => { const a = rot + j * TAU / seg; put(run[i], a, a, out); }); }
      for (const [key, pi, ny] of [['b', 0, -1], ['t', n - 1, 1]]) if ((o.caps || '').includes(key) && prof[pi][0] > 1e-5) { const pts = []; for (let k = 0; k < seg; k++) { const a = rot + k * TAU / seg, r = prof[pi][0] * (mod ? mod(a, pi) : 1); pts.push([r * Math.cos(a), prof[pi][1], r * Math.sin(a)]); }
        this.K = [o.capKind ?? K0[0], prof[pi][0], prof[pi][0] * 2, K0[3]]; this.poly(pts, { hint: [0, ny, 0], uvs: pts.map((p) => [p[0] + prof[pi][0], p[2]]) }); }
      if (o.smooth) this.smooth(v0, i0); this.K = K0; return this; }
    // recompute the normals of the vertices from v0 on from their faces (welding vertices that share a place)
    smooth(v0, i0) { const b = this.b, P = b.pos, acc = new Map(), key = (i) => Math.round(P[i * 3] * 2000) + ',' + Math.round(P[i * 3 + 1] * 2000) + ',' + Math.round(P[i * 3 + 2] * 2000);
      for (let t = i0; t < b.ni; t += 3) { const a = b.idx[t] * 3, c = b.idx[t + 1] * 3, d = b.idx[t + 2] * 3, n = cross([P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]], [P[d] - P[a], P[d + 1] - P[a + 1], P[d + 2] - P[a + 2]]);
        for (const q of [a, c, d]) { const k = key(q / 3); let s = acc.get(k); if (!s) acc.set(k, (s = [0, 0, 0])); s[0] += n[0]; s[1] += n[1]; s[2] += n[2]; } }
      for (let i = v0; i < b.n; i++) { const s = acc.get(key(i)); if (!s) continue; const l = Math.hypot(s[0], s[1], s[2]) || 1; b.nrm[i * 3] = Math.round(s[0] / l * 127); b.nrm[i * 3 + 1] = Math.round(s[1] / l * 127); b.nrm[i * 3 + 2] = Math.round(s[2] / l * 127); }
      return this; }
    // ── extrude: a 2-D outline [[x,y],…] (any winding) → a prism of depth d along z, centred on z = o.z0 (default 0).
    //    o.holes [[…],…], o.faces 'fbs' (front +z, back −z, sides), o.crease° for the side normals (default 30),
    //    o.rim { w, paint }: a border band drawn as geometry on front and back (painted edge lines on brackets),
    //    o.sideKind / o.sidePaint. Face uv = (x, y); side uv = (distance round the outline, z). ──
    extrude(out, d, o = {}) {
      const area = (L) => { let s = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
      const C = out.slice(); if (area(C) < 0) C.reverse(); const holes = (o.holes || []).map((h) => { h = h.slice(); if (area(h) > 0) h.reverse(); return h; });
      const zc = o.z0 || 0, z1 = zc + d / 2, z0 = zc - d / 2, faces = o.faces || 'fbs', K0 = this.K, c0 = this.c, cr = Math.cos((o.crease ?? 30) * DEG), n = C.length;
      const en = (L) => L.map((p, i) => { const q = L[(i + 1) % L.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l, l]; });
      const EN = en(C); let inner = C;
      if (o.rim) inner = C.map((p, i) => { const a = EN[(i + n - 1) % n], b = EN[i]; let mx = a[0] + b[0], my = a[1] + b[1]; const l = Math.hypot(mx, my) || 1; mx /= l; my /= l; const k = o.rim.w / Math.max(0.4, mx * b[0] + my * b[1]); return [p[0] - mx * k, p[1] - my * k]; });
      const V2 = (p) => new THREE.Vector2(p[0], p[1]);
      const cap = (z, f) => { const all = inner.concat(...holes), tris = THREE.ShapeUtils.triangulateShape(inner.map(V2), holes.map((h) => h.map(V2))), id = all.map((p) => this.v(p[0], p[1], z, 0, 0, f, p[0], p[1]));
        for (const t of tris) { const a = all[t[0]], b = all[t[1]], c = all[t[2]], ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0; (ccw === f > 0) ? this.tri(id[t[0]], id[t[1]], id[t[2]]) : this.tri(id[t[0]], id[t[2]], id[t[1]]); }
        if (o.rim) { this.paint(o.rim.paint); for (let i = 0; i < n; i++) { const j = (i + 1) % n, q = [C[i], C[j], inner[j], inner[i]].map((p) => this.v(p[0], p[1], z, 0, 0, f, p[0], p[1])); f > 0 ? this.quad(q[0], q[1], q[2], q[3]) : this.quad(q[0], q[3], q[2], q[1]); } this.c = c0; } };
      if (faces.includes('f')) cap(z1, 1); if (faces.includes('b')) cap(z0, -1);
      if (faces.includes('s')) { if (o.sidePaint) this.paint(o.sidePaint);
        for (const L of [C, ...holes]) { const E = L === C ? EN : en(L), m = L.length; let per = 0; const tot = E.reduce((s, e) => s + e[2], 0); this.K = [o.sideKind ?? K0[0], d / 2, tot, K0[3]];
          for (let i = 0; i < m; i++) { const j = (i + 1) % m, e = E[i], pe = E[(i + m - 1) % m], ne = E[j], p = L[i], q = L[j];
            const na = pe[0] * e[0] + pe[1] * e[1] >= cr ? norm([pe[0] + e[0], pe[1] + e[1], 0]) : e, nb = ne[0] * e[0] + ne[1] * e[1] >= cr ? norm([ne[0] + e[0], ne[1] + e[1], 0]) : e;
            const a = this.v(p[0], p[1], z0, na[0], na[1], 0, per, -d / 2), b = this.v(q[0], q[1], z0, nb[0], nb[1], 0, per + e[2], -d / 2), c = this.v(q[0], q[1], z1, nb[0], nb[1], 0, per + e[2], d / 2), dd = this.v(p[0], p[1], z1, na[0], na[1], 0, per, d / 2);
            this.quad(a, b, c, dd); per += e[2]; } }
        this.c = c0; }
      this.K = K0; return this; }
    // ── sweep: a 2-D profile [[x,y],…] (counter-clockwise; x to the right, y up, looking along the path) carried along
    //    a path [[x,y,z],…].  o.open (the profile is a strip, not a loop), o.up [0,1,0], o.scale(i, u) → s | [sx, sy],
    //    o.caps 's' 'e' (convex profiles), o.endKind / o.endPaint, o.crease° (default 35), o.loop (the path closes). ──
    sweep(prof, path, o = {}) {
      const n = path.length, m = prof.length, up = o.up || [0, 1, 0], K0 = this.K, c0 = this.c, cr = Math.cos((o.crease ?? 35) * DEG), loop = o.loop, ne = o.open ? m - 1 : m;
      const fr = [], ds = [0]; for (let i = 0; i < n; i++) { if (i) ds.push(ds[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
        const a = path[loop ? (i + n - 1) % n : Math.max(0, i - 1)], b = path[loop ? (i + 1) % n : Math.min(n - 1, i + 1)], T = norm(sub(b, a)); let Rv = cross(T, up); if (Math.hypot(Rv[0], Rv[1], Rv[2]) < 1e-4) Rv = [1, 0, 0]; Rv = norm(Rv); fr.push({ T, R: Rv, U: cross(Rv, T) }); }
      const tot = ds[n - 1] + (loop ? Math.hypot(path[0][0] - path[n - 1][0], path[0][1] - path[n - 1][1], path[0][2] - path[n - 1][2]) : 0);
      const E = []; for (let k = 0; k < ne; k++) { const p = prof[k], q = prof[(k + 1) % m], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; E.push([dy / l, -dx / l, l]); }
      const sc = (i) => { const s = o.scale ? o.scale(i, tot ? ds[Math.min(i, n - 1)] / tot : 0) : 1; return typeof s === 'number' ? [s, s] : s; };
      const at = (i, x, y) => { const ii = i % n, f = fr[ii], p = path[ii], s = sc(ii); return [p[0] + f.R[0] * x * s[0] + f.U[0] * y * s[1], p[1] + f.R[1] * x * s[0] + f.U[1] * y * s[1], p[2] + f.R[2] * x * s[0] + f.U[2] * y * s[1]]; };
      let per = 0; const ni = loop ? n + 1 : n; this.K = [K0[0], K0[1], K0[2] || tot, K0[3]];
      for (let k = 0; k < ne; k++) { const e = E[k], pe = o.open && k === 0 ? e : E[(k + ne - 1) % ne], nx = o.open && k === ne - 1 ? e : E[(k + 1) % ne];
        const na = pe[0] * e[0] + pe[1] * e[1] >= cr ? norm([pe[0] + e[0], pe[1] + e[1], 0]) : e, nb = nx[0] * e[0] + nx[1] * e[1] >= cr ? norm([nx[0] + e[0], nx[1] + e[1], 0]) : e, p0 = prof[k], p1 = prof[(k + 1) % m], v0 = per - (o.v0 || 0), v1 = v0 + e[2];
        this.grid(ni, 2, (i, j, out) => { const ii = i % n, f = fr[ii], p = j ? p1 : p0, nn = j ? nb : na, q = at(i, p[0], p[1]); out[0] = q[0]; out[1] = q[1]; out[2] = q[2];
          out[3] = f.R[0] * nn[0] + f.U[0] * nn[1]; out[4] = f.R[1] * nn[0] + f.U[1] * nn[1]; out[5] = f.R[2] * nn[0] + f.U[2] * nn[1]; out[6] = (i === n ? tot : ds[ii]) + (o.u0 || 0); out[7] = j ? v1 : v0; });
        per += e[2]; }
      if (o.caps && !loop) { let w2 = 0, h2 = 0; for (const p of prof) { w2 = Math.max(w2, Math.abs(p[0])); h2 = Math.max(h2, Math.abs(p[1])); } if (o.endPaint) this.paint(o.endPaint);
        for (const [key, i, sg] of [['s', 0, -1], ['e', n - 1, 1]]) if (o.caps.includes(key)) { const s = sc(i); this.K = [o.endKind ?? K0[0], Math.min(w2, h2) * s[1], Math.max(w2, h2) * 2 * s[0], K0[3]];
          this.poly(prof.map((p) => at(i, p[0], p[1])), { hint: fr[i].T.map((x) => x * sg), uvs: prof.map((p) => (w2 >= h2 ? [(p[0] + w2) * s[0], p[1] * s[1]] : [(p[1] + h2) * s[1], p[0] * s[0]])) }); } this.c = c0; }
      this.K = K0; return this; }
    // ── tube: a round section along any 3-D path (frames are carried along, so it never twists).  r: number | [one per point] | (u 0..1) → m.
    //    o.seg sides, o.caps 's' 'e', o.capKind / o.capPaint, o.up (where v = 0 points). ──
    tube(path, r, o = {}) {
      const n = path.length, seg = o.seg || 8, rf = typeof r === 'function' ? r : () => r, K0 = this.K, c0 = this.c, ds = [0], T = [];
      for (let i = 0; i < n; i++) { if (i) ds.push(ds[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2])); T.push(norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]))); }
      const tot = ds[n - 1] || 1, up = o.up || [0, 1, 0], fr = []; let N = cross(cross(T[0], up), T[0]); if (Math.hypot(N[0], N[1], N[2]) < 1e-4) N = cross(cross(T[0], [1, 0, 0]), T[0]);
      for (let i = 0; i < n; i++) { const t = T[i], dn = N[0] * t[0] + N[1] * t[1] + N[2] * t[2]; N = norm([N[0] - t[0] * dn, N[1] - t[1] * dn, N[2] - t[2] * dn]); fr.push({ N, B: cross(t, N), r: Array.isArray(r) ? r[i] : rf(ds[i] / tot) }); }
      this.K = [K0[0], K0[1] || fr[0].r, K0[2] || tot, K0[3]];
      const ring = (i, j) => { const f = fr[i], a = j * TAU / seg, c = Math.cos(a), s = Math.sin(a); return [f.N[0] * c + f.B[0] * s, f.N[1] * c + f.B[1] * s, f.N[2] * c + f.B[2] * s]; };
      this.grid(n, seg + 1, (i, j, out) => { const d = ring(i, j), p = path[i], f = fr[i], sl = i < n - 1 ? (fr[i + 1].r - f.r) / Math.max(1e-5, ds[i + 1] - ds[i]) : i ? (f.r - fr[i - 1].r) / Math.max(1e-5, ds[i] - ds[i - 1]) : 0, t = T[i];
        out[0] = p[0] + d[0] * f.r; out[1] = p[1] + d[1] * f.r; out[2] = p[2] + d[2] * f.r; out[3] = d[0] - t[0] * sl; out[4] = d[1] - t[1] * sl; out[5] = d[2] - t[2] * sl; out[6] = ds[i] + (o.u0 || 0); out[7] = (j / seg - 0.5) * TAU * f.r; });
      if (o.capPaint) this.paint(o.capPaint);
      for (const [key, i, sg] of [['s', 0, -1], ['e', n - 1, 1]]) if ((o.caps || '').includes(key) && fr[i].r > 1e-5) { const f = fr[i], pts = [], uvs = []; for (let j = 0; j < seg; j++) { const d = ring(i, j), a = j * TAU / seg; pts.push([path[i][0] + d[0] * f.r, path[i][1] + d[1] * f.r, path[i][2] + d[2] * f.r]); uvs.push([(Math.cos(a) + 1) * f.r, Math.sin(a) * f.r]); }
        this.K = [o.capKind ?? K0[0], f.r, f.r * 2, K0[3]]; this.poly(pts, { hint: T[i].map((x) => x * sg), uvs }); }
      this.c = c0; this.K = K0; return this; }
    // ── lattice: bars as real geometry in the xy plane, centred.  o.nx / o.ny bars, o.bar width, o.depth, o.frame width (0 = none) ──
    lattice(w, h, o = {}) { const bar = o.bar || 0.02, dp = o.depth || 0.02, fw = o.frame ?? 0.05, nx = o.nx ?? 5, ny = o.ny ?? 5;
      if (fw) { for (const sx of [-1, 1]) this.box(fw, h, dp * 1.5, { at: [sx * (w - fw) / 2, 0, 0], axis: 'y' }); for (const sy of [-1, 1]) this.box(w - fw * 2, fw, dp * 1.5, { at: [0, sy * (h - fw) / 2, 0], axis: 'x' }); }
      for (let i = 1; i <= nx; i++) this.box(bar, h - fw * 2, dp, { at: [-w / 2 + fw + (w - fw * 2) * i / (nx + 1), 0, 0], axis: 'y', skip: 'tb' });
      for (let i = 1; i <= ny; i++) this.box(w - fw * 2, bar, dp, { at: [0, -h / 2 + fw + (h - fw * 2) * i / (ny + 1), 0], axis: 'x', skip: 'lr' });
      return this; }
    // ── stairs: n solid steps climbing toward −z from the foot at z = 0.  o.blocks (stones per step), o.seed ──
    stairs(width, n, rise, run, o = {}) { const nb = o.blocks || 1, r = DR.rng(o.seed || 3), K0 = this.K, c0 = this.c;
      for (let i = 0; i < n; i++) for (let k = 0; k < nb; k++) { this.K = [K0[0], 0, 0, r()]; this.c = c0.map((x) => Math.min(255, x * (0.95 + 0.1 * r())));
        this.box(width / nb - 0.008, rise, run, { at: [-width / 2 + (k + 0.5) * width / nb, i * rise, -(i + 0.5) * run], base: true, skip: 'b' + (nb > 1 && k > 0 ? 'l' : '') + (nb > 1 && k < nb - 1 ? 'r' : '') });
        if (i) this.box(width / nb - 0.008, i * rise, run, { at: [-width / 2 + (k + 0.5) * width / nb, 0, -(i + 0.5) * run], base: true, skip: 'tbfk' + (k > 0 ? 'l' : '') + (k < nb - 1 ? 'r' : '') }); }
      this.K = K0; this.c = c0; return this; }
    // ── blockWall: coursed stone from x = 0 to len, y = 0 to h, thickness t about z = 0.  Each block is its own face,
    //    a few mm proud or shy, with a real recessed joint over a dark backing.  o.course height, o.block mean length,
    //    o.joint gap, o.jitter, o.faces 'fktlr', o.seed ──
    blockWall(len, h, t, o = {}) {
      const r = DR.rng(o.seed || 7), nc = Math.max(1, Math.round(h / (o.course || 0.3))), ch = h / nc, bl = o.block || 0.9, jt = o.joint ?? 0.006, jit = o.jitter ?? 0.004, faces = o.faces || 'fktlr', K0 = this.K, c0 = this.c;
      const blk = (pts, hint, L, H) => { this.K = [K0[0], H / 2, L, r()]; this.c = c0.map((x) => Math.min(255, x * (0.93 + 0.14 * r()))); this.poly(pts, { hint, uvs: [[0, -H / 2], [L, -H / 2], [L, H / 2], [0, H / 2]] }); };
      const back = (pts, hint) => { this.K = [K0[0], 0, 0, 0.5]; this.c = c0.map((x) => x * 0.45); this.poly(pts, { hint, ao: [0.5, 0.5, 0.5, 0.5] }); };
      for (const [key, sz] of [['f', 1], ['k', -1]]) if (faces.includes(key)) { const zb = sz * (t / 2 - 0.012); back([[0, 0, zb], [len, 0, zb], [len, h, zb], [0, h, zb]], [0, 0, sz]);
        for (let c = 0; c < nc; c++) { let x = 0, first = true; while (x < len - 1e-6) { let L = bl * (0.7 + 0.6 * r()) * (first && c % 2 ? 0.55 : 1); if (len - x - L < bl * 0.4) L = len - x; const z = sz * (t / 2 + (r() - 0.5) * 2 * jit), y0 = c * ch + jt, y1 = (c + 1) * ch - jt;
          blk([[x + jt, y0, z], [x + L - jt, y0, z], [x + L - jt, y1, z], [x + jt, y1, z]], [0, 0, sz], L, ch); x += L; first = false; } } }
      for (const [key, sx] of [['l', -1], ['r', 1]]) if (faces.includes(key)) { const x = sx > 0 ? len : 0; back([[x - sx * 0.012, 0, -t / 2], [x - sx * 0.012, 0, t / 2], [x - sx * 0.012, h, t / 2], [x - sx * 0.012, h, -t / 2]], [sx, 0, 0]);
        for (let c = 0; c < nc; c++) blk([[x, c * ch + jt, -t / 2 + jt], [x, c * ch + jt, t / 2 - jt], [x, (c + 1) * ch - jt, t / 2 - jt], [x, (c + 1) * ch - jt, -t / 2 + jt]], [sx, 0, 0], t, ch); }
      if (faces.includes('t')) { back([[0, h - 0.012, -t / 2], [len, h - 0.012, -t / 2], [len, h - 0.012, t / 2], [0, h - 0.012, t / 2]], [0, 1, 0]); let x = 0; while (x < len - 1e-6) { let L = bl * (0.7 + 0.6 * r()); if (len - x - L < bl * 0.4) L = len - x;
        blk([[x + jt, h, t / 2 - jt], [x + L - jt, h, t / 2 - jt], [x + L - jt, h, -t / 2 + jt], [x + jt, h, -t / 2 + jt]], [0, 1, 0], L, t); x += L; } }
      this.K = K0; this.c = c0; return this; }
    // ── railing: posts and rails along a polyline [[x,y,z],…].  o.h height, o.step post spacing, o.post [w, d],
    //    o.rails [[y, w, h], …] (heights above the path), o.cap (post head height above the top rail) ──
    railing(pts, o = {}) { const h = o.h || 0.9, step = o.step || 1.2, pw = o.post || [0.1, 0.1], rails = o.rails || [[h - 0.05, 0.07, 0.07], [h * 0.45, 0.05, 0.05]];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), np = Math.max(1, Math.round(L / step));
        for (let k = 0; k <= np; k++) { if (k === np && i < pts.length - 2) continue; const f = k / np, p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; this.push().move(p[0], p[1], p[2]).rotY(-Math.atan2(b[2] - a[2], b[0] - a[0])).box(pw[0], h + (o.cap || 0.06), pw[1], { base: true, axis: 'y', skip: 'b' }).pop(); }
        for (const [y, w, hh] of rails) this.beam([a[0], a[1] + y, a[2]], [b[0], b[1] + y, b[2]], w, hh, { skip: 'lr' }); }
      return this; }
    // ── the meshes: one per family ──
    build(M, o = {}) { const g = new THREE.Group(), tris = { total: 0 };
      for (const f of FAMS) { const b = this.B[f]; if (!b.ni) continue; const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(b.pos.slice(0, b.n * 3), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(b.nrm.slice(0, b.n * 3), 3, true));
        geo.setAttribute('aCol', new THREE.BufferAttribute(b.col.slice(0, b.n * 4), 4, true)); geo.setAttribute('uv', new THREE.BufferAttribute(b.uv.slice(0, b.n * 2), 2)); geo.setAttribute('aK', new THREE.BufferAttribute(b.k.slice(0, b.n * 4), 4));
        if (b.piv) geo.setAttribute('aPiv', new THREE.BufferAttribute(b.piv.slice(0, b.n * 4), 4));
        geo.setIndex(new THREE.BufferAttribute(b.idx.slice(0, b.ni), 1)); geo.computeBoundingBox(); geo.computeBoundingSphere(); if (b.piv) geo.boundingSphere.radius += 1.5;
        const mesh = new THREE.Mesh(geo, M[f]); mesh.name = f; DR.shadowed(mesh, o.cast !== false, true); g.add(mesh); tris[f] = b.ni / 3; tris.total += b.ni / 3;
        // a depth-only first pass for the crowded families: under an eave rafters, boards and brackets overlap three or four
        // deep, and the painted surface is costly — so each pixel is shaded once (?off=prepass to compare)
        if ((o.prepass || ['timber']).includes(f) && DR.on('prepass')) { const pm = new THREE.Mesh(geo, PRE || (PRE = new THREE.MeshBasicMaterial({ colorWrite: false }))); pm.name = f + '-depth'; pm.renderOrder = -5; g.add(pm); } }
      g.userData.tris = tris; return g; }
  }
  let PRE = null;
  const BOXF = [['r', 0, 1, [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], ['l', 0, -1, [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]], ['t', 1, 1, [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]],
    ['b', 1, -1, [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]], ['f', 2, 1, [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]], ['k', 2, -1, [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]]];
  A.Writer = Writer;
  A.writer = (o) => new Writer(o);

  // sky visibility under a roof: a rectangle (half-sizes a, b about cx, cz) or a disc (r) whose eave is at height y.
  // (o.slope: the roof climbs this much per metre inward.)  Points below and inside lose sky by how deep under the edge
  // they sit; down-facing surfaces keep the light that
  // comes up from the ground.  → a function for writer({ sky }).
  A.eaveAO = (o) => { const { a, b, r, y, cx = 0, cz = 0, min = 0.3, ground = 0.78 } = o;
    return (x, yy, z, nx, ny) => { const d = r ? r - Math.hypot(x - cx, z - cz) : Math.min(a - Math.abs(x - cx), b - Math.abs(z - cz)); if (d <= 0) return 1; const h = y + (o.slope || 0) * d - yy; if (h <= 0) return 1;
      const vis = h / (h + 1.15 * d), dn = sat(0.5 - ny * 0.5); return (min + (1 - min) * Math.pow(vis, 0.8)) * (1 - dn) + ground * dn; }; };

  // triangles whose winding disagrees with their vertex normals (inside-out faces) — a build-time check
  A.audit = (group) => { let tris = 0, flipped = 0; group.traverse((m) => { if (!m.isMesh) return; const P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array, I = m.geometry.index.array;
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, n = cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]);
      const d = n[0] * (N[a] + N[b] + N[c]) + n[1] * (N[a + 1] + N[b + 1] + N[c + 1]) + n[2] * (N[a + 2] + N[b + 2] + N[c + 2]); tris++; if (d < 0) flipped++; } }); return { tris, flipped }; };

  // ── curved roofs ─────────────────────────────────────────────────────────────────────────────────────────────
  // The roof is one height function over the plan.  t is the slope parameter (0 at the eave line, 1 at the ridge):
  //   y = y0 + rise·(k·t + (1−k)·t^e)                        the sag of the slope: k = share that is a straight pitch
  //     + lift · c · (1−t)^liftFall                          the eave rising toward the corners
  //   c = (|s|/half-length)^liftPow at the eave, falling to 0 inward; the plan is scaled by (1 + flare·c) so the eave
  //   line also bows outward at the corners.  Every part (tiles, boards, rafters, ridges) asks this one function.
  // o: type 'hip' | 'gablehip' | 'gable' | 'poly';  a, b half-sizes of the eave rectangle (a ≥ b, ridge along x) or
  //   n, radius (apothem), rot for polygons;  y eave height, rise;  curve {k, e};  lift, liftPow, liftFall, flare;
  //   gable (share of the end slope's run below the gable wall, 'gablehip')
  A.roofSurface = (o) => {
    const type = o.type || 'hip', n = type === 'poly' ? o.n || 6 : 4, y0 = o.y || 0, H = o.rise ?? 4, ck = o.curve?.k ?? 0.6, ce = o.curve?.e ?? 2.2;
    const lift = o.lift ?? 0.6, lp = o.liftPow ?? 2.6, lf = o.liftFall ?? 2.2, flare = o.flare ?? 0.035, faces = [], hips = [], rot = o.rot || 0;
    let a = 0, b = 0, g = 1, xg = 0, A0 = 0;
    if (type === 'poly') { A0 = o.radius; const hl = A0 * Math.tan(PI / n), Rc = A0 / Math.cos(PI / n);
      for (let k = 0; k < n; k++) { const an = rot + k * TAU / n, nx = Math.sin(an), nz = Math.cos(an), ac = an + PI / n; faces.push({ k, n: [nx, nz], u: [nz, -nx], o: [nx * A0, nz * A0], hl, run: A0, tan: Math.tan(PI / n), tMax: 1 });
        hips.push({ at: (t) => [Math.sin(ac) * Rc * (1 - t), Math.cos(ac) * Rc * (1 - t)], top: 1, dir: [Math.sin(ac), Math.cos(ac)] }); } }
    else { a = o.a; b = o.b; g = type === 'hip' ? 1 : type === 'gablehip' ? o.gable ?? 0.46 : 0; xg = type === 'gable' ? a : a - g * b; const tn = type === 'gable' ? 0 : 1;
      faces.push({ k: 0, n: [0, 1], u: [1, 0], o: [0, b], hl: a, run: b, tan: tn, tMax: 1, long: true }, { k: 1, n: [0, -1], u: [-1, 0], o: [0, -b], hl: a, run: b, tan: tn, tMax: 1, long: true });
      if (type !== 'gable') { faces.push({ k: 2, n: [1, 0], u: [0, -1], o: [a, 0], hl: b, run: b, tan: 1, tMax: g }, { k: 3, n: [-1, 0], u: [0, 1], o: [-a, 0], hl: b, run: b, tan: 1, tMax: g });
        for (const sx of [1, -1]) for (const sz of [1, -1]) hips.push({ at: (t) => [sx * (a - t * b), sz * (b - t * b)], top: g, dir: [sx * Math.SQRT1_2, sz * Math.SQRT1_2], sx, sz }); } }
    const rise = (t) => H * (ck * t + (t > 0 ? (1 - ck) * Math.pow(t, ce) : 0));
    const cornerC = type === 'poly'
      ? (px, pz) => { let best = -1e9, s = 0; for (const F of faces) { const d = px * F.n[0] + pz * F.n[1]; if (d > best) { best = d; s = px * F.u[0] + pz * F.u[1]; } } return Math.pow(Math.min(1.3, Math.abs(s) / faces[0].hl), lp) * Math.pow(Math.max(0, best / A0), lp); }
      : (px, pz) => Math.pow(Math.min(1.3, Math.abs(px) / a), lp) * Math.pow(Math.min(1.3, Math.abs(pz) / b), lp);
    const surf = (px, pz, t, out = [0, 0, 0]) => { const c = cornerC(px, pz), k = 1 + flare * c; out[0] = px * k; out[1] = y0 + rise(t) + lift * c * Math.pow(Math.max(0, 1 - t), lf); out[2] = pz * k; return out; };
    const P0 = (F, s, t, out) => surf(F.o[0] + F.u[0] * s - F.n[0] * t * F.run, F.o[1] + F.u[1] * s - F.n[1] * t * F.run, t, out);
    const q1 = [0, 0, 0], q2 = [0, 0, 0], q3 = [0, 0, 0], q4 = [0, 0, 0];
    // the surface's own frame at (s, t): S along the eave, T up the slope, N out of the roof
    const frame = (F, s, t) => { P0(F, s - 0.02, t, q1); P0(F, s + 0.02, t, q2); P0(F, s, t - 0.004, q3); P0(F, s, t + 0.004, q4); const S = norm(sub(q2, q1)), T = norm(sub(q4, q3)); return { S, T, N: norm(cross(S, T)) }; };
    // a point of the roof: face F, s metres along the eave from its middle, slope t, raised `off` along the normal, lowered `drop`
    const P = (F, s, t, off = 0, drop = 0, out = [0, 0, 0]) => { P0(F, s, t, out); if (off) { const N = frame(F, s, t).N; out[0] += N[0] * off; out[1] += N[1] * off; out[2] += N[2] * off; } out[1] -= drop; return out; };
    const sMax = (F, t) => Math.max(0, F.hl - t * F.run * F.tan);                 // half-length of the face at slope t
    const tEnd = (F, s) => { const as = Math.abs(s); if (type === 'poly') return Math.max(0, 1 - as / F.hl); if (type === 'gable') return 1; if (F.long) return as <= xg + 1e-6 ? 1 : Math.max(0, (a - as) / b); return Math.min(F.tMax + (type === 'gablehip' ? o.tuck ?? 0.07 : 0), Math.max(0, (b - as) / b)); };
    const hipP = (h, t, drop = 0, out = [0, 0, 0]) => { const q = h.at(t); surf(q[0], q[1], t, out); out[1] -= drop; return out; };
    const R = { type, n, faces, hips, surf, P, frame, sMax, tEnd, hipP, rise, cornerC, y0, H, a, b, g, xg, A0, lift };
    // a band round the whole roof between two offset curves (t, drop) — boards, fascias, soffits.  drops may be (F, s, t) → m
    R.ring = (W, tA, dA, tB, dB, mode, step = 0.5) => { const tmp = [0, 0, 0];
      for (const F of faces) { const ns = Math.max(2, Math.ceil(2 * F.hl / step)) + 1, hw = 0.5 * Math.hypot((tB - tA) * F.run, (typeof dB === 'number' ? dB : 0) - (typeof dA === 'number' ? dA : 0)) || 0.05, K = W.K; W.K = [K[0], hw, 2 * F.hl, K[3]];
        W.grid(ns, 2, (i, j, out) => { const t = j ? tB : tA, s = (-1 + 2 * i / (ns - 1)) * sMax(F, t), d = j ? dB : dA; P(F, s, t, 0, typeof d === 'function' ? d(F, s, t) : d, tmp); out[0] = tmp[0]; out[1] = tmp[1]; out[2] = tmp[2];
          if (mode === 'out') { out[3] = F.n[0]; out[4] = 0.08; out[5] = F.n[1]; } else { const N = frame(F, s, t).N, k = mode === 'up' ? 1 : -1; out[3] = N[0] * k; out[4] = N[1] * k; out[5] = N[2] * k; }
          out[6] = s + F.hl; out[7] = j ? hw : -hw; }); W.K = K; }
      return W; };
    return R;
  };

  // A.roof(W, o) — everything of a tiled roof.  o = the roofSurface options plus:
  //   tile { w row width, r cover radius, seg (≤ 8 along the slope), round (sides of the half-round), sag, over, lap } | tiles: false
  //   eave { double, wall (m from eave edge to the wall line), inner (m the rafters run on inside it), rafter {r, step},
  //          fly {w, h, len}, hip {w, h} } | eave: false;   ceiling: false to leave the inside open
  //   ridge { w, h, rise (ends higher), style 'tiles' | 'plaster', ext }, hipRidge { w, h }, figures (per hip ridge)
  //   kinds { rafter, rafterEnd, fly, flyEnd, board, soffit, hip, hipEnd, ceil, gable, barge }  timber kinds for the film's pattern
  //   paints { rafter, rafterEnd, fly, flyEnd, fascia, fascia2, soffit, hip, hipEnd, ceil, gable, barge }
  // Tile-family kinds (the kit's tile material): 0 pan row, 1 cover row, 2 round eave cap, 3 drip plate, 4 stacked ridge
  // courses, 5 plaster, 6 ornament, 7 ridge cover.
  // → R (the surface) with R.anchors { eaveCorners, hipTips, ridgeEnds, apex, eaveY } and R.eavePoint(face, σ −1..1, drop).
  A.roof = (W, o) => {
    const R = A.roofSurface(o), { faces, P, frame, sMax, tEnd, hips, hipP, type } = R, tmp = [0, 0, 0], rr = DR.rng((o.seed || 1) * 7 + 3);
    const tl = { w: 0.36, r: 0.08, seg: 8, round: 6, sag: 0.022, over: 0.07, cap: true, ...(o.tile || {}) };
    const ev = { double: true, wall: 1.8, inner: 0.9, ...(o.eave || {}) }; ev.rafter = { r: 0.075, step: 0.31, ...(o.eave?.rafter || {}) }; ev.fly = { w: 0.085, h: 0.105, len: 0.55, ...(o.eave?.fly || {}) }; ev.hip = { w: 0.22, h: 0.28, ...(o.eave?.hip || {}) };
    const kd = { rafter: 0, rafterEnd: 0, fly: 0, flyEnd: 0, board: 0, soffit: 0, hip: 0, hipEnd: 0, ceil: 0, gable: 0, barge: 0, ...(o.kinds || {}) };
    const pt = { rafter: '#4f8a72', rafterEnd: '#4f8a72', fly: '#4f8a72', flyEnd: '#2d5fa8', fascia: '#4f8a72', fascia2: '#7b3324', soffit: '#3f7f6a', hip: '#4f8a72', hipEnd: '#7b3324', ceil: '#3f7f6a', gable: '#d8d2c0', barge: '#7b3324', ...(o.paints || {}) };
    const run0 = faces[0].run, q = (m) => m / run0, A_ = (R.anchors = {});
    const lerp3 = (p, r, f) => [p[0] + (r[0] - p[0]) * f, p[1] + (r[1] - p[1]) * f, p[2] + (r[2] - p[2]) * f];

    // ── tiles: each row is half a pan, a half-round cover, half a pan; the seam between rows is the middle of a pan ──
    const row = (F, sa, sb, t0) => { const w = sb - sa, sc = (sa + sb) / 2, r = Math.min(tl.r, w * 0.3), cy = tl.sag * 0.5, rs = rr();
      const tm = Math.max(tEnd(F, sa), tEnd(F, sb), tEnd(F, sc)); if (tm <= 0.004) return;
      const panL = [], panR = [], cov = [];
      for (let i = 0; i <= 2; i++) { const f = i / 2, x = -w / 2 + f * (w / 2 - r), sl = 2 * tl.sag * f / (w / 2 - r), l = Math.hypot(sl, 1); panL.push([x, tl.sag * f * f, -sl / l, 1 / l, 0.66 - 0.2 * f]); panR.unshift([-x, tl.sag * f * f, sl / l, 1 / l, 0.66 - 0.2 * f]); }
      for (let i = 0; i <= tl.round; i++) { const th = PI - i * PI / tl.round; cov.push([r * Math.cos(th), cy + r * Math.sin(th), Math.cos(th), Math.sin(th), 0.55 + 0.45 * Math.sin(th)]); }
      const M = Math.max(1, Math.min(tl.seg, Math.ceil(tl.seg * Math.pow(tm, 0.7))));
      for (const [strip, kind] of [[panL, 0], [cov, 1], [panR, 0]]) { W.kind(kind, w / 2, 0, rs); const cols = strip.map((c) => ({ c, te: Math.max(t0 + 1e-4, tEnd(F, sc + c[0])), d: 0, p: [0, 0, 0] }));
        W.grid(strip.length, M + 1, (i, j, out) => { const cq = cols[i], c = cq.c, t = t0 + (cq.te - t0) * j / M, s = sc + c[0], f = frame(F, s, t); P(F, s, t, 0, 0, tmp);
          const x = tmp[0] + f.N[0] * c[1], y = tmp[1] + f.N[1] * c[1], z = tmp[2] + f.N[2] * c[1]; cq.d = j ? cq.d + Math.hypot(x - cq.p[0], y - cq.p[1], z - cq.p[2]) : 0; cq.p[0] = x; cq.p[1] = y; cq.p[2] = z;
          out[0] = x; out[1] = y; out[2] = z; out[3] = f.S[0] * c[2] + f.N[0] * c[3]; out[4] = f.S[1] * c[2] + f.N[1] * c[3]; out[5] = f.S[2] * c[2] + f.N[2] * c[3]; out[6] = cq.d; out[7] = c[0] + w / 2; out[8] = c[4]; W.bed(f.N); }, false); }
      if (!tl.cap) return;
      // the round end tile of the cover and the drip plates of the two half pans
      const f0 = frame(F, sc, t0), D = [-f0.T[0], -f0.T[1], -f0.T[2]], c0 = P(F, sc, t0, cy), Rd = r * 1.14, nd = 10; W.kind(2, Rd, 0, rs).bed(D);
      const ctr = W.v(c0[0] + D[0] * 0.012, c0[1] + D[1] * 0.012, c0[2] + D[2] * 0.012, D[0], D[1], D[2], 0, 0, 0.95), ring = [];
      for (let i = 0; i < nd; i++) { const an = i * TAU / nd, cx = Math.cos(an) * Rd, sy = Math.sin(an) * Rd; ring.push(W.v(c0[0] + f0.S[0] * cx + f0.N[0] * sy, c0[1] + f0.S[1] * cx + f0.N[1] * sy, c0[2] + f0.S[2] * cx + f0.N[2] * sy, D[0] + 0.5 * (f0.S[0] * cx + f0.N[0] * sy) / Rd, D[1] + 0.5 * (f0.S[1] * cx + f0.N[1] * sy) / Rd, D[2] + 0.5 * (f0.S[2] * cx + f0.N[2] * sy) / Rd, cx, sy, 0.9)); }
      for (let i = 0; i < nd; i++) W.tri(ctr, ring[i], ring[(i + 1) % nd]);
      for (const strip of [panL, panR]) { W.kind(3, 0.03, 0, rs); W.grid(3, 2, (i, j, out) => { const c = strip[i], dep = j ? 0.03 + 0.035 * Math.abs(c[0]) / (w / 2) : -0.004; P(F, sc + c[0], t0, c[1], 0, tmp);
        out[0] = tmp[0] - f0.N[0] * dep; out[1] = tmp[1] - f0.N[1] * dep; out[2] = tmp[2] - f0.N[2] * dep; out[3] = D[0]; out[4] = D[1]; out[5] = D[2]; out[6] = c[0]; out[7] = dep; out[8] = j ? 0.7 : 0.9; }); } };
    if (o.tiles !== false) { W.fam('tile');
      for (const F of faces) { const t0 = -tl.over / F.run, spans = [], fit = (s0, s1) => { const nr = Math.max(1, Math.round((s1 - s0) / tl.w)); for (let i = 0; i < nr; i++) spans.push([s0 + (s1 - s0) * i / nr, s0 + (s1 - s0) * (i + 1) / nr]); };
        if (F.long && type === 'gablehip') { fit(-R.a, -R.xg); fit(-R.xg, R.xg); fit(R.xg, R.a); } else fit(-F.hl, F.hl);     // the gable verge lands on a row seam
        for (const sp of spans) row(F, sp[0], sp[1], t0); } }

    // ── the eave from below: tile seat, eave boards, flying rafters over round rafters, soffit boards, hip beams ──
    const dbl = ev.double, r0 = ev.rafter.r, fh = ev.fly.h, tGmax = (type === 'gablehip' ? R.g : type === 'poly' ? 0.85 : 1) - 0.03;
    const tIn = Math.min(q(ev.wall + ev.inner), tGmax), tr = dbl ? q(ev.fly.len) : 0, dB = dbl ? 0.10 : 0.11, dF = dB + fh, dC = dbl ? dF + 0.06 : dB;   // drops: flying-rafter top / bottom, round-rafter top
    const rafterDrop = dC + r0, soffitDrop = dC + 0.012;
    if (o.eave !== false) { W.fam('timber').shade(1);
      W.paint(pt.fascia).kind(kd.board); R.ring(W, -tl.over / run0, 0.004, 0, 0.0, 'down');
      if (dbl) { W.paint(pt.fascia2); R.ring(W, 0, 0, 0, 0.045, 'out'); W.paint(pt.fascia); R.ring(W, 0, 0.045, 0, dB, 'out'); R.ring(W, 0, dB, q(0.06), dB, 'down');
        W.paint(pt.soffit).kind(kd.soffit); R.ring(W, q(0.06), dB + 0.004, tr + q(0.04), dB + 0.004, 'down');
        W.paint(pt.fascia).kind(kd.board); R.ring(W, tr + q(0.04), dB, tr + q(0.04), dF, 'out'); R.ring(W, tr, dF, tr, dC, 'out'); R.ring(W, tr, dC, tr + q(0.08), dC, 'down'); R.ring(W, tr, dF, tr + q(0.04), dF, 'up');
        W.paint(pt.soffit).kind(kd.soffit); R.ring(W, tr + q(0.08), soffitDrop, tIn, soffitDrop, 'down');
      } else { W.paint(pt.fascia2); R.ring(W, 0, 0, 0, 0.05, 'out'); W.paint(pt.fascia); R.ring(W, 0, 0.05, 0, dB, 'out'); R.ring(W, 0, dB, q(0.07), dB, 'down'); W.paint(pt.soffit).kind(kd.soffit); R.ring(W, q(0.07), soffitDrop, tIn, soffitDrop, 'down'); }
      // rafters: square to the eave along the sides, fanning toward the hip near the corners
      const each = (tTip, tInn, emit) => { for (const F of faces) { const sm = sMax(F, tTip), cnt = Math.max(1, Math.round(2 * sm / ev.rafter.step)), sf = sMax(F, tIn);
        for (let k = 0; k < cnt; k++) { const s = -sm + (k + 0.5) * 2 * sm / cnt; let s1 = s, t1 = tInn, fan = false;
          if (F.tan > 0 && Math.abs(s) > sf) { const f = Math.min(1, (tInn - tTip) / (tIn - tTip)) * 0.94; s1 = s + (Math.sign(s) * sf - s) * f; t1 = tTip + (tIn - tTip) * f; fan = true; }
          emit(F, s, tTip, s1, t1, fan, rr()); } } };
      const tTipR = dbl ? tr - q(0.05) : q(0.03);
      each(tTipR, tIn, (F, s, t, s1, t1, fan, sd) => { const path = [0, 0.5, 1].map((f) => P(F, s + (s1 - s) * f, t + (t1 - t) * f, 0, rafterDrop));
        W.paint(pt.rafter).kind(kd.rafter, r0, 0, sd).tube(path, (u) => r0 * (fan ? 1 - 0.3 * u : 1), { seg: o.eave?.rafter?.seg || 7, caps: 's', capKind: kd.rafterEnd, capPaint: pt.rafterEnd, up: [0, -1, 0] }); });
      if (dbl) each(q(0.012), tr + q(0.32), (F, s, t, s1, t1, fan, sd) => { const a = P(F, s, t, 0, dB + fh / 2), b = P(F, s1, t1, 0, dB + fh / 2 - 0.01);
        W.paint(pt.fly).kind(kd.fly, 0, 0, sd).beam(a, b, ev.fly.w, fh, { endKind: kd.flyEnd, endPaint: pt.flyEnd, skip: 'tr' }); });
      // hip beams (and the upper one of a double eave); their tips carry the wind chimes
      A_.hipTips = [];
      for (const h of hips) { const hw = ev.hip.w, hh = ev.hip.h, rect = (w, hgt) => [[-w / 2, -hgt / 2], [w / 2, -hgt / 2], [w / 2, hgt / 2], [-w / 2, hgt / 2]];
        const t0 = dbl ? tr - q(0.16) : -q(0.02), d0 = dC + hh / 2 - 0.03, pathA = [0, 0.2, 0.45, 0.7, 1].map((f) => hipP(h, t0 + (tIn + q(0.25) - t0) * f, d0));
        W.paint(pt.hip).kind(kd.hip, hh / 2, 0, rr()).sweep(rect(hw, hh), pathA, { caps: 's', endKind: kd.hipEnd, endPaint: pt.hipEnd });
        let tip = pathA[0];
        if (dbl) { const t2 = -q(0.03), d2 = dB + 0.085, pathB = [0, 0.35, 1].map((f) => hipP(h, t2 + (tr + q(0.55) - t2) * f, d2)); W.paint(pt.hip).kind(kd.hip, 0.09, 0, rr()).sweep(rect(hw * 0.8, 0.17), pathB, { caps: 's', endKind: kd.hipEnd, endPaint: pt.hipEnd }); tip = pathB[0]; }
        A_.hipTips.push([tip[0] - h.dir[0] * 0.12, tip[1] - (dbl ? 0.085 : hh / 2), tip[2] - h.dir[1] * 0.12]); }
      if (o.ceiling !== false && type !== 'gable') { W.paint(pt.ceil).kind(kd.ceil); const yc = P(faces[0], 0, tIn, 0, soffitDrop)[1];
        for (const F of faces) { const ns = Math.max(2, Math.ceil(2 * F.hl / 0.5)) + 1; let prev = null; for (let i = 0; i < ns; i++) { const s = (-1 + 2 * i / (ns - 1)) * sMax(F, tIn), p = P(F, s, tIn, 0, soffitDrop); if (prev) W.poly([[0, yc, 0], prev, p], { hint: [0, -1, 0], uvs: [[0, 0], [prev[0], prev[2]], [p[0], p[2]]] }); prev = p; } } }
    }
    R.eave = { tIn, tr, dB, dF, dC, rafterDrop, soffitDrop, q };
    R.eavePoint = (fi, sg, drop = 0, t = 0) => { const F = faces[fi]; return P(F, sg * sMax(F, t), t, 0, drop); };
    A_.eaveCorners = hips.map((h) => hipP(h, 0)); A_.eaveY = R.y0;

    // ── ridges: a stacked wall of tile courses (or plaster) under a cover row, higher at its ends; end tiles ──
    const rg = { w: 0.34, h: 0.4, rise: 0.22, style: 'tiles', ext: 0.1, ...(o.ridge || {}) }, hr = { w: 0.27, h: 0.25, rise: 0.06, ...(o.hipRidge || {}) }, crest = tl.sag + tl.r * 0.55;
    const ridge = (path, w, h, hf, ends) => { W.fam('tile').bed([0, 1, 0]); const cr = Math.min(0.085, w * 0.3), hb = h - cr, sd = rr(), body = rg.style === 'plaster' ? 5 : 4, scale = (i, u) => [1, hf(u)];
      W.kind(body, h / 2, 0, sd).sweep([[w / 2, -0.09], [w * 0.46, hb], [cr, hb]], path, { open: true, scale, crease: 20 }).sweep([[-cr, hb], [-w * 0.46, hb], [-w / 2, -0.09]], path, { open: true, scale, crease: 20 });
      const cov = []; for (let i = 0; i <= 6; i++) { const th = i * PI / 6; cov.push([cr * Math.cos(th), hb + cr * Math.sin(th)]); } W.kind(7, cr, 0, sd).sweep(cov, path, { open: true, scale, crease: 60 });
      const n = path.length;
      for (const [key, i, j] of [['s', 0, 1], ['e', n - 1, n - 2]]) { if (!ends.includes(key)) continue; const p = path[i], T = norm(sub(p, path[j])), Rv = norm(cross([0, 1, 0], T)), U = cross(T, Rv), k = hf(i ? 1 : 0), hh = h * k;
        W.push().frame(p, Rv, U, T); W.kind(body, h / 2, 0, sd).poly([[-w / 2, -0.09, 0], [w / 2, -0.09, 0], [w * 0.46, hb * k, 0], [-w * 0.46, hb * k, 0]], { hint: [0, 0, 1] });
        const sh = []; for (let a = 0; a <= 8; a++) { const th = a * PI / 8; sh.push([Math.cos(th) * w * 0.56, hh * 0.72 + Math.sin(th) * w * 0.5]); } sh.push([-w * 0.5, -0.02], [w * 0.5, -0.02]);
        W.kind(6, w * 0.56, 0, sd).move(0, 0, 0.02).rotX(-0.3).extrude(sh, 0.035, { z0: 0.0175 }); W.pop(); } };
    A_.ridgeEnds = null; A_.apex = [0, R.y0 + R.H, 0];
    if (o.ridge !== false && o.tiles !== false) {
      if (type !== 'poly') { const xr = (type === 'gable' ? R.a - 0.04 : R.xg) + rg.ext, yr = R.y0 + R.H + crest - 0.02, path = []; for (let i = 0; i <= 10; i++) path.push([-xr + 2 * xr * i / 10, yr, 0]);
        ridge(path, rg.w, rg.h, (u) => 1 + rg.rise / rg.h * Math.pow(Math.abs(2 * u - 1), 2.6), 'se'); A_.ridgeEnds = [[-xr, yr + rg.h + rg.rise, 0], [xr, yr + rg.h + rg.rise, 0]]; A_.apex = [0, yr + rg.h, 0]; }
      if (type === 'gablehip') for (const F of [faces[0], faces[1]]) for (const sx of [1, -1]) { const s = sx * (R.xg - hr.w * 0.3) * (F.k ? -1 : 1), path = []; for (let i = 0; i <= 6; i++) path.push(P(F, s, 0.985 + (R.g - 0.04 - 0.985) * i / 6, crest - 0.02)); ridge(path, hr.w, hr.h * 1.15, () => 1, 'e'); }
      const tLow = q(0.42);
      for (const h of hips) { const tTop = type === 'poly' ? 0.93 : h.top * (type === 'gablehip' ? 0.985 : 0.97), path = []; for (let i = 0; i <= 7; i++) { const p = hipP(h, tTop + (tLow - tTop) * i / 7); p[1] += crest - 0.02; path.push(p); }
        ridge(path, hr.w, hr.h, (u) => 1 + hr.rise / hr.h * Math.pow(u, 3), 'e');
        for (let i = 0; i < (o.figures || 0); i++) { const p = hipP(h, tLow + q(0.5 + 0.4 * i)); W.fam('tile').kind(6, 0.05, 0, rr()).bed([0, 1, 0]).push().move(p[0], p[1] + crest + hr.h - 0.03, p[2]).rotY(Math.atan2(h.dir[0], h.dir[1]))
          .lathe([[0.055, 0], [0.06, 0.05], [0.036, 0.12], [0.05, 0.16], [0.03, 0.21], [0, 0.23]], { seg: 6, mod: (an) => 1 + 0.25 * Math.cos(an - PI / 2) }).pop(); } }
    }
    // ── the gable of a hip-and-gable roof: wall and barge boards; a plain gable roof gets barge boards only ──
    if (type === 'gablehip' && o.gableWall !== false) { W.fam('timber'); const zg = R.b * (1 - R.g), inset = o.gableInset ?? 0.32;
      for (const sx of [1, -1]) { const xw = sx * (R.xg - inset), yb = R.surf(xw, zg, R.g)[1] - 0.25, nz = 12; W.paint(pt.gable).kind(kd.gable, zg, 2 * zg, 0.3 + 0.2 * sx).shade(0.85);
        W.grid(nz + 1, 2, (i, j, out) => { const z = -zg + 2 * zg * i / nz, yt = R.surf(xw, z, (R.b - Math.abs(z)) / R.b)[1] - 0.03; out[0] = xw; out[1] = j ? Math.max(yt, yb) : yb; out[2] = z; out[3] = sx; out[4] = 0; out[5] = 0; out[6] = z + zg; out[7] = (j ? Math.max(yt, yb) : yb) - yb; });
        W.shade(1); for (const F of [faces[0], faces[1]]) { const s = sx * (R.xg - 0.03) * (F.k ? -1 : 1), path = []; for (let i = 0; i <= 6; i++) path.push(P(F, s, R.g - 0.05 + (1.0 - R.g + 0.05) * i / 6, 0, 0.2)); W.paint(pt.barge).kind(kd.barge, 0.16, 0, rr()).sweep([[-0.035, -0.16], [0.035, -0.16], [0.035, 0.16], [-0.035, 0.16]], path, { caps: 'se' }); } } }
    if (type === 'gable' && o.eave !== false) { W.fam('timber'); for (const F of faces) for (const sx of [1, -1]) { const path = []; for (let i = 0; i <= 6; i++) path.push(P(F, sx * (R.a - 0.04), -q(0.03) + (1 + q(0.03)) * i / 6, 0, 0.2)); W.paint(pt.barge).kind(kd.barge, 0.16, 0, rr()).sweep([[-0.035, -0.16], [0.035, -0.16], [0.035, 0.16], [-0.035, 0.16]], path, { caps: 'se' }); } }
    W.shade(1);
    return R;
  };

  // a roof of one stone: the same surface maths with a thick eave face, a flat underside and a flat top where the next
  // stone sits.  o = roofSurface options (type 'poly' with n = 4 or 8, or 'hip') + thick (eave face height),
  // under (0..1: how much of the lift the bottom edge follows), tTop (slope t where the top is cut), tIn (underside inner edge)
  A.slabRoof = (W, o) => { const R = A.roofSurface(o), { faces, P, frame, sMax } = R, th = o.thick ?? 0.12, kb = o.under ?? 0.5, tTop = o.tTop ?? 0.7, tU = o.tIn ?? 0.45, tmp = [0, 0, 0], nt = o.seg || 5, K = W.K;
    const dBot = (F, s, t) => P(F, s, t)[1] - (R.y0 - th) - kb * R.lift * R.cornerC(...((p) => [p[0], p[2]])(P(F, s, 0)));
    for (const F of faces) { const ns = Math.max(2, Math.ceil(2 * F.hl / (o.step || 0.25))) + 1; W.K = [K[0], F.run / 2, 2 * F.hl, K[3]];
      W.grid(ns, nt + 1, (i, j, out) => { const t = tTop * j / nt, s = (-1 + 2 * i / (ns - 1)) * sMax(F, t), f = frame(F, s, t); P(F, s, t, 0, 0, tmp); out[0] = tmp[0]; out[1] = tmp[1]; out[2] = tmp[2]; out[3] = f.N[0]; out[4] = f.N[1]; out[5] = f.N[2]; out[6] = s + F.hl; out[7] = t * F.run; });
      const top = P(F, -sMax(F, tTop), tTop), top2 = P(F, sMax(F, tTop), tTop), yT = R.y0 + R.rise(tTop); W.poly([[0, yT, 0], [top[0], yT, top[2]], [top2[0], yT, top2[2]]], { hint: [0, 1, 0] }); }
    R.ring(W, 0, 0, 0, dBot, 'out', o.step || 0.25); R.ring(W, 0, dBot, tU, (F, s, t) => P(F, s, t)[1] - (R.y0 - th), 'down', o.step || 0.25); W.K = K; R.yBottom = R.y0 - th; R.yTop = R.y0 + R.rise(tTop); return R; };

  // ── hanging things: a pendulum in closed form ────────────────────────────────────────────────────────────────
  // No state: the tilt of a lantern or chime is a function of film time — a lean into the wind (saturating), a sway
  // at its own frequency √(g/L) whose size follows the wind and the gust field the trees use, and the ring-down of
  // each event in a small table { t0, strength (rad), dir: [x, z], at: [x, z]?, speed? } (a gust front or a shock that
  // arrives at t0 — later further along `dir` when `at` and `speed` are given).  The same maths runs per vertex in the
  // metal material and here on the CPU.
  const NEV = 6, NPOOL = 4;
  A.SWING_GLSL = /* glsl */`
    uniform vec4 uArchEvA[${NEV}]; uniform vec4 uArchEvB[${NEV}];
    vec2 archSwing(vec3 p, float L, float s){
      float w = sqrt(9.81 / max(L, 0.05)) * (0.92 + 0.16 * s);
      vec2 dir = uWind.xy, cr = vec2(-dir.y, dir.x);
      float gust = texture2D(uNoise, (p.xz - dir * uWind.w * 9.0) / 190.0).r;
      float S = uWind.z * (0.35 + 1.3 * gust);
      float lean = 0.40 * S / (1.0 + 0.55 * S), amp = 0.03 + 0.17 * S / (1.0 + 0.4 * S), ph = uTime * w + s * 37.0;
      float slow = 0.6 + 0.4 * sin(uWind.w * 1.3 + s * 11.0 + dot(p.xz, dir) * 0.21);
      vec2 a = dir * (lean + amp * slow * sin(ph)) + cr * (amp * 0.55 * slow * sin(ph * 0.93 + s * 5.0));
      for (int i = 0; i < ${NEV}; i++) {
        vec4 e = uArchEvA[i], f = uArchEvB[i];
        float tau = uTime - e.x - (f.z > 0.0 ? max(dot(p.xz - f.xy, e.zw), 0.0) / f.z : 0.0);
        if (tau > 0.0) a += e.zw * (e.y * (1.0 - exp(-tau * 6.0)) * (0.9 * exp(-0.5 * tau) * sin(w * tau) + tau * exp(-1.4 * tau)));
      }
      return a * (1.05 / (1.05 + length(a)));
    }`;
  A.swing = (t, seed = 0.5, wind = DR.U.uWind.value.z, o = {}) => { const L = o.L || 0.5, w = Math.sqrt(9.81 / Math.max(L, 0.05)) * (0.92 + 0.16 * seed), U = DR.U.uWind.value, dx = U.x, dz = U.y, p = o.pos || [0, 0], S = wind * (0.35 + 1.3 * 0.5);
    const lean = 0.40 * S / (1 + 0.55 * S), amp = 0.03 + 0.17 * S / (1 + 0.4 * S), ph = t * w + seed * 37, slow = 0.6 + 0.4 * Math.sin(U.w * 1.3 + seed * 11 + (p[0] * dx + p[1] * dz) * 0.21);
    let ax = dx * (lean + amp * slow * Math.sin(ph)) - dz * amp * 0.55 * slow * Math.sin(ph * 0.93 + seed * 5), az = dz * (lean + amp * slow * Math.sin(ph)) + dx * amp * 0.55 * slow * Math.sin(ph * 0.93 + seed * 5);
    for (const e of o.events || []) { const d = e.dir || [1, 0]; let tau = t - e.t0; if (e.at && e.speed) tau -= Math.max(0, (p[0] - e.at[0]) * d[0] + (p[1] - e.at[1]) * d[1]) / e.speed; if (tau > 0) { const k = e.strength * (1 - Math.exp(-tau * 6)) * (0.9 * Math.exp(-0.5 * tau) * Math.sin(w * tau) + tau * Math.exp(-1.4 * tau)); ax += d[0] * k; az += d[1] * k; } }
    const m = 1.05 / (1.05 + Math.hypot(ax, az)); return [ax * m, az * m]; };

  // ── materials ────────────────────────────────────────────────────────────────────────────────────────────────
  // o.pattern: GLSL that defines
  //     void archPaint(inout vec3 col, inout float rough, inout float metal, vec2 uv, vec4 k, float px, vec3 op, vec3 on)
  //   — the culture's painted ornament for the timber family.  col arrives as the vertex paint (linear); uv is in metres
  //   (x along the member from its start, y across, 0 on the centre line); k = (kind, half-width, length, seed);
  //   px = metres per pixel here (fade detail that is smaller); op, on = object-space position and normal.
  // o.lamp {value}: level of every warm light (paper, silk lanterns, light pools).  o.events: the pendulum table (an array
  //   the film pushes to).  o.south [x, z]: the sun-faded side (object space, default +z).
  // M.pool(group, { a, b, color, k, r, yMin }): a line of warm light (object space of `group`, from a to b) that shines on
  //   timber and stone within ~4 r — the spill of a lit room or a row of lanterns.  The 4 strongest near the lens are used.
  A.materials = (o = {}) => {
    const u = (v) => ({ value: v }), lamp = o.lamp || u(1), events = o.events || [], V4 = () => new THREE.Vector4(), south = o.south || [0, 1];
    const evA = u(Array.from({ length: NEV }, V4)), evB = u(Array.from({ length: NEV }, V4)), pA = u(Array.from({ length: NPOOL }, V4)), pB = u(Array.from({ length: NPOOL }, V4)), pC = u(Array.from({ length: NPOOL }, V4)), pools = [];
    const pv = new THREE.Vector3(), pw = new THREE.Vector3();
    DR.onFrame((t, cam) => {
      const live = events.filter((e) => e.t0 <= t && t - e.t0 < 16).sort((x, y) => y.t0 - x.t0);
      for (let i = 0; i < NEV; i++) { const e = live[i]; if (e) { const d = e.dir || [1, 0], l = Math.hypot(d[0], d[1]) || 1; evA.value[i].set(e.t0, e.strength, d[0] / l, d[1] / l); evB.value[i].set(e.at ? e.at[0] : 0, e.at ? e.at[1] : 0, e.at ? e.speed || 0 : 0, 0); } else { evA.value[i].set(1e9, 0, 1, 0); evB.value[i].set(0, 0, 0, 0); } }
      const act = []; for (const p of pools) { p.group.updateWorldMatrix(true, false); pv.fromArray(p.a).applyMatrix4(p.group.matrixWorld); pw.fromArray(p.b).applyMatrix4(p.group.matrixWorld); const d = cam ? Math.min(pv.distanceTo(cam.position), pw.distanceTo(cam.position)) : 0; act.push({ p, a: pv.clone(), b: pw.clone(), w: p.k / (1 + d * 0.02) }); }
      act.sort((x, y) => y.w - x.w);
      for (let i = 0; i < NPOOL; i++) { const q = act[i]; if (q) { const sc = q.p.group.matrixWorld.getMaxScaleOnAxis(); pA.value[i].set(q.a.x, q.a.y, q.a.z, 1 / (q.p.r * q.p.r * sc * sc)); pB.value[i].set(q.b.x, q.b.y, q.b.z, q.a.y + (q.p.yMin ?? -1e3) * sc); pC.value[i].set(q.p.color[0] * q.p.k, q.p.color[1] * q.p.k, q.p.color[2] * q.p.k, 0); } else pC.value[i].set(0, 0, 0, 0); }
    }, 60);
    const vHead = 'attribute vec4 aCol; attribute vec4 aK; varying vec4 vCol; varying vec4 vK; varying vec3 vOPos;', vBody = 'vCol = aCol; vK = aK; vOPos = position;';
    const fVary = 'varying vec4 vCol; varying vec4 vK; varying vec3 vOPos; uniform float uLamp;';
    const POOL = /* glsl */`
      uniform vec4 uPoolA[${NPOOL}]; uniform vec4 uPoolB[${NPOOL}]; uniform vec4 uPoolC[${NPOOL}];
      vec3 archPools(vec3 p, vec3 n){ vec3 s = vec3(0.0);${DR.P.has('nopool') ? ' return s;' : ''}
        for (int i = 0; i < ${NPOOL}; i++) { vec3 a = uPoolA[i].xyz, ba = uPoolB[i].xyz - a, pa = p - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
          vec3 L = a + ba * h - p; float d2 = dot(L, L), k = d2 * uPoolA[i].w;
          s += uPoolC[i].rgb * (max(dot(n, L) * inversesqrt(d2 + 1e-4) * 0.7 + 0.3, 0.0) / (1.0 + k) * clamp(1.0 - k * 0.05, 0.0, 1.0) * smoothstep(uPoolB[i].w - 0.3, uPoolB[i].w + 0.3, p.y)); }
        return s * uLamp; }
      // sunlit ground throws light up under eaves and floors: without it the painted underside of a roof is only sky-lit
      vec3 archBounce(vec3 n, float ao){ return uKeyCol * (max(uKeyDir.y, 0.0) * 0.055 * (0.62 - 0.38 * n.y) * (0.4 + 0.6 * ao)); }`;
    const uni = { uLamp: lamp, uPoolA: pA, uPoolB: pB, uPoolC: pC };
    const M = { lamp, events };
    M.pool = (group, p) => { pools.push({ group, a: p.a, b: p.b || p.a, color: DR.rgb(p.color || '#ffb060'), k: p.k ?? 1, r: p.r ?? 2, yMin: p.yMin }); };

    // painted timber: the film's ornament, then weather — grain, sun-fade on the south side, grime in the creases the
    // baked AO marks, paint worn off the arrises, rain streaks down upright faces
    M.timber = DR.mat({ base: DR.P.get('tb') || 'standard', roughness: 0.74, metalness: 0, uniforms: uni, vHead, vBody, defines: { DR_WET: 1 },
      fHead: `${fVary}\n${POOL}\n${o.pattern || 'void archPaint(inout vec3 col, inout float rough, inout float metal, vec2 uv, vec4 k, float px, vec3 op, vec3 on){}'}`,
      fBody: /* glsl */`
        float aPx = uPx * length(vWPos - cameraPosition);
        vec3 aCl = vCol.rgb * vCol.rgb; float aRo = 0.74, aMe = 0.0;
        vec3 aOn = normalize(vONrm);
        archPaint(aCl, aRo, aMe, vUv0, vK, aPx, vOPos, aOn);
        ${DR.P.has('nowx') ? 'diffuseColor.rgb = aCl; drAO = vCol.a; if (false) {' : '{'}
        vec4 w1 = drN4(vec2(vUv0.x * 0.31 + vK.w * 7.0, vUv0.y * 3.1 + vK.w * 3.0));
        vec4 w2 = drN4(vOPos.xz * 0.13 + vOPos.y * 0.09);
        aCl *= 0.84 + 0.32 * w1.r;
        float aSouth = max(aOn.x * ${south[0].toFixed(3)} + aOn.z * ${south[1].toFixed(3)}, 0.0) * 0.65 + max(aOn.y, 0.0) * 0.5;
        float aL = dot(aCl, vec3(0.3, 0.5, 0.2));
        aCl = mix(aCl, vec3(aL) * 1.1 + 0.015, 0.34 * aSouth * (0.4 + 0.9 * w2.g));
        float aCr = 1.0 - vCol.a;
        aCl *= mix(vec3(1.0), vec3(0.50, 0.46, 0.42), drSat(aCr * 1.5 * (0.5 + w2.r)));
        float aEd = smoothstep(vK.y - 0.016, vK.y - 0.003, abs(vUv0.y)) * step(0.02, vK.y) * smoothstep(0.02, 0.004, aPx);
        aCl = mix(aCl, vec3(0.16, 0.115, 0.075), aEd * smoothstep(0.35, 0.7, w1.g) * 0.7);
        float aSt = drN4(vec2(dot(vOPos.xz, vec2(2.9, 2.3)), vOPos.y * 0.07)).b;
        aCl *= 1.0 - 0.25 * smoothstep(0.5, 0.85, aSt) * (1.0 - abs(N.y)) * (0.4 + 0.6 * w2.g);
        diffuseColor.rgb = aCl; roughnessFactor = aRo; metalnessFactor = aMe; drAO = vCol.a;
        drEmit += aCl * (archPools(vWPos, N) + archBounce(N, vCol.a)); }` });

    // stone: granite grain from the shared noise at two scales, block joints from the block's own metres, damp and moss
    // near the ground and on shaded up-facing faces, pale lichen.  kinds: 0 dressed block (uv = block face), 1 rubble
    // stone, 2 clay / earth mortar, 3 paving (joints drawn from uv: course = 2·hw, length = p), 4 carved (no joints)
    M.stone = DR.mat({ roughness: 0.9, metalness: 0, uniforms: uni, vHead, vBody, defines: { DR_WET: 1 }, fHead: `${fVary}\n${POOL}`,
      fBody: /* glsl */`
        float aPx = uPx * length(vWPos - cameraPosition), aKd = vK.x;
        vec3 aCl = vCol.rgb * vCol.rgb, aOn = normalize(vONrm), aAn = abs(aOn);
        vec2 gu = aAn.y > 0.6 ? vOPos.xz : (aAn.x > aAn.z ? vOPos.zy : vOPos.xy);
        vec4 g1 = drN4(gu * 0.9 + vK.w * 13.0), g2 = drN4(gu * 7.0 + vK.w * 5.0);
        float aNear = smoothstep(0.03, 0.004, aPx);
        aCl *= 1.0 + (g1.r - 0.5) * 0.3 + (g2.g - 0.5) * 0.5 * aNear;
        aCl *= 1.0 - 0.4 * smoothstep(0.80, 0.86, g2.b) * aNear;                           // dark mica
        aCl += 0.05 * smoothstep(0.82, 0.9, g2.r) * aNear;                                  // quartz
        vec2 bu = vUv0; float bl = vK.z, bh = vK.y * 2.0;
        if (aKd > 2.5 && aKd < 3.5) { float row = floor((vUv0.y + 100.0) / bh); bu = vec2(mod(vUv0.x + row * bl * 0.47, bl), mod(vUv0.y + 100.0, bh) - vK.y); aCl *= 0.94 + 0.12 * drHash(vec2(row, floor((vUv0.x + row * bl * 0.47) / bl))); }
        if (aKd < 0.5 || (aKd > 2.5 && aKd < 3.5)) { float ed = min(min(bu.x, bl - bu.x), vK.y - abs(bu.y)); float jf = smoothstep(0.05, 0.012, aPx);
          aCl *= mix(1.0, 0.62 + 0.38 * smoothstep(0.0, 0.03, ed), jf); N = normalize(N + (g2.xyz - 0.5) * 0.18 * aNear); }
        if (aKd > 0.5 && aKd < 1.5) { vec2 c = vec2(vUv0.x / max(bl, 0.01) - 0.5, vUv0.y / max(vK.y, 0.01) * 0.5); aCl *= 0.72 + 0.4 * (1.0 - dot(c, c) * 2.4); N = normalize(N + (g1.xyz - 0.5) * 0.35); }
        if (aKd > 1.5 && aKd < 2.5) { aCl *= 0.85 + 0.3 * g2.r; aCl = mix(aCl, vec3(0.5, 0.42, 0.24), smoothstep(0.7, 0.8, g2.a) * 0.4 * aNear); }
        float foot = smoothstep(1.1, 0.0, vOPos.y) * (0.5 + g1.g);
        aCl *= mix(vec3(1.0), vec3(0.62, 0.60, 0.55), drSat(foot * 0.8));
        float north = max(-(aOn.x * ${south[0].toFixed(3)} + aOn.z * ${south[1].toFixed(3)}), 0.0);
        float moss = drSat((g1.g - 0.50) * 5.0 + foot * 0.4 - 1.25 + north * 0.6) * (0.3 + 0.7 * max(N.y, 0.0) + 0.3 * north) * step(aKd, 3.5);
        aCl = mix(aCl, vec3(0.085, 0.12, 0.04) * (0.7 + 0.6 * g2.g), moss * 0.75);
        float lich = smoothstep(0.66, 0.72, g1.b) * smoothstep(0.42, 0.6, g2.r);
        aCl = mix(aCl, vec3(0.56, 0.57, 0.46), lich * 0.2);
        float aSt = drN4(vec2(dot(vOPos.xz, vec2(2.1, 1.7)), vOPos.y * 0.06)).b;
        aCl *= 1.0 - 0.22 * smoothstep(0.5, 0.85, aSt) * (1.0 - aAn.y);
        diffuseColor.rgb = aCl; roughnessFactor = 0.88; drAO = vCol.a;
        drEmit += aCl * (archPools(vWPos, N) + archBounce(N, vCol.a));` });

    // roof tile: unglazed grey-black clay, a little blue, each tile its own tone; the lap of tile over tile is drawn
    // from the metres along the slope; lichen; the relief of the rows fades into the bed when a row gets small on screen
    M.tile = DR.mat({ roughness: 0.8, metalness: 0, uniforms: { uLamp: lamp }, defines: { DR_WET: 1 },
      vHead: vHead + ' varying vec3 vBed;', vBody: vBody + ' vBed = normalize(mat3(modelMatrix) * (aCol.rgb * 2.0 - 1.0));', fHead: fVary + ' varying vec3 vBed;',
      fBody: /* glsl */`
        float aPx = uPx * length(vWPos - cameraPosition), aKd = vK.x;
        vec4 nA = drN4(vOPos.xz * 0.043 + vOPos.y * 0.031), nB = drN4(vUv0 * vec2(0.83, 2.1) + vK.w * 17.0);
        vec3 aCl = vec3(0.046, 0.050, 0.058); float aRo = 0.8; drAO = 1.0;
        if (aKd < 1.5) {
          float ln = vUv0.x / ${(o.lap || 0.3).toFixed(3)} + vK.w * 0.37, tu = fract(ln), th = drHash(vec2(floor(ln), floor(vK.w * 4096.0) + aKd * 7.0));
          aCl = mix(vec3(0.034, 0.037, 0.043), vec3(0.060, 0.066, 0.077), th);
          float lf = smoothstep(0.03, 0.12, aPx);
          aCl *= mix(0.5 + 0.5 * smoothstep(0.0, 0.16, tu), 0.86, lf);
          aCl = mix(aCl, aCl * 1.5 + 0.008, (1.0 - lf) * smoothstep(0.9, 0.99, tu) * 0.6);
          aRo = 0.68 + 0.24 * th;
          float fl = smoothstep(0.09, 0.34, aPx);
          N = normalize(mix(N, normalize(vBed), fl)); drAO = mix(vCol.a, 0.8, fl);
        } else if (aKd < 3.5) {
          float rr = length(vUv0) / max(vK.y, 1e-3); float near = smoothstep(0.02, 0.004, aPx);
          aCl *= 1.0 + near * (0.5 * smoothstep(0.12, 0.0, abs(rr - 0.8)) - 0.35 * smoothstep(0.10, 0.0, abs(rr - 0.58)) + 0.4 * smoothstep(0.3, 0.2, rr) * step(aKd, 2.5));
          drAO = vCol.a;
        } else if (aKd < 4.5) { float c = fract(vUv0.y / 0.05); aCl *= mix(0.55 + 0.6 * smoothstep(0.0, 0.3, c), 0.95, smoothstep(0.01, 0.04, aPx)); aCl *= 0.8 + 0.5 * drHash(vec2(floor(vUv0.y / 0.05), floor(vUv0.x / 0.33 + vK.w * 9.0)));
        } else if (aKd < 5.5) { aCl = vec3(0.56, 0.55, 0.50) * (0.78 + 0.3 * nB.r); aCl *= 1.0 - 0.45 * smoothstep(0.45, 0.8, drN4(vec2(vUv0.x * 0.9, vUv0.y * 0.25)).b); aRo = 0.9;
        } else if (aKd < 6.5) { aCl *= 0.9; }
        aCl *= 0.86 + 0.28 * nA.r;
        float lich = smoothstep(0.66, 0.76, nA.g) * smoothstep(0.45, 0.62, nB.r) * (aKd < 4.5 || aKd > 5.5 ? 1.0 : 0.3);
        aCl = mix(aCl, vec3(0.15, 0.16, 0.125), lich * 0.4);
        diffuseColor.rgb = aCl; roughnessFactor = aRo;` });

    // paper in a lattice: the bars are drawn (with their depth: they widen when seen from the side), the paper behind
    // glows from the room.  uv from the leaf's lower-left corner, hw = half the leaf's width, p = its height.
    // kinds: 0 bands of cross-bars on close uprights (ttisal), 1 square grid, 2 diagonal grid, 3 bare paper, 4 a flame's light
    M.paper = DR.mat({ roughness: 0.92, metalness: 0, uniforms: { uLamp: lamp }, vHead, vBody, fHead: fVary,
      fBody: /* glsl */`
        float aPx = uPx * length(vWPos - cameraPosition), aKd = vK.x, aa = max(aPx, 0.0012);
        vec3 aV = normalize(cameraPosition - vWPos), aT = normalize(cross(vec3(0.0, 1.0, 0.0), N) + 1e-5);
        float nv = max(abs(dot(aV, N)), 0.3), wx = 0.013 + 0.016 * abs(dot(aV, aT)) / nv, wy = 0.013 + 0.016 * abs(aV.y) / nv;
        vec2 uv = vUv0; float bar = 0.0, H = vK.z;
        if (aKd < 0.5) { float pv = 0.07; float xv = abs(fract(uv.x / pv + 0.5) - 0.5) * pv; float yb = uv.y / H, c = yb < 0.3 ? 0.13 : (yb < 0.7 ? 0.5 : 0.87), yy = uv.y - c * H;
          float yh = abs(fract(yy / 0.05 + 0.5) - 0.5) * 0.05; float inb = step(abs(yy), 0.05 * (c == 0.5 ? 2.6 : 2.1));
          bar = max(1.0 - smoothstep(wx * 0.5 - aa, wx * 0.5 + aa, xv), inb * (1.0 - smoothstep(wy * 0.5 - aa, wy * 0.5 + aa, yh)));
        } else if (aKd < 1.5) { vec2 q = abs(fract(uv / 0.105 + 0.5) - 0.5) * 0.105; bar = max(1.0 - smoothstep(wx * 0.5 - aa, wx * 0.5 + aa, q.x), 1.0 - smoothstep(wy * 0.5 - aa, wy * 0.5 + aa, q.y));
        } else if (aKd < 2.5) { vec2 d = vec2(uv.x + uv.y, uv.x - uv.y) * 0.7071; vec2 q = abs(fract(d / 0.085 + 0.5) - 0.5) * 0.085; float wd = (wx + wy) * 0.5; bar = max(1.0 - smoothstep(wd * 0.5 - aa, wd * 0.5 + aa, q.x), 1.0 - smoothstep(wd * 0.5 - aa, wd * 0.5 + aa, q.y)); }
        float fib = drN4(uv * 1.9 + vK.w * 9.0).r;
        vec3 paper = vec3(0.74, 0.70, 0.58) * (0.82 + 0.3 * fib), wood = vCol.rgb * vCol.rgb;
        float fl = 1.0 + 0.07 * sin(uTime * 8.3 + vK.w * 40.0) * sin(uTime * 5.1 + vK.w * 17.0) + 0.10 * (drN4(vec2(uTime * 0.23, vK.w * 3.7)).r - 0.5);
        vec2 hq = (uv - vec2(vK.y, H * 0.40)) / max(H, 0.1); float hot = 0.5 + 0.6 * exp(-dot(hq, hq) * 3.0);
        vec3 glow = (aKd > 3.5 ? vec3(1.0, 0.46, 0.13) * 5.0 * (fl * fl) : vec3(1.0, 0.56, 0.22) * 1.9 * hot * fl) * uLamp;
        diffuseColor.rgb = mix(paper, wood, bar); drAO = vCol.a; roughnessFactor = 0.92;
        drEmit = glow * (1.0 - bar) * (0.75 + 0.4 * fib) + glow * bar * 0.035;
        drThrough = paper * 0.45 * (1.0 - bar);` });

    // metal and what hangs: 0 bronze (green in the hollows), 1 iron, 2 gilt, 3 glowing silk (paint × lamp), 4 cord, tassel, dark wood.
    // Vertices written after W.pivot() swing about that point.
    M.metal = DR.mat({ roughness: 0.5, metalness: 0, uniforms: { uLamp: lamp, uArchEvA: evA, uArchEvB: evB }, depth: true, defines: { DR_WET: 1 },
      vHead: `${vHead} attribute vec4 aPiv;\n${A.SWING_GLSL}`,
      vBody: /* glsl */`${vBody}
        if (aPiv.w > 0.5) {
          float sL = floor(aPiv.w) / 64.0, sS = fract(aPiv.w);
          vec2 sa = archSwing((modelMatrix * vec4(aPiv.xyz, 1.0)).xyz, sL, sS);
          vec3 so = vec3(sa.x, 0.0, sa.y) * mat3(modelMatrix); float sm = length(so.xz) + 1e-6;
          vec3 sx = vec3(-so.z, 0.0, so.x) / sm; float sc = cos(sm), sn = sin(sm);
          vec3 sr = drPos - aPiv.xyz; drPos = aPiv.xyz + sr * sc + cross(sx, sr) * sn + sx * dot(sx, sr) * (1.0 - sc);
          drNrm = drNrm * sc + cross(sx, drNrm) * sn + sx * dot(sx, drNrm) * (1.0 - sc);
        }`,
      fHead: fVary,
      fBody: /* glsl */`
        float aKd = vK.x; vec3 aCl = vCol.rgb * vCol.rgb; vec4 mN = drN4(vOPos.xy * 3.0 + vOPos.z * 2.0 + vK.w);
        float aRo = 0.85, aMe = 0.0; drAO = vCol.a;
        if (aKd < 0.5) { aMe = 0.85; aRo = 0.42 + 0.2 * mN.r; aCl = mix(aCl, vec3(0.10, 0.26, 0.20), smoothstep(0.5, 0.75, mN.g + (1.0 - vCol.a) * 0.6) * 0.6); aMe *= 1.0 - 0.6 * smoothstep(0.5, 0.75, mN.g); }
        else if (aKd < 1.5) { aMe = 0.6; aRo = 0.6; aCl *= 0.8 + 0.4 * mN.r; }
        else if (aKd < 2.5) { aMe = 1.0; aRo = 0.34 + 0.2 * mN.r; }
        else if (aKd < 3.5) { float mid = 0.55 + 0.75 * smoothstep(0.0, 0.35, vUv0.x / max(vK.z, 0.01)) * smoothstep(1.0, 0.5, vUv0.x / max(vK.z, 0.01));
          float fl = 1.0 + 0.08 * sin(uTime * 7.7 + vK.w * 50.0) * sin(uTime * 4.3 + vK.w * 23.0);
          drEmit = aCl * (uLamp * 1.7 * mid * fl) + vec3(1.0, 0.5, 0.2) * (uLamp * 0.05 * mid); drThrough = aCl * 0.6; aCl *= 0.8; }
        diffuseColor.rgb = aCl; roughnessFactor = aRo; metalnessFactor = aMe;` });
    return M;
  };
}
