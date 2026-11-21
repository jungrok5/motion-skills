# Lessons (problem → cause → fix)

- **The solver found "solutions" where the ball hit the next pad from below** → `e(y)` is not monotonic over every
  height: with the landing point far above, the ball is still rising when it gets there. → Scan only inside the region of
  real bounces (normal up, ball comes in against it and leaves along it, *falling* on arrival), then bisect.
- **The forward check said a ball missed a pad it clearly hit** → the parabola crosses the pad's infinite plane twice;
  the first crossing was outside the pad and hid the second. → Test every crossing, earliest first.
- **Runs of the same lane collided** → the next run started at the same arclength as the last (the path position wasn't
  carried over). → Each run starts `runGap` after the previous run's cup.
- **Notes silently disappeared** → a run whose cup could not be solved was dropped with its notes. → The cup tries
  shorter and longer catch flights; check.mjs fails if any written note has no pad.
- **Dropper posts stood inside their own first bar** → the post was offset sideways, along the bar's length. → Stand it
  behind the pad, against the direction of travel, clear of the pad's width.
- **Half notes made a forest of droppers** → a 1.25 s gap needs ~1 m of height per bounce at e = 0.8. → That is the
  physics: write running lines for chained lanes, give long-note lanes their own balls (a row of droppers is a look), or
  raise `top` and `e` (metal on metal, ≤ 0.95). Never loosen the physics.
- **A long, thin machine (9 m) made every wide shot tiny** → lanes laid out in straight lines. → Rings, cones and spirals
  round a centre; keep the footprint under ~6 m.
- **The floor looked like a lit table with a black sky behind it** → the floor reached the horizon and mirrored the
  bright RoomEnvironment at grazing angles. → A radial fade to the background past the machine, floor
  `envMapIntensity` 0.12, rougher floor.
- **The key light blew out the floor on big machines** → its intensity was scaled by the footprint squared. → Set it
  in lux at the floor (`lux × height²`).
- **Follow shots swung to empty floor** → the "active" ball was a waiting ball on a dropper far along the path, and a
  glide between far-apart subjects swept across nothing. → Follow only balls in flight (the newest one), glide by
  swinging round the subject, cut when subjects are > 1.4 m apart.
- **A frame was a blur of white** → the lens passed through a bar during a glide. → check.mjs samples the blends too and
  fails when the camera comes within a pad's reach.
