// 「The Apple」 · score.js — a sketch of a score against the beats (check.mjs prints them):
// the page 0 · the umbrella 2.4 · the drop 6.2 · the apple 10.6 · real 13 · the close 14.6. The pencil scratches come from the drawing.
const C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81, C4 = 60, F4 = 65, A4 = 69;
export const SCORE = {
  reverb: { mix: .24, room: .82 },
  air: [{ t: 0, v: .08 }, { t: 9, v: .18 }, { t: 16, v: .06 }],
  box: [[E5, .6], [G5, .9], [A5, 1.2], [G5, 1.8], [E5, 2.1], [C5, 6.3], [D5, 6.9], [E5, 7.5], [G5, 8.1], [A5, 8.7], [G5, 9.5], [E5, 13.0], [G5, 13.2], [C5 + 12, 13.4]].map(([n, t]) => ({ t, n, v: .42 })),
  keys: [{ t: 13.0, n: F4 - 12, v: .4, d: 2 }, { t: 13.0, n: A4, v: .3, d: 2 }, { t: 15.0, n: C4 - 12, v: .35, d: 1.2 }],
  sfx: [{ t: 2.3, type: 'whoosh', d: .7, v: .3, pan: .4 }, { t: 5.9, type: 'fwump', v: .35 }, { t: 6.3, type: 'swell', d: 3, v: .2 }, { t: 10.2, type: 'step', v: .3 }, { t: 13.0, type: 'sparkle', d: 1, v: .55 }, { t: 15.0, type: 'paper', d: 1, v: .3 }],
};
