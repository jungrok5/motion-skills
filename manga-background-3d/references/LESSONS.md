# LESSONS — problem → cause → fix

Found while building this skill and its two pieces (「세탁소집 딸」, 「등대지기의 섬」).

## Engine

- **Every first frame was nearly black.** → three.js r155+ lights are physical: Lambert divides by π. → Light
  intensities are multiplied by π in `Engine.prepare`; the `LOOK.light` numbers are the plain fractions a white
  surface receives.
- **Grey smudges all over walls.** → The marker unevenness pushed values that sat on a band threshold back and forth.
  → Unevenness lowered to 0.016 and made larger-scale; lights chosen so a white wall in shade lands mid-band
  (0.74 → the 0.72 band). Fix a smudgy surface by moving its tone or the sun, not by adding noise.
- **Diagonal lines across every box face.** → The two triangles of a quad share an edge at 0°. → Edges whose faces
  are within 1° of flat are never inked.
- **Hairy circles: every segment of a cylinder cap overshot.** → Each 3-D edge was its own stroke. → Pieces meeting
  at a shared vertex that carry on within 38° are chained into one stroke; only real corners overshoot.
- **Lines swam while the camera moved.** → Wobble was seeded per screen position. → Every habit is seeded by the edge
  index, and the wobble's noise runs along the edge's 3-D length. check.mjs measures that ≥ 85 % of the ink stays put.
- **The lantern's lens was invisible behind white glass.** → Glass is opaque in the depth pass, so it hid and un-inked
  everything behind it. → `see: true` glass: drawn faintly in the lit pass, left out of the depth pass.
- **The lighthouse beam ended in a white blob.** → A flat glowing cone has a hard end and blooms. → `S.beam()`: an
  additive cone whose brightness fades along its length; it is see-through and lifts the tones it crosses by bands,
  the way screentone is scraped for a beam. The post shader adds that light to the flat sky too.
- **Sign text had stray boxes.** → Gaegu has no `·` or `→`; the browser fell back to another font. → `glyphCheck()`
  compares each character's width under two fallbacks; check.mjs fails a missing glyph. Rephrase, or add a font.
- **"Almost no ink" at preview scale.** → Ink was counted as near-black pixels of the composite, and half-scale lines
  are antialiased grey. → Ink is measured on the line layer alone (`linesAt`), at a fixed 640 px.
- **Z-fighting in the films** (reported after the first merge): alley doors, the bus-stop pavement and corners of
  parapets flickered. → Faces sharing one plane: a door leaf whose front sat exactly on a solid house front, a kerb
  top and a ground slab top at the same height overlapping, parapet walls overlapping at the corners, windows set
  into solid blocks so their glass sat behind the wall face; plus a 5 cm near plane that left only ~3 mm of depth
  precision at 50 m. → Openings in solid blocks stand 2 cm proud of the face; slabs that meet only touch (one ends
  where the other starts); wall runs fit between their corners; sills sit 5 mm above the opening floor; bands stand
  4 cm off a tapered tower; near plane 0.15 m. check.mjs now fails a z-fight: over three quarter-frame steps of the
  tone layer (no ink) it counts pixels that flip up and down inside a patch of such pixels (a moving edge is never a
  patch). Planting a second counter in the same place makes it fail, as it should.
- **Rule for building:** two surfaces never share a plane where both can be seen. Let them touch (end to end, or face
  to face with one hidden), or move one 5 mm or more.

## Sets and cameras

- **A big blank grey face filled half the alley.** → The first house's side wall faced the camera from 5 m. → Start
  the camera inside the street the houses frame; a set is dressed where the camera looks, not everywhere.
- **Laundry on the rooftop line filled the frame.** → The line was 1.5 m from the camera. → Move what is meant to be
  scenery 4 m or more from the lens; keep the foreground for one prop that sets the scale (a table, a chair).
- **The neighbourhood around the rooftop read as junk.** → Buildings were scattered on a circle at random angles. →
  A street grid with jitter, roofs within a metre or two of ours, `simple` windows for the far ones, a few water tanks.
- **The spiral stair from below was a fan of grey wedges.** → Near treads overhead fill the view, all in shade. → An
  open well (treads from r 0.75), light from above, and the iconic shot looking *down* the well; the look-up shot was
  dropped.
- **A tower interior had no paper white.** → Ambient-only light puts every white surface in the 0.85 band. → A sun
  from straight above (the lantern) lights the tread tops white and leaves the undersides grey.
- **Two frames under 12 % paper white** (the shop looking into its windows, the alley). → Contre-jour and narrow
  streets are honestly grey. → Left as warnings; a brighter sun or lighter tones fix them when the page needs air.
