---
name: one-line-drawing
description: Make a vertical "one-line drawing" film (1080×1920, 30 fps, ~55 s) of a whole scene drawn in ONE unbroken line over a faded grey photo on a tablet, drawn entirely in code. A white stylus comes in from the lower right and the camera rides close behind the nib while a single black line traces everything — the frame as a ruled top edge with right-angle steps ending in little loops, every silhouette outlined with a loop at its sharp corners, wires and ledges as stepped hooks, treelines and steam as rows of cursive loops, water and wet roads as wide zigzags, reflections as tall zigzag columns that follow the body — doubling back instead of lifting, pausing now and then, pulling back for a breath; then the camera pulls out, the photo fades, the clean line art sits on white, a looped signature, a hold. The grey photo is painted in code from the same shapes the line traces (or is the user's own photo), people come from a jointed rig with limits, the sound (nib hiss, taps, soft piano) is synthesised; outputs a live page and an MP4. check.mjs proves the line never lifts, speaks the vocabulary, covers what the photo shows, moves at a hand's varied pace, keeps the nib in frame, keeps bodies possible, and is deterministic. Give it a topic — a place with a person in it — and it writes a brief, designs the scene (new shapes drawn in the piece), routes the one line through it and films it. Use for one-line drawing videos, continuous line art reels, "drawn without lifting the pen" shorts, single-stroke illustration timelapses, tracing-over-a-photo drawing videos, or to remake this reference style on a new subject ("한 붓 그리기 영상", "한 줄 드로잉", "선 하나로 그리는 영상", "펜 안 떼고 그리기", "원라인 드로잉", "사진 위에 따라 그리는 영상", "이 영상처럼 한 줄로 그려줘", "이 스타일로 ○○ 그려줘", "주제만 바꿔서", "one line drawing video", "continuous line drawing", "single line art timelapse", "draw without lifting the pen", "一笔画"). Source — made from https://x.com/Xin78787/status/2123707571890536673?a=HJt-M-U2a85DG5TpgNk&s=19
---

# one-line-drawing

A 9:16 film of a picture drawn in one line, the way artists post them: a tablet with a faded, misty grey photo; a
white stylus; the camera close behind the nib. One black line draws the whole scene without lifting — a ruled top edge
that steps down in right angles with small loops at the corners, every subject outlined with a loop at each sharp turn,
wires as stepped hooks, treelines and steam as cursive loops, roads and water as wide zigzags, reflections as tall
zigzag columns whose width follows the body. To get from one part to the next the line runs along a frame edge, the
horizon or a waterline, or doubles back over itself. Then the camera pulls back, the photo fades, the clean line art
sits on white with a looped signature. Nothing is an image file: the photo is painted from the scene's own shapes, the
line is authored with a small vocabulary in `scene.js`, and every frame is `seek(t)`, so the same page plays live and
renders to MP4.

Made in this repo after an X post by 醉清风 (@Xin78787) —
https://x.com/Xin78787/status/2123707571890536673?a=HJt-M-U2a85DG5TpgNk&s=19 (62 s: a man carrying a double bass on a
misty road with telegraph poles, drawn in one line over the photo on a tablet). This skill takes the *format* — one
line, its vocabulary, the photo under it, the close camera, the reveal — not that picture (references/SOURCE.md).
Starter: `templates/` 「Last Cast」 (52 s, an angler at the end of a jetty in lake fog). Worked example on a topic the
starter does not cover: `examples/noodle-stall` 「Last Bowl」 (54 s, a walker under an umbrella heading for a noodle
stall in a rainy alley — the stall, counter, lanterns and wall designed in the piece). Live:
https://jungrok5.github.io/motion-skills/one-line-drawing/

**Fixed by the style** (every piece): the 1080×1920 frame; the acts — tablet intro, the drawing, pull back, photo fade,
clean page, signature, hold; a pale desaturated photo under black ink; ONE line from start to end; its vocabulary
(contours with corner loops, right-angle steps and hooks, rows of loops, zigzag fills and reflections, doubling back,
ruled travels that become the frame); a hand's pace (fast on rules, slow into loops, pauses); the camera at ~2.4× behind
the nib with breathers; the white stylus from the lower right; the synthesised nib sound.
**Designed per topic** (never reused): the place and the person; the setting (horizon, ground, fog); every shape, and new
shapes drawn in the piece; the figure's facing, stride and what the hands hold; the route of the line — where it
starts, the order, every travel and detour, which shapes reflect, where the zigzag ground goes; pauses, draw time,
breathers; the signature.

