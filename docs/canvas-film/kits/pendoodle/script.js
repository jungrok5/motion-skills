/* scenes/script.js — THE STORY of this film: beats (seconds), on-screen lines, end card. Write this first, from the
   storyboard. lines: [from, to, '한 줄\n두 줄', '“구절” 책 장:절 (개역개정)'?] — ≤ 2 lines, ≥ 1.6 s a line, no overlaps.
   Scripture: copy it letter for letter from the official text (개역개정, bskorea.or.kr) — never type it from memory.
   Portrait safe zones: no words in the bottom 380 px or the right 140 px; nothing important in the top 160 px.
   This is the shared placeholder story of every house-style template (styles/<slug>/template.html): a figure walks in,
   kneels, plants a seed, waits; a sprout rises in the style's accent light; the figure stands and looks at it. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: [0, 4],     // the figure walks in (frame 0 already shows it — no fade from black)
    kneel: 4.6,       // it kneels and digs a little hole
    plant: 6.0,       // the seed goes in; the wing pats the earth over it
    wait: [8, 13],    // waiting: only the style's ambient motion (rain on twos, puddles rippling, the line boiling)
    sprout: 14.0,     // the sprout rises, in the accent (the yellow highlighter)
    rise: 18.0,       // the figure stands up and looks at it
    end: 26.0,        // end card (≈ 4 s), then the loop seam into frame 0
  },
  lines: [
    [0.3, 3.8, '아무것도\n보이지 않아도'],
    [6.0, 9.5, '묻어 둔 것은'],
    [14.0, 17.6, '자라고 있었다'],
  ],
  endCard: { kicker: '2026.10.25 주일 1부예배', title: '설교 제목은\n두 줄까지', passage: '본문 장:절', by: '교회 · 설교자', compact: true },
  loop: 0.6,          // cross-fade the last 0.6 s into frame 0 (Shorts replay)
  accent: '255,222,70', // pendoodle: the yellow highlighter (rgb)
};
