# LESSONS — problems met while building this skill, and the fix

- **Fonts drawn before they load** → plates with numerals or labels painted in a fallback serif. **Fix:** `F.plate()` only
  registers the painter; `F.start()` awaits `loadFonts()` and then paints every plate.
- **First passes passed check.mjs but looked wrong.** The checks prove the page works, not that it looks like the style.
  Always score stills (references/BRIEF.md rubric); every fix listed in `examples/time/BRIEF.md` came from a still.
- **Type over moving walls** → the camera trucked a clock wall under the quote mid-shot, although the first frame was
  clean. **Fix:** check the quote's corner at the END of a camera move too; widen the dark element (a curtain) by the
  camera travel × depth, or add `scrim`.
- **A bright picture behind the big word** (a yellow painting on the near gallery wall). **Fix:** design the plate's
  quote corner on purpose — a dark doorway, a curtain, a shadowed wall — instead of darkening it afterwards.
- **Pastel murals** → colour multiplied onto cream stone came out washed. **Fix:** paint the colour at ~.9 alpha, then
  multiply only the block joints back over it so it still reads as paint on stone.
- **Hair streaks read as a headband** when drawn as bands across the crown. **Fix:** streaks are strands falling through
  the bangs, fading in from the crown.
- **The ink transition held full black** for ~0.4 s (an ease-out rise overshot the frame). **Fix:** ease-in-out levels
  that just cover the frame at the midpoint.
- **Crack lines all at once** looked like a broken window. **Fix:** cracks run outward from the impact (alpha by distance
  × time), then the shards fall in order of distance.
- **Spiky, chunky figures** in the first cast sheet (thick limbs, small head, boxy crown). **Fix:** anime proportions
  (head ≈ 1/6 of height, limbs ~4–5 % of height thick), a domed crown wider than the face.
- **Side locks covering the far eye in 3/4.** **Fix:** locks hang outside the face contour; the face's far cheek tucks in.
- **A partial MP4 (`--from 6`) started its audio at 0 s.** **Fix:** render.mjs seeks the WAV to `--from`.
- **Speed:** Canvas 2D ≈ 0.11 s a 1080p frame on 4 CPU workers including PNG encode; a 43 s film ≈ 3 min.
