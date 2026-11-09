---
name: photoreal-film
description: Make a short cinematic film that reads as photographed, where every frame is Python and no 3D assets are used - give it a topic (a watch, a lens, an engine, an instrument, a product) and it designs a new film for it. Objects are modelled procedurally from numbers (lathes, bevelled extrusions, engraved scales drawn in code), given real materials (brushed and worn metal, coated glass, lacquer, leather, water), lit like a film set with practical lights and haze, shot through a physical lens (true depth of field, bokeh, 180° motion blur) and path-traced with Blender Cycles from Python (bpy), then finished in numpy with halation, bloom, chromatic aberration, AgX, a warm/cool grade, grain and a 2.39:1 letterbox. The film is a chain of scales - the mechanism in macro, the object assembling in a dark studio, the world it belongs to, that world as a picture on the maker's desk, back into the mechanism, the title - cut on shape, light and movement, with a synthesised score. Output is 1080p MP4 plus the stills. Use when asked for a photoreal / AAA / "looks real" 3D film, a product or mechanism film, a cinematic title film, or "make it like this video" for a procedural path-traced look ("실사 느낌 영상", "실사 3D 영상", "AAA 퀄리티 영상", "시네마틱 제품 영상", "매크로 영상", "파이썬으로 영상 만들어줘", "블렌더 없이 코드로 3D 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "photoreal film", "procedural 3D film", "every frame is python", "path traced", "cinematic product film", "macro mechanism film"). Source — made from https://x.com/LexnLin/status/2119558994352304202?a=cxbG0xl325NxMxhz9eQ&s=19
---

# photoreal-film

A short film (12-40 s, 24 fps, 2.39:1 inside 1920×1080) that looks photographed and is written entirely in Python: a
project is a folder of shot scripts; each builds its set from numbers, moves a physical camera through it, and is
path-traced with Blender Cycles to linear EXR. A separate finishing pass makes the film look (lens glow, aberration, tone
map, grade, grain, fades, letterbox), a synthesised score is cut to the same timeline, and ffmpeg joins them.

Made from the film in <https://x.com/LexnLin/status/2119558994352304202?a=cxbG0xl325NxMxhz9eQ&s=19> (Leon Lin: "every frame
is python, no 3D assets were used"); `references/LOOK.md` is the analysis. Built and proven in this repo on
`examples/aperture` 「APERTURE」 — 18 s, nine shots, a topic that is not in the reference.

**Fixed by the skill (the style)**
- Procedural everything: geometry from `pf.geo`, materials from `pf.mat` node recipes, images drawn with Pillow. No model
  files, HDRIs or downloaded textures.
- Path tracing with a physical lens: depth of field, bokeh and motion blur come from the renderer, never from post.
- Light as on a set: a black world, practical lights in the picture, haze, exposure by numbers.
- The film look: dark image (studio/macro median 8-40 of 255), warm/cool split, halation, grain, 2.39:1 bars.
- The grammar: a chain of scales with one move per shot and motivated cuts (`references/SHOTS.md`); the title is an
  object in the scene.
- Determinism: a frame is a function of its number. Output: linear EXR → PNG frames → MP4, plus `score.wav`.

**Designed for every topic (never reused from the example)**
- The subject and its mechanism: which parts, their real dimensions, what moves.
- The chain of worlds: which scales, what the "use" world is, what the picture on the desk is, how the loop closes.
- Palette and materials; each set's lighting; lens and move per shot; cut types; the title word; every sound cue.

