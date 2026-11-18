# LESSONS — problem → cause → fix (from building this skill)

- **Screenshots timed out (30 s) although the page ran at 5–12 fps.** Cause: software GL (SwiftShader) on a loaded
  machine. WebGL calls return at once, so requestAnimationFrame kept firing and every frame queued another full render;
  the GPU thread carried a backlog of dozens of frames and the compositor never produced the frame Playwright waited for.
  Spacing renders by frame time did not help (frame time does not see GPU time). Fix: back-pressure with a fence
  (`gl.fenceSync` after each render; skip drawing while `clientWaitSync(…, 0)` says it is still running), draw only when
  something changed, keep a skipped change pending (`needRender`) so the last state is always drawn, cache the shadow and
  contact passes until the sheet moves, and on a slow GPU (> 50 ms a frame) skip decorative motion (idle corner, candle
  flicker). Screenshots now take 1–3 s and the loop runs at 60 fps. A check that reads pixels after a state change waits
  for two more renders (`desk.renders`), not two rAF frames.
- **Staged stills never settled.** A staged fold sprang toward its own rest angle and a staged burn kept deforming every
  frame, so the page never stopped drawing under `#still`. Fix: staged folds carry their own `open` angle, held burns stop
  forcing deform under `#still`, and `#still` counts only lamp / tint fades as "live". `scripts/still.mjs` waits until
  `desk.settled` (nothing left to draw, the GPU fence signalled) holds for 1.5 s, then shoots with a long timeout; waiting
  for the render count to stop changing was not enough once a render could still be in flight.
- **Clicks through a curl or a burn did nothing.** Cause: the front-face test in `pick` had the sign of the screen-space
  winding backwards (screen y points down), so every triangle counted as the back side and the sheet was hidden from hit
  testing whenever it was not flat. Fix: front ⇔ signed area < 0 for the (a, c, b) triangle; the check now types into a
  curled, a half-crumpled and a burning sheet.
- **Coffee stains came out grey.** Cause: multiplying by a dark linear colour (#5a3416 ≈ .10, .03, .005) mostly darkens.
  Fix: treat the stain colour as a hue, normalised to its brightest channel (`pow(c / max, .6)`), and let the shader set
  how strong the inside and the dried rim are.
- **The fold looked like a box lid.** A staged fold left 0.55 rad open; real paper springs back 10–15°. Now 0.24 rad.
- **Wood looked like marble.** A ring frequency of 2.6 per unit with a noise warp of ×5 swirled. Grain runs along the
  plank: 5.5 rings per unit, warp ×2.2 stretched along y (×0.012), pores along y.
- **Props near the frame edge lean toward the camera.** It is real perspective (FOV 26°), but tall props at the edge look
  wrong and get cut. Keep tall props (candles, mugs) near the vertical middle and |y| ≤ .8; flat props go to the corners.
- **Burn front and hole must agree with the picker.** The shader and the CPU read the same noise texture with the same
  bilinear maths (`edgeNoise` / `burnAt`), sampled at level 0 (`textureLod(…, 0.)`), so a click in a hole really reaches
  the desk and embers spawn on the drawn front.
- **CSS-mode hit testing needs the 3D matrix to be invertible.** The plane homography goes in as a `matrix3d` with
  z passed through (row and column 3 = identity), not zeroed; a zero z row makes the transform singular.
- **The sheet must not widen the page on phones.** It is 560 px wide inside a 390 px canvas; `#stage { position: fixed;
  overflow: hidden }` clips it so `scrollWidth` stays the viewport's. The fallback CSS sets `width: min(560px, 100%)`.
- **Checks on a slow machine.** Times are measured on the desk's own simulation clock (`state.clock`), and the check runs
  with `#q=low` (no MSAA, coarser grid); the behaviour is identical, only the edges are rougher.
