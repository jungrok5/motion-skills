---
name: pencil-live-action
description: Make a mixed-media short (15–35 s) where a graphite pencil drawing walks out into a photographed real world — one continuous take. A drawn hero (loose double graphite lines that boil, paper-white, no colour) stands on a sketchbook page on a real café table in a real place; a real pencil, held by someone just out of frame, draws a way out standing up in 3-D from the page; the hero walks off the paper, goes down into the world (the drawing carries them: a slide, an umbrella, a ladder …) while the camera cranes from table height to the hero's own eye level on the ground; a drawn thing touched in the real world turns into a real object (a Poly Haven scan or a mesh built in code) from the touch point; and a drawn frame closes the shot as the world goes back to paper. The real half is three.js lit and backed by Poly Haven CC0 scans (an HDRI as light and backdrop on a ground-projected dome, scanned surfaces, scanned objects) shot through a real lens (depth of field from the depth buffer, a tone curve the photo passes through, grain); the drawing is Canvas 2-D through the same camera and the same blur, casting real shadows. Outputs a live page (with a synthesised score) and a 1920×1080 MP4 (24 fps). Give it a topic and it designs the hero, the place, the way out, the way down, what turns real and the close. Use for "a drawing that walks into the real world", "pencil animation over live action", "2D character in a real photo world", "mixed-media pencil + photoreal", "make a video like this but about X" ("연필 그림 캐릭터가 실사 세계로 나오는 영상", "실사 배경에 연필 드로잉 애니메이션", "그림이 현실을 발견하는 영상", "스케치북에서 걸어 나오는 캐릭터", "믹스드 미디어 연필 애니메이션", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "pencil live action", "drawing meets the real world"). Source — made from https://x.com/Artedeingenio/status/2122359802328207699?a=tNv0nx5KaAk-8vSz8XU&s=19
---

# pencil-live-action

A drawing discovers the real world. A graphite pencil hero on a sketchbook page on a real table in a real place; a real
pencil draws them a way out; they walk off the paper and down into the photographed world, where a drawing they touch
turns real. One continuous take; every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.
Give it a topic ("a beekeeper girl and a real honeycomb", "a boy who flies a kite", "a cat that finds a ball of wool") and
it writes a brief, picks a real place and scans for it, designs the hero, the way out, the way down and what turns real,
times them on one take and checks the bodies and the feet.

