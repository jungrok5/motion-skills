# LOOK — the form, observed from the source demo

Source: Felix Rieseberg's "Ink" demo (https://claude.ai/artifact/WEmmb18oUbyCSkYyB1JMiB), one of the fifteen on the
HTML-in-Canvas demo page (https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk), shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. Observed in headless Chromium with the
`CanvasDrawElement` flag, and from its 512×320 thumbnail. Nothing of its code, text or art is reused here.

## What it looked like
- **One printed sheet, filling the window.** A pale grey-green paper, a giant black-weight serif headline top left in
  Prussian blue, a large saturated yellow disc overprinting the headline (inside the disc the letters print again in a
  mixed colour), two smaller multiply discs (rose, viridian), a short paragraph, a numbered checklist of things to try, a
  vertical strip of ink "drawdowns" (a full band over two thinned bands) as the palette, and a ruled footer: a headline
  text field, a ruled thin↔thick gauge with a needle, and a Settle button.
- **Printer's vocabulary.** Monospace small caps for labels, pigment names (Prussian blue, rose madder, viridian, burnt
  sienna, lamp black), a proof-sheet feeling. Paper grain and faint fibres everywhere.
- **Stirred**, the print behaves like floated ink: letters are dragged into long tapering ribbons and hooks, solid discs
  are pulled into crescents and tongues, small print stretches into soft streaks, and wide stretched ink shows paler
  lines (rifts) running with the flow. Pigment laid by the comb sits on top as crisp ribbons with fine parallel threads,
  pushing a pale halo into what it crosses; floated colours do not mix.

## How it behaved
- **Drag** across the sheet: the bath under the pointer follows the hand and keeps coasting a little after release, then
  settles; the faster the hand, the fatter the ribbon of pigment, swelling from a point and tailing off.
- **Press without dragging**: a round drop of pigment (concentric bands) appears.
- **Hover** (no button) stirs very gently, "a hand passing over the water".
- **Type** into the field while it moves: the headline changes and the change is carried with the warp.
- **Click** a colour, the gauge or Settle wherever they have drifted: hit testing follows the drawing.
- **Esc / Settle**: everything flows back to its place — the stir is played backwards as a film; the pigment fades out at
  the end.
- **Idle**: after a moment the page demonstrates itself with a ghost comb (a ring at its tip): strokes, a typed
  headline, a colour change, a settle; then it puts back what it changed. Left stirred, it settles itself after a while.
- **Thin ↔ thick** changes how far a stroke carries and how long it coasts.

## Technique (re-derived, not copied)
- A small stable-fluids velocity field (splat along the pointer segment → semi-Lagrangian advection with damping →
  divergence → Jacobi pressure → gradient subtract).
- A float **displacement map** advected by that velocity (backward map: `m'(x) = m(x − v dt) − v dt`); the page texture
  is sampled at `uv + m(uv)`. The map's Jacobian (singular values) tells how stretched each spot is, which drives texture
  LOD, thinning, rifts and the treatment of solid shapes.
- Print converted to absorbance against the paper colour and back (`paper · exp(−A)`), so effects act like ink.
- **Pigment through the map**: a small mesh around the stroke, displaced by the map in the vertex shader, writes a
  distance-like ramp into float textures on the sheet; thresholded with `fwidth` it stays sharp under any pull.
- **Film of map snapshots**, small float textures recorded every few steps, played backwards with smooth upsampling.
- **Hit testing**: a small copy of the map read back to the CPU without stalling (PBO + fence); the page is placed with
  the map's local affine at the pointer; a press that lands during the frame-late placement is redirected by hand.

## What this skill keeps and what it changes
Kept: the material (wet floated ink on paper), the interaction grammar (drag = stir with coast, press = drop, type while
it moves, click what you see, Esc plays it back, idle demo with a ghost comb, thin/thick), the rendering technique family.
Changed / added: everything is designed per topic (content, palette, paper, pigment names, controls' wording); a comb with
1–8 **tines** (stylus, comb, whisk); **drops that bloom** with an area-preserving push (the print opens round them, a
bullseye with `rings`); opaque pigments (`cover`, so milk or white works on a light paper); colour seams between
pigments; a wet **sheen** while moving; Shift-drag selects text; synthesised sound; deterministic `#still=<t>` stills
of the idle demo; scripted acts for stills; a test hook with numbers.
