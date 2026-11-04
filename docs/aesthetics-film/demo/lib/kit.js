// aesthetics-film · kit.js — the world kit. Everything is built from code: no models, no image files.
// Builders return an Object3D (a Group or Mesh). Anything that moves with time registers a `tick(t, cam)` on
// obj.userData.tick; the set calls it every frame with the film time, so every frame stays a function of t.
// Units are metres; y is up. Every builder takes `at: [x, y, z]` and `rotY` (degrees) unless noted.
import * as THREE from "three";
import * as TX from "./tex.js";
const { rng, fbm, vnoise } = TX;

export const V = (a) => new THREE.Vector3(...a);
const D2R = Math.PI / 180;
const place = (obj, o = {}) => { if (o.at) obj.position.set(...o.at); if (o.rotY) obj.rotation.y = o.rotY * D2R; if (o.scale) obj.scale.setScalar(o.scale); return obj; };
const tick = (obj, fn) => { const prev = obj.userData.tick; obj.userData.tick = prev ? (t, c) => { prev(t, c); fn(t, c); } : fn; return obj; };

/** shared wind clock for swaying foliage (set by the film every frame) */
export const WIND = { value: 0 };

// ---------------- materials ----------------
/** standard material from a colour (or options): mat("#6b4a32", { rough: .8, map }) */
export function mat(color = "#888", o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, map: o.map ?? null, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat, vertexColors: !!o.vc, transparent: !!o.transparent, opacity: o.opacity ?? 1, alphaTest: o.alphaTest ?? 0, envMapIntensity: o.env ?? 0.6 });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.glow ?? 1; if (o.emissiveMap) m.emissiveMap = o.emissiveMap; }
  return m;
}
/** a colour that ignores light (seals, glows, ink cut-outs) */
export const flat = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, fog: o.fog ?? true, depthWrite: o.depthWrite ?? true, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, map: o.map ?? null });
export const MAT = {
  wood: (c = "#6b4a32", rep = [1, 1]) => mat(c === null ? "#fff" : "#ffffff", { map: TX.wood(c, { repeat: rep }), rough: 0.7 }),
  lacquer: (c = "#6e2a20") => mat(c, { rough: 0.45, env: 0.9 }),
  plaster: (c) => mat("#ffffff", { map: TX.plaster(c), rough: 0.95 }),
  stone: (c, rep = [1, 1]) => mat("#ffffff", { map: TX.stone(c, { repeat: rep }), rough: 0.9 }),
  tiles: (c) => mat("#ffffff", { map: TX.tiles(c), rough: 0.8, side: THREE.FrontSide }),
  bronze: (c) => mat("#ffffff", { map: TX.bronze(c), rough: 0.45, metal: 0.65, env: 1.0 }),
  ink: (c = "#26292b") => mat(c, { rough: 1 }),
};

// ---------------- geometry helpers ----------------
/** merge plain geometries (position/normal/uv) into one */
export function merge(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
/** a box from a to b (a thin bar between two 3D points) */
export function bar(a, b, w = 0.05, h = w) {
  const A = V(a), B = V(b), L = A.distanceTo(B), g = new THREE.BoxGeometry(w, h, L);
  const m = new THREE.Matrix4().lookAt(A, B, new THREE.Vector3(Math.abs(B.x - A.x) + Math.abs(B.z - A.z) < 1e-6 ? 1 : 0, Math.abs(B.x - A.x) + Math.abs(B.z - A.z) < 1e-6 ? 0 : 1, 0));
  g.applyMatrix4(m); g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
/** a tube along points whose radius tapers from r0 to r1 */
export function taperTube(points, r0, r1, segs = 16, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : V(p))));
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), p = g.attributes.position;
  const fr = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const c = curve.getPointAt(i / segs), r = r0 + (r1 - r0) * (i / segs);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j, v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  return g;
}
/** add a wind sway to a material (instanced or not): tops move more than bases */
function sway(m, amount = 0.12, height = 8) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ph = instanceMatrix[3].xz;
        float hy = (instanceMatrix * vec4(transformed, 1.0)).y;
      #else
        vec2 ph = vec2(0.0); float hy = transformed.y;
      #endif
      float k = pow(clamp(hy / ${height.toFixed(2)}, 0.0, 1.0), 2.0) * ${amount.toFixed(3)};
      transformed.x += k * (sin(uWind * 0.9 + ph.x * 0.37 + ph.y * 0.21) + 0.4 * sin(uWind * 2.1 + ph.y));
      transformed.z += k * 0.5 * sin(uWind * 0.7 + ph.y * 0.3);`);
  };
  m.customProgramCacheKey = () => "sway" + amount + height;
  return m;
}

// ---------------- ink landscape ----------------
const NOISE_GLSL = `
float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fb3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n3(p); p *= 2.03; a *= 0.5; } return s / 0.9375; }`;

const MOUNTAIN_VERT = `
#include <common>
#include <fog_pars_vertex>
varying vec3 vW; varying vec3 vN; varying float vH;
uniform float uTop;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vH = position.y / uTop;
  vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const MOUNTAIN_FRAG = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uInk; uniform vec3 uWash; uniform vec3 uMist; uniform float uMistY; uniform float uMistSoft; uniform float uStrength; uniform vec3 uLight;
