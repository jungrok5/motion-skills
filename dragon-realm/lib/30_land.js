// dragon-realm · 30_land — the ground and the rock.
//   DR.land.terrain({ size, res, height(x,z), focus, palette, … })  a height-field with ground cover by slope and height
//   DR.land.peak({ at, height, radius, … })                         a rock massif: a displaced surface of revolution
//   DR.land.rockMat(palette)                                        the jointed, stained, mossed rock material
// Rock is modelled, not textured: joints and beds come from a block field that moves the vertices; a small baked
// detail map adds grain under it.  Every builder returns planting sites so trees can find ledges.
{
  const { lerp, sat, smooth, hash2, hash3, fbm2, fbm3, noise2 } = DR;
  const L = (DR.land = {});

  // ── one tiling detail map: RG = slope, B = height, A = cavity (pits and chips, no parallel lines) ──
  L.detail = () => {
    if (L._detail) return L._detail;
    const N = 256, H = new Float32Array(N * N), per = 8;
    const cells = []; for (let i = 0; i < per * per; i++) cells.push([hash2(i, 71), hash2(i, 72), hash2(i, 73), hash2(i, 74) - 0.5, hash2(i, 75) - 0.5]);
    const g2 = new Float32Array(32 * 32); for (let i = 0; i < g2.length; i++) g2[i] = hash2(i, 76);
    const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), at = (a, b) => g2[(DR.mod(b, p) % 32) * 32 + (DR.mod(a, p) % 32)];
      return lerp(lerp(at(xi, yi), at(xi + 1, yi), ux), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), ux), uy); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let h = 0;
      // chips: each cell a facet with its own height and tilt
      let d1 = 9, d2 = 9, id = 0; const cx = Math.floor(u * per), cy = Math.floor(v * per);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const gx = cx + i, gy = cy + j, q = DR.mod(gy, per) * per + DR.mod(gx, per), c = cells[q], dx = gx + c[0] - u * per, dy = gy + c[1] - v * per, d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; id = q; } else if (d < d2) d2 = d; }
      const c = cells[id], edge = Math.sqrt(d2) - Math.sqrt(d1);
      h += (c[2] * 0.5 + (u * per - Math.floor(u * per) - 0.5) * c[3] * 0.4 + (v * per - Math.floor(v * per) - 0.5) * c[4] * 0.4) * smooth(0, 0.12, edge) * 0.55;
      let a = 0.5, f = 4; for (let o = 0; o < 5; o++) { const n = vn(u * f, v * f, f); h += a * (o < 2 ? n : 1 - Math.abs(n * 2 - 1)) * 0.5; a *= 0.5; f *= 2; }
      h -= smooth(0.72, 0.9, vn(u * 32 + 5.5, v * 32 + 1.5, 32)) * 0.25;   // pits
      H[y * N + x] = h; }
    const d = new Uint8Array(N * N * 4), at = (x, y) => H[DR.mod(y, N) * N + DR.mod(x, N)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const o = (y * N + x) * 4, h = at(x, y); let m = 0; for (let k = 0; k < 8; k++) m += at(x + Math.round(Math.cos(k * 0.785) * 5), y + Math.round(Math.sin(k * 0.785) * 5));
      d[o] = 255 * sat(0.5 + (at(x + 1, y) - at(x - 1, y)) * 5); d[o + 1] = 255 * sat(0.5 + (at(x, y + 1) - at(x, y - 1)) * 5); d[o + 2] = 255 * sat(h * 0.8); d[o + 3] = 255 * sat(0.5 + (h - m / 8) * 4); }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return (L._detail = t);
  };

  // ── the block field: columns (warped cells in plan) cut into beds on a dipping plane.  Returns an offset in
  //    −0.5..0.5 per block and the distance to the nearest joint (0 at a crack). ──
  const _o = { h: 0, e: 0 };
  L.blocks = (x, y, z, col, bed, seed, dipX = 0.12, dipZ = 0.05) => {
    const wx = x + noise2(x * 0.021 + 3.1, z * 0.021, seed) * col * 0.35 + noise2(y * 0.05, z * 0.03, seed + 1) * col * 0.12, wz = z + noise2(x * 0.021, z * 0.021 + 7.7, seed + 2) * col * 0.35;
    const px = wx / col, pz = wz / col, cx = Math.floor(px), cz = Math.floor(pz); let d1 = 9, d2 = 9, ix = 0, iz = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const gx = cx + i, gz = cz + j, ox = hash3(gx, gz, seed + 5) * 0.8 + 0.1, oz = hash3(gx, gz, seed + 6) * 0.8 + 0.1, dx = gx + ox - px, dz = gz + oz - pz, d = dx * dx + dz * dz; if (d < d1) { d2 = d1; d1 = d; ix = gx; iz = gz; } else if (d < d2) d2 = d; }
    const yy = (y + x * dipX + z * dipZ) / bed + hash3(ix, iz, seed + 7) * 3, by = Math.floor(yy), fy = yy - by;
    _o.h = hash3(ix * 31 + by * 17, iz, seed + 8) - 0.5; _o.e = Math.min((Math.sqrt(d2) - Math.sqrt(d1)) * col * 0.5, Math.min(fy, 1 - fy) * bed);
    return _o;
  };

  // ── rock material ──
  // palette: { rock, rock2 (aged), stain, moss, soil, lichen } as '#hex'; vertex colour r = cavity, g = moss, b = age
  L.rockMat = (pal = {}, extra = {}) => {
    const P = { rock: '#b4aea4', rock2: '#8f8d8c', stain: '#3a3632', moss: '#4b5a2c', soil: '#5a4630', lichen: '#b9b58a', ...pal }, c = (k) => `vec3(${DR.rgb(P[k]).map((v) => v.toFixed(4)).join(',')})`;
    return DR.mat({ color: '#ffffff', roughness: 0.92, metalness: 0, vertexColors: true, defines: { DR_WET: 1 }, uniforms: { uDetail: { value: L.detail() }, uWaterY: { value: extra.waterY ?? -1e4 } },
      fHead: `uniform sampler2D uDetail; uniform float uWaterY;`,
      fBody: /* glsl */`
        vec3 mk = diffuseColor.rgb; float cav = mk.r, mossV = mk.g, age = mk.b;
        vec3 an = abs(N); vec3 w3 = an * an * an * an; w3 /= (w3.x + w3.y + w3.z);
        float dist = length(vWPos - cameraPosition), foot = dist * uPx;
        float kBig = 1.0 - smoothstep(0.35, 1.6, foot), kFine = 1.0 - smoothstep(0.02, 0.12, foot);
        vec2 uvx = vWPos.zy, uvy = vWPos.xz, uvz = vWPos.xy;
        vec4 dx = texture2D(uDetail, uvx * 0.071), dy = texture2D(uDetail, uvy * 0.071), dz = texture2D(uDetail, uvz * 0.071);
        vec4 dt = dx * w3.x + dy * w3.y + dz * w3.z;
        vec3 bump = (vec3(0.0, dx.g - 0.5, dx.r - 0.5) * w3.x + vec3(dy.r - 0.5, 0.0, dy.g - 0.5) * w3.y + vec3(dz.r - 0.5, dz.g - 0.5, 0.0) * w3.z) * 1.5 * kBig;
        { vec2 uf = (w3.x > w3.y && w3.x > w3.z) ? uvx : (w3.y > w3.z ? uvy : uvz); vec4 df = textureGrad(uDetail, uf * 0.43 + 0.37, dFdx(vWPos.xy + vWPos.z) * 0.43, dFdy(vWPos.xy + vWPos.z) * 0.43);
          vec2 s = (df.rg - 0.5) * 1.0 * kFine; bump += (w3.x > w3.y && w3.x > w3.z) ? vec3(0.0, s.y, s.x) : (w3.y > w3.z ? vec3(s.x, 0.0, s.y) : vec3(s.x, s.y, 0.0)); dt.a = mix(dt.a, df.a, 0.4 * kFine); }
        N = normalize(N - bump);
        vec4 big = drN4(vWPos.xz * 0.0031 + vWPos.y * 0.0017);
        vec3 col = mix(${c('rock')}, ${c('rock2')}, clamp(age * 0.9 + (big.r - 0.5) * 0.9, 0.0, 1.0));
        col *= 0.82 + 0.36 * big.g;
        // rain-wash stains run down steep faces: noise stretched along y
        float steep = 1.0 - smoothstep(0.25, 0.7, N.y);
        vec2 su = (an.x > an.z ? vWPos.zy : vWPos.xy) * vec2(0.085, 0.006);
        float run = drN4(su).r * 0.65 + drN4(su * vec2(3.1, 1.7) + 0.4).g * 0.35;
        col = mix(col, ${c('stain')}, smoothstep(0.52, 0.80, run + age * 0.12) * 0.62 * steep);
        col = mix(col, ${c('lichen')}, smoothstep(0.62, 0.8, drN4(vWPos.xz * 0.09 + vWPos.y * 0.07).b) * 0.22 * (1.0 - steep * 0.5));
        col *= mix(0.55, 1.08, smoothstep(0.25, 0.7, dt.a)) * mix(0.50, 1.0, cav);
        // moss and soil gather on ledges
        float ledge = smoothstep(0.55, 0.86, N.y + (dt.b - 0.5) * 0.5) * mossV;
        col = mix(col, mix(${c('soil')}, ${c('moss')}, smoothstep(0.35, 0.65, big.b + dt.b * 0.3)) * (0.7 + 0.5 * dt.b), ledge);
        float wetBand = (1.0 - smoothstep(uWaterY + 0.25, uWaterY + 2.2 + big.r * 1.5, vWPos.y));
        col *= 1.0 - 0.45 * wetBand;
        diffuseColor.rgb = col; roughnessFactor = mix(0.94, 0.80, cav) - 0.55 * wetBand;
        drAO = mix(0.42, 1.0, cav) * mix(0.75, 1.0, smoothstep(0.3, 0.6, dt.a));
      `, ...extra.mat });
  };

  // ── a massif: a surface of revolution about a leaning axis, pushed in and out by the block field ──
  // spec: at [x, yFoot, z], height, radius, top (radius fraction at the summit shoulder), sharp (profile exponent),
  //       lobes (plan irregularity 0..1), lean [dx, dz] metres at the top, nu, nv, seed, amp (block relief metres),
  //       col / bed (joint spacing metres), flute (vertical gully depth 0..1), sub: [{ at, height, radius, … }] shoulders
  L.peak = (spec) => {
    const S = { height: 200, radius: 60, top: 0.16, sharp: 1.7, lobes: 0.35, lean: [0, 0], nu: 200, nv: 260, seed: 1, amp: 5, col: 13, bed: 26, flute: 0.5, squash: 1, ...spec };
    const nu = Math.round(S.nu * DR.Q.dens ** 0.5), nv = Math.round(S.nv * DR.Q.dens ** 0.5), W = nu + 1, P = new Float32Array(W * (nv + 1) * 3), C = new Float32Array(W * (nv + 1) * 3), base = new Float32Array(W * (nv + 1) * 3);
    // profile: [height fraction, radius fraction] keys — an apron of scree, steep walls, a rounded crown
    const PK = S.profile || [[0, 1], [0.1, 0.80], [0.26, 0.60], [0.55, 0.47], [0.8, 0.36], [0.92, 0.24], [1, 0]];
    const profAt = (v) => { let i = 1; while (i < PK.length - 1 && PK[i][0] < v) i++; const a = PK[i - 1], b = PK[i], u = sat((v - a[0]) / (b[0] - a[0])); return i === PK.length - 1 ? lerp(b[1], a[1], Math.sqrt(1 - u * u)) : lerp(a[1], b[1], u * u * (3 - 2 * u)); };
    const rAt = (ang, v) => { // plan radius at height fraction v: buttresses that turn slowly with height
      let lob = 0; for (let k = 2; k <= 5; k++) lob += Math.sin(ang * k + hash2(k, S.seed) * 6.28 + v * (hash2(k, S.seed + 9) - 0.5) * 4) * (0.5 / (k - 1));
      const fin = Math.pow(Math.abs(Math.sin(ang * (3 + (S.seed % 3)) * 0.5 + hash2(7, S.seed) * 6.28 + v * 1.3)), 0.7) - 0.6;
      return S.radius * profAt(v) * (1 + S.lobes * (lob * 0.6 + fin * 0.7) * (0.45 + 0.55 * smooth(0.05, 0.4, v))); };
    const basePt = (iu, iv, out) => { const ang = (iu / nu) * DR.TAU, v = iv / nv, r = rAt(ang, v), ax = S.lean[0] * v * v, az = S.lean[1] * v * v; out[0] = S.at[0] + ax + Math.cos(ang) * r; out[1] = S.at[1] + v * S.height; out[2] = S.at[2] + az + Math.sin(ang) * r * S.squash; return out; };
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], n = [0, 0, 0];
    for (let iv = 0; iv <= nv; iv++) for (let iu = 0; iu <= nu; iu++) {
      const o = (iv * W + iu) * 3, p = basePt(iu % nu, iv, a), v = iv / nv;
      basePt((iu + 1) % nu, iv, b); basePt(iu % nu, Math.min(nv, iv + 1), c); const pm = basePt(iu % nu, Math.max(0, iv - 1), [0, 0, 0]);
      DR.vec.cross([c[0] - pm[0], c[1] - pm[1], c[2] - pm[2]], [b[0] - p[0], b[1] - p[1], b[2] - p[2]], n); DR.vec.norm(n, n);
      if (!isFinite(n[0]) || iv === nv) { n[0] = 0; n[1] = 1; n[2] = 0; }
      // relief: ridged mass + three scales of jointed blocks + gullies that run down the face
      const x = p[0], y = p[1], z = p[2], ang = (iu / nu) * DR.TAU;
      let d = (DR.ridge2(x * 0.011 + S.seed, z * 0.011 + y * 0.004, 4, S.seed) - 0.45) * S.amp * 1.5;
      const b1 = L.blocks(x, y, z, S.col, S.bed, S.seed); const h1 = b1.h, e1 = b1.e;
      const b2 = L.blocks(x, y, z, S.col * 0.31, S.bed * 0.34, S.seed + 20); const h2 = b2.h, e2 = b2.e;
      d += h1 * S.amp * smooth(0, 1.6, e1) + h2 * S.amp * 0.33 * smooth(0, 0.6, e2);
      const fl = Math.pow(Math.abs(Math.sin(ang * (5 + (S.seed % 3)) + noise2(ang * 2.2, v * 3, S.seed) * 1.6 + v * 2.0)), 0.6);
      d -= (1 - fl) * S.flute * S.amp * 1.4 * smooth(0.02, 0.25, v) * smooth(1.0, 0.75, v);
      const crack = Math.min(smooth(0, 0.9, e1), 0.35 + 0.65 * smooth(0, 0.35, e2));
      d -= (1 - crack) * S.amp * 0.22;
      d *= smooth(1.0, 0.9, v) * 0.9 + 0.1;
      const hz = Math.hypot(n[0], n[2]) || 1, k = 0.3;   // displace mostly sideways so strata stay level
      P[o] = x + (n[0] / hz) * d * (1 - k) + n[0] * d * k; P[o + 1] = y + n[1] * d * k; P[o + 2] = z + (n[2] / hz) * d * (1 - k) + n[2] * d * k;
      base[o] = d; base[o + 1] = crack; base[o + 2] = fl;
      const cav = sat(0.62 + d / (S.amp * 2.2)) * (0.55 + 0.45 * crack);
      C[o] = cav; C[o + 1] = sat(0.55 + fbm3(x * 0.03, y * 0.03, z * 0.03, 3, S.seed + 3) * 1.4); C[o + 2] = sat(0.5 + fbm3(x * 0.012, y * 0.02, z * 0.012, 3, S.seed + 4) * 1.3 + (1 - fl) * 0.25);
    }
    const I = new Uint32Array(nu * nv * 6); let q = 0;
    for (let iv = 0; iv < nv; iv++) for (let iu = 0; iu < nu; iu++) { const i0 = iv * W + iu, i1 = i0 + 1, i2 = i0 + W, i3 = i2 + 1; I[q++] = i0; I[q++] = i2; I[q++] = i1; I[q++] = i1; I[q++] = i2; I[q++] = i3; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeVertexNormals();
    // weld the seam's normals
    const Nn = g.attributes.normal.array; for (let iv = 0; iv <= nv; iv++) { const o0 = iv * W * 3, o1 = (iv * W + nu) * 3; for (let k = 0; k < 3; k++) { const m = (Nn[o0 + k] + Nn[o1 + k]) / 2; Nn[o0 + k] = Nn[o1 + k] = m; } }
    g.computeBoundingSphere();
    // planting sites: ledges (flat enough to root on) and faces (for trees that grow out of the wall)
    const sites = [], r = DR.rng(S.seed * 77 + 5);
    for (let i = 0; i < (S.siteTries ?? 5000); i++) { const iu = r.int(0, nu - 1), iv = r.int(2, nv - 3), o = (iv * W + iu) * 3, ny = Nn[o + 1];
      sites.push({ p: [P[o], P[o + 1], P[o + 2]], n: [Nn[o], ny, Nn[o + 2]], v: iv / nv, crack: base[o + 1], cav: C[o], r: r() }); }
    return { geometry: g, sites, spec: S, top: [S.at[0] + S.lean[0], S.at[1] + S.height, S.at[2] + S.lean[1]] };
  };

  // ── terrain: a height-field on a grid that is finer round `focus` ──
  // spec: size [sx, sz], center [x, z], res, height(x, z), focus { at: [x, z], power }, cover(x, z, h, ny) → [rock, grass, shore]
  //       palette { grass, grass2, litter, soil, gravel, bed } ('#hex')
  L.terrain = (spec) => {
    const S = { size: [1200, 1200], center: [0, 0], res: 300, waterY: 0, ...spec }, n = Math.round(S.res * DR.Q.dens ** 0.5), W = n + 1, H = S.height;
    const warp = (u) => { const p = S.focus?.power ?? 1.8, s = u * 2 - 1; return 0.5 + 0.5 * Math.sign(s) * Math.pow(Math.abs(s), p); };
    const fx = S.focus?.at ?? S.center, P = new Float32Array(W * W * 3), C = new Float32Array(W * W * 3);
    const X = (i) => { const u = warp(i / n); return lerp(S.center[0] - S.size[0] / 2, S.center[0] + S.size[0] / 2, u) + (fx[0] - S.center[0]) * (1 - Math.abs(u * 2 - 1)); };
    const Z = (j) => { const u = warp(j / n); return lerp(S.center[1] - S.size[1] / 2, S.center[1] + S.size[1] / 2, u) + (fx[1] - S.center[1]) * (1 - Math.abs(u * 2 - 1)); };
    const normalAt = (x, z, e = 0.8, out = [0, 0, 0]) => { out[0] = H(x - e, z) - H(x + e, z); out[1] = 2 * e; out[2] = H(x, z - e) - H(x, z + e); return DR.vec.norm(out, out); };
    const nn = [0, 0, 0];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const o = (j * W + i) * 3, x = X(i), z = Z(j), h = H(x, z); P[o] = x; P[o + 1] = h; P[o + 2] = z; normalAt(x, z, 1.2, nn);
      const cv = S.cover ? S.cover(x, z, h, nn[1]) : [sat((0.78 - nn[1]) * 5), 0.5, sat(1 - (h - S.waterY) / 1.5)]; C[o] = cv[0]; C[o + 1] = cv[1]; C[o + 2] = cv[2]; }
    const I = new Uint32Array(n * n * 6); let q = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; I[q++] = a; I[q++] = c; I[q++] = b; I[q++] = b; I[q++] = c; I[q++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
    const pal = { grass: '#6f7a3a', grass2: '#a08a45', litter: '#6b4326', soil: '#4a3a28', gravel: '#8d867a', bed: '#2c3a34', rock: '#b4aea4', rock2: '#8f8d8c', canopy: '#2f4a2a', canopy2: '#a8552a', canopy3: '#c9962f', ...S.palette }, c = (k) => `vec3(${DR.rgb(pal[k]).map((v) => v.toFixed(4)).join(',')})`;
    const mat = DR.mat({ color: '#ffffff', roughness: 0.95, vertexColors: true, defines: { DR_WET: 1 }, uniforms: { uDetail: { value: L.detail() }, uWaterY: { value: S.waterY }, uForest: { value: new THREE.Vector2(S.forestNear ?? 190, S.forestFar ?? 420) } },
      fHead: 'uniform sampler2D uDetail; uniform float uWaterY; uniform vec2 uForest;',
      fBody: /* glsl */`
        vec3 mk = diffuseColor.rgb; float dist = length(vWPos - cameraPosition), foot = dist * uPx, kB = 1.0 - smoothstep(0.3, 1.5, foot);
        vec4 dt = texture2D(uDetail, vWPos.xz * 0.083), d2 = texture2D(uDetail, vWPos.xz * 0.37 + 0.21), big = drN4(vWPos.xz * 0.0043), mid = drN4(vWPos.xz * 0.031);
        float kF = 1.0 - smoothstep(0.015, 0.09, foot);
        float rockK = smoothstep(0.45, 0.62, mk.r + (dt.b - 0.5) * 0.5 + (mid.r - 0.5) * 0.3);
        vec3 grass = mix(${c('grass')}, ${c('grass2')}, smoothstep(0.3, 0.75, big.r * 0.6 + mid.g * 0.4 + (mk.g - 0.5)));
        grass *= 0.72 + 0.5 * mid.b + 0.25 * (d2.b - 0.5) * kF;
        vec3 litter = mix(${c('litter')}, ${c('soil')}, mid.r) * (0.75 + 0.5 * d2.b * kF + 0.25 * dt.b);
        vec3 soft = mix(grass, litter, smoothstep(0.42, 0.62, mk.g * -1.0 + 1.0 + (big.g - 0.5) * 0.7));
        vec3 rock = mix(${c('rock')}, ${c('rock2')}, big.b) * (0.6 + 0.5 * dt.a);
        vec3 col = mix(soft, rock, rockK);
        // far slopes carry their forest as paint: crowns from the cell noise, three leaf colours in drifts
        float fK = smoothstep(uForest.x, uForest.y, dist) * (1.0 - rockK) * smoothstep(0.30, 0.42, mk.g) * step(uWaterY + 1.0, vWPos.y);
        { vec4 cw = drN4(vWPos.xz * 0.021 + vWPos.y * 0.004), c2 = drN4(vWPos.xz * 0.0077 + 0.5);
          vec3 leaf = mix(${c('canopy')}, mix(${c('canopy2')}, ${c('canopy3')}, smoothstep(0.35, 0.7, c2.g)), smoothstep(0.50, 0.66, c2.r * 0.7 + cw.g * 0.3));
          leaf *= 0.45 + 0.9 * smoothstep(0.75, 0.2, cw.a) * (0.7 + 0.6 * cw.b);
          col = mix(col, leaf, fK); N = normalize(N + vec3(cw.r - 0.5, 0.0, cw.g - 0.5) * 1.6 * fK); }
        float shore = smoothstep(0.35, 0.75, mk.b + (dt.b - 0.5) * 0.3);
        col = mix(col, ${c('gravel')} * (0.6 + 0.6 * d2.b), shore);
        float under = smoothstep(uWaterY + 0.15, uWaterY - 1.2, vWPos.y);
        col = mix(col, ${c('bed')} * (0.6 + 0.6 * dt.b), under);
        float wetBand = 1.0 - smoothstep(uWaterY + 0.05, uWaterY + 0.7 + big.r * 0.5, vWPos.y);
        col *= 1.0 - 0.4 * wetBand;
        vec2 s = (dt.rg - 0.5) * (0.5 + 1.2 * max(rockK, shore)) * kB + (d2.rg - 0.5) * 0.9 * kF;
        N = normalize(N - vec3(s.x, 0.0, s.y));
        diffuseColor.rgb = col; roughnessFactor = mix(0.96, 0.86, rockK) - 0.5 * wetBand;
        drAO = mix(0.55, 1.0, smoothstep(0.2, 0.7, dt.a)) * mix(1.0, 0.8, (1.0 - rockK) * (1.0 - mid.b));
      ` });
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.castShadow = true; mesh.name = 'terrain';
    // scatter planting sites by rejection: filter(x, z, h, ny, r) → probability 0..1
    const scatter = ({ count, seed = 1, bounds, filter, minDist = 0, tries = 30 }) => { const r = DR.rng(seed), out = [], bd = bounds || [S.center[0] - S.size[0] / 2, S.center[1] - S.size[1] / 2, S.center[0] + S.size[0] / 2, S.center[1] + S.size[1] / 2];
      const cell = Math.max(minDist, 1e-3), grid = new Map(), key = (x, z) => Math.floor(x / cell) + ':' + Math.floor(z / cell);
      for (let i = 0; i < count * tries && out.length < count; i++) { const x = r.range(bd[0], bd[2]), z = r.range(bd[1], bd[3]), h = H(x, z); normalAt(x, z, 1.0, nn); const pr = filter ? filter(x, z, h, nn[1], r) : 1; if (r() >= pr) continue;
        if (minDist) { let ok = true; const gx = Math.floor(x / cell), gz = Math.floor(z / cell); for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) { const l = grid.get(gx + a + ':' + (gz + b)); if (l) for (const p of l) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < minDist * minDist) { ok = false; break; } } if (!ok) continue; const k = key(x, z); (grid.get(k) || grid.set(k, []).get(k)).push([x, z]); }
        out.push({ p: [x, h, z], n: nn.slice(), s: 1, r: r() * DR.TAU, seed: r.int(1, 1e6), tint: r() }); }
      return out; };
    return { mesh, heightAt: H, normalAt, scatter, spec: S };
  };
}
