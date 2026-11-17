// FX: stateless footfall effects + atmosphere. Every particle position is a closed-form function of
// (per-instance seed, age), with ages / foot trajectories fed per frame as uniforms from gait.js.
//  - clods      : lit low-poly mud lumps. kind 0 = ejected on touchdown, kind 1 = dropping off a lifted foot
//  - spray      : tiny alpha-tested (opaque, depth-writing) mud/water droplets, same two kinds
//  - impactSheet: alpha-hashed (depth-writing) dirty spray sheet + fast low shock ring of mist on touchdown
//  - impactMist : soft blended mist rolling outward afterwards; wetter near puddles (puddlesNear from env.js)
//  - wisps      : slow drifting low mist sprites, world-stable, very subtle
//  - drizzle    : faint falling streaks around the camera catching light
//  - birds      : a tiny far flock (opaque, fogged by post)
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

export async function create(ctx) {
  const { THREE, scene, gait, LOOK, rng, CFG } = ctx;
  const puddlesNear = (x, z, r, out) => (ctx.puddlesNear ? ctx.puddlesNear(x, z, r, out) : (out.length = 0, out));   // from the ground module, if any
  const FR = CFG.FOOT_R.toFixed(3), CR = CFG.CLAW_R.toFixed(3), KS = CFG.LEG_SCALE.toFixed(3);
  const { GAIT, NLEGS } = gait;
  const T = GAIT.T, SWING = (1 - GAIT.duty) * T;
  const NS = 8, DS = 0.2; // foot trajectory samples after lift-off

  const uTime = { value: 0 };
  const uPlant = { value: Array.from({ length: NLEGS }, () => new THREE.Vector4(0, 0, 99, 0)) };
  const uLiftAge = { value: new Array(NLEGS).fill(99) };
  const uFoot = { value: Array.from({ length: NLEGS * NS }, () => new THREE.Vector3()) };
  const uCam = { value: new THREE.Vector3() };
  const uWet = { value: new Array(NLEGS).fill(0.25) };   // how watery the ground is where each foot last planted
  const uJit = { value: new THREE.Vector2() };
  const uCtr = { value: new THREE.Vector2() };
  const uFog = { value: LOOK.fogColor };
  const amb = LOOK.hemiSky.clone().multiplyScalar(LOOK.hemiIntensity * 0.55);
  const uAmb = { value: amb };

  const DYN = /* glsl */`
uniform vec4 uPlant[${NLEGS}];      // plant x, z, age since touchdown
uniform float uLiftAge[${NLEGS}];   // seconds since last lift-off
uniform vec3 uFoot[${NLEGS * NS}];  // sole centre at liftoff + k*${DS}
uniform float uTime; uniform vec3 uCam; uniform float uWet[${NLEGS}];
const float G = 9.81;
vec3 footAt(int leg, float td, out vec3 vel){
  float f = clamp(td / ${DS.toFixed(2)}, 0.0, ${(NS - 1.001).toFixed(3)});
  int k = int(floor(f));
  vec3 a = uFoot[leg * ${NS} + k], b = uFoot[leg * ${NS} + k + 1];
  vel = (b - a) / ${DS.toFixed(2)};
  return mix(a, b, fract(f));
}
// r: 4 uniform randoms. Returns world position; scale (0 = hidden); vel; age since emission
vec3 particle(int leg, float kind, vec4 r, float speedMul, out float scale, out vec3 vel, out float age){
  scale = 1.0;
  vec3 p0, v0;
  if (kind < 0.5) {
    // touchdown burst from the rim of the sole
    vec4 pl = uPlant[leg];
    age = pl.z - r.w * 0.06;
    float ang = r.x * 6.28318;
    vec2 dir = vec2(cos(ang), sin(ang));
    float rad = ${FR} + 0.6 * ${KS} * r.y;
    // a third of the debris squirts out at the claw tips
    if (r.w > 0.66) { float kk = floor(r.x * 4.0); vec2 cd = kk < 1.0 ? vec2(0.0, 1.0) : kk < 2.0 ? vec2(0.891, 0.454) : kk < 3.0 ? vec2(-0.891, 0.454) : vec2(0.0, -1.0);
      cd.y *= sign(pl.y); dir = normalize(cd + (vec2(r.y, r.z) - 0.5) * 0.6); rad = ${CR} + 0.4 * ${KS} * r.y; }
    p0 = vec3(pl.x + dir.x * rad, 0.1 + 0.3 * r.z, pl.y + dir.y * rad);
    float wk = 1.0 + 0.35 * uWet[leg];
    float up = mix(1.6, 10.5, r.z * r.z * r.z) * speedMul * wk;
    float out_ = mix(2.5, 10.5, r.y) * speedMul * wk;
    v0 = vec3(dir.x * out_, up, dir.y * out_);
  } else {
    // dirt / clods dropping off a lifted foot
    float td = 1.3 * r.w * r.w;
    vec3 fv;
    vec3 fp = footAt(leg, td, fv);
    age = uLiftAge[leg] - td;
    float ang = r.x * 6.28318, rad = 3.2 * ${KS} * sqrt(r.y);
    p0 = fp + vec3(cos(ang) * rad * 1.1, -0.05 - 0.2 * r.z, sin(ang) * rad * 0.85);
    v0 = fv * 0.55 + vec3(cos(ang), -0.5, sin(ang)) * (0.4 + 0.8 * r.z) * speedMul;
  }
  if (age < 0.0) { scale = 0.0; vel = vec3(0.0); return p0; }
  // air drag on horizontal motion
  float k = 1.2;
  float e = (1.0 - exp(-k * age)) / k;
  float tl = (v0.y + sqrt(max(v0.y * v0.y + 2.0 * G * p0.y, 0.0))) / G;   // landing time
  float ta = min(age, tl);
  float ea = (1.0 - exp(-k * ta)) / k;
  vec3 p = vec3(p0.x + v0.x * ea, p0.y + v0.y * ta - 0.5 * G * ta * ta, p0.z + v0.z * ea);
  vel = vec3(v0.x * exp(-k * ta), v0.y - G * ta, v0.z * exp(-k * ta));
  if (age > tl) { p.y = -0.02; vel = vec3(0.0); scale *= 1.0 - smoothstep(0.3, 2.2, age - tl); }
  scale *= 1.0 - smoothstep(3.6, 4.2, age);
  scale *= smoothstep(1.6, 3.6, distance(p, uCam));   // keep debris out of the lens
  return p;
}
mat3 rotAxis(vec3 a, float ang){
  float s = sin(ang), c = cos(ang), oc = 1.0 - c;
  return mat3(oc*a.x*a.x + c, oc*a.x*a.y + a.z*s, oc*a.z*a.x - a.y*s,
              oc*a.x*a.y - a.z*s, oc*a.y*a.y + c, oc*a.y*a.z + a.x*s,
              oc*a.z*a.x + a.y*s, oc*a.y*a.z - a.x*s, oc*a.z*a.z + c);
}
`;

  // per-instance seeds: leg, kind, 4 randoms
  function seedGeo(base, nPerLegKind) {
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = base.index;
    for (const k in base.attributes) ig.setAttribute(k, base.attributes[k]);
    const counts = nPerLegKind; // [kind0, kind1]
    const n = NLEGS * (counts[0] + counts[1]);
    const leg = new Float32Array(n), kind = new Float32Array(n), rnd = new Float32Array(n * 4);
    const r = rng(base.uuid.length * 31 + counts[0] * 7 + counts[1]);
    let j = 0;
    for (let l = 0; l < NLEGS; l++) for (let kd = 0; kd < 2; kd++) for (let c = 0; c < counts[kd]; c++) {
      leg[j] = l; kind[j] = kd;
      for (let q = 0; q < 4; q++) rnd[j * 4 + q] = r();
      j++;
    }
    ig.setAttribute('aLeg', new THREE.InstancedBufferAttribute(leg, 1));
    ig.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));
    ig.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    ig.instanceCount = n;
    return ig;
  }
  const commonU = { uTime, uPlant, uLiftAge, uFoot, uCam, uWet };
  const meshes = [];
  const addMesh = (m, name) => { m.frustumCulled = false; m.name = 'fx-' + name; scene.add(m); meshes.push(m); return m; };

  // ---------------------------------------------------------------- clods (lit)
  {
    let base = new THREE.IcosahedronGeometry(1, 0);
    base.deleteAttribute('uv'); base.deleteAttribute('normal');
    base = BGU.mergeVertices(base);
    const p = base.getAttribute('position'), r = rng(12);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.7 + 0.6 * r()), p.getY(i) * (0.35 + 0.4 * r()), p.getZ(i) * (0.7 + 0.6 * r()));
    base.computeVertexNormals();
    const geo = seedGeo(base, [190, 60]);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.42, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, commonU);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute float aLeg, aKind; attribute vec4 aRnd;
