# Rain Collector — storybook-portrait brief (the starter)

## Topic
- Given: "a kid who goes out on purpose when it rains" (the starter's own topic, chosen to be far from the source picture)
- In one line: a small boy in a yellow raincoat, out in the rain on purpose, looking up to count the drops.
- Not this: the source illustration (a girl with long black-and-blue hair and a striped cardigan) — no long hair, no
  stripes, no earrings; not a weather icon (no umbrella, no cloud with a face).

## Who
- About seven; curious, pleased with himself, a little damp.
- The story detail: the rain itself, falling across the sheet in thin blue pencil, and the raincoat hood bunched behind
  his neck (he has pushed it back to feel the drops).
- Mass: light — quick head, short counter-move, quick breath (3.6 s).
- Idle: breathes, blinks often, eyes go up to the sky between glances; flyaway hairs.

## Design
- Head a = 215, wide jaw (0.15), freckles (26), eyes 0.15 looking up [0.15, −0.7], ink-line nose, small smile (0.3).
- Hair: `short` with a full fringe, dark brown `#24180f`, streaks of ochre `#c8772c` / `#e7a04a` (the coloured-streak
  signature of the style, warmed for a brown head).
- Clothes: `collar` garment = the raincoat in solid yellow crayon `#f2c21c`, a paler collar, ochre folds down the sides,
  three brown toggles; the hood (`behind` layer) in a deeper yellow.
- Extras: hood (static, rides the body), folds and toggles (static), rain (live, front layer: 46 slanted pencil strokes
  that skip the face, splash ticks on the shoulders).
- Palette: skin `#f2cdb4`, blush `#f0866e`, hair `#24180f` + ochre, raincoat `#f2c21c` / `#d89a12`, rain `#6f9fc8`, ink
  `#241c22`, paper `#fbf8f1`. Two families carry it: yellow-ochre against rain blue.
- Composition: head centre (540, 600) on 1080×1350; hood and shoulders fill the lower third; ~60 % paper shows.

## Motion
- Draw 7 s, live 10 s.
- Reference: set by hand from observed timing (eyes saccade ~0.1 s ahead of the head); no generated video.
- Beats:

  | t | gaze | head | face | why |
  |---|---|---|---|---|
  | 0.9 | [0.1, −0.95] | — | pleased | looks straight up into the rain |
  | 2.3 | [0.75, −0.4] | yaw 0.12, tilt 0.07 | — | follows a drop to his right; the head goes along |
  | 4.6 | [0.6, 0.5] | — | surprised | a drop lands on his coat |
  | 5.4 | [−0.5, 0.1] | yaw −0.09, tilt −0.04 | pleased | looks the other way, grinning |
  | 8.0 | [0.15, −0.8] | yaw 0, tilt 0.02 | — | back to the sky |

## Review
- Round 1: the fringe and sides hung to the jaw — read as a girl's bob (topic 6, its own picture 7). Fix: length 0.5 →
  0.3 so the hair stops above the ear lobes.
- Round 2: the raincoat was one flat yellow (style 7, palette 7). Fix: ochre crayon folds down both sides.
- Round 3: topic 8 · style 8 · face 9 · silhouette 8 · palette 8 · hand 8 · body 9 (cast sheet: near ear, nose, toggles
  all turn together) · motion 8 (rain never stops; the glance gathers and lands) · own picture 9 · cover 8. `check.mjs`
  passes.
