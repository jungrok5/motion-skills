/* scenes/script.js — THE STORY of this film: beats (seconds), on-screen lines, end card. Write this first, from the
   storyboard. Every style version of the film reads it, so they all tell the same story on the same beats.
   lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s a line, no overlaps.
   Scripture: copy it letter for letter from the official text (개역개정, bskorea.or.kr) — never type it from memory.
   Portrait safe zones: no words in the bottom 380 px or the right 140 px.
   This example is the house-style demo story (the same for every kit, so templates compare): a figure walks in, kneels
   and plants a seed, waits; a sprout rises with the style's accent light; the figure stands and looks at it. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],    // the figure walks in (frame 0 already shows the world and the figure — no fade from black)
    kneel: 4.6,      // down on one knee at the spot
    plant: 6.0,      // the seed goes into the ground (the hand presses it in, pats the soil)
    wait: [8, 13],   // waiting: nothing happens but the style's ambient motion (light, motes, vines…)
    sprout: 14.0,    // THE moment: a sprout breaks the ground and rises, with the accent light
    rise: 18.0,      // the figure stands and looks at it
    end: 26.0,       // end card (~4 s)
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { title: '영상 제목은\n두 줄까지', passage: '본문 0:0-0', by: '설교자 · 교회', compact: true },
};
