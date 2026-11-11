---
name: oil-paint-world
description: Make a walkable 3D world drawn as thick oil paint, and a film of someone walking through it — every blade, leaf, stone, wall, wave and fold of a coat is a dab of a loaded brush pinned to the world (hundreds of thousands to a million of them), so the paint stays on things as the eye moves; colour is three mixed paints per thing (light, half-tone, shade) chosen stroke by stroke, shade is taken whole dabs at a time, the wanderer's shadow slides over the ground as a glaze, the sun stands in the mist, and the surface has brush relief, canvas weave and varnish. three.js in a browser page, everything made in code (no models, no textures, no AI image model). Outputs a live page that plays the film in a loop and lets you take over and walk (W A S D, drag to look), and a 1920×1080 MP4 rendered frame by frame. Give it a topic — a place, an hour, a season, who walks there — and it designs the light and air, the way, the land, what the world is made of, the wanderer and the shots, in this style. Use when asked for a hand-painted / oil-painting / impasto / painterly 3D scene or game look, a "walking through a painting" clip, a painted landscape that moves, a brush-stroke world, or "이 스타일로 ○○ 만들어줘" / "주제만 바꿔서" ("유화처럼 그려진 3D 세계", "손으로 그린 듯한 게임 화면", "붓 터치로 된 풍경 영상", "그림 속을 걷는 영상", "유화 풍경 속을 걸어가는", "임파스토 스타일", "hand-painted game", "oil paint world", "painterly walk", "brush stroke landscape"). Source — made from https://x.com/BlendiByl/status/2120341251178594532?a=KltytYZPeeW0-pPdgsw&s=19 and its open-source project https://patch.gg/blendi/oil-paint.
---

# oil-paint-world

