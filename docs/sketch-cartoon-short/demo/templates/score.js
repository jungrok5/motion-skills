// score.js — write it against the shot starts (check.mjs prints them). The template: drawn 0 · street 3.5 · door 7 · end 10.
// Pencil while the page draws; a light oom-pah walk with a reed tune on the street; a chime when the door opens.
import { oompah, tune, beat } from '../lib/score.js';
const walk = oompah(116, [[60, 4], [65, 4], [67, 4, 4]], 3.5);
export const SCORE = {
  reverb: { mix: .2, room: .8 },
  air: [{ t: 0, v: .05 }, { t: 3.5, v: .12 }, { t: 4.8, v: .4 }, { t: 6, v: .1 }],
  pluck: walk.pluck, bass: walk.bass,
  reed: tune(116, [[67, 1], [72, 1], [76, 1.5], [74, .5], [72, 1], [69, 1], [67, 2]], 3.5 + beat(116, 2)),
  keys: [{ t: 2.9, n: 72, v: .4, d: .3 }, { t: 3.05, n: 76, v: .4, d: .3 }, { t: 3.2, n: 79, v: .45, d: .8 }, { t: 8.3, n: 60, v: .4, d: 1.5 }, { t: 8.3, n: 67, v: .35, d: 1.5 }],
  sfx: [{ t: .2, type: 'pencil', d: 2.6, v: .5 }, { t: 4.7, type: 'whoosh', d: 1.2, v: .4 }, { t: 7.0, type: 'pencil', d: 1.0, v: .5 }, { t: 8.2, type: 'chime', v: .7 }],
};
