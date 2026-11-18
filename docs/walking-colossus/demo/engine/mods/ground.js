// Ground (engine module, from the source film's env.js): a wet field. World-space ground shader (soil / matted grass / mud / ruts / puddles /
// footprints), camera-following world-stable instanced vegetation, a single planar mirror pass for the
// puddles, and sparse distant silhouettes (trees, shrubs, utility poles) swallowed by fog.
//
// Puddle placement rule (world space, shared by JS + GLSL, see puddlesNear()):
//   cells of PUD_CELL m; cell (i,j) has a puddle if u0 < PUD_P (u* = pcg hash floats of the cell);
//   centre = ((i + .15 + .7 u1), (j + .15 + .7 u2)) * PUD_CELL; semi-axes a = 1.4 + 3.4 u3, b = a(.45 + .4 u4);
//   rotation u5*PI; plus the HERO puddles listed below (world coordinates).
// Round 2: rule unchanged; only HERO[3] (f_puddle) moved/enlarged to (132.6, 36.8, a 6.0, b 4.3, rot 0.985).
// Field-road ruts (water-filled, world-stable): z = 35 + 2.5 sin(.021x) + 1.2 sin(.067x+1) and z = -35 + ... (see rutMask).
// Every number that makes it THIS ground comes from colossus.js `GROUND` (see references/MODULES.md):
//   puddle {cell, p}, hero [[x,z,a,b,rot] x<=4], mud (0..1 bare-mud share), ruts {z} | null, tint / grassMul / soilMul /
//   vegTint [r,g,b], veg {grassNear, grassMid, grassTall, weeds, umbels, stalksFar, reeds, stones: density x},
//   far {trees, shrubs, poles}, fences [[x0,z0,x1,z1,step,gap]], bushes, debris, keepClear [[x,z,r]], glow [r,g,b],
//   dressing(kit) — hand-placed props for the shots.
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { SKY_GLSL } from '../look.js';

let PUD_CELL = 22, PUD_P = 0.30;
// hero puddles [x, z, a, b, rot]: world space, placed in front of the shots that look at water
let HERO = [];
const NOHERO = [1e5, 1e5, 0.1, 0.1, 0];
const NPRINT_NEAR = 16, PRINTS_PER_LEG = 6;   // footprints kept per leg; the nearest 16 press the grass

// ---------------------------------------------------------------- hashing (JS mirror of GLSL)
function pcg(v) {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}
const u2f = (h) => (h >>> 8) / 16777216;
const cellHash = (i, j) => pcg(((i + 32768) >>> 0) + pcg((j + 32768) >>> 0) >>> 0);

export function puddlesNear(cx, cz, R, out = []) {
  out.length = 0;
  const i0 = Math.floor((cx - R) / PUD_CELL), i1 = Math.floor((cx + R) / PUD_CELL);
  const j0 = Math.floor((cz - R) / PUD_CELL), j1 = Math.floor((cz + R) / PUD_CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    let h = cellHash(i, j);
    if (u2f(h) >= PUD_P) continue;
    h = pcg(h); const u1 = u2f(h); h = pcg(h); const u2 = u2f(h); h = pcg(h); const u3 = u2f(h);
    const a = 1.4 + 3.4 * u3;
    out.push({ x: (i + 0.15 + 0.7 * u1) * PUD_CELL, z: (j + 0.15 + 0.7 * u2) * PUD_CELL, r: a * 1.5 });
  }
  for (const p of HERO) out.push({ x: p[0], z: p[1], r: p[2] * 1.5 });
  return out;
}

// ---------------------------------------------------------------- shared GLSL
const COMMON = /* glsl */`
float sq(float x){ return x * x; }
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
uint cellHash(ivec2 c){ return pcg(uint(c.x + 32768) + pcg(uint(c.y + 32768))); }
float u2f(uint h){ return float(h >> 8u) * (1.0 / 16777216.0); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 noised(vec2 x){
  vec2 i = floor(x), f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y,
              du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
float vnoise(vec2 x){ return noised(x).x; }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; } return s / 0.9375; }
float fbm2(vec2 p){ return (vnoise(p) * 0.6 + vnoise(p * 2.03 + 5.2) * 0.4); }

uniform vec4 uHero[4];   // x z a b
uniform float uHeroRot[4];
float ellipseD(vec2 p, vec2 c, float a, float b, float r){
  vec2 q = p - c; float cs = cos(r), sn = sin(r);
  vec2 l = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
  return length(l / vec2(a, b));
}
// normalized puddle distance: < 1 water, ~1..1.5 muddy rim
float puddleField(vec2 p){
  float d = 9.0;
  vec2 cf = floor(p / ${PUD_CELL.toFixed(1)});
  for (int k = 0; k < 9; k++){
    vec2 c = cf + vec2(float(k - (k / 3) * 3) - 1.0, float(k / 3) - 1.0);
    uint h = cellHash(ivec2(c));
    float u0 = u2f(h);
    h = pcg(h); float u1 = u2f(h); h = pcg(h); float u2 = u2f(h); h = pcg(h); float u3 = u2f(h);
    h = pcg(h); float u4 = u2f(h); h = pcg(h); float u5 = u2f(h);
    float a = 1.4 + 3.4 * u3;
    vec2 ctr = (c + vec2(0.15) + 0.7 * vec2(u1, u2)) * ${PUD_CELL.toFixed(1)};
    d = min(d, u0 < ${PUD_P} ? ellipseD(p, ctr, a, a * (0.45 + 0.4 * u4), u5 * 3.14159) : 9.0);
  }
  for (int k = 0; k < 4; k++) d = min(d, ellipseD(p, uHero[k].xy, uHero[k].z, uHero[k].w, uHeroRot[k]));
  return d + ((fbm2(p * 0.32) - 0.5) * 0.55 + (vnoise(p * 1.9) - 0.5) * 0.16) * step(d, 2.2);
}
// tyre ruts: field road = two wobbly parallel tracks, one each side of the walker's path (world-stable)
float rutMask(vec2 p){
#if RUTS == 0
  return 0.0;
#endif
  float zc = p.y > 0.0 ? RUT_Z + 2.5 * sin(p.x * 0.021) + 1.2 * sin(p.x * 0.067 + 1.0)
                       : -RUT_Z + 2.5 * sin(p.x * 0.017 + 1.3) + 1.0 * sin(p.x * 0.061);
  float dz = abs(p.y - zc);
  if (dz > 1.6) return 0.0;
  float r = smoothstep(0.36, 0.12, abs(dz - 0.85));
  return r * smoothstep(0.2, 0.5, vnoise(p * vec2(0.05, 0.3) + 4.0));
}
// tussocks: x = strength 0..1 (peak at the clump centre), yz = outward direction * strength
vec3 tussock(vec2 p){
  const float C = 0.9;
  vec2 c = floor(p / C);
  uint h = cellHash(ivec2(c) + 911);
  float u0 = u2f(h); h = pcg(h); float u1 = u2f(h); h = pcg(h); float u2 = u2f(h); h = pcg(h); float u3 = u2f(h);
  if (u0 > 0.62) return vec3(0.0);
  vec2 q = p - (c + 0.3 + 0.4 * vec2(u1, u2)) * C;
  float l = length(q);
  float k = smoothstep(1.0, 0.2, l / (C * (0.24 + 0.2 * u3)));
  return vec3(k * (0.45 + 0.55 * u3), q / max(l, 1e-3) * k);
}
float mudMask(vec2 p){
  return smoothstep(MUD_LO, MUD_LO + 0.10, fbm2(p * 0.09 + 17.0) + (vnoise(p * 0.7) - 0.5) * 0.18);
}
`;

// fake reflection of the lit facade (analytic glowing rectangle) for wet ground / dew glints
const FACADE = /* glsl */`
uniform vec3 uWalker; uniform float uFacZ;
// soft sky occlusion under the walker's belly (the block hides a big part of the sky dome)
float skyOcc(vec3 P){
  vec2 d = abs(P.xz - uWalker.xz);
  float o = smoothstep(BODY_L2 + 16.0, BODY_L2 - 10.0, d.x) * smoothstep(BODY_D2 + 16.5, 3.0, d.y);
  return 1.0 - 0.55 * o * o;
}
vec3 facadeGlow(vec3 P, vec3 R, float blur){
  float zf = uWalker.z + uFacZ * BODY_D2;
  float s = (zf - P.z) / (abs(R.z) < 1e-4 ? 1e-4 : R.z);
  if (s <= 0.0 || R.y <= 0.0) return vec3(0.0);
  vec3 H = P + R * s;
  float bl = 0.6 + blur * s;
  float lx = H.x - uWalker.x, ly = H.y - uWalker.y;
  float mx = smoothstep(-BODY_L2 - bl, -BODY_L2 + bl, lx) * smoothstep(BODY_L2 + bl, BODY_L2 - bl, lx);
  float my = smoothstep(-0.5 - bl, 1.0 + bl, ly) * smoothstep(BODY_H + bl, BODY_H - 2.0 - bl, ly);
  float belly = smoothstep(-4.5 - bl, -3.5 + bl, ly) * smoothstep(0.5 + bl, -0.5 - bl, ly) * 0.5;
  // floors: brighter bands at window height, blurred out with roughness
  float rows = mix(0.55 + 0.45 * sin(ly * 2.094 - 1.2), 0.55, smoothstep(0.5, 3.0, bl));
  float cols = mix(0.5 + 0.5 * step(0.45, fract(lx * 0.22 + floor(ly / 3.0) * 0.37)), 0.5, smoothstep(0.3, 2.0, bl));
  return FACADE_GLOW * (mx * (my * rows * cols * 1.4 + belly)) * exp(-s * 0.004);
}
`;

