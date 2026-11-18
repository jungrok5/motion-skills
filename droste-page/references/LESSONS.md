# LESSONS — what broke while building droste-page, and the fix

- **Copies washed out to cream after two levels.** The "far copies melt into light" fade used device px of U, so at
  `#q=0.5` (half backing store) every copy faded twice as early. → Fade on CSS px of U per copy (`uU / pps`, 0.5–2.6 px).
- **A dashed line along every window edge.** The boundary between a copy's sight edge and the next copy's page edge is a
  hard switch of level; at low resolution it aliased into dashes. → Measure the distance to that boundary in device px
  (outside the hole, and inside the next copy's page edge) and fade to a dark line over 1.3 px.
- **The per-copy number came out black.** The engine added `droste-live` (which makes the DOM digits transparent) before
  it read the counter's colour. → Read the computed colour, build the digit strip, then add the class.
- **"Copy number 1" was not on the copy you look at.** Which level the most visible counter lands on depends on the rest
  fall *and* the spin. A fixed offset was right for one page and wrong for the next. → At layout, evaluate the inverse
  map at the rest pose, find the level where the counter is biggest, and offset so that copy reads `start`.
- **Screenshots timed out at full resolution.** The loop redrew the heavy shader every frame even when nothing moved;
  software GL could not finish a frame inside Playwright's 30 s screenshot window. → Draw only when something changed
  (an upload, fall / wind moving, a ripple ringing, a resize). The rAF loop still runs (frames count), the canvas keeps
  its last picture. On real GPUs this also stops idle battery drain.
- **The quick/sharp upload switch never fired in checks.** "Changes in quick succession" was "two paints < 140 ms apart",
  but a sharp upload with mipmaps in software GL takes longer than that, so paints never came that close. → The window
  is `max(140 ms, 1.8 × frame time, 2 × last upload cost + 80 ms)`.
- **The probe left the page offset.** `S.probe()` places the page so a known element sits at the canvas centre; until
  the pointer moves, hit testing used that offset. → `S.place(page, null)` right after the probe resolves, then place
  from the pointer.
- **Hit-test mode reported `css?`.** In the Chromium build here the probe's `elementFromPoint` did not hit the target, so
  the mode is a guess; clicks still land (CSS transform mode). The check proves clicks with real mouse events at two
  depths, which is what matters.
- **Typing tests collided with the intro.** The intro types the editable line after load, and the shared check types
  into it too. → `#nointro` (and `#still`, `#calm`) skip the opening and the intro; any pointer or key stops them.
- **The window's aspect drifts with rounding.** `calc(100% / var(--S))` for width and height gives the page's aspect, but
  one pixel off makes the recursion step. → S is taken from the width; if the height disagrees by more than 1.5 px the
  engine sets it (and notes it in `__hic.info.warn`).
- **Uploading the page at screen size made the outer copy soft.** Just before you pass a copy it is magnified S× on
  screen. → The quiet upload is up to 2.2× the screen (capped by `MAX_TEXTURE_SIZE` and a 9 Mpx budget) with mipmaps
  and an explicit LOD from the map's scale (screen-space derivatives jump at copy boundaries).
