// colossus.js — Walking Block (the source film, ported onto the engine as the style example).
// A colossal Soviet panel apartment block on eight hydraulic legs, crossing a wet field in blue dusk fog.
// Source: https://github.com/Leonxlnx/walking-block (MIT). Every number here is the source film's.
export const TITLE = 'Walking Block';

// The structure's box and the stance (metres, walker-local, origin = centre of the BASE of the block).
export const CFG = {
  BODY_LEN: 88, BODY_DEPTH: 15, BODY_H: 19,   // lit facade 88 × 15 m, about 19 m of flats
  FLOOR_H: 3.0, FLOORS: 6,                     // used by mods/building.js
  RIDE_H: 17.0, CHASSIS_H: 4.5,                // block base 17 m above the ground; machinery band below it
  LEG_X: [-33, -11, 11, 33],                   // 4 legs a side
  HIP_Y: -2.6, HIP_Z: 9.2, FOOT_Z: 23.0,
  FOOT_X: [-36.5, -11.7, 14.7, 39.5],          // feet splay out along X too (wide A-frame stance)
  LEG_SCALE: 1,                                // thigh 12.5 m, shin 18 m
};

// Mass sets the timing: a 6-storey block takes 6.4 s per leg cycle and walks at ~2.9 m/s.
export const GAIT = { T: 6.4, duty: 0.70, stride: 13.0, lift: 4.6, bob: 0.34, shudder: 0.07, surge: 0.35, sway: 0.28, roll: 0.013, shake: 0.16 };

// The engine's default LOOK is this film's blue dusk; nothing to override.
export const LOOK = {};

export const MODS = ['engine/mods/ground', 'mods/building', 'mods/chassis', 'engine/mods/legs', 'engine/mods/fx', 'engine/mods/atmo'];

// Where the atmosphere hangs its effects (walker-local).
const BELLY_LAMPS = [[-36, -6.0, 3.8], [-22, -6.9, 0], [-7.5, -6.2, -3.8], [7.5, -6.2, 3.8], [22, -6.9, 0], [36, -6.0, -3.8]];
export const ANCHORS = {
  glows: [-1, 0, 1].flatMap((k) => [[k * 28, 9, 10, 7, 1.0, 0.55, 0.22], [k * 28, 9, -10, 7, 1.0, 0.55, 0.22], [k * 28, -4, 0, 5, 0.8, 0.42, 0.16]]),
  lamps: BELLY_LAMPS,
  hazes: [
    ...[1, -1].flatMap((s) => [0, 1, 2, 3, 4].map((k) => [-35 + k * 17.5, 9.5, s * 10.2, s > 0 ? 1 : 2, 15, 11.5, 0.06])),
    [46, 10, 0, 3, 9.5, 11, 0.05], [-46, 10, 0, 4, 9.5, 11, 0.05]],
  smoke: [[-39, 20.4, 1.5], [-21, 23.5, -2], [-3, 17.5, 2.2], [5.5, 17.3, -2.5], [20, 20.4, -1], [38, 23.5, 1.2]],   // roof chimneys
  vents: [[-30, -4.9, 5.5], [-4, -5.1, -5], [14, -4.9, 6], [33, -5.1, -4.5], [-45.2, -2.6, 3]],
  rain: { x: 46, y0: -6.5, y1: 24.5, z: 8.7, lit: 24 },
  drips: { x: 43, y: -4.45, z: 8.1 },
  spill: { halfLen: 40, y: 11 },
};

