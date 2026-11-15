---
name: point-cloud-morph
description: Make a point-cloud morph film — one cloud of 100k–250k glowing points that forms a 3D shape (a building, a ship, terrain, an animal, a machine, a wordmark), holds it while the camera orbits, comes apart into a nebula (or flows, bursts, folds, scans in) and re-forms as the next shape, under a dark instrument HUD (figure label, live YAW / PITCH / SCAN readout, callouts pinned to 3D points, rings, dotted paths, site chrome with headline copy, stats and section tabs). Shapes are described in code (lines, faces, boxes, buildings, trusses, terrain rows, surfaces of revolution, any three.js mesh or GLB, text, images) and sampled into points; tagged parts can spin, sway or bob. Outputs a live page (loops, drag to orbit, arrow keys between shapes, or scroll-scrubbed with ?scroll=1), a synthesised score, and a 1920×1080 MP4. Give it a topic and it designs the forms, the order they become each other, the copy and the camera. Use when asked for a point cloud animation, particles forming shapes, a particle morph, a LiDAR / scan look, a "digital twin" hero, or a landing-page 3D particle section ("포인트 클라우드", "점으로 3D 형태 만들기", "파티클이 모였다 흩어지는", "점들이 다른 모양으로 바뀌는", "라이다 스캔 느낌", "점으로 된 건물 · 지형", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "particle morph", "point cloud transition"). Source — made from https://x.com/askwhykartik/status/2119452450583097368.
---

# point-cloud-morph

A film made of one cloud of points. The points draw a 3D form the way a LiDAR or sonar scan would — bright, fuzzy edges,
faint specks on the faces, a little spray, a cold hot spot where something matters — and the camera keeps orbiting it.
Then the form comes apart: the points lift into a turbulent nebula and settle into the next form (or flow straight there,
burst out, fold in, or appear under a scanning plane). Every point keeps its index for the whole film and every form is
ordered along a space-filling curve, so the left of one form becomes the left of the next and the morph reads as one
material changing shape. Over it sits an instrument HUD: a figure label, a live YAW / PITCH / SCAN readout, callouts
pinned to 3D points, rings and dotted paths in 3D, and — when the shot is "on the site" — a top bar, a headline block, a
stats strip and section tabs. Give it a topic ("an ocean-mapping company", "a violin maker", "a city's metro") and it writes
a brief, designs 3–6 forms that tell it, chooses how each one becomes the next, writes the copy, and renders it.

Made in this repo after the post by kartikey singh (@askwhykartik) on X — https://x.com/askwhykartik/status/2119452450583097368:
a 21.9 s reel of AI-built landing pages whose first 8 s is a dark architecture-scanning site where a library made of
white points blows apart into a nebula and re-forms as a tower, a truss roof and a terrain grid. This skill keeps that
section's grammar (references/LOOK.md) and rebuilds it as a reusable engine. The worked example `examples/deep-survey`
「Haldane Deep」 (27.9 s, 5 forms: a survey ship with its sonar fan → a trench → a humpback → a globe of survey lines →
the name) is a new topic designed from a brief. Never recreate the reference's studio, its buildings or its copy.

**Fixed (the style)** — one cloud, a fixed point count for the whole film; a near-black ground; points that are warm white
with exactly one cold accent used only for hot spots, signals and data; edges bright, faces faint, a little spray; soft
additive dots with depth fade and a slow twinkle; forms that are assembled, never cut between; the camera always moving
(slow yaw drift); transitions that take 2–3 s and sweep across the form; the instrument HUD in mono caps with wide tracking
(JetBrains Mono) and the headline in tight sans (Inter), the second headline line grey; callouts as a square marker, a
leader and a dark tag whose first word is accent; 1920×1080 at 30 fps; the score's palette (drone, noise whooshes, scan
ticks, settle chimes, data blips).

