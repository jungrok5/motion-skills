// Building kit for a colossus body (the structure a project designs per topic). Lifted from the source film's
// building.js and generalised. Everything is merged into a few big meshes (one per material) with vertex colours,
// so a whole ship / cathedral / factory costs a handful of draw calls.
//
//   import { Batch, Kit } from '../engine/kit.js';
//   const K = new Kit(ctx);                  // holds the transform stack
//   const hull = K.batch();                  // a batch = one future mesh
//   K.push(m4); hull.box(x0,x1,y0,y1,z0,z1, colour); K.pop();
//   K.mesh(hull, material, { parent: walker, shadow: true });
//
// Colours are LINEAR [r,g,b] (use K.lin(0xrrggbb)); materials should set vertexColors = true (K.mat does).
import * as THREE from 'three';

export class Kit {
  constructor(ctx, seed = 1) {
    this.ctx = ctx; this.THREE = THREE;
    this.XF = new THREE.Matrix4(); this.stack = [];
    this.R = ctx.rng(seed);
    this.meshes = []; this.tris = 0;
  }
  rnd(a = 0, b = 1) { return a + (b - a) * this.R(); }
  chance(p) { return this.R() < p; }
  pick(arr) { return arr[Math.floor(this.R() * arr.length) % arr.length]; }
  lin(hex, k = 1) { const c = new THREE.Color(hex); return [c.r * k, c.g * k, c.b * k]; }
  mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  push(m) { this.stack.push(this.XF.clone()); this.XF.multiply(m); }
  pop() { this.XF.copy(this.stack.pop()); }
  at(x, y, z, ry = 0, rx = 0, rz = 0) { return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')).setPosition(x, y, z); }
  batch(ext = 0) { return new Batch(this, ext); }
  // a weathered material that takes the vertex colours (preset from ctx.Mats or MeshStandard params)
  mat(preset = 'paint', o = {}) {
    const m = typeof preset === 'string' ? this.ctx.Mats[preset]({ color: 0xffffff, ...o }) : preset;
    m.vertexColors = true; return m;
  }
  mesh(b, material, { parent = this.ctx.walker, shadow = true, receive = true, name = 'body' } = {}) {
    if (!b.count) return null;
    const m = new THREE.Mesh(b.geometry(), material);
    m.castShadow = shadow; m.receiveShadow = receive; m.name = name; m.frustumCulled = false;
    parent.add(m); this.meshes.push(m); this.tris += b.idx.length / 3;
    return m;
  }
}

export class Batch {
  constructor(kit, ext = 0) { this.k = kit; this.pos = []; this.nor = []; this.col = []; this.idx = []; this.ext = ext ? [] : null; this.count = 0; }
  v(x, y, z, nx, ny, nz, c, e0 = 0, e1 = 0, e2 = 0) {
    const e = this.k.XF.elements;
    this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    this.nor.push(e[0] * nx + e[4] * ny + e[8] * nz, e[1] * nx + e[5] * ny + e[9] * nz, e[2] * nx + e[6] * ny + e[10] * nz);
    this.col.push(c[0], c[1], c[2]);
    if (this.ext) this.ext.push(e0, e1, e2);
    return this.count++;
  }
  q(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  // axis-aligned box from min/max; cb = colour of the bottom vertices (fake contact shadow / grime)
  box(x0, x1, y0, y1, z0, z1, c, cb) {
    const b = cb || c; let i;
    i = this.v(x1, y0, z1, 1, 0, 0, b); this.v(x1, y0, z0, 1, 0, 0, b); this.v(x1, y1, z0, 1, 0, 0, c); this.v(x1, y1, z1, 1, 0, 0, c); this.q(i, i + 1, i + 2, i + 3);
    i = this.v(x0, y0, z0, -1, 0, 0, b); this.v(x0, y0, z1, -1, 0, 0, b); this.v(x0, y1, z1, -1, 0, 0, c); this.v(x0, y1, z0, -1, 0, 0, c); this.q(i, i + 1, i + 2, i + 3);
    i = this.v(x0, y1, z1, 0, 1, 0, c); this.v(x1, y1, z1, 0, 1, 0, c); this.v(x1, y1, z0, 0, 1, 0, c); this.v(x0, y1, z0, 0, 1, 0, c); this.q(i, i + 1, i + 2, i + 3);
    i = this.v(x0, y0, z0, 0, -1, 0, b); this.v(x1, y0, z0, 0, -1, 0, b); this.v(x1, y0, z1, 0, -1, 0, b); this.v(x0, y0, z1, 0, -1, 0, b); this.q(i, i + 1, i + 2, i + 3);
    i = this.v(x0, y0, z1, 0, 0, 1, b); this.v(x1, y0, z1, 0, 0, 1, b); this.v(x1, y1, z1, 0, 0, 1, c); this.v(x0, y1, z1, 0, 0, 1, c); this.q(i, i + 1, i + 2, i + 3);
    i = this.v(x1, y0, z0, 0, 0, -1, b); this.v(x0, y0, z0, 0, 0, -1, b); this.v(x0, y1, z0, 0, 0, -1, c); this.v(x1, y1, z0, 0, 0, -1, c); this.q(i, i + 1, i + 2, i + 3);
  }
  // centred box
  boxC(x, y, z, w, h, d, c, cb) { this.box(x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2, c, cb); }
  // cylinder / cone between two points (r -> r2), optional caps
  cyl(ax, ay, az, bx, by, bz, r, sides, c, cap = false, r2 = r) {
    let wx = bx - ax, wy = by - ay, wz = bz - az; const len = Math.hypot(wx, wy, wz) || 1; wx /= len; wy /= len; wz /= len;
    let hx = 0, hy = 1, hz = 0; if (Math.abs(wy) > 0.9) { hx = 1; hy = 0; }
    let ux = hy * wz - hz * wy, uy = hz * wx - hx * wz, uz = hx * wy - hy * wx; const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const vx = wy * uz - wz * uy, vy = wz * ux - wx * uz, vz = wx * uy - wy * ux;
    const base = this.count;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      const dx = ux * cs + vx * sn, dy = uy * cs + vy * sn, dz = uz * cs + vz * sn;
      this.v(ax + dx * r, ay + dy * r, az + dz * r, dx, dy, dz, c);
      this.v(bx + dx * r2, by + dy * r2, bz + dz * r2, dx, dy, dz, c);
    }
    for (let i = 0; i < sides; i++) { const a = base + i * 2; this.idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    if (cap) {
      for (const [px, py, pz, rr, s] of [[bx, by, bz, r2, 1], [ax, ay, az, r, -1]]) {
        const c0 = this.count;
        for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a); this.v(px + (ux * cs + vx * sn) * rr, py + (uy * cs + vy * sn) * rr, pz + (uz * cs + vz * sn) * rr, wx * s, wy * s, wz * s, c); }
        for (let i = 1; i < sides - 1; i++) s > 0 ? this.idx.push(c0, c0 + i, c0 + i + 1) : this.idx.push(c0, c0 + i + 1, c0 + i);
      }
    }
  }
  // free quad with one normal (or four)
  quad(p0, p1, p2, p3, n, c) {
    const pv = Array.isArray(n[0]), cv = Array.isArray(c[0]);
    const N = (k) => (pv ? n[k] : n), C = (k) => (cv ? c[k] : c);
    const i = this.v(...p0, ...N(0), C(0)); this.v(...p1, ...N(1), C(1)); this.v(...p2, ...N(2), C(2)); this.v(...p3, ...N(3), C(3));
    this.q(i, i + 1, i + 2, i + 3);
  }
  // a surface from a grid of points P[i][j] = [x,y,z] with colours C[i][j] (or one colour); normals from the grid
  grid(P, C, { closeJ = false, flip = false } = {}) {
    const ni = P.length, nj = P[0].length, base = this.count;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) {
      const ip = P[Math.min(ni - 1, i + 1)][j], im = P[Math.max(0, i - 1)][j];
      const jp = P[i][closeJ ? (j + 1) % nj : Math.min(nj - 1, j + 1)], jm = P[i][closeJ ? (j - 1 + nj) % nj : Math.max(0, j - 1)];
      const du = sub(ip, im), dv = sub(jp, jm);
      let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      const l = Math.hypot(...n); n = l > 1e-9 ? n.map((x) => (flip ? -x : x) / l) : [0, 1, 0];   // a collapsed row (a pointed end) must not give a zero normal (NaN in the shader)
      this.v(...P[i][j], ...n, Array.isArray(C[0]) ? C[i][j] : C);
    }
    const jm = closeJ ? nj : nj - 1;
    for (let i = 0; i < ni - 1; i++) for (let j = 0; j < jm; j++) {
      const a = base + i * nj + j, b = base + i * nj + (j + 1) % nj, c = a + nj, d = b + nj;
      flip ? this.idx.push(a, b, d, a, d, c) : this.idx.push(a, d, b, a, c, d);
    }
  }
  // a sagging line (cable, rope, chain) between two points: n segments of thin cylinders
  catenary(a, b, sag, r, c, segs = 8, sides = 4) {
    let prev = a;
    for (let s = 1; s <= segs; s++) {
      const u = s / segs, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u];
      this.cyl(...prev, ...p, r, sides, c); prev = p;
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    if (this.ext) g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(this.ext), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.idx), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// Warm lit-window radiance (linear HDR, before the grade). Tungsten amber, never white or lemon (references/LOOK.md).
export const WINDOW = { core: [2.4, 1.1, 0.32], dim: [0.9, 0.38, 0.1], dark: [0.012, 0.012, 0.014] };
export function windowColour(R, pLit = 0.6) {
  const r = R();
  if (r > pLit) return WINDOW.dark.map((v) => v * (0.6 + 0.8 * R()));
  const k = R();
  return WINDOW.dim.map((d, i) => d + (WINDOW.core[i] - d) * k * k);
}

