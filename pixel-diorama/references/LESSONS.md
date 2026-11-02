# Lessons (problem → cause → fix)

From building `examples/halloween-rain` and `examples/first-snow`.

- **The loop jumped though every motion used the loop helpers.** → A crystal's light did `power: t => … D.wave(t, 6, r())`:
  the rng was called on every frame, so the pulse phase changed each time. → Draw random values once, outside draw and
  `power` functions. `loop-check.mjs` caught it ("same t, same pixels" failed); bisecting with `?off=light` found the light.
- **Light pools looked like grainy checkerboards.** → Surface and glow were quantized to 6 levels with a Bayer dither: at
  4× upscale each step is a visible checker. → Default `lightStyle: 'bands'` for the surface, and the glow in the air in 24
  fine dithered steps (invisible as dither, still soft).
- **Every light had a hard disc edge (wisps looked like soap bubbles).** → Bands spaced evenly in f put the first step — a
  ~35 % brightness jump — at 70 % of the radius. → Steps spaced evenly in √f: the faint outer steps are tiny, the bright ones
  sit near the source.
- **Lightning washed the whole frame lilac.** → The flash added 90 % of each pixel plus a tint. → 60 % + a small tint,
  `strength` ≤ 0.5, a short double-pulse envelope (on, dip, on, decay) ≈ 1 s.
- **The moon was a flat white disc.** → Its own glow light added ~50 to every moon pixel, which was already near white. →
  Paint the moon one ramp step darker; glow halo 0.16.
- **Clouds were rounded rectangles.** → Few large overlapping puffs make a flat top. → More, smaller puffs with radius
  varying 0.35–1×, a flat-cut belly, and a lit rim row where the pixel above is outside the cloud.
- **The chimney was hidden.** → It was drawn behind the roof and started below the ridge. → Start the chimney above the
  roof line; its smoke source is the returned `chimney` anchor.
- **Scene pages did not load from file:// in a headless render.** → ES modules are blocked from file:// without flags.
  → Classic scripts (`window.PD`, `window.K`): the page opens by double-click and in Playwright with no server.
- **Pixels went soft in the MP4.** → Not an issue when frames are grabbed at art size and scaled by ffmpeg with
  `flags=neighbor` at an integer factor: each art pixel is a 4×4 block, which also keeps 4:2:0 chroma inside one pixel.
  Never let the browser scale the canvas before grabbing.
- **10 hours of video looked expensive.** → Rendering it would be 1 080 000 frames. → Render one loop, then repeat it with
  the concat demuxer and `-c copy`: 10 hours in seconds, identical frames. The cost moves to file size (~3 Mbps with rain).
