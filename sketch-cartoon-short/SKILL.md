---
name: sketch-cartoon-short
description: Make a short animated cartoon (20–60 s) in an expressive, sketchy, unfinished hand-drawn style — rough overshooting pencil lines that boil, muted sage / olive / dusty-teal colour laid on flat and a little off the lines, toned paper showing through, long-limbed characters with big hair and exaggerated faces, line-drawn towns that fade to bare pencil at the edges, scribble masses for dark things, a story that is drawn onto a blank page and ends back on it — drawn entirely in code on an HTML Canvas, with a synthesised chamber-cartoon score and pencil / paper sound effects. Outputs a live page and a 1920×1080 MP4 (24 fps). Give it a topic and it designs the cast, the places and the shots. Use when asked for a "sketchy cartoon", rough-pencil / unfinished-look animation, an animated doodle short, "make this style move", "make a video like this but about X", a drawing that comes alive on the page, or to remake a sketchy-cartoon reference on a new subject ("스케치 느낌 애니메이션", "연필 선 카툰 영상", "거친 선 만화 애니메이션", "미완성 느낌 그림체로 움직이는 영상", "이 그림체로 ○○ 이야기 만들어줘", "이 스타일로 주제만 바꿔서", "종이에 그린 그림이 살아 움직이는 영상", "sketch cartoon short", "pencil animation in code"). Source — made from https://x.com/Artedeingenio/status/2117622425873736092 (quoting https://x.com/Artedeingenio/status/2117254123653321201).
---

# sketch-cartoon-short

A short cartoon that looks drawn by hand on toned paper and never quite finished: every line is a pencil stroke that
overshoots its corners and boils from drawing to drawing, colour is laid flat and slightly off the line, the paper shows
through everywhere, backgrounds are line drawings whose wash stops before the edges, and dark things are living pencil
scribbles. Characters are long-limbed and expressive — big hair, wide trousers, oversized coats, eyes and brows that act.
Give it a topic ("a boy and his runaway umbrella", "a girl who mails a letter to the moon", "the last bus of the night")
and it writes a brief, designs the cast in the style, builds the places from the kit, and animates 5–9 shots on twos.
Every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Made in this repo after the post by OscarAI (@Artedeingenio) on X — https://x.com/Artedeingenio/status/2117622425873736092,
a 30-second clip of a girl and her long-eared pet chased through a pencil city by a scribble creature, animated from
stills in his Midjourney style reference (quoted post: https://x.com/Artedeingenio/status/2117254123653321201 — "rough
linework, muted colors, exaggerated expressions, and that beautiful unfinished look"). That clip was made with image and
video generators; this skill keeps its look and its grammar (`references/LOOK.md` lists what was observed) and draws
everything with its own deterministic Canvas code. The worked example `examples/umbrella` 「The Runaway Umbrella」
(35.5 s, 8 shots) is a different story with an original cast. Never recreate the reference's characters, creature or
shots — design new ones for each topic.

**Fixed (the style)** — toned paper and the grade; the pencil (double overshooting strokes, taper, 8 boils a second); flat
misregistered fills with one shadow side and dry-marker texture; the muted palette with one warm accent; the cast's
construction (long legs, small torso, big hair masses, oversized clothes, almond eyes with a heavy upper lid, acting
brows); backgrounds in line with partial wash; scribble masses; drawn-on reveals and the return to the blank page;
motion on twos with key poses and holds; 1920×1080 at 24 fps; the pencil / paper sound palette.

**Designed per topic** — the hero and companion (silhouette, hair, clothes, colours, proportions), any antagonist or
force (a scribble beast, a storm, a crowd, a machine), the places (which streets, roofs, bridges, rooms, landscapes, and
new props drawn for the topic), the one warm accent and what carries it, the beats and the stunt, the camera, the score's
tune and the effects. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/sketch.js` | the pencil: `line`, `loop`, `strokes`, `fill` (misregistered, textured), `shadeSide`, `shape` (fill + shade + outline; `sharp` for architecture), `hatch`, `scribble`, `wash`, `paper`, `construction`; the pen (`pen.boil`, reveal budget, `countStrokes`); points (`rect`, `ellipse`, `arc`, `curve`, `sub` …); `span`, `ease`, `keys`, `rng`, `n1`; colour `mix`, `tone`, `rgba` |
| `lib/rig.js` | `person(ctx, spec, pose)` (people from data: proportions, hair styles, garments, faces, 13 expressions) and `critter(ctx, spec, pose)` (four-legged companions: sit, stand, walk, run, leap, crouch); `where()` (geometry without drawing); poses `stand`, `walk`, `run`, `leap`, `crouch`, `reach`, `fall`; `pose()` merge, `blend()`. Feet are planted on the ground line by the rig; joint ranges (`LIM`) are audited on every draw (`body: …` in the checks) |
| `lib/kit.js` | places: `facade`, `street`, `avenue` (one-point perspective street), `skyline`, `bridge`, `roofs`, `lamp`, `door`, `ground`, `shadow`; effects: `speed`, `puff`, `sheet`, `pencil`, `ring`, `rain`, `gust`, `mass` (a scribble mass with optional eyes), `trail` |
| `lib/film.js` | `Film`: `plate()` (painted once per boil variant), `shot(dur, draw, {cam, shake, tr})`, multiplane `g.put / g.at`, `g.paper()`, `g.twos()`, `g.drawOn(k, fn)`; transitions `dissolve`, `scribble`, `paper`, `white`, `black`; the paper grade; live player with sound; `check()`; the contract |
| `lib/score.js` | `renderScore(spec, sr, dur)`: pluck, felt keys, upright bass, reed lead, harmonium pad, brushes, air / rain beds, sfx (`pencil`, `erase`, `paper`, `flip`, `whoosh`, `pop`, `boing`, `step`, `thump`, `thunder`, `fwump`, `chime`, `scribble`, `splash`), reverb; helpers `oompah`, `tune`, `beat` |
| `templates/` | `BRIEF.md` (the brief to fill from the topic), `cast.js` + `cast.html` (the cast as data and its sheet), `film.html` (a commented 10 s, 3-shot film), `score.js` |
| `scripts/new-film.mjs` | start a project: `lib/` + the template (or `--from umbrella`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 24`), or the MP4 (workers × ffmpeg chunks, `--audio out/x.wav`) |
| `scripts/score.mjs` | the score → WAV (`score.js --dur 35.5 --out out/film.wav`) |
| `scripts/check.mjs` | proves the page: loads clean, every shot draws, no blank frames, deterministic, the film's rules and the body rules (joints in range), colours muted, lines boil, the score renders |
| `references/` | **BRIEF** (topic → brief, the cast and still reviews) · **LOOK** (what makes it read as this style, observed from the reference) · **STORY** (shot grammar, timing, a shot table) · **KIT** (API) · **LESSONS** (what broke and the fix) |
| `examples/umbrella/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html`, `umbrella.js` (a prop designed for the topic), `index.html` (8 shots), `score.js` |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written out (references/BRIEF.md) — written first
  cast.js      the people and animals as data (rig specs) — designed from the brief, reviewed on cast.html
  cast.html    the cast sheet (turns, gaits, faces)
  film.html    palette → plates → props → shots (F.shot) → checks (F.check) → F.start()
  props.js     (optional) props and creatures designed for this topic, drawn with lib/sketch.js
  score.js     export const SCORE = { pluck, keys, bass, reed, pad, brush, air, rain, sfx }
  lib/         copy of the skill's lib/ (new-film.mjs); pages import it through an import map ("scs/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (Canvas 2D: ~0.1–0.2 s a 1080p frame;
