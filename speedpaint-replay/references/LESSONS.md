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
