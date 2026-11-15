/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the goldoil template (a clay lamp filled from a small jug on a stone floor in the dark; the last drop falls,
   spreads into a film of oil, and the lamp is lit): replace every line with this film's words (scripture verbatim from
   개역개정, with its source line). The oil holds no words: captions sit in the dark band under the floor. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    jug: 1.0,      // out of the dark: a warm lamp far behind, the clay lamp on the stone; a small jug comes down over it
    pour: 4.0,     // the jug tips: a thread of golden oil runs into the lamp's filling hole
    stop: 11.0,    // the jug tips back and moves aside; a last drop gathers on its lip, its thread thinning
    drop: 13.5,    // the thread pinches off: the drop falls, slowly, the room upside down inside it
    land: 16.0,    // it lands in front of the lamp — no splash — flattens and spreads as a thin film with a raised rim
    light: 18.5,   // the wick at the spout is lit; the film carries the flame's light
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.4, '어둠 속의 작은 등잔'],
    [6.0, 11.6, '기름이\n채워집니다'],
    [12.2, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
