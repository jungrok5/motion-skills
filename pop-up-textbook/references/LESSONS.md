# Lessons

Problems met while building the two examples, and the fixes. Problem → cause → fix.

- **Every lit surface of the diorama was hatched** → the ink shader compares the light arriving at a fragment with
  `inkLit`, which was set for a brighter lamp → calibrate `inkLit` to the irradiance of a lit, up-facing surface (1.0 with
  the default lights); hatch only below ~0.5 of it, cross-hatch below ~0.26.
- **The wall facing the reader was solid hatching** → the desk lamp is behind the book, so front faces only got hemisphere
  light → a front fill light from the reader's side (1.25) keeps them in light hatching; shadows still hatch.
- **The loupe showed a dark smear** → a `ShaderMaterial` sampling an sRGB render target outputs linear values →
  end the loupe fragment shader with `#include <colorspace_fragment>`.
- **The loupe looked at the wrong spot** → tour targets aimed at the left part of a region → aim at the region centre
  (options keep a point near their tick box).
- **A real click on the switch did nothing (the tour's click worked)** → the target was the centre of the part's bounding
  box, which for an open knife switch is in the air, and a wire passing over the switch was hit first → aim low in the
  box (30 % up), and let a clickable part anywhere along the ray win over props in front of it.
- **The lifted flap covered the question it answers** → hinged on its top edge it leaned back over the options → hinge it
  on its lower edge; at 123° it points at the camera and almost vanishes, leaving the printed answer visible.
- **On a phone the book was tiny and nearly black** → a fixed fog range swallowed the far camera; the spread was
  width-limited → fog starts 2.2 units behind the camera's target distance; portrait views look down at ≥ 74°.
- **`D.text` lettering used a fallback font** → dioramas were built before the web fonts loaded → build dioramas in
  `start()` after `document.fonts.load(...)`.
- **The cut-away plug was too small to read** → life-size against a 21 cm page → draw the socket and plug 1.4× and say
  "not to scale" where it matters; scale the parts' frames, not each mesh.
- **The Earth's terminator faced the desk lamp, not the Sun** → ink shading used the scene lights → `D.ink(c, { sun })`
  shades from the Sun object (or a sunlight direction) in world space.
- **Hull outline shader failed to compile on `MeshBasicMaterial`** → `objectNormal` is only defined there with env maps or
  skinning → push vertices along the `normal` attribute.
- **Tubes made from a curve were rejected** → `CatmullRomCurve3` has no `isCurve` flag in r170 → detect curves by
  `getPointAt`.
