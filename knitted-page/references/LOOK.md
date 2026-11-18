# LOOK — the "Knitted Page" demo, observed

Source: Felix Rieseberg's "Knitted Page" demo https://claude.ai/artifact/Y8uZf2xz48joUiM1nPhxLW, one of fifteen on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. Looked at in headless Chromium with
the CanvasDrawElement flag (screenshots in the session scratchpad, not committed) and by reading its page source as
reference only. Nothing of its code, text, fonts or art is used here.

## Form
- One full-window canvas. A card (cream ground, navy type, red accent) lies on a dark wooden table under a warm lamp at
  the upper left, with a soft vignette. The card is a live page: a two-line headline "This is a web page" (editable), a
  row of four colour swatches (radio buttons that swap the card's colourway), a slider with a small and a large "A" that
  sets the headline size, and an "UNRAVEL" button. Fair Isle bands (diamond and dot peeries) run along the top and bottom.
- Every element is laid out on a stitch grid (10 × 8 design px per stitch); the whole card is 120 × 80 stitches and zoomed
  to fit the window. Small lettering uses a pixel font designed to read at five stitch rows; the headline is a heavy
  rounded sans.
- Every stitch is a V of two yarn legs in one colour — the page's colour under that stitch — with twisted plies, fibre
  noise, fuzz, contact shadows between legs, a dark backing between columns, live loops along the top edge, a slight roll
  at the left and right edges, soft folds and hand-knit unevenness. The cloth casts a shadow on the table.
- A loose thread hangs off the top-right corner and lies in a lazy curve down the right margin.

## Behaviour
- Intro: the view starts zoomed in on knitting needles knitting the page up from about two thirds, while the headline
  types itself; the camera pulls back.
- Hover dents the cloth a little under the pointer. Typing re-knits the changed stitches row by row (bottom row first,
  alternating direction) with a strand feeding in from off-screen; the caret is a two-stitch-wide drawn block.
- Grabbing the thread and pulling unravels the knitting from the top row, stitch by stitch, back and forth across the
  rows; pulling further runs faster. The freed yarn piles up in a tangled heap (drawn as crinkled ribbons, coloured by the
  stitches it came from) at the lower right, over the cloth. "UNRAVEL" does a full automatic pull; the table shows bare
  for about a second, then needles knit the page back up from the bottom, the strand running from the heap.
- Letting go mid-pull knits it back. While unravelling the page takes no clicks; a "safety net" works a control when a
  press lands on nothing while the picture shows that control.
- Fallback for browsers without the feature: a poster/video page.

## Technique (re-derived here, not copied)
- WebGL2: the page uploaded as a texture on paint; a downsample pass to a cols × rows texture (one colour per stitch, with
  a two-colour majority split); CPU read-back to find changed stitches and schedule re-knits; a full-screen shader for the
  fabric (stitch field over three rows, height-based shading, shadows by re-evaluating heights toward the light), the wood
  and the needles; ribbons for loose yarn; a verlet rope for the thread; the scene cached and redrawn only when dirty.

## What this skill changes
- Legs are tilted cubic-profile "grains" (not swept curves); the cloth's shadow and contact shadows come from a separate
  height pass with mips; the stitch colour is the purest tap of the winning cluster, optionally snapped to the topic's
  yarns; a reveal layer (`#under`) lies under the knitting and is live when bare; the hand-pull speed comes from how far
  the hand is beyond the cloth; four tables; steel or bamboo needles; system fonts only (type sized for stitches instead of
  a pixel font); poses for stills; synthesised sound.
