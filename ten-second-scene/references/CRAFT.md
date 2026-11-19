# CRAFT — how a code scene stops looking like a code demo

The tells, and what replaced them in the examples. Read before the first render; come back to it every round.

## The tells (what a viewer reads as "made with code")
- **Perfect gradients and flat fills.** Real surfaces have grain, wear and drift at every scale.
- **One scale of detail.** Big shapes only, or noise only. Work in three passes: masses → things → incidents.
- **Copies at even spacing.** Windows, seats, flowers, trees: jitter position, size, colour, state (lit / unlit, open,
  half-risen), and break the rhythm with exceptions.
- **Lights that light nothing.** A glow sprite with no pool on the ground, no rim on a person, no reflection, no haze.
- **Even exposure.** Everything mid-grey-bright. Decide the key, let the rest fall off; earn the highlights.
- **Pure hues, one green, one sky.** Colour inside every area should drift in hue and value (OKLab `tweak`).
- **One global sine.** Everything wobbling together at one rate; linear tweens; instant stops.
- **Floating, sliding, frozen people.** See BODY.md.
- **A camera that does nothing — or everything.** One slow move, eased, chosen for the beat.

## Canvas 2D (「첫차」)
- Build in **world units through a pinhole camera** (`TSS.camera`), not in screen pixels: scale, perspective and the
  push-in come out right, and people are the right size next to doors and buses.
- **Clip polygons at the near plane** before projecting (a vertex behind the camera silently skipped the whole ground
  in round 1). Draw only faces the camera can see (the kerb's road face, a snowbank's far side).
- Paint **static layers once** in `setup` (sky strokes, textures, mips) and reuse them; draw moving things each frame.
- **Ground**: a perspective-mapped texture drawn row by row (`snowSurface`) with mips, overlay-blended, gives grain at
  every distance; boot prints as soft radial dabs in an affine frame; light pools as world-space ellipses (`affine`).
- **Reflections** only where the surface is wet, as several broken, blurred streaks, clipped to the wet shape.
- **Light pass order**: base colours dark → pools and practicals with `lighter` → people with rim light from the
  brightest thing behind them → glare → particles → vignette + grain.
- Snow / rain / dust in **three depths** with their own sizes and speeds; brighten particles inside light cones —
  that is how a beam becomes visible.

## WebGL strokes (「바람의 들판」)
- Generate strokes from **functions** (colour field, flow field, density) — never from a bitmap.
- Lay the painting in **passes**: underpainting ground (warm imprimatura shows between strokes), sky, clouds (strokes
  along the contour, lit from a **smooth** normal so light reads at the scale of the cloud, not the noise), far field,
  soil, plants far → near, loose bits.
- **Stroke sizes follow distance and role**: 10–52 px in the sky with a power distribution, contour strokes 5–20, far
  heads 2–7, near petals 15–30.
- Motion in GLSL from each stroke's own attributes; things with mass get a **spring simulated once in JS** per object
  and passed in a float texture (`dataTexture`), so heavy heads lag, bow (turn + dip, not slide) and overshoot.
- Make wind visible the way it is in a field: **leaves turn pale undersides**, small things move first.
- Fray (`dry`) low for petals; let impasto ridges catch one light direction for the whole painting.

## three.js (「파도 응원」)
- People from `body.js` posed every frame, rendered as **instanced capsules and spheres** with per-instance colour; set
  colours once, matrices per frame. Real widths: torso radius ≈ 0.1 × height, upper arm 0.04, thigh 0.058; a shoulder
  capsule and a hip band make the torso read; a hair cap offset back so the face shows.
- **Bake light into instance colours** where shadows would cost (rows under the roof darker and warmer).
- Every texture is drawn into a canvas in `setup` (pitch stripes, LED pattern, roof panels, far crowd, scoreboard).
- A crowd reads as individuals through **timing spread** (reaction delay, keenness, weight), not through more polygons.
- Air: haze sprites around lamps, rain streaks, fog — the sky over a stadium is never empty.

## Looking at a round
- Read the crops at 100 % first, then the full frame. The flattest crop shows where density is weakest; the brightest
  crop shows whether the brightest thing is a light (it should be); the person crop shows proportion and rim light.
- If the flattest crop is open sky that you painted on purpose, density is fine.
- For weight, render a strip (8 stills of one region over 2 s) and judge it — a still cannot show it.
- Write findings you can act on: "beam triangles have hard edges", not "light bad".
