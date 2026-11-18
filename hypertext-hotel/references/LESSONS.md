# LESSONS — what broke while building this skill, and the fix

Problem → cause → fix, from building the engine, the townhouse template and the night-bakery example.

1. **A lamp shade or a radio dial did not glow, though its light was on.** → A material's `glow` is resolved to the zone's
   light index when the vertex is written; the prop was built before `B.light` created that light, so it found nothing. →
   Create the light first. `P.lamp` itself had the bug (its shades stayed lit with the lamp off, seen only in the "lights off" still); it now creates the light before the shade, as do `Dollhouse.lift` and the bakery's wireless.
2. **The oven fire showed only as a tongue at the top of its mouth.** → The flame quad stood inside the dark box that paints the
   oven's mouth, so the box's front face hid it. → Additive flames go just in front of the surface they glow on.
3. **Controls were hidden behind props in the first stills** (the hob dial behind a shelf, the study switch behind a curtain, the
   parlour fire behind the sofa). The hit-testing check passed: the DOM element was still clickable, only the drawing was
   covered. → Lay each room out on paper: back wall from left to right, what stands in front of it; keep controls clear. The
   still review's item 2 is the guard, the check cannot see occlusion.
4. **The frame-cost measurement said 3 ms when a frame took 2.4 s.** → `gl.finish()` returns early under SwiftShader. → Read one
   pixel back (`readPixels`) to wait for the GPU; the idle redraw rate is set from that cost.
5. **Stills timed out while taking the screenshot.** → Under `#still` a fan's animator still reported motion every frame (it
   advanced by `dt`), so the scene was redrawn without pause and software GL never yielded a frame to the screenshot. → A still
   stands still: between `advance()` calls the world is updated with `dt = 0` and animators run once to set their pose.
   Close-ups at full resolution can still time out on a loaded machine: use `--q 0.75`.
6. **The changed elements of a paint were unknown in the upload callback.** → `hic.js` sets `canvas.onpaint` when the stage is
   made, and listeners run in the order they were added. → Add the `paint` listener (collecting `changedElements`) before
   `HIC.stage()`; upload only those (all of them when the list is missing).
7. **Every control is its own canvas child, so placement must be per element.** Each is `position: absolute; left: 0; top: 0`
   and placed with the homography of its projected rectangle (a `matrix3d` with the z row cleared). In the earlier API (CSS
   hit testing, headless here) this lands clicks exactly; `S.probe` reports `css?` because there is no geometry API to confirm,
   and the placement is done right after the probe resolves (it leaves the probe element at its offset).
8. **A tall vertical range did not match the lift's floors.** → The thumb travels the range's height minus the thumb. → The
   control carries `data-thumb` and the engine sizes its rectangle so that travel equals the distance between the stops; the
   check measures the lever on the car (≤ 12 px; 0.3 px and 5 px in the two pages).
9. **The far skyline was drawn below the plinth.** → The sky's skyline sat on the bottom of the frame. → The sky takes the street
   level, draws the skyline from there and fills below it with dark ground.
10. **A shader edit broke the page with "Invalid or unexpected token".** → A scripted edit put a raw newline inside one of the
    shader's quoted lines. → Keep one GLSL line per array item; check with `node -e "require('./lib/dollhouse.js')"` (it fails
    only on `HIC` missing when the syntax is fine).
11. **Twins of styled vertical ranges become horizontal.** → Their class (and its `writing-mode`) is stripped. That is the point
    of the twin: it shows what the element really is. The plain fallback page also resets vertical ranges to horizontal.
12. **Software GL is slow** (0.7–2.5 s a frame at 1280×800 on a loaded machine). → Checks run at `#nointro&q=.5&lens=off` and
    move the world with `advance()` (simulated time) instead of waiting; the lens and plain-sheet checks turn them on themselves.
