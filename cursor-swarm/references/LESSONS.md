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
