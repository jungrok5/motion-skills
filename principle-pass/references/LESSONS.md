# LESSONS — what went wrong and what fixed it

Problem → cause → fix, one or two lines each. Read before keying a new piece.

## Building the engine (Pounce, Belly slide)
- **The cat read as a skinny dog.** Thin body, long snout, small round ears. → girth ≈ half the body length, a short
  round head (snout .6+), pointed ears as painted triangles, daubs ~17 px.
- **A foot left its plant at full speed** (meter: slow in / out 59 %). The swing lifted by `h·sin(πu)` — vertical speed
  jumps at lift-off. → lift by `h·sin²(πu)`; blend into the body's free pose with smoothstep, never a power < 1.
- **Feet kinked at take-off** (arcs 73°). The IK clamped hard at full reach. → past 94 % of the leg the ankle eases out
  (exponential) toward full stretch.
- **Every channel left the apex at full speed** (arcs 92°). `e: 'out'` on the landing key: an `e` is the ease *into*
  that key, so 'out' starts the segment at full speed. → default inOut everywhere; let the hips keep speed through an
  apex with the Hermite root path, not with eases. A channel that reverses at a key must be inOut there.
- **Joint check flagged every frame.** Bend signs were calibrated on the free pose, not the planted stance. → calibrate
  on the stance with the feet planted; a fore wrist may hyperextend ≤ 15° before it counts as wrong.
- **A front leg was 3 px out of reach standing.** The stand height came from the hind leg only. → `hipHeight()` takes
  the lowest leg (92 % of its reach) including where each leg hangs from.
- **The before "had" follow-through and overlap.** The meter measured the ear relative to the head point, so a rigid
  ear on a nodding head looked like follow-through; overlap used each part's own peak, so a slow and a fast part on
  the same linear tween started at different times. → follow-through is measured in a frame that turns with the
  driver (an anchor point); overlap onset is an absolute speed (0.3 body lengths / s).
- **A released foot popped.** The free pose's toe and the planted target meant different points of a flat foot. → a
  foot target is always the contact point (paw, or the toe of a flat foot), planted or free.
- **The penguin's white front was spots.** Pale daubs over a black underpaint. → a second underpaint band in the belly
  colour along the part (`bellyFrom`).
- **The waddle's feet couldn't reach.** 34 px steps on 46 px legs. → steps ≤ ~0.45 of leg length, hips keyed at every
  contact so they stay between the feet, standing hips a little below `hipHeight()`.
- **Kink threshold.** A real paw strike curls on a ~30 px radius (24°/frame at speed); a key without an arc turns 60–100°.
  → the arcs threshold is 30° per 60 fps frame.
