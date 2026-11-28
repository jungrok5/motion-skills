// Rosetta — the starter: a classic rosetta on espresso in a white cup on an oak table. Runs as it is.
// A new topic gets its own drink, cup, table, figure (the pour score) and words — see references/BRIEF.md.
import { film } from 'latte/film.js';

film({
  title: 'Rosetta',
  kicker: 'Morning bar · cup 01',
  caption: 'Fill high, drop close, rock the pitcher and pull back — then one clean cut ties the leaves together.',
  lang: 'en',
  size: [1080, 1920],
  seed: 11,
  drink: 'espresso',
  cup: { color: '#f5f2ed', saucer: '#f0ece6', handle: 0 },
  table: { kind: 'wood', color: '#9a6a43', accent: '#5e3c22' },
  accent: '#f0c48a',
  pour: [
    { do: 'fill', dur: 2.6, at: [-.1, 0], swirl: .16, say: 'Fill high to set the base' },
    { do: 'drop', dur: .6, at: [-.1, 0], say: 'Drop the spout to the surface' },
    { do: 'wiggle', dur: 5, hold: 2.8, to: [.52, 0], amp: .11, ampTo: .07, hz: 3.5, say: 'Rock it, then pull back' },
    { do: 'lift', dur: .3, q: .4, say: 'Lift and cut through' },
    { do: 'cut', dur: .5, to: [-.84, 0] },
  ],
});
