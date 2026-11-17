---
name: sprite-stack-short
description: Make a short 16:9 pixel-art film about sprite stacking — an object drawn as four pixel views (top, side, front, back) on screen, every row of the side view becoming a slice, the slices stacked 1 px apart and turned to any angle, then the object living in its own small pixel world (a boat round an island, a truck through a town, a robot on a plaza) with the camera turning around it, a footprint shadow, wakes or dust, swaying props and a shard transition between paper and world. All drawn in code on an HTML Canvas at 480×270 and scaled ×4 crisp to 1080p; the models are carved from the four views (a visual hull coloured by view rays) or built with lathe / box / voxel generators; the mover's speed, turns, drift and body roll come from its mass; a chiptune score with a blip per slice and an engine that follows the speed is synthesised. Outputs a live page and a 1920×1080 MP4 (30 fps). Give it a topic and it designs the hero, draws its four views, builds the world, the course and the beats. Use for "sprite stacking", "pixel art you can rotate", "fake 3D pixel art", "turn pixel art to any angle", "stacked sprites explainer", "pixel-art vehicle in a rotating world", or ("스프라이트 스태킹", "픽셀아트를 어느 각도로든 돌리기", "픽셀아트 회전", "가짜 3D 픽셀아트", "네 방향에서 그린 픽셀아트로 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서"). Source — made from https://x.com/asynkimo/status/2121716250820964431?a=8jjw0gVhdGPGqgSNo04&s=19
---

# sprite-stack-short

