// 「The Kite」 · score.js — written against the beats (check.mjs prints them):
// the page 0 · the pencil 3.2 · the way out 7.7 · the slide 11.6 · the world 15.2 · the kite 17.2 · real 20 · the wind 21.6 · the close 26.2.
// The pencil scratches come from the drawing itself (the film adds one wherever a stroke is being drawn).
// The square's air under everything (people far off, a breeze); a music box for Pip; small steps on paper; a rising
// whoosh down the slide and a soft thump on the cobbles; a sparkle and a felt-piano chord when the kite turns real;
// wind and flutter as it rises; a paper rustle as the square goes back to the page.
const C4 = 60, E4 = 64, F4 = 65, G4 = 67, A4 = 69, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81, C6 = 84;
const hum = (t0, v = .45) => [[E5, 0], [G5, .3], [A5, .6], [G5, .9], [E5, 1.35], [D5, 1.65], [C5, 2.1]].map(([n, d]) => ({ t: t0 + d, n, v }));
const climb = (t0, v = .45) => [C5, D5, E5, F5, G5, A5].map((n, i) => ({ t: t0 + i * .4, n, v }));
const down = (t0, v = .5) => [C6, A5, G5, E5, D5, C5, G4].map((n, i) => ({ t: t0 + Math.pow(i / 6, .8) * 2.2, n, v }));
export const SCORE = {
  reverb: { mix: .22, room: .8 },
  air: [{ t: 0, v: .1 }, { t: 12, v: .12 }, { t: 15, v: .22 }, { t: 21.5, v: .3 }, { t: 25, v: .34 }, { t: 27.6, v: .12 }, { t: 30, v: .04 }],
  box: [...hum(.8, .38), { t: 3.3, n: A5, v: .5 }, ...hum(5.0, .42), ...climb(9.9, .4), ...down(12.5, .5), ...hum(16.0, .4), ...hum(23.0, .45), { t: 28.3, n: C5, v: .35 }, { t: 28.3, n: G5, v: .3 }],
  keys: [{ t: 7.7, n: C4 - 12, v: .35, d: 3 }, { t: 7.7, n: G4 - 12, v: .25, d: 3 }, { t: 20.0, n: F4 - 12, v: .45, d: 2.4 }, { t: 20.0, n: A4, v: .35, d: 2.4 }, { t: 20.0, n: C5, v: .3, d: 2.4 }, { t: 22.5, n: C4 - 12, v: .4, d: 3 }, { t: 22.5, n: E4, v: .3, d: 3 }, { t: 28.3, n: C4 - 12, v: .4, d: 1.6 }],
  pad: [{ t: 15.4, d: 3.5, notes: [C4 - 12, G4 - 12, E4], v: .25 }, { t: 21.6, d: 5, notes: [F4 - 12, C4, A4], v: .32 }],
  sfx: [
    { t: 3.25, type: 'whoosh', d: .8, v: .3, pan: .4 }, { t: 3.62, type: 'pop', v: .3 }, { t: 3.92, type: 'step', v: .35 },
    { t: 7.8, type: 'step', v: .2 }, { t: 8.3, type: 'step', v: .2 }, { t: 8.9, type: 'step', v: .2 }, { t: 9.4, type: 'step', v: .2 },
    { t: 12.45, type: 'whoosh', d: 2.4, v: .55, pan: .2 }, { t: 14.8, type: 'swell', d: .5, v: .2 }, { t: 15.16, type: 'thump', v: .5 },
    { t: 19.95, type: 'paper', d: .4, v: .3 }, { t: 20.0, type: 'sparkle', d: 1.2, v: .6 },
    { t: 21.6, type: 'swell', d: 2.0, v: .3 }, { t: 22.0, type: 'flutter', d: 4.0, v: .3, pan: .3 }, { t: 22.45, type: 'step', v: .25 }, { t: 23.25, type: 'step', v: .25 },
    { t: 27.6, type: 'paper', d: 1.2, v: .3 }, { t: 28.3, type: 'chime', v: .4 },
  ],
};
