// score.js — 「Time」: a felt piano over a soft pad in E minor, one chord every 3.75 s (two per shot), a clock that ticks
// in the mural shots, and the style's sounds on the cuts: paper flurry, stone crack, whip, swirl, ink swell, type slam.
const CH = [[52, 59, 64, 67], [48, 55, 64, 67], [43, 50, 59, 66], [45, 52, 60, 64]];   // Em · C(add9) · G/D(maj7) · Am
const starts = [0, 7.5, 14.5, 21.5, 28.5, 36];
const pad = [], piano = [], bass = [];
let t = 0, i = 0;
while (t < 43.5) { const c = CH[i % 4]; pad.push({ t, d: 3.6, notes: c, v: .45 }); bass.push({ t, d: 3.4, n: c[0] - 12, v: .5 });
  // a falling four-note figure, like sand: top of the chord, down
  [3, 2, 1, 2].forEach((k, j) => piano.push({ t: t + .25 + j * .85, n: c[k] + 12, v: j ? .32 : .45 }));
  t += 3.75; i++; }
export const SCORE = {
  pad, bass, piano,
  strings: [{ t: 28.5, d: 7, notes: [64, 67, 71, 76], v: .35 }],
  tick: [{ from: .2, to: 7.4, every: .5, v: .28 }, { from: 36.4, to: 43, every: .5, v: .24 }],
  air: [{ t: 0, v: .25 }, { t: 43, v: .25 }],
  sfx: [
    { t: 7.3, type: 'paper', d: 1.5, v: .8 },
    { t: 14.5, type: 'crack', d: 1.4, v: .8 }, { t: 14.6, type: 'rumble', d: 1.2, v: .4 },
    { t: 21.45, type: 'whoosh', d: .8, v: .7 },
    { t: 28.4, type: 'swirl', d: 1.6, v: .8 }, { t: 28.6, type: 'paper', d: 1.2, v: .5 },
    { t: 30.05, type: 'slam', v: .7 }, { t: 30.25, type: 'slam', v: .5 },
    { t: 35.9, type: 'ink', d: 1.8, v: .7 },
    { t: 42.4, type: 'chime', v: .5 },
  ],
  reverb: { mix: .3, room: .86 },
};
