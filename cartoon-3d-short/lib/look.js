// cartoon-3d-short · look.js — the look as numbers: light presets (day / golden / night / interior), world colours
// (sky stops, water, clouds) and the colour grade per preset.
// day + golden are the bridge short's final values after four verifier rounds (mromidev/claude-animated-shorts
// templates/bridge/lights.ts + grade.ts, MIT); night and interior are this repo's own, built the same way.
//
// Light: the sun is CAMERA-RELATIVE and frozen per shot. az = degrees from the shot camera's forward axis
// (0 = sun straight ahead = backlight, +90 = screen right, 180 = behind the camera), el = elevation.
// lit / shade / lift are LINEAR RGB multipliers for the two-tone world shading (shade.js twoTone): albedo x
// mix(shade, lit, sunTerm). Cards (characters) take charTint etc. All sky / fog / water colours are ON-SCREEN targets:
// world.js writes untone(colour) so they land on screen after the Neutral tone map.

export const LIGHTS = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: "#9e9494", actorShadow: false,
    fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: null,
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: "#bfbde6", actorShadow: true,
    fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // moonlit blue (the reference switches to night-blue for the explanation beat): violet-blue key from high behind
  // the camera, deep indigo shade, warm practicals (windows, lamps) are emissive and bloom
  night: {
    az: 140, el: 38,
    lit: [0.62, 0.72, 1.12], shade: [0.13, 0.13, 0.3], lift: [0.03, 0.04, 0.12], lambert: 0.4, sideK: 0.8, term: 0.18,
    charTint: [0.74, 0.8, 1.0], charShade: 0.84, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.82, 0.84, 1.0],
    blob: "#7a7fa6", actorShadow: false,
    fog: "#2c3a72", fogNear: 30, fogFar: 260, sunDisc: "#f4f2e6",
    sunCol: "#b9c8ff", sunI: 2.0, sky: "#4a5aa0", ground: "#2a2440", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.02,
  },
  // indoors: warm window key from the side, soft lavender shade, no sky (rooms close the frame)
  interior: {
    az: 95, el: 32,
    lit: [1.5, 1.32, 1.06], shade: [0.34, 0.3, 0.42], lift: [0.06, 0.05, 0.1], lambert: 0.4, sideK: 0.86, term: 0.25,
    charTint: [1.0, 0.92, 0.84], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.9, 0.88, 0.98],
    blob: "#8f8080", actorShadow: false,
    fog: "#d9c7b0", fogNear: 40, fogFar: 400, sunDisc: null,
    sunCol: "#ffe2b8", sunI: 2.6, sky: "#f0e2cc", ground: "#9a7a60", hemiI: 0.5,
    bias: -0.0004, normalBias: 0.02,
  },
};

/** world-only colours per light: sky stops by elevation (deg), water, clouds, shaded-face bounce, albedo saturation */
export const LOOK = {
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", glint: "#ffffff" },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0], sat: 1.08, stars: 0,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", glint: "#ffe2b0" },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0], sat: 1.1, stars: 0,
  },
  night: {
    sky: { c: ["#4a5c9e", "#3a4a8c", "#2b3874", "#1f2a5c", "#141c42"], e: [0, 4, 10, 22, 50] },
    water: { near: "#1a2c5c", mid: "#22386e", far: "#3a4c8a", crest: "#7d8fd0", glint: "#f4f2e6" },
    cloud: { lit: "#9aa6d8", mid: "#6a76b0", shade: "#3e4880" },
    bounce: [0, 0, 0.02], sat: 1.05, stars: 1,
  },
  interior: {
    sky: { c: ["#f2e6d2", "#efe0c8", "#e8d6ba", "#e0ccae", "#d6c2a2"], e: [0, 4, 10, 20, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", glint: "#ffffff" },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.03, 0.02, 0.0], sat: 1.05, stars: 0,
  },
};

// Colour grade (display-referred, after the Neutral tone map): monotone cubic RGB curve through 7 knots at
// KX, saturation by zone, 3-way tint as (Cb, Cr) per zone, vignette [strength, start radius].
export const KX = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
export const GRADES = {
  day: { ky: [0, 0.1, 0.28, 0.6, 0.835, 0.945, 1], sat: [1.0, 1.05, 1.0], tintS: [0.01, 0.002], tintM: [0, 0], tintH: [0.006, 0], vig: [0.12, 0.45] },
  golden: { ky: [0, 0.09, 0.245, 0.54, 0.8, 0.93, 1], sat: [1.0, 1.12, 1.15], tintS: [0.02, 0.002], tintM: [0, 0], tintH: [-0.012, 0.006], vig: [0.2, 0.4] },
  night: { ky: [0, 0.085, 0.24, 0.55, 0.8, 0.93, 1], sat: [1.0, 1.1, 1.0], tintS: [0.03, 0.0], tintM: [0.012, -0.004], tintH: [-0.01, 0.006], vig: [0.24, 0.38] },
  interior: { ky: [0, 0.095, 0.27, 0.58, 0.83, 0.94, 1], sat: [1.0, 1.06, 1.02], tintS: [0.012, 0.004], tintM: [0, 0.004], tintH: [-0.006, 0.004], vig: [0.18, 0.42] },
};

/** Lens blur radius at infinity (px at 1080x1920) by shot size — the measured reference ladder (depth.md): wides
 *  and aerials sharp, medium shots 10-12, close-ups 12-14, extreme close-ups 15-16. */
export const DOF = { wide: 0, aerial: 0, est: 0, ms: 11, mcu: 12, cu: 13, ecu: 15.5, insert: 14 };
