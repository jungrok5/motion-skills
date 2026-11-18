// Colossal mechanical walking legs (8x). Fully stateless: update(t) is a pure function of t.
//
// Kinematic chain per leg (all solved in walker-local space):
//   hip base (bolted to chassis, static)  ->  yoke (yaws about the vertical kingpin at L.hip)
//   -> thigh (pitches on the yoke trunnion, offset E outward from the kingpin)
//   -> shin (knee hinge, same horizontal axis)  ->  ball ankle  ->  foot (stays flat on the ground) -> 4 hinged toes
// The leg always lies in the vertical plane through the kingpin axis and the ankle, so every joint is a
// physically plausible single-axis hinge. Hydraulic cylinders are re-aimed between fixed anchors each frame.
//
// Rendering: every rigid part is one InstancedMesh per material (8 instances = 8 legs), so the whole set is
// ~50 draw calls. The shared weathering shader is patched to use the pre-instance local position (+ a
// per-instance offset) so grime does not swim while the instances animate.
import * as THREE from 'three';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
const E_TRUN = 2.2;            // trunnion offset from the kingpin axis (m)

// ----------------------------------------------------------------------------------------------
// geometry toolkit
// ----------------------------------------------------------------------------------------------
function xf(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}
const MIRX = new THREE.Matrix4().makeScale(-1, 1, 1);
const MIRZ = new THREE.Matrix4().makeScale(1, 1, -1);
const IDENT = new THREE.Matrix4();

function flipWinding(g) {
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name], n = a.itemSize, arr = a.array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) { const t = arr[(i + 1) * n + k]; arr[(i + 1) * n + k] = arr[(i + 2) * n + k]; arr[(i + 2) * n + k] = t; }
    }
  }
}

let _tintSeed = 1;
const _tintRnd = () => { _tintSeed = (Math.imul(_tintSeed, 1664525) + 1013904223) >>> 0; return _tintSeed / 4294967296; };
class Part {
  constructor() { this.bins = new Map(); }
  // aFx attribute: x = 1 on bevel/edge faces (edge wear), y = per-primitive paint tint
  add(geo, key, m, tint) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv' && n !== 'aFx') g.deleteAttribute(n);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.aFx) g.setAttribute('aFx', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    { const a = g.attributes.aFx.array, tv = tint ?? (0.86 + 0.24 * _tintRnd()); for (let i = 1; i < a.length; i += 2) a[i] = tv; }
    if (m) { g.applyMatrix4(m); if (m.determinant() < 0) flipWinding(g); }
    if (!this.bins.has(key)) this.bins.set(key, []);
    this.bins.get(key).push(g);
    return this;
  }
  // add + mirrored copy across the X=0 plane
  mirX(geo, key, m, tint) { const tv = tint ?? (0.86 + 0.24 * _tintRnd()); this.add(geo, key, m, tv); this.add(geo, key, MIRX.clone().multiply(m || IDENT), tv); return this; }
  build() {
    const out = {};
    for (const [k, list] of this.bins) { out[k] = BGU.mergeGeometries(list, false); list.forEach((g) => g.dispose()); }
    return out;
  }
}

function fromTris(P, flatUV = true) {
  const pos = new Float32Array(P.length * 3);
  for (let i = 0; i < P.length; i++) { pos[i * 3] = P[i][0]; pos[i * 3 + 1] = P[i][1]; pos[i * 3 + 2] = P[i][2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(P.length * 2), 2));
  return g;
}

// chamfered box (flat shaded, 44 tris) — bevels catch the wet sky reflections
function cbox(w, h, d, c = 0.05) {
  c = Math.min(c, w * 0.45, h * 0.45, d * 0.45);
  const hx = w / 2, hy = h / 2, hz = d / 2, P = [];
  const v = (sx, sy, sz, ax) => ax === 0 ? [sx * hx, sy * (hy - c), sz * (hz - c)] : ax === 1 ? [sx * (hx - c), sy * hy, sz * (hz - c)] : [sx * (hx - c), sy * (hy - c), sz * hz];
  const tri = (a, b, cc) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * (a[0] + b[0] + cc[0]) + ny * (a[1] + b[1] + cc[1]) + nz * (a[2] + b[2] + cc[2]) < 0) P.push(a, cc, b); else P.push(a, b, cc);
  };
  const quad = (a, b, cc, dd) => { tri(a, b, cc); tri(a, cc, dd); };
  for (const s of [1, -1]) {
    quad(v(s, 1, 1, 0), v(s, 1, -1, 0), v(s, -1, -1, 0), v(s, -1, 1, 0));
    quad(v(1, s, 1, 1), v(1, s, -1, 1), v(-1, s, -1, 1), v(-1, s, 1, 1));
    quad(v(1, 1, s, 2), v(1, -1, s, 2), v(-1, -1, s, 2), v(-1, 1, s, 2));
  }
  for (const sa of [1, -1]) for (const sb of [1, -1]) {
    quad(v(sa, sb, 1, 0), v(sa, sb, -1, 0), v(sa, sb, -1, 1), v(sa, sb, 1, 1));
    quad(v(sa, 1, sb, 0), v(sa, -1, sb, 0), v(sa, -1, sb, 2), v(sa, 1, sb, 2));
    quad(v(1, sa, sb, 1), v(-1, sa, sb, 1), v(-1, sa, sb, 2), v(1, sa, sb, 2));
  }
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) tri(v(sx, sy, sz, 0), v(sx, sy, sz, 1), v(sx, sy, sz, 2));
  const g = fromTris(P);
  const fx = new Float32Array(P.length * 2);
  for (let i = 36; i < P.length; i++) fx[i * 2] = 1;      // everything after the 6 main faces is bevel
  g.setAttribute('aFx', new THREE.BufferAttribute(fx, 2));
  return g;
}

// Lathe about +Y with HARD profile edges and smooth circumference. Profile [[r,y],...] must run
// counter-clockwise in the (r,y) half-plane (bottom-centre -> out -> up -> back to the axis).
function lathe(prof, segs = 32, { a0 = 0, a1 = PI * 2, flat = false } = {}) {
  const pos = [], nor = [];
  const push = (A, B, C, nA, nB, nC) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return;
    if (nx * (nA[0] + nB[0] + nC[0]) + ny * (nA[1] + nB[1] + nC[1]) + nz * (nA[2] + nB[2] + nC[2]) < 0) { pos.push(...A, ...C, ...B); nor.push(...nA, ...nC, ...nB); }
    else { pos.push(...A, ...B, ...C); nor.push(...nA, ...nB, ...nC); }
  };
  for (let i = 0; i < prof.length - 1; i++) {
    const r0 = prof[i][0], y0 = prof[i][1], r1 = prof[i + 1][0], y1 = prof[i + 1][1];
    let nr = y1 - y0, ny = -(r1 - r0); const l = Math.hypot(nr, ny); if (l < 1e-9) continue; nr /= l; ny /= l;
    for (let j = 0; j < segs; j++) {
      const t0 = a0 + (a1 - a0) * j / segs, t1 = a0 + (a1 - a0) * (j + 1) / segs;
      const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      const A = [r0 * s0, y0, r0 * c0], B = [r1 * s0, y1, r1 * c0], C = [r1 * s1, y1, r1 * c1], D = [r0 * s1, y0, r0 * c1];
      const nA = [nr * s0, ny, nr * c0], nD = [nr * s1, ny, nr * c1];
      push(A, B, C, nA, nA, nD); push(A, C, D, nA, nD, nD);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  if (flat) g.computeVertexNormals(); else g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  return g;
}
const latheX = (prof, segs, o) => lathe(prof, segs, o).rotateZ(-PI / 2);   // profile "y" becomes local +x
const cyl = (r, len, segs = 20) => lathe([[0, -len / 2], [r, -len / 2], [r, len / 2], [0, len / 2]], segs);
const cylX = (r, len, segs = 20) => cyl(r, len, segs).rotateZ(-PI / 2);
const cylZ = (r, len, segs = 20) => cyl(r, len, segs).rotateX(PI / 2);

const _boltCache = new Map();
function bolt(r = 0.07, h = 0.07) {
  const k = r + '_' + h;
  if (!_boltCache.has(k)) _boltCache.set(k, lathe([[r, 0], [r, h], [0, h * 1.15]], 6, { flat: true }));
  return _boltCache.get(k);
}
// n bolts on a circle of radius R in the XZ plane of frame m (bolt axis = frame +Y)
function boltRing(P, key, n, R, m, r = 0.07, h = 0.07, a0 = 0, a1 = PI * 2) {
  const full = Math.abs(a1 - a0 - PI * 2) < 1e-6;
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (full ? i / n : i / Math.max(1, n - 1));
    P.add(bolt(r, h), key, m.clone().multiply(xf(Math.sin(a) * R, 0, Math.cos(a) * R)));
  }
}
// row of bolts from p0 to p1 (frame m, bolt axis = frame +Y)
function boltRow(P, key, n, p0, p1, m, r = 0.06, h = 0.06) {
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1);
    P.add(bolt(r, h), key, m.clone().multiply(xf(p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2] + (p1[2] - p0[2]) * k)));
  }
}

function tube(pts, r, radial = 6, tubular = 0) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', 0.5);
  return new THREE.TubeGeometry(curve, tubular || Math.max(4, (pts.length - 1) * 6), r, radial, false);
}

const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; };
function sector(ri, ro, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, ro, a0, a1, false);
  s.absarc(0, 0, ri, a1, a0, true);
  s.closePath();
  return s;
}
// extrude a shape to total thickness `depth` (bevels included, outline preserved); spans z in [0, depth]
function extr(shape, depth, bevel = 0.05, curveSegments = 12) {
  const b = Math.min(bevel, depth * 0.45);
  const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments });
  g.translate(0, 0, b);
  if (b > 0) {
    const p = g.attributes.position, fx = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i += 3) {
      const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i);
      const ux = p.getX(i + 1) - ax, uy = p.getY(i + 1) - ay, uz = p.getZ(i + 1) - az, vx = p.getX(i + 2) - ax, vy = p.getY(i + 2) - ay, vz = p.getZ(i + 2) - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      const k = Math.abs(nz) / l;
      if (k > 0.15 && k < 0.97) { fx[i * 2] = fx[i * 2 + 2] = fx[i * 2 + 4] = 1; }
    }
    g.setAttribute('aFx', new THREE.BufferAttribute(fx, 2));
  }
  return g;
}
// shape drawn as (X = local z, Y = local y), extruded along local x from x0 to x1
const extrYZ = (shape, x0, x1, bevel, cs) => extr(shape, x1 - x0, bevel, cs).rotateY(-PI / 2).translate(x1, 0, 0);
// shape drawn as (X = local x, Y = local z), slab with top at yTop
const extrXZ = (shape, yTop, thick, bevel, cs) => extr(shape, thick, bevel, cs).rotateX(PI / 2).translate(0, yTop, 0);
// shape drawn as (X = local x, Y = local y), from z0 to z1
const extrXY = (shape, z0, z1, bevel, cs) => extr(shape, z1 - z0, bevel, cs).translate(0, 0, z0);

// hex nut / fitting about +Y, base at y = 0
const hex = (r, h) => lathe([[0, 0], [r, 0], [r, h], [0, h]], 6, { flat: true });
// pleated rubber gaiter about +Y
function bellows(r0, r1, y0, y1, n, segs = 16) {
  const prof = [];
  for (let i = 0; i <= n * 2; i++) prof.push([i % 2 ? r1 : r0, y0 + (y1 - y0) * i / (n * 2)]);
  return lathe(prof, segs);
}
// lumpy clod (caked mud), flat-ish bottom
function lump(sx, sy, sz, seed, detail = 1) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = BGU.mergeVertices(g, 1e-4);
  const p = g.attributes.position, s = seed * 1.37;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.22 * Math.sin(x * 3.1 + s) * Math.sin(y * 2.7 + s * 1.3) + 0.2 * Math.sin(z * 3.7 + s * 0.7 + x * 2.1) + 0.1 * Math.sin((x + y + z) * 7.3 + s);
    p.setXYZ(i, x * k * sx, Math.max(-0.3, y * k) * sy, z * k * sz);
  }
  g.computeVertexNormals();
  return g;
}

const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + (b - a) * i / (n - 1)));

