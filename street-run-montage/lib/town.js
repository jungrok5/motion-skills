// street-run-montage · town.js — the route and the town laid out along it.
//   Route: segments [{ len, turn (deg, + = left), rise (m) }] → a centre line with distance s, heading and height.
//   Town (K): pieces placed in route coordinates — s (metres along the route) and x (metres to the right of it) — so
//   the world is built around the action: K.rail({ tau: [12.2, 13.4] }) puts a rail under the rider's grind.
//   Zones (K.zone('lane' | 'shops' | 'river' | 'park' | 'plaza' | 'harbor', s0, s1, opts)) scatter a whole street;
//   single pieces (K.house, K.pole, K.tree, K.shop, K.bench, K.vending, K.mirror, K.rail, K.ledge, K.hedge, K.wall,
//   K.fence, K.guard, K.railing, K.apartments, K.station, K.bridge, K.planter, K.sign, K.lamp, K.bollard, K.boat) and
//   custom ones (K.box, K.sweep, K.batch, K.mat) fill the rest. Every piece registers its box in K.solids (camera check).
import * as THREE from 'three';
import { rng, clamp, lerp, vary, mix, shade, DEG } from './core.js';
import { cel, flat, asphalt, tiles, blocks, bricks, facade, roof, water, signTex, shelves, chainLink, lineTex, SEASONS } from './look.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ───────────────────────── route ─────────────────────────
export class Route {
  constructor(segs, o = {}) {
    this.step = .25; const P = [], H = [], Y = []; let x = 0, z = 0, h = (o.heading ?? 0) * DEG, y = 0;
    P.push([x, z]); H.push(h); Y.push(0);
    for (const sg of segs) {
      const n = Math.max(1, Math.round(sg.len / this.step)), dh = (sg.turn || 0) * DEG / n, dy = (sg.rise || 0) / n;
      for (let i = 0; i < n; i++) {
        const k = (i + .5) / n, e = sg.rise ? (Math.sin(Math.PI * k) * Math.PI / 2) : 1;   // slopes ease in and out
        h += dh; x += Math.sin(h) * this.step; z += -Math.cos(h) * this.step; y += dy * e; P.push([x, z]); H.push(h); Y.push(y);
      }
    }
    // re-normalise the eased rises so each segment climbs exactly its rise
    this.P = P; this.H = H; this.Y = Y; this.len = (P.length - 1) * this.step; this.segs = segs;
  }
  _i(s) { const f = clamp(s / this.step, 0, this.P.length - 1.0001), i = Math.floor(f); return [i, f - i]; }
  /** centre point at s (+ x to the right, + y up) */
  at(s, x = 0, y = 0) {
    if (s > this.len) { const e = this.at(this.len), t = this.tan(this.len); return e.addScaledVector(t, s - this.len).add(this.right(this.len).multiplyScalar(x)).setY(e.y + y); }
    if (s < 0) { const e = this.at(0), t = this.tan(0); return e.addScaledVector(t, s).add(this.right(0).multiplyScalar(x)).setY(e.y + y); }
    const [i, k] = this._i(s), a = this.P[i], b = this.P[i + 1], h = lerp(this.H[i], this.H[i + 1], k);
    return V(lerp(a[0], b[0], k) + Math.cos(h) * x, lerp(this.Y[i], this.Y[i + 1], k) + y, lerp(a[1], b[1], k) + Math.sin(h) * x);
  }
  heading(s) { const [i, k] = this._i(clamp(s, 0, this.len)); return lerp(this.H[i], this.H[i + 1], k); }
  /** unit tangent (travel direction) */
  tan(s) { const h = this.heading(s); return V(Math.sin(h), 0, -Math.cos(h)); }
  /** unit right */
  right(s) { const h = this.heading(s); return V(Math.cos(h), 0, Math.sin(h)); }
  y(s) { const [i, k] = this._i(clamp(s, 0, this.len)); return lerp(this.Y[i], this.Y[i + 1], k); }
  /** slope (dy/ds) */
  grade(s) { return (this.y(s + .5) - this.y(s - .5)); }
  /** yaw for an object facing travel (three.js rotation.y) */
  yaw(s) { return -this.heading(s); }
  /** a matrix at (s, x, y) whose -Z is the travel direction, +X right */
  frame(s, x = 0, y = 0, yawOff = 0, flatY = false) {
    const p = this.at(s, x, y); const m = new THREE.Matrix4().makeRotationY(this.yaw(s) + yawOff); m.setPosition(p); return m;
  }
}

// ───────────────────────── geometry helpers ─────────────────────────
const f32 = a => new THREE.Float32BufferAttribute(a.array.slice ? Array.from(a.array) : a.array, a.itemSize);
export function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere(); return out;
}
/** a box from min to max with UVs in metres / tile (so textures keep their scale) */
export function boxGeo(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, p = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (nx > .5) uv.setXY(i, z / tile, y / tile); else if (ny > .5) uv.setXY(i, x / tile, z / tile); else uv.setXY(i, x / tile, y / tile);
  }
  return g.toNonIndexed();
}
export class Batch {
  constructor() { this.g = new Map(); }
  add(geo, mat, m) {
    let x = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
    if (!x.attributes.normal) x.computeVertexNormals();
    for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k);
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat); if (l) l.push(x); else this.g.set(mat, [x]);
    return this;
  }
  build(parent = new THREE.Group(), cast = true) {
    for (const [mat, list] of this.g) { const mesh = new THREE.Mesh(merge(list), mat); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); }
    this.g.clear(); return parent;
  }
}
const M4 = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V(sx, sy, sz));

