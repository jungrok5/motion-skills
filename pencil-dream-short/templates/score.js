// 「Night Owl」 · score.js — written against the beats (check.mjs prints them):
// wake 0 · first mark 2.8 · spread 6 · giant 8.6 · swarm 11.8 · wash 12.6 · desk 13.6 · end 16.
// The pencil scratches come from the drawing itself (the film adds them). A music box for the boy, a low bell for the owl,
// a sparkle when its eyes open, flutter and a warm pad for the swarm and the wash, the room at the desk.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81;
const tune = [[G5, 2.9], [E5, 3.4], [C5, 3.9], [D5, 4.4], [E5, 5.0], [G5, 6.0], [A5, 6.5], [G5, 7.0], [E5, 7.6], [D5, 8.2], [C5, 8.8]];
export const SCORE = {
  reverb: { mix: .26, room: .84 },
  air: [{ t: 0, v: .04 }, { t: 13.6, v: .05 }, { t: 15, v: .12 }],
  box: [{ t: 1.6, n: E5, v: .35 }, { t: 1.9, n: G5, v: .3 }, ...tune.map(([n, t]) => ({ t, n, v: .5 })), { t: 14.2, n: C5, v: .35 }, { t: 14.5, n: G5, v: .3 }, { t: 15.0, n: E5 + 12, v: .3 }],
  keys: [{ t: 6, n: C4, v: .35, d: 2.5 }, { t: 6, n: G4, v: .25, d: 2.5 }, { t: 8.6, n: A4 - 12, v: .4, d: 3 }],
  bell: [{ t: 8.7, n: C4 - 12, v: .6 }, { t: 11.0, n: G4 - 12, v: .45 }],
  pad: [{ t: 8.7, d: 3, notes: [A4 - 24, E4 - 12, C4], v: .35 }, { t: 11.8, d: 4.2, notes: [F4 - 12, C4, A4, E5], v: .45 }],
  sfx: [{ t: 11.0, type: 'sparkle', d: .8, v: .8 }, { t: 11.8, type: 'flutter', d: 2.5, v: .35 }, { t: 12.6, type: 'swell', d: 1.4, v: .3 }, { t: 9.2, type: 'breath', d: 2.2, v: .35 }],
};
