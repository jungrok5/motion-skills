// 「The Ferry Bell」 — the score: E major at 124 bpm, a bright e-piano groove; the tune climbs on the harbour (the drop
// lands on the grind), thins to keys and air for the two slow-motion shots, and the ferry horn answers the cheer.
import { arrange } from 'srm/score.js';
const THEME = {
  tune: [[4, .5], [5, .5], [7, 1], [9, .5], [7, .5], [5, 1], [null, 1], [4, .5], [5, .5], [7, .5], [5, .5], [4, 1], [2, 1], [null, 1],
         [7, .5], [9, .5], [11, 1], [9, .5], [7, .5], [9, 1], [null, 1], [11, .5], [12, .5], [11, .5], [9, .5], [7, 1.5], [null, 1.5],
         [4, .5], [5, .5], [7, 1], [9, 1], [11, 1], [12, 1.5], [null, .5], [11, .5], [9, .5], [7, 1], [4, 1.5], [null, 1.5]],
  chords: [3, 4, 2, 5, 3, 4, 0, 0],
};
export const SCORE = info => arrange(info, {
  key: 64, mode: 'major', theme: THEME,
  beds: { birds: [{ t: 0, v: .35 }, { t: 15, v: .2 }], city: [{ t: 0, v: .1 }, { t: 12, v: .2 }, { t: 17, v: .05 }], river: [{ t: 0, v: 0 }, { t: 16, v: 0 }, { t: 18, v: .5 }], air: .25 },
  sfx: [{ t: info.dur - 4.2, type: 'horn', v: .55, d: 2.2 }, { t: 1.2, type: 'chirp', v: .4 }],
});