// ───────────────────────── the town ─────────────────────────
export class Town {
  constructor(scene, route, o = {}) {
    this.scene = scene; this.R = route; this.season = SEASONS[o.season || 'autumn'] || SEASONS.autumn; this.o = o;
    this.root = new THREE.Group(); scene.add(this.root); this.solids = []; this.marks = {}; this.tauToS = o.tauToS || (t => t * 5);
    this.b = new Batch(); this.r = rng(o.seed || 7);
    this.M = {
      road: cel('#ffffff', { map: asphalt(o.asphalt || '#8f8c8f'), key: 'road' }), line: cel('#ffffff', { map: lineTex(), key: 'line' }),
      walk: cel('#ffffff', { map: tiles(o.paving || '#cdbda6'), key: 'walk' }), curb: cel('#c9c5bd'), wall: cel('#ffffff', { map: blocks(o.block || '#cbc6bd'), key: 'wall' }),
      brick: cel('#ffffff', { map: bricks(o.brick || '#b4643e'), key: 'brick' }), metal: cel('#b9c2c8'), dark: cel('#3b3f48'), pole: cel('#a8a49c'),
      wire: cel('#2f3138'), bark: cel(this.season.bark), hedge: cel(this.season.hedge), grass: cel(this.season.grass), white: cel('#f2f0ea'),
      water: cel('#ffffff', { map: water(o.water || '#3f7fc0'), key: 'water' }), glass: cel('#8fb3d4'), wood: cel('#a8794a'), rail: cel(o.railColor || '#8a5a3a'),
      chain: cel('#ffffff', { map: chainLink(), key: 'chain', alphaTest: .5, side: THREE.DoubleSide }), soil: cel('#8a7258'),
    };
  }
  mat(c, o) { return cel(c, o); }
  get rand() { return this.r; }
  /** s for a story time (the rider's distance table) — place things under an action */
  sAt(tau) { return this.tauToS(tau); }
  _s(v) { return typeof v === 'object' && v && v.tau !== undefined ? this.sAt(v.tau) : v; }
  mark(name, v) { this.marks[name] = v; return v; }
  /** register an oriented box around a piece: centre (s, x), bottom y, size across (w) × height (h) × along (d) */
  solid(s, x, y, w, h, d) {
    const c = this.R.at(s, x, y + h / 2), hd = this.R.heading(s);
    this.solids.push({ c, cos: Math.cos(hd), sin: Math.sin(hd), hx: w / 2, hy: h / 2, hz: d / 2, w, d, s, x, min: V(c.x - Math.max(w, d), c.y - h / 2, c.z - Math.max(w, d)), max: V(c.x + Math.max(w, d), c.y + h / 2, c.z + Math.max(w, d)) });
  }
  /** is a world point inside any solid (grown by margin m)? */
  inside(p, m = 0) {
    for (const b of this.solids) {
      if (p.x < b.min.x - m || p.x > b.max.x + m || p.z < b.min.z - m || p.z > b.max.z + m) continue;
      const dx = p.x - b.c.x, dz = p.z - b.c.z, ax = dx * b.cos + dz * b.sin, az = -dx * b.sin + dz * b.cos;
      if (Math.abs(ax) < b.hx + m && Math.abs(az) < b.hz + m && Math.abs(p.y - b.c.y) < b.hy + m) return b;
    }
    return null;
  }
  /** walk from the target toward the camera; return the last clear point before a solid (or the camera itself) */
  clearLine(cam, target, m = .15) {
    const d = cam.clone().sub(target), L = d.length(), n = Math.ceil(L / .12); let last = target.clone();
    for (let i = 1; i <= n; i++) { const p = target.clone().addScaledVector(d, i / n); if (this.inside(p, m)) return { pos: last.addScaledVector(d, -.0), cut: 1 - (i - 1) / n }; last = p; }
    return { pos: cam.clone(), cut: 0 };
  }
  /** a box at route coords (centre bottom), yaw relative to the route */
  box(mat, s, x, y, w, h, d, o = {}) {
    s = this._s(s); const m = this.R.frame(s, x, y + h / 2, o.yaw || 0); this.b.add(boxGeo(w, h, d, o.tile || 1), mat, m); if (o.solid !== false) this.solid(s, x, y, w, h, d); return this;
  }
  /** any geometry at route coords: geo is built around its own origin (y up, -Z along the route) */
  put(geo, mat, s, x = 0, y = 0, o = {}) { s = this._s(s); const m = this.R.frame(s, x, y, o.yaw || 0); if (o.scale) m.scale(V(o.scale, o.scale, o.scale)); this.b.add(geo, mat, m); return this; }
  /**
   * sweep a 2-D profile [[x, y], …] (x to the right, y up, in metres) along the route from s0 to s1.
   * opts: step (m), closed, tileU (m per texture repeat along s), tileV, x (offset), flip (reverse winding)
   */
  sweep(mat, s0, s1, prof, o = {}) {
    s0 = this._s(s0); s1 = this._s(s1); const step = o.step || 1, n = Math.max(1, Math.ceil((s1 - s0) / step)), np = prof.length, segs = o.closed ? np : np - 1;
    const pos = [], uv = [], tU = o.tileU || 4, tV = o.tileV || 4, ox = o.x || 0, oy = o.y || 0;
    const vlen = [0]; for (let j = 1; j <= segs; j++) { const a = prof[j - 1], b = prof[j % np]; vlen.push(vlen[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const P = (i, j) => { const s = s0 + (s1 - s0) * i / n, q = prof[j % np]; return this.R.at(s, q[0] + ox, q[1] + oy + (o.followY === false ? -this.R.y(s) : 0)); };
    for (let i = 0; i < n; i++) for (let j = 0; j < segs; j++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const u0 = (s0 + (s1 - s0) * i / n) / tU, u1 = (s0 + (s1 - s0) * (i + 1) / n) / tU, v0 = vlen[j] / tV, v1 = vlen[j + 1] / tV;
      const quad = o.flip ? [a, d, c, a, c, b] : [a, b, c, a, c, d], uq = o.flip ? [[u0, v0], [u0, v1], [u1, v1], [u0, v0], [u1, v1], [u1, v0]] : [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
      for (const p of quad) pos.push(p.x, p.y, p.z); for (const q of uq) uv.push(q[0], q[1]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    this.b.add(g, mat); return this;
  }
  /** flush the batch into the scene (called by the film after the town function) */
  build() { this.b.build(this.root, true); return this.root; }

  // ── ground ──
  road(s0, s1, o = {}) {
    const w = o.w ?? 6, x = o.x || 0, M = this.M;
    this.sweep(o.mat || M.road, s0, s1, [[x - w / 2, 0], [x + w / 2, 0]], { tileU: 8, tileV: 8, flip: true });
    if (o.lines !== false) for (const lx of [x - w / 2 + .25, x + w / 2 - .25]) this.sweep(M.line, s0, s1, [[lx - .07, .006], [lx + .07, .006]], { tileU: 6, flip: true });
    if (o.centre) for (let s = this._s(s0); s < this._s(s1) - 3; s += 6) this.sweep(M.line, s, s + 3, [[x - .06, .006], [x + .06, .006]], { flip: true });
    return this;
  }
  walk(s0, s1, x0, x1, o = {}) { const h = o.h ?? .12, M = this.M; this.sweep(o.mat || M.walk, s0, s1, [[x0, h], [x1, h]], { tileU: 3, tileV: 3, flip: true }); this.sweep(M.curb, s0, s1, x0 < 0 ? [[x1, 0], [x1, h]] : [[x0, h], [x0, 0]], { flip: true }); return this; }
  verge(s0, s1, x0, x1, o = {}) { this.sweep(o.mat || this.M.grass, s0, s1, [[x0, o.y0 ?? .02], [x1, o.y1 ?? .02]], { flip: true, tileU: 6 }); return this; }
  // ── long pieces ──
  wall(s0, s1, x, o = {}) {
    const h = o.h ?? 1.6, t = o.t ?? .2, M = this.M, mat = o.mat || M.wall;
    this.sweep(mat, s0, s1, [[x - t / 2, 0], [x - t / 2, h], [x + t / 2, h], [x + t / 2, 0]], { tileU: 2.4, tileV: 1.2, flip: x > 0 });
    this.sweep(mat, s0, s1, [[x - t / 2, h], [x + t / 2, h]], { flip: true, tileU: 2.4 });
    this.solidRun(s0, s1, x, 0, t, h); return this;
  }
  solidRun(s0, s1, x, y, t, h) { s0 = this._s(s0); s1 = this._s(s1); for (let s = s0; s < s1; s += 3) this.solid(s + 1.5, x, y, t, h, Math.min(3, s1 - s)); }
  hedge(s0, s1, x, o = {}) {
    s0 = this._s(s0); s1 = this._s(s1); const h = o.h ?? 1.1, w = o.w ?? .9, r = rng(o.seed || Math.floor(s0 * 7 + x * 3)), mat = o.mat || this.M.hedge;
    this.sweep(mat, s0, s1, [[x - w / 2, 0], [x - w / 2, h * .8], [x + w / 2, h * .8], [x + w / 2, 0]], { flip: x > 0 });
    const ico = new THREE.IcosahedronGeometry(1, 1);
    for (let s = s0; s < s1; s += .7) { const k = .45 + r() * .25; this.put(ico, mat, s, x + (r() - .5) * w * .4, h * .78, { scale: k }); }
    if (o.top !== false && this.season.leaf) { const tm = cel(this.season.leaf[1]); for (let s = s0; s < s1; s += 1.3) if (r() < .5) this.put(ico, tm, s, x + (r() - .5) * w * .5, h * .95, { scale: .25 + r() * .2 }); }
    this.solidRun(s0, s1, x, 0, w, h); return this;
  }
  fence(s0, s1, x, o = {}) {   // chain-link on posts
    const h = o.h ?? 1.8, M = this.M; s0 = this._s(s0); s1 = this._s(s1);
    this.sweep(M.chain, s0, s1, [[x, 0], [x, h]], { tileU: .6, tileV: .6 });
    for (let s = s0; s <= s1; s += 2.5) this.box(M.metal, s, x, 0, .06, h, .06, { solid: false });
    this.sweep(M.metal, s0, s1, [[x - .03, h], [x + .03, h], [x + .03, h + .05], [x - .03, h + .05]], { closed: true }); return this;
  }
  guard(s0, s1, x, o = {}) {   // a road guardrail: a W-beam on posts
    const h = o.h ?? .75, M = this.M, c = o.mat || cel('#d9dde0'); s0 = this._s(s0); s1 = this._s(s1); const sx = x > 0 ? -1 : 1;
    this.sweep(c, s0, s1, [[x, h - .32], [x + sx * .06, h - .26], [x, h - .18], [x + sx * .06, h - .1], [x, h - .04]], { flip: x < 0 });
    for (let s = s0; s <= s1; s += 2) this.box(M.metal, s, x - sx * .08, 0, .1, h - .05, .1, { solid: false });
    this.solidRun(s0, s1, x, 0, .3, h); return this;
  }
  railing(s0, s1, x, o = {}) {   // a promenade railing: posts and a top bar (o.bars: vertical bars between)
    const h = o.h ?? 1.05, mat = o.mat || this.M.rail; s0 = this._s(s0); s1 = this._s(s1);
    const tube = (r, y) => [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]];
    this.sweep(mat, s0, s1, tube(.045, h), { closed: true, step: 1 }); this.sweep(mat, s0, s1, tube(.025, h * .45), { closed: true, step: 1 });
    for (let s = s0; s <= s1; s += o.gap || 1.6) this.box(mat, s, x, 0, .06, h, .06, { solid: false });
    if (o.bars) for (let s = s0; s <= s1; s += .18) this.box(mat, s, x, h * .45, .02, h * .55, .02, { solid: false });
    this.solidRun(s0, s1, x, 0, .12, h); return this;
  }
  /** a grind rail (round bar on two legs) or a ledge; returns its spec { s0, s1, x, h } and marks it */
  rail(o = {}) {
    let s0, s1; if (o.tau) { s0 = this.sAt(o.tau[0]) - (o.pad ?? .6); s1 = this.sAt(o.tau[1]) + (o.pad ?? .6); } else { s0 = o.s0; s1 = o.s1; }
    const x = o.x ?? 0, h = o.h ?? .42, mat = o.mat || cel(o.color || '#d8dde2'), r = .03;
    this.sweep(mat, s0, s1, [[x - r, h - r], [x + r, h - r], [x + r, h + r], [x - r, h + r]], { closed: true, step: .5 });
    for (const s of [s0 + .3, (s0 + s1) / 2, s1 - .3]) { this.box(mat, s, x, 0, .05, h, .05, { solid: false }); this.box(this.M.dark, s, x, 0, .3, .02, .14, { solid: false }); }
    const spec = { kind: 'rail', s0, s1, x, h, top: h + r }; if (o.name) this.mark(o.name, spec); return spec;
  }
  ledge(o = {}) {
    let s0, s1; if (o.tau) { s0 = this.sAt(o.tau[0]) - (o.pad ?? .8); s1 = this.sAt(o.tau[1]) + (o.pad ?? .8); } else { s0 = o.s0; s1 = o.s1; }
    const x = o.x ?? 0, h = o.h ?? .45, w = o.w ?? .5, mat = o.mat || cel(o.color || '#cfc8bc');
    this.sweep(mat, s0, s1, [[x - w / 2, 0], [x - w / 2, h], [x + w / 2, h], [x + w / 2, 0]], { flip: x > 0, tileU: 2 });
    this.sweep(cel(shade(o.color || '#cfc8bc', .08)), s0, s1, [[x - w / 2, h], [x + w / 2, h]], { flip: true });
    this.box(mat, s0, x, 0, w, h, .02, { solid: false }); this.box(mat, s1, x, 0, w, h, .02, { solid: false });
    const spec = { kind: 'ledge', s0, s1, x, h, top: h }; if (o.name) this.mark(o.name, spec); this.solidRun(s0, s1, x, 0, w, h); return spec;
  }
  // ── discrete pieces ──
  house(s, x, o = {}) {
    s = this._s(s); const r = this.r, w = o.w ?? 7 + r() * 3, d = o.d ?? 7 + r() * 2, h = o.h ?? 5.6 + r() * 1.4, side = Math.sign(x) || 1;
    const wallC = o.wall || vary(['#efe6d6', '#e6dccb', '#d9d4ca', '#f1ece2', '#d8c9b4'][Math.floor(r() * 5)], r, .03);
    const fm = cel('#ffffff', { map: facade(wallC, '#6a8db5', 2, 2, Math.floor(r() * 9) + 1), key: 'fac' + wallC });
    const g = boxGeo(d, h, w, h / 2); const m = this.R.frame(s, x + side * d / 2, h / 2, 0); this.b.add(g, fm, m);
    // gable roof: a prism along the route, with overhang
    const rh = o.roofH ?? 1.8, ov = .45, rc = o.roof || ['#4b5a6e', '#5f4a42', '#3f5f5a', '#6b6f78', '#8a4a3a'][Math.floor(r() * 5)];
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - ov, 0), new THREE.Vector2(d / 2 + ov, 0), new THREE.Vector2(0, rh)]);
    const pg = new THREE.ExtrudeGeometry(shape, { depth: w + ov * 2, bevelEnabled: false }); pg.translate(0, 0, -(w + ov * 2) / 2); pg.rotateY(Math.PI / 2);
    const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    this.b.add(pg, cel('#ffffff', { map: roof(rc), key: 'roof' + rc }), this.R.frame(s, x + side * d / 2, h, Math.PI / 2));
    this.solid(s, x + side * d / 2, 0, d, h + rh, w); return this;
  }
  apartments(s, x, o = {}) {
    s = this._s(s); const r = this.r, w = o.w ?? 14 + r() * 14, d = o.d ?? 10, fl = o.floors ?? 4 + Math.floor(r() * 8), h = fl * 3, side = Math.sign(x) || 1;
    const c = o.wall || ['#e8dfcf', '#d6d0c6', '#e2c9a8', '#cfd6dc', '#e9e4da', '#c9b49a'][Math.floor(r() * 6)];
    const fm = cel('#ffffff', { map: facade(c, '#5a7aa0', 1, 1, 30 + Math.floor(r() * 5)), key: 'apt' + c });
    this.b.add(boxGeo(d, h, w, 3), fm, this.R.frame(s, x + side * d / 2, h / 2, o.yaw || 0));
    this.box(cel(shade(c, -.15)), s, x + side * d / 2, h, d + .2, .4, w + .2, { solid: false });
    this.solid(s, x + side * d / 2, 0, d, h, w); return this;
  }
  pole(s, x, o = {}) {
    s = this._s(s); const h = o.h ?? 8.5, M = this.M;
    this.put(new THREE.CylinderGeometry(.11, .15, h, 8).translate(0, h / 2, 0), M.pole, s, x);
    this.box(M.pole, s, x, h - .9, .08, .08, 1.5, { yaw: Math.PI / 2, solid: false }); this.box(M.pole, s, x, h - 1.6, .07, .07, 1.1, { yaw: Math.PI / 2, solid: false });
    if (o.transformer) this.put(new THREE.CylinderGeometry(.28, .28, .8, 10).translate(0, h - 3, 0), cel('#9aa0a0'), s, x - Math.sign(x || 1) * .35);
    this.solid(s, x, 0, .3, h, .3); (this._poles = this._poles || []).push({ s, x, h, wires: o.wires ?? 3 }); return this;
  }
  /** wires between consecutive poles (called once after all poles) */
  wires() {
    const P = (this._poles || []).sort((a, b) => a.s - b.s), mat = this.M.wire;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i]; if (b.s - a.s > 60 || Math.sign(a.x) !== Math.sign(b.x)) continue;
      for (let k = 0; k < a.wires; k++) {
        const off = (k - (a.wires - 1) / 2) * .45, ya = a.h - .9 + (k > 2 ? -.7 : 0), pts = [];
        for (let j = 0; j <= 12; j++) { const q = j / 12, s = lerp(a.s, b.s, q), sag = Math.sin(Math.PI * q) * .55; pts.push(this.R.at(s, lerp(a.x, b.x, q) + off * 0 + (k - 1) * .35, ya - sag)); }
        this.b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .014, 3, false), mat);
      }
    }
    this._poles = []; return this;
  }
  tree(s, x, o = {}) {
    s = this._s(s); const r = rng(o.seed || Math.floor(s * 13 + x * 7) + 1), h = o.h ?? 4.5 + r() * 3, cr = o.r ?? 1.8 + r() * 1.4, M = this.M, sea = this.season;
    this.put(new THREE.CylinderGeometry(.12, .2, h * .7, 7).translate(0, h * .35, 0), M.bark, s, x);
    for (let i = 0; i < 3; i++) { const a = r() * 6.3; this.put(new THREE.CylinderGeometry(.04, .08, cr * 1.1, 5).translate(0, cr * .55, 0).rotateZ(.7).rotateY(a), M.bark, s, x, h * .55); }
    if (sea.leaf) {
      const ico = new THREE.IcosahedronGeometry(1, 1), n = o.n ?? 9;
      for (let i = 0; i < n; i++) {
        const a = r() * 6.3, d = r() * cr * .75, k = cr * (.42 + r() * .3), c = o.leaf || sea.leaf[Math.floor(r() * sea.leaf.length)];
        const m = M4(0, 0, 0, 0, k, k * .82, k); const p = this.R.frame(s, x + Math.cos(a) * d, h * .62 + r() * cr * .9, 0); p.multiply(new THREE.Matrix4().makeTranslation(0, 0, Math.sin(a) * d)); p.multiply(m);
        this.b.add(ico, cel(c), p);
      }
    }
    this.solid(s, x, 0, .5, h * .6, .5); this.solid(s, x, h * .5, cr * 1.5, h * .5 + cr, cr * 1.5); return this;
  }
  bench(s, x, o = {}) {
    s = this._s(s); const yaw = o.yaw ?? (x > 0 ? Math.PI / 2 : -Math.PI / 2), M = this.M, w = o.w ?? 1.8;
    this.box(M.wood, s, x, .42, w, .06, .45, { yaw, solid: false }); this.box(M.wood, s, x + (x > 0 ? .22 : -.22), .72, w, .3, .05, { yaw, solid: false });
    for (const k of [-.4, .4]) this.box(M.dark, s + k * w, x, 0, .06, .42, .4, { yaw, solid: false });
    this.solid(s, x, 0, .6, .9, w); return this;
  }
  vending(s, x, o = {}) {
    s = this._s(s); const c = o.color || '#d8382e', yaw = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.box(cel(c), s, x, 0, .95, 1.85, .7, { yaw }); this.box(cel('#ffffff', { map: shelves(Math.floor(s)) }), s, x - Math.sign(x) * .351, .9, .75, .7, .01, { yaw, solid: false });
    return this;
  }
  mirror(s, x) {   // a round traffic mirror on a post
    s = this._s(s); this.put(new THREE.CylinderGeometry(.04, .04, 2.8, 6).translate(0, 1.4, 0), cel('#e8742a'), s, x);
    this.put(new THREE.CylinderGeometry(.42, .42, .06, 18).rotateX(Math.PI / 2).translate(0, 2.9, 0), cel('#e8742a'), s, x, 0, { yaw: x > 0 ? -.6 : .6 });
    this.put(new THREE.CircleGeometry(.36, 18).translate(0, 2.9, .035), cel('#cfe4f2'), s, x, 0, { yaw: x > 0 ? -.6 : .6 }); return this;
  }
  lamp(s, x, o = {}) { s = this._s(s); const h = o.h ?? 4.5; this.put(new THREE.CylinderGeometry(.05, .07, h, 6).translate(0, h / 2, 0), this.M.dark, s, x); this.box(this.M.dark, s, x - Math.sign(x || 1) * .3, h, .7, .1, .18, { solid: false }); return this; }
  bollard(s, x) { s = this._s(s); this.put(new THREE.CylinderGeometry(.12, .14, .7, 8).translate(0, .35, 0), this.M.dark, s, x); return this; }
  planter(s, x, o = {}) {
    s = this._s(s); const w = o.w ?? 3, d = o.d ?? 1.2, h = o.h ?? .5, r = rng(Math.floor(s * 3));
    this.box(cel(o.color || '#c8bfb2'), s, x, 0, d, h, w, { yaw: 0 });
    const ico = new THREE.IcosahedronGeometry(1, 0), fl = o.flowers || ['#f08a24', '#f2b440', '#e8432e', '#ffffff'];
    for (let i = 0; i < w * 6; i++) this.put(ico, cel(i % 3 ? (this.season.hedge) : fl[Math.floor(r() * fl.length)]), s + (r() - .5) * (w - .2), x + (r() - .5) * (d - .2), h, { scale: .12 + r() * .1 });
    return this;
  }
  sign(s, x, o = {}) { s = this._s(s); this.put(new THREE.CylinderGeometry(.03, .03, 2.4, 6).translate(0, 1.2, 0), this.M.metal, s, x); this.put(new THREE.CircleGeometry(.3, 16).translate(0, 2.35, .02), flat(o.color || '#2f6fd0'), s, x, 0, { yaw: Math.PI }); return this; }
  /** a shop front facing the route: body, window of shelves, sign band (text designed for the topic), awning */
  shop(s, x, o = {}) {
    s = this._s(s); const w = o.w ?? 10, d = o.d ?? 8, h = o.h ?? 4.2, side = Math.sign(x) || 1, yaw = side > 0 ? 0 : Math.PI;
    const body = o.wall || '#e9e6e0';
    this.box(cel(body), s, x + side * d / 2, 0, d, h, w);
    const front = x + side * .02;
    const P = (geo, mat, dy = 0) => { const m = this.R.frame(s, front, dy, side > 0 ? -Math.PI / 2 : Math.PI / 2); this.b.add(geo, mat, m); };
    P(new THREE.PlaneGeometry(w * .86, 2.2).translate(0, 1.35, 0), cel('#ffffff', { map: shelves(o.seed || Math.floor(s)), key: 'sh' + Math.floor(s) }));
    P(new THREE.PlaneGeometry(w, .9).translate(0, h - .55, .01), flat('#ffffff', { map: signTex(o.text || 'CORNER MART', o.signStyle || {}) }));
    P(new THREE.PlaneGeometry(w, .14).translate(0, 2.55, .05), cel(o.stripe || '#f08a24'));
    if (o.awning !== false) { const ag = new THREE.PlaneGeometry(w * .9, 1.1).rotateX(-1.1).translate(0, 2.75, .45); P(ag, cel(o.awningColor || '#e8432e', { side: THREE.DoubleSide })); }
    this.solid(s, x + side * d / 2, 0, d, h, w); return this;
  }
  /** a station hall: glass front, a long curved canopy, a name board */
  station(s, x, o = {}) {
    s = this._s(s); const w = o.w ?? 40, d = o.d ?? 16, h = o.h ?? 9, side = Math.sign(x) || 1;
    this.b.add(boxGeo(d, h, w, 3), cel('#ffffff', { map: facade('#cfd8e0', '#3e6a96', 1, 1, 77), key: 'stn' }), this.R.frame(s, x + side * d / 2, h / 2, 0));
    const cg = new THREE.CylinderGeometry(d * .75, d * .75, w + 6, 24, 1, true, -Math.PI * .28, Math.PI * .56); cg.rotateZ(Math.PI / 2); cg.scale(1, .35, 1);
    this.b.add(cg, cel('#e6e9ec', { side: THREE.DoubleSide }), this.R.frame(s, x + side * d * .25, h + 1.2, Math.PI / 2));
    const sm = this.R.frame(s, x - side * .05, h - 2.2, side > 0 ? -Math.PI / 2 : Math.PI / 2); this.b.add(new THREE.PlaneGeometry(w * .4, 1.2), flat('#ffffff', { map: signTex(o.text || 'STATION', { bg: '#1f3f78', fg: '#ffffff', stripe: '#1f3f78', stripe2: '#1f3f78' }) }), sm);
    this.solid(s, x + side * d / 2, 0, d, h + 3, w); return this;
  }
  /** a bridge crossing the far river at s (a deck on piers, painted girders) */
  bridge(s, x0, x1, o = {}) {
    s = this._s(s); const y = o.y ?? 4, c = cel(o.color || '#3f6fae'), M = this.M;
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
    this.box(c, s, cx, y, len, .8, 7, { yaw: 0, solid: false }); this.box(M.white, s, cx, y + .8, len, .6, .15, { solid: false });
    for (let k = .2; k < 1; k += .3) this.box(cel('#b8b2a8'), s, lerp(x0, x1, k), -2, 1.5, y + 2, 4, { solid: false });
    return this;
  }
  /** the river (water plane between x0 and x1, both banks' edges) */
  river(s0, s1, x0, x1, o = {}) {
    const y = o.y ?? -2.2; this.sweep(this.M.water, s0, s1, [[x0, y], [x1, y]], { flip: true, tileU: 18, tileV: 18, step: 4 });
    this.sweep(cel('#bdb6a8'), s0, s1, [[x0, 0], [x0 + (x1 > x0 ? .1 : -.1), y]], { flip: x1 < x0, step: 4 });
    return this;
  }
  boat(s, x, o = {}) { s = this._s(s); const c = o.color || '#f2f0ea'; this.box(cel(c), s, x, o.y ?? -1.8, 4, .8, 12, { solid: false }); this.box(cel(o.cabin || '#e8432e'), s, x, (o.y ?? -1.8) + .8, 3, 1.6, 4, { solid: false }); return this; }

  // ── zones: a whole street in one call (examples of the style — build new ones in the page with the pieces) ──
  zone(kind, s0, s1, o = {}) { const f = ZONES[kind]; if (!f) throw new Error('no zone ' + kind); f(this, this._s(s0), this._s(s1), o, rng(o.seed || Math.floor(s0 * 11 + 3))); return this; }
}

