// Shared material library. All "weathered" materials get procedural grime, drip streaks,
// moss, paint chips, rust and wetness injected into MeshStandardMaterial — triplanar in
// MESH-LOCAL space (after instanceMatrix), so NO UVs are required and nothing swims when
// the walker moves. Use `offset` to decorrelate identical meshes.
import * as THREE from 'three';
import { detailTexture } from './textures.js';

const W_DEFAULTS = {
  tex: 0.33,      // detail tiles per meter
  grain: 0.8,     // fine albedo grain amount
  dirt: 0.6,      // large-scale blotchy darkening
  streak: 0.7,    // vertical drip streaks (along local -Y)
  moss: 0.25,     // green algae / moss
  chip: 0.0,      // paint chipping revealing bare metal (0..1)
  rust: 0.0,      // rust coverage (0..1)
  wet: 0.35,      // wet sheen (lowers roughness in patches)
  bump: 0.010,    // bump height in meters
  mossColor: 0x2a3a1c,
  offset: null,   // THREE.Vector3 added to local position for noise lookup
};

const PARS_V = /* glsl */`
varying vec3 vWp; varying vec3 vWn;
uniform vec3 uWOff;
`;
const MAIN_V = /* glsl */`
{
  vec4 wP_ = vec4(transformed, 1.0);
  vec3 wN_ = objectNormal;
  #ifdef USE_INSTANCING
    wP_ = instanceMatrix * wP_;
    wN_ = mat3(instanceMatrix) * wN_;
  #endif
  vWp = wP_.xyz + uWOff;
  vWn = normalize(wN_);
}
`;
const PARS_F = /* glsl */`
varying vec3 vWp; varying vec3 vWn;
uniform sampler2D uWDetail;
uniform float uWTex, uWGrain, uWDirt, uWStreak, uWMoss, uWChip, uWRust, uWWet, uWBump;
uniform vec3 uWMossCol;
float wRustA = 0.0, wWetA = 0.0, wHeightA = 0.0;
vec4 wTri(vec3 p, vec3 n) {
  vec3 w = abs(n); w = w * w * w * w; w /= (w.x + w.y + w.z + 1e-5);
  return texture2D(uWDetail, p.zy) * w.x + texture2D(uWDetail, p.xz) * w.y + texture2D(uWDetail, p.xy) * w.z;
}
vec3 wPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos);
  vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;
const ALBEDO_F = /* glsl */`
{
  vec3 wp = vWp;
  vec3 wn = normalize(vWn);
  vec4 d1 = wTri(wp * uWTex, wn);
  vec4 d2 = wTri(wp * uWTex * 0.137 + 0.37, wn);
  float up = wn.y;
  float vert = 1.0 - abs(up);
  float grain = d1.r;
  diffuseColor.rgb *= mix(1.0, 0.70 + 0.60 * grain, uWGrain);
  // micro layer (4x finer): pores, pits, hairline scratches and speckle so surfaces hold up in close-ups
  vec4 d0 = wTri(wp * uWTex * 4.1 + 0.19, wn);
  diffuseColor.rgb *= mix(1.0, 0.80 + 0.40 * d0.r, uWGrain * 0.42);
  float pits = smoothstep(0.30, 0.12, d0.r) * smoothstep(0.42, 0.7, d1.a);
  diffuseColor.rgb *= 1.0 - 0.24 * pits * uWGrain;
  float hair = smoothstep(0.74, 0.92, d0.g) * (0.4 + 0.6 * d1.b);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (uWChip > 0.001 ? 1.4 : 0.68), hair * 0.4);
  float macro = d2.b * 0.62 + d2.a * 0.38;   // metres-scale tone variation (no small cloudy blobs)
  diffuseColor.rgb *= mix(1.0, 0.45 + 1.0 * macro, uWDirt);
  // vertical drip streaks, stretched along local Y
  vec2 sUV = vec2((wp.x + wp.z) * 0.55, wp.y * 0.028) * (uWTex * 3.0);
  float st = texture2D(uWDetail, sUV).b * 0.6 + texture2D(uWDetail, sUV * vec2(3.1, 1.7) + 0.5).b * 0.4;
  float streak = smoothstep(0.50, 0.78, st) * vert;
  diffuseColor.rgb *= 1.0 - uWStreak * streak * 0.62;
  // thin secondary runs between the broad streaks
  float stF = texture2D(uWDetail, vec2((wp.x + wp.z) * 2.3, wp.y * 0.05) * (uWTex * 3.0) + 0.13).a;
  diffuseColor.rgb *= 1.0 - uWStreak * smoothstep(0.62, 0.8, stF) * vert * 0.3;
  float st2 = texture2D(uWDetail, sUV * vec2(1.7, 1.0) + vec2(0.31, 0.77)).b;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.3 + 0.025, uWStreak * 0.45 * smoothstep(0.62, 0.85, st2) * vert);
  // moss / algae: likes up-facing surfaces and damp blotches
  float ms = smoothstep(0.50, 0.72, d2.a * 0.7 + d1.a * 0.25 + max(up, 0.0) * 0.22) * uWMoss;
  diffuseColor.rgb = mix(diffuseColor.rgb, uWMossCol * (0.55 + 0.9 * grain), ms * 0.75);
  // paint chips -> bare metal (small flakes, clustered by a broad mask)
  vec4 d3 = wTri(wp * uWTex * 0.41 + 0.71, wn);
  float broad = smoothstep(0.30, 0.72, d2.r * 0.55 + d2.a * 0.45);
  float chipN = d1.g * 0.58 + d3.g * 0.34 + broad * 0.26;
  float cth = 1.10 - uWChip * 0.62;
  float chip = smoothstep(cth, cth + 0.05, chipN) * step(0.001, uWChip);
  // rust: mottled patches with speckled edges, heavier where the broad mask says so
  float rustN = d3.b * 0.46 + d3.a * 0.22 + d1.a * 0.30 + broad * 0.30 + chip * 0.22;
  float rth = 1.06 - uWRust * 0.56;
  float rust = smoothstep(rth, rth + 0.11, rustN) * step(0.001, uWRust);
  vec3 rustCol = mix(vec3(0.060, 0.026, 0.014), vec3(0.235, 0.105, 0.045), d1.a * 0.7 + d3.r * 0.3);
  rustCol = mix(rustCol, vec3(0.30, 0.17, 0.07), smoothstep(0.75, 0.95, d1.r) * 0.6);   // few orange flecks
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.063, 0.068), chip * 0.9);
  diffuseColor.rgb = mix(diffuseColor.rgb, rustCol * (0.65 + 0.7 * grain), rust);
  // thin rusty halo around rust + rusty tint running down in the streaks
  float halo = smoothstep(rth - 0.10, rth + 0.02, rustN) * (1.0 - rust) * step(0.001, uWRust);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.66, 0.50), halo * 0.75);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.92, 0.70, 0.52), uWRust * streak * 0.65);
  wRustA = max(rust, chip * 0.35);
  wHeightA = grain * 0.6 + (1.0 - chip) * 0.5 * step(0.001, uWChip) + rust * d1.a * 0.5 + d0.r * 0.22 - pits * 0.35 - hair * 0.15;
  wWetA = uWWet * (0.30 + 0.70 * smoothstep(0.35, 0.7, d2.b)) * (0.6 + 0.4 * max(up, 0.0)) * (0.8 + 0.4 * d0.a);
}
`;
const ROUGH_F = /* glsl */`
roughnessFactor = mix(roughnessFactor, 0.96, wRustA);
roughnessFactor = clamp(roughnessFactor * (1.0 - 0.72 * wWetA) + (wHeightA - 0.5) * 0.12, 0.06, 1.0);
metalnessFactor = mix(metalnessFactor, 0.05, wRustA * 0.9);
`;
const NORMAL_F = /* glsl */`
{
  vec2 dH = vec2(dFdx(wHeightA), dFdy(wHeightA)) * uWBump;
  normal = wPerturb(-vViewPosition, normal, dH, faceDirection);
}
`;

export function applyWeather(mat, w = {}) {
  const o = { ...W_DEFAULTS, ...w };
  const u = {
    uWDetail: { value: detailTexture() },
    uWTex: { value: o.tex }, uWGrain: { value: o.grain }, uWDirt: { value: o.dirt },
    uWStreak: { value: o.streak }, uWMoss: { value: o.moss }, uWChip: { value: o.chip },
    uWRust: { value: o.rust }, uWWet: { value: o.wet }, uWBump: { value: o.bump },
    uWMossCol: { value: new THREE.Color(o.mossColor) },
    uWOff: { value: o.offset ? o.offset.clone() : new THREE.Vector3() },
  };
  mat.userData.weather = u;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + PARS_V)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + MAIN_V);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS_F)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + ALBEDO_F)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + ROUGH_F)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + NORMAL_F);
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
  mat.customProgramCacheKey = () => 'weather4' + (prev && prevKey ? prevKey() : '');
  return mat;
}

// params: MeshStandardMaterial params; w: weathering options (see W_DEFAULTS)
export function weathered(params = {}, w = {}) {
  return applyWeather(new THREE.MeshStandardMaterial(params), w);
}

// ---- Presets (each call returns a NEW material; cache them yourself) ----
export const Mats = {
  // prefab concrete panel, grey with a cool cast
  concrete: (o = {}) => weathered(
    { color: o.color ?? 0x8d8f92, roughness: 0.93, metalness: 0.0 },
    { tex: 0.33, grain: 0.85, dirt: 0.75, streak: 0.9, moss: 0.3, wet: 0.22, bump: 0.012, ...o.w }),
  // darker structural concrete (slabs, undersides)
  concreteDark: (o = {}) => weathered(
    { color: o.color ?? 0x5d5f62, roughness: 0.95, metalness: 0.0 },
    { tex: 0.33, grain: 0.9, dirt: 0.85, streak: 0.8, moss: 0.35, wet: 0.25, bump: 0.014, ...o.w }),
  // painted armor plating (legs): pale, chipped, rusty
  paintedMetal: (o = {}) => weathered(
    { color: o.color ?? 0xa9aba6, roughness: 0.5, metalness: 0.35 },
    { tex: 0.30, grain: 0.45, dirt: 0.7, streak: 0.8, moss: 0.08, chip: 0.55, rust: 0.5, wet: 0.55, bump: 0.008, ...o.w }),
  // dark structural steel
  steel: (o = {}) => weathered(
    { color: o.color ?? 0x3c4046, roughness: 0.48, metalness: 0.85 },
    { tex: 0.35, grain: 0.5, dirt: 0.6, streak: 0.5, moss: 0.03, chip: 0.0, rust: 0.42, wet: 0.5, bump: 0.006, ...o.w }),
  // heavily rusted steel
  rust: (o = {}) => weathered(
    { color: o.color ?? 0x5a3a26, roughness: 0.85, metalness: 0.3 },
    { tex: 0.4, grain: 0.8, dirt: 0.7, streak: 0.6, moss: 0.05, rust: 0.85, wet: 0.2, bump: 0.012, ...o.w }),
  // polished hydraulic rod
  chrome: (o = {}) => weathered(
    { color: o.color ?? 0xcfd6dc, roughness: 0.14, metalness: 1.0 },
    { tex: 0.5, grain: 0.15, dirt: 0.25, streak: 0.25, moss: 0, rust: 0.12, wet: 0.2, bump: 0.002, ...o.w }),
  // cables, hoses, rubber
  rubber: (o = {}) => new THREE.MeshStandardMaterial({ color: o.color ?? 0x0c0d0f, roughness: 0.62, metalness: 0.0 }),
  // generic painted surface (window frames, railings)
  paint: (o = {}) => weathered(
    { color: o.color ?? 0xb9bcb8, roughness: 0.6, metalness: 0.1 },
    { tex: 0.5, grain: 0.4, dirt: 0.6, streak: 0.6, moss: 0.08, chip: 0.25, rust: 0.3, wet: 0.3, bump: 0.004, ...o.w }),
  // unlit-looking emitter (lamps); bloom picks it up. intensity ~ 2..12
  lamp: (o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? 0xffb060).multiplyScalar(o.intensity ?? 4), toneMapped: false }),
};