## What's in this folder
| path | what |
|---|---|
| `lib/line.js` | `Line`: the one line — `start`, `to`/`curve`/`path`, `contour` (from / until / dir / corner loops), `steps`, `hook`, `curl`, `curls`, `zig`, `wave`, `scallop`, `sweep`, `reflect`, `back`, `pause`, `tag`, `L.last`; resamples with a hand's wobble |
| `lib/scene.js` | `Scene`: setting, named shapes with depth, figures; masks → traced outlines, bounds, row spans |
| `lib/kit.js` | silhouettes (pole, lamp, fence, house, tower, skyline, pine, tree, treeline, hills, bird, jetty, boat, umbrella, rod, lantern) and the **figure rig** (`figureRig`, `figure`, `LIMITS`, two-bone `reach`) |
| `lib/ref.js` | the grey photo painted from the shapes (fog by depth, wet / water reflections, ground texture, haze, grain), or `photoRef` for the user's own photo |
| `lib/film.js` | `Film`: pace from curvature and kind, ink width, acts, the spring camera and breathers, tablet, stylus, reveal, signature, the line and cast sheets, the checks, the live player and the contract |
| `lib/core.js` | seeded random, noise, easing, vectors, resampling, simplify, mask tracing, distance field |
| `lib/fonts/` | Caveat (signature text), OFL licence + README |
| `templates/` | 「Last Cast」 starter: `index.html`, `scene.js`, `BRIEF.md` — what `new-piece.mjs` copies |
| `examples/noodle-stall/` | 「Last Bowl」: the same files, a topic designed from its brief with new shapes |
| `scripts/new-piece.mjs` | start a piece (starter, or `--from noodle-stall`) |
| `scripts/render.mjs` | `--line` (line sheet), `--cast` (cast sheet), `--acts`, `--stills`, `--sheet`, the MP4 (workers × ffmpeg) with sound |
| `scripts/sound.mjs` | nib hiss from the pen's speed, taps, felt piano, the signature scribble |
| `scripts/check.mjs` | one line, vocabulary, coverage, pace, camera, bodies, photo, reveal, glyphs, determinism |
| `references/` | **SOURCE** (the post beat by beat; what is / is not taken) · **BRIEF** (template + still rubric) · **LINE** (scene, rig and line API; how to route) · **LOOK** (acts, constants, sound) · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md     topic → scene, figure, route of the line, film settings, review log
  scene.js     export function scene(S) — the shapes · export function line(L, S) — the one line in order
  piece.html   new Film({ scene, line }, { title, signature, seed, zoom, breathe, timing }).start()
  lib/         copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("old/")
  out/         sheets, acts, piece.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs piece.html --line`. Pages are ES modules: view them
through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flag.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. A 55 s film renders in a few
minutes on 4 cores.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code: the ONE LINE; the setting; the figure
   (facing, stride, what the hands hold, at least a quarter of the page high); 2–4 middle-ground shapes — new subjects
   are drawn in the piece; the far layer; things seen through holes; then the **route**: the start, every tag in order,
   how each travel is motivated, the detours, reflections and zigzag ground, the end. If the user brings a reference
   video, pull stills (`ffmpeg -i ref.mp4 -vf fps=1/2,scale=240:-1,tile=6x2 sheet.png`), note its beats, then design
   your own scene.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-piece` (or `--from noodle-stall`). Replace the angler — it is an
   example of the style, not a template.
3. **Design the scene** in `scene(S)` (references/LINE.md): setting, shapes with depths, the figure from the rig with
   `reach` for what it holds, props from its joints. Silhouettes for tracing are simpler than for painting.
4. **Cast sheet**: `render.mjs piece.html --cast` → the figure as posed and turned left / right / toward / away. Score
   rubric 6–8; fix the rig numbers here.
