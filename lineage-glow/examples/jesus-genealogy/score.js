// 「예수님의 족보」 score — D major, slow. A soft bell on every name the light reaches (rising through the scale per set
// of fourteen), a held chord at David, a minor turn and breath for the exile, a riser into the burst of "all nations",
// and a last resolving chord on "그 이름, 예수".
import { reach, LUKE_T } from './timing.js';

const D = [50, 57, 62, 66], G = [43, 55, 59, 62], A = [45, 57, 61, 64], Bm = [47, 54, 59, 62], Em = [40, 55, 59, 64], Fsm = [42, 54, 57, 61];
const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93];
const names = [];
for (let m = 0; m <= 40; m++) {
  const k = m <= 13 ? m : m <= 26 ? m - 13 : m - 27;
  const big = m === 0 || m === 13 || m === 27 || m === 40;
  names.push([reach(m), scale[Math.min(13, k)] - (m > 26 ? 0 : 0), big ? .5 : .2]);
}

export const SCORE = {
  gain: 2.1, reverb: .55, key: 62, scale: [0, 2, 4, 7, 9],
  pad: [
    [0, 6.6, D, .45], [6.5, 5.6, G, .5], [12, 8, D, .5], [20, 2.2, G, .6], [22, 8.2, A, .5],
    [30.2, 6, Bm, .5], [36, 8.5, D, .55], [44.5, 7, G, .55], [51.5, 6.5, Em, .5], [58, 6, A, .5],
    [64, 7.5, D, .5], [71.5, 8, Fsm, .5], [79.5, 3, A, .5], [82.5, 6, D, .6], [88.5, 6, G, .6], [94.5, 7.5, D, .55],
  ],
  bell: [
    [1, 74, .45], [1.6, 78, .3], [8.7, 69, .5], [9.2, 74, .35],
    ...names,
    [47.2, 66, .35], [47.8, 69, .35], [48.4, 74, .4],                          // the three brackets
    [53.1, 78, .3], [54, 76, .3], [54.9, 74, .3], [55.8, 71, .3], [66.7, 74, .4],   // the women
    [77.8, 86, .45], [96.2, 74, .5], [96.6, 78, .4], [97.0, 81, .35],
  ],
  sub: [[19.5, 3.5, 38, .45], [30.2, 6, 35, .35], [42.8, 3, 38, .4], [76.5, 4, 38, .35], [82.3, 7, 38, .5], [95, 6, 38, .4]],
  air: [[30.5, 36, .6]],
  rise: [[79.6, 3, .55]],
  hit: [[82.6, .65]],
  shimmer: [[LUKE_T[0], LUKE_T[1] + .5, .16, 4], [84, 94, .22, 7]],
};