// ----------------------------------------------------------------------------------------------
export async function create(ctx) {
  const { walker, CFG, gait, Mats, weathered, TEX, rng } = ctx;
  const tBuild0 = performance.now();
  const g = new THREE.Group(); g.name = 'legs';
  walker.add(g);
  // The leg kit is modelled at LEG_SCALE 1 (thigh 12.5 m, shin 18 m, ankle 1.9 m). A project scales the whole leg
  // with CFG.LEG_SCALE: the group is scaled and the IK runs in the unscaled frame, so nothing stretches.
  const N = gait.NLEGS, LT = 12.5, LS = 18.0, AH = 1.9, KS = CFG.LEG_SCALE || 1;
  g.scale.setScalar(KS);
  const PAINT = { armorA: 0xb3a993, armorB: 0x8a887b, armorY: 0xb08f3c, cyl: 0x5a5d58, mud: 0x3a3024, claw: 0x8a867d, ...(CFG.LEG_PAINT || {}) };
  const rnd = rng(4242);

  // ---------------------------------------------------------------- materials
  const MUD_F = /* glsl */`
  {
    float mn = texture2D(uWDetail, vWp.xz * 0.21).b * 0.6 + texture2D(uWDetail, vWp.xy * 0.83).r * 0.4;
    float mud = (1.0 - smoothstep(uMud.x, uMud.y, vMudY + (mn - 0.5) * (uMud.y - uMud.x) * 1.1)) * uMud.z;
    mud *= 0.6 + 0.4 * mn;
    // flung splatter: reaches well above the caked band, thinning with height
    float sn = texture2D(uWDetail, vWp.xy * 1.7 + vWp.zz * vec2(1.3, 0.9)).g * 0.6 + texture2D(uWDetail, vWp.zy * 0.47 + vWp.xx * 0.61).a * 0.5;
    float sph = 1.0 - smoothstep(uMud.x, uMud.y + (uMud.y - uMud.x) * 0.9, vMudY);
    float spl = smoothstep(0.86 - 0.30 * sph, 0.90 - 0.28 * sph, sn) * uMud.z * step(0.001, sph);
    mud = max(mud, spl * 0.9);
    // worn bright steel (claw tips / leading edges) stays clear of mud
    float wn = texture2D(uWDetail, vWp.zy * 0.9 + vWp.x * 0.4).g;
    float wb = texture2D(uWDetail, vWp.zy * 0.13 + vWp.x * 0.21).b;
    float wear = clamp(smoothstep(uWear.x, uWear.y, vLp.z + (wn - 0.5) * 0.9) + vFx.x * smoothstep(0.3, 0.6, wn) * 0.9 + smoothstep(0.5, 0.75, wb + wn * 0.3) * 0.55, 0.0, 1.0) * uWear.z;
    mud *= 1.0 - 0.8 * wear;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.335, 0.32) * (0.6 + 0.8 * wn), wear * 0.75);
    roughnessFactor = mix(roughnessFactor, 0.3 + 0.25 * wn, wear);
    metalnessFactor = mix(metalnessFactor, 0.95, wear);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.050, 0.043, 0.032) * (0.55 + 0.9 * mn), mud);
    roughnessFactor = mix(roughnessFactor, 0.30 + 0.6 * mn, mud);
    metalnessFactor *= 1.0 - mud;
    lpH += mud * mn * 0.012;
  }`;
  // plate-detail layer: panel seams, rivets, hatches, welds, stencil remnants, dents, rust drips, oily runoff.
  // Dominant-axis projection of a tileable atlas in mesh-local space (free per frame, never swims).
  const PLATE_F = /* glsl */`
  {
    vec3 an = abs(vWn);
    float isX = step(max(an.y, an.z), an.x), isZ = (1.0 - isX) * step(an.y, an.z);
    float sgx = vWn.x < 0.0 ? -1.0 : 1.0, sgz = vWn.z < 0.0 ? -1.0 : 1.0;
    vec2 pX = mix(vec2(-vWp.z * sgx, vWp.y), vec2(vWp.y * sgx, vWp.z), uPlate.w);
    vec2 puv = isX * pX + isZ * vec2(vWp.x * sgz, vWp.y) + (1.0 - isX - isZ) * vWp.xz;
    vec4 pl = texture2D(uPlateTex, puv * ${(1 / 6.4).toFixed(6)});
    float pk = uPlate.x * (1.0 - vFx.x);
    float pn = texture2D(uWDetail, puv * 0.83).a;
    diffuseColor.rgb *= mix(1.0, 0.36 + 1.42 * pl.r, pk);
    float oil = pl.a * pk;
    diffuseColor.rgb *= 1.0 - 0.6 * oil;
    wWetA = max(wWetA, oil * 0.8);
    float pr = smoothstep(0.22, 0.6, pl.b * (0.45 + 1.1 * pn)) * pk;
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.03, 0.017, 0.01), vec3(0.11, 0.057, 0.03), pn), pr);
    wRustA = max(wRustA, pr * 0.85);
    lpH += (pl.g - 0.5) * uPlate.y * pk;
    float pit = smoothstep(0.40, 0.16, texture2D(uWDetail, puv * 2.1 + 0.3).r) * uPlate.z;
    diffuseColor.rgb *= 1.0 - 0.5 * pit; lpH -= pit * 0.003;
  }`;
  // grease / oil thrown out of the hinge joints (axis = local X) and running down-gravity (uGrDir, in local YZ)
  const GREASE_F = /* glsl */`
  {
    vec2 gp = vec2(-uGrDir.y, uGrDir.x);
    float sd = (vWp.x - vLp.x) * 0.37;
    vec2 d0 = vLp.yz - uGr0.xy; float al0 = dot(d0, uGrDir), ac0 = dot(d0, gp);
    vec2 d1 = vLp.yz - uGr1.xy; float al1 = dot(d1, uGrDir), ac1 = dot(d1, gp);
    float n0 = texture2D(uWDetail, vec2(ac0 * 0.9 + vLp.x * 0.33 + sd, al0 * 0.04)).b * 0.65 + texture2D(uWDetail, vec2(ac0 * 2.7 + vLp.x * 0.9, al0 * 0.11 + sd)).a * 0.45;
    float n1 = texture2D(uWDetail, vec2(ac1 * 0.9 + vLp.x * 0.33 + sd + 0.5, al1 * 0.04)).b * 0.65 + texture2D(uWDetail, vec2(ac1 * 2.7 + vLp.x * 0.9, al1 * 0.11 + sd)).a * 0.45;
    float m0 = smoothstep(uGr0.z * 1.15, uGr0.z * 0.4, abs(ac0)) * smoothstep(-uGr0.z * 0.6, uGr0.z * 0.5, al0) * (1.0 - smoothstep(uGr0.z, uGr0.z * 3.0, al0));
    float m1 = smoothstep(uGr1.z * 1.15, uGr1.z * 0.4, abs(ac1)) * smoothstep(-uGr1.z * 0.6, uGr1.z * 0.5, al1) * (1.0 - smoothstep(uGr1.z, uGr1.z * 3.0, al1));
    float gr = max(uGr0.w * m0 * smoothstep(0.50, 0.68, n0 + m0 * 0.22), uGr1.w * m1 * smoothstep(0.50, 0.68, n1 + m1 * 0.22));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.016, 0.012, 0.008), gr * 0.9);
    wWetA = max(wWetA, gr); wRustA *= 1.0 - gr;
    // rust never orange: clamp to dark brown
    diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb, vec3(0.115, 0.062, 0.036)), smoothstep(0.1, 0.6, wRustA));
  }`;
  // make a (weathered) material safe for animated InstancedMesh + optional mud gradient / decal atlas
  const EDGE_F = /* glsl */`
  {
    float en = texture2D(uWDetail, vWp.xy * 0.71 + vWp.z * 0.37).g * 0.6 + texture2D(uWDetail, vWp.zx * 0.23 + vWp.y * 0.19).a * 0.6;
    float edge = vFx.x * smoothstep(0.34, 0.62, en) * uEdge;
    vec3 bare = mix(vec3(0.13, 0.135, 0.14), vec3(0.20, 0.095, 0.042), smoothstep(0.35, 0.75, texture2D(uWDetail, vWp.zy * 0.31 + vWp.x * 0.3).r));
    diffuseColor.rgb = mix(diffuseColor.rgb, bare, edge * 0.9);
    wRustA = max(wRustA, edge * 0.55);
    if (uRust2.x > 0.0) {
      vec2 ruv = vWp.xy * 0.85 + vWp.z * vec2(0.53, 0.47);
      float rmask = texture2D(uWDetail, ruv * 0.11 + 0.3).b * 0.7 + texture2D(uWDetail, ruv * 0.37).a * 0.45;
      #define LEG_FINE(q) (texture2D(uWDetail, q).g * 0.62 + texture2D(uWDetail, (q) * 2.3 + 0.17).a * 0.5)
      float gate = 0.36 + 1.02 * rmask;
      float r2 = smoothstep(0.735, 0.85, LEG_FINE(ruv) * gate) * uRust2.x;
      float tr = max(smoothstep(0.70, 0.83, LEG_FINE(ruv + vec2(0.0, 0.22)) * gate) * 0.6, smoothstep(0.70, 0.83, LEG_FINE(ruv + vec2(0.0, 0.5)) * gate) * 0.32) * uRust2.y;
      vec3 rc = mix(vec3(0.05, 0.026, 0.015), vec3(0.15, 0.078, 0.04), texture2D(uWDetail, ruv * 3.1).r);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.52, 0.33), tr * (1.0 - r2));
      diffuseColor.rgb = mix(diffuseColor.rgb, rc, r2);
      wRustA = max(wRustA, r2);
    }
  }`;
  // plate: [strength, bump height (m), pitting, swap (1 = gravity runs along local -Z on the X faces)]
  // wear: [z0, z1, strength] (mud variants only) ; grease: { a:[cy,cz,R,k], b:[cy,cz,R,k], dir:[gy,gz] }
  function patch(mat, { mud = null, atlas = 0, edge = 0, rust2 = [0, 0], plate = [0, 0, 0, 0], wear = [0, 1, 0], grease = null } = {}) {
    const prev = mat.onBeforeCompile;
    const isW = !!mat.userData.weather;
    mat.onBeforeCompile = (shader, r) => {
      if (prev) prev(shader, r);
      let vs = shader.vertexShader;
      if (isW) {
        const a = 'wP_ = instanceMatrix * wP_;', b = 'wN_ = mat3(instanceMatrix) * wN_;';
        if (vs.includes(a)) vs = vs.replace(a, 'wP_.xyz += vec3(float(gl_InstanceID)) * vec3(17.3, 9.1, 13.7);').replace(b, '');
        else console.warn('[legs] weathering instancing patch not applied (materials.js changed?)');
        vs = vs.replace('#include <common>', '#include <common>\nattribute vec2 aFx; varying vec2 vFx; varying vec3 vLp;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFx = aFx; vLp = position;');
        const G = grease || { a: [0, 0, 1, 0], b: [0, 0, 1, 0], dir: [-1, 0] };
        shader.uniforms.uEdge = { value: edge };
        shader.uniforms.uRust2 = { value: new THREE.Vector2(rust2[0], rust2[1]) };
        shader.uniforms.uPlateTex = { value: plateTex };
        shader.uniforms.uPlate = { value: new THREE.Vector4(...plate) };
        shader.uniforms.uGr0 = { value: new THREE.Vector4(...G.a) };
        shader.uniforms.uGr1 = { value: new THREE.Vector4(...G.b) };
        shader.uniforms.uGrDir = { value: new THREE.Vector2(...G.dir) };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vFx; varying vec3 vLp; uniform float uEdge; uniform vec2 uRust2; uniform sampler2D uPlateTex; uniform vec4 uPlate, uGr0, uGr1; uniform vec2 uGrDir; float lpH = 0.0;')
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vFx.y;')
          .replace('#include <alphamap_fragment>', PLATE_F + EDGE_F + GREASE_F + '\n#include <alphamap_fragment>')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec2 dHp = vec2(dFdx(lpH), dFdy(lpH)); normal = wPerturb(-vViewPosition, normal, dHp, faceDirection); }');
      }
      if (mud && isW) {
        vs = vs.replace('#include <common>', '#include <common>\nvarying float vMudY;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMudY = position.y;');
        shader.uniforms.uMud = { value: new THREE.Vector3(mud[0], mud[1], mud[2]) };
        shader.uniforms.uWear = { value: new THREE.Vector3(...wear) };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vMudY; uniform vec3 uMud, uWear;')
          .replace('#include <normal_fragment_begin>', MUD_F + '\n#include <normal_fragment_begin>');
      }
      if (atlas) vs = vs.replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x = (vMapUv.x + float(gl_InstanceID % ${atlas})) / ${atlas}.0;\n#endif`);
      shader.vertexShader = vs;
    };
    mat.customProgramCacheKey = () => 'legs4' + (isW ? 'W' : 'N') + (mud ? 'M' : '') + (atlas ? 'A' + atlas : '');
    return mat;
  }

  const tPlate0 = performance.now();
  // ---- plate-detail atlas (tileable 6.4 m): R tone, G height, B rust, A oily runoff
  const plateTex = (() => {
    const S = 2048, px = S / 6.4, r = rng(977);
    const mk = (fill) => { const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d', { willReadFrequently: true }); c.fillStyle = fill; c.fillRect(0, 0, S, S); return c; };
    const cT = mk('#808080'), cH = mk('#808080'), cR = mk('#000'), cO = mk('#000');
    const g8 = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
    const R = (a, b) => a + (b - a) * r();
    const dot = (c, x, y, rad, v, a = 1) => { c.fillStyle = g8(v, a); c.beginPath(); c.arc(x, y, rad, 0, 6.2832); c.fill(); };
    const drip = (c, x, y, w, len, a) => {
      const gr = c.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, g8(255, a)); gr.addColorStop(0.35, g8(255, a * 0.6)); gr.addColorStop(1, g8(255, 0)); c.fillStyle = gr;
      for (const oy of [0, -S]) { c.setTransform(1, 0, 0, 1, 0, oy); c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.lineTo(x + w * 0.2, y + len); c.lineTo(x - w * 0.2, y + len); c.closePath(); c.fill(); }
      c.setTransform(1, 0, 0, 1, 0, 0);
    };
    const panels = [];
    (function split(x, y, w, h, d) {
      const mw = 2.3 * px, mh = 3.2 * px, minS = 0.8 * px, canW = w > 2 * minS, canH = h > 2 * minS;
      if ((w > mw || h > mh || d < 2 || r() < 0.3) && (canW || canH)) {
        const vert = canW && (!canH || w / mw > h / mh), k = R(0.36, 0.64);
        if (vert) { const a = Math.round(w * k); split(x, y, a, h, d + 1); split(x + a, y, w - a, h, d + 1); }
        else { const a = Math.round(h * k); split(x, y, w, a, d + 1); split(x, y + a, w, h - a, d + 1); }
      } else panels.push({ x, y, w, h });
    })(0, 0, S, S, 0);
    for (const p of panels) {
      p.tone = 128 + R(-26, 26); if (r() < 0.18) p.tone = r() < 0.5 ? R(162, 184) : R(76, 96);     // replaced / repainted plates
      p.lvl = 128 + R(-10, 10);
      cT.fillStyle = g8(p.tone); cT.fillRect(p.x, p.y, p.w, p.h);
      cH.fillStyle = g8(p.lvl); cH.fillRect(p.x, p.y, p.w, p.h);
    }
    const rivet = (x, y, rad) => {
      if (r() < 0.035) { dot(cH, x, y, rad * 0.8, 40); dot(cT, x, y, rad * 0.8, 30); dot(cR, x, y, rad * 1.6, 255, 0.7); drip(cR, x, y, rad * 2, R(60, 260), 0.6); return; }
      dot(cT, x + 1, y + 2, rad * 1.3, 45, 0.55);
      dot(cT, x, y - 1, rad * 0.9, 165, 0.55);
      const gr = cH.createRadialGradient(x, y, 0, x, y, rad * 1.15); gr.addColorStop(0, g8(255)); gr.addColorStop(0.6, g8(228)); gr.addColorStop(1, g8(140, 0));
      cH.fillStyle = gr; cH.beginPath(); cH.arc(x, y, rad * 1.15, 0, 6.2832); cH.fill();
      if (r() < 0.3) { dot(cR, x, y, rad * R(1.1, 1.6), 255, R(0.4, 0.9)); if (r() < 0.7) drip(cR, x + R(-2, 2), y, rad * R(1.0, 1.8), R(60, 420), R(0.3, 0.65)); }
    };
    const words = ['ОП-4', 'Ж-17', '№ 03', 'СМАЗКА', 'ТО-2', '12.87', 'ГИДРО', 'ДАВЛ. 210', 'ОТК', 'СЕКЦ. Б', 'НЕ ВСТАВАТЬ', '4Т', 'ЛЮК 7', 'МАСЛО'];
    for (const p of panels) {
      const { x, y, w, h } = p, kind = r();
      cT.strokeStyle = g8(52, 0.22); cT.lineWidth = 34; cT.strokeRect(x + 0.5, y + 0.5, w, h);      // grime gathered along the seam
      cH.strokeStyle = g8(20); cH.lineWidth = 9; cH.strokeRect(x + 0.5, y + 0.5, w, h);
      cT.strokeStyle = g8(22, 0.95); cT.lineWidth = 8; cT.strokeRect(x + 0.5, y + 0.5, w, h);
      cT.fillStyle = g8(215, 0.4); cT.fillRect(x + 5, y + 5, w - 10, 3);
      cT.fillStyle = g8(40, 0.4); cT.fillRect(x + 5, y + h - 9, w - 10, 4);
      const ins = 0.11 * px, sp = R(0.24, 0.36) * px, rad = R(0.03, 0.04) * px;
      if (kind < 0.72) {
        const nx = Math.max(2, Math.round((w - 2 * ins) / sp)), ny = Math.max(2, Math.round((h - 2 * ins) / sp));
        for (let i = 0; i <= nx; i++) { const xx = x + ins + (w - 2 * ins) * i / nx; rivet(xx, y + ins, rad); rivet(xx, y + h - ins, rad); }
        if (kind < 0.5) for (let i = 1; i < ny; i++) { const yy = y + ins + (h - 2 * ins) * i / ny; rivet(x + ins, yy, rad); rivet(x + w - ins, yy, rad); }
      } else {
        const bead = (x0, y0, x1, y1) => { const n = Math.hypot(x1 - x0, y1 - y0) / 5; for (let i = 0; i <= n; i++) { const k = i / n, bx = x0 + (x1 - x0) * k + R(-1.2, 1.2), by = y0 + (y1 - y0) * k + R(-1.2, 1.2); dot(cH, bx, by, R(5.5, 8), 238, 0.9); dot(cT, bx, by, R(5, 7.5), R(60, 100), 0.75); if (r() < 0.12) dot(cR, bx, by, R(4, 9), 255, 0.6); } };
        const o = 14; bead(x + o, y + o, x + w - o, y + o); bead(x + w - o, y + o, x + w - o, y + h - o); bead(x + w - o, y + h - o, x + o, y + h - o); bead(x + o, y + h - o, x + o, y + o);
      }
      // chipped edges
      for (let i = 0, n = 4 + r() * 9; i < n; i++) {
        const e = (r() * 4) | 0, k = r(), cx = e < 2 ? x + w * k : (e === 2 ? x : x + w), cy = e < 2 ? (e === 0 ? y : y + h) : y + h * k;
        for (let j = 0, m = 2 + r() * 6; j < m; j++) dot(cR, cx + R(-22, 22), cy + R(-10, 10), R(3, 13), 255, R(0.5, 1));
      }
      const f = r();
      if (f < 0.26 && w > 1.0 * px && h > 1.1 * px) {
        // inspection hatch: hinges on the left, latch on the right, grime weeping from the bottom gap
        const hw = R(0.5, 0.75) * px, hh = R(0.6, 0.95) * px, hx = x + 30 + R(0.2, 0.8) * (w - hw - 60), hy = y + 30 + R(0.2, 0.8) * (h - hh - 60);
        cT.fillStyle = g8(p.tone + R(-18, 18)); cT.fillRect(hx, hy, hw, hh);
        cH.fillStyle = g8(p.lvl + 24); cH.fillRect(hx, hy, hw, hh);
        cH.strokeStyle = g8(25); cH.lineWidth = 7; cH.strokeRect(hx, hy, hw, hh);
        cT.strokeStyle = g8(25, 0.95); cT.lineWidth = 6; cT.strokeRect(hx, hy, hw, hh);
        for (const k of [0.22, 0.78]) {
          cH.fillStyle = g8(252); cH.fillRect(hx - 9, hy + hh * k - 16, 18, 32); cT.fillStyle = g8(70, 0.8); cT.fillRect(hx - 9, hy + hh * k - 16, 18, 32);
          drip(cR, hx, hy + hh * k + 14, 12, R(40, 160), 0.6);
        }
        cH.fillStyle = g8(252); cH.fillRect(hx + hw - 26, hy + hh * 0.5 - 22, 16, 44); cT.fillStyle = g8(60, 0.85); cT.fillRect(hx + hw - 26, hy + hh * 0.5 - 22, 16, 44);
        for (const [a, b] of [[0.1, 0.08], [0.9, 0.08], [0.1, 0.92], [0.9, 0.92]]) rivet(hx + hw * a, hy + hh * b, 8);
        for (let i = 0; i < 5; i++) drip(cO, hx + r() * hw, hy + hh, R(8, 26), R(80, 500), R(0.3, 0.7));
      } else if (f < 0.52) {
        // faded stencil remnant, mostly worn away
        const fs2 = R(0.16, 0.36) * px, word = words[(r() * words.length) | 0];
        cT.save(); cT.font = `700 ${fs2 | 0}px "Arial Narrow", Arial, sans-serif`; cT.textBaseline = 'middle';
        const tw = Math.min(cT.measureText(word).width, w - 60), tx = x + 30 + r() * Math.max(1, w - 60 - tw), ty = y + h * R(0.25, 0.75);
        cT.fillStyle = r() < 0.7 ? g8(215, R(0.35, 0.7)) : g8(45, R(0.4, 0.7));
        cT.fillText(word, tx, ty, tw);
        for (let i = 0; i < 26; i++) dot(cT, tx + r() * tw, ty + R(-0.6, 0.6) * fs2, R(4, fs2 * 0.3), p.tone, R(0.5, 1));
        cT.restore();
      } else if (f < 0.72) {
        for (let i = 0, n = 1 + r() * 3; i < n; i++) {
          const dx = x + R(0.15, 0.85) * w, dy = y + R(0.15, 0.85) * h, dr = R(0.08, 0.26) * px;
          const gr = cH.createRadialGradient(dx, dy, 0, dx, dy, dr); gr.addColorStop(0, g8(40, 0.85)); gr.addColorStop(1, g8(40, 0));
          cH.fillStyle = gr; cH.beginPath(); cH.arc(dx, dy, dr, 0, 6.2832); cH.fill();
          for (let j = 0; j < 7; j++) dot(cR, dx + R(-0.4, 0.4) * dr, dy + R(-0.4, 0.4) * dr, R(2, 8), 255, R(0.5, 1));
          dot(cT, dx, dy - dr * 0.2, dr * 0.7, 190, 0.12);
        }
      } else if (f < 0.88) {
        const ang = R(-0.5, 0.5) + (r() < 0.3 ? 1.5 : 0), sx0 = x + R(0.2, 0.6) * w, sy0 = y + R(0.2, 0.8) * h, len = R(0.3, 0.9) * Math.min(w, h);
        cT.save(); cT.beginPath(); cT.rect(x, y, w, h); cT.clip();
        for (let i = 0; i < 10; i++) {
          const o = R(-34, 34), l = len * R(0.4, 1), ax = sx0 - Math.sin(ang) * o, ay = sy0 + Math.cos(ang) * o;
          cT.strokeStyle = g8(r() < 0.6 ? 212 : 46, R(0.35, 0.75)); cT.lineWidth = R(2, 6);
          cT.beginPath(); cT.moveTo(ax, ay); cT.lineTo(ax + Math.cos(ang) * l, ay + Math.sin(ang) * l); cT.stroke();
        }
        cT.restore();
      }
    }
    // weeping seams + long runoff streaks
    for (const p of panels) for (let i = 0, n = 2 + r() * 7; i < n; i++) {
      const xx = p.x + r() * p.w;
      if (r() < 0.6) drip(cR, xx, p.y + p.h, R(5, 16), R(40, 380), R(0.25, 0.65)); else drip(cO, xx, p.y + p.h, R(8, 30), R(150, 900), R(0.2, 0.55));
    }
    for (let i = 0; i < 46; i++) drip(cO, r() * S, r() * S, R(10, 44), R(300, 1700), R(0.12, 0.34));
    for (let i = 0; i < 260; i++) {
      const sx = r() * S, sy = r() * S, a = r() < 0.5 ? R(-0.3, 0.3) : r() * 3.14, l = R(15, 220) * r() + 10;
      cT.strokeStyle = g8(r() < 0.55 ? 215 : 40, R(0.15, 0.5)); cT.lineWidth = R(0.7, 2);
      cT.beginPath(); cT.moveTo(sx, sy); cT.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); cT.stroke();
    }
    const bl = cH;
    const dT = cT.getImageData(0, 0, S, S).data, dH = bl.getImageData(0, 0, S, S).data, dR = cR.getImageData(0, 0, S, S).data, dO = cO.getImageData(0, 0, S, S).data;
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) {
      const row = (S - 1 - y) * S;
      for (let x = 0; x < S; x++) { const i = (y * S + x) * 4, o = (row + x) * 4; data[o] = dT[i]; data[o + 1] = dH[i]; data[o + 2] = dR[i]; data[o + 3] = dO[i]; }
    }
    const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true; tex.anisotropy = 8; tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
    for (const c of [cT, cH, cR, cO]) c.canvas.width = c.canvas.height = 1;
    return tex;
  })();
  const tPlate1 = performance.now();

  const hazardTex = TEX.canvasTexture(256, 64, (c, w, h) => {
    c.fillStyle = '#16140f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c29a1e';
    for (let x = -h; x < w + h; x += 44) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 22, h); c.lineTo(x + 22 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); }
  });
  const decalTex = TEX.canvasTexture(2048, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgb(214,208,190)'; c.strokeStyle = 'rgb(214,208,190)';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const cx = i * 256 + 128;
      c.font = '900 150px Impact, "Arial Black", sans-serif';
      c.fillText('0' + (i + 1), cx, 138);
      c.font = '700 30px "Arial Narrow", Arial, sans-serif';
      c.fillText('ОПОРА', cx, 36);
      c.font = '700 22px "Arial Narrow", Arial, sans-serif';
      c.fillText('НЕ СТОЯТЬ ПОД ОПОРОЙ', cx, 232);
      c.lineWidth = 5; c.strokeRect(i * 256 + 18, 58, 220, 152);
      // stencil bridges
      c.clearRect(cx - 62, 60, 5, 150); c.clearRect(cx + 4, 60, 5, 150); c.clearRect(cx - 100, 136, 200, 4);
    }
  });
  decalTex.anisotropy = 8;

  const off = (i) => new THREE.Vector3(i * 31.7 + 3, i * 17.3 + 5, i * 23.9 + 7);
  const matCache = new Map();
  // variants: '' (default), 'thigh' (few streaks: it lies near horizontal), 'boot', 'foot', 'toe' (mud gradients)
  const MUDS = { boot: [-19.5, -11.4, 0.72], foot: [-1.75, -0.4, 1.0], toe: [-0.95, -0.15, 0.8] };
  // grease sources per part (hinge centres in local YZ, radius, strength) + local gravity direction
  const GREASE = {
    thigh: { a: [0, 0, 1.5, 0.8], b: [-LT, 0, 2.3, 1.0], dir: [0.56, -0.83] },
    shin: { a: [0, 0, 2.1, 1.0], b: [-13.2, 0.3, 1.5, 0.7], dir: [-1, 0] },
    foot: { a: [0, 0, 1.5, 0.8], b: [0, 0, 1, 0], dir: [-1, 0] },
  };
  GREASE.boot = GREASE.shin;
  function M(key, variant = '') {
    const id = key + '|' + variant;
    if (matCache.has(id)) return matCache.get(id);
    const lying = /thigh|cyl/.test(variant);
    const st = lying ? 0.3 : 0.9;
    const wet = variant === 'foot' || variant === 'toe' ? 0.85 : 0.6;
    let m;
    switch (key) {
      case 'armorA': m = Mats.paintedMetal({ color: PAINT.armorA, w: { chip: 0.26, rust: 0.17, streak: st, dirt: 0.8, wet, offset: off(1) } }); m.metalness = 0.1; m.roughness = 0.56; break;
      case 'armorB': m = Mats.paintedMetal({ color: PAINT.armorB, w: { chip: 0.28, rust: 0.18, streak: st, dirt: 0.7, wet, offset: off(2) } }); m.metalness = 0.12; m.roughness = 0.56; break;
      case 'armorY': m = Mats.paintedMetal({ color: PAINT.armorY, w: { chip: 0.36, rust: 0.3, streak: st, dirt: 0.75, wet, offset: off(3) } }); m.metalness = 0.1; m.roughness = 0.58; break;
      case 'steel': m = Mats.steel({ color: 0x3a3e44, w: { rust: 0.33, streak: st * 0.6, wet, offset: off(4) } }); break;
      case 'joint': m = Mats.steel({ color: 0x23262b, w: { rust: 0.24, streak: st * 0.4, wet: 0.7, dirt: 0.5, offset: off(5) } }); m.roughness = 0.4; break;
      case 'rust': m = Mats.rust({ w: { offset: off(6) } }); break;
      case 'cyl': m = Mats.paintedMetal({ color: PAINT.cyl, w: { chip: 0.32, rust: 0.36, streak: 0.3, wet: 0.6, offset: off(7) } }); m.metalness = 0.2; break;
      case 'chrome': m = Mats.chrome({ color: 0xf0e4d2, w: { rust: 0.05, dirt: 0.14, streak: 0.1, grain: 0.08, offset: off(8) } }); m.roughness = 0.12; m.envMapIntensity = 1.3; break;
      case 'mud': m = weathered({ color: PAINT.mud, roughness: 0.8, metalness: 0 }, { tex: 0.9, grain: 0.9, dirt: 0.7, streak: 0.1, moss: 0.15, wet: 0.6, bump: 0.01, offset: off(12) }); break;
      case 'claw': m = Mats.steel({ color: PAINT.claw, w: { rust: 0.36, grain: 0.7, dirt: 0.65, streak: 0.5, wet: 0.9, bump: 0.009, tex: 0.42, offset: off(9) } }); m.roughness = 0.42; m.metalness = 0.62; break;
      case 'hazard': m = Mats.paintedMetal({ color: 0x86847a, w: { chip: 0.36, rust: 0.3, dirt: 0.75, streak: st, wet, offset: off(10) } }); m.metalness = 0.12; m.roughness = 0.56; break;   // look-dev: no hazard stripes (refs have none)
      case 'decal': m = weathered({ map: decalTex, alphaTest: 0.42, roughness: 0.62, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, { chip: 0.5, rust: 0.2, dirt: 0.6, streak: 0.5, moss: 0, offset: off(11) }); break;
      case 'rubber': m = Mats.rubber(); break;
      case 'dark': m = new THREE.MeshStandardMaterial({ color: 0x040506, roughness: 1, metalness: 0 }); break;
      case 'lampA': m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.62, 0.12), toneMapped: false }); break;
      default: throw new Error('unknown material ' + key);
    }
    const low = variant === 'foot' || variant === 'toe';
    if (m.userData.weather || key === 'decal') patch(m, { mud: key === 'mud' ? null : MUDS[variant] || null, atlas: key === 'decal' ? 8 : 0,
      edge: (/armor|cyl|hazard/.test(key) ? 1 : /steel|claw/.test(key) ? 0.5 : 0) * (low ? 1.5 : 1),
      rust2: /armor|hazard/.test(key) ? [0.45, variant === 'thigh' || low ? 0.25 : 1] : key === 'cyl' ? [0.7, 0] : [0, 0],
      plate: /armor|hazard/.test(key) ? [1, 0.045, 0.15, lying ? 1 : 0] : key === 'steel' ? [0.7, 0.035, 0.3, lying ? 1 : 0] : key === 'rust' ? [0.6, 0.016, 0.6, 0]
        : key === 'claw' ? [0, 0, 1, 0] : key === 'cyl' ? [0, 0, 0.25, 0] : [0, 0, 0, 0],
      wear: key === 'claw' ? [1.7, 2.6, 1] : key === 'steel' && low ? [9, 10, 0.5] : [9, 10, 0],
      grease: key === 'decal' || key === 'mud' || key === 'chrome' ? null : GREASE[variant] || null });
    matCache.set(id, m);
    return m;
  }

  // ---------------------------------------------------------------- part: hip base (static)
  // frame: origin = kingpin point (L.hip), +Z outward, +Y up. Chassis side is around z = -0.7.
  function buildHipBase() {
    const P = new Part();
    P.add(cbox(5.8, 5.0, 0.5, 0.08), 'steel', xf(0, 0, -0.78));
    const fz = xf(0, 0, -0.53, PI / 2, 0, 0);
    for (const y of [-2.25, 2.25]) boltRow(P, 'joint', 12, [-2.6, 0, -y], [2.6, 0, -y], fz, 0.085, 0.09);
    for (const x of [-2.65, 2.65]) boltRow(P, 'joint', 7, [x, 0, -1.6], [x, 0, 1.6], fz, 0.085, 0.09);
    const lug = new THREE.Shape();
    lug.moveTo(-2.0, -0.8); lug.lineTo(-2.0, 0); lug.absarc(0, 0, 2.0, PI, 0, true); lug.lineTo(2.0, -0.8); lug.closePath();
    P.add(extrXZ(lug, 2.25, 0.75, 0.07, 28), 'steel');
    P.add(extrXZ(lug, -1.5, 0.75, 0.07, 28), 'steel');
    // kingpin caps + bolt circles
    const cap = lathe([[0, 0], [1.2, 0], [1.2, 0.2], [1.02, 0.29], [0.45, 0.29], [0.45, 0.33], [0, 0.33]], 28);
    P.add(cap, 'joint', xf(0, 2.22, 0));
    P.add(cap, 'joint', xf(0, -2.22, 0, PI, 0, 0));
    boltRing(P, 'joint', 12, 0.86, xf(0, 2.5, 0), 0.07, 0.06);
    boltRing(P, 'joint', 12, 0.86, xf(0, -2.5, 0, PI, 0, 0), 0.07, 0.06);
    // slew bearing races between lugs and yoke
    const race = lathe([[1.42, 0], [1.86, 0], [1.86, 0.12], [1.42, 0.12]], 36);
    P.add(race, 'joint', xf(0, 1.38, 0)); P.add(race, 'joint', xf(0, -1.5, 0));
    boltRing(P, 'joint', 20, 1.7, xf(0, 1.38, 0, PI, 0, 0), 0.06, 0.05);
    // side posts + gussets tying the lugs to the flange
    P.mirX(cbox(0.5, 4.5, 0.75, 0.06), 'steel', xf(2.3, 0, -0.42));

    // grease lines
    P.mirX(tube([[1.3, 2.26, -0.6], [1.35, 2.34, 0.2], [1.0, 2.34, 0.9], [0.5, 2.5, 0.75]], 0.035, 5), 'rubber');
    // slew-ring gear teeth on the outward half of both races + pinion drive
    for (const y of [1.44, -1.44]) for (let i = 0; i < 30; i++) {
      const a = -1.75 + 3.5 * i / 29;
      P.add(new THREE.BoxGeometry(0.11, 0.13, 0.12), 'joint', xf(Math.sin(a) * 1.9, y, Math.cos(a) * 1.9, 0, a, 0));
    }
    P.mirX(cyl(0.3, 0.5, 12), 'joint', xf(2.2, 1.44, 0.55));
    P.mirX(cyl(0.34, 0.7, 12), 'steel', xf(2.2, 2.05, 0.55));
    P.mirX(hex(0.16, 0.14), 'joint', xf(2.2, 2.4, 0.55));
    // lubrication distributor + ID plate on the flange
    P.add(cbox(0.7, 0.4, 0.3, 0.03), 'joint', xf(-2.3, 2.05, -0.3));
    for (const x of [-2.5, -2.3, -2.1]) P.add(hex(0.05, 0.1), 'joint', xf(x, 2.25, -0.3));
    return P.build();
  }

  // ---------------------------------------------------------------- part: yoke (yaws about kingpin)
  const A_LIFT = [1.25, -2.52, 3.5];     // lift cylinder base pin on the yoke chin (yoke frame)
  function buildYoke() {
    const P = new Part();
    P.add(lathe([[0, -1.38], [1.2, -1.38], [1.36, -1.24], [1.36, -0.52], [1.27, -0.44], [1.27, 0.44], [1.36, 0.52], [1.36, 1.24], [1.2, 1.38], [0, 1.38]], 36), 'joint');
    P.add(cbox(2.2, 2.2, 2.3, 0.1), 'steel', xf(0, 0, 1.25));
    P.add(latheX([[0, -1.17], [1.02, -1.17], [1.18, -1.02], [1.18, 1.02], [1.02, 1.17], [0, 1.17]], 32), 'joint', xf(0, 0, E_TRUN));
    P.add(cbox(1.7, 0.5, 2.9, 0.08), 'steel', xf(0, 1.12, 1.5));
    // chin: carries the lift-cylinder base pins, sweeps outside the lower lug
    const chin = poly([[1.25, -0.9], [3.1, -1.12], [4.1, -2.3], [3.8, -3.1], [2.5, -2.8], [2.16, -1.42], [1.25, -1.42]]);
    P.add(extrYZ(chin, -0.78, 0.78, 0.07), 'steel');
    P.mirX(extrYZ(poly([[2.3, -1.5], [3.4, -1.5], [4.15, -2.35], [3.8, -3.15], [2.6, -2.85]]), 0.78, 0.92, 0.03), 'armorB');
    P.add(cylX(0.24, 3.7, 16), 'joint', xf(0, A_LIFT[1], A_LIFT[2]));
    P.mirX(cylX(0.36, 0.14, 14), 'joint', xf(1.82, A_LIFT[1], A_LIFT[2]));
    boltRow(P, 'joint', 4, [-0.55, 0, 0], [0.55, 0, 0], xf(0, 1.37, 2.3), 0.07, 0.06);
    boltRow(P, 'joint', 4, [-0.55, 0, 0], [0.55, 0, 0], xf(0, 1.37, 0.8), 0.07, 0.06);
    // hose stubs
    for (const x of [-0.5, 0, 0.5]) P.add(tube([[x, -1.3, 1.3], [x * 1.1, -1.75, 1.7], [x * 1.2, -1.9, 2.4], [x, -1.55, 2.9]], 0.07, 6), 'rubber');
    return P.build();
  }

  // ---------------------------------------------------------------- part: thigh
  // frame: origin = trunnion, bone runs to (0,-LT,0) = knee, +X hinge axis, +Z = top face.
  const A_KNEE = [1.25, -3.05, 2.1];     // knee cylinder base clevis on thigh top
  const B_LIFT = [1.25, -7.6, -1.62];    // lift cylinder rod eye under the thigh
  function buildThigh() {
    const P = new Part();
    // hip fork cheeks
    {
      const s = new THREE.Shape(); const a0 = Math.atan2(-0.963, 1.15);
      s.moveTo(1.15, -3.7); s.lineTo(1.15, -0.963); s.absarc(0, 0, 1.5, a0, PI - a0, false); s.lineTo(-1.15, -3.7); s.closePath();
      P.mirX(extrYZ(s, 1.2, 1.75, 0.06, 30), 'steel');
      const cap = lathe([[0, 0], [1.22, 0], [1.22, 0.16], [1.06, 0.23], [0.62, 0.23], [0.62, 0.36], [0.5, 0.42], [0, 0.42]], 28).rotateZ(-PI / 2);
      P.mirX(cap, 'joint', xf(1.75, 0, 0));
      const br = xf(1.98, 0, 0, 0, 0, -PI / 2);
      boltRing(P, 'joint', 10, 0.86, br, 0.06, 0.06);
      boltRing(P, 'joint', 10, 0.86, MIRX.clone().multiply(br), 0.06, 0.06);
    }
    // twin box girders
    const GY0 = -1.85, GY1 = -9.3, GL = GY0 - GY1;
    P.mirX(cbox(1.3, GL, 2.4, 0.08), 'steel', xf(1.4, (GY0 + GY1) / 2, 0));
    // girder end caps at the knee side (rust accent)
    P.mirX(cbox(1.36, 0.3, 2.46, 0.05), 'rust', xf(1.4, GY1 + 0.1, 0));
    // knee fork cheeks (big discs)
    {
      const KR = 2.3;
      const s = new THREE.Shape(); const top = Math.sqrt(KR * KR - 1.3 * 1.3), a0 = Math.atan2(top, -1.3);
      s.moveTo(-1.3, -8.4); s.lineTo(-1.3, -LT + top); s.absarc(0, -LT, KR, a0, PI * 2 + (PI - a0), false); s.lineTo(1.3, -8.4); s.closePath();
      P.mirX(extrYZ(s, 1.85, 2.5, 0.09, 56), 'armorB', undefined, 0.9);
      // layered outer hubs
      const hub = lathe([[0, 0], [1.98, 0], [1.98, 0.2], [1.85, 0.29], [1.36, 0.29], [1.36, 0.5], [1.26, 0.58], [0.68, 0.58], [0.68, 0.8], [0.56, 0.88], [0, 0.88]], 48).rotateZ(-PI / 2);
      P.mirX(hub, 'armorA', xf(2.5, -LT, 0), 0.95);
      P.mirX(cylX(0.5, 0.12, 20), 'joint', xf(3.4, -LT, 0));
      const cover = lathe([[1.41, 0], [1.82, 0], [1.82, 0.07], [1.41, 0.07]], 40, { a0: 0.35, a1: 5.2 }).rotateZ(-PI / 2);
      P.mirX(cover, 'armorB', xf(2.79, -LT, 0));
      const cover2 = lathe([[0.71, 0], [1.22, 0], [1.22, 0.06], [0.71, 0.06]], 30, { a0: 2.2, a1: 6.0 }).rotateZ(-PI / 2);
      P.mirX(cover2, 'armorB', xf(3.08, -LT, 0));
      for (const mir of [IDENT, MIRX]) {
        boltRing(P, 'joint', 22, 1.915, mir.clone().multiply(xf(2.7, -LT, 0, 0, 0, -PI / 2)), 0.07, 0.07);
        boltRing(P, 'joint', 14, 1.61, mir.clone().multiply(xf(2.86, -LT, 0, 0, 0, -PI / 2)), 0.06, 0.05);
        boltRing(P, 'joint', 10, 0.96, mir.clone().multiply(xf(3.14, -LT, 0, 0, 0, -PI / 2)), 0.07, 0.07);
        boltRing(P, 'joint', 6, 0.36, mir.clone().multiply(xf(3.38, -LT, 0, 0, 0, -PI / 2)), 0.06, 0.06);
      }
      // rim armour band around the lower half of each disc
      const band = extrYZ(sector(KR, KR + 0.17, PI * 1.02, PI * 1.98), 1.8, 2.55, 0.04, 30);
      P.mirX(band, 'armorA', xf(0, -LT, 0));
      // inspection port on the cheek bar
      const ring = lathe([[0.36, 0], [0.56, 0], [0.56, 0.09], [0.36, 0.09]], 20).rotateZ(-PI / 2);
      for (const y of [-8.95, -7.0 - 100]) if (y > -50) { P.mirX(ring, 'joint', xf(2.5, y, 0)); P.mirX(cylX(0.36, 0.04, 16), 'dark', xf(2.52, y, 0)); }
      P.mirX(new THREE.BoxGeometry(0.05, 0.42, 2.3), 'armorB', xf(2.525, -9.75, 0), 0.8);
    }
    // cross members + X bracing between the girders
    const cy = [-3.0, -4.9, -6.8, -8.7];
    for (const y of cy) P.add(cbox(1.7, 0.55, 1.7, 0.05), 'steel', xf(0, y, -0.1));
    for (let i = 0; i < cy.length - 1; i++) {
      const s = i % 2 ? 1 : -1;
      P.add(tube([[-0.72 * s, cy[i] - 0.2, 0.35], [0.72 * s, cy[i + 1] + 0.2, 0.35]], 0.1, 6, 1), 'rust');
      P.add(tube([[0.72 * s, cy[i] - 0.2, -0.5], [-0.72 * s, cy[i + 1] + 0.2, -0.5]], 0.1, 6, 1), 'rust');
    }
    // spine pipes in the gap (top side)
    for (const [x, r] of [[-0.42, 0.13], [-0.08, 0.09], [0.2, 0.09], [0.48, 0.14]]) {
      P.add(tube([[x, -2.3, 0.5], [x, -3.0, 0.92], [x, -6.0, 0.95], [x, -8.6, 0.92], [x * 0.6, -9.6, 0.6], [x * 0.4, -10.4, 0.0]], r, 7), x > 0.3 ? 'armorY' : 'joint');
    }
    for (const y of [-3.9, -5.9, -7.9]) P.add(cbox(1.5, 0.16, 0.14, 0.03), 'joint', xf(0, y, 1.08));
    // top armour plates (pale), ribs, bolts
    const plates = [[-3.75, -6.35, 'armorA'], [-6.55, -9.15, 'armorA']];
    plates.forEach(([y0, y1, key], pi) => {
      const yc = (y0 + y1) / 2, len = y0 - y1;
      P.add(cbox(4.3, len, 0.26, 0.08), key, xf(0, yc, 1.33));
      P.add(cbox(0.55, len - 0.4, 0.14, 0.04), pi ? 'armorB' : key, xf(0, yc, 1.52));
      P.mirX(cbox(0.2, len - 0.3, 0.12, 0.04), key, xf(1.98, yc, 1.5));
      const fr = xf(0, 0, 1.46, PI / 2, 0, 0);
      for (const x of [-2.05, 2.05]) boltRow(P, 'joint', 6, [x, 0, -(y0 - 0.2)], [x, 0, -(y1 + 0.2)], fr, 0.055, 0.05);
      for (const y of [y0 - 0.14, y1 + 0.14]) boltRow(P, 'joint', 5, [-0.5, 0, -y], [0.5, 0, -y], fr, 0.05, 0.05);
    });
    // safety handrails along both top edges (human-scale cue), chipped yellow
    for (const sx of [1, -1]) {
      for (let y = -3.9; y > -9.2; y -= 1.3) P.add(cbox(0.06, 0.06, 1.1, 0.01), 'armorY', xf(sx * 2.08, y, 2.0));
      for (const z of [2.05, 2.55]) P.add(cbox(0.06, 5.5, 0.06, 0.01), 'armorY', xf(sx * 2.08, -6.5, z));
    }
    // lifting eyes
    P.mirX(new THREE.TorusGeometry(0.17, 0.045, 6, 12).rotateY(PI / 2), 'joint', xf(2.02, -3.95, 1.56));
    P.mirX(new THREE.TorusGeometry(0.17, 0.045, 6, 12).rotateY(PI / 2), 'joint', xf(2.02, -8.95, 1.56));
    // knee-cylinder base clevises on the top
    for (const s of [1, -1]) {
      P.add(cbox(1.0, 1.25, 0.75, 0.08), 'steel', xf(s * A_KNEE[0], A_KNEE[1] + 0.25, 1.55));
      for (const dx of [-0.42, 0.42]) P.add(extrYZ(poly([[1.5, -3.75], [1.5, -2.5], [2.3, -2.62], [2.52, -3.05], [2.3, -3.45]]), s * A_KNEE[0] + dx - 0.07, s * A_KNEE[0] + dx + 0.07, 0.02), 'steel');
      P.add(cylX(0.2, 1.15, 12), 'joint', xf(s * A_KNEE[0], A_KNEE[1], A_KNEE[2]));
    }
    // side armour on the outer girder faces
    {
      const s1 = poly([[-1.08, -2.45], [0.9, -2.45], [1.08, -2.75], [1.08, -5.95], [-1.08, -5.95]]);
      P.mirX(extrYZ(s1, 2.05, 2.28, 0.06), 'armorA');
      const s2 = poly([[-1.08, -6.2], [1.08, -6.2], [1.08, -8.2], [0.7, -8.45], [-1.08, -8.45]]);
      P.mirX(extrYZ(s2, 2.05, 2.25, 0.06), 'armorB');
      P.mirX(cbox(0.1, 3.1, 0.16, 0.03), 'armorA', xf(2.3, -4.3, -0.62));
      P.mirX(cbox(0.1, 1.3, 1.0, 0.03), 'armorB', xf(2.31, -3.5, 0.3));
      P.mirX(tube([[2.36, -3.0, 0.62], [2.5, -3.1, 0.62], [2.5, -3.9, 0.62], [2.36, -4.0, 0.62]], 0.03, 5), 'joint');
      for (const mir of [IDENT, MIRX]) {
        const fr = mir.clone().multiply(xf(2.28, 0, 0, 0, 0, -PI / 2));   // bolt axis -> +x
        // frame: local y -> +x ; local x -> -y(thigh) ; local z -> z
        boltRow(P, 'joint', 8, [2.6, 0, 0.95], [5.8, 0, 0.95], fr, 0.055, 0.05);
        boltRow(P, 'joint', 8, [2.6, 0, -0.95], [5.8, 0, -0.95], fr, 0.055, 0.05);
        boltRow(P, 'joint', 5, [6.35, 0, 0.92], [8.05, 0, 0.92], fr, 0.055, 0.05);
        boltRow(P, 'joint', 5, [6.35, 0, -0.92], [8.3, 0, -0.92], fr, 0.055, 0.05);
      }
      // leg number stencil on both sides (kept readable: not mirrored)
      P.add(new THREE.PlaneGeometry(1.7, 1.7), 'decal', xf(2.285, -7.3, 0, 0, PI / 2, 0).multiply(xf(0, 0, 0, 0, 0, PI / 2)));
      P.add(new THREE.PlaneGeometry(1.7, 1.7), 'decal', xf(-2.285, -7.3, 0, 0, -PI / 2, 0).multiply(xf(0, 0, 0, 0, 0, -PI / 2)));
    }
    // ---- round 2: hydraulics on the girder sides (accumulators, valve block, clipped hard lines), cable drum, lamps
    {
      const bottle = lathe([[0, -0.85], [0.16, -0.85], [0.27, -0.7], [0.27, 0.7], [0.16, 0.85], [0.08, 0.9], [0.08, 1.0], [0, 1.0]], 14);
      for (const z of [-0.3, 0.32]) {
        P.mirX(bottle, 'armorY', xf(2.6, -5.0, z), z < 0 ? 0.55 : 0.7);
        P.mirX(hex(0.1, 0.12), 'joint', xf(2.6, -4.0, z));
      }
      for (const y of [-4.55, -5.5]) { P.mirX(cbox(0.14, 0.1, 1.3, 0.02), 'joint', xf(2.84, y, 0.01)); P.mirX(cbox(0.6, 0.1, 0.1, 0.02), 'joint', xf(2.58, y, -0.64)); P.mirX(cbox(0.6, 0.1, 0.1, 0.02), 'joint', xf(2.58, y, 0.66)); }
      // valve block with fittings, pilot lines to the bottles
      P.mirX(cbox(0.36, 0.62, 0.9, 0.04), 'joint', xf(2.48, -6.25, 0.5));
      for (const z of [0.22, 0.5, 0.78]) { P.mirX(hex(0.07, 0.12).rotateZ(-PI / 2), 'joint', xf(2.66, -6.1, z)); P.mirX(cyl(0.05, 0.12, 8), 'joint', xf(2.56, -5.9, z)); }
      P.mirX(tube([[2.6, -5.95, 0.3], [2.62, -5.75, 0.31], [2.6, -5.86, -0.3]], 0.03, 5), 'joint');
      // three hard lines along the lower edge of the girder side, clipped every metre, down to the knee hub
      for (const [z, r] of [[-0.84, 0.045], [-0.72, 0.035], [-0.62, 0.035]]) {
        P.mirX(tube([[2.5, -6.4, 0.2 + z * 0.3], [2.36, -6.7, z], [2.34, -8.6, z], [2.6, -9.3, z * 0.9], [2.6, -10.3, z * 1.25]], r, 5, 18), z < -0.8 ? 'armorY' : 'joint');
        P.mirX(tube([[2.34, -2.2, z], [2.36, -3.4, z], [2.34, -4.3, z], [2.5, -4.5, z + 0.1]], r, 5, 10), 'joint');
      }
      for (const y of [-2.6, -3.5, -7.1, -7.9, -8.6]) { P.mirX(cbox(0.1, 0.09, 0.4, 0.015), 'joint', xf(2.36, y, -0.73)); P.mirX(bolt(0.03, 0.04), 'joint', xf(2.4, y, -0.56, 0, 0, -PI / 2)); }
      // ID plate + grab handles + latches on the side armour
      P.mirX(cbox(0.03, 0.34, 0.52, 0.008), 'armorY', xf(2.3, -2.95, -0.2), 1.1);
      for (const y of [-6.5, -8.15]) for (const z of [-0.7, 0.7]) P.mirX(cbox(0.06, 0.2, 0.09, 0.015), 'joint', xf(2.27, y, z));
      // cable drum between the knee rams
      const drum = latheX([[0, -0.52], [0.72, -0.52], [0.72, -0.44], [0.46, -0.44], [0.5, -0.33], [0.46, -0.22], [0.5, -0.11], [0.46, 0], [0.5, 0.11], [0.46, 0.22], [0.5, 0.33], [0.46, 0.44], [0.72, 0.44], [0.72, 0.52], [0, 0.52]], 20);
      P.add(drum, 'joint', xf(0, -7.85, 2.2));
      P.mirX(extrYZ(poly([[1.5, -8.35], [1.5, -7.35], [2.25, -7.7], [2.25, -8.0]]), 0.56, 0.66, 0.02), 'steel');
      P.mirX(cyl(0.09, 0.2, 8).rotateZ(PI / 2), 'joint', xf(0.72, -7.85, 2.2));
      P.add(tube([[0.2, -7.4, 2.4], [0.24, -6.6, 1.75], [0.3, -5.6, 1.62], [0.32, -4.2, 1.6]], 0.045, 5, 12), 'rubber');
      // amber marker lamps: knee cheek + hip end
      for (const [y, z] of [[-9.4, 1.5], [-2.25, 0.9]]) { P.mirX(cbox(0.14, 0.2, 0.3, 0.02), 'joint', xf(2.54, y, z)); P.mirX(new THREE.BoxGeometry(0.04, 0.06, 0.1), 'lampA', xf(2.63, y, z)); }
      // grease nipples around the knee hubs
      for (const a of [0.6, 2.2, 3.9, 5.4]) P.mirX(hex(0.045, 0.1).rotateZ(-PI / 2), 'joint', xf(2.7, -LT + Math.cos(a) * 2.12, Math.sin(a) * 2.12));
    }
    // underside: flange ribs, lift-cylinder lugs, sagging hose bundle
    for (let y = -2.6, i = 0; y > -9.2; y -= 0.95, i++) P.mirX(cbox(1.38, 0.15, 0.3, 0.03), i % 3 === 1 ? 'rust' : 'steel', xf(1.4, y, -1.3));
    for (const s of [1, -1]) {
      P.add(cbox(1.05, 1.3, 0.5, 0.07), 'steel', xf(s * B_LIFT[0], B_LIFT[1], -1.4));
      for (const dx of [-0.4, 0.4]) P.add(extrYZ(poly([[-1.25, -6.8], [-1.25, -8.4], [-1.75, -8.05], [-1.98, -7.6], [-1.75, -7.15]]), s * B_LIFT[0] + dx - 0.07, s * B_LIFT[0] + dx + 0.07, 0.02), 'steel');
      P.add(cylX(0.2, 1.1, 12), 'joint', xf(s * B_LIFT[0], B_LIFT[1], B_LIFT[2]));
    }
    const hx = [-0.52, -0.3, -0.1, 0.12, 0.34, 0.54];
    hx.forEach((x, i) => {
      const sag = 0.35 + rnd() * 0.5, r = 0.055 + rnd() * 0.05;
      P.add(tube([[x, -2.2, -0.9], [x, -3.0, -1.2], [x + (rnd() - 0.5) * 0.15, -4.8, -1.25 - sag], [x, -6.8, -1.2], [x + (rnd() - 0.5) * 0.15, -8.2, -1.25 - sag * 0.8], [x * 0.7, -9.4, -1.0], [x * 0.5, -10.2, -0.3]], r, 6), 'rubber');
    });
    for (const y of [-3.0, -6.8]) P.add(cbox(1.5, 0.18, 0.2, 0.03), 'joint', xf(0, y, -1.22));
    return P.build();
  }

  // ---------------------------------------------------------------- part: shin
  // frame: origin = knee, bone to (0,-LS,0) = ankle ball, +X hinge, +Z = OUTER face (seen from outside).
  const B_KNEE = [1.25, 2.9, 0.6];       // knee cylinder rod eye on the shin's lever tail
  const A_ANK = [[1.32, -13.2, 2.28], [1.15, -13.2, -1.62]];   // ankle stabiliser bases (outer, inner)
  function buildShin() {
    const P = new Part();
    // knee: centre drum, axle, lever plates (fork for the cylinder rods), kneecap
    P.add(latheX([[0, -0.74], [1.55, -0.74], [1.7, -0.6], [1.7, 0.6], [1.55, 0.74], [0, 0.74]], 36), 'joint');
    P.add(cylX(0.62, 3.72, 20), 'joint');
    {
      const tipA = Math.atan2(B_KNEE[1], B_KNEE[2]), tipR = Math.hypot(B_KNEE[1], B_KNEE[2]);
      const disc = new THREE.Shape(); disc.absarc(0, 0, 1.95, 0, PI * 2, false);
      // inner lever: disc + stadium to the pin
      const st = new THREE.Shape(); const w = 0.62, ux = Math.cos(tipA), uy = Math.sin(tipA), vx = -uy, vy = ux;
      st.moveTo(-vx * w, -vy * w); st.lineTo(B_KNEE[2] - vx * w, B_KNEE[1] - vy * w);
      st.absarc(B_KNEE[2], B_KNEE[1], w, tipA - PI / 2, tipA + PI / 2, false); st.lineTo(vx * w, vy * w); st.closePath();
      P.mirX(extrYZ(disc, 0.78, 0.98, 0.04, 40), 'steel');
      P.mirX(extrYZ(st, 0.78, 0.98, 0.04, 16), 'steel');
      // outer lever: disc + big sector that also carries the kneecap lames
      const sec = new THREE.Shape(); const s0 = -0.42, s1 = tipA - 0.05;
      sec.moveTo(0, 0); sec.absarc(0, 0, 2.62, s0, s1, false); sec.closePath();
      P.mirX(extrYZ(disc, 1.52, 1.74, 0.04, 40), 'steel');
      P.mirX(extrYZ(sec, 1.52, 1.74, 0.04, 30), 'steel');
      P.mirX(extrYZ(st, 1.52, 1.74, 0.04, 16), 'steel');
      P.add(cylX(0.21, 3.7, 14), 'joint', xf(0, B_KNEE[1], B_KNEE[2]));
      P.mirX(cylX(0.38, 0.12, 14), 'joint', xf(1.8, B_KNEE[1], B_KNEE[2]));
      // stiffener ribs on the sector
      for (const a of [0.0, 0.45, 0.9]) P.mirX(cbox(0.1, 0.14, 0.8, 0.03), 'steel', xf(1.77, Math.sin(a) * 2.15, Math.cos(a) * 2.15, -a, 0, 0));
      // kneecap: three overlapping lames (lobster tail)
      const lames = [[-0.40, 0.26, 2.58, 2.77, 'armorA'], [0.18, 0.76, 2.67, 2.86, 'armorB'], [0.68, 1.16, 2.76, 2.95, 'armorA']];
      for (const [a0, a1, ri, ro, key] of lames) {
        P.add(extrYZ(sector(ri, ro, a0, a1), -1.79, 1.79, 0.05, 14), key);
        for (const a of [a0 + 0.07, a1 - 0.07]) {
          const fr = xf(0, Math.sin(a) * ro, Math.cos(a) * ro, PI / 2 - a, 0, 0);
          boltRow(P, 'joint', 7, [-1.55, 0, 0], [1.55, 0, 0], fr, 0.06, 0.05);
        }
        for (const x of [-1.05, 1.05]) P.add(extrYZ(sector(ro - 0.01, ro + 0.05, a0 + 0.02, a1 - 0.02), x - 0.09, x + 0.09, 0.015, 10), 'joint');
        const am = (a0 + a1) / 2;
        P.add(cbox(0.3, 0.1, (a1 - a0) * ro * 0.8, 0.03), key, xf(0, Math.sin(am) * (ro + 0.03), Math.cos(am) * (ro + 0.03), -am + PI / 2, 0, 0).multiply(xf(0, 0, 0, PI / 2, 0, 0)));
      }
    }
    // structural core
    P.add(cbox(2.5, 15.7, 2.7, 0.08), 'steel', xf(0, -9.0, 0));
    // ---- armour shell: one big tapered shield wrapping the outer face and both sides (three stacked
    //      sections with real seams), open at the back. Detail is layered on in surface-aligned frames.
    {
      const SH = { yT: -3.3, yB: -16.3, hx: 2.3, z0: -1.25, z1: 2.15, tx: 0.33, tz: 0.1 };
      const zc = (SH.z0 + SH.z1) / 2, H = SH.yT - SH.yB;
      const taperShell = (geo) => {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const k = Math.min(1, Math.max(0, (SH.yT - p.getY(i)) / H));
          p.setX(i, p.getX(i) * (1 - SH.tx * k)); p.setZ(i, zc + (p.getZ(i) - zc) * (1 - SH.tz * k));
        }
        geo.computeVertexNormals(); return geo;
      };
      for (const [ya, yb, key, tint] of [[-3.3, -8.2, 'armorA', 1.0], [-8.33, -12.35, 'armorA', 0.92], [-12.48, -16.3, 'armorA', 1.04]]) {
        P.add(taperShell(cbox(SH.hx * 2, ya - yb, SH.z1 - SH.z0, 0.14).translate(0, (ya + yb) / 2, zc)), key, undefined, tint);
      }
      const tiltX = Math.atan(SH.hx * SH.tx / H), tiltZ = Math.atan((SH.z1 - zc) * SH.tz / H);
      // sloped visor from the shell top up toward the kneecap
      P.add(cbox(4.0, 1.6, 0.26, 0.07), 'armorA', xf(0, -2.72, 1.72, -0.62, 0, 0));
      P.mirX(extrYZ(poly([[-1.2, -3.3], [2.15, -3.3], [1.25, -2.05], [-1.2, -2.6]]), 1.76, 2.0, 0.05), 'armorA');

      // ---- outer face frame: coordinates (x, -s, dz) with s = distance down the face, dz = out of the face
      const FO = xf(0, SH.yT, SH.z1, tiltZ, 0, 0);
      const O = (geo, key, m, tint) => P.add(geo, key, FO.clone().multiply(m || IDENT), tint);
      const OB = (dz) => FO.clone().multiply(xf(0, 0, dz, PI / 2, 0, 0));      // bolt frame: [x, 0, s]
      // upper section
      O(extrXY(poly([[-1.8, -0.6], [1.8, -0.6], [1.98, -1.2], [1.8, -4.55], [-1.8, -4.55], [-1.98, -1.2]]), 0, 0.17, 0.06), 'armorA');
      O(extrXY(poly([[-1.15, -1.2], [1.15, -1.2], [1.15, -2.9], [0.85, -3.3], [-0.85, -3.3], [-1.15, -2.9]]), 0.15, 0.31, 0.05), 'armorB');
      O(tube([[-0.5, -2.0, 0.3], [-0.5, -2.0, 0.45], [0.5, -2.0, 0.45], [0.5, -2.0, 0.3]], 0.035, 5), 'joint');
      for (let i = 0; i < 5; i++) O(cbox(1.9, 0.07, 0.13, 0.02), 'joint', xf(0, -3.72 - i * 0.16, 0.2, 0.5, 0, 0));
      for (const x of [-1.56, 1.56]) O(cbox(0.2, 3.3, 0.14, 0.04), 'armorA', xf(x, -2.85, 0.24));
      boltRow(P, 'joint', 7, [-1.6, 0, 0.85], [1.6, 0, 0.85], OB(0.17), 0.07, 0.06);
      boltRow(P, 'joint', 8, [-1.6, 0, 4.32], [1.6, 0, 4.32], OB(0.17), 0.07, 0.06);
      for (const x of [-2.1, 2.1]) boltRow(P, 'joint', 9, [x, 0, 0.5], [x * 0.895, 0, 4.6], OB(0), 0.075, 0.07);
      boltRow(P, 'joint', 4, [-0.95, 0, 1.38], [0.95, 0, 1.38], OB(0.31), 0.05, 0.05);
      boltRow(P, 'joint', 3, [-0.65, 0, 3.12], [0.65, 0, 3.12], OB(0.31), 0.05, 0.05);
      // mid section
      O(new THREE.BoxGeometry(3.5, 0.5, 0.05), 'armorB', xf(0, -5.62, 0.02), 0.85);
      O(new THREE.PlaneGeometry(1.9, 1.9), 'decal', xf(0, -7.35, 0.012));
      for (const x of [-1.5, 1.5]) O(cbox(0.18, 2.6, 0.12, 0.04), 'armorA', xf(x, -7.4, 0.05));
      for (const x of [-1.62, 1.62]) O(new THREE.TorusGeometry(0.16, 0.045, 6, 12), 'joint', xf(x, -5.28, 0.04, PI / 2, 0, 0));
      boltRow(P, 'joint', 8, [-1.72, 0, 5.22], [1.72, 0, 5.22], OB(0), 0.07, 0.06);
      boltRow(P, 'joint', 7, [-1.55, 0, 8.85], [1.55, 0, 8.85], OB(0), 0.07, 0.06);
      // boot section
      O(extrXY(poly([[-0.95, -9.5], [0.95, -9.5], [0.95, -12.3], [0.72, -12.8], [-0.72, -12.8], [-0.95, -12.3]]), 0, 0.2, 0.07), 'armorB');
      O(cbox(2.9, 0.24, 0.18, 0.04), 'armorB', xf(0, -9.42, 0.08));
      O(cbox(2.5, 0.24, 0.18, 0.04), 'armorB', xf(0, -12.86, 0.08));
      O(new THREE.BoxGeometry(1.7, 0.36, 0.04), 'armorA', xf(0, -11.0, 0.21), 0.8);
      boltRow(P, 'joint', 4, [-0.75, 0, 9.75], [0.75, 0, 9.75], OB(0.2), 0.06, 0.06);
      boltRow(P, 'joint', 4, [-0.72, 0, 12.2], [0.72, 0, 12.2], OB(0.2), 0.06, 0.06);
      for (const x of [-1.5, 1.5]) boltRow(P, 'joint', 6, [x, 0, 9.75], [x * 0.94, 0, 12.6], OB(0), 0.07, 0.06);

      // ---- round 2 (outer face): hinged hatches with latches, overlapping applique plates, clipped hard lines,
      //      ID plates, footsteps, marker lamps
      for (const s of [1.55, 2.6]) { O(cbox(0.2, 0.3, 0.1, 0.02), 'joint', xf(-1.17, -s, 0.3)); O(cyl(0.035, 0.36, 6), 'joint', xf(-1.25, -s, 0.33)); }
      O(cbox(0.1, 0.36, 0.08, 0.02), 'joint', xf(1.02, -2.4, 0.34)); O(cbox(0.22, 0.08, 0.06, 0.015), 'joint', xf(1.1, -2.4, 0.37));
      // mid section: two overlapping applique plates (different tone, lifted edge = visible gap) + small hatch
      O(extrXY(poly([[-1.36, -5.95], [-1.04, -5.95], [-1.04, -8.7], [-1.3, -8.7], [-1.42, -8.2]]), 0.03, 0.1, 0.03), 'armorB', xf(0, 0, 0, 0, 0.035, 0), 0.82);
      O(extrXY(poly([[1.04, -6.1], [1.4, -6.1], [1.33, -8.75], [1.04, -8.75]]), 0.03, 0.1, 0.03), 'armorA', xf(0, 0, 0, 0, -0.03, 0), 1.12);
      boltRow(P, 'joint', 6, [-1.2, 0, 6.1], [-1.2, 0, 8.55], OB(0.1), 0.045, 0.04);
      boltRow(P, 'joint', 6, [1.2, 0, 6.25], [1.2, 0, 8.6], OB(0.1), 0.045, 0.04);
      O(cbox(0.62, 0.46, 0.05, 0.015), 'armorB', xf(0.45, -8.62, 0.03), 0.9);
      for (const x of [0.2, 0.7]) O(cbox(0.1, 0.08, 0.05, 0.01), 'joint', xf(x, -8.38, 0.06));
      O(cbox(0.14, 0.06, 0.06, 0.01), 'joint', xf(0.45, -8.84, 0.06));
      O(cbox(0.5, 0.3, 0.025, 0.006), 'armorY', xf(-0.5, -8.62, 0.015), 1.15);                 // ID plate
      for (const x of [-0.71, -0.29]) for (const s of [8.51, 8.73]) P.add(bolt(0.018, 0.02), 'joint', OB(0.027).multiply(xf(x, 0, s)));
      // two hard lines down the left margin, P-clips every metre, unions at the section seams
      for (const [x, r] of [[-1.86, 0.04], [-1.76, 0.03]]) {
        O(tube([[x - 0.1, -0.7, 0.2], [x, -1.3, 0.07], [x + 0.08, -4.6, 0.07], [x + 0.13, -7.0, 0.07], [x + 0.2, -9.0, 0.07], [x + 0.22, -9.35, -0.1]], r, 5, 36), x < -1.8 ? 'armorY' : 'joint');
        O(hex(r * 1.8, 0.16), 'joint', xf(x + 0.085, -4.9, 0.07));
      }
      for (let s = 1.6; s < 9.1; s += 1.05) O(cbox(0.26, 0.07, 0.08, 0.012), 'joint', xf(-1.845 + 0.026 * s, -s, 0.06));
      // footsteps / grab rungs up the right margin (human scale)
      for (let s = 9.75; s < 12.7; s += 0.42) O(tube([[1.14, -s, 0.2], [1.14, -s, 0.33], [1.42, -s, 0.33], [1.42, -s, 0.2]].map(([a, b, c]) => [a - 0.0, b, c - 0.2]), 0.02, 4, 6), 'joint');
      // marker lamps at the boot corners
      for (const x of [-1.32, 1.32]) { O(cbox(0.2, 0.14, 0.1, 0.02), 'joint', xf(x, -12.98, 0.05)); O(new THREE.BoxGeometry(0.09, 0.05, 0.04), 'lampA', xf(x, -12.98, 0.11)); }
      // drain scuppers under the louvres with weld-on lips
      for (const x of [-0.6, 0, 0.6]) O(cbox(0.22, 0.05, 0.07, 0.01), 'joint', xf(x, -4.5, 0.2));

      // ---- side frames: coordinates (dx out of the face, -s down the face, z)
      for (const sx of [1, -1]) {
        const F = (sx > 0 ? IDENT : MIRX).clone().multiply(xf(SH.hx, SH.yT, 0, 0, 0, -tiltX));
        const S = (geo, key, m, tint) => P.add(geo, key, F.clone().multiply(m || IDENT), tint);
        const SB = (dx) => F.clone().multiply(xf(dx, 0, 0, 0, 0, -PI / 2));     // bolt frame: [s, 0, z]
        S(extrYZ(poly([[-0.9, -0.6], [1.75, -0.6], [1.95, -1.1], [1.95, -4.5], [-0.9, -4.5], [-1.05, -4.0], [-1.05, -1.1]]), 0, 0.15, 0.05), 'armorA');
        S(cbox(0.1, 1.5, 1.15, 0.03), 'armorB', xf(0.2, -2.3, 0.45));
        S(tube([[0.24, -1.9, 0.8], [0.38, -2.0, 0.8], [0.38, -2.6, 0.8], [0.24, -2.7, 0.8]], 0.03, 5), 'joint');
        S(cbox(0.14, 3.6, 0.22, 0.03), 'armorA', xf(0.2, -2.6, -0.72));
        S(cbox(0.14, 3.6, 0.22, 0.03), 'armorA', xf(0.2, -2.6, 1.72));
        S(cbox(0.18, 0.22, 0.42, 0.03), 'joint', xf(0.08, -0.32, 1.35));
        S(new THREE.BoxGeometry(0.06, 0.12, 0.26), 'lampA', xf(0.2, -0.32, 1.35));
        boltRow(P, 'joint', 6, [0.8, 0, -0.75], [0.8, 0, 1.75], SB(0.15));
        boltRow(P, 'joint', 6, [4.3, 0, -0.75], [4.3, 0, 1.75], SB(0.15));
        boltRow(P, 'joint', 9, [0.4, 0, 2.02], [4.6, 0, 2.0], SB(0), 0.07, 0.06);
        boltRow(P, 'joint', 9, [0.4, 0, -1.12], [4.6, 0, -1.1], SB(0), 0.07, 0.06);
        // mid: external shock strut
        S(lathe([[0, -7.7], [0.3, -7.7], [0.3, -7.5], [0.26, -7.45], [0.26, -5.5], [0.33, -5.45], [0.33, -5.15], [0, -5.15]], 16), 'cyl', xf(0.34, 0, -0.62));
        S(lathe([[0.14, -8.9], [0.14, -7.65]], 14), 'chrome', xf(0.34, 0, -0.62));
        for (const y of [-5.3, -8.85]) { S(cbox(0.6, 0.5, 0.55, 0.05), 'steel', xf(0.2, y, -0.62)); S(cylZ(0.1, 0.8, 8), 'joint', xf(0.34, y, -0.62)); }
        boltRow(P, 'joint', 5, [5.2, 0, 0.1], [5.2, 0, 1.75], SB(0));
        boltRow(P, 'joint', 5, [8.85, 0, 0.1], [8.85, 0, 1.75], SB(0));
        // boot
        S(extrYZ(poly([[-0.9, -9.5], [1.6, -9.5], [1.6, -12.7], [-0.9, -12.7]]), 0, 0.16, 0.05), 'armorA');
        S(cbox(0.12, 0.25, 2.5, 0.03), 'armorA', xf(0.2, -10.0, 0.35));
        S(cbox(0.12, 0.25, 2.5, 0.03), 'armorA', xf(0.2, -12.2, 0.35));
        boltRow(P, 'joint', 6, [9.7, 0, -0.75], [9.7, 0, 1.45], SB(0.16), 0.07, 0.06);
        boltRow(P, 'joint', 6, [12.5, 0, -0.75], [12.5, 0, 1.45], SB(0.16), 0.07, 0.06);
        // heavy sagging hose loops hanging off the back corner
        S(tube([[-0.25, -3.2, -1.3], [0.4, -4.0, -1.75], [0.95, -6.5, -1.95], [0.75, -8.8, -1.8], [-0.15, -9.8, -1.45]], 0.15, 8, 30), 'rubber');
        S(tube([[-0.25, -1.9, -1.35], [0.75, -3.1, -2.05], [1.35, -7.0, -2.2], [1.0, -10.2, -1.95], [-0.15, -11.0, -1.5]], 0.11, 8, 30), 'rubber');
        S(cbox(0.5, 0.5, 0.5, 0.05), 'joint', xf(-0.2, -2.6, -1.4));
        S(cbox(0.5, 0.5, 0.5, 0.05), 'joint', xf(-0.2, -10.4, -1.42));
        if (sx > 0) {
          // access ladder
          for (const z of [0.2, 0.92]) S(cbox(0.06, 7.9, 0.06, 0.01), 'joint', xf(0.34, -9.0, z));
          for (let y = -5.2; y > -12.9; y -= 0.42) S(cylZ(0.03, 0.72, 6), 'joint', xf(0.34, y, 0.56));
          for (const y of [-5.3, -7.6, -9.9, -12.5]) for (const z of [0.2, 0.92]) S(cbox(0.36, 0.06, 0.06, 0.01), 'joint', xf(0.17, y, z));
        } else {
          for (const z of [0.5, 0.75]) S(tube([[0.1, -0.2, z], [0.1, -4.6, z], [0.06, -5.0, z], [0.06, -9.3, z], [0.22, -9.7, z], [0.22, -12.6, z]], 0.05, 6), 'joint');
          S(cbox(0.3, 0.8, 0.7, 0.03), 'armorB', xf(0.12, -6.6, 0.62));
          S(cbox(0.28, 0.5, 0.5, 0.03), 'armorY', xf(0.26, -11.2, 0.62));
        }
      }
    }
    // ---- inner/back face (-Z): exposed structure, hoses, tanks
    {
      for (let y = -2.7, i = 0; y > -16.5; y -= 1.12, i++) P.add(cbox(2.74, 0.16, 0.42, 0.03), i % 4 === 2 ? 'rust' : 'steel', xf(0, y, -1.42));
      P.mirX(cbox(0.22, 14.4, 0.34, 0.04), 'steel', xf(1.08, -9.4, -1.5));
      const hz = [-0.82, -0.6, -0.36, -0.12, 0.14, 0.4, 0.66, 0.86];
      hz.forEach((x, i) => {
        const r = 0.05 + rnd() * 0.07, z = -1.72 - rnd() * 0.12, w = () => (rnd() - 0.5) * 0.16;
        P.add(tube([[x * 0.7, -1.5, -1.0], [x, -2.6, z + 0.1], [x + w(), -5.2, z - 0.1 - rnd() * 0.2], [x + w(), -8.0, z], [x + w(), -11.0, z - rnd() * 0.25], [x + w(), -14.0, z], [x * 0.8, -15.9, z + 0.05], [x * 0.6, -16.6, -1.3]], r, 5, 28), i === 3 ? 'armorY' : 'rubber');
      });
      for (const y of [-3.9, -7.3, -10.6, -13.9]) P.add(cbox(2.1, 0.2, 0.16, 0.03), 'joint', xf(0, y, -1.86));
      // accumulator bottles
      const tank = lathe([[0, -1.25], [0.25, -1.25], [0.42, -1.05], [0.42, 1.05], [0.25, 1.25], [0.12, 1.3], [0.12, 1.42], [0, 1.42]], 18);
      P.mirX(tank, 'armorY', xf(0.56, -5.6, -2.2));
      P.mirX(cbox(0.95, 0.12, 0.5, 0.02), 'joint', xf(0.56, -4.9, -2.05));
      P.mirX(cbox(0.95, 0.12, 0.5, 0.02), 'joint', xf(0.56, -6.3, -2.05));
      P.add(cbox(1.5, 0.62, 0.5, 0.05), 'joint', xf(0, -12.2, -1.95));
      for (const x of [-0.55, -0.2, 0.2, 0.55]) P.add(cyl(0.07, 0.3, 8), 'joint', xf(x, -11.8, -1.95));
      P.add(cbox(1.1, 0.85, 0.36, 0.04), 'armorB', xf(0, -9.0, -2.0));
    }
    // ---- ankle: socket cup, octagonal boot skirt, stabiliser lugs
    P.add(lathe([[1.3, -17.82], [1.56, -17.82], [1.78, -17.6], [1.78, -16.95], [1.5, -16.5], [0, -16.5]], 32), 'joint');
    P.add(lathe([[2.02, -17.42], [2.3, -17.36], [1.86, -15.95], [1.6, -15.95]], 8, { flat: true, a0: PI / 8, a1: PI / 8 + PI * 2 }), 'armorA');
    boltRing(P, 'joint', 16, 1.79, xf(0, -17.25, 0), 0.07, 0.06);
    for (const [ax, ay, az] of A_ANK) {
      const zs = Math.sign(az);
      P.mirX(cbox(0.72, 0.9, 0.6, 0.06), 'steel', xf(ax, ay, az - zs * 0.3));
      P.mirX(cylX(0.13, 0.9, 10), 'joint', xf(ax, ay, az));
    }
    return P.build();
  }

  // ---------------------------------------------------------------- part: foot + toes
  // foot frame: origin = ankle ball centre, +Y up, +Z outward; ground plane at y = -ANKLE_H.
  const TOE_ANG = [0, 1.16, -1.16, PI], TOE_SCALE = [1, 1, 1, 0.78];
  const TOE_HINGE = [0, -0.95, 2.5];
  const B_ANK = [[1.18, -0.78, 1.92], [1.25, -0.78, -1.85]];
  function buildFoot() {
    const P = new Part();
    const GY = -AH;
    P.add(new THREE.SphereGeometry(1.2, 24, 14), 'joint');
    // heavy pad (lathe) with a stepped rim
    P.add(lathe([[0, GY], [2.35, GY], [2.75, GY + 0.3], [2.75, -1.25], [2.6, -1.1], [2.45, -1.1], [2.45, -0.92], [1.75, -0.86], [1.36, -0.58], [1.12, -0.46], [0, -0.46]], 44), 'steel');
    // lower tier: 8 radial armour wedges
    for (let i = 0; i < 8; i++) {
      const a = i * PI / 4 + PI / 8;
      P.add(extrXZ(sector(1.5, 2.56, -0.335, 0.335), -0.70, 0.22, 0.06, 8), i % 2 ? 'armorB' : 'armorA', xf(0, 0, 0, 0, a - PI / 2, 0));
      const fr = xf(0, -0.70, 0, 0, a, 0);
      P.add(bolt(0.07, 0.06), 'joint', fr.clone().multiply(xf(0.3, 0, 2.32)));
      P.add(bolt(0.07, 0.06), 'joint', fr.clone().multiply(xf(-0.3, 0, 2.32)));
    }
    // upper tier: thick knuckle covers over each toe root
    TOE_ANG.forEach((a, i) => {
      const s = TOE_SCALE[i], fr = xf(0, 0, 0, 0, a, 0);
      P.add(cbox(2.1 * s, 0.5, 1.5, 0.09), 'armorA', fr.clone().multiply(xf(0, -0.42, 2.05, 0.2, 0, 0)));
      P.add(cbox(1.5 * s, 0.22, 1.0, 0.05), 'armorB', fr.clone().multiply(xf(0, -0.1, 1.9, 0.2, 0, 0)));
      boltRow(P, 'joint', 4, [-0.9 * s, 0, 0.5], [0.9 * s, 0, 0.5], fr.clone().multiply(xf(0, -0.42, 2.05, 0.2, 0, 0)).multiply(xf(0, 0.25, 0)), 0.07, 0.06);
      for (const x of [-0.98, 0.98]) P.add(cbox(0.3, 0.95, 1.1, 0.05), 'steel', fr.clone().multiply(xf(x * s, TOE_HINGE[1], TOE_HINGE[2] - 0.05)));
      P.add(cylX(0.22, 2.35 * s, 12), 'joint', fr.clone().multiply(xf(0, TOE_HINGE[1], TOE_HINGE[2])));
    });
    P.add(lathe([[1.18, -0.6], [1.52, -0.72], [1.52, -0.5], [1.3, -0.38]], 32), 'joint');
    boltRing(P, 'joint', 14, 1.4, xf(0, -0.44, 0, 0.5, 0, 0).multiply(xf(0, 0, 0, -0.5, 0, 0)), 0.06, 0.06);
    // rim bolts
    for (let i = 0; i < 32; i++) P.add(bolt(0.09, 0.08), 'joint', xf(0, 0, 0, 0, i / 32 * PI * 2, 0).multiply(xf(0, -1.5, 2.75, PI / 2, 0, 0)));
    // ankle stabiliser lugs
    for (const [bx, by, bz] of B_ANK) {
      P.mirX(cbox(0.6, 0.5, 0.6, 0.05), 'steel', xf(bx, by - 0.14, bz));
      P.mirX(cylX(0.12, 0.8, 10), 'joint', xf(bx, by, bz));
    }
    // sole cleats
    for (let i = 0; i < 8; i++) P.add(cbox(0.4, 0.24, 1.5, 0.04), 'steel', xf(0, 0, 0, 0, i * PI / 4, 0).multiply(xf(0, GY - 0.02, 1.4)));
    // ---- round 2: pleated ankle gaiter with clamp bands, guard hoops, heel spurs, scraper lips, caked mud
    P.add(bellows(1.36, 1.64, -0.52, 0.46, 4, 28), 'rubber');
    for (const y of [-0.5, 0.42]) P.add(lathe([[1.5, y - 0.05], [1.68, y - 0.05], [1.68, y + 0.05], [1.5, y + 0.05]], 28), 'joint');
    for (let i = 0; i < 3; i++) P.add(cbox(0.16, 0.1, 0.12, 0.02), 'joint', xf(0, 0, 0, 0, 0.6 + i * 2.1, 0).multiply(xf(0, -0.5, 1.72)));
    for (const sa of [1, -1]) {
      // heel spurs between the side toes and the rear toe (fixed, worn)
      const spur = extrYZ(poly([[2.2, -1.2], [2.9, -1.3], [3.45, GY + 0.02], [3.4, GY - 0.12], [2.2, GY + 0.05]]), -0.3, 0.3, 0.07);
      P.add(spur, 'steel', xf(0, 0, 0, 0, sa * 2.2, 0));
      // guard hoop / grab rail over the pad between the front and side toes
      const pts = []; for (let i = 0; i <= 8; i++) { const a = sa * (0.34 + 0.5 * i / 8); pts.push([Math.sin(a) * 2.58, -0.92 + 0.42 * Math.sqrt(Math.sin(PI * i / 8)), Math.cos(a) * 2.58]); }
      P.add(tube(pts, 0.035, 5, 16), 'joint');
      // tie-down / towing lugs on the rim
      for (const a of [0.58, 2.62]) { const m = xf(0, 0, 0, 0, sa * a, 0); P.add(cbox(0.5, 0.5, 0.2, 0.04), 'steel', m.clone().multiply(xf(0, -1.38, 2.8))); P.add(new THREE.TorusGeometry(0.16, 0.05, 5, 10), 'joint', m.clone().multiply(xf(0, -1.52, 2.93))); }
    }
    // scraper lips welded round the rim, bent and uneven
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2 + 0.26; P.add(cbox(0.9, 0.12, 0.1, 0.02), 'steel', xf(0, 0, 0, 0, a, 0).multiply(xf(0, GY + 0.36, 2.79, 0.25 * Math.sin(i * 2.3), 0, 0.06 * Math.sin(i * 1.7)))); }
    {
      const mr = rng(771);
      for (let i = 0; i < 18; i++) {      // clods squeezed out round the pad
        const a = mr() * PI * 2, rad = 2.7 + mr() * 0.45, sc = 0.13 + mr() * 0.22;
        P.add(lump(sc * (1 + mr() * 0.9), sc * (0.5 + mr() * 0.4), sc * (1 + mr() * 0.9), i + 1, sc > 0.24 ? 2 : 1), 'mud', xf(Math.sin(a) * rad, GY + sc * 0.1, Math.cos(a) * rad, 0, mr() * 6, 0));
      }
      for (let i = 0; i < 9; i++) {       // cakes sitting on the pad shoulder and wedges
        const a = mr() * PI * 2, rad = 1.75 + mr() * 0.85, sc = 0.09 + mr() * 0.15;
        P.add(lump(sc * (1 + mr()), sc * 0.5, sc * (1 + mr()), i + 31), 'mud', xf(Math.sin(a) * rad, (rad > 2.45 ? -1.12 : -0.74) + sc * 0.1, Math.cos(a) * rad, 0, mr() * 6, 0));
      }
    }
    return P.build();
  }
  // toe frame: origin = knuckle hinge, +Z radially outward, hinge axis X; ground at y = gy
  function buildToe() {
    const P = new Part();
    const gy = -(AH + TOE_HINGE[1]);
    const LZ = 2.75;
    const taper = (geo, k) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = Math.min(1, Math.max(0, p.getZ(i) / LZ)); p.setX(i, p.getX(i) * (1 + k * z * z)); }
      geo.computeVertexNormals(); return geo;
    };
    // big curved blade: arched back, concave belly, chisel tip dug into the ground
    const claw = poly([[-0.5, gy + 0.35], [-0.5, 0.25], [-0.2, 0.62], [0.5, 0.86], [1.3, 0.78], [2.05, 0.38], [2.55, -0.3], [LZ, gy - 0.12],
      [2.3, gy - 0.12], [2.0, gy + 0.1], [1.45, gy + 0.2], [0.8, gy + 0.14], [0.25, gy + 0.0], [-0.2, gy]]);
    P.add(taper(extrYZ(claw, -0.86, 0.86, 0.13), -0.42), 'claw');
    // raised spine + cheek ribs on the blade
    const spine = poly([[-0.1, 0.6], [0.5, 0.95], [1.32, 0.88], [2.1, 0.46], [2.5, -0.1], [2.36, -0.2], [1.98, 0.34], [1.28, 0.74], [0.5, 0.8], [-0.02, 0.52]]);
    P.add(extrYZ(spine, -0.16, 0.16, 0.04), 'claw');
    // armour cover over the root
    const top = poly([[-0.42, 0.34], [-0.22, 0.72], [0.5, 0.98], [1.22, 0.92], [1.34, 0.8], [0.5, 0.86], [-0.14, 0.6], [-0.3, 0.3]]);
    P.add(extrYZ(top, -0.7, 0.7, 0.04), 'armorA');
    for (const x of [-0.55, 0.55]) for (const z of [0.2, 0.9]) P.add(bolt(0.07, 0.06), 'joint', xf(x, 0.86 + (z < 0.5 ? 0.02 : 0.1), z, 0.15, 0, 0));
    // hardened tip cap
    const tooth = poly([[2.18, -0.15], [2.6, -0.42], [LZ + 0.1, gy - 0.14], [2.2, gy - 0.14], [2.05, gy + 0.2]]);
    P.add(taper(extrYZ(tooth, -0.9, 0.9, 0.05), -0.42), 'claw');
    // knuckle barrel + end caps
    P.add(cylX(0.5, 1.6, 18), 'joint');
    P.mirX(cylX(0.32, 0.1, 12), 'joint', xf(0.85, 0, 0));
    // little hydraulic toe actuator under the cover (static)
    P.add(cyl(0.12, 0.9, 10), 'chrome', xf(0, 0.55, 0.55, PI / 2 - 0.3, 0, 0));
    // ---- round 2: hard-facing weld ridges on the cheeks, wear-plate bolts, tooth retainer pin, caked mud
    const hw = (z) => 0.86 * (1 - 0.42 * (z / LZ) * (z / LZ));
    [[0.75, 0.84], [1.15, 0.8], [1.55, 0.64], [1.95, 0.43], [2.3, 0.05]].forEach(([z, top]) => {
      const len = (top - gy) * 0.62, yc = (top + gy) / 2 + 0.05;
      for (const sx of [1, -1]) P.add(cbox(0.07, len, 0.08, 0.02), 'claw', xf(sx * (hw(z) - 0.005), yc, z, 0.5, 0, 0));
    });
    for (const sx of [1, -1]) {
      for (const [y, z] of [[0.3, 0.1], [0.42, 0.55], [0.36, 1.0], [-0.5, 0.1], [-0.55, 0.6]]) P.add(bolt(0.075, 0.07), 'joint', xf(sx * (hw(z) - 0.01), y, z, 0, 0, -sx * PI / 2));
      P.add(cyl(0.11, 0.08, 10).rotateZ(PI / 2), 'joint', xf(sx * hw(2.42), -0.5, 2.42));
    }
    // ragged worn cutting edge segments along the tip
    for (let i = 0; i < 4; i++) P.add(cbox(0.3, 0.2, 0.22, 0.04), 'claw', xf((i - 1.5) * 0.3, gy - 0.02, LZ - 0.06 + 0.05 * Math.sin(i * 2.1), 0.5 + 0.1 * Math.sin(i * 3.3), 0, 0));
    P.add(lump(0.34, 0.2, 0.3, 5), 'mud', xf(0.62, gy + 0.03, 0.75, 0, 0.4, 0));
    P.add(lump(0.3, 0.17, 0.36, 9), 'mud', xf(-0.6, gy + 0.03, 1.25, 0, 1.4, 0));
    P.add(lump(0.22, 0.07, 0.28, 13), 'mud', xf(0.1, 0.9, 0.75, 0.1, 2.0, 0));
    return P.build();
  }

  // ---------------------------------------------------------------- hydraulic cylinders
  // body: clevis at origin, barrel along +Y.  rod: eye at origin, rod along +Y (slides inside the barrel).
  function buildCylBody(rb, rr, Lb) {
    const P = new Part();
    P.add(cylX(rb * 0.78, rb * 1.5, 14), 'cyl');
    P.add(cbox(rb * 1.3, rb * 1.4, rb * 1.3, rb * 0.15), 'cyl', xf(0, rb * 1.0, 0));
    P.add(lathe([[0, rb * 1.5], [rb * 1.08, rb * 1.5], [rb * 1.08, rb * 2.1], [rb, rb * 2.2], [rb, Lb - rb * 1.0], [rb * 1.14, Lb - rb * 0.9], [rb * 1.14, Lb - rb * 0.15], [rb, Lb], [rr * 1.3, Lb], [rr * 1.3, Lb + rb * 0.12], [0, Lb + rb * 0.12]], 22), 'cyl');
    // mid clamp bands + hydraulic line
    for (const k of [0.38, 0.7]) P.add(lathe([[rb, 0], [rb * 1.06, 0], [rb * 1.06, rb * 0.25], [rb, rb * 0.25]], 20), 'cyl', xf(0, Lb * k, 0));
    P.add(cbox(rb * 0.7, rb * 0.6, rb * 0.5, 0.03), 'cyl', xf(0, rb * 2.8, rb * 1.05));
    P.add(cbox(rb * 0.7, rb * 0.6, rb * 0.5, 0.03), 'cyl', xf(0, Lb - rb * 1.6, rb * 1.05));
    P.add(tube([[0, rb * 2.8, rb * 1.25], [0, rb * 4, rb * 1.42], [0, Lb - rb * 2.8, rb * 1.42], [0, Lb - rb * 1.6, rb * 1.25]], rb * 0.13, 6), 'cyl');
    // ---- round 2: hex gland nut with wiper seal, tie rods, line clips + unions, port elbows, grease nipples, data plate
    P.add(hex(rb * 1.3, rb * 0.55), 'cyl', xf(0, Lb - rb * 0.78, 0), 0.72);
    P.add(lathe([[rr * 1.05, Lb + rb * 0.1], [rr * 1.6, Lb + rb * 0.1], [rr * 1.45, Lb + rb * 0.34], [rr * 1.05, Lb + rb * 0.4]], 18), 'cyl', undefined, 0.35);
    boltRing(P, 'cyl', 6, rb * 0.82, xf(0, Lb, 0), rb * 0.11, rb * 0.12);
    for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2; P.add(cyl(rb * 0.07, Lb - rb * 3.3, 5), 'cyl', xf(Math.sin(a) * rb * 1.09, (Lb + rb * 1.2) / 2, Math.cos(a) * rb * 1.09), 0.7); }
    for (const k of [0.2, 0.54, 0.86]) P.add(lathe([[rb, 0], [rb * 1.12, 0], [rb * 1.12, rb * 0.16], [rb, rb * 0.16]], 12), 'cyl', xf(0, Lb * k, 0), 0.8);
    for (const k of [0.3, 0.46, 0.62, 0.78]) P.add(cbox(rb * 0.5, rb * 0.16, rb * 0.36, 0.01), 'cyl', xf(0, Lb * k, rb * 1.36), 0.6);
    P.add(hex(rb * 0.22, rb * 0.5), 'cyl', xf(0, Lb * 0.5, rb * 1.42), 0.6);
    for (const y of [rb * 2.8, Lb - rb * 1.6]) { P.add(hex(rb * 0.2, rb * 0.3).rotateX(PI / 2), 'cyl', xf(0, y, rb * 1.28), 0.55); P.add(hex(rb * 0.16, rb * 0.5).rotateZ(-PI / 2), 'cyl', xf(rb * 0.3, y, rb * 1.1), 0.55); }
    P.add(hex(rb * 0.09, rb * 0.22).rotateZ(-PI / 2), 'cyl', xf(rb * 0.74, 0, 0), 0.6);
    P.add(cbox(rb * 0.7, rb * 0.5, 0.02, 0.005), 'cyl', xf(0, Lb * 0.3, -rb * 1.0), 1.25);
    return P.build();
  }
  function buildCylRod(rr, Lr, boot = 0.5) {
    const P = new Part();
    P.add(cylX(rr * 1.6, rr * 3.0, 14), 'joint');
    P.add(lathe([[0, rr * 1.2], [rr * 1.35, rr * 1.2], [rr * 1.35, rr * 3.0], [rr, rr * 3.4]], 16), 'joint');
    P.add(lathe([[rr, rr * 3.2], [rr, Lr], [0, Lr]], 18), 'chrome');
    // round 2: pleated dust boot on the eye end, clamp rings, lock nut, grease nipple on the eye
    P.add(bellows(rr * 1.3, rr * 1.95, rr * 3.5, rr * 3.5 + boot, Math.max(3, Math.round(boot / (rr * 0.7))), 14), 'joint');
    for (const y of [rr * 3.4, rr * 3.5 + boot]) P.add(lathe([[rr * 1.2, y - rr * 0.18], [rr * 1.75, y - rr * 0.18], [rr * 1.75, y + rr * 0.18], [rr * 1.2, y + rr * 0.18]], 14), 'joint');
    P.add(hex(rr * 1.7, rr * 0.8), 'joint', xf(0, rr * 2.4, 0));
    P.mirX(hex(rr * 0.9, rr * 0.4).rotateZ(-PI / 2), 'joint', xf(rr * 1.5, 0, 0));
    return P.build();
  }

  // ---------------------------------------------------------------- kinematics
  const fs = {}, hipA = [0, 0, 0], footA = [0, 0, 0], kneeA = [0, 0, 0], UP = [0, 1, 0], ONE = new THREE.Vector3(1, 1, 1);
  const vF = new THREE.Vector3(), vKp = new THREE.Vector3(), vH = new THREE.Vector3(), vK = new THREE.Vector3();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  const eF = new THREE.Euler(), qF = new THREE.Quaternion();
  const K = { yoke: new THREE.Matrix4(), thigh: new THREE.Matrix4(), shin: new THREE.Matrix4(), foot: new THREE.Matrix4(), swing: 0, plantAge: 0 };
  function solveLeg(L, t, invW, qInvW) {
    gait.footState(L.i, t, fs);
    vF.set(fs.x, fs.y, fs.z).applyMatrix4(invW).divideScalar(KS);
    vKp.set(L.hip[0], L.hip[1], L.hip[2]).divideScalar(KS);
    const ox = vF.x - vKp.x, oz = vF.z - vKp.z, ol = Math.hypot(ox, oz) || 1;
    const th = Math.atan2(ox, oz);
    vH.set(vKp.x + E_TRUN * ox / ol, vKp.y, vKp.z + E_TRUN * oz / ol);
    hipA[0] = vH.x; hipA[1] = vH.y; hipA[2] = vH.z; footA[0] = vF.x; footA[1] = vF.y; footA[2] = vF.z;
    gait.solveKnee(hipA, footA, UP, LT, LS, kneeA);
    vK.set(kneeA[0], kneeA[1], kneeA[2]);
    X.set(Math.cos(th), 0, -Math.sin(th));
    K.yoke.makeRotationY(th).setPosition(vKp);
    Y.copy(vH).sub(vK).normalize(); Z.crossVectors(X, Y); K.thigh.makeBasis(X, Y, Z).setPosition(vH);
    Y.copy(vK).sub(vF).normalize(); Z.crossVectors(X, Y); K.shin.makeBasis(X, Y, Z).setPosition(vK);
    // foot: flat in WORLD space (cancel walker roll/pitch), fixed outward yaw, pitches in swing
    eF.set(0, L.side > 0 ? 0 : PI, -fs.pitch, 'ZYX');
    qF.setFromEuler(eF).premultiply(qInvW);
    K.foot.compose(vF, qF, ONE);
    K.swing = fs.swing; K.plantAge = fs.plantAge;
    return K;
  }

  // cylinder definitions: anchors given for the +x side; mirrored copies are generated
  const CYL = [
    { name: 'lift', a: ['yoke', A_LIFT], b: ['thigh', B_LIFT], rb: 0.43, rr: 0.25 },
    { name: 'knee', a: ['thigh', A_KNEE], b: ['shin', B_KNEE], rb: 0.5, rr: 0.28 },
    { name: 'ankO', a: ['shin', A_ANK[0]], b: ['foot', B_ANK[0]], rb: 0.23, rr: 0.125 },
    { name: 'ankI', a: ['shin', A_ANK[1]], b: ['foot', B_ANK[1]], rb: 0.23, rr: 0.125 },
  ];
  for (const c of CYL) { c.pa = new THREE.Vector3(...c.a[1]); c.pb = new THREE.Vector3(...c.b[1]); c.min = 1e9; c.max = 0; }
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  // sample one gait cycle to size barrels / rods so they never bottom out or pull apart
  {
    const pose = {}, W = new THREE.Matrix4(), inv = new THREE.Matrix4(), q = new THREE.Quaternion(), qi = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();
    for (let n = 0; n < 240; n++) {
      const t = n / 240 * gait.GAIT.T;
      gait.bodyPose(t, pose);
      e.set(pose.roll, pose.yaw, pose.pitch); q.setFromEuler(e); qi.copy(q).invert();
      W.compose(p.set(pose.x, pose.y, pose.z), q, ONE); inv.copy(W).invert();
      for (const L of gait.LEGS) {
        solveLeg(L, t, inv, qi);
        for (const c of CYL) for (const sx of [1, -1]) {
          pA.copy(c.pa); pA.x *= sx; pA.applyMatrix4(K[c.a[0]]);
          pB.copy(c.pb); pB.x *= sx; pB.applyMatrix4(K[c.b[0]]);
          const d = pA.distanceTo(pB); c.min = Math.min(c.min, d); c.max = Math.max(c.max, d);
        }
      }
    }
    // ankle pairs share one geometry
    const aMin = Math.min(CYL[2].min, CYL[3].min), aMax = Math.max(CYL[2].max, CYL[3].max);
    CYL[2].min = CYL[3].min = aMin; CYL[2].max = CYL[3].max = aMax;
    for (const c of CYL) {
      c.Lr = c.min - 0.12;
      c.Lb = Math.max(0.8 * c.min, c.max - c.Lr + 0.35);
    }
  }

  // ---------------------------------------------------------------- instanced meshes
  const allMeshes = [];
  function instantiate(geos, count, variantOf, { shadow = true } = {}) {
    const list = [];
    for (const key of Object.keys(geos)) {
      const geo = geos[key];
      const im = new THREE.InstancedMesh(geo, M(key, variantOf(key)), count);
      im.frustumCulled = false;
      const small = key === 'decal' || key === 'lampA' || key === 'hazard' || key === 'dark' || key === 'mud';
      im.castShadow = shadow && !small; im.receiveShadow = key !== 'lampA';
      im.name = 'legs:' + key;
      g.add(im); list.push(im); allMeshes.push(im);
    }
    return list;
  }
  const setAll = (list, i, m) => { for (let k = 0; k < list.length; k++) list[k].setMatrixAt(i, m); };

  const hipBase = instantiate(buildHipBase(), N, () => '');
  const yoke = instantiate(buildYoke(), N, () => '');
  const thigh = instantiate(buildThigh(), N, () => 'thigh');
  const shin = instantiate(buildShin(), N, (k) => (k === 'armorA' || k === 'armorB' || k === 'steel' || k === 'joint') ? 'boot' : 'shin');
  const foot = instantiate(buildFoot(), N, () => 'foot');
  const toe = instantiate(buildToe(), N * 4, () => 'toe');
  const cylMeshes = [];
  {
    const done = new Map();
    for (const c of CYL) {
      const gk = c.name.startsWith('ank') ? 'ank' : c.name;
      if (!done.has(gk)) {
        const count = gk === 'ank' ? N * 4 : N * 2;
        if (gk !== 'ank') GREASE['cyl' + gk] = { a: [c.Lb, 0, c.rb * 1.7, 0.95], b: [c.Lb * 0.5, 0, c.rb * 1.3, 0.5], dir: [-1, 0] };
        const gap = c.min - c.Lb;
        done.set(gk, { body: instantiate(buildCylBody(c.rb, c.rr, c.Lb), count, () => gk === 'ank' ? '' : 'cyl' + gk), rod: instantiate(buildCylRod(c.rr, c.Lr, Math.max(0.2, Math.min(gap * 0.5, c.rr * 4))), count, () => ''), n: 0 });
      }
      c.inst = done.get(gk);
      c.base = c.inst.n; c.inst.n += N * 2;
    }
    for (const v of done.values()) cylMeshes.push(v);
  }

  // ---------------------------------------------------------------- dynamic hoses (cubic bezier, GPU-evaluated)
  // [partA, posA, dirA, partB, posB, dirB, length, radius]; +x side only where mirrored = true
  const HOSES = [];
  for (const [x, r] of [[-0.48, 0.1], [-0.17, 0.13], [0.16, 0.09], [0.46, 0.12]])
    HOSES.push(['thigh', [x, -9.35, -0.55], [0, -0.55, -0.85], 'shin', [x * 1.7, -3.7, -1.5], [0, 0.35, -1], 6.6 + Math.abs(x) * 0.8, r]);
  for (const sx of [1, -1]) {
    HOSES.push(['hip', [sx * 2.0, -0.3, -0.4], [sx * 0.55, -0.35, 1], 'thigh', [sx * 2.2, -3.1, -0.85], [sx * 0.45, 0.1, -1], 7.4, 0.12]);
    HOSES.push(['shin', [sx * 0.78, -15.7, -1.6], [0, -0.45, -1], 'foot', [sx * 0.95, -0.66, -2.25], [0, 1, -0.35], 4.6, 0.1]);
  }
  const NH = HOSES.length;
  const hose = (() => {
    const SEG = 22, RAD = 7, pos = [], idx = [];
    for (let i = 0; i <= SEG; i++) for (let j = 0; j < RAD; j++) { const a = j / RAD * PI * 2; pos.push(Math.cos(a), i / SEG, Math.sin(a)); }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = a + RAD, d = b + RAD;
      idx.push(a, c, b, b, c, d);
    }
    const ig = new THREE.InstancedBufferGeometry();
    ig.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ig.setAttribute('normal', new THREE.Float32BufferAttribute(pos, 3));
    ig.setIndex(idx);
    const n = N * NH, mk = (k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    const at = { iC0: mk(3), iC1: mk(3), iC2: mk(3), iC3: mk(3), iX: mk(3), iR: mk(1) };
    for (const k in at) ig.setAttribute(k, at[k]);
    ig.instanceCount = n;
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.5, metalness: 0.0 });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec3 iC0, iC1, iC2, iC3, iX; attribute float iR;
vec3 hosePos, hoseNrm;
void hoseEval(vec3 p) {
  float t = p.y, u = 1.0 - t;
  vec3 c = u*u*u*iC0 + 3.0*u*u*t*iC1 + 3.0*u*t*t*iC2 + t*t*t*iC3;
  vec3 d = 3.0*u*u*(iC1 - iC0) + 6.0*u*t*(iC2 - iC1) + 3.0*t*t*(iC3 - iC2);
  vec3 T = normalize(d);
  vec3 Nn = normalize(cross(T, iX)); vec3 B = cross(T, Nn);
  hoseNrm = Nn * p.x + B * p.z;
  // corrugation rings near the fittings
  float e = min(t, 1.0 - t);
  hosePos = c + hoseNrm * iR * (1.0 + 0.35 * smoothstep(0.06, 0.0, e));
}`)
        .replace('#include <beginnormal_vertex>', 'hoseEval(position);\nvec3 objectNormal = hoseNrm;')
        .replace('#include <begin_vertex>', 'vec3 transformed = hosePos;');
    };
    mat.customProgramCacheKey = () => 'legsHose';
    const mesh = new THREE.Mesh(ig, mat);
    mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'legs:hoses';
    g.add(mesh);
    return { at, mesh };
  })();
  const hipM = gait.LEGS.map((L) => new THREE.Matrix4().makeRotationY(L.side > 0 ? 0 : PI).setPosition(L.hip[0] / KS, L.hip[1] / KS, L.hip[2] / KS));
  const hA = new THREE.Vector3(), hB = new THREE.Vector3(), hDA = new THREE.Vector3(), hDB = new THREE.Vector3();
  function updateHoses(i) {
    const at = hose.at;
    for (let h = 0; h < NH; h++) {
      const H = HOSES[h], o = (i * NH + h) * 3;
      const MA = H[0] === 'hip' ? hipM[i] : K[H[0]], MB = K[H[3]];
      hA.set(H[1][0], H[1][1], H[1][2]).applyMatrix4(MA); hB.set(H[4][0], H[4][1], H[4][2]).applyMatrix4(MB);
      hDA.set(H[2][0], H[2][1], H[2][2]).transformDirection(MA); hDB.set(H[5][0], H[5][1], H[5][2]).transformDirection(MB);
      const d = hA.distanceTo(hB), L = H[6], k = L * 0.3, sag = Math.max(0, L - d) * 0.7 + 0.15;
      at.iC0.array[o] = hA.x; at.iC0.array[o + 1] = hA.y; at.iC0.array[o + 2] = hA.z;
      at.iC1.array[o] = hA.x + hDA.x * k; at.iC1.array[o + 1] = hA.y + hDA.y * k - sag; at.iC1.array[o + 2] = hA.z + hDA.z * k;
      at.iC2.array[o] = hB.x + hDB.x * k; at.iC2.array[o + 1] = hB.y + hDB.y * k - sag; at.iC2.array[o + 2] = hB.z + hDB.z * k;
      at.iC3.array[o] = hB.x; at.iC3.array[o + 1] = hB.y; at.iC3.array[o + 2] = hB.z;
      // frame reference: the leg-plane normal (hoses stay near that plane), nudged for the side loops
      const e = K.shin.elements;
      at.iX.array[o] = e[0] + 0.01; at.iX.array[o + 1] = e[1] + (H[0] === 'hip' ? 0.8 : 0.02); at.iX.array[o + 2] = e[2];
      at.iR.array[i * NH + h] = H[7];
    }
  }

  // per-leg tint variation on painted armour (so the legs are not clones)
  {
    const col = new THREE.Color();
    const tint = Array.from({ length: N }, () => [0.86 + rnd() * 0.2, (rnd() - 0.5) * 0.06]);
    for (const im of allMeshes) {
      if (!/armor|cyl/.test(im.name)) continue;
      const per = im.count / N;
      for (let i = 0; i < im.count; i++) {
        const [b, w] = tint[Math.floor(i / per) % N];
        col.setRGB(b * (1 + w), b, b * (1 - w)); im.setColorAt(i, col);
      }
      im.instanceColor.needsUpdate = true;
    }
  }

  // static hip bases
  {
    const m = new THREE.Matrix4();
    for (const L of gait.LEGS) { m.makeRotationY(L.side > 0 ? 0 : PI).setPosition(L.hip[0] / KS, L.hip[1] / KS, L.hip[2] / KS); setAll(hipBase, L.i, m); }
    for (const im of hipBase) im.instanceMatrix.needsUpdate = true;
  }

  // toe local matrices (relative to the foot)
  const toeRest = TOE_ANG.map((a, i) => xf(0, 0, 0, 0, a, 0).multiply(xf(TOE_HINGE[0], TOE_HINGE[1], TOE_HINGE[2])));
  const toeScale = TOE_SCALE.map((s) => new THREE.Matrix4().makeScale(s, s, s));
  const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mC = new THREE.Matrix4();
  const invW = new THREE.Matrix4(), qInvW = new THREE.Quaternion();
  const cX = new THREE.Vector3(), cY = new THREE.Vector3(), cZ = new THREE.Vector3(), aX = new THREE.Vector3();

  function update(t) {
    invW.copy(walker.matrixWorld).invert();
    qInvW.copy(walker.quaternion).invert();
    for (const L of gait.LEGS) {
      const i = L.i;
      solveLeg(L, t, invW, qInvW);
      setAll(yoke, i, K.yoke); setAll(thigh, i, K.thigh); setAll(shin, i, K.shin); setAll(foot, i, K.foot);
      // toes: droop while the foot is in the air, flat (and a touch splayed) when planted
      const s = K.swing;
      const droop = s > 0 ? 0.26 * Math.pow(Math.sin(PI * Math.min(1, s * 1.08)), 0.8) : 0;
      const settle = s > 0 ? 0 : -0.035 * Math.exp(-K.plantAge * 5.0) * Math.cos(K.plantAge * 9.0);
      for (let k = 0; k < 4; k++) {
        mR.makeRotationX((droop + settle) * (k === 3 ? 0.7 : 1));
        mT.multiplyMatrices(K.foot, toeRest[k]).multiply(mR).multiply(toeScale[k]);
        setAll(toe, i * 4 + k, mT);
      }
      // hydraulic cylinders
      for (const c of CYL) {
        for (let si = 0; si < 2; si++) {
          const sx = si ? -1 : 1;
          pA.copy(c.pa); pA.x *= sx; pA.applyMatrix4(K[c.a[0]]);
          pB.copy(c.pb); pB.x *= sx; pB.applyMatrix4(K[c.b[0]]);
          cY.copy(pB).sub(pA).normalize();
          aX.setFromMatrixColumn(K[c.a[0]], 0);
          cX.copy(aX).addScaledVector(cY, -aX.dot(cY)).normalize();
          cZ.crossVectors(cX, cY);
          mC.makeBasis(cX, cY, cZ).setPosition(pA);
          const idx = c.base + i * 2 + si;
          setAll(c.inst.body, idx, mC);
          cY.negate(); cZ.negate();
          mC.makeBasis(cX, cY, cZ).setPosition(pB);
          setAll(c.inst.rod, idx, mC);
        }
      }
      updateHoses(i);
    }
    for (const k in hose.at) hose.at[k].needsUpdate = true;
    for (const list of [yoke, thigh, shin, foot, toe]) for (const im of list) im.instanceMatrix.needsUpdate = true;
    for (const c of cylMeshes) { for (const im of c.body) im.instanceMatrix.needsUpdate = true; for (const im of c.rod) im.instanceMatrix.needsUpdate = true; }
  }

  let tris = 0;
  for (const im of allMeshes) tris += im.geometry.attributes.position.count / 3 * im.count;
  if (ctx.Q && ctx.Q.get('legsdbg')) console.warn('[legs] per-mesh tris: ' + allMeshes.map((im) => im.name.slice(5) + ':' + Math.round(im.geometry.attributes.position.count / 3) + 'x' + im.count).join(' '));
  (ctx.Q && ctx.Q.get('legsdbg') ? console.warn : console.info)(`[legs] ${allMeshes.length} instanced meshes, ${Math.round(tris)} tris, build ${Math.round(performance.now() - tBuild0)} ms (plate atlas ${Math.round(tPlate1 - tPlate0)} ms), cylinders: ` + CYL.map((c) => `${c.name} ${c.min.toFixed(2)}..${c.max.toFixed(2)}`).join(', '));
  update(0);
  return { update, group: g, stats: { meshes: allMeshes.length, tris } };
}
