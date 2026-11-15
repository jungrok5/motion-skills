---
name: parallax-facade
description: Make an ~8 s seamless loop in the "flat street that turns out to be 3D" style — a row of toy-like buildings that reads as one flat 2D elevation through a long lens, until the camera snaps into a dolly zoom through a gap and finds a long street, a far landmark and a whole town behind, cranes up, orbits, and snaps back to the same flat picture on every beat. Two finishes (soft pastel, or cel with ink outlines), motion blur on every move, a synthesised beat with a whoosh per move. Rendered in code with three.js (no AI video model) to an MP4 and a live page. Give it a topic (a place, a street, a town, a scene) and it designs the front row, the gap, the plug, the landmark, the palette and the sound for that topic. Use for "parallax illusion loop", "flat to 3D reveal", "dolly zoom street", "forced perspective animation", "2D looking 3D city loop", "isometric town reveal video", or Korean requests like "시각차 영상", "평면처럼 보이다가 3D로 드러나는 영상", "돌리 줌 거리 루프", "이 스타일로 우리 동네 만들어줘", "주제만 바꿔서 같은 스타일로". Source — made from the video at https://x.com/lemomo_ai/status/2118516216180740585 (a design after @garments__).
---

# parallax-facade

An 8-second loop built on one optical trick. Seen from far away through a long lens, a 3D street compresses into a flat
picture: the shops in front, a gate in the gap, a tower just over the roofline — one painted strip. Then the camera
dolly-zooms (moves in while the lens widens, so the front row keeps its size) and the picture tears open: the gap is a
long street, the gate is 26 m back, the tower is on a hill 150 m away, and a whole town was hidden behind the roofs. A
crane, an orbit, and every second it snaps back to the same flat picture. Everything is code: a three.js town from a kit
of parametric buildings, two-tone toon shading with a lavender shade colour, optional ink outlines, haze by depth, motion
blur from adaptive sub-frames, and a synthesised soundtrack. Every frame is `seek(t)`; the last frame wraps to the first.

