// examples/seed · score.js — the score of 「Water the Seed」, written against the shot starts check.mjs prints:
// home 0 · water 5.5 · hill 10.5 · pond 15.5 · crow 21 · splash 25.5 · cliff 31 · sprout 35 · home again 41 · end 46.5
// A bouncy C-major band (pizzicato oom-pah, marimba, the hero's whistled tune), a running groove for the chase, tiptoe
// pizzicato for the crow, everything drops out for the fall, felt piano for the sad beat, the tune again for the loop.
import { oompah, tune, beat } from '../../lib/score.js';

const BPM = 120, b = (n, t0 = 0) => beat(BPM, n, t0);
const C = 60, F = 65, G = 67, Am = 57;
const cat = (...xs) => xs.flat();

// 1–2 · home + water: oom-pah under a marimba tune, the whistle while Momo hums
const home = oompah(BPM, [[C, 4], [F, 4], [G, 4], [C, 4], [C, 4], [F, 4], [G, 2], [C, 2]], 1.0, { bv: .5, pv: .26 });
const motif = [[72, 1], [76, .5], [79, .5], [76, 1], [72, 1], [74, 1], [77, .5], [76, .5], [74, 2], [71, 1], [74, .5], [77, .5], [76, 1], [74, 1], [72, 3], [null, 1]];
const marimba1 = tune(BPM, motif, 1.0, { v: .5 }).map(e => ({ t: e.t, n: e.n, v: e.v }));
const hum = tune(BPM, [[79, 1], [81, .5], [79, .5], [76, 1], [72, 1], [74, .5], [76, .5], [77, 1], [76, 1.5]], 6.0, { v: .55, legato: .95 });

// 3–4 · the chase: faster bass walk, kick and snare, marimba runs; boings on every hop
const run = oompah(152, [[C, 4], [G, 4], [F, 4], [G, 4], [C, 4], [G, 4], [F, 4], [G, 4], [C, 4], [G, 4], [F, 4], [C, 4], [G, 4]], 10.5, { bv: .6, pv: .22 });
const drums = []; for (let i = 0; i < 52; i++) { const t = beat(152, i, 10.5); drums.push({ t, k: i % 2 ? 'snare' : 'kick', v: .4 }); drums.push({ t: t + beat(152, .5), k: 'tick', v: .25 }); }
const runs = []; for (let i = 0; i < 20; i++) { const t = beat(152, i * 2, 10.5), base = [72, 74, 76, 79][i % 4]; for (let j = 0; j < 4; j++) runs.push({ t: t + j * beat(152, .25), n: base + [0, 2, 4, 7][j], v: .35 }); }

// 5 · the crow: tiptoe pizzicato in A minor, low and sneaky
const tip = []; for (let i = 0; i < 9; i++) tip.push({ t: 21 + i * .5, n: [57, 60, 64, 60, 57, 59, 62, 59, 57][i], v: .45 });

// 6 · the splash: a march (kick on Momo's steps), a stab when the can comes up, then the tune in triumph
const march = []; for (let i = 0; i < 4; i++) march.push({ t: 25.5 + i * .36, k: 'kick', v: .6 }, { t: 25.5 + i * .36 + .18, k: 'snare', v: .25 });
const triumph = tune(BPM, [[79, .5], [84, .5], [88, 1], [84, .5], [88, 1.5]], 28.3, { v: .5 }).map(e => ({ t: e.t, n: e.n, v: .55 }));

// 8 · the sad beat: felt piano, A minor → F → C, then the sprout shimmer and a major chord
const sad = [[57, 35.9, 2], [64, 36.4, 1], [60, 36.9, 1.5], [53, 37.6, 2], [60, 38.1, 1], [57, 38.6, 1.2]].map(([n, t, d]) => ({ t, n, d, v: .5 }));
const bloom = [{ t: 40.4, n: 60, d: 2.5, v: .5 }, { t: 40.4, n: 64, d: 2.5, v: .45 }, { t: 40.4, n: 67, d: 2.5, v: .45 }, { t: 40.4, n: 72, d: 2.5, v: .4 }];

// 9 · home again: the tune once more, a short button
const home2 = oompah(BPM, [[C, 4], [F, 4], [G, 4], [C, 2]], 41.4, { bv: .5, pv: .26 });
const marimba2 = tune(BPM, motif.slice(0, 9), 41.4, { v: .5 }).map(e => ({ t: e.t, n: e.n, v: e.v }));

