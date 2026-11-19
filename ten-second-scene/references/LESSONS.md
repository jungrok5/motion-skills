# LESSONS — problem → cause → fix

From building the skill and its three examples (and the source post).

- **The first render always looks like a demo.** All three examples failed 15–20 of 25 cells in round 1. That is
  normal; the loop is the method, not a polish step.
- **Ground missing, sky showing through** → a ground polygon had a vertex behind the camera and the whole polygon was
  skipped → clip polygons at the near plane in world space before projecting (`clipNear`).
- **Light pools painted the whole ground orange** → the pool ellipse was rotated/scaled in screen space by guesswork →
  draw pools in an affine frame built from the projected world axes (`affine`).
- **Snow texture became rays to the horizon** → long strokes laid along the road converge in perspective → isotropic
  soft dabs sized by distance, or a perspective-mapped texture with mips.
- **A snowbank read as origami, then as a caterpillar** → faceted quads, then one gradient per slice → one continuous
  ridge with a single lit face; and the camera was standing on the bank's line — move the camera, not the art.
- **Lights washed the frame milky** → large `lighter` halos stack → small halos, pools with falloff, keep the darks.
- **People as paper dolls** → stick limbs, disc hands, no light on edges → thicker sleeves and trousers, gloves, a rim
  light from the brightest thing behind them, clothing details (quilting, zip, scarf, straps).
- **A printed panel out-shone the open door** → unlit things drawn as if lit → decide what is self-lit in the brief.
- **check.mjs caught an anticipation the five random frames missed** → the woman's breathing cancelled her 2 px sink →
  hold the breath through the beat and make the anticipation readable (4 cm). Then audit again: the pass must be on the
  current file.
- **Cloud lit like noise** → normals taken from the rough density → light from a smoothed density, stroke direction from
  the rough one.
- **Flower heads slid sideways in the gust** → spring output used as translation → bow: rotation ×1.5, dip ×2, less travel.
- **Petals like straw** → dry-brush breakup on every stroke → low `dry`, pointed taper.
- **Sunflower disc a square blob** → one giant stroke has a round head and a flat tail → build discs from dabs.
- **Jelly-bean people in three.js** → torso radius twice too big, hair sphere over the face → real widths, shoulder and
  hip bands, hair cap offset back.
- **Wrong diagnosis** → "flat end wall" was really empty sky; a scoreboard landed off frame → project the point before
  fixing; for a night match the fix was weather (drizzle, haze).
- **The tools themselves were wrong once** → seated people measured 5.5 heads (current height, not body length); a 60 px
  fan 60 m away cannot breathe 0.6 px; endpoints of a 2 s window can coincide with a breath → body length at depth,
  idle floor relative to size, max displacement inside the window.
- From the source: a model often misses things a person would fix in one pass and fixes them in a later round, so many
  rounds are partly that — write findings concretely so each round fixes more than one thing.
