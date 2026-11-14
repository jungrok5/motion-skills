# LESSONS — problem → cause → fix

What went wrong while building this skill, so the next hero does not repeat it.

- **Skirt wrapped round the legs at the end of a twirl** → the rows lagged sideways until neighbouring rows crossed and
  the mesh between them collapsed → skirt rows get a sideways `twist` limit (16°) and an inward `fold` limit (8°) in
  their own vertical plane; outward flare stays free. The chima now blooms on the spin and settles.
- **Long skirt sagged before anything moved** (gravity pulled a 60 cm chima in) → gravity compensation: the pull toward
  the rest shape cancels gravity exactly at rest, so gravity only shows in motion.
- **A "sag" at frame 1 that was really a collision** (the norigae started inside the chima and the skirt collider pushed
  it out) → place anything hanging over a skirt with `ctx.outer_r()`; the check's frame-1 sag names the cause.
- **Bow tails disappeared** → they hung inside the bell skirt → tails start outside `ctx.outer_r()` and collide with
  `skirt`.
- **Planted foot slid 6 mm a frame on the walk** → the hips were too high, the IK could not reach the floor at contact
  (1 cm miss) → walk hip height from the stride (reach 0.945 × leg); idle hips 1.4 % lower (soft knees).
- **Blink never showed on a frame** → a 0.16 s triangle peak fell between 24 fps frames (0.79) → lids close, stay shut
  0.06 s, open → always ≥ 1 full frame shut.
- **Skin "V" above the neckline** → the torso skin used a constant depth ratio while garments used the true torso
  section → the skin uses the same section, slightly inset.
- **Hair hid the face in profile and its edge was a staircase** → the face window deleted whole faces and stopped at 62°
  → front vertices are tucked inside the head with a continuous weight (smooth edge), window 92° at the cheeks, narrowing
  to the temples.
- **Eyes vanished in profile** → their centres sat 5 % inside the head → eyes placed on the face surface, a bit deeper.
- **Bow loops "did not move"** → too stiff (.22) → .1: still crisp, but they bounce.
- **Hero small in a wide frame** → a long walk forced a wide fixed camera → keep walks 2.5–3 s, frame with `fill` .92 and
  shift left of the inset.
- **Cast sheet labels were mirrored** → a camera at yaw +90 sits at the character's *left* side → views named by the side
  they show.
- **Script name clashed with the package** (`scripts/crc.py` shadowed `crc/`) → CLI renamed `hero.py`.
