// Tarn Wyrm — the beat sheet: one clock for picture and sound (90 bpm, a bar of four beats = 2.667 s).
const BEAT = 2 / 3, BAR = BEAT * 4;
const B = {
  OPEN: 0,          // dusk over a mountain tarn; the water is still
  RISE: BAR * 1.5,  // the wyrm breaks the surface            (4.0 s)
  TURN: BAR * 3,    // it climbs and turns round the crag     (8.0 s)
  CALL: BAR * 4,    // it calls once, high over the water     (10.67 s)
  OUT: BAR * 5,     // fade
  END: BAR * 5.25,  // 14.0 s
};
