// colossus.js — 「Low Tide」: a stranded container ship walks out across the mudflats at first light.
// The worked example of a NEW topic (see BRIEF.md). Plain data + shot functions; imports nothing.
export const TITLE = 'Low Tide';

export const CFG = {
  BODY_LEN: 110, BODY_DEPTH: 20, BODY_H: 26,  // hull 110 × 20 m; containers / accommodation to +26 m over the keel
  HULL_D: 12,                                  // keel -> main deck (used by mods/ship.js)
  RIDE_H: 15.5, CHASSIS_H: 2.0,                // keel 15.5 m above the mud
  LEG_X: [-44, -22, 0, 22, 44],                // 5 legs a side
  HIP_Y: 3.2, HIP_Z: 10.8, FOOT_Z: 22.0,
  SPLAY: 4.0, FOOT_DX: 0.8,
  LEG_SCALE: 0.92,
  LEG_PAINT: { armorA: 0x8f978c, armorB: 0x6f776f, armorY: 0x8d8a74, cyl: 0x4f5652, mud: 0x3b3630, claw: 0x7d7a72 },
};

// heavier than the block: slower cycle, deeper sink, and it rolls like a ship
export const GAIT = { T: 7.6, duty: 0.72, stride: 12.0, lift: 3.8, bob: 0.42, shudder: 0.09, surge: 0.4, sway: 0.34, roll: 0.022, shake: 0.2 };

// overcast dawn over the flats: grey-rose sky brighter low in the east (ahead, +X), pale fog, low warm-grey key
export const LOOK = {
  zenith: [0.070, 0.078, 0.100], horizon: [0.205, 0.172, 0.165],
  skyGlowDir: [1.0, 0.06, 0.15], skyGlow: 0.85,
  fogColor: [0.150, 0.136, 0.136], mistColor: [0.185, 0.172, 0.168],
  fogDensity: 0.0026, mistDensity: 0.018, mistHeight: 2.4,
  hemiSky: [0.78, 0.74, 0.74], hemiGround: [0.050, 0.044, 0.040], hemiIntensity: 2.0,
  keyColor: [1.0, 0.86, 0.74], keyIntensity: 1.1, keyDir: [0.75, 0.55, -0.35],
  envIntensity: 0.7, exposure: 1.0, bloom: 0.55, saturation: 1.0, contrast: 1.08,
  lift: [0.006, 0.005, 0.006], vignette: 0.28, grain: 0.022,
};

export const MODS = ['engine/mods/ground', 'mods/ship', 'engine/mods/legs', 'engine/mods/fx', 'engine/mods/atmo'];

// where the atmosphere hangs its effects (walker-local; keel = y 0)
export const ANCHORS = {
  glows: [[-46, 17, 11.5, 6, 1.0, 0.55, 0.22], [-46, 17, -11.5, 6, 1.0, 0.55, 0.22], [-46, 24, 0, 6, 0.9, 0.5, 0.2],
    [-20, -1.5, 0, 5, 0.8, 0.42, 0.16], [20, -1.5, 0, 5, 0.8, 0.42, 0.16], [50, 15, 0, 4, 0.7, 0.38, 0.15]],
  lamps: [[-33, -0.4, 4], [-11, -0.4, -4], [11, -0.4, 4], [33, -0.4, -4]],     // work lights under the hull
  hazes: [[-46, 18, 11.8, 1, 7, 5, 0.06], [-46, 18, -11.8, 2, 7, 5, 0.06], [-52.5, 18, 0, 4, 9, 5, 0.05]],
  smoke: [[-53, 33.5, 0]],                                                  // the funnel
  vents: [[-30, 0, 9.5], [8, 0, -9.5], [36, 0, 9.5]],                       // water still running off the hull
  rain: { x: 55, y0: 0, y1: 30, z: 11.2, lit: 28 },
  drips: { x: 52, y: 0.15, z: 8.6 },
  spill: { halfLen: 50, y: 6 },
};

