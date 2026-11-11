---
name: kinetic-type-collage
description: Make a kinetic typography collage short — a 8–20 s film cut on every beat where huge black letters (Hangul and Latin) are the scenery the camera whips through, 3D objects tumble in front of and behind the words, flat pictures (die-cut signs, striped swatches) pile on top, and red labels, bracketed asides, squeezed letters in a black band and a window with one word behind it and one in front keep the frame dense — on a paper-white ground with black ink and at most three primary accents. Type is cut from distance fields so it stays sharp at any size; props are designed in code for the topic (or loaded as GLB); everything is a pure function of time in plain three.js. Outputs a live looping page, a synthesised beat on the film's grid (or the user's track), and an MP4 (1350 × 1080 by default; any size). Give it a topic, a lyric, a recipe, a slogan or a product and it writes the brief, the lines, the props and the shot list. Use when asked for kinetic typography, a lyric video, a typography music video, a type-driven title or promo, text flying across the screen with 3D objects, a dense poster-like motion collage ("키네틱 타이포그래피", "키네틱 타이포", "가사 영상", "리릭 비디오", "타이포 모션그래픽", "글자가 화면을 가로지르는", "글자랑 3D 오브젝트가 겹치는", "빽빽한 타이포 콜라주", "흑백에 원색 포인트", "비트에 맞춰 컷이 바뀌는", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "kinetic type", "lyric video", "type collage"). Source — made from https://x.com/manwon_man/status/2120126792552075760?a=3V9KnKatoYSIYnqo_y4&s=19.
---

# kinetic-type-collage

