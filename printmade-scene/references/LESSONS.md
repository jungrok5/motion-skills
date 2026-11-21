# LESSONS — problem → cause → fix

- **No arm was ever drawn.** → The shoulder height read `g.h`, which the geometry doesn't have; `undefined * 0` is NaN, so
  every arm point was NaN and the canvas skipped the paths silently. → Fixed the offset; measure joints with
  `drawFigure(…, { measure: true })` from the console when a limb is missing.
- **Figures read as boxes with heads.** → A four-point torso and a 0.074 h head at 330 px tall. → A ten-point coat
  (sloped shoulders, a waist, a flared trailing hem), heads 0.083 h, figures 350–390 px on the 1080 plate (about a third
  of its height, as in the source).
- **Profiles were all hair.** → The face was a round cap ±64° around the facing direction, so a side view showed a
  sliver of skin. → An elliptical patch: ±89° to the sides, a hairline 0.7–0.8 rad above, past the chin below; the near
  ear drawn on top.
- **Face close-ups on the cast sheet spilled into the next figure.** → Scaled from the cell's foot. → Clip each face cell
  and scale to the head height.
- **Elbows at 154°.** → Gather keys with the hand pulled back *and* close to the shoulder (a reach of ~50 px on a 120 px
  arm folds it shut). → Pull the hand back and *down*; keep reaches 0.55–1.0 of the arm.
- **A hand 28 px short.** → A crouch reaching 150 px down with a 130 px arm. → Size reaches from `geom().upper + fore`;
  `check` reports hands short of their targets.
- **The label vanished.** → Dark ink on a dusk sky in A, light ink on a pale sky in B. → `labelStyle` per printing.
- **The clue swallowed the chair.** → A cape drawn as a tent over the whole chair hid what it was lying on. → Drape it
  over the back and one arm so the chair still reads; the clue should change the object, not replace it.
- **Puddles looked like rugs.** → `pool()` is a hard rectangle (a pool with a lip). → Puddles are ragged `blot`s with
  `ripple` inside their middle.
- **Checker floors shouted.** → Full-contrast tiles fought the figures. → Keep the two floor inks within ~25 % lightness
  of each other; the floor is ground, not figure.
- **Too clean.** → The first print pass (grain 0.09, knock 0.0016) left fills looking digital at full size. → Grain 0.13,
  knock 0.0028, tooth 0.07; `styleReport` asks for 3–30 of neighbour difference.
