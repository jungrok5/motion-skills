/* script-highfive.js — the starter's beats (seconds) and words. window.SCRIPT for highfive.html.
   One gag in three panels (10 s): set-up (준호 is done with his talk, 민지 offers a high five) → the fake-epic slow-motion approach
   (register switch: a black panel, white focus wedges, two big hands from the frame edges) → the payoff: they swing right past
   each other (SD), a deadpan beat, sweat. Every balloon holds ≥ Webtoon.readTime(text) (1.2 s + .07 s per character). */
window.SCRIPT = {
  DUR: 10,
  // camera stops: [panel id, arrive, leave] — the glide between panels is the gutter's time
  stops: [['meet', 0, 3.15], ['epic', 3.45, 5.55], ['miss', 5.9, 10]],
  beat: {
    cheer: .35,          // 준호's fist goes up
    offer: 1.75,         // 민지's hand goes up
    epic: 3.45,          // the register switch (impact)
    approach: [3.55, 5.45],
    swish: 5.9,          // 휙 — they pass each other
    dead: 7.0,           // the deadpan 「……」
    sweat: 7.45,
    tag: 8.1,
  },
  // [at, out, text]
  lines: {
    done: [.45, 2.0, '발표 끝났다!'],
    offer: [1.85, 3.1, '하이파이브!'],
    dots: [7.0, 9.5, '……'],
  },
  tag: { epic: '완벽한 타이밍.', miss: '빗나갔다.' },
  sfx: { swish: '휙', clap: '짝?' },
};
