# The look

What makes it read as embroidery on a sewing table, and the numbers behind it.

## Stitches (stitch.js)
- **Every stitch is a segment**, generated from the shape: fills are rows at the shape's `angle`, one thread apart
  (0.65 mm); rows longer than 7 mm split into ≈ 3.4 mm stitches staggered by a third per row (the brick of a tatami fill);
  `line` is a satin column (stitches across the line, slanted); `run` is a running stitch. Rows go back and forth and
  advance left → right, so a word is sewn the way it is read.
- **Painted three times per stitch**: a darker, wider pass (the gap between threads), the thread colour (jittered ±7 %
  per stitch so a fill shimmers), a thin highlight offset toward the light. A height pass with the same strokes becomes
  the normal map, so the real light makes the sheen; the edge of each later layer stands a little higher.
- **Order is a texture**: the alpha of the normal map holds when each stitch is sewn (0–1). The shader discards what is
  not yet sewn — one material, any progress, no per-frame redraw — and `seek(t)` stays a pure function of t.
- **Transfer guide**: before a shape is sewn its outline shows faintly on the cloth (washable-marker blue), as on real
  pattern-marked fabric; it fades as the element finishes.
- **Raised**: each patch floats 0.7 mm above the cloth with a soft drop shadow (the colour map's alpha at a blurred mip,
  revealed with the same order), so a sewn patch sits on the linen and an unsewn one is nothing.

## Table (props.js)
- Linen: plain weave drawn thread by thread (warp over weft), slubs, colour drift; normal map from the weave. Soft folds
  only outside the layout, so patches lie flat.
- Props from code in the patch threads: spools (wood lathe + wound thread), buttons, a dimpled brass thimble, a red
  pincushion with pins, steel-and-gold scissors. Most lie just beside an item, so they cross its shot as foreground.

## Light
- A low warm sun (spot light, elevation ≈ 50°) through leaves: the gobo is one canvas of scattered branches over the whole
  cone (three.js ignores a spot map's repeat), swaying by moving the light a few cm on two slow sines.
- Sky fill (hemisphere) and a weak warm bounce from the other side; a small studio env map for the metal.
- Shadows: PCF soft, 4096 map over the layout.

## Lens and grade
- Depth of field with an in-focus band (focus ± 16 % of the distance) — the item sharp end to end, the foreground prop
  and the far cloth soft. Gathered at half resolution (36 taps), mixed back by circle of confusion.
- ACES tone curve, warmth (+R, −B), vignette, light grain. Exposure .92.

## Camera
- One shot per item, low and close (elevation ≈ 52°, alternating ±11° left/right, ±2° roll), framed to the whole item
  (`margin` 1.22) — the patch ≈ 70 % of the frame width.
- During a hold it drifts in and toward the next item; the move to the next item grows out of that drift (quintic
  Hermite: position, velocity and zero acceleration match) with a small rise in the middle.
- Outro: rise to an overview (elevation 64°) while the gold cord is couched along the gaps between rows into the card,
  then settle top-down on the end card.

## Needle (the one body that moves)
Keyed in code (this skill is code-only), with the principles pass of `references/ANIMATION-PRINCIPLES.md`:
- **Timing**: whole punches per element at 4.5 / s. **Anticipation**: a small rise at the top before every plunge.
- **Planted contact**: from the plunge until it pulls out the needle's tip does not move sideways (check.mjs measures 0).
- **Arcs**: hops between punches ease; travel between items arcs over the cloth; the hop is capped (on a wide title the
  stitches may run a little ahead rather than the needle jump).
- **Follow-through**: the thread runs from the last stitch to the eye and on up to an unseen hand, re-shaped every frame,
  in the colour being sewn. **Idle**: between items the needle hovers and bobs, never frozen.
- Tags fall like paper (gravity in, a small settle), the card the same.
