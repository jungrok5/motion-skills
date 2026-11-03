/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the oilpaint template (an old man reading a scroll by a lamp, Rembrandt key): replace every line with this
   film's words (scripture verbatim from 개역개정, with its source line). The painting holds no words: captions sit below it. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    room: 0.0,     // the dark room, the camera close on the lamp
    light: 1.0,    // the lamp brightens; the camera pulls back to the reader
    read: 9.0,     // he bends to the scroll; the light on the page grows
    look: 16.0,    // he lifts his head toward the window (a small turn), the light holds
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.4, '등잔 하나뿐인 방'],
    [6.0, 11.4, '한 사람이\n두루마리를 펼칩니다'],
    [12.0, 18.6, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.2, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