// Follow-through for hanging / loose parts (chains, flags, cloth, weed, cables): a damped pendulum driven by the
// body's own motion, evaluated in CLOSED FORM from the gait (no state, so any frame renders in any order).
// Returns the swing angle (rad) relative to plumb, from the body's acceleration along `axis` ('z' sway, 'x' surge,
// 'y' bob), natural period `T`, damping `zeta`. A part hanging from the body also counter-rotates by the body's roll.
export function lagSwing(gait, t, { T = 2.4, zeta = 0.18, gain = 1, axis = 'z', window = 6 } = {}) {
  // convolve the body acceleration with the pendulum's impulse response over the last `window` seconds
  const w = 2 * Math.PI / T, wd = w * Math.sqrt(1 - zeta * zeta), p = {}, q = {}, r = {};
  let ang = 0; const dt = 1 / 30;
  for (let s = 0; s < window; s += dt) {
    gait.bodyPose(t - s - dt, p); gait.bodyPose(t - s, q); gait.bodyPose(t - s + dt, r);
    const acc = axis === 'z' ? (r.z - 2 * q.z + p.z) / (dt * dt) : axis === 'y' ? (r.y - 2 * q.y + p.y) / (dt * dt) : (r.x - 2 * q.x + p.x) / (dt * dt);
    ang += -acc / 9.81 * Math.exp(-zeta * w * s) * Math.sin(wd * s) * w * dt;
  }
  return ang * gain;
}
