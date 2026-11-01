---
name: specimen-tour
description: Make a short vertical "fly inside a specimen" film (20–40 s, 9:16 shorts and 4:5 feed) — a cut-open 3D model of one thing (a plant or animal cell, a seed, a battery, a chip, a watch, a volcano) toured part by part, the camera orbiting each part and pulling back / pushing in between them, under a sci-fi HUD (frosted panels, live pill, typed caption card, locator, data rows), with an opening shot of the closed specimen turning and an x-ray half-section; built in three.js (or Canvas 2D) and rendered to MP4 frame by frame, plus a live page. Use when asked for "세포 속으로 들어가는 영상", "~ 내부를 3D로 보여주는 쇼츠", "릴스/쇼츠용 3D 구조 투어", "이 영상처럼 만들어줘" for a cutaway/zoom-into-parts reel, "inside a cell", "3D cutaway", "specimen zoom", "organelle tour", "what's inside X" shorts.
---

# specimen-tour

A pipeline for **short cutaway tours**: one specimen, 6–15 named parts, ~2 s per part. The specimen is a 3D model built in
code (three.js) — walls from a polygon, cut-open bowls for bodies, blobs, tubes, instanced beads — lit by a soft studio
environment with bloom. A camera **tour** orbits each part (the rotation the eye reads as "3D") and flies between parts by
pulling back toward an overview and pushing in. A 2D **HUD** is composited over every frame: title panel, live pill, the part's
name and zoom, focus reticle, scale bar, a typed caption card, and a bottom panel (locator, shot strip, data rows, log).
Every frame is a pure function of `t`, so the same page plays live in a browser and renders to MP4 deterministically.

Built in this repo by recreating a Facebook reel ("Claude Opus 5.5 · Plant cell", 14 shots × 2 s) whose pictures were AI-generated
stills: here every picture is code. Worked example: `examples/plant-cell/` (3D). A Canvas 2D variant of the same engine
(painted plates instead of a model) lives in `kit/specimen-zoom.js`, with `examples/plant-cell-2d/` and `examples/battery-2d/`.

## What's in this folder
| path | what |
|---|---|
| `kit/specimen3d.js` | three.js machinery (ES module): `createStage` (renderer, MSAA, bloom, ACES), `studioEnv`, `canvasTex` / `paintTex`, builders `bowl`, `blobGeo`, `tube`, `beads`, `walls`, `plate`, polygon helpers, `tour` + `aim` (camera), `xrayMaterial` + `renderXray`, `film` (frame compositor) |
| `kit/specimen-zoom.js` | Canvas 2D kit (classic script, `window.SZ`): texture painters (`noiseTex`, `fiberTex`, caustics, `fieldBase`, `network` …), the HUD primitives (`SZ.ui`), `SZ.player`, layouts (`SZ.LAYOUT['9:16' \| '4:5']`), fonts loader — and a full 2D film engine (`SZ.film`) |
| `kit/fonts/` | Barlow Condensed, Saira Condensed, JetBrains Mono (OFL) |
| `kit/vendor/three/` | three.js r170 module build + the post-processing passes the kit imports (MIT, `LICENSE`) |
| `examples/plant-cell/` | **3D reference**: 28 s, 14 shots, plant cell among its neighbours (`?ar=4:5` for the feed cut) |
| `examples/plant-cell-2d/` · `examples/battery-2d/` | the 2D variant: the same reel painted in Canvas 2D; a different subject on the 2D kit |
| `scripts/render.mjs` | stills (`--stills 1,3`) or MP4; `--size 1080x1920`, `--query ar=4:5`, `--from/--to` |
| `scripts/render-chunked.sh` | MP4 in parallel segments, resumable, joined |
| `references/STYLE-3D.md` · `STYLE-2D.md` | techniques, API, what every topic designs itself, knobs |
| `references/LESSONS.md` | what went wrong while building the reference and the fixes |

