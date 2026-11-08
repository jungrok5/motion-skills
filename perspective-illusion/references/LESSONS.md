# Lessons (problem → cause → fix)

From the source skill (simcraft perspective-illusion) and from building this one.

## Blinking and glitches
| problem | cause | fix |
|---|---|---|
| lines, hatching or noise crawl when the camera moves | anything in screen space (wobble, hatching, haze by camera distance) | anchor to the world or to the view direction (hatching in the surface's plane, sky by direction) |
| surfaces centimetres apart flicker on the telephoto | depth precision with a small near plane 400–600 m out | near / far hug the scene's bounds each frame and depth is a float texture; still merge co-planar parts or keep them apart |
| overlapping road markings flicker | co-planar planes | paint markings onto one ground plane (`K.ground`); make floor pieces meet edge to edge |
| rails, grids, cables, rain shimmer | sub-pixel detail | jittered AA on every frame (`mink` 4), wires without shadows, colour lines faded by metres per pixel |
| thin wire shadows blink on walls | shadows thinner than a pixel | `K.wire` casts no shadow; small parts (`noCast`) — step bolts, insulators — neither |
| a staircase blinks along a shadow edge on the hero | a 4096² shadow map stretched over a 150 m scene | `shadowReach` / `shadowCenter` on the area the camera looks at, soft PCF |
| creases pop on/off along floor bands and sills in the flat view | faces seen almost edge-on are thinner than a pixel | the crease test skips faces with |n.z| < 0.2; colour lines still draw those edges |
| edge-on side facades in the flat view shimmer | sills, AC units and signs of a whole row stack into lines a pixel apart | render the final with `--ss 1.5` (blink count halved in the template, ~2× slower), or hide the row's ends behind a corner building |
| one render per frame strobes on fast moves | no motion blur | `frame()` sizes sub-renders by probe travel, up to 32 (360° shutter) |
| clouds or reflections pop at hard edges | hard thresholds | soft cloud edges; fade effects at screen borders |
| moving things pop when they wrap | wrapping in view | wrap during the fastest move (check.mjs prints when) |

## Building and look
- **Two-tone needs the 2π sun.** three's Lambert divides by π; with intensity π every face turned more than 60° reads as
  shade. Intensity 2π in the mask pass gives a crisp step at ~75°.
- **Depth edges from 1/z, not z.** The second difference of z is non-zero across a plane seen at a slant (a road from knee
  height got inked); 1/z is exactly linear across planes on screen.
- **Double lines on painted textures**: a dark line painted in a texture has two colour boundaries → two ink lines. Busy
  textures (tiles, shutters, screens, text) use `ink: 0.5` and draw their own joints.
- **The flat view showed a strip of sky at the bottom**: its lowest rays meet y = 0 up to ~60 m in front of the focus plane,
  past the end of the ground. Extend the ground toward the camera (the template's plaza).
- **The flat view showed only hills**: 40 m hills 800 m from the camera fill the 0.8° frame above the horizon. Keep far
  backdrops low, or let them be the backdrop on purpose.
- **Lined-up poles read as a cluster, not one pole**: from 440 m a 36 m deep row spreads 8 %. A longer lens (1.5°, ~600 m)
  tightens it.
- **Big swap objects swamp the worm's eye**: `cs` is per shot — big in the flat view, normal up close.
- **Helpers that add to the scene root land on top of things**: build inside groups (`K.group`).
- **A `//` comment added to one-line code swallows the rest of the line** (a `scene.add`, a light). Use `/* */` in long lines.
- **Glyphs on screens got inked and darkened**: text and screens are `ink: 0.5` and `glow`.
- **`ffmpeg -stream_loop … -c copy` loops stop early in some players**: render.mjs re-encodes `--loops`.
- **Side-by-sides at 32:9 are too wide for X**: stack comparisons vertically.
- **Cost (4-core box, no GPU, SwiftShader)**: a half-size sheet frame ~0.3 s; a preview ~1.3 s per frame (10 s ≈ 6 min);
  the final ~14 s per frame with 4 workers (10 s at 30 fps ≈ 70 min; ×2 with `--ss 1.5`). Fix things on stills and the
  preview; render the final once.
