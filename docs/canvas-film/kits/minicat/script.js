/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder shared by every house-style template (so templates are comparable): a figure walks in, kneels and plants a
   seed, waits, a sprout rises in the style's accent light, the figure stands and looks at it, end card. Replace every line
   with this film's words (scripture verbatim from 개역개정, with its source line). Beats are seconds. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],     // walking in (the figure is on screen at frame 0 — no fade from black)
    kneel: 4.6,       // down on one knee
    plant: 6.0,       // the seed goes into the ground (the paw presses it in, pats the earth twice)
    wait: [8, 13],    // nothing happens — the style's ambient motion carries it
    sprout: 14.0,     // a sprout rises in the accent light
    rise: 18.0,       // the figure stands and looks at it
    end: 26.0,        // end card (~4 s), then the loop seam into frame 0
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~1.6 s each
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  // end card placeholder — new-film.py replaces it with Story.card(SOURCE) (title + two small lines, compact ~4 s)
  endCard: { title: '제목을\n여기에', passage: '본문 1:1', by: '교회 · 설교자', compact: true },
  loop: 0.6,
};
