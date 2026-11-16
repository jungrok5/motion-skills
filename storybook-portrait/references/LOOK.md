# LOOK — why it reads as a picture-book painting, not a vector drawing

The look is a small number of decisions, each made in code (`lib/paint.js`, `lib/figure.js`). Keep all of them in every
piece; change only what the brief designs (who, colours, clothes, extras, motion).

## The media

| medium | where | how it is simulated | what kills it |
|---|---|---|---|
| **gouache** | skin, sclera, nose, ears, small props | an opaque fill on a hand-cut edge (`rough`: slow wobble + grit along the normal), then many broad low-alpha strokes of slightly different mixes laid in one direction (mottle), a darker rim where the paint dried, soft light and shadow pools, a little paper tooth | a clean polygon fill; a linear gradient; a perfect circle |
| **dry brush** | hair (and curls, the bun) | each drag is 7–25 separate bristles along a spline; each bristle has its own colour from the weighted list, width and start; paint runs out towards the end and on the outer bristles (breaks) | strands as single lines; breaks every few pixels (reads as dashes); streak colour everywhere |
| **crayon / coloured pencil** | clothes, patterns, kerchiefs, hoods | hatching in short pressed runs clipped to a ragged shape over a thin tint of the same colour, a second cross direction, then grain knocked out (`tooth`) so the paper speckles through | a pattern drawn as flat bands; no tooth |
| **ink** | face contour, eyes, ears, neck, edges, flyaways | a thin line with a slow wobble, weight that swells and tapers, sometimes two passes; the jaw is two strokes that do not quite meet; the skull line is lighter (the hair covers it) | a closed uniform outline round everything |
| **blush** | cheeks, nose tip, flour | a soft radial rub, a cloud of softer dabs, then a few diagonal pencil strokes in a deeper red | a single radial gradient |

Every op is painted into its own canvas first, so paper tooth knocked out of a crayon pass never bites the paint under it.

## The character

- **Head big, body small.** Head `a` ≈ 0.2 of the sheet width; the neck long (0.5–0.8 a); the bust cropped by the sheet.
- **Features small and low.** Eyes at ~0.3 a below the head centre, wide apart (±0.4 a); nose and mouth tiny and close
  under them; the forehead tall and mostly under hair.
- **Big round eyes, small pupils, looking aside.** A white sclera outlined in ink (heavier on top), a pupil a third to a
  half of the eye with a tiny highlight, placed by the gaze — rarely straight at the viewer.
- **Strong blush** on both cheeks; ears in a warmer red than the face.
- **Hair is a shape plus marks**: a dark gouache mass first, then dry-brush strands in the dark colours, then a few
  coloured streaks in bands (not everywhere), then flyaway ink hairs that leave the mass and curl.
- **One pattern, one clashing pair** on the clothes (yellow / violet, olive / honey, navy / red / cream).

## The sheet

- Warm white paper with a faint cloud of tone and fibre; 25–78 % of it shows (`check.mjs`).
- No background scene. Extras can float (rain, a bee, dust) but the white stays the ground.
- Portrait 4:5, 1080×1350 (`--scale 2` for 2160×2700).

## Turned heads (front, 3/4 both ways)

Features ride a sphere: a feature at unit x sits at `sin(asin(x) + yaw)` and narrows by `cos(…)`; the far eye narrows
and hides past the contour; the nose and chin go the way the face turns; the near ear moves in onto the cheek and widens,
the far ear narrows and hides; the hair mass slides a little towards the turn and widens on the back of the skull so
it never shows bald; the chest turns by about half the head and its front goes the same way. The style stops at strong
3/4 (|yaw| ≤ 0.75 rad): a true profile is not part of it.
