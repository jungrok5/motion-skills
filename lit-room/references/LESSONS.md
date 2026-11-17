# LESSONS — problem → cause → fix (from building this skill)

- **The source could not be screenshotted here.** Its runtime combines dozens of baked light-map layers at 2048 × 1024
  every relight; on software GL (SwiftShader) one frame took longer than Playwright's 30 s screenshot timeout. Cause: a
  heavy light model plus continuous accumulation frames. Fix in this skill: light per vertex (8 × 5 cells × ~50k vertices
  is cheap), shadows and AO computed once, draw only on change, and back-pressure with a GPU fence (`fenceSync`, polled on
  later frames with `clientWaitSync(…, 0)`). A full check now runs in ~7 min, a still in ~12 s.
- **A dark page barely lit the room.** Physically right (a few bright glows on black give little light), but the style
  needs the page to read in the room. Cause: lamps at realistic power swamp it, and the exposure followed the lamps.
  Fix: `look.screenLight` scales the page's light separately from how it looks on screen (`screenGlow`) and in
  reflections (`screenGain`); the exposure weighs the page's light only lightly; room lamps are accents (0.2–0.4).
  Mostly-dark pages use 10–25. Bigger glows on the page help more than more power.
- **The screen bloomed into a halo.** Its HDR value was page × gain, and the auto-exposure multiplied it by ~10 in a dark
  room. Fix: the scene shader writes the screen at `screenGlow / exposure`, so after exposure it is about the page's own
  brightness, and the post pass shows screen pixels (alpha 1) without the tone curve.
- **The porthole showed a bright blue day sky at night.** The shell's sky box ignored `outside.power` (only the window's
  rect light used it). Fix: the sky shader is scaled by it; keep 0.05–0.15.
- **The lantern's flame kept glowing when it was switched off.** Emissive parts did not know their light. Fix:
  `b.mat('glow', …, { lamp: true })` stores the next light's index in the vertex flags and the shader multiplies by its
  level (fades and flicker included).
- **Plank walls looked like marble waves.** The `wood` kind's rings are sized for furniture; across a 3 m wall the warp
  became huge waves. Fix: a `boards` kind (rows of 14 cm along y with gaps, grain along the wall).
- **Bloom, tone and the page.** If the page went through the filmic curve it lost contrast and its colours; showing it
  "as authored" through a separate display path (alpha flag, mixed after MSAA resolve) keeps text crisp and colours true.
- **Hit testing here is the CSS path.** This headless build has the earlier API (`texElementImage2D`, no working
  `updateElementGeometry`), so `S.probe` picks `css`: the page gets a `matrix3d` homography with z passed through.
  `S.probe` leaves the page at its probe offset, so the engine places it right after the probe resolves.
- **The intro glide fought the checks.** A click point computed from `screenOf` was stale 250 ms later while the camera
  glided. Fix: the glide stops at the first pointer move, wheel or key (the camera freezes where it is), and `#nointro`,
  `#still` and `#calm` skip it.
- **A ternary of float and vec3 does not compile in GLSL ES** (`cond ? 1. : alb`): write `vec3(1.)`.
- **Desk light balance in the check.** Dragging a page glow from left to right does not make the right of the desk
  brighter than the left (a dark mouse pad sits on the right), but the left/right ratio falls a lot (11.7 → 1.5). The check
  measures the drop (> 40 %), not a flip.
- **Checks are slow on a loaded machine.** They run at `#q=0.5&nointro` (half resolution, no MSAA) and wait for renders
  (`R.renders`) and `R.settled`, never for fixed rAF counts.
- **Brass and steel came out black.** Metals have no diffuse term and the only reflections were the screen and lamp
  highlights, so a brass ring in a lantern-lit cabin read as a black hole. Fix: metals add `F · E / π` (the light that
  reaches them) as a rough stand-in for the room they reflect.
- **The page's own hint line showed in every still.** `still.mjs` hides `#hint` unless `--hint` is passed.
