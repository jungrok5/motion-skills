# Lessons (problem → cause → fix)

## Reading the reference
- **What looked like a "2D to 3D" morph is a lens change.** → Frame-by-frame, the front row keeps its size while
  everything behind it shrinks: a dolly zoom. → The engine ties the camera distance to the field of view
  (`D = H / (2 tan(fov/2))`) so every view keeps the facade plane at one size.
- **The gap is never visible in the flat frame.** → In both clips something deeper (a set-back house, an arched bridge,
  then the tower) fills the gap exactly. → The brief has a "plug" line; the template's gate and the example's wooden gate.
- **Moves land on a beat.** → The audio has a whoosh every 1.0 s; the camera moves on those. → `beats` with `beat: 1`.

## Building the skill
- **The first flat view showed the street floor and the whole town, no sky.** → An extreme lens (2.4°) from 310 m with a
  3° downward pitch looks *down* into the gap; rows behind rise over the roofline. → fov 6°, camera *height* = the
  roofline (`eye`) instead of a pitch, and the town behind sized with `F.hide(z, roofline)`.
- **The landmark filled 170–290 % of the flat frame.** → Far things are only scaled by `D / (D + |z|)` ≈ 0.4–0.6 at
  fov 6°. → Size the landmark for the flat frame first (check.mjs prints its share), then check the reveal ratio.
- **The landmark check said "hidden" although the tower was plainly visible.** → The hill was in the same part, so its
  bounding box was the hill's. → Only the landmark itself goes in the `F.landmark` part.
- **Eight blur samples left ghost copies on the dolly zoom.** → The middle of the move shifts the picture by hundreds of
  pixels per frame. → Adaptive sub-frames: as many as the picture moves ÷ 3 px, up to 24; holds render once.
- **Ink outlines vanished on dark roofs.** → Outline colour ≈ tile colour and roofs overlap in the flat view. → Lighter
  tiles, a wooden eave band under hip roofs (`roof.under`), 2.2 px ink.
- **Upturned eaves made of rotated corner blocks read as debris on the roofs.** → Replace with one roof surface whose
  eave corners lift with a cubic curve (`curl`).
- **Side views were full of roofs.** → The alley rows were placed with `B.at(x, z, ±90)` and the wrong x range, so half
  the houses stood on the front road. → `B.at(x, z, 90)` turns local +x toward world −z: run the left row x 0 → L, the
  right row (−90) x −L → 0. check.mjs's "crowds a wall" warning caught it.
- **Cars filled the centre of the `deep` view.** → At `fov 52°` the camera stands ~1 H from the facade, right over a road
  of full-size cars. → Toy-scale cars (`size` 0.55–1) on lanes 2–5 m in front.
- **Fog would have broken the trick.** → Fog by camera distance changes 10× during a dolly zoom. → Haze baked into vertex
  colours by depth `z`.
- **Shadow acne on toon faces.** → `bias −0.0004`, `normalBias 0.03`, a tight shadow frustum on the near town (4096²).
