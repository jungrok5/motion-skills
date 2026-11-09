// Template score — shot starts: burst · slash 0 (hit .8) · plunge 2.0 (land 2.8) · stillness 3.8 · domain 5.4 ·
// collapse 7.4 · the cut 8.8 (8.94) · silence 10.3 → 11.9. Every move has its sound on its frame; the kit stops for the
// stillness; near-silence right before the cut.
export const SCORE = {
  drums: [{ from: 0, to: 3.8, bpm: 176, div: 4, pattern: 'k..hs.hkk.hs.h.m', v: .75 }],
  bass: [{ t: 0, d: 3.8, n: 31, v: .5, pulse: 176 / 60 * 2 }],
  drone: [{ t: 3.8, d: 3.6, n: 26, v: .45 }, { t: 7.4, d: 1.4, n: 25, v: .7, a: .8 }],
  sfx: [
    { t: .05, type: 'step', v: .8 }, { t: .1, type: 'crack', v: .5 }, { t: .62, type: 'dash', d: .18, v: .8 }, { t: .75, type: 'slash', v: 1 }, { t: .8, type: 'impact', v: .6 },
    { t: 2.1, type: 'whoosh', d: .4, v: .6 }, { t: 2.55, type: 'reverse', d: .25, v: .5 }, { t: 2.8, type: 'land', v: 1 }, { t: 2.8, type: 'impact', v: .9 }, { t: 2.82, type: 'ink', v: .6 },
    { t: 3.8, type: 'heart', v: .6 }, { t: 4.6, type: 'ring', d: 1, v: .5 }, { t: 5.0, type: 'cloth', d: .5, v: .2 },
    { t: 5.45, type: 'boom', v: .5 }, { t: 5.6, type: 'glass', v: .25, d: 1.8, n: 40 }, { t: 6.2, type: 'rumble', d: 1.2, v: .4 },
    { t: 7.45, type: 'crack', v: .8, n: 8 }, { t: 7.6, type: 'glass', v: .6, d: 1, n: 50 }, { t: 7.8, type: 'riser', d: 1, v: .7 },
    { t: 8.94, type: 'ultimate', v: 1 }, { t: 8.95, type: 'slash', v: 1 }, { t: 9.2, type: 'glass', v: .6, d: 1.5, n: 60 },
    { t: 10.3, type: 'ring', d: 1.5, v: .4 }, { t: 10.6, type: 'cloth', d: .8, v: .2 },
  ],
  gain: [{ t: 0, v: 1 }, { t: 3.75, v: 1 }, { t: 3.85, v: .55 }, { t: 8.6, v: .9 }, { t: 8.75, v: .05 }, { t: 8.93, v: .05 }, { t: 8.94, v: 1 }, { t: 10.3, v: .7 }],
  reverb: { mix: .24, room: .82 },
};
