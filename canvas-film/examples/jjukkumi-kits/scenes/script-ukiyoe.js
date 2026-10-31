/* script-ukiyoe.js — scene 1 (명현 fishes) 「바다」 (sea-ukiyoe, 22 s): 쭈꾸미 fishing at dawn in October, printed as an ukiyo-e sheet.
   Beats (s): dawn sea + boat → the rig drops (4.0) and lands on the seabed (6.5) → 고패질 jigs, a beni 쭈꾸미 peeks from behind
   a rock (7.4), climbs over it and creeps to the lure → THE HIT (10.5: hard cut, splash claws, ≤ .3 s shake) → reeled up, it
   breaks the surface (13.0), dangles, is swung into the bucket (15.1) → two more quickly (cycles at 15.5 / 16.4) → the rod is
   stowed, the sun comes up, the boat turns home (18.4) → close on the bucket full of red 쭈꾸미 (hand-off to scene 2). */
window.SCRIPT = {
  DUR: 22,
  beat: { drop: 4.0, bed: 6.5, peek: 7.4, climb: 8.6, pounce: 10.1, hit: 10.5, reel: 11.3, surface: 13.0, swing: 14.3,
          bucket: 15.1, c2: 15.5, c3: 16.4, stow: 17.3, sun: 16.6, turn: 18.4, home: 18.8, close: 19.6, end: 22 },
  lines: [
    [0.7, 4.5, '시월의 새벽 바다'],
    [5.0, 8.6, '줄을 내리고, 기다린다'],
    [10.6, 12.9, '툭— 묵직하다!'],
    [13.2, 15.3, '명현님이 낚았다!'],
    [15.4, 17.5, '한 마리, 또 한 마리'],
    [17.9, 21.4, '오늘 저녁은 정했다'],
  ],
  endCard: null,
};
