// sprite-stack-short · stack.js — window.SS: pixel rasters, models carved from four views, voxel generators, and the
// sprite-stack renderer (horizontal slices drawn bottom to top, `lift` px apart, each slice turned with nearest sampling).
//
// Axes of a model: x = length (the FRONT is +x, at the RIGHT of the top and side views), y = width (y = 0 is the object's
// LEFT side, the top row of the top view), z = height (z = 0 is the ground). A view string row is one row of pixels, one
// character per pixel, '.' or ' ' = empty, any other character = a key of the model's palette.
//   top   : W rows × L columns — looking down, front pointing right (row 0 = the left side)
//   side  : H rows × L columns — the RIGHT side, front pointing right (row 0 = the top)
//   front : H rows × W columns — looking at the front (the object's right side is on YOUR left)
//   back  : H rows × W columns — looking at the back (the object's left side is on your left)
//   left  : optional, H rows × L columns — the LEFT side, front pointing LEFT (default: the side view's colours)
(function () {
  'use strict';
  const SS = {};

  // ---------- colours (Uint32 in ImageData byte order: 0xAABBGGRR) ----------
  SS.rgba = (hex, a = 255) => {
    if (typeof hex === 'number') return hex >>> 0;
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16);
    return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  };
  SS.hex = c => '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map(v => v.toString(16).padStart(2, '0')).join('');
  SS.mul = (c, f) => {
    if (f === 1) return c;
    const r = Math.min(255, Math.round((c & 255) * f)), g = Math.min(255, Math.round(((c >>> 8) & 255) * f)), b = Math.min(255, Math.round(((c >>> 16) & 255) * f));
    return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
  };
  SS.mix = (c1, c2, f) => {
    const m = (s) => Math.round(((c1 >>> s) & 255) * (1 - f) + ((c2 >>> s) & 255) * f);
    return ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0;
  };
  SS.dist = (a, b) => Math.abs((a & 255) - (b & 255)) + Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)) + Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255));

  // ---------- determinism ----------
  SS.hash = (a, b = 0, c = 0) => {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  SS.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  SS.ease = { io: p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, out: p => 1 - (1 - p) * (1 - p), in: p => p * p, back: p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); } };
  SS.clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------- raster ----------
  class Raster {
    constructor(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); }
    fill(c) { this.data.fill(c); return this; }
    px(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c; }
    get(x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.data[y * this.w + x] : 0; }
    rect(x, y, w, h, c) { for (let j = Math.max(0, y | 0); j < Math.min(this.h, (y + h) | 0); j++) for (let i = Math.max(0, x | 0); i < Math.min(this.w, (x + w) | 0); i++) this.data[j * this.w + i] = c; }
    darken(x, y, f) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) { const k = y * this.w + x; this.data[k] = SS.mul(this.data[k], f); } }
    line(x0, y0, x1, y1, c) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
    disc(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) this.px(cx + i, cy + j, c); }
    // a view or any pixel grid (Uint32 per pixel, 0 = empty) at (x, y); rows [0, rows) only (for a row-by-row reveal)
    grid(g, gw, gh, x, y, rows = gh, map) {
      for (let j = 0; j < Math.min(gh, rows); j++) for (let i = 0; i < gw; i++) { const c = g[j * gw + i]; if (c) this.px(x + i, y + j, map ? map(c, i, j) : c); }
    }
    toImageData(ctx) { const id = ctx.createImageData(this.w, this.h); new Uint32Array(id.data.buffer).set(this.data); return id; }
  }
  SS.Raster = Raster;

  // ---------- models ----------
  const FACE = { top: 0, right: 1, left: 2, front: 3, back: 4 };           // +y = right, -y = left, +x = front, -x = back
  const BIT = { solid: 1, up: 2, right: 4, left: 8, front: 16, back: 32 };
  SS.FACE = FACE; SS.BIT = BIT;

  function parseView(rows, w, h, pal, name, what) {
    if (!Array.isArray(rows)) throw new Error(`model "${name}": ${what} view missing`);
    if (rows.length !== h) throw new Error(`model "${name}": ${what} view has ${rows.length} rows, expected ${h}`);
    const g = new Uint32Array(w * h);
    rows.forEach((r, j) => {
      if (r.length !== w) throw new Error(`model "${name}": ${what} view row ${j} is ${r.length} wide, expected ${w}`);
      for (let i = 0; i < w; i++) { const ch = r[i]; if (ch === '.' || ch === ' ') continue; if (!(ch in pal)) throw new Error(`model "${name}": ${what} view row ${j} uses "${ch}", not in the palette`); g[j * w + i] = pal[ch]; }
    });
    return g;
  }

  // the model object: voxels (mask bits + 5 face colours each), its views, its footprint
  function makeModel(name, L, W, H, spec) {
    return { name, L, W, H, mask: new Uint8Array(L * W * H), col: new Uint32Array(L * W * H * 5), spec, idle: spec.idle || {}, problems: [] };
  }
  const I = (M, x, y, z) => (z * M.W + y) * M.L + x;
  SS.at = (M, x, y, z) => (x < 0 || y < 0 || z < 0 || x >= M.L || y >= M.W || z >= M.H) ? 0 : M.mask[I(M, x, y, z)] & 1;

  // exposures + per-face colours, from colour sources (each a function or null): first hit along each view ray takes that
  // view's colour; other exposed faces fall back to the side view's colour at (x, z), then the top view's
  function shadeFaces(M, src) {
    const { L, W, H, mask, col } = M, solid = (x, y, z) => SS.at(M, x, y, z);
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) {
      const i = I(M, x, y, z); if (!(mask[i] & 1)) continue;
      let m = 1;
      if (!solid(x, y, z + 1)) m |= BIT.up;
      if (!solid(x, y + 1, z)) m |= BIT.right;
      if (!solid(x, y - 1, z)) m |= BIT.left;
      if (!solid(x + 1, y, z)) m |= BIT.front;
      if (!solid(x - 1, y, z)) m |= BIT.back;
      mask[i] = m;
      const fb = src.side(x, y, z) || src.top(x, y, z) || src.front(x, y, z) || 0xff808080;
      for (let f = 0; f < 5; f++) col[i * 5 + f] = fb;
      col[i * 5] = src.top(x, y, z) || fb;          // every voxel keeps the top view's colour: a slice seen alone shows it
    }
    const hit = (f, colour, x, y, z) => { const i = I(M, x, y, z); if (colour) col[i * 5 + f] = colour; };
    for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) for (let z = H - 1; z >= 0; z--) if (solid(x, y, z)) { hit(0, src.top(x, y, z), x, y, z); break; }
    for (let z = 0; z < H; z++) for (let x = 0; x < L; x++) {
      for (let y = W - 1; y >= 0; y--) if (solid(x, y, z)) { hit(1, src.side(x, y, z), x, y, z); break; }
      for (let y = 0; y < W; y++) if (solid(x, y, z)) { hit(2, src.left(x, y, z), x, y, z); break; }
    }
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) {
      for (let x = L - 1; x >= 0; x--) if (solid(x, y, z)) { hit(3, src.front(x, y, z), x, y, z); break; }
      for (let x = 0; x < L; x++) if (solid(x, y, z)) { hit(4, src.back(x, y, z), x, y, z); break; }
    }
  }

  function finish(M) {
    const { L, W, H } = M;
    M.foot = new Uint8Array(L * W);
    M.count = 0;
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) if (M.mask[I(M, x, y, z)] & 1) { M.foot[y * L + x] = 1; M.count++; }
    M.R = Math.ceil(Math.hypot(L, W) / 2) + 1;
    // slice masks (for the slices beat) and per-slice voxel counts
    M.sliceCount = Array.from({ length: H }, (_, z) => { let n = 0; for (let k = 0; k < L * W; k++) if (M.mask[z * L * W + k] & 1) n++; return n; });
    return M;
  }

  // a model from four drawn views (+ optional left view, + optional edit(api) to add / remove voxels after carving)
  SS.model = function (name, spec) {
    const pal = {}; for (const k in spec.palette) pal[k] = SS.rgba(spec.palette[k]);
    const L = (spec.top[0] || '').length, W = spec.top.length, H = spec.side.length;
    const M = makeModel(name, L, W, H, spec);
    const top = parseView(spec.top, L, W, pal, name, 'top'), side = parseView(spec.side, L, H, pal, name, 'side');
    const front = parseView(spec.front, W, H, pal, name, 'front'), back = parseView(spec.back, W, H, pal, name, 'back');
    const left = spec.left ? parseView(spec.left, L, H, pal, name, 'left') : null;
    M.views = { top, side, front, back, left, pal };
    const T = (x, y) => top[y * L + x], S = (x, z) => side[(H - 1 - z) * L + x], F = (y, z) => front[(H - 1 - z) * W + (W - 1 - y)];
    const B = (y, z) => back[(H - 1 - z) * W + y], Lf = (x, z) => left ? left[(H - 1 - z) * L + (L - 1 - x)] : S(x, z);
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) for (let x = 0; x < L; x++)
      if (T(x, y) && S(x, z) && F(y, z) && B(y, z) && Lf(x, z)) M.mask[I(M, x, y, z)] = 1;
    const over = new Map();
    if (spec.edit) spec.edit({
      L, W, H, get: (x, y, z) => SS.at(M, x, y, z),
      set: (x, y, z, c) => { if (x < 0 || y < 0 || z < 0 || x >= L || y >= W || z >= H) return; const i = I(M, x, y, z); if (c == null || c === false) { M.mask[i] = 0; over.delete(i); } else { M.mask[i] = 1; if (c !== true) over.set(i, pal[c] || SS.rgba(c)); } },
    });
    shadeFaces(M, { top: (x, y) => T(x, y), side: (x, y, z) => S(x, z), left: (x, y, z) => Lf(x, z), front: (x, y, z) => F(y, z), back: (x, y, z) => B(y, z) });
    for (const [i, c] of over) for (let f = 0; f < 5; f++) M.col[i * 5 + f] = c;
    M.kind = 'views';
    return finish(M);
  };

  // a model from a voxel function: fill(x, y, z) → colour (hex / palette key) or null; top(x, y, z) optional colour of upward faces
  SS.voxels = function (name, spec) {
    const { l: L, w: W, h: H } = spec, pal = {}; for (const k in spec.palette || {}) pal[k] = SS.rgba(spec.palette[k]);
    const c$ = c => c == null || c === false ? 0 : (pal[c] || SS.rgba(c));
    const M = makeModel(name, L, W, H, spec), cols = new Uint32Array(L * W * H), tops = new Uint32Array(L * W * H);
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) {
      const c = c$(spec.fill(x, y, z)); if (!c) continue; const i = I(M, x, y, z); M.mask[i] = 1; cols[i] = c; tops[i] = spec.top ? (c$(spec.top(x, y, z)) || c) : c;
    }
    const at = (x, y, z) => cols[I(M, x, y, z)];
    shadeFaces(M, { top: (x, y, z) => tops[I(M, x, y, z)], side: at, left: at, front: at, back: at });
    M.kind = 'voxels';
    finish(M);
    M.views = project(M);
    return M;
  };
  // round things: radius per height r(z) (number or fn), colour col(z, ang, x, y) → hex / key
  SS.lathe = function (name, spec) {
    const H = spec.h, rmax = Math.ceil(Math.max(...Array.from({ length: H }, (_, z) => typeof spec.r === 'function' ? spec.r(z) : spec.r)));
    const D = 2 * rmax + 1, c = rmax;
    return SS.voxels(name, Object.assign({}, spec, {
      l: D, w: D, h: H,
      fill: (x, y, z) => { const r = typeof spec.r === 'function' ? spec.r(z) : spec.r, dx = x - c, dy = y - c, d = Math.hypot(dx, dy); if (r <= 0 || d > r + .35) return null; return spec.col(z, Math.atan2(dy, dx), dx, dy, d / Math.max(r, .5)); },
      top: spec.top ? (x, y, z) => spec.top(z, Math.atan2(y - c, x - c), x - c, y - c) : undefined,
    }));
  };
  SS.box = (name, spec) => SS.voxels(name, Object.assign({}, spec, { fill: (x, y, z) => spec.col(x, y, z) }));

  // views of a voxel model (first hit colours), the same layout as drawn views
  function project(M) {
    const { L, W, H, col } = M, top = new Uint32Array(L * W), side = new Uint32Array(L * H), front = new Uint32Array(W * H), back = new Uint32Array(W * H);
    for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) for (let z = H - 1; z >= 0; z--) if (SS.at(M, x, y, z)) { top[y * L + x] = col[I(M, x, y, z) * 5]; break; }
    for (let z = 0; z < H; z++) for (let x = 0; x < L; x++) for (let y = W - 1; y >= 0; y--) if (SS.at(M, x, y, z)) { side[(H - 1 - z) * L + x] = col[I(M, x, y, z) * 5 + 1]; break; }
    for (let z = 0; z < H; z++) for (let y = 0; y < W; y++) {
      for (let x = L - 1; x >= 0; x--) if (SS.at(M, x, y, z)) { front[(H - 1 - z) * W + (W - 1 - y)] = col[I(M, x, y, z) * 5 + 3]; break; }
      for (let x = 0; x < L; x++) if (SS.at(M, x, y, z)) { back[(H - 1 - z) * W + y] = col[I(M, x, y, z) * 5 + 4]; break; }
    }
    return { top, side, front, back, left: null };
  }
  SS.project = project;

  // one slice's footprint (for the slices beat): Uint8 L×W
  SS.slice = (M, z) => { const s = new Uint8Array(M.L * M.W); for (let k = 0; k < M.L * M.W; k++) s[k] = M.mask[z * M.L * M.W + k] & 1; return s; };

  // ---------- audit: do the views agree, and do they face the right way ----------
  SS.audit = function (M) {
    const out = { lost: {}, problems: [], notes: [] };
    if (M.kind !== 'views') { out.lost = null; out.notes.push(`${M.name}: generated (${M.kind}), ${M.count} voxels`); return out; }
    const { L, W, H, views: v } = M, any = (f) => { for (const p of f()) if (p) return true; return false; };
    const rayTop = (x, y) => { for (let z = 0; z < H; z++) if (SS.at(M, x, y, z)) return true; return false; };
    const raySide = (x, z) => { for (let y = 0; y < W; y++) if (SS.at(M, x, y, z)) return true; return false; };
    const rayFront = (y, z) => { for (let x = 0; x < L; x++) if (SS.at(M, x, y, z)) return true; return false; };
    const count = (g, w, h, ray) => { let n = 0, lost = 0, first = null; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j * w + i]) { n++; if (!ray(i, j)) { lost++; if (!first) first = [i, j]; } } return { n, lost, first }; };
    const r = {
      top: count(v.top, L, W, (i, j) => rayTop(i, j)),
      side: count(v.side, L, H, (i, j) => raySide(i, H - 1 - j)),
      front: count(v.front, W, H, (i, j) => rayFront(W - 1 - i, H - 1 - j)),
      back: count(v.back, W, H, (i, j) => rayFront(i, H - 1 - j)),
    };
    for (const k in r) {
      const { n, lost, first } = r[k]; out.lost[k] = n ? lost / n : 0;
      if (n && lost / n > .02) out.problems.push(`${M.name}: ${lost} of ${n} ${k}-view pixels (${(100 * lost / n).toFixed(1)} %) carve to nothing — the views disagree (first at column ${first[0]}, row ${first[1]}); check lengths, heights and which way each view faces`);
    }
    // orientation: colours only the front view has should be at the right end of the side and top views, back-only at the left
    const set = g => { const s = new Set(); for (const c of g) if (c) s.add(c); return s; };
    const Fs = set(v.front), Bs = set(v.back), Fo = [...Fs].filter(c => !Bs.has(c)), Bo = [...Bs].filter(c => !Fs.has(c));
    const ends = (g, w, h) => { let rf = 0, rb = 0, lf = 0, lb = 0; const q = Math.max(2, Math.round(w * .3)); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = g[j * w + i]; if (!c) continue; const f = Fo.includes(c), b = Bo.includes(c); if (i >= w - q) { rf += f; rb += b; } if (i < q) { lf += f; lb += b; } } return { rf, rb, lf, lb }; };
    if (!Fo.length && !Bo.length) out.notes.push(`${M.name}: front and back views share every colour — orientation not checkable by colour; look at the model sheet`);
    else for (const [k, g, h] of [['side', v.side, H]]) {      // (a flipped top view shows up as lost pixels instead)
      const e = ends(g, L, h);
      if (e.rb + e.lf > 2 * (e.rf + e.lb) + 2) out.problems.push(`${M.name}: the ${k} view looks drawn facing LEFT (its right end has ${e.rb} back-only pixels, its left end ${e.lf} front-only) — the front must point right`);
      else out.notes.push(`${M.name}: ${k} view faces right (front-only colours at the right end: ${e.rf}, back-only at the left: ${e.lb})`);
    }
    if (v.left) { const e = ends(v.left, L, H); if (e.rf + e.lb > 2 * (e.rb + e.lf) + 2) out.problems.push(`${M.name}: the left view looks drawn facing RIGHT — draw it front pointing left (as seen from the object's left side)`); }
    // every slice has something, and nothing floats: each voxel above z = 0 sits on a voxel or touches a neighbour
    const empty = M.sliceCount.map((n, z) => n ? -1 : z).filter(z => z >= 0);
    if (empty.length) out.problems.push(`${M.name}: empty slices at z = ${empty.join(', ')} — a gap in the stack (the side view has an empty row?)`);
    return out;
  };

  // ---------- the renderer ----------
  // R: Raster; o: { x, y: ground centre on screen; a: facing angle on screen (0 = right, + = clockwise); lift (px per slice);
  //   spread: extra px between slices (exploded); z0, z1: slice range; zfn(z) → extra dy (or null = skip slice);
  //   lean: [fwd, right] px offset of the TOP slice in the model frame (body roll / pitch); alt: px raised;
  //   light: screen angle the light comes FROM; shade: 0–.4; tint(c, z) colour map; cap: the slice drawn as the open top of a
