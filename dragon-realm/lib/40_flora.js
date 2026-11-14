// dragon-realm · 40_flora — the plant kit.  Trees, shrubs and ground cover made of code: a branch skeleton from a
// recursive walk, bark tubes, and foliage as SPRAY cards (a painted twig with many leaves, never one leaf per quad)
// cut out of a data atlas.  Everything is built once at load; nothing here runs per frame except the shaders.
//
//   DR.flora.atlas({ size, cells: [cols, rows], draw(ctx, cell, rng, w, h), seed })   → { tex, cover[], uv(cell), canvas, … }
//       Canvas-2D painting → RGBA data texture: R shade · G hue (place on the species' colour ramp) · B wood · A cover.
//       Paint with DR.flora.paint.ink(shade, hue, wood, alpha) and the helpers in DR.flora.paint (twig, needles, leaf, blade).
//       Outside the cut-out each cell is filled with its mean colour (mips never bleed black) and the mip chain keeps
//       the covered share constant, so far crowns do not thin out.
//   DR.flora.ramp([[0, '#hex'], [0.5, '#hex'], …])                                     → 64×1 half-float colour ramp
//   DR.flora.bark({ kind: 'plates' | 'furrows' | 'smooth', size, seed, … })            → tiling RG slope · B height · A cavity
//   DR.flora.skeleton(spec, rng)      → { branches, anchors, height, radius }          (spec: see the function)
//   DR.flora.woodGeo(skeleton, opts)  → BufferGeometry of tubes (uv in bark tiles, wound outward, aBr = axis + looseness)
//   DR.flora.foliage(anchors, spec, rng) → { list of sprays, center, radii }           shuffled: a prefix thins evenly
//   DR.flora.clump(rng, spec)         → the same structure for a tuft of upright cards (grass, reeds, ferns)
//   DR.flora.sprayGeo(foliage, atlas, { count, grow }) → BufferGeometry of quads (crown normals, aCard, aSpray)
//   DR.flora.leafMaterial(opts) / DR.flora.barkMaterial(opts)                          → DR.mat materials (+ depth twins)
//   DR.flora.species({ name, variants, seed, atlas, build(rng, v) → { wood, foliage }, leaf, bark, lod, … })
//       .plant(scene, sites, { near(p) → metres, lodBias, shadow })   sites: [{ p:[x,y,z], s, h, r, seed, n:[x,y,z], tint, variant }]
//       .stats                         triangles / sprays per level of detail, instances planted, draw calls, build ms
//   DR.flora.tufts(spec)               → a species without wood (plume grass, turf, fern, reed), same .plant / .stats
//   DR.flora.scatter({ count, bounds, ground, mask, minDist, seed, scale })            → sites
//
// Level of detail is chosen ONCE at load from `near(p)` (metres from the nearest point of the camera route):
//   full  — every spray, the whole skeleton;   mid — a shuffled share of the sprays, each bigger, trunk + limbs only;
//   far   — two crossed cards showing the tree itself, drawn at load from its own sprays ('impostor'), or a few big
//           sprays ('sprays'), or nothing ('none').  Instances are grouped by place so frustum culling works.
// Wind is one vertex stage shared by leaves, bark and both their depth materials (a bent tree casts a bent shadow):
// the whole plant leans by height^1.5 with the gust that drWindAt gives at its ROOT, loose boughs ride further and bob,
// and sprays within ~40 m of the lens flutter.  It is a pure function of the shared uniforms.
{
  const F = (DR.flora = {}), V = DR.vec, { sat, lerp, clamp, TAU, smooth } = DR;
  const val = (x, rng, ctx) => (typeof x === 'function' ? x(ctx, rng) : Array.isArray(x) ? rng.range(x[0], x[1]) : x);
  const fnv = (x, s, d = 0) => (x == null ? d : typeof x === 'function' ? x(s) : x);
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rot = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), d = V.dot(k, v) * (1 - c), x = V.cross(k, v); return [v[0] * c + x[0] * s + k[0] * d, v[1] * c + x[1] * s + k[1] * d, v[2] * c + x[2] * s + k[2] * d]; };
  const perp = (d) => V.norm(V.cross(d, Math.abs(d[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0]));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);   // build timing only, never the picture
  F.rot = rot;

  // ════ textures ════
  // canvas → data texture.  Per cell: mean colour behind the cut-out; mips by box filter with the alpha scaled so the
  // covered share of every level equals level 0 (pitfalls: black mip bleed, far foliage that vanishes).
  const toTex = (ctx, W, H, cols, rows, { gain = 1, minCell = 4 } = {}) => {
    const src = ctx.getImageData(0, 0, W, H).data, d = new Uint8Array(W * H * 4), cw = W / cols, ch = H / rows, cover = [], trim = [];
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = cy * ch; y < (cy + 1) * ch; y++) for (let x = cx * cw; x < (cx + 1) * cw; x++) { const o = (y * W + x) * 4, al = src[o + 3]; r += src[o] * al; g += src[o + 1] * al; b += src[o + 2] * al; a += al; if (al * gain > 127) n++; }
      const mr = a ? r / a : 128, mg = a ? g / a : 128, mb = a ? b / a : 0;
      for (let y = cy * ch; y < (cy + 1) * ch; y++) for (let x = cx * cw; x < (cx + 1) * cw; x++) { const o = (y * W + x) * 4, al = src[o + 3] / 255, q = ((H - 1 - y) * W + x) * 4;
        d[q] = src[o] * al + mr * (1 - al); d[q + 1] = src[o + 1] * al + mg * (1 - al); d[q + 2] = src[o + 2] * al + mb * (1 - al); d[q + 3] = Math.min(255, src[o + 3] * gain); }
      cover.push(n / (cw * ch));
      // the tight polygon round the cut-out: its box in the cell and how much of each corner is empty (bl, br, tr, tl)
      let x0 = cw, y0 = ch, x1 = 0, y1 = 0; const T = 40 / gain;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (src[((cy * ch + y) * W + cx * cw + x) * 4 + 3] > T) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0 || y1 <= y0) { trim.push({ box: [0, 0, 1, 1], cut: [0, 0, 0, 0] }); continue; }
      x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(cw, x1 + 4); y1 = Math.min(ch, y1 + 4); const bw = x1 - x0, bh = y1 - y0, cut = [2, 2, 2, 2];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (src[((cy * ch + y) * W + cx * cw + x) * 4 + 3] > T) { const fx = (x - x0) / bw, fy = 1 - (y - y0) / bh; cut[0] = Math.min(cut[0], fx + fy); cut[1] = Math.min(cut[1], 1 - fx + fy); cut[2] = Math.min(cut[2], 2 - fx - fy); cut[3] = Math.min(cut[3], fx + 1 - fy); }
      trim.push({ box: [x0 / cw, 1 - y1 / ch, x1 / cw, 1 - y0 / ch], cut: cut.map((c) => Math.max(0, Math.min(0.46, c - 0.035))) });
    }
    let cov0 = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) cov0++; cov0 /= W * H;
    const mips = [{ data: d, width: W, height: H }]; let s = d, w = W, h = H;
    while (w % 2 === 0 && h % 2 === 0 && Math.min(w / cols, h / rows) / 2 >= minCell) {
      const nw = w / 2, nh = h / 2, m = new Uint8Array(nw * nh * 4);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const o = (y * nw + x) * 4, a = (y * 2 * w + x * 2) * 4, b = a + 4, c = a + w * 4, e = c + 4; for (let k = 0; k < 4; k++) m[o + k] = (s[a + k] + s[b + k] + s[c + k] + s[e + k] + 2) >> 2; }
      let lo = 1, hi = 4; for (let it = 0; it < 7; it++) { const g = (lo + hi) / 2; let n = 0; for (let i = 3; i < m.length; i += 4) if (m[i] * g > 127) n++; if (n / (nw * nh) < cov0) lo = g; else hi = g; }
      for (let i = 3; i < m.length; i += 4) m[i] = Math.min(255, m[i] * lo);
      mips.push({ data: m, width: nw, height: nh }); s = m; w = nw; h = nh;
    }
    const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); tex.mipmaps = mips; tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
    return { tex, cover, trim };
  };
  F.atlas = ({ size = 1024, height, cells = [2, 2], draw, seed = 1, gain = 1 }) => {
    const W = size, H = height || size, [cols, rows] = cells, cw = W / cols, ch = H / rows, cv = mkCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < cols * rows; i++) { ctx.save(); ctx.translate((i % cols) * cw, Math.floor(i / cols) * ch); ctx.beginPath(); ctx.rect(2, 2, cw - 4, ch - 4); ctx.clip(); draw(ctx, i, DR.rng(seed * 131 + i * 17 + 5), cw, ch); ctx.restore(); }
    const t = toTex(ctx, W, H, cols, rows, { gain });
    return { tex: t.tex, cover: t.cover, trim: t.trim, canvas: cv, cols, rows, n: cols * rows, cw, ch,
      uv: (i) => { const cx = i % cols, cy = Math.floor(i / cols); return [cx / cols, 1 - (cy + 1) / rows, (cx + 1) / cols, 1 - cy / rows]; } };
  };
  F.ramp = (stops, n = 64) => {
    const K = stops.map((s) => [s[0], DR.rgb(s[1])]).sort((a, b) => a[0] - b[0]), d = new Uint16Array(n * 4), h = THREE.DataUtils.toHalfFloat;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); let j = 0; while (j < K.length - 2 && K[j + 1][0] < t) j++; const a = K[j], b = K[Math.min(K.length - 1, j + 1)], u = sat(DR.unlerp(a[0], b[0], t));
      for (let k = 0; k < 3; k++) d[i * 4 + k] = h(lerp(a[1][k], b[1][k], u)); d[i * 4 + 3] = h(1); }
    const tex = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat, THREE.HalfFloatType); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
    return tex;
  };

  // ── painting helpers (canvas "inks" are data, not colours: red = shade, green = hue, blue = wood) ──
  const P = (F.paint = {});
  P.ink = (shade, hue = 0.5, wood = 0, a = 1) => `rgba(${Math.round(sat(shade) * 255)},${Math.round(sat(hue) * 255)},${Math.round(sat(wood) * 255)},${a})`;
  // a tapered twig through points [[x,y],…]
  P.twig = (ctx, pts, w0, w1, ink) => { ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const n = pts.length - 1;
    for (let i = 1; i <= n; i++) { ctx.lineWidth = lerp(w0, w1, (i - 0.5) / n); ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); } };
  // a burst of needles from (x, y): `dir` (radians, 0 = up the canvas) ± fan/2, lengths r·[len0..1], drawn dark first then light
  P.needles = (ctx, x, y, r, dir, fan, n, rng, { shade = [0.4, 1], hue = 0.5, hueVar = 0.06, w = 1.6, len0 = 0.65, core = 0.5, alpha = 1, curve = 0 } = {}) => {
    if (core > 0) { ctx.fillStyle = P.ink(shade[0] * 0.8, hue, 0, 0.96); ctx.beginPath(); ctx.ellipse(x + Math.sin(dir) * r * 0.2, y - Math.cos(dir) * r * 0.2, r * core * (fan > 4 ? 1 : 0.62), r * core, dir, 0, TAU); ctx.fill(); }
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const f = i / n, a = dir + (rng() - 0.5) * fan, l = r * lerp(len0, 1, rng()) * (1 - 0.25 * Math.abs(a - dir) / Math.max(fan * 0.5, 0.01) * (fan < 4 ? 1 : 0));
      const sh = lerp(shade[0], shade[1], f * f * 0.75 + rng() * 0.25), ex = x + Math.sin(a) * l, ey = y - Math.cos(a) * l;
      ctx.strokeStyle = P.ink(sh, hue + (rng() - 0.5) * 2 * hueVar, 0, alpha); ctx.lineWidth = w * (0.75 + 0.5 * rng()); ctx.beginPath(); ctx.moveTo(x, y);
      if (curve) { const b = (rng() - 0.5) * curve * l; ctx.quadraticCurveTo((x + ex) / 2 + Math.cos(a) * b, (y + ey) / 2 + Math.sin(a) * b + Math.abs(b) * 0.6, ex, ey); } else ctx.lineTo(ex, ey);
      ctx.stroke(); } };
  // leaf outlines in leaf space: base at the origin, tip at (0, −1).  Arrays of [x, y].
  P.shapes = {
    palmate: (lobes = 7, cut = 0.62, wide = 0.2, span = 2.15) => { const pts = [], h = (lobes - 1) / 2;
      for (let k = 0; k < lobes; k++) { const t = (k - h) / h, a = t * span, L = lerp(1, 0.5, Math.pow(Math.abs(t), 1.5)), sn = Math.sin(a), cs = -Math.cos(a), px = -cs, py = sn;   // (sn, cs) = lobe axis, (px, py) = its left normal
        if (k === 0) pts.push([sn * 0.1 - px * 0.05, cs * 0.1 - py * 0.05]);
        pts.push([sn * L * 0.5 - px * wide * L, cs * L * 0.5 - py * wide * L], [sn * L * 0.8 - px * wide * L * 0.55, cs * L * 0.8 - py * wide * L * 0.55], [sn * L, cs * L], [sn * L * 0.8 + px * wide * L * 0.55, cs * L * 0.8 + py * wide * L * 0.55], [sn * L * 0.5 + px * wide * L, cs * L * 0.5 + py * wide * L]);
        if (k < lobes - 1) { const a2 = (((k + 0.5) - h) / h) * span, R = (1 - cut) * lerp(1, 0.55, Math.pow(Math.abs((k + 0.5 - h) / h), 1.5)); pts.push([Math.sin(a2) * R, -Math.cos(a2) * R]); } }
      return pts; },
    ovate: (wide = 0.3, at = 0.4, n = 9) => { const L = [], R = []; for (let i = 0; i <= n; i++) { const t = i / n, w = wide * Math.pow(Math.sin(Math.PI * Math.pow(t, at / 0.5 > 1 ? 1.25 : 0.8)), 0.85); L.push([-w, -t]); R.push([w, -t]); } return L.concat(R.reverse()); },
    lobed: (wide = 0.3, lobes = 5, depth = 0.22, n = 22) => { const L = [], R = []; for (let i = 0; i <= n; i++) { const t = i / n, w = wide * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.8) * (1 - depth * (0.5 + 0.5 * Math.cos(t * lobes * TAU))) + 0.02 * (1 - t); L.push([-w, -t]); R.push([w, -t]); } return L.concat(R.reverse()); },
    lance: (wide = 0.1, n = 6) => { const L = [], R = []; for (let i = 0; i <= n; i++) { const t = i / n, w = wide * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.3 * t); L.push([-w, -t]); R.push([w, -t]); } return L.concat(R.reverse()); },
  };
  // one leaf: outline `shape` scaled to `len`, turned to `ang` (0 = tip up the canvas), filled with (shade, hue); veins a touch darker
  P.leaf = (ctx, x, y, len, ang, shape, { shade = 0.8, hue = 0.5, veins = 0, veinW = 1, rim = 0 } = {}) => {
    const c = Math.cos(ang) * len, s = Math.sin(ang) * len; ctx.beginPath();
    for (let i = 0; i < shape.length; i++) { const q = shape[i], px = x + q[0] * c - q[1] * s, py = y + q[0] * s + q[1] * c; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = P.ink(shade, hue); ctx.fill();
    if (rim) { ctx.strokeStyle = P.ink(shade * rim, hue); ctx.lineWidth = veinW; ctx.stroke(); }
    if (veins) { ctx.strokeStyle = P.ink(shade * 0.78, hue); ctx.lineWidth = veinW; ctx.beginPath();
      if (veins === 1) { ctx.moveTo(x, y); ctx.lineTo(x + s * 0.92, y - c * 0.92); }
      else { const h = (veins - 1) / 2; for (let k = 0; k < veins; k++) { const t = (k - h) / h, a = ang + t * 2.15, L = len * lerp(1, 0.5, Math.pow(Math.abs(t), 1.5)) * 0.9; ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * L, y - Math.cos(a) * L); } }
      ctx.stroke(); } };
  // a grass blade: from (x0,y0) to (x1,y1), bowed sideways by `bend`, width w at the base tapering to a point
  P.blade = (ctx, x0, y0, x1, y1, bend, w, ink) => { const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2 - Math.abs(bend) * 0.35, dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w * 0.5, ny = (dx / l) * w * 0.5;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x0 - nx, y0 - ny); ctx.quadraticCurveTo(mx - nx * 0.8, my - ny * 0.8, x1, y1); ctx.quadraticCurveTo(mx + nx * 0.8, my + ny * 0.8, x0 + nx, y0 + ny); ctx.closePath(); ctx.fill(); };

  // ── bark: a tiling height picture → RG slope, B height, A cavity (height against its own blur) ──
  // kinds: 'plates' (pine: layered scales between dark cracks), 'furrows' (oak: long ridges), 'smooth' (maple, birch: streaks + lenticels)
  F.bark = ({ kind = 'plates', size = 512, seed = 3, cols = 5, rows = 4, layers = 5, draw } = {}) => {
    const S = size, cv = mkCanvas(S, S), ctx = cv.getContext('2d', { willReadFrequently: true }), rng = DR.rng(seed), g = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
    const wrap = (x, y, r, fn) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i * S, Y = y + j * S; if (X > -r && X < S + r && Y > -r && Y < S + r) fn(X, Y); } };
    if (draw) draw(ctx, S, rng, wrap);
    else if (kind === 'plates') {
      ctx.fillStyle = g(0); ctx.fillRect(0, 0, S, S);
      const cw = S / cols, rh = S / rows, plates = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) plates.push([(i + 0.5 + (j % 2) * 0.5 + (rng() - 0.5) * 0.45) * cw, (j + 0.5 + (rng() - 0.5) * 0.5) * rh, cw * rng.range(0.5, 0.68), rh * rng.range(0.5, 0.72), rng() * 9, rng.range(0.7, 1)]);
      for (let i = plates.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [plates[i], plates[j]] = [plates[j], plates[i]]; }
      for (const [px, py, rx, ry, ph, top] of plates) { const sx = (rng() - 0.5) * rx * 0.3, sy = (rng() - 0.5) * ry * 0.3;
        for (let l = 0; l < layers; l++) { const k = 1 - (l / layers) * 0.78, ox = sx * l / layers, oy = sy * l / layers, v = (70 + (l / (layers - 1)) * 175 * top) * rng.range(0.92, 1.06);
          wrap(px, py, Math.max(rx, ry) * 1.3, (X, Y) => { ctx.fillStyle = g(Math.min(255, v)); ctx.beginPath();
            for (let a = 0; a <= 18; a++) { const t = (a / 18) * TAU, rr = 1 + 0.2 * DR.noise1(t * 1.6 + ph + l * 0.7, 5) + 0.08 * DR.noise1(t * 5 + ph, 9), sq = Math.pow(Math.abs(Math.cos(t)), 0.55) * Math.sign(Math.cos(t)), sq2 = Math.pow(Math.abs(Math.sin(t)), 0.55) * Math.sign(Math.sin(t));
              const qx = X + ox + sq * rx * k * rr, qy = Y + oy + sq2 * ry * k * rr; if (a) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy); }
            ctx.closePath(); ctx.fill(); }); } }
      for (let i = 0; i < 900; i++) { const x = rng() * S, y = rng() * S, l = rng.range(6, 30) * S / 512; ctx.strokeStyle = g(rng() < 0.5 ? 0 : 255, 0.07); ctx.lineWidth = rng.range(0.6, 1.6); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 3, y + l); ctx.stroke(); }
    } else if (kind === 'furrows') {
      ctx.fillStyle = g(20); ctx.fillRect(0, 0, S, S);
      const n = cols * 2;
      for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) { const x0 = (i + 0.5) * S / n, a1 = rng.range(4, 10) * S / 512, a2 = rng.range(2, 5) * S / 512, p1 = rng() * TAU, p2 = rng() * TAU, f2 = 2 + Math.floor(rng() * 3), w = (S / n) * [0.78, 0.5, 0.22][pass];
        for (const off of [-S, 0, S]) { ctx.strokeStyle = g([105, 165, 230][pass] * rng.range(0.9, 1.05)); ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.setLineDash(pass ? [rng.range(40, 120), rng.range(3, 9)] : []); ctx.beginPath();
          for (let y = -8; y <= S + 8; y += 8) { const x = x0 + off + a1 * Math.sin((y / S) * TAU + p1) + a2 * Math.sin((y / S) * TAU * f2 + p2) + (DR.hash2(i, 77) - 0.5) * 14; if (y === -8) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke(); } }
      ctx.setLineDash([]);
      for (let i = 0; i < 700; i++) { const x = rng() * S, y = rng() * S; ctx.strokeStyle = g(rng() < 0.6 ? 0 : 255, 0.08); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 4, y + rng.range(8, 40)); ctx.stroke(); }
    } else {
      ctx.fillStyle = g(150); ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 520; i++) { const x = rng() * S, y = rng() * S, l = rng.range(20, 150) * S / 512; ctx.strokeStyle = g(rng() < 0.5 ? 60 : 235, 0.1); ctx.lineWidth = rng.range(1, 4); for (const oy of [-S, 0]) { ctx.beginPath(); ctx.moveTo(x, y + oy); ctx.lineTo(x + (rng() - 0.5) * 6, y + oy + l); ctx.stroke(); } }
      for (let i = 0; i < 90; i++) { const x = rng() * S, y = rng() * S, l = rng.range(5, 16) * S / 512; ctx.strokeStyle = g(rng() < 0.7 ? 240 : 40, 0.5); ctx.lineWidth = rng.range(1.5, 3); for (const ox of [-S, 0]) { ctx.beginPath(); ctx.moveTo(x + ox, y); ctx.lineTo(x + ox + l, y + (rng() - 0.5) * 2); ctx.stroke(); } }
    }
    const src = ctx.getImageData(0, 0, S, S).data, h = new Float32Array(S * S), bl = new Float32Array(S * S), tmp = new Float32Array(S * S), d = new Uint8Array(S * S * 4), at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
    for (let i = 0; i < S * S; i++) h[i] = src[i * 4] / 255;
    const R = Math.max(2, Math.round(S / 64)), nrm = 1 / (2 * R + 1);   // box blur, wrapped, two passes
    for (let y = 0; y < S; y++) { let a = 0; for (let k = -R; k <= R; k++) a += at(k, y); for (let x = 0; x < S; x++) { tmp[y * S + x] = a * nrm; a += at(x + R + 1, y) - at(x - R, y); } }
    for (let x = 0; x < S; x++) { let a = 0; for (let k = -R; k <= R; k++) a += tmp[((k + S) % S) * S + x]; for (let y = 0; y < S; y++) { bl[y * S + x] = a * nrm; a += tmp[((y + R + 1) % S) * S + x] - tmp[((y - R + S) % S) * S + x]; } }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const o = ((S - 1 - y) * S + x) * 4, hh = at(x, y);
      d[o] = 255 * sat(0.5 + (at(x + 1, y) - at(x - 1, y)) * 1.6); d[o + 1] = 255 * sat(0.5 - (at(x, y + 1) - at(x, y - 1)) * 1.6); d[o + 2] = 255 * hh; d[o + 3] = 255 * sat(0.5 + (hh - bl[y * S + x]) * 1.5); }
    const tex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
    return tex;
  };

  // ════ skeleton: a recursive branch walk ════
  // spec = { levels: [L0 (trunk), L1 (limbs), L2, …], group: 1, sink: 0.4, base: [x,y,z], dir: [x,y,z] }
  // A level (numbers may be n, [lo, hi] or a function (ctx, rng) → n; ctx = { u, k, n, b (parent), y } for children):
  //   len (m) · lenBy(u) · r (trunk: metres; children: share of the parent's radius there) · rMax · end (tip radius share) · taper · flare (trunk)
  //   seg · wander (rad/m of smooth meander) · wanderFreq · up (1/m; >0 curls up, <0 droops; may be f(s)) · flat (1/m pull to level; f(s))
  //   sway [metres, waves] (trunk: an S-curve laid over the walk, sideways in two planes)
  //   kink { every (segments), angle (rad, about the vertical), flip, lift } zig-zags · loose (how much its tip moves in wind)
  //   n · from · to (where on the parent) · bias · angle (from the parent's axis) · azi ('alt' = flat herringbone | f(ctx) → radians | golden spiral) · roll
  //   leaf { from, step (m), tip } → anchors for foliage: { p, d, lv, loose, grp, r, s }.  `group` = the level whose branches name a clump (pad).
  F.skeleton = (spec, rng) => {
    const L = spec.levels, B = [], anchors = [], grpLv = spec.group ?? 1;
    const sample = (b, u) => { const n = b.pts.length - 1, f = sat(u) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i; return { p: V.lerp(b.pts[i], b.pts[i + 1], t), d: b.dirs[i], r: lerp(b.rad[i], b.rad[i + 1], t), loose: lerp(b.loose[i], b.loose[i + 1], t) }; };
    const grow = (lv, p0, d0, len, r0, parent, loose0, grp) => {
      const S = L[lv], seg = Math.max(2, Math.round(val(S.seg ?? 6, rng))), step = len / seg, id = B.length;
      const wa = val(S.wander ?? 0, rng), wf = S.wanderFreq ?? 1.5, sA = rng() * 99, sB = rng() * 99, end = S.end ?? 0.2, taper = S.taper ?? 1, tip = S.tip ?? 0.012;
      const b = { id, lv, pts: [p0.slice()], rad: [], loose: [loose0], dirs: [], len, parent, grp: lv === grpLv ? id : grp };
      B.push(b);
      let d = V.norm(d0), p = p0.slice(), ks = rng.sign();
      for (let i = 0; i <= seg; i++) {
        const s = i / seg;
        b.rad.push(Math.max(tip, r0 * lerp(1, end, Math.pow(s, taper)) * (1 + (S.flare ?? 0) * Math.exp((-s * len) / 0.5))));
        if (i === seg) break;
        const e1 = perp(d), e2 = V.cross(d, e1), w = wa * step;
        d = V.mad(d, e1, DR.noise1(s * wf + sA, 3) * w); d = V.mad(d, e2, DR.noise1(s * wf + sB, 7) * w);
        if (S.kink && i > 0 && i % S.kink.every === 0) { d = rot(d, [0, 1, 0], ks * val(S.kink.angle, rng)); if (rng() < (S.kink.flip ?? 0.8)) ks = -ks; d[1] += val(S.kink.lift ?? 0, rng); }
        d[1] += fnv(S.up, s) * step; if (S.flat) d[1] *= 1 - sat(fnv(S.flat, s) * step);
        V.norm(d, d); b.dirs.push(d.slice()); p = V.mad(p, d, step); b.pts.push(p.slice()); b.loose.push(sat(loose0 + (S.loose ?? 0.3) * (i + 1) / seg * (i + 1) / seg));
      }
      b.dirs.push(d.slice());
      if (S.sway) { const A = val(S.sway[0], rng), w = val(S.sway[1], rng), p1 = rng() * TAU, p2 = rng() * TAU, a = rng() * TAU, h1 = [Math.cos(a), 0, Math.sin(a)], h2 = [-h1[2], 0, h1[0]];
        for (let i = 1; i <= seg; i++) { const s = i / seg; b.pts[i] = V.mad(V.mad(b.pts[i], h1, A * (Math.sin(TAU * w * s + p1) - Math.sin(p1))), h2, A * 0.6 * (Math.sin(TAU * w * 0.63 * s + p2) - Math.sin(p2))); }
        for (let i = 0; i <= seg; i++) b.dirs[i] = V.norm(V.sub(b.pts[Math.min(seg, i + 1)], b.pts[Math.max(0, i - 1)])); }
      if (S.leaf) { const lf = S.leaf, stp = lf.step ?? 0.5, put = (u) => { const a = sample(b, u); anchors.push({ p: a.p, d: a.d, r: a.r, loose: a.loose, lv, grp: b.grp, branch: id, s: u }); };
        for (let dist = Math.max((lf.from ?? 0) * len, stp * 0.4); dist < len - stp * 0.35; dist += stp * (0.8 + 0.4 * rng())) put(dist / len);
        if (lf.tip !== false) put(1); }
      const C = L[lv + 1];
      if (C) { const n = Math.round(val(C.n, rng, b)), ph0 = rng() * TAU;
        for (let k = 0; k < n; k++) {
          const f = n > 1 ? (k + (C.jit ?? 0.4) * (rng() - 0.5)) / (n - 1) : 0.5, u = sat(lerp(C.from ?? 0.3, C.to ?? 1, Math.pow(sat(f), C.bias ?? 1))), at = sample(b, u), ctx = { u, k, n, b, y: at.p[1] };
          const ang = val(C.angle ?? 0.9, rng, ctx); let radial;
          if (C.azi === 'alt') { let side = V.cross([0, 1, 0], at.d); if (V.len(side) < 0.05) side = perp(at.d); V.norm(side, side); radial = rot(V.mul(side, k % 2 ? 1 : -1), at.d, (C.roll ?? 0.3) * rng.gauss()); }
          else { const phi = typeof C.azi === 'function' ? C.azi(ctx, rng) : ph0 + k * 2.39996 + (rng() - 0.5) * (C.aziJit ?? 0.7); let a0 = V.mad([0, 0, 1], at.d, -at.d[2]); if (V.len(a0) < 0.05) a0 = perp(at.d); V.norm(a0, a0); radial = rot(a0, at.d, phi); }
          const dir = V.add(V.mul(at.d, Math.cos(ang)), V.mul(radial, Math.sin(ang)));
          grow(lv + 1, at.p, dir, val(C.len, rng, ctx) * (C.lenBy ? C.lenBy(u, ctx) : 1), Math.min(at.r * val(C.r ?? 0.5, rng, ctx), C.rMax ?? 9), b, at.loose, b.grp);
        } }
      return b;
    };
    const base = spec.base || [0, -(spec.sink ?? 0.4), 0], T = L[0];
    grow(0, base, spec.dir || [0, 1, 0], val(T.len, rng) + (spec.base ? 0 : (spec.sink ?? 0.4)), val(T.r, rng), null, 0, -1);
    let height = 0, radius = 0; for (const b of B) for (const p of b.pts) { height = Math.max(height, p[1]); radius = Math.max(radius, Math.hypot(p[0], p[2])); }
    return { branches: B, anchors, height, radius, sample };
  };

  // tubes round the skeleton.  sides per level, uv in bark tiles (u wraps a whole number of tiles), wound outward.
  F.woodGeo = (sk, { sides = [10, 6, 4, 3], maxLevel = 9, minRad = 0, skip = 1, tile = [0.8, 1.6], twist = 0 } = {}) => {
    const pos = [], nrm = [], uv = [], br = [], idx = [];
    for (const b of sk.branches) {
      if (b.lv > maxLevel || b.rad[0] < minRad) continue;
      const S = Math.max(3, sides[Math.min(b.lv, sides.length - 1)]), n = b.pts.length, base = pos.length / 3, ut = Math.max(1, Math.round((TAU * b.rad[0]) / tile[0]));
      const sel = []; for (let i = 0; i < n; i += skip) sel.push(i); if (sel[sel.length - 1] !== n - 1) sel.push(n - 1);
      let e1 = null, vv = DR.hash2(b.id, 5), prev = null;
      for (const i of sel) {
        const p = b.pts[i], t = V.norm(V.sub(b.pts[Math.min(n - 1, i + 1)], b.pts[Math.max(0, i - 1)]));
        e1 = e1 ? V.norm(V.mad(e1, t, -V.dot(e1, t))) : perp(t);
        const e2 = V.cross(t, e1), r = b.rad[i];
        if (prev) vv += V.dist(p, prev) / tile[1]; prev = p;
        for (let j = 0; j <= S; j++) { const a = (j / S) * TAU, c = Math.cos(a), s = Math.sin(a), nx = e1[0] * c + e2[0] * s, ny = e1[1] * c + e2[1] * s, nz = e1[2] * c + e2[2] * s;
          pos.push(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r); nrm.push(nx, ny, nz); uv.push((j / S) * ut + twist * vv, vv); br.push(t[0], t[1], t[2], b.loose[i]); }
      }
      for (let i = 0; i < sel.length - 1; i++) for (let j = 0; j < S; j++) { const a = base + i * (S + 1) + j, c = a + S + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aBr', new THREE.Float32BufferAttribute(br, 4));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    return g;
  };

  // ════ foliage: spray cards on the anchors ════
  // spec = { layers: [layer, …], normal: { card, clump, crown, up }, ao: { k, min, inner }, clumpDrop }
  // A layer makes n sprays per anchor (n may be fractional: 1.4 → one, sometimes two):
  //   when(anchor) · n · size (m, the card's width) · aspect (height / width) · cells [atlas cells]
  //   orient: 'flat' (lies level, its picture's stem along the branch) | 'up' (stands on its base edge) | 'out' (faces away
  //           from the crown's middle) | 'free'
  //   tilt (rad of random lean) · droop (rad the far edge hangs) · spread [radial, vertical] m · lift (m) · sink (share of an 'up' card below its anchor)
  // The result is shuffled; every spray carries a card normal, a clump centre and the crown centre (soft CROWN normals are
  // made per vertex from them in sprayGeo), an occlusion value from the foliage above it, and a looseness for wind.
  F.foliage = (anchors, spec, rng) => {
    const list = [], lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const a of anchors) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a.p[k]); hi[k] = Math.max(hi[k], a.p[k]); }
    const cen0 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    for (const a of anchors) for (const Ls of spec.layers) {
      if (Ls.when && !Ls.when(a)) continue;
      const nf = val(Ls.n ?? 1, rng, a), n = Math.floor(nf) + (rng() < nf - Math.floor(nf) ? 1 : 0), sp = Ls.spread || [0, 0];
      for (let k = 0; k < n; k++) {
        const size = val(Ls.size ?? 1, rng, a), hw = size / 2, hh = hw * val(Ls.aspect ?? 1, rng, a), dsc = rng.disc(), tilt = val(Ls.tilt ?? 0.25, rng, a), yaw = rng() * TAU;
        let c = [a.p[0] + dsc[0] * sp[0], a.p[1] + (rng() * 2 - 1) * sp[1] + val(Ls.lift ?? 0, rng, a), a.p[2] + dsc[1] * sp[0]], ax, ay, sway = null;
        let out = [c[0] - cen0[0], 0, c[2] - cen0[2]]; if (V.len(out) < 0.05) out = [Math.cos(yaw), 0, Math.sin(yaw)]; V.norm(out, out);
        const orient = Ls.orient || 'flat';
        if (orient === 'flat') {
          let f = [a.d[0], 0, a.d[2]]; if (V.len(f) < 0.2) f = out.slice(); V.norm(f, f); f = rot(f, [0, 1, 0], (rng() - 0.5) * 2 * (Ls.yaw ?? 0.7));
          let u = V.cross(f, [0, 1, 0]); const tAx = [Math.cos(yaw), 0, Math.sin(yaw)], tg = tilt * (0.35 + 0.65 * rng());
          f = rot(f, tAx, tg); u = rot(u, tAx, tg);
          if (Ls.droop) { const dr = val(Ls.droop, rng, a); f = rot(f, u, dr); }
          ax = V.mul(u, hw); ay = V.mul(f, hh);
        } else if (orient === 'up') {
          const u = [Math.cos(yaw), 0, Math.sin(yaw)], lean = rot([0, 1, 0], V.cross([0, 1, 0], out), tilt * (0.3 + 0.7 * rng())), v = rot(lean, u, (rng() - 0.5) * tilt);
          ax = V.mul(u, hw); ay = V.mul(v, hh); c = V.mad(c, v, hh * (1 - 2 * (Ls.sink ?? 0.1))); sway = [a.loose, sat(a.loose + (Ls.loose ?? 0.1) + 0.15)];
        } else {
          let nn = orient === 'out' ? V.norm([c[0] - cen0[0], (c[1] - cen0[1]) * 1.2 + 0.4, c[2] - cen0[2]]) : V.norm([rng.gauss(), Math.abs(rng.gauss()) * 0.8 + 0.2, rng.gauss()]);
          nn = V.norm(V.add(nn, [rng.gauss() * tilt, rng.gauss() * tilt, rng.gauss() * tilt]));
          const u = rot(perp(nn), nn, yaw), v = V.cross(nn, u); ax = V.mul(u, hw); ay = V.mul(v, hh);
        }
        const nrm = V.norm(V.cross(ax, ay)), ls = sat(a.loose + (Ls.loose ?? 0.1));
        list.push({ c, ax, ay, n: nrm, cell: Ls.cells[Math.floor(rng() * Ls.cells.length)], rnd: rng(), sway: sway || [ls, ls], grp: a.grp, ao: 1, area: 4 * hw * hh });
      }
    }
    return F.finish(list, spec, rng);
  };
  // clump centres, crown centre and radii, occlusion from above, shuffle
  F.finish = (list, spec = {}, rng = DR.rng(7)) => {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], G = new Map();
    for (const s of list) { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], s.c[k]); hi[k] = Math.max(hi[k], s.c[k]); }
      let g = G.get(s.grp); if (!g) G.set(s.grp, (g = { c: [0, 0, 0], n: 0, ylo: 1e9 })); V.add(g.c, s.c, g.c); g.n++; g.ylo = Math.min(g.ylo, s.c[1]); }
    for (const g of G.values()) { V.mul(g.c, 1 / g.n, g.c); g.c[1] = Math.min(g.c[1], g.ylo) - (spec.clumpDrop ?? 0.6); }
    const center = spec.center || [(lo[0] + hi[0]) / 2, lerp(lo[1], hi[1], spec.centerY ?? 0.35), (lo[2] + hi[2]) / 2];
    const radii = [Math.max(0.5, (hi[0] - lo[0]) / 2 + 0.4), Math.max(0.5, (hi[1] - lo[1]) * 0.6 + 0.4), Math.max(0.5, (hi[2] - lo[2]) / 2 + 0.4)];
    // occlusion: leaf area above each spray, counted in 0.7 m columns (own column full weight, the eight round it a third)
    const ao = { k: 0.5, min: 0.35, inner: 0.25, ...(spec.ao || {}) }, cs = ao.cell ?? 0.7, col = new Map(), key = (i, j) => i * 4096 + j;
    for (const s of list) { const k = key(Math.floor(s.c[0] / cs), Math.floor(s.c[2] / cs)); let a = col.get(k); if (!a) col.set(k, (a = [])); a.push(s); }
    for (const s of list) { const ci = Math.floor(s.c[0] / cs), cj = Math.floor(s.c[2] / cs); let above = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = col.get(key(ci + i, cj + j)); if (!a) continue; const w = i || j ? 0.33 : 1; for (const o of a) if (o.c[1] > s.c[1] + 0.12) above += o.area * w * Math.abs(o.n[1] * 0.7 + 0.3); }
      const q = Math.hypot((s.c[0] - center[0]) / radii[0], (s.c[1] - center[1]) / radii[1], (s.c[2] - center[2]) / radii[2]);
      s.ao = lerp(ao.min, 1, Math.exp((-ao.k * above) / (cs * cs * 3))) * lerp(1 - ao.inner, 1, smooth(0.25, 0.85, q));
      s.cc = G.get(s.grp).c; }
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    return { list, center, radii, lo, hi, nw: { card: 0.3, clump: 0.5, crown: 0.4, up: 0.25, ...(spec.normal || {}) } };
  };
  // a tuft: n upright cards standing on their base edge round a point (grass, plume grass, reeds, ferns, low shrubs)
  // spec = { n, w, h (m), cells, radius (scatter of the bases), lean (rad outward), flat (rad: fronds laid back instead of standing), normalUp }
  F.clump = (rng, spec) => {
    const list = [], n = Math.round(val(spec.n ?? 5, rng));
    for (let i = 0; i < n; i++) { const w = val(spec.w ?? 0.6, rng), h = val(spec.h ?? 1, rng), yaw = (i / n) * Math.PI + rng() * 0.9, a2 = rng() * TAU, rr = Math.sqrt(rng()) * (spec.radius ?? 0.15);
      const u = [Math.cos(yaw), 0, Math.sin(yaw)], out = rr > 0.02 ? [Math.cos(a2), 0, Math.sin(a2)] : V.cross(u, [0, 1, 0]), lean = val(spec.lean ?? 0.2, rng) * (rng() < 0.5 ? 1 : 0.4);
      let v = rot([0, 1, 0], V.cross([0, 1, 0], out), lean); if (spec.flat) v = rot(v, V.cross([0, 1, 0], out), val(spec.flat, rng));
      const uu = spec.flat ? V.norm(V.cross(v, V.cross(out, v))) : u, ax = V.mul(spec.flat ? V.norm(V.cross([0, 1, 0], out)) : uu, w / 2), ay = V.mul(v, h / 2), c = V.mad([out[0] * rr, -(spec.sink ?? 0.03) * h, out[2] * rr], v, h / 2);
      list.push({ c, ax, ay, n: V.norm(V.cross(ax, ay)), cell: spec.cells[Math.floor(rng() * spec.cells.length)], rnd: rng(), sway: [0, 1], aoV: [spec.aoBase ?? 0.55, 1], grp: 0, ao: 1, area: w * h }); }
    const f = F.finish(list, { ao: { k: 0, inner: 0 }, normal: { card: 0.12, clump: 0, crown: 0.1, up: spec.normalUp ?? 1 } }, rng);
    for (const s of f.list) s.ao = 1;
    return f;
  };
  // polygons for the first `count` sprays, each grown by `grow` about its centre: the card is trimmed to the cell's
  // cut-out (box + cut corners, from the atlas), so up to 8 corners / 6 triangles and a quarter less empty fill.
  // normal = crown normal per vertex.
  F.sprayGeo = (fol, atlas, { count, grow = 1 } = {}) => {
    const L = fol.list, n = Math.min(L.length, Math.max(0, Math.round(count ?? L.length))), pos = [], nrm = [], uv = [], card = [], spr = [], idx = [], w = fol.nw, C = fol.center, R = fol.radii;
    const polys = atlas.trim.map((t) => { const [a, b, c, d] = t.box, bw = c - a, bh = d - b, k = t.cut, P2 = [], put = (x, y) => P2.push([x, y]);
      if (k[0] > 0.07) { put(a, b + k[0] * bh); put(a + k[0] * bw, b); } else put(a, b);
      if (k[1] > 0.07) { put(c - k[1] * bw, b); put(c, b + k[1] * bh); } else put(c, b);
      if (k[2] > 0.07) { put(c, d - k[2] * bh); put(c - k[2] * bw, d); } else put(c, d);
      if (k[3] > 0.07) { put(a + k[3] * bw, d); put(a, d - k[3] * bh); } else put(a, d);
      return P2; });
    for (let i = 0; i < n; i++) { const s = L[i], r = atlas.uv(s.cell), flip = V.dot(s.n, [s.c[0] - C[0], (s.c[1] - C[1]) + R[1] * 0.6, s.c[2] - C[2]]) < 0 ? -1 : 1, P2 = polys[s.cell], base = pos.length / 3;
      for (let k = 0; k < P2.length; k++) { const fx = P2[k][0], fy = P2[k][1], sx = (fx * 2 - 1) * grow, sy = (fy * 2 - 1) * grow, p = [s.c[0] + s.ax[0] * sx + s.ay[0] * sy, s.c[1] + s.ax[1] * sx + s.ay[1] * sy, s.c[2] + s.ax[2] * sx + s.ay[2] * sy];
        const oc = V.norm(V.sub(p, s.cc)), ow = V.norm([(p[0] - C[0]) / R[0], (p[1] - C[1]) / R[1], (p[2] - C[2]) / R[2]]);
        const cn = V.norm([s.n[0] * flip * w.card + oc[0] * w.clump + ow[0] * w.crown, s.n[1] * flip * w.card + oc[1] * w.clump + ow[1] * w.crown + w.up, s.n[2] * flip * w.card + oc[2] * w.clump + ow[2] * w.crown]);
        pos.push(p[0], p[1], p[2]); nrm.push(cn[0], cn[1], cn[2]); card.push(s.n[0], s.n[1], s.n[2]); uv.push(lerp(r[0], r[2], fx), lerp(r[1], r[3], fy));
        spr.push(s.ao * (s.aoV ? lerp(s.aoV[0], s.aoV[1], fy) : 1), s.rnd, lerp(s.sway[0], s.sway[1], fy), k / P2.length);
        if (k > 1) idx.push(base, base + k - 1, base + k); } }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aCard', new THREE.Float32BufferAttribute(card, 3)); g.setAttribute('aSpray', new THREE.Float32BufferAttribute(spr, 4)); g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    return g;
  };

  // ════ materials ════
  // the wind stage (see the top of the file).  aInst = per plant: hue, brightness, seed, height in object metres.
  const BEND = /* glsl */`
    attribute vec4 aInst; uniform vec4 uFlWind;
    #ifdef USE_INSTANCING
      #define FL_M mat3(instanceMatrix)
      #define FL_ROOT (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz
    #else
      #define FL_M mat3(1.0)
      #define FL_ROOT modelMatrix[3].xyz
    #endif
    vec3 flBend(vec3 p, float loose, float seed){
      mat3 m = FL_M; float s2 = dot(m[0], m[0]), h = clamp(p.y / max(aInst.w, 0.1), 0.0, 1.3);
      vec3 w = drWindAt(FL_ROOT, 1.0);
      vec3 off = w * (h * sqrt(h) * uFlWind.x * aInst.w * 0.1 + loose * uFlWind.y);
      float ph = uWind.w * (2.6 + 1.7 * fract(seed * 7.13)) + seed * 37.0 + dot(p, vec3(0.9, 0.7, 1.1));
      off.y += sin(ph) * loose * uFlWind.z * (0.3 + uWind.z);
      vec3 q = p + (off * m) / s2; float l0 = length(p);
      return l0 > 1e-3 ? q * (l0 / max(length(q), 1e-3)) : q;
    }`;
  F.BEND = BEND;
  const share = (m, key) => { m.customProgramCacheKey = () => key; if (m.userData.depth) m.userData.depth.customProgramCacheKey = () => key + '-d'; return m; };
  const lin = (c) => new THREE.Vector3(...DR.rgb(c));
  const shadowOff = [];   // uniforms that hold "metres toward the light" in shadow-map depth units
  DR.onFrame(() => { const c = DR.sun && DR.sun.shadow.camera; if (c) for (const s of shadowOff) s.u.value.w = s.m / (c.far - c.near); }, 90);

  // opts: atlas (texture) · ramp (texture) · wood / wood2 ('#hex': twig colour at atlas hue 0 / 1)
  //   hueSpread (how far the atlas' per-leaf hue moves along the ramp) · sprayHue (per-spray random) · shade [lo, hi] (what atlas shade 0 / 1 mean)
  //   through [strength, glow] (back-light: glow adds when the lens looks toward the light) · scatter (light that leaks through the crown wherever a leaf faces)
  //   mottle (0..1 light drift in world space) · mottleScale (1/m) · hueMottle (ramp drift)
  //   cardMix (0 = pure crown normal … 1 = card normal) · far [threshold, from m, to m] (cut-out threshold falls with distance = coverage gain)
  //   wind { flex (m of lean per 10 m of height at wind 1), bough, bob, flutter } · shadowReach (m: the back-light ignores casters nearer than this)
  //   impostor: true for the far cards (normals rebuilt as a ball round the crown centre)
  F.leafMaterial = (o) => {
    const wd = { flex: 0.5, bough: 0.5, bob: 0.05, flutter: 0.012, ...(o.wind || {}) }, th = o.through || [0.9, 1.5], far = o.far || [0.34, 50, 260], sh = o.shade || [0.5, 1.05];
    const uF = { value: new THREE.Vector4(far[0], far[1], far[2], 0) }; shadowOff.push({ u: uF, m: o.shadowReach ?? 5 });
    const m = DR.mat({ base: 'lambert', side: THREE.DoubleSide, alphaToCoverage: true, depth: true, defines: o.impostor ? { FL_FAR: 1 } : {},
      uniforms: { uFlA: { value: o.atlas }, uFlR: { value: o.ramp }, uFlWood: { value: lin(o.wood || '#3b2a20') }, uFlWood2: { value: lin(o.wood2 || o.wood || '#3b2a20') },
        uFlP: { value: new THREE.Vector4(o.hueSpread ?? 0.5, o.sprayHue ?? 0.12, sh[0], sh[1]) }, uFlT: { value: new THREE.Vector4(th[0], th[1], o.scatter ?? 0.2, o.cardMix ?? 0.25) }, uFlF: uF, uFlQ: { value: new THREE.Vector4(o.mottle ?? 0.35, o.mottleScale ?? 0.07, o.hueMottle ?? 0.12, 0) },
        uFlWind: { value: new THREE.Vector4(wd.flex, wd.bough, wd.bob, wd.flutter) } },
      vHead: /* glsl */`attribute vec3 aCard; attribute vec4 aSpray; uniform vec4 uFlP; varying vec4 vLeaf; varying vec3 vCard;
        #ifdef FL_FAR
          varying vec3 vCrown;
        #endif
        ${BEND}`,
      vBody: /* glsl */`
        float flSeed = aInst.z + aSpray.y;
        #ifdef FL_FAR
          vCrown = FL_M * normal / length(FL_M[0]);
        #endif
        drPos = flBend(drPos, aSpray.z, flSeed);
        mat3 flM = FL_M;
        #ifdef USE_INSTANCING
          vec3 flW = (modelMatrix * (instanceMatrix * vec4(drPos, 1.0))).xyz;
        #else
          vec3 flW = (modelMatrix * vec4(drPos, 1.0)).xyz;
        #endif
        float flNear = 1.0 - smoothstep(18.0, 46.0, distance(flW, cameraPosition));
        drPos += aCard * (sin(uWind.w * 8.0 + flSeed * 60.0 + aSpray.w * 19.0) * uFlWind.w * (0.3 + uWind.z) * flNear * step(0.001, aSpray.z));
        vCard = normalize(flM * aCard);
        vLeaf = vec4(aInst.x + (aSpray.y - 0.5) * uFlP.y, aInst.y * (0.9 + 0.2 * aSpray.y), aSpray.x, 0.0);`,
      fHead: /* glsl */`uniform sampler2D uFlA, uFlR; uniform vec3 uFlWood, uFlWood2; uniform vec4 uFlP, uFlT, uFlF, uFlQ; varying vec4 vLeaf; varying vec3 vCard;
        #ifdef FL_FAR
          varying vec3 vCrown;
        #endif`,
      alpha: /* glsl */`vec4 flT = texture2D(uFlA, vUv0);
        #ifdef DEPTH_PACKING
          if (flT.a < 0.4) discard;
        #else
          if (flT.a < 0.06) discard;
        #endif`,
      fBody: /* glsl */`
        vec3 flV = cameraPosition - vWPos; float flD = length(flV); flV /= flD;
        float flThr = mix(0.5, uFlF.x, smoothstep(uFlF.y, uFlF.z, flD));
        float flA = clamp((flT.a - flThr) / max(fwidth(flT.a), 0.004) + 0.5, 0.0, 1.0);
        vec3 flC = normalize(vCard);
        flA *= smoothstep(0.03, 0.22, abs(dot(flC, flV)));          // edge-on cards fade instead of streaking
        if (flA < 0.03) discard;
        diffuseColor.a = flA;
        vec4 flNz = drN4(vWPos.xz * uFlQ.y + vWPos.y * uFlQ.y * 0.71);        // world-space mottle: light and hue drift across cards, not per card
        vec3 flLeaf = texture2D(uFlR, vec2(clamp(vLeaf.x + (flT.g - 0.5) * uFlP.x + (flNz.g - 0.5) * uFlQ.z, 0.0, 1.0) * 0.96875 + 0.015625, 0.5)).rgb;
        float flSh = mix(uFlP.z, uFlP.w, flT.r) * vLeaf.y * (1.0 + uFlQ.x * (flNz.r * 2.0 - 1.0));
        diffuseColor.rgb = max(mix(flLeaf, mix(uFlWood, uFlWood2, flT.g), flT.b) * flSh, vec3(0.012));
        vec3 flN = N * faceDirection;                                 // the crown normal does not flip with the card's side
        #ifdef FL_FAR
          flN = normalize(vCrown + flC * sign(dot(flC, flV)) * sqrt(max(1.0 - dot(vCrown, vCrown), 0.05)));
        #endif
        N = normalize(flN + flC * (dot(flC, flN) < 0.0 ? -uFlT.w : uFlT.w));
        drAO = vLeaf.z;
        // light from behind: not stopped by the plant's own crown (the shadow map is read uFlF.w nearer the light), but by hills and far trees
        float flLit = 1.0;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          { vec3 flS = vDirectionalShadowCoord[0].xyz / vDirectionalShadowCoord[0].w;
            if (flS.x > 0.0 && flS.x < 1.0 && flS.y > 0.0 && flS.y < 1.0 && flS.z < 1.0) flLit = step(flS.z - uFlF.w, unpackRGBAToDepth(texture2D(directionalShadowMap[0], flS.xy))); }
        #endif
        float flVL = max(dot(-flV, uKeyDir), 0.0);
        vec3 flTh = flLeaf * (1.0 - flT.b) * (0.55 + 0.45 * flT.r) * flLit;
        drThrough = flTh * uFlT.x * (0.6 + uFlT.y * flVL * flVL);
        drEmit += flTh * uKeyCol * drSun * (uFlT.z * 0.3183 * vLeaf.z * (0.5 + 0.5 * flVL));`,
    });
    return share(m, o.impostor ? 'flora-leaf-far' : 'flora-leaf');
  };
  // opts: tex (F.bark) · low [crack '#hex', face '#hex'] colours at the foot · high [crack, face] colours up the tree and on thin limbs
  //   grade [h0, h1] (share of the plant's height where low turns to high) · thin (m: limbs thinner than this take the high colours)
  //   bump · moss ['#hex', amount] (soft patches on the weather side, mostly low) · wind (as the leaves)
  F.barkMaterial = (o) => {
    const wd = { flex: 0.5, bough: 0.5, bob: 0.05, flutter: 0, ...(o.wind || {}) }, lo = o.low || ['#1c1512', '#5a4a40'], hi = o.high || lo, gr = o.grade || [0.4, 0.75], moss = o.moss || ['#55603a', 0];
    const m = DR.mat({ base: 'lambert', depth: true,
      uniforms: { uBk: { value: o.tex }, uBk0: { value: lin(lo[0]) }, uBk1: { value: lin(lo[1]) }, uBk2: { value: lin(hi[0]) }, uBk3: { value: lin(hi[1]) }, uBkM: { value: new THREE.Vector4(...DR.rgb(moss[0]), moss[1]) },
        uBkP: { value: new THREE.Vector4(gr[0], gr[1], o.thin ?? 0.05, o.bump ?? 1.2) }, uFlWind: { value: new THREE.Vector4(wd.flex, wd.bough, wd.bob, 0) } },
      vHead: /* glsl */`attribute vec4 aBr; varying vec3 vAxis; varying vec4 vBk; ${BEND}`,
      vBody: /* glsl */`
        vBk = vec4(drPos.y / max(aInst.w, 0.1), 0.0, aInst.y, aInst.z);
        vAxis = normalize(FL_M * aBr.xyz);
        drPos = flBend(drPos, aBr.w, aInst.z);`,
      fHead: /* glsl */`uniform sampler2D uBk; uniform vec3 uBk0, uBk1, uBk2, uBk3; uniform vec4 uBkM, uBkP; varying vec3 vAxis; varying vec4 vBk;`,
      fBody: /* glsl */`
        vec4 bk = texture2D(uBk, vUv0); vec4 bn = drN4(vUv0 * vec2(0.23, 0.11) + vBk.w * 7.0);
        float bUp = smoothstep(uBkP.x, uBkP.y, vBk.x + (bn.r - 0.5) * 0.18);
        vec3 bCol = mix(mix(uBk0, uBk2, bUp), mix(uBk1, uBk3, bUp), smoothstep(0.1, 0.8, bk.b) * (0.7 + 0.3 * bk.a));
        bCol *= 0.72 + 0.56 * bn.g;
        float bMoss = uBkM.w * smoothstep(0.45, 0.75, bn.r * 0.6 + bk.b * 0.25 + N.y * 0.3 + (1.0 - vBk.x) * 0.25);
        bCol = mix(bCol, uBkM.rgb * (0.6 + 0.6 * bk.b), bMoss);
        diffuseColor.rgb = bCol * vBk.z;
        vec3 bA = normalize(vAxis), bT = cross(bA, N);
        N = normalize(N - (bT * (bk.r - 0.5) + bA * (bk.g - 0.5)) * uBkP.w * mix(1.0, 0.55, bUp));
        drAO = mix(0.4, 1.0, smoothstep(0.2, 0.55, bk.a));`,
    });
    return share(m, 'flora-bark');
  };

  // ════ species ════
  // S = { name, variants: n, seed, atlas: atlas | () → atlas, build(rng, v) → { wood: skeleton | null, foliage },
  //       leaf: leafMaterial opts (without atlas), bark: barkMaterial opts | null, wood: { full: woodGeo opts, mid: woodGeo opts },
  //       lod: { mid: 60, far: 170, cull: ∞ (m), keep: 0.35, grow: 1.5 (mid sprays), type: 'impostor' | 'sprays' | 'none', px: 256, farKeep: 3, farGrow: 2 },
  //       hue(rng) → place on the ramp when a site has no tint · bright [lo, hi] · orient: 'up' | 'wall' · slope (0..1 follow the ground normal) }
  F.species = (S) => {
    const lod = { mid: 60, far: 170, cull: Infinity, keep: 0.35, grow: 1.5, type: S.build && S.bark ? 'impostor' : 'sprays', px: 256, farKeep: 3, farGrow: 1.8, ...(S.lod || {}) };
    const sp = { name: S.name, lod, variants: null, stats: { name: S.name, buildMs: 0, variants: [], planted: { full: 0, mid: 0, far: 0, culled: 0 }, drawCalls: 0, triangles: 0, cover: null } };
    const tris = (g) => (g ? g.index.count / 3 : 0);
    sp.init = () => {
      if (sp.variants) return sp; const t0 = now();
      const atlas = (sp.atlas = typeof S.atlas === 'function' ? S.atlas() : S.atlas); sp.stats.cover = atlas.cover.map((c) => +c.toFixed(2));
      const leafO = typeof S.leaf === 'function' ? S.leaf() : S.leaf, barkO = typeof S.bark === 'function' ? S.bark() : S.bark;
      sp.leaf = F.leafMaterial({ ...leafO, atlas: atlas.tex }); sp.bark = barkO ? (barkO.isMaterial ? barkO : F.barkMaterial(barkO)) : null;
      sp.variants = [];
      for (let v = 0; v < (S.variants || 1); v++) {
        const b = S.build(DR.rng((S.seed || 1) * 7919 + v * 104729), v), fol = b.foliage, sk = b.wood, L = fol.list;
        let height = sk ? sk.height : 0, radius = sk ? sk.radius : 0; for (const s of L) { height = Math.max(height, s.c[1] + Math.abs(s.ay[1])); radius = Math.max(radius, Math.hypot(s.c[0], s.c[2]) + V.len(s.ax)); }
        const vr = { fol, sk, height, radius, geo: [null, null, null] };
        vr.geo[0] = { wood: sk && F.woodGeo(sk, { ...(S.wood && S.wood.full) }), leaf: F.sprayGeo(fol, atlas) };
        vr.geo[1] = { wood: sk && F.woodGeo(sk, { maxLevel: 1, sides: [6, 4, 3], skip: 2, ...(S.wood && S.wood.mid) }), leaf: F.sprayGeo(fol, atlas, { count: Math.ceil(L.length * lod.keep), grow: lod.grow }) };
        if (lod.type === 'sprays') vr.geo[2] = { wood: null, leaf: F.sprayGeo(fol, atlas, { count: Math.min(L.length, lod.farKeep), grow: lod.farGrow }) };
        sp.variants.push(vr);
        sp.stats.variants.push({ height: +height.toFixed(1), sprays: [L.length, Math.ceil(L.length * lod.keep)], triangles: [tris(vr.geo[0].wood) + tris(vr.geo[0].leaf), tris(vr.geo[1].wood) + tris(vr.geo[1].leaf), 0], wood: [tris(vr.geo[0].wood), tris(vr.geo[1].wood)] });
      }
      if (lod.type === 'impostor') { const far = bakeFar(sp.variants, atlas, lod.px, S); sp.farLeaf = F.leafMaterial({ ...leafO, atlas: far.tex, impostor: true, sprayHue: 0 }); sp.farAtlas = far;
        sp.variants.forEach((vr, v) => { vr.geo[2] = { wood: null, leaf: far.geo[v] }; }); }
      else sp.farLeaf = sp.leaf;
      sp.variants.forEach((vr, v) => { sp.stats.variants[v].triangles[2] = vr.geo[2] ? tris(vr.geo[2].leaf) : 0; });
      sp.stats.buildMs = Math.round(now() - t0);
      return sp;
    };
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), N3 = new THREE.Vector3();
    sp.plant = (scene, sites, opts = {}) => {
      sp.init();
      const near = opts.near || (() => 0), bias = opts.lodBias ?? 1, buckets = new Map(), group = new THREE.Group(), nv = sp.variants.length, br = S.bright || [0.86, 1.1]; group.name = 'flora:' + S.name;
      const cell = [48, 110, 260].map((c) => c * (opts.cluster ?? 1));
      for (const s of sites) {
        const seed = s.seed ?? Math.floor(DR.hash3(Math.round(s.p[0] * 31), Math.round(s.p[2] * 31), Math.round(s.p[1] * 7)) * 1e6), d = near(s.p) / bias, Lv = opts.level ?? (d < lod.mid ? 0 : d < lod.far ? 1 : d < lod.cull ? 2 : 3);
        if (Lv === 3 || (Lv === 2 && lod.type === 'none')) { sp.stats.planted.culled++; continue; }
        const v = s.variant ?? Math.floor(DR.hash2(seed, 11) * nv) % nv, key = v + '|' + Lv + '|' + Math.floor(s.p[0] / cell[Lv]) + '|' + Math.floor(s.p[2] / cell[Lv]);
        let b = buckets.get(key); if (!b) buckets.set(key, (b = { v, Lv, sites: [] })); b.sites.push({ s, seed });
      }
      for (const b of buckets.values()) {
        const vr = sp.variants[b.v], G = vr.geo[b.Lv], n = b.sites.length, inst = new Float32Array(n * 4), mats = new Float32Array(n * 16), c = new THREE.Vector3(); let rad = 0;
        b.sites.forEach(({ s, seed }, i) => { const r = DR.rng(seed + 17), sc = (s.h ? s.h / vr.height : s.s ?? 1) * (s.h ? 1 : r.range(0.94, 1.06)), yaw = s.r ?? r() * TAU;
          if (S.orient === 'wall' && s.n) { Q.setFromAxisAngle(Y, Math.atan2(s.n[0], s.n[2]) + (s.r ?? 0)); }
          else { Q.setFromAxisAngle(Y, yaw); if (s.n && (S.slope ?? 0.12) > 0) { N3.set(s.n[0], s.n[1], s.n[2]).lerp(Y, 1 - (S.slope ?? 0.12)).normalize(); Q2.setFromUnitVectors(Y, N3); Q.premultiply(Q2); } }
          P3.set(s.p[0], s.p[1], s.p[2]); S3.set(sc * r.range(0.95, 1.05), sc, sc * r.range(0.95, 1.05)); M4.compose(P3, Q, S3); M4.toArray(mats, i * 16);
          inst[i * 4] = s.tint ?? (S.hue ? S.hue(r) : 0.5); inst[i * 4 + 1] = r.range(br[0], br[1]) * (s.bright ?? 1); inst[i * 4 + 2] = r(); inst[i * 4 + 3] = vr.height;
          c.x += s.p[0] / n; c.y += (s.p[1] + vr.height * sc * 0.5) / n; c.z += s.p[2] / n; });
        b.sites.forEach(({ s }) => { const sc = s.h ? s.h / vr.height : s.s ?? 1; rad = Math.max(rad, Math.hypot(s.p[0] - c.x, s.p[1] + vr.height * sc * 0.5 - c.y, s.p[2] - c.z) + (vr.height * 0.5 + vr.radius) * sc * 1.1 + 2.5); });
        const add = (base, mat) => { if (!base) return; const g = new THREE.BufferGeometry(); for (const k in base.attributes) g.setAttribute(k, base.attributes[k]); g.setIndex(base.index);
          g.setAttribute('aInst', new THREE.InstancedBufferAttribute(inst, 4)); const m = new THREE.InstancedMesh(g, mat, n); m.instanceMatrix.array.set(mats); m.instanceMatrix.needsUpdate = true;
          m.boundingSphere = new THREE.Sphere(c.clone(), rad); m.boundingBox = new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(rad * 2, rad * 2, rad * 2)); m.name = `${S.name}:${b.v}:${b.Lv}`;
          DR.shadowed(m, opts.shadow !== false && (b.Lv < 2 || lod.farShadow !== false), true); group.add(m); sp.stats.drawCalls++; sp.stats.triangles += (g.index.count / 3) * n; };
        add(G.wood, sp.bark); add(G.leaf, b.Lv === 2 ? sp.farLeaf : sp.leaf);
        sp.stats.planted[['full', 'mid', 'far'][b.Lv]] += n;
      }
      scene.add(group); return group;
    };
    return sp;
  };

  // the far cards: each variant drawn twice (seen along z and along x) with Canvas 2D from its own sprays and limbs,
  // back to front, into one data atlas with the same channels as the leaf atlas.  Shade carries occlusion and top light.
  const bakeFar = (variants, atlas, px, S) => {
    const nv = variants.length, W = px * 2, H = px * nv, cv = mkCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true }), geo = [];
    // small copies of the leaf atlas at four shades (canvas cannot scale one channel per sprite)
    const csz = Math.max(32, Math.min(128, atlas.cw / 4)), k = csz / atlas.cw, cw = atlas.canvas.width * k, chh = atlas.canvas.height * k, small = mkCanvas(cw, chh), sx = small.getContext('2d');
    let from = atlas.canvas, fw = atlas.canvas.width; while (fw / 2 >= cw * 1.99) { const t = mkCanvas(fw / 2, from.height / 2); t.getContext('2d').drawImage(from, 0, 0, t.width, t.height); from = t; fw /= 2; }
    sx.drawImage(from, 0, 0, cw, chh);
    const shades = [0.5, 0.67, 0.84, 1].map((q) => { const c = mkCanvas(cw, chh), x = c.getContext('2d'); x.drawImage(small, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${Math.round(q * 255)},255,255)`; x.fillRect(0, 0, cw, chh); x.globalCompositeOperation = 'destination-in'; x.drawImage(small, 0, 0); return c; });
    const ccw = cw / atlas.cols, cch = chh / atlas.rows;
    variants.forEach((vr, v) => {
      const L = vr.fol.list, lo = [1e9, -0.3, 1e9], hi = [-1e9, vr.height + 0.2, -1e9];
      for (const s of L) for (const k2 of [0, 2]) { const e = Math.abs(s.ax[k2]) + Math.abs(s.ay[k2]); lo[k2] = Math.min(lo[k2], s.c[k2] - e); hi[k2] = Math.max(hi[k2], s.c[k2] + e); }
      if (vr.sk) for (const b of vr.sk.branches) for (const p of b.pts) for (const k2 of [0, 2]) { lo[k2] = Math.min(lo[k2], p[k2] - 0.3); hi[k2] = Math.max(hi[k2], p[k2] + 0.3); }
      const pos = [], nrm = [], uv = [], card = [], spr = [], idx = [], C = vr.fol.center, R = vr.fol.radii;
      for (let view = 0; view < 2; view++) {
        const hA = view ? 2 : 0, dA = view ? 0 : 2, w = hi[hA] - lo[hA], h = hi[1] - lo[1], sc = (px - 6) / Math.max(w, h), ox = view * px + (px - w * sc) / 2, oy = v * px + 3;
        const X = (p) => ox + (p[hA] - lo[hA]) * sc, Yp = (p) => oy + (hi[1] - p[1]) * sc, items = [];
        for (const s of L) items.push({ z: s.c[dA], s });
        if (vr.sk) for (const b of vr.sk.branches) for (let i = 0; i < b.pts.length - 1; i++) if (b.rad[i] * sc * 2 > 0.35) items.push({ z: (b.pts[i][dA] + b.pts[i + 1][dA]) / 2, b, i });
        items.sort((a, b2) => (view ? b2.z - a.z : a.z - b2.z));   // seen from +z (view 0) / from −x … either way: far side first
        ctx.save(); ctx.beginPath(); ctx.rect(view * px + 1, v * px + 1, px - 2, px - 2); ctx.clip(); ctx.lineCap = 'round';
        for (const it of items) {
          if (it.b) { const a = it.b.pts[it.i], b2 = it.b.pts[it.i + 1], up = sat(a[1] / vr.height * 1.6 - 0.35 + (it.b.lv > 0 ? 0.5 : 0)); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = P.ink(0.62, up, 1); ctx.lineWidth = Math.max(0.9, it.b.rad[it.i] * 2 * sc); ctx.beginPath(); ctx.moveTo(X(a), Yp(a)); ctx.lineTo(X(b2), Yp(b2)); ctx.stroke(); continue; }
          const s = it.s, top = 0.62 + 0.38 * sat(0.5 + 0.5 * (s.c[1] - s.cc[1]) / 1.2), q = Math.min(3, Math.max(0, Math.round((s.ao * top - 0.5) / 0.167)));
          const p0 = [s.c[0] - s.ax[0] + s.ay[0], s.c[1] - s.ax[1] + s.ay[1], s.c[2] - s.ax[2] + s.ay[2]], cx = s.cell % atlas.cols, cy = Math.floor(s.cell / atlas.cols);
          ctx.setTransform(2 * s.ax[hA] * sc, -2 * s.ax[1] * sc, -2 * s.ay[hA] * sc, 2 * s.ay[1] * sc, X(p0), Yp(p0));
          ctx.drawImage(shades[q], cx * ccw + 0.5, cy * cch + 0.5, ccw - 1, cch - 1, 0, 0, 1, 1);
        }
        ctx.restore();
        // the card: 2 × 5 cells, bent in depth to follow the trunk (so the two cards cross ON the trunk) and so the ball normals bend across it
        const base = pos.length / 3, u0 = ox / W, u1 = (ox + w * sc) / W, v1 = 1 - oy / H, v0 = 1 - (oy + h * sc) / H, tr = vr.sk && vr.sk.branches[0];
        const mid = (y) => { if (!tr) return C[dA]; let bi = 0, bd = 1e9; for (let i = 0; i < tr.pts.length; i++) { const d = Math.abs(tr.pts[i][1] - y); if (d < bd) { bd = d; bi = i; } } return tr.pts[bi][dA]; };
        for (let j = 0; j <= 5; j++) for (let i = 0; i <= 2; i++) { const p = [0, lerp(lo[1], hi[1], j / 5), 0]; p[hA] = lerp(lo[hA], hi[hA], i / 2); p[dA] = mid(p[1]);
          const q = [(p[0] - C[0]) / R[0], (p[1] - C[1]) / R[1] + 0.25, (p[2] - C[2]) / R[2]]; q[dA] = 0; const ql = V.len(q); if (ql > 0.96) V.mul(q, 0.96 / ql, q);
          pos.push(p[0], p[1], p[2]); nrm.push(q[0], q[1], q[2]); uv.push(lerp(u0, u1, i / 2), lerp(v0, v1, j / 5)); const cn = [0, 0, 0]; cn[dA] = 1; card.push(cn[0], cn[1], cn[2]); spr.push(1, DR.hash2(v, view), sat(p[1] / vr.height) * 0.35, (i + j) / 7); }
        for (let j = 0; j < 5; j++) for (let i = 0; i < 2; i++) { const a = base + j * 3 + i; idx.push(a, a + 1, a + 4, a, a + 4, a + 3); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('aCard', new THREE.Float32BufferAttribute(card, 3)); g.setAttribute('aSpray', new THREE.Float32BufferAttribute(spr, 4)); g.setIndex(idx); geo.push(g);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const t = toTex(ctx, W, H, 2, nv, { gain: S.lod && S.lod.gain || 1.5, minCell: 8 });
    return { tex: t.tex, cover: t.cover, canvas: cv, geo };
  };

  // ground cover: a species made of F.clump tufts.  spec = F.clump spec + { name, atlas, leaf, variants, seed, lod, hue, bright }
  F.tufts = (spec) => F.species({ name: spec.name, variants: spec.variants ?? 3, seed: spec.seed ?? 5, atlas: spec.atlas, leaf: { cardMix: 0.1, scatter: 0.3, ...spec.leaf }, bark: null, hue: spec.hue, bright: spec.bright, slope: spec.slope ?? 0.7,
    lod: { mid: 30, far: 70, cull: 160, keep: 0.6, grow: 1.25, type: 'sprays', farKeep: 2, farGrow: 1.6, farShadow: false, ...(spec.lod || {}) },
    build: spec.build || ((rng) => ({ wood: null, foliage: F.clump(rng, spec) })) });

  // sites on a ground: jittered tries inside bounds [x0, z0, x1, z1], kept with probability mask(x, z, y, n) and at least
  // minDist apart.  ground(x, z) → y or { y, n }.  → [{ p, n, s, r, seed }]
  F.scatter = ({ count, bounds, ground = () => 0, mask, minDist = 0, seed = 1, scale = [0.85, 1.15], tries = 12, tint }) => {
    const rng = DR.rng(seed), out = [], grid = new Map(), cs = Math.max(minDist, 1e-3), [x0, z0, x1, z1] = bounds;
    for (let t = 0; t < count * tries && out.length < count; t++) {
      const x = rng.range(x0, x1), z = rng.range(z0, z1), g = ground(x, z), y = typeof g === 'number' ? g : g.y, n = typeof g === 'number' ? null : g.n, sd = Math.floor(rng() * 1e6), keep = rng();
      if (y == null || (mask && keep > mask(x, z, y, n))) continue;
      const gi = Math.floor(x / cs), gj = Math.floor(z / cs); let ok = true;
      if (minDist > 0) for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1 && ok; i++) { const a = grid.get((gi + i) * 65537 + gj + j); if (a) for (const q of a) if (Math.hypot(q[0] - x, q[1] - z) < minDist) { ok = false; break; } }
      if (!ok) continue;
      if (minDist > 0) { const k = gi * 65537 + gj; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push([x, z]); }
      const s = { p: [x, y, z], s: rng.range(scale[0], scale[1]), r: rng() * TAU, seed: sd }; if (n) s.n = n; if (tint) s.tint = tint(x, z, rng); out.push(s);
    }
    return out;
  };
}
