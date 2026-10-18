/* scenes/script.js — THE STORY of this film: beats (seconds), on-screen lines, end card. Write this first, from the
   storyboard. Every style version of the film reads it, so they all tell the same story on the same beats.
   lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 3.5 s each (≥ 4.5 s for two lines), no overlaps.
   Scripture: copy it letter for letter from the official text (개역개정, bskorea.or.kr) — never type it from memory.
   Portrait safe zones: no words in the bottom 380 px or the right 140 px; nothing important in the top 160 px.
   This example is a placeholder story (a lone tree on a hill at night) for styles/<slug>/template.html. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    hookIn: 0.0,   // fade in: the subject, barely there in the dark
    light: 5.0,    // a light appears and grows
    grow: 9.5,     // the threat gathers (rising until the turn); the camera pushes in
    turn: 15.0,    // the decisive moment: the one colour is laid on
    recoil: 16.4,  // the threat flinches and withdraws
    calm: 21.0,    // resolution: the light stays, warm
    end: 25.8,     // end card
  },
  lines: [
    [0.5, 5.0, '처음엔\n아무것도 보이지 않았다'],
    [5.3, 9.2, '작은 빛 하나'],
    [9.6, 14.4, '어둠이 다가와도'],
    [15.4, 20.6, '(성경 구절 자리 —\n개역개정 원문 그대로)', '책 장:절 (개역개정)'],
    [21.0, 25.4, '빛은 꺼지지 않는다'],
  ],
  endCard: { title: '설교 제목은\n두 줄까지', passage: '본문 장:절', by: '설교자 · 교회', cta: '전체 설교는 채널에서' },
  accent: '#9c1a1a',   // the one colour (charcoal: red pastel)
};