export const ZONES = {
  /** a back lane: narrow road, block walls, houses behind, poles and wires, trees over the walls, a mirror */
  lane(K, s0, s1, o, r) {
    const w = o.w ?? 5.6; K.road(s0, s1, { w });
    for (const sd of [-1, 1]) {
      const wx = sd * (w / 2 + .5);
      K.verge(s0, s1, sd * w / 2, wx, { mat: K.M.walk });
      let s = s0; while (s < s1) { const l = Math.min(s1 - s, 10 + r() * 14), k = r(); if (k < .65) K.wall(s, s + l, wx, { h: 1.3 + r() * .5 }); else K.hedge(s, s + l, wx, {}); if (r() < .75) K.house(s + l / 2, wx + sd * (1.5 + r() * 2.5)); s += l; }
      for (let s = s0 + 4 + r() * 8; s < s1; s += 9 + r() * 14) K.tree(s, wx + sd * (1 + r() * 1.5), { h: 4 + r() * 2 });
    }
    const ps = o.poleSide ?? 1;
    for (let s = s0 + 5; s < s1; s += 28) K.pole(s, ps * (w / 2 + .25), { transformer: r() < .3 });
    if (o.mirror !== false) K.mirror(s0 + (s1 - s0) * .4, -(w / 2 + .3));
    for (let s = s0 + 20; s < s1; s += 60) K.apartments(s, (r() < .5 ? -1 : 1) * (30 + r() * 30));
  },
  /** a shopping street: sidewalks, a run of shop fronts on one side (o.shops: [{ text, …}]), vending machines, a bench */
  shops(K, s0, s1, o, r) {
    const w = o.w ?? 7, side = o.side ?? 1; K.road(s0, s1, { w, centre: true });
    K.walk(s0, s1, -w / 2 - 3.5, -w / 2); K.walk(s0, s1, w / 2, w / 2 + 3.5);
    const list = o.shops || [{ text: 'CORNER MART' }], n = Math.max(1, Math.floor((s1 - s0) / 13));
    for (let i = 0; i < n; i++) { const sh = list[i % list.length], s = s0 + 6.5 + i * 13; K.shop(s, side * (w / 2 + 3.5), { ...sh, seed: i + 3 }); }
    for (let i = 0; i < n; i++) { const s = s0 + 6.5 + i * 13; if (r() < .5) K.house(s, -side * (w / 2 + 3.5), { wall: undefined }); else K.apartments(s, -side * (w / 2 + 3.5), { w: 12, floors: 3 + Math.floor(r() * 3) }); }
    K.vending(s0 + (s1 - s0) * .3, side * (w / 2 + 3.0)); K.vending(s0 + (s1 - s0) * .3 + 1, side * (w / 2 + 3.0), { color: '#2f6fd0' });
    for (let s = s0 + 10; s < s1; s += 26) K.pole(s, -side * (w / 2 + .4));
  },
  /** a riverside path: promenade, railing on the water side, the river and its far bank, an embankment with trees */
  river(K, s0, s1, o, r) {
    const side = o.side ?? -1, w = o.w ?? 4.5;
    K.road(s0, s1, { w, lines: false, mat: K.M.walk });
    K.railing(s0, s1, side * (w / 2 + .1), { bars: o.bars });
    K.river(s0, s1, side * (w / 2 + .3), side * (w / 2 + 60));
    K.verge(s0, s1, -side * w / 2, -side * (w / 2 + 9), { y1: 2.5 });
    for (let s = s0 + 3; s < s1; s += 8 + r() * 6) K.tree(s, -side * (w / 2 + 3 + r() * 4), { h: 4 + r() * 2 });
    for (let s = s0; s < s1 + 40; s += 18 + r() * 10) K.apartments(s, side * (w / 2 + 64 + r() * 8), { floors: 5 + Math.floor(r() * 9) });
    if (o.bridge !== false) K.bridge(s0 + (s1 - s0) * (o.bridgeAt ?? .6), side * (w / 2 + .3), side * (w / 2 + 62));
    for (let s = s0 + 10; s < s1; s += 30) K.lamp(s, -side * (w / 2 + .3));
  },
  /** a park edge: hedges, trees, a chain-link fence, benches */
  park(K, s0, s1, o, r) {
    const w = o.w ?? 4; K.road(s0, s1, { w, lines: false, mat: K.M.walk });
    K.verge(s0, s1, -w / 2, -w / 2 - 12); K.verge(s0, s1, w / 2, w / 2 + 12);
    K.hedge(s0, s1, -(w / 2 + .6), { h: .9 }); K.fence(s0, s1, w / 2 + .8);
    for (let s = s0 + 4; s < s1; s += 7 + r() * 5) { K.tree(s, -(w / 2 + 3 + r() * 6)); if (r() < .6) K.tree(s + 3, w / 2 + 3 + r() * 6); }
    for (let s = s0 + 12; s < s1; s += 25) K.bench(s, -(w / 2 + .2));
  },
  /** a station plaza: wide paving, the station hall (o.text), planters, benches, ledges, lamps */
  plaza(K, s0, s1, o, r) {
    const w = o.w ?? 16, side = o.side ?? -1;
    K.road(s0, s1, { w, lines: false, mat: K.M.walk });
    K.station((s0 + s1) / 2, side * (w / 2 + 4), { text: o.text || 'STATION', w: Math.min(60, s1 - s0) });
    for (let s = s0 + 6; s < s1 - 3; s += 14) K.planter(s, side * (w / 2 - 1));
    for (let s = s0 + 10; s < s1; s += 18) K.lamp(s, -side * (w / 2 - .5));
    for (let s = s0; s < s1 + 30; s += 20) K.apartments(s, -side * (w / 2 + 20 + r() * 20), { floors: 6 + Math.floor(r() * 8) });
  },
  /** a harbour front: a seawall on the sea side, the sea, bollards, lamps, a moored boat */
  harbor(K, s0, s1, o, r) {
    const side = o.side ?? -1, w = o.w ?? 8;
    K.road(s0, s1, { w, lines: false, mat: K.M.walk });
    K.river(s0, s1, side * (w / 2), side * (w / 2 + 200), { y: -1.6 });
    for (let s = s0 + 2; s < s1; s += 6) K.bollard(s, side * (w / 2 - .4));
    for (let s = s0 + 8; s < s1; s += 20) K.lamp(s, -side * (w / 2 - .3));
    for (let s = s0; s < s1; s += 16 + r() * 8) K.house(s, -side * (w / 2 + 2 + r() * 3));
  },
};
