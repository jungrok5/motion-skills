# The brief

Write `BRIEF.md` in the project **before** `reel.js`. The topic decides everything below; the style (linen, satin stitch,
a needle that sews, paper tags, one gliding camera, the cord and the end card) stays the same.

## Form

```markdown
# <title> — brief

## Topic
One or two sentences: what the reel lists or walks through, and who will watch it (a post, a menu, a launch, a lesson).
The order of the items, and why that order (steps in time, a ranking, a route, a recipe).

## Items  (2–24; ~6–8 reads best on a phone, 15 is the source's length)
| # | title (embroidered, ≤ 14 characters) | tag line (≤ 28) | small line (≤ 26) | patch idea |
|---|---|---|---|---|
| 1 | … | … | … | the one picture that says it, in 3–8 shapes; base shape + colour |

## Patches
For each item: the base (rect / pill / round, its colour and edge thread), the shapes on it in sewing order (what is
under goes first), their thread colours, and the stitch angle when it matters (hair, grain, water: stitches follow it).
Neighbouring patches differ in base colour or shape; the set shares one palette.

## Palette
Cloth, title thread, paper, ink, accent (tag border + small line), cord, and the 6–10 patch threads. Title thread vs
cloth contrast ≥ 3 (check.mjs).

## Timing
beat (s per item, default 2.2), stitch (default 1.2), travel (default .7); total length. Outro: card title, subtitle,
footer — or none.

## Props
Which sewing things lie on the table for this topic (default mix: spools in the patch colours, buttons, a thimble, a
pincushion, scissors) and anything to leave out.

## Stills review
Filled from `render.mjs <reel> --items` and `--sheet 12`, at full size. One line per question below, with what you
fixed.
```

## Stills review — the questions

Answer each from rendered frames, not from the code:

1. **Does each patch say its item at a glance?** Cover the title: can you still guess the item from the patch?
2. **Is it embroidery?** Stitches visible and running in sensible directions, raised edge, sheen moving with the light —
   not a flat vector icon pasted on cloth.
3. **One style?** Every patch uses the same thread width, edge treatment and palette family; none looks like it came
   from another reel.
4. **Readable on a phone?** Title and tag read at 390 px wide; the tag's small line too (check.mjs reports the px).
5. **Does the needle sew?** It goes through the cloth, rises before each plunge, the thread runs from the last stitch to
   the eye in the colour being sewn — no floating, no sliding while it is through the cloth.
6. **Does the camera glide?** Each item framed whole when its tag lands; the move to the next grows out of the hold; no
   stop-start, no hunting.
7. **Light and table alive?** Leaf shadows moving softly, props in the colours of the patches, depth of field keeping
   the item sharp and the foreground soft.
8. **Outro lands?** The cord ties every item together in order; the end card fills the last frame, its list readable.
9. **Anything that pulls the eye wrongly?** Props covering a patch, a shadow hiding a title, a tag over a patch,
   a guide line left showing after the stitches.