Made in this repo after the post by OscarAI (@Artedeingenio) on X — https://x.com/Artedeingenio/status/2122359802328207699?a=tNv0nx5KaAk-8vSz8XU&s=19
(「The Girl Who Drew a Door — When a Drawing Discovers the Real World」, "mixed-media animation, combining photorealistic
live-action environments with delicate, traditional graphite pencil animation"): a 30-second AI-generated clip of a pencil
girl on a sketchbook on a café table in a cobbled street; a real hand draws her a door and stairs, she walks down to the
cobbles, a drawn flower turns real, and a drawn heart closes the frame. `references/LOOK.md` lists what was observed. This
skill keeps that grammar and medium and builds every frame itself: the real half from Poly Haven CC0 scans in three.js,
the drawing in Canvas 2-D. The worked example `examples/kite` 「The Kite」 (30 s) is a different story with an original
cast: a boy in a cap on a sunny square, a drawn slide that draws itself down over the table's edge, a drawn kite that
turns into a real red tissue kite and rises on the wind. The template 「The Apple」 (16.5 s) is a third: a girl floats down
under a drawn umbrella in a cobbled alley and touches a drawn apple that becomes a real scanned apple. Never recreate the
reference's girl, door, stairs, flower, butterfly or heart.

**Fixed (the style)** — one continuous take, the camera flowing from the page down to the hero's eye level on the ground;
two worlds in one frame: the real one photographed (scans, HDRI light, shallow depth of field, grain, warm grade) and the
drawn one in graphite only (double tapered lines with overshoot, boiling 8× a second, paper-white knock-outs, graphite tone
— **no colour**); the drawing lives in the world (perspective from the same camera, the same lens blur, a contact shadow
and a real cast shadow); the grammar (the page → the real touch → the way out drawn standing up in 3-D by a real pencil →
off the page → the way down → the world at the hero's scale → a drawn thing turns real at a touch → the close, outside it
paper); the real pencil is held from out of frame and appears only where its far end can leave the frame; 1920×1080, 24 fps;
the music-box / pencil sound palette with scratches from the strokes.

**Designed per topic** — the hero (who, silhouette, hair, face, clothes), the place (an HDRI and the ground and table scans
that belong to it), the real touch, the way out (what the pencil draws and the plane it stands in), the way down (slide,
umbrella, ladder, rope, a jump into something drawn …), what is drawn on the ground and what it turns into (a scan or a mesh
built for the topic), what the real thing does next, the closing frame, the tune. The template and the example are examples
of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: the take — the real set (`table`, `ground`, `sketchbook`, `pencil`, `model`, `real`), the drawing (`sketch` on `upright` / `flat` / `facing` planes, `hero`), `realify`, `iris`, `camera` (flowing spline, focus that follows), `beat`, `action`, `check`; draws the drawing through the plate's camera and lens, the real pencil over it, the drawing's real shadows; live player with sound; the contract |
| `lib/plate.js` | the real half: Radiance HDR parsing, the sun taken out of the HDRI as a shadow-casting light, exposure, the ground-projected backdrop dome (the full-size photo, pre-inverted through the tone curve), scanned PBR surfaces, glTF scans, depth of field from the depth buffer, grade, the front mask (real things over the drawing); builders `buildTable`, `buildGround`, `buildSketchbook`, `buildPencil`; offline stand-in |
| `lib/gait.js` | feet that step: footholds (`walk`, `step`, `hop`, `turnInPlace`), the hip riding on the legs, never a sliding planted foot |
| `lib/hero.js` | the drawn hero from data, turned like a small 3-D model (correct near/far side at any yaw), arm and leg IK, `LIM` joint ranges audited every frame (from pencil-dream-short, + leg IK, hip height, elbow choice) |
| `lib/pencil.js`, `lib/draw.js` | the medium: graphite lines, tone fills, knock-outs, hatching; the `Painter` that draws through any point map (from pencil-dream-short) |
| `lib/sheet.js` | `castSheet`: eight turns, motion facing right and left (idle breath, a turn made of steps, a hop: gather → air → land → settle), faces |
| `lib/score.js` | the synthesised score: music box, felt keys, pad, air; sfx pencil, paper, step, whoosh, thump, sparkle, flutter … (from pencil-dream-short) |
| `lib/vendor/` | three.js r170 (+ GLTFLoader, BufferGeometryUtils), MIT |
| `templates/` | 「The Apple」 16.5 s: `BRIEF.md`, `cast.js` + `cast.html`, `props.js`, `film.html`, `score.js`, `assets.json` + `manifest.cdn.json` |
| `examples/kite/` | the worked example 「The Kite」 30 s: `BRIEF.md`, `cast.js` + `cast.html`, `props.js` (the drawn slide and kite, the real kite and string), `index.html`, `score.js`, `assets.json` + `manifest.cdn.json` |
| `scripts/new-film.mjs` | start a project: `lib/` + the template (or `--from kite`) + `out/` |
| `scripts/fetch-assets.mjs` | download the scans `assets.json` names from Poly Haven into `assets/` (never committed) and write `manifest.cdn.json` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 16`), or the MP4 (workers × ffmpeg chunks, `--audio out/x.wav`) |
| `scripts/score.mjs` | the score → WAV, with the pencil scratches read from the page |
| `scripts/check.mjs` | proves the page (below); on a cast sheet, the body rules for every view and the motion row |
| `references/` | **BRIEF** (topic → brief, cast and still reviews) · **LOOK** (what makes it read as this style, observed from the reference) · **GRAMMAR** (beats, timing, camera) · **API** (the library) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md            the topic written out (references/BRIEF.md) — written first
  assets.json         the place: { hdri, textures: [ground, table], models: [what turns real …] } (Poly Haven ids)
  assets/             the downloaded scans (fetch-assets.mjs) — git-ignored, never committed, never in docs/
  manifest.cdn.json   the same scans as Poly Haven URLs (written by fetch-assets.mjs) — small, committable; ?cdn=1 reads it
  cast.js / cast.html the hero as data + the cast sheet
  props.js            the drawn things this topic needs (and any real thing built in code)
  film.html           set → hero track → sketches → realify → iris → actions → camera → beats/checks → F.start()
  score.js            export const SCORE = { … }
  lib/                copy of the skill's lib/ (new-film.mjs); pages import it through an import map ("pla/", "three")
  out/                stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root (or the skill folder for its own examples). Pages fetch their scans, so view them
through a server (`python3 -m http.server` in the project); the scripts start their own.

Requirements: Node + Playwright Chromium, ffmpeg, curl; network once to fetch the scans (or `?cdn=1`). No GPU needed: WebGL
runs on SwiftShader at ~1–3 s a 1080p frame (30 s ≈ 15–25 min with 3–4 workers; preview at `--scale .5`). Without scans the
plate falls back to a stand-in so pages still run; check.mjs fails a stand-in film unless `--allow-standin`.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the place
   (an HDRI from `https://api.polyhaven.com/assets?t=hdris` — look at the thumbnails `https://cdn.polyhaven.com/asset_img/thumbs/<id>.png?width=480`;
   a ground scan that matches its ground; a table), the hero and their mass and idle, the real touch, the way out, the way
   down, what turns real (a scan from `?t=models` or a mesh you build), what it does next, the close, the beats with
   stance / gaze / anticipation / action / recovery, the sound. Save it as `BRIEF.md` before any code. If the user gives
   a reference clip, extract stills (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=5x6 sheet.jpg`), note its grammar, then
   design your own.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from kite`); write `assets.json`; `node <skill>/scripts/fetch-assets.mjs my-film`.
