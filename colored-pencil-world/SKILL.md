---
name: colored-pencil-world
description: Make a walkable 3D world drawn in coloured pencil on a sketchbook page, and a film of someone walking through it — every surface shaded in strokes of its own pencil that follow its form and stay on it as the eye moves (they never swim), light laid as a touch of warm yellow and shade as a second blue-violet pencil crossed over the first, the paper's tooth breaking every layer into flecks of white, a soft graphite outline round each thing found from depth, water that mirrors the housefronts in broken ripples, clouds left as bare paper, the drawing fading out to an unfinished torn edge and a handwritten caption in the corner. three.js in a browser page, everything made in code (no models, no textures, no AI image model). Outputs a live page that plays the film in a loop and lets you take over and walk (W A S D, drag to look), and a 1920×1080 MP4 rendered frame by frame. Give it a topic — a place, an hour, a season, who walks there — and it designs the light, the town or land, the houses, trees, water and small things, the walker and the shots, in this style. Use when asked for a coloured-pencil / colored pencil / crayon / hand-drawn / storybook 3D scene or game look, a sketchbook world, a "walking through a drawing" clip, a drawn town that moves, or "이 스타일로 ○○ 만들어줘" / "주제만 바꿔서" ("색연필로 그린 3D 세계", "색연필 그림 속을 걷는 영상", "스케치북에 그린 마을", "손그림 같은 게임 화면", "색연필 풍 마을 걷기", "동화책 같은 3D 장면", "colored pencil game", "coloured pencil world", "sketchbook town", "hand-drawn walk"). Source — made from https://x.com/BlendiByl/status/2121130385723789637?a=s7WiEBvN2S0iOCmb8w4&s=19 and its open-source project https://patch.gg/blendi/coloured-pencil.
---

# colored-pencil-world

