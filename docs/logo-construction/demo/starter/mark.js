// 「Ember Fox」 — the starter mark: a fox standing, facing right, leaning into a stride on a 14° grid.
// Every corner is a crossing of two guides; the guides are drawn in this order in the film.
// This is an example of the style: a new topic gets its own subject, grid, lean and shapes (references/GEOMETRY.md).
import { Mark } from 'lc/mark.js';

export function mark() {
  const m = new Mark({ lean: 14, pivot: 600, seed: 5 });
  // the long slants that carry the body: rump, nape (also the back of the ear), chest
  m.slant('rump', 300).slant('nape', 600).slant('chest', 720);
  // the legs: one family of parallels, drawn once and copied across
  m.slants('leg', [355, 400, 455, 565, 620, 665]);
  // the horizontals
  m.h('crown', 300).h('jaw', 410).h('back', 470).h('belly', 600).h('ground', 790);
  // the free lines: muzzle, chin, ear fronts (parallel), the tail (its top parallel to the chin)
  m.line('bridge', [790, 300], [935, 372]).line('chin', [935, 372], [800, 410]);
  m.line('earF', [765, 300], [706, 175]);
  m.slant('ear2', 690).parallel('ear2F', 'earF', [828, 300]);
  m.parallel('tailTop', 'chin', [335, 470]).line('tailBot', [300, 600], [60, 702]);
  // the tail tip is split off by two parallels: the gap reads as the white tip
  m.slant('tipCut', 196).slant('tipGap', 172).slant('tipEnd', 70);
  // the eye: a circle cut out of the head
  m.circle('eye', 826, 352, 17);

  m.shape('body', ['rump&back', 'nape&back', 'nape&jaw', 'chest&jaw', 'chest&belly', 'rump&belly'], { round: 18 });
  m.shape('head', ['nape&crown', 'bridge&crown', 'bridge&chin:10', 'chin&jaw', 'nape&jaw'], { round: 16 });
  m.shape('ear', ['nape&crown', 'earF&crown', 'nape&earF:6'], { round: 10 });
  m.shape('ear2', ['ear2&crown', 'ear2F&crown', 'ear2&ear2F:6'], { round: 10 });
  m.shape('tail', ['rump&tailTop', 'rump&tailBot', 'tipCut&tailBot', 'tipCut&tailTop'], { round: 20 });
  m.shape('tip', ['tipGap&tailTop', 'tipGap&tailBot', 'tipEnd&tailBot', 'tipEnd&tailTop'], { round: 20 });
  m.shape('hind', ['rump&belly', 'leg1&belly', 'leg1&ground:0', 'rump&ground:0'], { foot: true, round: 10 });
  m.shape('hind2', ['leg2&belly', 'leg3&belly', 'leg3&ground:0', 'leg2&ground:0'], { foot: true, round: 10 });
  m.shape('fore', ['leg4&belly', 'leg5&belly', 'leg5&ground:0', 'leg4&ground:0'], { foot: true, round: 10 });
  m.shape('fore2', ['leg6&belly', 'chest&belly', 'chest&ground:0', 'leg6&ground:0'], { foot: true, round: 10 });
  m.cut('eye');
  m.reads({ subject: 'fox', facing: 'right', ground: 'ground' });
  return m;
}