varying vec3 vW; varying vec3 vN; varying float vH;
${NOISE_GLSL}
void main() {
  vec3 n = normalize(vN);
  float lit = clamp(dot(n, normalize(uLight)) * 0.5 + 0.5, 0.0, 1.0);
  float slope = 1.0 - clamp(n.y, 0.0, 1.0);
  // texture strokes (cun): stretched noise that follows the slope
  float st = fb3(vec3(vW.x * 0.12, vW.y * 0.5, vW.z * 0.12));
  float st2 = n3(vec3(vW.x * 0.6, vW.y * 1.4, vW.z * 0.6));
  // ridges and peaks carry the ink; lit flanks stay pale (the wash); strokes follow the slope
  float ridge = smoothstep(0.35, 1.0, vH);
  float ink = 0.18 + ridge * 0.62 + slope * 0.35 * (0.4 + vH);
  ink *= (1.35 - lit * 0.95);
  float cun = smoothstep(0.35, 0.75, st) * 0.55 + (st2 - 0.5) * 0.25;
  ink += (cun - 0.25) * (0.5 + 0.5 * vH);
  ink = clamp(ink * uStrength, 0.0, 1.0);
  vec3 col = mix(uWash, uInk, ink);
  // the foot dissolves into the mist sea
  float m = 1.0 - smoothstep(uMistY, uMistY + uMistSoft, vW.y + (st - 0.5) * uMistSoft * 0.8);
  col = mix(col, uMist, m);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

/** one ink mountain mesh (karst peak with ridged flanks); h = height, w = base width */
export function mountainGeo(w = 60, h = 60, seed = 1, o = {}) {
  const res = o.res ?? 72, g = new THREE.PlaneGeometry(1, 1, res, res); g.rotateX(-Math.PI / 2);
  const r = rng(seed), peaks = [];
  const np = o.peaks ?? 1 + Math.floor(r() * 3);
  for (let i = 0; i < np; i++) peaks.push({ x: i ? (r() - 0.5) * 0.5 : (r() - 0.5) * 0.1, z: (r() - 0.5) * 0.3, s: i ? 0.45 + r() * 0.4 : 1, w: i ? 0.18 + r() * 0.1 : 0.28 + r() * 0.08 });
  const sharp = o.sharp ?? 1.6, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let y = 0;
    for (const k of peaks) { const d = Math.hypot((x - k.x) / k.w, (z - k.z) / (k.w * 1.1)); const pointy = Math.pow(Math.max(0, 1 - d), sharp), round = Math.exp(-Math.pow(d * 2.1, 2)) * Math.max(0, 1 - Math.max(0, d - 0.85) / 0.15); y = Math.max(y, k.s * (pointy + (round - pointy) * (o.round ?? 0.4))); }
    const rid = 1 - Math.abs(2 * fbm(x * 5 + seed, z * 5, seed, 4) - 1);
    y = y * (0.78 + 0.32 * rid) + (fbm(x * 9, z * 9, seed + 3, 3) - 0.5) * 0.05 * Math.min(1, y * 6);
    const edge = Math.min(1, (0.5 - Math.max(Math.abs(x), Math.abs(z))) * 8);
    p.setY(i, Math.max(0, y) * edge);
  }
  g.scale(w, h, w * (o.depth ?? 0.8));
  g.computeVertexNormals();
  return g;
}
/** a range of ink mountains: { n, x: [min, max], z: [near, far], h: [min, max], seed, ink, strength, mistY } */
export function inkMountains(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 7), n = o.n ?? 12;
  const [x0, x1] = o.x ?? [-260, 260], [z0, z1] = o.z ?? [-120, -480], [h0, h1] = o.h ?? [30, 110];
  const mats = new Map();
  const matFor = (top) => {
    const key = Math.round(top);
    if (mats.has(key)) return mats.get(key);
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uInk: { value: new THREE.Color(o.ink ?? "#2a2d2f") }, uWash: { value: new THREE.Color(o.wash ?? "#c9c7c0") }, uMist: { value: new THREE.Color(o.mist ?? "#ebe7dd") }, uMistY: { value: o.mistY ?? 0 }, uMistSoft: { value: o.mistSoft ?? 10 }, uStrength: { value: o.strength ?? 1 }, uTop: { value: top }, uLight: { value: V(o.light ?? [-0.6, 0.6, 0.5]) } }]),
      vertexShader: MOUNTAIN_VERT, fragmentShader: MOUNTAIN_FRAG, fog: true,
    });
    mats.set(key, m); return m;
  };
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0, z = z0 + (z1 - z0) * (0.15 * r() + 0.85 * k) , x = x0 + (x1 - x0) * r();
    const h = h0 + (h1 - h0) * (0.4 + 0.6 * r()) * (0.75 + 0.5 * k), w = h * (o.aspect ?? 1.1) * (0.7 + r() * 1.1);
    const m = new THREE.Mesh(mountainGeo(w, h, (o.seed ?? 7) * 31 + i, { sharp: (o.sharp ?? 1.4) * (0.7 + r() * 0.7), peaks: 1 + Math.floor(r() * 4), round: o.round }), matFor(h));
    m.position.set(x, (o.base ?? -6) - r() * 4, z); m.rotation.y = r() * Math.PI;
    m.userData.noCast = true;
    grp.add(m);
  }
  grp.userData.setMist = (c) => mats.forEach((m) => m.uniforms.uMist.value.set(c));
  return grp;
}
/** the mist sea: a wide plane in paper colour with slow drifting wisps (cover the mountains' feet) */
export function mistSea(o = {}) {
  const tex = TX.ctex(`mistsea:${o.seed ?? 1}`, 512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x / 64, y / 40, o.seed ?? 1, 5, 8); const v = 238 - Math.max(0, n - 0.45) * 60; const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, { repeat: [6, 6] });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.size ?? 2400, o.size ?? 2400), new THREE.MeshBasicMaterial({ color: o.color ?? "#f4f1ea", map: tex, fog: true }));
  m.rotation.x = -Math.PI / 2; m.position.y = o.y ?? 0; m.userData.noCast = true;
  return tick(m, (t) => { tex.offset.set(t * (o.drift ?? 0.004), t * 0.0015); });
}
/** mist banks: soft billboards that drift sideways (in front of / between mountain layers) */
export function mistBanks(o = {}) {
  const grp = new THREE.Group(), r = rng(o.seed ?? 3), n = o.n ?? 10;
  const [x0, x1] = o.x ?? [-200, 200], [z0, z1] = o.z ?? [-60, -300], [y0, y1] = o.y ?? [0, 12];
  const items = [];
  for (let i = 0; i < n; i++) {
    const s = (o.size ?? 90) * (0.6 + r() * 0.8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.35), new THREE.MeshBasicMaterial({ map: TX.mist(1 + (i % 4)), color: o.color ?? "#f2efe7", transparent: true, opacity: o.opacity ?? 0.85, depthWrite: false, fog: true }));
    m.position.set(x0 + (x1 - x0) * r(), y0 + (y1 - y0) * r(), z0 + (z1 - z0) * r()); m.userData.noCast = true; m.renderOrder = 2;
    items.push({ m, x: m.position.x, v: (r() - 0.5) * (o.drift ?? 1.2) }); grp.add(m);
  }
  return tick(grp, (t, cam) => { for (const it of items) { it.m.position.x = it.x + it.v * t; if (cam) it.m.quaternion.copy(cam.quaternion); } });
}
/** an ink pine: bent trunk, a few limbs, flat cloud-like needle pads */
export function pine(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 5), h = o.h ?? 6, lean = (o.lean ?? (r() - 0.5) * 0.6);
  const trunkPts = [[0, 0, 0], [lean * h * 0.15, h * 0.35, 0], [lean * h * 0.35 + (r() - 0.5) * 0.4, h * 0.7, (r() - 0.5) * 0.4], [lean * h * 0.4, h, 0]];
  const geos = [taperTube(trunkPts, h * 0.045, h * 0.012, 12, 6)];
  const pads = [], tiers = o.tiers ?? 4 + Math.floor(r() * 3);
  for (let i = 0; i < tiers; i++) {
    const k = 0.35 + 0.65 * (i / Math.max(1, tiers - 1)), a = r() * Math.PI * 2, L = h * (0.18 + r() * 0.22) * (1.15 - k * 0.5);
    const base = [lean * h * 0.4 * k, h * k, 0], tip = [base[0] + Math.cos(a) * L, base[1] + (r() - 0.3) * L * 0.3, base[2] + Math.sin(a) * L];
    geos.push(taperTube([base, [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 + 0.1, (base[2] + tip[2]) / 2], tip], h * 0.012, h * 0.006, 6, 5));
    pads.push(tip);
  }
  pads.push(trunkPts[3]);
  grp.add(new THREE.Mesh(merge(geos), mat(o.trunk ?? "#3b3631", { map: TX.bark(o.trunk ?? "#3b3631") })));
  const padGeos = [];
  for (const p of pads) for (let j = 0; j < 4; j++) {
    const s = h * (0.07 + r() * 0.05), g = new THREE.SphereGeometry(1, 9, 5);
    g.scale(s * 1.5, s * 0.28, s * 1.2); g.translate(p[0] + (r() - 0.5) * s * 2.2, p[1] + (r() - 0.3) * s * 0.4, p[2] + (r() - 0.5) * s * 2.2);
    const pp = g.attributes.position; for (let q = 0; q < pp.count; q++) pp.setY(q, pp.getY(q) + (vnoise(pp.getX(q) * 3, pp.getZ(q) * 3, 3) - 0.5) * s * 0.25);
    padGeos.push(g);
  }
  grp.add(new THREE.Mesh(merge(padGeos), sway(mat(o.needles ?? "#22261f", { rough: 1, flat: true }), 0.05, h)));
  return grp;
}
/** a small ink islet: dark low land with boulders (pines added by the caller) */
export function islet(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 9), R = o.r ?? 8;
  const g = new THREE.CircleGeometry(R, 64, 0, Math.PI * 2); g.rotateX(-Math.PI / 2); { const sub = new THREE.CircleGeometry(R, 64); sub.dispose(); }
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / R, a = Math.atan2(z, x); const e = 0.75 + 0.45 * fbm(Math.cos(a) * 2 + 5, Math.sin(a) * 2, o.seed ?? 9, 3); p.setX(i, x * e); p.setZ(i, z * e); p.setY(i, Math.pow(Math.max(0, 1 - d * d), 0.7) * R * (0.1 + 0.08 * fbm(x * 0.4, z * 0.4, 7, 3))); }
  g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, mat(o.color ?? "#ffffff", { rough: 1, map: TX.ground("moss", "#6a6b64") })));
  for (let i = 0; i < (o.rocks ?? 8); i++) { const a = r() * Math.PI * 2, d = R * (0.3 + r() * 0.6); grp.add(rock({ kind: "boulder", size: R * (0.06 + r() * 0.07), at: [Math.cos(a) * d, 0, Math.sin(a) * d], seed: i + 3, color: "#8f8e88" })); }
  return grp;
}
/** a little boat with a figure in a straw hat (ink silhouette); drifts along x with t if `drift` */
export function boat(o = {}) {
  const grp = place(new THREE.Group(), o), L = o.len ?? 3;
  const sh = new THREE.Shape(); sh.moveTo(-L / 2, 0.25); sh.quadraticCurveTo(-L * 0.35, -0.05, 0, -0.08); sh.quadraticCurveTo(L * 0.35, -0.05, L / 2, 0.3); sh.lineTo(-L / 2, 0.25);
  const hull = new THREE.ExtrudeGeometry(sh, { depth: L * 0.22, bevelEnabled: false }); hull.translate(0, 0, -L * 0.11);
  const ink = mat(o.color ?? "#2b2c2c", { rough: 1 });
  grp.add(new THREE.Mesh(hull, ink));
  const body = new THREE.CylinderGeometry(0.1, 0.16, 0.5, 8); body.translate(L * 0.15, 0.45, 0);
  const hat = new THREE.ConeGeometry(0.3, 0.16, 12); hat.translate(L * 0.15, 0.78, 0);
  const pole = bar([L * 0.15 + 0.1, 0.5, 0], [L * 0.6, 1.4, 0.2], 0.03);
  grp.add(new THREE.Mesh(merge([body, hat, pole]), ink));
  const x0 = grp.position.x;
  return o.drift ? tick(grp, (t) => { grp.position.x = x0 + t * o.drift; grp.position.y = (o.at?.[1] ?? 0) + Math.sin(t * 1.3) * 0.03; }) : grp;
}

