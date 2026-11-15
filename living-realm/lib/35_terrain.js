// living-realm · 35_terrain — the land: a height function sampled to a grid you can edit (level a site, lay a road,
// cut a stream bed), cover maps painted with the same strokes (dirt, paving, leaf litter, grass, flowers, shore),
// and the mesh: 1 m near the middle, coarser rings out to the mountains.
{
  const T = THREE;
  const L = (LR.land = { half: 256, res: 0.5, far: 4096, waterY: -1e9 });

  // LR.land.create({ height:(x,z)=>m, half:256, res:.5, far:4096, biome:(x,z,h,slope)=>[forest,rock,snow] })
  L.create = (o) => {
    Object.assign(L, o);
    const n = (L.n = Math.round((L.half * 2) / L.res) + 1), H = (L.H = new Float32Array(n * n));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) H[j * n + i] = o.height(-L.half + i * L.res, -L.half + j * L.res);
    L.fn = o.height;
    const cn = (L.cn = Math.round((L.half * 2) / 0.5) + 1);                 // cover maps at 0.5 m
    L.splat = new Uint8Array(cn * cn * 4); L.cover = new Uint8Array(cn * cn * 4);
    for (let i = 0; i < cn * cn; i++) { L.splat[i * 4 + 3] = 255; L.cover[i * 4 + 1] = 160; }
    return L;
  };
  const gi = (x) => (x + L.half) / L.res;
  // height anywhere: the edited grid inside, the function outside (edits fade out toward the rim)
  L.h = (x, z) => {
    const fx = gi(x), fz = gi(z), n = L.n;
    if (fx < 0 || fz < 0 || fx > n - 1 || fz > n - 1) return L.fn(x, z);
    const i = Math.min(Math.floor(fx), n - 2), j = Math.min(Math.floor(fz), n - 2), u = fx - i, v = fz - j, H = L.H, k = j * n + i;
    return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + n] * (1 - u) * v + H[k + n + 1] * u * v;
  };
  L.normal = (x, z, e = 0.6, out = [0, 1, 0]) => { const dx = L.h(x + e, z) - L.h(x - e, z), dz = L.h(x, z + e) - L.h(x, z - e), l = Math.hypot(dx, 2 * e, dz); out[0] = -dx / l; out[1] = (2 * e) / l; out[2] = -dz / l; return out; };
  const rim = (x, z) => LR.sm(L.half - 4, L.half - 28, Math.max(Math.abs(x), Math.abs(z)));

  // ── editing: every stroke takes world metres ────────────────────────────────────────────────────────────────────
  // visit grid cells within r of a point
  const eachH = (x, z, r, fn) => { const n = L.n, i0 = Math.max(0, Math.floor(gi(x - r))), i1 = Math.min(n - 1, Math.ceil(gi(x + r))), j0 = Math.max(0, Math.floor(gi(z - r))), j1 = Math.min(n - 1, Math.ceil(gi(z + r))); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const wx = -L.half + i * L.res, wz = -L.half + j * L.res; fn(j * n + i, wx, wz); } };
  const eachC = (x0, z0, x1, z1, fn) => { const n = L.cn, c = (v) => (v + L.half) / 0.5, i0 = Math.max(0, Math.floor(c(x0))), i1 = Math.min(n - 1, Math.ceil(c(x1))), j0 = Math.max(0, Math.floor(c(z0))), j1 = Math.min(n - 1, Math.ceil(c(z1))); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * n + i, -L.half + i * 0.5, -L.half + j * 0.5); };
  const segDist = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9; const t = LR.sat(((px - a[0]) * dx + (pz - a[1]) * dz) / l2); return [Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t), t]; };
  const CH = { dirt: [L, 'splat', 0], paved: [L, 'splat', 1], litter: [L, 'splat', 2], grass: [L, 'splat', 3], flowers: [L, 'cover', 0], tall: [L, 'cover', 1], shore: [L, 'cover', 2], fern: [L, 'cover', 3] };
  const setC = (name, k, v, mode) => { const c = CH[name], a = L[c[1]], i = k * 4 + c[2]; const nv = Math.round(LR.sat(v) * 255); a[i] = mode === 'max' ? Math.max(a[i], nv) : mode === 'min' ? Math.min(a[i], nv) : nv; };
  const getC = (name, k) => { const c = CH[name]; return L[c[1]][k * 4 + c[2]] / 255; };
  // level the ground inside an oriented box (a building site) to y (default: the mean), with a soft margin
  L.level = (x, z, hx, hz, yaw = 0, y, margin = 3) => {
    const c = Math.cos(yaw), s = Math.sin(yaw), R = Math.hypot(hx, hz) + margin;
    if (y === undefined) { let sum = 0, cnt = 0; eachH(x, z, Math.hypot(hx, hz), (k, wx, wz) => { const lx = (wx - x) * c - (wz - z) * s, lz = (wx - x) * s + (wz - z) * c; if (Math.abs(lx) <= hx && Math.abs(lz) <= hz) { sum += L.H[k]; cnt++; } }); y = cnt ? sum / cnt : L.h(x, z); }
    eachH(x, z, R, (k, wx, wz) => { const lx = (wx - x) * c - (wz - z) * s, lz = (wx - x) * s + (wz - z) * c; const d = Math.max(Math.abs(lx) - hx, Math.abs(lz) - hz); const w = LR.sm(margin, 0, d) * rim(wx, wz); L.H[k] += (y - L.H[k]) * w; });
    return y;
  };
  L.levelDisc = (x, z, r, y, margin = 4) => { if (y === undefined) y = L.h(x, z); eachH(x, z, r + margin, (k, wx, wz) => { const w = LR.sm(margin, 0, Math.hypot(wx - x, wz - z) - r) * rim(wx, wz); L.H[k] += (y - L.H[k]) * w; }); return y; };
  // a way along points [[x,z],…]: paints `kind` ('dirt' | 'paved'), thins the grass, and eases the ground across its width
  L.road = (pts, width, o = {}) => {
    const kind = o.kind || 'dirt', hw = width / 2, soft = o.soft === undefined ? 1.6 : o.soft, wob = o.wobble === undefined ? 0.9 : o.wobble;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1], R = hw + soft + 3;
      eachC(Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, (k, wx, wz) => {
        const [d] = segDist(wx, wz, a, b); const e = d + (LR.fbm(wx * 0.35, wz * 0.35, 3) - 0.5) * 2 * wob;
        const w = LR.sm(hw + soft, hw - 0.3, e); if (w <= 0) return;
        setC(kind, k, w * (o.strength || 1), 'max'); setC('grass', k, 1 - w * 0.98, 'min'); setC('flowers', k, 1 - w, 'min'); setC('fern', k, 1 - w, 'min'); if (kind === 'paved') setC('dirt', k, getC('dirt', k) * (1 - w));
      });
      if (o.ease !== false) { const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5); for (let i = 0; i <= steps; i++) { const t = i / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = o.y !== undefined ? o.y : L.h(x, z); eachH(x, z, hw + 2.5, (k, wx, wz) => { const w = LR.sm(hw + 2.5, hw * 0.5, Math.hypot(wx - x, wz - z)) * 0.5 * rim(wx, wz); L.H[k] += (y - L.H[k]) * w; }); } }
    }
  };
  // a disc of paving or dirt (a square, a yard)
  L.patch = (x, z, r, o = {}) => { const kind = o.kind || 'paved', soft = o.soft || 1.5, wob = o.wobble === undefined ? 0.8 : o.wobble; eachC(x - r - soft - 2, z - r - soft - 2, x + r + soft + 2, z + r + soft + 2, (k, wx, wz) => { const sq = o.box ? Math.max(Math.abs(wx - x) - o.box[0], Math.abs(wz - z) - o.box[1]) + r : Math.hypot(wx - x, wz - z); const e = sq + (LR.fbm(wx * 0.4, wz * 0.4, 3) - 0.5) * 2 * wob; const w = LR.sm(r + soft, r - 0.3, e) * (o.strength || 1); if (w <= 0) return; setC(kind, k, w, 'max'); setC('grass', k, 1 - w, 'min'); setC('flowers', k, 1 - w, 'min'); setC('fern', k, 1 - w, 'min'); if (kind === 'paved') setC('dirt', k, getC('dirt', k) * (1 - w)); }); };
  // the worn earth round a building's foot: an oriented box with a ragged edge
  L.apron = (x, z, hx, hz, yaw = 0, o = {}) => { const c = Math.cos(yaw), s = Math.sin(yaw), R = Math.hypot(hx, hz) + 3, wd = o.width || 1.3; eachC(x - R, z - R, x + R, z + R, (k, wx, wz) => { const lx = (wx - x) * c - (wz - z) * s, lz = (wx - x) * s + (wz - z) * c, d = Math.max(Math.abs(lx) - hx, Math.abs(lz) - hz) + (LR.fbm(wx * 0.6, wz * 0.6, 3) - 0.5) * 1.6; const w = LR.sm(wd, wd * 0.15, d) * (o.strength || 0.75); if (w <= 0) return; if (getC('paved', k) < 0.3) setC('dirt', k, w, 'max'); setC('grass', k, 1 - w * 0.9, 'min'); setC('flowers', k, 1 - w, 'min'); }); };
  // a strip just outside an oriented box where weeds and flowers are left to grow (the foot of a wall, a fence line)
  L.border = (x, z, hx, hz, yaw = 0, o = {}) => { const c = Math.cos(yaw), s = Math.sin(yaw), wd = o.width || 2, R = Math.hypot(hx, hz) + wd + 2; eachC(x - R, z - R, x + R, z + R, (k, wx, wz) => { const lx = (wx - x) * c - (wz - z) * s, lz = (wx - x) * s + (wz - z) * c, d = Math.max(Math.abs(lx) - hx, Math.abs(lz) - hz); if (d < -0.3 || d > wd) return; const n = LR.fbm(wx * 0.33 + 3, wz * 0.33 + 8, 3), w = LR.sm(0.42, 0.62, n) * LR.sm(wd, wd * 0.4, d); if (w <= 0 || getC('paved', k) > 0.3 || getC('dirt', k) > 0.55) return; setC('flowers', k, w * (o.flowers === undefined ? 0.5 : o.flowers), 'max'); setC('tall', k, 0.55 + 0.4 * w, 'max'); setC('fern', k, w * 0.35 * (o.weeds === undefined ? 1 : o.weeds), 'max'); }); };
  // a stream bed along points [[x,z],…]: cut down by depth, shore gravel painted, grass kept off.  o.y(t): bed level along it
  L.carve = (pts, width, depth, o = {}) => {
    const hw = width / 2, bank = o.bank || 3.5;
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1], steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.0);
      for (let i = 0; i <= steps; i++) { const t = i / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; const wy = a[2] !== undefined ? a[2] + (b[2] - a[2]) * t : undefined;
        eachH(x, z, hw + bank, (k, wx, wz) => { const d = Math.hypot(wx - x, wz - z); const w = LR.sm(hw + bank, hw * 0.35, d); const target = (wy !== undefined ? wy : L.H[k]) - depth * LR.sm(hw + 1.0, hw * 0.2, d) + (wy !== undefined ? 0.5 * LR.sm(hw * 0.6, hw + bank, d) : 0); if (wy !== undefined) L.H[k] = Math.min(L.H[k], LR.lerp(L.H[k], target, w * rim(wx, wz))); else L.H[k] -= depth * w * rim(wx, wz) * 0.34; }); }
      const R = hw + bank + 2;
      eachC(Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, (k, wx, wz) => { const [d] = segDist(wx, wz, a, b); const e = d + (LR.fbm(wx * 0.5, wz * 0.5, 2) - 0.5) * 1.4; const w = LR.sm(hw + 2.2, hw + 0.2, e); if (w <= 0) return; setC('shore', k, w, 'max'); setC('grass', k, 1 - w, 'min'); setC('flowers', k, 1 - w, 'min'); setC('dirt', k, getC('dirt', k) * (1 - w)); });
    }
  };
  // a pond: a bowl around (x, z) with radius r, bed `depth` below `level`
  L.pond = (x, z, r, level, depth, o = {}) => {
    const wob = o.wobble || 0.18;
    const edge = (wx, wz) => { const a = Math.atan2(wz - z, wx - x); return r * (1 + wob * (LR.fbm(Math.cos(a) * 1.3 + 5, Math.sin(a) * 1.3 + 9, 3) - 0.5) * 2); };
    eachH(x, z, r * 1.4 + 6, (k, wx, wz) => { const d = Math.hypot(wx - x, wz - z), e = edge(wx, wz); const w = LR.sm(e + 5, e - 1.5, d) * rim(wx, wz); const bowl = level + 0.35 - (depth + 0.35) * LR.sm(e + 0.6, e * 0.35, d); L.H[k] = LR.lerp(L.H[k], Math.min(L.H[k], bowl) * 0.999 + 0.001 * bowl, w); if (d < e + 1.2) L.H[k] = Math.min(L.H[k], bowl); else if (d < e + 10) L.H[k] = Math.max(L.H[k], level + 0.55 * LR.sm(e + 1.0, e + 3.0, d) * LR.sm(e + 10, e + 5.5, d) * rim(wx, wz)); });
    eachC(x - r * 1.4 - 6, z - r * 1.4 - 6, x + r * 1.4 + 6, z + r * 1.4 + 6, (k, wx, wz) => { const d = Math.hypot(wx - x, wz - z), e = edge(wx, wz) + (LR.fbm(wx * 0.5, wz * 0.5, 2) - 0.5) * 1.2; const w = LR.sm(e + 2.4, e + 0.3, d); if (w <= 0) return; setC('shore', k, w, 'max'); setC('grass', k, 1 - w, 'min'); setC('flowers', k, 1 - w, 'min'); });
    L.pondEdge = edge;
  };
  // paint a cover channel from a function of (x, z) → 0..1 over the whole middle.  mode: 'set' | 'max' | 'min' | 'mul'
  L.paint = (name, fn, mode = 'set') => { const n = L.cn; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, v = fn(-L.half + i * 0.5, -L.half + j * 0.5, k); if (v === undefined) continue; if (mode === 'mul') setC(name, k, getC(name, k) * v); else setC(name, k, v, mode); } };
  L.coverAt = (name, x, z) => { const n = L.cn, i = LR.clamp(Math.round((x + L.half) / 0.5), 0, n - 1), j = LR.clamp(Math.round((z + L.half) / 0.5), 0, n - 1); return getC(name, j * n + i); };

  // ── the mesh ────────────────────────────────────────────────────────────────────────────────────────────────────
  // vertex: position f32x3 · normal i8x4 · biome u8x4 (far forest, far rock, snow cap, inner 1/0)
  // rings of different density meet without cracks: on a ring's outer edge the finer side takes the coarser side's
  // straight line (outer = the ring's half-width, coarse = the next ring's step)
  const chunk = (x0, z0, size, step, inner, outer, coarse) => {
    const n = Math.round(size / step), row = n + 1;
    const nv = row * row, P = new Float32Array(nv * 3), N = new Int8Array(nv * 4), B = new Uint8Array(nv * 4), I = []; let v = 0, lo = 1e9, hi = -1e9;
    const raw = inner ? L.h : (x, z) => (Math.max(Math.abs(x), Math.abs(z)) <= L.half ? L.h(x, z) : L.fn(x, z));
    const hAt = (x, z) => {
      if (coarse) { const ex = Math.abs(Math.abs(x) - outer) < 1e-6, ez = Math.abs(Math.abs(z) - outer) < 1e-6;
        if (ex && !ez) { const a = Math.floor(z / coarse) * coarse, t = (z - a) / coarse; if (t > 1e-6) return raw(x, a) * (1 - t) + raw(x, a + coarse) * t; }
        else if (ez && !ex) { const a = Math.floor(x / coarse) * coarse, t = (x - a) / coarse; if (t > 1e-6) return raw(a, z) * (1 - t) + raw(a + coarse, z) * t; } }
      return raw(x, z);
    };
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const x = x0 + i * step, z = z0 + j * step, y = hAt(x, z), e = Math.max(step, 0.75); const dx = raw(x + e, z) - raw(x - e, z), dz = raw(x, z + e) - raw(x, z - e), l = Math.hypot(dx, 2 * e, dz), ny = (2 * e) / l;
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; N[v * 4] = Math.round((-dx / l) * 127); N[v * 4 + 1] = Math.round(ny * 127); N[v * 4 + 2] = Math.round((-dz / l) * 127);
      const bi = L.biome ? L.biome(x, z, y, 1 - ny) : [0, 0, 0]; B[v * 4] = Math.round(LR.sat(bi[0]) * 255); B[v * 4 + 1] = Math.round(LR.sat(bi[1]) * 255); B[v * 4 + 2] = Math.round(LR.sat(bi[2]) * 255); B[v * 4 + 3] = inner ? 255 : 0;
      if (y < lo) lo = y; if (y > hi) hi = y; v++;
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * row + i, b = a + 1, c = a + row, d = c + 1; if ((i + j) & 1) I.push(a, c, b, b, c, d); else I.push(a, c, d, a, d, b); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 4, true)); g.setAttribute('biome', new T.BufferAttribute(B, 4, true));
    g.setIndex(new T.BufferAttribute(nv > 65535 ? new Uint32Array(I) : new Uint16Array(I), 1));
    const cy = (lo + hi) / 2; g.boundingSphere = new T.Sphere(new T.Vector3(x0 + size / 2, cy, z0 + size / 2), Math.hypot(size / 2, size / 2, (hi - lo) / 2 + 2));
    return { g, tris: I.length / 3 };
  };

  L.build = () => {
    const W = LR.world, n = L.n, half = L.half;
    // textures: height (R16F, the grass and the rain read it), splat and cover (RGBA8)
    const hf = new Float32Array(n * n); let lo = 1e9, hi = -1e9; for (let i = 0; i < n * n; i++) { const h = L.H[i]; hf[i] = h; if (h < lo) lo = h; if (h > hi) hi = h; }
    L.minY = lo; L.maxY = hi;
    const half16 = new Uint16Array(n * n); for (let i = 0; i < n * n; i++) half16[i] = T.DataUtils.toHalfFloat(hf[i]);
    const ht = (L.heightTex = new T.DataTexture(half16, n, n, T.RedFormat, T.HalfFloatType)); ht.minFilter = ht.magFilter = T.LinearFilter; ht.wrapS = ht.wrapT = T.ClampToEdgeWrapping; ht.needsUpdate = true;
    const mk = (d) => { const t = new T.DataTexture(d, L.cn, L.cn, T.RGBAFormat, T.UnsignedByteType); t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.needsUpdate = true; return t; };
    L.splatTex = mk(L.splat); L.coverTex = mk(L.cover);
    L.rect = new T.Vector4(-half, -half, 1 / (2 * half), 1 / (2 * half));
    L.U = { uSplat: { value: L.splatTex }, uCover: { value: L.coverTex }, uHeight: { value: L.heightTex }, uLandRect: { value: L.rect }, uWaterY: { value: L.waterY } };
    const mat = LR.render.matTerrain(), smat = LR.render.matShadow({ terrain: true });
    let tris = 0;
    const put = (g, shadow) => { const m = new T.Mesh(g, mat); m.matrixAutoUpdate = false; m.name = 'land'; W.scene.add(m); if (shadow) { const s = new T.Mesh(g, smat); s.matrixAutoUpdate = false; W.shadowScene.add(s); } };
    // far rings are joined into one mesh per quarter of the compass: four draws instead of sixty
    const join = (list) => { let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; } const P = new Float32Array(nv * 3), N = new Int8Array(nv * 4), B = new Uint8Array(nv * 4), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let v = 0, i = 0; const box = new T.Box3();
      for (const g of list) { P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 4); B.set(g.attributes.biome.array, v * 4); const ix = g.index.array; for (let k = 0; k < ix.length; k++) I[i + k] = ix[k] + v; v += g.attributes.position.count; i += ix.length; g.dispose(); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 4, true)); g.setAttribute('biome', new T.BufferAttribute(B, 4, true)); g.setIndex(new T.BufferAttribute(I, 1)); g.computeBoundingSphere(); return g; };
    // ring 0: 1 m inside ±128 · ring 1: 2 m to ±256 · ring 2: 8 m to ±1024 · ring 3: 64 m to ±far
    const ring = (inner, outer, cs, step, isInner, shadow, coarse, merged) => { const q = [[], [], [], []];
      for (let z = -outer; z < outer; z += cs) for (let x = -outer; x < outer; x += cs) { if (x >= -inner && x + cs <= inner && z >= -inner && z + cs <= inner) continue; const c = chunk(x, z, cs, step, isInner, outer, coarse); tris += c.tris; if (merged) q[(x + cs / 2 > 0 ? 1 : 0) + (z + cs / 2 > 0 ? 2 : 0)].push(c.g); else put(c.g, shadow); }
      if (merged) for (const l of q) if (l.length) put(join(l), false); };
    const r0 = Math.min(128, half);
    ring(0, r0, 64, 1, true, true, half > r0 ? 2 : 8); if (half > r0) ring(r0, half, 128, 2, true, true, 8);
    ring(half, 1024, 256, 8, false, false, 64, true); ring(1024, L.far, 1024, 64, false, false, 0, true);
    W.stats.tris += tris; L.tris = tris; L.built = true;
    return L;
  };
}
