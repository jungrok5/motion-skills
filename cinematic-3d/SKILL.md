---
name: cinematic-3d
description: Make short cinematic 3D shots and films in the look of stylised "Blender-style" renders — night streets in rain or snow, a skyline sinking into fog, golden hour reflected in a puddle — with simple low-poly shapes made to read as photographs by light and lens - wet reflections, height fog and the glow of every lamp in it, raymarched clouds, rain and snow that defocus on their own, depth of field, bloom, AgX tone mapping and film grain. Built with three.js in a browser page per shot, rendered frame by frame to a portrait 1080×1920 MP4 with ambient sound. Use when asked for a cinematic / atmospheric / moody 3D video, a "render" of a city scene, weather, night or golden-hour shot, or to recreate a reference image as a moving shot ("시네마틱 3D 영상", "3D 렌더 느낌 영상", "비 오는 밤 영상", "눈 오는 거리", "안개 낀 도시", "이 이미지처럼 영상 만들어줘", "cinematic 3D", "Blender-style render video", "moody night scene", "make this image move").
---

# cinematic-3d

Short cinematic shots that look like stylised 3D renders: geometry stays simple (boxes, lofted shells, procedural trees), and
the picture is carried by a fixed photographic pipeline that every shot goes through — HDR render with MSAA, height fog computed
in every material, single-scatter glow of every lamp, a planar mirror for wet ground and puddles, raymarched cloud volumes,
rain and snow particles that defocus by their own depth, physically-based depth of field, bloom, AgX, a grade, vignette,
chromatic aberration and film grain. One HTML page per shot (`seek(t)`), rendered deterministically with Playwright + ffmpeg
into 1080×1920 MP4s, joined into a film with dissolves and an ambient sound mix.

Built in this repo on the worked example `examples/four-weathers` 「Four Weathers」 — four 7 s shots (a downtown sunk in fog at
blue hour, a red tram in the rain, a brownstone street after snowfall, a clock tower in an autumn puddle) recreating a set of
reference renders (`references/LOOK.md` has the analysis). three.js r170 is vendored in `lib/` (MIT, `lib/THREE-LICENSE`).

## What's in this folder
| path | what |
|---|---|
| `lib/cine.js` | the engine: `Film` (renderer, camera, `lamp()`, `mirror()`, `addPrecip()`, `onFrame()`, `start()`), the passes (atmosphere, bloom, DOF, precipitation, finish), `wetMaterial`, the patched fog chunks, seeded `rng`/`noise1`/`ease`, debug switches |
| `lib/kit.js` | props: `sky`, `facadeMaterial` (procedural windows, punched or curtain wall), `building`, `stoneMaterial`, `tree` (+ ribbon twigs), `streetLamp`, `wire`, `tram`, `car`, `person`, `dog`, `skyscraper`, `clockTower`, `gabledHouse`, `leafMesh`, geometry helpers |
| `lib/three.module.min.js` | three.js r170 (MIT) |
| `templates/shot.html` | a commented starting shot (wet street, one lamp, rain) |
| `scripts/new-film.mjs` | start a project: copies `lib/`, one page per shot id, `film.json`, `audio/` |
| `scripts/render.mjs` | stills (`--stills 0,3.5,7`, `--scale .5`, `--q pass=atmos`) or the shot MP4 (workers × ffmpeg chunks, joined losslessly) |
| `scripts/contact.py` | contact sheet: every shot at a few times, side by side — look at it before every render |
| `scripts/profile.mjs` | ms per pipeline stage (`?prof=1`) and where a frame's time goes |
| `scripts/mix.py` | one ambience bed per shot → `audio/mix.wav` on the film's timeline (crossfades = dissolves, −16 LUFS, −1.5 dBTP) |
| `scripts/film.mjs` | render missing shots, join with dissolves + fades, mux the mix → `out/film.mp4` + `out/film-share.mp4` |
| `references/` | **LOOK** (what makes the look, reference analysis, numbers) · **KIT** (engine + prop API, recipes per weather) · **LESSONS** (what broke and the fix) |
| `examples/four-weathers/` | the worked example: 4 shots, `film.json`, the ElevenLabs ambience beds actually used |

