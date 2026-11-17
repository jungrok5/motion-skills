# LESSONS — what broke and the fix

Problem → cause → fix, one or two lines each. Add yours.

- **The front face of the funnel showed the wheelhouse windows.** → The front view's colours were applied to every face
  pointing forward, at any depth. → A view colours only the first voxel its ray hits; deeper faces take the side view's
  colour at that (x, z).
- **A mast turned into a 2 × 6 slab on the roof.** → Visual hull: the front view's row at that height also held the funnel
  top, so the mast's columns got the funnel's width. → Keep thin parts out of rows they share with a wider part in the
  front view (the funnel ends at z = 14, the mast starts at 15), or cut with `edit`. Say it in the brief ("thin parts").
- **`check.mjs` said 4 % of the front view carved to nothing.** → The back view had no pixels where the raised bow rail shows
  past the wheelhouse; the intersection removed the rail. → Draw what each view really sees, including parts far behind
  that stick out at the sides. The lost-pixel number points at the first bad column / row.
- **The top-view orientation test failed on a correct drawing.** → Colour sets overlap in meaning (the funnel top and a roof
  hatch shared a dark grey that only the front view used). → Orientation is tested on the side view only (its ends are the
  bow and the stern); a flipped top view shows up as lost pixels instead.
- **The newest slice of the growing stack looked black.** → Hidden voxels took the side view's outline colour for their top
  face. → Every voxel keeps its top-view colour for its top face, and the slice on top of a partial stack is drawn with its
  top faces open (`cap`): the slice shows the top view masked by that row, like the source.
- **Explainer beats came out tiny (zoom 1).** → The auto zoom measured the stack as `H·(1+spread) + 2R` against 62 % of the
  height. → Measure `H·(1+spread) + 1.2R` against 72 %; the turntable then lands at ×3–×4.
- **The lighthouse was never in frame.** → The course ran 110–160 px from the island; at zoom 2 the frame is 240 × 135 world
  px. → Keep the course within ~80–100 px of what the world is about, and look at the world beats' stills.
- **The views beat opened on an empty page (a blank frame).** → The first view started drawing at 10 % of the beat. → The
  first view is already a third drawn at the beat's start.
- **A pixel arrow under a 10-px view overlapped its label at ×6.** → Art-pixel decorations scale with the zoom. → Labels and
  their arrows are drawn at full resolution in the text pass, offset in output pixels.
