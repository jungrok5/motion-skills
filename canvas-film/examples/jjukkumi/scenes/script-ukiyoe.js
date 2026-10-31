/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder shared by every house-style template (so the templates are comparable): a figure walks in, kneels, plants a
   seed, waits; a sprout rises with the style's accent light at 14; the figure stands and looks at it at 18; end card at 26.
   Replace with the film's own words and beats. lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s each. */
window.SCRIPT = {
  DUR: 30,
  beat: { walk: [0, 4], kneel: 4.6, plant: 6.0, wait: [8, 13], sprout: 14.0, rise: 18.0, end: 26.0 },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.01.04 주일 1부예배', title: '영상 제목은\n두 줄까지', passage: '본문 0:0-0', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};