export const SCORE = {
  pluck: cat(home.pluck, run.pluck.filter(e => e.t < 21), tip, home2.pluck),
  bass: cat(home.bass, run.bass.filter(e => e.t < 21), [{ t: 25.5, n: 36, v: .6 }, { t: 26.2, n: 43, v: .5 }, { t: 26.9, n: 36, v: .6 }, { t: 27.6, n: 43, v: .5 }], home2.bass),
  mallet: cat(marimba1.filter(e => e.t < 6), runs.filter(e => e.t < 21), triumph, marimba2),
  whistle: hum,
  keys: cat(sad, bloom),
  drum: cat(drums.filter(e => e.t < 21), march, [{ t: 46.0, k: 'kick', v: .6 }, { t: 46.0, k: 'clap', v: .4 }]),
  glock: [{ t: 29.0, n: 84, v: .4 }, { t: 29.12, n: 88, v: .4 }, { t: 46.0, n: 84, v: .5 }, { t: 46.0, n: 91, v: .4 }],
  sfx: [
    { t: 0, type: 'pencil', d: 1.3, v: .5 }, { t: 1.3, type: 'pencil', d: 1.0, v: .55 },
    { t: 2.3, type: 'tick', v: .5 }, { t: 3.4, type: 'pop', v: .3 },
    { t: 8.25, type: 'gust', d: 1.5, v: .7 }, { t: 8.65, type: 'pop', v: .55 }, { t: 9.5, type: 'slideup', d: .35, v: .6 },
    { t: 10.5 + 2.4, type: 'boing', v: .4 }, { t: 10.5 + 3.0, type: 'boing', v: .55 },
    ...[.3, .9, 1.5, 2.1].map(t => ({ t: 15.5 + t, type: 'boing', v: .35, pan: .3 })), ...[.9, 1.5, 2.1].map(t => ({ t: 15.5 + t, type: 'splash', v: .3 })),
    ...[.8, 1.8, 2.8, 3.8].map(t => ({ t: 15.5 + t, type: 'boing', v: .55 })), ...[1.6, 2.6, 3.6].map(t => ({ t: 15.5 + t, type: 'splash', v: .5 })),
    { t: 21.6, type: 'whoosh', d: 1.2, v: .6, pan: .5 }, { t: 22.8, type: 'pop', v: .4 }, { t: 23.2, type: 'whoosh', d: .8, v: .35 }, { t: 24.1, type: 'caw', v: .6, n: 2 },
    { t: 27.1, type: 'caw', v: .7, n: 3 }, { t: 27.9, type: 'slideup', d: .4, v: .5 }, { t: 28.2, type: 'splash', v: .8 }, { t: 28.55, type: 'splash', v: .6 }, { t: 28.6, type: 'squeak', v: .5 },
    { t: 29.3, type: 'whoosh', d: .5, v: .5 }, { t: 29.6, type: 'whoosh', d: .5, v: .45 }, { t: 29.9, type: 'pop', v: .4 }, { t: 30.3, type: 'thump', v: .3 },
    { t: 32.1, type: 'slidedown', d: 1.2, v: .55 }, { t: 33.3, type: 'thump', v: .8 }, { t: 33.85, type: 'pop', v: .3 },
    { t: 35.0, type: 'slidedown', d: .9, v: .45 }, { t: 35.9, type: 'thump', v: .7 },
    { t: 38.0, type: 'drip', v: .6 }, { t: 38.62, type: 'drip', v: .5 }, { t: 38.85, type: 'crack', v: .6 }, { t: 39.0, type: 'sprout', d: 1.4, v: .7 }, { t: 40.4, type: 'chime', v: .6 },
    { t: 40.45, type: 'boing', v: .5 },
    { t: 41.0, type: 'flip', d: .6, v: .5 }, { t: 42.7, type: 'pencil', d: .6, v: .5 }, { t: 44.7, type: 'gust', d: 1.3, v: .6 }, { t: 45.25, type: 'slideup', d: .35, v: .6 },
  ],
  air: [{ t: 0, v: .15 }, { t: 32, v: .15 }, { t: 33, v: .3 }, { t: 39, v: .1 }],
  reverb: { mix: .17, room: .78 },
};
