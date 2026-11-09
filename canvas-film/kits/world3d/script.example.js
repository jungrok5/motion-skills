/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the world3d template (a fishing village across a lake at dusk, the camera flying in low over the water toward
   one lit window): replace every line with this film's words (scripture verbatim from 개역개정, with its source line). The world
   holds no words: captions sit on the dark water under it. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    dusk: 0.0,     // high over the lake, the sun low behind the far hills, the village a row of small roofs on the far shore
    lamp: 8.0,     // the sun goes behind the hills; one window in the village lights
    boat: 13.0,    // the camera passes a small boat, one fisherman standing, his lantern lit
    night: 18.0,   // the other windows light one by one, the first stars; the camera settles low toward the one window
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.4, '해가 지는 호숫가'],
    [6.0, 11.6, '창 하나에\n불이 켜집니다'],
    [12.2, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
