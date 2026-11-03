// Template score — shot starts: summoning stroke 0 · wolf runs 2.2 · howl 3.8 · cranes 5.7 · tableau 7.9 → 10.9
export const SCORE = {
  pad: [{ t: 0, d: 7.9, notes: [40, 47, 52, 55], v: .45 }, { t: 7.9, d: 3, notes: [40, 47, 52, 55, 59], v: .55 }],
  bass: [{ t: 2.2, d: 5.5, n: 28, v: .5 }],
  flute: [{ t: 5.8, d: .9, n: 71, v: .55 }, { t: 6.8, d: 1.2, n: 76, v: .6, bend: -2 }, { t: 8.6, d: 1.6, n: 74, v: .5 }],
  air: [{ t: 0, v: .3 }, { t: 11, v: .3 }],
  drums: [{ from: 2.2, to: 5.6, bpm: 66, div: 4, pattern: 'x..k..s.o..kx.s.', v: .75 }],
  sfx: [
    { t: .5, type: 'brush', d: .6, v: .7 }, { t: .98, type: 'boom', v: .8 }, { t: 1, type: 'splash', v: .7, pan: .4 }, { t: 1.05, type: 'rumble', d: 1.2, v: .4 },
    { t: 2.2, type: 'taiko', v: 1 }, { t: 3.2, type: 'whoosh', d: .8, v: .6 },
    { t: 4.7, type: 'roar', d: 1.6, v: .55 },
    { t: 5.9, type: 'brush', d: .6, v: .5 }, { t: 6.5, type: 'flutter', d: 1.5, v: .3 }, { t: 7.2, type: 'riser', d: .7, v: .6 },
    { t: 7.9, type: 'boom', v: .9 }, { t: 7.9, type: 'gong', v: .7, f: 104 },
  ],
  reverb: { mix: .3, room: .87 },
};
