/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the silkscreen-poster template (a mountain lake at sunrise printed one ink at a time, a small sail crossing):
   replace every line with this film's words (scripture verbatim from 개역개정, with its source line). The words sit on the
   solid near ink at the bottom — the poster's own ground — never printed into the picture. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    print: 0.0,    // bare paper; the near ink is pulled first (the ground the words stand on), then light to dark
    inks: 1.2,     // sky bands, the sun, its rings, the far peaks and their snow, the hills, the lake, the reflection
    sail: 8.0,     // a small sail sets out across the lake, its wake stamped dash by dash
    birds: 13.0,   // three birds cross the sky
    shine: 19.0,   // the sun's ink catches the light (a wet sheen)
    end: 25.8,     // the last pull: the end-card plate
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [1.2, 6.2, '새벽 호수 위로\n해가 오릅니다'],
    [6.8, 12.2, '작은 배 하나가\n길을 나섭니다'],
    [12.8, 19.0, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.6, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
