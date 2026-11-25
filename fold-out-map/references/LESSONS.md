# Lessons

Problems met while building the skill and the Busan example — problem → cause → fix.

- **The source painted its landmarks with an image model.** → Generated images are references, never committed assets,
  and a skill that needs a paid model each time is not reusable. → Every pop-up is drawn in code with the card kit; the
  skill is code-only.
- **Opening the accordion from the bottom crease lifted the sheet 0.6 units off the desk.** → With panel 0 on the desk,
  the stack's panels hang on the back side of panel 1 and swing below the desk unless the outer creases open first. →
  `unfold({ order: 'out' })`: the last crease (top of the stack) opens first; the engine also lifts the sheet by its
  lowest corner so nothing ever goes through the desk. Verified in Node before rendering (fold math only).
- **A dark line opened across the map along the cross fold.** → The cross fold turns about the height of the folded
  stack; once flat, a residual angle about that raised axis left a gap. → The hinge sinks to the paper as the fold opens.
- **Stacked panels z-fought, and box bodies interpenetrated on the second fold.** → Folds in alternating directions
  need different offsets (one lands on a face, the next on a back, a paper thickness further). → Hinge offset `GAP/2` for
  folds onto the face and `TAU + GAP/2` for folds onto the back.
- **Pop-ups lying flat cluttered the folded leaflet and the overview with white shards.** → They were parented to their
  panels from the start. → Hidden until the route reaches them, then they grow out of the paper as they spring up.
- **`F.camera(...)` was not a function.** → The film's three.js camera is `F.camera`. → Camera keys are `F.track(...)`.
- **The red route never showed — only its head dot.** → The ribbon's triangles were wound facing down (culled); drawn
  double-sided it showed but dark (lit from below). → Winding fixed to face up.
- **Labels ran off the 9:16 frame at every stop.** → A label as wide as its pop-up and the camera 1.35 away: the frame
  is only 0.34 × distance wide. → Labels 0.25 wide at 0.5 × the card's width to the side, the camera 2.3–2.8 away, aim
  45 % toward the label; `check.mjs` measures it (both in frame, label ≥ 7 % of the width tall).
- **The subject sat high with empty map in front.** → In portrait the target lands mid-frame. → Aim 0.14 behind the stop.
- **The camera at a stop near the sheet edge looked back across the desk.** → Its yaw pointed from outside the sheet. →
  Choose yaws that look across open map (sea, plain); the brief says so.
- **Between two stops seen from opposite sides, and on the closing rise, pop-ups showed as edge-on shards and dark
  backs.** → Cards face their own cameras; a camera between yaws 38 and 148 sees them side-on. → Keep consecutive yaws
  within ~90°; turn the closing shot toward the yaws most cards face.
- **The near label was a blurred blue block.** → Plane-based depth of field was strong at a close camera. → Aperture
  `0.45 × 2.3 / dist`, plane at the target's height; labels lit faintly at night by their lamp.
- **Small lamps and people became blobs at night.** → The die-cut border dilates every thin detail. → `border: 1` on
  cards with fine details above the main mass.
- **A card's ground strip covered the rocks below it.** → `ground()` filled to the card's bottom. → `ground(..., { depth })`.
- **Golden hour turned the paper muddy.** → A low sun grazes a flat sheet. → Golden keeps a higher sun (0.68) and a
  strong hemisphere fill (0.88).
