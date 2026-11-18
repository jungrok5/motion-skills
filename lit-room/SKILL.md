---
name: lit-room
description: Make a live 3D room whose monitor shows a real, working web page, and the page is the room's light — a pink page bathes the desk pink, a glow dragged across the page moves the light across the room, a white page lights everything and the eye adapts. Drag the room to look around, scroll to zoom, and click, select and type on the screen in 3D (it is real DOM drawn by WebGL through HTML-in-Canvas, placed for hit testing in perspective). Give it a topic and it designs the room (a studio, a ship's cabin, a classroom at dusk, a café counter, a kid's bedroom), its props, palette and lamps as data, and the page on the screen (its content, controls and wording). Code-only, one self-contained folder, no network. Use for "a 3D room with a live screen", "monitor light colours the room", "web page on a monitor in 3D", "HTML in canvas room", "cosy desk scene with a working screen", or ("모니터 빛이 방을 물들이는 3D 방", "화면 속 웹페이지가 진짜로 동작하는 방", "3D 책상 장면에 라이브 페이지", "이 스타일로 ○○ 방 만들어줘", "주제만 바꿔서"). Source — made from the "Lit Room" demo https://claude.ai/artifact/D5pdvChFfvxBsvVNb5KNCJ on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# lit-room

A small room in 3D at night, built from data with a procedural kit, with one monitor on a desk. The monitor shows a live
web page: real DOM (text, buttons, a textarea, draggable glows) laid out inside a `<canvas>` and drawn by WebGL as the
screen's picture through HTML-in-Canvas. The page is the room's main light. Its picture is reduced to a grid of cells, and
every cell is an area light, so the colours and the layout of the page colour and shape the light in the room: a red glow on
the left of the page lights the left of the desk red. Glossy things reflect the page, things on the desk throw soft shadows
away from the screen, room lamps add warm pools, and the exposure follows the page like an eye. You drag the room to look
around and use the page in perspective: what you click is what is drawn under the pointer. Give it a topic and it designs
the room, its props, palette and lamps, and the page on the screen.

Made from Felix Rieseberg's "Lit Room" demo — https://claude.ai/artifact/D5pdvChFfvxBsvVNb5KNCJ — one of the fifteen demos
on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in his post
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` records what was
observed. Every line of code, every prop and every word here is this repo's own: the demo baked its light offline, this
skill computes it at run time from the page. The worked example `examples/night-watch` (a sailing ship's cabin at night,
the watch page with port and starboard running lights) is a topic the demo does not have.

**Code-only.** No generated or downloaded images, models, textures, fonts or sound. Art on the walls, rugs and charts is
painted with Canvas 2D in the page; materials are procedural in the shader.

**Fixed (the style)**: one room at night (or dusk) seen from inside, with one monitor whose live page is the main light;
the light model (page → cell grid → per-vertex area light, soft screen shadows, screen reflections, room lamps, AO, the
window's sky, eye-like exposure, filmic tone, bloom, vignette, grain); the camera grammar (orbit about the screen, drag /
wheel / pinch / double-click, an opening glide); the page rules (real DOM, a real click lands where it is drawn, upload on
paint, one fallback page); render on demand.

**Designed per topic**: the room (size, walls, floor, windows / portholes, the outside), the props and where they stand,
new props written for the topic with the kit, the palette and materials, the room lamps (kind, colour, power, which one the
page switches), the page on the screen (its name, tabs, content, the glows you drag, presets, wording, typography, its
colours, which decide the room's light), the camera's home view. The template's writer's corner and the example's cabin
are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `lib/lit-room.js` | the engine: the builder kit (box with rounded edges, cyl, lathe, sphere, tube, leaf, quad, atlas decals, key ids, lights, screen and rect-light registration), the shell (walls with holes, wainscot, skirting, window frames, the outside), the per-vertex AO bake, the shaders (area light from the page grid, PCSS shadows, screen reflections, materials, sky), the post pass, the camera, the page's homography and hit-test placement, render on demand with a GPU fence, `LitRoom.wire` page helpers |
| `lib/props.js` | standard props: desk, monitor, keyboard (61 real keys), mouse, mug, books, bookStack, plant, frame (painted art), shelf, deskLamp, pendant, lantern, rug, curtains, chair, crate, bunk, porthole, paper, cable, block, tin |
| `templates/index.html` | a working starting page: a writer's corner at dusk, page "Quiet Hours" (glows to drag, an editable line, notes, four moods, a desk-lamp switch) |
| `templates/BRIEF.md` | the brief to fill |
| `scripts/new-page.mjs` | start a project folder (`lib/` + the template, or `--from night-watch`) |
| `scripts/check.mjs` | the shared checks plus the room, the light following the page colour, a real drag of a page lamp moving the light, a lamp switch, look / settle / still clickable, zoom, keys |
| `scripts/still.mjs` | stills with HTML-in-Canvas on (`--act "idle;close;mood:neon;drag:0/200/300;lamp:desk lamp"`) |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (the source, observed) · **ENGINE** (API, config, adding props) · **HIC** (HTML-in-Canvas notes, shared) · **LESSONS** (what broke and the fix) |
| `examples/night-watch/` | the worked example: `BRIEF.md`, `index.html` (a ship's cabin; four props written in the page) |

## Project layout (what you create)
```
my-lit-room/
  BRIEF.md     the topic as a room and a page (references/BRIEF.md) — written first
  index.html   the page on the screen (HTML + CSS), ROOM (data), project props (LitRoom.prop), start + wire
  lib/         copy of the skill's lib/ (new-page.mjs)
  out/         stills (not committed)