A short pixel-art film that shows how sprite stacking works and then lets the object live in it. The hero is drawn as four
pixel views; the film draws them on a paper page, runs a scan line down the side view while the matching slice lifts out of
the top view and drops onto a growing stack, closes the stack to 1 px between slices and turns it, and then shatters into
the hero's world — where it moves (or stands) at every angle, the world turning under the camera, with a footprint shadow,
a wake or dust, swaying props and glinting water. Give it a topic ("a lighthouse keeper's tug", "a food truck at a night
market", "a snowplough on a mountain road", "our delivery robot") and it writes a brief, designs and draws the hero's four
views, builds props with the generators, paints the world, plans the course from the hero's mass, writes the beats and the
captions, and scores it. Every frame is `seek(t)`, so the same page plays live with sound and renders to MP4.

Made in this repo from Kimo's post on X — https://x.com/asynkimo/status/2121716250820964431?a=8jjw0gVhdGPGqgSNo04&s=19 —
"You can turn pixel art to any angle with sprite stacking", a 17-second clip of a blue sports car: drawn from 4 sides, each
row of the side view becoming a slice, the slices stacked 1 px apart and turned, then driving a race track. 
`references/LOOK.md` lists what was observed. The skill keeps the technique and the form and builds all of it with its own
code; the worked example, `examples/tugboat-dawn` 「Tug at Dawn」 (28 s), is a different subject (a harbour tug round a
lighthouse island at dawn). Never recreate the reference's car or track: design new ones for each topic.

**Code-only drawing.** The models, the world and the sound are code and hand-drawn pixel strings; no generated or
downloaded images, motion or audio go in. Bodies with limbs are out of scope (a person or an animal becomes a rigid
figurine); the motion principles of `references/MOTION-QUALITY.md` (repo root) apply to the machines: mass sets timing,
the body rolls and pitches through a spring (follow-through), nothing snaps, wheels never skid, the hero is never frozen.

**Fixed (the style)**: 480×270 art ×4 (integer zoom per beat, one pixel size per frame, nearest-neighbour only); slices
straight up the screen, 1 px apart; one light (upper left) whose lit and shaded faces move across the object as it turns;
the footprint shadow; the form — world teaser → `views` → `slices` → `stack` → `turn` → `world` → `title`; warm paper for
the explainer beats; centred one-line captions at the top, small labels under the views with front arrows; the shard
transition; a chiptune score with the beat sounds and the engine; 1920×1080 at 30 fps.

**Designed per topic**: the hero (object, size, silhouette, palette, front / back tells, its four views), the props, the
ground materials, areas and paths, the course and the camera, mass / drift / roll / engine, beat lengths, the captions and
their language, the tune. The template's post box and the example's tug are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/stack.js` | `window.SS`: colours, `Raster`, `hash` / `rng` / `ease`; `SS.model` (carve four views into voxels, colour faces by view ray, `edit`), generators `SS.lathe` / `SS.box` / `SS.voxels`, `SS.audit` (lost pixels per view, side-view orientation, empty slices), the renderer `SS.draw` (slices, lift, spread, lean, light, cap) and `SS.shadow` |
| `lib/world.js` | `SS.world`: materials (`grass`, `asphalt`, `water`, `sand`, `snow`, `dirt`, `planks`, `tiles`, `flat`, your own), areas with edge bands, spline paths (curbs, foam, centre dash, invisible courses), props and scatter, the mover's tables (speed from mass and curvature, heading, drift, roll / pitch springs, camera spring), the frame (ground turned with the camera, trail, shadows, depth-sorted stacks) |
| `lib/film.js` | `SS.film`: the beats (`views`, `slices`, `stack`, `turn`, `world`, `title`), auto zoom, the shard transition, captions and labels at full resolution, the page contract and live player, the rules and the numbers for `check.mjs`; `SS.sheetPage` (the model sheet) |
| `lib/score.js` | `SSScore`: the tune, the beat sounds, the engine following the speed, a small room; `render`, `wav` |
| `lib/fonts/` | the caption face (Pretendard subset, Hangul + Latin, SIL OFL) |
| `templates/` | `BRIEF.md`, `cast.js` (a post box drawn as four views + two generated props), `index.html` (the form, an orbit camera), `sheet.html` |
| `scripts/new-short.mjs` | start a project (`lib/` + the template, or `--from tugboat-dawn`) |
| `scripts/render.mjs` | stills (`--stills 3,12`), a contact sheet (`--sheet 12`), or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/score.mjs` | the page's score → WAV |
| `scripts/check.mjs` | proves a short (or a sheet): clean load, every beat draws, no blank, deterministic, the models (views agree, side faces right, no empty slice), the rules (mover on its surface and in frame, captions fit), flat pixel blocks, motion numbers (turn rate, skid vs drift, acceleration vs mass, roll and its lag, idle), the score, the cost of a frame |
| `references/` | **BRIEF** (topic → brief, the sheet and still reviews) · **LOOK** (the form, observed from the source) · **KIT** (API) · **LESSONS** (what broke and the fix) |
| `examples/tugboat-dawn/` | the worked example: `BRIEF.md`, `cast.js` (tug, lighthouse, pine, buoys, crate, bollard, house), `index.html` (28 s), `sheet.html` |

## Project layout (what you create)
```
my-short/
  BRIEF.md     the topic as a short: hero, views, world, course, beats, sound (references/BRIEF.md) — written first
  cast.js      every model: the hero's four views (+ palette, idle), props from the generators — reviewed on sheet.html
  sheet.html   the model sheet
  index.html   the world, the beats, the score → SS.film(...).start()
  lib/         copy of the skill's lib/ (new-short.mjs)
  out/         stills, sheets, <name>.wav, <name>.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs index.html --stills 2,9 --scale .5`.

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install. A 28 s short renders in about a
minute on a CPU box.

## Workflow
1. **Brief.** From the topic, write `BRIEF.md` (`references/BRIEF.md`): the hero and why, its size and silhouette, palette,
   front / back tells, thin parts; whether it moves (mass, speed, drift, roll, engine) and what breathes when still; the
   world (ground, places, props, the course, the camera); the beats with their captions in one language; the tune.
2. **Start**: `node <skill>/scripts/new-short.mjs my-short` (or `--from tugboat-dawn`).
3. **Draw the hero's four views** in `cast.js` — front pointing right in the top and side views, the right side in the side
   view; pixel art with an outline, 2–3 tones a material, one accent; matching lengths / widths / heights. Then the props
   with `SS.lathe` / `SS.box` / `SS.voxels`, designed for the topic.
4. **Model sheet**: `node <skill>/scripts/check.mjs sheet.html` must print `ok` (0 % lost view pixels, side faces right, no
   empty slice); render it (`render.mjs sheet.html --stills 0`) and review it (`references/BRIEF.md` → model sheet review):
   right side at 0°, front at 90°, left at 180°, back at 270°; no slab where a thin part should be. Fix the views, or `edit`.
5. **The world and the beats** in `index.html`: ground, areas, paths, props, the course (`paint: false`) and the mover, the
   camera; then the beats. A still per beat as you go (`render.mjs index.html --stills 1.5,6,9 --scale .5`).
6. **Contact sheet**: `render.mjs index.html --sheet 12 --scale .5` — review every beat (still review). Look at a shard
   transition mid-way.
7. **Check**: `node <skill>/scripts/check.mjs index.html --scale .5` must end with `ok`. Read the motion numbers: turn rate,
   skid ≤ drift, acceleration within the mass, the roll and its lag.
8. **Sound and render**: `node <skill>/scripts/score.mjs index.html` → `out/<name>.wav`, then
   `node <skill>/scripts/render.mjs index.html --audio out/<name>.wav` → `out/<name>.mp4`. Watch it once with sound.

## Rules
- **Design for the topic.** A new hero, drawn as four new views, new props, a new world and course for every topic — never
  the template's post box, the example's tug or the source's car and track unless the topic is exactly that. Captions say
  what this short shows, in one language.
- **One style.** 480×270 art, integer zoom per beat, nearest-neighbour only — no `drawImage` smoothing, no scaled single
  objects, no sub-pixel or anti-aliased drawing in the art. Slices go straight up, `lift` px apart (1 unless the brief says
  otherwise). One light for the whole film. Pixel-art views: outline, few tones, one accent.
- **The views agree and face the right way.** The front points right in the top and side views; the side view is the right
  side; `check.mjs sheet.html` reports 0 % lost pixels before any beat is written. Give the front and the back their own
  colour (tells). Thin parts never share a front-view row with a wider part (or are cut with `edit`).
- **Weight (machines).** Mass in the brief sets `accel`, `brake` and the lateral grip; nothing starts or stops instantly; the
  body rolls out of the turns and pitches on speed changes through a spring that overshoots and settles (`check.mjs`: roll
  > .3 px, lag > 40 ms); wheels never skid (`drift: 0`), boats slide within their `drift`; turns are turns (≤ 150°/s).
- **Never frozen.** A moving hero moves; a still one idles (rocking afloat, an engine shiver) or the camera orbits; the
  stack and turn beats always move. The world has life besides the hero (glints, wake, swaying props).
- **Stays where it belongs.** The mover never leaves its surface (`on: [...]`) and stays inside the frame's safe area in
  follow shots.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; tables are computed once (`world.plan`).
- **Check by looking and by numbers**: the sheet, stills, the contact sheet, `check.mjs`; fix what you see before rendering.
- **Generated media is reference only** (repo `CLAUDE.md`): nothing generated goes into the project or the repo; ElevenLabs
  (or any paid generator) only after the owner says yes for that request. The score here is synthesised by `lib/score.js`.

## Contract every short page fulfils
`window.seek(t)` draws frame t; `window.DURATION`, `window.FPS` (30), `window.PIXEL = { W: 480, H: 270, block }`,
`window.film` (beats, models, world, `audit()`), `window.runChecks(t)` (rules broken at t), `window.shotAt(t)`,
`window.__ready = true` once the caption font is loaded. `?render=1` = no fitting, no live loop; `?t=12.5` = one frozen
frame; `?scale=.5` = block size 4 × scale (960×540); `?off=captions,labels,mover`. The live page fits the window at an
integer block size and loops; click = sound on / off; space = pause. A sheet page sets `window.film.sheet = true` and
`runChecks()` returns the models' problems.
