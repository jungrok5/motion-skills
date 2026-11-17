---
name: app-cube
description: Make a live web page that is a glossy 3×3 twisty cube in a small photo studio, where each of the six faces is a working app made of ordinary HTML (a notes field you type into, buttons, a timer, sliders, a list, a map) drawn in WebGL2 through HTML-in-Canvas. Drag a tile and its layer turns, so the apps are scrambled across the cube as tiles, and every tile still clicks, types and drags as its own part of its own app; Shuffle, Back and Solve live on one face. Give it a topic and it designs the six apps, their wording, the cube's material and colours, the studio light and the sounds (a travel planner with a map, packing list, currency converter and phrasebook; a band's merch, tour dates and setlist; a recipe with timers and a shopping list). Outputs one self-contained folder (index.html + lib/) that works from file:// and as a Claude artifact, plus stills. Use for "six apps on a cube", "Rubik's cube website", "twisty cube of live HTML", "HTML in canvas cube", "interactive cube page", "apps on the faces of a cube", or ("큐브 위에 앱 여섯 개", "루빅스 큐브 웹페이지", "면마다 앱이 있는 큐브", "돌리는 큐브 페이지", "HTML-in-Canvas 큐브", "이 스타일로 ○○ 큐브 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Six Apps, One Cube" demo https://claude.ai/artifact/287yYEVG3FekMqofmJkUki on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# app-cube

A web page that is a cube. Six small apps, each an ordinary 720 px square of HTML, are the six faces of a glossy 3×3 twisty
cube standing on a reflective floor in a little photo studio (a key softbox, a cool strip, a warm kicker, a dark backdrop).
Hover a tile and its app is live under the pointer: click its buttons, type into its text, drag its sliders. Drag a tile
and its layer turns with weight and a small overshoot, so the apps end up scattered across the cube as tiles, and each tile
still works as its own ninth of its own app. A text field keeps the caret through twists, and the cube turns itself to show
where you type. One face holds the cube's own controls (Shuffle, Back, Solve, sound, mode) and its status. Give it a topic
and it designs six apps for it, their words, the cube's material and colours, the studio and the sounds.

Made in this repo from Felix Rieseberg's "Six Apps, One Cube" demo — https://claude.ai/artifact/287yYEVG3FekMqofmJkUki — one
of the fifteen demos on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in the post
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` lists what was
observed from it. This skill keeps the idea and the technique (each tile placed for hit testing with its own projective
matrix) and writes all of its own code, apps, words, look and sound. The worked example, `examples/lisbon-weekend`, is a
travel planner. Never recreate the demo's apps (its editor, step sequencer, drawing pad, clock, mine field) or its wording.

**Code-only.** No generated or downloaded images, video, audio or fonts. Everything is HTML/CSS, inline SVG drawn in code,
WebGL shaders and Web Audio.

**Fixed (the style)**: a 3×3 cube of rounded, glossy cubies with a rounded glass tile on every face; the photo-studio look
(softbox reflections, a backdrop gradient with two coloured glows, a floor that reflects and shades, a light sweep and a hop
when solved); six apps as ordinary DOM on a 3×3 grid of 240 px tiles; the grammar (hover → the tile is live; drag a tile →
its layer turns, snapping on a spring with a recoil; drag the backdrop → orbit with inertia; double-click it → home; text
fields, sliders and `[data-drag]` take the drag in mode `auto`, Shift always turns); one face of cube controls; the caret
survives twists and the cube turns to show it; the HTML-in-Canvas rules (references/HIC.md).

**Designed per topic**: the six apps (what they do, their HTML, CSS and behaviour), which face each goes on, every word
(titles, buttons, the status lines, the HUD hints), the control face's look and wording, the cube's body (colour, gloss,
roughness, metal, groove), the tiles (glass, emit, hot colour), the studio lights, the backdrop and floor colours, the home
view, and the sounds (snap pitch, tick, chime notes, the apps' own tones). The template and the example are examples of the
style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/cube.js` | the engine: `AppCube.create(canvas, config)`: the cube model (26 cubies, 54 tiles, moves, notation, history), rounded-cubie mesh, shaders (body, glass tiles, backdrop, reflective floor), tile hit testing by homography, gestures (hover, twist with spring snap, orbit with inertia), reveal-on-type, attribute-wired controls, synthesised sound, fallback, adaptive resolution, the test hooks |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (exact copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html` | the house example: "Desk Cube" (notes, focus timer, cube controls, tasks, colour mixer, water tally), commented |
| `templates/BRIEF.md` | the brief to fill for a topic |
| `examples/lisbon-weekend/` | the worked example: `BRIEF.md` + `index.html` (plan, map, tram-ticket controls, packing, money, phrases) |
| `scripts/new-page.mjs` | start a project: copies `lib/` and the template (or `--from <example>`) into a folder and fixes the paths |
| `scripts/check.mjs` | proves a page: the shared checks + tiles map, grid, twist, live after twist, scramble/undo/solve, orbit, sound, still, calm |
| `scripts/still.mjs` | stills for the review: `--act idle,twist,scramble,typed,back,under,solved`, `--at`, `--size`, `--jpg` |
| `scripts/hic-test.mjs` | the shared checks (exact copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, the still review) · **LOOK** (observed from the source demo) · **ENGINE** (config and API, adding behaviour) · **HIC** (the HTML-in-Canvas notes, copy) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-cube/
  BRIEF.md     the topic as six apps + a look + sounds (references/BRIEF.md) — written first
  index.html   the six faces (HTML + CSS), the apps' script, the CONFIG passed to AppCube.create
  lib/         hic.js + cube.js (copied by new-page.mjs; the page loads lib/…)
  out/         stills (not committed)
```
Run scripts from anywhere with paths: `node <skill>/scripts/check.mjs my-cube/index.html`. The page opens straight from
file:// (no modules, no server needed) and works as a Claude artifact if `lib/` is inlined or published alongside.

Requirements: Node + Playwright Chromium (the checks pass `--enable-blink-features=CanvasDrawElement`). To see it live: Chrome
or Edge 157+, or the Claude desktop app. Other browsers get the same six apps as an ordinary page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md explains how):
   the six apps (one job each, one of them with a text field), which face each takes, every control placed in a tile, the
   wording, the control face, the material and studio, the home view, the sounds. Save it as `BRIEF.md` before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-cube` (or `--from lisbon-weekend` when the topic is close to travel).
3. **Faces, one at a time.** Replace the template's six sections with the brief's apps. Lay each out on the 240 px grid:
   a control sits inside one tile with a 16 px margin; text may run across tiles; mark a control that must span tiles
   (a wide slider, a long input) `data-span`. Put the cube's controls on one face with `data-cube="scramble|undo|solve|sound"`
   and `data-cube="mode" data-mode="auto|write|twist"`. Mark the main text field `data-hic-edit` and one visible button
   `data-hic-click`. Write each app's behaviour as plain DOM script; reach sound through `cube.sound.tone/click`.
4. **Look.** Set `CONFIG` from the brief: `body`, `tile`, `studio.lights`, `backdrop`, `floor`, `sweep`, `view`, `sound`
   (references/ENGINE.md). Pick colours so every face reads against the body and the backdrop.
5. **Check**: `node <skill>/scripts/check.mjs index.html` must print only `ok`. Fix every `grid` report by moving the control
   into a tile (or marking a deliberate span).
6. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --act idle,twist,typed,back,under`, open every
   PNG and score it against the still review in references/BRIEF.md (readable faces, nothing cut at a seam, the control face
   legible, the studio light reading on the body, the floor reflection, the scrambled state still beautiful). Fix and repeat.