```
Run the scripts from anywhere with paths: `node <skill>/scripts/check.mjs my-lit-room/index.html`.

Requirements: Node + Playwright Chromium (the checks pass `--enable-blink-features=CanvasDrawElement`). Viewing live needs
Chrome / Edge 157+ or the Claude desktop app; other browsers get the plain page. No network, no npm install.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md says how):
   the room and its hour, who sits here, 8–14 props (2–4 of them new for this topic), the palette and materials, the room
   lamps, the outside, and the page on the screen — its purpose, tabs, the glows you drag, the editable line, presets and
   their colours (they decide the room's light), the room lamp the page switches. Save it as `BRIEF.md` before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-lit-room` (or `--from night-watch`).
3. **The page first.** Write the page for the topic in `#page` (1280 × 720 CSS px, its own CSS). Keep: one element with
   `data-hic-edit` on the first screen, one `data-hic-click` control, `[data-tab]` / `[data-panel]`, `[data-lamp]` glows,
   `[data-mood]` presets, `[data-room-lamp]` switches (or wire your own). Make most screens dark with bright, coloured
   areas: the light the room gets is the page's colour and layout. Write the `.hic-fallback` CSS so the same page reads
   at 390 px.
4. **The room as data** (`ROOM`): size, shell (walls, holes), outside, ambient, lamps, props with `at` / `rot`, camera,
   look. New props for the topic go in the page with `LitRoom.prop('name', function (b, o, room) { … })` using the kit
   (references/ENGINE.md). Put the monitor on the desk and something on the desk that throws a shadow.
5. **Stills and review**: `node <skill>/scripts/still.mjs my-lit-room/index.html --out my-lit-room/out --act "idle;close;right;mood:<x>,tab:<y>;drag:0/200/300"`.
   Open every still and score it against the still review in references/BRIEF.md: the screen readable, the page's colour
   on the desk and wall, nothing floating or through a wall, the room not black and not washed out, the window not glaring,
   the composition of the home view. Fix and repeat.
6. **Check**: `node <skill>/scripts/check.mjs my-lit-room/index.html` must print only `ok` (it runs at `#q=0.5`;
   `--full` for full resolution). Fix what fails.

## Rules
- **Design for the topic.** The room, the props, the palette, the lamps, the outside and the page are designed for the
  topic. Do not reuse the template's writer's corner or the example's cabin unless the topic is theirs, and never rebuild
  the source demo's room or page ("Good evening.", its tabs and presets).
- **One style.** One room seen from inside, one monitor whose page is the main light, the same light model, materials and
  camera grammar. New props are made with the kit and lit by the same shader; nothing is pasted in as a picture.
- **The page stays real** (references/HIC.md): DOM text you can select, type into and find; real buttons; never a picture
  of text. What you see is what you click: the page is placed with the screen's homography (`S.place`), hidden when the
  screen faces away, and the check proves a click after turning the camera.
- **The page is the light.** Design its colours as lighting: a dark ground with bright coloured areas reads best; a full
  white page is a floodlight. Every preset must still leave the room readable (the exposure adapts, but not without limit).
- **Upload only on paint**, render only on change, and never queue frames faster than the GPU draws them (the fence).
- **Weight in the motion.** The camera eases (no jumps), settles, and its intro stops the moment the visitor moves; keys
  sink and spring back; lamps fade; a flame flickers irregularly. No idle drift that keeps a slow GPU busy.
- **Calm and still**: `#still` / `#calm` / `prefers-reduced-motion` drop the intro and the flicker; the home view at
  `#still=1` must be a composed picture.
- **Deterministic**: scatter with `b.r()` (seeded by `ROOM.seed`), never `Math.random`.
- **Code-only**: art is painted with Canvas 2D in the page; no images, fonts, models or sounds from outside.
- **Phone width**: at 390 px the room fills the screen with a wider view and nothing scrolls sideways; the fallback page
  fits the width.

## Contract
- The page: `<canvas id="room" layoutsubtree content="drawable"><div id="page" drawable>…</div></canvas>`, `#page` a fixed
  size (1280 × 720 by default; `room.screen.aspect` must match), `lib/hic.js`, `lib/lit-room.js`, `lib/props.js`, then
  `var R = LitRoom.start({ canvas, page, room: ROOM }); LitRoom.wire(page, R);`.
- `window.__hic`: `ready` (after the first upload, the hit-test probe and the first drawn frame), `screenOf(el)` (where an
  element of the page is on the canvas, through the projection), `info` (vertices, triangles, build ms, grid, MSAA).
- `window.__lit` = `R`: `view(yaw, pitch, dist, now)`, `home()`, `close()`, `lamp(name|i, on?)`, `project([x,y,z])`,
  `pageToCanvas(x, y)`, `pagePoint(clientX, clientY)`, `screenOf(el)`, `keyDepth(code)`, `press(code, on)`, `redraw()`,
  `renders`, `relights`, `uploads`, `exposure`, `stats` (the page's mean linear colour), `settled`, `cam`, `lamps`, `room`,
  `builder`, `screen`.
- Hash flags: `#still=<s>` (no intro, no flicker), `#calm`, `#nointro`, `#q=<scale>` (render scale; below 1 also drops
  MSAA), `#fallback` (the plain page).
- Without HTML-in-Canvas: `HIC.fallback` moves `#page` out of the canvas and it becomes an ordinary page with one line
  saying what is missing; `LitRoom.start` returns `{ fallback: true }` and `LitRoom.wire` still works.
