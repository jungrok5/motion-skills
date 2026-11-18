# LOOK — what the source demo was (observed)

Source: Felix Rieseberg's "Droste" demo, https://claude.ai/artifact/RjZStie469yP8BUZGKAiUY, one of the fifteen on
https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk (post: https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19).
Opened in headless Chromium with the HTML-in-Canvas flag and read as reference only. Nothing below is copied into this
skill; it is what the skill keeps as a *form*.

## Form
- A full-screen wall of off-white tin-glazed tiles, each hand-painted in one cobalt blue (ships, flowers, windmills,
  birds; drawn procedurally on a 2D canvas, corner ornaments joining across tiles), two larger tile pictures spanning
  2×3 tiles (a vase of flowers, a harbour).
- In the middle a framed picture: a dark rippled moulding with a gilt inner slip, a brass picture lamp above it, a
  brass plaque "Nº 1" under it. The picture is the wall itself, recursively, down to a point of warm light.
- Long text slabs set into the tile grid: a painted legend "Type over me. Every copy changes." (editable, Enter blocked,
  shrinks to fit), a slider "Wind the wall", a line "Scroll to fall in", a small brass "What is this?" tile.

## Behaviour
- Opens wound (two turns) and falling in, then comes to rest a quarter copy out; the legend types itself, then the
  browser's own selection sweeps over its first words in every copy at once.
- Wheel / arrows / PageUp-Down fall through copies, eased; endless both ways (the plaque counts up, and below 0).
- The slider winds from 0 (plain nesting) to 2 (double spiral); whole turns are sticky; in between a seam opens along the
  log's cut and is drawn as a raised gold mend (kintsugi), with a soft "heal" tone when it closes.
- Clicking a tile at any depth repaints it with a new motif, in every copy, with a gold ring spreading across the wall
  and a pitched "tink" (higher the deeper you clicked). Until someone acts, a tile repaints itself every few seconds.
- Each copy hangs in a different hour (noon, golden hour, dusk, night under the picture lamp, first light) cycling with
  depth and continuously round the spiral; window light falls aslant across the wall in six panes.
- The upload is sharp (larger than the screen) when the page is quiet and screen-sized while it changes many times a
  second. Sounds: plate modes of a tile, a pass whoosh, a bowl tone; a small tiled room reverb.

## Technique
- One drawable DOM page = the canvas size. The frame's opening is the page scaled by 1/S (S = 2.2) about a fixed point F;
  F follows from the opening's position: F = opening.topLeft / (1 − 1/S).
- Fragment shader: q = screen − F → (ln r, θ) → multiply by α = 1 − i·wind·ln S/2π, subtract frac(fall)·ln S → exp →
  divide/multiply by S until the point is on the page but not in the opening; that count is the copy's level.
- Texture LOD is computed from the map's local scale (not from derivatives, which break at copy boundaries).
- Hit testing: at the pointer the map is a rotation + scale; the page element gets that matrix (CSS transform, or
  `updateElementGeometry`), so the browser routes clicks and caret placement correctly at any depth.
- The plaque number is composed per copy in the shader from a strip of real digits kept inside the opening (never seen).
- Materials are all shader work over the DOM's colours: glaze tint per tile, pillow bevel, crazing, chipped corners,
  grout; the moulding is a lit profile; the frame casts a shadow; copies sit in shadow behind their frame.
