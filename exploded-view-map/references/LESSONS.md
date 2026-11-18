# LESSONS — what broke while building this skill, and the fix

Problem → cause → fix. Read before changing the engine or making a page.

## Hit testing
- **Lower cards were clicked 30 px below where they were drawn.** The page filled its readouts and profile *after*
  `ExplodedView.create()`, so the cards grew and every card below moved down; the engine still used the layout offsets it
  measured at create. In CSS hit-test mode a transform starts at the element's *current* layout box, so the box drifted by
  the layout change while the drawing (from the stale offsets) did not. → Offsets are re-measured at every paint
  (`measure(false)` in `onPaint`); a piece whose size changed is re-uploaded. Card centres still passed the coarse
  "is the card hit" test — only clicks on rows inside the card showed it, so the check tests inner elements.
- **`HIC.place` / `S.probe` in CSS mode treat the matrix as relative to the element's layout box, not the canvas.**
  For pieces that are not at the canvas origin the engine pre-multiplies the matrix by translate(−layout offset)
  (`placeAll`). The probe is run on the sheet, which is at the page origin, and `#page` sits at the canvas origin.
- **The probe failed ("css?") and would have picked the wrong mode in a geometry-capable browser.** It asks
  `elementFromPoint` at the canvas centre, but the map's plates and the cards lie over the sheet there. → Hide `[data-ev-map]`
  and the cards (`visibility: hidden`) while the probe looks, then place every piece right after it resolves (the probe
  leaves the sheet at its test offset).
- **A tilted range input does not follow the pointer in every build.** → The engine drives range inputs itself: the
  pointer is mapped back through the piece's homography (`localPoint`) to the slider's local x, then `input` / `change`
  events are dispatched. The check drags the drawn slider with a real mouse and compares the value to the target.

## Fallback and phone
- **On the plain page a pin sat outside the map.** Pins were laid out before `HIC.fallback()` moved the page out of the
  canvas, while canvas children had no layout (every size 0). → Measure the map and place the pins after the fallback,
  and again on resize.
- **On the phone layout the leaning cards hid the relief and pins were drawn over the cards.** In portrait the cards sit
  in front of the map. → Cards draw after the pins (a card covers a pin, the relief never does); on portrait pages the
  cards lean a third as much and the camera looks down more.

## State
- **`view.state` never changed.** `Object.assign(view, { get state() {…} })` copies the getter's *value* once. → Define it
  with `Object.defineProperty`.

## Look
- **The creases between plates read as black bands.** The plate top under the next plate gets no sun and half the sky, so
  it fell to ~25 % of its colour. Paper bounces light. → A bounce term proportional to the sun's height, warm, scaled by
  (1 − sun) and AO; AO capped at 0.42. The still review now asks "anything pure black?".
- **The cards were cut off at the right edge.** The camera fit used the cards' flat layout corners, but the cards lean and
  turn toward the camera. → The fit uses the cards' corners as last posed (one frame behind is enough; it converges).
- **The first island was a diamond.** Four ridges toward the corners with one falloff make a square outline. → Mix ridges
  with broad round `bumps` (a soft max of the two), warp at a lower frequency and stronger, and let ridge ends dip below
  the base level so the coast is set by the bumps. Always look at the flat still first.
- **The hint text vanished when apart** (dark text on the lit, dark desk). → The engine toggles `html.ev-apart`; the bar
  styles itself with it.

## Speed (headless software GL)
- **~1 frame per second at first.** Each plate's walls are its whole cut shape drawn again at up to 10 z-steps, and every
  hidden interior fragment ran the full shadow march. → Slices discard interior fragments first (field > band + 0.35, away
  from the map border), at most 7 slices, `antialias: false` (MSAA is ~3× slower in SwiftShader), `#q=0.6` in checks, and the
  engine draws only when something moved (or the caustics animate).
- **Springs crawled when frames were slow.** With `dt` clamped to 0.1 s at 1 fps, a 3 s settle took 30 s. → Clamp at 0.25 s
  and sub-step the springs at 8 ms, so time stays real even at low frame rates.
- **`page.screenshot` timed out** under heavy machine load: a screenshot waits for a frame. Use `#q=0.5`–`0.6` and run
  checks one at a time.

## Checks
- **"The canvas did not change after typing" on the apart page.** A few typed letters on a small tilted card change too
  few pixels for the shared diff at `#q=0.6`. → The shared checks run on the flat page (`#nointro`, the text at full size)
  with a longer typed string; the skill's own checks then pull it apart and type again while turned.
- **A settle wait returned before anything had moved.** At ~1 fps the loop had not yet run after the click, so "settled"
  was still the old answer. → Wait first for motion to start (up to 4 s), then for rest.
- **The second click to put a lifted plate down missed.** The plate had risen 44 px; the old spot showed the plate below.
  → Hit-test again for that plate where it now is.
- **Screenshots timed out on the reef.** The moving caustics redraw every frame, and on a loaded machine a frame took
  long enough to starve the screenshot. → `#noidle` freezes idle animation only (springs still run) for checks, and the
  extras raise Playwright's default timeout.
