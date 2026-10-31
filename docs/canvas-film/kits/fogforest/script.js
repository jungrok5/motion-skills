/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a figure walks in,
   kneels and plants a seed, waits, a sprout rises with the style's accent light, the figure stands and looks at it.
   Replace with the film's own words and beats. lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s each;
   scripture verbatim from bskorea.or.kr. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],     // the figure walks in (frame 0 already shows the world — no fade from black)
    kneel: 4.6,       // gets down at a spot on the path
    plant: 6.0,       // the hand opens: the seed goes into the ground, the soil is pressed over it
    wait: [8, 13],    // waiting: the style's ambient motion (fog, moss, breath, a look up)
    sprout: 14.0,     // THE change: a sprout rises with the accent light
    rise: 18.0,       // the figure stands and looks at it
    end: 26.0,        // end card (~4 s), then the loop seam into frame 0
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.01.04 주일 1부예배', title: '영상 제목은\n두 줄까지', passage: '본문 0:0-0', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};
