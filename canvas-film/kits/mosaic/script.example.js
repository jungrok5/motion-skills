/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the mosaic template (a church floor of a basket of loaves and two fish, found by lamplight): replace every
   line with this film's words (scripture verbatim from 개역개정, with its source line). The words sit on the plain stone
   threshold below the floor, never on the tesserae. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    dark: 0.0,     // the floor in darkness; a lamp is brought in at the left
    lamp: 1.0,     // the lamp's pool crosses the floor: fish, the basket, the loaves
    whole: 9.0,    // the light settles over the whole floor; the camera pushes in slowly
    gold: 14.0,    // gold glass stones turn over one by one, a ring around the basket
    glint: 20.0,   // a glint runs round the ring
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.6, '오래된 바닥 아래'],
    [6.2, 11.8, '돌 하나하나에\n새겨 둔 이야기'],
    [12.4, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
