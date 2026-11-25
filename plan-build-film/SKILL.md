---
name: plan-build-film
description: Turn a building into a film of it building itself on its own drawing. Give it a topic (a Jeju stone house, a mountain cafe, a tea pavilion, a cabin, a villa) or a sketch, floor plan or brochure page, and it reads the input into numbers, draws (or calibrates) the plan sheet, writes the whole building as one Blender script in which every footing, stone, post, board, lattice strip, rafter and rope is its own object tagged with its stage, renders stills against references and fixes what differs, then films it - straight down on the sheet with a coffee cup at its corner, a spiral down, every part landing on the paper in white clay flashing its stage colour on the beat with a parts counter, a wave from the focal point that turns paper into land and clay into real materials, the lights on, a dive in through a real opening - and scores it with a synthesized sound per landing and a composed track whose swell hits the wave, mastered to -14 LUFS. Checks floaters, parts landing before what holds them up, the beat grid, camera clearance, frame-to-frame pops and loudness. Use for "plan to 3D build film", "sketch to house video", "building assembling itself", "architecture build animation", "평면도로 집 짓는 영상", "스케치에서 집이 지어지는 영상", "건물이 부재 단위로 조립되는 영상", "부재 카운터", "이 스타일로 ○○ 지어줘", "주제만 바꿔서 다른 건물로", "图纸生成3D建筑", "构件清单". Source — made from https://x.com/hx831126/status/2125460963541577784?a=vuKgapXTAHdMxNOQYkM&s=19, built on https://x.com/Nyxera0x/status/2125210356238762233 and https://github.com/Nyxera0x/blueprint.
---

# plan-build-film

A film of a building building itself on its own drawing. It opens on the plan sheet lying on a desk, seen straight
down through a long lens so the first frame is the drawing; the camera spirals down while every part of the building
lands on the paper in white clay - stones course by course, posts, beams, boards, every strip of every lattice door,
rafters, thatch, ropes - each stage flashing its own colour as it lands, every landing on the music's beat grid, and a
counter card ticking up by stage. Then one wave runs out from the focal point (a tree, a pool, a hearth): the paper
becomes land, the clay becomes stone, timber, paper and straw, the studio becomes sky, the lights come on. A slow
hold, a dive in through a real opening, a turn to the view, the title. Every sound is synthesized on the film's own
clock and the mix is mastered to -14 LUFS. Nothing is modelled by hand and no 3D file of the building exists: the
building is a Python script for Blender that the agent writes, renders, looks at and fixes.

