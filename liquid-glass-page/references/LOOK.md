# The look, observed from the source

Source: Felix Rieseberg's "Liquid Glass" demo, https://claude.ai/artifact/CxxmVRwFgSmV9xB7XFsjbf, one of the fifteen demos on
the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk (shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19). Observed in headless Chromium with the
feature flag on, and read as reference only. No code, shader, text or data was copied; this skill re-derives the technique.

## Form
- One full-window page: an **optical test card** on blue graph paper. Left: a huge grotesque headline ("…under this water is
  real HTML", the last words in an accent italic serif), a lede, a text field with Splash and Wipe dry, and an acuity chart of
  live text from 28 px down to 5 px. Right: a plate (Siemens resolution star, colour patches, grey wedge, line pairs), an
  "optical bench" with sliders (refractive index with air / water / glass / diamond presets, dispersion, rain), switches (big
  drop, dark paper), accent swatches, and a read-out of focus and selection.
- The page sits under **water**: a few hundred beads in clusters, a few large irregular ones, and one **big drop** (≈ 14 % of
  the short side) resting on a word of the headline.

## Behaviour
- The page opens dry; a sheet of water runs down it and leaves the beads behind.
- Moving the pointer wets the page: a line of tiny beads that later gather and run; it also stirs faint ripples.
- A click makes ripples (a damped wave on a small float texture) and shakes nearby beads loose.
- Heavy beads slide down in stick-slip jerks, draw out into teardrops, leave little beads behind, merge when they touch,
  pool at the bottom edge and dry slowly.
- The big drop can be dragged; it lags, stretches along its motion, jiggles when grabbed, swallows the beads it passes, and
  magnifies what is under it. Its pull fades to nothing at its edge.
- Rain adds beads with small impact rings; Splash throws a burst from the button; Wipe dry shrinks everything away.
- Typing in the field wets the letters (ripples at the caret, the odd bead).
- Everything under the water stays selectable, focusable, typeable and findable.
- The page checks its own output (reads pixels back) and stops with a message if the graphics path is broken.

## Technique
- Three passes: ripples (height/velocity texture, fixed-rate steps, impulses as uniforms) → bead field (instanced quads,
  additive blend into a float texture: field, field×radius, gradient) → one glass pass.
- The glass pass turns the field into a cap-shaped surface, refracts the page texture with `refract()` at five
  wavelengths for dispersion, adds the ripple slope, shades a contact shadow and a caustic crescent, darkens the rim, and
  reflects a small procedural "studio" (a window toward the light, a sky) weighted by Fresnel. Dark paper switches to
  light-drawn water (lit rims, glow).
- The DOM is never moved: hit testing follows layout, so under the big drop a click lands on the layout position, not on the
  magnified picture. (This skill places the page through the lens instead; see LESSONS.)

## What this skill keeps and what it changes
Kept: the material (water on a live page), the interaction grammar (wet fingertip, click ripples, drag a magnifying drop,
splash / wipe, a bench of real controls), the three-pass technique. Changed: the page, the liquid and the weather are designed
per topic (any liquid: honey, oil, mercury, resin, new ones); the big drop is an exact lens that is also placed for hit
testing; beads are teardrops with lobes; absorption, body, scatter, metal and sheen make liquids other than water possible.
