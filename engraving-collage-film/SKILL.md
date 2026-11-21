---
name: engraving-collage-film
description: Make a 2.5-D engraving-collage film — a world built entirely from 19th-century-style engravings (swelling parallel lines, crossing hatches in the shadows, broken dashes in the light greys, line-screen skies and clouds), each subject cut out of paper and stood in 3-D as a flat card with a soft paper-lift shadow, fading into the paper with distance and going soft past the lens, cards hinging up out of the ground as the camera arrives; through it a sweeping camera follows flat cel-painted characters (the only colour on screen: one base and one shade per material, a thin warm outline) who walk, run, jump, turn, point and wave on key poses with planted feet. Outputs a deterministic page and an MP4 in the making-of format the source uses — the 2.39:1 comp on top, the same moment's 3-D breakdown underneath (transparency checkerboard, every card outlined in its layer colour with corner handles, the shot camera as a frustum with its path) — or the comp alone, with a synthesised chamber score, paper flips on cuts and footstep foley. three.js + Canvas, everything drawn in code (an engraver, a kit of façades, a clock tower, skylines, trees, clouds, skies, seas, ships, lamps, passers-by, balloons, ground sheets), a cel rig with a cast sheet and body / motion checks, no network, no GPU. Give it a topic and it designs the world, the subjects to engrave, the characters, the shots and the camera moves. Use for engraving / etching / woodcut collage animation, "2.5D compositing like Lucy Lost", After Effects 3-D-layer collage looks, Victorian-illustration worlds with cartoon characters, compositing breakdown / making-of reels, or to remake this reference style on a new topic ("판화 콜라주 애니메이션", "동판화 스타일 2.5D", "인그레이빙 배경에 셀 캐릭터", "빅토리아풍 삽화 세계", "합성 메이킹 영상", "브레이크다운 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "engraving collage film", "2.5D compositing breakdown", "etching world animation"). Source — made from https://x.com/mysteropodes/status/2123462687560757465?a=lPen3XtL3jzmaCrLGAY&s=19
---

# engraving-collage-film

A short film in a world made of engravings. Every subject — a town-house front, a clock tower, a far skyline, a
tree, a cloud, a three-master, a passer-by, a sheet of cobbles — is drawn on its own paper plate by an engraver in
code (tones become parallel lines that swell where it is darker, cross in the shadows and break into dashes in the
light greys), cut out, and stood in 3-D as a flat card: turned at collage angles down a street, laid flat as a floor,
hung in an arc as the sky, hinged up out of the ground as the camera arrives. Each card lifts off the paper with a soft
shadow, fades toward the paper with distance and goes soft when it sweeps close past the lens. Through it a camera
cranes and trucks after flat cel-painted characters — the only colour on screen — who perform on key poses with their
feet planted. The frame is the source's making-of: the comp in 2.39:1 on top and, underneath, the same moment seen from
a working camera — the cards on a transparency checkerboard, each outlined in its layer colour with corner handles, the
shot camera drawn as a frustum with its path. Every frame is `seek(t)`: the page plays live and renders to MP4.

Made in this repo after a post by the motion designer Mysteropodes (@mysteropodes) on X —
https://x.com/mysteropodes/status/2123462687560757465?a=lPen3XtL3jzmaCrLGAY&s=19 — "a little making of for my
compositing / background animation work on *Lucy Lost* by Xilam Animation" (49.6 s: 2048×1716, a 2.39:1 comp over its
After Effects 3-D breakdown; archive engravings of a 19th-century city cut out and staged as 3-D layers, cel-animated
children in two flat colours running, flying and holding hands through it). This skill takes the *technique and the
format* — engraving cut-outs as 3-D cards, line-screen skies, cel characters as the only colour, the stacked
comp / breakdown frame — not the film's characters, city, shots or engravings (references/SOURCE.md). Starter:
`templates/` 「시계탑 심부름」 (17.2 s: a clockmaker's apprentice runs a key through the market street, stops under the clock
tower, waves a balloon by from the belfry). Worked example on a topic the starter does not cover: `examples/ice-voyage`
「얼음 항해」 (16.8 s: a girl in a parka walks out from a ship frozen into the pack ice, jumps an open lead, and waves at
the aurora at night — icebergs, a mountain range, the lead and the aurora sky are new subjects drawn in the piece).
Live: https://jungrok5.github.io/motion-skills/engraving-collage-film/

