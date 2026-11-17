---
name: hypertext-hotel
description: Make a live web page that is a miniature building cut open at the front, at night — a doll's-house cutaway in WebGL (HTML-in-Canvas) whose rooms glow with shadowed lamps, and in which every object you can work is a real HTML control styled as that object: a lamp switch is a checkbox, a dimmer or an oven dial is a range, a dial plate is a select, a ledger or chalkboard is a text field, a bell is a button, a neon sign is contenteditable text, and the lift (hoist, dumbwaiter) is one vertical range whose thumb is the car's lever. A magnifier lens and a "Show just HTML elements" switch reveal the same controls as plain, unstyled HTML, kept in step both ways; sounds are synthesised. Give it a topic (a bakery at night, a lighthouse, a space station, a school, a fire station, a museum after hours) and it designs the building, the rooms, their props and lights, which control each object is and how it looks, the palette and the sounds. One self-contained folder, no network, works from file:// and as a Claude artifact; Chrome/Edge 157+ or the Claude desktop app, a plain working page of the same controls elsewhere. Use for "doll's house of HTML controls", "dollhouse cutaway web page", "miniature building made of form controls", "interactive cutaway building", "HTML-in-Canvas page", "hotel hypertext style", or ("인형의 집 웹페이지", "HTML 컨트롤로 만든 미니어처 건물", "단면도 건물 인터랙티브 페이지", "방마다 스위치가 진짜 체크박스인 페이지", "HTML-in-Canvas 페이지", "이 스타일로 ○○ 건물 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Hotel Hypertext" demo https://claude.ai/artifact/WgPzNowvy1DGy3jeXhzNMD on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# hypertext-hotel

A small building at night, cut open at the front like a doll's house and set on a walnut plinth with a street, lamps, trees,
a moon and a neon sign. Its rooms are lit boxes with props and warm lamps that cast soft shadows. Everything you can work in
a room is a real HTML control laid out inside a `<canvas>` and drawn by WebGL on a rectangle in that room, styled as the
object it stands for: the switch plate is a checkbox, the oven dial a range, the wallpaper plate a select, the chalkboard a
text field, the shop bell a button, the sign contenteditable text, and the lift one vertical range whose thumb is the lever on
the car. Click, drag, type and tab work where the controls are drawn. The magnifier lens and "Show just HTML elements" show
the same controls as plain HTML (each control has an unstyled twin, kept in step both ways). Give it a topic and it designs a
new building: its grid of rooms, props, lights, controls, CSS, palette and sounds. The output is one self-contained folder
(`index.html` + `lib/`) that runs from file://, a server or as a Claude artifact.

Made in this repo from Felix Rieseberg's "Hotel Hypertext" demo https://claude.ai/artifact/WgPzNowvy1DGy3jeXhzNMD on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` records what was
observed. All code here is this repo's own; the demo's code, text, rooms and sounds are not copied. The worked example,
`examples/night-bakery` 「The Night Loaf」, is a bakery at three in the morning. Never rebuild the source's hotel (its lobby,
bar, library, music room, its wording): design the building for the topic.

**Code-only.** No generated or downloaded images, models, motion, fonts or audio. The peg dolls' idle (breath, weight shift)
and every spring are keyed in code, following `references/MOTION-QUALITY.md` (repo root).

**Fixed (the style)**: a front-on cutaway of one building at night, square to the screen with the floors and side walls in
gentle perspective, on a plinth; rooms in a grid of columns × floors, each a lit box (≤ 3 point lights, two with soft cube
shadows) under moonlight with its own shadow map; ambient occlusion, bloom, a hue-keeping tone map, film grain, anti-aliasing;
a peg-doll and turned-wood prop language; every interactive object is a real HTML control, styled as that object, drawn in the
room and hit-tested where it is drawn; an unstyled twin per control, a magnifier lens that shows the twins under the glass and
a "Show just HTML elements" sheet; a vertical-range lift with weight; synthesised sounds, off until the Sound button; the plain
page of the same controls as fallback.

