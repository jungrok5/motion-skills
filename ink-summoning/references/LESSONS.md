# Lessons (problem → cause → fix)

From building `examples/dragon-tiger`, the template and the zoo against the reference clip.

- **The prompt was in the post itself.** → `api.fxtwitter.com/<user>/status/<id>` returned the full note-tweet text and
  the MP4 URLs; the video came down with curl and `ffmpeg … fps=2,tile=4x4` made the study sheets. An audio envelope
  (RMS + spectrum every 0.25 s, numpy) showed the taiko beat (~0.9 s), the roar bed and the flute break.
- **The first strokes looked like vector ribbons.** → A filled polygon with clean edges. → A dense core + 64 bristle hairs
  with dry gaps; then the hairs looked like dashes (round-capped constant-width segments) → each run is a filled hair that
  tapers at both ends; gaps follow noise in arc length (metres), not sample index, so the texture holds at any distance.
- **Splatter looked like confetti.** → Big elongated ellipses scattered wide. → Mostly tiny round drops near the outer
  edge, a few bigger ones, a rare flick; floor splats ~1.3× the drop, smoothed outlines.
- **A wet "head" blob made strokes look cartoony.** → Removed; the brush covers the growing end.
- **Spin rings were thin lines.** → Horizontal rings seen from eye level are edge-on. → High camera for spins, frontal
  camera for vertical circles; the big vertical circle is placed `I.arc`s timed to the swings.
- **The first stroke was a vertical line.** → An overhead → chop swing lies in a plane edge-on to a frontal camera. →
  A diagonal slash (coil high-left → sweepR low-right) faces the camera.
- **The figure had giant capped legs and no torso.** → Hakama legs as capped tubes, radius .25. → Open-hem legs (.13 →
  .2), an apron panel between them, a kimono that reaches the thighs, wider sleeves that hang and trail.
- **Hair looked like six paper strips.** → 16 wide strands. → 34 thinner strands following the head's past positions.
- **The creatures looked like plastic toys, then like porcelain.** → Clean tubes in wash grey; then brush strokes over a
  white "paper" base whose edge showed. → Paint them as ink: dense black brushwork over a *dark* base, rim streaks, white
  negative-space stripes, white eyes/fangs/whisker pads — the same contrast as the strokes.
- **The tiger's face read as an owl.** → Round eyes with a glow ring, a white circle muzzle. → Slanted almond eyes with a
  slit and a heavy brow, pale spots above, a T nose, whisker pads as short pale strokes, cheek ruffs fanning out and down.
- **Belly fur looked like a comb.** → Evenly spaced identical flicks. → Fewer, jittered, varied length, raked back.
- **Front-on quadrupeds are the weakest view.** → A tube body seen end-on is a column. → Charges at 3/4 (camera yaw .5–.9
  off the beast's heading), with heavy motion blur; profile for the tableau.
- **The smoke was a black ball.** → 46 puffs at alpha .62 in a tight spread. → 64 smaller puffs at .4 that rise 1.9 m and
  spread 2 m.
- **The studio was washed out next to the reference.** → Walls ≥ #e9 and a 42 % reflection. → Walls #9aa1a8…#d8dbde,
  floor #c9cdd1, reflection 55 % (the bloom and grade lift it back to high-key).
- **The dragons looked rigid and mechanical beside the reference's smoky ones.** → Opaque bodies, a saw-tooth crest. →
  Soft smoke sprites streaming off the body (`P.smoke`, more while forming), every other crest spike, brushed and irregular.
- **Big motion blur strobed into stacked copies.** → 5 sub-frames at shutter 1.4 on a fast head turn. → 7 sub-frames,
  shutter ≤ .7 on close-ups, a still hold before the whip.
- **Close-ups expose the mask.** → Round eyes, goat-like horns, a small smile read as cute. → Slanted eyes with a small
  pale iris, a grimace stretched to the cheeks with corners up and four fangs, slender horns curving inward; hair painted
  with the brush in white so strands have bristle streaks; a high camera so the near arm drops out of frame.
- **The charge ended with the head out of frame.** → The camera target was the body's end point; the head is ~0.7 m ahead.
  → Aim close cameras at where the head will be.
- **Python edits that slice by marker comments can delete a neighbour section.** → A slice from "hakama" to "arms"
  swallowed "torso". → Slice to the very next marker and assert every replacement matched.
