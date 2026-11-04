# LOOK — what makes it read as the reference, and the values that match it

Measured from stills of the reference clip (1 fps contact sheets and full-res frames at 1.2, 4.6, 8.0, 12.5 s).

## Light
| reference | here (`LOOK` in lib/film.js) |
|---|---|
| hard warm sun from the upper left, ~45–50° up; shadows fall right and onto the wall | `sun.dir [-0.6, 0.8, 0.42]`, `#fff0da`, intensity 3.6, PCF shadow map 2048 following the framing (±13 m), radius 1.6 (crisp, slightly soft) |
| shadows are blue-violet, never grey or black | hemisphere `#b3d0ff` sky / `#e6d3bb` ground at 1.1, grade `shadowTint [0.9, 0.96, 1.1]`, `lift [.012, .018, .04]` |
| characters separate from busy walls | a cool rim light from behind-right (`rim`, 1.1, no shadow) |
| bright, high-key, saturated but not neon | PBR-Neutral tone map (keeps hue), `sat 1.1`, `contrast 1.07`, `highTint [1.04, 1, .95]`, vignette .2, grain .022 |
| glossy things (the glove, cars, lamp globes) catch a sky | a PMREM environment from the sky + a sun spot, intensity .55 |
| clear blue sky with painted cumulus over lower buildings | sky dome gradient `#4f8fdc → #8cbcef → #dcecf7`, painted cloud cards on a far band (`F.cloudBand`) |

## The street
- **Brick:** every brick a slightly different red (±14 %), lit top edge, darker bottom, dry-brush streaks across the
  courses, grime at the base (`P.brick`). Courses ~9 cm (a 1.4 m tile of 16 rows).
- **Flaked plaster** blobs on bare brick and **bare-brick chips** on white-painted brick — the reference's most
  recognisable texture. They are decals placed once per wall (`patches: 2–3`), never part of the tiling texture
  (a repeating chip reads as wallpaper).
- **White-painted brick:** an opaque coat with the joints pooled darker, faint relief per brick (`wall: "painted"`).
- **Depth where it shows:** real window openings with recessed glass, proud sills and lintels, cornices with
  dentils, shopfront mullions, awnings with scalloped valances and side cheeks, a hanging-basket lamp.
- **Shopfronts:** saturated fascias (blue, maroon, pink, green, mustard) and striped awnings; blade signs with one
  letter per line (the reference's "HARDWARE").
- **Ground:** warm off-white sidewalk slabs with joints and cracks, a granite curb, a blue-grey road.

## The characters
- **Vinyl-toy proportions:** smooth lathe bodies through a Catmull-Rom profile (no kinks), tapered limbs, big shoes,
  heads ~1/6.5 of the height, real eyes with lids that close over them, brows, a nose shape, a mouth library.
- **Builds tell the role:** lanky hero, a boss with a barrel chest on thin legs, a stocky man, a round baker, a
  small kid, a hunched elder — each with its own palette; nobody shares the hero's colours.
- **The hero is deadpan:** lids at 45 %, flat mouth, eyes that move to what matters.

## The glove (the star)
- Reference: a tan leather glove, inflated (fat fingers, a heel and a knuckle ridge), as big as the hero's torso, a
  flared cuff with a big black cross-stitched seam, on a tan rubber hose from the backpack.
- Here: `gadget(F, { style, color, size: 1.1–1.25, stitch, hose })` — palm `rbox` with a heel and knuckle ridge,
  three-jointed fingers of radius ~9 cm, a two-jointed thumb, the lathe cuff with a seam and 14 cross stitches,
  Physical material with a little clearcoat. The hose is a cubic Bézier from the machine's socket (leaving along
  `fromDir`) into the cuff (arriving along the glove's own axis), sagging with `slack`, trailing with `lag`.
- Never the reference's tan leather glove for a new topic unless asked: pick a style and colour from the topic.

## Motion
- Strolls: feet locked to distance (`stroll` + `walk(phase, { strut })`), a little strut bounce.
- The glove: anticipation → `snap` ease out → `wob` settle; `squash` on every contact; shapes change a beat
  before the move.
- Motion blur: up to 5 sub-frames at a 0.5 shutter, only on frames where something moves > 2.5 px across the
  shutter (`screenPts`), never across a cut.

## Sound
- One continuous groove, ~120–130 bpm, swung 16ths, finger bass, Rhodes off-beats, a whistled hook; foley on every
  contact (rubber stretch, flick, thwack, clang, boing, splash, honk, skid); −14 LUFS, −1 dBFS peak.
