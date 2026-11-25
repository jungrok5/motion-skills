---
name: nested-world-loop
description: Make an endless one-take three.js film of worlds nested inside each other — a room, a world inside an object in that room, a place inside that world that holds the first room again — so one unbroken camera move goes in and in and arrives where it began, with no cut. Give it a topic (a bottle, a snow globe, a painting, a watch, a book, a jar, a doll's house …) and it designs a new ring of 2–4 worlds, each built from code at its own scale (no models, textures or HDRIs), lit like a film set, with depth of field, and alive on whole cycles per loop. The engine joins the worlds through portals (containment or stencil-masked apertures), times the move by perceived distance so a ×1/400 push feels like one dolly, rescales lights, fog and shadows per pass, and check.mjs proves the loop closes and every hand-off is invisible. Output is a live HTML page and a 1080p MP4 loop. Use for "무한 루프 영상", "세계 속의 세계", "끝없이 줌인되는 영상", "시계 속 미니어처 세계", "병 속 세계로 들어가는 영상", "원테이크 루프", "three.js만으로", "외부 에셋 없이 코드로 3D", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "infinite zoom loop", "world within a world", "nested worlds one take", "Droste loop film", "pure three.js no assets". Source — made from https://x.com/cfenghub/status/2125403596757905720?a=_ZUllhPlhe0rXEGbREU&s=19, sharing https://x.com/RezAIT00/status/2125285225769164985/video/1.
---

# nested-world-loop

A film that never cuts and never ends: the camera pushes into an object on a desk, flies through the world inside it,
finds a window, a door or a hatch there, goes through — and is back in the room it started in, in the same pose as the
first frame. Each world is a three.js scene built in code at its own scale and in its own units; a **portal** (a
similarity transform, optionally an opening) places the next world inside it, and the last world's portal holds the
first. One HTML page plays it live; `render.mjs` writes the MP4.

Made from the post by CF长风 (@cfenghub) — https://x.com/cfenghub/status/2125403596757905720?a=_ZUllhPlhe0rXEGbREU&s=19 —
sharing Rez (@RezAIT00)'s 20-second film https://x.com/RezAIT00/status/2125285225769164985/video/1 ("a world within a
watch … entirely in three.js, no external assets"): a horologer's bench → the movement → a town under the gears → a
shop window → the bench. `references/SOURCE.md` says what is taken and what is not. Built and proven in this repo on
`examples/lighthouse-bottle` 「병 속의 등대」 — a topic the source does not have.

**Fixed by the skill (the style)**
- One unbroken camera move through a ring of worlds; the loop closes on the first frame; no cuts, fades or titles.
- Every world from code at its own scale: `lib/make.js` geometry, canvas-painted maps, three.js lights. No model files,
  images, HDRIs, fonts or generated media; no network.
- Film light per world (a practical key with shadows, a second light with a reason, a low fill), depth of field focused
  on what the camera looks at, bloom, AgX, grade, grain.
- The camera timed by perceived distance; a ring that shrinks by at least ×8 per loop; every world alive on whole
  cycles per loop; no bodies.
- Output: the live page (`index.html` + `loop.js` + `lib/`) and a 1920×1080 MP4.

**Designed for every topic (never reused from an example)**
- The ring: which worlds, their units and scales, what holds what, how the last returns to the first.
- Each world's place, objects, materials, palette, light and what moves in it.
- The portals (containment or aperture, where, their `bounds`), the camera keys and paces, the look.

## What's in this folder
| path | what |
|---|---|
| `lib/nwl.js` | the engine: `film({ worlds, duration, look, outer, inner })` — the ring, portal transforms, the camera rig (keys joined across worlds, C1, timed by perceived distance), multi-pass render (opaque then glass, stencil apertures, `bounds` hollowing, per-pass light / fog / shadow / reflection rescale, one log depth buffer), the lens (DOF, bloom, AgX, grade, vignette, aberration, grain, bars), the page contract and live player |
| `lib/make.js` | modelling from numbers: `lathe`, `rbox`, `tube`, `ring`, `prism`, `gear`, `instanced`, `scatter`; canvas maps `wood`, `brushed`, `brick`, `cobbles`, `plaster`, `paper`, `dial`, `label`, `windowLights`, `noiseMap`; `mat.*` (metal, wood, ceramic, glass, leather, paint, emissive, water); `envMap`, `lamp`, `spot`, `beam`; `rain`, `dust` (loop-periodic) |
| `vendor/` | three.js r170 module + MIT licence (copied into each project's `lib/`) |
| `templates/loop.js` | the commented skeleton `new-loop.mjs` writes: two placeholder worlds showing the contract, not a look |
| `starter/` | 「액자 속 오두막」 the smallest ring (2 worlds, 2 apertures): runs as it is |
| `examples/lighthouse-bottle/` | 「병 속의 등대」 cabin → sea in the bottle → lantern room → cabin; 24 s, ×1/400 per loop; `BRIEF.md` with its stills review |
| `scripts/new-loop.mjs` | start a project (`--title`, `--from <example>`, `--refresh` re-copies the engine) |
| `scripts/render.mjs` | MP4 (workers × ffmpeg, `--ss` supersampling, `--loops`, `--audio`), `--stills`, `--sheet`, `--seams` |
| `scripts/check.mjs` | the gates (contract, zoom, code-only, pure, loop closes, invisible hand-offs, camera speed, picture floors, brief) |
| `references/` | **SOURCE** · **BRIEF** (form + review) · **PORTALS** (portal kinds, bounds, hand-off traps, ring patterns) · **LOOK** (light, materials, lens, alive) · **LESSONS** |

## Project layout (what you create)
```
my-loop/
  index.html     importmap: three → ./lib/three.module.min.js, nwl/ → ./lib/
  loop.js        film({ …, worlds: [{ id, build(ctx), portal, keys }, …] })
  BRIEF.md       the ring on paper, the seams, the stills review
  lib/           nwl.js, make.js, three.module.min.js, three.LICENSE (from new-loop.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run scripts from the project's parent: `node <skill>/scripts/check.mjs my-loop`. To watch it live:
`(cd my-loop && python3 -m http.server)` → http://localhost:8000/ (click / space pauses, ← → jump, `?debug=1` shows the
world, τ, perceived speed and stencil levels; `?t=7.5` freezes a moment; `?only=0,1` draws only some passes).

Requirements: Node + Playwright Chromium (SwiftShader WebGL, no GPU needed), ffmpeg, Python 3 only to serve the page.

## Workflow
1. **Topic → brief.** Find the ring (references/BRIEF.md, PORTALS.md "Patterns"): the container in the first world,
   the way back in the last. Write `BRIEF.md` from the form: the ring table (units, light, what moves, portals), worlds,
   seams with their `bounds`, camera, tech-demo risks.
2. **Start**: `node <skill>/scripts/new-loop.mjs my-loop --title "제목"` (or `--from lighthouse-bottle` to study one —
   then replace everything; an example is not a template).
3. **Build each world alone first.** Its geometry in its own units with `make.js`, its env map, its key / second / fill
   lights, what moves (`ctx.tick`, `ctx.angle(t, n)` — whole cycles). Look at it with `?only=0&t=…`.
4. **Place the portals.** From one matching point (PORTALS.md): `at = P_this − s · R · P_next`, written in a comment.
   Containment: shape the inner world to the container's hollow. Aperture: cut a real hole, leave nothing behind it.
   Give every portal `bounds`.
5. **Key the camera.** 3–6 keys per world; the first is the entry pose; a key just before each opening aimed through it;
   `look` on the subject; `pace` to linger; `up` when looking straight down. No times — `film({ duration })`.
6. **Check**: `node <skill>/scripts/check.mjs my-loop` must end `all checks passed` (the review row may come after 7).
7. **Look**: `render.mjs my-loop --sheet 12` and `--seams` at full size; fill the stills review in BRIEF.md; fix; repeat.
8. **Render**: `node <skill>/scripts/render.mjs my-loop` → `out/my-loop.mp4` (`--loops 3` for a longer post,
   `--audio track.wav`). Look at a contact sheet of the MP4.

## Rules
- **Design per topic.** A new topic gets its own ring, worlds, portals, light and keys. Never re-skin the example's cabin,
  bottle or lantern, the starter's painting, or the source's watch and town.
- **One style.** Every world in the same grammar: code-made, film-lit, depth of field, alive; one camera that never
  cuts. A world that would need a different look (flat, toon, pixel) belongs to another skill.
- **Code only.** No model files, images, HDRIs, fonts, video or audio fetched; no generated motion or media (this skill
  is code-only: references/MOTION-QUALITY.md's generated-reference path does not apply). check.mjs fails a fetch.
- **No bodies.** People and animals are implied, never animated (a lit window, an open book, a boat's lamp). A topic that
  needs a walking figure goes to a skill with a rig.
- **The loop closes.** Everything that moves makes whole cycles per loop (`ctx.angle`, `ctx.cycle`); a pure function of
  `t` (seeded `rng`, no `Math.random`, `Date`, timers). check.mjs compares frame(DURATION) with frame(0).
- **Worlds within worlds.** The ring shrinks by ≥ ×8 per loop. Each world has its own light and its own reason to exist.
- **Portals are honest.** Inner worlds fit their containers; apertures are real holes with nothing behind them; every
  portal has `bounds`. A hand-off you can see is a bug in the portal, not something to hide with blur.
- **The camera is one move.** Perceived speed never stalls (< 30 % of median) or rushes (> 2.6 ×); no keys with times
  unless the brief says why.
- **Light is placed.** A practical key with shadows, a second light with a reason, a low fill; nothing round a light
  casts; reflections from an `envMap` per world.
- **Look before you finish.** The stills review in BRIEF.md is filled from rendered sheets, with seams checked.

## Contract
`index.html` with the importmap; `loop.js` calls `film({ title, size: [1920, 1080], fps, duration, look, outer, inner,
worlds })`. Each world: `{ id, background, build(ctx), portal: { at, scale, rot, aperture, bounds }, keys: [{ pos, look,
fov, bokeh, pace, up, roll, exposure }] }`; `ctx` = `{ THREE, renderer, root, scene, rng, tick(fn(t, cam)), angle(t, n),
cycle(t, n), DURATION, FPS }` — add everything to `ctx.root`, set `ctx.scene.environment` / `ctx.scene.fog`.
The page sets `window.seek(t)`, `DURATION`, `FPS`, `SIZE`, `filmInfo()`, `__nwl` (`cam(t, off)`, `renderAt(t, off)`,
`seams`), `__ready`. Query: `?render=1` (no player), `?t=`, `?scale=`, `?ss=`, `?debug=1`, `?only=`.
