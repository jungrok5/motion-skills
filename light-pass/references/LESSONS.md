# Lessons

- **Hand-placed beams did not show on a bright picture.** → Their cross-section was a hard-edged band at 0.2 gain screened over
  a hazy forest: added at most 54/255 and read as thin sticks. → Beams have a Gaussian cross-section (`soft` sets how wide
  it spreads), a default gain of 0.45, and the light gets a `shade`: what it misses sinks a little, the way a compositor
  darkens around the shafts so they read.
- **The halo and haze washed the sky white.** → A sun in frame already sits on the brightest pixels. → Halo 0.12–0.18 and haze
  ≤ 0.08 by default in the examples; `check.mjs` fails a plan that blows more than 2 % of the frame or lifts the darkest
  tenth by more than 0.12.
- **Snow shone like sky.** → The gap mask takes bright, pale pixels — snow is both. → `auto.region` limits the gaps to the part
  of the frame the light really comes through (the cabin's frame), `auto.threshold` is raised for bright pictures.
- **Beams fixed to the screen while the camera panned.** → A plan's sun was a constant on a moving shot. → Keyframe the sun
  over the shot, or (a 3D piece) project the sun's world position through the camera each frame; Rules say so.
- **Dragging the sun left the beams behind.** → In the live page the beams kept their sources. → Dragging moves each beam's
  source with the sun and keeps its foot where it lands, so beams turn about where they hit the ground.
- **Angles judged on the unit square were wrong.** → Plan positions are fractions of a 16:9 frame; a beam's angle to the sun
  must be measured with y scaled by 9/16. → `check.mjs` does.
- **Same t gave different pictures in a still.** → The scatter's jitter is seeded from a frame counter that kept counting
  between stills. → `apply.mjs` and `check.mjs` reset it per picture; a film counts frames as it plays.
