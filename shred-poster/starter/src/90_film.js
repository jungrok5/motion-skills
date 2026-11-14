// starter · 90_film — ⑤ the film: the beat sheet, the cut, the floor, the machine, the grade and the sound,
// chosen for this topic. Every option is listed in references/KIT.md.
SP.film({
  title: 'Swim at first light',
  fps: 60,
  cuts: { cascade: 0.5, machine: 2.37, rebuild: 4.4, end: 8.0 },    // hook · cascade · machine · rebuild
  poster: POSTER,
  sheet: { strips: 24, jitter: 0.2, seed: 7, order: 'top', floor: { lo: 0.16, hi: 0.32, tint: '#e6ecf2' } },   // cold harbour concrete
  cascade: { width: 0.27, floor: { lo: 0.32, hi: 0.4 } },
  machine: { body: '#1d2b53', bg: '#F4F2EC' },                        // a navy machine, the inset on the poster's paper
  studio: { top: '#eef3f8', horizon: '#a3a8ad' },
  grade: { warm: 0.6 },                                               // a cooler dawn
  sound: { character: { bright: 1.1, body: 0.9 } },
});