export async function create(ctx) {
  const { THREE, scene, gait, LOOK, rng, CFG } = ctx;
  const GO = ctx.ground || {};
  const v3 = (a, d) => { const c = a || d; return `vec3(${c.map((x) => (+x).toFixed(4)).join(', ')})`; };
  PUD_CELL = GO.puddle?.cell ?? 22; PUD_P = GO.puddle?.p ?? 0.30;
  HERO = (GO.hero || []).slice(0, 4);
  ctx.puddlesNear = puddlesNear;
  const HERO4 = [...HERO, NOHERO, NOHERO, NOHERO, NOHERO].slice(0, 4);
  const KS = CFG.LEG_SCALE || 1;
  const DEFS = `
#define MUD_LO ${(0.76 - 0.86 * (GO.mud ?? 0.12) + 0.0).toFixed(4)}
#define RUTS ${GO.ruts === null ? 0 : 1}
#define RUT_Z ${(GO.ruts?.z ?? 35).toFixed(2)}
#define BODY_L2 ${(CFG.BODY_LEN / 2).toFixed(2)}
#define BODY_D2 ${(CFG.BODY_DEPTH / 2).toFixed(2)}
#define BODY_H ${CFG.BODY_H.toFixed(2)}
#define FACADE_GLOW ${v3(GO.glow, [0.42, 0.17, 0.045])}
#define GROUND_TINT ${v3(GO.tint, [2.0, 1.55, 0.68])}
#define GRASS_MUL ${v3(GO.grassMul, [1, 1, 1])}
#define SOIL_MUL ${v3(GO.soilMul, [1, 1, 1])}
#define VEG_TINT ${v3(GO.vegTint, [1, 1, 1])}
#define KS ${KS.toFixed(4)}
#define FOOT_R ${CFG.FOOT_R.toFixed(4)}
`;
  const { GAIT, SPEED, NLEGS } = gait;
  const renderer = ctx.renderer;
  const DBG = ctx.Q ? ctx.Q.get("envdbg") : null;
  const T0 = performance.now();

  const uTime = { value: 0 };
  const uCam = { value: new THREE.Vector3() };
  const uWalker = { value: new THREE.Vector3(0, CFG_RIDE(ctx), 0) };
  const uFacZ = { value: 1 };
  const heroV = HERO4.map((h) => new THREE.Vector4(h[0], h[1], h[2], h[3]));
  const uHero = { value: heroV }, uHeroRot = { value: HERO4.map((h) => h[4]) };
  const prints = Array.from({ length: NLEGS * PRINTS_PER_LEG }, () => new THREE.Vector4(0, 0, 1e5, 0));
  const printsNear = Array.from({ length: NPRINT_NEAR }, () => new THREE.Vector4(0, 0, 1e5, 0));
  const uPrintN = { value: printsNear };
  const legU = Array.from({ length: NLEGS }, () => new THREE.Vector4(0, 0, 1e5, 1));
  const uLeg = { value: legU }, uCyc = { value: new THREE.Vector2(SPEED * GAIT.T, GAIT.T) };
  const skyU = {
    uZenith: { value: LOOK.zenith }, uHorizon: { value: LOOK.horizon },
    uSkyGlowDir: { value: LOOK.skyGlowDir }, uSkyGlow: { value: LOOK.skyGlow },
  };

  // ================================================================ GROUND
  // mirror RT: the mirror camera's frustum is stretched downwards (= towards higher reflected elevations, see
  // the mirror pass) so steep reflection rays still find the facade; a little taller than the screen aspect.
  const mirrorW = Math.min(960, Math.round(renderer.domElement.width * 0.75)) || 960;
  const aspect = (renderer.domElement.width / renderer.domElement.height) || 16 / 9;
  const mirrorRT = new THREE.WebGLRenderTarget(mirrorW, Math.round(mirrorW / aspect * 1.25), {
    type: THREE.HalfFloatType, samples: 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  const gU = {
    uTime, uWalker, uFacZ, uHero, uHeroRot, uLeg, uCyc, ...skyU,
    tMirror: { value: mirrorRT.texture }, uMirrorMat: { value: new THREE.Matrix4() }, uMirrorOn: { value: 0 },
    uFogCol: { value: LOOK.fogColor }, uFogD: { value: LOOK.fogDensity }, uMist: { value: LOOK.mistDensity },
  };
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, envMapIntensity: 0.5 });
  groundMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, gU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP;
uniform float uTime, uMirrorOn, uFogD, uMist;
uniform vec3 uFogCol;
uniform sampler2D tMirror; uniform mat4 uMirrorMat;
uniform vec4 uLeg[${NLEGS}];   // last plant of every leg: x, z, age (s), side
uniform vec2 uCyc;            // metres / seconds between two prints of the same leg
${SKY_GLSL}
${DEFS}
${COMMON}
${FACADE}
float gRough = 0.8, gWater = 0.0, gWet = 0.0, gDepth = 1.0, gBits = 0.0, gJit = 0.5;
vec3 gN = vec3(0.0, 1.0, 0.0);
vec2 gWaterGrad = vec2(0.0);
// footprint height profile (m). Foot = round pad r 2.75 with radial tread + 4 claws (outward, +-63deg
// forward/back, inward); squeezed-up mud rim around the pad, ridges beside and mounds ahead of every claw.
// side flips z so "outward" is canonical +y.
float printH(vec2 q, float side){
  q.y *= side;
  float r = length(q);
  float ang = atan(q.y, q.x);
  float h = -0.17 * smoothstep(2.95, 2.5, r) * (1.0 - 0.2 * cos(ang * 12.0) * smoothstep(0.7, 2.0, r));
  h += 0.10 * exp(-sq((r - 3.15) / 0.34)) * (0.7 + 0.3 * cos(ang * 7.0 + 1.0));
  for (int k = 0; k < 4; k++){
    vec2 dir = k == 0 ? vec2(0.0, 1.0) : k == 1 ? vec2(0.891, 0.454) : k == 2 ? vec2(-0.891, 0.454) : vec2(0.0, -1.0);
    float L = k == 3 ? 4.6 : 5.25;
    float al = dot(q, dir), pe = abs(dot(q, vec2(-dir.y, dir.x)));
    float along = smoothstep(2.4, 3.0, al) * smoothstep(L + 0.15, L - 0.6, al);
    float g = smoothstep(0.75, 0.15, pe) * along;
    h -= g * (0.11 + 0.2 * smoothstep(3.0, L, al));
    h += 0.055 * exp(-sq((pe - 0.98) / 0.2)) * along;
    h += 0.09 * exp(-sq((al - L - 0.4) / 0.32)) * smoothstep(1.0, 0.0, pe);
  }
  return h;
}
`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 p = vWP.xz;
  float dCam = length(cameraPosition - vWP);
  float m1 = fbm(p * 0.035);
  vec3 n1 = noised(p * 0.9), n2 = noised(p * 2.7 + 5.0), n3 = noised(p * 8.3 + 11.0), n4 = noised(p * 23.0 + 3.0);
  float clump = n1.x * 0.45 + n2.x * 0.3 + n3.x * 0.15 + n4.x * 0.1;
  float mud = mudMask(p);
  float rut = rutMask(p);
  float pd = puddleField(p);
  float water = smoothstep(1.0, 0.86, pd);
  float rim = smoothstep(1.26, 0.99, pd);
  // footprints
  float ph = 0.0, phs = 0.0, pmask = 0.0, pfresh = 0.0, pwater = 0.0;
  float pd1 = 1e9, pd2 = 1e9; vec4 pr1 = vec4(0.0, 0.0, 1e5, 1.0), pr2 = pr1;
  for (int i = 0; i < ${NLEGS}; i++){   // each leg's trail is periodic: only its print nearest to this pixel matters
    vec4 lg = uLeg[i];
    float kp = clamp(floor((lg.x - p.x) / uCyc.x + 0.5), 0.0, ${(PRINTS_PER_LEG - 1).toFixed(1)});
    vec4 pr = vec4(lg.x - kp * uCyc.x, lg.y, lg.z + kp * uCyc.y, lg.w);
    vec2 q = p - pr.xy; float dq = dot(q, q);
    if (dq < pd1) { pd2 = pd1; pr2 = pr1; pd1 = dq; pr1 = pr; } else if (dq < pd2) { pd2 = dq; pr2 = pr; }
  }
  for (int i = 0; i < 2; i++){
    vec4 pr = i == 0 ? pr1 : pr2;
    vec2 q = p - pr.xy;
    float inr = step(dot(q, q), 46.0 * KS * KS);
    float h0 = 0.0;
    if (inr > 0.5) h0 = printH(q / KS, pr.w) * KS;
    ph = min(ph, h0); phs += h0;
    float e = length(q) / FOOT_R;
    float m = max(smoothstep(1.3, 1.0, e + (n2.x - 0.5) * 0.3), smoothstep(-0.02, -0.08, h0));
    pmask = max(pmask, m);
    // churned mud spatter and clods thrown around the print
    float spl = smoothstep(2.2, 1.1, e + (n3.x - 0.5) * 0.8) * step(0.42, n4.x + n2.x * 0.4);
    pmask = max(pmask, spl * 0.85);
    pfresh = max(pfresh, m * exp(-pr.z * 0.02));
    // ground water seeps into the pad and the claw trenches within a few seconds
    float seep = 0.07 * exp(-pr.z * 0.2);
    pwater = max(pwater, inr * smoothstep(-0.115 - seep, -0.165 - seep, h0 + (n2.x - 0.5) * 0.09 + (n1.x - 0.5) * 0.05));
  }
  // slope of the print relief from screen-space derivatives (one height evaluation per print)
  vec2 dpx = dFdx(p), dpy = dFdy(p); float dhx = dFdx(phs), dhy = dFdy(phs);
  float pdet = dpx.x * dpy.y - dpx.y * dpy.x;
  vec2 pgrad = abs(pdet) > 1e-10 ? clamp(vec2(dhx * dpy.y - dhy * dpx.y, dhy * dpx.x - dhx * dpy.x) / pdet, -1.5, 1.5) : vec2(0.0);
  mud = max(max(mud, rut * 0.9), max(rim * 0.85, pmask));
  // standing water: puddles, flooded prints, water in the ruts, small pools in churned mud
  float rutW = rut * smoothstep(0.40, 0.58, vnoise(p * vec2(0.13, 0.45) + 9.0));
  float pool = smoothstep(0.68, 0.75, n2.x * 0.65 + n1.x * 0.35) * smoothstep(0.7, 0.98, mud);
  float shallow = max(pwater, max(rutW, pool)) * 0.92;
  gDepth = max(smoothstep(1.0, 0.6, pd) * water, 0.35 * shallow);
  water = max(water, shallow);
  // albedo
  vec3 grassC = mix(vec3(0.018, 0.030, 0.012), vec3(0.034, 0.038, 0.014), smoothstep(0.35, 0.75, m1));
  grassC = mix(grassC, vec3(0.050, 0.044, 0.028), smoothstep(0.6, 0.85, n2.x * 0.6 + n4.x * 0.5) * 0.55);
  float macro = fbm(p * 0.012 + 40.0);
  grassC = mix(grassC, vec3(0.040, 0.036, 0.020), smoothstep(0.55, 0.8, macro) * 0.6);   // dry straw meadow patches
  grassC *= mix(0.7, 1.15, smoothstep(0.2, 0.7, fbm2(p * 0.05 + 3.0)));
  // fine anisotropic streaks so the far field reads as grass, not paint
  grassC *= 0.8 + 0.4 * vnoise(p * vec2(6.0, 1.3) + n2.x);
  grassC *= (0.55 + 0.75 * clump) * 0.75 * GRASS_MUL;
  vec3 mudC = mix(vec3(0.018, 0.014, 0.011), vec3(0.030, 0.024, 0.018), n3.x);
  mudC = mix(mudC, vec3(0.012, 0.010, 0.008), pfresh * 0.6) * SOIL_MUL;
  // crushed straw pressed into the print floor, dead thatch at the puddle rims
  float straw = smoothstep(0.58, 0.72, vnoise(p * vec2(11.0, 2.4) + n2.x * 2.0)) * 0.5 + smoothstep(0.6, 0.75, vnoise(p.yx * vec2(9.0, 2.0) + 7.0)) * 0.5;
  mudC = mix(mudC, vec3(0.055, 0.046, 0.026), straw * max(pmask * 0.55, rim * (1.0 - water) * 0.35));
  vec3 alb = mix(grassC, mudC, mud);
  float hollow = smoothstep(0.42, 0.28, m1 + (n1.x - 0.5) * 0.2);
  gWet = clamp(max(hollow * 0.6, mud * 0.85), 0.0, 1.0);
  alb *= 1.0 - 0.4 * gWet;
  alb *= 1.0 - 0.45 * smoothstep(-0.02, -0.14, ph);            // depth of the print reads darker
  alb *= GROUND_TINT * skyOcc(vWP);                 // look-dev: olive, clearly green under the blue dusk light
  gRough = mix(mix(0.95, 0.75, n3.x), 0.28 + 0.2 * n2.x, gWet);
  vec2 grad = (n1.yz * 0.9 * 0.05 + n2.yz * 2.7 * 0.03 + n3.yz * 8.3 * 0.01) * (1.0 - 0.6 * mud)
            + (n3.yz * 8.3 * 0.006 + n4.yz * 23.0 * 0.0015) * mud + (n3.yz * 8.3 * 0.014 + n4.yz * 23.0 * 0.005) * pfresh + pgrad * 0.9;
  // pebbles and small stones pressed into bare soil (two sizes, one cell lookup each, near field only)
  float nearK = smoothstep(34.0, 16.0, dCam);
  if (nearK > 0.0){
    float pk = 0.0; vec2 pg = vec2(0.0); float pc = 0.0;
    for (int s = 0; s < 2; s++){
      vec2 pp = p * (s == 0 ? 2.7 : 8.5) + float(s) * 17.0;
      vec2 c = floor(pp), f = fract(pp);
      float h1 = hash12(c + 17.3), h2 = hash12(c + 4.4);
      vec2 q = f - (0.32 + 0.36 * vec2(hash12(c + 1.7), hash12(c + 9.2)));
      q.x *= 0.75 + 0.6 * h1;
      float d = length(q) / (0.10 + 0.20 * h2);
      float dens = (s == 0 ? 0.07 : 0.12) + (s == 0 ? 0.33 : 0.5) * mud;
      float k = step(hash12(c + 31.7), dens) * smoothstep(1.0, 0.8, d);
      if (k > pk){ pk = k; pg = q * smoothstep(0.15, 1.0, d) * (s == 0 ? 2.2 : 4.0); pc = h1; }
    }
    pk *= nearK * (1.0 - 0.8 * water);
    alb = mix(alb, mix(vec3(0.040, 0.040, 0.038), vec3(0.10, 0.097, 0.088), pc) * (0.6 + 0.4 * n4.x) * skyOcc(vWP), pk);
    gRough = mix(gRough, 0.34, pk);
    grad -= pg * pk * 3.0;
  }
  // muddy bottom showing through the shallow edge, dark deep water
  alb = mix(alb, mix(vec3(0.060, 0.047, 0.030), vec3(0.010, 0.010, 0.009), gDepth), water);
  diffuseColor.rgb = alb;
  gN = normalize(vec3(-grad.x, 1.0, -grad.y));
  gWater = water;
  // water ripples: wind cat's-paws + rain rings; calmer (sharper mirror) towards the far rim
  vec2 rp = p * 2.2;
  vec3 r1 = noised(rp + uTime * vec2(0.35, 0.12)), r2 = noised(rp * 2.3 - uTime * vec2(0.2, 0.41));
  float gust = 0.35 + 1.3 * smoothstep(0.35, 0.75, vnoise(p * 0.22 + uTime * vec2(0.28, 0.09)));
  vec2 wg = (r1.yz * 0.5 + r2.yz * 1.6) * 0.006 * gust;
  vec2 rc = floor(p * 1.6);
  for (int j = 0; j < 4; j++){
    vec2 cc = rc + vec2(float(j & 1), float(j >> 1));
    float hh = hash12(cc * 1.37 + 0.5);
    float ph2 = fract(uTime * 0.45 + hh * 7.0);
    vec2 ctr = (cc + vec2(hash12(cc + 3.1), hash12(cc + 7.7))) / 1.6;
    vec2 dq = p - ctr; float dd = length(dq);
    float rr = ph2 * 0.34;
    float ring = sin((dd - rr) * 70.0) * exp(-sq((dd - rr) * 18.0)) * (1.0 - ph2) * step(0.5, hh);
    wg += dq / max(dd, 1e-3) * ring * 0.06;
  }
  gWaterGrad = wg * mix(1.0, 0.4, smoothstep(5.0, 30.0, dCam));
  gJit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uTime * 37.0);
  // floating grass bits and seeds, gathered near the banks
  vec2 bp = p * 6.5 + n2.x * 0.6;
  vec2 bc = floor(bp), bf = fract(bp) - 0.5;
  float ba = hash12(bc + 2.3) * 6.2832;
  vec2 bq = vec2(cos(ba) * bf.x + sin(ba) * bf.y, -sin(ba) * bf.x + cos(ba) * bf.y);
  gBits = smoothstep(0.05, 0.02, abs(bq.y)) * smoothstep(0.40, 0.30, abs(bq.x))
        * step(hash12(bc + 7.1), 0.06 + 0.3 * smoothstep(0.55, 0.98, pd)) * smoothstep(40.0, 15.0, dCam);
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(gRough, 1.0, gWater);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(gN, 0.0)).xyz);')
      .replace('#include <opaque_fragment>', `
{
  vec3 V = normalize(cameraPosition - vWP);
  // warm smear of the facade + cold sky sheen on wet ground
  vec3 Nw = normalize(mix(gN, vec3(0.0, 1.0, 0.0), 0.5));
  vec3 Rg = reflect(-V, Nw);
  float Fg = 0.04 + 0.96 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
  outgoingLight += facadeGlow(vWP, Rg, 0.02 + gRough * 0.25) * Fg * gWet * (1.0 - gWater) * 0.8;
  outgoingLight += skyColor(normalize(vec3(Rg.x, max(Rg.y, 0.03), Rg.z))) * Fg * gWet * (1.0 - gWater) * 0.12 * skyOcc(vWP);
  if (gWater > 0.001){
    vec3 Nr = normalize(vec3(-gWaterGrad.x, 1.0, -gWaterGrad.y));
    vec3 R = reflect(-V, Nr);
    R.y = max(R.y, 0.012);
    float F = mix(mix(0.16, 0.34, gDepth), 1.0, pow(1.0 - max(dot(Nr, V), 0.0), 5.0));
    vec3 fd = normalize(vec3(R.x, R.y * 0.35 + 0.03, R.z));
    vec3 fogc = mix(uFogCol, skyColor(fd), 0.55);
    vec3 sky = skyColor(normalize(vec3(R.x, max(R.y, 0.02), R.z)));
    vec3 refl = sky, streak = vec3(0.0);
    float hitA = 0.0;
    if (uMirrorOn > 0.5){
      // planar mirror: project the point the reflected ray would hit into the mirror camera
      float zf = uWalker.z + uFacZ * BODY_D2;
      float sD = (zf - vWP.z) / (abs(R.z) < 1e-3 ? 1e-3 : R.z);
      sD = sD > 0.0 ? clamp(sD, 8.0, 160.0) : 60.0;
      vec3 P0 = vec3(vWP.x, 0.0, vWP.z);
      vec4 pc = uMirrorMat * vec4(P0 + R * sD, 1.0);
      vec2 uv = pc.xy / pc.w;
      vec4 m = textureLod(tMirror, clamp(uv, 0.002, 0.998), 0.0);
      if (any(isnan(m)) || any(isinf(m))) m = vec4(0.0);   // one bad pixel in the mirror must not bloom into a blob
      m.rgb = min(m.rgb, vec3(6.0));
      float inb = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0) * step(0.0, pc.w);
      hitA = clamp(m.a, 0.0, 1.0) * inb;
      refl = mix(sky, m.rgb, hitA);
      // ripple glitter: bright lights (windows, lamps) smear into long vertical streaks towards the viewer
      vec3 R1 = normalize(R + vec3(0.0, 0.46, 0.0));
      vec4 pc1 = uMirrorMat * vec4(P0 + R1 * sD, 1.0);
      vec2 uv1 = pc1.xy / pc1.w;
      for (int k = 0; k < 8; k++){
        float fk = (float(k) + 0.25 + 0.5 * gJit) / 8.0;
        vec2 uvk = mix(uv, uv1, fk) + vec2(sin(vWP.x * 5.0 + vWP.z * 3.0 + fk * 23.0 + uTime * 1.3) * 0.0035 * fk, 0.0);
        vec4 mk = textureLod(tMirror, clamp(uvk, 0.002, 0.998), 0.0);
        if (any(isnan(mk)) || any(isinf(mk))) mk = vec4(0.0);
        mk.rgb = min(mk.rgb, vec3(6.0));
        streak += mk.rgb * smoothstep(0.3, 1.0, max(mk.r, mk.g)) * clamp(mk.a, 0.0, 1.0) * (1.0 - 0.8 * fk);
      }
      streak = mix(streak, dot(streak, vec3(0.45, 0.45, 0.1)) * vec3(1.0, 0.60, 0.26), 0.6) * 0.24 * step(0.0, pc1.w);   // keep the smear amber, never red
    } else {
      refl += facadeGlow(vWP, R, 0.004) * 2.2;
      hitA = 0.5;
    }
    // reflected path is not fogged by post: approximate extinction along it
    float D = length(uWalker - vWP);
    float extW = uFogD * D * 0.8 + uMist * min(D, 4.0 / max(R.y, 0.06)) * 0.5;
    float ext = mix(6.0, extW, hitA);
    refl = mix(refl, fogc, 1.0 - exp(-ext)) + streak * exp(-extW);
    vec3 waterCol = outgoingLight * mix(0.85, 0.3, gDepth) * (1.0 - F) + refl * F;
    waterCol = mix(waterCol, vec3(0.036, 0.034, 0.022) * skyOcc(vWP), gBits);
    outgoingLight = mix(outgoingLight, waterCol, gWater);
  }
}
#include <opaque_fragment>`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 1, 1).rotateX(-Math.PI / 2), groundMat);
  ground.receiveShadow = true;
  ground.frustumCulled = false;
  ground.name = 'env-ground';
  scene.add(ground);

  // ================================================================ VEGETATION
  // Generic camera-wrapped instanced plant shader (patched MeshStandardMaterial so it gets the scene's
  // lighting, shadows and env reflections). Geometry is a plant model of nominal height 1 (y = 0..1).
  // attribute aPart = part id + 0.3 * side (side = -1/+1 on the two edges of a strip, used for dew beads,
  // wet edge highlights and feathered seed heads). Part ids: 0 leaf/blade, 1 seed head (feathered),
  // 2 cattail head, 3 dead stalk, 4 broad leaf, 5 rusty seed spike (feathered), 6 stone.
  // Placement modes: 0 grass (tussocks, meadow height patches), 1 puddle-rim lovers (reeds),
  // 2 patchy weeds (own patch noise), 3 rigid stones / mud clods (no bending, like bare ground).
  const vegMeshes = [];
  let vegTris = 0;
  function makeVeg(name, geo, count, o) {
    const dens = GO.veg?.[name] ?? 1;          // colossus.js GROUND.veg: density multiplier per plant layer (0 = none)
    if (!(dens > 0)) return;
    count = Math.round(count * dens);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = geo.index;
    ig.setAttribute('position', geo.getAttribute('position'));
    ig.setAttribute('normal', geo.getAttribute('normal'));
    ig.setAttribute('aPart', geo.getAttribute('aPart'));
    if (geo.getAttribute('uv')) ig.setAttribute('uv', geo.getAttribute('uv'));
    vegTris += count * (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
    const off = new Float32Array(count * 2);
    const r = rng(o.seed);
    // stratified (jittered grid) so density is even
    const n = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const gx = i % n, gy = Math.floor(i / n);
      off[i * 2] = ((gx + r()) / n) * o.S;
      off[i * 2 + 1] = ((gy + r()) / n) * o.S;
    }
    ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2));
    ig.instanceCount = count;
    const U = {
      uTime, uCam, uWalker, uFacZ, uHero, uHeroRot, uPrintN, ...skyU,
      uNear: { value: o.near || 0 }, uAO: { value: o.ao ?? 0.7 }, uS: { value: o.S }, uCtr: { value: new THREE.Vector2() }, uFade: { value: new THREE.Vector2(o.fade0, o.fade1) },
      uH: { value: new THREE.Vector2(o.h0, o.h1) }, uW: { value: new THREE.Vector2(o.w0, o.w1) },
      uLean: { value: o.lean }, uWind: { value: o.wind }, uMode: { value: o.mode || 0 },
      uNUp: { value: o.nup ?? 0.55 }, uDens: { value: o.dens ?? 1 }, uDry: { value: o.dry ?? 0.08 },
      uAbs: { value: o.abs || 0 }, uTus: { value: o.tus || 0 }, uPatch: { value: o.patch || 0 }, uTallDens: { value: o.tallDens || 0 }, uJit: { value: o.S / Math.sqrt(count) * 0.9 },
    };
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 });
    if (o.map) { mat.map = o.map; mat.alphaToCoverage = true; }
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec2 aOff; attribute float aPart;
uniform vec3 uCam; uniform vec2 uCtr; uniform float uAO, uNear, uTime, uS, uLean, uWind, uMode, uNUp, uDens, uDry, uAbs, uTus, uPatch, uTallDens, uJit;
uniform vec2 uFade, uH, uW;
uniform vec4 uPrintN[${NPRINT_NEAR}];
varying vec3 vGCol; varying vec3 vGDry; varying float vV; varying vec3 vWP; varying float vSeed; varying float vPart; varying float vSide; varying vec2 vDim;
${DEFS}
${COMMON}
vec3 gPos;
`)
        .replace('#include <beginnormal_vertex>', `