**Fixed by the style** (every piece): the world is ink on paper — engraved plates only (`Plate`: swelling lines,
cross-hatch over 0.58 tone, dashes under 0.24, outlines at tone 1), light from the upper left, no photo, no grey fill,
no colour; cut-out cards in metres with paper-lift shadows, depth haze toward paper, depth of field past the lens; an
engraved sky (line screen with cloud masses) hung as a ring; cel characters — one base and one shade per material,
the shade away from a fixed upper-left light, a warm-dark 2.2 px outline — as the only colour, on billboard cards with a
contact shadow; sweeping but smooth cameras; hard cuts; the making-of frame (1920×804 comp over a 1920×804 breakdown,
checkerboard, layer-coloured outlines and handles, the camera frustum and path) or the comp alone (`--view film`);
24 fps; a synthesised chamber score with paper and foley.
**Designed per topic** (never reused): the world and what makes it *that* place; the subjects to engrave (new ones
drawn in the piece's `world.js` with `Plate` — the kit is examples of the level of detail); the sets, their layers and
what rises or drifts; the characters — silhouette, costume, two or three colours, proportions, mass, idle — and their
cast sheet; the beats, acts and camera moves; the score's key, tempo and mood.

## What's in this folder
| path | what |
|---|---|
| `lib/engrave.js` | `Plate`: paint tones (`fill` with tone / gradient, angle, gap, wave; `white`; `stroke`; `solid` for blobs; `strokes` for bark and grass) → `done()` turns them into an engraving, cuts it out (paper margin), makes the out-of-focus copy and the lift-shadow silhouette |
| `lib/kit.js` | engraved subjects: `facade` (floors, bays, windows, cornices, mansard / gable roofs, chimneys, shop fronts with awnings, a side wall), `tower` (clock), `skyline`, `tree`, `cloud`, `sky` (the backdrop), `sea`, `ship`, `lamp`, `figure` (passers-by), `balloon`, `ground` (cobbles, paving, boards, grass, ice), helpers `windowAt`, `cornice` |
| `lib/world.js` | `Stage`: `card` (stand a plate: at, rot, tilt, roll, h, layer, shadow), `floor`, `ring` (sky arcs), `rise` (hinge up), `drift`, `bob`, `sway` (rolling waves / flags), `animate`; the card shader (haze, depth of field), breakdown outlines and handles, `CamHelper`, `checker` |
| `lib/rig.js` | cel characters: `character` (proportions in heads, mass, colours, your `head` / `torso` / `over` painters), `drawCharacter` (views front / threeq / side / back, facing ±1, held props), `cel` paint, `eye`, joint limits `LIM`; motion: `GAITS` (walk / run: upper-body key poses + keyed foot path, legs by IK), `idlePose` (breath, weight shift), `blinkAt`, `ACTIONS` (wave, point, lookUp, jump, turnStep — key tables with anticipation and recovery) |
| `lib/sheet.js` | `castSheet`: every view facing right and left, walk / run keys, the jump, the wave, a stepped turn, idle — and `motionReport` (planted-foot drift, idle life, anticipation) |
| `lib/film.js` | `Film`: shots, keyed cameras, character tracks from acts (walk / run / turn / do / expr / look / hold), the making-of or film frame, the live player, the contract |
| `lib/core.js` | seeded random, hash, noise, easing (`dolly`, `back` …), keyed values (Catmull-Rom), vectors |
| `lib/vendor/` | three.js r170 (MIT) |
| `templates/` | 「시계탑 심부름」 starter: `index.html`, `world.js`, `cast.js` + `cast.html`, `BRIEF.md` — what `new-piece.mjs` copies |
| `examples/ice-voyage/` | 「얼음 항해」: the same files, a different world and character designed from its brief |
| `scripts/new-piece.mjs` | start a piece (starter, or `--from ice-voyage`) |
| `scripts/render.mjs` | `--shots`, `--stills`, `--sheet`, `--cast`, the MP4 (workers × ffmpeg) with sound; `--view film` for the comp alone |
| `scripts/sound.mjs` | plucked strings, celesta, bowed pad; paper flip on cuts, card flap on rises, steps by gait and mass, hop, land, chime |
| `scripts/check.mjs` | cast sheet (joints, drift, idle, anticipation), film shape, built sets, ink / paper per shot, colour only on the cast, breakdown drawn, determinism, camera speed, body rules through the film (joints, planted feet, walking across the camera, facing, idle), score |
| `references/` | **SOURCE** (the post beat by beat; taken / not taken) · **BRIEF** (template + still and cast rubrics) · **KIT** (the API, building sets, cameras, acts) · **LOOK** (the engraver, the card look, cel paint, the frame) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md     topic → world, subjects, characters, beats, shots, acts, score, review log (written first)
  world.js     export const sets = { id: { haze, build(S) { … } } } — the engraved world, in code
  cast.js      export const cast = { name: character({ … head(ctx, v) {…}, torso(ctx, v) {…} }) }
  cast.html    the cast sheet (reviewed before any shot; check.mjs reads it)
  piece.html   new Film({ sets, cast, shots, score }).start()
  lib/         copy of the skill's lib/ (new-piece.mjs); pages import it through an import map ("ec/", "three")
  out/         stills, sheets, cast.png, piece.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs piece.html --shots --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flags it needs
(file access, SwiftShader WebGL).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. A 17 s making-of (1920×1608)
renders in about 6 min with 4 workers.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code: the ONE LINE; the world and 2–4 sets,
   each with the 5–10 subjects that make it that place (which come from the kit, which you will engrave new); the
   characters — silhouette, costume in 2–3 colours that are not the reference film's, proportions in heads, mass, idle,
   what they carry; the beats; per shot the set, the camera move (crane, truck, push, orbit), the acts with their poses,
   gaze, anticipation and recovery; the score's key, tempo, mood. If the user brings a reference video, pull stills
   (`ffmpeg -i ref.mp4 -vf fps=1/2,scale=640:-1,tile=3x3 sheet.jpg`), note its beats, then design your own.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-film` (or `--from ice-voyage`). The clock-tower town is an
   example of the style, not a template: replace it.
3. **Engrave the subjects** the kit lacks in `world.js` with `Plate` (references/KIT.md, LOOK.md): silhouette, then
   tones from the upper-left light (lit faces 0.05–0.3 in sparse lines, shade 0.55–0.85 crossing), openings dark in
   vertical lines, white ledges with a 0.7 shadow under, outlines last. Look at each plate alone before staging it
   (render it on a test page) — an engraving that does not read flat will not read in 3-D.
4. **Build the sets**: floor sheets first, then the cards that frame the camera's path (collage angles, 25–70° to the
   lens, staggered), the subject the shot is about, the far skyline, the sky ring, clouds that drift; one or two cards
   that `rise` as the camera arrives. Layer names give the breakdown its colours.
5. **Design the cast** in `cast.js`: head and torso painters for all four views (front, threeq, side, back), colours,
   proportions, mass, props. Render the cast sheet (`render.mjs cast.html --cast`) and score it with the cast rubric
   (both directions, near / far sides, joints, the walk's contact / passing poses, the jump's wind-up). Fix the rig or
   the painters before any shot. New big moves go in `ACTIONS` as key tables (with `antic`), from a reference if you
   have one (below).
6. **Shots** in `piece.html`: per shot `set`, `dur`, `cam` keys (`pos`, `look`, `fov`, `focus`), `ease`, `acts`
   (`{ at, face, view }` then `{ t, walk | run: [x, z] }`, `{ t, turn: 'front' }`, `{ t, do: 'wave' }`, `expr`, `look`,
   `hold`). Walks and runs go **across** the camera (≥ 60 % sideways on screen). Moves never overlap: a child walks
   about 0.8 m a second and runs about 2.4 (natural duration ≈ distance × 1.4 walking, × 0.5 running), so give a walk
   its time before the next turn or action; a jump clears about 2 m.
7. **Review stills**: `render.mjs piece.html --shots --scale .5` (each shot at 15 / 50 / 85 %, comp and breakdown) and
   `--sheet 12`; score the still rubric in references/BRIEF.md. Log failures in BRIEF.md, fix, render again.
8. **Check**: `node <skill>/scripts/check.mjs piece.html` must end with `all checks passed`. Read the warnings too.
9. **Render**: `render.mjs piece.html` → `out/piece.mp4` (the making-of, 1920×1608) and/or `--view film` →
   `out/piece-film.mp4` (the comp, 1920×804). `--silent`, or `--audio music.wav` to mix your own track. Watch it.

## Rules
- **Design per topic.** The clock-tower town and the ice voyage are examples, not menus. A new topic gets its own world,
  subjects, characters, shots and score; never re-dress another piece's set as a different place. The source film's
  characters (a girl in a red dress and bow, a white-haired boy in orange overalls), its city and its engravings are
  never reproduced.
- **One style.** Everything in the world is a `Plate` engraving: lines whose width carries the tone, light from the upper
  left, outlines at tone 1. No photo textures, no flat grey fills, no gradients that are not line screens, no colour.
  New subjects use the same tone habits (references/LOOK.md); the kit's look is the bar.
- **Colour is the cast's.** Characters are cel paint — base + one shade per material, the shade edge away from the fixed
  upper-left light (it does not flip with the character), a 2.2 px warm-dark outline, no hatching, no gradients.
  check.mjs fails a world with colour in it.
- **Cards, in metres.** Subjects stand at real sizes (a storey 3.3 m, a child 1.3 m); cards turn at collage angles,
  lift off with their shadows, fade with distance; floors lie flat; the sky is a ring of cards. A set is built (≥ 10
  cards on ≥ 2 layers), not a painted backdrop.
- **Bodies are possible.** Joint ranges (`LIM`) hold in every pose (knees fold back only, elbows forward only); each view
  puts the near shoulder and hip on the side away from the face; front and back views never stride; raise the far arm
  in 3/4 so the near arm does not cover the face. The cast sheet is drawn both ways and reviewed before shots.
- **Motion has weight** (references/MOTION-QUALITY.md). Timing follows `mass`; idles breathe, shift weight and blink
  irregularly; big moves wind up the opposite way (≥ 3 frames) and recover with follow-through; hair, braids, scarves and
  hems trail the body's speed of a moment ago; legs on the ground never slide (walks and runs advance by the distance
  travelled, legs solved by IK onto a keyed foot path); turns are stepped; moves run across the camera; the character
  faces the way they move. Moves (walk / run / turn / do) happen one after another: block each to end before the next
  starts — the film shortens a walk that would run into the next move and queues any other overlap, and check.mjs fails a
  walk hurried past 1.5× its natural speed, a queued act, and any root that jumps more than 0.35 m in a frame
  (a teleport). check.mjs measures all of it.
- **Motion from key poses.** Every motion is a key table interpolated by the rig, never limbs tweened one by one. A new
  move: get a reference (a video-model clip of the character's still, or filmed / found footage), pick its key poses,
  write them as an `ACTIONS` entry with `antic`, note the reference in BRIEF.md. Generated video stays out of the repo
  (git-ignored `ref/`); ElevenLabs only after the owner says yes for that request (what, which model, how many takes,
  rough cost).
- **The camera is a crane.** Smooth keyed moves (≤ 0.3 m and ≤ 1.4° a frame); hard cuts between shots.
- **The breakdown tells the truth.** It is the same scene from another camera, not a separate drawing; every card has
  its outline, the shot camera its frustum and path.
- **Code only.** Plates, characters and sound are made by code here; no scans, no outside models, no generated images in
  the film. Pure function of t: no `Math.random`, `Date` or state between frames (check.mjs proves determinism).

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS` (24), `window.SIZE = { W, H, comp: [1920, 804], view }`,
`window.filmInfo()` (shots, sets with card / layer counts, cast), `window.setHidden({ cast })`, `window.cameraAudit()`,
`window.bodyAudit()` (joint audit, planted-foot drift, across-the-camera share, facing, idle), `window.soundEvents()`,
`window.scoreInfo()`, `window.film`, `window.__ready = true` — set by `Film.start()` once the plates are engraved and
the sets built. `?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame; `?scale=.5` = preview size;
`?view=film` = the comp alone. The cast sheet page sets `window.castReport = { audit, motion }`. The live page fits the
window and loops: click / space pauses, ← → jump 3 s, a click on the bottom edge scrubs.
