// score.js — template: two chords a shot on a felt piano over a pad (D major), a paper flurry on the cut, a chime at the end.
// Write yours against the shot starts check.mjs prints; keys: pad · strings · bass · bell · piano · tick · air · sfx · reverb.
export const SCORE = {
  pad: [{ t: 0, d: 3, notes: [50, 57, 62, 66], v: .45 }, { t: 3, d: 3, notes: [47, 54, 62, 66], v: .45 }, { t: 6, d: 3, notes: [43, 50, 59, 66], v: .45 }, { t: 9, d: 3, notes: [45, 52, 61, 64], v: .45 }],
  piano: [0, 3, 6, 9].flatMap((t, i) => [[78, 74, 69, 74], [78, 73, 69, 71], [79, 74, 71, 74], [76, 73, 69, 73]][i].map((n, j) => ({ t: t + .3 + j * .7, n, v: j ? .3 : .42 }))),
  bass: [{ t: 0, d: 3, n: 38 }, { t: 3, d: 3, n: 35 }, { t: 6, d: 3, n: 31 }, { t: 9, d: 3, n: 33 }],
  sfx: [{ t: 5.8, type: 'paper', d: 1.4, v: .8 }, { t: 11.2, type: 'chime', v: .4 }],
  reverb: { mix: .3, room: .85 },
};
