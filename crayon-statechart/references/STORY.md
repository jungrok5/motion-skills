# STORY — topic → chapters → states → steps → layout

## 1. Find the process
Good topics have a physical or social process with choices in it: how something is made (incense, kimchi, paper, a
guitar), how a business runs (a boba shop, a bakery's morning), how a thing travels (a parcel, a letter, a blood
donation), how a system behaves (a traffic light, a vending machine, a login). Write the real steps first, in plain
words, and check the facts.

Then shape it:

| chapter | role | chart moves to use |
|---|---|---|
| I | the raw material becomes something | a straight run, **a split with two guards**, a merge, **a self-loop** (`[still damp] another day`) |
| II | it is worked / combined | a straight run, a split (by hand / by machine, at home / in a workshop), a merge, **a back edge** (`[too thin] another coat`) |
| III | it waits, or two things happen at once | **a parallel state** (`at the same time`: the sky and the yard, the jar and the table), a guard that reads the other region (`[in jar: sour]`), an exit to the end |

2–4 chapters, 6–9 steps each, 15–30 steps in all (30–60 s at 1×). One chapter is fine for a short film (the template).

## 2. Name things
- **State** = what the thing *is* now, a noun phrase: `bamboo poles`, `smooth sticks`, `a sticky paste`, `ripe`.
- **Transition text** = what *happens*, a verb phrase, 2–5 words a line, 1–2 lines: `soaked, split / into strips`.
- **Guard** = the condition, 1–3 words: `[by hand]`, `[still crisp]`, `[spring comes]`, `[in jar: sour]`.
- **Tag** = the same idea in the second language, short (the topic's own word is best: `phơi nan`, `통배추`).
- **Caption** = the step in one short line, lower-case, no final period: `if the strips are still damp, one more day in the sun`.
- **Chapter** = a one/two-word title (`Salted`, `Rolled`, `Two at once`) + a subtitle + a second-language line.

## 3. Steps
One step = one new thing: a chapter heading with its first state, one transition + its target, a loop, a whole parallel
box with its regions and first states. The step's `at` is the state the viewer should look at now (two ids inside a
parallel state). Steps that only add a loop keep the same `at`.

Order inside a step = drawing order: `edge` first, then the `state` it points to, then the props of that step.

## 4. Layout recipes (1350 × 1080 sheet, view height 972 above the bar)
- Chapter heading at `x: 56`, its top `y`; it takes ~170 px. The chart starts ~60 px under the heading's top, in a column at
  **x ≈ 700** (to the right of the heading).
- **Row spacing**: next state's `y` = previous `y` + 64 (box) + 86–100 (arrow with a two-line label). 150 px per row.
- **Split**: parent at x 700, `ex: -.5` / `ex: .5`, children at **x 540 and 870** (or 530 / 870), one row down. Guards go
  above the bend, outside; put the left child's action text on the left (`side: 'l'`).
- **Merge**: children → next state with `en: -.45` and `en: .45`.
- **Self-loop**: `edge('a', 'a', { guard, text })` — needs ~150 px free to the right of the box.
- **Back edge**: `edge('low', 'high', { exit: 'r', enter: 'r', via: [[X, lowMidY], [X, highMidY]] })` with X right of every
  box in between (e.g. 1050); its label sits right of X.
- **Into a parallel state**: `group` (x 40, w 1270) with `region`s (x 58 w 590 · x 702 w 590), a `divider` at x 675, an
  `init` + first state in each region (x 353 and 997). Regions 450 px high hold three rows.
- **Props**: left margin x 60–480 under the chapter heading; right margin x 980–1300. Bottom-centre at the ground line,
  usually the bottom of the nearest state row + 100. A person is ~220 px tall at s 1 (squat/kneel ~160).
- **Chapters**: the next heading ~150 px below the last state of the chapter before; the connecting edge runs down x 700.
- A new chapter scrolls its heading to the top, so a chapter's content should fit in ~900 px below its heading.

Let `check.mjs` find collisions; it names both elements. Typical fixes: move the prop, add 20 px between rows, `side: 'l'`,
widen a split (children further apart), shorter text.

## 5. Props per chapter
1–3 per chapter: **who** (a `person` with the right pose and action), **with what** (vessel, tool, machine), **where /
when** (weather, a house, a table). Ingredients as a row with a `note` under them. Use `pile` for many of one thing.
Write a `defineProp` for the one object the topic needs that the kit lacks (see KIT.md); build it from `P.shape`,
`P.ell`, `P.rect` so it is hatched in the same hand.
