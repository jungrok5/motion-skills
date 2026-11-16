/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the woodcut template (a sower at sunrise, the block carved before your eyes): replace every line with this
   film's words (scripture verbatim from 개역개정, with its source line). The words sit on the uncut black wood below the field. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    block: 0.0,    // a black block; the knife cuts the sun's disc first
    rays: 3.0,     // the sky is carved outward from the sun, ray by ray
    field: 8.0,    // the furrows are carved from the horizon toward us
    dawn: 12.5,    // the gold plate prints through the cuts: sunrise
    sower: 14.5,   // a small sower walks the ridge, casting seed
    ink: 24.0,     // the brayer rolls fresh ink over the block
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.6, '아직 아무것도\n새겨지지 않은 판'],
    [6.2, 11.8, '칼이 지나간 자리로\n빛이 들어옵니다'],
    [12.4, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 24.0, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
