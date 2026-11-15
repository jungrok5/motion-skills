// score.js — 「The Lamplighter」, written against the timeline in index.html (check.mjs prints the shot starts: 0 · 9.6 · 14.2).
// A music-box waltz over a surf bed; soft paper taps on her steps; a flame catching at each lamp (4.0, 8.8, 10.6); the pulley
// creaks while the lantern climbs; a chime and a warm harmonium chord when the lighthouse lights (12.8); the tune comes back
// slower for the walk home, ending on the tonic.
import { tune, beat } from '../../lib/score.js';
const BPM = 96, b = beat(BPM, 1);   // 0.625 s a beat, 3/4
// an original lullaby in F (bar = 3 beats); [midi, beats]
const A = [[72, 1], [77, 1], [81, 1], [79, 2], [77, 1], [76, 1], [77, 1], [79, 1], [72, 3], [74, 1], [76, 1], [77, 1], [79, 2], [81, 1], [77, 3]];
const B = [[81, 1], [84, 1], [81, 1], [79, 2], [77, 1], [76, 1.5], [74, .5], [72, 1], [77, 3]];
const steps = (t0, t1, every) => { const out = []; for (let t = t0; t < t1; t += every) out.push({ t, type: 'tap', v: .35, pan: -.2 + .4 * ((out.length) % 2) }); return out; };
const bass = (t0, roots) => roots.flatMap(([n, bars], i) => Array.from({ length: bars }, (_, j) => ({ t: t0 + (roots.slice(0, i).reduce((s, r) => s + r[1], 0) + j) * 3 * b, n, v: .45 })));
export const SCORE = {
  reverb: { mix: .28, room: .82 },
  sea: [{ t: 0, v: .22 }, { t: 9.6, v: .16 }, { t: 14.2, v: .26 }, { t: 20.2, v: .18 }],
  air: [{ t: 0, v: .05 }],
  musicbox: [...tune(BPM, A, .5), ...tune(BPM, B, 14.6, { v: .45 })],
  bass: [...bass(.5, [[53, 2], [48, 2], [53, 2], [48, 1], [53, 1]]), ...bass(14.6, [[53, 1], [48, 1], [46, 1], [53, 1]])],
  pluck: [0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => [{ t: .5 + i * 3 * b + b, n: 65, v: .22 }, { t: .5 + i * 3 * b + 2 * b, n: 69, v: .2 }]),
  pad: [{ t: 12.7, d: 2.2, notes: [53, 60, 65, 69], v: .35 }, { t: 18.4, d: 2.2, notes: [53, 60, 65, 72], v: .3 }],
  keys: [{ t: 4.05, n: 84, v: .3, d: .5 }, { t: 8.85, n: 86, v: .3, d: .5 }],
  sfx: [
    ...steps(.3, 3.4, .43), ...steps(5.15, 8.15, .36), ...steps(15.8, 20.0, .45),
    { t: 3.95, type: 'strike', v: .55 }, { t: 8.73, type: 'strike', v: .55 }, { t: 10.55, type: 'strike', v: .5 },
    { t: 9.3, type: 'rustle', d: .6, v: .5 }, { t: 11.2, type: 'creak', d: 1.6, v: .5 }, { t: 12.8, type: 'chime', v: .7 },
    { t: 13.9, type: 'whoosh', d: .8, v: .25 }, { t: 15.75, type: 'rustle', d: .35, v: .45 }, { t: 16.1, type: 'bell', n: 91, v: .5, pan: .5 },
    { t: 17.5, type: 'rustle', d: .25, v: .35 },
  ],
};
