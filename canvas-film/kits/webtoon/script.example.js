/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a figure walks in,
   kneels and plants a seed, waits, a sprout rises in the style's accent at 14, the figure stands and looks at it at 18.
   In the webtoon kit the lines become narration boxes in the strip (shown from → to), and the strip's camera is timed to the
   beats. Replace it with the film's own words and beats. lines: [from, to, '한 줄\n두 줄'] — ≤ 2 lines, ≥ 1.6 s each. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],    // the figure walks in (visible from frame 0), something small held in the near hand
    kneel: 4.6,      // kneels (stand → crouch → kneel)
    plant: 6.0,      // the hand presses the seed into the ground; pats the soil over it
    wait: [8, 13],   // waits — the silent-beat panels (blinks, a "……", the light moving)
    sprout: 14.0,    // THE CHANGE: a sprout bursts up with the accent bud (focus lines, flash, zoom punch, SFX)
    rise: 18.0,      // the figure stands and looks at it; it keeps growing
    end: 26.0,       // end card (~4 s)
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [5.2, 9.5, '묻어 둔 것은'],
    [14.4, 17.6, '자라고 있었다'],
  ],
  endCard: { title: '영상 제목은\n두 줄까지', next: '다음 화: 제목', by: '작가 · 채널' },
};
