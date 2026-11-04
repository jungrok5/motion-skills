// aesthetics-film · look.js — the look as numbers. A shot names one light preset; the preset sets the background and
// fog (the "paper" every far thing dissolves into), the sun and sky light, the grade, and whether the chrome (badge,
// subtitles) is written in ink on paper ("ink") or in pale text over a darker frame ("pale").
// Values were matched by eye against stills of the source film (see references/LOOK.md).

export const PAPER = "#ebe7dd";      // rice paper: background of the ink chapters and the title card
export const INK = "#1d1f21";        // text and darkest ink
export const SEAL = "#a3302b";       // seal red: chapter badge, seal stamp, accent characters on paper
export const GOLD = "#c9a76a";       // accent characters on dark frames, callout rules

export const LIGHTS = {
  // ink landscape on paper: no sun shading to speak of, everything far melts into the paper
  paper:    { bg: PAPER, fog: PAPER, fogNear: 30, fogFar: 520, hemi: ["#ffffff", "#d8d2c4", 1.6], sun: ["#ffffff", 0.9], az: 30, el: 55, shadow: false, exposure: 1.0, sat: 0.35, warm: 0.0, contrast: 1.0, chrome: "ink" },
  // a soft overcast garden: gentle sun, long soft shadows, pale grey-green distance
  garden:   { bg: "#d9dcd6", fog: "#d4d7d0", fogNear: 25, fogFar: 260, hemi: ["#eef2f4", "#7d7a68", 1.25], sun: ["#fff3df", 2.2], az: -35, el: 38, shadow: true, exposure: 1.0, sat: 0.82, warm: 0.04, contrast: 1.04, chrome: "pale" },
  // under a roof: warm, lower key, light coming from the open side
  interior: { bg: "#c8c3b6", fog: "#c9c4b6", fogNear: 18, fogFar: 160, hemi: ["#f2ece0", "#5d4c3c", 1.0], sun: ["#ffe8c8", 2.6], az: -60, el: 30, shadow: true, exposure: 1.05, sat: 0.85, warm: 0.07, contrast: 1.06, chrome: "pale" },
  // late afternoon gold (bronze, wood, lacquer read rich)
  golden:   { bg: "#d8c9a8", fog: "#d6c6a2", fogNear: 25, fogFar: 240, hemi: ["#f6e2bc", "#5a4632", 1.0], sun: ["#ffd29a", 3.0], az: 70, el: 14, shadow: true, exposure: 1.0, sat: 0.9, warm: 0.1, contrast: 1.08, chrome: "pale" },
  // a dim hall lit by one warm source; for joinery / lacquer / gold-thread moments
  hall:     { bg: "#2c2620", fog: "#2b251f", fogNear: 12, fogFar: 90, hemi: ["#8a7058", "#1a1410", 0.55], sun: ["#ffcf94", 3.2], az: 40, el: 50, shadow: true, exposure: 1.1, sat: 0.9, warm: 0.12, contrast: 1.1, chrome: "pale" },
  // blue night with a moon: lanterns, paper windows and gold lines glow
  night:    { bg: "#1f2a38", fog: "#223042", fogNear: 20, fogFar: 300, hemi: ["#5d7392", "#141820", 0.7], sun: ["#b8c8e8", 1.0], az: 20, el: 40, shadow: true, exposure: 1.0, sat: 0.75, warm: -0.05, contrast: 1.05, chrome: "pale" },
  // snow / mist white, cool
  snow:     { bg: "#e6e8ea", fog: "#e4e7ea", fogNear: 25, fogFar: 300, hemi: ["#ffffff", "#9aa2aa", 1.4], sun: ["#f4f6ff", 1.4], az: 20, el: 30, shadow: true, exposure: 1.0, sat: 0.6, warm: -0.03, contrast: 1.0, chrome: "ink" },
};

/** chrome colours for each tone */
export const CHROME = {
  ink:  { text: INK, sub: "rgba(29,31,33,0.72)", accent: SEAL, shadow: null, rule: "rgba(29,31,33,0.35)" },
  pale: { text: "#f4f0e6", sub: "rgba(244,240,230,0.82)", accent: GOLD, shadow: "rgba(0,0,0,0.55)", rule: "rgba(244,240,230,0.45)" },
};