Made from the clips posted by @lemomo_ai on X (https://x.com/lemomo_ai/status/2118516216180740585, "a short video using
the visual-difference trick", after a design by @garments__): a pastel seaside shopping street and a white-walled water
town, 8 s each, 1920×1080. The clips are not included and not traced: the trick, its timing, the camera moves, the
palette logic and the sound grammar were measured (references/LOOK.md); every place is designed from its topic.
Worked example: `examples/hanok-alley` (a hanok alley with a broadcast tower on a hill — ink finish, a topic not in the
source). Starting film: `templates/film.html` (Clock Square — soft finish).

**Fixed (the style):** the flat-elevation trick (`flat` view: long lens, eye at the roofline, a plugged gap) and its
reveals (dolly zoom, crane, bird's-eye, side orbits); the 8 × 1 s beat loop that starts and ends flat and wraps
seamlessly; toy-scale two-tone toon shading with hard shadows, a cobalt sky, flat clouds, haze by depth; motion blur on
moves; the soft and ink finishes; a soft beat with a whoosh per move.
**Designed per topic (in `BRIEF.md`, built in `film.html`):** the place and its building language, the front row, the
gap and what is behind it, the plug, the landmark, the palette, the near layer, the moving things, the order of the
beats, and the sound (mood, chords, ambience). The template and the example are examples of the style, not a menu
(references/BRIEF.md).

## What's in this folder
| path | what |
|---|---|
| `lib/facade.js` | `Film`: the flat frame and focus, `VIEWS` (flat · deep · rise · high · left · right · low) on a dolly-zoom sphere, `beats()`, `F.hide()` (how tall the town behind may be and stay hidden), `F.lap()` (loop-periodic motion), toon / glow / ink-hull materials, `Batch` (parts merged into one mesh), adaptive motion blur, `check()` (loop, landmark visible when flat and shrinking, beat timing, lens crowding), live player, the contract |
| `lib/kit.js` | the town kit: `building` (flat · gable · gableZ · hip with curl · stepped roofs, windows on any face, shop, door, awning, balcony), `row`, `field`, `tower` (tiers: pagodas, clock towers, TV towers, gate roofs), `tree` (round · palm · cone · column · willow), `lamp`, `pole`, `wire` (+ lanterns), `bush`, `bench`, `postbox`, `ground`, `road`, `canal`, `bridge`, `boat`, `traffic`, `birds`, `cloud`; `B.at` local frames, `B.stick`, `B.solid` |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `film.html` (Clock Square: pastel shops, a gate in the gap, a clock tower 82 m back; 8 s), `BRIEF.md` (the brief to fill) |
| `examples/hanok-alley/` | the worked example: `BRIEF.md`, `index.html`, `audio/loop.mp3` |
| `scripts/new-film.mjs` | start a project (template, or `--from hanok-alley`) |
| `scripts/check.mjs` | loads clean · every view draws · deterministic · seamless loop · flat frame filled edge to edge · landmark visible when flat and shrinking ≥ 3× · beat timing · lens crowding · writes `out/cues.json` |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`, `--loops 3`, `--q fps=60`) |
| `scripts/score.mjs` | the sound from `out/cues.json`: chords + beat (citypop · lofi · calm), a whoosh per move panned with the swing, a landing tick, ambience (waves · birds · bell · water · wind · city · cicadas) → `out/loop.wav` (`--mp3`) |
| `references/` | **BRIEF** (fixed vs per topic, the brief, the stills rubric) · **MOVES** (why it looks flat, the dolly-zoom math, views, beats, blur, composition numbers) · **LOOK** (what was measured, the finishes) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-loop/
  BRIEF.md        topic → place, front row, gap, plug, landmark, palette, moving things, beats, sound (written first)
  film.html       film → front row → behind the gap → plug + landmark → town → moving things → beats → start
  audio/loop.mp3  the loop's sound for the live page (score.mjs --mp3)
  lib/            copy of the skill's lib/ (new-film.mjs), imported through an import map ("facade/")
  out/            cues.json, stills, sheets, loop.wav, the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs film.html`. The page is an ES module: view
it through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On a 4-core box without a GPU
(SwiftShader) a held 1920×1080 frame takes ~0.7 s and a blurred moving frame up to ~18 s; the 8 s example renders in
~25 min with 4 workers. Previews: `--scale .4 --q blur=1` (~0.3 s a frame).

## Workflow
1. **Topic → brief.** Take the user's topic (a place, a neighbourhood, a campus, a harbour, a festival street, a shop
   front, a fictional town) and write `BRIEF.md` (`templates/BRIEF.md`, references/BRIEF.md): the place and its building
   language, the front row, the **gap**, the **plug** that fills it when flat, the **landmark** that peeks over the
   roofline, the palette, the near layer, the moving things, the beats and the sound. Decide the finish (`soft` pastel or
   `ink`). Show the brief to the user in a few lines; once they agree, do the rest without asking.
2. **Start**: `node <skill>/scripts/new-film.mjs my-loop` (or `--from hanok-alley` for an ink start). Replace the
   template's town with the brief's — do not keep the clock tower or the hanok because they are there.
3. **Flat picture first** (references/MOVES.md): set `facade` (frame height ≈ 1.4–1.8 × the roofline), `eye` (the
   lowest front roofline), `focus` (the gap). Build the front row with `K.row` + `building()` options (or new pieces made in
   the project), the near layer, the plug, then the landmark in its own `F.part` marked `F.landmark`. Render the flat
   frame (`render.mjs film.html --stills 0.3 --scale .5 --q blur=1`) and look: does it read as one drawing?
4. **The town behind**: `K.field` with heights from `F.hide(z, roofline)` so nothing shows over the roofline when flat
   (except what you choose: the landmark, a skyline band). Line the street behind the gap (trees, poles, lanterns,
   doors facing it) — it is what the reveal is about.
5. **Moving things and beats**: `K.traffic`, `K.birds`, boats with `F.lap(t, laps)`; `F.beats([...], { beat: 1 })`
   starting and ending on `flat`, through `deep` at least once (references/MOVES.md). Override views the place needs
   (`{ view: "right", zoom: 1.3, pitch: 18 }`).
6. **Check and look**: `node <skill>/scripts/check.mjs film.html` must print `check OK` (it also writes `out/cues.json`);
   read its warnings (lens crowding, sky share, landmark share). Then `render.mjs film.html --sheet 9 --scale .4 --q blur=1`
   (one still per beat) and a full-size flat still; score them with the rubric in references/BRIEF.md (a fresh reviewer
   agent works well) and fix every area under 7.
7. **Sound**: set `sound: { mood, chords, ambience, … }` in the Film options, re-run check.mjs (cues), then
   `node <skill>/scripts/score.mjs --mp3` → `out/loop.wav` + `out/loop.mp3`; copy the MP3 to `audio/loop.mp3` for the
   live page.
8. **Render** in the background: `node <skill>/scripts/render.mjs film.html --audio out/loop.wav` (add `--loops 3` for a
   post that plays the loop three times, `--q fps=60` for 60 fps like the reference). Open stills from the MP4
   (`ffmpeg -ss 0.9 -i out/film.mp4 -frames:v 1 x.png`) and check its length (8 s × loops).
9. **Deliver**: the MP4, the live page (`film.html` through a server, ▶ and "sound on"), and `BRIEF.md`.

## Rules
- **Deterministic and seamless**: every frame is a function of `t`; moving things use `F.lap()` (whole cycles per loop),
  no `Math.random` (seeded `rng`), nothing accumulates. The first and last beat are the same view. check.mjs proves both.
- **The flat view is the hook**: long lens (fov ≈ 6°), camera height at the roofline (`eye`), the gap plugged, the frame
  filled edge to edge, nothing over the roofline you did not put there. If the flat still does not read as one drawing,
  nothing after it works.
- **The reveal must be large**: the landmark shrinks ≥ 3× (aim 4–6×), the plug sits 20–35 m back, the street behind the
  gap is long and lined. A reveal that shows a shallow courtyard is not this trick.
- **Beats**: ~1 s each, a hold of ~0.55 s then a snap of 0.3–0.45 s with motion blur; never hold a moving camera.
- **Every view is a picture**: no lens crowding a wall or a roof (check.mjs warns), no car blocking the alley in `deep`,
  a strip of sky in `deep` and `rise`.
- **Design per topic**: every topic gets its own place, front row, gap, plug, landmark, palette, moving things and
  sound from its brief; never drag in the template's clock tower or the example's hanok because they are there. New
  pieces are built in the project (functions that take `B`, from boxes, cylinders, balls and `solid()`), not by editing
  `lib/`.
- **One style**: whatever is new keeps the same language — toy scale, two-tone toon shading with the finish's shade
  colour, one finish for the whole film (ink everywhere or nowhere), the cobalt sky, flat clouds, the palette rules in
  references/LOOK.md.
- **Ready-made models, when boxes sell a thing badly** (a camper van, a bus, a bicycle, a dog): a free Polyfork low-poly
  GLB may stand in. Find one at `https://polyfork.dev/api/assets?q=…` (sizes are real metres, like the town). Load it with
  three r170's own loader, `import { GLTFLoader } from "https://unpkg.com/three@0.170.0/examples/jsm/loaders/GLTFLoader.js"`
  (it finds `three` through the page's import map), `await` it before `F.start()`, and give every mesh `F.mat.lit`, the
  town's vertex-coloured toon, so it shades like the rest. It gets no ink hull or haze tint, so in the ink finish keep it
  small or build it instead. Commercial use is fine; never copy a model's `.mjs` source into the project, and a GLB kept
  in the project keeps its credit line (the asset's `credit` field). More:
  https://github.com/jungrok5/motion-skills/blob/main/references/3D-MODELS.md
- **Original**: never recreate the reference clips' streets, buildings or compositions; never copy another artist's
  design. Real landmarks may appear as simple toy forms, without logos or brand names.

## Contract every film page fulfils
`window.seek(t)` draws frame t synchronously (motion blur included); `window.DURATION`, `window.FPS`, `window.film`;
`window.__ready = true` after the first frame — all set by `F.start()`. Query: `?render=1` (no player UI), `?scale=.5`,
`?t=2.3`, `?blur=1` (no motion blur), `?fps=60`, `?ar=9:16`, `?finish=ink`, `?ink=0`, `?autoplay=1`.
