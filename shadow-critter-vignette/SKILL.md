---
name: shadow-critter-vignette
description: Make a short wordless vignette in which a tiny ink-black silhouette critter (a flat black body, two white eyes, one accent colour it wears) tries something in a backlit hand-painted watercolour room because of a child's wrong idea — presses, pulls or taps a thing expecting a result, waits, tries again bigger, and nothing happens — ending on a one-line "I thought…" caption. Everything is code: Canvas 2D watercolour washes, pen lines and window light for the room, a rigged silhouette with planted feet, stepped turns and keyed reaches for the critter, a Web Audio score of room tone and small sounds. Give it a topic (the wrong idea) and it writes a brief, designs the critter, paints the room, keys the beats and outputs a 1080×1440 (3:4) MP4 with sound, a live page, stills, a contact sheet, a cast sheet turned both ways and the caption. Use for "silhouette critter animation", "little black cat vignette", "kid logic short", "I thought pressing it would…", "watercolour room animation", "작은 검은 실루엣 캐릭터 영상", "~하면 나오는 줄 알았다", "아이 생각 짧은 영상", "수채화 방 애니메이션", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서". Source — made from https://x.com/FromUltraViolet/status/2122260736147865803?a=vREhJxrQtm6qiT45-n4&s=19
---

# shadow-critter-vignette

A 7–16 s vertical vignette: one locked shot of a hand-painted room lit from a window behind, and a little shadow of a
critter — flat ink, two white eyes, one colour it wears — that tries something because of a child's wrong idea and
gets nothing. The input is that wrong idea ("I thought pulling that book would open a secret door"). The output is a
1080×1440 MP4 at 24 fps with sound, a live page that shows the caption under the picture like a post, stills, a contact
sheet, a cast sheet and `<name>.txt` with the caption.

Made in this repo after an X post by シャンプー台_Ⅰ (@FromUltraViolet) —
https://x.com/FromUltraViolet/status/2122260736147865803?a=vREhJxrQtm6qiT45-n4&s=19 — a 10 s AI video captioned
「あのへんを押せば出てくるのだと思ってた」 ("I thought if I pressed around there, it would come out"): a small black cat-shaped
silhouette in a green skirt walks up to a vending machine in a sunlit, cluttered watercolour shop, presses at the panel
on tiptoe, waits, and walks off. This skill takes the form (one locked shot, a wrong idea tried, a wait, a quiet exit,
an "I thought…" line), the look (an ink silhouette with white eyes in a backlit watercolour interior) and builds the
engine to make it on any topic in code. It does not take that video's machine, shop, character or frames
(references/SOURCE.md). Starter: `templates/` 「누르면 토스트가 나오는 줄 알았다」 (a toaster, 11.4 s). Worked example:
`examples/secret-shelf` 「책을 당기면 비밀 문이 열리는 줄 알았다」 (a bookshelf, 12.8 s).
Live: https://jungrok5.github.io/motion-skills/shadow-critter-vignette/

**Fixed by the style** (every vignette):
- the critter: a pure ink silhouette (no inner lines), a big head (about half its height), a small body, thin limbs,
  two white eyes with dark pupils, one accent colour (skirt, shorts, scarf, bag or hat); a warm rim of window light on
  its edge and a long soft shadow falling towards the camera;
- the room: one interior in one-point perspective, transparent watercolour washes with blooms and wet edges over
  paper, sepia pen lines, a bright window at the back that is the only light, a golden patch on the floor, darker corners;
- the form: one locked 3:4 shot, 7–16 s, no words on screen; the beats arrive → look → try → **wait** → again (bigger) →
  nothing → after; the caption is one "I thought…" line beside the picture, never in it;
- the sound: room tone under everything, what comes through the window, soft footsteps, the small sounds of the thing,
  silence in the wait; no music unless the brief asks for a music box.

