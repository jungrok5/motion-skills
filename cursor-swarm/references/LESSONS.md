# LESSONS — what broke while making this skill, and the fix

Problem → cause → fix, one or two lines each. Add yours.

- **The swarm op made the next op wait 1.1 s for an agent.** → `paint` / `cells` cut the grid into more tiles than there were
  free agents (`ceil(k / cols)` rows of tiles), so some agents got two tiles in a row. → Tiles are `cols × floor(k / cols)`
  ≤ free agents; check.mjs reports any op that waits > 0.45 s.
- **check.mjs said "renders differently the second time" on 2–9 pixels in the corner.** → Skia's glyph cache at the
  quarter-scale preview: rotated ruler labels and a label cut by the frame edge rasterised slightly differently after
  other text. Full and half scale were identical. → Ruler labels are upright, snapped to whole pixels, and skipped near
  the edge; check.mjs samples at `--scale .5`.
- **Frame 0 was empty and the prompt flashed by in under two seconds.** → The intro was sized to the prompt typing alone.
  → The intro is `max(3.4, typing + 2.1 s)` and the prompt pill and artboard are already half visible at t = 0 (thumbnails
  and posters use frame 0).
- **The typing agent's name tag sat on the line above** (the kicker over the headline). → It was pinned to the text frame.
  → The tag follows the I-beam, like a multiplayer cursor label.
- **Stars and chimney steam in the pixel banner read as punctuation** ("AT:5AM"). → Random cells landed next to the
  lettering. → Keep a one-cell clear margin around `pixelText` in any `defineArt` that the swarm paints.
- **The blue drop flash hid the map for a beat.** → 45 % blue over the whole image. → 28 % for 0.25 s.
- **"Off screen while it is built" fired for a label 8 px past the view.** → The rule demanded the whole box. → An op
  must have its top in view and ≥ 80 % of its height (or of the view) visible at the middle of its build.
- **A sign-off line typed a `₩` the fonts do not have.** → Latin subsets lack U+20A9. → Write `39,000원`; check what the
  bundled fonts cover (lib/fonts/README.md).
- **The soundtrack was quiet** (RMS −28 dB) because 3,000 painted cells were thinned to ~70 ticks a second and normalised
  only when clipping. → Always normalise the peak to −1 dB; ticks closer than 14 ms are dropped.
- **A footer rule was drawn 1 px long.** → `line` kept its end points in `x1`/`y1`, the same fields every op uses for its
  bounding box, so measuring overwrote the start point. → End points live in `p1x p1y p2x p2y`; the API still takes
  `x1 y1 x2 y2`.
- **The camera left each slide before its last line was typed** (look-ahead 0.75 s + lag). → Between boards the camera
  moves only after every op on the current one has ended (+ 0.1 s), and pans a little faster than it scrolls.
- **A slide fading in over the dark editor looked like a grey slab.** → Fixed-size boards are dragged out as a frame
  (selection + size tag) just before their first op, like everything else in the editor.
- **Idle cursors piled into a column at the edge of the view while the camera panned.** → An agent the camera leaves
  behind is carried along and spread inward by its own seeded amount (40–300 px), so the crowd follows loosely.
- **An imported deck had text boxes hanging off the slide** (PowerPoint allows it). → import-doc.py clamps text widths to
  the board; check.mjs reports anything still outside its board.
- **A Korean-only title gave an empty URL** (`.deck`). → import-doc.py falls back to `my-deck.deck`; set `--title` / `url`.
