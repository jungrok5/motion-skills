# Lessons

Problem → cause → fix. Engine first, then the hands.

## Engine
- **The table and the window frame came out as rounded blobs** → strokes and washes ran every outline through a
  Catmull-Rom smoother, which turns a 4-corner rectangle into a pillow → keep corners: `K.densify` subdivides edges;
  smoothing only when the author asks (`smooth: true`). Authors draw curves as curves.
- **Vertical seams every 256 px in the paper** → the tiles' noise had a non-whole number of cells per tile → snap every
  octave to a whole number of cells (`fbm(…, period)`), stretch streak tiles by whole factors only.
- **Paper looked like clouds** → a low-frequency cold-press tile multiplied at full strength → finer cold-press, lower
  floor; big flat washes use the `fine` tooth instead of `gran`.
- **Steam and white window bars were drawn as dark graphite** → every line went through the line pen → light lines
  (`K.isLight(colour)`) are drawn as light: lifted paper, chalk, a scratch, white thread — each hand in its own way.
- **The back persimmon's outline showed through the front one; the table edge ran across the fruit** → line work was
  drawn last over everything → each item's layer is cut by what is painted after it (`S.occluders(item)`): a hand never
  draws what it cannot see. Opaque media get this free from painter's order; transparent ones need the cut.
- **A huge dark blob on the table** → the "form toward the light" wash was applied to the ground plane too → round-form
  shading only for subjects; grounds and walls get at most a gentle graded wash.
- **Broad strokes for the wall's texture spilled over the table top** → wide strokes were not clipped → `D.clip(region)`.
- **A drawing film that changes its mind**: a stroke's width profile was recomputed from the part drawn so far, so the
  early part of the line shimmered as it grew → the profile belongs to the whole stroke (`ribbon(…, { k })`); only the
  travelling tip is pointed.
- **The template pear was cut flat at the bottom** → a spine-with-widths body ends square → round things are lathe
  profiles (half outline, mirrored), spines are for limbs, stems and fish.
- **Hangul labels on contact sheets showed as boxes** → the render container has no Hangul font → sheet labels use the
  English names; the Korean names are in `styles.mjs list` and on the samples page.
- **A house style that only the first piece used** → baking the style into each `piece.js` at creation meant changing
  the house style changed nothing → the page reads `../house-style.json` at load; `piece.style` is only an override.
- **A living frame cost a quarter second before any mark** → the value plate mixed every pixel's colour through hex
  strings → numeric colour triples per region; the plate is built once per frame and only when a hand asks for tone.
- **The table edge floated across the back persimmon** → the piece's zoom moved the edge line with the fruit → whole-frame
  items (wall, table, its edge) stay outside the zoom.

## Hands
- **Chalkboard took 1.8 s** → one offscreen layer with a cut per shape, and each layer is a full-canvas pass → batch
  one layer per stage and find hidden outline runs with `S.regionAt` instead of cutting layers (`_tone.js visibleRuns`).
- **Charcoal could not erase only charcoal** → layers do not persist across passes → lifts paint paper colour, and the
  paper tooth multiplied on top makes them read as lifted.
- **Engraving loses light lines on light ground** (the window bars over the glow) → one line's width is the only tone it
  has → accepted: pick another hand when thin light lines carry the picture.
- **The table edge showed through the persimmons in tone-driven hands** → the value plate stroked every line over every
  region → each line on the plate is cut by its occluders, like line work on paper.
- **Riso colours came out as nearest-ink guesses** → nearest colour ignores overprints → fit ink densities per colour
  (paper × Π(1 − d·(1 − ink)), a few Gauss–Newton steps, cached): orange is yellow under pink, near-black is all three.
- **A wash touching the frame edge left a bare strip** → `wash` shrinks toward its centre → washes that meet the frame
  use `shrink: 1` and no offset.
- **A drawing film that sat still for a second near the end** (mid-century, line-wash) → strokes along a table's outer
  edges ran off the sheet but still took time → a stroke's time is its length ON the sheet only.
- **folk-tale's film stalled on a still life** → its "middle-distance washes" pass had nothing to wash but kept its share
  of the time → a pass with no marks takes no time.
- **The loop check failed hands with film grain** → grain and boil change every drawing, so the seam always differed →
  the seam may change as much as an ordinary step between two drawings, not more.
- **Bulk `closePath()` on paths with thousands of subpaths took 7–8 s in Chromium** → `fill()` closes subpaths anyway →
  leave `closePath` out of big batched paths.
