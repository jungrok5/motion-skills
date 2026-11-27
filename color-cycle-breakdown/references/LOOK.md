# The look

## The picture
- **Indexed pixel art.** One palette (≤ 256), every pixel an index. 320 × 180 shown at a whole multiple (6× at 1920)
  with nearest-neighbour scaling — hard square pixels in the held picture.
- **Ramps, dark → light.** Each material is a ramp of 3–8 steps (sky 6–8, rock 5–6, foliage 5–6, metal 3). Hue shifts
  along a ramp (shadows cooler, lights warmer) read better than one hue darkened.
- **Ordered dither for gradients** (`ramp.pick`, Bayer 4 × 4): skies, falloffs, a beam thinning into the dark. No smooth
  gradients, no anti-aliased lines, no blur.
- **Light from one side**, the same side on every layer (the kit's default is the top-left). Rim-light silhouettes on
  that side; keep the far bands low-contrast and the near bands darker or more saturated.
- **Three depth bands** — sky / horizon, the subject, the near foreground — so the exploded view has something on every
  plane.
- **One accent.** One warm or bright hue the eye goes to (a fire, a lamp, a flower); everything else in the palette
  family.

## Motion by colour
- **Cycles move along fixed paths.** Draw the indices so that turning the ramp *is* the motion: bands across the path,
  streaks along it. A cycle with 5–9 slots at 4–14 steps/s reads; fewer slots strobe, slower rates crawl.
- **A highlight slot** (one light colour in the ramp) is what the eye tracks — waves' crest, a flame's bright tongue, a
  waterfall's foam. Two lights in one ramp double the apparent speed.
- **Clear slots** make shapes appear and vanish without drawing: flame tongues, rain, a turning beam.
- **Depth:** bands thinner and faster in the distance, wider near — grow `along` faster toward the horizon.
- **Twinkle:** stars spread over random slots of a ramp that is mostly dark with one bright slot.
- **Not everything cycles.** Rock, sky and buildings stay still; motion reads because most of the picture does not move.

## Motion by drawing and rigging
- **Drawn per frame** only what travels (sparks, birds, a falling leaf), pure in t: `x = f(t)`, periods from `hash`.
- **Rigged** what bends. One gust for the whole picture, travelling across it; each joint later than the one below
  (follow-through), never past ±34° a joint, bones fixed, roots planted, always a little motion in the holds (no frozen
  plant). Code-keyed — this skill takes no generated motion.

## The breakdown
- **Hold** the living picture first (≥ 2.5 s) — the viewer should see it work before it is explained.
- **Come apart** on one eased move (quintic, no velocity step): the layers yaw back and spread to the right, the opaque
  picture furthest, each plane outlined in its layer colour with its name underneath.
- **Panels**, one technique each, on the dark slate theme: a mono kicker (`01 / PALETTE CYCLING`), a one-line title that
  says what *this* picture does, two views (how it is made · how it looks), a caption. Text rises in, views settle in.
- **Come back together** the way it came apart and hold the living picture to the end.

## Words
- Title: one line, a claim about this picture ("Nine colors climb. The pixels never move."), not a definition.
- Labels: two to four words. Caption: one sentence, what the left view shows.
- Layer names: what is on the plane ("Wind-rigged grass"), in the layer's colour.
