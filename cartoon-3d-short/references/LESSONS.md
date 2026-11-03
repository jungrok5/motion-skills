# Lessons (problem → cause → fix)

## From the source project (mromidev/claude-animated-shorts, the bridge short)
- **The picture looked flat, pastel and cheap.** → Characters were emissive cards; the world had Lambert + hemisphere
  light. → Measure the reference first (seven reports of numbers), then: lit cards (`cardShade`: scene tint, bright floor,
  side gradient toward the sun), two-tone world shading with a camera-relative sun frozen per shot, a grade per light.
- **No ink lines on the world.** → A depth-only Laplacian with a high threshold. → A world-only normal + depth pass:
  signed 2nd difference of 1/z for depth jumps (exactly 0 on planes, no grazing-angle lines) + normal creases, near side
  only, widths scaled with output height.
- **Ink got erased by the depth of field.** → Ink and DOF in one merged pass. → Ink is its own pass before the blur.
- **Cards got rectangle outlines.** → Billboards in the world ink pass. → Every card, sky, cloud and smoke on layer NOINK.
- **A swing drawn as one rope behind the kid read as a hanging.** → Two ropes to a wide plank, the kid between them.
- **Props closer than ~2 m to the lens became huge cut-off blobs; a foreground bush cut by the frame read as a green
  ball.** → Re-check every prop near a camera after moving it; a foreground prop must be recognisable or gone.
- **Flags: red + yellow star read as Vietnam's.** → Use the period-correct flag.
- **Painted signs lit by a side sun went grey-blue and unreadable.** → Unlit sign faces (`unlit`).
- **Golden rim light as an offset outer copy framed every hat.** → Inner rim only, head and torso only.
- **Railings at chest height crossed the torsos.** → Lens ~2.5 m up so rails cross legs.
- **Flat holds read as freezes in QA (frozen ≥ 12 frames).** → Every hold creeps in.
- **Film grain at 2.5 % quadrupled the file and turned to mush on YouTube.** → The reference has none: off.
- **Cameras ended up inside houses.** → A sight-line culler removed anything blocking a camera ray. (Here: place houses
  away from camera paths and check stills — see below.)
- **Disk filled up (Remotion copied public/ into temp per bundle).** → Not an issue here: no bundler, pages load lib/ directly.

## From building this skill (port to plain three.js, examples/leaning-tower)
- **TypeScript → JS port broke the GLSL patch targets.** → A whitespace clean-up after stripping types also removed
  spaces inside string literals (`directionalShadowMap[ i ]` → `[ i]`), so the `lights_fragment_begin` replace silently
  missed and the guard threw. → Strip types only (`node:module` `stripTypeScriptTypes`, mode strip) and never rewrite
  inside strings; diff the string literals of old and new files.
- **Two `const DECL` in one module** after merging shade.ts and cardshade.ts → rename one (`CARD_DECL`).
- **Characters at the edges of a medium shot were cut off.** → Portrait frames are 0.56× as wide as tall: at fov 40 and
  5 m, the frame is ~2 m across. → Keep a medium shot's people within ~1.3 m, aim at their midpoint, check stills.
- **The kid in the banana shot vanished.** → The creeping push dollied toward the look point (the top of a tower 33 m
  away): 0.2 %/frame = 6 cm/frame, so the camera flew past the kid. → Push by zoom when the look point is > 14 m away.
- **The kitchen was all purple.** → The room's walls cast shadows, so the side sun never reached inside and everything sat
  in the lavender shade colour. → Room walls cast no shadow (a stage set); the interior preset's key now lands inside.
- **The kid's cap brim hid the eyes in close-ups.** → `cap` cuts at brow height. → Use `hair` (or a hat that sits higher)
  for anyone seen in close-up.
- **TTS read slower than the reference** (79 s for 211 words, 2.6 words/s). → Tighten silences > 0.14 s to 0.09 s and
  `atempo` 1.14 (→ 61.8 s, 3.4 words/s), then transcribe the *final* file for word times.
- **The transcript changed words** ("Lucca" → "Luca", numbers as digits). → Look words up as transcribed (`F.at("1173")`).
- **`F.at("The", n)` counts every "the"**, including lower-case ones mid-sentence. → Print the occurrences first
  (a one-line node script over words.json) or anchor on a rarer word.
- **The first full render ran at 13 s a frame with 4 workers.** → All workers were pages of one browser, and a browser has
  ONE GPU process, so they rendered one after another; and at full size the lens blur (16 + 64 + 32 depth-tested taps a
  pixel) cost ~3 s of a ~5 s frame. → One browser per worker, lens taps 12 + 40 + 20, 2048² shadows below full size:
  1.6 s a frame at 810×1440 with 4 workers. Previews at `--scale .35` (~0.7 s), finals in the background.
- **Pipe buffering hid progress**: `node render.mjs … | tail` shows nothing until the end; write to a log file.