Made from **@hx831126's post** (https://x.com/hx831126/status/2125460963541577784?a=vuKgapXTAHdMxNOQYkM&s=19): a
24 s film of a ridge-top cafe (松间咖啡) built from 2,829 parts on its plan sheet with a 构件清单 counter, its
pipeline listed as "blueprint + design.md + PIL watercolour contours + Blender geometry built in code + Cycles with
Khronos PBR Neutral (not AgX) + generated look and music + 92.5 BPM measured to hit the downbeats + 450 landing
points auto-placed on frames + numpy & ffmpeg locked to -14 LUFS + HyperFrames & GSAP compositing + adjacent-frame
differences to find stutter". That post builds on **Nyxera0x's article** "How I Turn Any Sketch Into a 3D House You
Can Walk Through" (https://x.com/Nyxera0x/status/2125210356238762233) and its skill **blueprint**
(https://github.com/Nyxera0x/blueprint, MIT): numbers before geometry, a carpenter's build with every part its own
object and stage, stills against references, the film opening on the input, the clay-to-material wave, bevels that
never deform, the camera that never faces a blank wall. This skill keeps that method and adds what the post added -
a sheet drawn in code with watercolour and contours, landings quantized to a tempo, a per-stage counter, a sound per
landing slot, loudness mastering, frame-difference checks - plus a check that nothing lands before what holds it up,
camera clearance rays, a scaffold, and a new worked example, `examples/jeju-stone-house` (제주 돌집 스테이). The
originals' houses, sketches, GIFs and code are not copied (the kit is rewritten; the film's wave group, clay wrap
and flight easing follow blueprint's, MIT, see `LICENSE`).

**Fixed (the style)** - the input as the first frame (straight down, 200 mm, filling the frame) on a wooden desk with
a cup; the spiral descent with the lens shortening; every part its own object, landing bottom-up in white clay with a
flash of its stage colour on the beat grid; the counter card (stage rows, colour dots, counts, bars, a big total);
one wave from the focal point (paper -> land, clay -> material, studio -> sky, warm line on the front); the lights
on after it; a slow hold, a dive, a way in through a real opening, a turn, the title bottom-right; Khronos PBR Neutral;
procedural or CC0 materials; synthesized sound per landing slot; the swell on the wave; -14 LUFS / -1 dBTP.

**Designed per topic** - the building, its numbers and its stages; every part's geometry; materials and the look;
the sheet (plan, elevation, labels, legend, contours) or the calibration of the person's own; the site that appears
with the wave; the focal point; tempo, stage beats, wave and lights beats; the camera route and the last frame;
stage labels, colours and sounds; the title. Nothing is copied from the example except the kit.

## What's in this folder

| path | role |
|---|---|
| `kit/pbf.py` | the Blender kit: scene and Cycles (GPU if any, else CPU), stages, primitives (`box`, `beam`, `prism`, `cyl`, `sphere`, `rock`, `tube`, `blob`, `lathe`, `shell`, `grid_mesh`), procedural materials, optional Poly Haven scans, sky looks, shots, stills, the audit |
| `kit/film.py` | the film: sheet + desk + props, the wave on every material, beat-grid landings by stage, site pops, lights, camera, exposure, clearance rays, `timeline.json`, resumable frames |
| `scripts/new-project.py` | a project for a new topic: `BRIEF.md`, `plan.json`, a working `build.py` skeleton, `film.json` |
| `scripts/draw-sheet.py` | the sheet from `plan.json`: paper, watercolour washes, contours, ink walls, door swings, dimensions, elevation, legend, title block -> `sheet.png` + `sheet.json` |
| `scripts/calibrate.py` | the person's own sketch / plan / photo as the sheet: `sheet.json` from two known points, a metre grid to read openings |
| `scripts/score.py` | the sound: a voice per landing slot, wave, lights, ambience, a composed score at the film's tempo (or the person's track with its swell on the wave), -14 LUFS / -1 dBTP |
| `scripts/hud.py` | the counter card and the title over the frames, then `final.mp4` |
| `scripts/check.py` | build / order / beat / camera / frames / sound checks with numbers; `contact.jpg` |
| `scripts/flipbook.py` | the film as a web page of frames + audio (for a static site) |
| `scripts/fetch-assets.py` | optional Poly Haven CC0 texture sets into `$PBF_ASSETS` (never into the repo) |
| `templates/` | `build.py` skeleton, `BRIEF.md`, `flipbook.html` |
| `fonts/` | ALF Sans (Pretendard subset, KS X 1001) for labels and the counter, Nanum Myeongjo ExtraBold (subset) for titles; OFL |
| `references/BRIEF.md` | the brief outline, the still review, fixed vs per topic |
| `references/READING.md` | input -> numbers: sketches, plans, photos; what to trust |
| `references/BUILD.md` | the kit's API and building like a carpenter: stages, support, rubble, lattices, thatch, roofs |
| `references/FILM.md` | `film.json`: stages, beats, the wave, the camera route, exposure; render times |
| `references/SOUND.md` | voices, the composed score, a person's own track, loudness |
| `references/LESSONS.md` | problems met and how they were fixed |
| `references/SOURCE.md` | the post, the article and the repo: what was taken, what was not |
| `examples/jeju-stone-house/` | the worked example: `BRIEF.md`, `plan.json`, `build.py`, `film.json`, `sheet.png`, `sheet.json` |
| `LICENSE` | MIT (this skill) with blueprint's notice |