**Designed per topic** — the forms (what each is, what it is built from, what is bright and what is faint, where the hot
spot sits, what moves), their order and the story the order tells, how each arrives (style, sweep direction, timing), the
camera for each (angle, distance, where the form sits beside the copy), the brand / nav / tabs, every headline, body,
callout, figure label and stat, the accent colour, the score's root note. The template (a wind-farm co-op) and the example
(an ocean-survey company) are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/forms.js` | the form builder: `line path circle grid arc helix` · `tri quad disk sphere latlon surface lathe` · `blob dust nebula` · `geometry object` (any three.js mesh / GLB) · `text image` · kit `box building truss stair terrain globe` · `at()` transforms · `tag` for moving parts · `sample(n)` |
| `lib/cloud.js` | the engine: `Cloud` (forms → GPU buffers sorted on a Morton curve, shots, transition styles `nebula flow burst scan fold cut`, sweeps, the camera, per-form motions, the live player, `runChecks`, `cues`, the contract), `STYLES`, `ease`, `span` |
| `lib/hud.js` | the HUD: chrome (top bar, stats strip, tabs, ruler), figure label, live readout, copy block, callouts, 3D rings and dotted paths, hint, vignette; fonts |
| `lib/fonts/` | Inter, JetBrains Mono, Noto Sans KR (SIL OFL) |
| `lib/three.module.min.js` | three.js r170 (MIT) |
| `templates/` | `film.html` (14 s, 3 forms: a turbine with a turning rotor → a ridge → a wordmark), `BRIEF.md` |
| `examples/deep-survey/` | the worked example: `BRIEF.md`, `index.html` (27.9 s, 5 forms) |
| `scripts/new-film.mjs` | start a project from the template or `--from deep-survey` |
| `scripts/check.mjs` | proves the page: loads clean, fonts, every form holds / fits / clears the copy, callouts on screen and apart, settled frames visible and not blown out, transitions move, no jump at a cut, deterministic |
| `scripts/render.mjs` | stills, the contact sheet, the form sheet (each form from 4 sides), the preview, the MP4 (workers, `--audio`) |
| `scripts/score.mjs` | the synthesised score from the film's cues → WAV |
| `references/` | **BRIEF** (topic → brief, form review, still review) · **LOOK** (the grammar, observed from the source) · **FORMS** (building forms that read as points; API and recipes) · **ENGINE** (shots, transitions, camera, motion, HUD, contract) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md      the topic written out (references/BRIEF.md) — written first
  film.html     new Cloud({...}) → F.form(...) × 3–6 → F.shot(...) × 3–6 → F.check(...) → F.start()
  lib/          copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("pcm/")
  models/       (optional) GLBs the forms sample, with their credit lines
  out/          stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On SwiftShader (CPU WebGL) a
1080p frame of 160k points takes ~0.2 s; the 27.9 s example renders in ~2.5 min with 4 workers.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the story
   in one line, 3–6 forms and why each reads as points, what each is built from, how each arrives (style + sweep), the
   camera, which shots are "on the site" (chrome + copy) and which are immersive, the copy, the one accent, the sound. Save
   it as `BRIEF.md` before any code. If the user gives a reference clip, extract stills
   (`ffmpeg -i ref.mp4 -vf fps=2,scale=480:-1,tile=4x6 sheet.jpg`) and read its forms, transitions, HUD and camera — then
   design your own forms for the topic.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from deep-survey`). Replace the template's forms, shots and copy.
3. **Forms** (references/FORMS.md). One `F.form(name, (b) => {...})` per form. Draw the silhouette and the structure with
   lines (they get most of the points), faces faint, a floor of `dust` or a terrain strip under objects, one `blob` hot spot
   with `tint: 1` where the story points. Organic things: `surface` / `lathe` with iso-line paths for grooves and ridges.
   Ready-made models: load the GLB (references/FORMS.md → GLB) and `b.object(gltf.scene)`. Moving parts: `tag` them and
   give the form `motion` (spin / sway / bob).
4. **Form sheet.** `render.mjs film.html --forms --scale .5` renders every form alone from front, right, back and left.
   Score it against the form review in references/BRIEF.md — recognisable from the shot's angle, no side that collapses
   into a stick when the camera will orbit past it, edges brighter than faces, the hot spot where it means something. Fix
   and re-render until it passes.