**Designed per topic**: the building type and grid (columns, floors, spanning rooms, shaft), facade, roof (flat, gable or your
own), sign, ground; the rooms and their props (from `lib/props.js` or built in the page); the lights; which control each
object is, its wording and its CSS; what each control does (lights, tints, flames, springs, movers); the palette, sky, lens rim
and sheet colours; the lift's stops, car and mass; the sounds. The template (a townhouse) and the example (a bakery) are
examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/dollhouse.js` | the engine: `Dollhouse.start(cfg)`; the parametric building (grid, walls, slabs, wings with quoins and windows, cornice, flat or gable roof, chimneys, sign on a lattice, plinth, street); the builder (`box`, `block`, `cyl`, `lathe`, `ball`, `bar`, `shell`, `light`, `flame`, `panel`, `mover`); patterns drawn in the shader (plaster, wood, planks, stripes, check, tile, brick, dots, diamond, carpet, quilt, books, shingle, night sky…); the renderer; the controls' textures, twins and hit testing; the lens, the plain sheet, the camera; `Dollhouse.lift` |
| `lib/props.js` | the prop kit: `doll` (breathing peg doll), `table`, `chair`, `stool`, `bed`, `sofa`, `shelf` (books, jars, bottles, loaves, plates), `counter`, `rug`, `frame`, `window`, `plant`, `door`, `trim`, `board`, `lamp` (table, floor, pendant, sconce, bulb), `hearth` (fireplace, oven, stove), `loaf`, `sack`, `crate`, `barrel`, `clock`, `radio`, `fan`, `rack` |
| `lib/sound.js` | `DHSound`: click, tick, clunk, key, bell, chime, buzz, whoosh, note, hum; pages add their own voices |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html`, `templates/BRIEF.md` | a townhouse with four rooms and a lift (every control kind), and the brief to fill |
| `examples/night-bakery/` | the worked example: `BRIEF.md` + `index.html` (six rooms, a bread hoist, an oven, a fan, rising dough) |
| `scripts/new-page.mjs` | start a project (`lib/` + the template, or `--from night-bakery`) |
| `scripts/check.mjs` | proves a page with numbers (below) |
| `scripts/still.mjs` | stills: `--act idle,lens,plain,room,lift`, `--set key=value;…`, `--room`, `--lens` |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, the still review) · **LOOK** (observed from the source) · **ENGINE** (config and API, adding props, controls and behaviours) · **HIC** (the shared HTML-in-Canvas notes) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-hotel/
  BRIEF.md     the topic as a building: rooms, props, controls → effects, palette, sounds (written first)
  index.html   the controls (canvas children with data-k), their CSS, and Dollhouse.start({ building, rooms, ready … })
  lib/         copy of the skill's lib/ (new-page.mjs)
  out/         stills (not committed)
```
Run the scripts from the skill folder or give paths: `node <skill>/scripts/check.mjs my-hotel/index.html`.

Requirements: Node + Playwright Chromium for checks and stills. The page itself needs nothing: Chrome or Edge 157+ or the Claude
desktop app; other browsers get the plain page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the topic (`references/BRIEF.md` says how): what the building
   is and the question it answers; its grid and which room sits where; per room the props, lights and two or three controls,
   each with the object it is drawn as and what it does; the palette; the lift and its stops; the sounds. Save it as `BRIEF.md`
   before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-hotel` (or `--from night-bakery` when the topic is close to a bakery).
3. **The building**: set `building` (cols, floors, depth, frame, wings, base and steps, cornice, roof, chimneys, sign), `ground`,
   `sky` and `look` for the topic. Take a still (`still.mjs index.html --act idle`) of empty rooms first.
4. **Rooms, one at a time**: in each room's `build(B, R)` place props in local metres (the back wall is `-R.d`), lights, and the
   panels. Keep every control clear of props in front of it, at least ~0.45 m wide, and on a wall or surface where that object
   would really be. A prop the kit lacks is built in the page from `B.box / cyl / lathe / ball / bar` and `Dollhouse.mat`.
