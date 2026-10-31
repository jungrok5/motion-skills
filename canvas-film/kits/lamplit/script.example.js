/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the lamplit template: replace every line with this film's words (scripture verbatim from 개역개정,
   with its source line). The words ON the scroll are the scroll's own (scroll.near / scroll.far); captions sit above it.
   '/' in a scroll text marks where a line may break (a translator moves them; the kit wraps each piece). */
window.SCRIPT = {
  DUR: 30,
  beat: {
    lamp: 0.3,      // the lamp is lit: a warm pool spreads on the table
    open: 1.6,      // the scroll opens from the middle
    write: 4.4,     // the near passage is written in, letter by letter (each letter flares as the pen passes)
    written: 9.4,
    read: 10.2,     // a pen of light underlines it at reading pace
    lit: 13.6,      // the shared word burns to gold
    unroll: 15.6,   // the scroll unrolls to the right: blank years tick by under it, the camera travels with the edge
    far: 18.6,      // the far passage, already there, lights its shared word too
    pull: 20.4,     // pull back until the whole scroll is in frame; light runs from the near passage to the far one
    end: 25.8,      // end card
  },
  scroll: {
    label: '첫 번째 책',                                   // above the near passage (where we are in the Bible)
    near: '두루마리에 적힌 첫 구절이 / 여기에 들어갑니다', nearCite: '책 1:1 (개역개정)',
    farLabel: '마지막 책',
    far: '멀리 떨어진 두 번째 구절이 / 같은 낱말로 응답합니다', farCite: '책 9:9 (개역개정)',
    shared: '구절',                                        // the word both passages share (lit gold in each, as written there)
    years: '400년',                                        // written large over the blank stretch between them
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~3.5 s each (captions; the scroll's own words are not repeated here)
  lines: [
    [0.6, 4.2, '등불 아래 두루마리 하나'],
    [10.4, 13.4, '천천히 읽어 내려가면'],
    [15.8, 20.0, '오랜 세월이 지나도'],
    [20.6, 25.2, '같은 말씀이\n이어집니다'],
  ],
  endCard: { title: '영상 제목을\n여기에', passage: '본문 장:절', by: '채널 이름', cta: '이 장을 직접 읽어 보세요' },
};
