---
name: printmade-scene
description: Make a 9–18 s living concept-art plate in a printmaking illustration style — one place drawn in the folded East-Asian view (the back wall face on, the floor laid flat below it with its tiles parallel to the frame, a figure the same size wherever it stands), flat inks with ragged edges, dry speckle, scratched hatching, wood grain and chalky light cones, a muted palette with one crimson clue, tall thin long-faced people with flushed cheeks, a vertical place name in the corner and a small title line at the foot — that is printed twice: it holds on the present, an ink roller sweeps across and re-prints it as the past (or the other state), the past plays, the roller sweeps back, and the present returns with one thing changed. Everything is code: Canvas 2D print media and a folded-view kit for the place, a rigged figure with planted feet, stepped turns and keyed big moves, a Web Audio score. Give it a topic and it writes a brief, designs the place, its two printings, the cast and the beats, and outputs a 1440×1080 (4:3) MP4 with sound, a poster still, a live page, a contact sheet and a cast sheet turned both ways. Use for "printmaking style illustration", "print-style concept art", "flat illustration with grain", "game concept art that moves", "present and past of a room", "판화 스타일", "판화풍 일러스트", "인디 게임 컨셉 아트", "동양화 원근법", "과거와 현재가 바뀌는 장면", "이 화풍으로 ○○ 그려줘", "주제만 바꿔서". Source — made from https://brunch.co.kr/@goevel/3
---

# printmade-scene

A 9–18 s, 4:3 animated plate: one place drawn the way a printmaker illustrator draws a game location — the wall face
on, the floor laid flat below it, the people tall and thin and flat — and printed twice from the same block. The input
is a topic ("a granddaughter goes back to her grandfather's closed barbershop"). The output is a 1440×1080 MP4 at 24 fps
with sound, a poster still, a live page, a contact sheet and a cast sheet.

Made in this repo after a brunch post by 전혜정 (@goevel), 「인디 게임을 만들자」 — https://brunch.co.kr/@goevel/3 — the
diary of a one-person studio making a family horror adventure. Its concept art (by 김도윤) is what this skill draws in:
a 판화 (printmaking) style, flattened, with the 동양화 (East Asian painting) perspective a 3D tool can't do — "the living
room is in correct perspective, the rug is not". The post's own lesson is that hand-mapping that art onto 3D models
failed (references/SOURCE.md); so this skill never goes to 3D: it draws the folded view directly in 2D and moves only what
lives in it. It also borrows the game's mechanic — right-click shows the past of a room — as its form: the present
plate, re-printed as the past, then the present again, changed. It does not take the post's game, characters, mansion
or art (references/SOURCE.md). Starter: `templates/` 「문 닫은 이발소」 (an interior, 13.4 s). Worked example:
`examples/schoolyard` 「폐교 운동장」 (an exterior with a child, 14 s).
Live: https://jungrok5.github.io/motion-skills/printmade-scene/

**Fixed by the style** (every scene):
- the view: folded — the back wall in elevation, the floor in plan below it (rows parallel to the frame, no vanishing
  point), a side wall only as a sheared panel, furniture with its top as a plan and its front and legs as an elevation;
  no size change with depth (deeper = higher on the floor); the wall meets the floor between 0.3 and 0.78 of the height;
- the media: flat inks pulled with ragged edges and mottle, dry speckle and knocked-out specks, scratched hatching,
  wood grain, chalky light cones, the print pass (paper tooth + grain) over every plate, a grain that rides on the figures;
- the colour: muted mid-tones (slate, sage, straw, dusty rose, umber, cream, a dusk violet) and **one** crimson accent
  that belongs to the clue and nothing else;
- the people: tall and thin, a small long head on a long neck, narrow sloped shoulders in a flat jacket or coat,
  stick legs, dot eyes under heavy lids, a flush on the cheeks, a thin key line, a dark ragged blot for a shadow;
- the words: the place name set vertically in the top-right corner, a small title line centred at the foot (both in the
  bundled Pretendard Bold), optional narrow paper slips with a line of tiny vertical text;
- the form: one locked 4:3 shot, 9–18 s: now (≥ 2.5 s) → roller → then (≥ 2.5 s) → roller back → now, changed (≥ 2 s
  hold); the roller is a dark ink brayer with a ragged edge;