## What's in this folder
| path | what |
|---|---|
| `lib/pf/geo.py` | modelling: `lathe` (with `rmod` for knurls/ribs), `prism` (bevelled extrusion with holes), `tube`, `box`/`cyl`/`ring`/`sphere`, `grid` + `fbm2` terrain, `text`, `scatter`, outlines (`gear`, `rrect`, `arc`), `bevel`/`boolean`/`solidify`, instancing |
| `lib/pf/mat.py` | materials: `metal`, `paint`, `glass` (thin-film coatings), `plastic`, `rubber`, `leather`, `floor`, `wood`, `rock`, `water`, `emit`, `picture`, `engraved`, `volume`, and the graph builder `G` |
| `lib/pf/light.py` | `area`, `panel` (emitter in shot), `spot`, `point`, `sun`, `sky` (physical), `ambient`, `haze` |
| `lib/pf/film.py` | `Film` (reads `film.py`) and `Shot`: `camera`, `shoot`, `shake`, `animate`, `spin`, `plate`, the bake to linear keys; `DEFAULT_LOOK` |
| `lib/pf/scene.py` | Cycles settings and the quality presets (`draft` / `preview` / `final` / `hero`), EXR output |
| `lib/pf/finish.py` | the look in numpy: halation, bloom, streak, aberration, vignette, AgX / filmic, grade, grain, fades, bars; `stats`, `sharpness` |
| `lib/pf/exr.py` · `draw.py` · `sound.py` · `util.py` | EXR reader · Pillow helpers for engraved strips and labels · the score synth · easing, seeded noise, colour |
| `lib/pf/fonts/` | Inter Medium and Inter Display SemiBold (OFL) for engravings and titles |
| `scripts/new_film.py` | start a project: `film.py`, `BRIEF.md` form, one page per shot, `score.py` |
| `scripts/render.py` | stills (`--still s03:0.5`) or frames (`--shots`, `--all`); renders plates first; resumes |
| `scripts/contact.py` | contact sheet of every shot with luminance numbers |
| `scripts/check.py` | structure, build, picture, determinism, deliverables |
| `scripts/finish.py` · `score.py` · `encode.py` | EXR → frames · `out/score.wav` · `out/film.mp4` + `film-share.mp4` |
| `scripts/flipbook.py` | the film as a web page that plays a WebP frame sequence with the score (`out/flipbook/`), for sites that take no video |
| `scripts/kit_sheet.py` | one picture of every material recipe and builder: a self-test after installing Blender, a swatch card when choosing materials |
| `templates/shot.py` · `flipbook.html` | the commented skeleton `new_film.py` writes for each shot · the frame-sequence player |
| `starter/` | the smallest film (a brass dial, a title): runs as it is |
| `examples/aperture/` | the worked example: `BRIEF.md`, `film.py`, `props.py` (iris, lens, camera body), nine shots, `score.py` |
| `references/` | **LOOK** (reference analysis, target numbers) · **SHOTS** (scales, shot types, cuts, light recipes) · **BRIEF** (topic → brief, the rubric) · **KIT** (library reference) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md             the film on paper: chain of worlds, design decisions, the stills review
  film.py              FILM = dict(title, fps, size, bars, seed, look, shots=[dict(id, frames, fade_in, fade_out, plates, look)])
  props.py             parts shared by several shots (the hero object, its mechanism)
  shots/<id>.py        one per shot: def build(s) — set, light, subject, what moves, the lens
  score.py             def score(sc, film) — sound cues in seconds
  out/                 stills/, contact.jpg, exr/<shot>/NNNN.exr, plates/, frames/NNNNN.png, score.wav, film.mp4 (not committed)
```
Run every script from the project folder: `python3 <skill>/scripts/render.py --still s01:0.5`.

Requirements: Python 3.13 with `bpy` 5.x (`pip install bpy`; or Blender 5.x: `blender -b -P <script> -- <args>`), numpy,
Pillow, ffmpeg. CPU is enough; a GPU Blender can see is used automatically.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md` and `references/SHOTS.md`. Find the mechanism, the machine, the world,
   the picture, the way back in, the title word. Write `BRIEF.md` (`new_film.py` puts the form in the project): the chain of
   worlds as a table with frame counts, the parts list with real sizes, palette, materials, light per set, lens and move
   per shot, cuts, sound. Show it to the user before building when they are there to answer.
2. **Scaffold.** `python3 <skill>/scripts/new_film.py my-film --title "WORD" --shots macro,parts,hero,world,print,dive,title`.
3. **Build the hero object in `props.py`**, at real size, part by part, as functions that return objects (see
   `examples/aperture/props.py`): profiles for `lathe`, outlines for `prism`, a bevel on everything, engraved markings
   as strips drawn with `pf.draw`. A mechanism must work through its whole range — check it numerically when it can fail
   (the example samples the iris for gaps).
