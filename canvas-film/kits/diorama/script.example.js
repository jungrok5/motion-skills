/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Every style's scene reads this.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a figure walks in,
   kneels and plants a seed, waits, a sprout rises in the style's accent, the figure stands and looks at it.
   Replace it with the film's own words and beats. lines: [from, to, '한 줄\n두 줄', '출처'?] — ≤ 2 lines, ≥ 2 s each. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    open: 0.2,       // the curtains part on the room
    walk: [0.6, 4.2],// the figure walks in on axis from behind the left curtain, a seed in the near hand
    kneel: 4.6,      // kneels by the pot (stand → kneel)
    plant: 6.0,      // presses the seed into the soil; pats it down
    wait: [8, 13],   // waits — the clouds drift, the light goes golden
    lamps: 10.6,     // the lamps on the sill come on
    sprout: 14.0,    // THE CHANGE: a sprout rises and opens a flower in the accent colour
    rise: 18.0,      // the figure stands and looks at it
    end: 26.0,       // end card (~4 s)
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.00.00', title: '영상 제목은\n두 줄까지', passage: '부제 · 출처', by: '만든 사람 · 채널', compact: true },
};