// ---------------- plants and stones ----------------
/** a bamboo grove (instanced culms with node rings + leaf cards), swaying in the wind */
export function bamboo(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 11), n = o.n ?? 60;
  const [x0, x1] = o.x ?? [-4, 4], [z0, z1] = o.z ?? [-2, 2], [h0, h1] = o.h ?? [7, 11];
  const H = 10, culm = new THREE.CylinderGeometry(0.045, 0.06, H, 7, 1); culm.translate(0, H / 2, 0);
  const ringTex = TX.ctex(`bamboo:${o.color ?? "#5e7342"}`, 32, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0); grd.addColorStop(0, o.dark ?? "#3f5230"); grd.addColorStop(0.5, o.color ?? "#6a8048"); grd.addColorStop(1, o.dark ?? "#3f5230");
    g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(30,35,20,0.75)"; for (let i = 0; i < 8; i++) g.fillRect(0, (i / 8) * h, w, 3);
  });
  const culms = new THREE.InstancedMesh(culm, sway(mat("#ffffff", { map: ringTex, rough: 0.6 }), 0.35, h1), n);
  const leafGeo = new THREE.PlaneGeometry(1.6, 1.6); leafGeo.translate(0, -0.2, 0);
  const nl = n * (o.leaves ?? 5), leafs = new THREE.InstancedMesh(leafGeo, sway(mat("#ffffff", { map: TX.leaves(o.leafColor ?? "#41502f", "bamboo", 3), alphaTest: 0.45, side: THREE.DoubleSide, rough: 0.9 }), 0.35, h1), nl);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pv = new THREE.Vector3();
  let li = 0;
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r(), h = h0 + (h1 - h0) * r(), lx = (r() - 0.5) * 0.08, lz = (r() - 0.5) * 0.08;
    e.set(lx, 0, lz); q.setFromEuler(e); s.set(1, h / H, 1); pv.set(x, 0, z); culms.setMatrixAt(i, m4.compose(pv, q, s));
    for (let k = 0; k < (o.leaves ?? 5); k++) {
      const y = h * (0.45 + 0.55 * r()); e.set((r() - 0.5) * 0.8, r() * Math.PI * 2, (r() - 0.5) * 0.6); q.setFromEuler(e);
      const sc = 0.8 + r() * 0.9; s.set(sc, sc, sc); pv.set(x + lz * y + (r() - 0.5) * 0.6, y, z - lx * y + (r() - 0.5) * 0.6);
      leafs.setMatrixAt(li++, m4.compose(pv, q, s));
    }
  }
  culms.castShadow = leafs.castShadow = true;
  grp.add(culms, leafs);
  return grp;
}
/** a tree: kind "plum" (gnarled, sparse blossoms) | "cherry" (dense blossoms) | "maple" (red leaf clusters) | "bare" */
export function tree(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 13), h = o.h ?? 4, kind = o.kind ?? "plum";
  const geos = [], tips = [];
  const grow = (from, dir, len, rad, depth) => {
    const pts = [from.clone()];
    let p = from.clone(), d = dir.clone();
    for (let i = 0; i < 3; i++) { d.add(new THREE.Vector3((r() - 0.5) * 0.7, (r() - 0.3) * 0.4, (r() - 0.5) * 0.7)).normalize(); p = p.clone().addScaledVector(d, len / 3); pts.push(p); }
    geos.push(taperTube(pts, rad, rad * 0.6, 8, 6));
    if (depth <= 0 || len < h * 0.08) { tips.push(p); return; }
    const kids = depth > 2 ? 2 : 2 + (r() > 0.5 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const nd = d.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, r() * 0.6 + (kind === "plum" ? -0.1 : 0.2), (r() - 0.5) * 1.6)).normalize();
      grow(p, nd, len * (0.62 + r() * 0.15), rad * 0.62, depth - 1);
    }
    if (depth < 3) tips.push(p);
  };
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.4, 1, (r() - 0.5) * 0.4).normalize(), h * 0.45, h * 0.04, o.depth ?? 4);
  grp.add(new THREE.Mesh(merge(geos), mat(o.trunk ?? "#3a302a", { map: TX.bark(o.trunk ?? "#3a302a") })));
  if (kind !== "bare") {
    const isLeaf = kind === "maple", per = kind === "cherry" ? 26 : kind === "plum" ? 7 : 14, size = isLeaf ? h * 0.32 : kind === "cherry" ? h * 0.06 : h * 0.05;
    const texm = isLeaf ? TX.leaves(o.color ?? "#b2412c", "maple", 5) : TX.blossom(o.color ?? (kind === "cherry" ? "#f3cdd6" : "#f6e2e4"));
    const geo = new THREE.PlaneGeometry(size, size), N = tips.length * per;
    const im = new THREE.InstancedMesh(geo, sway(mat("#ffffff", { map: texm, alphaTest: 0.4, side: THREE.DoubleSide, rough: 0.8, emissive: "#000" }), 0.08, h), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
    let i = 0;
    for (const tp of tips) for (let k = 0; k < per; k++) {
      const sp = isLeaf ? h * 0.18 : kind === "cherry" ? h * 0.22 : h * 0.12;
      pv.set(tp.x + (r() - 0.5) * sp, tp.y + (r() - 0.4) * sp * 0.8, tp.z + (r() - 0.5) * sp); e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); const sc = 0.6 + r() * 0.7; s.set(sc, sc, sc);
      im.setMatrixAt(i++, m4.compose(pv, q, s));
    }
    im.castShadow = true; grp.add(im);
  }
  grp.userData.tips = tips;
  return grp;
}
/** a stone: kind "scholar" (tall, pitted, porous lake rock) | "boulder" | "slab" (flat stepping stone) */
export function rock(o = {}) {
  const kind = o.kind ?? "boulder", s = o.size ?? 1, seed = o.seed ?? 17;
  const g = new THREE.IcosahedronGeometry(1, kind === "scholar" ? 5 : 3), p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), n = v.clone().normalize();
    let d = (fbm(n.x * 2 + seed, n.y * 2 + n.z, seed, 4) - 0.5) * 0.6;
    let cav = 0;
    if (kind === "scholar") { const hole = vnoise(n.x * 4 + seed, n.y * 5 + n.z * 4, seed + 1); cav = Math.max(0, hole - 0.62) * 2.6; d += (fbm(n.x * 5, n.y * 6 + seed, n.z * 5 + 1, 3) - 0.5) * 0.5 - cav * 0.55; }
    v.multiplyScalar(1 + d);
    if (kind === "scholar") { v.y *= 2.3; v.x *= 0.75 + 0.25 * Math.sin(v.y * 1.4 + seed); v.x += Math.sin(v.y * 1.1 + seed) * 0.25; }
    if (kind === "slab") v.y *= 0.22;
    if (kind === "boulder") v.y *= 0.7;
    p.setXYZ(i, v.x, v.y, v.z);
    const c = 1 - Math.min(0.75, cav * 1.4) - Math.max(0, -d) * 0.5; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals(); g.scale(s, s, s);
  g.translate(0, kind === "slab" ? s * 0.1 : kind === "scholar" ? s * 2.0 : s * 0.45, 0);
  const m = new THREE.Mesh(g, mat("#ffffff", { map: TX.stone(o.color ?? "#9b9c97", { n: 1 }), vc: true, rough: 0.95 }));
  m.material.color.set(o.tint ?? "#ffffff");
  return place(m, o);
}

