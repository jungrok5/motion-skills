// 「The Runaway Umbrella」 · score.js — written against the shot starts (check.mjs prints them):
// drawn 0 · gust 4 · chase 8 · leap 13 · cloud 18 · catch 22 · float 27 (dissolve from 26) · page 31.5 (paper from 31) · end 35.5
// Pencil scratches while the page draws itself; rain from 3.2; a tiptoe pizzicato while the wind plays; a quick oom-pah chase
// with a reed tune; it all drops out for the cloud (scribble growl, thunder); the catch opens on a chime and a major swell;
// a slow waltz on felt piano for the float; a small button at the end.
import { oompah, tune, beat } from '../../lib/score.js';

const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, Bb4 = 70, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81;
const chase = oompah(144, [[C4, 4], [C4, 4], [F4, 4], [G4, 4, 4], [C4, 4], [A4 - 12, 4, 3], [F4, 4], [G4, 4], [C4, 4], [F4, 4], [G4, 4], [C4, 4]], 8.0, { bv: .7, pv: .32 });
const chaseTune = tune(144, [[G4, .5], [C5, .5], [E5, 1], [D5, .5], [C5, .5], [A4, 1], [F4, .5], [A4, .5], [C5, 1], [B4, 1], [D5, 1],
  [G4, .5], [C5, .5], [E5, 1], [G5, .5], [E5, .5], [C5, 1], [A4, .5], [C5, .5], [F5, 1], [E5, .5], [D5, .5], [C5, 2],
  [null, .5], [E5, .5], [D5, .5], [C5, .5], [A4, 1], [C5, 1], [D5, 1.5], [B4, .5], [G4, 1], [C5, 2]], 8.0 + beat(144, 4), { v: .55, legato: .85 });
const waltz = [[F4, A4, C5], [C4, E4, G4], [D4, F4, A4], [C4, F4, A4]];
const keys = [];
waltz.forEach((ch, i) => { const t0 = 26.6 + i * 1.25; keys.push({ t: t0, n: ch[0] - 12, v: .5, d: 1.1 }); keys.push({ t: t0 + .42, n: ch[1], v: .35, d: .4 }, { t: t0 + .42, n: ch[2], v: .35, d: .4 }); keys.push({ t: t0 + .84, n: ch[1], v: .3, d: .4 }, { t: t0 + .84, n: ch[2], v: .3, d: .4 }); });
const floatTune = [[A5, 26.6], [G5, 27.4], [F5, 27.85], [E5, 28.3], [F5, 29.1], [A5, 29.5], [C5 + 12, 30.3], [A5, 31.0]].map(([n, t]) => ({ t, n, v: .45, d: .7 }));

