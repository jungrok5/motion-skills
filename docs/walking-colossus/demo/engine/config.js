// Reads the project's colossus.js and fills in everything it leaves out, so every module sees one complete CFG.
// Units: metres, seconds. Y up, the walker travels along +X. Walker-local origin = centre of the BASE of the
// structure (the structure is y >= 0, its machinery / belly is below 0).
import * as C from '../colossus.js';

// The leg kit is designed at this size (LEG_SCALE = 1): thigh 12.5 m, shin 18 m, ankle 1.9 m above the ground.
export const LEG0 = { THIGH: 12.5, SHIN: 18.0, ANKLE_H: 1.9, FOOT_R: 2.9, CLAW_R: 5.0 };

const src = C.CFG || {};
const k = src.LEG_SCALE ?? 1;
export const CFG = {
  BODY_LEN: 88, BODY_DEPTH: 15, BODY_H: 19,
  RIDE_H: 17.0, CHASSIS_H: 4.5,
  LEG_X: [-33, -11, 11, 33], HIP_Y: -2.6, HIP_Z: 9.2, FOOT_Z: 23.0,
  SPLAY: 3.6, FOOT_DX: 1.5,
  ...src,
  LEG_SCALE: k,
  THIGH: LEG0.THIGH * k, SHIN: LEG0.SHIN * k, ANKLE_H: LEG0.ANKLE_H * k,
  FOOT_R: LEG0.FOOT_R * k, CLAW_R: LEG0.CLAW_R * k,
};
// foot home x (path frame) per hip column: given, or splayed away from the centre for a wide A-frame stance
if (!CFG.FOOT_X) {
  const xm = Math.max(...CFG.LEG_X.map(Math.abs)) || 1;
  CFG.FOOT_X = CFG.LEG_X.map((x) => x + CFG.FOOT_DX + Math.sign(x) * CFG.SPLAY * Math.abs(x) / xm);
}

export const GAIT = {
  T: 6.4,          // full leg cycle (s): heavier and taller -> longer
  duty: 0.70,      // fraction of the cycle a foot is planted
  stride: 13.0,    // metres the body travels during one stance
  lift: 4.6,       // max ankle lift in swing (m)
  bob: 0.34,       // body sink after each group touchdown (m)
  shudder: 0.07,   // damped shudder after each touchdown (m)
  surge: 0.35,     // fore-aft surge (m)
  sway: 0.28,      // side sway (m)
  roll: 0.013,     // roll (rad)
  shake: 0.16,     // camera shake amplitude from a footfall 0 m away (m)
  ...(C.GAIT || {}),
};

export const TITLE = C.TITLE || 'Colossus';
export const MODS = C.MODS || ['engine/mods/ground', 'engine/mods/legs', 'engine/mods/fx', 'engine/mods/atmo'];
export const GROUND = C.GROUND || {};
export const LOOK_OVERRIDES = C.LOOK || {};
export const DURATION = C.DURATION ?? 45;
export const TIMELINE = C.TIMELINE || [];
export const shotsFactory = C.shots || (() => ({}));
export const SOUND = C.SOUND || {};

// Where the atmosphere hangs its effects (walker-local unless noted). Derived from the box when not given.
const L2 = CFG.BODY_LEN / 2, D2 = CFG.BODY_DEPTH / 2, H = CFG.BODY_H;
const A = C.ANCHORS || {};
export const ANCHORS = {
  // volumetric warm halos in the post fog: [x, y, z, radius, r, g, b]
  glows: A.glows ?? [-1, 0, 1].flatMap((s) => [[s * L2 * 0.64, H * 0.47, D2 + 2.5, 7, 1.0, 0.55, 0.22], [s * L2 * 0.64, H * 0.47, -D2 - 2.5, 7, 1.0, 0.55, 0.22], [s * L2 * 0.64, -4, 0, 5, 0.8, 0.42, 0.16]]),
  // belly lamps: light cones, drips and moths hang from these
  lamps: A.lamps ?? [-0.82, -0.5, -0.17, 0.17, 0.5, 0.82].map((u, i) => [u * L2, -6.2, (i % 3 - 1) * 3.8]),
  // warm haze slabs in front of lit facades: [x, y, z, kind(1 +z face, 2 -z face, 3 +x end, 4 -x end), halfW, halfH, intensity]
  hazes: A.hazes ?? [
    ...[1, -1].flatMap((s) => [0, 1, 2, 3, 4].map((k) => [-L2 * 0.8 + k * L2 * 0.4, H * 0.5, s * (D2 + 2.7), s > 0 ? 1 : 2, 15, 11.5, 0.06])),
    [L2 + 2, H * 0.53, 0, 3, 9.5, 11, 0.05], [-L2 - 2, H * 0.53, 0, 4, 9.5, 11, 0.05]],
  smoke: A.smoke ?? [],                       // chimneys / funnels: smoke rises from these
  vents: A.vents ?? [[-L2 * 0.7, -4.9, D2 * 0.7], [0, -5.1, -D2 * 0.7], [L2 * 0.7, -4.9, D2 * 0.7]],   // belly steam
  rain: A.rain ?? { x: L2 + 2, y0: -6.5, y1: H + 5, z: D2 + 1.2, lit: H + 2 },   // rain lit by windows near the faces
  drips: A.drips ?? { x: L2 - 1, y: -4.45, z: D2 + 0.6 },                     // drips from the belly edge
  spill: A.spill ?? { halfLen: L2 - 4, y: 11 },                               // warm spill on the fog banks
};