- the sound: the place's tone under everything, what comes from outside, footsteps, the few sounds of its things, the
  roller's rumble and a low swell at each printing; a slow piano figure only if the brief wants it.

**Designed per topic** (never reused): the place and what is in it, the two printings (what "then" means here — the
past, another season, before / after — and how each looks), the clue and how it changes, the cast (people, ages, mass,
clothes, what they carry), the beats and their timing, the moves, the label, the caption, the slips, the sound.

## What's in this folder
| path | what |
|---|---|
| `lib/print.js` | the media: `ink` (ragged flat colour + mottle), `mottle`, `speckle`, `hatch`, `grain` (wood), `cone`, `blot`, `stain`, `scratches`, `printPass`, `grainTile`; `rough` geometry, seeded `rng` / `noise` / `fbm`, colour |
| `lib/plate.js` | the folded view and its kit: `makePlate`, `wall` (plain · stripe · damask · brick · plank · tile · sky), `wainscot`, `sideWall` (sheared, returns a u/v map) + `quad`, `floor` (tile · check · brick · stone · plank · grass · earth), `rug` (plan), `win`, `door`, `shelf`, `table` (plan top, elevation legs), `counter`, `chair`, `frame` + `portrait`, `lamp` + live `glow`, `vine`, `plant`, `tree`, `fence`, `pool` + live `ripple`, live `rain`, `label`, `caption`, `slip`; `PALETTE` |
| `lib/figure.js` | the people: `Figure` (h, mass, headScale, skin, hair style, top / bottom / shoes, glasses, mustache), `drawFigure` (body frame, IK legs to planted ankles, FK / IK arms, a head that turns with a face patch and features on a sphere, props in hand), `JOINTS`, `KD` |
| `lib/scene.js` | `Scene` (two plates, front layers, live layers, cast, shifts, change, the roller wipe, events, `rig` / `motionReport` / `styleReport`), poses `walk` / `turn` / `stand` / `keyed` / `seq` / `stance`, `life`, `castSheet`, `mount` |
| `lib/score.js` | `makeScore`: ambience (timed stretches allowed), footsteps from heel strikes, the roller, creak · door · knock · tick · drip · chime · bell · snip · strop · chain · rustle · sweep · thud · splash · sigh · hm · page; optional piano; offline WAV |
| `lib/fonts/` | Pretendard Bold, KS X 1001 subset (SIL OFL 1.1, `LICENSE.txt`) for the label, caption and slips |
| `templates/` | the starter 「문 닫은 이발소」: `BRIEF.md`, `piece.js`, `index.html` — what `new-scene.mjs` copies |
| `examples/schoolyard/` | the worked example: an exterior, a child who throws a ball, an umbrella held throughout, a fence as a front layer |
| `scripts/new-scene.mjs` | start a project (starter or `--from schoolyard`) with its own `lib/` |
| `scripts/render.mjs` | MP4 with sound (`--scale .5` preview), `--still t,t`, `--poster t`, `--sheet 12`, `--cast`, `--wav` |
| `scripts/check.mjs` | brief · loads · draws · deterministic · alive · style (printed, muted, one small accent, B differs, floor line) · body (knees, hips, elbows, neck, lean, reach, hands, planted drift, facing) · motion (blinks, gather + recovery, stepped turns, pace, the form, length, label) · sound |
| `references/` | **BRIEF** (template + rubric) · **LOOK** (the style, read from the source) · **PLATE** (the folded view, the kit) · **FIGURE** (rig, joints, cast sheet) · **MOTION** · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-scene/
  BRIEF.md     topic → place → two printings → cast → beats → motion → sound → review log
  piece.js     export film (Scene), score (makeScore), ACTORS
  index.html   the page (import map "pms/" → ./lib/)
  lib/         copy of the skill's lib/
  out/         MP4, WAV, stills, poster, sheets (not committed)
```
Requirements: Node 18+ and Playwright's Chromium; ffmpeg. No network, no npm install, no GPU. A 14 s scene renders at
1440×1080 in a few minutes with 3 workers.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` (references/BRIEF.md): the topic and mood, the label and caption; the place laid
   out in the folded view (what stands on the wall line, what lies on the floor, where the wall meets the floor); the two
   printings and the change; the cast with mass, clothes and what they carry; a beat table (stance · gaze ·
   anticipation · action · recovery); the motion; the sound.
