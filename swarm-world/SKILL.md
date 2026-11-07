---
name: swarm-world
description: Turn a topic into a "built live by a crew of agent cursors" 3D world clip — a low-poly three.js world (land, sea, fields, towns, forests, a base, a park …) that a labelled crew of 5–16 cursors builds just ahead of a traveller (a little train, a tram, a rover, a boat …) moving along a line. Each thing rises out of the ground as a coral wireframe and turns solid as its cursor reaches it; cursors hop tree to tree, pull houses up and drop roofs on, sweep fields row by row, lay fences and cables, and two of them draw the terrain far ahead while one lays the track; every tag says what its agent is doing ("planting pines 3/5"), coral boxes with handles count the work ("House ×3"), a session HUD counts objects, agents and time, a log keeps a line per finished job, the light moves to golden hour, and at the end the camera rises over the finished world. Drawn entirely in code (no 3D assets, no AI image model); outputs a live page and a 1920×1080 (or 9:16) MP4 with a synthesised soundtrack. Give it a topic and it designs a new world in the same style — brief, line, land, kinds of things, crew, words in any language (Korean included), light and the final shot. Use for "agents building a world" reveals, AI / multi-agent product teasers, "a city being built in front of you", game-world or map reveals, travel and route stories, or "이 스타일로 ○○ 만들어줘" / "주제만 바꿔서" ("커서들이 3D 세계를 짓는 영상", "에이전트들이 마을을 짓는 영상", "기차 앞에서 세상이 지어지는 영상", "swarm build 3D", "agents building a world", "a crew of cursors builds a city"). Source — made from https://github.com/harnoorDev/swarm-build (the 3D part: skills/swarm-build/examples/3d.html).
---

# swarm-world

A 3D world that builds itself in front of you. A little traveller — a steam train, a tram, a rover — sets off along a
line, and a crew of labelled agent cursors builds the world just ahead of it: one lays the track, two shape the ground
far ahead, and the rest pull houses up out of the ground and drop the roofs on, hop from pine to pine, sweep a field of
sunflowers row by row, set a fence along the line, raise a windmill or a dome with a crosshair. Each thing rises as a
coral wireframe and dithers into its solid colours as its cursor reaches it. Every tag says what its agent is doing,
coral selection boxes count the work, a session pill counts objects / agents / time, a log keeps a line per finished job,
the light turns to golden hour, and when the traveller arrives the crew clocks off and the camera rises over the whole
world. Every frame is a pure function of `t`: the same page plays live and renders to MP4.

