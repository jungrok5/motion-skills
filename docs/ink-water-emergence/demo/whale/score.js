// 「鯨の息 · Whale Breath」 score — deep and slow: a low swell under everything, a long whale call (the flute bent far down,
// two octaves low), bubbles as it turns, no drums at all; the strings open as it rises and a single drip ends it.
// Shot starts: drift 0 · the head 2.4 · glide 4.4 · fin 6.8 · rise 8.2 · breath 10.4 → 12.6
export const SCORE = {
  air: [{ t: 0, v: .45 }, { t: 12.6, v: .5 }],
  pad: [{ t: 0, d: 4.4, notes: [33, 40, 45], v: .4 }, { t: 4.2, d: 4.2, notes: [31, 38, 43, 47], v: .42 }, { t: 8.2, d: 4.4, notes: [33, 40, 45, 48, 52], v: .5 }],
  strings: [{ t: 8.4, d: 4.2, notes: [57, 64, 69, 72], v: .3 }],
  bass: [{ t: 0, d: 12.6, n: 21, v: .45 }],
  flute: [{ t: 2.6, d: 1.8, n: 50, v: .5, bend: -5 }, { t: 4.9, d: 1.4, n: 55, v: .45, bend: -7 }, { t: 9.0, d: 2.2, n: 57, v: .5, bend: -5 }],
  bell: [{ t: 11.0, n: 81, v: .2 }, { t: 11.7, n: 76, v: .18 }],
  sfx: [
    { t: .2, type: 'swell', d: 3, v: .5 }, { t: .5, type: 'ink', d: 2.6, v: .5 },
    { t: 2.4, type: 'ink', d: 2.2, v: .45, pan: .2 }, { t: 4.4, type: 'swell', d: 2.6, v: .45 },
    { t: 7.2, type: 'whoosh', d: 1.1, v: .45, pan: .3 }, { t: 7.6, type: 'bubbles', d: .9, v: .45, pan: .4 },
    { t: 8.2, type: 'swell', d: 2.4, v: .6 }, { t: 8.6, type: 'rumble', d: 1.6, v: .3 },
    { t: 10.4, type: 'bubbles', d: 1.4, v: .45, pan: -.2 }, { t: 11.2, type: 'ink', d: 1.4, v: .4 }, { t: 12.2, type: 'drip', f: 640, v: .4 },
  ],
  reverb: { mix: .4, room: .9 },
};
