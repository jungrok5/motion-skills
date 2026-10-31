/* script-pixelsea.js — scene 1 of 「쭈꾸미 한 접시」: 바다 (sea-pixelsea, the Pixelsea kit). Beats in seconds; the scene
   keys its shots and acting off these names. Caption lines: [from, to, text, tag] — the tag (digits) sits on the box's
   top-left edge like a game's clock. */
window.SCRIPT = {
  DUR: 22,
  beat: {
    wide: 0,                 // dawn sea, the boat, 명현 waiting with the rod (fade in .5 s)
    cast: 3.2,               // cut in: rod swings back …
    release: 3.75,           // … and forward: the lure flies, the line arcs out
    land: 4.75,              // the lure hits the water (splash)
    under: 5.6,              // cut-away under the water: the lure on the seabed
    jigs: [6.45, 7.35, 8.2], // 고패질: the sinker lands — 톡, 톡, 톡 (lifted .5 s before each)
    creep: 5.9,              // the red 쭈꾸미 creeps in from the right
    spot: 8.45,              // it sees the lure ('!')
    grab: 8.95,              // it jumps on the lure and clings
    hit: 9.5,                // HIT! — rod bends, ≤ .25 s pixel shake
    face: [10.2, 11.0],      // close-up portrait insert
    lift: 11.0,              // pulling up: the 쭈꾸미 breaks the surface at 11.5
    drop: 12.45,             // shaken off into the bucket → ×1 at 12.55
    catches: 12.9,           // six quick catches, one every .68 s → ×7 at 16.88
    every: 0.68,
    home: 17.4,              // wide: the sun is up, the boat heads home
    bucket: 19.8,            // close on the bucket full of red 쭈꾸미 (hands off to the recipe scene)
  },
  lines: [
    [0.45, 3.1, '시월, 새벽 바다', '05:40'],
    [5.8, 9.0, '고패질… 톡, 톡', '06:05'],
    [9.6, 11.6, '묵직하다!', '06:12'],
    [11.75, 14.1, '명현님이 낚았다!', '06:14'],
    [14.25, 17.25, '한 마리, 또 한 마리', '06:40'],
    [17.7, 21.5, '오늘 저녁은 정했다', '07:20'],
  ],
};