A world you can walk through that is an oil painting all the way down. Nothing is filtered after the picture is drawn:
every leaf, blade of grass, plank, wave and fold of cloth is one **dab** — a touch of a loaded brush, in one mixed
colour, pinned to a point of the world and turned to lie along a direction of the world (the grain of a trunk, the fall
of a coat). Because the paint is pinned to things, it stays on them as the eye moves. A wanderer walks a way through it;
the eye follows, waits in the grass as they pass, looks up at what stands at the end. Give it a topic ("a sea cliff at
golden hour and a lighthouse", "a spring orchard", "a night market in the rain", "the road to my grandmother's house") and
it writes a brief, designs the light, the land, what the world is made of, the wanderer and the shots, and renders it.

Made in this repo from the post by Blendi (@BlendiByl) on X — https://x.com/BlendiByl/status/2120341251178594532?a=KltytYZPeeW0-pPdgsw&s=19
("this 'hand-painted' game … every frame is about 1.5 million brush strokes") — and the project he open-sourced with it,
**Oil paint** (https://patch.gg/blendi/oil-paint, code MIT © 2026 Patch). The painter in `lib/paint.js` — the dab, the
brush sheet, the ground rings, the pins, the shade and the canvas pass — is adapted from that project's `src/oilpaint/`
(licence in `lib/LICENSE-oil-paint`; what was taken and what was changed is in `references/SOURCE.md`). Everything else
is this skill's: a seekable engine (a frame is a pure function of `t`, so the same page plays live and renders to MP4),
a kit that paints a sky, far ranges, ground, growth, trees, any solid thing, water and what falls through the air from
palettes and numbers, a wanderer made and walked in code (no model, no clips), a checker, a renderer. The source's two
walks — an autumn wood and a snow ridge under the aurora, with a cloaked wanderer — are its own; **never recreate them**.
The template (a spring orchard) and the worked example `examples/lighthouse-path` 「The Lighthouse Path」 (20 s, 6 shots:
a sea cliff, a walker, a lighthouse) are new topics designed from a brief.

**Fixed (the style)** — everything is dabs of the brush sheet's eight marks, pinned to the world; colour is paint, not
light: three mixes per thing (light · half-tone · shade), never tone-mapped, each dab mixed a little differently from its
neighbours (broken colour); shade is taken whole dabs at a time, so a shadow's edge is a ragged line of dabs; the
wanderer's own shadow is a soft glaze over the paint; far things are fewer, larger touches; the ground's dabs lie flat
and never turn with the eye; mist puts distance between one row of things and the next and takes the sun's colour toward
the sun; the room's light rakes the paint's thickness from the upper left; linen weave and a little varnish; one hour of
one day; a wanderer on a way, seen mostly from behind; no text in the picture; 1920×1080 at 30 fps; no sound.

**Designed per topic** — the hour, season and weather (where the sun is, the colour and thickness of the air, the
wind); the way and the land (shape, what covers it and where); every thing in the world and its three mixes (which
trees and what crowns, what grows, what is built, whether there is water, what falls); the wanderer (build, clothes, hat,
what they carry and in which hand, how they move); the shots (where they walk, where the eye is, what each shows); the
length. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/paint.js` | the painter (adapted from Oil paint, MIT): `createShared` (sun, wind, mist, maps), `createBrushSheet`, `dabMaterial` / `dabGeometry` / `dabMesh` (you write `makeDab` in GLSL), `groundRings` (an endless ground in tiles the eye can skip), `dabChunks` (still dabs in squares: unseen skipped, far thinned), `pinDabs` (paint carried on moving parts and cloth), `underpaint`, `createShade`, `createFrame` (sun in the mist, weave, varnish) |
| `lib/world.js` | the engine: `World` — light and air, `way`, `land` (height + four masks, baked), `add(thing)`, `figure`, `shots`, `check`, `start`; `walkAt(t)` / `camAt(t)` / `renderAt(t)`; `runChecks`; `showCast`; the live player with walking; `pal`, `mix3`, `noise`, `fbm`, `rng`, `sm`, `lerp` |
| `lib/kit.js` | what a world is made of: `sky` (strokes, glow, clouds, disc, stars) · `ranges` · `ground` (up to four covers) · `growth` (blades, fronds, flower heads) · `trees` (round, column, cone, flat, bare) · `shape` + `solid` (paint on any mesh: buildings, walls, boulders, a GLB) · `water` · `flecks` (leaves, petals, snow, seed-down) · `dabs` (your own) |
| `lib/figure.js` | the wanderer: `Figure` (body from capsules, feet planted on the path, two-bone IK legs, arms, lean, head; coat, scarf, hat, hair, pack, something carried), `LIM` (joint ranges), `audit()`, `cast()` |
| `lib/three.module.min.js` | three.js r170 (MIT, `THREE-LICENSE`) · `lib/LICENSE-oil-paint` (MIT © 2026 Patch) |
| `templates/` | `world.html` (12 s, 3 shots: a spring orchard, steps ①–⑧ commented), `BRIEF.md` (the empty brief) |
| `examples/lighthouse-path/` | the worked example: `BRIEF.md`, `index.html` (20 s, 6 shots) |
| `scripts/new-world.mjs` | start a project from the template or `--from lighthouse-path` |
| `scripts/check.mjs` | proves the page: loads clean, the world's rules, every film and cast pose inside the joint ranges, no bare canvas, not blown out, moves, deterministic |
| `scripts/render.mjs` | stills, the contact sheet, the cast sheet, a preview, the MP4 (workers) |
| `references/` | **BRIEF** (topic → brief, the two reviews) · **LOOK** (what makes it read as oil paint, observed from the source) · **KIT** (every thing and its options) · **PAINT** (writing `makeDab`; the engine's API and contract) · **FIGURE** (the body, its ranges, the cast sheet) · **SOURCE** (what came from Oil paint) · **LESSONS** |

## Project layout (what you create)
```
my-world/
  BRIEF.md      the topic written out (references/BRIEF.md) — written first
  world.html    new World({...}) → W.way → W.land → W.add(kit.…) × n → W.figure → W.shots → W.check → W.start()
  lib/          copy of the skill's lib/ (new-world.mjs); the page imports it through an import map ("opw/")
  out/          stills, sheets, world.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs world.html --sheet --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. With a GPU the live page runs in
real time; a film is rendered on the CPU (SwiftShader) at about 4–6 s a 1080p frame for ~300,000 dabs in view — the
20 s example takes about 25 minutes with 3 workers on 4 cores. Previews (`--preview`: half size, half the paint) are ~4× faster.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` (new-world.mjs does) and fill it from the user's topic before any code
   (references/BRIEF.md says how): the picture in one line, the hour and the air, where the sun is in the main shot, the
   way and the land, every thing with its three mixes, the wanderer, 3–7 shots. If the user gives a reference image or
   clip, read its light, palette and what it is made of (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=4x4 sheet.jpg`)
   — then design your own place.
2. **Start**: `node <skill>/scripts/new-world.mjs my-world` (or `--from lighthouse-path`). Replace the template's ①–⑧.
3. **Light, way, land** (references/KIT.md → World). Put the sun ahead of the main shot and to one side (things are
   edged with light and shadows fall toward the eye) unless the brief says otherwise. Draw the way, then the land's
   height and its four masks (`r` = the way).
4. **The world** — `W.add(kit.…)` far to near: `sky`, `ranges`, `water`, `ground`, `growth`, `trees`, `solid`,
   `flecks`. Every palette is three mixes: write the shade as a colour (a plum, a deep green, a blue), never grey or
   black. New kinds of thing: build them from `kit.shape` and `kit.solid`, or write dabs of your own with `kit.dabs`
   (references/PAINT.md) — in the project, without touching `lib/`.
5. **The wanderer** (references/FIGURE.md): `new Figure({...})` — height, clothes, hat, hair, what is carried and in
   which hand, palettes by part. Then the **cast sheet**: `render.mjs world.html --cast --scale .5` and score it against
   references/FIGURE.md (front / back / left / right agree; knees fold back, elbows forward; the carried thing is in the
   hand the brief says, in every view). Fix before writing shots.
6. **Shots** (references/KIT.md → Shots): 3–7 of 2.5–7 s. Each says how far they walk (1.2–1.8 m/s is a walk, 3–5.5 a
   run) and where the eye is: behind them, a tripod they walk past, beside them, in front, low in the growth, looking up.
7. **Check**: `node <skill>/scripts/check.mjs world.html` must end with `check OK`. Read the warnings; fix or accept on
   purpose. Add `W.check(name, fn)` for the piece's own rules.
8. **Contact sheet and stills**: `render.mjs world.html --sheet --scale .5`, then 3–4 moments full size (`--stills`),
   scored against the still review in references/BRIEF.md. Fix and re-render until it passes; write the result at the
   bottom of `BRIEF.md`.
9. **Motion**: `render.mjs world.html --preview` and watch it (or pull a strip of consecutive frames) — feet, coat, the
   eye's moves, anything that crawls.
10. **Render**: `render.mjs world.html` → `out/world.mp4`. Look at frames from the MP4 before handing it over
    (`ffmpeg -ss 9 -i out/world.mp4 -frames:v 1 x.png`).
11. **Live page** (if it goes on a site): ship `world.html` with its `lib/`. It loops the film; W A S D or the Walk button
    hands the wanderer to the viewer.

## Rules
- **Design for the topic.** The place, the hour, the things and their colours, the wanderer and the shots are chosen for
  this topic. Do not reuse the orchard or the lighthouse cliff unless the topic is exactly theirs, and never recreate the
  source's autumn wood, its aurora ridge and cabin, or its cloaked wanderer.
- **One style.** Everything is dabs from the one brush sheet, in three-mix palettes, laid by the kit's rules (lying on
  ground and walls, standing for growth, facing the eye for leaves and cloth). If a thing needs glass, a mirror, a glow
  map, a photo texture or an outline, it is not this style — paint it as strokes or leave it out. Light that is light
  (a flame, a lit window, stars) may be additive strokes.
