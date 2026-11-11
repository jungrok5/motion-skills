// 「The Keeper's Whale」 · score.js — written against the beats (check.mjs prints them):
// wake 0 · the pencil 3 · first mark 6.2 · spread 9.3 · giant 15.2 · swarm 21.6 · wash 24.6 · desk 27.4 · end 32.
// The pencil scratches come from the drawing itself (the film adds one wherever a stroke is being drawn).
// A music box for the keeper (a small sea-shanty turn), a whoosh for the flying pencil and a pop at the catch, the sea's
// air from the moment the horizon is drawn, a low bell and a slow breath for the whale, a sparkle when its eye opens,
// a splash and flutter for the spout of fish, a swell into the crayon sunset, and the room at the desk.
const D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, Bb4 = 70, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81;
const turn = (t0, v = .5) => [[A4, 0], [D5, .3], [D5, .6], [E5, .9], [F5, 1.2], [E5, 1.5], [D5, 1.8], [A4, 2.4]].map(([n, d]) => ({ t: t0 + d, n, v }));
const shanty = (t0, v = .5) => [[D5, 0], [F5, .35], [A5, .7], [G5, 1.05], [F5, 1.4], [E5, 1.75], [D5, 2.1], [E5, 2.6], [F5, 2.95], [D5, 3.4]].map(([n, d]) => ({ t: t0 + d, n, v }));
export const SCORE = {
  reverb: { mix: .26, room: .86 },
  air: [{ t: 0, v: .03 }, { t: 9.3, v: .04 }, { t: 11, v: .16 }, { t: 24, v: .2 }, { t: 27.4, v: .08 }, { t: 30, v: .05 }],
  box: [{ t: 1.5, n: D5, v: .3 }, { t: 2.0, n: A4, v: .3 }, { t: 2.55, n: A5, v: .4 },
        ...turn(6.4, .45), ...shanty(9.4, .5), ...shanty(12.6, .42), ...turn(28.0, .35), { t: 30.6, n: D5, v: .35 }, { t: 30.6, n: A5, v: .3 }],
  keys: [{ t: 9.3, n: D4 - 12, v: .4, d: 3 }, { t: 9.3, n: A4 - 12, v: .3, d: 3 }, { t: 12.6, n: Bb4 - 24, v: .4, d: 2.6 }, { t: 12.6, n: F4 - 12, v: .3, d: 2.6 }, { t: 30.6, n: D4 - 12, v: .4, d: 1.4 }],
  bell: [{ t: 15.4, n: D4 - 24, v: .7 }, { t: 17.6, n: A4 - 24, v: .55 }, { t: 19.5, n: F4 - 12, v: .45 }],
  pad: [{ t: 15.4, d: 4, notes: [D4 - 24, A4 - 24, F4 - 12], v: .4 }, { t: 21.6, d: 3, notes: [Bb4 - 24, F4 - 12, D4], v: .45 }, { t: 24.6, d: 4.4, notes: [G4 - 24, D4 - 12, Bb4 - 12, F4], v: .5 }, { t: 27.4, d: 3.6, notes: [D4 - 24, A4 - 24, F4 - 12, D4], v: .4 }],
  sfx: [
    { t: 2.5, type: 'pop', v: .35 }, { t: 3.2, type: 'whoosh', d: 1.2, v: .45, pan: -.4 }, { t: 4.4, type: 'whoosh', d: 1.0, v: .4, pan: .3 }, { t: 5.9, type: 'pop', v: .55 },
    { t: 9.3, type: 'swell', d: .9, v: .15 }, { t: 12.0, type: 'flutter', d: .6, v: .15, pan: .4 },
    { t: 15.3, type: 'breath', d: 2.6, v: .45 }, { t: 18.2, type: 'breath', d: 2.4, v: .35 }, { t: 19.5, type: 'sparkle', d: .7, v: .7 }, { t: 20.5, type: 'splash', v: .35, pan: -.3 },
    { t: 21.7, type: 'splash', v: .6 }, { t: 21.75, type: 'whoosh', d: 1.4, v: .55 }, { t: 22.0, type: 'flutter', d: 3.4, v: .4 }, { t: 22.3, type: 'sparkle', d: 1.6, v: .55 },
    { t: 24.3, type: 'swell', d: 1.8, v: .3 }, { t: 26.0, type: 'chime', v: .5 }, { t: 27.6, type: 'paper', d: 1.0, v: .2 },
  ],
};
