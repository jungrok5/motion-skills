// score.js — write it against the shot starts (check.mjs prints them). The template: walk 0 · kite 3.4 · label 5.5 · end 8.
// A music-box tune over a soft breeze; paper taps on the steps; a rustle and a rising chime as the kite goes up.
import { tune } from '../lib/score.js';
export const SCORE = {
  reverb: { mix: .25, room: .8 },
  air: [{ t: 0, v: .12 }, { t: 3.4, v: .3 }, { t: 8, v: .15 }],
  musicbox: tune(108, [[72, 1], [76, 1], [79, 1], [84, 2], [79, 1], [81, 1], [79, 1], [76, 1], [77, 2], [72, 1], [74, 1], [76, 1], [72, 3]], .3),
  bass: [0, 1, 2, 3, 4].map(i => ({ t: .3 + i * 1.67, n: [48, 53, 55, 48, 48][i], v: .4 })),
  sfx: [...[.4, .85, 1.3, 1.75, 2.2, 2.65, 3.1].map(t => ({ t, type: 'tap', v: .35 })), { t: 3.4, type: 'rustle', d: .6, v: .5 }, { t: 3.6, type: 'whoosh', d: 1.2, v: .3 }, { t: 5.5, type: 'rustle', d: .3, v: .4 }, { t: 6.4, type: 'chime', v: .5 }],
};