vec3 objectNormal;
{
  float part = floor(aPart + 0.5);
  float side = (aPart - part) / 0.3;
  vec2 camxz = uCam.xz;
  vec2 rel = mod(aOff - uCtr + 0.5 * uS, uS) - 0.5 * uS;
  vec2 root = uCtr + rel;
  float edgeF = 1.0 - smoothstep(0.36 * uS, 0.49 * uS, max(abs(rel.x), abs(rel.y)));
  ivec2 tile = ivec2(floor((root - aOff) / uS + 0.5));
  uint h = pcg(uint(gl_InstanceID) * 7919u + cellHash(tile));
  float r1 = u2f(h); h = pcg(h); float r2 = u2f(h); h = pcg(h); float r3 = u2f(h); h = pcg(h); float r4 = u2f(h);
  h = pcg(h); float r5 = u2f(h); h = pcg(h); float r6 = u2f(h); h = pcg(h); float r7 = u2f(h); h = pcg(h); float r8 = u2f(h);
  root += (vec2(r1, r2) - 0.5) * uJit;
  float dist = length(root - camxz);
  float fade = (1.0 - smoothstep(uFade.x, uFade.y, dist)) * edgeF * smoothstep(uNear, uNear * 1.8, dist);
  // where it grows
  float pd = puddleField(root);
  float mudm = mudMask(root), rutm = rutMask(root);
  float g; vec3 tk = vec3(0.0); float tallP = 0.5;
  if (uMode < 0.5) {
    g = smoothstep(0.95, 1.16, pd);
    g *= 1.0 - 0.75 * mudm;
    g *= 1.0 - 0.9 * rutm;
    // big-scale density variation (meadow patches), tall-grass patches, tussocks
    g *= 0.55 + 0.45 * smoothstep(0.25, 0.6, fbm2(root * 0.06 + 2.0));
    tallP = smoothstep(0.3, 0.7, fbm2(root * 0.035 + 5.0));
    g *= mix(1.0, 0.2 + 0.8 * tallP, uTallDens);
    if (uTus > 0.0) tk = tussock(root);
  } else if (uMode < 1.5) {
    // reeds: love puddle borders (also standing in the shallows), sparse elsewhere
    float edge = exp(-sq((pd - 1.04) / 0.16));
    g = max(edge, 0.08 * smoothstep(0.55, 0.8, fbm2(root * 0.05 + 9.0))) * step(0.86, pd) * (1.0 - 0.9 * rutm);
  } else if (uMode < 2.5) {
    // weeds: patchy colonies
    g = smoothstep(0.98, 1.2, pd) * (1.0 - 0.8 * mudm) * (1.0 - rutm);
    g *= 0.10 + 0.90 * smoothstep(0.42, 0.68, fbm2(root * 0.045 + uPatch));
  } else {
    // stones and clods: mostly where the soil is bare
    g = (0.22 + 0.78 * max(mudm, max(rutm, smoothstep(1.3, 1.02, pd)))) * step(0.97, pd);
  }
  // footprints: press blades flat outward
  float press = 0.0; vec2 pdir = vec2(0.0);
  for (int i = 0; i < ${NPRINT_NEAR}; i++){
    vec2 q = root - uPrintN[i].xy;
    float e = length(q) / FOOT_R;
    float k = smoothstep(1.3, 0.95, e);
    if (k > press) { press = k; pdir = q / max(length(q), 1e-3); }
    g *= 1.0 - 0.9 * smoothstep(1.0, 0.75, e);
  }
  float alive = step(r3, g * uDens);
  float clumpN = vnoise(root * 1.7 + 11.0) * 0.6 + vnoise(root * 0.45) * 0.4;
  float H;
  if (uMode > 2.5) H = mix(uH.x, uH.y, r4 * r4 * r4) * fade * alive;
  else {
    H = mix(uH.x, uH.y, r4 * r4) * fade * alive * (0.55 + 0.45 * g) * (0.45 + 1.0 * clumpN);
    if (uMode < 0.5) H *= mix(0.7, 1.4, tallP) * (1.0 + uTus * (2.0 * tk.x - 0.3));
    H *= 1.0 - 0.7 * press;
    if (uAbs > 0.5) H = min(H, uH.y * 1.7);   // no metre-long blades whipping across the lens
  }
  float wsc = mix(uW.x, uW.y, r6) * (0.4 + 0.6 * fade);
  float xs = uAbs > 0.5 ? wsc : wsc * H;
  float yaw = r5 * 6.28318;
  vec2 dir = vec2(cos(yaw), sin(yaw));
  // local model -> rotated
  vec3 lp = position;
  vec3 ln = normal;
  vec2 rn = vec2(dir.x * ln.z + dir.y * ln.x, dir.y * ln.z - dir.x * ln.x);
  float v;
  if (uMode > 2.5) {
    vec3 q = lp * H; q.y *= 0.5 + 0.45 * r6;
    vec2 rxz = vec2(dir.x * q.z + dir.y * q.x, dir.y * q.z - dir.x * q.x);
    gPos = vec3(root.x + rxz.x, q.y + H * (0.10 - 0.25 * r7), root.y + rxz.y);
    objectNormal = normalize(vec3(rn.x, ln.y * 1.5, rn.y));
    v = clamp(lp.y + 0.5, 0.0, 1.0);
  } else {
    vec2 lxz = lp.xz * xs;
    vec2 rxz = vec2(dir.x * lxz.y + dir.y * lxz.x, dir.y * lxz.y - dir.x * lxz.x);
    v = clamp(lp.y, 0.0, 1.2);
    // wind (pure function of time) + lean
    float wph = uTime * 1.25 + dot(root, vec2(0.23, 0.11));
    float gust = 0.5 + 0.5 * sin(uTime * 0.37 + root.x * 0.045 + root.y * 0.02);
    vec2 wind = vec2(0.85, 0.35) * (0.08 + 0.22 * gust) * (0.7 + 0.3 * sin(wph))
              + vec2(sin(wph * 2.3 + r1 * 6.0), cos(wph * 1.9 + r2 * 5.0)) * 0.035;
    vec2 bend = dir * uLean * (0.15 + 1.3 * r7 * r7) + wind * uWind + pdir * press * 1.6 + tk.yz * uTus * 0.55;
    float bl = dot(bend, bend);
    vec2 off = bend * v * v * H;
    float y = lp.y * H * (1.0 - 0.3 * min(bl, 2.0) * v);
    gPos = vec3(root.x + rxz.x + off.x, y, root.y + rxz.y + off.y);
    objectNormal = normalize(mix(normalize(vec3(rn.x, 0.0, rn.y) + 1e-5), vec3(0.0, 1.0, 0.0), uNUp));
  }
  if (H < 0.003) gPos = vec3(root.x, -50.0, root.y); // collapse dead blades (degenerate tris gave NaN normals)
  vWP = gPos; vV = v; vSeed = r8; vPart = part; vSide = side; vDim = vec2(uAbs > 0.5 ? xs : xs * (part > 3.5 ? 0.14 : 0.02), H);
  // colour: dark green -> olive, some blue-green, rare straw; dead / dry parts khaki and brown
  vec3 cA = vec3(0.026, 0.050, 0.012), cB = vec3(0.050, 0.055, 0.014), cC = vec3(0.020, 0.044, 0.020), cD = vec3(0.11, 0.088, 0.045);
  vec3 tintG = vec3(1.75, 1.32, 0.58);             // look-dev: olive green under the blue dusk light
  vec3 tintD = vec3(1.12, 1.04, 0.86);
  vec3 col; vec3 tint = tintD;
  if (part < 0.5) {
    col = mix(cA, cB, r7);
    col = mix(col, cC, smoothstep(0.6, 1.0, r2) * 0.8);
    float dry = step(r1, uDry + 0.25 * tk.x * uTus);
    vec3 cDry = vec3(0.098, 0.088, 0.060) / tintG * tintD;   // pale khaki straw (never orange)
    col = mix(col, cDry, dry * smoothstep(0.15, 0.9, v) * 0.9);
    col = mix(col, cDry, smoothstep(0.65, 1.0, v) * 0.3);
    tint = tintG;
  } else if (part < 1.5) col = mix(vec3(0.090, 0.082, 0.060), vec3(0.050, 0.045, 0.034), r4);
  else if (part < 2.5) col = vec3(0.035, 0.022, 0.012);
  else if (part < 3.5) col = mix(vec3(0.070, 0.062, 0.045), vec3(0.030, 0.026, 0.020), r4);
  else if (part < 4.5) {
    col = mix(vec3(0.020, 0.046, 0.016), vec3(0.036, 0.050, 0.014), r7);
    col = mix(col, vec3(0.060, 0.036, 0.020), step(0.78, r2) * 0.55);
    tint = tintG;
  } else if (part < 5.5) col = mix(vec3(0.070, 0.038, 0.024), vec3(0.042, 0.026, 0.018), r4);
  else {
    col = mix(vec3(0.045, 0.045, 0.043), vec3(0.10, 0.096, 0.088), r7);
    col = mix(col, vec3(0.026, 0.021, 0.016), step(0.6, r2));
    tint = vec3(1.0);
  }
  float shade = mix(uAO, 1.0, smoothstep(0.0, 0.5, v)) * (0.75 + 0.5 * r6) * mix(0.85, 1.0, press);
  vGCol = col * shade * tint * VEG_TINT;
  vGDry = vec3(0.098, 0.088, 0.060) * tintD * shade;
}`)
        .replace('#include <begin_vertex>', 'vec3 transformed = gPos;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vGCol; varying vec3 vGDry; varying float vV; varying vec3 vWP; varying float vSeed; varying float vPart; varying float vSide; varying vec2 vDim;
${DEFS}
${SKY_GLSL}
${FACADE}
float hashF(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`)
        .replace('#include <color_fragment>', `#include <color_fragment>
#ifdef USE_MAP
  diffuseColor.rgb = mix(vGCol, vGDry, sampledDiffuseColor.g) * (0.35 + 0.9 * sampledDiffuseColor.r);
  diffuseColor.a = clamp((sampledDiffuseColor.a - 0.45) / max(fwidth(sampledDiffuseColor.a), 1e-4) + 0.5, 0.0, 1.0);
  if (diffuseColor.a < 0.02) discard;
#else
  diffuseColor.rgb = vGCol;
  // feathered seed heads: ragged edges
  if ((vPart > 0.5 && vPart < 1.5) || (vPart > 4.5 && vPart < 5.5)){
    if (hashF(vec2(floor(vV * 90.0) + vSeed * 31.0, floor(vSide * 2.0 + 2.0))) < abs(vSide) * 1.1 - 0.15) discard;
  }
#endif
  diffuseColor.rgb *= skyOcc(vWP);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vPart > 5.5 ? 0.36 : mix(0.9, 0.5, vV);')
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
if (vPart < 5.5) { // two-sided blades: flip only the horizontal part so back faces still face the sky
  vec3 nw = normalize((vec4(normalize(vNormal), 0.0) * viewMatrix).xyz);
  if (!gl_FrontFacing) nw.xz = -nw.xz;
  normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
}`)
        .replace('#include <opaque_fragment>', `
float vPx = length(vec2(dFdx(vV), dFdy(vV)));
if (vPart < 5.5) {
  vec3 V = normalize(cameraPosition - vWP);
  vec3 Nw = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  float dist = length(cameraPosition - vWP);
  // translucency / sky rim: blades lit through from the dusk sky
  float rim = pow(1.0 - abs(dot(Nw, V)), 2.0);
  vec3 skyL = skyColor(normalize(vec3(-V.x, 0.25, -V.z)));
  outgoingLight += vGCol * mix(skyL, vec3(dot(skyL, vec3(0.33))), 0.88) * (1.6 * vV * vV + 1.0 * rim * vV + 0.5) * 2.0;
  vec3 R = reflect(-V, Nw);
  outgoingLight += facadeGlow(vWP, R, 0.03) * 0.25 * rim * vV;
  float nearF = smoothstep(11.0, 3.0, dist) * smoothstep(0.55, 1.1, dist);
  if (nearF > 0.0 && (vPart < 0.5 || vPart > 3.5)) {
    vec3 skyR = skyColor(normalize(vec3(R.x, abs(R.y) + 0.15, R.z)));
    vec3 cold = mix(skyR, vec3(dot(skyR, vec3(0.4))), 0.45);
    // wet film on the blade edges
    float edge = smoothstep(0.5, 1.0, abs(vSide)) * smoothstep(0.05, 0.4, vV);
    outgoingLight += (cold * 0.55 + facadeGlow(vWP, R, 0.02) * 1.2) * edge * nearF;
    // dew beads: tiny lens-like drops sitting along the blade, each catches the bright sky and the warm windows
    float wid = max(vDim.x * pow(max(1.0 - vV, 0.02), 0.6), 0.004);
    float nb = max(vDim.y / 0.016, 1.0);
    float cell = floor(vV * nb);
    float hb = hashF(vec2(cell + vSeed * 91.7, vSeed * 13.1 + cell * 0.37));
    float cv = (fract(vV * nb) - 0.5) * 0.016;
    float cs = (vSide - (hashF(vec2(cell * 1.7, vSeed * 57.0)) - 0.5) * 1.3) * wid * 0.5;
    float px = max(vPx * vDim.y, 1e-5);
    float rad = 0.0020 + 0.0022 * fract(hb * 17.0);
    float re = max(rad, px * 0.8);
    float bead = smoothstep(re, re * 0.45, length(vec2(cv, cs))) * step(0.66, hb) * (rad / re) * smoothstep(0.12, 0.3, vV);
    if (bead > 0.0) {
      vec2 bo = vec2(cs, cv) / re;
      vec3 Nb = normalize(Nw + vec3(bo.x * V.z, bo.y * 0.9, -bo.x * V.x) * 0.8);
      vec3 Rb = reflect(-V, Nb);
      vec3 glint = facadeGlow(vWP, Rb, 0.002) * 7.0 + cold * 4.5 + vec3(0.03, 0.04, 0.06);
      outgoingLight += glint * bead * nearF * (0.45 + 0.55 * fract(hb * 5.0));
    }
  }
}
#include <opaque_fragment>`);
    };
    const mesh = new THREE.Mesh(ig, mat);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'env-' + name;
    if (DBG !== "noveg" && DBG !== "no" + name) scene.add(mesh);
    vegMeshes.push(mesh);
    mesh.userData.ahead = o.ahead || 0;
    mesh.userData.uCtr = U.uCtr;
    mesh.userData.inMirror = !!o.mirror;
    return mesh;
  }

  function finalize(pos, nrm, part, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    g.setIndex(idx);
    return g;
  }
  // a tapered strip rising from base, curving outward along yaw (out = curve * v^2 * height).
  // New-style plants are modelled in units of plant height (xz too); taper may be a width profile function.
  function addStrip(P, N, A, I, nseg, base, height, width, curve, yaw, part, taper = 0.6, startY = 0) {
    const s0 = P.length / 3;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let s = 0; s <= nseg; s++) {
      const v = s / nseg;
      const w = s === nseg ? 0 : width * (typeof taper === 'function' ? taper(v) : Math.pow(1 - v, taper));
      const out = curve * v * v * height;
      const cx = base[0] + cs * out, cz = base[2] + sn * out;
      const y = base[1] + startY + v * height;
      // side vector perpendicular to the curve direction
      const sx = -sn, sz = cs;
      P.push(cx - sx * w * 0.5, y, cz - sz * w * 0.5, cx + sx * w * 0.5, y, cz + sz * w * 0.5);
      N.push(cs, 0, sn, cs, 0, sn);
      A.push(part - 0.3, part + 0.3);
    }
    for (let s = 0; s < nseg; s++) {
      const a = s0 + s * 2;
      if (s === nseg - 1) I.push(a, a + 1, a + 3);
      else I.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const leafW = (v) => 0.22 + 0.78 * Math.sin(Math.PI * Math.min(1, 0.08 + v * 1.0));
  const plumeW = (v) => 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, 0.1 + v * 0.9));
  // single blade: x = side, y = v, normal +z (the shader rotates it)
  function bladeGeo(nseg) {
    const P = [], N = [], A = [], I = [];
    for (let s = 0; s < nseg; s++) {
      const v = s / nseg, w = Math.pow(1 - v, 0.6);
      P.push(-0.5 * w, v, 0, 0.5 * w, v, 0); N.push(0, 0, 1, 0, 0, 1); A.push(-0.3, 0.3);
    }
    P.push(0, 1, 0); N.push(0, 0, 1); A.push(0);
    for (let s = 0; s < nseg - 1; s++) { const a = s * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    const a = (nseg - 1) * 2; I.push(a, a + 1, nseg * 2);
    return finalize(P, N, A, I);
  }
  // crossed alpha-tested card carrying ~60 drawn blades (mid ring: dense at a tiny triangle cost)
  function cardGeo() {
    const P = [], N = [], A = [], I = [], UV = [];
    for (let k = 0; k < 2; k++) {
      const yaw = k * Math.PI / 2, cs = Math.cos(yaw), sn = Math.sin(yaw), b = P.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const x = (u - 0.5) * 2.0;
        P.push(cs * x, v, sn * x); N.push(-sn, 0, cs); A.push(0); UV.push(u, v);
      }
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = finalize(P, N, A, I);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    return g;
  }
  // card texture: R = brightness, G = dryness (khaki tips, seed heads), A = coverage
  function grassCardTex() {
    const W = 1024, H = 512;
    return ctx.TEX.canvasTexture(W, H, (c) => {
      c.clearRect(0, 0, W, H);
      const r = rng(31337);
      for (let i = 0; i < 64; i++) {
        const tall = i >= 52;
        const x0 = 14 + r() * (W - 28), h = tall ? H * (0.72 + 0.26 * r()) : H * (0.2 + 0.5 * r() * r() + 0.02), lean = (r() - 0.5) * (tall ? 0.5 : 1.1) * h;
        const w = tall ? 1.6 + r() * 1.2 : 3 + r() * 5.5, g = Math.round(105 + r() * 150);
        const dry = Math.round((r() < 0.3 ? 200 : 60 + r() * 120));
        const gr = c.createLinearGradient(0, H, 0, H - h);
        gr.addColorStop(0, `rgb(${Math.round(g * 0.75)},0,0)`); gr.addColorStop(tall ? 0.3 : 0.55, `rgb(${g},${tall ? dry : 0},0)`); gr.addColorStop(1, `rgb(${g},${dry},0)`);
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(x0 - w, H);
        c.quadraticCurveTo(x0 - w * 0.6 + lean * 0.3, H - h * 0.55, x0 + lean, H - h);
        c.quadraticCurveTo(x0 + w * 0.6 + lean * 0.3, H - h * 0.55, x0 + w, H);
        c.closePath(); c.fill();
        if (tall) { // drooping seed head
          c.fillStyle = `rgb(${g},235,0)`;
          const dx = lean >= 0 ? 1 : -1;
          for (let k = 0; k < 16; k++) {
            const u = k / 15, px = x0 + lean + dx * u * 26 + (r() - 0.5) * 6, py = H - h + u * u * 30 - 6 + (r() - 0.5) * 8;
            c.beginPath(); c.ellipse(px, py, 2.2 + r() * 2.5, 4 + r() * 5, dx * 0.6, 0, 6.3); c.fill();
          }
        }
      }
    }, { repeat: false, srgb: false });
  }
  // tall seed grass (reed-grass): arching stalk, drooping feathery plume, long arching leaves
  function tallGeo() {
    const P = [], N = [], A = [], I = [];
    const r = rng(5);
    addStrip(P, N, A, I, 4, [0, 0, 0], 0.84, 0.008, 0.22, 0, 0, 0.25);
    const tx = 0.22 * 0.84;
    addStrip(P, N, A, I, 3, [tx - 0.01, 0.80, 0], 0.2, 0.05, 1.6, 0.25, 1, plumeW);
    addStrip(P, N, A, I, 3, [0, 0, 0], 0.62, 0.022, 0.95, 2.2 + r(), 0, 0.7);
    addStrip(P, N, A, I, 3, [0, 0, 0], 0.5, 0.02, 1.3, 4.3 + r(), 0, 0.7);
    addStrip(P, N, A, I, 2, [0.03, 0.34, 0], 0.36, 0.016, 1.5, 0.9, 0, 0.8);
    return finalize(P, N, A, I);
  }
  // lone weed stalk for the far ring (seed head on a bare stem), fat enough to survive the distance
  function stalkGeo() {
    const P = [], N = [], A = [], I = [];
    addStrip(P, N, A, I, 3, [0, 0, 0], 1.0, 0.022, 0.12, 0, 3, 0.3);
    addStrip(P, N, A, I, 1, [0.1, 0.78, 0], 0.22, 0.07, 0.6, 0.4, 1, 0.2);
    addStrip(P, N, A, I, 2, [0, 0, 0], 0.4, 0.07, 0.9, 2.5, 0, 0.7);
    return finalize(P, N, A, I);
  }
  // reed / cattail cluster (likes puddle edges)
  function reedGeo() {
    const P = [], N = [], A = [], I = [];
    const r = rng(9);
    for (let k = 0; k < 2; k++) {
      const bx = (r() - 0.5) * 0.1, bz = (r() - 0.5) * 0.1, hh = 0.7 + r() * 0.3, yaw = r() * 6.28, cv = 0.06 + r() * 0.12;
      addStrip(P, N, A, I, 4, [bx, 0, bz], hh, 0.008, cv, yaw, 0, 0.2);
      if (k < 1) addStrip(P, N, A, I, 2, [bx + Math.cos(yaw) * cv * hh * 0.55, hh * 0.74, bz + Math.sin(yaw) * cv * hh * 0.55], 0.13, 0.024, 0.0, yaw + 1.57, 2, (v) => 0.9 - 0.3 * v);
      addStrip(P, N, A, I, 3, [bx, 0, bz], hh * 0.85, 0.02, 0.55 + r() * 0.4, yaw + 2.0 + r(), 0, 0.8);
    }
    return finalize(P, N, A, I);
  }
  // dock / burdock: rosette of broad leaves and a rusty seed spike
  function dockGeo() {
    const P = [], N = [], A = [], I = [];
    const r = rng(21);
    for (let k = 0; k < 5; k++) {
      const yaw = k * 1.2566 + r() * 0.5;
      addStrip(P, N, A, I, 3, [Math.cos(yaw) * 0.02, 0, Math.sin(yaw) * 0.02], 0.26 + r() * 0.16, 0.13 + r() * 0.05, 1.3 + r() * 0.9, yaw, 4, leafW);
    }
    addStrip(P, N, A, I, 3, [0, 0, 0], 0.7, 0.014, 0.08, 0.3, 3, 0.2);
    addStrip(P, N, A, I, 3, [0.03, 0.55, 0], 0.45, 0.07, 0.15, 0.3, 5, plumeW);
    addStrip(P, N, A, I, 3, [0.03, 0.55, 0], 0.42, 0.07, 0.1, 1.87, 5, plumeW);
    addStrip(P, N, A, I, 2, [0.02, 0.4, 0], 0.3, 0.035, 1.2, 3.4, 5, plumeW);
    return finalize(P, N, A, I);
  }
  // dry umbellifer skeleton (hogweed / angelica): ribbed stalk, umbrella of rays with seed tufts, a side branch
  function umbelGeo() {
    const P = [], N = [], A = [], I = [];
    const r = rng(33);
    addStrip(P, N, A, I, 3, [0, 0, 0], 0.86, 0.014, 0.06, 0, 3, 0.3);
    const top = [0.045, 0.85, 0];
    for (let k = 0; k < 7; k++) {
      const yaw = k * 0.8976 + r() * 0.3, out = 0.10 + r() * 0.05, hh = 0.09 + r() * 0.05;
      addStrip(P, N, A, I, 1, top, hh, 0.006, out / hh, yaw, 3, 0.2);
      addStrip(P, N, A, I, 1, [top[0] + Math.cos(yaw) * out, top[1] + hh - 0.012, top[2] + Math.sin(yaw) * out], 0.035, 0.05, 0.0, yaw + 1.57, 1, 0.5);
    }
    const by = 2.4, bo = 0.2, bh = 0.26;
    addStrip(P, N, A, I, 2, [0, 0.46, 0], bh, 0.008, bo / bh, by, 3, 0.2);
    const bt = [Math.cos(by) * bo, 0.46 + bh, Math.sin(by) * bo];
    for (let k = 0; k < 4; k++) {
      const yaw = k * 1.57 + 0.4, out = 0.06, hh = 0.06;
      addStrip(P, N, A, I, 1, bt, hh, 0.005, out / hh, yaw, 3, 0.2);
      addStrip(P, N, A, I, 1, [bt[0] + Math.cos(yaw) * out, bt[1] + hh - 0.01, bt[2] + Math.sin(yaw) * out], 0.028, 0.04, 0.0, yaw + 1.57, 1, 0.5);
    }
    addStrip(P, N, A, I, 2, [0, 0.0, 0], 0.22, 0.07, 1.6, 4.4, 3, leafW);
    addStrip(P, N, A, I, 2, [0, 0.0, 0], 0.18, 0.06, 1.9, 1.1, 3, leafW);
    return finalize(P, N, A, I);
  }
  // irregular flat-shaded stone
  function stoneGeo() {
    const g = new THREE.IcosahedronGeometry(0.5, 0);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.28 * Math.sin(x * 9.1 + y * 5.3 + 1.0) * Math.cos(z * 7.7 - y * 3.9);
      p.setXYZ(i, x * k * 1.15, y * k * 0.8, z * k);
    }
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(p.count).fill(6), 1));
    return g;
  }

  // near: dense blades in tussocks. mid: blade cards out to ~50 m. Then the wild layers: tall seed grass,
  // dock, dry umbels, far stalks, reeds at the puddle rims, stones and clods on bare soil.
  makeVeg('grassNear', bladeGeo(4), 36000, { seed: 1, S: 13, ahead: 4.2, near: 0.65, fade0: 5.2, fade1: 8.0, h0: 0.11, h1: 0.52, w0: 0.011, w1: 0.03, lean: 0.55, wind: 1.0, abs: 1, tus: 1 });
  makeVeg('grassMid', cardGeo(), 30000, { seed: 2, S: 72, ahead: 28, fade0: 40, fade1: 52, near: 3.0, h0: 0.28, h1: 0.8, w0: 0.24, w1: 0.4, lean: 0.25, wind: 0.6, nup: 0.85, ao: 0.75, map: grassCardTex(), abs: 1, tus: 0.4 });
  makeVeg('grassTall', tallGeo(), 5200, { seed: 3, S: 44, ahead: 16, fade0: 22, fade1: 30, near: 1.7, h0: 0.6, h1: 2.1, w0: 0.8, w1: 1.25, lean: 0.3, wind: 1.6, dens: 1.0, dry: 0.5, tallDens: 1 });
  makeVeg('weeds', dockGeo(), 1300, { seed: 6, S: 46, ahead: 17, fade0: 22, fade1: 30, near: 1.5, h0: 0.45, h1: 1.15, w0: 0.8, w1: 1.3, lean: 0.12, wind: 0.6, mode: 2, patch: 9.0, dry: 0.15, ao: 0.6 });
  makeVeg('umbels', umbelGeo(), 1500, { seed: 7, S: 84, ahead: 34, fade0: 48, fade1: 64, near: 1.8, h0: 1.1, h1: 3.0, w0: 0.8, w1: 1.2, lean: 0.12, wind: 0.8, mode: 2, patch: 23.0, nup: 0.5, mirror: true });
  makeVeg('stalksFar', stalkGeo(), 5000, { seed: 5, S: 120, ahead: 52, fade0: 75, fade1: 100, near: 14, h0: 0.7, h1: 1.8, w0: 0.9, w1: 1.3, lean: 0.15, wind: 1.2, dens: 0.8, dry: 0.6, nup: 0.6 });
  makeVeg('reeds', reedGeo(), 2600, { seed: 4, S: 50, ahead: 18, near: 1.4, fade0: 19, fade1: 25, h0: 0.9, h1: 1.9, w0: 0.8, w1: 1.2, lean: 0.1, wind: 1.0, mode: 1, dry: 0.3, mirror: true });
  makeVeg('stones', stoneGeo(), 1600, { seed: 8, S: 30, ahead: 10, near: 0.6, fade0: 13, fade1: 17, h0: 0.03, h1: 0.26, w0: 1, w1: 1, lean: 0, wind: 0, mode: 3, nup: 0, ao: 0.55 });

  // ================================================================ DISTANT SILHOUETTES (one merged static mesh)
  let farTris = 0, propTris = 0;
  {
    const r = rng(4242);
    const parts = [];
    const colorize = (g, c) => {
      const n = g.getAttribute('position').count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (g.index) { const ng = g.toNonIndexed(); g.dispose(); return ng; }
      return g;
    };
    // n-sided tube along a polyline (posts, twigs, rebar)
    const tube = (pts, r0, r1, sides) => {
      const P = [], I = [], n = pts.length;
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
        const rx = Math.abs(dy) > 0.9 ? 1 : 0, ry = Math.abs(dy) > 0.9 ? 0 : 1;
        let ux = dy * 0 - dz * ry, uy = dz * rx - dx * 0, uz = dx * ry - dy * rx;
        const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
        const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
        const rad = r0 + (r1 - r0) * (n > 1 ? i / (n - 1) : 0);
        for (let s = 0; s < sides; s++) {
          const an = s / sides * 6.2832, cs = Math.cos(an) * rad, sn = Math.sin(an) * rad;
          P.push(pts[i][0] + ux * cs + vx * sn, pts[i][1] + uy * cs + vy * sn, pts[i][2] + uz * cs + vz * sn);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let s = 0; s < sides; s++) {
        const a = i * sides + s, b = i * sides + (s + 1) % sides, c = a + sides, d = b + sides;
        I.push(a, b, d, a, d, c);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setIndex(I); g.computeVertexNormals();
      return g;
    };
    const blob = (rad, det, sy = 0.85) => {
      const g = new THREE.IcosahedronGeometry(rad, det);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + 0.25 * Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y * 0.9) + (r() - 0.5) * 0.15;
        p.setXYZ(i, x * k, y * k * sy, z * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const place = (g, x, y, z, ry = 0) => { g.rotateY(ry); g.translate(x, y, z); parts.push(g); };
    const treeAt = (x, z) => {
      const poplar = r() < 0.35;
      const h = poplar ? 14 + r() * 9 : 8 + r() * 9, c = 0.6 + r() * 0.4;
      const trunk = new THREE.CylinderGeometry(0.1, 0.3, h * 0.75, 5, 1, true);
      place(colorize(trunk, [0.018 * c, 0.018 * c, 0.017 * c]), x, h * 0.375, z);
      const nb = 3 + Math.floor(r() * 3);
      for (let k = 0; k < nb; k++) {
        const u = k / (nb - 1);
        const rad = h * (poplar ? 0.1 + 0.05 * (1 - Math.abs(u - 0.4)) : 0.14 + r() * 0.1) * (1 - 0.35 * u);
        const spread = poplar ? 0.08 : 0.3;
        place(colorize(blob(rad, 1, poplar ? 2.2 : 1.25), [0.014 * c, 0.02 * c, 0.017 * c]),
          x + (r() - 0.5) * h * spread, h * (0.42 + 0.48 * u), z + (r() - 0.5) * h * spread, r() * 6);
      }
    };
    const shrubAt = (x, z) => {
      const s = 1.2 + r() * 2.5, c = 0.6 + r() * 0.4;
      place(colorize(blob(s, 1), [0.016 * c, 0.024 * c, 0.02 * c]), x, s * 0.4, z, r() * 6);
    };
    const inBand = () => {
      const side = r() < 0.72 ? -1 : 1;
      const z = side < 0 ? -(70 + Math.pow(r(), 1.3) * 260) : 235 + r() * 170;
      return [-450 + r() * 1150, z];
    };
    // lone trees + small clusters
    const FARO = { trees: 26, shrubs: 80, poles: true, ...(GO.far || {}) };
    for (let k = 0; k < FARO.trees; k++) {
      const [x, z] = inBand();
      treeAt(x, z);
      if (r() < 0.45) for (let m = 0; m < 2 + r() * 3; m++) treeAt(x + (r() - 0.5) * 30, z + (r() - 0.5) * 18);
    }
    for (let k = 0; k < FARO.shrubs; k++) { const [x, z] = inBand(); shrubAt(x, z); }
    // utility pole line with sagging wires (z = -150)
    const poleZ = -150, span = 55, poles = [];
    for (let x = -450; FARO.poles && x <= 720; x += span) {
      const px = x + (r() - 0.5) * 6, pz = poleZ + (r() - 0.5) * 3, ph = 10.5 + r() * 1.0;
      poles.push([px, pz, ph]);
      const pole = new THREE.CylinderGeometry(0.13, 0.2, ph, 5, 1, true);
      place(colorize(pole, [0.018, 0.016, 0.014]), px, ph / 2, pz);
      const arm = new THREE.BoxGeometry(0.15, 0.15, 2.4);
      place(colorize(arm, [0.018, 0.016, 0.014]), px, ph - 0.6, pz);
    }
    for (let k = 0; k + 1 < poles.length; k++) {
      const [ax, az, ah] = poles[k], [bx, bz, bh] = poles[k + 1];
      for (const wz of [-1.0, 0, 1.0]) {
        const P = [], seg = 10;
        for (let s = 0; s <= seg; s++) {
          const u = s / seg, sag = 1.4 * 4 * u * (1 - u);
          const x = ax + (bx - ax) * u, z = az + (bz - az) * u + wz, y = ah - 0.6 + (bh - ah) * u - sag + 0.1;
          P.push(x, y + 0.03, z, x, y - 0.03, z);
        }
        const I = [];
        for (let s = 0; s < seg; s++) { const a = s * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setIndex(I); g.computeVertexNormals();
        parts.push(colorize(g, [0.01, 0.01, 0.01]));
      }
    }
    // ---- fences: rotten posts with two sagging wires; long runs far out + a broken fragment by the road
    const fenceRun = (x0, z0, x1, z1, step, gapP, col) => {
      const len = Math.hypot(x1 - x0, z1 - z0), nn = Math.floor(len / step);
      let prev = null;
      for (let k = 0; k <= nn; k++) {
        const u = k / nn;
        if (r() < gapP) { prev = null; continue; }
        const px = x0 + (x1 - x0) * u + (r() - 0.5) * 0.3, pz = z0 + (z1 - z0) * u + (r() - 0.5) * 0.3;
        const ph = 1.15 + r() * 0.35, lx = (r() - 0.5) * 0.45, lz = (r() - 0.5) * 0.45;
        const top = [px + lx * ph, ph, pz + lz * ph];
        parts.push(colorize(tube([[px, -0.1, pz], top], 0.055, 0.045, 5), [col[0] * (0.7 + 0.5 * r()), col[1] * (0.7 + 0.5 * r()), col[2] * (0.7 + 0.5 * r())]));
        if (prev && r() > 0.12) for (const wy of [0.92, 0.55]) {
          const a = [prev[0] + (prev[3] - prev[0]) * wy, prev[4] * wy, prev[2] + (prev[5] - prev[2]) * wy];
          const b = [px + lx * ph * wy, ph * wy, pz + lz * ph * wy];
          const sag = 0.08 + r() * 0.3, P = [], seg = 4;
          for (let s = 0; s <= seg; s++) {
            const t = s / seg, y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t);
            const x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
            P.push(x, Math.max(y, 0.03) + 0.012, z, x, Math.max(y, 0.03) - 0.012, z);
          }
          const I = [];
          for (let s = 0; s < seg; s++) { const q = s * 2; I.push(q, q + 1, q + 3, q, q + 3, q + 2); }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
          g.setIndex(I); g.computeVertexNormals();
          parts.push(colorize(g, [0.012, 0.011, 0.010]));
        }
        prev = [px, 0, pz, top[0], ph, top[2]];
      }
    };
    for (const [x0, z0, x1, z1, st, gap] of GO.fences ?? [[-260, -64, 520, -58, 3.3, 0.07], [-240, 82, 480, 76, 3.3, 0.10]])
      fenceRun(x0, z0, x1, z1, st, gap, [0.03, 0.027, 0.022]);
    // ---- twiggy willow shrubs and saplings scattered beside the walker's corridor (never on the foot lines)
    const bushAt = (x, z, s) => {
      const nt = 16 + Math.floor(r() * 10), c = 0.8 + r() * 0.5;
      for (let k = 0; k < nt; k++) {
        const yaw = r() * 6.283, lean = 0.08 + r() * r() * 0.5, hh = s * (0.5 + 0.5 * r());
        const bx = x + Math.cos(yaw) * 0.22 * s * r(), bz = z + Math.sin(yaw) * 0.22 * s * r();
        const cx = Math.cos(yaw), cz = Math.sin(yaw);
        const mid = [bx + cx * lean * hh * 0.3, hh * 0.5, bz + cz * lean * hh * 0.3];
        const tip = [bx + cx * lean * hh, hh, bz + cz * lean * hh];
        const tc = [0.040 * c, 0.036 * c, 0.031 * c];
        parts.push(colorize(tube([[bx, -0.05, bz], mid, tip], 0.010 + 0.006 * s, 0.003, 3), tc));
        // side twiglets + a few small leaf sprays
        for (let m = 0; m < 2; m++) {
          const t = 0.25 + 0.6 * r(), ya = yaw + (r() - 0.5) * 2.6, L = hh * (0.2 + 0.25 * r());
          const o = [mid[0] + (tip[0] - mid[0]) * t, mid[1] + (tip[1] - mid[1]) * t, mid[2] + (tip[2] - mid[2]) * t];
          const e = [o[0] + Math.cos(ya) * L * 0.6, o[1] + L * 0.8, o[2] + Math.sin(ya) * L * 0.6];
          parts.push(colorize(tube([o, e], 0.006 + 0.002 * s, 0.002, 3), tc));
          // a few last narrow leaves hanging off the twig end
          const lw = 0.025 + 0.02 * r(), ll = 0.10 + 0.08 * r(), la = r() * 6.283;
          const q = new THREE.BufferGeometry();
          q.setAttribute('position', new THREE.Float32BufferAttribute([e[0] - Math.cos(la) * lw, e[1], e[2] - Math.sin(la) * lw, e[0] + Math.cos(la) * lw, e[1], e[2] + Math.sin(la) * lw,
            e[0] + Math.sin(la) * ll * 0.5, e[1] - ll, e[2] - Math.cos(la) * ll * 0.5], 3));
          q.computeVertexNormals();
          parts.push(colorize(q, [0.034 * c, 0.046 * c, 0.022 * c]));
        }
      }
    };
    // keep the walker's lane (|z| < foot track + 8 m), the ruts and the hand-framed shots clear
    const lane = CFG.FOOT_Z + 8, rutZ = GO.ruts === null ? -1e9 : (GO.ruts?.z ?? 35);
    const safeZ = (z) => Math.abs(z) > lane && Math.abs(Math.abs(z) - rutZ) > 4.5;
    const clear = (x, z, pad = 0) => (GO.keepClear || []).every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr + pad);
    for (let k = 0; k < (GO.bushes ?? 46); k++) {
      const x = -130 + r() * 480, z = (r() < 0.5 ? -1 : 1) * (lane + r() * 85), s = 0.9 + r() * r() * 2.6;
      if (!safeZ(z) || !clear(x, z, 3)) continue;
      bushAt(x, z, s);
      if (r() < 0.4) bushAt(x + (r() - 0.5) * 4, z + (r() - 0.5) * 4, s * 0.6);
    }
    // hand-placed bushes, trees, fences for the shots: colossus.js GROUND.scenery(kit)
    const kit = { r, treeAt, shrubAt, bushAt, parts, colorize, tube, THREE, fenceRun: (x0, z0, x1, z1, st = 2.8, gap = 0.1) => fenceRun(x0, z0, x1, z1, st, gap, [0.04, 0.034, 0.027]) };
    if (GO.scenery) GO.scenery(kit);
    if (!parts.length) parts.push(colorize(new THREE.BoxGeometry(0.01, 0.01, 0.01).translate(0, -50, 0), [0, 0, 0]));
    const merged = BGU.mergeGeometries(parts.map((g) => { if (!g.getAttribute('normal')) g.computeVertexNormals(); g.deleteAttribute('uv'); return g; }), false);
    parts.forEach((g) => g.dispose());
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
    const far = new THREE.Mesh(merged, mat);
    far.name = 'env-far';
    far.frustumCulled = false;
    scene.add(far);
    farTris = merged.getAttribute('position').count / 3;
    // ---- debris with real parallax near the film cameras (all outside the foot lines |z| < 30)
    {
      const props = [];
      const put = (g, c, x, y, z, ry = 0, rx = 0, rz = 0) => { g.rotateZ(rz); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); props.push(colorize(g, c)); };
      const WOOD = [0.050, 0.041, 0.031], CONC = [0.115, 0.115, 0.11], RUST = [0.085, 0.040, 0.020], RUBBER = [0.013, 0.013, 0.014];
      const plank = (x, z, ry, len = 2.4, tilt = 0.0, y = 0.03) => put(new THREE.BoxGeometry(len, 0.045, 0.17, 3, 1, 1), [WOOD[0] * (0.7 + 0.6 * r()), WOOD[1] * (0.7 + 0.6 * r()), WOOD[2] * (0.7 + 0.6 * r())], x, y, z, ry, 0.05 * (r() - 0.5), tilt);
      const chunk = (x, z, sx, sy, sz, ry, tilt, rebar = 2) => {
        const g = new THREE.BoxGeometry(sx, sy, sz, 3, 2, 3);
        const p = g.getAttribute('position');
        for (let i = 0; i < p.count; i++) { // knock the corners off
          const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
          const k = 1 - 0.3 * Math.abs(Math.sin(px * 5.1 + pz * 3.3 + py * 4.7 + sx * 9));
          p.setXYZ(i, px * k, py * (0.85 + 0.3 * Math.abs(Math.sin(px * 3 + pz * 2.1))), pz * k);
        }
        g.computeVertexNormals();
        put(g, [CONC[0] * (0.75 + 0.4 * r()), CONC[1] * (0.75 + 0.4 * r()), CONC[2] * (0.75 + 0.4 * r())], x, sy * 0.28, z, ry, tilt, tilt * 0.6);
        for (let k = 0; k < rebar; k++) {
          const a = ry + (r() - 0.5) * 1.2, bx = x + Math.cos(a) * sx * 0.45, bz = z - Math.sin(a) * sx * 0.45, L = 0.4 + r() * 0.6;
          props.push(colorize(tube([[bx, sy * 0.35, bz], [bx + Math.cos(a) * L * 0.5, sy * 0.5 + L * 0.35, bz - Math.sin(a) * L * 0.5], [bx + Math.cos(a + 0.6) * L, sy * 0.4 + L * 0.3, bz - Math.sin(a + 0.6) * L]], 0.012, 0.012, 3), RUST));
        }
      };
      const tyre = (x, z, tilt, ry, sink = 0.05) => put(new THREE.TorusGeometry(0.40, 0.155, 7, 16), RUBBER, x, 0.155 - sink, z, ry, Math.PI / 2 + tilt, 0);
      const sign = (x, z, ry, lean) => {
        const top = [x + Math.sin(lean) * 2.1, 2.1 * Math.cos(lean), z];
        props.push(colorize(tube([[x, -0.2, z], [x + Math.sin(lean) * 0.8, 0.95, z], top], 0.03, 0.028, 5), [0.07, 0.065, 0.06]));
        put(new THREE.BoxGeometry(0.62, 0.62, 0.012), [0.20, 0.19, 0.17], top[0], top[1] - 0.25, top[2] + 0.04, ry, 0.12, lean * 0.8 + 0.5);
        put(new THREE.BoxGeometry(0.5, 0.16, 0.014), [0.035, 0.05, 0.085], top[0] - 0.05, top[1] - 0.72, top[2] + 0.045, ry, 0.1, lean * 0.8 - 0.15);
      };
      const pipe = (x, z, ry, rad = 0.62, len = 1.3) => {
        put(new THREE.CylinderGeometry(rad, rad, len, 14, 1, true), CONC, x, rad * 0.72, z, ry, 0, Math.PI / 2);
        put(new THREE.CylinderGeometry(rad * 0.76, rad * 0.76, len, 14, 1, true), [0.03, 0.03, 0.03], x, rad * 0.72, z, ry, 0, Math.PI / 2);
        for (const s of [-1, 1]) { const g = new THREE.RingGeometry(rad * 0.76, rad, 14); g.rotateY(Math.PI / 2); g.translate(s * len / 2, 0, 0); put(g, [CONC[0] * 0.8, CONC[1] * 0.8, CONC[2] * 0.8], x, rad * 0.72, z, ry); }
      };
      // hand-placed props for the shots: colossus.js GROUND.dressing(kit) with the same helpers as the scatter
      Object.assign(kit, { tyre, plank, chunk, sign, pipe, put, props });
      if (GO.dressing) GO.dressing(kit);
      // scattered debris beside the lane (GROUND.debris pieces; kinds by GROUND.debrisMix [chunk, plank, tyre] cumulative)
      const MIX = GO.debrisMix || [0.4, 0.75, 0.9];
      for (let k = 0; k < (GO.debris ?? 26); k++) {
        const x = -120 + r() * 460, z = (r() < 0.5 ? -1 : 1) * (lane - 0.5 + r() * 26), t = r();
        if (!clear(x, z)) continue;
        if (t < MIX[0]) chunk(x, z, 0.5 + r() * 0.9, 0.25 + r() * 0.3, 0.4 + r() * 0.5, r() * 6.3, 0.15 + r() * 0.25, r() < 0.5 ? 2 : 0);
        else if (t < MIX[1]) plank(x, z, r() * 6.3, 1.4 + r() * 1.6, (r() - 0.5) * 0.1);
        else if (t < MIX[2]) tyre(x, z, r() * 0.5, r() * 6.3, r() * 0.08);
        else sign(x, z, r() * 6.3, 0.15 + r() * 0.4);
      }
      if (!props.length) props.push(colorize(new THREE.BoxGeometry(0.01, 0.01, 0.01).translate(0, -50, 0), [0, 0, 0]));
      const pm = BGU.mergeGeometries(props.map((g) => { if (!g.getAttribute('normal')) g.computeVertexNormals(); g.deleteAttribute('uv'); return g; }), false);
      props.forEach((g) => g.dispose());
      const pmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.45 });
      pmat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
