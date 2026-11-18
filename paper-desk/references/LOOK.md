# LOOK — what the source demo is

Observed from Felix Rieseberg's "The Paper Desk" demo (https://claude.ai/artifact/BKGBk584YpYtxBebEQsYSm), one of the
fifteen on the HTML-in-Canvas demo page (https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk), shared in
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. Opened in headless Chromium with
`--enable-blink-features=CanvasDrawElement`; read as reference only. This skill re-derives the technique in its own code.

## Form
- One full-bleed WebGL scene: an A4-proportioned sheet of paper lying on a dark green baize desk, seen from about 15° off
  vertical, filling most of the height. A strong vignette; the room beyond the desk falls into black.
- The sheet is a live HTML document: a header line with a ticking clock, a big italic editable title that types itself in
  at load, a formatting bar (bold, italic, underline, highlight), an editable notes block, a "Desk controls" form (lamp
  checkbox, paper select — white wove, cream laid, kraft, blue airmail — a weight slider in g/m², four ink swatches, a
  signature field), a small `<video>` figure with play/pause, a "Field test" checklist of things to try, and a rotated red
  rubber stamp. Everything on it is real: it can be clicked, typed, selected, made bold, found with ⌘F.
- A floating dock at the bottom (Type, Curl, Fold, Crumple, Burn | Flatten, Fresh sheet), a hint line above it, Sound and
  "What is this?" chips at the top right.

## Behaviour
- **Idle:** after a moment the bottom-right corner lifts and breathes; hovering a corner lifts it; dragging a corner in
  Type mode curls it.
- **Curl:** the sheet peels over a cylinder that follows the pointer; the back of the paper (with the ink faintly through)
  shows; let go and it springs back.
- **Fold:** the same peel with a crease-sized radius; on release the flap stays over, springs open a few degrees, and a
  crease line stays on the paper. Up to five folds. Flatten unfolds them one by one.
- **Crumple:** press and hold; the sheet gathers onto a faceted ball around the grab point, with a soft contact shadow;
  let go and it opens again, wrinkled, with sharp facet creases.
- **Burn:** a click lights a burn front that eats outward along noise: a toasted band, brown, char, a flickering glowing
  rim and a hole through which the desk shows. Embers rise. The fire lights the desk and the paper (most visible with
  the lamp off). Typing keeps working while it burns.
- **Lamp:** a warm desk lamp from the upper left with soft shadows; switched off, the room goes dark and only the fire lights it.
- **Paper stock** changes the paper's colour and laid lines; **weight** changes how stiff the curl is.
- **Sound:** synthesised rustle, crease snaps, crackle and fire.

## Technique (as understood)
- The sheet element is uploaded as a texture on paint and multiplied onto a paper albedo (white becomes the stock).
- The paper is a dense CPU grid deformed every change: rest bow, cylinder wraps for curl and folds, a ball wrap with a
  piecewise-linear facet height field for crumple, noise-driven burn front shared by CPU and shader through one noise
  texture sampled identically on both.
- Lighting: lamp point light with a cone, PCF shadow map, a top-down coverage pass as contact shadow, fire point lights,
  HDR + bloom + filmic tone map.
- Hit testing: while flat, one homography (matrix3d) maps the element onto the drawn plane; while bent, the element is
  placed with the affine of the triangle under the pointer, re-picked on every move; burned holes and the back side are
  not hittable.

## Kept, and what is new here
Kept: the idea (a live document as physical paper), the interaction grammar (tool dock, corner curl from Type, hold to
crumple, click to burn, Flatten / Fresh sheet), the rendering approach. Not kept: its code, shaders, text, layout, video
figure, stamp, colours. New in this skill: everything is driven by a topic (document, stock, desk surface — felt, wood,
leather, laminate — props from a kit or made in the page, lamp colour, which acts exist and their wording), a stain act,
lit candles as lights, `#still` / `#act=` staging for stills and checks, and a check script with numbers.
