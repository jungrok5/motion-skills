# Lessons — what went wrong and the fixes

From recreating a 14-shot "Claude Opus 5.5 · Plant cell" reel (AI-generated stills, a sci-fi HUD, 2 s per organelle) in code.

## Reading the reference
- **Facebook share links need a login**; a plain fetch returns an empty page. Ask for the file (a Google Drive link downloads with
  `drive.usercontent.google.com/download?id=…&export=download&confirm=t`), then `ffmpeg … tile=` contact sheets at 1 fps and crops
  of each panel at full size. Read the labels, the card text and the zoom figures from the crops; they become the shot table.
- The reference was a screen recording (phone UI around a 4:5 reel). Crop to the reel before measuring the layout.

## 2D first, then 3D
- **A 2D version (painted plates + Ken Burns + transitions through an overview) matches the reference's own technique** — its
  pictures were stills. It plays in real time and renders fast, but rotation is limited to simple solids (an orthographic prism).
- **"It rotates" needs real 3D.** Orbiting the open cell with organelles inside (parallax, perspective, walls passing in front)
  cannot be faked in 2D. The 3D version keeps the 2D kit for textures and the HUD and builds the specimen in three.js.

## 3D
- **A frame that is one flat colour = the camera is inside something** (a wall, the translucent vacuole). Compute the camera
  position from `t, d, az, el` for every shot and check it is in open space; aim from the side where there is room (golgi
  near the bottom wall: `az ≈ 170`, not `0`).
- **A translucent lining in front of a wall tints the whole close-up** (the plasma membrane turned the cell-wall shot pink). Keep
  linings at opacity ≈ .15 without depth writes.
- **Neighbour lids hide the specimen.** The rotating opening shot reads only when the closed cell stands alone; hide the neighbours
  and fade them (and the lid) in as the cell opens.
- **Flattening a tube with `geometry.scale(1, k, 1)` moves it** when its vertices are in world space; scale about its own centre.
- **Cut bodies as bowls** (lower part of an ellipsoid + inner wall + rim + floor) — cheaper and steadier than clipping planes, and
  their insides (grana, cristae, nucleolus) sit on the floor where a camera above sees them.
- **Close-ups need texture density**: 1024-px fibre maps with a bump map for walls; 512 is soft at 4 units.
- **Software WebGL is the bottleneck of a bake**: 1080×1920 with MSAA and bloom took ~13 s/frame on 4 cores, and more parallel
  workers than cores only made each slower. Render the 3D layer at 2/3 size (`?rs=0.67`, `createStage({ scale })`) and draw it
  up into the full-size frame; the HUD is drawn at full size afterwards, so text stays sharp.

## 2D painting (kit/specimen-zoom.js)
- Flat shapes read as 3D only with one light direction everywhere (top-left), an inner shadow for thickness, and a rim light.
- Grey noise laid over a colour with `source-atop` washes it out; mask the noise to the painted shape and blend with `overlay`.
- Plain cloud noise inside a liquid reads as sky; ridged noise (`1 − |2n − 1|`, raised to a power, slightly blurred) reads as caustics.
- A continuous zigzag reads as a neon sign, not cristae; folds reaching in from both walls like fingers, with a cast shadow, read as membrane.
- `render-chunked.sh` finds the length by matching `DURATION = <number>` in the page text; keep that line in a comment.
