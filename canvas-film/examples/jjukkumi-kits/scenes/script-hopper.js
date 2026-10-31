/* script-hopper.js — scene 3 「초대」 (door-hopper): the story's beats (seconds), on-screen lines.
   Lines: [from, to, '한 줄'] — portrait: words in the upper third (y 400), never in the bottom 380 px or right 140 px. */
window.SCRIPT = {
  DUR: 14,
  beat: {
    still: 0.0,     // fade in: the hall at dusk, the lamp over the side table, the red dish waiting, 명현 by the door
    bell: 5.0,      // 딩동
    reach: 5.7,     // 명현's hand goes to the lever
    press: 6.75,    // the lever goes down (latch)
    push: 6.92,     // a short push outward…
    release: 7.32,  // …let go: the door swings open on its own (stiff creak), the lamp light sweeps over the guests
    colour: 7.6,    // colour arrives: the dish's red comes up
    warm: 8.6,      // the bulb warms
    guests: 7.8,    // 「정록 · 세진 부부가 왔다」 (they stand at the door)
    welcome: 11.8,  // 「어서 와!」
    out: 13.4,      // fade to black (scene 4 opens on warm light over the table)
  },
  lines: [
    [0.8, 4.6, '저녁 일곱 시'],
    [7.8, 11.6, '정록 · 세진\n부부가 왔다'],
    [11.8, 13.9, '어서 와!'],
  ],
  small: [[5.0, 6.7, '딩동']],
  accent: '#c8402a',   // 쭈꾸미 red — the one saturated colour
};
