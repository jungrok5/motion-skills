// point-cloud-morph · forms.js — the form builder: describe a shape as lines, faces, volumes and kit pieces; sample()
// turns it into exactly n points (position + brightness, accent tint, size). Edges carry the shape, faces are faint
// specks, a little LiDAR spray flies off every surface. Pure and seeded: the same form gives the same points.
//
//   F.form('pavilion', (b) => {
//     b.building({ at: [0, 0, 0], w: 24, d: 14, floors: 3, roof: 'truss' });
//     b.dust({ c: [0, 0, 0], size: [60, 0.4, 40] });
//     b.blob([4, 6, 2], 1.2, { tint: 1, n: 1800 });      // a hot spot
//   });
//
// Units are free (metres are natural). Y is up. Densities are scale-free: line density is per unit length, face and
// volume densities are divided by the form's own scale L (bbox diagonal / 40), so a form reads the same at any size.
import * as THREE from 'three';

export const D2R = Math.PI / 180;
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const V = { sub, add, mul, lerp: lerp3, len, cross };

// default look per kind: brightness w, density, jitter (× L) and spray (share of points thrown 5× further)
const KIND = {
  len: { w: 1, density: 1, jitter: 0.1, spray: 0.04 },
  area: { w: 0.55, density: 0.1, jitter: 0.05, spray: 0.02 },
  vol: { w: 0.4, density: 0.02, jitter: 0, spray: 0 },
};

export class Builder {
  constructor(seed = 1) { this.parts = []; this.seed = seed; this._xf = null; this._sc = 1; }

  // ---- transforms: everything added inside fn is moved, turned (yaw, degrees, about +y) and scaled
  at(pos, yaw, s, fn) {
    if (typeof yaw === 'function') { fn = yaw; yaw = 0; s = 1; } else if (typeof s === 'function') { fn = s; s = 1; }
    const prev = this._xf, psc = this._sc, c = Math.cos(yaw * D2R), sn = Math.sin(yaw * D2R);
    this._xf = (p) => { const x = p[0] * s, y = p[1] * s, z = p[2] * s; const q = [x * c + z * sn + pos[0], y + pos[1], -x * sn + z * c + pos[2]]; return prev ? prev(q) : q; };
    this._sc = psc * s; fn(this); this._xf = prev; this._sc = psc; return this;
  }

  // ---- the primitive: a part has a kind (len | area | vol | n), a natural measure and a generator of local points
  part(kind, m, gen, o = {}) {
    const d = KIND[kind] || KIND.vol;
    this.parts.push({ kind, m, gen, xf: this._xf, sc: this._sc, n: o.n, w: o.w ?? d.w, tint: o.tint ?? 0, size: o.size ?? 1,
      density: o.density ?? d.density, jitter: o.jitter ?? d.jitter, spray: o.spray ?? d.spray, tag: o.tag });
    return this;
  }