${DYN}
vec3 cPos; mat3 cRot; float cScale; varying vec3 vTint;`)
        .replace('#include <beginnormal_vertex>', `
{
  float sc; vec3 vel; float age;
  // mostly crumbs, a few fist-to-head sized lumps; the heavy ones are the slow, low ones
  float big = aKind < 0.5 ? pow((1.0 - aRnd.y) * (1.0 - aRnd.z * aRnd.z), 2.5) : pow(aRnd.z * aRnd.x, 2.0);
  cPos = particle(int(aLeg), aKind, aRnd, 1.05 - 0.3 * big, sc, vel, age);
  float size = mix(0.018, 0.13, big) * (0.7 + 0.6 * fract(aRnd.w * 13.7));
  // wet earth, clay, and torn sod carrying grass
  float tq = fract(aRnd.x * 29.3);
  vTint = tq < 0.55 ? mix(vec3(0.55, 0.47, 0.40), vec3(0.95, 0.82, 0.68), fract(aRnd.y * 17.0)) : tq < 0.8 ? vec3(1.1, 1.0, 0.9) : vec3(0.55, 0.78, 0.36);
  cScale = size * sc;
  vec3 ax = normalize(vec3(aRnd.y - 0.5, aRnd.z - 0.5, aRnd.x - 0.5) + 1e-3);
  cRot = rotAxis(ax, age * (3.0 + 6.0 * aRnd.w) * step(0.0, vel.y * vel.y - 1e-4) + aRnd.x * 6.0);
}
vec3 objectNormal = cRot * normal;`)
        .replace('#include <begin_vertex>', `vec3 transformed = cPos + cRot * position * cScale;
