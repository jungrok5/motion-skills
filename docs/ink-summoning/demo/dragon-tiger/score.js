// 「Dragon and Tiger」 score — trailer grammar: a low drone, taiko under the action, every stroke gets a brush whoosh,
// every landing a splash, the beasts roar; the drums drop out for a breath of flute when the dragon rises, then a sub
// boom + gong slam into the tableau. Times are film seconds; shot starts (check.mjs prints them):
// first stroke 0 · tiger charge 2.3 · floor sweep 3.9 · rings 5.7 · the circle 7.8 · tiger prowls 9.7 · mask close 11.8 ·
// dragon rises 13.0 · dragons coil 15.2 · tableau 17.3 → 21.1
export const SCORE = {
  pad: [
    { t: 0, d: 6, notes: [38, 45, 50, 53], v: .45 },
    { t: 5.8, d: 4, notes: [34, 41, 46, 50], v: .45 },
    { t: 9.7, d: 3, notes: [38, 45, 50, 53], v: .5 },
    { t: 12.9, d: 4.3, notes: [45, 52, 57], v: .3 },
    { t: 17.3, d: 3.4, notes: [38, 45, 50, 53, 57], v: .6 },
  ],
  strings: [{ t: 15.2, d: 2.1, notes: [57, 62, 65], v: .25 }, { t: 17.3, d: 3.2, notes: [50, 57, 62, 65, 69], v: .5 }],
  bass: [{ t: 2.3, d: 10.3, n: 26, v: .5 }, { t: 17.3, d: 3.4, n: 26, v: .7 }],
  flute: [
    { t: 13.05, d: .9, n: 69, v: .6 }, { t: 14.05, d: .45, n: 72, v: .55 }, { t: 14.5, d: 1.2, n: 74, v: .65, bend: -2 },
    { t: 15.9, d: .4, n: 72, v: .5 }, { t: 16.3, d: 1, n: 69, v: .55 },
    { t: 18.5, d: 1.5, n: 74, v: .5, bend: -2 }, { t: 20.1, d: .9, n: 69, v: .4 },
  ],
  air: [{ t: 0, v: .3 }, { t: 12.6, v: .3 }, { t: 13, v: .55 }, { t: 17.2, v: .5 }, { t: 21, v: .3 }],
  drums: [
    { from: 2.3, to: 12.6, bpm: 66, div: 4, pattern: 'x..k..s.o..kx.s.', v: .75 },
    { from: 17.3, to: 20.2, bpm: 66, div: 1, pattern: 'x', v: .9, type: 'taiko' },
  ],
  sfx: [
    // 1 · first stroke
    { t: .5, type: 'brush', d: .7, v: .7, dir: 1 }, { t: 1.03, type: 'boom', v: .8 }, { t: 1.04, type: 'splash', v: .8, pan: .4 },
    { t: 1.1, type: 'rumble', d: 1.3, v: .4 },
    // 2 · tiger charge
    { t: 2.3, type: 'taiko', v: 1 }, { t: 3.35, type: 'roar', d: 1.1, v: 1 }, { t: 3.4, type: 'boom', v: .6 },
    // 3 · floor sweep
    { t: 4.2, type: 'brush', d: .85, v: .7, dir: -1 }, { t: 4.75, type: 'splash', v: .6, pan: .5 },
    // 4 · rings
    { t: 5.72, type: 'brush', d: 1.0, v: .65, dir: 1 }, { t: 6.85, type: 'brush', d: .85, v: .65, dir: -1 },
    // 5 · the circle
    { t: 7.8, type: 'brush', d: 1.0, v: .7 }, { t: 8.4, type: 'brush', d: .9, v: .6, dir: -1 }, { t: 9.2, type: 'ka', v: .5 },
    // 6 · tiger prowls
    { t: 9.8, type: 'splash', v: .5, pan: -.3 }, { t: 10.4, type: 'roar', d: .9, v: .45 }, { t: 11.55, type: 'roar', d: 1.0, v: .95 },
    // 7 · mask close: a whip of the brush past the lens, then the drums cut
    { t: 12.2, type: 'brush', d: .55, v: .9, dir: 1 }, { t: 12.6, type: 'taiko', v: .9 },
    // 8 · dragon rises
    { t: 13.1, type: 'brush', d: .8, v: .6 }, { t: 13.8, type: 'dragon', d: 2.2, v: .8 }, { t: 14.3, type: 'rumble', d: 1.5, v: .35 },
    // 9 · dragons coil
    { t: 15.3, type: 'whoosh', d: 1.4, v: .45, pan: -.5 }, { t: 16.1, type: 'dragon', d: 1.4, v: .45 }, { t: 16.5, type: 'riser', d: .8, v: .7 },
    // 10 · tableau
    { t: 17.3, type: 'boom', v: 1 }, { t: 17.3, type: 'gong', v: .8, f: 92 }, { t: 18.1, type: 'roar', d: 1.2, v: .7, pan: -.5 },
    { t: 19.6, type: 'dragon', d: 1.5, v: .35, pan: .4 },
  ],
  reverb: { mix: .3, room: .87 },
};
