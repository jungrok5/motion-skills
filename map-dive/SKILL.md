---
name: map-dive
description: Make a 3D map dive film of any place in three.js — the region (country, province, island, city, campus, a fictional land) floats on a pastel sky as a thick toy map slab with painted names, rivers and roads and oversized landmark miniatures, then the camera dives into it, crossfading with a zoom blur into close-up stages (a coast with a volcanic cone, a waterfall valley, a city grid around a landmark with a pin label), rises back, and can let the city fall into night (glowing roads, lit windows) before ending on the map at night. Give it a place and it designs the outline, colours, landmarks, dives and timeline for that place. Outputs a live page and a 1920×1080 MP4 with a generated score. Use when asked for a 3D map animation, an isometric / toy / diorama map of a region, a map zoom-in or fly-in video, a #30DayMapChallenge piece, a "map that dives into the city" or a region intro video ("3D 지도 영상", "지도 다이브", "지역 소개 영상", "섬을 3D 지도로", "지도에서 도시로 줌인", "이 스타일로 ○○ 지도 만들어줘", "장소만 바꿔서", "3D city map video", "toy map fly-through", "isometric map animation", "zoom into the map"). Source — made from https://x.com/brunoclz/status/2118516873969156343?a=w1T37TSovDciCAuqSPU&s=19.
---

# map-dive

A film of one place in the style of a 3D toy map: the region's outline extruded into a floating slab (painted top, grass
lip, terracotta soil sides, or sea slabs with painted shallows), names painted lying on the map, chunky oversized
landmarks, pink clouds, a pastel sky — and a camera that **dives** into the map, crossfading with a zoom blur into
close-up stages drawn at other scales (a coast and a crater, a valley and a waterfall, a city grid around a landmark with a
pin label), **rises** back out, and optionally lets the city fall into **night** (warm road glow, lit windows, lamps)
before a dissolve to the map at night. Every frame is `seek(t)`, so the same page plays live and renders to MP4.

Made from Bruno César's #30DayMapChallenge post on X (https://x.com/brunoclz/status/2118516873969156343?a=w1T37TSovDciCAuqSPU&s=19,
Nov 2026: a 33 s 3D map of Paraná, Brazil — a floating toy state map with landmark miniatures that dives to the Iguaçu
falls, Itaipu dam and Curitiba, where the city turns to night). Only the form is borrowed — the floating slab, painted
names, toy landmarks, dives between scales, night falling on the city; the code, the props and every place are this
repo's own. Worked example: `examples/jeju` 「제주」 (30 s): Jeju Island → Seongsan Ilchulbong → back over the island → Jeju
old town around Gwandeokjeong falling into night → the island at night. three.js r170 is vendored in `lib/` (MIT).

**Fixed in every film (the style)**: the floating toy slab with visible sides on a pastel sky and pink clouds · soft
daylight, no tone mapping · names painted lying on the map, white-pill pin labels only in close-ups · oversized chunky
landmark toys · dives/rises as same-yaw crossfades with zoom blur between stages at different scales · close-ups as
stylised maps (painted ground + 3D canopies/buildings, apron, haze) · optional night with warm glow · title on the
opening map, credit at the end · 1920×1080, 30 fps, 20–40 s.

**Designed for each place**: the outline and its scale, sea or no sea, the ground-colour gradient, rivers, roads and
names, which landmarks (kit props or new ones), which 1–3 places to dive into and what each close-up contains, the camera
path and timing, whether night falls, every word, the music.