if (cScale < 1e-4) transformed = vec3(0.0, -60.0, 0.0);`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vTint;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= vTint;`);
    };
    const m = addMesh(new THREE.Mesh(geo, mat), 'clods');
    m.castShadow = false; m.receiveShadow = true;
  }

  // ---------------------------------------------------------------- spray (opaque alpha-tested droplets / mud flecks)
  {
    const base = new THREE.PlaneGeometry(1, 1);
    base.deleteAttribute('normal');
    const geo = seedGeo(base, [900, 260]);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...commonU, uAmb, uFog, uJit },
      vertexShader: `
attribute float aLeg, aKind; attribute vec4 aRnd;
${DYN}
varying vec2 vUv; varying float vWet; varying float vKeep;
void main(){
  float sc; vec3 vel; float age;
  int leg = int(aLeg);
  vec3 p = particle(leg, aKind, aRnd, 1.3, sc, vel, age);
  float size = mix(0.012, 0.055, aRnd.z * aRnd.z) * sc;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  // never thinner than ~1 px (thin out by hashing instead), motion streak along view-space velocity
  float pxs = -mv.z * 0.0011;
  float s2 = max(size, pxs);
  vKeep = size * size / (s2 * s2);
  vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
  vec2 sv = vv.xy; float sl = length(sv);
  vec2 ax = sl > 1e-3 ? sv / sl : vec2(0.0, 1.0);
  vec2 corner = position.xy;
  vec2 off = ax * corner.y * (s2 + sl * 0.016) + vec2(-ax.y, ax.x) * corner.x * s2;
  mv.xy += off;
  // water share grows with how wet the ground is where the foot landed (kind 1 = run-off from the lifted foot)
  float wet = aKind < 0.5 ? uWet[leg] : 0.75;
  vUv = position.xy + 0.5; vWet = step(1.0 - wet, fract(aRnd.x * 7.31));
  gl_Position = projectionMatrix * mv;
  if (size < 1e-4) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
      fragmentShader: `
