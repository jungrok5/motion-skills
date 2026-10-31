/* scenes/script.js — THE STORY of this film: beats (seconds), on-screen lines, end card. Write this first, from the
   storyboard. Every style version of the film reads it, so they all tell the same story on the same beats.
   lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s per line, no overlaps, first line ≤ 0.5 s.
   Scripture: copy it letter for letter from the official text (개역개정, bskorea.or.kr) — never type it from memory.
   Portrait safe zones: no words in the bottom 380 px or the right 140 px; nothing important in the top 160 px.
   This example is the house-style demo story (the same for every kit, so templates are comparable): the character walks
   in, kneels and plants a seed, waits, a sprout rises in the style's accent light at 14, the character stands and looks
   at it at 18, end card at 26 (≈ 4 s; new-film.py replaces endCard with Story.card(SOURCE) and adds the 0.6-s loop). */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],    // walks in (visible from frame 0 — no fade from black)
    kneel: 4.6,      // down on one knee at the spot
    plant: 6.0,      // the seed goes into the ground (the hand opens, then pats the soil)
    wait: [8, 13],   // waiting: only the style's ambient motion (boil, breath, a glance up)
    sprout: 14.0,    // a sprout rises, in the accent light
    rise: 18.0,      // the character stands and looks at it
    end: 26.0,       // end card
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { title: '제목은\n두 줄까지', passage: '본문 장:절', by: '교회 · 설교자', compact: true },
};
