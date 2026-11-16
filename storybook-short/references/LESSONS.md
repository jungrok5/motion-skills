# LESSONS — problem → cause → fix

- **Feet missed their targets by 4 px and a planted foot drifted.** → The pelvis bob was upside down (highest at the heel
  strike, where the legs are spread widest), so the leg could not reach. → Lowest at the heel strike; stride 2.1 a.
  `check.mjs` measures reach and drift every 1/30 s.
- **Coats were see-through; legs showed through them.** → Crayon over a 60 % tint lets what is behind show in the gaps. →
  A gouache base under the crayon for anything that covers (coats).
- **The far leg came out black.** → A CSS string was passed where a colour array was expected; the parser read NaN. →
  Colour helpers take hex or arrays only.
- **Limbs shimmered.** → A screen-space pattern swims through a moving limb. → Each segment is drawn in its own frame
  (translate + rotate), so the texture sticks to the limb; a solid base under the tile so it never shows through.
- **Odd ovals round every bench slab and window frame.** → `ink()` drew a Catmull–Rom spline through rectangle corners,
  which overshoots into loops. → Corners sharper than ~55° are drawn as corners.
- **The close-up actor's head was below the frame.** → Ground y guessed by hand. → `actor.groundFor(headY)`.
- **Trees and lamps cut off flat.** → Plates clip to their `bb`. → The box includes tree tops and lamp heads.
- **The big move was invisible.** → A 10 px ice cream scoop in a wide shot. → Shoot the event as a medium (zoom 1.55,
  plates painted at 1.8×) and make the prop read at that size. Story first: if you cannot see it on the contact sheet,
  it did not happen.
- **"The big move has no gather".** → Grandpa's antic key moved the same way as his reach. → A gather goes the other way
  (pull the cone in, lean away), then the reach.
- **The paper vignette looked like spilled white paint.** → Too many, too wide dry-brush dabs. → Fewer, narrower, only
  near the corners (a steep falloff from the middle of each edge).
- **The sound was too quiet (peak 0.17).** → Conservative bus levels before the compressor. → Master gain 2.6 into a
  compressor (−16 dB, 10:1); peak ≈ 0.5–0.6, rms ≈ 0.1.
