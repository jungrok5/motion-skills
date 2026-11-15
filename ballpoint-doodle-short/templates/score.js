// templates · score.js — write it against the shot starts (check.mjs prints them): nap 0 · chase 3.5 · catch 8.5 · end 11.5
import { oompah, tune, beat } from '../lib/score.js';
const BPM = 120;
const band = oompah(BPM, [[60, 4], [65, 4], [67, 4], [60, 4], [65, 4], [67, 2], [60, 2]], 0.8, { bv: .5, pv: .25 });
export const SCORE = {
  pluck: band.pluck, bass: band.bass,
  mallet: tune(BPM, [[72, 1], [76, .5], [79, .5], [76, 1], [72, 1], [74, 1], [77, .5], [76, .5], [74, 2], [79, .5], [77, .5], [76, .5], [74, .5], [72, 2], [76, .5], [79, .5], [84, 2]], 0.8).map(e => ({ t: e.t, n: e.n, v: .5 })),
  drum: Array.from({ length: 20 }, (_, i) => ({ t: 3.5 + i * .25, k: i % 2 ? 'snare' : 'kick', v: .35 })),
  sfx: [
    { t: 0, type: 'pencil', d: 1.1, v: .5 }, { t: 2.1, type: 'gust', d: 1.1, v: .5 }, { t: 2.9, type: 'slideup', d: .35, v: .5 },
    { t: 3.5 + 2.45, type: 'boing', v: .5 }, { t: 9.1, type: 'boing', v: .55 }, { t: 9.8, type: 'thump', v: .5 }, { t: 10.3, type: 'chime', v: .5 },
  ],
  reverb: { mix: .17, room: .78 },
};