5. **Controls**: write each control as a canvas child with `data-k`, styled in the page's CSS as its object (switch plate,
   dial, card, clock, chalkboard…). Use real form elements (checkbox, range, select, text, time, button, output,
   contenteditable). Mark one text field `data-hic-edit` and one button `data-hic-click`. Bind them in `ready(D)`: `D.on`,
   `D.setLight`, `D.light(id).power/color`, `D.tint`, `D.flame`, `D.spring`, `D.animate`, `D.mover`, `D.sfx`.
6. **Lift**: a shaft room spanning floors with `Dollhouse.lift(B, R, {key, indicator, names, car, mass})`, a vertical range with
   `data-thumb`, an `<output>` indicator.
7. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --act idle,lens,plain,room,lift` and a
   `--set` still of the strongest state; score them with the still review in `references/BRIEF.md`. Fix and repeat.
8. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `all checks passed`. It runs at `#nointro&q=.5`; one
   check at a time on a loaded machine.

## Rules
- **Design for the topic.** Building, rooms, props, controls, wording, CSS, palette and sounds are new for each topic. Do not
  reuse the townhouse or the bakery unless the topic is exactly theirs, and never rebuild the source's hotel.
- **One style.** Front-on cutaway at night on a plinth; lit rooms with shadowed lamps; peg dolls and turned props; the same
  renderer and post. A new prop uses the same materials and patterns; a new control is styled as a physical object.
- **The page stays real.** Every interactive object is a real control (`input`, `select`, `textarea`, `button`, `output`,
  contenteditable) that clicks, types, tabs and is found with ⌘F. No control is painted in a shader. Text in the scene that is
  not a control is an `<output>` or a contenteditable element, not a texture.
- **What you see is what you click.** Each control is placed for hit testing by its homography (`S.place` with a 3D matrix);
  under the lens and on the plain sheet the twins take the clicks. `check.mjs` proves every control and every twin.
- **One object, one control.** A control is drawn where its object is, at a size you can hit (≥ 0.45 m wide at the default
  view), never hidden behind a prop, never overlapping another control.
- **Upload only on paint.** Only the elements the paint event names are uploaded. Programmatic changes go through
  `D.touch(key)` so the twin follows.
- **Weight sets timing.** Every spring is chosen for its thing: dough rises slowly with no bounce, a fan spins up and coasts,
  a light lift is quick with a small carry past the floor, a heavy one slower. Lights fade on fast and off slower.
- **Alive at rest.** Dolls breathe (a quick in-breath, a longer out-breath), sway over their base and shift weight on unrelated
  periods; heavier dolls slower. Fires flicker. Nothing breathes with a plain sine in lockstep.
- **Deterministic.** Scatter with `HIC.rng`; `#still=<s>` freezes time (only `advance()` moves the world on); two loads match.
- **Sound** is synthesised, off until the Sound button. **No network**: system fonts, no CDN.
- **Phone width.** At 390 px nothing scrolls sideways; the building fits the width; the buttons wrap.

## Contract (what a page exposes)
- `Dollhouse.start(cfg)` returns `D` (also `window.__hic.dh`); `window.__hic.ready` after the first upload and the hit-test probe;
  `window.__hic.screenOf(el)` (where any control or twin element is on screen, as placed now).
- `D.advance(seconds)` (simulated time, then one frame), `D.setPlain(bool)`, `D.lensTo(key)`, `D.view(roomId)`,
  `D.roomRect(id)`, `D.project([x,y,z])`, `D.screenAt(el, x, y)`, `D.state()`, `D.panels`, `D.rooms`, `D.lights`, `D.movers`.
- Hash: `#still=<s>`, `#calm`, `#fallback`, `#nointro`, `#q=<scale>` (render scale), `#lens=<key>|off`, `#plain`, `#view=<room>`,
  `#lift=<stop>`, `#dark=<light,…>`.
- The config object: see `references/ENGINE.md`.