## Project layout

```
<project>/
  BRIEF.md        the brief, written first
  plan.json       the numbers (metres, origin at the lot's south-west corner, +y north)
  sheet.png       the drawing the film opens on (drawn, or the person's own)
  sheet.json      its pixel <-> metre mapping
  build.py        the building as code (every part an object under a stage), its shots
  film.json       stages, beats, wave, lights, camera keys, title
ref/              reference images (git-ignored)
pbf-out/<name>/   (git-ignored) stills/, frames/, final/, timeline.json, audit.json, score.wav, final.mp4, check.json, contact.jpg
```

## Requirements

Blender 4.2+ (`blender` on PATH; tested on 5.2.5, CPU or GPU), Python 3 with numpy and Pillow,
ffmpeg. Optional: network for `fetch-assets.py`.

## Workflow

Run from the folder that holds the project. `SKILL` = this folder.

1. **Topic -> brief.** `python3 $SKILL/scripts/new-project.py <project> --title "…"`, then fill `<project>/BRIEF.md`
   by `references/BRIEF.md`: the building, the input, the numbers, the look (3-4 references with materials named),
   the stages and what holds each part up, the film's tempo / beats / route, the sounds. Research the building type
   (proportions, materials, joinery) before inventing it.
2. **Input -> numbers.** A topic: write `plan.json`, then `python3 $SKILL/scripts/draw-sheet.py <project>` and look at
   `sheet.png`. A sketch or plan: `python3 $SKILL/scripts/calibrate.py <project> --image … --a px,py:mx,my --b …`,
   read walls and openings on `grid.png` into `plan.json` (`references/READING.md`: trust labels over pixels; read
   doors by hand). Note what did not add up in the brief.
3. **Build it like a carpenter.** Replace the skeleton in `build.py` stage by stage (`references/BUILD.md`): every
   part a separate object made by a kit primitive inside `with K.stage(...)`; stones course by course; a lattice
   strip by strip; a roof as rafters, then its skin in pieces, then what ties it. Name the focal point
   (`K.point("focus", …)`) and register shots (`K.shot`). Run it: `blender -b --factory-startup -P <project>/build.py
   -- hero --res 960x540 --samples 32`. The audit prints counts per stage and every **floating** part: fix them all.
4. **Stills against the references.** Render each shot low (960x540, 32 samples), put the reference beside it, list
   what differs (proportions, materials, light, what is missing, what pokes through), fix, render again until the
   list is empty; score with the still review. Pick the look last (`--look golden|day|dusk`) and render both.
5. **The film's plan.** Write `film.json` (`references/FILM.md`): tempo, stage beats, wave and lights beats, camera
   keys (descent end, orbit, the hero shot at the wave, the dive, the opening, the turn, the last shot), exposure.
   `blender -b --factory-startup -P $SKILL/kit/film.py -- --project <project> --plan`, then
   `python3 $SKILL/scripts/check.py pbf-out/<name>`: fix **order** (a part landing before what holds it up), **beat**
   and **camera** failures in `film.json` or `build.py` before rendering anything.
6. **Moments, then the whole film.** `--stills 0,2.5,6,9,12,14,16.5,19,21,22.5 --res 640x360 --samples 12`; look at
   each (the still review, "would a blank wall fill the frame?"). Then the frames:
   `blender -b --factory-startup -P $SKILL/kit/film.py -- --project <project> --res 1280x720 --samples 24` (resumes;
   `--step 2` for a quick pass).
7. **Sound, counter, film, checks.** `python3 $SKILL/scripts/score.py pbf-out/<name>` (or `--music track.wav`),
   `python3 $SKILL/scripts/hud.py pbf-out/<name>` (writes `final.mp4`), `python3 $SKILL/scripts/check.py
   pbf-out/<name>`: all of build / order / beat / camera / frames / sound pass. Watch `final.mp4` and the
   `contact.jpg`; write anything you had to fix into the project's notes and, if it is general, `references/LESSONS.md`.

