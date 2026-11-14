// dragon-realm · 10_geo — modelling from numbers: a signed-distance sculpting kit meshed with surface nets (heads,
// limbs, anything organic), tubes along curves (horns, whiskers, limbs), and merged static geometry.
{
  const { clamp, lerp } = DR;
  // ── signed distance shapes: each returns d(x, y, z); `b` is a bounding sphere [cx, cy, cz, r] used to skip work ──
  const SD = (DR.sd = {});
  SD.sphere = (c, r) => { const f = (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r; f.b = [c[0], c[1], c[2], r]; return f; };
  // ellipsoid with optional rotation (Euler XYZ radians)
  SD.ellipsoid = (c, r, rot) => {
    const m = rot ? new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]))).transpose().elements : null;
    const k = Math.min(r[0], r[1], r[2]);
    const f = (x, y, z) => { let px = x - c[0], py = y - c[1], pz = z - c[2]; if (m) { const a = m[0] * px + m[3] * py + m[6] * pz, b2 = m[1] * px + m[4] * py + m[7] * pz, c2 = m[2] * px + m[5] * py + m[8] * pz; px = a; py = b2; pz = c2; }
      const k0 = Math.hypot(px / r[0], py / r[1], pz / r[2]); if (k0 < 1e-6) return -k; const k1 = Math.hypot(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2])); return (k0 * (k0 - 1)) / k1; };
    f.b = [c[0], c[1], c[2], Math.max(r[0], r[1], r[2])]; return f; };
  // tapered capsule from a (radius ra) to b (radius rb)
  SD.capsule = (a, b, ra, rb = ra) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz || 1e-9;
    const f = (x, y, z) => { const px = x - a[0], py = y - a[1], pz = z - a[2], h = clamp((px * bx + py * by + pz * bz) / l2, 0, 1); return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - lerp(ra, rb, h); };
    f.b = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.sqrt(l2) / 2 + Math.max(ra, rb)]; return f; };
  // a chain of tapered capsules through points (a curved limb, a horn, a brow ridge): pts [[x,y,z,r], …]
  SD.chain = (pts, k = 0.05) => SD.union(pts.slice(1).map((p, i) => SD.capsule(pts[i], p, pts[i][3], p[3])), k);
  SD.box = (c, h, round = 0) => { const f = (x, y, z) => { const qx = Math.abs(x - c[0]) - h[0] + round, qy = Math.abs(y - c[1]) - h[1] + round, qz = Math.abs(z - c[2]) - h[2] + round; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round; }; f.b = [c[0], c[1], c[2], Math.hypot(h[0], h[1], h[2])]; return f; };
  const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  SD.smin = smin; SD.smax = smax;
  const bound = (fs, pad) => { let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9; for (const f of fs) { const b = f.b; if (!b) return null; x0 = Math.min(x0, b[0] - b[3]); y0 = Math.min(y0, b[1] - b[3]); z0 = Math.min(z0, b[2] - b[3]); x1 = Math.max(x1, b[0] + b[3]); y1 = Math.max(y1, b[1] + b[3]); z1 = Math.max(z1, b[2] + b[3]); }
    return [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + pad]; };
  // smooth union of many; shapes far from the point (beyond their bound + k) are skipped
  SD.union = (fs, k = 0.08) => { const f = (x, y, z) => { let d = 1e9; for (let i = 0; i < fs.length; i++) { const s = fs[i], b = s.b; if (b) { const far = Math.hypot(x - b[0], y - b[1], z - b[2]) - b[3]; if (far > d + k) continue; if (far > k * 2 + 0.5) { d = Math.min(d, far); continue; } } d = smin(d, s(x, y, z), k); } return d; }; f.b = bound(fs, k); return f; };
  SD.cut = (a, b, k = 0.05) => { const f = (x, y, z) => smax(a(x, y, z), -b(x, y, z), k); f.b = a.b; return f; };
  SD.both = (a, b, k = 0.05) => { const f = (x, y, z) => smax(a(x, y, z), b(x, y, z), k); f.b = a.b; return f; };
  SD.mirrorX = (s) => { const f = (x, y, z) => s(Math.abs(x), y, z); if (s.b) f.b = [0, s.b[1], s.b[2], s.b[3] + Math.abs(s.b[0])]; return f; };
  SD.displace = (s, fn) => { const f = (x, y, z) => s(x, y, z) + fn(x, y, z); f.b = s.b && [s.b[0], s.b[1], s.b[2], s.b[3] + 0.3]; return f; };

  // ── surface nets: sdf → BufferGeometry (position, normal).  cell = edge of a grid cell in the sdf's units. ──
  // opts: paint(x,y,z,nx,ny,nz) → [r,g,b] vertex colour; attr(x,y,z) → extra floats ('aMask' vec4)
  DR.meshSDF = (sdf, lo, hi, cell, opts = {}) => {
    const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
    const val = new Float32Array(nx * ny * nz), idx = (i, j, k) => (k * ny + j) * nx + i;
    // coarse skip: evaluate every 4th sample first; a block that is far from the surface is filled without evaluating
    const B = 4, far = cell * B * 1.8;
    for (let k = 0; k < nz; k += B) for (let j = 0; j < ny; j += B) for (let i = 0; i < nx; i += B) {
      const cx = lo[0] + (i + B / 2) * cell, cy = lo[1] + (j + B / 2) * cell, cz = lo[2] + (k + B / 2) * cell, d = sdf(cx, cy, cz), skip = Math.abs(d) > far;
      for (let kk = k; kk < Math.min(nz, k + B); kk++) for (let jj = j; jj < Math.min(ny, j + B); jj++) for (let ii = i; ii < Math.min(nx, i + B); ii++) val[idx(ii, jj, kk)] = skip ? d : sdf(lo[0] + ii * cell, lo[1] + jj * cell, lo[2] + kk * cell);
    }
    const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [], ind = [];
    const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0; for (let c = 0; c < 8; c++) { const v = val[idx(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; cv[c] = v; if (v < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of edges) { if (((mask >> a) & 1) === ((mask >> b) & 1)) continue; const t = cv[a] / (cv[a] - cv[b]); sx += lerp(corners[a][0], corners[b][0], t); sy += lerp(corners[a][1], corners[b][1], t); sz += lerp(corners[a][2], corners[b][2], t); n++; }
      vid[idx(i, j, k)] = pos.length / 3; pos.push(lo[0] + (i + sx / n) * cell, lo[1] + (j + sy / n) * cell, lo[2] + (k + sz / n) * cell);
    }
    const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) ind.push(a, c, b, a, d, c); else ind.push(a, b, c, a, c, d); };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const v0 = val[idx(i, j, k)] < 0;
      if (v0 !== val[idx(i + 1, j, k)] < 0) quad(vid[idx(i, j - 1, k - 1)], vid[idx(i, j, k - 1)], vid[idx(i, j, k)], vid[idx(i, j - 1, k)], !v0);
      if (v0 !== val[idx(i, j + 1, k)] < 0) quad(vid[idx(i - 1, j, k - 1)], vid[idx(i - 1, j, k)], vid[idx(i, j, k)], vid[idx(i, j, k - 1)], !v0);
      if (v0 !== val[idx(i, j, k + 1)] < 0) quad(vid[idx(i - 1, j - 1, k)], vid[idx(i, j - 1, k)], vid[idx(i, j, k)], vid[idx(i - 1, j, k)], !v0);
    }
    // snap to the surface (two Newton steps) and take normals from the field's gradient
    const P = new Float32Array(pos), N = new Float32Array(pos.length), e = cell * 0.5;
    for (let v = 0; v < P.length; v += 3) { let x = P[v], y = P[v + 1], z = P[v + 2], gx = 0, gy = 0, gz = 1;
      for (let it = 0; it < 3; it++) { const d = sdf(x, y, z); gx = sdf(x + e, y, z) - sdf(x - e, y, z); gy = sdf(x, y + e, z) - sdf(x, y - e, z); gz = sdf(x, y, z + e) - sdf(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l; if (it < 2) { const st = clamp(d, -cell, cell); x -= gx * st; y -= gy * st; z -= gz * st; } }
      P[v] = x; P[v + 1] = y; P[v + 2] = z; N[v] = gx; N[v + 1] = gy; N[v + 2] = gz; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setIndex(ind);
    if (opts.paint) { const C = new Float32Array(P.length); for (let v = 0; v < P.length; v += 3) { const c = opts.paint(P[v], P[v + 1], P[v + 2], N[v], N[v + 1], N[v + 2]); C[v] = c[0]; C[v + 1] = c[1]; C[v + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); }
    if (opts.attr) { const A = new Float32Array((P.length / 3) * 4); for (let v = 0, q = 0; v < P.length; v += 3, q += 4) { const a = opts.attr(P[v], P[v + 1], P[v + 2], N[v], N[v + 1], N[v + 2]); A[q] = a[0]; A[q + 1] = a[1] || 0; A[q + 2] = a[2] || 0; A[q + 3] = a[3] || 0; } g.setAttribute('aMask', new THREE.BufferAttribute(A, 4)); }
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };

  // ── a tube along points with a radius at each: pts [[x,y,z,r], …] (a smooth curve is sampled through them) ──
  DR.tube = (pts, { sides = 8, steps = 0, cap = true, uvLen = 1 } = {}) => {
    const path = pts.length > 2 && steps ? DR.path(pts, { step: 0.05 }) : null, n = steps || pts.length - 1, ring = [], tmp = [0, 0, 0];
    for (let i = 0; i <= n; i++) { const u = i / n; let p, r;
      if (path) { p = path.at(u * path.length, [0, 0, 0]); const f = u * (pts.length - 1), a = Math.min(pts.length - 2, Math.floor(f)); r = lerp(pts[a][3], pts[a + 1][3], f - a); } else { p = pts[i].slice(0, 3); r = pts[i][3]; }
      ring.push({ p, r }); }
    const P = [], Nn = [], UV = [], I = []; let nrm = null, len = 0;
    for (let i = 0; i <= n; i++) { const a = ring[Math.max(0, i - 1)].p, b = ring[Math.min(n, i + 1)].p, t = DR.vec.norm(DR.vec.sub(b, a, tmp), [0, 0, 0]);
      if (!nrm) { nrm = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; } const d = DR.vec.dot(nrm, t); nrm = DR.vec.norm([nrm[0] - t[0] * d, nrm[1] - t[1] * d, nrm[2] - t[2] * d]); const bn = DR.vec.cross(t, nrm, [0, 0, 0]);
      if (i) len += DR.vec.dist(ring[i].p, ring[i - 1].p);
      for (let j = 0; j <= sides; j++) { const a2 = (j / sides) * DR.TAU, c = Math.cos(a2), s = Math.sin(a2), nx = nrm[0] * c + bn[0] * s, ny = nrm[1] * c + bn[1] * s, nz = nrm[2] * c + bn[2] * s, r = ring[i].r;
        P.push(ring[i].p[0] + nx * r, ring[i].p[1] + ny * r, ring[i].p[2] + nz * r); Nn.push(nx, ny, nz); UV.push(j / sides, len / uvLen); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j, b = a + sides + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    if (cap) for (const end of [0, n]) { const c = P.length / 3, t = DR.vec.norm(DR.vec.sub(ring[end === 0 ? 1 : n].p, ring[end === 0 ? 0 : n - 1].p)), s = end === 0 ? -1 : 1; P.push(...ring[end].p); Nn.push(t[0] * s, t[1] * s, t[2] * s); UV.push(0.5, end ? len / uvLen : 0);
      for (let j = 0; j < sides; j++) { const a = end * (sides + 1) + j; if (end) I.push(c, a + 1, a); else I.push(c, a, a + 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); return g;
  };

  // ── merge geometries that share attributes into one (static sets) ──
  DR.merge = (list) => {
    const names = Object.keys(list[0].attributes).filter((n) => list.every((g) => g.attributes[n])), out = new THREE.BufferGeometry(); let vc = 0, ic = 0;
    for (const g of list) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
    const I = new Uint32Array(ic); let vo = 0, io = 0;
    const A = {}; for (const n of names) A[n] = new Float32Array(vc * list[0].attributes[n].itemSize);
    for (const g of list) { const c = g.attributes.position.count; for (const n of names) A[n].set(g.attributes[n].array, vo * g.attributes[n].itemSize);
      if (g.index) for (let i = 0; i < g.index.count; i++) I[io++] = g.index.array[i] + vo; else for (let i = 0; i < c; i++) I[io++] = vo + i; vo += c; }
    for (const n of names) out.setAttribute(n, new THREE.BufferAttribute(A[n], list[0].attributes[n].itemSize)); out.setIndex(new THREE.BufferAttribute(I, 1)); out.computeBoundingSphere(); return out;
  };
  DR.xform = (g, { t, r, s } = {}) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...(t || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0]))), new THREE.Vector3(...(typeof s === 'number' ? [s, s, s] : s || [1, 1, 1]))); g.applyMatrix4(m); return g; };
}
