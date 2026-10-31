/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder for the puppet template (a bird, a hand, a red seed) — replace with the film's own words and beats.
   lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 3.5 s each; scripture verbatim from bskorea.or.kr. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    lampOn: 0.2,    // the lamp catches behind the cloth: a bare branch, a carved ground strip
    near: 2.4,      // something held far from the cloth: a big soft shadow drifting in
    press: 6.0,     // it presses onto the cloth — sharp: a carved bird on the branch (crash zoom on the hit)
    hand: 8.8,      // a jointed hand rises on its rod, fingers closed
    open: 11.2,     // THE CHANGE: the fingers open — a red seed (the one colour)
    take: 13.4,     // the seed is carried up to the bird
    dark: 16.0,     // the lamp gutters out: black, silence
    relight: 18.2,  // it relights, faint, then warm
    lift: 21.2,     // the bird lifts off the cloth toward the lamp: grows, softens, fades into the light
    pull: 24.6,     // pull back: the cloth is a small stage in a dark room, heads of an audience
    end: 25.8,      // end card
  },
  lines: [
    [0.6, 4.2, '처음엔 멀리 있었다'],
    [4.6, 8.6, '조금씩\n가까이 다가와'],
    [9.2, 13.2, '손을 펴는 순간'],
    [13.6, 15.8, '작은 것 하나'],
    [18.8, 24.4, '여기에 성경 구절이\n들어갑니다', '책 0:0 (개역개정)'],
  ],
  endCard: { title: '영상 제목은\n두 줄까지', passage: '본문 0:0-0', by: '설교자 · 교회', cta: '전체 설교는 채널에서' },
};