uniform vec3 uAmb, uFog; uniform vec2 uJit;
varying vec2 vUv; varying float vWet; varying float vKeep;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 q = vUv - 0.5;
  if (dot(q, q) > 0.25) discard;
  if (vKeep < 0.999 && h12(gl_FragCoord.xy + uJit) > vKeep) discard;
  vec3 mud = vec3(0.060, 0.050, 0.040) * uAmb;
  // water drops: neutral grey, lit by the sky (no blue cast)
  vec3 drop = vec3(dot(uFog, vec3(0.3, 0.5, 0.2))) * 1.25 + vec3(0.02, 0.012, 0.004);
  gl_FragColor = vec4(mix(mud, drop, vWet), 1.0);
}`,
    });
    const m = addMesh(new THREE.Mesh(geo, mat), 'spray');
    m.userData.noReflect = true;
  }

  // ---------------------------------------------------------------- impact: spray sheet + shock ring (hashed) and rolling mist (blended)
  // The post fog replaces pixels without depth by sky, so blended sprites only show over geometry (that made
  // wet metal look "painted"). The fast, dense parts are therefore alpha-HASHED and write depth: they are
  // visible against the sky too, get fogged by distance, and the per-pixel hash reads as droplets.
  {
    const base = new THREE.PlaneGeometry(1, 1);
    const mk = (PER, seed, hashed) => {
      const ig = new THREE.InstancedBufferGeometry();
      ig.index = base.index; ig.setAttribute('position', base.getAttribute('position'));
      const n = NLEGS * PER, leg = new Float32Array(n), rnd = new Float32Array(n * 4), r = rng(seed);
      for (let i = 0; i < n; i++) { leg[i] = Math.floor(i / PER); for (let q = 0; q < 4; q++) rnd[i * 4 + q] = r(); }
      ig.setAttribute('aLeg', new THREE.InstancedBufferAttribute(leg, 1));
      ig.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
      ig.instanceCount = n;
      const mat = new THREE.ShaderMaterial({
        defines: hashed ? { HASHED: 1 } : {},
        uniforms: { uTime, uPlant, uFog, uCam, uWet, uJit },
        transparent: !hashed, depthWrite: hashed,
        vertexShader: `
uniform vec4 uPlant[${NLEGS}]; uniform float uWet[${NLEGS}]; uniform float uTime; uniform vec3 uCam;
attribute float aLeg; attribute vec4 aRnd;
varying vec2 vUv; varying float vA; varying float vY; varying vec4 vR; varying float vDark;
void main(){
  int leg = int(aLeg);
  vec4 pl = uPlant[leg];
  float a = pl.z, wet = uWet[leg];
  float ang = aRnd.x * 6.28318;
  vec2 dir = vec2(cos(ang), sin(ang));
  vec3 c; float w, h;
#ifdef HASHED
  if (aRnd.w < 0.42) {
    // fast, low shock ring of mist racing outward along the ground
    float R = 3.6 + (13.0 + 7.0 * aRnd.y) * (1.0 - exp(-a * 2.4));
    c = vec3(pl.x + dir.x * R * 1.08, 0.35 + 0.35 * aRnd.z + 0.25 * a, pl.y + dir.y * R * 0.92);
    w = 2.6 + 3.2 * a; h = 0.75 + 0.7 * a;
    vA = smoothstep(0.0, 0.07, a) * (1.0 - smoothstep(0.2, 1.1, a)) * (0.4 + 0.3 * aRnd.z);
    vDark = 0.3;
  } else {
    // dirty spray sheet thrown up around the pad: rises fast, hangs, rains back down
    float v0 = (2.6 + 5.0 * aRnd.z * aRnd.z) * (1.0 + 0.45 * wet);
    float t1 = max(a - 0.05 * aRnd.y, 0.0);
    float up = v0 * (1.0 - exp(-t1 * 2.6)) / 2.6 - 1.1 * t1 * t1 * 0.5;
    float R = 3.3 + 0.7 * aRnd.y + (1.5 + 3.5 * aRnd.y) * (1.0 - exp(-t1 * 1.8));
    c = vec3(pl.x + dir.x * R * 1.08, 0.3 + max(up, 0.0), pl.y + dir.y * R * 0.92);
    w = 1.2 + 1.6 * t1 + 0.8 * aRnd.w; h = 0.9 + 1.2 * t1 + 0.7 * aRnd.z;
    vA = smoothstep(0.0, 0.06, a) * (1.0 - smoothstep(0.3, 1.35, a)) * (0.5 + 0.35 * aRnd.y) * (1.0 + 0.4 * wet);
    vDark = 0.8 * (1.0 - 0.5 * wet) * exp(-a * 0.9);     // muddy at first, clearing to mist
  }
#else
  // slow rolling mist left behind by the impact (blended, only reads over the ground and the legs)
  float R = 4.0 + (6.0 + 6.0 * aRnd.y) * (1.0 - exp(-a * 0.9));
  c = vec3(pl.x + dir.x * R * 1.08, 0.5 + 0.7 * aRnd.z + a * 0.22, pl.y + dir.y * R * 0.92);
  w = (3.2 + 2.6 * aRnd.w) * (0.9 + a * 0.45); h = w * 0.42;
  vA = smoothstep(0.1, 0.8, a) * (1.0 - smoothstep(1.6, 4.8, a)) * (0.45 + 0.55 * aRnd.z) * 0.5;
  vDark = 0.0;
#endif
  vec3 toCam = uCam - c;
  vA *= smoothstep(3.0, 8.0, length(toCam));
  vA *= 1.0 - 0.6 * smoothstep(0.08, 0.3, toCam.y / length(toCam));   // never foam discs from above
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 p = c + right * position.x * w + vec3(0.0, 1.0, 0.0) * position.y * h;
  vUv = position.xy + 0.5; vY = p.y; vR = aRnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  if (vA < 1e-3) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
}`,
        fragmentShader: `
