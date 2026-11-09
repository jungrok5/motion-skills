// 「月蝕 · Thousand-Moon Eclipse」 score. Shot starts (check.mjs prints them):
// burst 0 · sweep 1.4 · charge 2.4 · rising thrust 3.2 · spin 4.2 · freeze·plunge 5.2 (land 6.05) · run 7.0 · first omen 9.0
// · three blinks 11.0 · first burst 13.0 (13.45) · stillness 15.0 · the eye 17.3 · domain 18.0 · collapse 22.0 · the cut 25.0
// (25.26) · silence 28.0 → 30
const B = 176;                       // bpm of the attack
export const SCORE = {
  drums: [
    { from: 0, to: 6.0, bpm: B, div: 4, pattern: 'k..hs.hk.khs.h.m', v: .72 },
    { from: 6.05, to: 13.0, bpm: B, div: 4, pattern: 'k.hks.hkk.hks.tm', v: .78 },
    { from: 13.45, to: 15.0, bpm: B, div: 4, pattern: 'k.k.s.k.kkk.stmm', v: .8 },
  ],
  bass: [{ t: 0, d: 6, n: 31, v: .5, pulse: B / 60 * 2 }, { t: 6.05, d: 7, n: 29, v: .55, pulse: B / 60 * 2 }, { t: 13.45, d: 1.55, n: 26, v: .6, pulse: B / 60 * 4 }],
  drone: [{ t: 15, d: 3, n: 26, v: .35 }, { t: 18, d: 4, n: 26, v: .55, a: 2 }, { t: 18, d: 4, n: 33, v: .3, a: 3 }, { t: 22, d: 3, n: 25, v: .7, a: 1.5 }],
  pad: [{ t: 18.4, d: 3.6, notes: [50, 57, 62, 65], v: .35 }],
  sfx: [
    { t: .2, type: 'step', v: .9 }, { t: .22, type: 'crack', v: .6, n: 5 }, { t: .5, type: 'cloth', d: .3, v: .4 }, { t: .74, type: 'dash', d: .22, v: .9, dir: -1 },
    { t: 1.44, type: 'dash', d: .18, v: .7, dir: 1 }, { t: 1.48, type: 'slash', v: 1 }, { t: 1.6, type: 'impact', v: .7 }, { t: 1.7, type: 'crack', v: .5, n: 8 },
    { t: 2.4, type: 'whoosh', d: .7, v: .8 }, { t: 3.0, type: 'dash', d: .2, v: .9 },
    { t: 3.38, type: 'whoosh', d: .3, v: .6, dir: 1 }, { t: 3.6, type: 'slash', v: .9, dir: 1 },
    { t: 4.25, type: 'whoosh', d: .8, v: .7, dir: -1 }, { t: 4.4, type: 'slash', v: .6 }, { t: 4.7, type: 'slash', v: .5 },
    { t: 5.4, type: 'tick', v: .5 }, { t: 5.55, type: 'reverse', d: .45, v: .5 }, { t: 5.75, type: 'whoosh', d: .3, v: .8 },
    { t: 6.05, type: 'land', v: 1 }, { t: 6.05, type: 'impact', v: .95 }, { t: 6.07, type: 'ink', v: .7 }, { t: 6.1, type: 'glass', v: .3, d: .8, n: 20 },
    ...[7.07, 7.32, 7.57, 7.82, 8.07, 8.32, 8.57, 8.82].map((t, i) => ({ t, type: 'step', v: .55, pan: i % 2 ? .2 : -.2 })),
    { t: 8.4, type: 'whoosh', d: .5, v: .4 },
    { t: 9.26, type: 'slash', v: .9 }, { t: 9.56, type: 'slash', v: .9, dir: -1 }, { t: 9.7, type: 'ring', d: .5, v: .9, f: 4200 }, { t: 9.78, type: 'metal', v: .4 },
    { t: 10.5, type: 'dash', d: .3, v: .8 },
    { t: 11.05, type: 'cloth', d: .3, v: .4 }, { t: 11.1, type: 'whoosh', d: .4, v: .6 },
    { t: 11.5, type: 'dash', d: .1, v: .7 }, { t: 11.58, type: 'slash', v: .9 }, { t: 11.75, type: 'dash', d: .1, v: .7, dir: -1 }, { t: 11.83, type: 'slash', v: .9, dir: -1 },
    { t: 12.0, type: 'dash', d: .1, v: .7 }, { t: 12.08, type: 'slash', v: 1 }, { t: 12.75, type: 'riser', d: .5, v: .5 },
    { t: 13.25, type: 'thud', v: .9 }, { t: 13.35, type: 'tick', v: .8 }, { t: 13.45, type: 'impact', v: 1 }, { t: 13.46, type: 'ink', v: .8 }, { t: 13.5, type: 'glass', v: .4, d: 1.2, n: 30 },
    { t: 15.0, type: 'heart', v: .6 }, { t: 16.1, type: 'heart', v: .5 }, { t: 16.6, type: 'cloth', d: .8, v: .2 }, { t: 17.0, type: 'ring', d: 1.2, v: .6, f: 3600 }, { t: 17.6, type: 'crack', v: .6, n: 6 }, { t: 17.65, type: 'glass', v: .3, d: .4, n: 14 },
    { t: 18.05, type: 'boom', v: .6 }, { t: 18.6, type: 'glass', v: .2, d: 3, n: 50 }, { t: 19.0, type: 'rumble', d: 3, v: .5 }, { t: 20.1, type: 'glass', v: .25, d: 2, n: 40 }, { t: 21.0, type: 'whoosh', d: .6, v: .6 }, { t: 21.6, type: 'boom', v: .4 },
    { t: 22.2, type: 'crack', v: .8, n: 6 }, { t: 22.5, type: 'glass', v: .6, d: 1.5, n: 60 }, { t: 22.9, type: 'crack', v: .7, n: 10 }, { t: 23.0, type: 'riser', d: 2.2, v: .7 }, { t: 23.1, type: 'whoosh', d: 1.4, v: .4 }, { t: 24.2, type: 'heart', v: .5 },
    { t: 25.26, type: 'ultimate', v: 1 }, { t: 25.27, type: 'slash', v: 1 }, { t: 25.3, type: 'shing', v: .8 }, { t: 25.7, type: 'glass', v: .7, d: 2, n: 80 }, { t: 25.6, type: 'rumble', d: 2.4, v: .7 },
    { t: 28.0, type: 'ring', d: 1.9, v: .5, f: 3150 }, { t: 28.3, type: 'cloth', d: 1.2, v: .25 }, { t: 29.2, type: 'ink', v: .15 },
  ],
  gain: [{ t: 0, v: 1 }, { t: 14.9, v: 1 }, { t: 15.05, v: .55 }, { t: 24.8, v: .9 }, { t: 24.95, v: .05 }, { t: 25.25, v: .05 }, { t: 25.26, v: 1 }, { t: 27.9, v: 1 }, { t: 28.2, v: .7 }, { t: 30, v: .5 }],
  reverb: { mix: .24, room: .82 },
};
