// The score as a function of the film (beats, shots, events). An EXAMPLE: write the tune for your topic.
import { arrange, THEME } from 'srm/score.js';
export const SCORE = info => arrange(info, { key: 62, mode: 'major', theme: THEME, beds: { birds: .35, city: .2 } });
