# PERF — where the time goes and how the frame is kept

The page was built and checked on a machine with no GPU (Chromium's CPU rasteriser), so **frame rates on real GPUs are
not measured here**. What is measured is what can be counted: draw calls, triangles, passes and buffer sizes. What
follows is the design that keeps those in hand, and the knobs to turn if a device struggles.

## The frame
| pass | size | what it costs |
|---|---|---|
| shadow atlas | 1–4 k × cascades | geometry only; **staggered**: cascade 0 every frame, 1 every 2nd, 2 every 4th → about 1.75 cascade renders per frame instead of 3; trees use their middle level of detail; grass never casts |
| G-buffer | internal | 3 × RGBA8 + depth24; every surface opaque (no sorting, no blending); alpha-tested foliage dithered for TAA |
| ambient occlusion | ½ | 2 slices × 3–4 steps of horizon search + a depth-aware blur; off on `low` |
| air | ½ | 8–24 fog steps, one shadow tap each; the far part is a closed form |
| lighting | internal | one full-screen pass: sun with 4–8 PCF taps, sky and bounce from an octahedral environment map, up to 24 lamps in a loop with a range test |
| see-through | internal | water (one mesh), then particles — each kind is **one draw**, positions computed in the vertex shader from time (nothing simulated, nothing uploaded) |
| temporal resolve | canvas | reprojects, clips to the neighbourhood, and **upsamples** the internal picture to the canvas grid |
| bloom, adapt, grade | canvas → small | dual-filter chain, 4–6 levels |

## What keeps it fast
- **Internal resolution is separate from the canvas.** The world is rendered at 50–100 % of the canvas size and
  resolved temporally to full size; a governor (`lib/88_hud.js`) watches the frame rate twice a second and moves the
  scale in 0.1 steps between the tier's limits, probing upward with back-off. History stays at canvas size, so a change
  of scale does not flash.
- **Tiers** (`lib/10_gpu.js`): `low` (phones), `medium` (integrated GPUs), `high`, `ultra` set material size, shadow
  size and cascades, occlusion quality, fog steps, grass density and reach, tree detail distances, particle counts,
  lamp count, the steps of the water's reflection march (`ssr`: 0 on `low`, 12 / 18 / 26 above — only water pixels pay
  for it), device-pixel-ratio cap. The tier is guessed from the device and can be forced with `?q=` or the gear
  button (reloads at the same spot); a device far below its tier is stepped down once automatically.
- **Materials are two texture arrays.** Every built thing is drawn by one shader with a layer index per vertex, so a
  whole house — stone, plaster, timber, tiles, glass, iron — is **one draw call**.
- **Culling.** Buildings are one mesh each; props are batched per 48 m cell; the land is chunked in rings (1 m, 2 m,
  8 m, 64 m) stitched without cracks; trees are culled and given a level of detail per instance on the CPU each frame;
  grass is drawn in tiles that are culled against the view.
- **Stateless motion.** Wind, rain, snow, smoke, flames, fireflies, birds, leaves, motes and fountain water are closed
  forms of time in vertex shaders: zero CPU per particle, zero buffer uploads per frame.
- **The sky is a table.** Scattering is integrated into a 256 × 128 texture only when the sun or the air changes; the
  environment map (128², mip-mapped) is refreshed a few times a second.
- **Weather is a few uniforms.** Wetness, puddles, snow and season are applied where surfaces write the G-buffer; the
  only extra texture is the top-down rain map, rendered once at load.

## If it is slow
1. Look at the numbers: `P` on the page, or `realm.info()` in the console: fps, internal size, draw calls, triangles.
2. `?off=` switches parts off to find the cost: `ao`, `shadow`, `bloom`, `taa`, `grass`, `fx`, `water`, `audio`
   (and whatever the plant kits honour). `?scale=0.5` pins the internal scale; `?q=low|medium|high|ultra` pins the tier.
3. Usual causes, in order: too many grass triangles in view (lower `tier.grass` / `grassDist`), too many full-detail
   trees near the eye (thin the planting near ways, lower `treeNear`), a view down a long street with every building
   in it (accept it, or bend the street), too many lamps in range (the loop is per pixel: keep `tier.lights` modest).
4. Budgets `check.mjs` warns about, per view on `medium`: 520 draw calls into the G-buffer, 4.2 M triangles.

## Loading
The page compiles about sixty shader programs (one per material for the bake, then the engine's) and bakes its
textures before the first frame. On a real GPU the bake itself is milliseconds; **shader compilation** is what takes
the time — a few seconds on most systems, longer the first time on Windows (the driver caches compiled programs, so a
second visit is quick). The veil shows which step it is on; nothing else can be done about it short of shipping baked
textures, which is what this skill avoids.

## What is not done
- No occlusion culling (a house does not hide the houses behind it), no screen-space reflections, no GPU-driven
  culling, no compressed textures (materials are baked at load, uncompressed: about 70 MB at 512², 270 MB at 1024²).
- No moving shadow-casting lights other than the sun and the moon; lamps do not cast shadows.