7. **Hand over** the folder (`index.html` + `lib/`), the brief and the stills. Do not ship `out/`.

## Rules
- **Design for the topic.** The six apps, their words, the control face, the material, the studio and the sounds are new for
  each topic. Do not reuse the template's desk apps or the example's travel apps unless the topic is exactly theirs. Never
  recreate the source demo's apps or wording.
- **One style.** Always the 3×3 glossy cube on a reflective floor in a studio, glass tiles, the same gestures, a control face.
  A topic changes colours, materials and apps, never the form (no 2×2, no flat grid, no other solids).
- **The page stays real** (references/HIC.md): every word is DOM text you can select, type or find; controls are real
  `<button>`, `<input>`, `<select>`. Never paint text into the texture or fake a control.
- **What you see is what you click.** Only the tile under the pointer is hit-testable, placed by its homography; the check
  proves every visible tile maps to its own part of its own app, solved and scrambled.
- **The grid.** Each face is 720×720 px in nine 240 px tiles. A control lies inside one tile with a margin (check `grid`);
  anything else is marked `data-span`. Keep important text 16 px from tile edges (rounded corners and the gaps eat it).
- **One text field survives twists.** Pressing a button or dragging a tile never takes the caret out of the text
  (`mousedown` is kept off non-text targets); the cube turns to show the caret when it hides.
- **Weight.** A released layer swings to the nearest quarter on an underdamped spring (overshoot, then rest), a flick turns
  it, and the whole cube gives a little against each landing. Programmatic moves ease in and out. Keep `turn` values near
  the defaults; check `twist` reports the settle in engine time (≤ 1.2 s).
- **Upload only on paint**, at face × min(2, dpr), with mipmaps. A face that animates by itself (a timer) re-uploads only
  when its DOM changes.
- **Calm, still, seeded.** `#still=<s>` freezes time (stills), `#calm` / reduced motion drops the sway, intro, sweep and
  hop; scrambles use `HIC.rng` with a seed.
- **Sound is synthesised**, starts at the first gesture, with a visible toggle on the control face.
- **No network.** System font stacks, no CDN, no images: draw maps, icons and art in SVG/CSS code.
- **Phone width.** At 390 px the camera backs off so the cube fits; the HUD shrinks; nothing scrolls sideways.
- **Fallback.** Without the feature the same six apps are an ordinary page (scaled to fit); the cube buttons are disabled.

## Contract (what a page exposes)
- `AppCube.create(canvas, CONFIG)` → `cube` (or `null` after falling back). `CONFIG.faces` lists six direct children of the
  canvas in the order front, right, top, back, left, bottom; all options are in references/ENGINE.md.
- `window.__hic`: `ready`, `fallback`, `uploads`, `frames`, `errors`, `screenOf(el)` (where an element is drawn now, through
  its tile's homography). `window.__cube`: the API (`state()`, `scramble()`, `undo()`, `solve()`, `apply(moves)`, `hold()`,
  `view()`, `visibleTiles()`, `toScreen()`, `toLocal()`, `localBox()`, `faceOf()`, `sound`).
- Events on `window`: `cubechange` `{solved, moves, log, last, user, clock, settle}`, `cubeuse` `{face, afterTwist}`.
- Address: `#still=<s>` (time stands), `#calm`, `#fallback` (force the plain page), `#quality=<0.3–1>` (backing resolution only).
- Markup: `<canvas id="stage" layoutsubtree content="drawable">` with six `<section class="face" drawable>` of 720×720 px at
  `position:absolute; left:0; top:0`; the fallback CSS puts them in a column (`.hic-fallback .face { position: relative }`).