// the mudflat
export const GROUND = {
  puddle: { cell: 17, p: 0.72 },
  hero: [
    [141.0, 35.0, 8.5, 4.6, 0.35],     // f_open: the water sheet the lens sits in
    [70.5, 24.0, 6.0, 4.2, 0.25],      // f_foot: leg 3 plants into it at t 18.20 (70.7, 22)
    [-20.0, 36.0, 7.0, 3.6, 0.2],
    [111.0, 37.0, 8.0, 4.6, 1.08],     // f_puddle: the mirror, long axis along the lens
  ],
  mud: 0.95, ruts: null,
  tint: [1.55, 1.42, 1.28],            // grey-brown estuary mud under a pale sky
  grassMul: [0.9, 0.85, 0.7], soilMul: [1.25, 1.18, 1.1], vegTint: [0.95, 0.9, 0.82],
  glow: [0.26, 0.11, 0.03],            // cabin light smeared on the wet mud
  veg: { grassNear: 0.0, grassMid: 0.12, grassTall: 0.18, weeds: 0, umbels: 0, stalksFar: 0.3, reeds: 0.55, stones: 1.6 },
  far: { trees: 0, shrubs: 6, poles: false },
  fences: [],
  bushes: 0, debris: 14, debrisMix: [0.35, 0.8, 1.0],
  keepClear: [[141, 35, 9], [70.5, 24, 7], [111, 37, 10], [79, 33, 4]],
  scenery(k) {
    // rows of old oyster stakes leaning out of the mud (dark, weed-fouled wood)
    const stake = (x, z, h, lean, yaw) => {
      const top = [x + Math.cos(yaw) * lean * h, h, z + Math.sin(yaw) * lean * h];
      const c = 0.6 + 0.6 * k.r();
      k.parts.push(k.colorize(k.tube([[x, -0.2, z], [(x + top[0]) / 2, h * 0.5, (z + top[2]) / 2], top], 0.075, 0.05, 6), [0.032 * c, 0.028 * c, 0.022 * c]));
    };
    const row = (x0, z0, x1, z1, step) => { const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / step); for (let i = 0; i <= n; i++) { if (k.r() < 0.12) continue; const u = i / n; stake(x0 + (x1 - x0) * u + (k.r() - 0.5) * 0.4, z0 + (z1 - z0) * u + (k.r() - 0.5) * 0.4, 0.8 + k.r() * 1.1, 0.05 + k.r() * 0.18, k.r() * 6.28); } };
    row(60, 36, 160, 41, 1.6); row(128, 31, 150, 30, 1.4); row(70, 27.5, 120, 26.5, 1.7); row(-60, 34, 40, 40, 1.8); row(-80, -40, 60, -46, 1.8); row(95, 47, 112, 60, 1.5);
  },
  dressing(k) {
    // a mooring buoy, tyres, a plank: what the tide left
    k.put(new k.THREE.SphereGeometry(0.55, 12, 8), [0.12, 0.05, 0.03], 135.5, 0.35, 41.5);
    k.tyre(143.5, 39.8, 0.3, 1.1, 0.06); k.plank(138.0, 32.5, 0.6, 2.2, 0.03);
    k.tyre(97.5, 37.0, 0.2, 0.6, 0.08); k.tyre(83.0, 35.5, 0.4, 1.4, 0.05);
    k.plank(99.5, 29.0, 0.9, 2.4, 0.03); k.chunk(104.0, 31.0, 0.9, 0.4, 0.6, 0.5, 0.25, 0);
  },
};

// ---------------------------------------------------------------- sound
export const SOUND = {
  step: { pitch: 31, metal: 0.8, ground: 'water' },
  wind: 0.6, rain: 0, hydraulic: 0.8, groan: 0.9,
  music: { level: 0.24, root: 32.70, bars: 5, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-7, 0, 5, 12], [-5, 2, 7, 14], [0, 7, 12, 15]], swell: [[10, 15, 1.0], [37, 40, 0.9]] },
  life: [
    { kind: 'horn', at: [0.9], gain: 0.5, x: 30, z: 0, y: 25, follow: true },
    { kind: 'gulls', every: 4.5, offset: 1.2, gain: 0.16 },
    { kind: 'bell', shot: 'f_life', at: [25.6], gain: 0.22, x: -46, z: 11, y: 30, follow: true },
  ],
  persp: { f_open: { g: 1, lp: 900 }, f_side: { g: 0.9, lp: 1200 }, f_life: { g: 0.45, lp: 1500 }, f_away: { g: 0.9, lp: 2000 } },
};