- **Colour is paint.** Choose colours as they should look on the canvas; nothing is tone-mapped. The light mix is not
  white and the shade is not black. One accent, used once or twice.
- **One hour of one day.** The sun does not move and the shade is baked once. A second hour is a second film.
- **Nothing is ordered by the eye.** Paint must not crawl when the eye moves: ground dabs lie flat with their own
  heights, far things are laid far to near, and nothing in a `makeDab` may depend on where the eye is except mist, size
  on the canvas and which side faces it.
- **Pure function of t.** No `Math.random`, `Date` or state kept between frames in a page: things are scattered once
  with a seeded `rng`, and everything per frame comes from `t` (wind, flecks, cloth, the walk). `check.mjs` proves it.
- **The body is possible.** Feet are planted, knees fold back, elbows forward, every joint inside `LIM`; the cast sheet
  is rendered and scored for every new wanderer; a carried thing stays in its hand.
- **The wanderer is in the picture** and small enough to be a figure in a landscape (a quarter to a half of the frame's
  height in a following shot), never cut by the frame's edge unless the shot is about something else (`figure: 'off-screen'`).
- **No bare canvas.** Every pixel is paint: a sky behind everything, a ground under everything, an underpaint under
  every solid. The check counts bare pixels.
- **No text.** Titles and captions belong to the page or the edit, not the painting.

## Contract every world page fulfils
`window.seek(t)` paints frame t (seconds) and pauses the live loop; `window.renderAt(t)` the same without pausing;
`window.DURATION`, `window.FPS` (30), `window.SIZE = {W, H}`, `window.shotAt(t)` (`{i, name, lt, p}`),
`window.runChecks()` (`{fail, warn, info}`), `window.showCast(i)` (pose i of the cast sheet → its label, null past the
end), `window.film` (the `World`), `window.READY = true` — all set by `W.start()`. The picture is the canvas `#frame`.
`?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame; `?scale=.5` = render size (the picture is the same:
dab sizes are in full-picture pixels); `?q=.5` = half the paint; `?walk=1` = start walking;
`?off=shafts,canvas,figure,hud,<thing name>`; `?aa=0`; `?soft=0|1` (CPU shortcuts, on by default without a GPU).
