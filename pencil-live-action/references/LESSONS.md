# LESSONS — what broke and the fix

Problem → cause → fix, one or two lines each.

## The plate
- **Backdrop came out nearly black.** → the JPG was decoded twice (three's sRGB texture already samples linear, and the
  shader converted again). → sample the texture as is.
- **Everything bluish and dim next to the photo.** → exposure was set from the HDRI's mean; a sky-lit page is bluer and
  darker than the photographed ground. → expose so a white page (albedo .8) lands at ~88 % (horizontal irradiance from the
  HDRI), pre-invert the backdrop through the same tone curve, warm the highlights a little.
- **No shadows from a partly cloudy HDRI.** → the sun lobe is weak. → take the brightest lobe out of the image (clamp it)
  and give its energy to a directional light; and always draw a soft contact shadow under the feet — it does more.
- **Equirect upside down / sun on the wrong side.** → three's equirect `v` convention vs the file's row order. → flip the
  HDR rows on upload and use the same `atan(z, x)` / `asin(y)` mapping in every shader and in the sun finder.
- **Macro ground looked soft.** → a 2.5 m scan at 2k has < 1 px/mm. → load ground scans up to 4096 px and keep the focus on
  the hero (the lens hides the rest, as in the reference).

## The drawing in the world
- **The drawn figure's white looked like a different paper from the page.** → the knock-out colour was a constant. → one
  calibration render looking down at the page; its lit colour is the drawing's paper-white.
- **A white ghost of the drawn kite stayed after it turned real.** → (1) the shadow-caster plane wrote colour; (2) Chromium
  drew a stale earlier frame when a reused canvas was drawn with `ctx.filter = blur()`. → the caster's material discards
  every fragment (it only casts); blurred layers go through an OffscreenCanvas and `transferToImageBitmap()` each time.
- **The camera lost the hero mid-slide.** → a few hand keys could not follow a fast, curved move. → generate camera keys
  from the hero's own path (`slideKeys`, `floatKeys`).
- **The pencil "floated" in the wide closing frame.** → at that distance the 17.5 cm pencil fits in frame, so its back end
  showed with no hand. → check.mjs counts frames where the back end is in frame; in wide frames the line draws itself.

## Bodies and motion
- **Legs crossed when walking toward the camera.** → left/right feet placed on the wrong side of the path (facing +z, the
  left foot is at +x). → fixed in gait.js; the cast sheet's turn row shows it both ways.
- **Knees bent while standing.** → the hip ignored the ankle's height above the sole. → `gait({ ankle: .025 * H })`.
- **"Foot cannot reach its step" on the ladder.** → the hip followed the planted (upper) foot while the other was still
  swinging up from below. → the hip rides on the lower foot.
- **Elbow folded backward on the ladder.** → with the target near the shoulder the scored IK solution flipped. → the IK
  prefers the elbow whose bend is inside `LIM`; ladder holds sit in front of the body.
- **Seated on the slide, hips past the limit.** → feet IK targets along a steep path, and a hip limit of 80°. → seated poses
  set the legs directly; `LIM.hip` is now [−30°, 118°] (human hip flexion).
- **"Stands dead still" although the hip swayed.** → the weight shift ran at the breath's period in opposite phase and
  cancelled it. → give the weight shift its own rhythm (`sin(t·1.13 + .7)`), never the breath's.
- **The startle and the slide read as pops.** → no gather. → every big move is an `F.action` with ≥ .15 s of anticipation
  and ≥ .2 s of recovery; check.mjs fails one without.