35 s renders in ~4 min with 4 workers).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the
   hero and companion as silhouettes in words, the force against them, 2–4 places, the one warm accent and who carries
   it, the stunt (the one big physical moment), the beats as a 5–9 line SCENE, the sound. Save it as `BRIEF.md` before
   any code. If the user gives a reference image or video, extract stills (`ffmpeg -i ref.mp4 -vf fps=1/2,tile=4x4 sheet.jpg`),
   note its palette, line, proportions, shot sizes and transitions — then design your own cast and story.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from umbrella` to start from the 8-shot film).
3. **Cast.** Write `cast.js` from the brief — every person and animal designed for this topic (references/LOOK.md → the
   cast; the spec fields are listed at the top of `templates/cast.js`). Render `cast.html --stills 0 --scale .5` and score
   it against the cast review in references/BRIEF.md: readable silhouette at 30 % size, long legs, hair as a mass, two
   people never in the same values, muted colours, faces that act — and the body: the sheet turns each person both ways, so
   check that chest, coat opening, toes and the narrower eye are on the side the face points to, the ear and the in-front
   arm and leg on the side behind it, knees fold back, elbows forward, a critter's front paws fold back and hind paws
   forward. If a pose makes you ask "did the neck turn or the body?", it fails. Fix and re-render until it passes.
4. **Props and places.** Anything the topic needs that the kit lacks (an umbrella, a bicycle, a moon, a kitchen, a
   whale) is drawn in a `props.js` / in the page with `S.shape`, `S.line`, `S.hatch` in the same pencil — closed shapes
   with `sharp: true` for anything built, smooth for anything soft. Places come from the kit with your palette; paint each
   into a plate (`F.plate(w, h, paint, { boil: 2 })`), wider than the frame by the camera's travel × depth.
5. **Shots, one at a time** (references/STORY.md): the page draws the world on (`g.drawOn`) → the inciting beat → the
   chase / journey → the stunt → the turn → the return to the blank page. 3–6 s each, 25–45 s total. In each `draw(g, lt)`:
   `g.paper()`, plates back to front (`g.put(plate, x, y, z)`), contact shadows (`K.shadow`), the cast (`R.person`,
   `R.critter`) at `g.twos()` time, props in hands (`G.hands.near`), effects, rain on screen. A still after each shot:
   `render.mjs film.html --stills 9 --scale .5`.
6. **Motion**: characters and effects on twos (`g.twos()`), camera and light smooth. Key poses with holds; anticipation
   before every big move (crouch before the leap, a wind-up before the run); squash on landing; overlap in hair and coat
   (`wind`, `flow`). Arcs for jumps and thrown things. Paths that must meet (a hand catching a prop) are aimed with
   `R.where()` at the meeting time.
7. **Sheet and review**: `render.mjs film.html --sheet 24 --scale .5`, then ~12 random moments as full stills and score
   each against the still review in references/BRIEF.md: lines rough and boiling, colour off the line and stopping short,
   paper visible, muted with one accent, faces readable, nothing floating, nothing cut off that matters (a held prop's
   top, a head), no empty or muddy frame. Fix and repeat.
8. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`. It fails any pose outside the joint ranges
   (`body: Juno near knee out of range …` — give every spec a `name`). Add `F.check(...)` for the film's own rules: feet on
   the ground while running, everyone facing the way they travel, the hero in frame, the prop in the hand after the catch.
