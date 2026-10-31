# 레시피 카드 (recipe explainer card)

Slug `recipecard` · kit `kit.js` → vendored as `scenes/kit-recipecard.js` · global `window.RecipeCard` · first film:
「쭈꾸미 한 접시」 scene 2 `cook-recipecard` (`canvas-film/examples/jjukkumi/scenes/cook-recipecard.html`, 24 s).

**Provenance — borrowed craft, own renderer.** prompt-motion.com/ror-fly-9950f1 "Negroni recipe animation" by
**@ror_fly** (cream paper, one vessel dead-centre with measurement ticks, a "STEP n OF N" card with a big amount and the
ingredient name, a progress rail of numbered dots, bottles that tip and pour) and prompt-motion.com/sarut0bisasuke-cefa43
"White Russian recipe animation" by **@sarut0bisasuke** (a small script line under the title, an ingredient checklist that
ticks off). No shot, glass, bottle or word is copied; every line here is our own canvas code.

## What it looks like
A recipe explainer printed on **warm cream paper with a faint tooth**. One **hero vessel sits dead-centre** — a glass
bowl, pot, frying pan, planter or plate drawn in a thin, slightly uneven **ink line** with a soft flat fill — and its
contents rise and change as things go in. Things **enter from above / the side and pour or drop**: a bottle tips and pours
a stream with an ink edge, a measuring spoon tips its heap, pieces fall and land with one small settle, a ripple rings
the surface. Under it a **step card** (cream card, wobbly ink outline, a hard offset shadow in a pale accent) says
`STEP n OF N`, the **big amount** in chunky Do Hyeon with an ink extrusion, the ingredient name, one note and a progress bar;
cards swap with a **crisp slide**. Above it a **progress rail** of numbered dots fills in as steps complete. The title is
a **chunky wordmark** (Do Hyeon, accent face, ink extrusion) with a small script line. **One accent** carries the hero
contents and the marks that count them; everything else is ink and cream. Nothing glows; nothing is gradient.

**Carries well:** any process told start to finish (cooking, mixing, planting, assembling, a ritual, a routine); "it takes
this much of this"; measured quantities going in; a countdown or timer; a list that gets done; a small domestic story
with a warm ending (a dish, a message sent, a gift); humour in the precision of a recipe applied to something that is not
food ("싹 한 포기", "용서 한 큰술"); explainer Shorts.
**Carries badly:** grief, awe, darkness, night, weather, landscapes, crowds; faces and acting (there is no figure rig —
hands at most); anything without steps; long reading (the card holds ~3 lines); more than one hero colour.

## Palette (`RecipeCard.C`, `.ACCENT`, `.DEEP`, `.MARK`, `.PALE`)
| token | hex | use |
|---|---|---|
| `paper` | `#f6efe2` | the ground (built with mottling + tooth in `init`) |
| `card` | `#fffaf1` | step card, phone screen, plate, end card |
| `ink` | `#3a2a2a` | every line and the body type |
| `soft` | `#8b7a70` | notes, tick labels, pending labels, steam |
| `faint` | `#d9ccb8` | empty rail, pending dots, guides |
| `wash` | `#ece3d3` | the soft fill of an opaque pot/pan/bucket |
| `glass` | `rgba(214,226,226,.45)` | a clear vessel's tint (contents show through) |
| `water` · `flour` · `oil` · `leaf` · `flame` | `#d7e6e6` `#fbf7ee` `#d9a542` `#9bb07a` `#f7dcae` | small, muted ingredient colours — never a second accent |
| `ACCENT` | `#d9432b` | **THE accent** — the hero contents (`init({ accent })`) |
| `DEEP` | `#a8261b` | the accent cooked / reduced (`init({ deep })`) |
| `MARK` | = ACCENT | UI marks: big amounts, rail, bars, ticks that are on, the wordmark (`init({ mark })`) |
| `PALE` | `#f1c8bc` | the card's hard offset shadow (derived from the accent) |

