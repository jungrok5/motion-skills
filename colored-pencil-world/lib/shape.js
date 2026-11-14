// colored-pencil-world · shape.js — shapes for things made by hand: nothing flat or sharp. Balls, turned pieces,
// rounded blocks, rolled coils, arched panels, and a way to knead any of them a little out of true, so that the
// contour pass finds a living edge and the strokes bend over a soft form.
//
// Adapted from "Coloured pencil" (src/shape.js, MIT © 2026 Patch — LICENSE-coloured-pencil); `arched`, `slab`,
// `prism` and the vertex welding (in place of three's addons) are this skill's.
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const h2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
/** smooth value noise, about -1..1 */
export function noise(x, y) {
  const i = Math.floor(x), j = Math.floor(y); let u = x - i, v = y - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** joins points that share a place (one skin over the whole piece), so it is lit as one soft thing */
export function weld(g, tol = 1e-4) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, map = new Map(), pos = [], idx = [], k = 1 / tol;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${Math.round(x * k)},${Math.round(y * k)},${Math.round(z * k)}`;
    let j = map.get(key);
    if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(x, y, z); }
    idx.push(j);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setIndex(idx); out.computeVertexNormals();
  return out;
}
export const smooth = (g) => weld(g);
const n3 = (x, y, z, s) => 0.6 * noise(x + s, y + z * 0.71) + 0.6 * noise(z - s * 1.3, x * 0.83 - y * 0.57 + 5);
/** Kneads a piece out of true: `amount` in or out, in lumps `grain` to the metre; `dents` thumb presses of about `press` across. */
export function knead(g, amount = 0.02, grain = 1.6, seed = 1, dents = 0, press = 0.3) {
  if (!g.index) g = weld(g);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = amount * n3(v.x * grain, v.y * grain, v.z * grain, seed);
    p.setXYZ(i, v.x + n.getX(i) * k, v.y + n.getY(i) * k, v.z + n.getZ(i) * k);
  }
  const rand = rng(seed * 7 + 3);
  for (let k = 0; k < dents; k++) {
    const j = Math.floor(rand() * p.count), r = press * (0.6 + 0.8 * rand());
    c.fromBufferAttribute(p, j); d.fromBufferAttribute(n, j);
    for (let i = 0; i < p.count; i++) {
      const far = v.fromBufferAttribute(p, i).distanceTo(c);
      if (far < r) { const push = r * 0.2 * (1 - (far / r) ** 2) ** 2; p.setXYZ(i, v.x - d.x * push, v.y - d.y * push, v.z - d.z * push); }
    }
  }
  g.computeVertexNormals();
  return g;
}
/** a ball of clay */
export const ball = (r = 1, detail = 3) => weld(new THREE.IcosahedronGeometry(r, detail));
/** a piece turned on its axis: [[radius, height], …] from the bottom up */
export const turned = (profile, around = 20) => weld(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), around));
/** a block with every edge and corner rounded off, centred on the origin */
export function block(w, h, d, round = 0.06, cell = 0.14) {
  round = Math.min(round, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const seg = (s) => Math.max(2, Math.round(s / cell));
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d)), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  const hx = w / 2 - round, hy = h / 2 - round, hz = d / 2 - round;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.min(hx, Math.max(-hx, v.x)), Math.min(hy, Math.max(-hy, v.y)), Math.min(hz, Math.max(-hz, v.z)));
    v.sub(c);
    if (v.lengthSq() > 1e-12) v.setLength(round);
    p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  return weld(g);
}
/** a thin panel w wide and h high standing on y = 0, facing +z, `deep` thick, its top a round arch (arch: true) or square */
export function arched(w, h, deep = 0.08, arch = true) {
  const s = new THREE.Shape(), r = w / 2, top = arch ? Math.max(h - r, 0) : h;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, top);
  if (arch) s.absarc(0, top, r, 0, Math.PI, false); else s.lineTo(-r, top);
  s.lineTo(-r, 0);
  return new THREE.ExtrudeGeometry(s, { depth: deep, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -deep / 2);
}
/** a prism: a closed outline [[x, y], …] in the xy plane, `deep` along z, centred on z = 0 (a gable end, a sign, a sail) */
export function prism(outline, deep = 0.1) {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: deep, bevelEnabled: false }).translate(0, 0, -deep / 2);
}
/** a coil rolled between the palms: through `points`, `radius` thick (a number, or fn of how far along 0..1), ends rounded */
export function roll(points, radius, { around = 8, every = 0.14, closed = false, flat = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal'), len = curve.getLength(), R = typeof radius === 'function' ? radius : () => radius;
  const n = Math.max(3, Math.round(len / every)), e0 = Math.min(R(0), len * 0.35), e1 = Math.min(R(1), len * 0.35), stops = [];
  if (closed) for (let i = 0; i < n; i++) stops.push(i / n);
  else {
    for (const k of [0, 0.1, 0.32, 0.66]) stops.push((k * e0) / len);
    for (let i = 0; i <= n; i++) stops.push((e0 + (len - e0 - e1) * (i / n)) / len);
    for (const k of [0.66, 0.32, 0.1, 0]) stops.push(1 - (k * e1) / len);
  }
  const pos = [], index = [], p = new THREE.Vector3(), t = new THREE.Vector3(), nrm = new THREE.Vector3(0, 1, 0), b = new THREE.Vector3(), m = stops.length;
  curve.getTangentAt(0, t);
  if (Math.abs(t.y) > 0.9) nrm.set(1, 0, 0);
  stops.forEach((u) => {
    curve.getPointAt(u, p); curve.getTangentAt(u, t);
    nrm.addScaledVector(t, -nrm.dot(t)).normalize(); b.crossVectors(t, nrm);
    const s = u * len; let r = R(u);
    if (!closed) { if (s < e0) r *= Math.sqrt(Math.max(0, 1 - (1 - s / e0) ** 2)); else if (len - s < e1) r *= Math.sqrt(Math.max(0, 1 - (1 - (len - s) / e1) ** 2)); }
    for (let k = 0; k < around; k++) {
      const a = (k / around) * TAU, ox = nrm.x * Math.cos(a) * r + b.x * Math.sin(a) * r, oy = nrm.y * Math.cos(a) * r + b.y * Math.sin(a) * r, oz = nrm.z * Math.cos(a) * r + b.z * Math.sin(a) * r;
      pos.push(p.x + ox, p.y + oy * flat, p.z + oz);
    }
  });
  for (let i = 0; i < (closed ? m : m - 1); i++) for (let k = 0; k < around; k++) {
    const j = (i + 1) % m, k1 = (k + 1) % around, a = i * around + k, a1 = i * around + k1, c = j * around + k, c1 = j * around + k1;
    index.push(a, a1, c, a1, c1, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(index);
  return weld(g);
}
/** scales, turns (about the upright, radians) and moves a piece, in that order */
export function put(g, x, y, z, turn = 0, scale = 1) {
  if (scale !== 1) g.scale(scale, scale, scale);
  if (turn) g.rotateY(turn);
  return g.translate(x, y, z);
}
