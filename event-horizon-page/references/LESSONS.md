# LESSONS — what broke while building event-horizon-page, and the fix

- **Screenshots of the source timed out at 1280 × 800.** Its full-screen lens shader runs every frame and software GL could
  not hand Playwright a frame inside 30 s. → Our page draws only when something changed, keeps one frame in flight with a
  `fenceSync` polled on later frames (400 ms cap), uses `antialias: false`, and checks run at `#q=0.5`.
- **A fed word stayed on the page, and no pieces showed.** The word is swallowed inside the paint callback, right after the
  upload that first drew it; the `visibility: hidden` set there was never reported as a new paint, so the texture kept the
  word. → Any DOM change made by the engine asks for a paint on the next animation frame (`requestAnimationFrame(S.requestPaint)`).
- **Hungry ate the wrong words and torn pieces came from the wrong place** once the pointer had moved. In CSS hit-test mode
  the page carries the lens's affine transform, so `getBoundingClientRect` of words was transformed. → Every DOM
  measurement goes through `measure()`, which removes the placement, measures, and puts it back.
- **The source moves the page by a translation only** for hit testing. Near the Einstein ring the lens rotates, stretches
  and (inside it) mirrors the page, so a translation put the caret a few letters off. → `S.placeLocal` with the lens's
  local affine (rotation, scale, reflection); the check clicks a bent button and selects bent text with a real mouse.
- **Selecting across the object selected nothing.** The drag path crossed the shadow, where no page is drawn (the page is
  hidden for hit testing there), and the selection collapsed. That is right, not a bug: the check drags along a bent line
  that does not cross the shadow.
- **The probe left the page at its probe offset.** → `S.place(page, identity)` right after `S.probe()` resolves.
- **The disk looked like a thin wire.** The radial profile fell as (r_in/r)² and faded from half the outer radius. →
  Profile (r_in/r)^1.6, fade from 0.6 of the outer radius, ramp read at half the intensity so the middle colours show.
- **Eaten pieces turned into a pale blue fog** with the template's blue-white hottest colour: many overlapping hot pieces
  read the top of the ramp. → Pieces heat over the ramp's middle (0.3–0.8), the top is left to the disk and ring.
- **On a phone the content was 30 px wider than the screen.** A one-column grid of `1fr` takes its items' min-content. →
  `minmax(0, 1fr)` and `min-width: 0` on the columns. The dock (centred with `left: 50%`) could only be half the screen
  wide before wrapping → on phones it is pinned to both edges and wraps to two rows; the page's bottom padding grows.
- **On a phone the object sat on the lede.** "Beside the end of the headline's first line" has no room when the line fills
  the width. → Then it rests above the end of that line, at the right edge.
- **A pulsar that spins up jumped.** The beam angle was 2πt / period, so changing the period moved the beam at once. → The
  turn is integrated (`state.phase += dt / period`), so a topic can change the period live.
- **Determinism.** `#still=<s>` sets the disk and beam time and the drift, the mechanical clock stands, and `run()` steps it in
  1/60 s; two loads differ by 0.000 (the check's `still` line). Tear jitter uses `HIC.rng`.
- **Feeding with `leave`.** A tour page wants the request to stay listed. Tearing a copy without hiding the element needs no
  restore step; the check accepts either form and reports which.
- **The clean-copy quick start failed at step one.** `new-page.mjs ../my-event-horizon` printed its usage: the argument
  filter skipped "the word after `--from`", and with no `--from` that index was 0, the folder itself. Only running the README
  from a fresh copy found it. → Skip that word only when `--from` is present; the clean-copy test runs both forms.
