# Lessons (problem → cause → fix)

From building `examples/draw-a-road` and the template.

- **A 30 s render took 9 minutes.** → `ctx.filter = 'blur()'` (depth of field, drop shadows, the pen shadow) is rasterised
  in software in headless Chromium: 4 s per frame for DOF alone; drawing itself was ~20 ms. → `R.soft`: draw the card
  into a scratch canvas at 1/(blur/1.4) size and scale it back up with smoothing. Same look, ~15× faster (≈ 0.35 s/frame,
  mostly PNG encoding); 30 s now renders in about 100 s with 3 workers.
- **The same t gave different pixels after the cheap blur went in.** → A reused scratch canvas: smoothing samples one
  pixel past the source rect, and what lay there (clamped edge vs. an older, larger draw) changed with history. Showed only
  on a big card cut by the screen edge (the template's hill). `check.mjs` caught it; bisected with `?off=dof`, then
  `?off=hill`. → Size the scratch exactly per call with a cleared margin, and let blurred regions run past the screen.
- **The front tyre sank into the road.** → The car was depth-sorted by its centre; with the camera at an angle to the road
  (yaw 24°) the road chunk under the front wheel was nearer than that centre, so it was painted after the car. → A card can
  give its own sort depth (`depth: (t, view) => …`); the car uses the nearest road point under its whole footprint.
- **A beige wall swallowed the top of the frame for a second.** → A big hill card 7000 units to the side ended up just past
  the near plane when the camera yawed: its anchor projected huge, and an affine card does not clip itself. → Cull every
  card that is closer than its own size or wholly off screen before drawing it.
- **White dashes on the ink road had notches.** → The road is drawn in depth-sorted chunks; the next chunk's surface
  (plus its 1 px seam stroke) covered the end of the previous chunk's dash. → Each chunk paints only its own surface but
  redraws edges and dashes two segments into its neighbours; dashes are continuous strokes, not one stroke per segment.
- **The ribbon read as a thin line.** → Camera elevation 7°: a 120-wide strip seen almost edge-on. → 12–16° on paper beats;
  keep the low angles for the ink close-ups.
- **The parked car's nose went into the roll.** → Car stopped 120 short of the road's end; the roll (r 46) is centred on
  the end. → Stop ≥ 200 short (half a car + the roll).
- **The roll ran off frame as soon as the car moved.** → A centred follow target, and the roll is 400+ ahead. → Offset the
  follow target forward (`R.follow(car.pos, 0.5, [260, 90, 0])`) while the roll works.
- **Ink appeared before the pen touched down.** → The pen enters over 0.7 s, and the reveal crossed into ink 0.3 s after
  `in`. → A rule (`R.check('the pen is down before ink starts', …)`) and a shorter lead at the hand-off so the paper ends
  under the descending pen.
- **Floor turns made the car go edge-on.** → A card faces along its path tangent; on a 90° yaw the tangent points into the
  screen. → The car's facing damps the tangent's z (×0.35) and mirrors when it heads left: it stays a side-view toy.
- **Pages must open by double-click and in headless Chromium without a server.** → Classic scripts (`window.PR`,
  `window.PK`), no modules, no fetches; fonts are not needed (no text in frame).