uniform vec3 uFog; uniform vec2 uJit;
varying vec2 vUv; varying float vA; varying float vY; varying vec4 vR; varying float vDark;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(h12(i), h12(i + vec2(1,0)), f.x), mix(h12(i + vec2(0,1)), h12(i + vec2(1,1)), f.x), f.y); }
void main(){
  vec2 q = vUv - 0.5;
  float d = length(q) * 2.0;
  float n = vn(vUv * vec2(4.0, 1.6) + vR.xy * 20.0) * 0.6 + vn(vUv * vec2(9.0, 3.5) + vR.zw * 20.0) * 0.4;
  float a = smoothstep(1.0, 0.15, d) * smoothstep(0.22, 0.72, n) * vA * smoothstep(0.0, 0.5, vY);
  // neutral grey mist (a blue tint made wet metal behind it look painted blue), slightly muddy when fresh
  float fl = dot(uFog, vec3(0.3, 0.5, 0.2));
  vec3 col = mix(uFog, vec3(fl), 0.8) * 1.12 + vec3(0.012);
  col = mix(col, vec3(0.062, 0.054, 0.046), vDark * (0.6 + 0.4 * n));
#ifdef HASHED
  // steep alpha: mostly solid sheets with a droplet fringe instead of sparse static
  if (smoothstep(0.05, 0.5, a) * 0.72 <= h12(gl_FragCoord.xy + uJit)) discard;
  gl_FragColor = vec4(col * (0.72 + 0.3 * n), 1.0);
#else
  gl_FragColor = vec4(col, a);
#endif
}`,
      });
      return new THREE.Mesh(ig, mat);
    };
    const sheet = addMesh(mk(70, 91, true), 'impactSheet'); sheet.userData.noReflect = true;
    const roll = addMesh(mk(30, 92, false), 'impactMist'); roll.renderOrder = 2; roll.userData.noReflect = true;
  }

  // ---------------------------------------------------------------- drifting low mist wisps (world-stable drift)
  const WS = 180;
  {
    const N = 46, base = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = base.index; ig.setAttribute('position', base.getAttribute('position'));
    const off = new Float32Array(N * 4), r = rng(303);
    for (let i = 0; i < N; i++) { off[i * 4] = r() * WS; off[i * 4 + 1] = r() * WS; off[i * 4 + 2] = r(); off[i * 4 + 3] = r(); }
    ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    ig.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uFog, uCam, uCtr },
      transparent: true, depthWrite: false,
      vertexShader: `
