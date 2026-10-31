/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the illuminated template (one miniature on a manuscript page): replace every line with this film's
   words (scripture verbatim from 개역개정, with its source line). The page holds no words: captions sit below it. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    page: 0.0,     // the page in candlelight, the camera already creeping in
    paint: 1.2,    // the flock is painted in, one by one
    apart: 6.0,    // the one sheep apart, at the edge
    found: 12.0,   // tooled gold rays rise behind it; a glint sweeps across all the gold
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.4, '채색 필사본 한 장'],
    [6.2, 11.4, '무리에서 떨어진\n한 마리'],
    [12.4, 18.4, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.0, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
