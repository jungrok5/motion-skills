/* script-shadowstage.js — scene 3 of 쭈꾸미 한 접시 (door-shadowstage, 16 s): the friends arrive.
   Beats in seconds; door-shadowstage.html keys its drawing off these names. Words appear on the hanging plaque. */
window.SCRIPT = {
  DUR: 16,
  beat: {
    part: [0.2, 2.4],       // the curtains part on our house at dusk (fade in from black over the first .5 s)
    plaque: 1.0,            // the plaque drops in from behind the valance
    lamp: 2.6,              // the street lamp is lit
    win: [3.0, 3.8, 4.6],   // the windows light one by one: the kitchen (the red dish on the table), the attic, the side room
    lantern: 5.2,           // the lamp by the door
    walkA: [5.0, 9.8],      // guest A (cap) walks in from the left and stops by the door, then closes the step
    walkB: [5.4, 10.1],     // guest B (bob, the gift box) a step behind
    open: [10.6, 11.6],     // the door swings open: a wedge of warm light falls on them, the host in the doorway
    wave: 11.8,             // the host waves; A waves back (12.2), B holds the gift out (12.6)
    beckon: 13.4,           // the host's hand: "come in"
    out: 15.5,              // fade to black
  },
  sky: [[1.5, 0], [5.5, 1], [9, 2], [12, 3]],   // time → time of day (0 dusk … 3 night)
  lines: [
    [1.6, 5.0, '저녁 일곱 시'],
    [6.4, 10.2, '친구 부부가 왔다'],
    [11.6, 15.4, '어서 와!'],
  ],
};
