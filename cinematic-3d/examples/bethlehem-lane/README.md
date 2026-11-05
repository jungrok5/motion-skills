# Bethlehem lane — a night lane in an old stone town, one lit doorway, one star

One 9.2 s shot made for 「메시아 예언과 성탄」 (one-scroll-bible, scene partRise, Mt 1:21), 2026-11-05. It replaced a third
far flight over the same software-3D town, which all four reviewers had read as a repeat. Use it for any old-town night (a
Judean village, Jericho's gate at dusk, Emmaus): the shapes are boxes; the picture is the light.

- **Composition**: eye height (1.55 m) in a 3.2 m lane that rises 4.5 %, walls set back and forth so they are ragged; the
  lane ends at a low house against a rock hill, its doorway the brightest thing; a man stands in it, small.
- **Move**: a 9.5 m walk in, a breath of handheld; from 3.6 s the gaze rises toward the star, only as far as keeps the
  doorway above the verse band.
- **Light**: cool moon from the left (right-hand walls catch it), small warm window lamps (glow + 3 cd real light each),
  45 cd inside the doorway, a spot from the doorway onto the steps; the star (an HDR sphere + a lamp with fog 6), a soft
  spot that washes only that house's face, faint lamps in the haze over its roof. Exposure ramps .62 → 1.05 after the cut.
- **Atmosphere**: density .02, falloff .11, start 5 m — enough for every lamp's halo, not enough to turn the frame beige
  (density .045 did).
- **Lived-in**: clay jars (lathe), a stone bench, two wooden doors. Without them the lane read as a set.

`shots/lane.js` exports `build(W, H)` → `{ film, canvas, draw(ctx, u) }`; `shots/lane.html` runs it as a page
(`?o=h` for 1920×1080). Stills: `node scripts/render.mjs examples/bethlehem-lane/shots/lane.html --stills 2,5,8 --scale .5`.
