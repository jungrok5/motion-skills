/* script-diorama.js — scene 4 「식탁」 of 쭈꾸미 한 접시 (table-diorama, kit: diorama). Beats (s), words, end card.
   The four at the table, seen dead-centre: hosts left (나, 배우자), guests right; the red 쭈꾸미볶음 in the middle. */
window.SCRIPT = {
  DUR: 22,
  beat: {
    open: 0.5,       // the curtains part (2.4 s) on the table
    bow: 3.4,        // 「잘 먹겠습니다!」 — all four nod together
    chop: 4.5,       // the guests and 배우자 take up their chopsticks
    reach: 5.4,      // the guests reach into the pan (배우자 0.7 s later); first bites ~6.9
    yum: 7.9,        // the guests' faces light up; 나 claps
    down: 9.0,       // chopsticks back across the bowls
    glass: 9.6,      // hands to the glasses
    clink: 10.9,     // four glasses meet over the pan 「짠!」
    drink: 11.5,     // a sip
    laugh: 13.3,     // laughter goes round the table
    back: 16.9,      // the push-in eases back out
    end: 18.0,       // end card over the dimmed room
  },
  // [from, to, text] — hanging title cards (≤ 2 lines, ≥ 2 s; a sentence ≥ 3.5 s)
  lines: [
    [3.2, 5.9, '잘 먹겠습니다!'],
    [10.8, 13.0, '짠!'],
    [13.9, 17.6, '넷이 먹으니\n더 맛있다'],
  ],
  endCard: { title: '쭈꾸미 한 접시', passage: '낚시 · 요리 · 초대', by: '2026. 10. 31', compact: true },
};
