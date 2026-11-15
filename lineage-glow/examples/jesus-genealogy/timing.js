// 「예수님의 족보」 · timing.js — the one timeline the film (index.html) and the score (score.js) both read.
// Pure (no imports), so scripts/score.mjs can load it in Node.

export const DUR = 102;

// Matthew 1:2–16, top to bottom (m = 0 … 40). 개역 spellings. Matthew 1:17 counts three sets of fourteen:
// Abraham → David (m 0–13), David → Josiah, before the exile (m 13–26, David counted again), Jeconiah → Christ (m 27–40).
export const MATTHEW = ['아브라함', '이삭', '야곱', '유다', '베레스', '헤스론', '람', '아미나답', '나손', '살몬', '보아스', '오벳', '이새', '다윗',
  '솔로몬', '르호보암', '아비야', '아사', '여호사밧', '요람', '웃시야', '요담', '아하스', '히스기야', '므낫세', '아몬', '요시야',
  '여고냐', '스알디엘', '스룹바벨', '아비훗', '엘리아김', '아소르', '사독', '아킴', '엘리웃', '엘르아살', '맛단', '야곱', '요셉', '예수'];
// Luke 3:34–38, above Abraham, going up: … Adam, and God
export const LUKE = ['데라', '나홀', '스룩', '르우', '벨렉', '헤버', '살라', '가이난', '아박삿', '셈', '노아', '레멕', '므두셀라', '에녹', '야렛',
  '마할랄렐', '가이난', '에노스', '셋', '아담', '하나님'];
// the five women Matthew names: mother of `child`, beside `father` (m indices)
export const WOMEN = [
  { name: '다말', father: 3, child: 4, side: 1, ref: '마 1:3' },
  { name: '라합', father: 9, child: 10, side: -1, ref: '마 1:5' },
  { name: '룻', father: 10, child: 11, side: 1, ref: '마 1:5' },
  { name: '우리야의 아내', father: 13, child: 14, side: -1, ref: '마 1:6' },
  { name: '마리아', father: 39, child: 40, side: 1, ref: '마 1:16' },
];

// the descent: D(t) = how far the light has come down Matthew's line (0 = Abraham … 40 = Jesus)
const E = { inOut: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, out: u => 1 - Math.pow(1 - u, 3), linear: u => u };
export const DESCENT = [[12, 0], [20, 13, 'inOut'], [22, 13], [29, 26, 'inOut'], [30.2, 27, 'out'], [36, 27], [43.5, 40, 'inOut']];
export function D(t) {
  const k = DESCENT; if (t <= k[0][0]) return 0;
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * E[k[i][2] || 'linear'](u); }
  return k[k.length - 1][1];
}
// the moment the light reaches person m
export function reach(m) { let lo = 0, hi = DUR; for (let i = 0; i < 44; i++) { const mid = (lo + hi) / 2; if (D(mid) < m - 1e-6) lo = mid; else hi = mid; } return +hi.toFixed(3); }

// beats (start times) — the film's shape
export const BEATS = [
  ['질문', 0], ['아브라함', 6.5], ['첫째 열네 대', 12], ['다윗', 20], ['둘째 열네 대', 22], ['포로기', 30.2], ['셋째 열네 대', 36],
  ['세 묶음', 44.5], ['다섯 여인', 51.5], ['마리아', 64], ['아담 · 하나님', 71.5], ['모든 민족', 79.5], ['그 이름', 94.5],
];
// Luke's light climbs from Abraham over this stretch
export const LUKE_T = [73, 77.5];