export const SCORE = {
  reverb: { mix: .2, room: .8 },
  air: [{ t: 0, v: .05 }, { t: 4, v: .15 }, { t: 4.4, v: .55 }, { t: 6, v: .2 }, { t: 18, v: .3 }, { t: 24.4, v: .1 }, { t: 31.5, v: .03 }],
  rain: [{ t: 0, v: 0 }, { t: 3.2, v: 0 }, { t: 4, v: .5 }, { t: 8, v: .35 }, { t: 18, v: .6 }, { t: 24.2, v: .55 }, { t: 25.2, v: 0 }],
  keys: [
    { t: 3.05, n: C5, v: .4, d: .3 }, { t: 3.2, n: E5, v: .4, d: .3 }, { t: 3.35, n: G5, v: .45, d: .9 },        // the drawing finished
    ...keys, ...floatTune,
    { t: 33.0, n: C5, v: .35, d: .4 }, { t: 33.25, n: G4, v: .3, d: .4 }, { t: 35.0, n: C4, v: .45, d: .8 }, { t: 35.0, n: C5, v: .4, d: .8 }, { t: 35.0, n: E5, v: .35, d: .8 },
  ],
  pluck: [
    ...[0, .5, 1.0, 1.5, 2, 2.5, 3.0, 3.5].map((b, i) => ({ t: 6.2 + b * .5, n: [E4, G4, F4, D4, E4, C4, D4, B4 - 12][i], v: .4 })),   // tiptoe after the yank
    ...chase.pluck.filter(e => e.t < 18), ...[22.0, 22.3, 22.6, 22.9].map((t, i) => ({ t, n: [G4, A4, B4, D5][i], v: .4 })),
  ],
  bass: [...chase.bass.filter(e => e.t < 18), { t: 18.0, n: C4 - 24, v: .7 }, { t: 22.0, n: G4 - 24, v: .6 }, { t: 24.2, n: F4 - 24, v: .7 }, { t: 35.0, n: C4 - 24, v: .7 }],
  reed: [...chaseTune.filter(e => e.t < 17.9), { t: 5.45, d: .25, n: G4, v: .45 }, { t: 5.75, d: .25, n: E4, v: .45 }, { t: 6.05, d: .6, n: C4, v: .45 }],
  pad: [{ t: 18.0, d: 4, notes: [C4 - 12, Bb4 - 12, E4, G4 - 12 + 12 - 1], v: .55 }, { t: 24.2, d: 3, notes: [F4 - 12, A4 - 12, C4, F4], v: .6 }, { t: 27.0, d: 4.5, notes: [F4 - 12, C4, A4 - 12], v: .35 }],
  brush: Array.from({ length: 40 }, (_, i) => ({ t: 8.0 + i * 60 / 144 * 0.5 * 2, v: i % 2 ? .25 : .4, k: i % 4 === 3 ? 'swish' : 'tap' })).filter(e => e.t < 17.9),
  sfx: [
    { t: .2, type: 'pencil', d: 2.8, v: .55 }, { t: 3.0, type: 'pencil', d: .5, v: .3 },
    { t: 4.3, type: 'whoosh', d: 1.2, v: .6 }, { t: 4.85, type: 'fwump', v: .5 }, { t: 5.25, type: 'pop', v: .5 }, { t: 5.3, type: 'whoosh', d: .9, v: .45, pan: .6 },
    ...[8.15, 8.5, 8.85, 9.2, 9.55, 9.9, 10.25, 10.6, 10.95, 11.3, 11.65, 12.0, 12.35, 12.7].map((t, i) => ({ t, type: i % 3 ? 'step' : 'splash', v: .35, pan: -.1 })),
    ...[13.1, 13.45, 13.8].map(t => ({ t, type: 'step', v: .35 })), { t: 14.1, type: 'boing', v: .5 }, { t: 14.4, type: 'whoosh', d: .9, v: .4 }, { t: 15.5, type: 'thump', v: .7 }, { t: 15.55, type: 'splash', v: .3 },
    { t: 15.0, type: 'boing', v: .3, pan: -.4 }, ...[16.2, 16.5, 16.8, 17.1, 17.4].map(t => ({ t, type: 'step', v: .3 })),
    { t: 18.0, type: 'scribble', d: 1.8, v: .7 }, { t: 19.75, type: 'thunder', d: 2.2, v: .9 },
    ...[22.1, 22.4, 22.65].map(t => ({ t, type: 'step', v: .35 })), { t: 22.9, type: 'boing', v: .55 }, { t: 23.0, type: 'whoosh', d: 1.0, v: .4 }, { t: 22.5, type: 'scribble', d: .8, v: .35 },
    { t: 24.05, type: 'fwump', v: .7 }, { t: 24.1, type: 'chime', v: .8 }, { t: 24.25, type: 'paper', d: 1.4, v: .55 }, { t: 24.5, type: 'flip', d: .4, v: .4, pan: .5 }, { t: 24.9, type: 'flip', d: .4, v: .35, pan: -.5 },
    { t: 27.4, type: 'paper', d: 1.2, v: .3, pan: .4 }, { t: 29.4, type: 'paper', d: 1.0, v: .25, pan: -.4 },
    { t: 31.0, type: 'flip', d: .5, v: .45 }, { t: 32.35, type: 'thump', v: .35 }, ...[32.1, 32.35, 32.6, 32.85, 33.1].map(t => ({ t, type: 'step', v: .25, pan: -.5 })),
    { t: 34.25, type: 'pop', v: .35 }, { t: 34.5, type: 'pencil', d: .8, v: .45 },
  ],
};
