# LESSONS — what broke while building sheet-city, and the fix

Problem → cause → fix. Newest discoveries matter most for the next topic.

## Rendering in software GL (headless Chromium, SwiftShader)
- **A screenshot of the source demo took 90 s.** It renders a 2048² shadow map, 4× MSAA, a 16-tap depth-of-field pass
  and 20 shadow taps per pixel on every frame. Software GL does it at seconds per frame, and Playwright's screenshot waits
  for a compositor frame. → This engine renders **on demand** (only when the camera, the sim or an upload changed
  something), has no idle drift, no depth-of-field pass, and measures its second frame at start (`measure()`, the first
  compiles shaders): above 90 ms it drops MSAA, above 250 ms it switches to a lighter shader (3 shadow taps, no street
  occlusion), draws at 0.5–0.65 resolution and leaves a gap between frames so the browser can composite. `#q=` pins the
  resolution; `#still` always draws at full quality.
- **Screenshots still timed out while the opening played** (continuous long frames). → The shared checks run with
  `#nointro` (the page at rest); the opening is checked separately by sampling the sim (buildings up, time advancing).
- **A check that stepped the sim 360 times queued 360 renders** and the next screenshot starved. → `advance(s, quiet)`
  steps without drawing; the check renders once at the end.
- **Timings were useless on a loaded machine** (load 16 on 4 cores, other agents' browsers). Measure relative changes
  in one run, never compare across runs.
- **AO was the biggest fragment cost** (9 neighbour fetches per pixel). → A building fetches its 8 neighbours' heights
  once per vertex (flat varyings); a street pixel reads only the 4 lots around its nearest crossing.

## MSAA
- **Every still went black** after moving to a multisampled target. Cause: `blitFramebuffer` resolving a multisampled
  RGBA8 renderbuffer into the canvas, whose format with `alpha: false` is RGB8 — formats must match for a resolve, so the
  blit failed silently. → The renderbuffer is RGB8; the first blit checks `getError()` and falls back to no MSAA.
- The canvas context is created with `antialias: false`, so MSAA can be dropped at run time on a slow device (context
  attributes cannot change later).

## Hit testing on a 3D plane
- The sheet is placed with a projective `matrix3d` that maps sheet px onto the horizontal plane at the height under the
  pointer (roof height on a building, 0 on the street). Its z row is the identity (out z = in z) so the matrix stays
  invertible for the browser's hit test. In CSS mode this worked first time in Chromium; the check proves roof clicks,
  the formula field, Undo and a real slider drag through it.
- **A press that wanders off its building would retarget the slider or text selection mid-drag.** → On pointerdown inside
  the sheet the placement is locked until pointerup.
- **Walls**: a ray hitting a wall places the sheet with a 2D translate that puts that cell's centre under the pointer, so a
  click on any face of a building selects its cell.

## The shared typing check
- **"The canvas did not change after typing" (diff 0.000–0.006)**: the test types into the formula field, whose glyphs are a
  few pixels tall on the drawn bar; the sparse pixel sample missed them. → Typing in the formula field now shows the draft in
  the selected cell (as spreadsheets do) with a `--draft` fill, which recolours that building's walls: a real, visible
  change. With `typeSettle: 2500` the diff is 0.07–0.15. If a topic's selected cell is hidden, pick a visible `select`.

## Layout of the book
- **The running total hid behind the week totals** (marathon: km so far starts small and stood behind 80 km weeks). → A
  running sum that would hide is a printed row in front of the city; the light still hops along it and its cells hold, then
  count. Rule: totals behind their items, smallest rows in front.
- **Masts stood on every tower and crossed the numbers behind them.** → Masts only above 70 % of `tallest`; plant rooms sit
  in the back strip of the roof, clear of the centred number.
- **Props at the frame's edge were cut** in the home view. → The camera fit includes the props' footprints.
- **Printed dependants jumped to their new figure** while buildings waited for their light. → Every changed dependant
  (building or printed) holds its old figure until its light's arrival time, then counts.

## Upload
- In this Chromium the upload way is "earlier" (`texElementImage2D`) and hit testing is CSS mode; `lib/hic.js` handled
  both. The texture is the sheet at 2× with mipmaps (roofs are seen smaller than 1:1).
- A focused text field's caret blink re-uploads and re-renders twice a second; on a slow device the frame gap keeps that
  from starving the compositor.

## No runtime bug found in `tools/hic/hic.js` or `hic-test.mjs`.
Notes for the masters: `hic-test`'s typing diff samples one byte in 97 of a 320 px thumbnail; small glyph changes on a 3D
page can read as 0 — a page should make typing visibly change something (as here) or the test could diff a crop around
`screenOf(edit)`.
