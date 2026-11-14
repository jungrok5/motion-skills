// 「狛獅子 · Guardian Lion」 score — still water first (a drop, room tone, a low swell), the ink blooms with each stage of
// the form, a slow koto-like line over a drone, the walk on soft drum, then a sub boom + roar and a gong into the hold.
// Shot starts (check.mjs prints them): wisps 0 · face forms 2.2 · pale body 4.2 · paws 6.2 · ink darkens 7.6 · roar 8.8 ·
// guardian 10.6 → 13.0
export const SCORE = {
  air: [{ t: 0, v: .35 }, { t: 8.6, v: .4 }, { t: 9.2, v: .2 }, { t: 13, v: .3 }],
  pad: [
    { t: 0, d: 4.2, notes: [38, 45], v: .35 }, { t: 2.2, d: 4, notes: [38, 45, 50, 53], v: .4 },
    { t: 6.2, d: 2.6, notes: [36, 43, 48, 51], v: .45 }, { t: 9.0, d: 4, notes: [38, 45, 50, 53, 57], v: .55 },
  ],
  strings: [{ t: 10.6, d: 2.4, notes: [50, 57, 62, 65], v: .32 }],
  bass: [{ t: 4.2, d: 4.4, n: 26, v: .4 }, { t: 9.0, d: 4, n: 26, v: .6 }],
  bell: [{ t: 2.3, n: 74, v: .35 }, { t: 2.9, n: 77, v: .3 }, { t: 3.5, n: 81, v: .3 }, { t: 4.3, n: 79, v: .28 }, { t: 5.4, n: 74, v: .25 }, { t: 11.2, n: 74, v: .3 }, { t: 11.9, n: 81, v: .25 }],
  flute: [{ t: 4.4, d: 1.6, n: 62, v: .4, bend: -2 }, { t: 6.4, d: .9, n: 65, v: .35 }, { t: 7.4, d: 1.1, n: 62, v: .35 }],
  drums: [{ from: 4.6, to: 8.6, bpm: 63, div: 2, pattern: 'o..o', v: .45 }],
  sfx: [
    { t: .25, type: 'drip', f: 820, v: .7 }, { t: .4, type: 'ink', d: 2.2, v: .55 }, { t: 1.4, type: 'bubbles', d: .6, v: .4, pan: .3 },
    { t: 2.2, type: 'swell', d: 2.4, v: .5 }, { t: 2.3, type: 'ink', d: 1.8, v: .5, pan: -.2 },
    { t: 4.2, type: 'ink', d: 2, v: .45, pan: .2 }, { t: 5.6, type: 'bubbles', d: .5, v: .3, pan: -.4 },
    { t: 6.3, type: 'thump', v: .35 }, { t: 6.85, type: 'thump', v: .3 },
    { t: 7.6, type: 'swell', d: 1.4, v: .55 }, { t: 7.7, type: 'riser', d: 1.1, v: .45 },
    { t: 8.8, type: 'boom', v: .85 }, { t: 9.3, type: 'roar', d: 1.2, v: .95 }, { t: 9.35, type: 'swell', d: 1.6, v: .5 },
    { t: 10.6, type: 'gong', f: 98, v: .7 }, { t: 11.55, type: 'roar', d: .9, v: .55 }, { t: 12.2, type: 'drip', f: 700, v: .4 },
  ],
  reverb: { mix: .34, room: .86 },
};