## Rules

- **Design each building anew from its topic.** The example and the skeleton show the style; a new topic gets its
  own numbers, parts, stages, materials, site, focal point, tempo and route. Never reuse the Jeju house for a
  different building, and never re-create blueprint's or the post's houses as a "new" piece.
- **Keep the one style** (Fixed, above): every new film opens straight down on its sheet, builds in clay on the beat
  with the counter, turns real with one wave, enters through a real opening.
- **Numbers before geometry.** Every size is in `plan.json` before `build.py` uses it; a sketch's dimension labels
  beat its pixels.
- **Every part is its own object, made through the kit, inside a stage.** No joined meshes for things that are
  separate in reality (a course of stones is many stones), no modifiers on parts (bevels are cut into the mesh, so a
  flying part never becomes a deforming mesh).
- **Nothing floats and nothing lands on air.** The audit's floaters and the check's `order` must both be 0. Stages
  overlap only where the check passes; parts land bottom-up (`"order": "height"`, the default).
- **Every landing is on the beat grid**; the wave starts on a bar's downbeat; the lights come on after it; no part
  lands after the wave.
- **The camera never faces a blank wall up close and never grazes anything** (centre ray >= 0.6 m, every ray
  >= 0.2 m after the wave). In through a real, open opening; turn round to the view; end on the brief's view.
- **Films run a length that is not round** (16-26 s), their own for each building.
- **Khronos PBR Neutral** (AgX turns warm light beige); glass is Transparent + Glossy by Fresnel, never refractive.
- **Materials are procedural or CC0.** Poly Haven scans only through `fetch-assets.py` into `$PBF_ASSETS`, never
  committed, never in `docs/`. A person's sketch or brochure plan stays with that person (not committed unless they
  own it and say so).
- **Generated images, video or music are references, never assets.** Reference images go to a git-ignored `ref/`.
  ElevenLabs (or any paid generator) only after the owner says yes for that request - what, which model, how many
  takes, rough cost - otherwise the composed score.
- **-14 LUFS integrated, true peak <= -1 dBTP**, sound as long as the film; checked, not assumed.
- **Check frames, not code.** Every change ends with stills or a contact sheet you have looked at, and
  `check.py` passing.

## Contract

- `build.py` runs under `blender -b --factory-startup -P build.py -- [shots] [--res WxH] [--samples N] [--look L]
  [--film]`; imports `pbf` from `$PBF_KIT` (film.py sets it) or a relative `kit/`; calls `K.setup(OPTS)` first and
  `K.finish(OPTS, shots, name)` last; in film mode it renders nothing.
- Parts: objects in `K.PARTS` with `o["stage"]`; stages named in `film.json` fly; `site_stages` never fly or count
  and grow with the wave when they carry `o["base"]`; lights via `K.light` (switched on by the film); emissive
  materials via `K.glow`.
- `K.point("focus", xyz)` (or the name in `film.json` `wave.origin`) and `K.shot(name, loc, target, lens, ev)` for
  every shot the film names.
- `sheet.json`: `image`, `size_px`, `px_per_m` (or `px_per_m_xy`), `origin_px` (the pixel of metre (0, 0)).
- `film.json`: `fps`, `duration`, `bpm`, `downbeat`, `grid`, `stages[] {id, label, color, beats[2], fly, order, sound,
  pop[]}`, `site_stages`, `wave {beat, origin, keys}`, `lights_beat`, `camera {open, keys[] {t, loc, target, lens | shot},
  ev[]}`, `title`, `subtitle`, `credit` (`{parts}`), `title_in`, `hud`, `props`.
- `timeline.json` (written by film.py): every landing `{t, launch, stage, name, x, y, z, lo, hi}`, the rows, the wave,
  the lights, the camera per frame, the clearance - what score.py, hud.py and check.py read.
