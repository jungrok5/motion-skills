/* scenes/script.js — THE STORY of this film: beats (seconds), on-screen lines, end card. Write this first, from the
   storyboard. Every style version of the film reads it, so they all tell the same story on the same beats.
   lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s a line, no overlaps.
   Scripture: copy it letter for letter from the official text (개역개정, bskorea.or.kr) — never type it from memory.
   Portrait safe zones: no words in the bottom 380 px or the right 140 px; nothing important in the top 160 px.
   This is the house-style demo story (the same for every kit, so templates compare): someone walks in, kneels and plants a
   seed, waits, a sprout rises in the style's accent light, they stand and look at it, end card. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],   // walks in along the path (frame 0 already shows the picture: no fade from black)
    kneel: 4.6,     // kneels at the spot
    plant: 6.0,     // the seed goes into the ground
    wait: [8, 13],  // waiting: the style's ambient motion only
    sprout: 14.0,   // a sprout rises, lit by the style's accent light
    rise: 18.0,     // stands up and looks at it
    end: 26.0,      // end card (~4 s), then the loop seam into frame 0
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  // placeholder end card — new-film.py replaces it with Story.card(SOURCE) built from the film's source.json
  endCard: { kicker: '2026.10.25 주일 1부예배', title: '설교 제목은\n두 줄까지', passage: '본문 장:절', by: '교회 · 설교자', compact: true },
  loop: 0.6,   // the last 0.6 s cross-fades into frame 0 (Shorts/Reels replay)
};
