// sprite-stack-flight · lib/stack.js — the engine (window.SS). No 3D engine, no polygons, no image files.
// A craft is a pile of flat pixel slices (a voxel model cut in layers) drawn bottom to top with one affine transform per
// slice; the world is a terraced height map drawn as stacked layers from above (oblique) and as vertical stripes in
// perspective (one column of pixels per ray); clouds are stacked discs. Everything draws into a small canvas (480×270)
// that is scaled up nearest-neighbour. In film mode every frame is a pure function of t (the flight is integrated once
// at build from the plan); in play mode the same flight model takes the pointer.
(function () {
'use strict';
const SS = {};
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
SS.clamp = clamp; SS.lerp = lerp; SS.smooth = smooth; SS.TAU = TAU;

// ---------- numbers: seeded rng, hash, wrapping value noise ----------
SS.rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (x, y, s = 0) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
SS.hash = hash;
// value noise that tiles with period `per` lattice cells
function vnoise(x, y, per, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const m = v => ((v % per) + per) % per, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed), c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// noise helpers bound to a world of size N (everything wraps at N)
SS.noise = (N, seed) => {
  const n = {
    // fbm: `cell` = size of the biggest feature in world cells (snapped so the world tiles)
    fbm(x, y, cell = 128, oct = 5, gain = .5) {
      let per = Math.max(1, Math.round(N / cell)), f = per / N, a = 1, s = 0, t = 0;
      for (let o = 0; o < oct; o++) { s += a * vnoise(x * f, y * f, per, seed + o * 101); t += a; a *= gain; per *= 2; f *= 2; }
      return s / t;
    },
    ridge(x, y, cell = 128, oct = 4) { let per = Math.max(1, Math.round(N / cell)), f = per / N, a = 1, s = 0, t = 0;
      for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(vnoise(x * f, y * f, per, seed + 77 + o * 131) * 2 - 1)); t += a; a *= .5; per *= 2; f *= 2; }
      return s / t; },
    value: (x, y, cell = 32) => { const per = Math.max(1, Math.round(N / cell)); return vnoise(x * per / N, y * per / N, per, seed + 999); },
    rnd: (x, y, k = 0) => hash(x, y, seed + 31 + k),
    // shortest wrapped distance between two points of the world
    dist: (ax, ay, bx, by) => { let dx = Math.abs(ax - bx) % N, dy = Math.abs(ay - by) % N; dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); return Math.hypot(dx, dy); },
  };
  return n;
};

// ---------- colour: packed ABGR uint32 (ImageData order on little-endian) ----------
const pack = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
const R = c => c & 255, G = c => (c >>> 8) & 255, B = c => (c >>> 16) & 255;
SS.hex = h => { if (typeof h === 'number') return h >>> 0; h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const v = parseInt(h, 16); return pack(v >> 16, (v >> 8) & 255, v & 255); };
SS.mix = (a, b, t) => pack(lerp(R(a), R(b), t), lerp(G(a), G(b), t), lerp(B(a), B(b), t));
SS.shade = (c, k) => pack(R(c) * k, G(c) * k, B(c) * k);
SS.css = c => typeof c === 'string' ? c : `rgb(${R(c)},${G(c)},${B(c)})`;
SS.ramp = (stops) => { const cs = stops.map(SS.hex); return t => { t = clamp(t, 0, 1) * (cs.length - 1); const i = Math.min(cs.length - 2, Math.floor(t)); return SS.mix(cs[i], cs[i + 1], t - i); }; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
SS.bayer = bayer;
// pick from a list of tones with ordered dither: v in 0..1
const toneAt = (tones, v, x, y) => { const f = clamp(v, 0, .9999) * (tones.length - 1), i = Math.floor(f); return tones[Math.min(tones.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))]; };
SS.toneAt = toneAt;

// ---------- pixel font 3×5 (A–Z 0–9 . , : - + / ' ! ? % * as degree) ----------
const GLYPH = {};
('A010101111101101B110101110101110C011100100100011D110101101101110E111100110100111F111100110100100G011100101101011H101101111101101I111010010010111J001001001101010K101101110101101L100100100100111M101111111101101N110101101101101O010101101101010P110101110100100Q010101101110011R110101110101101S011100010001110T111010010010010U101101101101111V101101101101010W101101111111101X101101010101101Y101101010010010Z111001010100111' +
 '0111101101101111101011001001011121100010101001113110001010001110410110111100100151111001100011106011100111101111711100101001001081111011111011119111101111001110.000000000000010,000000000010100:000010000010000-000000111000000+000010111010000/001001010100100\'010010000000000!010010010000010?110001010000010%101001010100101*010101010000000·000000010000000=000111000111000#101111101111101(010100100100010)010001001001010 000000000000000')
  .replace(/(.)([01]{15})/g, (_, ch, bits) => { GLYPH[ch] = bits; return ''; });
SS.textWidth = (s, k = 1) => s.length ? (s.length * 4 - 1) * k : 0;

// ---------- the voxel model → sprite stack ----------
// spec: { w, h, d, frames = 1, outline: '#1b1820' | null }. Axes: x = across (port → starboard when the nose points up),
// y = along (0 = nose end), z = up (0 = belly). build(M, frame) fills voxels with M.box / M.ell / M.tube / M.plate / M.fin …
SS.model = function (spec, build) {
  const { w, h, d } = spec, nf = spec.frames || 1, frames = [];
  let lights = {};
  for (let f = 0; f < nf; f++) {
    const vox = new Uint32Array(w * h * d), emit = new Uint8Array(w * h * d), I = (x, y, z) => (z * h + y) * w + x;
    const ok = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < w && y < h && z < d;
    const col = (c, x, y, z) => c === 0 || c == null ? 0 : typeof c === 'function' ? (v => v ? SS.hex(v) : 0)(c(x, y, z)) : SS.hex(c);
    const M = {
      w, h, d, frame: f,
      set(x, y, z, c) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (ok(x, y, z)) { vox[I(x, y, z)] = col(c, x, y, z); emit[I(x, y, z)] = 0; } },
      get: (x, y, z) => ok(x, y, z) ? vox[I(x, y, z)] : 0,
      box(x0, y0, z0, x1, y1, z1, c) { for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) M.set(x, y, z, c); },
      ell(cx, cy, cz, rx, ry, rz, c) { for (let z = Math.floor(cz - rz); z <= cz + rz; z++) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2; if (q <= 1) M.set(x, y, z, c); } },
      // a tube along y from y0 to y1; r(y01) or [r0, r1] radius (circle in x–z); centre cx, cz; squash = z radius / x radius
      tube(cx, cz, y0, y1, r, c, squash = 1) { const rf = typeof r === 'function' ? r : u => lerp(r[0], r[1], u);
        for (let y = y0; y <= y1; y++) { const rr = rf((y - y0) / Math.max(1, y1 - y0)); for (let z = Math.floor(cz - rr * squash); z <= cz + rr * squash; z++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) if (((x - cx) / rr) ** 2 + ((z - cz) / (rr * squash)) ** 2 <= 1) M.set(x, y, z, c); } },
      // a flat plate: polygon [[x,y],…] in the x–y plane, extruded z0..z1 (wings, tailplanes)
      plate(poly, z0, z1, c) { const b = bbox(poly); for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (inside(poly, x + .5, y + .5)) for (let z = z0; z <= z1; z++) M.set(x, y, z, c); },
      // a vertical fin: polygon [[y,z],…] in the y–z plane, extruded x0..x1
      fin(poly, x0, x1, c) { const b = bbox(poly); for (let z = b.y0; z <= b.y1; z++) for (let y = b.x0; y <= b.x1; y++) if (inside(poly, y + .5, z + .5)) for (let x = x0; x <= x1; x++) M.set(x, y, z, c); },
      // copy the port half (x < w/2) onto the starboard half where that is empty
      mirror() { for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) { const a = I(x, y, z), b = I(w - 1 - x, y, z); if (vox[a] && !vox[b]) { vox[b] = vox[a]; emit[b] = emit[a]; } } },
      // an emissive voxel (never shaded); name 'port' (red) and 'starboard' (green) are checked for handedness
      light(name, x, y, z, c) { M.set(x, y, z, c); if (ok(x, y, z)) emit[I(x, y, z)] = 1; lights[name] = { x, y, z, c: SS.hex(c) }; },
      glow(x, y, z, c) { M.set(x, y, z, c); if (ok(x, y, z)) emit[I(x, y, z)] = 1; },
    };
    build(M, f);
    frames.push(bake(vox, emit, w, h, d, spec));
  }
  const m = { w, h, d: d + (spec.outline ? 1 : 0), frames, lights, spec };
  m.voxels = frames[0].count;
  return m;
};
function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) }; }
function inside(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
// shade each voxel by which faces are open (light from the top-left, above), cut into slice canvases
function bake(vox, emit, w, h, d, spec) {
  const I = (x, y, z) => (z * h + y) * w + x, at = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d ? 0 : vox[I(x, y, z)];
  const slices = [], sil = new Uint8Array(w * h); let count = 0;
  const out = spec.outline ? SS.hex(spec.outline) : 0;
  if (out) slices.push(null);
  for (let z = 0; z < d; z++) {
    const cv = mk(w, h), cx = cv.getContext('2d'), im = cx.createImageData(w, h), px = new Uint32Array(im.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = vox[I(x, y, z)]; if (!c) continue; count++; sil[y * w + x] = 1;
      if (emit[I(x, y, z)]) { px[y * w + x] = c; continue; }
      let k = 1;
      if (!at(x, y, z + 1)) k *= 1.14; else if (!at(x, y, z - 1)) k *= .8;
      if (!at(x - 1, y, z)) k *= 1.06; if (!at(x + 1, y, z)) k *= .9;
      if (!at(x, y - 1, z)) k *= 1.04; if (!at(x, y + 1, z)) k *= .92;
      if (!at(x, y, z + 1) && (!at(x - 1, y, z) || !at(x, y - 1, z))) k *= 1.05;
      px[y * w + x] = SS.shade(c, k);
    }
    cx.putImageData(im, 0, 0); slices.push(cv);
  }
  if (out) {
    const cv = mk(w, h), cx = cv.getContext('2d'), im = cx.createImageData(w, h), px = new Uint32Array(im.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < w && Y < h && sil[Y * w + X]) n++; } if (n) px[y * w + x] = out; }
    cx.putImageData(im, 0, 0); slices[0] = cv;
  }
  // a flat silhouette for the ground shadow
  const sh = mk(w, h), sx = sh.getContext('2d'), si = sx.createImageData(w, h), sp = new Uint32Array(si.data.buffer);
  for (let i = 0; i < w * h; i++) if (sil[i]) sp[i] = pack(0, 0, 0);
  sx.putImageData(si, 0, 0);
  return { slices, shadow: sh, count };
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
SS.canvas = mk;

