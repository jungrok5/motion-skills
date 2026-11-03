# The look — what makes it read as yarn

A knitted diorama reads as yarn when three scales are right at once: the **stitch** (6–12 px at 1080p), the **fibre**
(fuzz on soft round things, sheen on everything) and the **piece** (patches stitched together, a corded rim, a slab with
a ribbed side, sitting on a blanket). Lose any one and it reads as plastic or as a printed texture.

## Stitches (`yarn({ stitch })`)
| stitch | looks like | use it for |
|---|---|---|
| `stockinette` | smooth columns of V's (jersey) | meadows, walls, sails, tree crowns, most things |
| `garter` | horizontal ridges, chunky | paths, roofs seen edge-on, doors, hulls, sand |
| `rib` | raised knit columns, sunken purl columns | water (with `flow`), pine tiers, roofs, the slab's side, cuffs |
| `seed` | pebbly checkerboard of knit/purl | sand, lilac fields, stone, rocks |
| `cable` | two rope cables on a purl ground | one statement field (ploughed land), a jumper-like roof; use half the repeat |
| `boucle` | tangled little loops | clouds, bushes, pom-poms, the ball's core, smoke — always with `fuzz` |
| `strand` | one twisted yarn | the thread, trunks, cords, rails, the rim, the ball's wraps, seams (uv.x along the length) |
| `felt` | smooth lumpy, no stitches | needles, tiny knobs, things too small for stitches |

Colourwork (`pattern` + `color2`): `stripe`/`{stripe:[on,off]}` (lighthouse, sails), `{check:n}` (gingham fields, windmill
sails), `dots` (flower meadows), `zigzag`, `diamond`, `snow`, `heart`, or your own `{rows:['..#..', …]}` — one tone per stitch,
so motifs stay pixel-crisp like real Fair Isle.

## Scale
- Ground uv is metres: `repeat: 2.8` ≈ a 4-stitch tile every 0.36 m ≈ one stitch per 9 cm. For a world of half-size 8 seen
  whole at 1080p (≈ 95 px/m) that is ~8 px a stitch. Bigger worlds: lower the repeat in proportion, not the other way.
- Props: the kit's `rep(u, v, tile)` turns a primitive's size into a repeat so a 0.22–0.3 m tile holds everywhere.
- Cables are 8×8 stitches per tile: use half the repeat of the other stitches.

## Palette (`PAL`)
Dusty, slightly warm yarn colours; the blanket is paler and less saturated than the world so the world pops.
- base: `sage`, `moss`, `pine` (land) · `sea`, `sky`, `denim` (water) · `sand`, `oat`, `cream`, `white` (shores, paths, walls)
- accents (one or two per scene): `coral`, `mustard`, `berry`, `teal`, `lilac`, `rose`
- the ball takes the accent; one landmark repeats it (the harbour: coral ball, coral-striped lighthouse, a coral boat).

## Light
- `HemisphereLight` (warm sky, oat ground) + `AmbientLight` .25 + one warm `DirectionalLight` from the upper left-front,
  2048² PCF-soft shadows fitted to the world. Neutral tone mapping, exposure ~1.05: pastels stay pastel.
- Fog the colour of the background (`#efe2cf`) from ~26 to ~70 m: the blanket melts into a warm haze, the world stays crisp.
- Sheen (`MeshPhysicalMaterial.sheen`, colour = a lighter version of the yarn) gives the soft rim light of wool; `?lite=1`
  drops it (and shadows) for quick previews.

## Motion grammar
- Ball at rest with a slack tail and a pom-pom end → the end is tugged straight to the centre (0.9 s) → the ball lifts on a
  spring and spins as it gives yarn; it shrinks as cube root of the yarn left (area knitted ∝ r²).
- The front grows fast then slows (`1 − (1 − k)^1.7`): the centre is knitted at once, the rim takes its time.
- Each prop: flight from the ball in an arc (0.5–0.95 s by distance), squashed (1.14 wide, 0.62 tall), then a damped spring
  to its shape (ω 15, ζ 0.42). Clouds fall from 10 m on a softer spring. Unravel reverses: a squash anticipation, then back into the ball.
- Life after knitting is small and cyclic: boats bob and rock on noise, smoke puffs rise and fade on a 3 s cycle, sails and
  the lighthouse beam turn slowly, wave crests breathe. Nothing that would need physics.
