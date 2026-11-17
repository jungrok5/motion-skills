// colossus.js — 「__TITLE__」. The one file that says what this colossus is (plain data + shot functions;
// it must import nothing). Every number comes from BRIEF.md. See references/MODULES.md for each field.
export const TITLE = '__TITLE__';

export const CFG = {
  BODY_LEN: __LEN__, BODY_DEPTH: __DEPTH__, BODY_H: __HEIGHT__,   // the structure's box (walker-local, origin = base centre)
  RIDE_H: 17.0, CHASSIS_H: 4.5,                // base height above the ground; machinery band below it
  LEG_X: __LEGX__,                             // hip columns along X (one leg each side per column)
  HIP_Y: -2.6, HIP_Z: __HIPZ__, FOOT_Z: __FOOTZ__,
  SPLAY: 3.6, FOOT_DX: 1.5,                    // feet splay outward along X (or give FOOT_X: [...])
  LEG_SCALE: 1,                                // 1 = thigh 12.5 m, shin 18 m
  LEG_PAINT: {},                               // { armorA, armorB, armorY, cyl, mud, claw } hex colours
};

// mass sets the timing (references/GAIT.md)
export const GAIT = { T: 6.4, duty: 0.70, stride: 13.0, lift: 4.6, bob: 0.34, shudder: 0.07, surge: 0.35, sway: 0.28, roll: 0.013, shake: 0.16 };

// overrides of the engine's blue-dusk LOOK (references/LOOK.md); colours as linear [r, g, b]
export const LOOK = {};

export const MODS = ['engine/mods/ground', 'mods/body', 'engine/mods/legs', 'engine/mods/fx', 'engine/mods/atmo'];

// where the fog glows, lamp cones, smoke and drips hang (walker-local); omitted keys are derived from the box
export const ANCHORS = {};

// the ground (references/MODULES.md#ground): mud share, puddles, ruts, plants, dressing for the shots
export const GROUND = { hero: [], keepClear: [] };

export const SOUND = { step: { pitch: 34, metal: 0.6, ground: 'mud' }, life: [] };

export const DURATION = 45;
export const TIMELINE = [
  { shot: 'f_open', start: 0, end: 5.5 }, { shot: 'f_side', start: 5.5, end: 11 }, { shot: 'f_hero', start: 11, end: 16.5 },
  { shot: 'f_foot', start: 16.5, end: 20.5 }, { shot: 'f_belly', start: 20.5, end: 26 }, { shot: 'f_life', start: 26, end: 31.5 },
  { shot: 'f_knee', start: 31.5, end: 35.5 }, { shot: 'f_puddle', start: 35.5, end: 40.5 }, { shot: 'f_away', start: 40.5, end: 45 },
];

// First-pass cameras framed from the box. Re-aim every one at a real footfall: `node <skill>/scripts/check.mjs --events`.
export function shots({ P, lerp, ease, CFG }) {
  const L2 = CFG.BODY_LEN / 2, H = CFG.BODY_H, R = CFG.RIDE_H, FZ = CFG.FOOT_Z, FX = CFG.FOOT_X;
  return {
    f_open: { cam: (tl, t) => { const k = ease(tl / 5.5), r = ease((tl - 2.3) / 2.4);
      return { pos: [L2 * 2.6, 0.45 + 0.3 * k, FZ + 25], tgt: [L2 * 0.3, R + H * 0.3, 0], fov: 31, dof: { focus: lerp(2.5, L2 * 2.6, r), aperture: 3, maxBlur: 22 }, shake: 1.6, post: { fade: ease(tl / 1.3) } }; } },
    f_side: { cam: (tl) => ({ pos: [lerp(-10, 6, tl / 5.5), 4.5, L2 * 3.5], tgt: [0, R + H * 0.25, 0], fov: 29, shake: 0.6 }) },
    f_hero: { cam: (tl) => { const k = tl / 5.5; return { pos: [lerp(-L2 * 1.9, -L2 * 1.6, k), 1.8, lerp(L2 * 1.4, L2 * 1.15, k)], tgt: [0, R + H * 0.25, 0], fov: 44, shake: 1.2 }; } },
    f_foot: { cam: (tl) => ({ pos: [FX[Math.min(2, FX.length - 1)] + 11, 0.5, FZ + 11], tgt: [FX[Math.min(2, FX.length - 1)] - 2, 9, FZ - 4], fov: 56, shake: 2.2, dof: { focus: 15, aperture: 1.6 } }) },
    f_belly: { cam: (tl) => ({ pos: [L2 * 0.4, 1.3, 2], tgt: [-L2 * 0.2, R, 0], fov: 60, shake: 1.4 }) },
    f_life: { cam: (tl) => { const e = ease(tl / 5.5); return { pos: [lerp(-L2 * 0.6, -L2 * 0.35, tl / 5.5), R + H * lerp(0.2, 0.6, e), CFG.BODY_DEPTH / 2 + 14], tgt: [lerp(-L2 * 0.5, -L2 * 0.25, tl / 5.5), R + H * lerp(0.22, 0.62, e), 0], fov: 33, shake: 0.35 }; } },
    f_knee: { cam: (tl) => ({ pos: [lerp(-L2 * 0.8, -L2 * 0.7, tl / 4), 10, FZ + 24], tgt: [CFG.LEG_X[0] + 6, 12, FZ - 2], fov: 40, shake: 1.2 }) },
    f_puddle: { cam: (tl) => ({ pos: [L2 * 1.2, 1.2, FZ + 20], tgt: [0, R * 0.6, 0], fov: 56, shake: 1.4 }) },
    f_away: { cam: (tl) => { const e = ease(tl / 4.5); return { pos: [-L2 * 2 - 8 * e, 5 + 24 * e, -L2 * 0.8], tgt: [-6, R + 3 * e, 0], fov: 36, shake: 0.8, post: { fade: 1 - ease((tl - 2.9) / 1.55) } }; } },
  };
}