  // ---- lines
  line(a, b, o = {}) { const m = len(sub(b, a)); if (m > 1e-9) this.part('len', m, (r) => lerp3(a, b, r()), o); return this; }
  path(pts, o = {}, closed = false) { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) this.line(pts[i], pts[(i + 1) % pts.length], o); return this; }
  // circle or arc in the plane normal to axis ('x' | 'y' | 'z'), from/to in degrees
  circle(c, r, o = {}, { axis = 'y', seg = 72, from = 0, to = 360 } = {}) { return this.path(arcPts(c, r, axis, seg, from, to), o); }
  // lines on a parallelogram p0 + s·u + t·v: nu+1 lines along v and nv+1 along u (only: 'u' | 'v' for one family)
  grid(p0, u, v, nu, nv, o = {}) {
    if (o.only !== 'u') for (let i = 0; i <= nu; i++) { const a = add(p0, mul(u, i / nu)); this.line(a, add(a, v), o); }
    if (o.only !== 'v') for (let j = 0; j <= nv; j++) { const a = add(p0, mul(v, j / nv)); this.line(a, add(a, u), o); }
    return this;
  }
  // quadratic arc from a to b lifted by `lift` (routes, cables, beams of light)
  arc(a, b, lift, o = {}, seg = 32) {
    const mid = add(lerp3(a, b, 0.5), [0, lift, 0]), pts = [];
    for (let i = 0; i <= seg; i++) { const t = i / seg; pts.push(add(add(mul(a, (1 - t) * (1 - t)), mul(mid, 2 * t * (1 - t))), mul(b, t * t))); }
    return this.path(pts, o);
  }
  helix(c, r, h, turns, o = {}, seg = 24) {
    const n = Math.max(8, Math.round(turns * seg)), pts = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * turns * Math.PI * 2; pts.push([c[0] + Math.cos(a) * r, c[1] + (i / n) * h, c[2] + Math.sin(a) * r]); }
    return this.path(pts, o);
  }

  // ---- faces
  tri(a, b, c, o = {}) {
    const m = len(cross(sub(b, a), sub(c, a))) / 2; if (m < 1e-12) return this;
    return this.part('area', m, (r) => { let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; } return add(a, add(mul(sub(b, a), u), mul(sub(c, a), v))); }, o);
  }
  // p0 → p1 → p2 → p3 around the edge (bilinear, fine for parallelograms and gently warped quads)
  quad(p0, p1, p2, p3, o = {}) {
    const m = len(cross(sub(p1, p0), sub(p3, p0))) / 2 + len(cross(sub(p1, p2), sub(p3, p2))) / 2; if (m < 1e-12) return this;
    return this.part('area', m, (r) => { const u = r(), v = r(); return lerp3(lerp3(p0, p1, u), lerp3(p3, p2, u), v); }, o);
  }
  disk(c, r0, o = {}, { axis = 'y', r1 = 0 } = {}) {
    const m = Math.PI * (r0 * r0 - r1 * r1);
    return this.part('area', m, (r) => { const a = r() * Math.PI * 2, rr = Math.sqrt(r1 * r1 + r() * (r0 * r0 - r1 * r1)); return onAxis(c, axis, Math.cos(a) * rr, Math.sin(a) * rr, 0); }, o);
  }
  sphere(c, rad, o = {}) {
    return this.part('area', 4 * Math.PI * rad * rad, (r) => { const z = 2 * r() - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [c[0] + s * Math.cos(a) * rad, c[1] + z * rad, c[2] + s * Math.sin(a) * rad]; }, o);
  }
  // latitude / longitude wire on a sphere
  latlon(c, rad, { lat = 9, lon = 18 } = {}, o = {}) {
    for (let i = 1; i < lat; i++) { const p = -90 + (180 * i) / lat, y = Math.sin(p * D2R) * rad, rr = Math.cos(p * D2R) * rad; this.circle([c[0], c[1] + y, c[2]], rr, o); }
    for (let j = 0; j < lon; j++) { const a = (360 * j) / lon, pts = []; for (let k = 0; k <= 48; k++) { const p = -90 + (180 * k) / 48; pts.push([c[0] + Math.cos(p * D2R) * Math.cos(a * D2R) * rad, c[1] + Math.sin(p * D2R) * rad, c[2] + Math.cos(p * D2R) * Math.sin(a * D2R) * rad]); } this.path(pts, o); }
    return this;
  }
  // any parametric surface fn(u, v) → [x, y, z], u, v in 0..1; o.lines = [nu, nv] adds iso-lines (a wire look)
  surface(fn, o = {}, { nu = 48, nv = 48 } = {}) {
    const cells = [], cdf = []; let tot = 0;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const p00 = fn(i / nu, j / nv), p10 = fn((i + 1) / nu, j / nv), p01 = fn(i / nu, (j + 1) / nv), p11 = fn((i + 1) / nu, (j + 1) / nv);
      const a = len(cross(sub(p10, p00), sub(p01, p00))) / 2 + len(cross(sub(p10, p11), sub(p01, p11))) / 2;
      tot += a; cells.push([i, j]); cdf.push(tot);
    }
    if (tot > 1e-12) this.part('area', tot, (r) => { const k = bsearch(cdf, r() * tot), [i, j] = cells[k]; return fn((i + r()) / nu, (j + r()) / nv); }, o);
    if (o.lines) {
      const [lu, lv] = o.lines, lo = { ...o, lines: undefined, w: o.lineW ?? KIND.len.w, density: o.lineDensity ?? 1, jitter: o.lineJitter, spray: o.lineSpray };
      for (let i = 0; i <= lu; i++) { const pts = []; for (let k = 0; k <= 48; k++) pts.push(fn(i / lu, k / 48)); this.path(pts, lo); }
      for (let j = 0; j <= lv; j++) { const pts = []; for (let k = 0; k <= 48; k++) pts.push(fn(k / 48, j / lv)); this.path(pts, lo); }
    }
    return this;
  }
  // surface of revolution about +y through c: profile [[radius, y], …] bottom to top; rings at every profile point
  lathe(profile, o = {}, { c = [0, 0, 0], seg = 64, rings = true, meridians = 0, from = 0, to = 360 } = {}) {
    const L = [0]; for (let i = 1; i < profile.length; i++) L.push(L[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
    const at = (v) => { const s = v * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < s) i++; const t = (s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]); return [profile[i - 1][0] + (profile[i][0] - profile[i - 1][0]) * t, profile[i - 1][1] + (profile[i][1] - profile[i - 1][1]) * t]; };
    const fn = (u, v) => { const [rr, y] = at(v), a = (from + (to - from) * u) * D2R; return [c[0] + Math.cos(a) * rr, c[1] + y, c[2] + Math.sin(a) * rr]; };
    this.surface(fn, o, { nu: seg, nv: Math.max(8, profile.length * 6) });
    const eo = { ...o, w: o.edgeW ?? KIND.len.w, density: o.edges ?? 1, jitter: undefined, spray: undefined };
    if (rings) for (const [rr, y] of profile) if (rr > 1e-6) this.circle([c[0], c[1] + y, c[2]], rr, eo, { seg, from, to });
    for (let k = 0; k < meridians; k++) { const pts = []; for (let s = 0; s <= 40; s++) pts.push(fn(k / meridians, s / 40)); this.path(pts, eo); }
    return this;
  }

  // ---- volumes
  // a gaussian cluster (hot spots: { tint: 1 }); stretch = [sx, sy, sz]
  blob(c, rad, o = {}, stretch = [1, 1, 1]) {
    return this.part(o.n ? 'n' : 'vol', (4 / 3) * Math.PI * rad ** 3, (r) => { const g = gauss3(r); return [c[0] + g[0] * rad * 0.5 * stretch[0], c[1] + g[1] * rad * 0.5 * stretch[1], c[2] + g[2] * rad * 0.5 * stretch[2]]; }, { w: 0.9, size: 1.4, ...o });
  }
  // uniform specks in a box around c (floor dust: a flat size like [60, 0.3, 40])
  dust({ c = [0, 0, 0], size = [40, 0.3, 40] } = {}, o = {}) {
    return this.part(o.n ? 'n' : 'vol', size[0] * size[1] * size[2], (r) => [c[0] + (r() - 0.5) * size[0], c[1] + (r() - 0.5) * size[1], c[2] + (r() - 0.5) * size[2]], { w: 0.3, size: 0.8, ...o });
  }
  // a soft nebula: noisy gaussian lobes, for a formation that is a cloud on purpose
  nebula({ c = [0, 0, 0], r: rad = 10, lobes = 5, seed = 3 } = {}, o = {}) {
    const rr = rng(seed), L = Array.from({ length: lobes }, () => [c[0] + (rr() - 0.5) * rad, c[1] + (rr() - 0.5) * rad * 0.6, c[2] + (rr() - 0.5) * rad, rad * (0.35 + rr() * 0.4)]);
    return this.part(o.n ? 'n' : 'vol', (4 / 3) * Math.PI * rad ** 3, (r) => { const l = L[Math.floor(r() * lobes)], g = gauss3(r); return [l[0] + g[0] * l[3] * 0.5, l[1] + g[1] * l[3] * 0.35, l[2] + g[2] * l[3] * 0.5]; }, { w: 0.5, size: 1.1, density: 0.006, ...o });
  }

  // ---- meshes: any three.js geometry or loaded object (GLB via GLTFLoader) as surface specks + feature edges
  geometry(geo, o = {}, { matrix = null, edges = 30, surface = true } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, m = matrix || new THREE.Matrix4(), v = new THREE.Vector3();
    const pts = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pts[i * 3] = v.x; pts[i * 3 + 1] = v.y; pts[i * 3 + 2] = v.z; }
    if (surface) {
      const cdf = []; let tot = 0;
      for (let t = 0; t < P.count / 3; t++) { const a = triP(pts, t * 3), b = triP(pts, t * 3 + 1), c = triP(pts, t * 3 + 2); tot += len(cross(sub(b, a), sub(c, a))) / 2; cdf.push(tot); }
      if (tot > 1e-12) this.part('area', tot, (r) => { const t = bsearch(cdf, r() * tot), a = triP(pts, t * 3), b = triP(pts, t * 3 + 1), c = triP(pts, t * 3 + 2); let u = r(), w = r(); if (u + w > 1) { u = 1 - u; w = 1 - w; } return add(a, add(mul(sub(b, a), u), mul(sub(c, a), w))); }, o);
    }
    if (edges !== false) {
      const E = new THREE.EdgesGeometry(geo, edges).attributes.position, eo = { ...o, w: o.edgeW ?? KIND.len.w, density: o.edges ?? 1, jitter: o.edgeJitter, spray: undefined };
      for (let i = 0; i < E.count; i += 2) { const a = v.fromBufferAttribute(E, i).applyMatrix4(m).toArray(), b = v.fromBufferAttribute(E, i + 1).applyMatrix4(m).toArray(); this.line(a, b, eo); }
    }
    return this;
  }
  object(obj, o = {}, opts = {}) {
    obj.updateMatrixWorld(true);
    obj.traverse((x) => { if (x.isMesh && x.geometry?.attributes?.position) this.geometry(x.geometry, o, { ...opts, matrix: x.matrixWorld }); });
    return this;
  }

  // ---- raster sources: text and images become extruded slabs of points (fill specks + bright outline)
  // text: size = cap height in world units; plane xy facing +z, centred on `at` (align 'center' | 'left' | 'right')
  text(str, { at = [0, 0, 0], size = 4, depth = 0.6, font = '700 200px "PCM Sans", "PCM KR", sans-serif', align = 'center', yaw = 0, lineGap = 1.25 } = {}, o = {}) {
    const lines = String(str).split('\n'), cv = document.createElement('canvas'), g = cv.getContext('2d');
    g.font = font; const px = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] || 200), lh = px * lineGap;
    const wmax = Math.max(...lines.map((l) => g.measureText(l).width));
    cv.width = Math.ceil(wmax + px * 0.4); cv.height = Math.ceil(lh * lines.length + px * 0.4);
    g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = align;
    const ax = align === 'left' ? px * 0.2 : align === 'right' ? cv.width - px * 0.2 : cv.width / 2;
    lines.forEach((l, i) => g.fillText(l, ax, px * 0.2 + px * 0.78 + i * lh));
    const capPx = px * 0.72, k = size / capPx, ox = align === 'left' ? px * 0.2 : align === 'right' ? cv.width - px * 0.2 : cv.width / 2, oy = px * 0.2 + px * 0.78 + ((lines.length - 1) * lh) / 2 - capPx / 2;
    return this.raster(g.getImageData(0, 0, cv.width, cv.height), { at, k, ox, oy, depth, yaw, alpha: true }, o);
  }
  // image: an <img>/<canvas>/ImageData; width in world units; brighter pixels get more points (invert for dark-on-light)
  image(src, { at = [0, 0, 0], width = 10, depth = 0, yaw = 0, invert = false, threshold = 0.08 } = {}, o = {}) {
    let data = src;
    if (!(src instanceof ImageData)) { const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const g = cv.getContext('2d'); g.drawImage(src, 0, 0); data = g.getImageData(0, 0, cv.width, cv.height); }
    return this.raster(data, { at, k: width / data.width, ox: data.width / 2, oy: data.height / 2, depth, yaw, invert, threshold }, o);
  }
  raster(img, { at, k, ox, oy, depth, yaw, alpha = false, invert = false, threshold = 0.5 }, o = {}) {
    const { width: Wd, height: Hd, data } = img, val = (x, y) => { if (x < 0 || y < 0 || x >= Wd || y >= Hd) return 0; const i = (y * Wd + x) * 4; if (alpha) return data[i + 3] / 255; const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255; return (invert ? 1 - l : l) * (data[i + 3] / 255); };
    const fill = [], edge = [], step = Math.max(1, Math.round(Math.max(Wd, Hd) / 900));
    for (let y = 0; y < Hd; y += step) for (let x = 0; x < Wd; x += step) {
      const v = val(x, y); if (v < threshold) continue;
      fill.push(x, y, v);
      if (val(x - step, y) < threshold || val(x + step, y) < threshold || val(x, y - step) < threshold || val(x, y + step) < threshold) edge.push(x, y);
    }
    if (!fill.length) return this;
    const c = Math.cos(yaw * D2R), s = Math.sin(yaw * D2R), place = (x, y, z) => { const lx = (x - ox) * k, ly = -(y - oy) * k; return [at[0] + lx * c + z * s, at[1] + ly, at[2] - lx * s + z * c]; };
    const nF = fill.length / 3, cell = (step * k) ** 2;
    this.part('area', nF * cell * (alpha ? 1 : 0.6), (r) => { let i; do { i = Math.floor(r() * nF); } while (!alpha && r() > fill[i * 3 + 2]); return place(fill[i * 3] + r() * step, fill[i * 3 + 1] + r() * step, (r() - 0.5) * depth); }, { density: 0.35, jitter: 0, spray: 0.004, w: 0.6, ...o });
    const nE = edge.length / 2;
    if (nE) this.part('len', nE * step * k * (depth > 0 ? 2 : 1), (r) => { const i = Math.floor(r() * nE), z = depth > 0 ? (r() < 0.5 ? -0.5 : 0.5) * depth : 0; return place(edge[i * 2] + r() * step, edge[i * 2 + 1] + r() * step, z); }, { ...o, w: o.edgeW ?? 1, density: o.edges ?? 0.9, jitter: 0.02, spray: 0.01, tint: o.tint ?? 0 });
    return this;
  }

  // ---- kit: architecture and structure (all lines + faint faces; pass o to tint or brighten)
  // box: base centre c (y = bottom), size [w, h, d]; edges / faces = density multipliers
  box(c, [w, h, d], o = {}) {
    const x0 = c[0] - w / 2, x1 = c[0] + w / 2, y0 = c[1], y1 = c[1] + h, z0 = c[2] - d / 2, z1 = c[2] + d / 2;
    const P = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const eo = { ...o, density: (o.edges ?? 1) * (o.density ?? 1) }, fo = { ...o, w: o.faceW ?? KIND.area.w, density: (o.faces ?? 1) * KIND.area.density };
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) this.line(P[a], P[b], eo);
    if ((o.faces ?? 1) > 0) for (const [a, b, cc, dd] of [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7], [0, 1, 2, 3]]) this.quad(P[a], P[b], P[cc], P[dd], fo);
    return this;
  }
  // a building: slabs, perimeter columns on a bay grid, window mullions, faint facades, a roof. at = base centre.
  // roof: 'flat' | 'gable' | 'truss' | 'sawtooth' | 'none'; windows = mullions per bay; core = a stair / lift core box
  building({ at = [0, 0, 0], w = 20, d = 12, floors = 3, fh = 3.6, bays = null, yaw = 0, roof = 'flat', roofH = null, windows = 2, core = false, parapet = 0.9, faces = 1 } = {}, o = {}) {
    return this.at(at, yaw, 1, (b) => {
      const nx = bays?.[0] ?? Math.max(2, Math.round(w / 6)), nz = bays?.[1] ?? Math.max(1, Math.round(d / 6)), H = floors * fh;
      const xs = Array.from({ length: nx + 1 }, (_, i) => -w / 2 + (w * i) / nx), zs = Array.from({ length: nz + 1 }, (_, i) => -d / 2 + (d * i) / nz);
      const slab = { ...o, w: (o.w ?? 1) * 1.0 }, col = { ...o, w: (o.w ?? 1) * 0.95 }, mul_ = { ...o, w: (o.w ?? 1) * 0.55, density: (o.density ?? 1) * 0.6, spray: 0.02 };
      for (let f = 0; f <= floors; f++) b.path([[-w / 2, f * fh, -d / 2], [w / 2, f * fh, -d / 2], [w / 2, f * fh, d / 2], [-w / 2, f * fh, d / 2]], slab, true);
      for (const x of xs) for (const z of [-d / 2, d / 2]) b.line([x, 0, z], [x, H, z], col);
      for (const z of zs.slice(1, -1)) for (const x of [-w / 2, w / 2]) b.line([x, 0, z], [x, H, z], col);
      if (windows > 0) for (let f = 0; f < floors; f++) {
        const y0 = f * fh, y1 = y0 + fh;
        for (let i = 0; i < nx; i++) for (let k = 1; k <= windows; k++) { const x = xs[i] + ((xs[i + 1] - xs[i]) * k) / (windows + 1); for (const z of [-d / 2, d / 2]) b.line([x, y0, z], [x, y1, z], mul_); }
        for (let j = 0; j < nz; j++) for (let k = 1; k <= windows; k++) { const z = zs[j] + ((zs[j + 1] - zs[j]) * k) / (windows + 1); for (const x of [-w / 2, w / 2]) b.line([x, y0, z], [x, y1, z], mul_); }
        for (const yy of [y0 + fh * 0.3, y0 + fh * 0.85]) b.path([[-w / 2, yy, -d / 2], [w / 2, yy, -d / 2], [w / 2, yy, d / 2], [-w / 2, yy, d / 2]], { ...mul_, density: mul_.density * 0.6 }, true);
      }
      if (faces > 0) { const fo = { ...o, w: o.faceW ?? 0.5, density: KIND.area.density * faces }; b.quad([-w / 2, 0, d / 2], [w / 2, 0, d / 2], [w / 2, H, d / 2], [-w / 2, H, d / 2], fo); b.quad([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, H, -d / 2], [-w / 2, H, -d / 2], fo); b.quad([w / 2, 0, -d / 2], [w / 2, 0, d / 2], [w / 2, H, d / 2], [w / 2, H, -d / 2], fo); b.quad([-w / 2, 0, -d / 2], [-w / 2, 0, d / 2], [-w / 2, H, d / 2], [-w / 2, H, -d / 2], fo); b.quad([-w / 2, H, -d / 2], [w / 2, H, -d / 2], [w / 2, H, d / 2], [-w / 2, H, d / 2], { ...fo, density: fo.density * 0.6 }); }
      if (core) b.box([w * 0.18, 0, 0], [Math.min(5, w * 0.2), H + fh * 0.6, Math.min(5, d * 0.35)], { ...o, w: (o.w ?? 1) * 0.8, faces: 0.4 });
      const rh = roofH ?? Math.min(w, d) * 0.28;
      if (roof === 'flat' && parapet > 0) b.path([[-w / 2, H + parapet, -d / 2], [w / 2, H + parapet, -d / 2], [w / 2, H + parapet, d / 2], [-w / 2, H + parapet, d / 2]], { ...slab, density: (o.density ?? 1) * 0.7 }, true);
      if (roof === 'gable') { b.line([-w / 2, H + rh, 0], [w / 2, H + rh, 0], slab); for (const x of xs) { b.line([x, H, -d / 2], [x, H + rh, 0], col); b.line([x, H, d / 2], [x, H + rh, 0], col); } }
      if (roof === 'truss') for (const x of xs) b.truss([x, H, -d / 2], [x, H, d / 2], rh, Math.max(4, Math.round(d / 2.5)), { ...o, w: (o.w ?? 1) * 0.9 }, 'tri');
      if (roof === 'sawtooth') for (let i = 0; i < nx; i++) { b.line([xs[i], H + rh, -d / 2], [xs[i], H + rh, d / 2], slab); for (const z of zs) { b.line([xs[i], H, z], [xs[i], H + rh, z], col); b.line([xs[i], H + rh, z], [xs[i + 1], H, z], col); } }
    });
  }
  // a truss between a and b (any direction, built in the vertical plane): 'pratt' (parallel chords) or 'tri' (a peak)
  truss(a, b, h, panels = 6, o = {}, shape = 'pratt') {
    const top = (t) => add(lerp3(a, b, t), [0, shape === 'tri' ? h * (1 - Math.abs(2 * t - 1)) : h, 0]);
    this.line(a, b, o); const T = []; for (let i = 0; i <= panels; i++) T.push(top(i / panels)); this.path(T, o);
    const lo = { ...o, w: (o.w ?? 1) * 0.75, density: (o.density ?? 1) * 0.8 };
    for (let i = 0; i <= panels; i++) { const p = lerp3(a, b, i / panels); this.line(p, T[i], lo); if (i < panels) this.line(i < panels / 2 ? lerp3(a, b, (i + 1) / panels) : p, i < panels / 2 ? T[i] : T[i + 1], lo); }
    return this;
  }
  // a stair run (a fire escape, a section cut): from a going along dir (unit, horizontal) up rise over run
  stair(a, dir, run, rise, steps, width = 1.2, o = {}) {
    const side = [-dir[2] * width, 0, dir[0] * width];
    for (const s of [[0, 0, 0], side]) { const p = add(a, s); this.line(p, add(p, [dir[0] * run, rise, dir[2] * run]), o); }
    for (let i = 0; i <= steps; i++) { const p = add(a, [dir[0] * (run * i) / steps, (rise * i) / steps, dir[2] * (run * i) / steps]); this.line(p, add(p, side), { ...o, w: (o.w ?? 1) * 0.7 }); }
    return this;
  }
  // terrain: rows of points following height(x, z) (a sonar / LiDAR strip look); rows: 'x' | 'z' | 'both'
  terrain({ at = [0, 0, 0], size = [40, 40], res = [72, 72], height = () => 0, rows = 'x', fill = 0 } = {}, o = {}) {
    const [w, d] = size, [nx, nz] = res, Hf = (x, z) => [at[0] + x, at[1] + height(x, z), at[2] + z];
    const ro = { jitter: 0.02, spray: 0.004, ...o };
    if (rows !== 'z') for (let j = 0; j <= nz; j++) { const z = -d / 2 + (d * j) / nz, pts = []; for (let i = 0; i <= nx * 2; i++) pts.push(Hf(-w / 2 + (w * i) / (nx * 2), z)); this.path(pts, ro); }
    if (rows !== 'x') for (let i = 0; i <= nx; i++) { const x = -w / 2 + (w * i) / nx, pts = []; for (let j = 0; j <= nz * 2; j++) pts.push(Hf(x, -d / 2 + (d * j) / (nz * 2))); this.path(pts, ro); }
    if (fill > 0) this.surface((u, v) => Hf(-w / 2 + u * w, -d / 2 + v * d), { ...o, density: KIND.area.density * fill, w: 0.35 }, { nu: 32, nv: 32 });
    return this;
  }
  // a globe: lat/lon wire, faint shell, optional land(latDeg, lonDeg) → bool for land specks
  globe({ c = [0, 0, 0], r: rad = 10, lat = 12, lon = 24, land = null, landDensity = 0.5 } = {}, o = {}) {
    this.latlon(c, rad, { lat, lon }, { ...o, w: (o.w ?? 1) * 0.6, density: (o.density ?? 1) * 0.5 });
    this.sphere(c, rad, { ...o, w: 0.3, density: 0.04 });
    if (land) this.part('area', 4 * Math.PI * rad * rad * 0.3, (r) => { for (let k = 0; k < 64; k++) { const z = 2 * r() - 1, a = r() * Math.PI * 2, la = Math.asin(z) / D2R, lo = a / D2R - 180; if (land(la, lo)) { const s = Math.sqrt(1 - z * z); return [c[0] + s * Math.cos(a) * rad, c[1] + z * rad, c[2] + s * Math.sin(a) * rad]; } } return [c[0], c[1] + rad, c[2]]; }, { w: 0.9, density: KIND.area.density * landDensity * 3, jitter: 0.01, spray: 0, ...o });
    return this;
  }

  // ---- sampling
  // exact n points: { pos Float32Array(n·3), att Float32Array(n·3) = brightness, tint, size; tags Uint8Array, L, box }
  sample(n, seed = this.seed) {
    const r = rng(seed * 2654435761 + 7), parts = this.parts.filter((p) => p.n || p.m > 0);
    if (!parts.length) throw new Error('form has no parts');
    // scale L from a rough bbox
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], pr = rng(seed + 99);
    for (const p of parts) for (let k = 0; k < 12; k++) { const q = p.xf ? p.xf(p.gen(pr)) : p.gen(pr); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], q[a]); hi[a] = Math.max(hi[a], q[a]); } }
    const L = Math.max(1e-6, len(sub(hi, lo)) / 40);
    const want = parts.map((p) => (p.n ? 0 : p.kind === 'len' ? p.m * p.sc : p.kind === 'area' ? (p.m * p.sc * p.sc) / L : (p.m * p.sc ** 3) / (L * L)) * p.density);
    const fixed = parts.reduce((s, p) => s + (p.n || 0), 0), free = Math.max(0, n - fixed), tot = want.reduce((s, x) => s + x, 0) || 1;
    const cnt = parts.map((p, i) => (p.n ? Math.min(p.n, n) : Math.floor((want[i] / tot) * free)));
    let left = n - cnt.reduce((s, x) => s + x, 0);
    const rem = parts.map((p, i) => [p.n ? -1 : (want[i] / tot) * free - cnt[i], i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; left > 0; k = (k + 1) % rem.length) { if (rem[k][0] < 0 && rem.some((x) => x[0] >= 0)) continue; cnt[rem[k][1]]++; left--; }
    for (let k = parts.length - 1; left < 0 && k >= 0; k--) { const take = Math.min(cnt[k], -left); cnt[k] -= take; left += take; }
    const pos = new Float32Array(n * 3), att = new Float32Array(n * 3), tags = new Uint8Array(n); let j = 0;
    const tagIds = new Map();
    for (const [i, p] of parts.entries()) {
      const jit = p.jitter * L, tag = p.tag ? (tagIds.has(p.tag) ? tagIds.get(p.tag) : (tagIds.set(p.tag, tagIds.size + 1), tagIds.size)) : 0;
      for (let k = 0; k < cnt[i]; k++, j++) {
        let q = p.gen(r); if (p.xf) q = p.xf(q);
        const sj = r() < p.spray ? jit * 5 + L * 0.3 : jit;
        if (sj > 0) { const g = gauss3(r); q = [q[0] + g[0] * sj, q[1] + g[1] * sj, q[2] + g[2] * sj]; }
        pos[j * 3] = q[0]; pos[j * 3 + 1] = q[1]; pos[j * 3 + 2] = q[2];
        att[j * 3] = p.w * (0.75 + 0.5 * r()); att[j * 3 + 1] = p.tint; att[j * 3 + 2] = p.size * (0.7 + 0.6 * r()); tags[j] = tag;
      }
    }
    return { pos, att, tags, tagNames: [...tagIds.keys()], L };
  }
}

// ---- helpers
function arcPts(c, r, axis, seg, from, to) { const pts = [], n = Math.max(2, Math.round((seg * Math.abs(to - from)) / 360)); for (let i = 0; i <= n; i++) { const a = (from + ((to - from) * i) / n) * D2R; pts.push(onAxis(c, axis, Math.cos(a) * r, Math.sin(a) * r, 0)); } return pts; }
function onAxis(c, axis, u, v, w) { return axis === 'y' ? [c[0] + u, c[1] + w, c[2] + v] : axis === 'x' ? [c[0] + w, c[1] + u, c[2] + v] : [c[0] + u, c[1] + v, c[2] + w]; }
function bsearch(cdf, x) { let lo = 0, hi = cdf.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < x) lo = m + 1; else hi = m; } return lo; }
function triP(a, i) { return [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]; }
export function gauss3(r) { const g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }; return [g(), g(), g()]; }