3. **The hero.** `cast.js` from the brief (spec fields at the top of `lib/hero.js`). Render `cast.html --stills 0` and score it
   (references/BRIEF.md → cast review): turned both ways, the narrower eye / nose / toes on the facing side; the motion row
   right and left breathes, steps, gathers and lands. `node <skill>/scripts/check.mjs cast.html` must print `ok`.
4. **The set.** In `film.html`: `F.table`, `F.ground`, `F.sketchbook` (near the edge the hero leaves by), `F.plate.turn(deg)` so
   the best of the place is behind the action; a still at t = 1 (`render.mjs film.html --stills 1 --scale .5`): the page,
   the hero's size, the backdrop, the light.
5. **The drawn things** in `props.js` with `lib/pencil.js` (`curve`, `hand`, `line`, `part` with a knock-out, `hatch`), in mm,
   at the real size of what they stand for. The way out stands on an `upright` plane; a thing in the air on a `facing`
   plane; a thing on the ground on `upright` (or `flat`). If it turns real, draw it from the real object's outline.
6. **The hero's track, beat by beat** (references/GRAMMAR.md): footholds with `gait` (`walk`, `step`, `hop`,
   `turnInPlace`) — never move a foot that is down; seated or floating poses without feet; arms to world points (`armsW`);
   each beat's stance and gaze from the brief; an `F.action` for every big move. The real pencil draws only in close frames;
   in a wide frame the line draws itself (`by: 'self'`).
7. **The turn to real.** `F.realify({ sketch, obj, at, from, radius })` with `obj` a scan (`await F.model(id)`) or a mesh
   from `props.js`, `from` where the hero touches it. Then what it does (a `track` on `F.real`).