Made from **harnoorDev/swarm-build** (https://github.com/harnoorDev/swarm-build, MIT © Harnoor Singh) — the 3D part only:
`skills/swarm-build/examples/3d.html`, "a crew of sixteen builds a Three.js world just ahead of a little steam train"
(live: https://harnoordev.github.io/swarm-build/skills/swarm-build/examples/3d.html). The source drives that world from its
DOM cursor engine in real time; this skill re-implements the scene, the scheduler, the cursors, the marks, the HUD and the
log as one seekable engine (`lib/world.js`) so it can be rendered frame by frame, adds a checker, a renderer with sound,
and makes every topic-specific part (line, land, kinds, crew, words, light, camera) data in the page. `examples/valley-line`
is the source's world ported onto the engine (the style's reference); `examples/moon-base` 「고요의 바다 기지」 is a topic the
source does not have, made brief-first (a rover on the Moon, a Korean crew, a black sky, the Earth at the end).
What was taken from the source and how it works is in `references/SOURCE.md`.

**Give it a topic and it designs a new world in this style.** The examples are examples, not a menu:
- **Fixed (the style):** low-poly flat-shaded three.js geometry from primitives (no assets); the build effect (grow from
  the base as a coral wireframe, then dither to solid); a traveller on a line with the build front running just ahead; the
  crew of named cursors (arrow travels, crosshair raises, pen draws) with name + "doing" tags; job types raise / hop / lay /
  sweep and fronts (track, terrain, sea); coral boxes with white handles and "Label ×n" counts, click rings; the session
  pill and the log; the chase camera, the time-of-day shift, the crew clocking off and the rising reveal; the sound.
- **Designed per topic:** the line and its stretches, the land (height and colour), water or none, every kind of thing and
  its geometry and palette, where things stand, the traveller, the crew (names, count, colours, who may do what), every
  word (doing lines, log lines, places, HUD, any language), the sky and light (day → golden hour, or a black sky with
  stars), the camera zones and the final shot, length, any extra (a sky body, a glow, things that move).

## What's in this folder
| path | what |
|---|---|
| `lib/world.js` | the engine: `World` — line and timetable, land / sea / track, kinds and items, jobs (`raise`, `hop`, `lay`, `sweep`) and fronts, the scheduler (each job → the crew member who can start soonest and still beat the traveller), the build shader, the traveller and its dust or smoke, sky / sun / fog / stars / glows, the chase camera and reveal, cursors and tags, construction marks, the session HUD and log, sound events, `audit()` / `runChecks(t)`, the render contract and the live player |
| `lib/kit.js` | the geometry kit: `part`, `merge`, `Box`, `Cyl`, `Cone`, `Ico`, `Dodeca`, `Dome`, `Ball`, `Ring`, `Gable`, `Sail`, `jitter`, `C`; example props (`tree`, `pine`, `rock`, `cloud`, `lamp`, `fence`, `house`, `roof`) |
| `lib/math.js` | seeded `rng`, `noise`, `fbm`, `sm`, `lerp`, `countTo`, `chunk`, `fmt`, `clock` |
| `lib/three.module.min.js` | three.js r170 (MIT, `THREE-LICENSE`) |
| `lib/fonts/` | JetBrains Mono + Noto Sans KR 500 (2,350 common syllables; `hangul-ksx1001.txt` lists them) — OFL, loaded locally |
| `lib/LICENSE-swarm-build` | the source's MIT licence (the build shader, scheduler and glyphs are adapted from it) |
| `templates/world.html` + `BRIEF.md` | a 12 s starter (a tram, an orchard, a village, an observatory), every step commented, and an empty brief |
| `examples/valley-line/` | the source's world on the engine: 16 crew, fields → harbour → summit, 20 s build |
| `examples/moon-base/` + `BRIEF.md` | 「고요의 바다 기지」 made brief-first: a rover, tile road, solar fields, rigs, domes, Korean crew and log, the Earth |
| `scripts/new-world.mjs` | start a project (template, or `--from valley-line / moon-base`) |
| `scripts/check.mjs` | loads clean · fonts hold every string · the schedule (jobs covered, everyone works, built before the traveller, finished by the end) · deterministic · no blank frames · rules at every 0.5 s |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks), `--sfx` for the synthesised sound, `--q size=1080x1920` for a vertical cut |
| `references/` | **BRIEF** (fixed vs per-topic, the brief, the review rubric) · **KIT** (the API) · **LOOK** (what makes it read as the style) · **SOURCE** (the source demo and what came from it) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-world/
  BRIEF.md     the topic designed into a world — written first
  world.html   new World({ … }) → line → land → kinds → items → jobs → fronts → vehicle → camera → start()
  lib/         copied by new-world.mjs (engine, three.js, fonts)
  out/         stills, sheets, MP4s (ignored)