## Fonts and words
Do Hyeon for the wordmark, amounts, names, rail numbers and the dial label; Noto Sans KR 500/700 for notes, labels, the
checklist, chat; the small "script" subtitle in `RecipeCard.HAND` (default Noto Serif KR 600 — **a handwriting face such as
Gaegu or Nanum Pen Script would be closer to the White Russian's script line; it is not installed, so it is an option:
`init({ hand: "'Gaegu',cursive", handWeight: 700 })` once a film's `film.json` carries it**). `RecipeCard.FONTS` for
`Pilot.run`. Every Korean string goes through `Pilot.tr`; counters through `Pilot.trn('{n} / 30초', n)` (bar labels and the
dial take already-translated strings). Portrait layout used by both pages: wordmark baseline ≈ 300–316, subtitle /
captions ≈ 376–470, rail y 500–540 (labels ≈ +60), picture band ≈ 600–1150, step card 1160–1510 (`RecipeCard.CARD`);
**nothing with words below y 1540 or right of x 940**.

## Kit API (`window.RecipeCard`, design space 1080 × 1920 px)
- setup: `init({ accent, deep, mark, pale, hand, handWeight, paperSeed })`, `W`, `H`, `C`, `ACCENT`, `DEEP`, `MARK`, `PALE`,
  `DISPLAY`, `SANS`, `SERIF`, `HAND`, `FONTS`, `rgbOf(color)`
- timing: `k(t, at, dur)` · `eo4(x)` crisp landing · `spring(x, s = 1.1)` one tiny overshoot · `fall(t, at, y0, y1, dur)` →
  `{ y, k, landed, sq }` (gravity + one small settle)
- ink: `wob(pts, o)` · `path(c, pts, closed)` · `ink(c, pts, { w, color, fill, closed, amp, seed, wob })` · `line(…)` ·
  `ell(cx, cy, rx, ry, a0, a1, n)` · `rrect(x, y, w, h, r)` · `shadow(c, x, y, rx, ry)`
- words: `say(c, s, x, y, o)` · `wordmark(c, s, x, y, { size, fill, depth, k, align })` · `subtitle(c, s, x, y, { k })` ·
  `captions(ctx, t, lines, { y, size })`
- vessel: `vessel({ kind: 'bowl'|'pot'|'pan'|'glass'|'planter'|'plate', x, y, w, h, clear, handle })` → `V.back(c)`,
  `V.clip(c, { top })`, `V.band(c, top)`, `V.liquid(c, f, color, { top })`, `V.front(c, { ticks: [{ f, label, on }], side, guide, shine })`,
  `V.levelY(f)`, `V.halfW(y)`; `slideX(t, inAt, outAt)` (vessel swaps — hard slides, never crossfades)
- pour & drop: `bottle(c, x, y, ang, { fill, glass, label })` · `tilt(t, at, { lift, hold, back, to })` ·
  `stream(c, x0, y0, x1, y1, { w, color, head, tail, bow })` · `spoon(c, x, y, ang, { r, len, fill, full })` ·
  `blob(c, x, y, r, color, { sq })` · `grains(c, t, { x, y0, y1, at, dur, n, shape })` · `ripple(c, x, y, rx, k)`
- heat & time: `steam(c, x, y, t, o)` · `flames(c, x, y, w, t, { k })` · `dial(c, x, y, r, k, { label, k0 })` ·
  `dashes(c, x, y, r, k)` (the "done!" pen dashes)
- step card: `CARD` · `card(c, q, o)` · `deck(c, t, cards, { until, swap })` — `cards = [{ at, step, of, amount, name, note,
  bar: [t0, t1] | k, barLabel: k → string, kicker, fresh }]`
- rail: `rail(c, t, { labels, at, done, appear, x0, x1, y, r })` · checklist: `checklist(c, t, { x, y, items: [{ amount, name, at }], lh, col })`
- phone: `phone(c, { x, y, w, h, name, k })` → screen box · `bubble(c, x, y, s, { me, k })` · `typing(c, x, y, t)` ·
  `chat(c, t, scr, [{ at, s, me } | { typing: [a, b] }])`
- frame: `begin(ctx)` · `fade(ctx, t, dur, fi = .5, fo = .5)` · `endCard(ctx, t, card, at, { y })`

```js
const S = window.SCRIPT, B = S.beat, R = RecipeCard;
const BOWL = R.vessel({ kind: 'bowl', x: 540, y: 780, w: 560, h: 280 });
function draw(ctx, t) {
  R.begin(ctx);
  R.wordmark(ctx, S.title, 540, 300, { size: 120, k: R.k(t, .3, .45) });
  R.subtitle(ctx, S.sub, 540, 376, { k: R.k(t, .7, .5) });
  R.rail(ctx, t, { labels: S.rail, at: B.step, done: B.done, appear: 1.5, y: 500 });
  BOWL.back(ctx);
  ctx.save(); BOWL.clip(ctx); BOWL.liquid(ctx, level(t), R.ACCENT); /* the film's pieces */ ctx.restore();
  BOWL.front(ctx, { ticks: [{ f: .3, label: '1', on: level(t) >= .3 }] });
  const b = R.tilt(t, B.pour, { hold: .8 });                       // a bottle tips over the bowl and pours
  R.stream(ctx, 700, 640, 560, BOWL.levelY(level(t)), { head: R.k(t, B.pour + .2, .12), tail: R.k(t, B.pour + 1, .12) });
  R.bottle(ctx, 700, 640, b, { fill: R.ACCENT, label: '소스' });
  R.deck(ctx, t, S.cards);                                          // [{ at, step, of, amount, name, note, bar }]
  R.fade(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: R.FONTS, init: async () => R.init(), draw });
```

## Draw order (keep it)
`begin` → wordmark / subtitle / captions → `rail` → per vessel: `V.back` → contents inside `V.clip` (liquid, pieces) →
falling things inside `V.band(BAND)` → `V.front` (outline, ticks) → steam → props that pour (stream first, then the bottle
or spoon over it) → `checklist` → `deck` → `endCard` → `fade`. Draw a moving vessel and its contents inside one
`translate(slideX(…))` so they leave together.

## Motion grammar
- **One vessel, centre.** It only changes at a step boundary, and then by a hard slide (`slideX`: in from the right with
  the house spring, out to the left with `eo4`), never a crossfade. Inside a step the vessel stays put; its contents move.
- **Things enter from above or the right and pour or drop**: a spoon slides in, tips (`spring`, ~.16 s), empties, slides
  out (~.9 s per spoon, one spoon per beat); a bottle tips over ~.3 s, pours, tips back (`tilt`, `stream` head/tail);
  pieces `fall` with gravity and one small settle; each impact gets a `ripple`. Drops enter through the top of the picture
  band (`V.band`, `V.clip({ top })`) so they never cross the title and rail.
- **Count what goes in.** Every pour changes a number on screen: the level against the ticks, the card's bar and its
  label, a dial, a checklist tick. The rail's dot ticks at the end of each step and its line fills to the next.
- **Cards swap crisply.** A new step slides the old card out left as the new one comes in (`deck`); a new ingredient
  within the same step only swaps the card's words (old up and out, new up from below).
- **Springs with one tiny overshoot** (`spring`, ~4 %); no cartoon bounce, no shake, no glow, no particle bursts that do
  not come out of a spoon or a bag.
- **End on "done!"**: the last dot ticks, a final card (`kicker`, `amount: '완성!'`, `fresh: true`), pen `dashes` over the
  finished thing, steam if it is hot.

## Performance (1080 × 1920, Chromium headless, 4 shared CPUs; 360 seeks with a canvas read)
- `init` (the paper sheet at full res): ≈ 215 ms.
- Per frame, mean / median / p95: `cook-recipecard` (octopus pieces, 5 vessels, phone) **13.2 / 13.4 / 20.5 ms**;
  template **8.5 / 8.0 / 12.1 ms**. The wobble is recomputed per stroke per frame (seeded noise) — cheap enough; cache
  point lists for shapes drawn hundreds of times.

## Pitfalls
- **Wobble that crawls**: `wob` depends on the distance along the path, so draw a moving shape in local coordinates and
  move the context (`translate` / `rotate`). Recomputing a shape in screen coordinates at a new place re-wobbles it.
- **Clear vs opaque vessels**: clear ones (bowl, pot, glass, planter) clip contents to the whole silhouette — the
  explainer look; pan/plate clip to the opening plus everything above the rim (pass `top` to stop at the picture band).
- **Falling pieces above a clear vessel** vanish at the back rim if drawn inside its clip — draw them outside the clip
  (inside `V.band`) until they land.
- **Tipped spoons raise their handle**: a spoon tipped by −1.1 rad points its handle almost straight up; keep the spoon
  ≥ ~180 px under the rail labels or shorten it (`len`).
- **Accent creep**: the hero contents, the wordmark and the UI marks share one hue. Keep other ingredients muted and
  small; if the accent must *arrive* late in a story, `init({ mark: <ink-ish> })` and pass `fill` to `wordmark`.
- **Bar labels and the dial take translated strings** (`Pilot.trn`); `say` translates on its own (pass `raw: true` for
  strings already translated).
- **Long names** shrink to the card width (`maxW`); keep notes to one short line.
- **Portrait only by design**: landscape (`?o=h`) pillarboxes the 1080 × 1920 frame in `begin`.

## What a scene author still draws
The hero contents and every ingredient's look (pieces, slices, a sprout — the film's own shapes), which vessel each step
uses and where it sits, the beats (`script.js`: step times, spoon times, the card words, the rail labels, the checklist),
any figure (the kit has no rig: hands or tools at most), and any film-specific prop (a bucket, a jar).