uniform float uTime; uniform vec3 uCam; uniform vec2 uCtr;
attribute vec4 aOff;
varying vec2 vUv; varying float vA; varying vec3 vWP; varying vec2 vR;
void main(){
  vec2 drift = vec2(0.55, 0.18) * uTime;
  vec2 rel = mod(aOff.xy + drift - uCtr + ${WS / 2}.0, ${WS}.0) - ${WS / 2}.0;
  vec2 xz = uCtr + rel;
  float edge = 1.0 - smoothstep(${(WS * 0.36).toFixed(1)}, ${(WS * 0.49).toFixed(1)}, max(abs(rel.x), abs(rel.y)));
  vec3 c = vec3(xz.x, 0.6 + 1.6 * aOff.z, xz.y);
  vec3 toCam = uCam - c;
  float dist = length(toCam);
  float w = 9.0 + 12.0 * aOff.w, h = 2.0 + 2.5 * aOff.z;
  vA = edge * smoothstep(5.0, 18.0, dist) * (0.4 + 0.6 * aOff.w);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 p = c + right * position.x * w + vec3(0.0, position.y * h, 0.0);
  vUv = position.xy + 0.5; vWP = p; vR = aOff.zw;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
      fragmentShader: `
uniform vec3 uFog; uniform float uTime;
varying vec2 vUv; varying float vA; varying vec3 vWP; varying vec2 vR;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(h12(i), h12(i + vec2(1,0)), f.x), mix(h12(i + vec2(0,1)), h12(i + vec2(1,1)), f.x), f.y); }
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float env = smoothstep(1.0, 0.1, length(q * vec2(1.0, 1.15)));
  vec2 np = vUv * vec2(4.0, 1.6) + vR * 40.0 + vec2(uTime * 0.03, 0.0);
  float n = vn(np) * 0.55 + vn(np * 2.1 + 3.0) * 0.3 + vn(np * 4.3 + 9.0) * 0.15;
  float a = env * smoothstep(0.35, 0.8, n) * vA * smoothstep(0.0, 0.8, vWP.y);
  gl_FragColor = vec4(uFog * 1.6, a * 0.11);
}`,
    });
    const m = addMesh(new THREE.Mesh(ig, mat), 'wisps');
    m.renderOrder = 1; m.userData.noReflect = true;
  }

  // ---------------------------------------------------------------- drizzle streaks / motes around the camera
  const DS2 = 26;
  {
    const N = 1400, base = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = base.index; ig.setAttribute('position', base.getAttribute('position'));
    const off = new Float32Array(N * 4), r = rng(505);
    for (let i = 0; i < N; i++) { off[i * 4] = r() * DS2; off[i * 4 + 1] = r() * 14; off[i * 4 + 2] = r() * DS2; off[i * 4 + 3] = r(); }
    ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    ig.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime, uCam, uCtr },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
uniform float uTime; uniform vec3 uCam; uniform vec2 uCtr;
attribute vec4 aOff;
varying float vA; varying vec2 vUv;
void main(){
  bool mote = aOff.w < 0.25;
  vec3 vel = mote ? vec3(0.25, -0.12 + 0.1 * sin(uTime * 0.7 + aOff.w * 30.0), 0.1) : vec3(0.6, -3.2 - 1.5 * aOff.w, 0.25);
  vec3 p = aOff.xyz + vel * uTime;
  vec3 c = vec3(uCtr.x, uCam.y - 3.0, uCtr.y);
  vec3 rel = mod(p - c + vec3(${DS2 / 2}.0, 7.0, ${DS2 / 2}.0), vec3(${DS2}.0, 14.0, ${DS2}.0)) - vec3(${DS2 / 2}.0, 7.0, ${DS2 / 2}.0);
  vec3 wp = c + rel;
  vec3 toCam = uCam - wp; float dist = length(toCam);
  float edge = 1.0 - smoothstep(${(DS2 * 0.36).toFixed(1)}, ${(DS2 * 0.49).toFixed(1)}, max(abs(rel.x), abs(rel.z)));
  edge *= 1.0 - smoothstep(5.0, 7.0, abs(rel.y));
  vA = edge * smoothstep(1.0, 3.0, dist) * (1.0 - smoothstep(10.0, 13.0, dist)) * step(0.0, wp.y);
  vec3 dir = normalize(vel);
  vec3 side = normalize(cross(dir, toCam));
  float len = mote ? 0.012 : 0.22, wid = mote ? 0.012 : 0.0045;
  vec3 pp = wp + dir * position.y * len + side * position.x * wid;
  vUv = position.xy + 0.5;
  vA *= mote ? 1.6 : 1.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(pp, 1.0);
}`,
      fragmentShader: `
