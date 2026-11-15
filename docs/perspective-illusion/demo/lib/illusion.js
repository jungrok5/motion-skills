// perspective-illusion · illusion.js — the engine: a level camera rig that flattens a deep scene through a long lens and
// dolly-zooms it open, a key timeline on one monotone cubic, swap objects that change depth while the view is flat, an
// illustration post pass (ink lines from depth / normals / flat colour, two-tone shading, world-anchored hatching in cast
// shadows only, a sky painted by view direction), static meshes merged by material, jittered anti-aliasing and adaptive
// motion blur averaged on the GPU, and the render contract (render / renderMany / probe / setJitter / frame / READY).
// Every frame is a pure function of the time in ms, periodic in the loop length.
import * as THREE from "three";
export { THREE };

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** a seeded random generator: const r = rng(7); r() → [0, 1) */
export const rng = (seed) => { let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

const Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const D2R = Math.PI / 180;

// ---------------- the look: one style, tuned per scene through o.look ----------------
// ink: line colour · line: line half-width in px at 1080 (near objects get up to 1.3×) · shade: what the shade side is
// multiplied by (the two-tone step) · hatch: what hatch strokes in cast shadows multiply by · hatchPitch: strokes per
// metre · shadeAt: the sun-mask level under which a face is shade · groundLine: how dark colour lines on the ground are
// (0..1 of ink) · sky: painted by view direction (zenith, horizon, low band under the horizon, clouds).
export const LOOK = {
  ink: "#17141f", line: 1.25, shade: "#b8bcdc", hatch: "#7d82b4", hatchPitch: 9, shadeAt: 0.5, groundLine: 0.42,
  sky: { zenith: "#4f78cf", horizon: "#f4c79c", low: "#f4c79c", cloud: "#fff6ec", clouds: 0.42, cloudScale: 3.2, seed: 3 },
  vignette: 0.14,
};

// ---------------- shots ----------------
// A shot is a plain object { x, y, zf, W, fov, H, el, yaw, lay, cs, ...any numeric key the scene uses }:
//   x, y  camera side position and height (m) · zf the focus plane (world z) · W the width framed there (m)
//   fov   horizontal lens angle (deg): ~2 reads flat, 25–90 deep · H lens shift: where the horizon sits (−1 bottom … 1 top)
//   el    look down by raising the camera and shifting the lens, never by tilting (deg) · yaw swing round the focus (deg)
//   lay   swap-object layout (0 row … 1 diagonal) · cs swap-object scale (drawn bigger in the flat view)
// Keeping W while changing fov is the dolly zoom.
export const SHOT = { x: 0, y: 1.6, zf: 0, W: 12, fov: 2, H: 0, el: 0, yaw: 0, lay: 0, cs: 1 };
const LOGK = new Set(["W", "fov"]);

/** Fritsch–Carlson monotone cubic slopes for values v at times t (holds stay flat, ends have zero slope) */
function fcSlopes(t, v) {
  const n = t.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((v[i + 1] - v[i]) / (t[i + 1] - t[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  m[0] = 0; m[n - 1] = 0;
  return m;
}

// ---------------- the post pass ----------------
const POST_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const POST_FS = /* glsl */ `
uniform sampler2D tA, tN, tD, tS;
uniform mat4 invVP; uniform mat3 camRot; uniform vec3 camPos, sunDir;
uniform vec2 res; uniform float near, far, lineW, shadeAt, groundLine, hatchPitch, vignette, wgt;
uniform vec3 ink, shade, hatch, skyTop, skyHor, skyLow, skyCloud; uniform float clouds, cloudScale, seed;
varying vec2 vUv;
float lin(float d){ return near * far / (far - d * (far - near)); }
vec3 world(vec2 uv, float d){ vec4 p = invVP * vec4(uv * 2. - 1., d * 2. - 1., 1.); return p.xyz / p.w; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
// the sky by view direction (not screen position): clouds stay put while the camera moves and zooms
vec3 skyAt(vec3 dir){
  float e = dir.y, az = atan(dir.x, -dir.z);
  vec3 c = e < 0. ? mix(skyHor, skyLow, smoothstep(0., -.08, e)) : mix(skyHor, skyTop, smoothstep(0., .42, e));
  vec2 q = vec2(az * cloudScale, e * cloudScale * 4.2);
  float n = fbm(q + seed) * .75 + fbm(q * 2.7 - seed) * .25;
  float m = smoothstep(1. - clouds, 1. - clouds + .22, n) * smoothstep(.0, .06, e) * (1. - smoothstep(.55, .9, e));
  return mix(c, skyCloud, m * .9);
}
float isSky(float d){ return step(.999999, d); }
// line strength at uv: silhouettes against the sky, depth steps (second difference of 1/z, which is exactly zero across
// any plane, so a road seen edge-on is never inked), creases (normals) and, kept apart in ecol, flat-colour boundaries
float ecol;
float edgeAt(vec2 uv, float r, float cdens){
  vec2 px = r / res; float d0 = texture2D(tD, uv).r, s0 = isSky(d0); float iz0 = 1. / lin(d0);
  vec4 N0 = texture2D(tN, uv); vec3 n0 = N0.xyz * 2. - 1.; vec3 a0 = texture2D(tA, uv).rgb;
  float e = 0.; ecol = 0.;
  for (int k = 0; k < 4; k++) {
    float ang = float(k) * .785398; vec2 o = vec2(cos(ang), sin(ang)) * px;
    float d1 = texture2D(tD, uv + o).r, d2 = texture2D(tD, uv - o).r, s1 = isSky(d1), s2 = isSky(d2);
    vec4 N1 = texture2D(tN, uv + o), N2 = texture2D(tN, uv - o);
    float kmax = max(N0.a, max(N1.a, N2.a)), kmin = min(N0.a, min(N1.a, N2.a));
    if (s0 != s1 || s0 != s2) { e = max(e, step(.25, kmax)); continue; }
    if (s0 > .5) continue;
    float iz1 = 1. / lin(d1), iz2 = 1. / lin(d2);
    float dz = abs(iz1 + iz2 - 2. * iz0) / iz0;
    float eg = smoothstep(.0016, .0045, dz);
    vec3 n1 = N1.xyz * 2. - 1., n2 = N2.xyz * 2. - 1.;
    // faces seen almost edge-on are often thinner than a pixel: their creases would blink, so they do not count
    if (abs(n1.z) < .2) n1 = n0; if (abs(n2.z) < .2) n2 = n0;
    if (abs(n0.z) >= .2) eg = max(eg, smoothstep(.25, .5, 1. - min(dot(n0, n1), dot(n0, n2))));
    e = max(e, eg * step(.25, kmax));
    vec3 a1 = texture2D(tA, uv + o).rgb, a2 = texture2D(tA, uv - o).rgb;
    ecol = max(ecol, smoothstep(.05, .09, max(length(a1 - a0), length(a2 - a0))) * cdens * step(.75, kmin));
  }
  return e;
}
void main(){
  float d = texture2D(tD, vUv).r, sky = isSky(d);
  vec3 wp = world(vUv, d), dir = normalize(world(vUv, 1.) - camPos);
  float z = lin(d);
  float foot = length(fwidth(wp));                                  // metres per pixel here
  float cdens = 1. - smoothstep(.02, .06, foot);                     // colour lines fade before they crowd and shimmer
  float r = lineW * (res.y / 1080.) * mix(1.3, .9, smoothstep(4., 40., z));
  float e = edgeAt(vUv, r, cdens);
  vec3 c;
  if (sky > .5) c = skyAt(dir);
  else {
    c = texture2D(tA, vUv).rgb;
    vec3 nv = texture2D(tN, vUv).xyz * 2. - 1., nw = normalize(camRot * nv), an = abs(nw);
    float lit = texture2D(tS, vUv).r;
    float sh = 1. - smoothstep(shadeAt - .06, shadeAt + .06, lit);  // two tones: lit or shade, no gradient
    c *= mix(vec3(1.), shade, sh);
    // hatching only in cast shadows (faces turned to the sun but dark), anchored to the world so it never crawls
    float castSh = sh * smoothstep(.12, .24, dot(nw, sunDir));
    vec2 q = an.y > .7 ? wp.xz : (an.x > an.z ? wp.zy : wp.xy);
    float hv = (q.x + q.y) * hatchPitch, fw = fwidth(hv);
    float st = 1. - smoothstep(0., fw * 1.5 + .06, abs(fract(hv) - .5) - .3);
    c = mix(c, c * hatch, st * castSh * (1. - smoothstep(.14, .3, fw)) * .85);
  }
  vec3 nUp = normalize(camRot * (texture2D(tN, vUv).xyz * 2. - 1.));
  float colW = sky > .5 ? 0. : (nUp.y > .7 ? groundLine : 1.);   // markings and tile joints on the ground: a lighter line
  float line = max(smoothstep(.35, .65, e), smoothstep(.35, .65, ecol) * colW);
  c = mix(c, ink, line);
  vec2 v = vUv - .5; c *= 1. - vignette * smoothstep(.3, .85, length(v * vec2(1., .8)) * 1.25);
  gl_FragColor = vec4(toSRGB(clamp(c, 0., 1.)) * wgt, 1.);
}`;

// ---------------- the scene ----------------
export class Illusion {
  /** o: { look: overrides of LOOK (sky merges), sun: { az, el } (deg; az 0 = from behind the camera, + = from the right,
   *  180 = from behind the scene), shadowMap: 4096, shadowReach / shadowCenter: [x, y, z] (the shadowed area, when far
   *  backdrops widen the scene), scale, fps, blur: { mink, maxk, step } } */
  constructor(o = {}) {
    this.o = o;
    this.scale = +(Q.get("scale") ?? o.scale ?? 1);
    this.W = Math.round(1920 * this.scale); this.H = Math.round(1080 * this.scale); this.aspect = 16 / 9;
    this.fps = +(Q.get("fps") ?? o.fps ?? 30);
    this.ss = +(Q.get("ss") ?? o.ss ?? 1);              // supersampling: the passes render at ss × the output size
    this.look = { ...LOOK, ...(o.look ?? {}), sky: { ...LOOK.sky, ...(o.look?.sky ?? {}) } };
    this.sun = { az: o.sun?.az ?? -35, el: o.sun?.el ?? 30 };
    this.blur = { mink: o.blur?.mink ?? 4, maxk: o.blur?.maxk ?? 32, step: o.blur?.step ?? 2 };
    this.scene = new THREE.Scene();
    this.root = new THREE.Group(); this.root.name = "root"; this.scene.add(this.root);
    this.cam = new THREE.PerspectiveCamera(30, this.aspect, 0.1, 2000);
    this.shotMap = {}; this.keyList = []; this.swaps = []; this.updates = []; this.dynamic = new Set();
    this.matCache = new Map(); this.jit = [0, 0]; this.ready = false;
  }

  // ---------- materials: flat colour (the albedo pass) + how the line and light passes treat it ----------
  /** a material for a colour (CSS) or a texture. o: { map, ink: 1 (full) | 0.5 (outline only: no colour lines inside —
   *  text, screens, busy textures) | 0 (no ink: rain, light cones), glow: true (never shaded: lit screens, lamps),
   *  side: "double" } */
  mat(color = "#ffffff", o = {}) {
    if (color?.isMaterial) return color;
    const key = `${color}|${o.map?.uuid ?? ""}|${o.ink ?? 1}|${o.glow ? 1 : 0}|${o.side ?? ""}|${o.opacity ?? 1}`;
    let m = this.matCache.get(key);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), map: o.map ?? null, side: o.side === "double" ? THREE.DoubleSide : THREE.FrontSide,
        transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, depthWrite: (o.opacity ?? 1) >= 1 });
      m.userData = { ink: o.ink ?? 1, glow: !!o.glow };
      this.matCache.set(key, m);
    }
    return m;
  }
  add(obj) { this.root.add(obj); return obj; }
  /** keep an object out of the static merge (it moves in update or is a swap object) */
  keep(obj) { this.dynamic.add(obj); return obj; }
  /** fn(ms, F) sets every moving thing for time ms. Never accumulate: set from ms, with whole cycles per loop (F.cycle). */
  update(fn) { this.updates.push(fn); return this; }
  /** phase in [0, 1) that completes n whole cycles per loop */
  cycle(ms, n = 1) { const u = (ms / this.loop) * n; return u - Math.floor(u); }
  /** a swap object: moves from row (lay 0) to diag (lay 1) — change lay only while the view is flat — and scales by cs.
   *  row / diag: { x, y, z, ry } */
  swap(obj, row, diag) {
    this.keep(obj); obj.userData.swap = { row: { x: obj.position.x, y: obj.position.y, z: obj.position.z, ry: 0, ...row }, diag: { x: obj.position.x, y: obj.position.y, z: obj.position.z, ry: 0, ...row, ...diag } };
    this.swaps.push(obj); return obj;
  }

  // ---------- the timeline ----------
  /** name → shot (unset keys default from SHOT) */
  shots(map) { for (const [k, v] of Object.entries(map)) this.shotMap[k] = { ...SHOT, ...v, name: k }; return this; }
  /** a "drift" of a shot so holds breathe: { W: 0.96 } multiplies W, other keys add (drift("flat", { W: .965, x: .1 })) */
  drift(base, o) {
    const s = this.shotMap[base]; if (!s) throw new Error(`drift: no shot "${base}"`);
    return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k in o ? (k === "W" ? v * o[k] : typeof v === "number" ? v + o[k] : o[k]) : v]));
  }
  /** keys: [[ms, "shot" | shotObject], ...], first at 0, last = loop length, first shot = last shot. o.scale stretches time */
  keys(list, o = {}) {
    const k = o.scale ?? 1, items = list.map(([t, s]) => [t * k, typeof s === "string" ? this.shotMap[s] : { ...SHOT, ...s }]);
    items.forEach(([t, s], i) => { if (!s) throw new Error(`keys: no shot "${list[i][1]}" (shots: ${Object.keys(this.shotMap).join(", ")})`); });
    this.keyList = items.map(([t, s], i) => ({ t, s, name: typeof list[i][1] === "string" ? list[i][1] : s.name ?? `key${i}` }));
    this.loop = items[items.length - 1][0];
    const params = new Set(); for (const [, s] of items) for (const [p, v] of Object.entries(s)) if (typeof v === "number") params.add(p);
    this.params = [...params];
    this.times = items.map(([t]) => t);
    this.vals = this.params.map((p) => items.map(([, s]) => { const v = s[p] ?? SHOT[p] ?? 0; return LOGK.has(p) ? Math.log(v) : v; }));
    this.slopes = this.vals.map((v) => fcSlopes(this.times, v));
    return this;
  }
  /** the camera state at time ms (wraps the loop) */
  shotAt(ms) {
    const T = this.times, L = this.loop; ms = ((ms % L) + L) % L;
    let k = 0; while (k < T.length - 2 && ms >= T[k + 1]) k++;
    const h = T[k + 1] - T[k], u = h > 0 ? clamp01((ms - T[k]) / h) : 1;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const s = {};
    this.params.forEach((p, j) => { const V = this.vals[j], M = this.slopes[j]; const v = h00 * V[k] + h10 * h * M[k] + h01 * V[k + 1] + h11 * h * M[k + 1]; s[p] = LOGK.has(p) ? Math.exp(v) : v; });
    s.lay = clamp01(s.lay ?? 0); s.cs ??= 1; s.el ??= 0; s.yaw ??= 0;
    return s;
  }
  /** where the camera stands for shot s (also used by checks) */
  rig(s) {
    const hf = (s.fov * D2R) / 2, D = s.W / 2 / Math.tan(hf), yw = s.yaw * D2R, vt = Math.tan(hf) / this.aspect, te = Math.tan(s.el * D2R);
    return { D, vt, Hs: s.H + te / vt, pos: new THREE.Vector3(s.x + Math.sin(yw) * D, s.y + D * te, s.zf + Math.cos(yw) * D), dir: new THREE.Vector3(-Math.sin(yw), 0, -Math.cos(yw)) };
  }
  /** set the camera for shot s: level (verticals stay vertical), the horizon placed by lens shift, plus sub-pixel jitter */
  place(s, jx = this.jit[0], jy = this.jit[1]) {
    const c = this.cam, r = this.rig(s);
    c.fov = (2 * Math.atan(r.vt)) / D2R; c.position.copy(r.pos); c.up.set(0, 1, 0); c.lookAt(r.pos.clone().add(r.dir));
    // near / far hug the scene so depth stays precise even 400 m out on the telephoto
    const b = this.bounds, near = Math.max(0.05, b.distanceToPoint(r.pos) * 0.8), far = Math.max(near + 1, this.farthest(r.pos) * 1.02);
    c.near = near; c.far = far; c.updateProjectionMatrix();
    const e = c.projectionMatrix.elements;
    e[9] = -r.Hs + (2 * jy) / this.H; e[8] = (-2 * jx) / this.W;
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert(); c.updateMatrixWorld();
    for (const o of this.swaps) {
      const { row, diag } = o.userData.swap, k = s.lay;
      o.position.set(lerp(row.x, diag.x, k), lerp(row.y, diag.y, k), lerp(row.z, diag.z, k)); o.rotation.y = lerp(row.ry, diag.ry, k) * D2R; o.scale.setScalar(s.cs);
    }
    return r;
  }
  farthest(p) { let m = 0; const b = this.bounds; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) m = Math.max(m, p.distanceTo(new THREE.Vector3(x, y, z))); return m; }
  setTime(ms) { for (const f of this.updates) f(ms, this); }

  // ---------- build: merge, materials per pass, lights, targets ----------
  /** merge every static mesh by material into one mesh each (thousands of draw calls → a few hundred) */
  mergeStatic() {
    this.root.updateMatrixWorld(true);
    const groups = new Map(), drop = [];
    const walk = (o) => {
      if (this.dynamic.has(o) || o.userData.noMerge) return;
      if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material)) {
        const k = o.material.uuid + (o.userData.noCast ? "|nc" : ""); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); drop.push(o);
      }
      for (const c of o.children) walk(c);
    };
    walk(this.root);
    let calls = 0;
    for (const [, list] of groups) {
      let n = 0; const parts = list.map((m) => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; n += g.attributes.position.count; return [m, g]; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      for (const [m, g] of parts) {
        const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(m.matrixWorld);
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); pos[(o + i) * 3] = v.x; pos[(o + i) * 3 + 1] = v.y; pos[(o + i) * 3 + 2] = v.z;
          if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(o + i) * 3] = v.x; nor[(o + i) * 3 + 1] = v.y; nor[(o + i) * 3 + 2] = v.z; }
          if (U) { uv[(o + i) * 2] = U.getX(i); uv[(o + i) * 2 + 1] = U.getY(i); }
        }
        o += P.count;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, list[0].material); mesh.userData.noCast = !!list[0].userData.noCast;
      this.root.add(mesh); calls++;
    }
    for (const m of drop) { m.parent.remove(m); }
    this.stats = { merged: drop.length, calls };
  }
  makePasses() {
    const ink = (k) => new THREE.ShaderMaterial({
      uniforms: { k: { value: k } }, side: THREE.DoubleSide,
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float k; varying vec3 vN; void main(){ vec3 n = normalize(gl_FrontFacing ? vN : -vN); gl_FragColor = vec4(n * .5 + .5, k); }",
    });
    const N = { 1: ink(1), 0.5: ink(0.5) };
    const lit = new THREE.MeshLambertMaterial({ color: 0xffffff }), litD = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.meshes = [];
    this.scene.traverse((o) => {
      if (!o.isMesh) return;
      const a = o.material, u = a.userData ?? {};
      o.userData.pass = [a, N[u.ink >= 0.75 ? 1 : 0.5], u.glow ? glow : a.side === THREE.DoubleSide ? litD : lit];
      o.userData.noInk = u.ink === 0;
      o.castShadow = !o.userData.noCast && !o.userData.noInk;
      o.receiveShadow = true;
      this.meshes.push(o);
    });
  }
  initLights() {
    const b = this.bounds, c = this.o.shadowCenter ? new THREE.Vector3(...this.o.shadowCenter) : b.getCenter(new THREE.Vector3()), R = b.getSize(new THREE.Vector3()).length() / 2;
    const az = this.sun.az * D2R, el = this.sun.el * D2R;
    this.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    // the mask pass: lit = 2 × (sun · normal) × shadow — three divides Lambert by π, hence intensity 2π
    const sun = new THREE.DirectionalLight(0xffffff, 2 * Math.PI);
    const reach = this.o.shadowReach ?? R;
    sun.position.copy(c).addScaledVector(this.sunDir, reach * 2.5); sun.target.position.copy(c);
    sun.castShadow = true; const ms = this.o.shadowMap ?? 4096; sun.shadow.mapSize.set(ms, ms);
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: reach * 5 });
    sun.shadow.bias = this.o.shadowBias ?? -0.0005; sun.shadow.normalBias = this.o.shadowNormalBias ?? 0.04;
    this.scene.add(sun, sun.target); this.sunLight = sun;
  }
  initRenderer() {
    const canvas = document.createElement("canvas"); canvas.id = "frame"; canvas.width = this.W; canvas.height = this.H; this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    r.setPixelRatio(1); r.setSize(this.W, this.H, false); r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
    this.renderer = r;
    const W = Math.round(this.W * this.ss), H = Math.round(this.H * this.ss);
    this.rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
    this.rtN = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
    this.rtN.depthTexture = new THREE.DepthTexture(W, H, THREE.FloatType);
    this.rtS = new THREE.WebGLRenderTarget(W, H);
    this.rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    const L = this.look, S = L.sky, col = (h) => new THREE.Color(h);
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tA: { value: this.rtA.texture }, tN: { value: this.rtN.texture }, tD: { value: this.rtN.depthTexture }, tS: { value: this.rtS.texture },
        invVP: { value: new THREE.Matrix4() }, camRot: { value: new THREE.Matrix3() }, camPos: { value: new THREE.Vector3() }, sunDir: { value: this.sunDir },
        res: { value: new THREE.Vector2(W, H) }, near: { value: 0.1 }, far: { value: 100 }, lineW: { value: L.line }, shadeAt: { value: L.shadeAt },
        groundLine: { value: L.groundLine }, hatchPitch: { value: L.hatchPitch }, vignette: { value: L.vignette }, wgt: { value: 1 },
        ink: { value: col(L.ink) }, shade: { value: col(L.shade) }, hatch: { value: col(L.hatch) },
        skyTop: { value: col(S.zenith) }, skyHor: { value: col(S.horizon) }, skyLow: { value: col(S.low) }, skyCloud: { value: col(S.cloud) },
        clouds: { value: S.clouds }, cloudScale: { value: S.cloudScale }, seed: { value: S.seed },
      },
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, transparent: true,
    });
    const quad = (m) => { const s = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; s.add(q); return s; };
    this.postScene = quad(this.post);
    // down to the output size with a small tent filter (one tap when ss = 1)
    this.copy = new THREE.ShaderMaterial({ uniforms: { tex: { value: this.rtAcc.texture }, px: { value: new THREE.Vector2(1 / W, 1 / H) }, ss: { value: this.ss } }, vertexShader: POST_VS,
      fragmentShader: "uniform sampler2D tex; uniform vec2 px; uniform float ss; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; if (ss > 1.01) { vec2 o = px * ss * .5; c = (c * 2. + texture2D(tex, vUv + vec2(o.x, o.y)).rgb + texture2D(tex, vUv + vec2(-o.x, o.y)).rgb + texture2D(tex, vUv + vec2(o.x, -o.y)).rgb + texture2D(tex, vUv - o).rgb) / 6.; } gl_FragColor = vec4(c, 1.0); }", depthTest: false, depthWrite: false });
    this.copyScene = quad(this.copy);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  /** the three scene passes for the current camera: flat colour, normals + depth (+ ink level), sun mask */
  passes() {
    const r = this.renderer, M = this.meshes;
    for (const m of M) m.material = m.userData.pass[0];
    r.setRenderTarget(this.rtA); r.setClearColor(0x000000, 0); r.clear(); r.render(this.scene, this.cam);
    for (const m of M) { m.material = m.userData.pass[1]; if (m.userData.noInk) { m.userData.vis = m.visible; m.visible = false; } }
    r.setRenderTarget(this.rtN); r.setClearColor(0x8080ff, 0); r.clear(); r.render(this.scene, this.cam);
    for (const m of M) { m.material = m.userData.pass[2]; if (m.userData.noInk) m.visible = m.userData.vis; }
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(this.rtS); r.setClearColor(0xffffff, 1); r.clear(); r.render(this.scene, this.cam);
    for (const m of M) m.material = m.userData.pass[0];
  }
  /** average several renders [[ms, jx, jy], ...] into the canvas (motion blur + anti-aliasing on the GPU) */
  renderMany(list) {
    const r = this.renderer, U = this.post.uniforms, c = this.cam;
    r.setRenderTarget(this.rtAcc); r.setClearColor(0x000000, 1); r.clear();
    for (const [ms, jx = 0, jy = 0] of list) {
      this.setTime(ms); this.place(this.shotAt(ms), jx, jy); this.passes();
      U.near.value = c.near; U.far.value = c.far; U.camPos.value.copy(c.position);
      U.invVP.value.copy(c.matrixWorld).multiply(c.projectionMatrixInverse); U.camRot.value.setFromMatrix4(c.matrixWorld);
      U.wgt.value = 1 / list.length;
      r.setRenderTarget(this.rtAcc); r.autoClear = false; r.render(this.postScene, this.qcam); r.autoClear = true;
    }
    r.setRenderTarget(null); r.render(this.copyScene, this.qcam);
    this.t = list[list.length - 1][0];
  }
  render(ms) { this.renderMany([[ms, this.jit[0], this.jit[1]]]); }
  setJitter(x, y) { this.jit = [x, y]; }
  /** screen positions [x px, y px (at 1920 × 1080, centre 0), ndc z] of a grid of scene points at time ms */
  probe(ms) {
    this.place(this.shotAt(ms), 0, 0); const out = [];
    for (const p of this.probePts) { const q = p.clone().project(this.cam); out.push([q.x * 960, q.y * 540, q.z]); }
    return out;
  }
  /** how far (px at 1920) the fastest visible probe point moves between two times */
  travel(a, b) {
    const P = this.probe(a), R = this.probe(b); let m = 0;
    P.forEach((u, i) => { const v = R[i]; if (Math.abs(u[2]) < 1 && Math.abs(v[2]) < 1 && Math.abs(u[0]) < 1400 && Math.abs(v[0]) < 1400 && Math.abs(u[1]) < 900) m = Math.max(m, Math.hypot(u[0] - v[0], u[1] - v[1])); });
    return m;
  }
  /** one output frame at ms: jittered sub-renders (mink for anti-aliasing), more on fast moves (gapless 360° blur) */
  frame(ms, o = {}) {
    const fps = o.fps ?? this.fps, mink = o.mink ?? this.blur.mink, maxk = o.maxk ?? this.blur.maxk, step = o.step ?? this.blur.step;
    const dt = 1000 / fps, a = ms - dt / 2, c = ms + dt / 2, px = this.travel(a, c);
    let k = mink; while (k < maxk && px / k > step) k *= 2;
    const J = [[-0.375, -0.125], [0.125, -0.375], [0.375, 0.125], [-0.125, 0.375]], list = [];
    for (let j = 0; j < k; j++) { const jj = mink > 1 || k > 1 ? J[j % 4] : [0, 0]; list.push([k === 1 ? ms : a + ((j + 0.5) / k) * (c - a), jj[0], jj[1]]); }
    this.renderMany(list);
    return k;
  }

  // ---------- checks (check.mjs prints these) ----------
  check() {
    const out = { fail: [], warn: [], info: [] }, K = this.keyList;
    if (K.length < 2) { out.fail.push("no timeline: call F.keys([[0, 'flat'], …, [LOOP, 'flat']])"); return out; }
    const same = (a, b) => this.params.every((p) => Math.abs((a[p] ?? SHOT[p] ?? 0) - (b[p] ?? SHOT[p] ?? 0)) < 1e-6);
    if (K[0].t !== 0) out.fail.push(`the first key is at ${K[0].t} ms (must be 0)`);
    if (!same(K[0].s, K[K.length - 1].s)) out.fail.push(`the loop does not join: the first shot (${K[0].name}) ≠ the last shot (${K[K.length - 1].name})`);
    const s0 = K[0].s;
    if (s0.fov > 4 || Math.abs(s0.yaw) > 0.5 || Math.abs(s0.el) > 0.5) out.warn.push(`the loop opens on ${K[0].name} (fov ${s0.fov}°, yaw ${s0.yaw}°, el ${s0.el}°): the style opens flat, on a long lens (fov ≤ 4°), level and square on`);
    if (this.loop < 8000 || this.loop > 14000) out.warn.push(`the loop is ${(this.loop / 1000).toFixed(1)} s: ~10 s feels smooth, 7 s rushed (scale the key times with keys(list, { scale }))`);
    // the cheat: lay may only change while the view is flat
    let bad = null; for (let t = 0; t < this.loop; t += 10) { const a = this.shotAt(t), b = this.shotAt(t + 10); if (Math.abs(a.lay - b.lay) > 1e-5 && Math.max(a.fov, b.fov) > 6) { bad = { t, fov: Math.max(a.fov, b.fov) }; break; } }
    if (bad) out.fail.push(`the swap objects move at ${(bad.t / 1000).toFixed(2)} s while the lens is ${bad.fov.toFixed(1)}° wide: change lay only between flat holds (fov ≤ 6°)`);
    // corner views come as a pair: the same yaw on a long lens first, then wide
    for (let i = 1; i < K.length; i++) {
      const s = K[i].s; if (Math.abs(s.yaw) < 5 || s.fov < 15) continue;
      const prev = K.slice(0, i).reverse().find((k) => Math.abs(k.s.yaw - s.yaw) > 6 || k.s.fov <= 6);
      if (!prev || Math.abs(prev.s.yaw - s.yaw) > 6) out.warn.push(`corner view ${K[i].name} at ${(K[i].t / 1000).toFixed(2)} s opens without a telephoto start at the same yaw (pair it: fov ≈ 4 first, then wide)`);
    }
    // motion: the fastest move, freezes (a hold with no drift), swap-object count
    let fast = { px: 0, t: 0 }, still = 0, longest = { d: 0, t: 0 };
    for (let t = 0; t < this.loop; t += 1000 / 30) {
      const px = this.travel(t, t + 1000 / 30);
      if (px > fast.px) fast = { px, t };
      if (px < 0.05) { still += 1000 / 30; if (still > longest.d) longest = { d: still, t: t - still }; } else still = 0;
    }
    out.info.push(`fastest move: ${fast.px.toFixed(0)} px per frame at ${(fast.t / 1000).toFixed(2)} s (wrap moving things there)`);
    this.fastest = fast;
    if (longest.d > 700) out.warn.push(`the picture freezes for ${(longest.d / 1000).toFixed(2)} s from ${(longest.t / 1000).toFixed(2)} s: add a drift shot (W × 0.96) so the hold breathes`);
    if (this.swaps.length < 3 || this.swaps.length > 8) out.warn.push(`${this.swaps.length} swap objects (3–6 sells the trick)`);
    out.info.push(`${this.keyList.length} keys over ${(this.loop / 1000).toFixed(2)} s · ${this.swaps.length} swap objects · ${this.stats.merged} meshes merged into ${this.stats.calls} + ${this.meshes.length - this.stats.calls} kept`);
    return out;
  }

  // ---------- start: build, publish the contract, live player ----------
  start(o = {}) {
    if (!this.keyList.length) throw new Error("call F.keys([...]) before F.start()");
    this.mergeStatic();
    this.bounds = new THREE.Box3().setFromObject(this.root);
    if (this.o.bounds) this.bounds.intersect(new THREE.Box3(new THREE.Vector3(...this.o.bounds[0]), new THREE.Vector3(...this.o.bounds[1])));
    const b = this.bounds; this.probePts = [];
    for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const fy of [0, 0.2, 0.5]) for (const fz of [0.1, 0.3, 0.5, 0.7, 0.9]) this.probePts.push(new THREE.Vector3(lerp(b.min.x, b.max.x, fx), lerp(b.min.y, b.max.y, fy), lerp(b.min.z, b.max.z, fz)));
    this.initLights(); this.makePasses(); this.initRenderer();
    const w = window;
    w.film = this; w.LOOP = this.loop; w.DURATION = this.loop / 1000; w.FPS = this.fps;
    w.render = (ms) => this.render(ms); w.renderMany = (l) => this.renderMany(l); w.probe = (ms) => this.probe(ms);
    w.setJitter = (x, y) => this.setJitter(x, y); w.frame = (ms, opt) => this.frame(ms, opt); w.seek = (t) => this.frame(t * 1000);
    const live = Q.get("render") !== "1";
    document.body.style.cssText = "margin:0;background:#101018;display:grid;place-items:center;min-height:100vh;font:14px system-ui;color:#ddd";
    this.canvas.style.cssText = live ? "width:min(100vw,157vh);height:auto;display:block" : "";
    document.body.append(this.canvas);
    const t0 = Q.has("t") ? +Q.get("t") * 1000 : 0;
    if (live) { this.render(t0); this.player(); } else this.frame(t0);
    this.ready = true; w.READY = true; w.__ready = true;
  }
  player() {
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:10px;align-items:center;margin:8px 0;flex-wrap:wrap;justify-content:center";
    const btn = document.createElement("button"); btn.textContent = "▶ play";
    btn.style.cssText = "font:inherit;padding:6px 14px;border-radius:8px;border:0;background:#f2c230;color:#111;cursor:pointer";
    const pos = document.createElement("input"); pos.type = "range"; pos.min = 0; pos.max = this.loop; pos.step = 1; pos.value = 0; pos.style.width = "min(60vw,440px)";
    const lab = document.createElement("span"); lab.style.minWidth = "9em";
    bar.append(btn, pos, lab); document.body.append(bar); document.body.style.gridTemplateRows = "1fr auto";
    let playing = false, w0 = 0, t0 = 0;
    const name = (ms) => { let n = this.keyList[0].name; for (const k of this.keyList) if (k.t <= ms) n = k.name; return n; };
    const show = (ms) => { lab.textContent = `${(ms / 1000).toFixed(2)} s · ${name(ms)}`; };
    const loop = () => { if (!playing) return; const ms = (w0 + performance.now() - t0) % this.loop; this.render(ms); pos.value = ms; show(ms); requestAnimationFrame(loop); };
    const play = (on) => { playing = on; btn.textContent = on ? "❚❚ pause" : "▶ play"; if (on) { w0 = +pos.value; t0 = performance.now(); loop(); } };
    btn.onclick = () => play(!playing); this.canvas.onclick = () => play(!playing);
    pos.oninput = () => { if (playing) play(false); this.frame(+pos.value, { mink: 1, maxk: 1 }); show(+pos.value); };
    show(0);
    if (Q.get("autoplay") === "1") play(true);
  }
}
