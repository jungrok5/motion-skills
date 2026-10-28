/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the house-style templates (the same story in every kit, so templates are comparable): a figure walks
   in, kneels and plants a seed, waits; at `sprout` it rises with the style's accent light; at `rise` the figure stands and
   looks at it; end card at `end`. Replace every line with this film's words (scripture verbatim from 개역개정, with its
   source line). Beats are seconds; the template's drawing keys off these names. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],      // walks in (visible from frame 0 — no fade-in from black)
    kneel: 4.6,        // kneels at the spot
    plant: 6.0,        // the seed goes into the ground
    wait: [8, 13],     // waiting: the style's ambient motion only
    sprout: 14.0,      // THE moment: the sprout rises with the accent light
    rise: 18.0,        // the figure stands and looks at it
    end: 26.0,         // end card (~4 s), then the loop seam into frame 0
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ 1.6 s each
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  // placeholder card; new-film.py replaces it with Story.card(SOURCE) from source.json
  endCard: { kicker: '2026.01.01 주일 1부예배', title: '설교 제목을\n여기에', passage: '본문 1:1-8', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};
