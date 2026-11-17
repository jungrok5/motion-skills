// Soviet prefab panel apartment block riding on the walker.
// Everything is generated procedurally in walker-local space and merged into a handful of batches.
// Facade features are authored in a "facade frame": u = along the wall (to the right when seen from
// outside), y = up, w = outward from the wall plane.
export async function create(ctx) {
  const { THREE, walker, CFG, Mats, LOOK, rng } = ctx;
  const _t0 = performance.now();
  const group = new THREE.Group(); group.name = 'building';
  walker.add(group);

  // ------------------------------------------------------------------ utils
  const R = rng(20261);
  const rr = (a, b) => a + R() * (b - a);
  const chance = (p) => R() < p;
  const pick = (arr) => arr[Math.floor(R() * arr.length) % arr.length];
  const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const WHITE = [1, 1, 1];

  const XF = new THREE.Matrix4();
  const xfStack = [];
  const pushXf = (m) => { xfStack.push(XF.clone()); XF.multiply(m); };
  const popXf = () => { XF.copy(xfStack.pop()); };
  const frameM = (x, z, ang) => new THREE.Matrix4().makeRotationY(ang).setPosition(x, 0, z);
  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();

  class Batch {
    constructor(ext = 0) { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.ext = ext ? [] : null; this.count = 0; }
    v(x, y, z, nx, ny, nz, c, e0 = 0, e1 = 0, e2 = 0) {
      const e = XF.elements;
      this.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      this.nor.push(e[0] * nx + e[4] * ny + e[8] * nz, e[1] * nx + e[5] * ny + e[9] * nz, e[2] * nx + e[6] * ny + e[10] * nz);
      this.col.push(c[0], c[1], c[2]);
      if (this.ext) this.ext.push(e0, e1, e2);
      return this.count++;
    }
    q(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
    // axis-aligned box given min/max; cb = optional colour for bottom vertices (fake AO)
    box(x0, x1, y0, y1, z0, z1, c, cb) {
      const b = cb || c;
      let i;
      i = this.v(x1, y0, z1, 1, 0, 0, b); this.v(x1, y0, z0, 1, 0, 0, b); this.v(x1, y1, z0, 1, 0, 0, c); this.v(x1, y1, z1, 1, 0, 0, c); this.q(i, i + 1, i + 2, i + 3);
      i = this.v(x0, y0, z0, -1, 0, 0, b); this.v(x0, y0, z1, -1, 0, 0, b); this.v(x0, y1, z1, -1, 0, 0, c); this.v(x0, y1, z0, -1, 0, 0, c); this.q(i, i + 1, i + 2, i + 3);
      i = this.v(x0, y1, z1, 0, 1, 0, c); this.v(x1, y1, z1, 0, 1, 0, c); this.v(x1, y1, z0, 0, 1, 0, c); this.v(x0, y1, z0, 0, 1, 0, c); this.q(i, i + 1, i + 2, i + 3);
      i = this.v(x0, y0, z0, 0, -1, 0, b); this.v(x1, y0, z0, 0, -1, 0, b); this.v(x1, y0, z1, 0, -1, 0, b); this.v(x0, y0, z1, 0, -1, 0, b); this.q(i, i + 1, i + 2, i + 3);
      i = this.v(x0, y0, z1, 0, 0, 1, b); this.v(x1, y0, z1, 0, 0, 1, b); this.v(x1, y1, z1, 0, 0, 1, c); this.v(x0, y1, z1, 0, 0, 1, c); this.q(i, i + 1, i + 2, i + 3);
      i = this.v(x1, y0, z0, 0, 0, -1, b); this.v(x0, y0, z0, 0, 0, -1, b); this.v(x0, y1, z0, 0, 0, -1, c); this.v(x1, y1, z0, 0, 0, -1, c); this.q(i, i + 1, i + 2, i + 3);
    }
    // cylinder / cone between two points
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
        const c0 = this.count;
        for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a); this.v(bx + (ux * cs + vx * sn) * r2, by + (uy * cs + vy * sn) * r2, bz + (uz * cs + vz * sn) * r2, wx, wy, wz, c); }
        for (let i = 1; i < sides - 1; i++) this.idx.push(c0, c0 + i, c0 + i + 1);
        const c1 = this.count;
        for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a); this.v(ax + (ux * cs + vx * sn) * r, ay + (uy * cs + vy * sn) * r, az + (uz * cs + vz * sn) * r, -wx, -wy, -wz, c); }
        for (let i = 1; i < sides - 1; i++) this.idx.push(c1, c1 + i + 1, c1 + i);
      }
    }
    // free quad (p = [x,y,z]) with one normal; optional per-vertex extras
    quad(p0, p1, p2, p3, n, c, e) {
      const pv = Array.isArray(n[0]), n0 = pv ? n[0] : n, n1 = pv ? n[1] : n, n2 = pv ? n[2] : n, n3 = pv ? n[3] : n;
      const cv = Array.isArray(c[0]);
      const i = this.v(p0[0], p0[1], p0[2], n0[0], n0[1], n0[2], cv ? c[0] : c, ...(e ? e[0] : []));
      this.v(p1[0], p1[1], p1[2], n1[0], n1[1], n1[2], cv ? c[1] : c, ...(e ? e[1] : []));
      this.v(p2[0], p2[1], p2[2], n2[0], n2[1], n2[2], cv ? c[2] : c, ...(e ? e[2] : []));
      this.v(p3[0], p3[1], p3[2], n3[0], n3[1], n3[2], cv ? c[3] : c, ...(e ? e[3] : []));
      this.q(i, i + 1, i + 2, i + 3);
    }
    geometry(glowArr) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
      if (this.ext) g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(this.ext), 3));
      if (glowArr) g.setAttribute('glow', new THREE.BufferAttribute(glowArr, 3));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.idx), 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
  }

  // batches
  const conc = new Batch();     // concrete panels, slabs
  const core = new Batch();     // dark backing behind the panel seams
  const paint = new Batch();    // painted stuff: frames, parapets, clutter, AC units
  const metal = new Batch();    // steel: railings, antennas, pipes, brackets
  const tar = new Batch();      // roofing
  const cloth = new Batch();    // static fabric: loggia curtains, awnings
  const laundry = new Batch(3); // swaying laundry
  const plant = new Batch();    // greenery
  const glass = new Batch();    // loggia glazing
  const wire = new Batch();     // black cables & wires
  const emis = new Batch();     // tiny emissive bulbs (HDR vertex colours)
  const puddle = new Batch();   // standing water on the roofs

  // subdivided box (so baked per-vertex glow has something to interpolate); colour blends c (top) -> cb (bottom)
  function sbox(b, x0, x1, y0, y1, z0, z1, c, cb, nx = 1, ny = 1, nz = 1) {
    const bb = cb || c, mixc = (k) => [bb[0] + (c[0] - bb[0]) * k, bb[1] + (c[1] - bb[1]) * k, bb[2] + (c[2] - bb[2]) * k];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++)
      b.box(x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx, y0 + (y1 - y0) * j / ny, y0 + (y1 - y0) * (j + 1) / ny, z0 + (z1 - z0) * k / nz, z0 + (z1 - z0) * (k + 1) / nz, mixc((j + 1) / ny), mixc(j / ny));
  }
  // weathering decals: quads in the current facade frame (u/y plane at depth w) that MULTIPLY what is behind them.
  // type 0 fine drip streaks, 1 broad soak / rising damp, 2 hairline crack, 3 repair patch. v runs 0 (yA) -> 1 (yB).
  const decal = { pos: [], uv: [], par: [], col: [], idx: [], count: 0 };
  function addDecal(u0, u1, yA, yB, w, type, strength, tint) {
    const e = XF.elements, seed = R() * 100, W = Math.abs(u1 - u0), H = Math.abs(yA - yB);
    const P = [[u0, yA, 0, 0], [u1, yA, 1, 0], [u1, yB, 1, 1], [u0, yB, 0, 1]];
    for (const [x, y, a, b] of P) {
      decal.pos.push(e[0] * x + e[4] * y + e[8] * w + e[12], e[1] * x + e[5] * y + e[9] * w + e[13], e[2] * x + e[6] * y + e[10] * w + e[14]);
      decal.uv.push(a, b, W, H); decal.par.push(type, seed, strength, 0); decal.col.push(tint[0], tint[1], tint[2]);
    }
    const i = decal.count; decal.count += 4; decal.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const D_WATER = [0.50, 0.50, 0.49], D_RUST = [0.66, 0.43, 0.29], D_MOSS = [0.50, 0.60, 0.40], D_SOOT = [0.36, 0.36, 0.37], D_PATCH = [1.28, 1.27, 1.24];

  // window instances
  const winM = [], winA = [], winT = [];
  const lights = [];            // warm light sources for baked "glow" spill
  const beacons = [];
  const _p = new THREE.Vector3();
  const addLight = (u, y, w, tint, I) => { _p.set(u, y, w).applyMatrix4(XF); const cold = tint[2] > tint[0]; lights.push({ x: _p.x, y: _p.y, z: _p.z, r: cold ? 0.3 : 1.0, g: cold ? 0.5 : 0.43 + 0.3 * (tint[1] - 0.42), b: cold ? 1.0 : 0.13 + 0.3 * (tint[2] - 0.14), I }); };
  function addWindow(uc, yc, w, ow, oh, seed, lit, curtain, kind, tint) {
    _m1.makeScale(ow, oh, 1).setPosition(uc, yc, w);
    _m2.multiplyMatrices(XF, _m1);
    winM.push(_m2.clone()); winA.push(seed, lit, curtain, kind); winT.push(tint[0], tint[1], tint[2]);
  }

  // smooth 2D noise for clustering lit flats
  const NT = new Float32Array(64 * 32); for (let i = 0; i < NT.length; i++) NT[i] = R();
  const sn2 = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const g = (a, b) => NT[(((b % 32) + 32) % 32) * 64 + (((a % 64) + 64) % 64)];
    return g(ix, iy) * (1 - fx) * (1 - fy) + g(ix + 1, iy) * fx * (1 - fy) + g(ix, iy + 1) * (1 - fx) * fy + g(ix + 1, iy + 1) * fx * fy;
  };

  // ------------------------------------------------------------------ palettes
  const desat = (c, k, m = 1) => { const l = c[0] * 0.3 + c[1] * 0.5 + c[2] * 0.2; return [(l + (c[0] - l) * k) * m, (l + (c[1] - l) * k) * m, (l + (c[2] - l) * k) * m]; };
  const FRAME_COLS = [lin(0xc9cbc4), lin(0xc9cbc4), lin(0xbdbfb8), lin(0xd8dad6), lin(0x9aa3a0), lin(0x5b3b26), lin(0x6f4a30), lin(0x51656b)].map((c) => mul(c, 0.72));
  const PARAPET_PAINT = [lin(0x5e7f7c), lin(0x8a7748), lin(0xa39a80), lin(0x6e3a2c), lin(0x5b7890), lin(0x8f9490), lin(0x7c8c72), lin(0xb0aca0)].map((c) => desat(c, 0.36, 0.8));
  const SHEET_COLS = [lin(0x4f6652), lin(0x8d9295), lin(0x6b4a34), lin(0x55708a), lin(0x9a9684), lin(0x7a3b2b)].map((c) => desat(c, 0.36, 0.8));
  const CLUTTER = [lin(0x5a4632), lin(0x6c6f72), lin(0x2f4a66), lin(0x7a6a50), lin(0x8a3a2a), lin(0x40484a), lin(0x9a927c), lin(0x35523d)].map((c) => desat(c, 0.6, 0.9));
  const LAUNDRY = [
    [lin(0xcfcdc6), null], [lin(0xd2d0c8), null], [lin(0xc8c6ba), null], [lin(0xd4d1c6), null], [lin(0xc2bca8), null], [lin(0xbcbab2), null], [lin(0xa9a8a2), null],
    [lin(0x7c221f), null], [lin(0xb9b6ac), null], [lin(0x9a7c30), null], [lin(0x33486e), null], [lin(0xb59094), null], [lin(0x7890a0), null], [lin(0x55604a), null],
    [lin(0xcdcbc4), lin(0x8b96a8)], [lin(0xcdcbc4), lin(0xb08a86)], [lin(0xc4b693), lin(0x9c8660)], [lin(0xd0cec8), lin(0x94a3a8)], [lin(0x8a8f9a), lin(0x6c7482)],
  ];
  const CURTAIN_COLS = [lin(0xe7dfc8), lin(0xe9e2d2), lin(0xd9b276), lin(0xcf8f4a), lin(0xd8c9a4), lin(0xc7b9a0)].map((c) => mul(c, 0.5));
  const STEEL = lin(0x4a4e52), STEEL_D = lin(0x2c2f33), RUSTY = lin(0x6b4630);
  const PLANT_G = [lin(0x2d4a22), lin(0x3a5a26), lin(0x25401f), lin(0x4a6230), lin(0x33502c)].map((c) => desat(c, 0.75, 0.5));
  const TINTS = [[1.0, 0.335, 0.10], [1.0, 0.35, 0.108], [1.0, 0.36, 0.116], [1.0, 0.375, 0.124], [1.0, 0.39, 0.132], [1.0, 0.40, 0.14], [1.0, 0.415, 0.15], [1.0, 0.43, 0.16]];   // amber (renders ~242,193,130), no salmon / lemon
  const LAMPC = [2.3, 1.15, 0.4];
  const REC = 1.0, PROJ = 0.45;   // loggia recess behind the facade plane / projection in front of it

  // ------------------------------------------------------------------ layout
  const Y0 = 0.7, FH = CFG.FLOOR_H, TH = 0.3, TW = 3.0;
  const BAYS = [4, 5, 6, 5, 4], FL = [6, 7, 5, 6, 7];
  const ZF = [7.5, 7.9, 7.3, 7.9, 7.6], ZB = [7.8, 7.5, 7.9, 7.4, 7.8];
  const SEC_TINT = [[1.0, 0.985, 0.95], [0.95, 0.99, 0.985], [1.0, 1.0, 1.0], [1.03, 1.0, 0.94], [0.94, 0.97, 1.0]];
  const NB = BAYS.reduce((a, b) => a + b, 0);
  const BW = (CFG.BODY_LEN - 4 * TW) / NB;
  const TZF = 8.5, TZB = 8.05;
  const sections = [], towers = [];
  {
    let x = -CFG.BODY_LEN / 2, bay = 0;
    for (let s = 0; s < BAYS.length; s++) {
      const x1 = x + BAYS[s] * BW;
      sections.push({ s, x0: x, x1, bays: BAYS[s], floors: FL[s], zf: ZF[s], zb: ZB[s], bay0: bay, roofY: Y0 + FL[s] * FH, tint: SEC_TINT[s] });
      bay += BAYS[s]; x = x1;
      if (s < BAYS.length - 1) { towers.push({ x0: x, x1: x + TW, floors: Math.max(FL[s], FL[s + 1]) + 1, i: s }); x += TW; }
    }
  }

  // ------------------------------------------------------------------ small generators
  const ICO = new THREE.IcosahedronGeometry(1, 0).attributes.position.array;
  function blob(b, x, y, z, r, c, sy = 1) {
    const base = b.count;
    for (let i = 0; i < ICO.length; i += 3) b.v(x + ICO[i] * r, y + ICO[i + 1] * r * sy, z + ICO[i + 2] * r, ICO[i], ICO[i + 1], ICO[i + 2], c);
    for (let i = 0; i < ICO.length / 3; i += 3) b.idx.push(base + i, base + i + 1, base + i + 2);
  }
  function bush(x, y, z, r, n = 4) {
    for (let i = 0; i < n; i++) blob(plant, x + rr(-r, r) * 0.7, y + rr(0, r) * 0.9, z + rr(-r, r) * 0.5, r * rr(0.45, 0.8), mul(pick(PLANT_G), rr(0.7, 1.2)), rr(0.7, 1.1));
  }
  function vine(x, y, z, len) {
    const c = mul(pick(PLANT_G), rr(0.6, 1.0));
    plant.box(x - 0.012, x + 0.012, y - len, y, z - 0.012, z + 0.012, c);
    const n = Math.max(2, Math.round(len / 0.22));
    for (let i = 0; i < n * 2; i++) blob(plant, x + rr(-0.09, 0.09), y - rr(0, len), z + rr(-0.06, 0.06), rr(0.03, 0.075), mul(c, rr(0.8, 1.5)), 0.6);
  }
  // sagging wire between two points
  function catenary(b, a, c, sag, r, col, segs = 8) {
    let px = a[0], py = a[1], pz = a[2];
    for (let i = 1; i <= segs; i++) {
      const k = i / segs;
      const x = a[0] + (c[0] - a[0]) * k, y = a[1] + (c[1] - a[1]) * k - sag * 4 * k * (1 - k), z = a[2] + (c[2] - a[2]) * k;
      b.cyl(px, py, pz, x, y, z, r, 3, col);
      px = x; py = y; pz = z;
    }
  }
  // satellite dish at local position, facing local +z rotated by yaw, tilted up
  function dish(x, y, z, r, yaw, tilt) {
    pushXf(_m1.makeRotationY(yaw).setPosition(x, y, z).clone());
    pushXf(new THREE.Matrix4().makeRotationX(-tilt));
    const c = mul(lin(0xb9bbb6), rr(0.6, 1.0)), seg = 10, rings = 3, k = 0.28;
    const ring = (side) => {
      const base = paint.count;
      for (let j = 0; j <= rings; j++) for (let i = 0; i <= seg; i++) {
        const rho = r * j / rings, a = (i / seg) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
        const zz = k * r * (rho / r) * (rho / r) + (side < 0 ? -0.012 : 0);
        const s = 2 * k * rho / r; const nl = Math.hypot(s, 1);
        paint.v(rho * cs, rho * sn, zz, side * -s * cs / nl, side * -s * sn / nl, side / nl, side > 0 ? c : mul(c, 0.7));
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
        const a = base + j * (seg + 1) + i, b2 = a + 1, c2 = a + seg + 1, d2 = c2 + 1;
        if (side > 0) paint.idx.push(a, c2, d2, a, d2, b2); else paint.idx.push(a, d2, c2, a, b2, d2);
      }
    };
    ring(1); ring(-1);
    metal.cyl(0, -r * 0.95, k * r, 0, 0, r * 0.95, 0.012, 3, STEEL);
    metal.box(-0.04, 0.04, -0.04, 0.04, r * 0.9, r * 1.02, STEEL_D);
    metal.cyl(0, 0, -0.02, 0, -0.1, -0.28, 0.025, 4, STEEL);
    popXf(); popXf();
  }
  // a piece of hanging laundry (plane in the u/y plane at depth w), swaying
  const PEGS = [lin(0x8a6a44), lin(0x8a6a44), lin(0x9a7a50), lin(0x7a2a22), lin(0x2f5a7a), lin(0x9a8a2a), lin(0x3a6a3a)];
  function hang(u, yTop, w, width, height, colSpec, shape = 0) {
    const [c0, c1] = colSpec; const ph = rr(0, 40), amp = rr(0.6, 1.25) * Math.min(1.3, 0.5 + height * 0.6);
    const lean = rr(-0.05, 0.08);
    const fk = rr(7, 13), fa = rr(0.028, 0.06), fk2 = fk * rr(1.9, 2.7), ph2 = rr(0, 6);
    const fold = (x) => Math.sin(x * fk + ph) + 0.45 * Math.sin(x * fk2 + ph2);
    const dfold = (x) => fk * Math.cos(x * fk + ph) + 0.45 * fk2 * Math.cos(x * fk2 + ph2);
    const grow = (p) => Math.min(1, p * 1.4 + 0.12);
    const rect = (ua, ub, ya, yb, stripeDir, noStripe, o = {}) => {
      const st = c1 && !noStripe, sag = o.sag || 0, hem = o.hem === undefined ? 0.02 : o.hem, taper = o.taper || 0, cm = o.cm || 1, dw = o.dw || 0;
      const nx = Math.max(2, Math.round((ub - ua) / (st && stripeDir ? 0.07 : 0.085))), ny = Math.max(2, Math.round((ya - yb) / (st && !stripeDir ? 0.07 : 0.2)));
      const um = (ua + ub) / 2;
      const V = (i, j) => {
        const fx = i / nx, fy = j / ny;
        const x = um + (ua + (ub - ua) * fx - um) * (1 + taper * fy);
        const y = ya - (ya - yb) * fy - sag * Math.sin(fx * Math.PI) * (1 - fy) + hem * Math.sin(x * fk * 0.7 + ph) * fy;
        const p = Math.max(0, (yTop - y) / 1.3), g = grow(p);
        const dx = -fa * dfold(x) * g * 1.3, l = Math.hypot(dx, 1);
        const k = cm * (0.80 + 0.20 * Math.sin(x * fk + ph + 0.9)) * (0.96 + 0.04 * Math.sin(p * 9 + ph)) * (1 - 0.12 * Math.min(1, p));
        return { p: [x, y, w + dw + lean * p + fa * fold(x) * g], n: [dx / l, 0, 1 / l], k, e: [p, ph, amp] };
      };
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        let c = c0;
        if (st) { const sI = stripeDir ? i : j; if (sI % 3 === 1) c = c1; }
        const A = V(i, j + 1), B = V(i + 1, j + 1), C = V(i + 1, j), D = V(i, j);
        laundry.quad(A.p, B.p, C.p, D.p, [A.n, B.n, C.n, D.n], [mul(c, A.k), mul(c, B.k), mul(c, C.k), mul(c, D.k)], [A.e, B.e, C.e, D.e]);
      }
    };
    const peg = (x) => paint.box(x - 0.012, x + 0.012, yTop - 0.045, yTop + 0.03, w - 0.014, w + 0.014, pick(PEGS));
    if (shape === 0) { rect(u, u + width, yTop, yTop - height, chance(0.5), false, { sag: width > 0.7 ? 0.035 : 0.01, taper: rr(-0.06, 0.02) }); if (width > 0.9) peg(u + width / 2); }
    else if (shape === 1) { // shirt
      rect(u + width * 0.22, u + width * 0.78, yTop, yTop - height, true, true, { taper: 0.08 });
      rect(u, u + width * 0.24, yTop - 0.02, yTop - height * 0.5, true, true, { taper: -0.2, cm: 0.92 });
      rect(u + width * 0.76, u + width, yTop - 0.02, yTop - height * 0.5, true, true, { taper: -0.2, cm: 0.92 });
    } else if (shape === 2) { // trousers
      rect(u, u + width, yTop, yTop - height * 0.25, true, true, { hem: 0 });
      rect(u, u + width * 0.46, yTop - height * 0.25, yTop - height, true, true, { taper: -0.15 });
      rect(u + width * 0.54, u + width, yTop - height * 0.25, yTop - height, true, true, { taper: -0.15 });
    } else if (shape === 3) { // pair of socks
      rect(u, u + width * 0.4, yTop, yTop - height, true, true, { hem: 0 }); rect(u + width * 0.6, u + width, yTop, yTop - height * rr(0.85, 1), true, true, { hem: 0 });
    } else if (shape === 4) { // big sheet folded over the line: two layers
      rect(u, u + width, yTop + 0.01, yTop - height * rr(0.55, 0.8), false, false, { cm: 0.72, dw: -0.035, sag: 0.02 });
      rect(u, u + width, yTop + 0.012, yTop - height, false, false, { sag: 0.02, taper: rr(-0.05, 0.03) });
    } else if (shape === 5) { // T-shirt / dress
      rect(u + width * 0.14, u + width * 0.86, yTop, yTop - height, false, true, { taper: rr(0.1, 0.35) });
      rect(u, u + width * 0.2, yTop - 0.01, yTop - 0.2, true, true, { hem: 0, cm: 0.9 }); rect(u + width * 0.8, u + width, yTop - 0.01, yTop - 0.2, true, true, { hem: 0, cm: 0.9 });
    } else { // small things
      rect(u, u + width, yTop, yTop - height, true, true, { taper: -0.55, hem: 0 });
    }
    peg(u + 0.04); peg(u + width - 0.04);
  }
  // a washing line from ua to ub at height y / depth w, filled with laundry
  function washLine(ua, ub, y, w, density = 1) {
    wire.cyl(ua, y, w, ub, y, w, 0.009, 3, [0.25, 0.25, 0.25]);
    let u = ua + rr(0.03, 0.25);
    while (u < ub - 0.25) {
      if (!chance(0.8 * density)) { u += rr(0.2, 0.7); continue; }
      const t = R(); let wd, ht, shape = 0;
      if (t < 0.16) { wd = rr(0.9, 1.5); ht = rr(0.8, 1.25); shape = chance(0.5) ? 4 : 0; }   // sheet
      else if (t < 0.40) { wd = rr(0.3, 0.6); ht = rr(0.45, 0.9); }                             // towel
      else if (t < 0.56) { wd = rr(0.5, 0.64); ht = rr(0.5, 0.68); shape = 1; }
      else if (t < 0.68) { wd = rr(0.36, 0.44); ht = rr(0.75, 0.98); shape = 2; }
      else if (t < 0.80) { wd = rr(0.2, 0.26); ht = rr(0.22, 0.36); shape = 3; }
      else if (t < 0.92) { wd = rr(0.42, 0.56); ht = rr(0.5, 0.95); shape = 5; }
      else { wd = rr(0.26, 0.36); ht = rr(0.16, 0.24); shape = 6; }
      if (u + wd > ub - 0.03) { if (shape !== 0 && shape !== 4) break; wd = ub - 0.03 - u; }
      if (wd < 0.2) break;
      hang(u, y - 0.01, w, wd, ht, pick(LAUNDRY), shape);
      u += wd + rr(0.03, 0.22);
    }
  }
  // rug / blanket thrown over a parapet (outer face at depth w, top at y)
  const RUGS = [[lin(0x6a1f1a), lin(0x2a1a14), lin(0xa08050)], [lin(0x5a2a1e), lin(0x8a7a5a), lin(0x23303c)], [lin(0x3a4a3a), lin(0x8a8470), lin(0x5a2a22)], [lin(0x7a7468), lin(0x4a4a50), lin(0x8a3a2e)], [lin(0x2c3c58), lin(0x8a8a84), lin(0x6a2a26)]];
  function rug(u, y, w, wd, ht, wIn) {
    const [ca, cb2, cc] = pick(RUGS).map((c) => mul(c, rr(0.5, 0.8)));
    const z = w + 0.03;
    cloth.quad([u, y - ht, z + 0.01], [u + wd, y - ht, z + 0.01], [u + wd, y + 0.02, z], [u, y + 0.02, z], [0, 0, 1], [mul(ca, 0.8), mul(ca, 0.8), ca, ca]);
    const b1 = 0.07, b2 = 0.16;
    cloth.quad([u + b1, y - ht + b1, z + 0.016], [u + wd - b1, y - ht + b1, z + 0.016], [u + wd - b1, y + 0.02, z + 0.006], [u + b1, y + 0.02, z + 0.006], [0, 0, 1], cb2);
    cloth.quad([u + b2, y - ht + b2, z + 0.022], [u + wd - b2, y - ht + b2, z + 0.022], [u + wd - b2, y + 0.02, z + 0.012], [u + b2, y + 0.02, z + 0.012], [0, 0, 1], cc);
    const n = Math.max(2, Math.round(wd / 0.3));
    for (let i = 0; i < n; i++) { const x = u + b2 + (wd - 2 * b2) * (i + 0.5) / n, s = 0.07; cloth.quad([x, y - ht * 0.55 - s, z + 0.026], [x + s, y - ht * 0.55, z + 0.026], [x, y - ht * 0.55 + s, z + 0.026], [x - s, y - ht * 0.55, z + 0.026], [0, 0, 1], cb2); }
    cloth.quad([u, y + 0.02, z], [u + wd, y + 0.02, z], [u + wd, y + 0.02, wIn], [u, y + 0.02, wIn], [0, 1, 0], ca);
  }
  // bicycle in the u/y plane (hung on a wall or leaning), wheel centres at height y
  function bike(u, y, w) {
    const c = mul(pick(CLUTTER), rr(0.5, 0.9)), r = 0.31, wb = 1.0, seg = 10;
    for (const cx of [u, u + wb]) for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      wire.cyl(cx + Math.cos(a0) * r, y + Math.sin(a0) * r, w, cx + Math.cos(a1) * r, y + Math.sin(a1) * r, w, 0.018, 3, [0.05, 0.05, 0.05]);
    }
    const bb = [u + 0.42, y - 0.02], seat = [u + 0.3, y + 0.5], head = [u + 0.8, y + 0.5];
    const L = (p, q, rad = 0.016) => metal.cyl(p[0], p[1], w, q[0], q[1], w, rad, 3, c);
    L([u, y], bb); L(bb, seat); L(seat, head); L(bb, head); L([u, y], seat, 0.011); L(head, [u + wb, y]); L(head, [u + 0.78, y + 0.66]);
    metal.box(u + 0.72, u + 0.84, y + 0.65, y + 0.68, w - 0.2, w + 0.2, STEEL_D); paint.box(u + 0.2, u + 0.4, y + 0.52, y + 0.57, w - 0.05, w + 0.05, [0.03, 0.03, 0.03]);
  }
  function skis(u, y, w) {
    const c = mul(pick(CLUTTER), rr(0.6, 1.1)), h = rr(1.7, 2.0);
    for (const k of [0, 0.09]) { pushXf(new THREE.Matrix4().makeRotationZ(rr(-0.08, 0.02)).setPosition(u + k, y, w)); paint.box(-0.035, 0.035, 0, h, -0.008, 0.008, c); paint.box(-0.03, 0.03, h, h + 0.1, 0.0, 0.03, c); popXf(); }
    metal.cyl(u + 0.2, y, w, u + 0.22, y + 1.25, w + 0.02, 0.008, 3, STEEL);
  }
  function pigeons(ua, ub, y, w, n) {
    for (let i = 0; i < n; i++) { const x = rr(ua, ub), c = mul([0.16, 0.17, 0.19], rr(0.6, 1.3)); blob(paint, x, y + 0.07, w, 0.075, c, 0.85); blob(paint, x + rr(-0.05, 0.05), y + 0.16, w + 0.04, 0.035, mul(c, 0.8)); }
  }
  function spikes(ua, ub, y, w) { for (let x = ua; x < ub; x += 0.07) { metal.box(x, x + 0.006, y, y + 0.09, w - 0.02, w - 0.014, STEEL); metal.box(x + 0.03, x + 0.036, y, y + 0.08, w + 0.014, w + 0.02, STEEL); } }
  // outdoor AC unit hung on a wall (in the facade frame), with condensate stain
  function acUnit(au, ay, w0) {
    const c = mul(lin(0xc4c6c0), rr(0.55, 1));
    paint.box(au, au + 0.8, ay, ay + 0.55, w0 + 0.03, w0 + 0.33, c, mul(c, 0.8));
    paint.box(au + 0.1, au + 0.52, ay + 0.07, ay + 0.48, w0 + 0.33, w0 + 0.34, [0.03, 0.03, 0.035]);
    for (let k = 0; k < 4; k++) paint.box(au + 0.1, au + 0.52, ay + 0.12 + k * 0.09, ay + 0.135 + k * 0.09, w0 + 0.34, w0 + 0.347, mul(c, 0.7));
    metal.box(au + 0.05, au + 0.09, ay - 0.06, ay, w0, w0 + 0.3, STEEL_D); metal.box(au + 0.71, au + 0.75, ay - 0.06, ay, w0, w0 + 0.3, STEEL_D);
    wire.cyl(au + 0.7, ay + 0.3, w0 + 0.05, au + 0.95, ay + 0.9, w0 + 0.02, 0.015, 3, [0.1, 0.1, 0.1]);
    wire.cyl(au + 0.74, ay + 0.2, w0 + 0.04, au + 0.78, ay - rr(0.3, 1.2), w0 + 0.03, 0.008, 3, [0.5, 0.5, 0.48]);
    addDecal(au + 0.1, au + 0.95, ay - 0.02, ay - rr(1.2, 3.2), w0 + 0.007, 0, 0.8, chance(0.5) ? D_RUST : D_WATER);
  }

  // one prefab wall panel with an optional opening; seams are real gaps
  let curStains = [];
  const stainAt = (u, y) => { let m = 1; for (const s of curStains) { const du = (u - s.u) / s.w, dy = s.top - y; if (dy < -0.5 || dy > s.len) continue; m *= 1 - s.k * Math.exp(-du * du) * (1 - Math.max(0, dy) / s.len); } return m; };
  const makeStains = (uA, uB, top, n) => { curStains = []; for (let i = 0; i < n; i++) curStains.push({ u: rr(uA, uB), w: rr(0.35, 1.3), top, len: rr(4, 15), k: rr(0.22, 0.5) }); };
  function panel(u0, y0, bw, fh, op, c0) {
    let c = c0;
    const g = 0.03, a0 = u0 + g, a1 = u0 + bw - g, b0 = y0 + g, b1 = y0 + fh - g;
    if (!op) {
      const n = Math.max(1, Math.round(bw / 1.1)), cbm = 0.8;
      for (let i = 0; i < n; i++) { const ua = a0 + (a1 - a0) * i / n, ub = a0 + (a1 - a0) * (i + 1) / n, um = (ua + ub) / 2;
        conc.box(ua, ub, b0, b1, -TH, 0, mul(c, stainAt(um, b1)), mul(c, cbm * stainAt(um, b0))); }
      return;
    }
    const us = [a0, op.a, op.b, a1], ys = [b0, op.c, op.d, b1];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue;
      if (us[i + 1] - us[i] < 0.02 || ys[j + 1] - ys[j] < 0.02) continue;
      const k0 = 0.8 + 0.2 * (ys[j] - b0) / (b1 - b0), k1 = 0.8 + 0.2 * (ys[j + 1] - b0) / (b1 - b0);
      const um = (us[i] + us[i + 1]) / 2, s0 = stainAt(um, ys[j]), s1 = stainAt(um, ys[j + 1]);
      if (i === 1 && j === 0) conc.box(us[i], us[i + 1], ys[j], ys[j + 1], -TH, 0, mul(c, 0.66 * s1), mul(c, 0.86 * s0));
      else conc.box(us[i], us[i + 1], ys[j], ys[j + 1], -TH, 0, mul(c, k1 * s1), mul(c, k0 * s0));
    }
  }
  const panelCol = (tint, k = 1) => { const t = rr(0.84, 1.1) * (chance(0.07) ? rr(0.72, 0.85) : 1) * k; return [t * tint[0] * rr(0.98, 1.02), t * tint[1], t * tint[2] * rr(0.98, 1.03)]; };

  const WZ0 = -0.2, FZ0 = -0.19, FZ1 = -0.11;   // glass plane / frame depth
  function frameRect(a, b, c, d, fc, t = 0.06) {
    paint.box(a, b, c, c + t, FZ0, FZ1, fc); paint.box(a, b, d - t, d, FZ0, FZ1, fc);
    paint.box(a, a + t, c + t, d - t, FZ0, FZ1, fc); paint.box(b - t, b, c + t, d - t, FZ0, FZ1, fc);
  }
  const vbar = (u, c, d, fc, t = 0.05) => paint.box(u - t / 2, u + t / 2, c, d, FZ0, FZ1 - 0.01, fc);
  const hbar = (a, b, y, fc, t = 0.045) => paint.box(a, b, y - t / 2, y + t / 2, FZ0, FZ1 - 0.01, fc);

  function litState(gx, gy, side, p = 0.6) {
    const n = sn2(gx * 0.45 + side * 17.3, gy * 0.6 + side * 5.1);
    const lit = R() < (p - 0.38) + 0.76 * n;
    let tint = pick(TINTS), bright = chance(0.28) ? rr(0.4, 0.7) : rr(0.75, 1.3), kind = 0;
    if (lit && chance(0.05)) { tint = [0.30, 0.5, 1.0]; bright = 0.55; kind = 3; }       // TV glow
    else if (lit && chance(0.06)) { tint = [1.0, 0.66, 0.36]; bright = rr(0.7, 1.0); }    // bare bulb, a bit whiter
    return { lit, tint, bright, kind };
  }
  // weathering of a blank stretch of wall u0..u1 (no openings) of one panel row
  function weatherBlank(u0, u1, y0, isTop, isBase) {
    const wdt = u1 - u0; if (wdt < 0.3) return;
    if (isTop) addDecal(u0, u1, y0 + FH - 0.02, y0 + FH - rr(1.2, 7.5), 0.007, 1, rr(0.45, 0.85), chance(0.8) ? D_WATER : D_MOSS);
    if (isBase) addDecal(u0, u1, y0 - 0.02, y0 + rr(0.5, 2.2), 0.007, 1, rr(0.5, 0.85), chance(0.6) ? D_WATER : D_MOSS);
    if (chance(0.10)) { const x = rr(u0, Math.max(u0, u1 - 0.5)); addDecal(x, x + Math.min(0.5, wdt), y0 + FH - 0.05, y0 + rr(0.1, 1.6), 0.008, 2, 0.8, D_SOOT); }
    if (chance(0.07) && wdt > 0.5) { const pw2 = rr(0.35, Math.min(1.2, wdt - 0.1)), x = rr(u0 + 0.05, u1 - pw2 - 0.05), y = y0 + rr(0.2, FH - 1.2); addDecal(x, x + pw2, y + rr(0.4, 0.9), y, 0.008, 3, 1, mul(D_PATCH, rr(0.9, 1.05))); }
    if (chance(0.14)) addDecal(u0, u1, y0 - 0.04, y0 + rr(0.12, 0.4), 0.008, 1, 0.85, D_MOSS);
    if (chance(0.10)) addDecal(u0, u1, y0 + FH + 0.03, y0 + FH - rr(0.3, 1.0), 0.008, 0, 0.6, D_WATER);
  }

  // --------------------------------------------------------------- one flat's bay
  function unit(u0, y0, type, o) {
    const { tint, gx, gy, side, isTop, back } = o;
    const bw = o.bw || BW;
    const uc = u0 + bw / 2;
    const st = litState(gx, gy, side, back ? 0.62 : 0.72);
    const fc = mul(pick(FRAME_COLS), rr(0.8, 1.05));
    const seed = rr(1, 900);
    const curtain = chance(0.2) ? 0 : rr(0.15, 0.95);
    const isL = type === 'L', isBalc = type === 'B' || isL, isBase = gy === 0;
    let ow, oh, sill;
    if (type === 'W') { ow = 1.72; oh = 1.58; sill = 0.9; }
    else if (type === 'WW') { ow = 2.4; oh = 1.58; sill = 0.9; }
    else if (type === 'K') { ow = 1.2; oh = 1.38; sill = 1.05; }
    else { ow = 2.3; oh = 2.15; sill = 0.12; }
    const a = uc - ow / 2, b = uc + ow / 2, c = y0 + sill, d = c + oh;
    if (isL) pushXf(new THREE.Matrix4().makeTranslation(0, 0, -REC));
    const BD = isL ? REC + PROJ : 1.2;
    panel(u0, y0, bw, FH, { a, b, c, d }, panelCol(tint, isBalc ? 0.82 : 1));
    addWindow(uc, (c + d) / 2, WZ0, ow, oh, seed, st.lit ? st.bright : 0, curtain, st.kind, st.tint);
    if (st.lit) addLight(uc, (c + d) / 2 + (isBalc ? 0.25 : 0), isBalc ? BD * 0.42 : 0.3, st.tint, st.bright * (st.kind === 3 ? 0.5 : isBalc ? 1.4 : 0.9));

    if (!isBalc) {
      frameRect(a, b, c, d, fc);
      let leafW = ow * 0.5;
      if (type === 'W') {
        const m = chance(0.6) ? uc : a + ow * 0.36; vbar(m, c, d, fc); leafW = m - a;
        if (chance(0.6)) hbar(m, b, c + oh * 0.72, fc);
      } else if (type === 'WW') { vbar(a + ow / 3, c, d, fc); vbar(a + 2 * ow / 3, c, d, fc); leafW = ow / 3; if (chance(0.5)) hbar(a + ow / 3, a + 2 * ow / 3, c + oh * 0.72, fc); }
      else { vbar(a + ow * 0.4, c, d, fc); leafW = ow * 0.4; }
      if (chance(0.09)) { // one casement left ajar
        const lw = leafW - 0.07, y1 = c + 0.06, y2 = d - 0.06, t = 0.05;
        pushXf(new THREE.Matrix4().makeRotationY(-rr(0.25, 1.0)).setPosition(a + 0.05, 0, FZ1 + 0.01));
        paint.box(0, lw, y1, y1 + t, -0.02, 0.02, fc); paint.box(0, lw, y2 - t, y2, -0.02, 0.02, fc); paint.box(0, t, y1 + t, y2 - t, -0.02, 0.02, fc); paint.box(lw - t, lw, y1 + t, y2 - t, -0.02, 0.02, fc);
        glass.quad([0, y1, 0], [lw, y1, 0], [lw, y2, 0], [0, y2, 0], [0, 0, 1], [seed * 0.01, 0, 0]);
        popXf();
      }
      // sill + staining below it
      paint.box(a - 0.05, b + 0.05, c - 0.05, c - 0.01, -0.12, 0.09, mul(lin(0x9da1a3), rr(0.6, 1)));
      addDecal(a - 0.12, a + 0.16, c - 0.04, c - rr(0.7, 3.2), 0.006, 0, rr(0.5, 0.95), chance(0.25) ? D_RUST : D_WATER);
      addDecal(b - 0.16, b + 0.12, c - 0.04, c - rr(0.7, 3.2), 0.006, 0, rr(0.5, 0.95), chance(0.25) ? D_RUST : D_WATER);
      if (chance(0.75)) addDecal(a - 0.04, b + 0.04, c - 0.05, y0 + 0.03, 0.006, 0, rr(0.3, 0.75), D_WATER);
      weatherBlank(u0 + 0.03, a - 0.03, y0, isTop, isBase); weatherBlank(b + 0.03, u0 + bw - 0.03, y0, isTop, isBase);
      if (isTop) addDecal(a, b, y0 + FH - 0.02, d + 0.02, 0.007, 1, rr(0.4, 0.8), D_WATER);
      if (isBase) addDecal(a - 0.05, b + 0.05, y0 - 0.02, c - 0.06, 0.007, 1, rr(0.4, 0.8), D_WATER);
      if (chance(0.06)) pigeons(a, b, c - 0.01, 0.03, 1 + Math.floor(R() * 3));
      else if (chance(0.06)) spikes(a, b, c - 0.01, 0.05);
      if (chance(0.12)) { const x = chance(0.5) ? a - 0.1 : b + 0.1; wire.box(x, x + 0.02, c + rr(0.2, 1.2), y0 + FH + rr(0.5, 4), 0.0, 0.02, [0.07, 0.07, 0.07]); }
      const t = R();
      if (t < 0.17) acUnit(a + rr(0.0, ow - 0.8), c - rr(0.75, 0.85), 0);
      else if (t < 0.29) { // flower box
        const fu = uc - rr(0.4, 0.7), fw = rr(0.8, 1.3);
        paint.box(fu, fu + fw, c - 0.26, c - 0.07, 0.06, 0.26, mul(pick(CLUTTER), 0.8));
        for (let i = 0; i < 4; i++) bush(fu + (i + 0.5) * fw / 4, c - 0.08, 0.16, rr(0.1, 0.2), 3);
        if (chance(0.6)) for (let i = 0; i < 3; i++) vine(fu + rr(0, fw), c - 0.24, 0.27, rr(0.3, 1.1));
        addDecal(fu, fu + fw, c - 0.25, c - rr(0.8, 1.8), 0.007, 0, 0.7, D_MOSS);
      } else if (t < 0.50) { // washing lines under the window
        const la = a - rr(0.1, 0.5), lb = b + rr(0.1, 0.5), ly = c - 0.12;
        metal.box(la - 0.015, la + 0.015, ly - 0.015, ly + 0.015, 0, 0.5, STEEL); metal.box(lb - 0.015, lb + 0.015, ly - 0.015, ly + 0.015, 0, 0.5, STEEL);
        washLine(la, lb, ly, 0.24, 1); if (chance(0.6)) washLine(la, lb, ly, 0.46, 0.85);
        addDecal(la - 0.06, la + 0.06, ly, ly - rr(0.5, 1.5), 0.007, 0, 0.9, D_RUST); addDecal(lb - 0.06, lb + 0.06, ly, ly - rr(0.5, 1.5), 0.007, 0, 0.9, D_RUST);
      } else if (t < 0.54) { // awning
        const n = 7, ay0 = d + 0.18, ay1 = d - 0.28, aw = 0.75, ca = pick(LAUNDRY);
        for (let i = 0; i < n; i++) {
          const ua = a - 0.1 + (ow + 0.2) * i / n, ub = a - 0.1 + (ow + 0.2) * (i + 1) / n;
          const cc = mul(i % 2 && ca[1] ? ca[1] : ca[0], 0.75);
          cloth.quad([ua, ay1, aw], [ub, ay1, aw], [ub, ay0, 0.02], [ua, ay0, 0.02], [0, 0.85, 0.52], cc);
          cloth.quad([ua, ay1 - 0.16, aw], [ub, ay1 - 0.16, aw], [ub, ay1, aw], [ua, ay1, aw], [0, 0, 1], cc);
        }
        metal.cyl(a - 0.1, ay1, aw, a - 0.1, ay1 - 0.5, 0.02, 0.012, 3, STEEL); metal.cyl(b + 0.1, ay1, aw, b + 0.1, ay1 - 0.5, 0.02, 0.012, 3, STEEL);
      } else if (t < 0.63) {
        const du = chance(0.5) ? a - 0.35 : b + 0.35, dy = c + rr(0.2, 1.2);
        dish(du, dy, 0.3, rr(0.28, 0.4), rr(-0.9, 0.9), rr(0.25, 0.5));
        addDecal(du - 0.1, du + 0.1, dy - 0.1, dy - rr(0.8, 2.2), 0.007, 0, 0.9, D_RUST);
        wire.box(du - 0.01, du + 0.01, dy - 0.1, dy - rr(0.3, 0.9), 0.0, 0.02, [0.06, 0.06, 0.06]);
      }
      return;
    }

    // ---- balcony / loggia door + window
    const doorL = chance(0.5), dw = 0.8;
    const da = doorL ? a : b - dw, db = da + dw, wa = doorL ? db : a, wb = doorL ? b : da;
    frameRect(a, b, c, d, fc);
    vbar(doorL ? db : da, c, d, fc, 0.08);
    conc.box(wa, wb, c, y0 + 0.92, WZ0 - 0.02, -0.06, panelCol(tint, 0.8));       // spandrel under the window part
    hbar(wa, wb, y0 + 0.95, fc, 0.06); vbar((wa + wb) / 2, y0 + 0.95, d, fc);
    hbar(da, db, y0 + 0.98, fc, 0.06);
    paint.box(da + 0.05, db - 0.05, c + 0.05, y0 + 0.96, FZ0 + 0.01, FZ1 - 0.03, mul(fc, 0.9));

    // ---- slab, cheek walls, ceiling
    const inset = isL ? 0.14 : 0.1;
    const ua = u0 + inset, ub = u0 + bw - inset, yS = y0 + 0.05, yT = y0 + 1.1, yC = y0 + FH - 0.1;
    const slabC = panelCol(tint, 0.85);
    sbox(conc, ua, ub, y0 - 0.1, yS, 0, BD, slabC, mul(slabC, 0.7), 4, 1, 2);
    metal.box(ua - 0.01, ub + 0.01, y0 - 0.1, y0 - 0.05, BD, BD + 0.015, RUSTY);
    if (isL) {
      const cc = panelCol(tint, 0.92), wEnd = o.fin ? BD + 0.04 : REC;
      sbox(conc, u0 + 0.015, u0 + inset, y0, y0 + FH, 0, wEnd, cc, mul(cc, 0.82), 1, 3, 3);
      sbox(conc, u0 + bw - inset, u0 + bw - 0.015, y0, y0 + FH, 0, wEnd, cc, mul(cc, 0.82), 1, 3, 3);
      if (isTop) sbox(conc, ua, ub, y0 + FH - 0.16, y0 + FH - 0.05, 0, REC + 0.02, cc, mul(cc, 0.8), 4, 1, 2);
    }
    const glazed = chance(back ? 0.5 : 0.52);
    let ptype = Math.floor(R() * 3); if (glazed && ptype === 2 && chance(0.7)) ptype = Math.floor(R() * 2);
    const pcBase = chance(0.45) ? null : pick(PARAPET_PAINT);
    if (ptype === 0) {
      const B_ = pcBase ? paint : conc, pc = pcBase ? mul(pcBase, rr(0.6, 1.0)) : panelCol(tint, 0.95);
      B_.box(ua, ub, yS, yT, BD - 0.08, BD, pc, mul(pc, 0.8));
      B_.box(ua, ua + 0.08, yS, yT, 0, BD - 0.08, pc, mul(pc, 0.8)); B_.box(ub - 0.08, ub, yS, yT, 0, BD - 0.08, pc, mul(pc, 0.8));
      if (chance(0.5)) paint.box(ua - 0.01, ub + 0.01, yT, yT + 0.035, BD - 0.1, BD + 0.02, mul(lin(0x8a8d8f), 0.8));
      addDecal(ua, ub, yT, yS - 0.14, BD + 0.005, 0, rr(0.5, 0.95), chance(0.45) ? D_RUST : D_WATER);
      if (chance(0.4)) addDecal(ua, ub, y0 - 0.1, y0 + rr(0.25, 0.6), BD + 0.006, 1, 0.8, chance(0.5) ? D_MOSS : D_WATER);
      if (chance(0.12)) { const x = rr(ua, ub - 0.5); addDecal(x, x + 0.45, yT, yS, BD + 0.007, 2, 0.8, D_SOOT); }
    } else if (ptype === 1) {
      const pc = mul(pick(SHEET_COLS), rr(0.6, 1.0));
      paint.box(ua, ub, yS + 0.04, yT, BD - 0.03, BD, pc, mul(pc, 0.75));
      for (let u = ua + 0.05; u < ub - 0.05; u += 0.17) paint.box(u, u + 0.06, yS + 0.04, yT, BD, BD + 0.022, mul(pc, 1.1), mul(pc, 0.8));
      paint.box(ua, ua + 0.03, yS + 0.04, yT, 0, BD - 0.03, pc); paint.box(ub - 0.03, ub, yS + 0.04, yT, 0, BD - 0.03, pc);
      for (let w = 0.1; w < BD - 0.1; w += 0.17) { paint.box(ua - 0.022, ua, yS + 0.04, yT, w, w + 0.06, pc); paint.box(ub, ub + 0.022, yS + 0.04, yT, w, w + 0.06, pc); }
      metal.box(ua, ub, yT - 0.03, yT + 0.02, BD - 0.05, BD + 0.01, STEEL);
      addDecal(ua, ub, yT - 0.03, yS - 0.14, BD + 0.026, 0, rr(0.4, 0.8), D_RUST);
    } else {
      const rc = mul(chance(0.5) ? STEEL : RUSTY, rr(0.7, 1.1));
      metal.box(ua, ub, yT - 0.05, yT, BD - 0.05, BD, rc); metal.box(ua, ub, yS + 0.08, yS + 0.12, BD - 0.04, BD - 0.01, rc);
      metal.box(ua, ua + 0.05, yT - 0.05, yT, 0, BD, rc); metal.box(ub - 0.05, ub, yT - 0.05, yT, 0, BD, rc);
      for (let u = ua + 0.04; u < ub - 0.03; u += 0.135) metal.box(u, u + 0.022, yS, yT - 0.05, BD - 0.036, BD - 0.014, rc);
      for (let w = 0.12; w < BD - 0.06; w += 0.135) { metal.box(ua + 0.014, ua + 0.036, yS, yT - 0.05, w, w + 0.022, rc); metal.box(ub - 0.036, ub - 0.014, yS, yT - 0.05, w, w + 0.022, rc); }
      if (chance(0.55)) { const pc = mul(pick(chance(0.5) ? SHEET_COLS : PARAPET_PAINT), rr(0.55, 0.95)); paint.box(ua + 0.05, ub - 0.05, yS + 0.1, yS + rr(0.6, 0.95), BD - 0.07, BD - 0.045, pc); }
      addDecal(ua, ub, yS, yS - 0.15, BD + 0.017, 0, 0.9, D_RUST);
    }
    if (isTop) { // canopy over the top-floor balcony
      const cc = mul(pick(SHEET_COLS), 0.7);
      sbox(paint, ua - 0.06, ub + 0.06, yC + 0.02, yC + 0.07, 0, BD + 0.18, cc, cc, 3, 1, 2);
      metal.cyl(ua + 0.03, yC + 0.02, BD - 0.03, ua + 0.03, yT, BD - 0.03, 0.02, 4, STEEL); metal.cyl(ub - 0.03, yC + 0.02, BD - 0.03, ub - 0.03, yT, BD - 0.03, 0.02, 4, STEEL);
    }
    if (glazed) {
      const gc = mul(pick(FRAME_COLS), rr(0.75, 1.0)), t = pick([0.035, 0.05, 0.05, 0.075]), gz0 = BD - 0.07, gz1 = BD - 0.01;
      const yA = yT, yB = yC;
      paint.box(ua, ub, yA, yA + 0.06, gz0, gz1, gc); paint.box(ua, ub, yB - 0.07, yB, gz0, gz1, gc);
      const np = Math.max(2, Math.round((ub - ua) / rr(0.45, 1.05)));
      const tr = chance(0.7) ? yB - rr(0.42, 0.6) : 0, tr2 = chance(0.3) ? yA + rr(0.3, 0.45) : 0;
      const board = mul(pick(CLUTTER), rr(0.5, 0.9));
      for (let i = 0; i <= np; i++) {
        const u = ua + (ub - ua - t) * i / np; paint.box(u, u + t, yA + 0.06, yB - 0.07, gz0, gz1, gc);
        if (i < np && chance(0.1)) paint.box(u + t, u + (ub - ua - t) / np, tr2 ? tr2 : yA + 0.06, tr ? tr : yB - 0.07, gz0 + 0.01, gz1 - 0.01, board);   // pane replaced by a board
        else if (i < np && tr2 && chance(0.5)) paint.box(u + t, u + (ub - ua - t) / np, yA + 0.06, tr2, gz0 + 0.01, gz1 - 0.01, board);
      }
      if (tr) paint.box(ua, ub, tr - 0.02, tr + 0.02, gz0, gz1, gc);
      if (tr2) paint.box(ua, ub, tr2 - 0.02, tr2 + 0.02, gz0, gz1, gc);
      if (!isL || !o.fin) for (const su of [ua, ub - 0.06]) {
        paint.box(su, su + 0.06, yA, yA + 0.06, isL ? REC : 0, gz0, gc); paint.box(su, su + 0.06, yB - 0.07, yB, isL ? REC : 0, gz0, gc);
        if (!isL) paint.box(su, su + 0.06, yA + 0.06, yB - 0.07, BD * 0.48, BD * 0.48 + t, gc);
        if (tr) paint.box(su, su + 0.06, tr - 0.02, tr + 0.02, isL ? REC : 0, gz0, gc);
      }
      const sd = seed * 0.01, gs = isL ? (o.fin ? BD : REC) : 0;
      glass.quad([ua, yA, BD - 0.04], [ub, yA, BD - 0.04], [ub, yB, BD - 0.04], [ua, yB, BD - 0.04], [0, 0, 1], [sd, 0, 0]);
      if (gs < BD - 0.1) {
        glass.quad([ua + 0.03, yA, BD], [ua + 0.03, yA, gs], [ua + 0.03, yB, gs], [ua + 0.03, yB, BD], [-1, 0, 0], [sd, 0, 0]);
        glass.quad([ub - 0.03, yA, gs], [ub - 0.03, yA, BD], [ub - 0.03, yB, BD], [ub - 0.03, yB, gs], [1, 0, 0], [sd, 0, 0]);
      }
      if (chance(0.55)) { // curtains / tulle inside the glazing
        const cc = mul(pick(CURTAIN_COLS), rr(0.55, 0.9));
        const cov = chance(0.3) ? [[0, 1]] : [[0, rr(0.12, 0.4)], [rr(0.65, 0.88), 1]];
        for (const [f0, f1] of cov) {
          const ca = ua + 0.08 + (ub - ua - 0.16) * f0, cb = ua + 0.08 + (ub - ua - 0.16) * f1, n = Math.max(2, Math.round((cb - ca) / 0.05));
          const k = rr(22, 34), p0 = rr(0, 6);
          for (let i = 0; i < n; i++) {
            const x0 = ca + (cb - ca) * i / n, x1 = ca + (cb - ca) * (i + 1) / n;
            const zz = BD - 0.14 + 0.025 * Math.sin(x0 * k + p0), zz2 = BD - 0.14 + 0.025 * Math.sin(x1 * k + p0);
            const sl = Math.cos((x0 + x1) * 0.5 * k + p0);
            cloth.quad([x0, yA + 0.08, zz], [x1, yA + 0.08, zz2], [x1, yB - 0.08, zz2], [x0, yB - 0.08, zz], [-0.5 * sl, 0, 0.86], mul(cc, 0.78 + 0.22 * sl));
          }
        }
      }
    }
    // loggia / balcony lamp
    if (chance(st.lit ? 0.3 : 0.07)) {
      const lu = uc + rr(-0.7, 0.7), lw = BD * rr(0.3, 0.6), ly = y0 + FH - 0.34;
      emis.box(lu - 0.04, lu + 0.04, ly - 0.06, ly + 0.04, lw - 0.04, lw + 0.04, LAMPC);
      wire.box(lu - 0.008, lu + 0.008, ly + 0.04, y0 + FH - 0.1, lw - 0.008, lw + 0.008, [0.05, 0.05, 0.05]);
      addLight(lu, ly - 0.05, lw, [1, 0.42, 0.14], rr(0.8, 1.4));
    }
    // clutter
    const nCl = Math.floor(rr(1, 6));
    for (let i = 0; i < nCl; i++) {
      const cu = chance(0.5) ? ua + rr(0.12, 0.5) : ub - rr(0.5, 1.0), cw = rr(0.3, 0.6), chh = chance(0.3) ? rr(0.9, 1.7) : rr(0.25, 0.6), cd = rr(0.3, 0.5), cz = rr(0.1, BD - 0.15 - cd);
      const cc = mul(pick(CLUTTER), rr(0.5, 1.0));
      paint.box(cu, cu + cw, yS, yS + chh, cz, cz + cd, cc, mul(cc, 0.7));
      if (chh < 0.6 && chance(0.4)) { const c2 = mul(pick(CLUTTER), rr(0.5, 1.0)); paint.box(cu + 0.04, cu + cw - 0.06, yS + chh, yS + chh + rr(0.2, 0.4), cz + 0.03, cz + cd - 0.04, c2, mul(c2, 0.7)); }
    }
    if (chance(0.16)) bike(uc - 0.5 + rr(-0.3, 0.3), yS + rr(1.45, 1.7), 0.12);
    if (chance(0.16)) skis(chance(0.5) ? ua + 0.2 : ub - 0.45, yS, rr(0.1, 0.3));
    if (chance(0.45)) { // pot plants on the parapet / floor
      const n = Math.floor(rr(1, 5));
      for (let i = 0; i < n; i++) { const pu = rr(ua + 0.2, ub - 0.2), top = chance(0.6) && !glazed; const py = top ? yT + 0.02 : yS; const pw = top ? BD - 0.1 : rr(0.3, BD - 0.3);
        paint.box(pu - 0.09, pu + 0.09, py, py + 0.16, pw - 0.09, pw + 0.09, mul(lin(0x7a4a32), rr(0.6, 1))); bush(pu, py + 0.2, pw, rr(0.16, 0.3), 4); }
    }
    if (!glazed && chance(0.36)) { // flower box hung outside
      const fu = rr(ua + 0.1, ub - 1.2), fw = rr(0.8, 1.1);
      paint.box(fu, fu + fw, yT - 0.24, yT - 0.06, BD, BD + 0.17, mul(pick(CLUTTER), 0.7));
      for (let i = 0; i < 4; i++) bush(fu + (i + 0.5) * fw / 4, yT - 0.05, BD + 0.09, rr(0.1, 0.2), 3);
      for (let i = 0; i < 4; i++) if (chance(0.7)) vine(fu + rr(0, fw), yT - 0.2, BD + 0.18, rr(0.3, 1.4));
    }
    let lines = false;
    if (chance(glazed ? 0.3 : 0.74)) { // washing lines outside the parapet
      const la = ua + 0.06, lb = ub - 0.06, ly = yT + (glazed ? -0.12 : rr(0.0, 0.25)); lines = true;
      metal.box(la - 0.012, la + 0.012, ly - 0.012, ly + 0.012, BD - 0.05, BD + 0.42, STEEL); metal.box(lb - 0.012, lb + 0.012, ly - 0.012, ly + 0.012, BD - 0.05, BD + 0.42, STEEL);
      washLine(la, lb, ly, BD + 0.13, 1); if (chance(0.65)) washLine(la, lb, ly, BD + 0.27, 0.9); if (chance(0.3)) washLine(la, lb, ly, BD + 0.4, 0.8);
    }
    if (!glazed && chance(0.5)) washLine(ua + 0.05, ub - 0.05, y0 + rr(2.3, 2.55), BD - rr(0.2, 0.5), 0.95);   // line across the loggia, high up
    if (!lines && ptype !== 2 && chance(0.22)) { const rw = rr(0.7, 1.5), ru = rr(ua + 0.05, ub - rw - 0.05); rug(ru, yT + (glazed ? -0.02 : 0.02), BD, rw, rr(0.55, 0.95), BD - 0.2); }
    if (chance(0.08)) { // someone out on the balcony
      const pu = rr(ua + 0.4, ub - 0.4), pw = rr(0.45, 0.85), cc = mul(pick(CLUTTER), rr(0.25, 0.5)), hgt = rr(1.28, 1.45);
      paint.box(pu - 0.2, pu + 0.2, yS + 0.75, yS + hgt, pw - 0.11, pw + 0.11, cc); paint.box(pu - 0.16, pu + 0.16, yS, yS + 0.75, pw - 0.1, pw + 0.1, mul(cc, 0.6));
      blob(paint, pu, yS + hgt + 0.13, pw, 0.115, [0.2, 0.13, 0.1]);
    }
    if (chance(0.16)) dish(chance(0.5) ? ua + 0.25 : ub - 0.25, yT + 0.3, BD + 0.05, rr(0.3, 0.42), rr(-0.9, 0.9), rr(0.25, 0.5));
    if (chance(0.12)) { const au = chance(0.5) ? ua + 0.15 : ub - 0.95; paint.box(au, au + 0.8, yS + 0.02, yS + 0.57, 0.05, 0.35, mul(lin(0xc4c6c0), rr(0.6, 0.9))); }
    else if (chance(0.14)) acUnit(chance(0.5) ? ua + 0.1 : ub - 0.9, yS + 0.12, BD);
    if (!glazed && chance(0.08)) pigeons(ua + 0.2, ub - 0.2, yT, BD - 0.04, 1 + Math.floor(R() * 3));
    if (chance(0.05)) { const ax = chance(0.5) ? ua + 0.05 : ub - 0.05; antenna(ax, yT, BD + 0.03, rr(1.2, 2.0), Math.floor(R() * 3), false); }
    if (isL) popXf();
  }

  // ------------------------------------------------------------------ sections
  const typesFront = [], typesBack = [], finCol = [];
  for (let i = 0; i < NB; i++) {
    const r1 = R(); typesFront.push(r1 < 0.34 ? 'L' : r1 < 0.54 ? 'B' : r1 < 0.84 ? 'W' : 'WW');
    const r2 = R(); typesBack.push(r2 < 0.22 ? 'L' : r2 < 0.36 ? 'B' : r2 < 0.64 ? 'W' : r2 < 0.86 ? 'K' : 'WW');
    finCol.push(chance(0.55));
  }
  for (const S of sections) {
    // dark core behind the panels (set back behind recessed loggias)
    for (let i = 0; i < S.bays; i++) {
      const gi = S.bay0 + i, xa = i === 0 ? S.x0 + TH - 0.02 : S.x0 + i * BW, xb = i === S.bays - 1 ? S.x1 - TH + 0.02 : S.x0 + (i + 1) * BW;
      core.box(xa, xb, Y0 - 0.02, S.roofY, -S.zb + TH - 0.02 + (typesBack[gi] === 'L' ? REC : 0), S.zf - TH + 0.02 - (typesFront[gi] === 'L' ? REC : 0), [0.5, 0.5, 0.5]);
    }
    for (const side of [1, -1]) {
      pushXf(side > 0 ? frameM(0, S.zf, 0) : frameM(0, -S.zb, Math.PI));
      makeStains(side > 0 ? S.x0 : -S.x1, side > 0 ? S.x1 : -S.x0, S.roofY, 2 + Math.floor(R() * 4));
      for (let i = 0; i < S.bays; i++) {
        const gi = S.bay0 + i;
        const type = side > 0 ? typesFront[gi] : typesBack[gi];
        const xw = S.x0 + i * BW;                       // bay's low-x edge in world
        const u0 = side > 0 ? xw : -(xw + BW);
        for (let f = 0; f < S.floors; f++) {
          let t = type; if (t === 'B' && chance(0.04)) t = 'W';
          unit(u0, Y0 + f * FH, t, { tint: S.tint, gx: gi, gy: f, side, isTop: f === S.floors - 1, back: side < 0, fin: finCol[gi] });
        }
      }
      // drips down the base slab
      {
        const bz = (side > 0 ? 8.85 - S.zf : 8.45 - S.zb) + 0.006, uA0 = side > 0 ? S.x0 : -S.x1;
        for (let u = uA0; u < uA0 + S.bays * BW - 0.5; ) { const wd = rr(1.5, 4); addDecal(u, Math.min(u + wd, uA0 + S.bays * BW), Y0 - 0.03, 0.0, bz, chance(0.5) ? 0 : 1, rr(0.5, 0.9), chance(0.3) ? D_RUST : D_WATER); u += wd; }
      }
      // faded yellow gas main with risers
      {
        const gy = Y0 + FH - 0.22, gA = (side > 0 ? S.x0 : -S.x1) + 0.2, gB = gA + S.bays * BW - 0.4, gc = mul(lin(0x9a8428), rr(0.55, 0.85));
        metal.cyl(gA, gy, 0.11, gB, gy, 0.11, 0.045, 6, gc);
        for (let u = gA + 0.6; u < gB; u += BW * (1 + Math.floor(R() * 2))) {
          const top = Y0 + (1 + Math.floor(R() * (S.floors - 1))) * FH + 1.0;
          metal.cyl(u, gy, 0.11, u, top, 0.11, 0.03, 5, gc); metal.box(u - 0.05, u + 0.05, gy + 0.6, gy + 0.66, 0, 0.14, STEEL_D);
        }
        for (let u = gA + 1.5; u < gB; u += 3.4) metal.box(u - 0.03, u + 0.03, gy - 0.07, gy + 0.07, 0, 0.14, STEEL_D);
      }
      // cable bundles clipped under the floor lines
      for (let k = 0; k < 4; k++) {
        const cy = Y0 + (1 + Math.floor(R() * (S.floors - 1))) * FH + rr(0.03, 0.12), cA = (side > 0 ? S.x0 : -S.x1) + rr(0, 4), cB = Math.min(cA + rr(6, 16), (side > 0 ? S.x1 : -S.x0));
        for (let j = 0; j < 3; j++) wire.box(cA, cB, cy + j * 0.03, cy + j * 0.03 + 0.018, 0.0, 0.03 + j * 0.006, [0.07, 0.07, 0.075]);
        for (let u = cA + 0.4; u < cB; u += rr(1.2, 2.5)) metal.box(u, u + 0.03, cy - 0.02, cy + 0.11, 0.0, 0.045, STEEL_D);
        if (chance(0.6)) { const jx = rr(cA, cB - 0.3); paint.box(jx, jx + 0.26, cy - 0.1, cy + 0.22, 0.0, 0.1, mul(lin(0x8a8c88), rr(0.5, 0.9))); addDecal(jx, jx + 0.26, cy - 0.1, cy - rr(0.6, 1.6), 0.007, 0, 0.8, D_RUST); }
      }
      // long drooping facade cables
      const uA = side > 0 ? S.x0 : -S.x1, uB = uA + S.bays * BW;
      for (let k = 0; k < 4 + Math.floor(R() * 4); k++) {
        const ya = Y0 + rr(1, S.floors) * FH - rr(0.05, 0.3), u1 = rr(uA, uB - 4), u2 = Math.min(uB, u1 + rr(3, 12));
        catenary(wire, [u1, ya, 0.05], [u2, ya + rr(-0.5, 0.5), 0.05], rr(0.15, 0.6), 0.014, [0.08, 0.08, 0.08], 8);
      }
      for (let k = 0; k < 5; k++) { const u = rr(uA + 0.3, uB - 0.3); wire.box(u, u + 0.025, Y0 + rr(0, 4), S.roofY + 0.4, 0.0, 0.025, [0.08, 0.08, 0.08]); }
      // roof-edge vines
      if (chance(0.7)) for (let k = 0; k < 6; k++) vine(rr(uA, uB), S.roofY + 0.05, 0.03, rr(0.4, 2.2));
      popXf();
    }
    // side walls (visible above lower neighbours and at the two ends of the block)
    const depth = S.zf + S.zb;
    const sideWall = (isEnd, ang, x, uStart) => {
      const endTypes = x < 0 ? ['', 'K', 'B', 'W', ''] : ['', 'W', '', 'B', 'K'];
      pushXf(frameM(x, 0, ang));
      const np = 5, pw = depth / np;
      makeStains(uStart, uStart + depth, S.roofY, isEnd ? 6 : 2);
      for (let f = 0; f < S.floors; f++) for (let i = 0; i < np; i++) {
        const u0 = uStart + i * pw, y0 = Y0 + f * FH;
        const et = isEnd ? endTypes[i] : '';
        if (et && (et === 'B' || chance(0.85))) unit(u0, y0, et, { tint: S.tint, gx: 40 + i * 2 + (x > 0 ? 9 : 0), gy: f, side: 3, isTop: f === S.floors - 1, back: true, bw: pw });
        else { panel(u0, y0, pw, FH, null, panelCol(S.tint)); weatherBlank(u0 + 0.03, u0 + pw - 0.03, y0, f === S.floors - 1, f === 0 && isEnd); }
      }
      if (isEnd) {
        // fire ladder
        const lu = uStart + pw * 0.5, top = S.roofY + 1.0;
        metal.box(lu - 0.25, lu - 0.21, Y0 + 0.4, top, 0.14, 0.18, RUSTY); metal.box(lu + 0.21, lu + 0.25, Y0 + 0.4, top, 0.14, 0.18, RUSTY);
        for (let y = Y0 + 0.6; y < top; y += 0.32) metal.box(lu - 0.21, lu + 0.21, y, y + 0.03, 0.145, 0.175, RUSTY);
        for (let y = Y0 + 1.5; y < top; y += 3) { metal.box(lu - 0.25, lu - 0.21, y, y + 0.04, 0, 0.16, RUSTY); metal.box(lu + 0.21, lu + 0.25, y, y + 0.04, 0, 0.16, RUSTY); addDecal(lu - 0.32, lu + 0.32, y, y - rr(1, 2.6), 0.007, 0, 0.85, D_RUST); }
        // drain pipe + conduit
        const pu = uStart + pw * 4 + (x < 0 ? 0.1 : -pw + 0.1);
        metal.cyl(pu, Y0 + 0.2, 0.12, pu, S.roofY + 0.3, 0.12, 0.075, 7, RUSTY);
        for (let y = Y0 + 1.5; y < S.roofY; y += 3) metal.box(pu - 0.11, pu + 0.11, y, y + 0.05, 0, 0.2, STEEL_D);
        wire.box(uStart + pw * 4.6, uStart + pw * 4.6 + 0.03, Y0 + 2, S.roofY + 0.5, 0, 0.03, [0.08, 0.08, 0.08]);
        catenary(wire, [uStart + 0.5, S.roofY - 1.2, 0.04], [uStart + depth - 0.5, S.roofY - 2.4, 0.04], 0.5, 0.014, [0.08, 0.08, 0.08], 10);
        dish(uStart + pw * 4.7, Y0 + FH * (S.floors - 2) + 1.4, 0.3, 0.42, -0.5, 0.4);
      }
      popXf();
    };
    sideWall(S.s === 0, -Math.PI / 2, S.x0, -S.zb);
    sideWall(S.s === sections.length - 1, Math.PI / 2, S.x1, -S.zf);
  }

  // ------------------------------------------------------------------ stair towers
  for (const T of towers) {
    const topY = Y0 + T.floors * FH;
    core.box(T.x0 + TH - 0.02, T.x1 - TH + 0.02, Y0 - 0.02, topY, -TZB + TH - 0.02, TZF - TH + 0.02, [0.5, 0.5, 0.5]);
    const tint = [0.97, 0.97, 0.99];
    const face = (side) => {
      pushXf(side > 0 ? frameM(0, TZF, 0) : frameM(0, -TZB, Math.PI));
      const u0 = side > 0 ? T.x0 : -T.x1;
      makeStains(u0, u0 + TW, topY, 2);
      for (let f = 0; f < T.floors; f++) {
        const y0 = Y0 + f * FH, top = f === T.floors - 1;
        if (top) {
          panel(u0, y0, TW, FH, null, panelCol(tint)); weatherBlank(u0 + 0.03, u0 + TW - 0.03, y0, true, false);
          if (side > 0) { paint.box(u0 + 0.9, u0 + 2.1, y0 + 1.3, y0 + 2.1, 0, 0.03, [0.05, 0.055, 0.06]); for (let y = y0 + 1.36; y < y0 + 2.08; y += 0.1) metal.box(u0 + 0.9, u0 + 2.1, y, y + 0.04, 0.02, 0.06, STEEL); }
          continue;
        }
        const uc = u0 + TW / 2, ow = side > 0 ? 1.15 : 0.8, oh = side > 0 ? 1.5 : 1.0, a = uc - ow / 2, b = uc + ow / 2, c = y0 + (side > 0 ? 1.15 : 1.5), d = c + oh;
        panel(u0, y0, TW, FH, { a, b, c, d }, panelCol(tint));
        const lit = chance(side > 0 ? 0.55 : 0.4), br = rr(0.4, 0.7), tn = [1.0, 0.42, 0.13];
        addWindow(uc, (c + d) / 2, WZ0, ow, oh, rr(1, 900), lit ? br : 0, 0, 2, tn);
        if (lit) addLight(uc, (c + d) / 2, 0.28, tn, br * 0.8);
        const fc = mul(pick(FRAME_COLS), 0.8);
        frameRect(a, b, c, d, fc); if (side > 0) { vbar(uc, c, d, fc); hbar(a, b, c + oh * 0.5, fc); }
        paint.box(a - 0.04, b + 0.04, c - 0.05, c - 0.01, -0.12, 0.07, mul(lin(0x9da1a3), rr(0.6, 1)));
        addDecal(a - 0.1, b + 0.1, c - 0.04, c - rr(0.6, 1.1), 0.006, 0, rr(0.5, 0.9), D_WATER);
        weatherBlank(u0 + 0.03, a - 0.03, y0, false, f === 0); weatherBlank(b + 0.03, u0 + TW - 0.03, y0, false, f === 0);
        if (chance(0.3)) { const x = rr(u0 + 0.2, u0 + TW - 0.2); wire.box(x, x + 0.02, y0, y0 + FH, 0, 0.02, [0.07, 0.07, 0.07]); }
      }
      popXf();
    };
    face(1); face(-1);
    const depth = TZF + TZB, np = 5, pw = depth / np;
    for (const [ang, x, us] of [[-Math.PI / 2, T.x0, -TZB], [Math.PI / 2, T.x1, -TZF]]) {
      pushXf(frameM(x, 0, ang)); makeStains(us, us + depth, topY, 3);
      for (let f = 0; f < T.floors; f++) for (let i = 0; i < np; i++) { panel(us + i * pw, Y0 + f * FH, pw, FH, null, panelCol(tint)); if (f >= T.floors - 2) weatherBlank(us + i * pw + 0.03, us + (i + 1) * pw - 0.03, Y0 + f * FH, f === T.floors - 1, false); }
      // roof-access ladder from the lower section roof
      { const S2 = sections[x === T.x0 ? T.i : T.i + 1], lu = us + depth * rr(0.3, 0.7);
        metal.box(lu - 0.22, lu - 0.18, S2.roofY + 0.1, topY + 0.9, 0.12, 0.16, RUSTY); metal.box(lu + 0.18, lu + 0.22, S2.roofY + 0.1, topY + 0.9, 0.12, 0.16, RUSTY);
        for (let y = S2.roofY + 0.4; y < topY + 0.8; y += 0.3) metal.box(lu - 0.18, lu + 0.18, y, y + 0.025, 0.125, 0.155, RUSTY);
        addDecal(lu - 0.3, lu + 0.3, topY - 0.2, S2.roofY + 0.2, 0.007, 0, 0.8, D_RUST); }
      popXf();
    }
    // tower roof
    tar.box(T.x0, T.x1, topY, topY + 0.1, -TZB, TZF, WHITE);
    conc.box(T.x0 - 0.06, T.x1 + 0.06, topY, topY + 0.35, TZF - 0.2, TZF + 0.06, panelCol(tint)); conc.box(T.x0 - 0.06, T.x1 + 0.06, topY, topY + 0.35, -TZB - 0.06, -TZB + 0.2, panelCol(tint));
    conc.box(T.x0 - 0.06, T.x0 + 0.2, topY, topY + 0.35, -TZB + 0.2, TZF - 0.2, panelCol(tint)); conc.box(T.x1 - 0.2, T.x1 + 0.06, topY, topY + 0.35, -TZB + 0.2, TZF - 0.2, panelCol(tint));
    // drain pipes at the tower/section corners (front)
    for (const px of [T.x0 - 0.12, T.x1 + 0.12]) {
      const S = px < T.x0 ? sections[T.i] : sections[T.i + 1];
      metal.cyl(px, Y0 + 0.1, S.zf + 0.12, px, S.roofY + 0.2, S.zf + 0.12, 0.07, 7, mul(RUSTY, rr(0.7, 1.1)));
      for (let y = Y0 + 2; y < S.roofY; y += 3) metal.box(px - 0.1, px + 0.1, y, y + 0.05, S.zf, S.zf + 0.2, STEEL_D);
    }
  }

  // ------------------------------------------------------------------ base slab
  {
    const n = 22, x0 = -CFG.BODY_LEN / 2 - 0.5, L = CFG.BODY_LEN + 1.0, seg = L / n;
    for (let i = 0; i < n; i++) {
      const c = panelCol([0.8, 0.8, 0.82]);
      conc.box(x0 + i * seg + 0.02, x0 + (i + 1) * seg - 0.02, 0.0, Y0 - 0.03, -8.45, 8.85, c, mul(c, 0.75));
    }
    metal.box(x0, x0 + L, -0.02, 0.1, 8.85, 8.89, RUSTY); metal.box(x0, x0 + L, -0.02, 0.1, -8.49, -8.45, RUSTY);
  }

  // ------------------------------------------------------------------ roofs
  const masts = [];
  function antenna(x, y, z, h, type, reg = true) {
    const c = mul(STEEL, rr(0.7, 1.2));
    metal.cyl(x, y, z, x, y + h, z, 0.035, 5, c);
    const top = y + h;
    if (type === 0) { // yagi
      const a = rr(0, Math.PI), dx = Math.cos(a), dz = Math.sin(a), L = rr(1.4, 2.4), n = Math.floor(rr(5, 9));
      metal.cyl(x - dx * L / 2, top - 0.1, z - dz * L / 2, x + dx * L / 2, top - 0.1, z + dz * L / 2, 0.022, 4, c);
      for (let i = 0; i < n; i++) { const k = (i / (n - 1) - 0.5) * L, el = 0.45 - 0.2 * (i / n) + 0.1; metal.cyl(x + dx * k + dz * el, top - 0.1, z + dz * k - dx * el, x + dx * k - dz * el, top - 0.1, z + dz * k + dx * el, 0.016, 3, c); }
    } else if (type === 1) { // dipole stack
      const a = rr(0, Math.PI), dx = Math.cos(a), dz = Math.sin(a);
      for (let i = 0; i < 3; i++) { const yy = top - 0.1 - i * 0.55, el = 0.7 - i * 0.12; metal.cyl(x - dx * el, yy, z - dz * el, x + dx * el, yy, z + dz * el, 0.02, 3, c); }
      metal.cyl(x - dz * 0.5, top - 0.4, z + dx * 0.5, x + dz * 0.5, top - 0.4, z - dx * 0.5, 0.016, 3, c);
    } else if (type === 2) { // loop frame
      const a = rr(0, Math.PI), dx = Math.cos(a), dz = Math.sin(a), w = 0.45, hh = 0.7;
      metal.cyl(x - dx * w, top, z - dz * w, x + dx * w, top, z + dz * w, 0.016, 3, c); metal.cyl(x - dx * w, top - hh, z - dz * w, x + dx * w, top - hh, z + dz * w, 0.016, 3, c);
      metal.cyl(x - dx * w, top, z - dz * w, x - dx * w, top - hh, z - dz * w, 0.016, 3, c); metal.cyl(x + dx * w, top, z + dz * w, x + dx * w, top - hh, z + dz * w, 0.016, 3, c);
    } else { // tall whip with guy wires
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + rr(0, 1); wire.cyl(x, y + h * 0.75, z, x + Math.cos(a) * h * 0.4, y, z + Math.sin(a) * h * 0.4, 0.012, 3, [0.12, 0.12, 0.12]); }
      metal.cyl(x - 0.5, top - 0.6, z, x + 0.5, top - 0.6, z, 0.018, 3, c); metal.cyl(x, top - 1.1, z - 0.4, x, top - 1.1, z + 0.4, 0.018, 3, c);
    }
    if (reg && type !== 3 && h > 4.3) for (let i = 0; i < 3; i++) { const a = i * 2.1 + rr(0, 1); wire.cyl(x, y + h * 0.7, z, x + Math.cos(a) * h * 0.35, y, z + Math.sin(a) * h * 0.35, 0.011, 3, [0.12, 0.12, 0.12]); }
    if (reg) masts.push([x, top - 0.15, z]);
  }
  function parapet(x0, x1, z0, z1, y, h, tint) {
    const t = 0.24, n = Math.max(1, Math.round((x1 - x0) / BW));
    for (let i = 0; i < n; i++) {
      const a = x0 + (x1 - x0) * i / n + 0.015, b = x0 + (x1 - x0) * (i + 1) / n - 0.015;
      conc.box(a, b, y, y + h, z1 - t, z1 + 0.03, panelCol(tint)); conc.box(a, b, y, y + h, z0 - 0.03, z0 + t, panelCol(tint));
    }
    conc.box(x0 - 0.03, x0 + t, y, y + h, z0 + t, z1 - t, panelCol(tint)); conc.box(x1 - t, x1 + 0.03, y, y + h, z0 + t, z1 - t, panelCol(tint));
    const fl = mul(lin(0x70757a), 0.7);
    metal.box(x0 - 0.05, x1 + 0.05, y + h, y + h + 0.03, z1 - t - 0.02, z1 + 0.06, fl); metal.box(x0 - 0.05, x1 + 0.05, y + h, y + h + 0.03, z0 - 0.06, z0 + t + 0.02, fl);
  }
  for (const S of sections) {
    const y = S.roofY, z0 = -S.zb, z1 = S.zf;
    tar.box(S.x0, S.x1, y - 0.05, y + 0.12, z0 + 0.1, z1 - 0.1, WHITE);
    parapet(S.x0, S.x1, z0, z1, y, 0.75, S.tint);
    const ry = y + 0.12, L = S.x1 - S.x0;
    // vent blocks
    const nv = Math.floor(rr(2, 5));
    for (let i = 0; i < nv; i++) {
      const big = i === 0 && chance(0.7);
      const vx = S.x0 + (i + rr(0.25, 0.75)) * L / nv, vz = rr(-3, 3), w = big ? rr(2.6, 3.6) : rr(0.9, 1.5), d = big ? rr(2.4, 3.4) : rr(0.8, 1.3), h = big ? rr(2.3, 3.1) : rr(0.9, 1.7), c = panelCol(S.tint, 0.9);
      conc.box(vx - w / 2, vx + w / 2, ry, ry + h, vz - d / 2, vz + d / 2, c, mul(c, 0.7));
      metal.box(vx - w / 2 - 0.1, vx + w / 2 + 0.1, ry + h, ry + h + 0.06, vz - d / 2 - 0.1, vz + d / 2 + 0.1, mul(RUSTY, rr(0.6, 1)));
      paint.box(vx - w / 2 + 0.15, vx + w / 2 - 0.15, ry + h - 0.4, ry + h - 0.1, vz + d / 2, vz + d / 2 + 0.01, [0.03, 0.03, 0.035]);
      if (chance(0.6)) antenna(vx + rr(-0.3, 0.3), ry + h, vz + rr(-0.3, 0.3), rr(2.5, 5), Math.floor(R() * 4));
    }
    // vent pipes
    for (let i = 0; i < Math.floor(rr(3, 7)); i++) {
      const px = rr(S.x0 + 1, S.x1 - 1), pz = rr(z0 + 1, z1 - 1), h = rr(0.6, 2.0), r = rr(0.08, 0.16), c = mul(chance(0.5) ? RUSTY : STEEL, rr(0.7, 1.1));
      metal.cyl(px, ry, pz, px, ry + h, pz, r, 7, c); metal.cyl(px, ry + h, pz, px, ry + h + 0.18, pz, r * 1.9, 7, c, true, r * 0.4);
    }
    // antennas along the parapets
    for (let i = 0; i < Math.floor(rr(7, 13)); i++) antenna(rr(S.x0 + 0.6, S.x1 - 0.6), ry, chance(0.5) ? z1 - rr(0.5, 1.6) : z0 + rr(0.5, 1.6), rr(2.2, 6.5), Math.floor(R() * 4));
    // dishes
    for (let i = 0; i < Math.floor(rr(1, 4)); i++) { const dx = rr(S.x0 + 1, S.x1 - 1), front = chance(0.6); metal.cyl(dx, ry, front ? z1 - 0.5 : z0 + 0.5, dx, ry + 1.3, front ? z1 - 0.5 : z0 + 0.5, 0.03, 4, STEEL); dish(dx, ry + 1.3, front ? z1 - 0.45 : z0 + 0.45, rr(0.35, 0.6), front ? rr(-0.8, 0.8) : Math.PI + rr(-0.8, 0.8), rr(0.3, 0.55)); }
    // hatch, junk, water tank
    { const hx = rr(S.x0 + 2, S.x1 - 2), hz = rr(-2, 2); conc.box(hx - 0.5, hx + 0.5, ry, ry + 0.45, hz - 0.5, hz + 0.5, panelCol(S.tint, 0.8)); metal.box(hx - 0.55, hx + 0.55, ry + 0.45, ry + 0.5, hz - 0.55, hz + 0.55, RUSTY); }
    for (let i = 0; i < Math.floor(rr(2, 6)); i++) { const jx = rr(S.x0 + 1, S.x1 - 1), jz = rr(z0 + 1, z1 - 1), c = mul(pick(CLUTTER), rr(0.4, 0.8)); paint.box(jx, jx + rr(0.4, 1.4), ry, ry + rr(0.15, 0.7), jz, jz + rr(0.4, 1.0), c); }
    if (S.floors >= 7 || chance(0.3)) {
      const tx = rr(S.x0 + 3, S.x1 - 3), tz = rr(-2.5, 2.5), c = mul(RUSTY, rr(0.7, 1));
      metal.cyl(tx - 1.4, ry + 1.5, tz, tx + 1.4, ry + 1.5, tz, 0.85, 14, c, true);
      for (const sx of [-0.9, 0.9]) { metal.box(tx + sx - 0.06, tx + sx + 0.06, ry, ry + 1.0, tz - 0.7, tz - 0.58, STEEL_D); metal.box(tx + sx - 0.06, tx + sx + 0.06, ry, ry + 1.0, tz + 0.58, tz + 0.7, STEEL_D); }
      metal.cyl(tx + 0.4, ry + 2.3, tz, tx + 0.4, ry + 2.7, tz, 0.12, 6, STEEL);
    }
    // roofing felt strips, patches, puddles
    for (let x = S.x0 + 0.12; x < S.x1 - 0.3;) {
      const wd = Math.min(rr(0.9, 1.1), S.x1 - 0.12 - x), k = rr(0.74, 1.22), yy = ry + 0.02;
      tar.quad([x + 0.012, yy, z1 - 0.26], [x + wd - 0.012, yy, z1 - 0.26], [x + wd - 0.012, yy, z0 + 0.26], [x + 0.012, yy, z0 + 0.26], [0, 1, 0], [k, k, k * 1.03]); x += wd;
    }
    for (let i = 0; i < 7; i++) { const px = rr(S.x0 + 0.5, S.x1 - 3), pz = rr(z0 + 0.5, z1 - 3), pw = rr(0.8, 2.6), pd = rr(0.8, 2.4), k = chance(0.5) ? rr(1.25, 1.7) : rr(0.5, 0.75), yy = ry + 0.035;
      tar.quad([px, yy, pz + pd], [px + pw, yy, pz + pd], [px + pw, yy, pz], [px, yy, pz], [0, 1, 0], [k, k, k]); }
    for (let i = 0; i < 3 + Math.floor(R() * 4); i++) {
      const px = rr(S.x0 + 1.5, S.x1 - 1.5), pz = rr(z0 + 1.2, z1 - 1.2), pr = rr(0.5, 1.7), n = 11, ph = rr(0, 6), el = rr(0.5, 1), yy = ry + 0.05;
      const base = puddle.count; puddle.v(px, yy, pz, 0, 1, 0, WHITE);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, r = pr * (0.7 + 0.3 * Math.sin(a * 3 + ph) + 0.12 * Math.sin(a * 5 + ph * 2)); puddle.v(px + Math.cos(a) * r, yy, pz + Math.sin(a) * r * el, 0, 1, 0, WHITE); }
      for (let k = 0; k < n; k++) puddle.idx.push(base, base + 1 + (k + 1) % n, base + 1 + k);
    }
    // lift machine room / rooftop hut: lit window, door with a lamp, ladder, mast
    for (let hI = 0; hI < (S.bays >= 5 ? 2 : 1); hI++) {
      const hw2 = rr(2.4, 3.6), hd = rr(2.2, 3.0), hh = rr(2.3, 3.0), c = panelCol(S.tint, 0.95);
      const hx = S.x0 + (hI + rr(0.15, 0.6)) * L / (S.bays >= 5 ? 2 : 1) * 0.8, back = chance(0.6), hz = back ? rr(z0 + 0.5, z0 + 1.6) : rr(z1 - hd - 1.6, z1 - hd - 0.5);
      sbox(conc, hx, hx + hw2, ry, ry + hh, hz, hz + hd, c, mul(c, 0.72), 2, 2, 2);
      tar.box(hx - 0.15, hx + hw2 + 0.15, ry + hh, ry + hh + 0.1, hz - 0.15, hz + hd + 0.15, WHITE);
      metal.box(hx - 0.17, hx + hw2 + 0.17, ry + hh - 0.03, ry + hh + 0.08, hz - 0.17, hz + hd + 0.17, mul(RUSTY, 0.8));
      pushXf(back ? frameM(0, hz, Math.PI) : frameM(0, hz + hd, 0));
      const U = (x) => (back ? -x : x), sg = back ? -1 : 1;
      const wu = U(hx + hw2 * 0.64), wy = ry + 1.5, lit = chance(0.8), tn = [1.0, 0.44, 0.15];
      addWindow(wu, wy, 0.015, 0.8, 0.6, rr(1, 900), lit ? rr(0.7, 1.1) : 0, 0, 2, tn);
      const fc = mul(pick(FRAME_COLS), 0.8);
      paint.box(wu - 0.45, wu + 0.45, wy - 0.35, wy - 0.3, 0, 0.05, fc); paint.box(wu - 0.45, wu + 0.45, wy + 0.3, wy + 0.35, 0, 0.05, fc); paint.box(wu - 0.45, wu - 0.4, wy - 0.3, wy + 0.3, 0, 0.05, fc); paint.box(wu + 0.4, wu + 0.45, wy - 0.3, wy + 0.3, 0, 0.05, fc); paint.box(wu - 0.02, wu + 0.02, wy - 0.3, wy + 0.3, 0, 0.04, fc);
      if (lit) addLight(wu, wy, 0.4, tn, 1.0);
      const du = U(hx + hw2 * 0.22); paint.box(du - 0.42, du + 0.42, ry, ry + 1.95, 0, 0.04, mul(pick(SHEET_COLS), 0.7));
      emis.box(du - 0.06, du + 0.06, ry + 2.1, ry + 2.18, 0.05, 0.17, LAMPC); metal.box(du - 0.09, du + 0.09, ry + 2.18, ry + 2.22, 0, 0.2, STEEL_D); addLight(du, ry + 2.0, 0.35, tn, 1.3);
      addDecal(U(hx + 0.05), U(hx + hw2 - 0.05), ry + hh, ry + hh - rr(0.8, 2.0), 0.006, 1, 0.75, D_WATER);
      addDecal(du - 0.45 * sg, du + 0.45 * sg, ry, ry + rr(0.3, 0.8), 0.006, 1, 0.7, D_MOSS);
      popXf();
      for (const lz of [hz + 0.5, hz + 0.95]) metal.box(hx - 0.12, hx - 0.08, ry, ry + hh + 0.9, lz - 0.02, lz + 0.02, RUSTY);
      for (let y2 = ry + 0.3; y2 < ry + hh + 0.8; y2 += 0.3) metal.box(hx - 0.115, hx - 0.085, y2, y2 + 0.025, hz + 0.5, hz + 0.95, RUSTY);
      if (chance(0.75)) antenna(hx + hw2 * rr(0.3, 0.7), ry + hh + 0.1, hz + hd * 0.5, rr(3, 6.5), Math.floor(R() * 4));
      if (chance(0.6)) { const dx2 = hx + hw2 - 0.3, dz2 = back ? hz + 0.3 : hz + hd - 0.3; metal.cyl(dx2, ry + hh + 0.1, dz2, dx2, ry + hh + 1.0, dz2, 0.03, 4, STEEL); dish(dx2, ry + hh + 1.0, dz2, rr(0.4, 0.65), back ? Math.PI + rr(-0.8, 0.8) : rr(-0.8, 0.8), rr(0.3, 0.5)); }
    }
    // chimney stacks / capped vent shafts near the edges (silhouette)
    for (let i = 0; i < 3 + Math.floor(R() * 3); i++) {
      const vx = rr(S.x0 + 1, S.x1 - 2), vz = chance(0.5) ? rr(z0 + 0.6, z0 + 2.2) : rr(z1 - 2.8, z1 - 1.2), w = rr(0.5, 1.0), d = rr(0.5, 0.8), h = rr(1.3, 2.4), c = panelCol(S.tint, 0.85);
      conc.box(vx, vx + w, ry, ry + h, vz, vz + d, c, mul(c, 0.7));
      for (const [ox, oz] of [[0.04, 0.04], [w - 0.1, 0.04], [0.04, d - 0.1], [w - 0.1, d - 0.1]]) metal.box(vx + ox, vx + ox + 0.06, ry + h, ry + h + 0.22, vz + oz, vz + oz + 0.06, STEEL_D);
      metal.box(vx - 0.1, vx + w + 0.1, ry + h + 0.22, ry + h + 0.27, vz - 0.1, vz + d + 0.1, mul(RUSTY, rr(0.6, 1)));
    }
    // pipe railing on the parapet
    for (const zz of [z1 - 0.1, z0 + 0.1]) if (chance(0.55)) {
      const ra = rr(S.x0 + 0.3, S.x0 + L * 0.4), rb = rr(S.x0 + L * 0.6, S.x1 - 0.3), yy = y + 0.78, rc = mul(RUSTY, rr(0.7, 1.1));
      for (let x = ra; x <= rb + 0.01; x += (rb - ra) / Math.round((rb - ra) / 1.5)) metal.box(x - 0.018, x + 0.018, yy, yy + 0.55, zz - 0.018, zz + 0.018, rc);
      metal.box(ra, rb, yy + 0.53, yy + 0.565, zz - 0.018, zz + 0.018, rc); metal.box(ra, rb, yy + 0.26, yy + 0.285, zz - 0.012, zz + 0.012, rc);
    }
    // cable tray + loose cables
    { const tz = rr(-2, 2), ta = S.x0 + rr(0.5, 2), tb = S.x1 - rr(0.5, 2), tc = mul(RUSTY, 0.8);
      metal.box(ta, tb, ry + 0.25, ry + 0.29, tz - 0.15, tz + 0.15, tc); metal.box(ta, tb, ry + 0.29, ry + 0.36, tz - 0.15, tz - 0.13, tc); metal.box(ta, tb, ry + 0.29, ry + 0.36, tz + 0.13, tz + 0.15, tc);
      for (let x = ta + 0.3; x < tb; x += 2.2) metal.box(x - 0.03, x + 0.03, ry, ry + 0.25, tz - 0.12, tz + 0.12, STEEL_D);
      for (let k = 0; k < 3; k++) wire.box(ta, tb, ry + 0.29, ry + 0.33, tz - 0.1 + k * 0.07, tz - 0.06 + k * 0.07, [0.05, 0.05, 0.055]);
      for (let k = 0; k < 4; k++) { const cx = rr(ta, tb); catenary(wire, [cx, ry + 0.32, tz], [cx + rr(-3, 3), ry + 0.03, chance(0.5) ? z1 - 0.4 : z0 + 0.4], -0.05, 0.02, [0.05, 0.05, 0.055], 5); } }
    // scruffy roof vegetation
    for (let i = 0; i < 5; i++) if (chance(0.6)) bush(rr(S.x0 + 0.6, S.x1 - 0.6), ry, chance(0.5) ? z1 - 0.45 : z0 + 0.45, rr(0.15, 0.4), 3);
  }
  // tower-top masts with beacons
  towers.forEach((T, i) => {
    const topY = Y0 + T.floors * FH + 0.1, x = (T.x0 + T.x1) / 2;
    const h = i % 2 === 0 ? rr(5.5, 8) : rr(2.5, 4);
    antenna(x + rr(-0.5, 0.5), topY, rr(-2, 4), h, 3);
    if (i % 2 === 0) beacons.push(masts[masts.length - 1].slice());
    antenna(x + rr(-0.8, 0.8), topY, rr(-6, -3), rr(2.5, 4.5), Math.floor(R() * 3));
    conc.box(x - 0.6, x + 0.6, topY, topY + 0.9, 5.2, 6.4, panelCol([0.9, 0.9, 0.92])); metal.box(x - 0.7, x + 0.7, topY + 0.9, topY + 0.95, 5.1, 6.5, RUSTY);
    if (chance(0.7)) dish(x + 0.9, topY + 1.0, TZF - 0.5, 0.55, rr(-0.6, 0.6), 0.45);
  });
  // lattice radio mast on the tallest tower
  {
    const T = towers[0], x = (T.x0 + T.x1) / 2 + 0.2, z = -1.5, y = Y0 + T.floors * FH + 0.1, Hm = 11.5, b0 = 0.75, b1 = 0.16, c = mul(RUSTY, 0.9);
    const corner = (k, t) => { const s = b0 + (b1 - b0) * t; return [x + (k & 1 ? s : -s), y + Hm * t, z + (k & 2 ? s : -s)]; };
    const order = [0, 1, 3, 2];
    for (let k = 0; k < 4; k++) { const a = corner(k, 0), b = corner(k, 1); metal.cyl(a[0], a[1], a[2], b[0], b[1], b[2], 0.045, 4, c); }
    const nseg = 9;
    for (let i = 0; i < nseg; i++) for (let k = 0; k < 4; k++) {
      const k2 = order[(order.indexOf(k) + 1) % 4];
      const a = corner(k, i / nseg), b = corner(k2, (i + 1) / nseg), h = corner(k2, i / nseg);
      metal.cyl(a[0], a[1], a[2], b[0], b[1], b[2], 0.022, 3, c); metal.cyl(a[0], a[1], a[2], h[0], h[1], h[2], 0.022, 3, c);
    }
    metal.cyl(x, y + Hm, z, x, y + Hm + 2.2, z, 0.03, 4, c);
    beacons.push([x, y + Hm + 2.0, z]); beacons.push([x + 0.5, y + Hm * 0.5, z + 0.5]);
    dish(x - 0.5, y + Hm * 0.62, z + 0.45, 0.5, -0.7, 0.1); dish(x + 0.4, y + Hm * 0.78, z + 0.3, 0.38, 0.9, 0.1);
    masts.push([x, y + Hm + 2.0, z]);
  }
  // wires strung between masts
  {
    const ms = masts.slice().sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < ms.length - 1; i++) {
      const a = ms[i], b = ms[i + 1 + (chance(0.25) && i < ms.length - 2 ? 1 : 0)];
      const d = Math.hypot(b[0] - a[0], b[2] - a[2]); if (d > 16 || d < 1.5) continue;
      if (chance(0.72)) catenary(wire, a, b, 0.03 * d + rr(0.1, 0.5), 0.016, [0.07, 0.07, 0.07], 10);
    }
  }

  // ------------------------------------------------------------------ baked warm light spill
  const CS = 4.4, RMAX = 4.4, R2 = RMAX * RMAX;
  const grid = new Map();
  for (const L of lights) { const k = Math.floor(L.x / CS) + ',' + Math.floor(L.y / CS); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(L); }
  function computeGlow(b, translucent, gain = 1) {
    const n = b.count, g = new Float32Array(n * 3), P = b.pos, N = b.nor;
    for (let i = 0; i < n; i++) {
      const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2], nx = N[3 * i], ny = N[3 * i + 1], nz = N[3 * i + 2];
      const cx = Math.floor(x / CS), cy = Math.floor(y / CS);
      let r = 0, gg = 0, bb = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get((cx + dx) + ',' + (cy + dy)); if (!list) continue;
        for (let j = 0; j < list.length; j++) {
          const L = list[j], lx = L.x - x, ly = L.y - y, lz = L.z - z, d2 = lx * lx + ly * ly + lz * lz;
          if (d2 > R2) continue;
          const d = Math.sqrt(d2) + 1e-4; let ndl = (nx * lx + ny * ly + nz * lz) / d;
          ndl = translucent ? 0.35 + 0.65 * Math.abs(ndl) : Math.max(0, ndl * 0.88 + 0.12);
          const cut = 1 - d2 / R2, w = L.I * ndl * cut * cut / (1 + d2 / 1.0);
          r += L.r * w; gg += L.g * w; bb += L.b * w;
        }
      }
      g[3 * i] = r * gain; g[3 * i + 1] = gg * gain; g[3 * i + 2] = bb * gain;
    }
    return g;
  }

  // ------------------------------------------------------------------ materials
  const uT = { value: 0 };
  // extra prefab-concrete detail on top of the shared weathering: exposed aggregate speckle + fine pitting (mesh-local)
  const CONC_F = /* glsl */`
  {
    vec3 q_ = vWp * 46.0; vec3 qi_ = floor(q_);
    float hs_ = fract(sin(dot(qi_, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    float fw_ = length(fwidth(vWp)) * 46.0;
    float sp_ = mix(0.5, hs_, clamp(1.4 - fw_, 0.0, 1.0));
    diffuseColor.rgb *= 1.0 + 0.22 * smoothstep(0.86, 0.98, sp_) - 0.20 * smoothstep(0.16, 0.04, sp_);
    vec3 q2_ = vWp * 9.0; vec3 q2i_ = floor(q2_);
    float h2_ = fract(sin(dot(q2i_, vec3(269.5, 183.3, 246.1))) * 43758.5453);
    diffuseColor.rgb *= 0.965 + 0.07 * mix(0.5, h2_, clamp(1.4 - fw_ * 0.2, 0.0, 1.0));
  }
  `;
  function addGlow(mat, sway = false, extraF = '') {
    const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    const keyBase = prevKey ? prevKey() : '';
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uT = uT;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 glow; varying vec3 vGlow;\n' + (sway ? 'attribute vec3 aSway; uniform float uT;\n' : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;\n' + (sway ? `{
          float pin = aSway.x, ph = aSway.y;
          float gust = 0.55 + 0.45 * sin(uT * 0.41 + ph * 0.31);
          float s = sin(uT * 1.25 + ph) * 0.15 + sin(uT * 2.7 + ph * 1.9 + position.y * 1.3) * 0.045;
          float ruf = sin(uT * 3.6 + ph * 3.1 + (position.x + position.z) * 5.0 + position.y * 2.2) * 0.03;
          transformed += objectNormal * ((pin * pin * s * gust + pin * ruf) * aSway.z);
          transformed.y += pin * pin * abs(s) * 0.06 * aSway.z;
        }` : ''));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * diffuseColor.rgb;');
      if (extraF) sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', extraF + '\n#include <roughnessmap_fragment>');
    };
    mat.customProgramCacheKey = () => 'bldglow2' + (sway ? 'S' : '') + (extraF ? 'X' : '') + keyBase.length;
    return mat;
  }
  const meshes = [];
  function addMesh(b, mat, { glow = true, translucent = false, cast = true, receive = true, gain = 1 } = {}) {
    if (!b.count) return null;
    const m = new THREE.Mesh(b.geometry(glow ? computeGlow(b, translucent, gain) : null), mat);
    m.castShadow = cast; m.receiveShadow = receive; m.matrixAutoUpdate = false;
    group.add(m); meshes.push(m);
    return m;
  }
  const mConc = Mats.concrete({ color: 0x9a968e, w: { streak: 0.36, dirt: 0.42, moss: 0.2, grain: 0.9, wet: 0.2 } }); mConc.vertexColors = true; addGlow(mConc, false, CONC_F);
  const mCore = Mats.concreteDark({ color: 0x17181a, w: { streak: 0.3, moss: 0.2 } });
  const mPaint = Mats.paint({ color: 0xffffff, w: { chip: 0.3, rust: 0.34, streak: 0.8, dirt: 0.7 } }); mPaint.vertexColors = true; addGlow(mPaint);
  const mMetal = Mats.steel({ color: 0xffffff, w: { rust: 0.5 } }); mMetal.vertexColors = true; mMetal.metalness = 0.6; addGlow(mMetal);
  const mTar = Mats.concreteDark({ color: 0x2b2d30, w: { wet: 0.75, moss: 0.5, streak: 0, dirt: 0.9 } }); mTar.roughness = 0.8; mTar.vertexColors = true;
  const mCloth = addGlow(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
  const mLaundry = addGlow(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), true);
  const mPlant = addGlow(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85 }));
  const mWire = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6 });

  addMesh(conc, mConc, { gain: 3.6 });
  addMesh(core, mCore, { glow: false });
  addMesh(paint, mPaint, { gain: 2.6 });
  addMesh(metal, mMetal, { gain: 2.6 });
  addMesh(tar, mTar, { glow: false });
  addMesh(cloth, mCloth, { translucent: true, gain: 3.0, cast: false });
  addMesh(laundry, mLaundry, { translucent: true, gain: 0.9 });
  addMesh(plant, mPlant, { gain: 1.4, cast: false });
  addMesh(wire, mWire, { glow: false, cast: false, receive: false });
  addMesh(emis, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }), { glow: false, cast: false, receive: false });
  addMesh(puddle, new THREE.MeshStandardMaterial({ color: 0x07090b, roughness: 0.03, metalness: 0.0, envMapIntensity: 1.6 }), { glow: false, cast: false, receive: true });

  // weathering decals (multiply blend; fog is applied later from depth, so this simply darkens / tints the surface)
  if (decal.count) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(decal.pos), 3));
    g.setAttribute('aUV', new THREE.BufferAttribute(new Float32Array(decal.uv), 4));
    g.setAttribute('aPar', new THREE.BufferAttribute(new Float32Array(decal.par), 4));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(decal.col), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(decal.idx), 1));
    g.computeBoundingSphere();
    const mDecal = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      vertexShader: /* glsl */`
        attribute vec4 aUV; attribute vec4 aPar; attribute vec3 aCol;
        varying vec4 vUV; varying vec4 vPar; varying vec3 vCol;
        void main(){ vUV = aUV; vPar = aPar; vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec4 vUV; varying vec4 vPar; varying vec3 vCol;
        float h2(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.y); }
        float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          float type = vPar.x, seed = vPar.y, k = vPar.z;
          vec2 uv = vUV.xy; vec2 m = uv * vUV.zw;
          float ex = smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x);
          float mask = 0.0;
          if (type < 0.5) {            // fine drip streaks
            float len = 0.12 + 0.88 * pow(vn(vec2(m.x * 8.0 + seed * 13.0, seed)), 1.7);
            float fine = 0.5 + 0.5 * vn(vec2(m.x * 42.0 + seed, m.y * 1.1 + seed));
            mask = smoothstep(len, len * 0.2, uv.y) * fine * ex * (0.55 + 0.45 * vn(vec2(m.x * 2.2 + seed * 3.0, m.y * 0.6)));
          } else if (type < 1.5) {     // broad soak / rising damp with a ragged tide line
            float len = 0.22 + 0.78 * vn(vec2(m.x * 0.8 + seed * 13.0, seed));
            len *= 0.72 + 0.28 * vn(vec2(m.x * 5.5 + seed, seed * 2.0));
            float body = smoothstep(len, len * 0.3, uv.y);
            float tide = smoothstep(len * 1.02, len * 0.9, uv.y) * smoothstep(len * 0.72, len * 0.9, uv.y);
            mask = (body * (0.6 + 0.4 * vn(m * vec2(11.0, 1.6) + seed)) + 0.35 * tide) * ex;
          } else if (type < 2.5) {     // hairline crack
            float cx = 0.5 + (vn(vec2(m.y * 2.1 + seed * 7.0, seed)) - 0.5) * 0.7 + (vn(vec2(m.y * 13.0 + seed, 3.0)) - 0.5) * 0.10;
            float d = abs(uv.x - cx) * vUV.z, aa = fwidth(d);
            float wd = 0.003 + 0.004 * vn(vec2(m.y * 5.0, seed));
            mask = (1.0 - smoothstep(wd, wd + 0.004 + aa, d)) * clamp(wd * 3.0 / (aa + 1e-4), 0.0, 1.0) * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.8, uv.y);
            mask += 0.25 * (1.0 - smoothstep(0.0, 0.05, d)) * smoothstep(1.0, 0.6, uv.y) * vn(m * vec2(30.0, 3.0));
          } else {                     // trowelled repair patch
            vec2 q = abs(uv - 0.5) * 2.0;
            float e = max(q.x, q.y) + (vn(m * 7.0 + seed) - 0.5) * 0.22;
            mask = (1.0 - smoothstep(0.76, 0.84, e)) * (0.75 + 0.25 * vn(m * vec2(26.0, 5.0) + seed));
          }
          gl_FragColor = vec4(mix(vec3(1.0), vCol, clamp(mask * k, 0.0, 1.0)), 1.0);
        }`,
    });
    const dm = new THREE.Mesh(g, mDecal); dm.renderOrder = 2; dm.matrixAutoUpdate = false; dm.frustumCulled = false; group.add(dm);
  }

  // loggia glazing: dirty reflective glass (premultiplied alpha)
  const SKY_U = { uZenith: { value: LOOK.zenith }, uHorizon: { value: LOOK.horizon } };
  const mGlass = new THREE.ShaderMaterial({
    uniforms: { ...SKY_U }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`
      varying vec3 vWP; varying vec3 vWN; varying vec3 vL; varying float vSeed;
      attribute vec3 color;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); vL = position; vSeed = color.r;
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec3 vWP; varying vec3 vWN; varying vec3 vL; varying float vSeed;
      uniform vec3 uZenith, uHorizon;
      float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){
        vec3 V = normalize(vWP - cameraPosition); vec3 N = normalize(vWN); if (dot(N, V) > 0.0) N = -N;
        vec3 Rf = reflect(V, N);
        vec3 sky = mix(uHorizon, uZenith, 1.0 - exp(-max(Rf.y, 0.0) * 3.2));
        sky = mix(sky, vec3(0.008, 0.014, 0.018), smoothstep(0.02, -0.3, Rf.y));
        float F = 0.05 + 0.95 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
        float dirt = 0.10 + 0.30 * vn(vL * vec3(2.3, 0.6, 2.3) + vSeed * 7.0) + 0.15 * vn(vL * 9.0);
        vec3 c = sky * F * 1.5 + vec3(0.022, 0.03, 0.042) * dirt;
        gl_FragColor = vec4(c, clamp(F * 0.75 + dirt * 0.8, 0.0, 0.95));
      }`,
  });
  if (glass.count) { const gm = new THREE.Mesh(glass.geometry(null), mGlass); gm.renderOrder = 5; gm.matrixAutoUpdate = false; group.add(gm); }

  // ------------------------------------------------------------------ interior-mapped windows
  const winMat = new THREE.ShaderMaterial({
    uniforms: { ...SKY_U, uTime: uT, uGain: { value: 2.2 } },
    vertexShader: /* glsl */`
      attribute vec4 aA; attribute vec3 aTint;
      varying vec2 vP; varying vec3 vDir; varying vec2 vSize; varying vec4 vA; varying vec3 vTint; varying vec3 vWN; varying vec3 vWV;
      void main(){
        mat4 mm = modelMatrix * instanceMatrix;
        vec3 cx = mm[0].xyz, cy = mm[1].xyz;
        float sx = length(cx), sy = length(cy);
        vec3 ex = cx / sx, ey = cy / sy, ez = normalize(cross(ex, ey));
        vec4 wp = mm * vec4(position, 1.0);
        vec3 V = wp.xyz - cameraPosition;
        vDir = vec3(dot(V, ex), dot(V, ey), dot(V, ez));
        vP = position.xy * vec2(sx, sy); vSize = vec2(sx, sy);
        vA = aA; vTint = aTint; vWN = ez; vWV = V;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vP; varying vec3 vDir; varying vec2 vSize; varying vec4 vA; varying vec3 vTint; varying vec3 vWN; varying vec3 vWV;
      uniform vec3 uZenith, uHorizon; uniform float uTime, uGain;
      float h1(float s, float k){ return fract(sin(s * 127.1 + k * 311.7) * 43758.5453); }
      void main(){
        float seed = vA.x, lit = vA.y, curtain = vA.z, kind = vA.w;
        vec3 d = normalize(vDir); d.z = min(d.z, -0.03); d = normalize(d);
        vec2 hs = vSize * 0.5;
        float tall = step(1.9, vSize.y);
        float xc = (h1(seed, 1.0) - 0.5) * 1.6;
        float hw = hs.x + abs(xc) + 0.25 + h1(seed, 2.0) * 0.9;
        float top = hs.y + 0.42, bot = -hs.y - mix(0.92, 0.1, tall);
        float D = 2.7 + h1(seed, 3.0) * 2.2;
        if (kind > 1.5 && kind < 2.5) { D = 2.2; xc = 0.0; hw = 1.35; top = hs.y + 0.9; bot = -hs.y - 1.4; }
        vec3 o = vec3(vP, 0.0);
        float tx = abs(d.x) < 1e-4 ? 1e5 : ((d.x > 0.0 ? xc + hw : xc - hw) - o.x) / d.x;
        float ty = abs(d.y) < 1e-4 ? 1e5 : ((d.y > 0.0 ? top : bot) - o.y) / d.y;
        float tz = -D / d.z;
        float t = min(tx, min(ty, tz));
        vec3 P = o + d * t;
        vec3 n; vec3 alb; vec3 extra = vec3(0.0);
        float wsel = h1(seed, 5.0);
        vec3 wallCol = wsel < 0.3 ? vec3(0.78, 0.70, 0.55) : wsel < 0.55 ? vec3(0.66, 0.70, 0.58) : wsel < 0.8 ? vec3(0.80, 0.70, 0.56) : vec3(0.66, 0.68, 0.66);
        float flat_ = (kind < 0.5 || kind > 2.5) ? 1.0 : 0.0;
        if (t == tz) {
          n = vec3(0.0, 0.0, 1.0); alb = wallCol * (0.92 + 0.08 * sin(P.x * 30.0));
          float bx = P.x - (xc - hw), by = P.y - bot;
          float w0 = h1(seed, 11.0) * (2.0 * hw - 1.4);
          if (flat_ > 0.5) {
            // wall carpet
            float c0 = h1(seed, 12.0) * (2.0 * hw - 1.7);
            if (h1(seed, 13.0) < 0.42 && bx > c0 && bx < c0 + 1.7 && by > 0.95 && by < 2.25)
              { vec2 cp = vec2(bx - c0 - 0.85, by - 1.6); float dm = abs(fract(cp.x * 2.6) - 0.5) + abs(fract(cp.y * 2.6) - 0.5);
              float bd = step(0.74, abs(cp.x)) + step(0.56, abs(cp.y));
              alb = mix(vec3(0.30, 0.085, 0.06), vec3(0.42, 0.24, 0.12), smoothstep(0.30, 0.42, dm)); alb = mix(alb, vec3(0.16, 0.06, 0.045), min(bd, 1.0)); }
            // framed picture / clock
            float p0 = h1(seed, 33.0) * (2.0 * hw - 0.6);
            if (h1(seed, 34.0) < 0.5 && bx > p0 && bx < p0 + 0.5 && by > 1.45 && by < 1.85)
              alb = (abs(bx - p0 - 0.25) > 0.21 || abs(by - 1.65) > 0.16) ? vec3(0.12, 0.07, 0.04) : vec3(0.5, 0.55, 0.5) * (0.6 + 0.4 * h1(floor(bx * 9.0), floor(by * 9.0) + seed));
            // bookshelf / wall unit with rows of spines
            float s0 = h1(seed, 31.0) * (2.0 * hw - 1.3);
            if (h1(seed, 32.0) < 0.55 && bx > s0 && bx < s0 + 1.3 && by > 0.05 && by < 1.75) {
              float row = floor(by / 0.42), fy = fract(by / 0.42);
              float bk = floor(bx * 24.0 + row * 7.0);
              vec3 bc = vec3(0.16) + 0.42 * vec3(h1(bk, seed), h1(bk, seed + 1.0) * 0.7, h1(bk, seed + 2.0) * 0.5);
              bc *= step(h1(bk, seed + 5.0) * 0.25 + 0.12, 1.0 - fy);
              alb = (fy > 0.86 || row < 0.5) ? vec3(0.20, 0.115, 0.06) : bc;
              if (abs(bx - s0 - 0.65) > 0.62) alb = vec3(0.17, 0.095, 0.05);
            }
            // wardrobe
            if (bx > w0 && bx < w0 + 1.3 && by < 2.0) alb = vec3(0.19, 0.105, 0.055) * (0.75 + 0.25 * step(0.02, abs(bx - w0 - 0.65))) * (0.9 + 0.1 * step(0.06, abs(by - 1.0)));
            // TV on a stand
            float tv0 = h1(seed, 35.0) * (2.0 * hw - 0.8);
            if ((h1(seed, 36.0) < 0.3 || kind > 2.5) && bx > tv0 && bx < tv0 + 0.8 && by < 1.05) {
              alb = vec3(0.07, 0.05, 0.04);
              if (by > 0.52 && by < 0.98 && abs(bx - tv0 - 0.4) < 0.33) { alb = vec3(0.02);
                float f = floor(uTime * 6.0); extra = mix(vec3(0.22, 0.42, 1.0), vec3(0.65, 0.78, 1.0), h1(seed + 3.0, f)) * (0.5 + 0.5 * h1(seed, f)) * (0.7 + 0.3 * sin(by * 160.0)); }
            }
          } else if (by < 1.5) alb = vec3(0.22, 0.36, 0.30);
        } else if (t == tx) {
          n = vec3(-sign(d.x), 0.0, 0.0); alb = wallCol * 0.92;
          if (kind > 1.5 && kind < 2.5 && (P.y - bot) < 1.5) alb = vec3(0.22, 0.36, 0.30);
          else if (flat_ > 0.5) { // door / cupboard on a side wall
            float dz = -P.z - D * (0.25 + 0.4 * h1(seed, 37.0));
            if (h1(seed, 38.0) < 0.6 && dz > 0.0 && dz < 0.85 && (P.y - bot) < 2.02) alb = vec3(0.34, 0.25, 0.16) * (0.8 + 0.2 * step(0.05, abs(dz - 0.42)));
          }
        } else if (d.y > 0.0) { n = vec3(0.0, -1.0, 0.0); alb = vec3(0.82, 0.80, 0.74); }
        else { n = vec3(0.0, 1.0, 0.0); alb = vec3(0.30, 0.18, 0.10);
          // rug on the floor
          if (flat_ > 0.5 && h1(seed, 39.0) < 0.5 && abs(P.x - xc) < hw * 0.6 && -P.z > D * 0.25 && -P.z < D * 0.85) alb = mix(vec3(0.32, 0.10, 0.07), vec3(0.36, 0.26, 0.14), step(0.5, fract(P.x * 3.0)) * step(0.5, fract(P.z * 3.0))); }
        vec3 lamp = vec3(xc + (h1(seed, 4.0) - 0.5) * 0.8, top - 0.34, -D * 0.5);
        vec3 Lv = lamp - P; float l2 = dot(Lv, Lv);
        float ndl = max(dot(n, Lv * inversesqrt(l2)), 0.0);
        float lsel = h1(seed, 17.0);
        float E = (0.13 + 1.0 * ndl) / (0.30 + 0.42 * l2);
        // table / floor lamp in a corner
        float tl = step(h1(seed, 41.0), 0.4) * flat_;
        vec3 lamp2 = vec3(xc + (h1(seed, 42.0) < 0.5 ? -1.0 : 1.0) * (hw - 0.45), bot + 1.05 + 0.5 * h1(seed, 43.0), -D * (0.55 + 0.35 * h1(seed, 44.0)));
        vec3 Lv2 = lamp2 - P; float l22 = dot(Lv2, Lv2);
        float E2 = tl * (0.1 + 0.9 * max(dot(n, Lv2 * inversesqrt(l22)), 0.0)) / (0.25 + 1.6 * l22);
        // a room lit only by its lamp / TV
        float dimRoom = step(h1(seed, 45.0), 0.22) * max(tl, step(2.5, kind));
        E = E * (1.0 - 0.85 * dimRoom) + E2 * 0.9;
        vec3 room = alb * E;
        // visible ceiling lamp: bare bulb / fabric shade / three-arm chandelier
        vec3 oc = o - lamp; float bq = dot(oc, d); float dd = dot(oc, oc) - bq * bq;
        float vis = step(0.0, -bq) * (1.0 - 0.9 * dimRoom);
        if (lsel < 0.38) room += vec3(1.0, 0.92, 0.75) * exp(-dd / 0.02) * vis * 2.6;
        else if (lsel < 0.72) { vec3 pc_ = oc - d * bq; float sh = exp(-(pc_.x * pc_.x + pc_.z * pc_.z + pc_.y * pc_.y * 2.6) / 0.05);
          room += (vec3(1.0, 0.60, 0.26) * sh * 1.25 + vec3(1.0, 0.9, 0.7) * exp(-dd / 0.006) * 1.2) * vis; }
        else for (int i = 0; i < 3; i++) { vec3 o3 = oc - vec3((float(i) - 1.0) * 0.24, (i == 1 ? 0.07 : 0.0), 0.0); float b3 = dot(o3, d); room += vec3(1.0, 0.9, 0.72) * exp(-(dot(o3, o3) - b3 * b3) / 0.008) * vis * 2.0; }
        { vec3 o2 = o - lamp2; float b2 = dot(o2, d); vec3 p2 = o2 - d * b2;
          room += tl * step(0.0, -b2) * vec3(1.0, 0.66, 0.30) * exp(-(p2.x * p2.x + p2.z * p2.z + p2.y * p2.y * 1.6) / 0.03) * 1.5; }
        float occ = 1.0;
        if (kind < 0.5) {
          // standing figure
          if (h1(seed, 21.0) < 0.09) {
            vec3 q = o + d * (1.3 / -d.z); float sx = xc + (h1(seed, 22.0) - 0.5) * 1.0;
            vec2 qb = vec2(q.x - sx, q.y - (bot + 1.02));
            float body = 1.0 - smoothstep(0.92, 1.05, length(qb / vec2(0.25, 0.50)));
            float neck = (1.0 - smoothstep(0.045, 0.065, abs(qb.x))) * step(0.3, qb.y) * step(qb.y, 0.56);
            float head = 1.0 - smoothstep(0.10, 0.125, length(vec2(qb.x, (qb.y - 0.64) * 0.85)));
            occ *= 1.0 - 0.82 * max(body, max(neck, head));
          } else if (h1(seed, 21.0) < 0.14) { // someone at the window: head and shoulders
            vec3 q = o + d * (0.45 / -d.z); vec2 qb = vec2(q.x - (h1(seed, 22.0) - 0.5) * hs.x, q.y + hs.y - 0.42);
            float sh = (1.0 - smoothstep(0.9, 1.05, length(vec2(qb.x / 0.27, (qb.y + 0.25) / 0.36)))) * step(qb.y, 0.12);
            float head = 1.0 - smoothstep(0.105, 0.125, length(vec2(qb.x, (qb.y - 0.2) * 0.88)));
            occ *= 1.0 - 0.85 * max(sh, head);
          }
          // plants on the sill
          if (h1(seed, 23.0) < 0.45) {
            vec3 q = o + d * (0.3 / -d.z);
            for (int i = 0; i < 3; i++) {
              float fi = float(i);
              vec2 c = vec2((h1(seed, 24.0 + fi) - 0.5) * vSize.x * 0.8, -hs.y + 0.12 + 0.16 * h1(seed, 27.0 + fi));
              float r = 0.14 + 0.12 * h1(seed, 30.0 + fi);
              float a = atan(q.y - c.y, q.x - c.x);
              float leaf = 1.0 - smoothstep(0.85, 1.0, length(q.xy - c) / (r * (0.8 + 0.2 * sin(a * 5.0 + seed + fi))));
              float pot = step(abs(q.x - c.x), 0.07) * step(q.y, c.y) ;
              occ *= 1.0 - 0.8 * max(leaf, pot);
            }
          }
        }
        room *= occ; extra *= occ;
        // sheer tulle just behind the glass, heavier side curtains a little deeper (they parallax against each other)
        vec3 qt = o + d * (0.07 / -d.z);
        vec3 qc = o + d * (0.20 / -d.z);
        float cx = qc.x / hs.x + 0.035 * sin(qc.y * 5.0 + seed) * (0.4 + 0.6 * smoothstep(hs.y, -hs.y, qc.y));
        float covL = curtain * (0.1 + 0.8 * h1(seed, 7.0)), covR = curtain * (0.1 + 0.8 * h1(seed, 8.0));
        float covered = max(step(cx, -1.0 + covL), step(1.0 - covR, cx));
        float tulle = step(h1(seed, 9.0), 0.62) * step(0.01, curtain);
        if (h1(seed, 14.0) < 0.3) tulle *= step(qt.x / hs.x, -0.3 + 1.1 * h1(seed, 15.0));
        float tfold = 0.5 + 0.5 * sin(qt.x * 52.0 + 2.5 * sin(qt.y * 1.7 + seed));
        float lace = step(qt.y, -hs.y + 0.32) * (0.5 + 0.5 * sin(qt.x * 110.0) * sin(qt.y * 110.0));
        float tOp = tulle * clamp(0.44 + 0.12 * tfold + 0.25 * lace, 0.0, 0.92);
        float folds = 0.76 + 0.24 * sin(qc.x * (20.0 + 26.0 * h1(seed, 18.0)) + 1.8 * sin(qc.y * 2.3 + seed)) * (0.8 + 0.2 * sin(qc.x * 97.0));
        float fsel = h1(seed, 10.0);
        vec3 fcol = fsel < 0.35 ? vec3(0.90, 0.84, 0.72) : fsel < 0.55 ? vec3(0.90, 0.70, 0.46) : fsel < 0.70 ? vec3(0.88, 0.76, 0.54) : fsel < 0.84 ? vec3(0.72, 0.50, 0.36) : fsel < 0.93 ? vec3(0.60, 0.66, 0.54) : vec3(0.50, 0.44, 0.40);
        float lvl = 0.75 + 0.5 * h1(seed, 16.0);
        vec3 curtRad = fcol * folds * (0.50 + 0.3 * smoothstep(-hs.y, hs.y, qc.y)) * lvl * (1.0 - 0.6 * dimRoom);
        vec3 tulleRad = vec3(0.95, 0.90, 0.80) * (0.40 + 0.09 * tfold) * lvl * (1.0 - 0.6 * dimRoom);
        vec3 colLit = room;
        colLit = mix(colLit, tulleRad, tOp);
        colLit = mix(colLit, curtRad, covered);
        vec3 tint = vTint;
        if (kind > 2.5) { // TV flicker
          float f = floor(uTime * 7.0); float fl = 0.55 + 0.45 * h1(seed, f) ;
          tint = mix(vec3(0.25, 0.45, 1.0), vec3(0.7, 0.8, 1.0), h1(seed + 3.0, f)) * fl;
        }
        colLit *= tint * lit * uGain;
        colLit += extra * (1.0 - covered) * (1.0 - 0.6 * tOp) * 1.6 * step(0.01, lit);
        float tulle_ = tOp;
        // unlit: dim sky-lit interior, curtains barely visible
        vec3 colDark = alb * vec3(0.006, 0.009, 0.016);
        colDark = mix(colDark, vec3(0.022, 0.030, 0.048) * folds * dot(fcol, vec3(0.4)), max(covered, tulle * 0.6));
        vec3 col = mix(colDark, colLit, step(0.01, lit));
        // glass
        vec3 V = normalize(vWV); vec3 N = normalize(vWN);
        vec3 Rf = reflect(V, N);
        vec3 sky = mix(uHorizon, uZenith, 1.0 - exp(-max(Rf.y, 0.0) * 3.2));
        sky = mix(sky, vec3(0.008, 0.014, 0.018), smoothstep(0.02, -0.3, Rf.y));
        float F = 0.045 + 0.955 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
        float ed = max(abs(vP.x) / hs.x, abs(vP.y) / hs.y);
        float dirt = 0.05 + 0.25 * smoothstep(0.55, 1.0, ed) * (0.5 + 0.5 * h1(seed, 40.0));
        col = col * (1.0 - F) * (1.0 - dirt * 0.7) + sky * F * 1.5 + vec3(0.02, 0.028, 0.04) * dirt;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  {
    const n = winM.length;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(winA), 4));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(winT), 3));
    const im = new THREE.InstancedMesh(geo, winMat, n);
    for (let i = 0; i < n; i++) im.setMatrixAt(i, winM[i]);
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false; im.matrixAutoUpdate = false;
    group.add(im);
  }

  // beacons
  const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.14, 0.08) });
  if (beacons.length) {
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), beaconMat, beacons.length);
    beacons.forEach((p, i) => bm.setMatrixAt(i, _m1.makeTranslation(p[0], p[1] + 0.25, p[2])));
    bm.frustumCulled = false; group.add(bm);
  }

  let _tris = 0; group.traverse((o) => { if (o.geometry) _tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
  if (ctx.Q && ctx.Q.get('bldstats')) console.error('[building] tris=' + Math.round(_tris) + ' meshes=' + group.children.length + ' windows=' + winM.length + ' lights=' + lights.length + ' decals=' + decal.count / 4 + ' buildMs=' + Math.round(performance.now() - _t0));
  return {
    group,
    stats: { windows: winM.length, lights: lights.length },
    update(t) {
      uT.value = t;
      const pulse = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 2.2)), 6.0);
      beaconMat.color.setRGB(3.2 * pulse, 0.14 * pulse, 0.08 * pulse);
    },
  };
}
