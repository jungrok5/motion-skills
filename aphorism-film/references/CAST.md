# CAST — designing the characters, and keeping their bodies possible

## Design one per topic
`cast.js` exports `CAST = { lead: {...}, ... }`. Every field is a design choice for this film, not a default to keep:

| field | values | think |
|---|---|---|
| `style` | `hime` (long, blunt bangs and side locks) · `long` · `bob` · `short` | silhouette first: it must read at 120 px tall |
| `hair`, `streaks: [a, b]` | colours | two streak colours echo the film's accents (the reference's cobalt + vermilion) |
| `eye`, `eye2` | iris outer, iris lower glow | the close-up's strongest colour note |
| `top`, `topKind` | colour · `blazer` · `sweater` · `dress` | the dominant colour of the lead in every wide shot |
| `collar`, `tie` | colours (tie `null` for none) | the diamond tie pattern takes `eye2` + `eye` |
| `bottom`, `bottomKind` | colour · `skirt` · `trousers` | |
| `legs`, `shoes` | socks/tights, shoes | |
| `bag` | colour or `null` | a satchel on the back: a readable prop that shows which way is back |
| `band` | colour or `null` | a headband |

One lead is enough for most films; a second character must contrast in silhouette (hair style) and dominant colour.

## Framings
- `P.bust(ctx, spec, { x, y, s, turn, look, blink, mouth, sway, bodyTurn })` — the close-up. `s` = face height (330–420
  for a frame-filling close-up). `turn` −.6 … .6 (+ = turns to screen right). Blink on twos for 2–3 frames every 2–4 s;
  move `look` in holds, not continuously.
- `P.body(ctx, spec, { x, y, h, view, dir, pose })` — the full figure standing on `y`. `view: 'side'` with `dir` 1 (faces
  right) or −1, `'front'`, `'back'`. Poses: `P.walk(phase)`, `P.run(phase)`, `P.stand()`; phase advances with
  `g.twos()` (e.g. `P.walk((g.twos() * .95) % 1)` ≈ one stride a second).

## Directions and joints (CONTRIBUTING.md — "몸이 물리적으로 가능한지")
Built into figure.js:
- In a 3/4 close-up the eye on the side the face turns toward is the **far** eye (narrower), the nose points that way,
  the ear and more cheek show on the back side.
- In side view the near arm and leg are drawn in front of the body, the far ones behind and a step darker; the
  satchel is on the back; the hair streams behind; the collar and tie are at the front.
- Mirroring (`dir: -1`) flips the whole figure, satchel included — check asymmetric designs on the cast sheet.
- Joint limits (`LIM`): knee folds back only (−2.6 … 0), elbow forward only (0 … 2.6), hip −1.3 … 2.2, shoulder
  −1.4 … 3.1, spine −.35 … .6, neck ±.6, head turn ±.62, neck twist (head − shoulders) ±.5. Every pose is audited at draw
  time; `check.mjs` fails with `body: <name> <joint> <value> outside […]`.
- Feet are planted: `body()` puts the lowest sole on `y`; a contact shadow sits under the figure.

## The cast sheet (before any shot)
`cast.html` (copied by `new-film.mjs`) draws every character in `cast.js`: close-up 3/4 left · front · 3/4 right; side
walking → and ←, front, back, running → and ←; then a motion shot walking both ways with blinks. Render it
(`render.mjs cast.html --stills 1,6`), score it with these questions, then `check.mjs cast.html`:
1. Is it the same person in all nine drawings (hair, streaks, colours, satchel)?
2. In each 3/4 and side view, do head, chest, hips and toes point the same way? Is the satchel on the back?
3. Does any knee bend forward, any elbow backward, any foot float or sink?
4. "Is the neck turned or the torso?" — if the question comes up, fix the pose.
