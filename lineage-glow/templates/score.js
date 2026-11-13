// score for the starter film (16 s). Times line up with film.html's beats: question 0–4.4 · doubling 4.4–11 · reveal 11–16.
export const SCORE = {
  gain: 2.3, reverb: .5, key: 62, scale: [0, 2, 4, 7, 9],
  pad: [[0, 4.6, [50, 57, 62, 66], .5], [4.4, 3.4, [47, 54, 62, 66], .5], [7.6, 3.6, [43, 50, 59, 62], .55], [11, 5, [50, 57, 62, 66, 69], .6]],
  bell: [[.9, 74, .5], [1.5, 78, .35], [3.3, 69, .4], [3.6, 73, .35]],
  rise: [[8, 3, .6]],
  hit: [[11, .7]],
  sub: [[10.6, 5, 38, .5]],
  shimmer: [[5, 11, .18, 5], [11, 15, .25, 8]],
  tick: Array.from({ length: 22 }, (_, i) => [4.6 + i * .3, .25]),
};