8. **The camera.** One take: keys at table height, then keys generated from the hero's path through the way down, then low
   on the ground; focus on the hero (`focusOn: 'hero'` or a function). A contact sheet: `render.mjs film.html --sheet 16 --scale .5`.
9. **Review** ~10 stills against the still review in references/BRIEF.md: both worlds read (photographed / drawn), the
   drawing sits in the world (contact shadow, blur), nothing floats or skates, the pencil's far end out of frame, the hero
   never lost, no colour on the drawing.
10. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok` (add `F.check(...)` for the film's own rules).
11. **Score**: write `score.js` against the beats (check.mjs prints them); listen on the live page (♪); `node <skill>/scripts/score.mjs film.html --out out/film.wav`.
12. **Render**: `render.mjs film.html --workers 3 --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4 before handing it over.

## Rules
- **Design for the topic.** The hero, the place, the way out, the way down, what turns real and the close are made for this
  topic. Do not pull in the template's girl, umbrella and apple or the example's boy, slide and kite unless the topic is
  exactly theirs; never recreate the reference's girl, door, stairs, flower, butterfly or heart.
- **One style.** Everything drawn uses the same pencil (`hand` lines, knock-outs, graphite tone). **The drawing has no
  colour** — colour belongs to the real world; check.mjs fails a drawn colour. The only coloured "drawn" thing is one that
  has become a real object.
- **Real means real.** The real half is scans and real-world sizes (a sketchbook is 21 × 29.7 cm, a pencil 17.5 cm, a table
  74 cm high); light comes from the HDRI; never paint the real world in 2-D.
- **The drawing lives in the world.** It is projected through the plate's camera, blurred by the same lens at its depth,
  sits in a contact shadow, casts a real shadow, and hides behind real things that pass in front (`front`).
- **One take.** No cuts; the camera flows; scale changes are camera moves. The hero is never lost during the way down.
- **The pencil is held.** It enters and leaves along its hold direction, its tip on the line it draws, its far end out of
  frame (check.mjs counts floating frames). No disembodied hand is drawn.
- **Bodies that can exist.** Head, chest, hips and toes face one way (the rig builds the turn); knees fold back, elbows
  forward, neck ≤ 90° (`LIM`); the arm never crosses the face; the cast sheet is looked at turned both ways first.
- **Weight and life** (references/MOTION-QUALITY.md at the repo root): weight sets timing; every idle breathes (a weight shift
  on its own rhythm — never the breath's, or they cancel); every big move gathers before and settles after (`F.action`,
  anticipation ≥ .15 s, recovery ≥ .2 s); planted feet do not slide (> 1.5 px fails) — turns are steps; parts follow through.
  Motion comes from key poses → rig numbers (hand-keyed, or from a generated reference video kept out of the repo).
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; live parts keep the same stroke count.
  check.mjs seeks the same t twice and compares pixels.
- **Scans are not committed.** `assets/` stays git-ignored and out of `docs/`; commit `assets.json` and `manifest.cdn.json`
  only. The live page credits Poly Haven. Site demos read the scans from Poly Haven's server (`?cdn=1`).
- **No text on screen.**

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (24), `window.SIZE = {W, H}` (1920×1080 stage units),
`window.runChecks(t)` (names of broken rules, including `body: …` from the rig), `window.shotAt(t)` (`{i, name, lt}` — the
beat), `window.film` (`feetAt`, `heroPx`, `pencilPx`, `drawnColours`, `actions`, `penSfx()`, `plate.notes`), `window.__ready =
true` — all set by `F.start()`. `?render=1` = fixed canvas, no live loop (with `?t=20`: that frame); `?t=20` on the live page =
start there; `?scale=.5`; `?cdn=1` = scans from Poly Haven; `?off=dof,grain,vignette,shadows`. The live page fits the window,
plays at 24 fps and loops; click or space pauses, ← → jump a second, the bar scrubs, ♪ plays the score in sync.