varying vec3 vWP;
float pH(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float pN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pH(i), pH(i + vec3(1, 0, 0)), f.x), mix(pH(i + vec3(0, 1, 0)), pH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(pH(i + vec3(0, 0, 1)), pH(i + vec3(1, 0, 1)), f.x), mix(pH(i + vec3(0, 1, 1)), pH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float gPropN = 0.5;`)
          .replace('#include <color_fragment>', `#include <color_fragment>
{ // grime mottling, lichen and a mud skirt where the thing sits in the soil
  gPropN = pN(vWP * 6.0) * 0.6 + pN(vWP * 21.0) * 0.4;
  diffuseColor.rgb *= 0.5 + 1.0 * gPropN;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.030, 0.036, 0.016), smoothstep(0.66, 0.84, pN(vWP * 2.3 + 7.0)) * 0.22);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.032, 0.025, 0.017), smoothstep(0.30, 0.02, vWP.y + (gPropN - 0.5) * 0.25) * 0.85);
}`)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.38, 0.85, gPropN);');
      };
      const pmesh = new THREE.Mesh(pm, pmat);
      pmesh.name = 'env-props';
      pmesh.receiveShadow = true;
      pmesh.frustumCulled = false;
      scene.add(pmesh);
      propTris = pm.getAttribute('position').count / 3;
    }
  }

  // ================================================================ MIRROR PASS
  const mCam = new THREE.PerspectiveCamera();
  const _n = new THREE.Vector3(0, 1, 0), _rp = new THREE.Vector3(), _cp = new THREE.Vector3(), _rot = new THREE.Matrix4();
  const _look = new THREE.Vector3(), _view = new THREE.Vector3(), _tgt = new THREE.Vector3(), _q = new THREE.Vector4();
  const _plane = new THREE.Plane(), _clip = new THREE.Vector4();
  const _clearC = new THREE.Color();
  let noReflect = null;
  let mirrorWanted = false;
  ground.onBeforeRender = (rend, scn, camera) => {
    gU.uMirrorOn.value = 0;
    if (!mirrorWanted || camera.isOrthographicCamera || DBG === "nomirror") return;
    _cp.setFromMatrixPosition(camera.matrixWorld);
    if (_cp.y <= 0.02) return;
    _rp.set(_cp.x, 0.0, _cp.z);
    _view.subVectors(_rp, _cp).reflect(_n).negate().add(_rp);
    _rot.extractRotation(camera.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rot).add(_cp);
    _tgt.subVectors(_rp, _look).reflect(_n).negate().add(_rp);
    mCam.position.copy(_view);
    mCam.up.set(0, 1, 0).applyMatrix4(_rot).reflect(_n);
    mCam.lookAt(_tgt);
    mCam.far = camera.far;
    mCam.updateMatrixWorld();
    // stretch the mirror frustum: keep the screen's x range, but map ndc y in [-K, Yt] (K > 1 = further
    // below the frame = higher reflected elevation; Yt just above the mirrored horizon) onto the RT
    const pm0 = mCam.projectionMatrix.copy(camera.projectionMatrix), e0 = pm0.elements;
    const pitch = Math.asin(Math.max(-1, Math.min(1, -camera.matrixWorld.elements[9])));
    const Tv = 1 / camera.projectionMatrix.elements[5];
    const K = Math.min(4.0, Math.max(1.0, Math.tan(Math.min(pitch + 0.82, 1.45)) / Tv));
    const Yt = Math.min(1.0, Math.max(-0.7, -Math.tan(pitch) / Tv + 0.3));
    const sa = 2 / (Yt + K), sb = (K - Yt) / (Yt + K);
    e0[5] *= sa; e0[9] = sa * e0[9] - sb;
    const tm = gU.uMirrorMat.value;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(mCam.projectionMatrix).multiply(mCam.matrixWorldInverse);
    // oblique near plane = water plane
    _plane.setFromNormalAndCoplanarPoint(_n, _rp).applyMatrix4(mCam.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const pm = mCam.projectionMatrix, e = pm.elements;
    _q.x = (Math.sign(_clip.x) + e[8]) / e[0];
    _q.y = (Math.sign(_clip.y) + e[9]) / e[5];
    _q.z = -1.0;
    _q.w = (1.0 + e[10]) / e[14];
    _clip.multiplyScalar(2.0 / _clip.dot(_q));
    e[2] = _clip.x; e[6] = _clip.y; e[10] = _clip.z + 1.0 - 0.003; e[14] = _clip.w;
    mCam.projectionMatrixInverse.copy(pm).invert();

    if (!noReflect) { noReflect = []; scn.traverse((o) => { if (o.userData && o.userData.noReflect) noReflect.push(o); }); }
    const hidden = [ground, ...vegMeshes.filter((m) => !m.userData.inMirror), ...noReflect].filter((o) => o.visible);
    hidden.forEach((o) => { o.visible = false; });
    const prevRT = rend.getRenderTarget();
    const prevAuto = rend.shadowMap.autoUpdate;
    rend.getClearColor(_clearC); const prevA = rend.getClearAlpha();
    rend.shadowMap.autoUpdate = false;
    rend.setClearColor(0x000000, 0);
    rend.setRenderTarget(mirrorRT);
    rend.state.buffers.depth.setMask(true);
    rend.clear();
    rend.render(scn, mCam);
    rend.setRenderTarget(prevRT);
    rend.setClearColor(_clearC, prevA);
    rend.shadowMap.autoUpdate = prevAuto;
    hidden.forEach((o) => { o.visible = true; });
    gU.uMirrorOn.value = 1;
  };

  if (DBG === 'stats') console.warn(`[env] tris: veg ${Math.round(vegTris)} far ${Math.round(farTris)} props ${Math.round(propTris)} total ${Math.round(vegTris + farTris + propTris + 2)}; build ${(performance.now() - T0).toFixed(0)} ms`);

  // ================================================================ UPDATE
  const fs = {};
  const frustum = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
  const pud = [];
  const near = [];
  const cyc = SPEED * GAIT.T;
  return {
    update(t, f) {
      const cam = f.camera;
      uTime.value = t;
      uCam.value.copy(cam.position);
      uWalker.value.set(f.pose.x, f.pose.y, f.pose.z);
      uFacZ.value = cam.position.z >= f.pose.z ? 1 : -1;
      const fx = -cam.matrixWorld.elements[8], fz = -cam.matrixWorld.elements[10], fl = Math.hypot(fx, fz) || 1;
      for (const m of vegMeshes) m.userData.uCtr.value.set(cam.position.x + fx / fl * m.userData.ahead, cam.position.z + fz / fl * m.userData.ahead);
      ground.position.set(Math.round(cam.position.x / 100) * 100, 0, Math.round(cam.position.z / 100) * 100);
      // footprints: previous plants of every leg (closed form)
      let n = 0;
      near.length = 0;
      for (let i = 0; i < NLEGS; i++) {
        gait.footState(i, t, fs);
        legU[i].set(fs.plantX, fs.z, fs.plantAge, fs.z > 0 ? 1 : -1);
        for (let k = 0; k < PRINTS_PER_LEG; k++) {
          const x = fs.plantX - k * cyc, age = fs.plantAge + k * GAIT.T;
          // a foot only leaves its print once it has touched down (k=0 is always touched down)
          prints[n++].set(x, fs.z, age, fs.z > 0 ? 1 : -1);
          near.push(n - 1);
        }
      }
      const cx = cam.position.x, cz = cam.position.z;
      near.sort((a, b) => Math.hypot(prints[a].x - cx, prints[a].y - cz) - Math.hypot(prints[b].x - cx, prints[b].y - cz));
      for (let k = 0; k < NPRINT_NEAR; k++) printsNear[k].copy(prints[near[k]]);
      // mirror only when a puddle (or water-filled print) is actually in view
      _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      frustum.setFromProjectionMatrix(_pm);
      mirrorWanted = false;
      puddlesNear(cx, cz, 170, pud);
      for (const p of pud) {
        _sph.center.set(p.x, 0, p.z); _sph.radius = p.r;
        if (Math.hypot(p.x - cx, p.z - cz) - p.r < 170 && frustum.intersectsSphere(_sph)) { mirrorWanted = true; break; }
      }
      if (!mirrorWanted) {
        for (let k = 0; k < prints.length; k++) {
          const p = prints[k];
          _sph.center.set(p.x, 0, p.y); _sph.radius = 5;
          if (Math.hypot(p.x - cx, p.y - cz) < 60 && frustum.intersectsSphere(_sph)) { mirrorWanted = true; break; }
        }
      }
    },
  };
}

function CFG_RIDE(ctx) { return ctx.CFG.RIDE_H; }