// ---------------- water, sky things ----------------
/** a still pond surface: tinted, slightly glossy, with drifting ripples */
export function water(o = {}) {
  const nrm = TX.ctex(`ripple:${o.seed ?? 1}`, 256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = fbm(x / 18, y / 18, 3, 3, 256 / 18), b = fbm((x + 1) / 18, y / 18, 3, 3, 256 / 18), c = fbm(x / 18, (y + 1) / 18, 3, 3, 256 / 18); const i = (y * w + x) * 4; img.data[i] = 128 + (a - b) * 900; img.data[i + 1] = 128 + (a - c) * 900; img.data[i + 2] = 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, { srgb: false, repeat: [o.w ? o.w / 6 : 2, o.d ? o.d / 6 : 2] });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 10, o.d ?? 10), new THREE.MeshStandardMaterial({ color: o.color ?? "#6f9a92", roughness: 0.12, metalness: 0.1, normalMap: nrm, normalScale: new THREE.Vector2(o.ripple ?? 0.08, o.ripple ?? 0.08), envMapIntensity: 1.2, transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.noCast = true; place(m, o);
  return tick(m, (t) => nrm.offset.set(t * 0.01, t * 0.006));
}
/** moon (or sun) disc with a halo, always facing the camera; `color`, `r` (apparent radius in world units) */
export function moon(o = {}) {
  const grp = place(new THREE.Group(), o), R = o.r ?? 6;
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.dot(0.8), color: o.color ?? "#fbf7ea", fog: false, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.dot(0), color: o.halo ?? "#fbf3dc", fog: false, transparent: true, opacity: o.haloOpacity ?? 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  disc.scale.setScalar(R * 2); halo.scale.setScalar(R * 7); disc.renderOrder = -1; halo.renderOrder = -1;
  grp.add(halo, disc); grp.userData.noCast = true;
  return grp;
}

// ---------------- architecture ----------------
/** a flat floor / ground plane: kind "stone" | "wood" | "gravel" | "earth" | "grass" | "moss" | "raked" */
export function floor(o = {}) {
  const w = o.w ?? 20, d = o.d ?? 20, k = o.kind ?? "stone", tile = o.tile ?? (k === "stone" ? 2.4 : k === "wood" ? 3 : 6);
  const map = k === "stone" ? TX.stone(o.color ?? "#a3a198", { n: 4 }) : k === "wood" ? TX.wood(o.color ?? "#7a5a3e", { planks: 6 }) : k === "raked" ? TX.raked(o.color) : TX.ground(k, o.color);
  const t = map.clone(); t.needsUpdate = true; t.repeat.set(w / tile, d / tile);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat("#ffffff", { map: t, rough: k === "wood" ? 0.6 : 0.95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.userData.noCast = true;
  return place(m, o);
}
/** a stone platform with optional front steps */
export function platform(o = {}) {
  const grp = place(new THREE.Group(), o), w = o.w ?? 10, d = o.d ?? 8, h = o.h ?? 0.6;
  const st = MAT.stone(o.color ?? "#b2b0a7", [w / 3, 1]);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), st); b.position.y = h / 2; grp.add(b);
  const top = floor({ w: w - 0.02, d: d - 0.02, kind: o.top ?? "stone", color: o.topColor, at: [0, h + 0.005, 0] }); grp.add(top);
  for (let i = 0; i < (o.steps ?? 0); i++) { const sh = h * (1 - (i + 1) / (o.steps + 1)), s = new THREE.Mesh(new THREE.BoxGeometry(o.stepW ?? 3, sh, 0.4), st); s.position.set(0, sh / 2, d / 2 + 0.2 + i * 0.4); grp.add(s); }
  return grp;
}
/** the curved East-Asian roof: a hip roof whose slopes sag (concave) and whose corners lift and flare.
 *  hip 0 = pyramid (pavilion), 0.5 = hip-and-gable look, 1 = gable ends. Returns a Group (tiles above, rafters below). */
export function roof(o = {}) {
  const W = o.w ?? 8, Dp = o.d ?? 6, rise = o.rise ?? 2.6, lift = o.lift ?? 0.7, hip = o.hip ?? 0.5, sag = o.sag ?? 1.6, flare = o.flare ?? 0.08;
  const rl = Math.max(0, (W - Dp) + Dp * hip) * (hip >= 1 ? 1 : 0.999), NP = 200, NV = 14;
  const per = 2 * (W + Dp), pts = [];
  const perim = (s) => { // s in [0, per): walk the rectangle starting at (-W/2, +D/2) going +x
    if (s < W) return [-W / 2 + s, Dp / 2];
    if (s < W + Dp) return [W / 2, Dp / 2 - (s - W)];
    if (s < 2 * W + Dp) return [W / 2 - (s - W - Dp), -Dp / 2];
    return [-W / 2, -Dp / 2 + (s - 2 * W - Dp)];
  };
  const corners = [0, W, W + Dp, 2 * W + Dp, per];
  const L = Math.min(W, Dp) * 0.45;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NP; i++) {
    const s = (i / NP) * per, [px, pz] = perim(s);
    let dc = Infinity; for (const c of corners) dc = Math.min(dc, Math.abs(s - c));
    const c = Math.pow(Math.max(0, 1 - dc / L), 2);
    const ex = px * (1 + flare * c), ez = pz * (1 + flare * c);
    const rx = Math.max(-rl / 2, Math.min(rl / 2, px));
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, k = Math.pow(v, sag);
      const x = ex + (rx - ex) * v, z = ez + (0 - ez) * v;
      const y = lift * c * Math.pow(1 - v, 2) + rise * k;
      pos.push(x, y, z); uv.push((s / per) * per / 1.2, v * Math.hypot(Dp / 2, rise) / 1.0);
    }
  }
  for (let i = 0; i < NP; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const grp = place(new THREE.Group(), o);
  const top = new THREE.Mesh(g, MAT.tiles(o.color ?? "#3f4245")); top.castShadow = true;
  const under = new THREE.Mesh(g, mat("#ffffff", { map: TX.wood(o.under ?? "#5b4330", { planks: 12 }), side: THREE.BackSide })); under.receiveShadow = true;
  grp.add(top, under);
  // ridge and hip ridges: dark round caps following the surface
  const caps = [], ink = o.ridge ?? "#2d2f31";
  if (rl > 0.01) caps.push(bar([-rl / 2 - 0.1, rise + 0.06, 0], [rl / 2 + 0.1, rise + 0.06, 0], 0.22, 0.26));
  for (const cs of corners.slice(0, 4)) { const path = []; const [px, pz] = perim(cs); for (let j = 0; j <= 8; j++) { const v = j / 8, k = Math.pow(v, sag), rx = Math.max(-rl / 2, Math.min(rl / 2, px)); path.push([px * (1 + flare) + (rx - px * (1 + flare)) * v, lift * Math.pow(1 - v, 2) + rise * k + 0.07, pz * (1 + flare) * (1 - v)]); } caps.push(taperTube(path, 0.1, 0.09, 16, 6)); }
  if (o.ridgeEnds !== false && rl > 0.01) for (const sx of [-1, 1]) { const e = new THREE.BoxGeometry(0.3, 0.5, 0.3); e.translate(sx * (rl / 2 + 0.1), rise + 0.25, 0); caps.push(e); }
  grp.add(new THREE.Mesh(merge(caps), mat(ink, { rough: 0.8 })));
  return grp;
}
/** segments for a lattice pattern inside a w × h rectangle (local x right, y up, origin bottom-left) */
export function latticeSegments(pattern = "grid", w = 1, h = 1.6, o = {}) {
  const S = [], c = o.cell ?? 0.2, r = rng(o.seed ?? 21);
  const clipLine = (x0, y0, x1, y1) => { // clip to rect (Liang–Barsky)
    let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
    for (const [p, q] of [[-dx, x0], [dx, w - x0], [-dy, y0], [dy, h - y0]]) { if (p === 0) { if (q < 0) return; continue; } const t = q / p; if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
    if (t0 < t1) S.push([x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1]);
  };
  if (pattern === "grid") { for (let x = c; x < w - 1e-6; x += c) S.push([x, 0, x, h]); for (let y = c; y < h - 1e-6; y += c) S.push([0, y, w, y]); }
  else if (pattern === "tti") { // Korean tti-sal: close verticals, three bands of horizontals
    const vc = o.cell ?? 0.06; for (let x = vc; x < w - 1e-6; x += vc) S.push([x, 0, x, h]);
    for (const b of [0.12, 0.5, 0.88]) for (let k = -1; k <= 1; k++) S.push([0, h * b + k * vc * 0.9, w, h * b + k * vc * 0.9]);
  }
  else if (pattern === "diamond") { for (let k = -h; k < w + h; k += c) { clipLine(k, 0, k + h, h); clipLine(k, h, k + h, 0); } }
  else if (pattern === "ah") { // 亞-shaped frames repeating
    for (let x = 0; x < w - 1e-6; x += c * 2) for (let y = 0; y < h - 1e-6; y += c * 2) {
      const a = c * 0.5, b = c * 1.5;
      for (const sgm of [[x + a, y, x + a, y + a], [x, y + a, x + a, y + a], [x + b, y, x + b, y + a], [x + b, y + a, x + c * 2, y + a], [x + a, y + b, x + a, y + c * 2], [x, y + b, x + a, y + b], [x + b, y + b, x + b, y + c * 2], [x + b, y + b, x + c * 2, y + b], [x + a, y + a, x + b, y + a], [x + a, y + b, x + b, y + b], [x + a, y + a, x + a, y + b], [x + b, y + a, x + b, y + b]]) clipLine(...sgm);
    }
  }
  else if (pattern === "ice") { // cracked ice: a seeded crack network
    const pts = []; const n = Math.round((w * h) / (c * c) * 0.8) + 6;
    for (let i = 0; i < n; i++) pts.push([r() * w, r() * h]);
    for (const p of pts) { const near = pts.filter((q) => q !== p).map((q) => [q, Math.hypot(q[0] - p[0], q[1] - p[1])]).sort((a, b) => a[1] - b[1]).slice(0, 3); for (const [q] of near) clipLine(p[0], p[1], q[0], q[1]); }
  }
  else if (pattern === "rings") { const n = o.n ?? 6; for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2; const R = Math.min(w, h) * 0.42; S.push([w / 2, h / 2, w / 2 + Math.cos(a0) * R, h / 2 + Math.sin(a0) * R]); } }
  if (o.frame !== false) S.push([0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]);
  return S;
}
/** a lattice window / door panel: wooden bars on a pattern, paper behind (glow lights the paper from inside). */
export function lattice(o = {}) {
  const grp = place(new THREE.Group(), o), w = o.w ?? 1, h = o.h ?? 1.6, b = o.bar ?? 0.025;
  const segs = o.segments ?? latticeSegments(o.pattern ?? "grid", w, h, o);
  const geos = segs.map(([x0, y0, x1, y1]) => { const L = Math.hypot(x1 - x0, y1 - y0); const g = new THREE.BoxGeometry(L + b, b, o.depth ?? 0.04); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2 - w / 2, (y0 + y1) / 2, 0); return g; });
  const frame = merge(geos);
  const bars = new THREE.Mesh(frame, MAT.wood(o.color ?? "#5b3d2a"));
  bars.castShadow = true; grp.add(bars);
  if (o.paper !== false) {
    const pt = TX.paper(o.paperColor ?? "#efe8d6");
    const pm = mat("#ffffff", { map: pt, rough: 1, side: THREE.DoubleSide, emissive: o.glowColor ?? "#ffe2b0", glow: o.glow ?? 0, emissiveMap: pt });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm); p.position.set(0, h / 2, -(o.depth ?? 0.04) / 2 - 0.004); p.receiveShadow = true; p.userData.noCast = true;
    grp.add(p); grp.userData.paper = pm;
  }
  grp.userData.setGlow = (k) => { if (grp.userData.paper) grp.userData.paper.emissiveIntensity = k; };
  return grp;
}
/** a plastered wall with a tiled cap; openings: [{ shape: "moon" | "rect" | "gourd" | "octagon", x, y, w, h, lattice? }] */
export function wall(o = {}) {
  const grp = place(new THREE.Group(), o), L = o.len ?? 10, H = o.h ?? 3, T = o.thick ?? 0.35;
  const sh = new THREE.Shape(); sh.moveTo(-L / 2, 0); sh.lineTo(L / 2, 0); sh.lineTo(L / 2, H); sh.lineTo(-L / 2, H); sh.lineTo(-L / 2, 0);
  for (const op of o.openings ?? []) {
    const p = new THREE.Path(), x = op.x ?? 0, w = op.w ?? 2.4, hh = op.h ?? w, y = op.y ?? (op.shape === "moon" ? 0.05 : 1.0);
    if (op.shape === "moon") p.absarc(x, y + hh / 2, hh / 2, 0, Math.PI * 2, true);
    else if (op.shape === "octagon") { for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const fn = i ? "lineTo" : "moveTo"; p[fn](x + Math.cos(a) * w / 2, y + hh / 2 + Math.sin(a) * hh / 2); } }
    else if (op.shape === "gourd") { p.absarc(x, y + hh * 0.33, hh * 0.33, -Math.PI / 2 + 0.6, Math.PI * 1.5 - 0.6, false); p.absarc(x, y + hh * 0.78, hh * 0.22, -Math.PI / 2 - 0.9, Math.PI * 1.5 + 0.9, false); }
    else { p.moveTo(x - w / 2, y); p.lineTo(x - w / 2, y + hh); p.lineTo(x + w / 2, y + hh); p.lineTo(x + w / 2, y); p.lineTo(x - w / 2, y); }
    sh.holes.push(p);
    if (op.lattice) grp.add(lattice({ w: w * 0.98, h: hh * 0.98, pattern: op.lattice, paper: !!op.paper, glow: op.glow ?? 0, glowColor: op.glowColor, at: [x, y + hh * 0.01, 0], color: op.color, cell: op.cell, seed: op.seed, frame: true }));
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); g.translate(0, 0, -T / 2);
  const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 6, uvA.getY(i) / 6);
  const wm = new THREE.Mesh(g, MAT.plaster(o.color ?? "#e9e5da")); wm.castShadow = wm.receiveShadow = true; grp.add(wm);
  if (o.cap !== false) { const cap = roof({ w: L + 0.3, d: T + 0.9, rise: 0.35, lift: 0.08, hip: 1, sag: 1.3, flare: 0, color: o.capColor ?? "#3d4043", at: [0, H, 0], ridgeEnds: false }); grp.add(cap); }
  if (o.base !== false) { const b = new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.35, T + 0.06), MAT.stone(o.baseColor ?? "#8e8c86", [L / 2, 0.2])); b.position.y = 0.175; grp.add(b); }
  return grp;
}
/** a hall / pavilion: columns on a bay grid, beams, a curved roof; sides: { front, back, left, right }: "open" | "lattice" | "wall" */
export function hall(o = {}) {
  const grp = place(new THREE.Group(), o), W = o.w ?? 8, Dd = o.d ?? 6, H = o.h ?? 3.2, [nx, nz] = o.bays ?? [3, 2];
  const base = o.base ?? 0.5, colR = o.colR ?? 0.13;
  if (base > 0) grp.add(platform({ w: W + 1.4, d: Dd + 1.4, h: base, top: o.floor ?? "stone", topColor: o.floorColor, steps: o.steps ?? 0, color: o.baseColor }));
  const colMat = o.lacquer ? MAT.lacquer(o.colColor ?? "#6e2a20") : MAT.wood(o.colColor ?? "#5a3a26"), colGeos = [], beamGeos = [];
  const xs = Array.from({ length: nx + 1 }, (_, i) => -W / 2 + (W * i) / nx), zs = Array.from({ length: nz + 1 }, (_, i) => -Dd / 2 + (Dd * i) / nz);
  const cols = [];
  for (const x of xs) for (const z of zs) if (x === xs[0] || x === xs[nx] || z === zs[0] || z === zs[nz]) {
    const g = new THREE.CylinderGeometry(colR * 0.92, colR, H, 12); g.translate(x, base + H / 2, z); colGeos.push(g); cols.push([x, z]);
    const pb = new THREE.CylinderGeometry(colR * 1.5, colR * 1.7, 0.18, 12); pb.translate(x, base + 0.09, z); beamGeos.push(pb);
  }
  for (const z of [zs[0], zs[nz]]) beamGeos.push(bar([-W / 2 - 0.2, base + H - 0.15, z], [W / 2 + 0.2, base + H - 0.15, z], 0.2, 0.32));
  for (const x of [xs[0], xs[nx]]) beamGeos.push(bar([x, base + H - 0.15, -Dd / 2 - 0.2], [x, base + H - 0.15, Dd / 2 + 0.2], 0.2, 0.32));
  const colMesh = new THREE.Mesh(merge(colGeos), colMat); colMesh.castShadow = true; grp.add(colMesh);
  const bm = new THREE.Mesh(merge(beamGeos), MAT.wood(o.beamColor ?? "#4b3324")); bm.castShadow = true; grp.add(bm);
  const ov = o.overhang ?? 1.3;
  grp.add(roof({ w: W + ov * 2, d: Dd + ov * 2, rise: o.rise ?? Math.min(W, Dd) * 0.42, lift: o.lift ?? 0.7, hip: o.hip ?? 0.5, sag: o.sag ?? 1.6, color: o.roofColor, under: o.under, at: [0, base + H, 0] }));
  // infill on the sides
  const sides = o.sides ?? {};
  const panel = (kind, x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0) - colR * 2, ang = Math.atan2(-(z1 - z0), x1 - x0) * 180 / Math.PI, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hh = H - 0.35;
    if (kind === "lattice") grp.add(lattice({ w: L, h: hh, pattern: o.pattern ?? "grid", cell: o.cell, at: [cx, base, cz], rotY: ang, glow: o.glow ?? 0, color: o.latticeColor, seed: Math.round(cx * 7 + cz * 13) }));
    else if (kind === "wall") { const m = new THREE.Mesh(new THREE.BoxGeometry(L, hh, 0.16), MAT.plaster(o.wallColor)); m.position.set(cx, base + hh / 2, cz); m.rotation.y = ang * D2R; m.castShadow = m.receiveShadow = true; grp.add(m); }
    else if (kind === "rail") grp.add(railing({ len: L, at: [cx, base, cz], rotY: ang, color: o.beamColor }));
  };
  const sideSeg = { front: [xs, zs[nz], "x"], back: [xs, zs[0], "x"], left: [zs, xs[0], "z"], right: [zs, xs[nx], "z"] };
  for (const [side, kind] of Object.entries(sides)) {
    if (!kind || kind === "open") continue;
    const [arr, fixed, ax] = sideSeg[side];
    for (let i = 0; i < arr.length - 1; i++) { const k = Array.isArray(kind) ? kind[i] : kind; if (!k || k === "open") continue; if (ax === "x") panel(k, arr[i], fixed, arr[i + 1], fixed); else panel(k, fixed, arr[i], fixed, arr[i + 1]); }
  }
  grp.userData.cols = cols; grp.userData.top = base + H;
  return grp;
}
/** a low railing between two points along x (local), posts every ~1.2 m */
export function railing(o = {}) {
  const grp = place(new THREE.Group(), o), L = o.len ?? 4, h = o.h ?? 0.7, geos = [];
  const n = Math.max(1, Math.round(L / 1.2));
  for (let i = 0; i <= n; i++) { const x = -L / 2 + (L * i) / n; geos.push(bar([x, 0, 0], [x, h, 0], 0.08)); }
  geos.push(bar([-L / 2, h, 0], [L / 2, h, 0], 0.1, 0.07), bar([-L / 2, h * 0.4, 0], [L / 2, h * 0.4, 0], 0.05));
  const m = new THREE.Mesh(merge(geos), MAT.wood(o.color ?? "#4b3324")); m.castShadow = true; grp.add(m);
  return grp;
}
/** a table: kind "low" (floor height, for sitting) | "tall" (scholar's painting table) */
export function table(o = {}) {
  const grp = place(new THREE.Group(), o), w = o.w ?? 1.8, d = o.d ?? 0.8, h = o.h ?? (o.kind === "low" ? 0.36 : 0.8), t = o.top ?? 0.06;
  const wm = MAT.wood(o.color ?? "#6a4630", [1, 1]);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), wm); top.position.y = h - t / 2; top.castShadow = top.receiveShadow = true; grp.add(top);
  const legs = [], lw = o.leg ?? 0.07;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(bar([sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.08)], [sx * (w / 2 - 0.1), h - t, sz * (d / 2 - 0.08)], lw));
  legs.push(bar([-w / 2 + 0.1, h - t - 0.06, d / 2 - 0.08], [w / 2 - 0.1, h - t - 0.06, d / 2 - 0.08], 0.04, 0.1), bar([-w / 2 + 0.1, h - t - 0.06, -d / 2 + 0.08], [w / 2 - 0.1, h - t - 0.06, -d / 2 + 0.08], 0.04, 0.1));
  const lm = new THREE.Mesh(merge(legs), MAT.wood(o.legColor ?? o.color ?? "#5a3a26")); lm.castShadow = true; grp.add(lm);
  grp.userData.top = h;
  return grp;
}

