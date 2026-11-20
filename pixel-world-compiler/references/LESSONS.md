# LESSONS — what broke, why, the fix

From Frostwind (its README, AGENTS.md, PIXEL-ART.md, PROJECTION.md), kept because they apply here:
- **A claim in a comment is a claim to check.** "Reads as hills at a glance" held for months while almost every dune
  pixel painted one rung. → Measure it, then hold it with a test.
- **Tests read the channel being written, not the one drawn.** Three building types authored their form into a
  channel the shader ignored and shipped flat, with every test green. → `check.mjs` reads real canvas pixels, not
  intermediate buffers.
- **A building drawn as a rectangle spends none of its depth rows.** → Buildings carry a return face at 45° (cabinet
  variant), so three faces take three values.
- **Varying both shade and normal across a cylinder describes the form twice.** → Round things vary the normal and
  keep flat occlusion.
- **Height and depth both move a sprite up the screen.** → Shadows and reflections use the per-pixel height `z`,
  never the screen offset.
- **Same-coloured legs don't separate at 26 px.** → The far limb is a rung darker.
- **A table no executable path reads is documentation, not a model.** → Delete it or wire it.

Found while building this skill:
- **Tufts were tied to the material, not the rule.** Sedge showed through *all* snow, because three rules shared
  `snow`. → The bake stores the rule index per pixel; tufts follow the rule.
- **Hashed grain draws square tiles.** Hash-per-cell ao turned snow and trails into checkerboards of 1 m squares. →
  Grain is smooth noise, so value changes follow contours.
- **A loop that ends facing the other way jumps its feet.** The reindeer walked out and back, then the wrap snapped
  their stance 16 px. → A looping plan turns back to its first facing with steps.
- **Corners snap the heading.** At a waypoint, the body flipped direction in one frame (17° off its travel). → Path
  corners become arcs (radius ≈ 0.8 stride).
- **A "small" snap turn still slides big feet.** 20° on a 1 m reindeer moved every hoof 2 px. → A turn may skip its
  steps only if no foot would move more than 0.8 px.
- **IK asked for the impossible during the lift.** Hands switched to a ground target before the torso had bent:
  6 px past arm's length. → Hands blend toward the target as the body folds and never reach past the arm.
- **"Overshoot" in a direction the legs can't go.** After rising with a load the hip can't go higher than straight
  legs, so the settle measured 0. → Recovery is "the body settles" (overshoot *or* brace: knees give under the load),
  measured as movement after the action.
- **Walking across a terrace riser.** The check flagged a 7.8 px reach: a 0.7 m step is a climb, not a stride. →
  Paths stay on one level. Relief lifts each foot by its own ground, so the check sees it.
- **Risers inherited the water above them.** The cut face under a paddy drew as water, in square blocks. → A riser is
  soil: never water, it takes the rule's `riser`.
- **Cloud shadow as a black hole.** At 56° sun, diffuse is only 0.14, so full shade is near-black and a cloud read as
  a pit. → Thin cloud transmits half the beam, drawn as a 50% ordered-dither shadow.
- **A true planting grid aliases.** Rice at 0.25 m spacing is under 2 rows deep at 15 px/m, so rows merge into
  vertical stripes. → Jittered 0.30 m cells, recorded as a medium override.
- **Paddies looked like mud, honestly.** At a 30° view the Fresnel term is ~6%, so shallow water shows its bed. →
  June terraces read green because of the rice. Fix the rice density, not the water.