A world you can walk through that is a coloured-pencil drawing all the way down. Nothing is a photograph run through a
filter: every surface carries the directions its strokes run in, so its pencil marks belong to it and stay put as it
and the eye move. Colour is laid in layers on white — a little warm yellow where the sun falls, the thing's own colour
lightly all over, more of it in strokes pressed harder into the shade, then a blue-violet shadow pencil across those —
and the paper's tooth shows through all of it. A soft graphite line goes round each thing, the water mirrors the
fronts in broken ripples, clouds are paper left bare, and toward the edges the drawing gives way to the unfinished
sheet with a caption in pencil handwriting. A walker goes along a way through it; the eye follows, waits on the far
bank as they pass, looks up from the water. Give it a topic ("a canal in October", "a farm track at noon", "a mountain
village after snow", "the road to my school") and it writes a brief, designs the light, the place, every house and
tree, the walker and the shots, and renders it.

Made in this repo from the post by Blendi (@BlendiByl) on X — https://x.com/BlendiByl/status/2121130385723789637?a=s7WiEBvN2S0iOCmb8w4&s=19
("i used fable 5.2 to make this beautiful 'colored pencil' game slice ✏️ every surface shading, and the whole town, is
pure code. Open source!") — and the project he open-sourced with it, **Coloured pencil**
(https://patch.gg/blendi/coloured-pencil, code MIT © 2026 Patch). The pencil shader (`lib/pencil.js`), the page pass
(`lib/page.js`) and the soft solids (`lib/shape.js`) are adapted from that project's `src/pencil.js`, `src/page.js` and
`src/shape.js` (licence in `lib/LICENSE-coloured-pencil`; what was taken and what changed is in `references/SOURCE.md`).
Everything else is this skill's: a seekable engine (a frame is a pure function of `t`, so the same page plays live and
renders to MP4), a kit that builds a sky, far ranges, ground, paving, water, houses and rows of them, trees, props,
fences, walls, decks and bridges, bunting, boats, birds, falling leaves and smoke from options, a walker made and walked
in code (no model, no clips, no physics), a checker and a renderer. The source's harbour — the quay of painted houses,
the pier, the lighthouse, the sailor in the red beret — is its own; **never recreate it**. The template (a farm track
between sunflowers and wheat) and the worked example `examples/canal-october` 「Canal in October」 (20 s, 5 shots) are
new topics designed from a brief.

**Fixed (the style)** — everything is drawn with the pencil material: strokes along the level lines of each piece's
two fields, kept ~4.6 px apart by whole octaves (never swimming); colour in four layers on white paper (warm light,
own colour all over, own colour in strokes into the shade, a shadow pencil crossed over); the paper's tooth breaks every
layer; a graphite contour from depth; flecks of bare paper; the drawing fades to an unfinished, torn margin; a
handwritten caption on the sheet; things are soft, slightly kneaded solids — nothing flat or sharp; clouds and sun
glints are paper left bare; water is drawn level in one direction and mirrors fronts; one hour of one day; a walker on a
way; 1920×1080 at 30 fps; no sound.

**Designed per topic** — the hour, season and weather (where the sun is, the sunlight and shadow pencils, the sky's
blues and clouds, the wind); the place (land, water, the way); every thing in it and its pencils (which houses, in
which colours, with what roofs, windows, shops, balconies; which trees and in what season; what small things; boats,
birds, leaves, smoke); the walker (build, clothes, hair, hat, what they carry and in which hand); the shots; the
caption; the length. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/pencil.js` | the pencil (adapted, MIT): `PENCIL` (GLSL: `pcTooth`, `pcStrokes`, `pcDraw`), `createPencil` (line · both · flat materials, the world's sunlight and shadow pencils), `field` / `fieldBy` (which way strokes run), `hue` (a piece's pencil), `createBatch`, `merge` |
| `lib/page.js` | the sheet (adapted, MIT): contour from depth, paper tooth and flecks, the unfinished torn margin, the paper's colour, the handwritten caption |
| `lib/shape.js` | soft solids (adapted, MIT): `ball`, `block`, `turned`, `roll`, `arched`, `prism`, `knead`, `put`, `weld` |
| `lib/world.js` | the engine: `World` — light, pencils, page, `way`, `land`, `add(thing)`, `figure`, `shots`, `check`, `start`; `walkAt(t)` / `camAt(t)` / `renderAt(t)`; `standAt` (decks and bridges); `runChecks`; `showCast`; the live player with walking; `noise`, `fbm`, `rng`, `sm`, `lerp`, `tone` |
| `lib/kit.js` | what a world is made of: `sky` · `ranges` · `ground` · `paving` · `water` · `house` · `row` · `trees` (round, cypress, poplar, pine, fir, bush, bare, fruit) · `props` (lamp, bench, barrel, crate, pot, bollard, cafe, stall, post, hay, well, sign, cart) · `fence` · `wall` · `deck` (piers, boardwalks, plank or stone bridges) · `bunting` (flags or washing) · `boats` · `birds` · `flecks` (leaves, petals, snow) · `smoke` · `make` (a thing of your own) |
| `lib/figure.js` | the walker: `Figure` (body from soft pieces, feet planted on the way, two-bone IK legs, arms, lean, head with a face; hair, hats, stripes, skirt or shorts, coat and scarf as cloth, satchel, carried things), `LIM` (joint ranges), `audit()`, `cast()` |
| `lib/three.module.min.js` | three.js r170 (MIT, `THREE-LICENSE`) · `lib/fonts/Caveat-500.woff2` (the caption's hand, OFL, `OFL-Caveat.txt`) · `lib/LICENSE-coloured-pencil` (MIT © 2026 Patch) |
| `templates/` | `world.html` (12 s, 3 shots: a sunflower track to a red barn, steps ①–⑧ commented), `BRIEF.md` (the empty brief) |
| `examples/canal-october/` | the worked example: `BRIEF.md`, `index.html` (20 s, 5 shots) |
| `scripts/new-world.mjs` | start a project from the template or `--from canal-october` |
| `scripts/check.mjs` | proves the page: loads clean, the world's rules, every film and cast pose inside the joint ranges, nothing undrawn, no black, has colour, moves, deterministic |
| `scripts/render.mjs` | stills, the contact sheet, the cast sheet, a preview, the MP4 (workers) |
| `references/` | **BRIEF** (topic → brief, the two reviews) · **LOOK** (what makes it read as coloured pencil, observed from the source) · **KIT** (every maker and its options) · **FIGURE** (the body, its ranges, the cast sheet) · **SOURCE** (what came from Coloured pencil) · **LESSONS** |

## Project layout (what you create)
```
my-world/
  BRIEF.md      the topic written out (references/BRIEF.md) — written first
  world.html    new World({...}) → W.way → W.land → W.add(kit.…) × n → W.figure → W.shots → W.check → W.start()
  lib/          copy of the skill's lib/ (new-world.mjs); the page imports it through an import map ("cpw/")
  out/          stills, sheets, world.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs world.html --sheet --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. With a GPU the live page runs in
real time. A film renders on the CPU (SwiftShader): measured here, 1.5–2 s a 1080p frame for the template (2.1 M
vertices) and 2.7–4 s for the canal example (4 M vertices); the 20 s example took 29 minutes with 3 workers on 4 cores (2.9 s a frame of wall time).
The MP4 is large because the paper's tooth is detail in every pixel: 40 Mb/s (101 MB for 20 s) at CRF 22 — use
`--crf 28` or higher for the web, and never commit an MP4.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` (new-world.mjs does) and fill it from the user's topic before any code
   (references/BRIEF.md says how): the picture in one line, the hour and the light, the place and the way, every thing
   with its pencils, the walker, 3–7 shots, the caption. If the user gives a reference image or clip, read its light,
   palette and what is in it (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=4x4 sheet.jpg`) — then design your own place.
2. **Start**: `node <skill>/scripts/new-world.mjs my-world` (or `--from canal-october`). Replace the template's ①–⑧.
3. **Light, way, land** (references/KIT.md → World). A low or slanting sun (20–40°) to one side gives each thing a lit
   face and a shaded face for the shadow pencil to cross; noon is flat unless the topic is noon. Draw the way, then the
   land's height (cut a canal or a shore below the water's level; keep quays and streets level).
