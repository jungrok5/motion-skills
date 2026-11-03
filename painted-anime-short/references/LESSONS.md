# Lessons (problem → cause → fix)

From building `examples/last-tram` and the template against the reference video.

- **The first canopy looked like stacked pebbles.** → Clumps were 15–20 round dabs; round edges read as vector blobs. →
  `clump` became a dark silhouette plus three passes of small leaf flecks (`flecks`), each pushed toward the light; the
  fleck size is tied to the clump radius (~9 %) so far crowns and close-ups both read as leaves.
- **Sky showed through the canopy rows.** → Rows of clumps leave gaps. → `canopy` fills a rect under each row before
  painting it (`fill`, `below`); the last ragged edge uses `fill: false` with `spray`.
- **Clouds read as rows of bubbles, then as soap bubbles.** → Separate circles with hard lit caps. → `cloud` overlaps many
  squashed bumps with a dragged flat underside; `cumulus` unions jagged bumps into one `Path2D`, fills it with a top-lit
  gradient, softens each bump's cap and shadow with a blur, then adds curved light strokes; `cloudBank` dissolves each
  row's base into haze so rows don't stack like stones.
- **The forest backdrop was a flat cream wall.** → Hazing the whole plate after each depth stacked the haze (far trees got
  ~.7). → `P.layer` paints each depth on its own canvas and hazes only that layer (.5 / .3 / .14), with greener, darker
  bark per depth.
- **Rust looked like camouflage.** → `weather` amount .55–.7 with saturated oranges. → amount .2–.35, blotch scale ~20
  local px, tans and a grey-green patina; less on the cream panels.
- **The tram floated above the grass.** → No contact. → `P.shadow` under it and a 70 px plate of grass blades drawn
  *after* the tram over its wheels.
- **The bird hovered above the roof in the close-up.** → Its landing point was guessed in screen space. → Work out where
  the roof is from the plate transform (plate y + (local y + offset) × scale) and add `F.check` for the landing.
- **A plate edge appeared when the camera tilted up.** → The framing plate was exactly 1080 tall. → Paint framing plates
  300 taller and put them at y −300; size every plate for its shot's camera travel × depth.
- **The sapling crown was cut flat at the top of the close-up.** → The close-up plate ended just above the roof. → Size
  close-up plates from the hero's tallest part (sapling tip) × scale, not from the body.
- **The headlamp close-up showed the whole narrow front with empty sides.** → Painted at 1.5×. → 2.5×, lamp a little off
  centre, windows cut by the top of the frame, bumper at the bottom: a close-up fills the frame.
- **The pantograph looked like an ironing board.** → An X of two lines. → A diamond on a base frame, a collector bar with
  curled ends — draw machines from how they work, not from a silhouette guess.
- **`backdrop.mid is not a function`-style mistakes broke a whole shot.** → A typo in one shot only shows at that t. →
  `check.mjs` seeks every 0.25 s and reports any shot that throws, and any blank frame.
- **Rendering in the background with `&` inside a background task** reported "completed" while the render was still
  running. → Run the render as the background command itself, and read `out/render.log` / wait for the MP4.