// The wet dusk field.
export const GROUND = {
  puddle: { cell: 22, p: 0.30 },
  hero: [
    [66.6, 38.0, 9.5, 3.6, 0.574],     // in front of the `ref6` view
    [-40.0, 30.5, 4.0, 2.2, 0.3],
    [-6.0, 44.0, 5.0, 2.4, -0.4],
    [132.6, 36.8, 6.0, 4.3, 0.985],    // f_puddle: long axis along the lens, near rim ~2 m from the camera
  ],
  mud: 0.12, ruts: { z: 35 },
  tint: [2.0, 1.55, 0.68],             // olive, clearly green under the blue dusk light
  glow: [0.42, 0.17, 0.045],           // amber windows smeared on the wet ground
  keepClear: [[150, 50, 6], [136, 43.8, 5], [86, 34, 3], [75.8, 44, 5], [134, 40, 9], [-38, 52, 10], [30, -36, 10]],
  scenery(k) {
    k.fenceRun(119.5, 45.5, 123.3, 38.5, 2.6, 0.0);
    k.fenceRun(-30, 47, -21.5, 38, 2.8, 0.15);
    for (const [x, z, s] of [[113, 43.5, 2.0], [100.5, 31.5, 1.3], [-12, 41, 2.6], [-14.5, 42.5, 1.5], [60, 52, 1.8], [-33, 44.5, 2.2], [96, 44, 2.6], [138, 33.5, 1.4]]) k.bushAt(x, z, s);
  },
  dressing(k) {
    // f_puddle / f_open cluster around the hero puddle (132.6, 36.8)
    k.tyre(125.1, 39.4, 0.18, 0.4, 0.07);
    k.plank(130.6, 41.2, 0.9, 2.6, 0.04); k.plank(131.3, 40.6, 0.35, 1.7, -0.05, 0.05); k.plank(127.4, 31.6, 2.3, 2.2);
    k.chunk(134.9, 30.6, 1.3, 0.55, 0.8, 0.5, 0.22, 3); k.chunk(136.4, 31.5, 0.5, 0.3, 0.4, 1.9, 0.3, 1);
    k.sign(134.8, 50.6, 0.5, 0.33);
    k.chunk(141.5, 39.5, 0.7, 0.35, 0.5, 1.1, 0.25, 1);
    // f_foot foreground
    k.chunk(80.9, 32.4, 0.9, 0.42, 0.6, 0.8, 0.28, 2); k.plank(84.2, 30.6, 1.9, 2.0, 0.06); k.tyre(78.2, 34.6, 0.5, 1.2, 0.02);
    // f_hero mid-ground
    k.pipe(-24.6, 39.6, 0.7); k.chunk(-27.5, 41.5, 1.1, 0.5, 0.7, 2.2, 0.2, 2); k.plank(-40.5, 51.2, 0.4, 2.8, 0.03);
    k.tyre(-58.5, 49.5, 0.1, 2.0); k.chunk(-62.0, 46.5, 0.8, 0.4, 0.55, 0.3, 0.3, 2);
    k.plank(71.5, 41.5, 1.2, 2.2); k.tyre(61.5, 43.5, 0.3, 0.7, 0.06); k.chunk(64.0, 45.5, 0.9, 0.4, 0.6, 1.4, 0.25, 2);
    k.chunk(-36.5, 33.5, 0.8, 0.4, 0.6, 0.6, 0.3, 2); k.plank(-44.0, 34.5, 2.6, 2.4);
  },
};

// ---------------------------------------------------------------- the film: nine shots, 45 s
export const DURATION = 45;
export const TIMELINE = [
  { shot: 'f_open', start: 0, end: 5.5 },     // something huge in the fog; rack focus from wet grass
  { shot: 'f_side', start: 5.5, end: 11 },    // long-lens side elevation: the whole thing
  { shot: 'f_hero', start: 11, end: 16.5 },   // low 3/4 hero
  { shot: 'f_foot', start: 16.5, end: 20.5 }, // worm's-eye: a foot slams down by the lens
  { shot: 'f_belly', start: 20.5, end: 26 },  // the belly passes overhead
  { shot: 'f_life', start: 26, end: 31.5 },   // life goes on: balconies, laundry, lit rooms
  { shot: 'f_knee', start: 31.5, end: 35.5 }, // the machine: knee and pistons lift and slam
  { shot: 'f_puddle', start: 35.5, end: 40.5 },// mirror: a puddle, a foot plants behind it
  { shot: 'f_away', start: 40.5, end: 45 },   // crane up behind it as it walks into the fog
];

