// The score is a function of the journey: arrange() reads each chapter's start, mood and gestures and re-scores ONE tune
// for each feeling (lib/score.js MOODS: mode, tempo, band, the place's bed). Write a new tune for every topic.
import { arrange } from '../lib/score.js';
export const THEME = {   // [scale degree, beats] (null = rest), and one chord root per bar
  tune: [[0, 1], [2, 1], [4, 1], [5, 1], [4, 2], [2, 1], [null, 1], [3, 1], [2, 1], [1, 1], [2, 1], [0, 3], [null, 1]],
  chords: [0, 3, 4, 0],
};
export const SCORE = info => arrange(info, {
  theme: THEME,
  moods: { fear: { bpm: 72 } },          // bend a mood for this film
  sfx: [],                               // extra effects at film times: { t, type: 'thunder' | 'hoot' | 'chirp' | …, v }
});