2. **Start the project.** `node <skill>/scripts/new-scene.mjs my-scene` (or `--from schoolyard`). The starter is one
   example of the style: replace its place, printings, cast, beats and sound with what the brief designs.
3. **Paint the place** (references/PLATE.md): one `paint(ctx, K, then)` function that draws both printings from the same
   layout — `wall`, `floor`, the things on the wall line, the things on the floor in plan, a `sideWall` if the room needs
   one — so B is truly the same block printed again. Anything the kit lacks is painted with `print.js` (the starter's
   barber chair, the example's swing set). What stands in front of the figures goes in `front`. What moves (rain, a
   flickering cone, a pendulum, ripples, a thrown thing) goes in `live(ctx, K, t)`. Keep the crimson for the clue.
4. **Design the cast** (references/FIGURE.md): `new Figure({ name, h, mass, headScale, hair, top, bottom, shoes, … })`.
   Render the cast sheet (`render.mjs index.html --cast`) and score it before any beat: the turnaround, walks both ways,
   a stepped turn, the big move both ways, the faces.
5. **Key the beats** (references/MOTION.md): `walk` (planted feet), `turn` (stepped), `stand` + `keyed` for looks,
   reaches and the big move (`antic` → `big` → `settle`), `seq` them; `state: 'A' | 'B'` puts each figure on its printing.
   Keys come from a reference clip of your own figure if you have one (outside the repo; ElevenLabs or any paid generator
   only after the owner says yes for that request) or are set by hand — the brief says which.
6. **The form.** `shifts: [{ t, dur }, { t, dur }]` and `change: { dur, draw(ctx, K, k, t) }` — what the present has
   gained, printed in as the roller passes back.
7. **Sound.** `sound: { amb, surface, events }`; footsteps and the roller come by themselves.
8. **Look.** `render.mjs index.html --sheet 12 --scale .5` and stills at the touch, the big move, the change, the hold;
   score with the rubric; fix the worst; log the round in the brief. `check.mjs index.html` must pass.
9. **Deliver.** `render.mjs index.html` → `out/<name>.mp4`; `--poster <t>` → the still for a thumbnail; the live page.

## Rules
- **Design each scene from its topic.** A new place, printings, clue, cast and beats every time; the starter and the
  example are examples, not menus. Never re-skin the barbershop or the schoolyard for a different topic.
- **Never recreate the source** — no mansion with a pool and red vines, no 마마 characters, none of 김도윤's plates.
  Take the view, the media, the people's proportions and the present / past mechanic.
- **Keep the folded view.** Walls face on, floors in plan with rows parallel to the frame, no vanishing point, no size
  change with depth. Don't fake perspective with converging lines; a side wall is a shear.
- **One style.** Every surface goes through `print.js` and the print pass; nothing is a clean vector fill; no image
  files, no other fonts.
- **Muted, with one accent.** Mid-tones only; crimson is the clue (it may appear in B as the clue's origin) — never
  decoration. `check` fails a second loud colour.
- **B is the same block.** Same layout, same objects in the same places; only time, light, colour and state change.
- **The change is small and placed.** One thing, in crimson, where the eye already is; printed in as the roller passes.
- **Bodies are possible.** Knees fold back, elbows bend forward, hands reach their targets, the near arm is on the
  facing side; check the cast sheet both ways.
- **Weight sets timing**; **planted feet never move** (walks are distance-based, turns are stepped); **every idle
  breathes** (`life`); **big moves gather and recover** (`antic` ≤ 0.6 s before, `settle` after); coats and held cloth
  trail; 1.3–2.6 steps a second.
- **Locked camera, one shot, 4:3.** Nothing moves the frame. Labels read against what is behind them (`labelStyle`
  per printing).
- **Every sound is Web Audio code**; tone under every second; no clipping.
- **Deterministic**: seeds only; `seek(t)` keeps no state; never `Math.random`.
- **Generated video / images / voices are references, never assets**; keep them out of the repo and `docs/`.

## Contract
- `piece.js` exports `film` (a `Scene`), `score` (`makeScore`) and `ACTORS`; `index.html` calls
  `mount(film, { score, actors: ACTORS })`.
- `window.__ready`, `window.DURATION`, `window.FPS`, `window.seek(t)`,
  `window.__film = { film, rig(), motion(), style(), events(), caption, label, score }`.
- 1440×1080 virtual px; `?scale` multiplies the output; `?cast` shows the cast sheet; `?t=` starts at a time.
