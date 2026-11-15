/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the fresco template (late in the day a woman sweeps a plastered courtyard in the low sun through its gateway;
   something small glints in the pool of light; she stops, and the sun grows): replace every line with this film's words
   (scripture verbatim from 개역개정, with its source line). The picture holds no words: captions sit in the dark band under the floor. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    sweep: 1.5,    // the courtyard opens out of the dark: the gateway burning white-gold, the shaft, the pool; she begins to sweep
    glint: 12.5,   // something small glints in the pool of light on the flagstones
    stop: 13.6,    // her broom stops
    joy: 17.5,     // the sun grows (a haze moving off)
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.6, '해가 기우는\n빈 마당'],
    [6.2, 12.2, '구석구석\n쓸고 또 쓸고'],
    [12.8, 19.4, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [20.0, 25.4, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
