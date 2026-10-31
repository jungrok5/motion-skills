/* script.js — THE STORY of one film: beats, on-screen words, end card. Scenes read window.SCRIPT.
   Placeholder for the bass template: replace every line with this film's words (scripture verbatim from 개역개정,
   with its source line). Beats are seconds; the template's drawing keys off these names. */
window.SCRIPT = {
  DUR: 30,
  beat: {
    lines: 1.0,        // title lines slide in and build the room (a thread of light is already there at 0.35)
    light: 3.0,        // the window light stutters on (on twos)
    enter: 5.0,        // the figure slides into the light and stops dead
    grow: [7.0, 9.8],  // the opening widens twice — the light patch on the floor grows on each beat
    turn: 12.4,        // crash push: the figure lifts the one red thing
    flash: 15.4,       // negative stab, then black
    black: 15.5,       // only the red remains
    rebuild: 18.0,     // the lines build the room again
    warm: 20.0,        // the light comes back warm
    end: 25.8,         // end card (camera pulls back)
  },
  // [from, to, text, source?] — ≤ 2 lines, ≥ ~2 s each. Bass captions cut on/off on these times (no fades).
  lines: [
    [0.5, 3.6, '처음엔 작은 빛 하나'],
    [4.0, 6.6, '조금씩'],
    [7.0, 9.4, '넓어지고'],
    [9.8, 12.0, '어느새 방을 채운다'],
    [12.4, 15.3, '여기에 성경 구절 한 줄', '책 1:1 (개역개정)'],
    [18.6, 25.4, '두 줄짜리 구절은\n이렇게 넣습니다', '책 1:2 (개역개정)'],
  ],
  endCard: { title: '설교 제목을\n여기에', passage: '본문 1:1-8', by: '설교자 · 교회', cta: '전체 설교는 채널에서' },
};