**Designed per topic** (never reused): the wrong idea and its caption, the critter (ears, eyes, tail, size, accent and
what it is), the room (place, time of day, palette, window, clutter), the thing being tried and how it answers, the
beats and their timing, the moves, the ambience and the events.

## What's in this folder
| path | what |
|---|---|
| `lib/paint.js` | the media: wash (watercolour), pen, glow, gouache, ink, tooth, paper; geometry, seeded rng, noise, colour |
| `lib/room.js` | the room in perspective: `makeRoom` (camera, `proj`, `floor`, `scaleAt`, face maps), `shell`, `windowLight`, `lightShaft`, `box`, `shelf`, `frame`, `note`, `buttons`, `row`, `plant`, `jar`, `books`, `stool`, `lamp`, `grade`, `quad`, `sub`, `faceWash` |
| `lib/critter.js` | the silhouette rig: `Critter` (spec: ears, eyes, whiskers, tail, wear), `drawCritter` (IK legs to planted feet, FK / IK arms, head with eyes and lids, rim light, cast shadow), `JOINTS` |
| `lib/vignette.js` | `Vignette` (plates, fx, cast, light, beats, sound, seek, rig / motion / style reports), poses `walk` / `stand` / `turn` / `keyed` / `seq`, `life`, `castSheet`, `mount` |
| `lib/score.js` | `makeScore`: room tone and ambiences, footsteps from heel strikes, press / beep / clunk / creak / slide / ding / thud / sigh / hm …; offline WAV |
| `templates/` | the starter 「누르면 토스트가 나오는 줄 알았다」: `BRIEF.md`, `piece.js`, `index.html` — what `new-vignette.mjs` copies |
| `examples/secret-shelf/` | the worked example: a bookshelf, a book that tilts under the hand, a jump-pull, a stepped turn away |
| `scripts/new-vignette.mjs` | start a project (starter or `--from secret-shelf`) with its own `lib/` |
| `scripts/render.mjs` | MP4 with sound (`--scale .5` preview), `--still t,t`, `--sheet 12`, `--cast`, `--wav`; writes the caption to `out/<name>.txt` |
| `scripts/check.mjs` | brief · loads · draws · deterministic · alive at every moment · style (painted, backlit, ink body, one accent) · body (knees, reach, planted drift, elbows, neck, facing, hands on targets) · motion (blinks, gather + recovery, stepped turns, footsteps, the gag's beats, a bigger second try, one-line caption, length) · sound |
| `references/` | **BRIEF** (template + rubric) · **LOOK** · **CRITTER** (rig, joints, cast sheet) · **ROOM** (camera, kit, light) · **MOTION** · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-vignette/
  BRIEF.md     the wrong idea → critter → room → beats → motion → sound → review log
  piece.js     export film (Vignette), score (makeScore), ACTORS
  index.html   the page (import map "scv/" → ./lib/)
  lib/         copy of the skill's lib/
  out/         MP4, WAV, stills, sheets, caption (not committed)
```
Requirements: Node 18+ and Playwright's Chromium; ffmpeg. No network, no npm install, no GPU. A 12 s vignette renders at
1080×1440 in about two minutes with 3 workers.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` (references/BRIEF.md): the wrong idea as the critter would say it (the caption),
   where it comes from, why it can't work; the critter; the room and the thing; a beat table (arrive · look · try ·
   wait · again · nothing · after) with stance, gaze, anticipation, action, recovery; the motion; the sound.
2. **Start the project.** `node <skill>/scripts/new-vignette.mjs my-vignette` (or `--from secret-shelf`). The starter
   is one example of the style: replace its critter, room, thing, beats and sound with what the brief designs.
3. **Design the critter** (references/CRITTER.md): `new Critter({ a, ears, eyes, whiskers, tail, wear })`. Render the
   cast sheet (`render.mjs index.html --cast`) and score it before any beat: turnaround, walks both ways, a stepped turn,
   the big move both ways, faces. If the arm disappears into the head, the target is too close to it.
