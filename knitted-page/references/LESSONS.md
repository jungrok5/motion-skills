# LESSONS — problem → cause → fix (from building this skill)

- **Small lines turned to mush** ("Village hall · Sat 14 Dec" at 48 px, "Going · 41" at 46 px). → At 10 × 8 stitches a
  48 px line is six rows tall and Inter Black's strokes are one stitch wide, so letters merge. → Type is sized for
  stitches: headline 120–160 px, every other line 60 px+ in capitals with .06–.08 em spacing, fewer words. The example's
  first chunky 12 × 10 gauge failed the same way; it went to 10 × 8.
- **Green and yellow specks at the edges of navy letters.** → The palette held every colourway's yarns, so anti-aliased
  in-between pixels snapped to whichever yarn was nearest (green, mustard). → The stitch shows the purest tap (the extreme)
  of the winning cluster, not the cluster mean, and the palette holds only the colourway in use (`--bg`, `--ink`, …) with a
  small `paletteReach`, so swatches of other colours keep their own.
- **The swatch for the green colourway knitted navy.** → `paletteReach` 0.08 was wide enough to pull it to the ink. → 0.03.
- **A hand-pull unravelled everything in a second.** → Speed came from the distance between the hand and the unravelling
  front, and the front races across a whole row (~1100 px) per row of stitches. → Measure how far the hand is beyond the
  cloth's edge; speed eases in (weight) and grows with that distance.
- **The caret check failed though the caret worked.** → The shared check clicks `[data-hic-click]` last, which takes focus
  from the headline; later typing went to the button. → The skill check clicks the headline again before typing.
- **`half` broke the shader.** → It is a reserved word in GLSL ES 3.00. → Renamed.
- **Read-back of a texture uploaded from an element returned zeros** (attached to a framebuffer and read directly). →
  Read back only from the engine's own render target: the downsample pass draws into a normal RGBA8 target and
  `readPixels` reads that.
- **Page textures are top-down** (v = 0 is the element's top) while render targets are bottom-up. → Sample the page and
  the reveal with `p / view` directly; flip only scene-target coordinates.
- **Two drawable children work** (`#page` and `#under`), each uploaded on its own; the later child is on top for hit
  testing, so `#under` keeps `pointer-events: none` until the table is bare (and before `S.probe`, or the probe hits it).
- **`S.probe()` leaves the page at its probe offset.** → Place `#page` and `#under` at identity right after it resolves.
- **CSS `zoom` also scales an element's own `left` / `top`.** → The mount carries the position, the card carries the zoom;
  the design size is measured with zoom 1.
- **Software GL starves screenshots.** The fabric pass is heavy (~0.5–1 s a frame in SwiftShader). → The scene is cached
  and redrawn only when dirty; frames wait on a GPU fence (polled on later frames, never in the same task); checks pass
  `#q=0.5` and `#nointro` and step simulated time (`__knit.manual()` / `advance()`); stills freeze a `#pose`.
- **A red feed strand while typing navy letters.** → The strand took the colour of the stitch at the sweep front, often
  the knitted caret. → It takes the yarn most of the change is knitted in.
