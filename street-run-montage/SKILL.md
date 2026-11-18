---
name: street-run-montage
description: Make a 30–60 s anime-style street montage in which one rider skateboards through an everyday town on a clear day with an animal companion running alongside — cel-shaded 3D (two-tone shading with cool blue shadows, warm skin, ink outlines on the bodies, painted cumulus, hard sun shadows, petals or leaves in the air), cut fast on the beat (a new camera every ~2 s: low tracking, worm's-eye over a jump, feet on the board, face close-up, pass-by, overhead, orbit), the background streaking with motion blur behind a sharp subject, real tricks (push, ollie, kickflip, shuvit, grind with sparks, manual, carve) and a cheering stop at the end; rendered in code with three.js to a live page and a 1920×1080 MP4 with a synthesised groove and every board / animal sound. Give it a topic and it designs the rider, the companion, the town, the route, the tricks, the shots and the tune. Use for "anime skateboard video", "skater and a cat running through town", "montage of a kid skating to …", "cel-shaded street run", "make a video like this but about X", or ("스케이트보드 애니 영상", "고양이랑 같이 달리는 애니메이션", "동네를 질주하는 몽타주", "셀 셰이딩 스케이트 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서"). Source — made from https://x.com/keshiAIart/status/2122300022280823089?a=XFn7wiVQgUnXUe0tASY&s=19
---

# street-run-montage

A one-minute anime montage of a ride: a rider on a skateboard and an animal that runs with them cross a town on a
bright day, and the film cuts to a new camera on every few beats — down the street on a long lens, the wheels at deck
height, a worm's-eye view as the board flies over, the face looking down at the companion, a pass-by, a top-down, an
orbit round a trick — until they make it and the rider steps off and cheers. Everything is code: a three.js scene with
two-tone cel materials (the shadow side is the light's cool tint, skin keeps a warm peach shadow), ink hulls on the
bodies, a painted sky, a town built along the route, a rigged rider and a rigged quadruped, and a 2-D post that smears
the background along the motion while the subject stays sharp. Give it a topic ("a girl and her corgi racing to the last
ferry", "a delivery boy and a crow at dawn", "the first day of summer holidays") and it writes a brief, designs the cast
as data, lays out the route and the town around the action, keys the ride in story time, cuts it into shots on the beat,
and writes the groove. Every frame is `seek(t)`, so the same page plays live with sound and renders to MP4.

Made in this repo from keshi's post on X — https://x.com/keshiAIart/status/2122300022280823089?a=XFn7wiVQgUnXUe0tASY&s=19 —
a 60-second clip (2560×1440, ~28 cuts) of a skater and a black cat running through a sunny autumn town.
`references/LOOK.md` lists what was observed in it (stills pulled with ffmpeg, cut times measured). That clip is
AI-generated video; this skill rebuilds the *form* — the cel look, the cutting, the cameras, the blur, the pairing of a
rider and an animal — with its own code, and never its cast, its town or its shots. The worked example,
`examples/ferry-bell` 「The Ferry Bell」 (36.8 s, 16 shots, two in slow motion), is a different story with an original
cast (a girl in a mint windbreaker and her corgi, a spring harbour town).

**Motion.** The rig carries the motion grammar (references/MOTION.md, after the repo's `references/MOTION-QUALITY.md`):
weight sets timing, every pop gathers first and every landing absorbs, planted feet and paws never slide (they are
fixed world points from touch-down to lift-off), the idle breathes. Moves are keyed by numbers (pop time, height, crouch,
lane); for a move the library lacks, take a reference (a filmed clip, or a video-model clip kept out of the repo) →
pick key poses → write them as rig numbers in the project. ElevenLabs or any paid generator only after the owner says yes.

**Fixed (the style)**: a ride of one rider + one animal companion through an everyday town; 16:9 at 30 fps, cut on the
beat every ~1.5–3 s, ≥ 5 kinds of camera, never the same camera twice in a row; two-tone cel shading with the light's
cool shadow tint, warm skin shadows, ink only on the bodies and the board; a clear sky with painted cumulus and hard
shadows; the background streaking behind a sharp subject on moving shots, diffusion glow, flare, grain; tricks that
gather and land; a stop and a cheer at the end; an upbeat groove locked to the cuts and the ride's own sounds.

**Designed per topic**: the rider (build, mass, hair, cap or beanie, top, shoes, board graphic, stance), the companion
(cat, dog, corgi, fox — or a new kind in `KINDS`), the season and the light, the route (hills, bends), the town (zones,
shop signs, landmarks, the place they are going), the ride (speed, lanes, which tricks where), the companion's path
(which side, leaps, calls, the sit), the shots, the key and the tune. The template and the example are examples of the
style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Run`: route, cast, ride, buddy, town, shots (in beats; story time runs on, `rate` for slow motion, `back` to repeat action across a cut), camera rigs (`CAMS`: side, low-side, front, low-front, rear, feet, face, buddy, worm, pass, wide, overhead, orbit, hero), cameras pulled clear of walls, shadows that follow the shot, the post (background streak or zoom blur behind a masked sharp subject, glow, flare, speed lines, flash / fade, vignette, grain), sparks, dust, falling leaves / petals, the checks and `report()`, the live player and the contract |
| `lib/rider.js` | the rider and the board from a spec (oversized hoodie, shorts, socks, sneakers, cap / beanie, anime face texture with blinks, hair locks that trail), two-bone leg IK with fixed bones and the knee on the body's front, feet locked to the deck or to the ground point they planted on, `plan({ speed, lane, moves })` and `pose(tau)`; moves: push · ollie · kickflip · heelflip · shuvit · hop · grind · manual · carve · tuck · look · wave · point · fist · armsOut · cheer · dismount; `LIM` joint limits |
| `lib/critter.js` | the companion (`KINDS`: cat, dog, corgi, fox): walk / trot / gallop from speed, stride limited by what a leg can reach, planted paws at fixed world points, spine flex, tail and ears, leaps (gather · air · absorb), sit (steps into place), call (meow / bark), look |
| `lib/town.js` | `Route` (segments with turns and rises → s, heading, height) and `Town` (K): zones (`lane`, `shops`, `river`, `park`, `plaza`, `harbor`) and pieces placed in route coordinates (s, x) or under an action (`{ tau }`): road, walk, wall, hedge, fence, guard, railing, rail, ledge, house, apartments, pole + wires, tree, bench, vending, mirror, lamp, bollard, planter, sign, shop (sign text designed per topic), station, bridge, river, boat, ground; `K.box`, `K.sweep`, `K.put`, `K.mat` for new pieces |
| `lib/look.js` | `LIGHTS` (noon · afternoon · golden), `SEASONS` (autumn · spring · summer · winter), cel materials (`cel`, `shadeTint`), ink hulls, painted canvas textures (asphalt, tiles, blocks, bricks, facades, roofs, water, signs, shelves, chain-link), the sky dome and cloud cards |
| `lib/score.js` | `arrange(info, {...})`: sections from the shots (intro, groove, lift, drop, break for slow motion, outro), e-piano, synth bass, pluck, pad, lead / bell, drums, the ride's sounds from the film's events (pop, land, flick, grind, push, step, call, cheer), wheel roll from the speed, seam clacks, beds (air, birds, city, river, wind), a horn; `renderScore` |
| `lib/sheet.js` | `castSheet(CAST)`: the rider turned six ways, every key pose facing right and left, the companion turned, its gaits, its leap, its sit |
| `templates/` | `BRIEF.md`, `cast.js` + `cast.html`, `index.html` (a 12 s, 5-shot starting film), `score.js` |
| `scripts/new-run.mjs` | start a project (template, or `--from ferry-bell`) |
| `scripts/render.mjs` | stills (`--stills 3,12`), a contact sheet (`--sheet 16`), or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/score.mjs` | the page's score → WAV |
| `scripts/check.mjs` | proves a page or a cast sheet (see Workflow 7) |
| `references/` | **BRIEF** (topic → brief, the cast and still reviews) · **LOOK** (observed from the source; the values) · **CAMERA** (the shot grammar, the rigs, cutting) · **MOTION** (weight, gathers, contacts, what the check measures) · **KIT** (API) · **LESSONS** (what broke and the fix) |
| `examples/ferry-bell/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html`, `index.html` (16 shots), `score.js` |

## Project layout (what you create)
```
my-run/
  BRIEF.md     the topic as a ride: cast, place, route, beats, shots, tune (references/BRIEF.md) — written first
  cast.js      the rider + the companion as data — reviewed on cast.html before any shot
  cast.html    the cast sheet
  index.html   route → cast → ride → buddy → town → shots → score → F.start()
  score.js     the tune + arrange(info, …)
  lib/         copy of the skill's lib/ (new-run.mjs); pages import it through the import map "srm/"
  out/         stills, sheets, the WAV and the MP4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs index.html --sheet 16 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flags.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (WebGL on SwiftShader: ~0.13 s a
frame at preview size, ~1 s a 1080p frame; a 37 s film renders in a few minutes with 4 workers).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it in from the topic (references/BRIEF.md): who rides (look,
   mass, stance, idle), the companion (kind, colours, mass, how it moves with the rider), where they go and why (the
   destination is the last shot), the season and the light, the route as 4–6 places, the beats (6–10 tricks / moments
   in story time, each with its gather and its landing), the shot list (one camera per beat, cut on the beat), the tune.
   Save it as `BRIEF.md` before any code. If the user gives a reference video, pull stills
   (`ffmpeg -i ref.mp4 -vf fps=1/2.5,scale=640:-1,tile=4x6 sheet.jpg`) and the cut times
   (`ffmpeg -i ref.mp4 -vf "select='gt(scene,0.25)',showinfo" -f null -`), note the look and the pacing, then design your own.
2. **Start**: `node <skill>/scripts/new-run.mjs my-run` (or `--from ferry-bell`).
3. **Cast.** Write `cast.js` (fields in references/KIT.md). Render `cast.html --stills 0`, run `check.mjs cast.html`, and
   score the sheet against the cast review in references/BRIEF.md: the face, chest and toes on one side, the knees
   forward, the head turned to the nose while riding, both sides read, the board under both feet, the companion's
   paws planted and its lower legs folding the right way (front back, hind forward). Fix and repeat.
4. **Route, ride, town.** Write the route (`F.route`), then the ride in story time (`F.ride`: speed keys that only rise
   with a push or a slope, lane keys, the moves), the companion's path (`F.buddy`), and the town around them
   (`F.town`: zones, then the pieces the beats need — a planter under the ollie with `K.planter({ tau })`, the ledge of a
   grind comes from the grind itself). Shop signs, the destination and the landmarks are designed for the topic.
5. **Shots.** One camera per beat (references/CAMERA.md), in beats so every cut lands on the grid; a fixed camera
   (`worm`, `pass`, `wide`, `hero`) is placed from the shot's anchor moment (`atTau` / `anchor`); slow motion is
   `rate: .5`. Take a still mid-shot for each: `render.mjs index.html --stills 4.8,8.7 --scale .5` and look.
6. **Sheet and review**: `render.mjs index.html --sheet 16 --scale .5`, then a still per shot, scored against the still
   review in references/BRIEF.md: the subject the shot is about is in frame and readable, the background streaks but
   the bodies are sharp, no camera inside a wall, nothing floats or slides, every trick gathers and lands, the companion
   is alive, the last shot shows the destination. Fix and repeat.
7. **Check**: `node <skill>/scripts/check.mjs index.html` must print `ok`: clean load, every shot draws, deterministic,
   cuts on the beat, shot lengths, camera variety, no camera below ground or in a solid, subject in frame, joints and
   reach, planted slip (mm), a gather before every pop, a breathing idle, no speed-up without a push or slope, your
   `F.check()` rules, the score renders. It prints the numbers (slip, gathers, idle, cost of a frame, loudness).
8. **Score**: write the tune in `score.js` (degrees and beats, one chord root a bar); sections follow the shots (or give
   `sections`); events place the board and animal sounds. Listen on the live page (♪), then
   `node <skill>/scripts/score.mjs index.html` → `out/<name>.wav`.
9. **Render**: `render.mjs index.html --workers 4 --audio out/<name>.wav` → `out/<name>.mp4`. Look at stills from the MP4
   before handing it over.

## Rules
- **Design for the topic.** The rider, the companion, the town, the signs, the route, the tricks, the shots and the tune
  are designed for this topic. Do not reuse the template's kid and dog or the example's girl and corgi unless the topic
  is exactly theirs. Never recreate the source clip's skater, cat, town or shots, and never put a real brand on a sign.
- **One style.** Everything new keeps the language: `cel()` materials (two tones, the light's shadow tint; `shade` only
  for skin-like warm materials), ink only on bodies and the board, the sky and light presets, the post. No tone mapping,
  no realistic textures.
- **Cut on the beat.** Shots are written in beats; cuts land on the grid (the check allows half a frame). 1.5–3 s per
  shot on average, ≥ 5 kinds of camera, never the same camera twice in a row; slow motion only on a trick.
- **The camera never cheats.** Never inside a wall or below the ground (cameras are pulled clear along their line of
  sight; place fixed ones where they see). The subject a shot is about stays in frame.
- **Pure function of t.** No `Math.random`, no `Date`, no state carried between frames — tables are built once in
  `plan()`; seeded `hash` / `n1` for everything else. `check.mjs` proves it.
- **Weight sets timing.** Mass in the brief sets crouch depth and gather length; big moves take longer to gather and to
  settle. The companion's stride is limited by its legs; a heavy short-legged animal takes quick steps.
- **Feet and paws stay planted.** The rider's feet are on the deck, or on the ground point they planted on (push,
  dismount); the companion's paws are fixed world points from touch-down to lift-off and step into place when it stops.
  Speed only rises with a push or a slope. The check reports slip in mm.
- **Gather, act, settle.** Every pop has a crouch before it (≥ .12 s, against the action) and an absorb after the
  landing; leaps gather; cheers and fist pumps dip first. The check fails a pop without a gather.
- **Bodies that can exist.** Head, chest and toes on one side; knees forward, elbows down, neck within `LIM`; riding
  side-on, the head turns to the nose; front legs of the animal fold back, hind feet fold forward. Look at the cast sheet
  both ways before any shot.
- **Alive at rest.** The rider breathes and blinks; the companion breathes, flicks its ears and swishes its tail; the
  world has leaves or petals, clouds and birds in the sound.
- **Generated media is reference only.** A clip used to find key poses stays out of the repo (`ref/`, git-ignored);
  only the numbers taken from it are committed, with a line in the brief saying what was used.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (30), `window.SIZE = {W, H}` (1920×1080),
`window.runChecks(t)` (names of broken rules at t), `window.report()` (film-level problems and numbers),
`window.info()` (shots, events, speed — what the score is built from), `window.shotAt(t)` (`{ i, name, cam, lt, tau }`),
`window.film`, `window.__ready = true` — all set by `F.start()`. `?render=1` = fixed canvas, no live loop; `?t=20` = one
frozen frame; `?scale=.5` = preview size; `?off=blur,glow,flare,lines,grain,vignette,leaves`. The live page fits the
window (rendering at .6 of 1080p unless `?scale=1`); click or space pauses, ← → jump a second, the bar scrubs (ticks mark
the cuts), and ♪ plays the score in sync.