5. **Shots.** One `F.shot` per form: `dur` (5–7 s), `in` (style, dur 2–3 s, sweep), `cam` (yaw, pitch, dist, target,
   `frame` to push the form beside the copy, `drift`, optional `to`), `hud` (fig, scan, kicker, title, body, button, link,
   stats, tab, callouts, rings, paths, chrome). The first shot scans in from dust; the last holds long enough to read.
6. **Sheet and review**: `render.mjs film.html --sheet --scale .5` (each shot mid-morph, settled and at its end), then
   ~10 moments full size (`--stills`), scored against the still review in references/BRIEF.md.
7. **Check**: `node <skill>/scripts/check.mjs film.html` must end with `check OK` (warnings are read and either fixed or
   accepted on purpose). Add `F.check(name, fn)` for the film's own rules.
8. **Score**: `node <skill>/scripts/score.mjs film.html --out out/film.wav` (tune with `new Cloud({ score: { root, bed,
   whoosh, chime, blips, reverb } })`). Listen to it against the preview.
9. **Render**: `render.mjs film.html --preview` to check the motion, then `render.mjs film.html --audio out/film.wav` →
   `out/film.mp4`. Look at stills from the MP4 (`ffmpeg -ss 12 -i out/film.mp4 -frames:v 1 x.png`) before handing it over.
10. **Live page** (if it goes on a site): the same `film.html` loops with drag to orbit and ← → between forms; `?scroll=1`
    makes it a scroll-scrubbed section. Ship the page with its `lib/`.

## Rules
- **Design for the topic.** Every form is chosen because it tells this topic, and is built for it. Do not reuse the
  template's turbine and ridge or the example's ship, trench and whale unless the topic is exactly theirs; never recreate
  the source's studio, its library / tower / truss sequence or its copy.
- **One style.** One cloud with a fixed point count, warm-white ink and one cold accent (accent only on hot spots,
  signals and data), edges bright and faces faint, the same HUD typography and layout in every shot. New forms follow the
  same marks: if a form needs a different look (solid, coloured, textured), it is not this style.
- **Forms are assembled, never cut.** Every shot morphs from the one before (`cut` only when the brief says why). A form
  holds ≥ 1.5 s after it settles; a transition takes ≥ 1.2 s (2–3 s reads best).
- **The cloud stays continuous.** No jump at a shot boundary — the check measures it. Camera keys continue from the
  previous shot's end; motions are functions of global time so they carry across.
- **Pure function of t.** No `Math.random`, `Date` or state between frames in a page: forms are sampled once with seeded
  RNG, and every per-frame value comes from t. `check.mjs` proves it.
- **Readable.** The form is the clearest thing in the frame; it sits inside the frame (`cam.bleed` only on purpose) and
  clear of the copy (`cam.frame`); callouts appear after the form has formed, never overlap each other or the copy, and
  say something specific (an ID, a quantity, a unit).
- **Words are few.** A headline is two short lines, the second grey; body ≤ 2 sentences; labels are mono caps. Only the
  copy, labels, callouts and wordmark forms carry text; the points never spell body text.
- **A text form is seen from the front.** Wordmarks and logos read only within ~40° of straight on (the form sheet shows the
  edge-on stick at 90°); keep the camera near yaw 0 and drift slow.

## Contract every film page fulfils
`window.seek(t)` renders frame t (seconds); `window.renderAt(t)` the same without live drag; `window.DURATION`,
`window.FPS` (30), `window.SIZE = {W, H}` (1920×1080 HUD units), `window.shotAt(t)` (`{i, name, lt, p}`),
`window.runChecks()`, `window.cues()` (for the score), `window.showForm(name, yaw, pitch)` (the form sheet),
`window.film`, `window.READY = true` — all set by `F.start()`. `?render=1` = fixed canvas, no live loop; `?t=12` = one
frozen frame; `?scale=.5` = render size; `?n=60000` = point count; `?scroll=1` = scroll-scrubbed;
`?off=hud,flash,shimmer`. The composited frame (cloud + HUD) is `#frame`.