## Project layout (what you create)
```
my-tours/
  kit/                 ← copy of <skill>/kit/ (engine, fonts, three.js)
  <slug>/index.html    one film: the model, shot table, HUD words (start from <skill>/examples/plant-cell/index.html)
  out/<slug>.mp4       baked 9:16;  out/<slug>-feed.mp4  baked 4:5
```
Pages load `../kit/…` (the examples use `../../kit/…`; fix the two paths in the importmap and the `<script src>` when you copy one).

## Requirements
Node 18+, Playwright with Chromium (WebGL runs on SwiftShader headless — slow but correct), ffmpeg.

## Workflow
1. **Pick the specimen and its parts.** 6–15 parts, an order a viewer can follow (outside → inside, big → small). For each part:
   name, one-line role, three short facts (real numbers; label examples), a zoom figure and a scale-bar length. If the user gave
   a reference video, extract frames first (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=9x3 sheet.jpg`) and read every label,
   card and panel; copy the structure and wording, not their credit line.
2. **Shot table** — one row per part: `cam: { t: [x, y, z], d, az, el, orbit, tilt }`. `az` 0 puts the camera on +z; `el` is
   degrees above the target; `orbit` deg/s is the turn the eye reads as 3D. Close-ups 2–6 units away; the overview ~20–25.
   **Check every camera is in open space** (not inside a wall or a translucent body) — a frame that is one flat colour means it is.
3. **Build the model** in `build(F, progress)`: textures painted with the 2D kit (`K.paintTex(size, (g, s) => SZ.fieldBase(…))`),
   then walls / bowls / blobs / tubes / beads. Cut bodies open toward the camera (`bowl`) so their insides read from above.
   Keep everything seeded (`SZ.rng`).
4. **Opening and closing shots**: the closed specimen turning (a lid on the walls, neighbours hidden, fade both on open) and an
   x-ray half (`renderXray` right of a sweeping cut, grid + scan line in the HUD).
5. **HUD**: copy the reference page's `hud()` and replace the words and numbers. Panels stay inside the layout zones.
6. **Verify** (mandatory): `node <skill>/scripts/render.mjs <slug>/index.html <scratch>/st --stills 0.5,1.4,3,5,…` — one still per shot
   (middle of the shot) plus a few transition moments (`2k ± 0.2`). Read every still: camera inside geometry, flat colour fills,
   text overlaps, HUD over the subject. Then `--size 1080x1350 --query ar=4:5` for the feed cut.
7. **Bake**: `RENDER_ARGS='--size 1080x1920 --query rs=0.67' <skill>/scripts/render-chunked.sh <slug>/index.html out/<slug>.mp4 7 4`.
   `rs` renders the 3D layer at 2/3 size (the HUD stays at full size); full size is ~13 s/frame on SwiftShader, 2/3 is ~2.5×
   faster. Feed cut: `RENDER_ARGS='--size 1080x1350 --query ar=4:5&rs=0.67' …`. Live pages use the full size.
8. **Publish** the live page (it plays in real time on a phone GPU) and hand over the MP4.

## Rules
- **Determinism**: no `Math.random`, `Date` or `performance.now` in `build`, `frame` or `hud`. Animate only from `t`.
- **Canvas**: 1080×1920 (9:16, default) or 1080×1350 (`?ar=4:5`). Shorts-safe zones: top bar to y 110, app captions and buttons
  below ~1640 and at the lower right — `SZ.LAYOUT` holds the zones; panels stay in them.
- **One colour per part**, used for its pill dot, card title, zoom number, shot square and locator box.
- **Facts**: real figures from the subject (ranges are fine); example numbers carry `예시` / "example"; claim "not to scale" where it isn't.
- **No credit lines or handles copied from a reference** video; put your own source line.
- **Text sizes** at 1080 wide: card title 28, card body 15 / mono 12.5, panel labels ≥ 12.

## Contract
The page exposes `window.ready` (Promise), `window.renderAt(t)` and `window.DURATION` (via `SZ.player`), draws into `<canvas id="c">`,
and has a literal `DURATION = <n>` in a comment for `render-chunked.sh`. `?render` hides the player chrome.