4. **The world** — `W.add(kit.…)` far to near: `sky`, `ranges`, `ground`, `water`, `wall` / `paving`, `house` / `row`,
   `deck`, `trees`, `props`, `fence`, `bunting`, `boats`, `birds`, `flecks`. Every colour is a pencil: clear, fairly light,
   the colour the thing is in the light — the drawing deepens it toward the shade and crosses it with the shadow pencil.
   New kinds of thing: `kit.make(W, name, fn)` with `shape.js`'s soft pieces — in the project, without touching `lib/`.
5. **The walker** (references/FIGURE.md): `new Figure({...})` — height, clothes, hair, hat, what is carried and in which
   hand, colours by part. Then the **cast sheet**: `render.mjs world.html --cast --scale .5` and score it against
   references/FIGURE.md (front / back / left / right agree, the face shows from the front, knees fold back, elbows
   forward, the carried thing is in the right hand in every view). Fix before writing shots.
6. **Shots** (references/KIT.md → Shots): 3–7 of 2.5–7 s. Each says how far they walk (1.2–1.8 m/s is a walk) and
   where the eye is: behind them, on the far bank as they pass, low over the water, on a bridge, in front.
7. **Check**: `node <skill>/scripts/check.mjs world.html` must end with `check OK`. Read the warnings; fix or accept on
   purpose. Add `W.check(name, fn)` for the piece's own rules (it crosses on the bridge; the water mirrors the fronts).
8. **Contact sheet and stills**: `render.mjs world.html --sheet --scale .5`, then 3–5 moments full size (`--stills`),
   scored against the still review in references/BRIEF.md. Fix and re-render until it passes; write the result at the
   bottom of `BRIEF.md`.
9. **Motion**: `render.mjs world.html --preview` and watch it — feet, coat and scarf, the eye's moves, flags, leaves.
10. **Render**: `render.mjs world.html` → `out/world.mp4`. Look at frames from the MP4 before handing it over.
11. **Live page** (if it goes on a site): ship `world.html` with its `lib/`. It loops the film; W A S D or the Walk button
    hands the walker to the viewer.

## Rules
- **Design for the topic.** The place, the hour, the houses and their colours, the trees and season, the walker and the
  shots are chosen for this topic. Do not reuse the sunflower track or the canal unless the topic is exactly theirs, and
  never recreate the source's harbour (its quay of painted houses, pier, lighthouse, sailor in a red beret).
- **One style.** Everything is drawn with the pencil material (or the kit's sky and water, which use the same pencil
  functions). No photo textures, no glass, no glow, no smooth gradients, no hard black outline drawn as geometry — the
  outline comes from the page pass. If a thing needs one of those, draw it in strokes or leave it out.
- **Colours are pencils.** Each thing's colour is the pencil it is drawn with: clear and fairly light. Shade comes from
  the drawing (more pressure + the shadow pencil), never from a darker colour you chose; black is never a pencil (iron is
  a slate blue-grey, `#2f3a44`).
- **Strokes belong to things.** Give every piece a field (`field(g, a, b)`, the kit does it) in world or part space;
  never compute stroke directions from the eye. A moving piece carries its own field (the walker's parts, the cloth).
- **Soft, not sharp.** Build from `shape.js` (rounded blocks, balls, turned and rolled pieces, kneaded a little). Sharp
  boxes make ruled contour lines that read as CAD, not drawing.
- **One hour of one day.** The sun does not move. A second hour is a second film.
- **Pure function of t.** No `Math.random`, `Date` or state kept between frames: things are scattered once with a seeded
  `rng`, and everything per frame comes from `t` (wind, water, flags, boats, birds, leaves, the walk). `check.mjs` proves it.
- **The body is possible.** Feet are planted, knees fold back, elbows forward, every joint inside `LIM`; the cast sheet
  is rendered and scored for every new walker; a carried thing stays in its hand; the face is not hidden by the hat.
- **The walker is in the picture** and inside the finished part of the page (the margin fades out), never in the water
  (a bridge or pier is a `deck`), never through a wall, tree or lamp.
- **The caption is the only text.** One short line in lower case, written on the sheet (`caption` or per shot); no other
  words in the picture.

## Contract every world page fulfils
`window.seek(t)` draws frame t (seconds) and pauses the live loop; `window.renderAt(t)` the same without pausing;
`window.DURATION`, `window.FPS` (30), `window.SIZE = {W, H}`, `window.shotAt(t)` (`{i, name, lt, p}`),
`window.runChecks()` (`{fail, warn, info}`), `window.showCast(i)` (pose i of the cast sheet → its label, null past the
end), `window.film` (the `World`), `window.READY = true` — all set by `W.start()` (after the caption's font is loaded).
The picture is the canvas `#frame`. `?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame; `?scale=.5` =
render size (stroke spacing scales with it, so the picture is the same); `?px=5` = stroke spacing at 1080 lines;
`?walk=1` = start walking; `?off=page,caption,figure,hud,<thing name>`; `?aa=0`.
