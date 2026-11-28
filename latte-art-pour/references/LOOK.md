# The look — cup, drink, table, words

## The frame
- **Tall** (`size: [1080, 1920]`, default): words on top (kicker, then title or the running step), the cup in the
  middle, the score strip and the two meters (height, flow) under the saucer, the caption at the end.
- **Wide** (`[1920, 1080]`): the cup on the right, the words in a left column.
- The camera never moves during the pour; in the outro it pushes in 7 % on one ease while the title and caption fade in.

## Drink
Presets in `lib/film.js` `DRINKS`: `espresso`, `ristretto`, `mocha`, `matcha`, `hojicha`, `chai`, `ube`, `beet`,
`golden`. Or your own: `drink: { crema: ['#dark', '#light'], foam: '#…' }`. Keep the foam at least .18 brighter than
the lighter crema (`check.mjs` → contrast) or the figure will not read. The crema marbling is seeded (`seed`).

## Cup
`cup: { color, rim, inner, saucer, handle, size }` — outer glaze (`color`, also the handle), the lip (`rim`), the inner
glaze around the liquid (`inner`, defaults to `color`), the saucer (`null` for none), `handle` in degrees (0 = right,
90 = down), `size` (1 = default). Dark outer + cream inner reads well; a white cup on a light table needs a darker
saucer or table to separate.

## Table
`table: { kind, color, accent }` — `wood` (planks, grain), `marble` (veins), `linen` (weave), `slate`, `terrazzo`
(chips: `accent` is the chip colour), `solid`. Painted once from the seed; lit from the same side as the cup.
The words pick light or dark ink from the table's brightness; set `ink` and `accent` to choose.

## Light
`light` (degrees, where it comes FROM; default 225 = top-left): shadows of saucer, cup, handle and pitcher fall away
from it, the inner wall is in shadow on that side, the window glare sits on that side of the crema.

## Words
- Kicker (small caps, accent colour), title (serif: Source Serif 4 / Nanum Myeongjo for Hangul, ≤ 2 lines), step label
  (serif, one per `say`), labels (Inter / Noto Sans KR), caption (one sentence, sans).
- Sizes at 1080 short side: title 74, step 52, kicker 30, label 28, caption 34 — never below the minimums in check.
- Steps say what the hand does, in the topic's voice ("Rock it, then pull back", "Cut, then push in from behind").
- On-screen words are English unless the brief says otherwise (`references/OWNER-FEEDBACK.md`); `lang: 'ko'` gives
  Korean meter labels (높이 / 흐름) and Hangul falls back to the bundled Korean fonts.

## Sound
`render.mjs` synthesises the pour from the score (`scripts/audio.mjs`): band-passed noise for the stream (brighter when
high, a glug when low that wobbles with the wiggle), a pin scratch, one saucer tick at the start, a low room bed.
`--silent` for none, `--audio file.wav` for your own track.