// ---------------- objects ----------------
const PROFILES = { // outer profile, normalised: [radius, y] with height 1, from the foot up to the lip
  bowl: [[0.2, 0], [0.22, 0.02], [0.2, 0.08], [0.3, 0.16], [0.42, 0.4], [0.5, 0.75], [0.55, 1]],
  cup: [[0.22, 0], [0.24, 0.03], [0.24, 0.08], [0.32, 0.3], [0.36, 0.7], [0.38, 1]],
  moonjar: [[0.2, 0], [0.22, 0.02], [0.24, 0.05], [0.36, 0.14], [0.47, 0.3], [0.52, 0.48], [0.5, 0.66], [0.42, 0.82], [0.28, 0.93], [0.25, 0.97], [0.27, 1]],
  vase: [[0.17, 0], [0.19, 0.02], [0.18, 0.06], [0.2, 0.25], [0.3, 0.55], [0.35, 0.75], [0.3, 0.86], [0.12, 0.93], [0.1, 0.97], [0.12, 1]],
  jar: [[0.26, 0], [0.28, 0.03], [0.36, 0.2], [0.46, 0.5], [0.47, 0.66], [0.4, 0.82], [0.27, 0.92], [0.28, 1]],
  plate: [[0.25, 0], [0.27, 0.15], [0.3, 0.25], [0.48, 0.55], [0.6, 0.85], [0.62, 1]],
  censer: [[0.18, 0], [0.24, 0.06], [0.2, 0.12], [0.32, 0.3], [0.4, 0.5], [0.38, 0.62], [0.3, 0.66], [0.33, 0.7]],
};
const GLAZES = { celadon: ["#97c1b2", 0.6], white: ["#f1efe8", 0], ivory: ["#ece3cf", 0.2], black: ["#26221f", 0], ash: ["#a69c82", 0.3], onggi: ["#5b3a26", 0], blue: ["#2c4b7a", 0] };
/** a turned vessel: shape name or your own profile; glaze name or colour; wobble (hand-made asymmetry); fill { level, color } */
export function vessel(o = {}) {
  const H = o.h ?? 0.3, prof = Array.isArray(o.shape) ? o.shape : PROFILES[o.shape ?? "bowl"], th = o.thick ?? 0.035, open = o.open ?? !["moonjar", "vase", "jar"].includes(o.shape ?? "bowl");
  const width = o.width ?? 1;
  const outer = prof.map(([x, y]) => new THREE.Vector2(x * H * width, y * H));
  const pts = [new THREE.Vector2(0.0001, 0), ...outer];
  if (open) { // lip, inner wall back down, inner floor
    const inner = outer.slice(1).reverse().map((v) => new THREE.Vector2(Math.max(0.0001, v.x - th * H * 2), v.y)).filter((v) => v.y > th * H * 3);
    pts.push(new THREE.Vector2(outer[outer.length - 1].x - th * H, H + th * H * 0.3), ...inner, new THREE.Vector2(0.0001, th * H * 3));
  } else pts.push(new THREE.Vector2(Math.max(0.0001, outer[outer.length - 1].x - th * H * 2), H * 0.985), new THREE.Vector2(0.0001, H * 0.94));
  const g = new THREE.LatheGeometry(pts, o.segments ?? 96);
  if (o.wobble) { const p = g.attributes.position, s = o.seed ?? 3; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + o.wobble * (Math.sin(2 * a + s) * 0.6 + Math.sin(3 * a + s * 2) * 0.4) * Math.sin(Math.PI * y / H); p.setX(i, x * k); p.setZ(i, z * k); } }
  if (o.seam) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / H, b = 1 + 0.012 * Math.exp(-Math.pow((y - 0.48) / 0.025, 2)); p.setX(i, p.getX(i) * b); p.setZ(i, p.getZ(i) * b); } }
  g.computeVertexNormals();
  const gz = GLAZES[o.glaze] ?? [o.glaze ?? "#efece4", 0];
  const m = new THREE.Mesh(g, mat("#ffffff", { map: TX.glaze(gz[0], { crackle: o.crackle ?? gz[1], speck: o.speck ?? 0 }), rough: o.rough ?? 0.22, env: 1.1, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true;
  const grp = place(new THREE.Group(), o); grp.add(m);
  if (o.fill) { const lv = o.fill.level ?? 0.7, y = H * lv; let rr = 0; for (let i = 1; i < outer.length; i++) if (outer[i].y >= y) { const a = outer[i - 1], b = outer[i]; rr = a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y)) - th * H * 2.2; break; } const l = new THREE.Mesh(new THREE.CircleGeometry(rr, 64), mat(o.fill.color ?? "#c8c08a", { rough: 0.08, env: 1.3 })); l.rotation.x = -Math.PI / 2; l.position.y = y; grp.add(l); grp.userData.liquid = l; }
  grp.userData.h = H;
  return grp;
}
/** a long zither on a table (guqin / gayageum / koto): strings, optional movable bridges, optional hui studs */
export function zither(o = {}) {
  const grp = place(new THREE.Group(), o), L = o.len ?? 1.3, W = o.w ?? 0.2, T = o.t ?? 0.05, n = o.strings ?? 7;
  const body = new THREE.CylinderGeometry(W * 1.6, W * 1.6, L, 24, 1, false, -0.32, 0.64); body.rotateZ(Math.PI / 2); body.rotateX(Math.PI / 2);
  const bb = new THREE.Box3().setFromBufferAttribute(body.attributes.position); body.translate(0, -bb.min.y, 0); body.scale(1, T / (bb.max.y - bb.min.y), 1);
  const bm = new THREE.Mesh(body, mat(o.color ?? "#2a211c", { rough: 0.45, env: 0.8 })); bm.rotation.y = Math.PI / 2; bm.castShadow = true;
  const holder = new THREE.Group(); holder.add(bm); grp.add(holder);
  const sg = [];
  for (let i = 0; i < n; i++) { const z = -W * 0.38 + (W * 0.76 * i) / Math.max(1, n - 1); sg.push(bar([-L * 0.48, T + 0.012, z], [L * 0.46, T + 0.012, z], 0.0035)); }
  grp.add(new THREE.Mesh(merge(sg), mat(o.stringColor ?? "#e8dcc0", { rough: 0.4, emissive: o.stringGlow ? "#ffe6b0" : null, glow: o.stringGlow ?? 0 })));
  const extra = [];
  if (o.bridges) for (let i = 0; i < n; i++) { const z = -W * 0.38 + (W * 0.76 * i) / Math.max(1, n - 1), x = -L * 0.15 + (i / n) * L * 0.4; const g = new THREE.ConeGeometry(0.012, 0.03, 4); g.translate(x, T + 0.006, z); extra.push(g); }
  if (extra.length) grp.add(new THREE.Mesh(merge(extra), mat("#efe6d2")));
  if (o.hui) { const dots = []; for (let i = 0; i < 13; i++) { const x = -L * 0.45 + (L * 0.9 * (i + 1)) / 14, g = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8); g.translate(x, T + 0.002, W * 0.45); dots.push(g); } grp.add(new THREE.Mesh(merge(dots), mat("#f4efe2", { rough: 0.3 }))); }
  return grp;
}
/** a bronze censer on short legs with a pierced lid; smoke is a separate `smoke({ at })` */
export function censer(o = {}) {
  const grp = place(new THREE.Group(), o), h = o.h ?? 0.24;
  const body = vessel({ shape: "censer", h: h * 0.7, glaze: "#ffffff", open: false });
  body.children[0].material = MAT.bronze(o.color ?? "#7a6236");
  body.position.y = h * 0.1; grp.add(body);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(h * 0.27, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.bronze(o.color ?? "#7a6236")); lid.position.y = h * 0.1 + h * 0.48; lid.scale.y = 1.3; grp.add(lid);
  const legs = []; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; legs.push(bar([Math.cos(a) * h * 0.18, 0, Math.sin(a) * h * 0.18], [Math.cos(a) * h * 0.15, h * 0.14, Math.sin(a) * h * 0.15], h * 0.04)); }
  grp.add(new THREE.Mesh(merge(legs), MAT.bronze(o.color ?? "#7a6236")));
  grp.userData.top = [0, h * 0.95, 0];
  return grp;
}
/** a rising ribbon of smoke / steam: soft, wavering, always facing the camera */
export function smoke(o = {}) {
  const h = o.h ?? 0.9, w = o.w ?? 0.12, seed = o.seed ?? 1;
  const g = new THREE.PlaneGeometry(w * 2.5, h, 1, 48); g.translate(0, h / 2, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(o.color ?? "#f4f2ee") }, uOp: { value: o.opacity ?? 0.45 }, uH: { value: h }, uSeed: { value: seed } },
    vertexShader: `uniform float uT, uH, uSeed; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; float k = p.y / uH;
      p.x += (sin(p.y * 7.0 - uT * 1.6 + uSeed) * 0.5 + sin(p.y * 13.0 - uT * 2.3 + uSeed * 2.0) * 0.25) * ${(w * 0.9).toFixed(3)} * pow(k, 1.2) * 3.0;
      p.x *= 1.0 + k * 1.4;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp, uT; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float x = abs(vUv.x - 0.5) * 2.0; float core = exp(-x * x * (6.0 - 4.0 * vUv.y));
      float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
      float br = n(vec2(vUv.x * 3.0, vUv.y * 9.0 - uT * 0.9)) * 0.7 + n(vec2(vUv.x * 7.0, vUv.y * 21.0 - uT * 1.7)) * 0.3;
      gl_FragColor = vec4(uCol, uOp * core * fade * smoothstep(0.25, 0.75, br)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = place(new THREE.Mesh(g, m), o); mesh.userData.noCast = true; mesh.renderOrder = 3;
  return tick(mesh, (t, cam) => { m.uniforms.uT.value = t; if (cam) { const p = cam.position; mesh.lookAt(p.x, mesh.position.y + (mesh.parent ? 0 : 0), p.z); } });
}
/** a paper lantern (lathe paper glowing from inside, bamboo ribs) */
export function lantern(o = {}) {
  const grp = place(new THREE.Group(), o), r = o.r ?? 0.3, h = o.h ?? 0.55;
  const prof = []; for (let i = 0; i <= 16; i++) { const v = i / 16; prof.push(new THREE.Vector2(r * (0.55 + 0.45 * Math.sin(Math.PI * v)), v * h)); }
  const pt = TX.paper(o.paperColor ?? "#f2e6cc");
  const pm = mat("#ffffff", { map: pt, emissive: o.color ?? "#ffb866", glow: o.glow ?? 1.4, emissiveMap: pt, side: THREE.DoubleSide, rough: 1 });
  grp.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 32), pm));
  const ribs = []; for (let i = 1; i < 8; i++) { const v = i / 8, rr = r * (0.55 + 0.45 * Math.sin(Math.PI * v)) + 0.003; const g = new THREE.TorusGeometry(rr, r * 0.008, 4, 48); g.rotateX(Math.PI / 2); g.translate(0, v * h, 0); ribs.push(g); }
  for (const y of [0, h]) { const g = new THREE.CylinderGeometry(r * 0.57, r * 0.57, 0.04, 24); g.translate(0, y, 0); ribs.push(g); }
  grp.add(new THREE.Mesh(merge(ribs), mat(o.ribColor ?? "#5b4330")));
  if (o.light !== false) { const L = new THREE.PointLight(o.color ?? "#ffb866", o.lightPower ?? 3, o.range ?? 8, 1.6); L.position.y = h / 2; grp.add(L); }
  grp.userData.paper = pm;
  return grp;
}
/** a flat painted panel (a painting, calligraphy, a sign): draw(g, w, h) on a canvas; `scroll: true` adds rods */
export function panel(o = {}) {
  const grp = place(new THREE.Group(), o), w = o.w ?? 1, h = o.h ?? 1.6, px = o.px ?? 512;
  const tex = TX.painted(o.key ?? "panel" + w + h, px, Math.round((px * h) / w), (g, cw, ch) => { g.fillStyle = o.bg ?? "#efe8d6"; g.fillRect(0, 0, cw, ch); o.draw?.(g, cw, ch); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat("#ffffff", { map: tex, rough: 1, side: THREE.DoubleSide })); m.position.y = h / 2; grp.add(m);
  if (o.scroll) for (const y of [0, h]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w + 0.12, 8), MAT.wood("#3a2a20")); r.rotation.z = Math.PI / 2; r.position.set(0, y, 0.01); grp.add(r); }
  return grp;
}
/** an assembly of blocks that can come apart: parts [{ size: [x, y, z], at: [x, y, z], dir: [dx, dy, dz], color }].
 *  obj.userData.explode(k): each part moves at + dir · k (k = 0 assembled). */
export function assembly(o = {}) {
  const grp = place(new THREE.Group(), o), parts = [];
  for (const p of o.parts ?? []) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...p.size), MAT.wood(p.color ?? o.color ?? "#7a5a3c")); m.position.set(...p.at); m.castShadow = m.receiveShadow = true;
    grp.add(m); parts.push({ m, at: V(p.at), dir: V(p.dir ?? [0, 0, 0]) });
  }
  grp.userData.explode = (k) => { for (const p of parts) p.m.position.copy(p.at).addScaledVector(p.dir, k); };
  return grp;
}
/** a bracket set (dougong / gongpo): tiers of blocks and crossed arms, as an assembly that explodes upward */
export function brackets(o = {}) {
  const tiers = o.tiers ?? 3, s = o.size ?? 0.5, parts = [];
  parts.push({ size: [s * 0.9, s * 0.45, s * 0.9], at: [0, s * 0.22, 0], dir: [0, 0, 0] });
  for (let i = 0; i < tiers; i++) {
    const y = s * 0.45 + i * s * 0.62, L = s * (1.6 + i * 0.9);
    parts.push({ size: [L, s * 0.32, s * 0.3], at: [0, y + s * 0.16, 0], dir: [0, s * (1.2 + i * 1.1), 0] });
    parts.push({ size: [s * 0.3, s * 0.32, L], at: [0, y + s * 0.16, 0], dir: [0, s * (1.2 + i * 1.1), 0] });
    for (const [x, z] of [[L / 2 - s * 0.15, 0], [-L / 2 + s * 0.15, 0], [0, L / 2 - s * 0.15], [0, -L / 2 + s * 0.15]]) parts.push({ size: [s * 0.42, s * 0.3, s * 0.42], at: [x, y + s * 0.47, z], dir: [x * 0.6, s * (1.5 + i * 1.1), z * 0.6] });
  }
  return assembly({ ...o, parts });
}

// ---------------- light and particles ----------------
/** flowing light ribbons along seeded curves inside a box (or your own `paths`); pulses travel along them */
export function ribbons(o = {}) {
  const grp = place(new THREE.Group(), o), r = rng(o.seed ?? 23), n = o.n ?? 6;
  const [x0, x1] = o.x ?? [-3, 3], [y0, y1] = o.y ?? [1, 3], [z0, z1] = o.z ?? [-1, 1];
  const mats = [];
  for (let i = 0; i < n; i++) {
    const pts = o.paths?.[i] ?? Array.from({ length: 6 }, (_, k) => [x0 + ((x1 - x0) * k) / 5 + (r() - 0.5) * 0.4, y0 + (y1 - y0) * r(), z0 + (z1 - z0) * r()]);
    const curve = new THREE.CatmullRomCurve3(pts.map(V));
    const g = new THREE.TubeGeometry(curve, 160, o.width ?? 0.012, 5, false);
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(o.color ?? "#9fe3f0") }, uPh: { value: r() }, uSp: { value: (o.speed ?? 0.12) * (0.7 + r() * 0.6) }, uGlow: { value: o.glow ?? 1.6 }, uOn: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uT, uPh, uSp, uGlow, uOn; uniform vec3 uCol; varying vec2 vUv;
        void main(){ float u = vUv.x; float head = fract(uT * uSp + uPh); float d = u - head; d = d > 0.0 ? d + 1.0 : d; d = -d;
          float pulse = exp(-d * 4.0) * step(0.0, d) ; float base = 0.25; float ends = smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u);
          float reveal = smoothstep(uOn + 0.02, uOn - 0.02, u);
          gl_FragColor = vec4(uCol * uGlow, (base + pulse) * ends * reveal); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mats.push(m); const mesh = new THREE.Mesh(g, m); mesh.userData.noCast = true; mesh.renderOrder = 4; grp.add(mesh);
  }
  grp.userData.reveal = (k) => mats.forEach((m) => (m.uniforms.uOn.value = k));
  return tick(grp, (t) => mats.forEach((m) => (m.uniforms.uT.value = t)));
}
/** drifting motes of light (gold dust, fireflies, pollen) */
export function dust(o = {}) {
  const r = rng(o.seed ?? 29), n = o.n ?? 400, pos = new Float32Array(n * 3), ph = new Float32Array(n);
  const [x0, x1] = o.x ?? [-4, 4], [y0, y1] = o.y ?? [0, 3], [z0, z1] = o.z ?? [-2, 2];
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + (x1 - x0) * r(); pos[i * 3 + 1] = y0 + (y1 - y0) * r(); pos[i * 3 + 2] = z0 + (z1 - z0) * r(); ph[i] = r() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(o.color ?? "#f2d48a") }, uSize: { value: o.size ?? 0.05 }, uScale: { value: 800 }, uOp: { value: o.opacity ?? 1 } },
    vertexShader: `attribute float ph; uniform float uT, uSize, uScale; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uT * 0.3 + ph) * 0.15; p.y += sin(uT * 0.21 + ph * 1.7) * 0.12 + ${(o.rise ?? 0).toFixed(3)} * uT; p.z += cos(uT * 0.25 + ph) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uScale / -mv.z; vA = 0.55 + 0.45 * sin(uT * 1.3 + ph * 3.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uCol * 1.4, uOp * vA * smoothstep(0.5, 0.0, d)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = place(new THREE.Points(g, m), o); pts.userData.noCast = true; pts.frustumCulled = false;
  return tick(pts, (t) => { m.uniforms.uT.value = t; });
}
/** falling rain streaks or petals: kind "rain" | "petals" | "snow" */
export function fall(o = {}) {
  const kind = o.kind ?? "rain", r = rng(o.seed ?? 31), n = o.n ?? (kind === "rain" ? 1500 : 300);
  const [x0, x1] = o.x ?? [-10, 10], [y0, y1] = o.y ?? [0, 10], [z0, z1] = o.z ?? [-10, 10];
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + (x1 - x0) * r(); pos[i * 3 + 1] = 0; pos[i * 3 + 2] = z0 + (z1 - z0) * r(); ph[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
  const speed = o.speed ?? (kind === "rain" ? 9 : kind === "snow" ? 0.8 : 0.6), H = y1 - y0;
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(o.color ?? (kind === "rain" ? "#d8e2ea" : kind === "snow" ? "#ffffff" : "#f3c9d2")) }, uMap: { value: kind === "petals" ? TX.blossom(o.color ?? "#f3c9d2") : TX.dot(kind === "rain" ? 0 : 0.5) }, uOp: { value: o.opacity ?? (kind === "rain" ? 0.35 : 0.9) } },
    vertexShader: `attribute float ph; uniform float uT; varying float vK;
      void main(){ vec3 p = position; float y = fract(ph - uT * ${(speed / H).toFixed(4)}); p.y = ${y0.toFixed(2)} + y * ${H.toFixed(2)};
        p.x += ${kind === "rain" ? "0.0" : "sin(uT * 1.1 + ph * 30.0) * 0.4"}; p.z += ${kind === "rain" ? "0.0" : "cos(uT * 0.8 + ph * 20.0) * 0.3"};
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = ${kind === "rain" ? "40.0" : kind === "snow" ? "26.0" : "60.0"} * ${(o.size ?? 1).toFixed(2)} / -mv.z * 10.0; vK = ph; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp; uniform sampler2D uMap; varying float vK;
      void main(){ vec2 c = gl_PointCoord; ${kind === "rain" ? "float a = smoothstep(0.06, 0.0, abs(c.x - 0.5)) * smoothstep(0.0, 0.5, c.y) * smoothstep(1.0, 0.6, c.y);" : "vec4 tx = texture2D(uMap, c); float a = tx.a;"}
        gl_FragColor = vec4(uCol, uOp * a); }`,
    transparent: true, depthWrite: false,
  });
  const pts = place(new THREE.Points(g, m), o); pts.frustumCulled = false; pts.userData.noCast = true;
  return tick(pts, (t) => { m.uniforms.uT.value = t; });
}
