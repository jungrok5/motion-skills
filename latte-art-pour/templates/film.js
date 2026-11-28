// __TITLE__ — written by new-film.mjs. A skeleton: it runs, but every line below is a placeholder (check.mjs fails the
// "Replace:" words). Design the drink, cup, table, figure and words for your topic from BRIEF.md — the score recipes are
// in references/SCORE.md, the look in references/LOOK.md. The heart below is the contract, not a look.
import { film } from 'latte/film.js';

film({
  title: 'Replace: the title',
  kicker: 'Replace: the kicker',
  caption: 'Replace: one sentence on how this cup was poured.',
  lang: 'en',                                  // 'ko' for Korean labels (높이 / 흐름)
  size: [1080, 1920],                          // tall (phone); [1920, 1080] puts the words beside the cup
  seed: 5,
  drink: 'espresso',                           // a preset (espresso, ristretto, mocha, matcha, hojicha, chai, ube, beet, golden) or { crema: [dark, light], foam }
  dir: 180,                                    // the way the milk goes on screen: 180 = leftward, pitcher on the right
  cup: { color: '#f5f2ed', saucer: '#efebe5', handle: 0 },
  table: { kind: 'solid', color: '#d8d2c8' },  // wood · marble · linen · slate · terrazzo · solid
  pour: [
    { do: 'fill', dur: 2.4, at: [-.05, 0], swirl: .15, say: 'Replace: step one' },
    { do: 'drop', dur: .6, at: [.1, 0], say: 'Replace: step two' },
    { do: 'pour', dur: 3.2, to: [.1, 0] },
    { do: 'lift', dur: .3, q: .35, say: 'Replace: step three' },
    { do: 'cut', dur: .5, to: [-.85, 0] },
  ],
});
