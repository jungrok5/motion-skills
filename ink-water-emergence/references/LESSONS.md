# Lessons — problem → cause → fix

- **Smoke looked like hair: dense vertical streaks.** → The buoyant `rise` dominated the curl velocity at a big animal's
  scale. → `rise` ≤ .1 in open water with a big animal; velocity now grows as 1 / `scale`, so big eddies move faster.
- **The whale looked like a leopard.** → Wash, strand and fine-warp noise were fixed frequencies in world units, sized for a
  2 m lion; on a 5 m whale the pools became spots. → One `detail` uniform scales every texture frequency (`detail ≈ 2 m /
  length`).
- **The pre-form shot was empty.** → Emission was gated by the same curve as density. → Emission rises earlier than density
  (`smooth(0, .35, pe + .12)`), so smoke traces the outline before the body shows; and the opening e should reach ~.15 by
  1.5 s.
- **The formed creature froze into a sticker.** → At e = 1 the trail length and warp went to ~0. → `waterState` keeps a floor
  (`len` .42·f, `warp` .011·f) and shots keep `fluid` ≥ .3.
- **The mane covered the face from the side.** → Mane strokes on the near side of the ring were closer to the camera than
  the face. → Mane items are depth-clamped behind the head origin; a cheek ruff sits just in front of the cranium rim, the
  eyes / nose / mouth in front of that.
- **The lion read as a cute puppy / bear.** → Round cranium, round white eyes with a centred pupil, a smiling mouth line,
  round ears, nostril dots. → Ears removed (hidden in the mane), almond eyes with a big dark iris slanted under a heavy
  brow stroke, a broad flat nose, a mouth line that turns DOWN at the corner, a ruff of strokes over the face rim.
- **Mane strokes looked like balloons / ribbons.** → Short wide flames with flat ends, radiating straight out. → Long thin
  strokes (length ≈ 14× width), pointed at both ends, swept back from the face (blend of radial and head-backward), tips
  curling.
- **Close-ups showed the paint shapes.** → At dist ~1.2 m the capsules and flames are bigger than the water detail. → The
  closest framing is head-and-mane at about a third to half of the frame (dist ≥ ~2 m for a 2 m animal).
- **Paws slid at walk start and when crouching.** → Standing paws were blended from fixed rest spots into the gait, and
  plants were laid out from the posed spine. → Standing = the gait frozen (stance paws stay planted); plants come from fixed
  spots in the animal's frame. `checkPose` reports any slide over 4 mm.
- **A full crouch broke the hips (hip −12°).** → Crouch lowered the body 18 %. → 12 % hips / 6 cm withers; the cast sheet
  crouch tile catches regressions.
- **The swimmer showed seams between segments.** → Each capsule had its own gradient. → One silhouette polygon with one
  gradient; the head cap drawn as a separate fill (drawing it in the same path punched a hole with nonzero winding).
- **Cameras aimed at a fixed point lost the walking lion.** → `at` was absolute. → `on: 'name.head|body|withers|paws|tail'`
  + `off`, read at the key's time within the shot.
