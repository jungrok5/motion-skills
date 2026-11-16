# Market Day — storybook-short brief (worked example)

## Topic
- Given: "할아버지랑 장 보러 가는 날" (market day with Grandpa) — a topic the source film and the starter do not have.
- In one line: Mina wakes to a summer market Saturday, shops with Grandpa, walks home along the canal, drops her ice
  cream on the bench — and Grandpa gives her his.
- Not this: the source film's puffin girl, Roman square, autumn park, tram; the starter's windy hill. Summer, not
  autumn or winter.

## Cast
- **Mina**, seven, bright and quick. Head: black `straight` bob with a full fringe and **pink streaks**, a yellow-orange
  bucket hat with a red brim (`wear.bucket`), gold studs, freckles. Body: a blue summer dress with white dots and a white
  collar, bare arms and legs (skin-coloured limbs), red sandals. Story object: a strawberry ice cream cone (bench).
  Mass light. Sizes: close-up a = 215 (window, grin — the grin version has ice cream on her nose), wide a = 56.
- **Grandpa**, seventy-five, slow and kind. Head: grey curls, a red beret worn to one side, round glasses, a white
  moustache (head extra), heavy lids. Body: a long olive cardigan checked in mustard, brown trousers, dark shoes; a
  wicker basket with leeks and a loaf (held, swinging). Mass heavy. Size a = 62.
- Critters: the cat on the windowsill (tail curl, ear twitch, blinks), a white dog crossing the market, ducks on the
  canal (one swims over to the fallen scoop), birds.

## Shots
| # | name | s | framing | place | who and what | camera | in |
|---|---|---|---|---|---|---|---|
| 1 | window | 7.2 | close-up | a yellow wall with a shelf of jars, a window onto the far bank (houses, poplars), striped curtains, pots | Mina looks out (head follows the eyes), back to us at 4.3 and smiles; the cat looks at her and meows | slow pull back | paper |
| 2 | market | 8.4 | wide spread with the paper at its edges | sky, a row of coloured houses, bunting, three stalls with fruit crates, a lamp | Grandpa pays (arm keyed), turns to Mina; Mina looks at the dog, then at the bell; the dog trots across | push in 1.0 → 1.08 | dissolve |
| 3 | canal | 10.4 | wide, tracking | sky, the far bank (houses, poplars), the canal with ducks, a stone curb, lamps, grass in front | both walk home left → right, Mina ahead looking back at Grandpa | follows Mina | dissolve |
| 4 | bench | 10.6 | medium (zoom 1.55) | the canal behind, a flower pot, a park bench | ice cream; **the big move**; Grandpa offers his cone | slow push in | dissolve |
| 5 | grin | 5.6 | close-up | the canal, soft | Mina, ice cream on her nose, laughs at us | slow push in | dissolve |

## Motion
- Keys set by hand from observed timing; no generated video.
- Walks (canal): Mina 420 → 1560 in 0.4–9.6 s (≈ 2.1 steps/s); Grandpa 170 → 1330 in 0.7–9.9 s, longer stride, slower
  cadence, basket swinging. Both strides snap so the feet end planted.
- Glances: window — out at 0.5 (head yaw 0.1), to us at 4.3; market — Mina at the dog 1.2, at the bell 5.0 (surprised);
  Grandpa turns to Mina at 4.8 (heavy: slow, long counter-move); canal — Mina looks back at 3.6 (yaw −0.13).
- **The big move** (bench, Mina): antic 4.4 s (lifts the cone, leans back, rises a little) → big 4.9 s (leans in for the
  lick, sinks) → the scoop wobbles and topples at 5.0, falls and splats at 5.4 → settle 5.6 s (she sags back), surprised
  → shy. Grandpa: antic 7.2 s (pulls his cone in, leans away) → big 7.7 s (reaches across to her) → settle 8.4 s; Mina
  leans in at 8.6 and is pleased at 8.0.

## Sound
- Score: G major, 100 bpm, I–IV–vi–V; window `soft`, market `full`, canal `full`, bench `soft`, grin `full`.
- Ambience: window room + birds; market crowd + birds; canal water + birds; bench water + birds; grin water + birds.
- Events: meow 3.3 (window); woof 1.4, bicycle bell 4.6 (market); quack 2.2, 7.4 (canal); swish 4.9, plop 5.38, splat
  5.42, quack 6.4, chime 7.7 (bench); pop 1.6 (grin). Footsteps on stone (market, canal).

## Review
- Round 1: the market's paper edge was a heavy band of white blobs (places 6); canal lamps were clipped to stubs by
  their plate box; the bench was smaller than the people on it; the grin's ice cream did not read. Fix: a finer
  vignette; plate boxes include the lamps; `bench({ seat })` scales; a bigger nose dab with a highlight.
- Round 2: odd ovals round every bench slab and window frame — `ink()` drew a spline through rectangle corners, which
  overshoots into loops. Fix: corners sharper than ~55° are drawn as corners.
- Round 3: the scoop was 10 px at the wide size — the big move was invisible (story 5, big move 4). Fix: the bench shot
  is a medium (zoom 1.55, plates painted at 1.8×), cone and scoop 1.4× larger. `check.mjs` also caught Grandpa's offer
  with no gather (his "antic" moved the same way as the reach): now he pulls the cone in and leans away first.
- Round 4: story 8 · style 8 · characters 8 · places 8 · alive 9 · bodies 8 · big move 8 · sound 8 · own film 9 ·
  child 9. `check.mjs` passes.
