# PERF — where the time goes and how the frame is kept

The page was built and checked on a machine with no GPU (Chromium's CPU rasteriser), so **frame rates on real GPUs are
not measured here**. What is measured is what can be counted: draw calls, triangles, passes and buffer sizes. What
follows is the design that keeps those in hand, and the knobs to turn if a device struggles.

## The frame
| pass | size | what it costs |
|---|---|---|
| shadow atlas | 1–4 k × cascades | geometry only (it also writes its depth in two bytes of colour, which is what the soft shadow reads); **staggered**: cascade 0 every frame, 1 every 2nd, 2 every 4th → about 1.75 cascade renders per frame instead of 3; trees use their middle level of detail; grass never casts |
| G-buffer | internal | 3 × RGBA8 + depth24; every surface opaque (no sorting, no blending); alpha-tested foliage dithered for TAA |
| ambient occlusion | ½ | 2 slices × 3–4 steps of horizon search + a depth-aware blur; off on `low` |
| air | ½ | 8–24 fog steps, one shadow tap each; the far part is a closed form |
| lighting | internal | one full-screen pass: the sun's shadow **widens with the distance to what throws it** (6 depth taps to find that distance, then 8–16 compare taps on a disc that grows with it — `medium` and above; 4 fixed taps on `low`), sky and bounce from an octahedral environment map, up to 24 lamps in a loop with a range test |
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
  for it), contact shadows (`contact`: 8 steps on `high`, 12 on `ultra`, off below), the screen-space bounce (`gi`: 2 rays of
  8 steps per half-size pixel on `medium`, 3 on `high`, 5 on `ultra`, off on `low`), sky share from the height map of
  built things (8–16 taps on lit pixels within 90 m; `?off=skyshare`), the mirror on wet ground (14–20 steps, only on
  smooth pixels, `high` and above), rays toward the sun (20–36 depth taps at half size, `medium` and above), device-pixel-ratio cap. The tier is guessed from the device and can be forced with `?q=` or the gear
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
0. What the look costs on `high` and above, all per pixel and all switchable: relief on stone and paving within 24 m
   (eight height taps, `?off=` has no switch — lower the tier), contact shadows (`?off=contact`, 8–12 depth taps on lit
   pixels), the bounce (`?off=gi`, half size: ~24 depth taps and a blur), the mirror on wet
   ground (`?off=mirror`; it costs in rain, when most of the ground is smooth), rays toward the sun (`?off=shafts`), the water's reflection march (`?off=ssr`). `medium` has none of the three except the reflection.
1. Look at the numbers: `P` on the page, or `realm.info()` in the console: fps, internal size, draw calls, triangles.
2. `?off=` switches parts off to find the cost: `ao`, `shadow`, `bloom`, `taa`, `grass`, `fx`, `water`, `audio`
   (and whatever the plant kits honour). `?scale=0.5` pins the internal scale; `?q=low|medium|high|ultra` pins the tier.
3. Usual causes, in order: too many grass triangles in view (lower `tier.grass` / `grassDist`), too many full-detail
   trees near the eye (thin the planting near ways, lower `treeNear`), a view down a long street with every building
   in it (accept it, or bend the street), too many lamps in range (the loop is per pixel: keep `tier.lights` modest).
4. Budgets `check.mjs` warns about, per view on `medium`: 520 draw calls into the G-buffer, 4.2 M triangles.
5. `?prof=1` says which pass it is (below); `?off=pcss` goes back to the fixed shadow filter.

## Loading
The page compiles about sixty shader programs, bakes its material layers and builds the place before the first frame.
**It does not wait for the scans** (120 MB for the village, 33 MB for the starter — JPEGs and geometry, once; the
browser caches them):
- every surface is baked from its generated recipe at once, and the walk begins; each scan then takes its layer as its
  maps arrive (four fetched ahead, each freed after its layer), and the credit line counts them in;
- every model is placed from the box `fetch-assets.mjs` measured — stood in for props, bumped into — and is drawn
  from the frame its triangles and maps arrive, three models at a time. On arrival its maps are re-baked (two small
  passes) and its levels of detail are made (meshoptimizer, a few to a few tens of milliseconds a model: the one thing
  that can cost a frame while you walk);
- only the foliage atlases (3–4 MB) are waited for: the trees' leaves are painted from them.
Stills, films and `check.mjs` (`?render=1`) wait for everything, so they are the same every time; `?stream=0` makes
the live page wait too. A map that has not arrived after `?scanwait=40` seconds is given up and that layer stays its
recipe. Shader compilation takes a few seconds on most systems, longer the first time on Windows.

What a bake has read is freed through `LR.settle()`: finished first where stills are made, a moment later on the
live page. Freeing a source texture straight after the pass that read it is legal, and a software renderer under a
load of fifty model bakes lost those passes — whole material layers came out empty (`references/LESSONS.md`).

## Scanned objects and the frame
Every scanned object — a barrel, a boulder, a fern, an apple — is **instanced**: one draw call for all the copies of
one level of detail of one model in view. Each frame, on the CPU, cells of copies (32 m, 16 m for plants) are tested
against the view and the range, each copy picks its level by distance, and the instance buffers are refilled (sixteen
numbers a copy).

| | how |
|---|---|
| levels | made at load by meshoptimizer: 26 %, 6.5 % and (dense scans) 1.6 % of the triangles for solid things; for plants fewer triangles a card, then fewer cards |
| which level | the one whose triangles are about two pixels wide: `584 × size / √triangles` metres (plants `350 ×`); tiers scale it 0.6 / 0.8 / 1 / 1.3 |
| how far | solid things `320 × size` (an apple 45 m, a barrel 300 m), plants 16–45 m, thinned out by a dither over the last fifth |
| shadows | a small solid thing an eight-sided hull (28 triangles), big ones their lowest level, plants over 0.9 m their lowest level within 26 m, goods none |
| textures | two a model, sized to the thing (128–1024 px), never larger than its files |

Measured on the village on `high` (`check.mjs` prints it per view; the table is filled in `references/LESSONS.md`,
round 8): the scans add 0.2–0.5 M triangles and 30–70 draw calls to a view. Before the levels of detail the same
plants alone cost 1.0–1.6 M.

## Where a frame's time goes — `?prof=1`
`?prof=1` (it opens the numbers panel, `P`) shows milliseconds a pass: shadows, G-buffer, occlusion, air, bounce,
lighting, see-through, resolve, bloom, final. They are measured by the graphics card itself
(`EXT_disjoint_timer_query_webgl2`: desktop Chrome and Edge have it; where it is missing only the CPU side is shown),
smoothed over a few frames. This is the first thing to look at on a real machine — nothing here could measure it.

## What is not done
- No occlusion culling (a house does not hide the houses behind it), no screen-space reflections, no GPU-driven
  culling, no compressed textures (materials are baked at load, uncompressed: about 70 MB at 512², 270 MB at 1024² — a scan
  costs the same as the recipe it replaces; each scanned model adds two textures of 0.1–11 MB).
- Scanned objects keep no metalness per texel (one number an object), no per-instance culling on the GPU (the CPU
  does it by cells), and no impostors: beyond its range a thing is gone, not a picture of itself.
- No moving shadow-casting lights other than the sun and the moon; lamps do not cast shadows.