varying float vA; varying vec2 vUv;
void main(){
  float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159) * vA;
  gl_FragColor = vec4(vec3(0.10, 0.12, 0.17) * a, 1.0);
}`,
    });
    const m = addMesh(new THREE.Mesh(ig, mat), 'drizzle');
    m.renderOrder = 3; m.userData.noReflect = true;
  }

  // ---------------------------------------------------------------- far birds
  {
    // body + two wings, the wing tips flap in the shader (position.z marks tip vertices)
    const P = [0, 0, 0.35, 0, 0, -0.3, -1, 0, 0, 0, 0, 0.35, 0, 0, -0.3, 1, 0, 0];
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const N = 14, ig = new THREE.InstancedBufferGeometry();
    ig.setAttribute('position', base.getAttribute('position'));
    const off = new Float32Array(N * 4), r = rng(808);
    for (let i = 0; i < N; i++) { off[i * 4] = (r() - 0.5) * 30; off[i * 4 + 1] = (r() - 0.5) * 8; off[i * 4 + 2] = (r() - 0.5) * 30; off[i * 4 + 3] = r(); }
    ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    ig.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime }, side: THREE.DoubleSide,
      vertexShader: `
uniform float uTime; attribute vec4 aOff;
void main(){
  float w = uTime * 0.075;
  vec3 ctr = vec3(160.0 + 150.0 * cos(w), 58.0, -260.0 + 90.0 * sin(w));
  vec3 fwd = normalize(vec3(-sin(w), 0.0, cos(w) * 0.6));
  vec3 rt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  float flap = sin(uTime * (8.0 + 3.0 * aOff.w) + aOff.w * 40.0);
  vec3 lp = position * 0.55;
  lp.y += abs(position.x) * flap * 0.45;
  vec3 wp = ctr + aOff.xyz + aOff.xyz * 0.15 * sin(uTime * 0.3 + aOff.w * 9.0) + rt * lp.x + vec3(0.0, lp.y, 0.0) + fwd * lp.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`,
      fragmentShader: `void main(){ gl_FragColor = vec4(0.012, 0.014, 0.02, 1.0); }`,
    });
    addMesh(new THREE.Mesh(ig, mat), 'birds');
  }

  // ---------------------------------------------------------------- update
  const fs = {}, fs2 = {}, pud = [];
  return {
    update(t, f) {
      const cam = f.camera;
      uTime.value = t;
      uCam.value.copy(cam.position);
      const fx = -cam.matrixWorld.elements[8], fz = -cam.matrixWorld.elements[10], fl = Math.hypot(fx, fz) || 1;
      uCtr.value.set(cam.position.x + fx / fl * 6, cam.position.z + fz / fl * 6);
      uJit.value.set(((t * 61.7) % 1) * 113.0, ((t * 37.3) % 1) * 71.0);
      for (let i = 0; i < NLEGS; i++) {
        gait.footState(i, t, fs);
        uPlant.value[i].set(fs.plantX, fs.z, fs.plantAge, 0);
        // the whole field is wet; landing in or beside a puddle makes a real splash
        let wet = 0.25;
        puddlesNear(fs.plantX, fs.z, 16, pud);
        for (const pd of pud) {
          const a = pd.r / 1.5, d = Math.hypot(pd.x - fs.plantX, pd.z - fs.z);
          const k = Math.min(1, Math.max(0, (d - a * 0.8) / (a * 0.5 + 8)));
          wet = Math.max(wet, 1 - k * k * (3 - 2 * k));
        }
        uWet.value[i] = wet;
        const ageL = fs.swing > 0 ? fs.liftAge : fs.plantAge + SWING;
        uLiftAge.value[i] = ageL;
        const tl = t - ageL;
        for (let k = 0; k < NS; k++) {
          gait.footState(i, tl + k * DS + 1e-4, fs2);
          uFoot.value[i * NS + k].set(fs2.x, Math.max(0.05, fs2.y - ctx.CFG.ANKLE_H + 0.1), fs2.z);
        }
      }
    },
  };
}
