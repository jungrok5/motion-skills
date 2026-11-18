// Global look parameters (linear HDR values, pre-tonemap). The defaults are the source film's blue dusk;
// a project overrides any of them in colossus.js `LOOK` (colours / vectors as [r, g, b] / [x, y, z] arrays).
import * as THREE from 'three';
import { LOOK_OVERRIDES } from './config.js';

export const LOOK = {
  // sky
  zenith: new THREE.Color(0.040, 0.092, 0.218),
  horizon: new THREE.Color(0.066, 0.132, 0.262),
  skyGlowDir: new THREE.Vector3(-0.6, 0.12, -0.8).normalize(), // faint brighter side of the dusk sky
  skyGlow: 0.35,
  // fog
  fogColor: new THREE.Color(0.066, 0.130, 0.252),
  mistColor: new THREE.Color(0.105, 0.150, 0.225),   // paler, greyer ground mist,
  fogDensity: 0.0027,      // homogeneous extinction per meter
  mistDensity: 0.022,      // extra ground mist extinction at y=0
  mistHeight: 2.8,         // e-folding height of ground mist (m)
  mistNoise: 1.15,         // wispiness
  // lights
  hemiSky: new THREE.Color(0.70, 0.74, 0.82),
  hemiGround: new THREE.Color(0.035, 0.042, 0.040),
  hemiIntensity: 2.2,
  keyColor: new THREE.Color(0.90, 0.93, 1.0),
  keyIntensity: 1.25,
  keyDir: new THREE.Vector3(-0.35, 1.0, 0.45).normalize(),
  envIntensity: 0.6,
  ao: 0.85,                // ambient obscurance strength
  aoRadius: 1.8,           // world-space radius (m)
  // post
  exposure: 1.0,
  bloom: 0.62,
  bloomThreshold: 0.75,
  saturation: 1.06,
  contrast: 1.10,
  lift: new THREE.Color(0.002, 0.004, 0.009),
  vignette: 0.30,
  grain: 0.024,
  chroma: 0.0006,
};
for (const [k, v] of Object.entries(LOOK_OVERRIDES)) {
  const cur = LOOK[k];
  if (cur && cur.isColor && Array.isArray(v)) cur.setRGB(v[0], v[1], v[2]);
  else if (cur && cur.isVector3 && Array.isArray(v)) cur.set(v[0], v[1], v[2]).normalize();
  else LOOK[k] = v;
}

// GLSL sky function shared by the fog pass and the environment-map sky dome.
export const SKY_GLSL = /* glsl */`
uniform vec3 uZenith, uHorizon, uSkyGlowDir;
uniform float uSkyGlow;
vec3 skyColor(vec3 d) {
  float h = clamp(d.y, -0.2, 1.0);
  float t = 1.0 - exp(-max(h, 0.0) * 3.2);
  vec3 c = mix(uHorizon, uZenith, t);
  float g = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(uSkyGlowDir.x, 0.0, uSkyGlowDir.z))), 0.0);
  c += uHorizon * uSkyGlow * g * g * exp(-max(h, 0.0) * 5.0);
  return c;
}
`;