//   partial stack (its pixels show the top view, as when the stack is being built) }
  const faceTab = new Uint8Array(64), capTab = new Uint8Array(64), shadeTab = new Float32Array(5);
  SS.draw = function (R, M, o) {
    const { L, W, H, mask, col } = M, a = o.a || 0, ca = Math.cos(a), sa = Math.sin(a);
    const lift = o.lift == null ? 1 : o.lift, spread = o.spread || 0, z0 = o.z0 || 0, z1 = o.z1 == null ? H : o.z1;
    const cx = Math.round(o.x), cy = Math.round(o.y) - Math.round(o.alt || 0);
    // face choice: lateral face most turned toward the viewer (screen down), else the top
    const down = [0, ca, -ca, sa, -sa], la = o.light == null ? -2.3 : o.light, lx = Math.cos(la), ly = Math.sin(la), sh = o.shade == null ? .2 : o.shade;
    const nrm = [null, [-sa, ca], [sa, -ca], [ca, sa], [-ca, -sa]];
    shadeTab[0] = 1;
    for (let f = 1; f < 5; f++) { const d = nrm[f][0] * lx + nrm[f][1] * ly; shadeTab[f] = d > .3 ? 1 : d > -.3 ? 1 - sh * .5 : 1 - sh; }
    for (let m = 0; m < 64; m++) {
      let best = -2, bf = 0;
      for (let f = 1; f < 5; f++) if (m & (2 << f)) { if (down[f] > best) { best = down[f]; bf = f; } }
      faceTab[m] = (bf && best > .38) ? bf : (m & 2) ? 0 : (bf || 0);
      capTab[m] = (bf && best > .38) ? bf : 0;      // the top slice of a partial stack: its top faces are open
    }
    const lean = o.lean || [0, 0], lfx = lean[0] * ca - lean[1] * sa, lfy = lean[0] * sa + lean[1] * ca, Rr = M.R + 1;
    const hl = L / 2, hw = W / 2, Rw = R.w, Rh = R.h, data = R.data, tint = o.tint, cap = o.cap == null ? -1 : o.cap;
    for (let z = z0; z < z1; z++) {
      if (!M.sliceCount[z]) continue;
      let ex = 0; if (o.zfn) { ex = o.zfn(z); if (ex == null) continue; }
      const k = H > 1 ? z / (H - 1) : 0, ox = cx + Math.round(lfx * k), oy = cy - Math.round(z * (lift + spread)) + Math.round(lfy * k) + Math.round(ex), base = z * L * W;
      for (let py = oy - Rr; py <= oy + Rr; py++) {
        if (py < 0 || py >= Rh) continue;
        const dy = py + .5 - oy;
        for (let px = ox - Rr; px <= ox + Rr; px++) {
          if (px < 0 || px >= Rw) continue;
          const dx = px + .5 - ox, u = dx * ca + dy * sa, v = -dx * sa + dy * ca, x = Math.floor(u + hl), y = Math.floor(v + hw);
          if (x < 0 || y < 0 || x >= L || y >= W) continue;
          const i = base + y * L + x, m = mask[i]; if (!(m & 1)) continue;
          const f = (z === cap ? capTab : faceTab)[m]; let c = SS.mul(col[i * 5 + f], shadeTab[f]);
          if (tint) c = tint(c, z);
          data[py * Rw + px] = c;
        }
      }
    }
  };
  // the footprint as a shadow (darkens what is already drawn)
  SS.shadow = function (R, M, o) {
    const { L, W } = M, a = o.a || 0, ca = Math.cos(a), sa = Math.sin(a), cx = Math.round(o.x + (o.dx || 0)), cy = Math.round(o.y + (o.dy || 0)), Rr = M.R + 1, f = o.f || .62;
    for (let py = cy - Rr; py <= cy + Rr; py++) for (let px = cx - Rr; px <= cx + Rr; px++) {
      if (px < 0 || py < 0 || px >= R.w || py >= R.h) continue;
      const dx = px + .5 - cx, dy = py + .5 - cy, x = Math.floor(dx * ca + dy * sa + L / 2), y = Math.floor(-dx * sa + dy * ca + W / 2);
      if (x >= 0 && y >= 0 && x < L && y < W && M.foot[y * L + x]) R.darken(px, py, f);
    }
  };
  // where the shadow falls for a light angle and model height
  SS.shadowOffset = (M, light = -2.3, lift = 1) => { const k = 1.2 + M.H * lift * .12; return [Math.round(-Math.cos(light) * k), Math.round(-Math.sin(light) * k)]; };

  window.SS = SS;
})();
