/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the night-desert template (a lone traveller crosses a dune crest to his tent under the stars, goes in, and a
   lamp is lit inside; the camera pulls back until the tent is one warm point in the sea of sand): replace every line with this
   film's words (scripture verbatim from 개역개정, with its source line). The picture holds no words: captions sit in the dark band. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    walk: 0.0,     // the traveller walks along the crest toward a dark tent, the great star above; the camera low, trucking with him
    arrive: 9.0,   // he reaches the tent door
    enter: 10.4,   // he stoops into the tent
    lamp: 12.0,    // a lamp is lit inside: the door glows, the sand before it warms
    back: 15.0,    // the camera pulls back and rises while the lens closes in: one warm light in a sea of dunes
    end: 25.8,     // end card
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each
  lines: [
    [0.8, 5.6, '별빛뿐인 밤의 광야'],
    [6.2, 11.6, '한 사람이\n장막으로 돌아옵니다'],
    [12.2, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