4. **One shot at a time, by stills.** For each shot: set and light → subject → move → lens, rendering a preview still
   after each step (`render.py --still s03:0.1,s03:0.9`, 5-10 s each). Look at every still at full size. Compare
   `median` / `p95` with the table in `references/LOOK.md`. Fix exposure last.
5. **Contact sheet.** `contact.py --q preview`: every shot at first / middle / last frame. The subject must stay framed
   and in focus through the move; palette and exposure must hold across cuts; fades must land.
6. **Score the stills** with the rubric in `references/BRIEF.md` and write the table into the project's `BRIEF.md`.
   Anything under 4 goes back to step 4.
7. **Check.** `check.py` must pass: every shot builds, has a camera and light, no bare meshes, focus inside the clip
   range, not blank / black / burnt out, something sharp, something moving, the same frame twice gives the same pixels.
8. **Render** in the background: `render.py --all --q final` (add `--scale 0.75 --spp 26` on a CPU-only machine; the
   finish enlarges it). It resumes. Meanwhile write `score.py` against `score.py --list`.
9. **Finish and join.** `finish.py` → `score.py` → `encode.py`. Pull stills from the MP4 at the first, middle and last
   second of each shot and look at them; watch for flicker in defocused areas and for cuts that land a frame late.
   To change the look afterwards edit `look=` in `film.py` and re-run `finish.py` only.

## Rules
- **Design for the topic.** The bundled example and starter show the style; they are not parts bins. A new topic gets
  its own mechanism, parts, palette, world and title. Reuse *library calls*, not the example's objects.
- **One style.** Whatever the topic: procedural, path-traced, physical lens, set lighting, the film look, the chain of
  scales, 3D type. If a shot needs a flat graphic or a 2D caption, it is in the wrong skill.
- **No assets.** No model, HDRI or texture files. Images come from `pf.draw` or from the film's own frames (`s.plate`).
- **Real scale, real numbers.** Metres, true sizes, focal lengths and f-stops a photographer would use. Macro at real
  scale is f/8-f/16.
- **Every edge has a bevel; every surface varies.** Pass `bevel` / `bevel_w`; set `wear`, `brushed`, `grain` and the
  right `scale` on materials.
- **Light on purpose.** The world is black unless the shot calls `light.sky` or `light.ambient`. Put practicals in the
  picture. Keep haze thin (0.01-0.02 per metre in a studio, ~0.001 outdoors).
- **Something sharp in every shot**, chosen with `focus=`; the camera does one eased move per shot.
- **Deterministic.** Only `s.rng(tag)` and seeded numpy for randomness; no wall-clock time; nothing carried from frame
  to frame. Animate with functions of the frame (`s.animate`, `s.shoot`).
- **Exposure by numbers, then by eye.** Use the medians in `references/LOOK.md`; a dark film is correct.
- **Check by looking.** Every change → a still; every shot → the contact sheet; every render → stills from the MP4.
- **Type is in the scene.** The title is `geo.text` with a material, at the focus plane, brighter than what is behind it.

## Contract
- `film.py` defines `FILM`; shot ids are file names in `shots/`; `frames` are per shot at `fps`; the film's frame count
  is their sum.
- `shots/<id>.py` defines `build(s)`. It creates everything (the scene starts empty and the world black), calls
  `s.camera(...)` and `s.shoot(fn)` once each, and registers motion with `s.animate` / `s.spin`. Local frames run
  `1..s.n`; functions are also evaluated at `0` and `s.n + 1` for motion blur.
- A shot that shows another shot's frame lists it: `plates=[('s06_coast', 57)]`; `render.py` makes it first.
- `render.py` writes `out/exr/<shot>/NNNN.exr`: linear Rec.709, 16-bit float, no look applied. `finish.py` writes
  `out/frames/NNNNN.png` with global numbers starting at 00001, at `bars` size. `score.py` writes `out/score.wav`
  (48 kHz stereo) exactly the film's length. `encode.py` needs every frame.
- Colours are `'#rrggbb'` sRGB strings or linear tuples; a number given as a light's colour is a temperature in kelvin.
