# LESSONS — what broke while building this, and the fix

- **The drawing arm crossed the face.** The hero faced right and drew to the right with the right hand — the near arm —
  so the arm and pencil passed in front of the mouth and eyes. → Draw with the far arm: turn the hero toward the mark
  (facing left, the right arm is the far one and reaches out on the facing side). SKILL.md has it as a rule; the cast
  sheet shows the reach both ways.
- **The hand went to the mouth.** The first mark (a boat with a mast) was drawn at head height, so the hand rose to the
  face. → Keep hero-drawn marks between the shoulder and the waist, 0.25–0.35 × height out from the shoulder; move the
  line the world grows from (the waterline) down with it.
- **Targets out of reach.** A doodle's arms are short (≈ .25 × height + the pencil); marks placed "near" the hero were
  10–20 units too far. → The film puts the hand on the line and `runChecks` reports `cannot reach … short` /
  `pencil is not on the line`; move the mark until check.mjs is clean.
- **Frames were not deterministic.** Strokes without a seed took one from a global counter, so live marks rebuilt every
  frame (the hero, the whale) boiled differently each time a frame was rendered. → The default seed comes from the
  points; the rig and live marks pass explicit seeds. check.mjs renders frames twice to prove it.
- **The pencil jumped at the catch.** The flying pencil and the hand used different ideas of where the grip is. → The
  hand-over uses `arms: { R: { grip, dir } }`: the hand goes to the meeting point and the pencil keeps its angle, then
  eases to the rest pose.
- **The beanie hid the eyes.** The cuff sat at eye level. → Cuff between −.75 r and −.45 r of the head, dome to −1.4 r.
- **The back view had a beard.** Face parts were hidden from behind but the beard was not. → Beard only when the face is
  toward us; the cast sheet's 135°/180° views catch it.
- **The whale's head was a crescent.** The snout cap was swept the wrong way round (through −tangent). → Sweep from the
  back normal through the tangent to the belly normal.
- **The crayon wash had a ruler edge.** A clipped zig-zag reveal made a hard diagonal front and a straight bottom edge. →
  Washes are unclipped (rows end raggedly past the outline, like real crayon) and a gradient wash blooms from its light
  with a soft radial edge.
- **Blotchy paper and crayon.** Low-frequency noise in the tooth tiles read as stains. → High-frequency tooth only; two
  world-anchored octaves cross-faded by zoom so the tooth never swims during the long pull-back.
- **The colour check flagged the desk.** Wood at the frame edge during the pull-back is not a second spot colour. → The
  film reports `deskShows(t)`; check.mjs judges colour on the page only.
- **Lines vanished in the wide shot.** World-unit widths became sub-pixel when the camera pulled back 12×. → Widths are in
  px at the page zoom and grow only a little when close (`× (z/z0)^.28`), like one pencil used at every scale.
