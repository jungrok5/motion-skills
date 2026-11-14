# LESSONS — problems met building this skill and its first pieces (problem → cause → fix)

- **A neck shadow darkened the chin; hair shadows lay across the face.** Clips used the whole region, and the neck
  and the back hair run *behind* the face. → Clips use the visible part of a region: its shapes minus every flat
  painted above them, as a cached mask per clip (`Replay._mask`). A flat clipped to a region (iris → eye white) counts
  as part of it, or catchlights vanish over the iris.
- **The whole hair mass flashed in for one frame when its flat started.** At progress 0 the brush mask was a
  zero-length stroke; the browser skips it, so `destination-in` never ran and the full region showed. → Return before
  painting when the brush has not moved (`fillVia`). check.mjs now compares the first frame of every fill with the
  frame before ("no fill pops in").
- **The irises sat off the eyes after the picture was scaled.** The eye helper cleared the transform stack while
  drawing the iris, so iris points stayed in local units. → Helpers transform every point they add (`this.pt`, or
  regions with `raw` that still pass through `tf`); gradients get transformed ends too.
- **A pink band ran diagonally across the face.** First blamed on a shadow, it was the window glow: a polygon with a
  gradient whose edge was not yet transparent. → A full-canvas glow covers the whole square; the falloff lives in the
  gradient. (The real bruise-coloured shadows were the visible-area bug above.)
- **Shadows looked like bruises.** A saturated multiply colour (`#e2a9a6` on `#f7dfcf`) goes red-brown. → Light, slightly
  pink or cool shadow colours (`#efc4c4`), crisp edges (blur 1–2) on skin.
- **The bangs read as a straight band with spikes, then as a scalloped curtain.** A smoothed base flat bottom made
  scallops; a raw jagged one looked geometric; one at lock-tip height hid the locks. → A bangs base with a smooth lower
  edge *above* the lock tips, and the locks (z 50) make the jagged edge. Thin locks between big ones.
- **The hair sheen looked like a crown, then like a porcupine.** One zig-zag polygon was too regular; thirty bright
  strands were too many. → About twenty short `lens` strands along the head's curve, brighter on the key side, over a
  soft `edge` band.
- **The figure sat small in the frame with a long neck.** The first layout copied a "whole bust" proportion. → One
  `FRAME` transform (1.22× about the face) for the whole picture, and the body moved up (`BODY = { dy: -36 }`).
  Transforms in `push` make such changes one line.
- **The stylus flew off the card.** Window lines and arm lines started outside the 1000 × 1000 picture after the
  framing transform; big background flats swept the brush beyond it. → Lines start at the picture edge (work out the
  pre-transform coordinate); the brush path is clamped to the picture; check.mjs fails a stylus off the card.
- **The flats stage opened with two white eyes on a dark wall.** Eye flats were added during the line art and the wall
  came early. → Time order within a stage is separate from z: eyes default to `order: 900` (after the skin), lock flats
  take `flatOrder`, and the background takes `order: 2000` (painted last).
- **Thin rib strokes were reported as leaving no mark.** The item check sampled every 4th pixel at quarter scale. →
  Sample every pixel with a low alpha threshold.
- **Self-review against the source: "the format matches, the picture does not".** Side by side with the post, the
  first example had ~90 clean lines against the source's dense, broken, hatched ink, flat cel colour against painted
  light, and a small centred figure against a tight dramatic crop. → Denser hair (`strands`, `fly`, `passes`),
  `hatch`, light-direction `shade` per material, a crisp terminator across the face, a 1.5× crop, and reference mode
  for when the user has a picture of their own.
- **Raindrop specks on the face read as a rash, on the sweater as stains.** Light through wet glass is a lovely idea,
  but at this size dark specks on skin look like blemishes. → Keep specks off faces and plain cloth; put rain on the
  glass.
- **Reference mode: every region came out empty.** Douglas–Peucker on a closed loop has identical endpoints, so every
  distance was zero and only two points survived. → Split the loop at the point farthest from the start, simplify
  each half (`dpClosed`).
