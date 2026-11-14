// colored-pencil-world · figure.js — the walker: a body made in code, walked by rule and drawn in coloured pencil.
//
// There is no model and no clip. A pose is worked out from where the walker is on the way: each foot is planted at a
// point of the way and stays there until it lifts (so it never slides), the legs reach it by two-bone IK with the knee
// always folding the one way a knee folds, the hips ride as high as the standing leg lets them, the arms swing against
// the legs and fold at the elbow the one way an elbow folds, the chest counter-turns and leans with speed, and a coat or
// scarf hangs and trails by rule. The same pose comes back for the same place and time, so the film is a pure function
// of t. Every joint has a range (LIM) and audit() reports any pose that leaves it. (The rig is the one this repo's
// oil-paint-world walks; here every part is a soft piece with its own pencil and the slant of its strokes.)
//
// Directions: the figure faces +z of its own space, y is up, and +x is its LEFT. `side` is +1 for the left limb and
// -1 for the right. A thing carried "right" is in the right hand whichever way the figure is seen.
import * as THREE from 'three';
import { field, fieldBy, hue } from './pencil.js';
import { ball, block, knead, roll, turned } from './shape.js';
import { cl, lerp, sm } from './world.js';

/** joint ranges, degrees: what a body can do. audit() fails a pose outside them. */
export const LIM = {
  knee: [0, 150], elbow: [0, 150], hip: [-40, 120], shoulder: [-70, 175],
  neckYaw: [-80, 80], neckPitch: [-40, 40], twist: [-40, 40], lean: [-10, 30],
};
const deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad;
const V = () => new THREE.Vector3();
const lin = (c) => new THREE.Color(c);

/** a sheet of cloth: cols × rows points written each frame by fn(i, j, out); its strokes belong to the sheet */
class Cloth {
  constructor(cols, rows, wrap, colour, around = 1.2, down = 1) {
    this.cols = cols; this.rows = rows; this.wrap = wrap; const n = cols * rows;
    this.position = new Float32Array(n * 3);
    const idx = [], cs = wrap ? cols : cols - 1;
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cs; i++) { const a = i + j * cols, b = ((i + 1) % cols) + j * cols; idx.push(a, a + cols, b, b, a + cols, b + cols); }
    const g = this.geometry = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    const C = lin(colour), col = new Float32Array(n * 3), h = new Float32Array(n * 2);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = i + j * cols, u = i / (wrap ? cols : cols - 1), v = j / (rows - 1); col.set([C.r, C.g, C.b], k * 3); h.set([u * around + v * 0.08, v * down - u * around * 0.35], k * 2); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('hatch', new THREE.BufferAttribute(h, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  }
  write(fn) {
    const { cols, rows, position: p } = this, o = V();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { fn(i, j, o); p.set([o.x, o.y, o.z], (i + j * cols) * 3); }
    this.geometry.attributes.position.needsUpdate = true; this.geometry.computeVertexNormals();
  }
}

export class Figure {
  /** height (m); build (1 = average); colours: { skin, hair, top, stripes, legs, shoes, hat, coat, scarf, prop, bag };
   *  sleeves: 'long' | 'short'; legs: 'trousers' | 'shorts' | 'skirt'; hair: 'short' | 'long' | 'bun' | 'curly' | null;
   *  hat: { kind: 'beret' | 'cap' | 'brim' | 'beanie' | 'straw' } | null; coat: { length 0..1, flare, open } | null;
   *  scarf: { length } | null; bag: 'left' | 'right' (a satchel at that hip, its strap across the chest);
   *  carry: { kind: 'basket' | 'bag' | 'staff' | 'flowers' | 'book' | 'lantern', side: 'right' | 'left', fill: [...] } */
  constructor(o = {}) {
    this.o = o; this.height = o.height || 1.72; this.k = this.height / 1.72; this.build = o.build || 1;
    this.c = { skin: '#f6c9a4', hair: '#7a4f2c', top: '#f8f4ea', stripes: null, legs: '#4a6fb0', shoes: '#8a5a34', hat: '#e2443c', coat: '#d9a441', scarf: '#e2443c', prop: '#b98a52', bag: '#d9b97a', ...(o.colours || {}) };
    this.group = new THREE.Group(); this.group.matrixAutoUpdate = false; this.parts = {}; this.cloths = []; this.J = {}; this.A = {}; this.issues = [];
  }
  /** stride (two steps), metres, at a speed: a walk lengthens a little with speed, a run a lot */
  strideFor(v) { const g = sm(2.2, 3.0, v); return this.k * (v < 0.3 ? 1.0 : lerp(0.9 + 0.32 * v, 1.5 + 0.42 * v, g)); }