9. **Score**: write `score.js` against the shot starts (check.mjs prints them): pencil while the page draws, a light
   oom-pah or tiptoe pizzicato under the comedy, a reed or felt-piano tune for the hero, everything drops out for the
   threat, a swell and a chime at the turn, a small button at the end; effects on the beats (steps on the footfalls,
   boing on jumps, thump on landings, fwump, flips and paper flutter). Listen on the live page (♪), then
   `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4
    (`ffmpeg -ss 20 -i out/film.mp4 -frames:v 1 x.png`) before handing it over.

## Rules
- **Design for the topic.** The cast, the props, the places and the accent are made for this topic. Do not pull in the
  template's girl and pet or the example's boy, dog and umbrella unless the topic is exactly theirs; never recreate the
  reference clip's characters or its scribble creature.
- **One style.** Everything new is drawn with the same pencil and the same rules: overshooting double lines, flat fills
  off the line, one shadow side from the upper left, the muted palette, toned paper. No gradients on characters, no
  glossy highlights, no clean vector outlines, no outlines-only characters.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames: `S.rng(seed)` in plate painters, `hash`,
  `n1`, `keys`, `span`, `ease` in shots. `check.mjs` proves it.
- **Lines boil, drawings hold.** The pen's boil changes 8 times a second (film.js); characters move on twos
  (`g.twos()`); the camera, light and rain on screen stay smooth. Never animate a character's pose on every frame.
- **Muted, one accent.** Sage, olive, khaki, dusty teal, cream, graphite; one warm accent (dusty red / salmon / ochre)
  carried by one thing the story is about, echoed at most in a background detail. `check.mjs` fails loud colour.
- **Unfinished on purpose.** Backgrounds wash only part of each wall and fade to bare line toward the frame edges;
  the paper shows in every frame; construction marks and open line ends are welcome. But characters are always fully
  coloured and readable.
- **Nothing floats.** A contact shadow under everything standing; the rig plants the lowest sole on the ground line
  (and leans on it); write a check for it.
- **Bodies that can exist.** Head, chest, hips and toes face one way; in a 3/4 or profile view the near shoulder and hip
  are on the screen side behind the face (a figure facing right shows its right side) — the rig builds this, so never
  fake a turn by mirroring parts. Knees fold back, elbows forward, wrists and necks within range (`R.LIM`; the check fails
  outside it); a critter's lower front leg folds back, the lower hind leg forward. Characters face the way they move. A raised
  near arm covers the face — reach with the far arm or turn the body. Every new pose and every new character is looked at
  facing both ways on the cast sheet before it goes into a shot.
- **Paint once, move many.** Backgrounds go into plates (2 boil variants); per frame only the cast, props and effects
  are drawn fresh.
- **Readable at a glance.** The hero's head and the story prop are never cut by the frame when they matter (aim the
  camera, shorten the prop, lower the figure); one action per shot.
- **No text on screen** except something drawn in the world (a sign, a note on a sheet).

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (24), `window.SIZE = {W, H}` (1920×1080 stage units),
`window.runChecks(t)` (names of broken rules), `window.shotAt(t)` (`{i, name, lt}`), `window.film`, `window.__ready = true`
— all set by `F.start()`. `?render=1` = fixed canvas, no live loop; `?t=20` = one frozen frame; `?scale=.5` = preview size
(plates are painted at that size); `?off=grain,grade,vignette`. The live page fits the window, draws at 24 fps and loops;
click or space pauses, ← → jump a second, the bar scrubs, ♪ plays the score in sync.