// ---------------------------------------------------------------- the film: nine beats, 40 s
export const DURATION = 40;
export const TIMELINE = [
  { shot: 'f_open', start: 0, end: 5 },
  { shot: 'f_side', start: 5, end: 10 },
  { shot: 'f_hero', start: 10, end: 15 },
  { shot: 'f_foot', start: 15, end: 19 },
  { shot: 'f_belly', start: 19, end: 24 },
  { shot: 'f_life', start: 24, end: 29 },
  { shot: 'f_knee', start: 29, end: 33 },
  { shot: 'f_puddle', start: 33, end: 37 },
  { shot: 'f_away', start: 37, end: 40 },
];

export function shots({ P, lerp, ease }) {
  return {
    f_open: { cam: (tl, t) => {
      const k = ease(tl / 5), r = ease((tl - 1.8) / 2.4);
      return { world: true, pos: [146 - 1.5 * k, 0.45 + 0.3 * k, 37.5], tgt: [P(t) + 20, 12 + 4 * k, 0], fov: 30 - 2 * k,
        dof: { focus: lerp(3.2, 95, r), aperture: 3.0, maxBlur: 22 }, shake: 1.4, post: { fade: ease(tl / 1.2) } };
    } },
    f_side: { cam: (tl) => {
      const k = tl / 5;
      return { pos: [lerp(-12, 4, k), 4.0, lerp(178, 168, k)], tgt: [lerp(-4, 2, k), 16, 0], fov: 30, shake: 0.6 };
    } },
    f_hero: { cam: (tl) => {
      const k = tl / 5;
      return { pos: [lerp(95, 80, k), lerp(1.6, 2.2, k), lerp(62, 52, k)], tgt: [lerp(10, 2, k), lerp(17, 19, k), 0], fov: lerp(44, 48, k), shake: 1.2,
        dof: { focus: 90, aperture: 0.9 } };
    } },
    f_foot: { cam: (tl) => {
      const k = ease(tl / 4);
      // leg 3 plants at t = 18.20 at (70.7, 22) (check.mjs --events)
      return { world: true, pos: [80.5 - 1.0 * k, 0.55 + 0.1 * k, 33.0], tgt: [lerp(69, 67, k), lerp(7.5, 11, k), lerp(21, 15, k)], fov: 56, shake: 2.2,
        dof: { focus: 14, aperture: 1.6 } };
    } },
    f_belly: { cam: (tl, t) => {
      const k = tl / 5;
      // the propeller passes over the lens at t ~ 22.8
      return { world: true, pos: [-4 + 1.0 * k, 1.3, 3.0], tgt: [P(t) - 18 - 8 * k, 15.0, lerp(-1.5, 1.5, k)], fov: 62, shake: 1.4 };
    } },
    f_life: { cam: (tl) => {
      const k = tl / 5, e = ease(k);
      return { pos: [lerp(-32, -38, k), lerp(30, 38, e), lerp(30, 28, k)], tgt: [lerp(-42, -45, k), lerp(31, 38.5, e), 9], fov: 34, shake: 0.35,
        dof: { focus: 21, aperture: 2.2 } };
    } },
    f_knee: { cam: (tl) => {
      const k = tl / 4;
      return { pos: [lerp(-8, -4, k), lerp(8, 10.5, k), lerp(47, 43, k)], tgt: [lerp(4, 6, k), lerp(11, 12.5, k), 20], fov: 40, shake: 1.2,
        dof: { focus: 27, aperture: 1.6 } };
    } },
    f_puddle: { cam: (tl) => {
      const k = tl / 4;
      // leg 3 plants at t = 33.40 at (104, 22), behind the mirror
      return { world: true, pos: [118.5 - 1.0 * k, 1.15 + 0.2 * k, 44.5], tgt: [lerp(96, 100, k), lerp(9, 11, k), 6], fov: 56, shake: 1.4,
        dof: { focus: 40, aperture: 0.9 } };
    } },
    f_away: { cam: (tl, t) => {
      const k = tl / 3, e = ease(k);
      return { world: true, pos: [P(37) - 100 - 6 * k, 4.5 + 20 * e, -30 + 3 * k], tgt: [P(t) - 10, 18 + 3 * e, 0], fov: 38, shake: 0.8,
        post: { fade: 1 - ease((tl - 1.6) / 1.35) } };
    } },
  };
}