5. **Route the line** in `line(L, S)`: big structure, middle ground, figure (with detours), reflections, ground, base
   rule. `render.mjs piece.html --line` after every change; rubric 1–5. No bare diagonal across a subject; no red on
   anything that matters.
6. **Film settings** in `piece.html`: draw time, zoom, breathers, pauses (in the line), signature, timings.
7. **Review stills**: `render.mjs piece.html --acts` (intro, five drawing beats, breathers, pulled back, photo gone,
   end) and `--sheet 24 --scale .5`; score rubric 9–12. Log failures in BRIEF.md, fix, render again.
8. **Check**: `node <skill>/scripts/check.mjs piece.html` must end with `all checks passed`. Read the warnings too.
9. **Render**: `render.mjs piece.html` → `out/piece.mp4` with the synthesised sound (`--silent` without,
   `--audio music.wav` to mix the user's track under it). Look at stills pulled from the MP4.

## Rules
- **Design per topic.** The angler and the noodle stall are examples of the style, not menus. A new topic gets its own
  scene, shapes, figure and route; never move another piece's coordinates around to fit a new subject.
- **One style.** Every piece is one black line over a pale grey photo on a tablet, in the same vocabulary, the same
  camera, the same reveal. No colour fills, no second line weight, no other medium.
- **One line.** `L.start` once, never a jump: `check.mjs` fails any gap over 3 px. The signature is the only separate
  mark, after the reveal.
- **Every travel is something.** Frame edges, the horizon, a waterline, a wire, a rod, a kerb, a doubling back
  (`back`), or a detour (`contour … until` → excursion → `contour … until: L.last.start`). A bare diagonal across a
  subject is a failure of the route, fixed in the route.
- **Speak the vocabulary.** Loops at sharp corners and wire ends (≥ 6, fails otherwise), right-angle steps, zigzag water
  / roads and reflections that follow the body, rows of loops for foliage, steam and smoke.
- **The line draws what the photo shows.** Every traced shape is ≥ 50 % covered (fails) and should be ≥ 75 %; mark a
  shape `trace: false` if it is only painted. Things seen through a hole are their own shapes.
- **A hand's pace.** Varied speed (p95 / p10 ≥ 1.8), never racing (p95 ≤ 1600 px/s), pauses where the hand would look.
  Nothing moves but the pen; the figure is a still drawing.
- **Bodies are possible.** People come from the rig: joints inside `LIMITS`, hands reach what they hold (`reach`, never
  stretched), the lowest foot on its ground, one facing for head, chest, hips and feet — `check.mjs` fails otherwise;
  look at both directions on the cast sheet. A figure is always drawn by the line.
- **The camera serves the nib.** Close (≈ 2.4×), a little ahead, the nib never leaves the frame, no lurches; breathers
  show the progress.
- **Code-only.** No generated video, image, voice or downloaded motion. The photo is painted from the scene; a user
  may use **their own** photo (`photo: 'ref/mine.jpg'`, kept in the git-ignored `ref/`) — never a downloaded or
  generated one, never committed.
- **No one else's identity.** The signature text is the user's own handle (Latin, bundled font) or none; the stylus is
  generic.
- **Pure function of t.** No `Math.random`, `Date` or state between frames; seeded randomness only. check.mjs proves
  determinism.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS` (30), `window.SIZE = {W: 1080, H: 1920}`, `window.filmInfo()` (acts,
length, pace, shapes, figures), `window.lineCheck()`, `window.coverage()`, `window.camCheck()`, `window.bodyCheck()`,
`window.revealCheck()`, `window.refCheck()`, `window.penAt(t)`, `window.soundEvents()`, `window.glyphCheck()`,
`window.film`, `window.__ready = true` — all set by `Film.start()` after the font loads. `?render=1` = fixed canvas, no
live loop; `?t=20` = one frozen frame; `?scale=.5` = preview size; `?sheet=line` / `?sheet=cast` = the sheets. The live
page fits the window and loops: click / space pauses, ← → jump 3 s, the bar at the bottom scrubs.
