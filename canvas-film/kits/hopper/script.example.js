/* script.js — THE STORY of one film: beats (seconds), on-screen lines, end card. Placeholder text: replace all of it.
   Lines: [from, to, '한 줄\n두 줄', '출처 (개역개정)'?] — ≤ 2 lines, ≥ 3.5 s each (4.5 s for two lines); scripture verbatim
   from 개역개정 with its source line. Portrait: no words in the bottom 380 px or right 140 px. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    hookIn: 0.0,   // fade in: a quiet room, the first light appears on the floor
    rise: 3.5,     // the light starts to travel across the floor
    reach: 14.0,   // THE moment: the light reaches the one subject (a burst, the accent appears)
    settle: 19.5,  // stillness; the light warms
    end: 25.8,     // end card
  },
  lines: [
    [0.6, 4.2, '아직 아무 일도 없는 방'],
    [4.6, 9.2, '빛은 조금씩\n자리를 옮긴다'],
    [9.6, 13.6, '아무도 보지 않는 동안에도'],
    [14.4, 19.0, '그리고 마침내\n그 사람에게 닿는다'],
    [19.6, 25.4, '여기에 본문 한 구절', '책 장:절 (개역개정)'],
  ],
  endCard: { title: '설교 제목\n두 줄까지', passage: '본문 장:절', by: '설교자 · 교회', cta: '전체 설교는 채널에서' },
  accent: '#9c1a1a',
};
