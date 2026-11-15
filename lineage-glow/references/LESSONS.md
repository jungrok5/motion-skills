# LESSONS — problems met building this skill and the first films (problem → cause → fix)

- **The far tree came out a rectangle, not a cone.** Half-width grew with the generation index while the rows packed
  together, so far generations stacked straight up. → Width follows height: `half = 70 + |y(k)| × slope`
  (binaryTree's default). Keep the top edge inside the frame (slope ≈ .55 for a 33-row tree at zoom .6).
- **The axis turned into a grey smear at the top.** Every packed row had a tick. → Ticks closer than 1.6 × their size to
  the last one drawn are skipped (`_axes`).
- **The counter sat in the platform UI.** At y = 250 its label was above the 9 % safe line. → The counter centre
  defaults to y = 275; check.mjs measures every caption and counter box against the vertical-video safe area.
- **The traced line ran up behind the counter.** A chain reaching off the top of the frame drew light under the type.
  → `fadeTop: 470` on `chain.draw` fades links, nodes and labels above that screen row; fade the horizon the same way.
- **The descent looked top-heavy, with an empty bottom half.** The camera held the growing tip high and nothing was
  below it. → The tip sits at about 2/3 of the height, and the whole line is drawn first as a switched-off grey ghost:
  the road ahead is visible and the light "switches it on" as it passes. This is the reference's switch, reused.
- **Labels crowded at the top of Luke's line.** Twenty names packed into a band at zoom .25. → Pack less where labels
  are shown (ratio .95 instead of .9), label only the names the caption mentions, and put the last one (하나님) above
  its node.
- **A label vanished inside a flare.** "예수" under the bursting node was white on white. → Hide labels while their
  node flares; bring the label back for the last caption.
- **End nodes hung in the air while the fan converged.** Lines pulled back but the twinkling ends faded slowly.
  → Fade the end nodes three times faster than the lines (`clamp(1 - back × 3)`).
- **The score was full of NaN.** At an envelope's edge `(i / sr − t) / d` was a hair outside 0…1, and
  `Math.sin(π u) ** 1.5` of a negative is NaN, which the reverb then spread through the whole track. → Clamp every
  envelope phase (`clamp(u)`) before a fractional power. check.mjs counts NaN in the rendered score.
- **The first WAV peaked at .35.** Many quiet voices with a lot of reverb. → `score.mjs` prints the peak; set `gain` so
  it lands around .8.
- **The live ♪ took ~10 s to start for a 100 s film.** The whole score renders before playing. → The live page renders
  at 24 kHz (half the work); the WAV for the MP4 stays 44.1 kHz.
- **`halo: true` crashed the painter.** `halo` was read as a colour. → Only a string is a colour; `true` / `false`
  switch the halo stroke.
- **Counting must match the drawing.** Matthew 1:17 says 14 + 14 + 14, but 41 names are listed: David closes the first
  set and opens the second. → The counter counts each set from 1 to 14 and steps back to 1 *on David*, so the screen
  shows the source's own way of counting rather than a total of 42 that the nodes cannot add up to.
