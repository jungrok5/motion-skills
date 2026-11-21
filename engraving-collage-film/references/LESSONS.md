# LESSONS — problem → cause → fix

Found while building this skill and its two pieces (「시계탑 심부름」, 「얼음 항해」).

## Reading the source

- **The X post would not load (402), and the agent stopped.** → X refuses plain fetches; the permission check then also
  blocked the public API as a "workaround". → Read X through `api.fxtwitter.com/2/thread/<id>` and the clip from
  `video.twimg.com` as the documented route; if a permission check blocks it, ask the owner once. Now in CONTRIBUTING.md.

## The engraver

- **Light greys turned to grit (clouds, sails).** → Lines thinner than a pixel alias, and dashes a few px long read as
  noise. → A minimum half-width (~0.75 px) and long tapered dashes (9 gaps) kept by probability: lightness comes from
  fewer dashes, not thinner lines.
- **Trees outlined every circle inside the foliage.** → A blob is many overlapping circles; stroking it strokes them all.
  → `solid()`: stroke at double width, then fill over it, so only the outer edge stays inked.
- **Clouds clipped to a box.** → Lumps reached the plate's edge. → Keep blob centres and radii inside the plate.

## The world

- **The comp's paper was darker than the plates' paper.** → three.js colour management converted the background colour
  from sRGB to linear and wrote it out unconverted. → `THREE.ColorManagement.enabled = false`, textures `NoColorSpace`,
  output linear: what the plates paint is what the frame shows.
- **Clouds, skies and skylines came out three to four times too small; the sky did not show at all.** → Card size used the
  kit's default px-per-metre instead of each subject's own. → The size is the plate's height over its height in metres.
- **Cobbles became moiré at a grazing angle.** → Hundreds of small ellipses minify into noise. → Pave streets with light
  flagstone lines; keep busy textures for floors seen from above.
- **The sky card's edge showed when the camera swung.** → One flat card. → `S.ring()`: four sky plates in an arc.
- **Shop windows were black holes.** → Glass at 0.92 tone everywhere. → 0.78 → 0.42 with a white glint stripe.

## Bodies and motion

- **Hand-keyed walk legs slid 50 px.** → In the key poses the foot stalled under the hip for part of the stance, so the
  body had to stop. → Upper body on key poses, legs by IK onto a keyed foot path (heel pivot → flat → toe pivot, moving
  back exactly as fast as the hip moves forward): drift 0.
- **The drift audit said the feet slid when they did not.** → It compared whichever sole point was lowest, switching
  between heel and toe; and a swinging foot skimming the ground counted as planted. → Track each sole point separately,
  only while that foot is in stance.
- **In the film a running child slid 44 px.** → A billboard draws the stride across the card, but the run went mostly
  toward the camera. → The cycle advances by the travel across the screen, walks are blocked across the camera, and
  check.mjs fails a move that is less than 60 % sideways.
- **The ankle bent 41° up in the run's swing.** → The foot's world angle was held level while the shin folded. → In the
  swing, blend the foot's angle to the shin from toe-off to the next heel strike.
- **The walk crouched.** → Hip too low for the stride (knee ~43° at mid-stance). → Hip height 0.995 leg, stride 1.0 leg.
- **A knee bent backwards for a frame after the jump.** → The landing settled with an overshooting ease. → Legs settle
  with `out`; only arms overshoot (`back`).
- **The near arm covered the face in the 3/4 wave.** → The near arm is on the camera side. → Wave with the far arm.
