// swarm-world · kit.js — the low-poly geometry kit. Primitives with flat vertex colours, merged into one geometry per kind,
// so each kind is one InstancedMesh however many there are. Shapes sit on y = 0 (they grow up from the ground when built).
// The props at the bottom are examples of the style (round tree, pine, rock, cloud, lamp, fence, house + roof): use them
// when the topic has them, and draw your own the same way when it does not (see references/KIT.md).
// Geometry helpers adapted from swarm-build's examples/3d.html (MIT © Harnoor Singh, lib/LICENSE-swarm-build).
import * as THREE from './three.module.min.js';
import { h2 } from './math.js';

export const C = (hex) => new THREE.Color(hex);

// one coloured piece: scale → rotate (x, y, z) → move. `shade(y, i)` multiplies the colour per vertex (a lit top, a dark base)
export function part(g, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shade = null } = {}) {
  g = g.index ? g.toNonIndexed() : g.clone();
  g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), c = C(color), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) (shade ? tmp.copy(c).multiplyScalar(shade(g.attributes.position.getY(i), i)) : c).toArray(col, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.normal) g.deleteAttribute('normal');
  return g;
}
// pieces → one flat-shaded geometry
export function merge(parts) {
  parts = parts.flat(Infinity);
  const n = parts.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

// primitives, standing on y = 0
export const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
export const Cyl = (r0, r1, h, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n).translate(0, h / 2, 0);
export const Cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n).translate(0, h / 2, 0);
export const Ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
export const Dodeca = (r) => new THREE.DodecahedronGeometry(r, 0);
export const Dome = (r, w = 14, h = 7) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);
export const Ball = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
export const Ring = (r, tube, n = 16, m = 6) => new THREE.TorusGeometry(r, tube, m, n);
export function Gable(w, d, h) {   // a pitched roof, ridge along x
  const a = w / 2, b = d / 2, v = [
    -a, 0, b, a, 0, b, a, h, 0, -a, 0, b, a, h, 0, -a, h, 0,
    a, 0, -b, -a, 0, -b, -a, h, 0, a, 0, -b, -a, h, 0, a, h, 0,
    -a, 0, -b, -a, 0, b, -a, h, 0, a, 0, b, a, 0, -b, a, h, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}
export function Sail(h, w) {   // a triangle in the y–z plane, two-sided
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, h, 0, 0, 0, w, 0, 0, 0, 0, 0, w, 0, h, 0], 3));
  return g;
}
// knock the vertices about a little: rocks, foliage, clouds
export const jitter = (g, k, sd = 0) => {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const f = 1 + (h2(p.getX(i) * 3 + sd, p.getZ(i) * 3 + p.getY(i)) - 0.5) * k; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
  return g;
};

// ── example props in the style (each returns a merged geometry) ─────────────────────────────────────────────────────────
export const props = {
  tree: (leaf = '#6fbe4a', leaf2 = '#5aa63c', trunk = '#7a5134') => merge([part(Cyl(0.17, 0.26, 1.5, 6), trunk),
    part(jitter(Ico(1.35, 1), 0.22, 1), leaf, { y: 2.3, sy: 0.92 }), part(jitter(Ico(0.85, 1), 0.2, 2), leaf2, { y: 3.05, x: 0.45, z: -0.2 })]),
  pine: ({ snow = false, greens = ['#2f7a4a', '#3a8a54', '#46985e'], trunk = '#6b4a33' } = {}) => merge([part(Cyl(0.14, 0.2, 0.9, 6), trunk),
    part(Cone(1.35, 2.1, 7), greens[0], { y: 0.7 }), part(Cone(1.05, 1.8, 7), greens[1], { y: 1.75 }),
    part(Cone(snow ? 0.74 : 0.72, 1.5, 7), snow ? '#f2f6fa' : greens[2], { y: 2.75 }), ...(snow ? [part(Cone(1.08, 0.6, 7), '#eef3f8', { y: 2.95 })] : [])]),
  rock: (color = '#8e8984', seed = 4) => merge([part(jitter(Dodeca(1), 0.35, seed), color, { y: 0.55 })]),
  cloud: (color = '#ffffff') => merge([[0, 0, 0, 2.6], [2.4, -0.4, 0.4, 2.0], [-2.5, -0.5, -0.2, 2.1], [1.0, 1.3, -0.3, 1.9], [-1.1, 1.0, 0.5, 1.6], [4.2, -0.9, 0, 1.4], [-4.3, -0.9, 0.3, 1.3]]
    .map(([x, y, z, r], k) => part(jitter(Ico(r, 1), 0.14, k), color, { x, y: y + 2.4, z, sy: 0.82, shade: (py) => (py < 1.8 ? 1.25 : 1.45) }))),
  lamp: (post = '#2f3338', light = '#ffe3a1') => merge([part(Cyl(0.06, 0.08, 2.3, 6), post), part(Box(0.3, 0.34, 0.3), light, { y: 2.3 }), part(Cone(0.26, 0.2, 4), post, { y: 2.64, ry: Math.PI / 4 })]),
  fence: (post = '#8a6142', rail = '#a57955') => merge([part(Box(0.14, 0.95, 0.14), post), part(Box(0.08, 0.08, 2.4), rail, { y: 0.45, z: 1.2 }), part(Box(0.08, 0.08, 2.4), rail, { y: 0.8, z: 1.2 })]),
  // a unit house (1 × 1 × 1, white walls: tint it per instance with `color`, size it with sx / sy / sz) and its roof
  house: (win = '#43566e', door = '#7a5038') => merge([part(Box(1, 1, 1), '#ffffff'), ...[-0.25, 0.25].flatMap((x) => [part(Box(0.17, 0.22, 0.02), win, { x, y: 0.62, z: 0.505 }), part(Box(0.17, 0.22, 0.02), win, { x, y: 0.62, z: -0.505 })]),
    part(Box(0.2, 0.36, 0.02), door, { y: 0, z: 0.506 }), part(Box(0.02, 0.2, 0.15), win, { x: 0.505, y: 0.62 }), part(Box(0.02, 0.2, 0.15), win, { x: -0.505, y: 0.62 })]),
  roof: () => merge([part(Gable(1.12, 1.16, 0.45), '#ffffff'), part(Box(0.14, 0.42, 0.14), '#d8d0c6', { x: 0.28, z: -0.18, y: 0.1 })]),
};
