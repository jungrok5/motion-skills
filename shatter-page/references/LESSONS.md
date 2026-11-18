# LESSONS — problem → cause → fix (from building this skill)

- **Pieces lying flat never fell asleep (settle took 14 s, the force-sleep cap).** → Positional correction pushed a
  resting plate fully out of the floor, it free-fell two steps and never read as calm. → A contact slop (0.6 mm) and soft
  correction (60 % of depth beyond half the slop).
- **Then they rocked forever (1–6 rad/s while lying flat).** → Sequential impulses at each touching corner put all of
  the impulse into the first corner each step, a torque that the others never cancelled. → One impulse per plane at the
  depth-weighted centre of the contact patch (a face-down plate takes no torque, an edge or corner still tips it), plus
  rolling resistance and a stop on spin about the normal when three or more corners touch.
- **Tiny crumbs stayed awake.** → Calm tested raw angular speed, and small pieces jitter in angle while barely moving. →
  Calm tests edge speed: `|v| + |ω|·radius < 8 cm/s` for 0.3 s; a long-touching piece sleeps after 5 s if slow.
- **The same blow made different pieces after a mend.** → One random stream for the whole page, advanced by every break
  (and the drop's tip drew from the seams' stream). → Each blow is seeded by (seed, piece id, impact point, tape step);
  the drop uses `impact.tip` exactly.
- **The sun patch blew out to white, and the porcelain glaze too.** → Lit colour > 1 clipped. → A soft shoulder above
  0.8 in both the room and the piece shaders, and a lower sun term on opaque glaze.
- **The dropped plate's pieces showed only their plain backs.** → It tipped forwards and landed face down. → Tip
  backwards (negative `tip`) so it lands face up; the brief says why.
- **Feedback loop in the floor reflection.** → The mirrored pieces sampled the room target they were drawn into (for
  refraction). → The mirror pass binds a 1×1 floor-coloured texture instead.
- **A landing break needed geometry and sound from inside the physics step.** → `Sim.onBreak(res, s)` callback; the page
  rebuilds geometry and spawns dust there.
- **Source screenshots timed out in Playwright (`page.screenshot`).** → Unknown (its frame runtime). A CDP
  `Page.captureScreenshot` worked. Our pages screenshot normally.
- **The time slider sits on a piece that moves while you drag it.** → Its value would follow the moving geometry. → On
  press, the value comes from the pick point; afterwards it follows horizontal pointer travel over the slider's on-screen
  length, and the page stays placed on the piece pressed (pointer lock by piece).
- **Software GL in checks is slow (~14 fps at 1280 × 800).** → `antialias: false`, the checks run at `#q=0.6`, and the
  physics is stepped by hand (`__hic.shatter.advance`) instead of waiting for real time.
