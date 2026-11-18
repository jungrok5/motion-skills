# LESSONS — problem → cause → fix (from building jelly-page)

- **A still timed out (no frame in 30 s) in headless Chromium.** Cause: a 4× MSAA default framebuffer under SwiftShader;
  even a frame with both passes skipped took 1.5 s. Fix: `antialias: false` on the context (the foot is anti-aliased in
  the shader from the outline distance) — about 3× faster.
- **Each frame shaded the table twice.** Cause: the jelly called the full `ground()` (cloth, plate, shadow march) again
  for the refracted ray, and once more at its edge. Fix: draw the table once into a framebuffer and read it back at the
  refracted point projected to the screen (`groundC`). The framebuffer is 8-bit, so it holds Reinhard-encoded linear
  colour (`c / (1 + c)`) and the jelly decodes it before absorbing.
- **The page kept drawing at rest.** Fix: `advance()` reports whether anything moved; nothing is drawn while nothing moves.
  A `dirty` counter owes two frames after an upload, a resize or any API call.
- **`#still=…&act=drop` gave a different picture on every load.** Cause: the act ran in the probe's promise, after the
  frames owed to the first upload were spent, so sometimes it was never drawn. Fix: every API call that changes state
  (`settle`, `tick`, `act`) calls `J.redraw()`. The check now loads the same act twice and compares.
- **The same still still differed between loads (11.5) on a busy machine.** Two causes: the camera's lean toward the
  pointer picked up a stray pointermove at load, and the hint pill faded on one load only (the drop emitted `jelly:touch`).
  Fix: in `#still` the camera never leans and no events fire. And `__hic.owed` was only updated in the frame loop, so
  right after the act it still read 0: `redraw()` now updates it at once, and stills and checks wait for 0.
- **Software GL.** A live page on SwiftShader / llvmpipe starts at 0.6 resolution (from `WEBGL_debug_renderer_info`);
  stills keep full resolution.
- **Dark branching "veins" across the top.** Cause: the reflected window was huge (it covered half the top) and its
  glazing bars were bent by the gloss "swim" — whose wavelength matched the veins — and by a domed top. Fix: a small window
  placed so its reflection sits at the far upper-left of the top, a swim of .0012, a dome of .012, and no invented strip
  light. Debug it by outputting `room(Rg)` alone: what looks like refraction is often reflection.
- **A hard-edged rectangle in the shadow when the jelly was lifted.** Cause: the blurred height mip clamps to its edge
  outside the domain, so the shadow march found "jelly" everywhere beyond it. Fix: multiply the blurred height by a mask
  of the domain.
- **Fruit near the walls looked like holes.** Cause: balls placed within the shoulder were seen through the thin wall.
  Fix: bits keep at least shoulder + flute depth + their radius inside the foot.
- **The oval mould cut off the page's corners.** Cause: an ellipse scaled from the page's half-size does not contain the
  page's corners under its flat top. Fix: the ellipse passes through the corners (`PW·√2`) plus the margin, and the
  margin is never less than shoulder + fluteDepth + .03 for any shape.
- **The jelly still moved 2.4 px three seconds after a hard pull.** Fix: damping ratio .07 when firm (was .045); a big
  party jelly can ring longer but must settle within 3 s (the check).
- **Upload alpha.** `texElementImage2D` returns straight alpha by default; with `UNPACK_PREMULTIPLY_ALPHA_WEBGL` it returns
  premultiplied (measured). Upload premultiplied so mips do not fringe, and divide by alpha in the shader before the
  candy test.
- **Clicks mid-wobble.** The page is placed under the pointer synchronously in `pointermove` and `pointerdown` (not only
  in the frame loop, which may be slow), and again each frame while the jelly moves. A press on a control gives only a
  gentle prod, so the element under `mousedown` is still the element under `mouseup`.
- **Pulling vs. selecting.** A press on plain page text grabs the jelly; only controls and editables (and `[data-live]`)
  take the press. Mark text that must be selectable with `data-live`.
- **Phones.** A round plate on a portrait phone is width-limited, so the page renders small. The engine fills 98% of the
  width in portrait, and the page should switch to a portrait layout with a media query (the mould is rebuilt to the
  page's new size). Small print stays small: keep phone pages to the big line plus large controls.
- **Software GL frame rates in checks are low (≈1–3 fps).** The checks step physics with `J.tick()` and read state from
  `window.__jelly`, and set `state.freeze` while a real click lands, so they do not depend on frame rate.
