/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a figure walks in,
   kneels and plants a seed, waits, a sprout rises in the style's accent light, the figure stands and looks at it.
   Replace it with the film's own words and beats. lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines,
   ≥ 1.6 s each; scripture verbatim from bskorea.or.kr. new-film.py appends the end card from source.js and the loop seam. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],    // the figure walks in (visible from frame 0), something small held in the near hand
    kneel: 4.6,      // kneels (stand → crouch → kneel)
    plant: 6.0,      // the hand presses the seed into the ground; pats the soil over it
    wait: [8, 13],   // waits — nothing shows (the style's ambient motion carries it)
    sprout: 14.0,    // THE CHANGE: a sprout rises in the accent light (the style's hit)
    rise: 18.0,      // the figure stands and looks at it; it keeps growing
    end: 26.0,       // end card (~4 s)
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.00.00 주일 1부예배', title: '영상 제목은\n두 줄까지', passage: '본문 0:0-0', by: '교회 · 설교자', compact: true },
};