## Project layout (what you create)
```
my-film/
  film.json            { title, fps, dissolve, fade, shots: [{ id, page, gain? }], audio: "audio/mix.wav" }
  lib/                 copy of the skill's lib/ (new-film.mjs) — shots import it through an import map
  shots/<id>.html      one page per shot: build the scene, onFrame(t) moves it, film.start()
  audio/<id>.mp3       one ambience bed per shot (9 s for a 7 s shot), audio/mix.wav (mix.py)
  out/                 stills, contact sheets, <id>.mp4, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs shots/rain.html --stills 3 --scale .5`.

Requirements: Node + Playwright Chromium (WebGL2; a GPU is fast, CPU SwiftShader works at ~5–12 s per 1080×1920 frame),
ffmpeg, Python 3 with Pillow (contact sheets). Pages load nothing from the network.

## Workflow
1. **Read the reference** (when there is one) the way `references/LOOK.md` does: per image — camera height and lens, where the
   horizon sits, key / fill / practical lights and their colours, fog depth, what is sharp, grain, palette; then **measure** it
   (median and percentiles of luminance per region with PIL). Write the numbers down: they settle "too bright" arguments later.
2. **Plan the shots**: 5–8 s each, one slow camera move each (push, drift, rise, pan with the subject) plus one thing that lives
   (a tram creeping, a walker, leaves falling, fog flowing, a blinking light). Show the plan before building.
3. **Start**: `node <skill>/scripts/new-film.mjs my-film --shots a,b,c`. Build each shot in this order, checking stills
   (`--scale .5`, ~2 s each on CPU) after every step:
   1. composition — camera, horizon, big shapes (`?pass=scene` shows the raw HDR before atmosphere);
   2. light — practicals (`film.lamp` / `K.streetLamp`), key, ambient; lamps with `light: 0` only glow, keep real lights ≤ 6;
   3. atmosphere — fog `start` (clear air in front of the lens), density, colour; lamp `scatter` + `phaseMix` for tight halos;
   4. lens and look — focus on the subject every frame, aperture small (2–4) unless the near field should melt, exposure LAST.
   Compare your still with the reference **numerically** (same regions, same stats) and by eye at full resolution (crop).
4. **Contact sheet** of all shots at start / middle / end (`scripts/contact.py`): the camera move must keep the subject framed
   the whole time; fix drifting edges and things that leave the frame before rendering.
5. **Sound** (optional, ElevenLabs sound effects): one ambience bed per shot, `duration_seconds` set explicitly (≥ shot + 1.5 s;
   the default gives ~1 s clips), one take each, saved as `audio/<id>.mp3` → `python3 <skill>/scripts/mix.py`.
6. **Render** in the background: `node <skill>/scripts/film.mjs` (renders missing shots, then joins). Check stills from the
   finished MP4 (first, middle, last second of each shot) before handing it over.

## Rules
- **Deterministic**: every frame is a function of `t` only — seeded `rng`, `noise1(t)`, no `Math.random`, no state carried
  between frames. Grain is seeded by the frame number.
- **Portrait 1080×1920, 30 fps** by default (`W`, `H`, `fps` on the Film). Preview at `?scale=.5`.
- **Light carries the look, not geometry**: practical lights in the frame, a dark sky that is still lighter than the
  silhouettes in front of it, warm practicals against cool ambient, fog that starts beyond the subject.
- **Thin things need care**: twigs, wires and rails are sub-pixel — keep `minR`/`twigR` ≥ ~1 px at their distance, put trees on
  layer 2 (not in reflections) and let the coverage-aware depth (`sceneDepth`) keep them from being fogged or blurred away.
- **Exposure last, by numbers**: night references are far darker than they look (the rain reference has a median luminance of
  11/255). Match region medians, then judge by eye.
- **Check by looking**: every change → a still; every shot → a contact sheet; every render → stills from the MP4.

## Contract every shot page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS`; `window.__ready = true` after build (all done by
`film.start()`). `?render=1` = no UI; `?t=3.2` = one frozen frame; `?scale=.5` = preview size; `?pass=scene|atmos|mirror|coc|noise`
= one pipeline stage; `?off=lights,ambient,scatter,fog,precip,bloom,dof,grain,mirror` = switch a part off; `?prof=1` = stage
timings (`scripts/profile.mjs`). The live page (no `render`) loops in real time; click or space pauses.