A short film where the words are the set. Letters the size of buildings stand in 3D space and the camera whips past
them; a pot, a guitar, a clock — whatever the line names — tumbles through, in front of some letters and behind others;
flat pictures cut out like stickers and road signs fly at the lens; a small red label says the quiet part. Every cut is
hard and lands on a beat, most shots last under a second, and no two neighbours share a scale: a word too big for the
frame, then one small object alone on paper, then a full-bleed diagonal of stripes. The ground is paper white, the ink
is black, and colour is two or three primaries used as punctuation. Give it a topic ("a ramyeon recipe", "our store
opens Friday", the hook of a song the user wrote) and it writes the brief, breaks the words into beats, designs the
props and pictures in code, and renders it.

Made in this repo after the post by 만원만 (@manwon_man) on X —
https://x.com/manwon_man/status/2120126792552075760?a=3V9KnKatoYSIYnqo_y4&s=19: a 14.4 s screen recording of an After
Effects project by @mosyenboy, a kinetic-typography reinterpretation of a song, shown above its timeline. This skill is
about the picture in the viewer, not the After Effects project: it keeps that film's grammar (references/LOOK.md) and
rebuilds it as a reusable engine in three.js. The worked example `examples/ramyeon` 「라면 4분 30초」 (14.1 s, 20 shots,
10 props) is a new topic designed from a brief. Never recreate the reference's song, its lyrics, its objects or its layouts.

**Fixed (the style)** — a beat grid, a hard cut on a beat, shots mostly ½–2 beats (mean ≤ 1.25 s, usually ~0.6 s); no
fades, dissolves, glows or blur; a paper ground with black ink, an occasional ink or accent ground, at most three
accents; heavy type as geometry in 3D (it occludes and is occluded); scale flips across every cut (far ↔ too close);
every shot has one move that slams in and keeps creeping to the cut; density by layers — scenery type, a prop, a
picture, a label, a caption; the device list in references/LOOK.md (letters as architecture, macro glyph, hero prop,
prop too close, band squeeze, bitmap type, swatch → strips, sign swarm, words printed on the object, window with a word
behind and a word in front, pile with a tag, end card); studio light with one soft shadow on the ground; 30 fps.

**Designed per topic** — the words (what is said, in which language, which words are scenery and which must be read),
the beat count of each, the tempo and the beat itself, the props (what objects the lines name, built from the kit's
parts), the pictures (signs, swatches, stickers drawn in code or the user's images), the accents and prop tints, which
device carries which line, every camera move, the frame size, the end card. The template (a first coffee on a Monday)
and the example (a ramyeon recipe) are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | the engine: `Film` (beat grid, shots, layers `under` / world / `over`, camera, light, inset window, live player, `runChecks`, `cues`, the contract), the tween helpers `tw tb seq seqb on stepped`, easings `E` |
| `lib/type.js` | type: bundled font voices (`sans italic cond han serif brush text note`), string → distance field → plane; label boxes, outline, bitmap (`pixel`) type, per-character layout with squeeze |
| `lib/kit.js` | the parts props and pictures are built from: materials, canvas painters (`K.tex.*`), solids (`box rbox cyl sphere lathe torus extrude tube`), plates (`slab disc`), `group` / `at`; the studio reflection |
| `lib/fonts/` | Inter, Anton, Noto Sans KR, Black Han Sans, Nanum Myeongjo, Nanum Brush Script (SIL OFL; Hangul subset to KS X 1001) |
| `lib/three.module.min.js` | three.js r170 (MIT) |
| `templates/` | `film.html` (「커피 먼저」, 8 s, 10 shots, 3 props), `BRIEF.md` |
| `examples/ramyeon/` | the worked example: `BRIEF.md`, `index.html` (14.1 s, 20 shots), `props.js` (10 props) |
| `scripts/new-film.mjs` | start a project from the template or `--from ramyeon` |
| `scripts/check.mjs` | proves the page: loads clean, cutting pace, every `read` word whole in frame and on long enough, each shot drawn and moving, every cut changes the picture, no strobing, colour stays the accent, deterministic |
| `scripts/render.mjs` | the shot sheet, a strip of one shot, the prop sheet, stills, the preview, the MP4 (`--audio`) |
| `scripts/score.mjs` | the synthesised beat from the film's grid → WAV |
| `references/` | **BRIEF** (topic → brief, review lists) · **LOOK** (the grammar, observed from the source) · **ENGINE** (shots, elements, values, camera, checks, contract) · **KIT** (designing props and pictures, GLB) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md      the topic written out (references/BRIEF.md) — written first
  film.html     new Film({...}) → F.prop(...) → F.shot(...) × 12–40 → F.check(...) → F.start()
  props.js      (optional) the props in their own module when there are many
  lib/          copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("ktc/")
  assets/       (optional) the user's images, fonts, track, GLBs with their credit lines
  out/          sheets, stills, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet --scale .4`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On SwiftShader (CPU WebGL) a
1350 × 1080 frame takes ~0.2 s; the 14 s example renders in about a minute and a half with 4 workers.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it (references/BRIEF.md says how): the one line the film says,
   the words broken into beats, which words are scenery and which are `read`, the tempo, the objects the lines name,
   the pictures, the accents, a shot list that gives each line a device and flips scale at every cut. Save it as
   `BRIEF.md` before any code. Words come from the user or are written for the topic — never another artist's lyrics
   unless the user holds the rights. If the user gives a reference clip, tile it
   (`ffmpeg -i ref.mp4 -vf fps=6,scale=360:-1,tile=6x6 sheet.jpg`) and read its devices and pace; then design your own.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from ramyeon`). Replace the template's words, props and shots.
3. **Props** (references/KIT.md). One `F.prop(name, (K) => …)` per object the lines name, built from the kit's parts,
   resting on y = 0. Check Polyfork first when a line needs a creature or a vehicle (references/KIT.md → GLB).
   `render.mjs film.html --props --scale .4` shows each from four sides; score it against the prop review in
   references/BRIEF.md and fix before writing shots.
4. **Shots** (references/ENGINE.md). One `F.shot(name, { beats, cam, … }, (S) => { … })` per beat-group, each with a
   device from references/LOOK.md and one move. Mark the words the viewer must catch `read: true`. Scenery words may
   bleed off the frame; `read` words may not.
5. **Sheet and review**: `render.mjs film.html --sheet --scale .4` (every shot at 60 %), then `--strip <shot>` for any
   shot whose move is in doubt, and ~8 moments full size (`--stills`). Score against the still review in
   references/BRIEF.md. The live page helps here: `film.html?shot=<name>&hud=1` loops one shot.
6. **Check**: `node <skill>/scripts/check.mjs film.html` must end with `check OK` (warnings are read and either fixed or
   accepted on purpose). Add `F.check(name, fn)` for the film's own rules.
7. **Beat**: `node <skill>/scripts/score.mjs film.html --out out/film.wav` (patterns in `new Film({ score })`, per-shot
   `mix` / `accent` / `sfx`). Or use the user's track: set `bpm` to its tempo and pass the file to `--audio`.
8. **Render**: `render.mjs film.html --preview --audio out/film.wav`, watch it with sound, then
   `render.mjs film.html --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4 before handing it over.
9. **Live page** (if it goes on a site): the same `film.html` loops; ship it with its `lib/` (only the fonts it loads).

## Rules
- **Design for the topic.** Every word, prop, picture and device is chosen because it tells this topic. Do not reuse the
  template's mug and beans or the example's pot, noodles and timer unless the topic is exactly theirs; never recreate
  the source's song, lyrics, objects (its shop houses, cups, guitar, clock, tiles) or layouts.
- **One style.** Paper, ink, ≤ 3 accents for type, bars and grounds (`colors`); prop colours go in `tints`. Type is
  flat, heavy and unlit; props are lit solids with one soft shadow. No gradients on type, no glows, no drop shadows on
  words, no outlines around props, no textures behind words. A new device follows the same marks or it is not this style.
- **Cut, never fade.** Every change of shot is a hard cut on the beat grid. Inside a shot nothing fades in or out:
  things are there or not (`show: [beat, beat]`), and they arrive by moving.
- **Flip scale at every cut.** The check measures that a cut changes the picture; design it: huge → tiny, flat → deep,
  paper → ink, word → object.
- **Every shot moves, and keeps moving.** One slam (camera, word or prop) that still creeps on the last frame. The
  final card is the only hold (`hold: true`).
- **Words are few and heavy.** One to three words per shot. A `read` word is whole inside the frame, ≥ 24 px tall, and
  on for ≥ 0.3 s (the check adds time per syllable). Captions (`note`, `text`) are texture: a line or two, never a sentence
  the story depends on.
- **Colour is punctuation.** Strong colour stays under about a quarter of the film (the check reports it); a full
  accent ground lasts one or two beats.
- **No strobing.** At most three light ↔ dark ground swings in any second (the check fails more).
- **No characters.** People and animals do not act in this style; a figure appears only as a pictogram on a sign or as a
  still prop. (If a GLB creature is used as a prop it stands or turns — no walk cycles.)
- **Pure function of t.** No `Math.random`, `Date` or state between frames in a page: use `S.K.rng(seed)` at build time
  and compute every per-frame value from `(p, lt, b)`. `check.mjs` proves it.

## Contract every film page fulfils
`window.seek(t)` / `window.renderAt(t)` render frame t (seconds); `window.DURATION`, `window.FPS` (30),
`window.SIZE = {W, H}`, `window.shotAt(t)` (`{i, name, lt, p, b}`), `window.runChecks()`, `window.cues()` (for the
beat), `window.showProp(name, yaw, pitch)` (the prop sheet), `window.film`, `window.READY = true` — all set by
`F.start()`. `?render=1` = fixed canvas, no live loop; `?t=6` = one frozen frame; `?scale=.5` = render size;
`?shot=name` = loop one shot; `?speed=.25`; `?hud=1` = shot name and beat; `?audio=out/film.wav` = play in sync after
a click; `?off=under,world,over,ground`. Live keys: space = pause, ← → = previous / next shot, L = loop the shot. The
frame is `#frame`.
