# LESSONS — problem → cause → fix

- **The river was a lake system and the desert had no mesas.** → thresholds picked blind. → Always look at `?map=1` before
  anything else; it shows the whole world brighter-is-higher with the path on it. Tune thresholds there, not in stills.
- **The plane skimmed a mesa (1.4 above the ground) during its roll.** → the plan descended over high ground. → The map prints
  the lowest clearance; `check` fails under the craft's `clearance`. Raise the start or soften the climb in that step.
- **The world was all white with grey contour lines (fjords).** → snow on every flat terrace (`slope === 0`), and terraces are
  flat almost everywhere. → Colour snow by level with a smooth-noise mask (`n.value`), not by slope.
- **Rock and snow looked like salt and pepper.** → per-cell `rnd` for big features. → Smooth noise for patches; per-cell only for
  a 2-colour texture inside one band.
- **A cloud puff filled the chase screen.** → the camera flew close to a puff; a near disc is huge. → Puffs within ~30 cells of
  the camera fade out with ordered dither (engine); keep cloud bases clear of the flight altitude unless flying through is the beat.
- **The airship read as a round blob in the chase.** → a stack seen straight from behind shows only its cross-section. →
  `chaseSide` puts the camera off to one side, looking at the craft: a three-quarter view.
- **The roll's counter-roll was 24°.** → a strong back-ease on the full 360°. → A gentle back-ease (≈ 7° gather); `check` reports it.
- **The cockpit windscreen hid the cowl.** → an opaque glass rectangle. → Frame + two glare streaks; you look through glass.
- **Painter calls in a cached layer drew on the main canvas.** → the painter closed over the main context. → One current target
  (`P.layer(fn)` swaps it and restores it in `finally`).
- **Wrapping coordinates went wrong west / north of the origin.** → `x | 0` truncates toward zero. → Keep sample coordinates
  positive (add a multiple of N) before `| 0`, or use `Math.floor` then `& (N − 1)`.