  attach(W) {
    this.W = W; const k = this.k, o = this.o, b = this.build, c = this.c, mat = W.pencil.line, both = W.pencil.both;
    let verts = 0;
    const cap = (r, len, sx = 1, sz = 1) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 12).translate(0, len / 2, 0).scale(sx, 1, sz);
    /** (a turned piece's profile runs from the bottom up, or its faces point inward) a part: geometry in its own space (y runs along it, z is its front), a pencil (or fn), its slant */
    const part = (name, g, colour, a = [0.62, 1, 0.34], bb = [-0.78, 1, 0.22], m = mat) => {
      g = g.index ? g : g; g = knead(g, 0.003 * k, 9, verts + 3);
      if (g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal'].includes(n)) g.deleteAttribute(n);
      g.computeVertexNormals(); field(g, a, bb); hue(g, colour);
      const mesh = new THREE.Mesh(g, m); mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
      if (this.parts[name]) { this.parts[name].add(mesh); mesh.matrixAutoUpdate = true; } else { this.group.add(mesh); this.parts[name] = mesh; }
      verts += g.attributes.position.count;
      return mesh;
    };
    const striped = (base, len) => (c.stripes ? (x, y) => (Math.floor((y / k) / 0.075) % 2 ? lin(c.stripes) : lin(base)) : base);
    const arm = o.sleeves === 'short' ? 'skin' : 'top', legKind = o.legs || 'trousers';
    part('pelvis', cap(0.11 * k, 0.2 * k, 1.35 * b, 1), legKind === 'skirt' ? c.legs : c.legs);
    part('chest', cap(0.12 * k, 0.325 * k, 1.4 * b, 0.95), striped(c.top), [0.1, 1, 0.05], [1, 0.3, 0.2]);
    part('neck', cap(0.047 * k, 0.13 * k), c.skin);
    part('head', new THREE.SphereGeometry(0.105 * k, 16, 12).scale(0.92, 1.1, 1), c.skin, [1, 0.3, 0.1], [0.2, 1, 0.3]);
    // a face, for the views that see it: eyes, a nose, ears
    for (const s of [-1, 1]) {
      part('head', ball(0.011 * k, 1).translate(s * 0.034 * k, 0.012 * k, 0.094 * k), '#3a2c2a');
      part('head', ball(0.02 * k, 1).scale(0.6, 1, 0.8).translate(s * 0.097 * k, 0, -0.005 * k), c.skin);
    }
    part('head', ball(0.016 * k, 1).scale(0.8, 1, 1.1).translate(0, -0.012 * k, 0.103 * k), c.skin);
    for (const s of ['L', 'R']) {
      part('upperArm' + s, cap(0.046 * k, 0.28 * k), o.sleeves === 'short' ? striped(c.top) : striped(c.top), [0.1, 1, 0.1], [1, 0.4, 0.2]);
      part('foreArm' + s, cap(0.038 * k, 0.25 * k), arm === 'skin' ? c.skin : striped(c.top), [0.1, 1, 0.1], [1, 0.4, 0.2]);
      part('hand' + s, ball(0.042 * k, 2).scale(0.85, 1.1, 0.7), c.skin);
      const thighC = legKind === 'trousers' ? c.legs : c.skin, shinC = legKind === 'trousers' ? c.legs : (c.socks || c.skin);
      part('thigh' + s, cap(0.072 * k, 0.45 * k), thighC, [0.1, 1, 0.05], [1, 0.4, 0.2]);
      part('shin' + s, cap(0.052 * k, 0.42 * k), shinC, [0.1, 1, 0.05], [1, 0.4, 0.2]);
      // the shoe runs heel → toe along y, its top toward z
      part('foot' + s, knead(block(0.095 * k, 0.24 * k, 0.085 * k, 0.04 * k, 0.03), 0.004 * k, 9, s === 'L' ? 3 : 4).translate(0, 0.1 * k, 0.012 * k), c.shoes, [0, 0.2, 1], [1, 0.4, 0]);
    }
    if (legKind === 'skirt') part('pelvis', turned([[0, -0.44], [0.2, -0.44], [0.225, -0.42], [0.19, -0.18], [0.15, 0.08], [0.135, 0.2], [0, 0.2]].map(([r, y]) => [r * k * b, y * k]), 16).scale(1, 1, 0.85).translate(0, 0.08 * k, 0), c.legs, [0, 1, 0.05], [1, 0.3, 0]);
    if (legKind === 'shorts') for (const s of ['L', 'R']) part('thigh' + s, cap(0.08 * k, 0.2 * k).translate(0, -0.02 * k, 0), c.legs);
    // hair and hats
    const hair = o.hair === undefined ? 'short' : o.hair, hat = o.hat;
    if (hair) part('head', new THREE.SphereGeometry(0.113 * k, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.62).scale(0.97, 1.08, 1.05).translate(0, 0.008 * k, -0.01 * k), c.hair, [0.1, 1, -0.3], [1, 0.4, 0]);
    if (hair === 'long') part('head', cap(0.08 * k, 0.24 * k, 1.25, 0.6).rotateX(0.15).translate(0, -0.27 * k, -0.06 * k), c.hair, [0.1, 1, 0], [1, 0.3, 0]);
    if (hair === 'bun') part('head', ball(0.05 * k, 2).translate(0, 0.07 * k, -0.1 * k), c.hair);
    if (hair === 'curly') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; part('head', ball(0.04 * k, 1).translate(Math.cos(a) * 0.085 * k, 0.05 * k + Math.sin(i * 2.1) * 0.02 * k, Math.sin(a) * 0.08 * k - 0.02 * k), c.hair); }
    if (hat) {
      const kind = hat.kind || 'beret', hc = c.hat;
      if (kind === 'beret') { part('head', ball(1, 3).scale(0.125 * k, 0.045 * k, 0.12 * k).rotateZ(0.2).translate(0.012 * k, 0.085 * k, -0.005 * k), hc, [1, 0.2, 0.3], [0.2, 0.2, 1]); part('head', ball(0.012 * k, 1).translate(0.02 * k, 0.13 * k, 0), hc); }
      else if (kind === 'cap') { part('head', new THREE.SphereGeometry(0.12 * k, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.85, 1.04).translate(0, 0.03 * k, -0.004 * k), hc); part('head', block(0.15 * k, 0.012 * k, 0.1 * k, 0.005 * k, 0.03).translate(0, 0.035 * k, 0.12 * k), hc); }
      else if (kind === 'beanie') { part('head', new THREE.SphereGeometry(0.122 * k, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.44).rotateX(-0.42).scale(1, 1.12, 1.04).translate(0, 0.03 * k, -0.012 * k), hc, [0, 1, 0], [1, 0.2, 0.3]); part('head', turned([[0.118, 0], [0.124, 0.012], [0.124, 0.032], [0.118, 0.044]].map(([r, y]) => [r * k, y * k]), 16).rotateX(-0.42).scale(1, 1, 1.04).translate(0, 0.04 * k, -0.008 * k), hc); } // (pushed back off the brow: the face shows)
      else { const r = (hat.r || (kind === 'straw' ? 0.22 : 0.18)) * k; part('head', turned([[0, 0], [r, 0], [r * 1.02, 0.012 * k], [0.11 * k, 0.018 * k], [0.105 * k, 0.1 * k], [0, 0.11 * k]], 20).translate(0, 0.05 * k, 0), hc, [1, 0.1, 0.2], [0.2, 0.1, 1]); if (hat.band) part('head', turned([[0.108 * k, 0], [0.11 * k, 0.025 * k], [0, 0.025 * k]], 20).translate(0, 0.07 * k, 0), hat.band); }
    }
    // a satchel at the hip and its strap across the chest
    if (o.bag) {
      const s = o.bag === 'left' ? 1 : -1;
      part('pelvis', knead(block(0.26 * k, 0.2 * k, 0.08 * k, 0.03 * k, 0.04), 0.004, 9, 7).translate(s * 0.2 * k * b, 0.05 * k, 0.02 * k), c.bag, [1, 0.2, 0], [0, 1, 0.3]);
      part('chest', roll([new THREE.Vector3(-s * 0.15 * k * b, 0.42 * k, 0.03 * k), new THREE.Vector3(0, 0.22 * k, 0.135 * k), new THREE.Vector3(s * 0.17 * k * b, -0.08 * k, 0.11 * k)], 0.012 * k, { around: 5, every: 0.05 }), c.bag);
      part('chest', roll([new THREE.Vector3(-s * 0.15 * k * b, 0.42 * k, -0.01 * k), new THREE.Vector3(0, 0.2 * k, -0.135 * k), new THREE.Vector3(s * 0.17 * k * b, -0.08 * k, -0.11 * k)], 0.012 * k, { around: 5, every: 0.05 }), c.bag);
    }
    if (o.neckerchief) part('neck', ball(1, 2).scale(0.07 * k, 0.03 * k, 0.07 * k).translate(0, 0.02 * k, 0.01 * k), o.neckerchief);
    const carry = o.carry;
    if (carry) {
      const pc = carry.colour || c.prop;
      if (carry.kind === 'staff') part('carry', new THREE.CylinderGeometry(0.014 * k, 0.018 * k, 1.42 * k, 6, 4).translate(0, 0.71 * k, 0), pc, [0, 1, 0]);
      else if (carry.kind === 'basket') { part('carry', turned([[0, 0], [0.13, 0], [0.17, 0.14], [0.155, 0.15], [0, 0.15]].map(([r, y]) => [r * k, y * k]), 14).scale(1.3, 1, 1).translate(0, -0.3 * k, 0), pc, [0, 1, 0.1], [1, 0.1, 0]); part('carry', new THREE.TorusGeometry(0.12 * k, 0.01 * k, 5, 14, Math.PI).rotateY(Math.PI / 2).translate(0, -0.15 * k, 0).scale(1, 1.1, 1.3), pc); for (let i = 0; i < 7; i++) part('carry', ball(0.04 * k, 1).translate((Math.sin(i * 2.3)) * 0.1 * k, -0.15 * k, Math.cos(i * 1.7) * 0.08 * k), (carry.fill || ['#e8554e', '#f2c12b', '#8cc063'])[i % (carry.fill || [0, 0, 0]).length]); }
      else if (carry.kind === 'flowers') { part('carry', roll([new THREE.Vector3(0, 0.02 * k, 0), new THREE.Vector3(0, -0.2 * k, 0.02 * k)], 0.02 * k, { around: 5 }), '#5fa04a'); for (let i = 0; i < 9; i++) part('carry', ball(0.032 * k, 1).translate(Math.sin(i * 2.4) * 0.05 * k, 0.05 * k + (i % 3) * 0.02 * k, Math.cos(i * 2.4) * 0.05 * k), (carry.fill || ['#e8554e', '#f08ab0', '#f3efe6', '#f2c12b'])[i % (carry.fill || [0, 0, 0, 0]).length]); }
      else if (carry.kind === 'book') part('carry', block(0.03 * k, 0.22 * k, 0.16 * k, 0.008 * k, 0.03).translate(0.0, -0.1 * k, 0), pc, [0, 1, 0]);
      else if (carry.kind === 'lantern') { part('carry', turned([[0.05, 0], [0.06, 0.02], [0.06, 0.15], [0.03, 0.18], [0, 0.18]].map(([r, y]) => [r * k, y * k]), 8).translate(0, -0.25 * k, 0), '#2f3a44'); part('carry', turned([[0.045, 0], [0.045, 0.11], [0, 0.11]].map(([r, y]) => [r * k, y * k]), 8).translate(0, -0.23 * k, 0), '#fff3b0'); }
      else part('carry', knead(block(0.26 * k, 0.2 * k, 0.12 * k, 0.03 * k, 0.04), 0.004, 9, 5).translate(0, -0.2 * k, 0), pc, [1, 0.2, 0], [0, 1, 0.3]);
    }
    // cloth: the coat, the scarf
    const cloth = (name, cl2, m = both) => { const mesh = new THREE.Mesh(cl2.geometry, m); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh); this.cloths.push(cl2); this[name] = cl2; verts += cl2.cols * cl2.rows; };
    if (o.coat) cloth('coat', new Cloth(20, 10, !o.coat.open, c.coat, 1.4, (o.coat.length ?? 0.6) * 1.2));
    if (o.scarf) cloth('scarf', new Cloth(3, 8, false, c.scarf, 0.15, (o.scarf.length ?? 0.5)));
    this.count = verts;
    W.scene.add(this.group);
  }

  /** Put the body where it is: { t, x, y, z (the ground under it), hx, hz (the way it faces), phase (strides walked),
   *  stride (m), speed (m/s), at(ds) → { x, z } the path ds metres ahead (behind if negative), ground(x, z), look: [x, y, z] } */
  pose(p) {
    const k = this.k, o = this.o, J = this.J, A = this.A, b = this.build, v = p.speed || 0, up = V().set(0, 1, 0);
    const g = sm(2.2, 3.0, v), m = sm(0.05, 0.5, v), tau = Math.PI * 2;
    const f = V().set(p.hx, 0, p.hz).normalize(), left = V().set(p.hz, 0, -p.hx).normalize();
    const L = p.stride, duty = lerp(0.62, 0.3, g), l1 = 0.45 * k, l2 = 0.42 * k, ankleH = 0.07 * k, hipHalf = 0.09 * k * b;
    this.issues = [];
    const feet = {};
    for (const [s, side, off] of [['L', 1, 0], ['R', -1, 0.5]]) {
      const ph = p.phase + off, q = ph - Math.floor(ph), stance = q < duty, u = stance ? 0 : (q - duty) / (1 - duty);
      const ds = lerp(0.03 * side * k, -q * L + (duty * L) / 2 + (stance ? 0 : L * (u * u * (3 - 2 * u))), m);
      const w = p.at(ds), lat = hipHalf * lerp(1.05, lerp(0.9, 0.45, g), m) * side;
      const x = w.x + left.x * lat, z = w.z + left.z * lat, gy = p.ground(x, z);
      const heel = stance ? sm(duty * 0.72, duty, q) : 0;
      const lift = stance ? heel * lerp(0.055, 0.12, g) * k : lerp(lerp(0.055, 0.12, g) * k, 0, sm(0, 0.3, u)) + Math.sin(Math.PI * u) * lerp(0.085, 0.24, g) * k;
      const pitch = stance ? heel * rad(38) : lerp(rad(38), rad(-16), sm(0.1, 0.85, u)) * (1 - sm(0.93, 1, u) * 0.7);
      feet[s] = { ankle: V().set(x, gy + ankleH + lift * m, z), pitch: pitch * m, stance, gy, q, flat: stance && heel < 0.02 };
    }
    const reach = (l1 + l2) * 0.992; let hy = p.y + (0.93 - 0.012) * k;
    const sway = Math.sin(tau * p.phase + 0.6) * 0.016 * k * m * (1 - g * 0.5), twist = rad(lerp(5, 9, g)) * m * Math.cos(tau * p.phase);
    const hx = p.x + left.x * sway, hz = p.z + left.z * sway;
    for (const [s, side] of [['L', 1], ['R', -1]]) {
      const a = feet[s].ankle, jx = hx + left.x * hipHalf * side, jz = hz + left.z * hipHalf * side, d2 = (a.x - jx) ** 2 + (a.z - jz) ** 2;
      const top = a.y + Math.sqrt(Math.max(0.01, reach * reach - d2));
      if (feet[s].stance || top < hy) hy = Math.min(hy, top) - (top < hy + 0.03 ? 0.25 * Math.max(0, 0.03 - Math.abs(top - hy)) : 0);
    }
    hy += g * 0.03 * k * Math.sin(2 * tau * p.phase + 1.2) - g * 0.03 * k + Math.sin((p.t || 0) * 1.3) * 0.003 * k * (1 - m);
    const hips = J.hips = V().set(hx, hy, hz);
    const fP = f.clone().applyAxisAngle(up, twist), leftP = left.clone().applyAxisAngle(up, twist);
    const lean = rad(lerp(3, 12, g) * m + 1), spine = up.clone().multiplyScalar(Math.cos(lean)).addScaledVector(f, Math.sin(lean));
    const ct = -twist * 1.25, fC = f.clone().applyAxisAngle(up, ct), leftC = left.clone().applyAxisAngle(up, ct);
    A.twist = deg(twist - ct); A.lean = deg(lean);
    J.chest = hips.clone().addScaledVector(spine, 0.12 * k); J.neck = hips.clone().addScaledVector(spine, 0.47 * k);
    for (const [s, side] of [['L', 1], ['R', -1]]) {
      const H = J['hip' + s] = hips.clone().addScaledVector(leftP, hipHalf * side), ft = feet[s], d = V().subVectors(ft.ankle, H);
      const vf = d.dot(f), vu = d.dot(up), vl = d.dot(left); let len = Math.hypot(vf, vu);
      if (len > l1 + l2 - 0.002) { if (len > l1 + l2 + 0.02) this.issues.push(`${s === 'L' ? 'left' : 'right'} foot is ${((len - l1 - l2) * 100).toFixed(0)} cm out of the leg's reach`); len = l1 + l2 - 0.002; }
      const flex = Math.PI - Math.acos(cl((l1 * l1 + l2 * l2 - len * len) / (2 * l1 * l2), -1, 1));
      const th = Math.atan2(vf, -vu) + Math.acos(cl((l1 * l1 + len * len - l2 * l2) / (2 * l1 * len), -1, 1)), sh = th - flex;
      const K = J['knee' + s] = H.clone().addScaledVector(f, Math.sin(th) * l1).addScaledVector(up, -Math.cos(th) * l1).addScaledVector(left, vl * (l1 / (l1 + l2)));
      const An = J['ankle' + s] = K.clone().addScaledVector(f, Math.sin(sh) * l2).addScaledVector(up, -Math.cos(sh) * l2).addScaledVector(left, vl * (l2 / (l1 + l2)));
      A['knee' + s] = deg(flex); A['hip' + s] = deg(th);
      const fd = f.clone().multiplyScalar(Math.cos(ft.pitch)).addScaledVector(up, -Math.sin(ft.pitch));
      J['heel' + s] = An.clone().addScaledVector(fd, -0.055 * k).addScaledVector(up, -ankleH + 0.04 * k); J['toe' + s] = J['heel' + s].clone().addScaledVector(fd, 0.2 * k);
      A['foot' + s] = { flat: ft.flat, off: An.y - ankleH - ft.gy };
      const fu = up.clone().multiplyScalar(Math.cos(ft.pitch)).addScaledVector(f, Math.sin(ft.pitch));
      this.#limb('thigh' + s, H, K, fP); this.#limb('shin' + s, K, An, fP); this.#limb('foot' + s, J['heel' + s], J['toe' + s], fu);
    }
    this.#limb('pelvis', hips.clone().addScaledVector(up, -0.09 * k), hips.clone().addScaledVector(spine, 0.11 * k), fP);
    this.#limb('chest', J.chest, hips.clone().addScaledVector(spine, 0.445 * k), fC);
    let yaw = Math.sin((p.t || 0) * 0.45) * rad(9) * (1 - m), pitch = 0;
    if (p.look) { const d = V().set(p.look[0] - hips.x, 0, p.look[2] - hips.z).normalize(); yaw = cl(Math.atan2(d.dot(left), d.dot(f)), rad(-70), rad(70)); pitch = cl(Math.atan2(p.look[1] - (hy + 0.66 * k), Math.hypot(p.look[0] - hips.x, p.look[2] - hips.z)), rad(-30), rad(30)); }
    A.neckYaw = deg(yaw - ct); A.neckPitch = deg(pitch);
    const fH = f.clone().applyAxisAngle(up, yaw), leftH = left.clone().applyAxisAngle(up, yaw), upH = up.clone().applyAxisAngle(leftH, -pitch);
    const head = J.head = J.neck.clone().addScaledVector(up, 0.19 * k).addScaledVector(fH, 0.015 * k);
    this.#limb('neck', J.neck.clone().addScaledVector(up, -0.03 * k), head.clone().addScaledVector(up, -0.07 * k), fC);
    this.#place('head', head, upH, fH.clone().applyAxisAngle(leftH, -pitch));
    const amp = rad(lerp(24, 44, g)) * m, carry = o.carry, cs = carry ? (carry.side === 'left' ? 'L' : 'R') : null;
    for (const [s, side] of [['L', 1], ['R', -1]]) {
      const Sh = J['shoulder' + s] = hips.clone().addScaledVector(spine, 0.43 * k).addScaledVector(leftC, 0.19 * k * b * side);
      let sig = -side * amp * Math.cos(tau * p.phase) + rad(4), el = rad(lerp(14, 80, g) * m + 8) + Math.max(0, sig) * 0.5;
      if (cs === s) { const hold = { staff: [30, 62], flowers: [18, 70], book: [8, 60], basket: [10, 28], lantern: [14, 30], bag: [10, 30] }[carry.kind] || [12, 38]; sig = rad(hold[0]) + sig * 0.2; el = rad(hold[1]); }
      const ab = rad(7), dU = up.clone().multiplyScalar(-Math.cos(sig)).addScaledVector(fC, Math.sin(sig)).addScaledVector(leftC, side * Math.sin(ab)).normalize();
      const E = J['elbow' + s] = Sh.clone().addScaledVector(dU, 0.28 * k);
      const dF = up.clone().multiplyScalar(-Math.cos(sig + el)).addScaledVector(fC, Math.sin(sig + el)).addScaledVector(leftC, -side * 0.08).normalize();
      const Wr = J['wrist' + s] = E.clone().addScaledVector(dF, 0.25 * k); J['hand' + s] = Wr.clone().addScaledVector(dF, 0.05 * k);
      A['shoulder' + s] = deg(sig); A['elbow' + s] = deg(el);
      this.#limb('upperArm' + s, Sh, E, fC); this.#limb('foreArm' + s, E, Wr, fC); this.#place('hand' + s, J['hand' + s], dF, fC);
    }
    if (cs) {
      const h = J['hand' + cs], sw = Math.sin(2 * tau * p.phase) * 0.05 * m;
      if (carry.kind === 'staff') { const d = up.clone().addScaledVector(fC, 0.2).normalize(); this.#place('carry', h.clone().addScaledVector(d, -0.95 * k), d, fC); }
      else if (carry.kind === 'flowers' || carry.kind === 'book') this.#place('carry', h, up.clone().addScaledVector(fC, 0.3).normalize(), fC);
      else { const d = up.clone().addScaledVector(fC, -sw).normalize(); this.#place('carry', h, d, fC); }
    }
    const wind = this.W.wind, t = p.t || 0;
    if (this.coat) {
      const c = o.coat, len = (c.length ?? 0.6) * (hy - p.y + 0.46 * k), flare = c.flare ?? 0.4, open = c.open ? 1 - (c.open === true ? 100 : c.open) / 360 : 1, collar = hips.clone().addScaledVector(spine, 0.455 * k), C = this.coat;
      C.write((i, j, out) => {
        const a = (C.wrap ? i / C.cols : i / (C.cols - 1)) * tau * open - Math.PI * open, vv = j / (C.rows - 1), back = 0.5 + 0.5 * Math.cos(a);
        const grow = 1 + flare * Math.pow(vv, 0.8), sh = Math.min(1, vv * 5);
        const rx = lerp(0.085, 0.215 * b, sh) * k * grow, rz = lerp(0.075, 0.15, sh) * k * (1 + flare * 1.25 * Math.pow(vv, 0.8));
        const v2 = vv * vv, trail = v2 * (0.03 + 0.085 * v + 0.05 * g) * k * (0.35 + 0.65 * back);
        const flut = v2 * (0.012 + 0.02 * m + 0.02 * wind.strength) * k * Math.sin(2 * tau * p.phase - vv * 3 + a * 2) + v2 * 0.03 * wind.strength * k * Math.sin(t * 3.1 + a * 3 + vv * 4);
        out.copy(collar).addScaledVector(fC, -rz * Math.cos(a) - trail).addScaledVector(leftC, rx * Math.sin(a)).addScaledVector(up, -len * vv * (1 - 0.1 * g * v2 * back))
          .addScaledVector(fC, -Math.cos(a) * flut).addScaledVector(leftC, Math.sin(a) * flut);
        out.x += wind.x * v2 * 0.05 * wind.strength * k; out.z += wind.z * v2 * 0.05 * wind.strength * k;
      });
    }
    if (this.scarf) {
      const len = (o.scarf.length ?? 0.5) * k, C = this.scarf, root = J.neck.clone().addScaledVector(fC, -0.07 * k).addScaledVector(up, 0.02 * k);
      C.write((i, j, out) => {
        const vv = j / (C.rows - 1), w = (i - 1) * 0.045 * k, lift = cl(0.25 + 0.2 * v + 0.25 * wind.strength, 0, 0.92);
        const wave = Math.sin(t * 4.2 + vv * 5 + p.phase * tau) * 0.05 * k * vv;
        out.copy(root).addScaledVector(fC, -vv * len * lift).addScaledVector(up, -vv * len * (1 - lift) * 0.9 + wave * 0.5 + w * 0.6).addScaledVector(leftC, w * 0.5 + wave);
      });
    }
    return this;
  }
  #limb(name, a, b, front) {
    const m = this.parts[name]; if (!m) return;
    const y = V().subVectors(b, a).normalize(), z = front.clone().addScaledVector(y, -front.dot(y));
    if (z.lengthSq() < 1e-6) z.set(1, 0, 0).addScaledVector(y, -y.x); z.normalize();
    m.matrix.makeBasis(V().crossVectors(y, z), y, z).setPosition(a); m.matrixWorld.copy(m.matrix);
    for (const ch of m.children) ch.matrixWorld.copy(m.matrix);
  }
  #place(name, at, upDir, front) { this.#limb(name, at, at.clone().add(upDir), front); }

  /** what is wrong with the pose just made, as sentences (none: the body is possible) */
  audit() {
    const A = this.A, out = [...this.issues], side = { L: 'left', R: 'right' };
    const inside = (name, val, lim) => { if (val < lim[0] - 0.5 || val > lim[1] + 0.5) out.push(`${name} at ${val.toFixed(0)}° is outside ${lim[0]}°…${lim[1]}°`); };
    for (const s of ['L', 'R']) {
      inside(`${side[s]} knee`, A['knee' + s], LIM.knee); inside(`${side[s]} elbow`, A['elbow' + s], LIM.elbow);
      inside(`${side[s]} hip`, A['hip' + s], LIM.hip); inside(`${side[s]} shoulder`, A['shoulder' + s], LIM.shoulder);
      const ft = A['foot' + s];
      if (ft.flat && Math.abs(ft.off) > 0.035) out.push(`${side[s]} foot is ${(ft.off * 100).toFixed(0)} cm ${ft.off > 0 ? 'above' : 'under'} the ground while it stands on it`);
    }
    inside('neck (turn)', A.neckYaw, LIM.neckYaw); inside('neck (nod)', A.neckPitch, LIM.neckPitch); inside('chest against hips', A.twist, LIM.twist); inside('lean', A.lean, LIM.lean);
    return out;
  }

  /** the cast sheet: the walker from every side, in every gait. yaw 0 is the eye behind them; negative, on their right. */
  cast() {
    const w = 1.4, r = 4.2;
    return [
      { label: 'front', yaw: 180, speed: 0, phase: 0 }, { label: 'front 3/4, facing right', yaw: -135, speed: 0, phase: 0 }, { label: 'side, facing right', yaw: -90, speed: 0, phase: 0 },
      { label: 'back 3/4, facing right', yaw: -45, speed: 0, phase: 0 }, { label: 'back', yaw: 0, speed: 0, phase: 0 }, { label: 'back 3/4, facing left', yaw: 45, speed: 0, phase: 0 },
      { label: 'side, facing left', yaw: 90, speed: 0, phase: 0 }, { label: 'front 3/4, facing left', yaw: 135, speed: 0, phase: 0 },
      ...[0, 0.25, 0.5, 0.75].map((ph) => ({ label: `walk ${ph}, facing right`, yaw: -90, speed: w, phase: ph })),
      { label: 'walk 0.1, facing left', yaw: 90, speed: w, phase: 0.1 }, { label: 'walk 0.6, facing left', yaw: 90, speed: w, phase: 0.6 },
      { label: 'walk, from behind', yaw: 0, speed: w, phase: 0.3 }, { label: 'walk, front 3/4', yaw: -145, speed: w, phase: 0.8 },
      ...[0.05, 0.3, 0.55, 0.8].map((ph) => ({ label: `run ${ph}, facing right`, yaw: -90, speed: r, phase: ph })),
      { label: 'run, facing left', yaw: 90, speed: r, phase: 0.2 }, { label: 'run, back 3/4', yaw: 35, speed: r, phase: 0.45 },
    ];
  }
}
