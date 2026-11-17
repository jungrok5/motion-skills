// 「North Pier」 — a worked example on a topic the starter does not cover: a lighthouse for a harbour ferry line.
// Not an animal and not leaning: the tower tapers between two mirrored 6° slants, its stripes are gaps between two
// evenly spaced families of horizontals (the Align panel distributes them), the beams are parallel bands, the lamp is
// a cut circle and the sea is a strip with five circle bites for waves.
import { Mark } from 'lc/mark.js';

export function mark() {
  const m = new Mark({ lean: 6, pivot: 760, seed: 11, sketch: { jitter: 10, wobble: 4 } });
  // the tower: two mirrored slants
  m.slant('towerL', 400).slant('towerR', 600, { lean: -6 });
  // tiers and the bottoms of their gaps: two evenly spaced families (placed by eye, then distributed)
  m.hs('tier', [470, 560, 650], { distribute: true });
  m.hs('gap', [488, 578, 668], { distribute: true });
  // the levels, top to bottom: one family of horizontals, each copied down from the last
  ['room', 280, 'gallery', 360, 'top', 380, 'base', 760, 'sea', 792, 'seaB', 852].forEach((v, i, a) => i % 2 || m.h(v, a[i + 1], { family: 'deck' }));
  // the roof: two lines meeting over the lamp
  m.line('roofL', [444, 280], [500, 214]).line('roofR', [556, 280], [500, 214]);
  // the uprights, left to right: beam ends, sea, gallery (also where the beams start), lamp room
  ['beamEnd1', 150, 'seaL', 290, 'galL', 418, 'roomL', 458, 'roomR', 542, 'galR', 582, 'seaR', 710, 'beamEnd2', 850].forEach((v, i, a) => i % 2 || m.v(v, a[i + 1], { family: 'col' }));
  // the beams: parallel bands each side
  m.angled('beamR', [500, 300], 9, { family: 'beamR' }).parallel('beamR2', 'beamR', [500, 338], { family: 'beamR' });
  m.angled('beamL', [500, 300], 171, { family: 'beamL' }).parallel('beamL2', 'beamL', [500, 338], { family: 'beamL' });
  // the lamp and the waves
  m.circle('lamp', 500, 320, 22);
  m.circles('wave', [0, 1, 2, 3, 4].map(i => [332 + i * 84, 798]), 27);

  m.shape('tower1', ['towerL&top', 'towerR&top', 'towerR&tier1', 'towerL&tier1'], { round: 4 });
  m.shape('tower2', ['towerL&gap1', 'towerR&gap1', 'towerR&tier2', 'towerL&tier2'], { round: 4 });
  m.shape('tower3', ['towerL&gap2', 'towerR&gap2', 'towerR&tier3', 'towerL&tier3'], { round: 4 });
  m.shape('tower4', ['towerL&gap3', 'towerR&gap3', 'towerR&base:0', 'towerL&base:0'], { round: 4, foot: true });
  m.shape('gallery', ['galL&gallery', 'galR&gallery', 'galR&top', 'galL&top'], { round: 6 });
  m.shape('room', ['roomL&room', 'roomR&room', 'roomR&gallery', 'roomL&gallery'], { round: 0 });
  m.shape('roof', ['roofL&room', 'roofL&roofR:6', 'roofR&room'], { round: 4 });
  m.shape('beamRight', ['galR&beamR', 'beamEnd2&beamR', 'beamEnd2&beamR2', 'galR&beamR2'], { round: 14 });
  m.shape('beamLeft', ['galL&beamL', 'galL&beamL2', 'beamEnd1&beamL2', 'beamEnd1&beamL'], { round: 14 });
  m.shape('sea', ['seaL&sea', 'seaR&sea', 'seaR&seaB', 'seaL&seaB'], { round: 12 });
  m.cut('lamp');
  for (let i = 0; i < 5; i++) m.cut('wave' + (i + 1));
  m.reads({ subject: 'lighthouse', facing: 'front', ground: 'base' });
  return m;
}
