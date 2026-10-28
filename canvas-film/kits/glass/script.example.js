/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a pilgrim walks
   in, kneels and plants a seed, waits; a sprout rises at 14 in the style's accent; at 18 the pilgrim stands and looks at it.
   Replace every line with this film's words (scripture verbatim from 개역개정, with its source line). */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],      // walks in (already on screen at frame 0) and stops at the spot
    kneel: 4.6,        // kneels (≈ .35 s in-between)
    plant: 6.0,        // presses the seed into the ground
    wait: [8, 13],     // waits — under the road, in the ground band, the root grows piece by piece
    sprout: 14.0,      // the sprout rises piece by piece, a ruby bud; light pours in
    rise: 18.0,        // stands and looks at it
    end: 26.0,         // end card (~4 s), then the loop seam into frame 0
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~1.6 s each
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.01.04 주일 1부예배', title: '설교 제목을\n여기에', passage: '본문 1:1-8', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};
