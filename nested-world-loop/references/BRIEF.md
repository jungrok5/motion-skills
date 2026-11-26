# Brief — topic → ring

Write the brief before any code: `new-loop.mjs` copies the form below into the project as `BRIEF.md`. A topic is
something that can hold a world inside it (a snow globe, a jar, a painting, a book, a watch, a doll's house, a ship in a
bottle, a map, a model railway, a terrarium, a radio, an aquarium …) — the brief turns it into a ring of worlds whose
innermost holds the first.

How to find the ring (references/PORTALS.md has the patterns):
1. **The container** — what in the first world holds the second? (an object you can see into, or a picture / window /
   screen / hole you can see through)
2. **The way back** — what in the last world contains the first world's *room*? Usually a building with a lit window,
   a hatch, a door, a picture on a wall. The loop closes when the last world's portal shows the first world's entry view.
3. **Two or three worlds, rarely four.** Each world earns its place by a different scale *and* a different light.
4. **One zoom per loop of at least ×8** (check.mjs fails a ring that does not shrink): somewhere the scale drops by a lot
   (1/50 … 1/1000); other portals can be 1:1 (a window into the next room).

<!-- form -->
# __TITLE__ — brief

## The ring
One line: the worlds in order, each with its units and the portal into the next, and how the last returns to the first.
Example: `cabin (cm) —bottle, 1 m = 0.25 cm→ sea in the bottle (m) —lantern door, 1:1→ lantern room (cm) —floor hatch, 1:1→ cabin`.

| world | units | what it is | its light (key / practicals / fill) | what moves (whole cycles per loop) | portal → next (type, scale, where) |
|---|---|---|---|---|---|
| | | | | | |

Loop zoom (product of portal scales):
Duration (s) and why:

## Worlds
For each world: the place in one line; the objects that make it read at a glance (hero, supporting, small things);
materials (each different — metal, glass, wood, ceramic, paper, water …); palette tied to its light; the one detail a
person would look for if they lived there.

## Seams
For each portal: where the camera passes (through an opening? into a container?), what is in frame on both sides of the
hand-off, how the light changes across it (it must not jump), and the `bounds` box the inner world occupies.

## Camera
The keys per world in words (what each key looks at and why), where it lingers (`pace` < 1), where it is close enough
for depth of field to make a miniature read as one.

## What would make it look like a tech demo
Two or three concrete risks for this topic (empty floors, flat colours, one light, a world that does not move, a seam
you can see) and how the design avoids them.

## Stills review
Fill this after rendering `render.mjs <dir> --sheet 12` and `--seams` and looking at them at full size. One row per
still; ✓ or ✗ with what is wrong, then fix and re-render. No `?` or TODO may be left (check.mjs reads this).

| still | reads at a glance | light (key, falloff, no flat fill) | materials told apart | depth (dof, haze, layers) | alive (something moves) |
|---|---|---|---|---|---|
| | | | | | |

Seams (from `--seams`): is there any frame where you can tell the world changed? ✓ / ✗ per seam.
<!-- /form -->

## The review — what each column means

- **Reads at a glance** — a person who has never seen the film says what the place is in one word.
- **Light** — a named key you can point at, its pool falling off; shadows soft but present; at least one practical in
  frame or just off it; nothing lit flatly from everywhere. Night is dark but not empty (check.mjs: median ≥ 6/255).
- **Materials told apart** — metal reflects something, glass shows what is behind it and what is in front, wood has
  grain and a sheen, paper is matte, water moves. Two neighbouring objects never share a material by accident.
- **Depth** — depth of field focused on the look target; haze or fog in big spaces; foreground / middle / back.
- **Alive** — something in frame moves on its own (flame, waves, lens, motes, boat, rain). A frozen world reads as a
  model on a turntable.
- **Seams** — on `--seams`, the three frames around each hand-off read as one move. check.mjs measures the same thing
  (the same moment drawn from either world; the step across the seam), the eye checks that nothing *reads* wrong.