## What's in this folder
| path | what |
|---|---|
| `lib/dive.js` | the engine: `Film` (stages, shots, crossfades + zoom blur, titles, checks, cues, live player), `Stage` (sky, sun, haze, night, pin labels, glow dots), `projector`, outline helpers, noise, camera keys |
| `lib/land.js` | `island` (the floating map slab + painted sea), `terrain` (height field + painted ground + canopies + water + apron), `city` (street grid, instanced buildings with night windows, lamps, far-city apron), `Painter` |
| `lib/kit.js` | toy props: `mountain crater waterfall dam tower lighthouse pavilion turbine statue stadium bridge dome houses trees animals skyline cloud plane boat` + `group/part/mat` to make your own |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/film.html` | a commented 14 s two-stage film of a made-up region (map → waterfall valley → map), with `fonts/` |
| `templates/BRIEF.md` | the brief form, copied into each project |
| `scripts/new-film.mjs` | start a project: `lib/`, `film.html` (template or `--from jeju`), `fonts/`, `BRIEF.md`, `out/` |
| `scripts/fonts.mjs` | subset "Map Sans" (Noto Sans KR/JP/SC) for exactly the film's text → `fonts/` (network once) |
| `scripts/render.mjs` | stills (`--stills 2,9`), a contact sheet (`--sheet 8 --from 5 --to 7`), or the MP4 (workers × ffmpeg; `--audio`) |
| `scripts/check.mjs` | proves the page: loads clean, fonts cover the text, deterministic, no blank frames, every rule at every 0.25 s |
| `scripts/score.mjs` | a WAV score from the film's cues: pad + plucks, darker at night, whooshes on dives, chimes on pins |
| `references/` | **BRIEF** (topic → brief, review criteria) · **LOOK** (numbers that make the style) · **KIT** (API, your own prop) · **LESSONS** |
| `examples/jeju/` | the worked example with its `BRIEF.md` and `fonts/` |

## Project layout (what you create)
```
my-place/
  BRIEF.md       the design, written first (templates/BRIEF.md)
  film.html      Film.create → stages (L.island / L.terrain / L.city + K.props + labels) → shots → titles → F.start()
  fonts/         fonts.css + subset woff2 for the film's text (fonts.mjs)
  lib/           copy of the skill's lib/ (new-film.mjs); imported through the import map
  out/           stills, sheets, score.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --stills 2,9 --scale .5`. To view the
page live, serve the folder (`python3 -m http.server`) — it is an ES module; the scripts pass Chromium the flag for file://.

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg; network once for `fonts.mjs`. No npm install. On a CPU-only box
a 1080p frame takes ~1.7–2 s with 4 workers (30 s ≈ 30 min); half-size stills take well under a second to two seconds.

## Workflow
1. **Place → brief.** Write `BRIEF.md` from `templates/BRIEF.md` following `references/BRIEF.md`: the outline (lon/lat points
   traced from a map, projector centre and km per unit), the ground gradient, rivers, roads, names, 4–8 landmarks, 1–3
   dives with their scales and contents, the timeline, every string, the sound. Design for this place — never fill the
   template's or the example's slots with new names.
2. **Start**: `node <skill>/scripts/new-film.mjs my-place` (or `--from jeju` to study a full film).
3. **The map stage.** Outline (`projector` + `smoothLoop`), `L.island` with `base` and `paint`, then landmarks with the kit
   (write new props in the page when the kit has none — `references/KIT.md`), life, clouds. Run `fonts.mjs` once the
   names exist. Still at the opening: `render.mjs film.html --stills 2 --scale .5` — outline right? names readable and not
   overlapping? sides visible? Add `S.check(...)` for placements that matter (landmarks on land).
4. **Each close-up stage.** Decide the scale, write `height`/`base`/`paint` for `L.terrain` (or `L.city`), the landmark,
   the pin label, an apron. Keep the square's edges near the apron height and sea floors below the water level. Still it
   on its own with a temporary shot.
5. **Shots.** Map: slow orbit → move over the dive point → `dist` ≈ 0.8–1, elev 55–62°. Close-up: overlaps the map shot by
   0.6 s, starts at the matching ground size with the same yaw, keeps zooming in, settles, slow orbit, pin label after it
   settles. Rise back the same way, or dissolve. Night with `ramp(a, b)` on the stage. Title and credit.
6. **Sheets around every crossfade**: `render.mjs film.html --sheet 8 --from 5.5 --to 6.8 --scale .5`. Same direction of zoom
   on both sides, no edge or hole, no washed-out frames. Then stills of each stage and score them with the review
   criteria; write the results into `BRIEF.md`.
7. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`.
8. **Sound and render** (background): `node <skill>/scripts/score.mjs film.html` → `out/score.wav`, then
   `render.mjs film.html --workers 4 --audio out/score.wav` → `out/film.mp4`. Look at stills from the MP4 before handing it
   over (`ffmpeg -ss 19 -i out/film.mp4 -frames:v 1 x.png`).

## Rules
- **Design for the place.** The outline, colours, landmarks, close-ups and words come from the brief. Do not drag in the
  template's waterfall or the example's crater because they exist; build what the place has.
- **One style.** New props and stages use the same language: chunky Lambert primitives, the painted-map ground, soft light,
  pastel sky, the same label and title styles. No photo textures, no real map tiles, no bloom.
- **Ready-made miniatures, when primitives sell a thing badly** (a fishing boat, a ferry, cows, a tram): a free Polyfork
  low-poly GLB may stand in; its flat facets match the chunky look. Find one at `https://polyfork.dev/api/assets?q=…`.
  Load it with three r170's own loader, `import { GLTFLoader } from 'https://unpkg.com/three@0.170.0/examples/jsm/loaders/GLTFLoader.js'`,
  with a top-level `await` before `F.start()`. Give every mesh `K.mat('#ffffff', { vertexColors: true })` so the kit's light
  falls on it, and place it with `K.group(stage, { at, s, rot }).add(model)`. Models come in real metres, so `s` brings them
  to the toy size of the kit's own pieces (≈ 0.06–0.12 on the region map). Commercial use is fine; never copy a model's
  `.mjs` source into the project, and a GLB kept in the project keeps its credit line (the asset's `credit` field). More:
  https://github.com/jungrok5/motion-skills/blob/main/references/3D-MODELS.md
- **Pure function of t.** No `Math.random`, `Date` or state between frames — `rng(seed)` at build time, `hash`, `noise`;
  animate in `S.onFrame(t => …)`. `check.mjs` catches violations.
- **The slab shows its sides.** Opening elev 36–44°; the land stands above any sea slab; never hold a straight-down view
  of the map.
- **Readable words.** Painted names ≥ 18 px cap height at 1080p and never on top of each other or under a prop; pin labels
  only after the camera settles; all text through `fonts.mjs` (check.mjs fails on a missing glyph).
- **Dives are honest.** The close-up shows the place the map pointed at, with the same yaw and a matching ground size,
  and both cameras zoom the same way through the crossfade. No hard cuts between scales.
- **No edges.** Every close-up has an apron (cities get the painted far city automatically) and haze; check the first and
  last second of each close-up shot.
- **Check by looking and by numbers**: a still after each step, sheets around each crossfade, `check.mjs` before rendering.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (names of
broken rules), `window.FILM` (the film: `allText()`, `cues()`, `stages`, `shots`), `window.__ready = true` — all set by
`F.start()`. `?render=1` fixed W×H canvas, no live loop; `?t=12` one frozen frame; `?scale=.5` preview size; `?msaa=0`;
`?off=blur,shadow,labels,hud,glow` switches a part off. The live page fits the window and loops; drag sideways to scrub,
click or space pauses, ← → jump a second.