4. **Paint the room** (references/ROOM.md): `makeRoom` (horizon, vanishing point, eye height, walls), `shell`,
   `windowLight` + `lightShaft`, the thing as a `box` with painted faces, clutter, one foreground object, `grade` with
   the window as the light. Anything the kit lacks is painted with `paint.js` through a face map. The moving part of the
   thing (a lever, a book, a lid, a light) is an `fx` layer drawn from a function of time.
5. **Key the beats** (references/MOTION.md): `walk` (planted feet), `turn` (stepped), `stand` + `keyed` for the look,
   the try (a hand target that rides the moving part), the wait (held, alive), the bigger try (`antic` → `big` →
   `settle`), the after; `seq` them. Keys from a reference clip of your own critter if you have one (outside the repo;
   ElevenLabs or any paid generator only after the owner says yes for that request) or set by hand — the brief says which.
6. **Sound.** `sound: { surface, amb, events }` on the Vignette; footsteps come from the walks and turns by themselves.
7. **Look.** `render.mjs index.html --sheet 12 --scale .5`, stills at try / wait / again / after; score with the rubric;
   fix the worst; log the round in the brief. `check.mjs index.html` must pass.
8. **Deliver.** `render.mjs index.html` → `out/<name>.mp4` (1080×1440, sound) and `out/<name>.txt` (the caption to post
   with it); the live page.

## Rules
- **Design each vignette from its topic.** A new wrong idea, critter, room and thing every time; the starter and the
  example are examples, not menus. Never re-skin the toaster or the bookshelf for a different topic.
- **Never recreate the source video** — no vending machine in a cluttered shop, no black cat in a green skirt, none of
  its frames. Take the form and the look.
- **One style.** The critter is ink with white eyes and one accent; everything else is watercolour, pen and light from
  `paint.js`. No image files, no fonts or text in the picture, no libraries.
- **One light.** The window at the back is the brightest thing; the critter is backlit (rim, long shadow towards the
  camera); the room falls darker away from the window (`grade({ light })`).
- **The wait is the joke.** Hold it ≥ 1 s; the critter stays alive (breath, blinks, a glance at where the result should
  appear) but does not fidget.
- **The second try is bigger** and is a keyed big move: an `antic` key (gather, the other way) ≤ 0.6 s before the `big`
  key and a `settle` key after.
- **Bodies are possible.** Knees fold back; legs reach their feet; the near arm is on the facing side; hand targets are
  reachable and beside the head, not above it; check the cast sheet both ways.
- **Weight sets timing**; **planted feet never move** (walks are distance-based, turns are stepped); **every idle
  breathes** (`life`); **parts follow through** (tail, scarf and skirt trail the pelvis); 2.5–4 steps a second.
- **Locked camera, one shot, 3:4.** Nothing moves the frame. The critter reads against the room in every frame — put it
  in front of something lit or mid-tone, never black on black.
- **Story first.** If the try and the wait don't read on the contact sheet, move the thing, the critter or the hand
  until they do (a hand hidden by the head is the usual culprit).
- **Every sound is Web Audio code**; room tone under every second; footsteps from heel strikes; no clipping.
- **Deterministic**: seeds only; `seek(t)` keeps no state; never `Math.random`.
- **Generated video / images / voices are references, never assets**; keep them out of the repo and `docs/`.

## Contract
- `piece.js` exports `film` (a `Vignette`), `score` (`makeScore`) and `ACTORS`; `index.html` calls
  `mount(film, { score, actors: ACTORS })`.
- `window.__ready`, `window.DURATION`, `window.FPS`, `window.seek(t)`,
  `window.__film = { film, rig(), motion(), style(), events(), caption, score }`.
- 1080×1440 virtual px; `?scale` multiplies the output; `?cast` shows the cast sheet; `?t=` starts at a time.