// Positions in the PATH FRAME (origin travels with the walker) unless `world: true`.
export function shots({ P, lerp, ease }) {
  return {
    // look-dev views matching the source film's six reference images
    ref1: { cam: () => ({ pos: [-46.5, 0.55, 26.5], tgt: [-18, 15.5, 6], fov: 58, dof: { focus: 14, aperture: 2.2 } }) },
    ref2: { cam: () => ({ pos: [-78, 2.0, 58], tgt: [-2, 21, 0], fov: 44 }) },
    ref3: { cam: () => ({ pos: [92, 2.6, 86], tgt: [-4, 22, 0], fov: 36 }) },
    ref4: { cam: () => ({ pos: [0, 5.0, 205], tgt: [0, 21, 0], fov: 27 }) },
    ref5: { cam: () => ({ pos: [-62, 1.3, 2], tgt: [-18, 19, 0], fov: 62 }) },
    ref6: { cam: () => ({ pos: [70, 0.8, 44], tgt: [2, 19, 0], fov: 50, dof: { focus: 60, aperture: 1.2 } }) },
    f_open: { cam: (tl, t) => {
      const k = ease(tl / 5.5), r = ease((tl - 2.3) / 2.4);
      return { world: true, pos: [150 - 2.0 * k, 0.40 + 0.35 * k, 50], tgt: [P(t) + 22, 13 + 5 * k, 2], fov: 31 - 2.5 * k,
        dof: { focus: lerp(2.2, 95, r), aperture: 3.2, maxBlur: 22 }, shake: 1.7, post: { fade: ease(tl / 1.3) } };
    } },
    f_side: { cam: (tl) => {
      const k = tl / 5.5;
      return { pos: [lerp(-14, 6, k), 4.2, lerp(158, 146, k)], tgt: [lerp(-5, 2, k), 18.2, 0], fov: 29, shake: 0.6 };
    } },
    f_hero: { cam: (tl) => {
      const k = tl / 5.5;
      return { pos: [lerp(-84, -70, k), lerp(1.7, 2.4, k), lerp(60, 50, k)], tgt: [lerp(-8, 2, k), lerp(18.5, 20.5, k), 0], fov: lerp(42, 46, k), shake: 1.2,
        dof: { focus: 78, aperture: 0.9 } };
    } },
    // leg 2 plants at t = 18.752, x = 75.6, z = 18 (see `node <skill>/scripts/check.mjs --events`)
    f_foot: { cam: (tl) => {
      const k = ease(tl / 4.0);
      return { world: true, pos: [86.7 - 1.2 * k, 0.5 + 0.1 * k, 34.0], tgt: [lerp(72.2, 68.2, k), lerp(8.5, 12, k), lerp(20, 13, k)], fov: 56, shake: 2.4,
        dof: { focus: 15, aperture: 1.6 } };
    } },
    f_belly: { cam: (tl, t) => {
      const k = tl / 5.5;
      return { world: true, pos: [P(23.2) + 14, 1.25, 1.5], tgt: [P(t) - 14 + 8 * k, 17.0, lerp(-1.5, 1.0, k)], fov: 60, shake: 1.5 };
    } },
    f_life: { cam: (tl) => {
      const k = tl / 5.5, e = ease(k);
      return { pos: [lerp(-27, -15, k), lerp(21.0, 30.0, e), lerp(21.5, 19.5, k)], tgt: [lerp(-22, -11, k), lerp(22.0, 29.5, e), 7.5], fov: 33, shake: 0.35,
        dof: { focus: 13.5, aperture: 2.4 } };
    } },
    f_knee: { cam: (tl) => {
      const k = tl / 4.0;
      return { pos: [lerp(-36, -32, k), lerp(9.5, 12, k), lerp(46, 42, k)], tgt: [-15, lerp(11.5, 13.5, k), 21], fov: 40, shake: 1.2,
        dof: { focus: 29, aperture: 1.6 } };
    } },
    f_puddle: { cam: (tl) => {
      const k = tl / 5.0;
      return { world: true, pos: [136.6 - 1.2 * k, 1.25 + 0.25 * k, 43.8], tgt: [lerp(104, 112, k), lerp(8.5, 10.5, k), 0], fov: 56, shake: 1.4,
        dof: { focus: 46, aperture: 0.9 } };
    } },
    f_away: { cam: (tl, t) => {
      const k = tl / 4.5, e = ease(k);
      return { world: true, pos: [P(40.5) - 84 - 8 * k, 5.0 + 24.0 * e, -36 + 4 * k], tgt: [P(t) - 6, 18.5 + 3 * e, 0], fov: 36, shake: 0.8,
        post: { fade: 1 - ease((tl - 2.9) / 1.55) } };
    } },
  };
}
