/* script-risoline.js — scene 4 of 쭈꾸미 한 접시: the dinner table, seen from above (table-risoline.html).
   Beats in seconds; lines: [from, to, '한 줄']. Portrait only: words in the top band, nothing in the bottom 380 px. */
window.SCRIPT = {
  DUR: 24,
  beat: {
    light: 0.0,    // fade in from black: the warm lamp comes on over the table, the red pan sizzles and steams
    sit: 2.7,      // the four sit down, one per side — hosts 명현 (bottom) 2.7 · 경찬 (left) 3.05, guests 정록 (top) 3.4 · 세진 (right) 3.75
    bow: 5.3,      // 잘 먹겠습니다 — four heads dip
    chop: 6.3,     // chopsticks picked up
    eat: 7.0,      // chopsticks reach into the pan, curly red pieces lifted and eaten; face inserts "맛있다!"
    lay: 11.85,    // chopsticks down
    raise: 12.6,   // glasses picked up and raised over the pan
    clink: 13.55,   // 짠! — the four glasses meet
    down: 14.3,    // glasses back down
    laugh: 15.3,   // laughter: four face inserts; the pan empties
    end: 19.8,     // end card over the table (empty pan, four glasses); fade to black 23.4–24
  },
  lines: [
    [4.3, 7.1, '잘 먹겠습니다!'],
    [7.5, 11.6, '바다에서 온 한 접시'],
    [15.9, 19.7, '넷이 먹으니 더 맛있다'],
  ],
  clink: [13.45, 15.4, '짠!'],
  inserts: [   // face inserts: [from, to, who, expression, word]
    [8.75, 10.75, 'blue', 'chew', '맛있다!'],
    [10.15, 12.15, 'cream', 'yum', '음~!'],
  ],
  laughs: [15.4, 15.7, 16.0, 16.3],   // the four round laughter panels pop in (정록, 세진, 경찬, 명현) and close at 19.45
  endCard: { title: '쭈꾸미 한 접시', passage: '명현님이 낚고, 경찬 · 명현 부부가 차린 저녁', by: '정록 · 세진 부부 초대 · 2026. 10. 31', compact: true },
};
