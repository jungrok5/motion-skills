// 「Matcha Tulip」 — the worked example: a cherry-blossom tea house's spring matcha latte, a four-stack tulip poured
// upward (the pitcher held below the cup), in a dark stoneware cup on a pink-chip terrazzo counter.
// Designed from its brief (BRIEF.md): the source clips pour rosettas on espresso; this one is a tulip, on matcha, from
// another direction.
import { film } from 'latte/film.js';

film({
  title: 'Matcha Tulip',
  kicker: 'Cherry-blossom tea house · spring only',
  caption: 'Fill high for the base, drop low and push in one bloom at a time, then a single cut raises the stem.',
  lang: 'en',
  size: [1080, 1920],
  seed: 23,
  drink: 'matcha',
  dir: 270,                                   // poured upward: the pitcher below, the flower opens toward the top
  cup: { color: '#2e3a43', rim: '#3a4852', inner: '#ece5d8', saucer: '#d6ccbf', handle: 0 },
  table: { kind: 'terrazzo', color: '#efe7de', accent: '#d68f9d' },
  ink: '#3b2f2c',
  accent: '#b4566b',
  pour: [
    { do: 'fill', dur: 2.4, at: [0, -.15], swirl: .15, say: 'Fill high for the base' },
    { do: 'drop', dur: .6, at: [0, -.3], say: 'Drop low for the first bloom' },
    { do: 'pour', dur: 1.4, to: [0, -.3] },
    { do: 'punch', dur: .5, to: [0, -.12], say: 'Cut, then push in from behind' },
    { do: 'drop', dur: .4, at: [0, -.12] },
    { do: 'pour', dur: 1.0 },
    { do: 'punch', dur: .5, to: [0, .04] },
    { do: 'drop', dur: .4, at: [0, .04] },
    { do: 'pour', dur: .8 },
    { do: 'punch', dur: .5, to: [0, .18] },
    { do: 'drop', dur: .4, at: [0, .18] },
    { do: 'pour', dur: .6 },
    { do: 'lift', dur: .3, q: .35, say: 'Lift and draw the stem' },
    { do: 'cut', dur: .5, to: [0, -.86] },
  ],
});
