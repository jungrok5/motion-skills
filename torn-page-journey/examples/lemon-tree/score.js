// 「The Long Way Home」 — the score: one tune of our own, re-scored by each chapter's feeling (lib/score.js MOODS),
// plus the places' sounds. Every chapter's start, mood and gestures come from the journey (info).
import { arrange } from '../../lib/score.js';

// a hummable 8-bar tune in scale degrees ([degree, beats], null = rest) and the chord root of each bar
export const THEME = {
  tune: [[4, 1], [2, .5], [4, .5], [5, 1.5], [4, .5], [2, 2], [null, 1], [1, 1],
         [2, 1], [3, .5], [2, .5], [1, 1.5], [0, .5], [1, 2], [null, 1], [4, .5], [5, .5],
         [7, 1], [6, .5], [5, .5], [4, 1.5], [2, .5], [3, 1], [4, 1], [5, 2],
         [4, .5], [3, .5], [2, 1], [1, 1], [0, 3], [null, 1]],
  chords: [0, 5, 3, 4, 0, 3, 4, 0],
};
export const SCORE = info => arrange(info, {
  theme: THEME,
  sfx: [],
});
