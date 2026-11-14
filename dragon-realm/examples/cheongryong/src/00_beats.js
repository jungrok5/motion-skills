// 청룡 · 여의주 — the beat sheet.  One clock for picture and sound: 80 bpm in 12/8 (a bar of four dotted beats = 3 s).
// Everything that happens "on a beat" reads its time from here.
const BAR = 3, BEAT = 0.75;
const B = {
  OPEN: 0,        // blue hour: the five peaks, the moon, the lake like glass, mist; the pavilion's paper windows glow
  STIR: 12,       // something long moves under the lake; a wind chime; ripples
  EYE: 21,        // the imugi's back breaks the surface; its eye opens
  OMEN: 27,       // the sky darkens, wind bends the pines
  THUNDER1: 30,   // first thunder, far
  PEARL: 33,      // the clouds tear open; the yeouiju comes down in a shaft of light
  BURST: 39,      // the imugi erupts from the lake — the biggest hit of the film
  BOLT1: 43.5, BOLT2: 46.5, BOLT3: 49.5,   // lightning strikes close by during the climb through the storm
  SEIZE: 51,      // it takes the pearl: a breath of silence (0.4 s before), then white-gold light
  ROAR: 54,       // the new dragon's first roar; the wave of blue and gold runs down its body 51 → 57
  DAWN: 57,       // the clouds part, the sun rises, the theme opens in full
  PASS: 63,       // the dragon sweeps past the pavilion: chimes, leaves, lanterns swing
  SKIM: 66,       // it skims the lake, throwing a long curtain of spray
  RAINBOW: 69,    // it climbs through the last rain; a rainbow stands over the valley
  TABLEAU: 72,    // the last picture: sun, moon, five peaks, the dragon coiled in the clouds holding the pearl
  GONG: 78,       // one deep gong
  OUT: 81,        // fade into mist
  END: 84,
};