// body → ground rotation: yaw (heading, 0 = nose up / north), pitch (nose up +), roll (right wing down +)
function rot(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // Rz(yaw) · Rx(-pitch) · Ry(roll)
  const A = [[cr, 0, sr], [0, 1, 0], [-sr, 0, cr]];                       // Ry(roll)
  const P = [[1, 0, 0], [0, cp, sp], [0, -sp, cp]];                       // Rx(-pitch)
  const Y = [[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]];                       // Rz(yaw)
  const mul = (a, b) => a.map((r, i) => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
  return mul(Y, mul(P, A));
}
// draw a stack at screen (x, y): o = { yaw, pitch, roll, elev (radians; 90° = straight down), scale (px per voxel), frame }
SS.drawStack = function (ctx, model, o) {
  const nf = model.frames.length, fr = model.frames[(((o.frame | 0) % nf) + nf) % nf], sl = fr.slices, s = o.scale || 1, e = o.elev, sE = Math.sin(e), cE = Math.cos(e);
  const M = rot(o.yaw || 0, o.pitch || 0, o.roll || 0), cx = model.w / 2, cy = model.h / 2, cz = sl.length / 2;
  const a = s * M[0][0], c = s * M[0][1], e0 = s * M[0][2];
  const b = s * (sE * M[1][0] - cE * M[2][0]), d = s * (sE * M[1][1] - cE * M[2][1]), f0 = s * (sE * M[1][2] - cE * M[2][2]);
  const toward = M[1][2] * cE + M[2][2] * sE, sub = Math.max(1, Math.ceil(Math.hypot(e0, f0) - .01));
  const x = Math.round(o.x), y = Math.round(o.y), n = sl.length * sub;
  for (let q = 0; q < n; q++) {
    const k = toward >= 0 ? q : n - 1 - q, z = Math.floor(k / sub), zc = z + (k % sub) / sub - cz + .5;
    ctx.setTransform(a, b, c, d, x + e0 * zc, y + f0 * zc); ctx.drawImage(sl[z], -cx, -cy);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};
// where a model voxel lands on screen for the same transform (used by trails and the handedness check)
SS.projectVoxel = function (model, o, vx, vy, vz) {
  const s = o.scale || 1, e = o.elev, sE = Math.sin(e), cE = Math.cos(e), M = rot(o.yaw || 0, o.pitch || 0, o.roll || 0);
  const v = [vx + .5 - model.w / 2, vy + .5 - model.h / 2, vz + .5 - model.d / 2 + (model.spec.outline ? 1 : 0)];
  const g = [0, 1, 2].map(i => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
  return { x: o.x + s * g[0], y: o.y + s * (sE * g[1] - cE * g[2]) };
};
SS.rot = rot;

// ---------- the piece ----------
SS.create = function (opt = {}) {
  const W = opt.W || 480, H = opt.H || 270, FPS = opt.fps || 30, SCALE = opt.scale || 4;
  const Q = new URLSearchParams(location.search), RENDER = Q.has('render'), OFF = new Set((Q.get('off') || '').split(',').filter(Boolean));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const F = { W, H, FPS, SCALE, ctx, canvas: cv, Q, RENDER, OFF, opt, title: opt.title || '', sub: opt.sub || '', captions: [] };
  const img = ctx.createImageData(W, H), buf = new Uint32Array(img.data.buffer);
  const PW = Math.ceil(Math.hypot(W, H) / 2) * 2 + 2, PH = PW;                    // perspective buffer: covers any roll
  const pcv = mk(PW, PH), pctx = pcv.getContext('2d'), pimg = pctx.createImageData(PW, PH), pbuf = new Uint32Array(pimg.data.buffer), zbuf = new Float32Array(PW * PH);
  const ocv = mk(W, H), octx = ocv.getContext('2d'), oimg = octx.createImageData(W, H), obuf = new Uint32Array(oimg.data.buffer);
  const scv = mk(256, 256), sctx = scv.getContext('2d');                           // shadow scratch
  pctx.imageSmoothingEnabled = octx.imageSmoothingEnabled = sctx.imageSmoothingEnabled = false;

  // ---- look ----
  const pal = F.pal = {
    sky: ['#cfe6f0', '#9cc8e8', '#5f9fd8'], fog: '#cfe2ec', cloud: ['#8fa4c0', '#c4d3e6', '#eef4fa', '#ffffff'], shadow: .72,
    trail: '#f4f8ff', hud: '#7dff9a', text: '#ffffff', textShadow: '#14121c', band: '#14121c', sun: null, stars: 0,
  };
  F.look = o => { Object.assign(pal, o); prepLook(); return F; };
  let SKY, FOG, CLOUD, SUN, SUNH, STAR;
  function prepLook() { SKY = pal.sky.map(SS.hex); FOG = SS.hex(pal.fog); CLOUD = pal.cloud.map(SS.hex); SUN = pal.sun ? SS.hex(pal.sun.color || '#fff6d0') : 0; SUNH = pal.sun ? SS.hex(pal.sun.halo || pal.sun.color || '#ffe9a8') : 0; STAR = SS.hex(pal.starColor || '#f2f4ff'); }
  prepLook();

  // ---- world ----
  let N = 0, MASK = 0, HR, TOP, SIDE, TOPS, SIDES, KIND, LEVEL, SHMASK, maxH = 0, unit = 1, WATER = {};
  F.world = function (o) {
    N = o.size || 512; MASK = N - 1; unit = o.unit || 1; const seed = o.seed || 1, n = SS.noise(N, seed), NN = N * N;
    if (N & MASK) throw new Error('world size must be a power of two');
    const raw = new Float32Array(NN); LEVEL = new Int16Array(NN); HR = new Float32Array(NN); KIND = new Uint8Array(NN);
    TOP = new Uint32Array(NN); SIDE = new Uint32Array(NN);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const h = o.height(x, y, n); raw[y * N + x] = h; LEVEL[y * N + x] = h > 0 ? Math.round(h) : Math.floor(h); }
    const w = o.water || {}; WATER = { ramp: SS.ramp(w.ramp || ['#1b4f9c', '#2a6fc0', '#3d8fd6', '#58b4dc']), depth: w.depth || 8, foam: SS.hex(w.foam || '#e8f6ff'), glint: SS.hex(w.glint || '#ffffff'), glints: w.glints ?? .05, rate: w.rate || .9, shore: w.shore ?? 1 };
    const L = (x, y) => LEVEL[(y & MASK) * N + (x & MASK)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, lv = LEVEL[i];
      if (lv <= 0) { KIND[i] = 1; TOP[i] = WATER.ramp(1 + raw[i] / WATER.depth); if (L(x - 1, y) > 0 || L(x + 1, y) > 0 || L(x, y - 1) > 0 || L(x, y + 1) > 0) KIND[i] = WATER.shore ? 2 : 1; }
      else { HR[i] = lv * unit; const sl = Math.abs(L(x + 1, y) - L(x - 1, y)) + Math.abs(L(x, y + 1) - L(x, y - 1)); TOP[i] = SS.hex(o.color(lv, x, y, { raw: raw[i], slope: sl, n, rnd: n.rnd(x, y) })); }
    }
    // decorations: trees, rocks, houses … raise cells and repaint them
    const Wd = F.W = {
      N, n, unit, rng: SS.rng(seed * 7 + 3),
      level: (x, y) => L(x, y), height: (x, y) => HR[(y & MASK) * N + (x & MASK)], isLand: (x, y) => L(x, y) > 0, raw: (x, y) => raw[(y & MASK) * N + (x & MASK)],
      paint(x, y, c) { TOP[(y & MASK) * N + (x & MASK)] = SS.hex(c); },
      stamp(x, y, dh, c, side) { const i = (y & MASK) * N + (x & MASK); HR[i] = Math.max(HR[i], (Math.max(0, LEVEL[i]) + dh) * unit); TOP[i] = SS.hex(c); if (KIND[i]) KIND[i] = 3; if (side) SIDE[i] = SS.hex(side); else SIDE[i] = 0; },
      top: (x, y) => TOP[(y & MASK) * N + (x & MASK)],
    };
    if (o.decorate) o.decorate(Wd);
    // light from the north-west: a lit lip where the terrace steps down to the south / east, sides darker
    const sideK = o.side || .68, lip = o.lip ?? 1.1;
    const T2 = TOP.slice();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, h = HR[i]; if (h > maxH) maxH = h;
      if (KIND[i] === 1 || KIND[i] === 2) { SIDE[i] = SS.shade(T2[i], .8); continue; }
      const hs = HR[((y + 1) & MASK) * N + x], he = HR[y * N + ((x + 1) & MASK)], hw = HR[y * N + ((x - 1) & MASK)], hn = HR[((y - 1) & MASK) * N + x];
      let k = 1; if (hs < h || he < h) k *= lip; if (hn > h || hw > h) k *= .9;
      TOP[i] = SS.shade(T2[i], k); if (!SIDE[i]) SIDE[i] = SS.shade(T2[i], sideK); else SIDE[i] = SIDE[i];
    }
    TOPS = TOP.map(c => SS.shade(c, pal.shadow)); SIDES = SIDE.map(c => SS.shade(c, pal.shadow));
    F.N = N; F.maxH = maxH;
    return F;
  };
  F.terrainAt = (x, y) => HR[(Math.floor(y) & MASK) * N + (Math.floor(x) & MASK)];

  // ---- clouds: puffs of stacked discs; the whole field drifts with one wind, so its shadow is one moving mask ----
  let CLOUDS = [], WIND = [0, 0];
  F.clouds = function (o = {}) {
    const r = SS.rng(o.seed || 5), cnt = o.count ?? 40, base = o.base || [44, 60], size = o.size || [3, 8], puffs = o.puffs || [3, 7];
    WIND = o.wind || [1.2, .3]; CLOUDS = [];
    for (let k = 0; k < cnt; k++) {
      const x = r() * N, y = r() * N, b = lerp(base[0], base[1], r()), np = Math.round(lerp(puffs[0], puffs[1], r())), R0 = lerp(size[0], size[1], r()), ps = [];
      const stretch = o.stretch || 1.6, ang = o.angle ?? r() * TAU;
      for (let j = 0; j < np; j++) { const a = j === 0 ? 0 : r() * TAU, dd = j === 0 ? 0 : R0 * (.5 + r() * .9), rr = R0 * (j === 0 ? 1 : .55 + r() * .4);
        const ux = Math.cos(a) * dd * stretch, uy = Math.sin(a) * dd; ps.push({ dx: ux * Math.cos(ang) - uy * Math.sin(ang), dy: ux * Math.sin(ang) + uy * Math.cos(ang), z: b + rr * .55 + (o.flat ? 0 : r() * R0 * .3), r: rr }); }
      if (o.where && !o.where(x, y)) { k--; if (CLOUDS.length + 1e4 < k) break; continue; }
      CLOUDS.push({ x, y, puffs: ps, base: b, top: Math.max(...ps.map(p => p.z + p.r)) });
    }
    SHMASK = new Uint8Array(N * N);
    for (const c of CLOUDS) for (const p of c.puffs) { const rr = p.r * .95; for (let y = Math.floor(-rr); y <= rr; y++) for (let x = Math.floor(-rr); x <= rr; x++) if (x * x + y * y <= rr * rr) SHMASK[((Math.floor(c.y + p.dy + y)) & MASK) * N + ((Math.floor(c.x + p.dx + x)) & MASK)] = 1; }
    return F;
  };
  const shadowAt = (x, y, t) => SHMASK ? SHMASK[((Math.floor(y - WIND[1] * t)) & MASK) * N + ((Math.floor(x - WIND[0] * t)) & MASK)] : 0;
  F.inCloud = (x, y, z, t) => { for (const c of CLOUDS) { const cx = wrapNear(c.x + WIND[0] * t, x), cy = wrapNear(c.y + WIND[1] * t, y); if (Math.abs(cx - x) > 30 || Math.abs(cy - y) > 30) continue; for (const p of c.puffs) { const d = Math.hypot(cx + p.dx - x, cy + p.dy - y, (p.z - z) * 1.2) / p.r; if (d < 1) return 1 - d; } } return 0; };
  const wrapNear = (v, ref) => v + Math.round((ref - v) / N) * N;

  // ---- craft + flight model ----
  let CRAFT = null, CR = {};
  F.craft = function (model, o = {}) {
    CRAFT = model;
    CR = Object.assign({ mass: 1, speed: 24, turn: .9, climb: 1, clearance: 6, bankMax: 70, over: 1, chase: 2.4, chaseDist: 26, chaseRise: 6, eye: 1.2,
      frame: s => 0, trail: null, trailWhen: s => s.thr > .72 || Math.abs(s.bankCmd) > .55, minAlt: 4 }, o);
    return F;
  };
  function flyer(init) {
    const m = CR.mass, sq = Math.sqrt(m);
    const s = { x: init.x, y: init.y, z: init.z, psi: (init.heading || 0) * Math.PI / 180, phi: 0, phiD: 0, th: 0, thD: 0, v: CR.speed, thr: .5,
      roll: 0, rollAcc: 0, rollT: -1, rollDir: 1, camYaw: 0, camYawD: 0, ovx: init.x, ovy: init.y, ovvx: 0, ovvy: 0, bankCmd: 0, t: 0 };
    s.camYaw = s.psi;
    const rollDur = 1.15 * Math.sqrt(sq);
    s.startRoll = dir => { if (s.rollT < 0) { s.rollT = 0; s.rollDir = dir; } };
    s.step = (dt, cmd) => {
      const wb = 3.4 / sq, wp = 2.6 / sq, zb = .62;
      const bc = clamp(cmd.bank, -CR.bankMax, CR.bankMax) * Math.PI / 180; s.bankCmd = bc;
      s.phiD += (wb * wb * (bc - s.phi) - 2 * zb * wb * s.phiD) * dt; s.phi += s.phiD * dt;
      const tc = clamp(cmd.climb, -35, 35) * Math.PI / 180;
      s.thD += (wp * wp * (tc - s.th) - 2 * .75 * wp * s.thD) * dt; s.th += s.thD * dt;
      s.thr += (clamp(cmd.thr, 0, 1) - s.thr) * Math.min(1, dt * 2.2 / sq);
      const vT = CR.speed * (.55 + .9 * s.thr); s.v += (vT - s.v) * Math.min(1, dt / (1.1 * m));
      s.psi += CR.turn / sq * Math.tan(clamp(s.phi, -1.25, 1.25)) * dt;
      s.x += Math.sin(s.psi) * s.v * dt; s.y -= Math.cos(s.psi) * s.v * dt;
      s.z += s.v * Math.sin(s.th) * CR.climb * dt;
      const g = F.terrainAt(s.x, s.y) + CR.clearance * .5; if (s.z < g) s.z += (g - s.z) * Math.min(1, dt * 8);
      if (s.z < CR.minAlt) s.z = CR.minAlt;
      if (s.rollT >= 0) { s.rollT += dt; const u = s.rollT / rollDur; if (u >= 1) { s.rollAcc += s.rollDir * TAU; s.roll = 0; s.rollT = -1; } else s.roll = s.rollDir * TAU * backInOut(u); }
      // the chase camera swings after the heading (it lags, so turns read), the overhead camera leads the craft
      const wc = 2.1, zc = .9; s.camYawD += (wc * wc * (s.psi - s.camYaw) - 2 * zc * wc * s.camYawD) * dt; s.camYaw += s.camYawD * dt;
      const lead = s.v * .55, tx = s.x + Math.sin(s.psi) * lead, ty = s.y - Math.cos(s.psi) * lead, wo = 1.5;
      s.ovvx += (wo * wo * (tx - s.ovx) - 2 * .95 * wo * s.ovvx) * dt; s.ovx += s.ovvx * dt;
      s.ovvy += (wo * wo * (ty - s.ovy) - 2 * .95 * wo * s.ovvy) * dt; s.ovy += s.ovvy * dt;
      s.t += dt;
    };
    s.snap = () => ({ x: s.x, y: s.y, z: s.z, psi: s.psi, bank: s.phi + s.roll + s.rollAcc, phi: s.phi, th: s.th, v: s.v, thr: s.thr, camYaw: s.camYaw, ovx: s.ovx, ovy: s.ovy, bankCmd: s.bankCmd, rolling: s.rollT >= 0 ? 1 : 0 });
    return s;
  }
  const backInOut = u => { const c = .9; return u < .5 ? ((2 * u) ** 2 * ((c + 1) * 2 * u - c)) / 2 : ((2 * u - 2) ** 2 * ((c + 1) * (u * 2 - 2) + c) + 2) / 2; };

  // ---- the plan: the film's flight, integrated once at 120 Hz ----
  const HZ = 120, KEYS = ['x', 'y', 'z', 'psi', 'bank', 'phi', 'th', 'v', 'thr', 'camYaw', 'ovx', 'ovy', 'bankCmd', 'rolling'];
  let TR = null, STEPS = [], DURATION = 0;
  F.plan = function (o) {
    STEPS = []; let t = 0, cur = { bank: 0, climb: 0, thr: .5, cam: 'chase' };
    for (const st of o.steps) { const s = Object.assign({}, cur, { roll: null, caption: null }, st, { t0: t }); s.t1 = t + s.dur; t = s.t1; STEPS.push(s); cur = { bank: s.bank, climb: s.climb, thr: s.thr, cam: s.cam }; }
    DURATION = +t.toFixed(3); const n = Math.ceil(DURATION * HZ) + HZ * 4 + 2;
    TR = {}; for (const k of KEYS) TR[k] = new Float64Array(n);
    const s = flyer(o.start); let si = 0;
    // a pre-roll of 3 s so springs settle before t = 0 (the history behind t = 0 exists for trails)
    const pre = HZ * 3;
    for (let i = -pre; i < n - pre; i++) {
      const tt = i / HZ; while (si < STEPS.length - 1 && tt >= STEPS[si].t1) si++;
      const st = tt < 0 ? STEPS[0] : STEPS[si];
      if (tt >= 0 && st.roll && Math.abs(tt - st.t0) < .5 / HZ) s.startRoll(st.roll === 'left' ? -1 : 1);
      if (i >= 0 || i >= -pre) { const k = i + pre; const sn = s.snap(); if (k < n) for (const key of KEYS) TR[key][k] = sn[key]; }
      s.step(1 / HZ, st);
    }
    TR.offset = pre;
    return F;
  };
  F.sample = function (t) {
    const f = t * HZ + TR.offset, i = clamp(Math.floor(f), 0, TR.x.length - 2), u = clamp(f - i, 0, 1), o = { t };
    for (const k of KEYS) o[k] = lerp(TR[k][i], TR[k][i + 1], u);
    o.agl = o.z - F.terrainAt(o.x, o.y); o.heading = ((o.psi * 180 / Math.PI) % 360 + 360) % 360;
    return o;
  };
  F.stepAt = t => { for (const s of STEPS) if (t < s.t1) return s; return STEPS[STEPS.length - 1]; };
  F.caption = (t0, t1, text) => { F.captions.push({ t0, t1, text }); return F; };

  // ---- cockpit + hud hooks ----
  let COCKPIT = null, COCKPIT_STATIC = null, HUD = null;
  F.cockpit = o => { COCKPIT = o; return F; };
  F.hud = fn => { HUD = fn; return F; };

  // ---- painter on the main canvas (or a cached layer): integer rectangles only ----
  let PC = ctx;                                   // the painter's current target
  const P = F.P = {
    get ctx() { return PC; },
    rect(x, y, w, h, c) { PC.fillStyle = SS.css(c); PC.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    px(x, y, c) { PC.fillStyle = SS.css(c); PC.fillRect(Math.round(x), Math.round(y), 1, 1); },
    line(x0, y0, x1, y1, c, every = 1) { PC.fillStyle = SS.css(c); x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, k = 0, guard = 0;
      for (;;) { if (k++ % every === 0) PC.fillRect(x0, y0, 1, 1); if ((x0 === x1 && y0 === y1) || guard++ > 2000) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    disc(cx, cy, r, c) { PC.fillStyle = SS.css(c); for (let y = Math.floor(-r); y <= r; y++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y))); PC.fillRect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1); } },
    // a ring (r0..r1) between angles a0..a1 (radians, 0 = right, clockwise on screen)
    ring(cx, cy, r0, r1, c, a0 = -Math.PI, a1 = Math.PI) { PC.fillStyle = SS.css(c); cx = Math.round(cx); cy = Math.round(cy);
      for (let y = Math.floor(-r1); y <= r1; y++) for (let x = Math.floor(-r1); x <= r1; x++) { const d = Math.hypot(x, y); if (d < r0 || d > r1) continue; let a = Math.atan2(y, x); while (a < a0) a += TAU; if (a <= a1) PC.fillRect(cx + x, cy + y, 1, 1); } },
    poly(pts, c) { const b = bbox(pts); PC.fillStyle = SS.css(c); for (let y = b.y0; y <= b.y1; y++) { let run = -1; for (let x = b.x0; x <= b.x1 + 1; x++) { const inn = x <= b.x1 && inside(pts, x + .5, y + .5); if (inn && run < 0) run = x; if (!inn && run >= 0) { PC.fillRect(run, y, x - run, 1); run = -1; } } } },
    dither(x, y, w, h, c, dens) { PC.fillStyle = SS.css(c); x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < dens) PC.fillRect(x + i, y + j, 1, 1); },
    text(s, x, y, c, k = 1, align = 'left', shadow) {
      s = String(s).toUpperCase(); const w = SS.textWidth(s, k); if (align === 'center') x -= w / 2; else if (align === 'right') x -= w; x = Math.round(x); y = Math.round(y);
      if (shadow) P.text(s, x + k, y + k, shadow, k);
      PC.fillStyle = SS.css(c);
      for (let i = 0; i < s.length; i++) { const g = GLYPH[s[i]] || GLYPH['?']; for (let j = 0; j < 15; j++) if (g[j] === '1') PC.fillRect(x + i * 4 * k + (j % 3) * k, y + Math.floor(j / 3) * k, k, k); }
    },
    // draw once into a cached layer (static cockpit parts), returned as a canvas
    layer(fn) { const c = mk(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; const old = PC; PC = x; try { fn(P); } finally { PC = old; } return c; },
  };

  // ---- renderers ----
  const OVER_E = (opt.overElev || 62) * Math.PI / 180, oS = Math.sin(OVER_E), oC = Math.cos(OVER_E);
  // oblique view from above: front-to-back per column, a y-buffer, top faces and darker south faces
  function drawTerrainOver(cx, cy, ppc, t) {
    const fy = ppc * oS, fz = ppc * oC, rowsBelow = (H / 2) / fy + maxH * fz / fy + 2, rowsAbove = (H / 2) / fy + 2;
    const iyNear = Math.floor(cy + rowsBelow), iyFar = Math.floor(cy - rowsAbove);
    const gl = WATER.glint, foam = WATER.foam, gThr = 1 - WATER.glints, rate = WATER.rate, ft = Math.floor(t * 6);
    for (let sx = 0; sx < W; sx++) {
      const wx = Math.floor(cx + (sx - W / 2 + .5) / ppc), ix = wx & MASK; let ybuf = H;
      for (let iy = iyNear; iy >= iyFar && ybuf > 0; iy--) {
        const i = (iy & MASK) * N + ix, h = HR[i], yRow = H / 2 + (iy - cy) * fy, yTop = yRow - h * fz, yEnd = yTop + fy;
        let y0 = Math.ceil(yTop - .5); if (y0 >= ybuf) continue;
        const y1 = Math.min(ybuf, Math.ceil(yRow + fy - .5)); const sh = shadowAt(wx, iy, t);
        let top = sh ? TOPS[i] : TOP[i]; const side = sh ? SIDES[i] : SIDE[i], kd = KIND[i];
        if (kd === 1) { const g = hash(wx & MASK, iy & MASK, 7); if (g > gThr && ((t * rate + g * 13) % 1) < .35) top = gl; }
        else if (kd === 2 && hash(wx, iy, ft) > .45) top = foam;
        if (y0 < 0) y0 = 0;
        for (let y = y0; y < y1; y++) buf[y * W + sx] = (y + .5 < yEnd) ? top : side;
        ybuf = y0;
      }
    }
  }
  // stacked-disc clouds seen from above, into any buffer (bw × bh), only clouds whose middle is in [zLo, zHi)
  function drawCloudsOver(B, bw, bh, cx, cy, ppc, t, zLo, zHi) {
    const fy = ppc * oS, fz = ppc * oC, list = [];
    for (const c of CLOUDS) { const mid = (c.base + c.top) / 2; if (mid < zLo || mid >= zHi) continue;
      const x = wrapNear(c.x + WIND[0] * t, cx), y = wrapNear(c.y + WIND[1] * t, cy);
      if (Math.abs(x - cx) * ppc > bw / 2 + 40 * ppc || Math.abs(y - cy) * fy > bh / 2 + (c.top * fz) + 40 * fy) continue;
      for (const p of c.puffs) list.push({ x: x + p.dx, y: y + p.dy, z: p.z, r: p.r, top: c.top, base: c.base }); }
    list.sort((a, b) => (a.y + a.z * .3) - (b.y + b.z * .3));
    for (const p of list) {
      const sx = bw / 2 + (p.x - cx) * ppc, syG = bh / 2 + (p.y - cy) * fy, z0 = Math.max(p.base, p.z - p.r * .55);
      for (let z = z0; z <= p.z + p.r; z += 1 / Math.max(.5, fz)) {
        const rr = Math.sqrt(Math.max(0, p.r * p.r - (z - p.z) ** 2)); if (rr < .5) continue;
        const rx = rr * ppc, ry = rr * fy, sy = syG - z * fz, vz = (z - p.base) / Math.max(1, p.top - p.base);
        const y0 = Math.max(0, Math.ceil(sy - ry)), y1 = Math.min(bh - 1, Math.floor(sy + ry));
        for (let y = y0; y <= y1; y++) { const dy = (y + .5 - sy) / ry, w = rx * Math.sqrt(Math.max(0, 1 - dy * dy)), x0 = Math.max(0, Math.ceil(sx - w)), x1 = Math.min(bw - 1, Math.floor(sx + w));
          for (let x = x0; x <= x1; x++) { const dx = (x + .5 - sx) / rx; B[y * bw + x] = toneAt(CLOUD, .25 + vz * .75 - dx * .18 - dy * .12, x, y); } }
      }
    }
  }
  // perspective: one ray per column, marching out; height → screen y; a y-buffer; walls in the side colour
  const SKYROW = new Uint32Array(PH);
  function drawTerrainPersp(cam, t) {
    const focal = cam.focal, hor = cam.horizon, far = cam.far, fx = Math.sin(cam.yaw), fyv = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), ry = Math.sin(cam.yaw);
    const gl = WATER.glint, foam = WATER.foam, gThr = 1 - WATER.glints, rate = WATER.rate, ft = Math.floor(t * 6), fogStart = far * (cam.fogStart || .32);
    const fogC = FOG, OFFS = N * 64;
    for (let c = 0; c < PW; c++) {
      const u = (c - PW / 2 + .5) / focal, dx = fx + rx * u, dy = fyv + ry * u;
      let ybuf = PH, z = cam.near || 1, dz = .18, pz = z;
      while (z < far && ybuf > 0) {
        const wxf = cam.x + dx * z + OFFS, wyf = cam.y + dy * z + OFFS, wx = wxf | 0, wy = wyf | 0, i = (wy & MASK) * N + (wx & MASK), h = HR[i];
        const ys = hor + (cam.z - h) * focal / z;
        if (ys < ybuf) {
          const sh = shadowAt(wx - OFFS, wy - OFFS, t); let top = sh ? TOPS[i] : TOP[i], side = sh ? SIDES[i] : SIDE[i]; const kd = KIND[i];
          if (kd === 1 && z < far * .7) { const g = hash(wx & MASK, wy & MASK, 7); if (g > gThr && ((t * rate + g * 13) % 1) < .35) top = gl; }
          else if (kd === 2 && hash(wx, wy, ft) > .45) top = foam;
          if (z > fogStart) { const f = Math.pow((z - fogStart) / (far - fogStart), 1.1); top = SS.mix(top, fogC, f); side = SS.mix(side, fogC, f); }
          const yFace = hor + (cam.z - h) * focal / pz, yi = Math.max(0, Math.ceil(ys));
          for (let y = yi; y < ybuf; y++) { const k = y * PW + c; pbuf[k] = y < yFace ? top : side; zbuf[k] = z; }
          ybuf = yi;
        }
        pz = z; z += dz; dz *= 1.013;
      }
      for (let y = 0; y < ybuf; y++) { const k = y * PW + c; pbuf[k] = SKYROW[y] || toneAt(SKY, (hor - y) / (focal * 1.2), c, y); zbuf[k] = 1e9; }
    }
  }
  function prepSky(cam) {
    const hor = cam.horizon, focal = cam.focal;
    for (let y = 0; y < PH; y++) SKYROW[y] = y > hor ? FOG : 0;   // 0 = dithered gradient per pixel
  }
  function drawSkyExtras(cam, t) {
    const focal = cam.focal, hor = cam.horizon;
    if (pal.stars) { const r = SS.rng(99); for (let k = 0; k < pal.stars; k++) { const az = r() * TAU, el = .08 + r() * .9, rel = ang(az - cam.yaw); if (Math.abs(rel) > 1.2) { r(); continue; }
      const x = Math.round(PW / 2 + Math.tan(rel) * focal), y = Math.round(hor - Math.tan(el) * focal), tw = r(); if (x < 0 || y < 0 || x >= PW || y >= PH) continue; const k2 = y * PW + x; if (zbuf[k2] > 1e8 && (tw > .3 || ((t * 1.3 + tw * 9) % 1) > .4)) pbuf[k2] = STAR; } }
    if (pal.sun) { const rel = ang(pal.sun.az * Math.PI / 180 - cam.yaw); if (Math.abs(rel) < 1.3) {
      const sx = PW / 2 + Math.tan(rel) * focal, sy = hor - Math.tan(pal.sun.el * Math.PI / 180) * focal, r0 = pal.sun.r || 7, r1 = r0 * 3.2;
      for (let y = Math.max(0, Math.floor(sy - r1)); y < Math.min(PH, sy + r1); y++) for (let x = Math.max(0, Math.floor(sx - r1)); x < Math.min(PW, sx + r1); x++) {
        const k = y * PW + x; if (zbuf[k] < 1e8) continue; const d = Math.hypot(x + .5 - sx, y + .5 - sy);
        if (d <= r0) pbuf[k] = SUN; else if (d < r1 && bayer(x, y) < (1 - (d - r0) / (r1 - r0)) * .55) pbuf[k] = SUNH; } } }
  }
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // clouds in perspective: projected puffs, sorted far → near, tested against the terrain depth
  function drawCloudsPersp(B, cam, t, dMin, dMax, useZ) {
    const focal = cam.focal, hor = cam.horizon, fx = Math.sin(cam.yaw), fyv = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), ry = Math.sin(cam.yaw), list = [], far = cam.far, fogStart = far * (cam.fogStart || .32);
    for (const c of CLOUDS) { const x = wrapNear(c.x + WIND[0] * t, cam.x), y = wrapNear(c.y + WIND[1] * t, cam.y);
      for (const p of c.puffs) { const ddx = x + p.dx - cam.x, ddy = y + p.dy - cam.y, depth = ddx * fx + ddy * fyv; if (depth < Math.max(.6, dMin) || depth >= dMax || depth > far) continue;
        const lat = ddx * rx + ddy * ry; list.push({ depth, sx: PW / 2 + lat * focal / depth, sy: hor + (cam.z - p.z) * focal / depth, r: p.r * focal / depth, vz: (p.z - c.base) / Math.max(1, c.top - c.base) }); } }
    list.sort((a, b) => b.depth - a.depth);
    for (const p of list) {
      const r = Math.min(p.r, PW), y0 = Math.max(0, Math.ceil(p.sy - r)), y1 = Math.min(PH - 1, Math.floor(p.sy + r)); if (y0 > y1 || p.sx + r < 0 || p.sx - r >= PW) continue;
      const f = p.depth > fogStart ? Math.pow((p.depth - fogStart) / (far - fogStart), 1.1) : 0;
      for (let y = y0; y <= y1; y++) { const dy = (y + .5 - p.sy) / r, w = r * Math.sqrt(Math.max(0, 1 - dy * dy)), x0 = Math.max(0, Math.ceil(p.sx - w)), x1 = Math.min(PW - 1, Math.floor(p.sx + w));
        for (let x = x0; x <= x1; x++) { const k = y * PW + x; if (useZ && zbuf[k] < p.depth) continue; if (p.depth < 30 && bayer(x, y) > (p.depth - 4) / 26) continue; const dx = (x + .5 - p.sx) / r;
          let c = toneAt(CLOUD, .55 - dy * .45 - dx * .12 + p.vz * .2, x, y); if (f > 0) c = SS.mix(c, FOG, f); B[k] = c; } }
    }
  }

  // ---- frame ----
  function persCam(s, mode) {
    const focal = PW * .5 * (opt.fovK || 1), far = opt.far || 360;
    if (mode === 'cockpit') {
      const yaw = s.psi, roll = s.bank, pitch = s.th;
      return { x: s.x, y: s.y, z: s.z + CR.eye, yaw, roll, focal, far, near: 1, horizon: PH / 2 + Math.tan(pitch) * focal * .9 - H * (opt.cockpitEye ?? .12), fogStart: .3 };
    }
    // behind the craft, `chaseSide` to its right, looking at it (a side offset turns the stack to a three-quarter view)
    const cy0 = s.camYaw, d = CR.chaseDist, sd = CR.chaseSide || 0, x = s.x - Math.sin(cy0) * d + Math.cos(cy0) * sd, y = s.y + Math.cos(cy0) * d + Math.sin(cy0) * sd, yaw = cy0 - Math.atan2(sd, d);
    let z = s.z + CR.chaseRise; const g = F.terrainAt(x, y) + 2.5; if (z < g) z = g;
    const roll = s.bank * .42 + (s.bank - s.phi) * -.3, pitch = s.th * .35;
    return { x, y, z, yaw, roll, focal, far, near: 1, horizon: PH / 2 - H * .1 + Math.tan(pitch) * focal, chase: true, fogStart: .32 };
  }
  function toMain(cam, bx, by) { const dx = bx - PW / 2, dy = by - PH / 2, r = -cam.roll, c = Math.cos(r), s = Math.sin(r); return { x: W / 2 + dx * c - dy * s, y: H / 2 + dx * s + dy * c }; }
  function projP(cam, wx, wy, wz) { const fx = Math.sin(cam.yaw), fyv = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), ry = Math.sin(cam.yaw); const ddx = wx - cam.x, ddy = wy - cam.y, depth = ddx * fx + ddy * fyv; if (depth < .5) return null;
    const lat = ddx * rx + ddy * ry; const m = toMain(cam, PW / 2 + lat * cam.focal / depth, cam.horizon + (cam.z - wz) * cam.focal / depth); m.depth = depth; return m; }
  function blitRot(srcCanvas, cam) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-cam.roll); ctx.drawImage(srcCanvas, -PW / 2, -PH / 2); ctx.restore(); }

  function tipWorld(s, side) {   // wingtip in the world, from the model's trail points
    const tp = CR.trail && CR.trail.from ? CR.trail.from[side] : null; if (!tp || !CRAFT) return null;
    const k = CR.voxelSize || .22, M = rot(s.psi, s.th, s.bank), v = [(tp[0] + .5 - CRAFT.w / 2) * k, (tp[1] + .5 - CRAFT.h / 2) * k, (tp[2] - CRAFT.d / 2) * k];
    return { x: s.x + M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], y: s.y + M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], z: s.z + M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2] };
  }
  function history(t) { const out = []; for (let k = 0; k <= 44; k++) { const tt = t - k * .06; if (live && live.hist) { const h = live.hist[k]; if (h) out.push(h); continue; } if (tt < -2.9) break; out.push(F.sample(tt)); } return out; }
  function drawTrails(hist, proj) {
    if (!CR.trail || OFF.has('trail')) return; const col = CR.trail.color || pal.trail;
    for (const side of [0, 1]) { let prev = null;
      for (let k = 0; k < hist.length; k++) { const s = hist[k], on = CR.trailWhen(s); const w = tipWorld(s, side), p = w && on ? proj(w) : null;
        if (p && prev) P.line(prev.x, prev.y, p.x, p.y, col, k > hist.length * .55 ? 2 : 1); prev = p; } }
  }

  let live = null;   // play mode state
  function frame(t) {
    const s = live ? live.snap : F.sample(t), st = live ? null : F.stepAt(t), mode = F.Q.get('cam') || (live ? live.cam : st.cam);
    const fr = CR.frame(s, t);
    if (mode === 'over') {
      const ppc = opt.overZoom ? opt.overZoom(s) : lerp(3, 1.5, smooth(12, 150, s.z)), fy = ppc * oS, fz = ppc * oC, hT = F.terrainAt(s.x, s.y);
      const cx = s.ovx, cy = s.ovy - .5 * (s.z + hT) * fz / fy;
      drawTerrainOver(cx, cy, ppc, t);
      if (!OFF.has('clouds')) drawCloudsOver(buf, W, H, cx, cy, ppc, t, -1e9, s.z);
      ctx.putImageData(img, 0, 0);
      const toS = (wx, wy, wz) => ({ x: W / 2 + (wx - cx) * ppc, y: H / 2 + (wy - cy) * fy - wz * fz });
      drawTrails(history(t), w => toS(w.x, w.y, w.z));
      const sc = CR.over * (opt.overScaleK ? opt.overScaleK(ppc) : 1), g = toS(s.x, s.y, hT), p = toS(s.x, s.y, s.z);
      // ground shadow: the flat silhouette, rotated like the craft, darkened
      sctx.clearRect(0, 0, 256, 256); SS.drawStack(sctx, { ...CRAFT, frames: [{ slices: [CRAFT.frames[0].shadow] }] }, { x: 128, y: 128, yaw: s.psi, roll: s.bank, pitch: s.th, elev: Math.PI / 2, scale: sc * Math.max(.6, 1 - (s.z - hT) / 400) });
      ctx.globalAlpha = .32; ctx.drawImage(scv, Math.round(g.x - 128), Math.round(g.y - 128)); ctx.globalAlpha = 1;
      SS.drawStack(ctx, CRAFT, { x: p.x, y: p.y, yaw: s.psi, pitch: s.th, roll: s.bank, elev: OVER_E, scale: sc, frame: fr });
      if (!OFF.has('clouds') && CLOUDS.some(c => (c.base + c.top) / 2 >= s.z)) { obuf.fill(0); drawCloudsOver(obuf, W, H, cx, cy, ppc, t, s.z, 1e9); octx.putImageData(oimg, 0, 0); ctx.drawImage(ocv, 0, 0); }
    } else {
      const cam = persCam(s, mode); prepSky(cam);
      drawTerrainPersp(cam, t); drawSkyExtras(cam, t);
      const pd = mode === 'chase' ? Math.hypot(CR.chaseDist, CR.chaseSide || 0) : 0;
      if (!OFF.has('clouds')) drawCloudsPersp(pbuf, cam, t, pd, 1e9, true);
      pctx.putImageData(pimg, 0, 0); blitRot(pcv, cam);
      if (mode === 'chase') {
        drawTrails(history(t), w => projP(cam, w.x, w.y, w.z));
        const p = projP(cam, s.x, s.y, s.z);
        if (p) { const elev = Math.atan2(cam.z - s.z, p.depth) + .05, sc = CR.chase * CR.chaseDist / p.depth;
          SS.drawStack(ctx, CRAFT, { x: p.x, y: p.y, yaw: ang(s.psi - cam.yaw), pitch: s.th * .6, roll: s.bank - cam.roll, elev: clamp(elev, .12, 1.2), scale: sc, frame: fr }); }
        if (!OFF.has('clouds')) { pbuf.fill(0); drawCloudsPersp(pbuf, cam, t, .6, pd, false); pctx.putImageData(pimg, 0, 0); blitRot(pcv, cam); }
      }
      const fog = F.inCloud(cam.x, cam.y, cam.z, t); if (fog > 0) P.dither(0, 0, W, H, CLOUD[3], Math.min(.95, fog * 1.6));
      if (mode === 'cockpit' && COCKPIT && !OFF.has('cockpit')) {
        if (COCKPIT.static && !COCKPIT_STATIC) COCKPIT_STATIC = P.layer(COCKPIT.static);
        if (COCKPIT.live) COCKPIT.live(P, s, t, F, 'under');
        if (COCKPIT_STATIC) ctx.drawImage(COCKPIT_STATIC, 0, 0);
        if (COCKPIT.over) COCKPIT.over(P, s, t, F);
      }
    }
    if (HUD && !OFF.has('hud')) HUD(P, s, t, mode, F);
    if (!live && !OFF.has('title')) drawTitle(t);
    if (live && !RENDER) { P.rect(0, H - 9, W, 9, pal.band); P.text(live.hint || 'MOVE TO STEER · CLICK TO ROLL · HOLD TO BOOST · SPACE: VIEW', W / 2, H - 7, '#c9c6d6', 1, 'center'); }
  }
  function drawTitle(t) {
    const st = F.stepAt(t), capt = F.captions.find(c => t >= c.t0 && t < c.t1) || (st && st.caption ? { text: st.caption, t0: st.t0, t1: st.t1 } : null);
    const tt = F.opt.titleDur ?? 3.2;
    if (F.title && t < tt) { const a = Math.min(1, t / .4, (tt - t) / .5); const y = Math.round(H * .64);
      P.dither(0, y - 6, W, 30, pal.band, .75 * a); P.text(F.title, W / 2, y, pal.text, 3, 'center', pal.textShadow); if (F.sub) P.text(F.sub, W / 2, y + 18, pal.text, 1, 'center', pal.textShadow); }
    if (capt) { const a = Math.min(1, (t - capt.t0) / .3, (capt.t1 - t) / .3); if (a > .2) { const w = SS.textWidth(capt.text) + 8; P.dither(6, H - 18, w, 11, pal.band, .8); P.text(capt.text, 10, H - 15, pal.text); } }
  }

  // ---- the craft sheet: every side, both banks, both views (?sheet=craft) ----
  function sheet() {
    ctx.fillStyle = '#26232e'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2f2b39'; for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 * 8; x < W; x += 16) ctx.fillRect(x, y, 8, 8);
    P.text('CRAFT SHEET · OVERHEAD (8 HEADINGS) · CHASE · BANK L/R · ROLL', 6, 4, '#fff');
    const sc = CR.over, cw = W / 8;
    for (let k = 0; k < 8; k++) { SS.drawStack(ctx, CRAFT, { x: cw * (k + .5), y: 58, yaw: k * TAU / 8, elev: OVER_E, scale: sc }); P.text(k * 45 + '*', cw * (k + .5), 92, '#aaa', 1, 'center'); }
    const rows = [['CHASE', 0, 0, .3], ['L BANK', -.7, 0, .3], ['R BANK', .7, 0, .3], ['CLIMB', 0, .35, .3]];
    rows.forEach((r, j) => { SS.drawStack(ctx, CRAFT, { x: W / 8 * (j * 2 + 1), y: 150, yaw: 0, roll: r[1], pitch: r[2], elev: r[3], scale: CR.chase * .9 }); P.text(r[0], W / 8 * (j * 2 + 1), 186, '#aaa', 1, 'center'); });
    for (let k = 0; k < 6; k++) { SS.drawStack(ctx, CRAFT, { x: W / 6 * (k + .5), y: 226, yaw: .5, roll: k * TAU / 6, elev: OVER_E, scale: sc, frame: k % CRAFT.frames.length }); P.text('ROLL ' + k * 60, W / 6 * (k + .5), 256, '#aaa', 1, 'center'); }
  }
  // ---- the planning map (?map=1): the whole world from above with the flight path, one colour per camera ----
  function map() {
    ctx.fillStyle = '#15131b'; ctx.fillRect(0, 0, W, H); const k = Math.max(1, Math.ceil(N / (H - 10))), S = Math.floor(N / k), ox = 4, oy = 6;
    const im = ctx.createImageData(S, S), px = new Uint32Array(im.data.buffer);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * k) * N + x * k; px[y * S + x] = SS.shade(TOP[i], .62 + .6 * HR[i] / Math.max(1, maxH)); }
    ctx.putImageData(im, ox, oy);
    const colr = { over: '#ffe14a', chase: '#ff4a8a', cockpit: '#4af0ff' };
    for (let t = 0; t < DURATION; t += .1) { const s = F.sample(t), st = F.stepAt(t); const x = ((s.x % N) + N) % N / k, y = ((s.y % N) + N) % N / k; ctx.fillStyle = colr[st.cam] || '#fff'; ctx.fillRect(ox + Math.floor(x), oy + Math.floor(y), 1, 1); }
    const s0 = F.sample(0); P.disc(ox + (((s0.x % N) + N) % N) / k, oy + (((s0.y % N) + N) % N) / k, 2, '#ffffff');
    let y = 8; const tx = S + 14; P.text('PLAN MAP · ' + N + ' CELLS · 1 PX = ' + k, tx, y, '#fff'); y += 10;
    for (const [m, c] of Object.entries(colr)) { P.rect(tx, y, 6, 5, c); P.text(m, tx + 9, y, '#ddd'); y += 8; }
    y += 4; let minA = 1e9, at = 0; for (let t = 0; t < DURATION; t += .05) { const a = F.sample(t).agl; if (a < minA) { minA = a; at = t; } }
    P.text('MIN HEIGHT ABOVE GROUND ' + minA.toFixed(1) + ' AT ' + at.toFixed(1) + 'S', tx, y, minA < CR.clearance ? '#ff6a6a' : '#9f9', 1); y += 10;
    for (const st of STEPS) { const a = F.sample(st.t0); P.text(st.t0.toFixed(1) + 'S ' + st.cam + ' X' + Math.round(((a.x % N) + N) % N) + ' Y' + Math.round(((a.y % N) + N) % N) + ' Z' + Math.round(a.z), tx, y, '#bbb'); y += 8; }
  }
  // handedness: find the red (port) and green (starboard) lights on screen at 8 headings; starboard must be right of the nose
  F.handedness = function () {
    const L = CRAFT.lights, out = []; if (!L.port || !L.starboard) return { missing: true };
    const c = mk(160, 160), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    for (let k = 0; k < 8; k++) { const yaw = k * TAU / 8; x.clearRect(0, 0, 160, 160); SS.drawStack(x, CRAFT, { x: 80, y: 80, yaw, elev: OVER_E, scale: 2 });
      const d = x.getImageData(0, 0, 160, 160).data, find = col => { let sx = 0, sy = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === R(col) && d[i + 1] === G(col) && d[i + 2] === B(col)) { sx += (i / 4) % 160; sy += Math.floor(i / 4 / 160); n++; } return n ? { x: sx / n, y: sy / n, n } : null; };
      const p = find(L.port.c), s = find(L.starboard.c), nose = { x: Math.sin(yaw), y: -Math.cos(yaw) };
      out.push({ heading: k * 45, seen: !!(p && s), cross: p && s ? nose.x * (s.y - p.y) - nose.y * (s.x - p.x) : 0 }); }
    return { out };
  };

  // ---- page contract ----
  F.start = function () {
    window.DURATION = DURATION; window.FPS = FPS; window.PIXEL = { W, H, scale: SCALE };
    window.FLIGHT = { sample: F.sample, terrainAt: F.terrainAt, N, steps: STEPS.map(s => ({ t0: s.t0, t1: s.t1, cam: s.cam, roll: s.roll, bank: s.bank, climb: s.climb, thr: s.thr })), clearance: CR.clearance, mass: CR.mass, handedness: F.handedness, inCloud: F.inCloud, sound: Object.assign({ engine: 'prop', hz: 62, wind: 1, level: 1 }, CR.sound || {}), voxels: CRAFT.voxels, slices: CRAFT.frames[0].slices.length, frames: CRAFT.frames.length };
    const isSheet = Q.get('sheet') === 'craft', isMap = Q.has('map');
    window.seek = t => { if (isSheet) return sheet(); if (isMap) return map(); frame(clamp(t, 0, DURATION)); };
    document.body.style.cssText = 'margin:0;background:#000;display:grid;place-items:center;height:100vh;overflow:hidden';
    cv.style.imageRendering = 'pixelated'; document.body.appendChild(cv);
    const fit = () => { const k = RENDER ? 1 : Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H))) || 1; const kk = Math.min(innerWidth / W, innerHeight / H) < 1 ? Math.min(innerWidth / W, innerHeight / H) : k; cv.style.width = W * kk + 'px'; cv.style.height = H * kk + 'px'; };
    fit(); addEventListener('resize', fit);
    const tq = Q.get('t');
    if (RENDER || tq != null || isSheet || isMap) { window.seek(+(tq || 0)); window.__ready = true; return F; }
    // live: the film loops; the first click / key / ?play=1 hands the craft to the viewer
    let t0 = performance.now(), mode = 'film';
    const views = ['chase', 'over', 'cockpit'], ptr = { x: 0, y: 0, down: 0, downAt: 0 }, keys = {};
    const takeOver = () => { if (mode === 'play') return; const tt = Math.max(0, (performance.now() - t0) / 1000) % DURATION, sn = F.sample(tt); mode = 'play';
      const fl = flyer({ x: sn.x, y: sn.y, z: sn.z, heading: sn.psi * 180 / Math.PI }); fl.camYaw = sn.camYaw; fl.ovx = sn.ovx; fl.ovy = sn.ovy; fl.phi = sn.phi; fl.th = sn.th;
      live = { fl, cam: F.stepAt(tt).cam, hist: [], acc: 0, last: performance.now(), t: tt, snap: fl.snap() }; };
    cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); ptr.x = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1); ptr.y = clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1); });
    cv.addEventListener('pointerdown', e => { ptr.down = 1; ptr.downAt = performance.now(); if (mode !== 'play') { takeOver(); return; } });
    addEventListener('pointerup', () => { if (mode === 'play' && ptr.down && performance.now() - ptr.downAt < 220) live.fl.startRoll(ptr.x < 0 ? -1 : 1); ptr.down = 0; });
    addEventListener('keydown', e => { keys[e.key] = 1; if (e.key === ' ') { e.preventDefault(); if (mode !== 'play') takeOver(); else live.cam = views[(views.indexOf(live.cam) + 1) % 3]; } else if (e.key === 'Escape') { mode = 'film'; live = null; t0 = performance.now(); } else takeOver(); });
    addEventListener('keyup', e => { keys[e.key] = 0; });
    if (Q.has('play')) takeOver();
    const loop = now => {
      if (mode === 'film') { const tt = Math.max(0, (now - t0) / 1000) % DURATION; frame(Math.floor(tt * FPS) / FPS); }
      else { const dt = Math.max(0, Math.min(.1, (now - live.last) / 1000)); live.last = now; live.acc += dt;
        const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
        const cmd = { bank: (kx || ptr.x) * CR.bankMax * .85, climb: -(ky || ptr.y) * 28, thr: ptr.down && now - ptr.downAt > 220 || keys.Shift ? 1 : .5 };
        while (live.acc >= 1 / HZ) { live.fl.step(1 / HZ, cmd); live.acc -= 1 / HZ; live.t += 1 / HZ; if (Math.round(live.t * HZ) % Math.round(HZ * .06) === 0) { live.hist.unshift(live.fl.snap()); live.hist.length = Math.min(live.hist.length, 45); } }
        live.snap = live.fl.snap(); frame(live.t); }
      requestAnimationFrame(loop);
    };
    window.__ready = true; requestAnimationFrame(loop);
    return F;
  };
  return F;
};
window.SS = SS;
})();
