# LOOK — the form, observed from the source demo

Source: Felix Rieseberg's "Lit Room" demo, https://claude.ai/artifact/D5pdvChFfvxBsvVNb5KNCJ, one of fifteen on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19.
Observed from its 512×320 thumbnail and by reading its HTML as reference. Nothing of its code, text, art or data is copied
here: this file records what it looked like and how it worked, so the skill could re-derive the technique.

## What you see
- A small, cosy room in the evening, in 3D: a wooden desk against a warm wall, a monitor on a stand, a keyboard, a mouse
  on a pad, a mug, a notebook and pen, books, a little plant, headphones, a framed print on the wall. The rest of the room
  (shelves, a bed, a window with curtains and the night outside, a rug, a door, a pendant lamp that is off) is there when
  you look around.
- Everything is procedural geometry with procedural materials: wood with grain and pores, floor planks with gaps,
  plaster, fabric threads, glazed ceramic, plastic, metal, leaves, key caps with printed legends.
- The monitor's picture is a live web page (dark, with a header of tabs and one big editable headline). The picture
  is the room's light: the thumbnail's page has a coral block behind the word "evening", and the wall and desk in front
  are washed coral-pink. The room is otherwise dark, so the screen sets the colour of everything.
- Film look: a filmic tone curve, gentle bloom on bright things, a vignette, a lens blur that keeps the monitor sharp, and
  a little grain. The exposure follows the page like an eye: a bright page darkens the rest.

## How it behaves
- Drag the room to look around (orbit about a point in front of the monitor, within limits so you stay inside the room);
  scroll to zoom; double-click goes close to the screen and back. It opens with a slow camera move that settles.
- The page is a real page you use in 3D: tabs switch screens; a "lamps" screen has coloured glows you drag around the
  page, and the room relights as you drag; a headline you type into; a CSS editor whose stylesheet is live, with presets
  that recolour a sign; a little looping "film" made of CSS animations, with play/pause and a scrubber.
- Typing on the page presses the matching keys of the 3D keyboard.
- Glossy things (desk varnish, the keyboard, the mug, the window glass) reflect the page, blurred by their roughness.

## Technique (as understood, re-derived in lib/lit-room.js)
- The page is a drawable child of the WebGL canvas, uploaded whenever it repaints, mip-mapped, and drawn on the screen
  quad. Its place for hit testing is the screen's projection, given to the browser as a `matrix3d` homography (or the
  canvas transform), so a click lands on the element drawn under the pointer.
- The demo baked its light offline: the screen was split into nodes and the light each node throws into the room was
  stored as light-map layers; at run time the page's mip colours weight the layers. This skill does the same idea at run
  time without baked data: the page's mips give a grid of cells (8 × 5), each cell is an area light evaluated per vertex
  on a finely tessellated room, plus a static soft shadow map from the screen and a per-vertex ambient-occlusion bake.
- Screen reflections: a ray from the surface against the screen plane, looked up in the page's linear mip chain at a
  level set by roughness and distance.
- Render on demand: nothing is drawn while nothing changes.
