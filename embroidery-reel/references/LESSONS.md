# Lessons

Problems met while building this skill: problem → cause → fix.

- **Leaf shadows did not show.** → three.js samples a spot light's `map` with the light's own projection and ignores the
  texture's `repeat` / `offset` / `rotation`, so one leaf tile covered the whole 20-unit cone and the shots sat in its
  white gaps. → Draw the leaves over the whole cone in one canvas (`props.leaves(seed, 2048, density, tiles)`), sway by
  moving the light, not the texture.
- **The leaf canvas took minutes.** → `ctx.filter = 'blur()'` was set while drawing thousands of leaves, so every fill was
  blurred. → Draw sharp, blur once by drawing the canvas onto another with the filter.
- **The needle looked huge and out of focus.** → It leaned toward the lens; its eye end came close to the camera and
  filled the frame with blur. → Lean it away from the lens and to the right (relative to the camera's azimuth), scale .72.
- **Washed-out, flat picture.** → Sun, sky fill and env map all strong, pale cloth. → Sun 2π, hemisphere .4, env .45,
  exposure .92, cloth a shade darker; check.mjs reports the tonal spread per shot.
- **Satin looked like corduroy.** → The dark gap pass was too dark and too wide; at 3 px per row on screen it striped.
  → Gap −17 %, thread pass .98 of the row; the normal map carries the rest.
- **Titles stitched right to left.** → Row direction followed the stitch angle blindly; at 78° rows advanced toward −x.
  → Rows always advance left → right (top → bottom for horizontal rows).
- **Tags landed after the camera left.** → beat 2.1 with stitch 1.35 and travel .75 left no hold. → Stitching starts
  .35 s before the camera arrives, stitch 1.2, beat 2.2: the tag rests ≥ .5 s; check.mjs fails a rest under .35 s.
- **The camera hiccupped at every move.** → The hold drifted away from the next item, so the move began by reversing;
  and a cubic Hermite stops with non-zero acceleration. → Drift toward the next item; quintic Hermite (zero acceleration
  at both ends); the arc lift is sin⁴ so it adds no acceleration at the ends. check.mjs looks for one-frame spikes in
  the change of speed, not for big moves.
- **The needle jumped across titles.** → A wide word is sewn in ~.4 s, so consecutive punch points were half a title
  apart. Punching faster only aliased at 30 fps (a cycle every 3 frames, nothing planted). → Cap the hop between punch
  points (`HOP` .2); on a wide title the stitches may run slightly ahead of the needle. check.mjs measures the step
  against the needle's distance to the lens, so the overview's long cord ride is judged as it looks.
- **Absolute thresholds misjudged the overview.** → 0.7 units per frame is a jump in a close-up and a slow drift from
  20 units up. → Camera and needle steps are judged relative to the distance to what the camera looks at.
- **Sheet labels showed boxes.** → ffmpeg's drawtext default font has no Hangul. → Label sheets by number.