- **Reference mode: white seams between all regions, then fat white outlines.** Outlines traced through pixel centres
  leave half a pixel of paper between neighbours. Growing them with the wrong winding sign shrank them instead. →
  Grow outward by 1.8 units with the sign from the polygon's signed area, and check a stage still with the seams in mind.
- **Reference mode: the line art was dashes.** Thinning splits lines at every junction. → Join fragments whose ends
  meet within 3 px and continue straight on, and drop weak lines (darkness under 22 % of the strongest).
- **Reference mode with 633 regions: big flats switched on in a frame or two.** Every fill had a 0.12 s base time, so
  hundreds of tiny regions ate the stage and the big ones got 1–2 frames. → Fill time ∝ brush travel + area with a tiny
  constant, and every region over 3 % of the picture gets at least 5 frames (taken from the items above their floor).
- **The pop check cried wolf on dense pieces.** It compared whole frames, so many tiny fills finishing in one frame
  looked like one region popping. → Each fill over 4 % of the picture is drawn alone at the progress it has on its
  first frame; more than half of it showing is a pop.
- **A 43 s reference piece took 46 minutes to render.** Every frame redrew every item (2.15 s a frame). → Layer caches:
  PAINT, INK and ROUGH each keep a canvas of their finished items and a frame draws only what is in progress. A cache
  is extended when the new items sit above everything in it and rebuilt in paint order otherwise, so a frame never
  depends on the frames before it. The page chrome is cached per stage, a live fill keeps its blurred, masked image,
  static frames are skipped, frames go to the encoder as JPEG q97. 47 s film: 120 s → 30 s; reference piece: 46 min → 33 s.
- **A live item under finished ones forced a full redraw every frame.** The eye helper gives its lid shadow z 50, so
  during the whole shadow stage "everything on top" was false (116 ms a frame). → Bake only the finished items below
  the lowest live one; draw the live item and the few finished ones above it.
- **Owner's verdict on reference mode v1: "it just stamps pixels; the source draws like a person".** It posterised the
  picture into 633 patches, 906 tone patches and 4,246 dabs and drew 721 dashes in nearest order. → Rebuilt around the
  painter's process (REFERENCE.md): construction from the agent's plan, ink strokes with measured widths in focus
  order, one flat per material, tone shapes, airbrush blending, detail strokes, colour trace. When a mode imitates a
  process, check the *process* against the source, not the final frame.
- **"Bucket fill inside the lines" found one cell covering 99 % of the picture.** Soft, open line art encloses
  nothing. → Materials come from the agent's rough lassos; the tool snaps the edge by colour (nearest material palette
  plus a penalty outside the lasso). The agent supplies meaning, the tool supplies precision.
- **A lasso that contains other materials poisoned its own colour model.** The hair lasso holds the face, shirt and
  blazer. → A material's palette comes from the plan's sample points, or from what lies in its lasso and no other.
- **Ink strokes came out fat.** The detection mask is a generous net around a soft line. → Width = distance to where
  the line falls under half its own local darkness (full width at half maximum), smoothed along the stroke.
- **Closed-loop outlines with holes.** Outlines now run along pixel edges (crack following, region on the left), so
  holes come out as loops of opposite winding and neighbours share exactly the same boundary.
- **A blush was painted as a hard patch.** One tone colour held a crisp cast shadow and a soft blush. → Tone shapes are
  split by connected shape and each shape's edge width is measured (colour step ÷ gradient at 3 px blur): hard shapes
  stay crisp, soft ones are laid with a blurred brush clipped to the material.
- **A light-against-dark edge is not a line.** The line detector finds thin dark structures, so a jaw against a scarf,
  black hair against the sky and a coat's silhouette had no outline at all. → Contour strokes: the boundary between
  two materials becomes an ink stroke unless a drawn line already covers 80 % of it; in the colour trace it takes
  the darker side's colour.
- **A third of the ink went into a blurred background.** Lamp, foliage and bokeh are full of thin dark specks. →
  Strokes whose middle lies outside every lasso rank at 12 %.
- **Does a larger reference ink better? Yes.** The 2048 px sample (reference-ginkgo) gives long clean strokes on the
  coat, glasses and face where the 720 px one broke into dashes. Lit, wispy edges still break up.
