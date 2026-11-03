/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the engraving template (a lighthouse on a night sea, its beam sweeping the plate): replace every line with
   this film's words (scripture verbatim from 개역개정, with its source line). Keep solid ink behind the captions. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    night: 0.0,    // the sea at night in dense lines, a small boat on the swell
    lamp: 4.0,     // the lighthouse lamp is lit
    sweep: 8.0,    // the beam begins to turn; where it passes, the hatching parts to paper
    boat: 15.0,    // the beam finds the boat and stays on it
    end: 25.8,     // end card
  },
  lines: [
    [0.8, 5.4, '어두운 바다'],
    [6.0, 11.6, '등대에\n불이 켜집니다'],
    [12.2, 18.8, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [19.4, 25.2, '그림이 말하는 것을\n한 줄로'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