```

## Requirements
Node 18+, Playwright with Chromium (WebGL runs on SwiftShader without a GPU: about 0.5–1 s a 1080p frame), ffmpeg.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` (or let `new-world.mjs` do it) and fill it from the topic before any code
   (`references/BRIEF.md`): the traveller and the line, 3–5 stretches and what stands in each, the crew (names, colours,
   who does what), the words (doing / did / places / HUD, in the topic's language), the sky and light, the final shot,
   length. Pick what the cursors visibly *do* in each stretch — a raise, a hop run, a sweep, a lay — so every stretch has
   a different kind of work.
2. **Start the project.** `node <skill>/scripts/new-world.mjs my-world` (or `--from moon-base` when the topic is close to
   an example). Keep `lib/` as is; everything topic-specific goes in `world.html`.
3. **Build the world in this order** (`references/KIT.md`): `line` → `land` (+ `sea`) → `track` → `kind`s (geometry from
   the kit, sized with `size`, worded with `words` / `say`) → items with `add` (and `claim` / `free` to keep them apart) →
   jobs (`raise`, `hop`, `lay`, `sweep`; groups of 3–5 per hop, sorted with `lined`) → fronts (`terrainFront`, a sea or
   your own) → `vehicle` → `animate`, `glow`, `landmark` / `places` → `sky`, `camera` → `check` rules → `start()`.
   Draw new kinds for the topic; reuse `props` only when the topic has that thing.
4. **Contact sheet first.** `node <skill>/scripts/render.mjs world.html --sheet 12 --scale .5`, then stills at the moments
   that matter (`--stills 3,8,14,25`). Look at them. Fix the camera zones, the lead, crowded tags, the final shot.
5. **Check.** `node <skill>/scripts/check.mjs world.html` until it ends `ok` (warnings are fine to read, failures are not).
6. **Score the stills** against the review in `references/BRIEF.md` (≥ 12/14, no 0). Fix and repeat 4–6.
7. **Render.** `node <skill>/scripts/render.mjs world.html --sfx` → `out/world.mp4` (1920×1080, 30 fps). A vertical cut:
   `--q size=1080x1920 --name world-v`. The live page is `world.html` itself (serve the folder: `python3 -m http.server`).

## Rules
- **Design for the topic, every time.** A new topic gets its own line, land, kinds, crew names and words. Do not reuse
  the valley's sunflowers or the Moon's domes unless the topic has them; never fill a template's slots and call it new.
- **One style.** New kinds are low-poly primitives with flat vertex colours, built with the same shader; the accent
  (coral by default) is the build colour and the marks; the HUD, log, tags, glyphs and camera grammar stay the same.
- **Every cursor is on its work.** A job's cursor point is where the thing is happening *now* (`workPoint`): the top of
  what is rising, the next tree, the row being swept. Never a cursor floating over nothing; a tag always says what.
- **The world is always built just ahead.** Nothing beside the line is still a wireframe when the traveller passes; the
  track front leads by ~20–25 m, things by 30–50 m, the ground by ~80 m. `check.mjs` measures it.
- **Readable at a glance.** 5–16 agents; 3–5 things per hop job; doing lines ≤ ~24 characters; log lines short and literal.
- **Deterministic.** Everything is a function of `t`. Use the seeded `W.rnd / rr / pick` while laying out; in `animate`
  and `onFrame` use only `t` and `p`. No `Math.random`, no `Date`, no state between frames.
- **Only bundled fonts.** Latin and the 2,350 common Hangul syllables; `check.mjs` fails on anything else.
- **Credit the source.** Keep `lib/LICENSE-swarm-build`; the idea and the build shader come from harnoorDev/swarm-build.

## Contract
`world.html` imports `sw/world.js` (an import map points `sw/` at `lib/`), builds a `World` and awaits `start()`, which
sets `window.seek(t)`, `DURATION` (intro 1.2 s + build + outro 7 s), `FPS`, `SIZE`, `runChecks(t)`, `FILM` (the world:
`events`, `log`, `allText()`, `audit()`) and `window.__ready`. The first `<canvas>` on the page is the frame (the 3D
render composited with the marks, cursors, HUD and log). Query: `?render=1` (no live loop), `?t=12` (a frozen frame),
`?scale=.5`, `?size=1080x1920`, `?q=low` (lighter shadows, no MSAA).
