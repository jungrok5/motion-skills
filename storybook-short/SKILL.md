---
name: storybook-short
description: Make a short hand-painted picture-book film entirely in code — every frame Canvas 2D, every sound Web Audio, zero images, zero libraries, zero assets. Give it a topic (a small day, a place, a job, a tiny event) and it writes a brief, designs the characters (big-headed picture-book people in bell coats with dry-brushed hair, hats, props; animals), paints the places as crayon-and-gouache spreads (skies, hills, canals, houses, market stalls, windows, benches), cuts it into 2–6 shots (close-up → wide spread → a walk → the small event with its big move → close-up), keys the motion (distance-based walks with planted feet, glances where the eyes lead and the head follows, keyed big moves with a gather and a recovery), and scores it with synthesised music, ambience and footsteps on the heel strikes. Outputs a 1920×1080 MP4 with sound, a live page, stills, a contact sheet and a cast sheet turned both ways. Same characters as storybook-portrait. Use for "hand painted film with pure code", "picture-book animation", "storybook short film", "make a short film in this style", "영상으로 만들어줘", "그림책 애니메이션", "동화 같은 짧은 영상", "코드로 그린 애니메이션", "이 스타일로 ○○ 이야기 영상", "주제만 바꿔서 영상으로". Source — made from https://x.com/chetaslua/status/2122095074968469720?a=WMOtOJajKg-tokfUuC4&s=19
---

# storybook-short

A short film that looks painted for a picture book — crayon skies and walls with the paper's tooth, gouache forms, dry-
brushed hair with coloured streaks, big-headed people in bell coats — and is nothing but code: every frame is drawn on a
canvas, every sound is synthesised with Web Audio. The input is a topic ("market day with Grandpa", "a windy walk"). The
output is a 15–60 s 1920×1080 MP4 at 30 fps with sound, a live page (click for sound), stills, a contact sheet and a
cast sheet.

Made in this repo after an X post by Chetaslua (@chetaslua) —
https://x.com/chetaslua/status/2122095074968469720?a=WMOtOJajKg-tokfUuC4&s=19 — a 52 s "hand painted film with pure
code" (zero images, libraries or assets; canvas frames, Web Audio sound) in the picture-book style of the reference image
behind `storybook-portrait`. This skill takes that method and form and builds the engine to do it on any topic; it does
not take that film's shots, places or characters (references/SOURCE.md). The heads, faces and media are
`storybook-portrait`'s, so a portrait and a film can share a character. Starter: `templates/` 「Windy Walk」 (2 shots,
16 s). Worked example: `examples/market-day` 「Market Day」 (5 shots, 42 s: a window, a market, a canal walk, ice cream on a
bench, a grin). Live: https://jungrok5.github.io/motion-skills/storybook-short/

**Fixed by the style** (every film):
- the media and the hand: crayon over a gouache tint for big areas (paper tooth always shows), gouache for small forms,
  dry brush for hair and trunks, thin wobbling broken ink; a warm paper sheet; no flat fills, gradients or vector edges;
- the characters: big heads with small low features and side glances, bell coats to the knees, thin legs, small shoes,
  hats; cut-out puppets (painted sprites + textured limbs); one design across close-up and wide;
- the places: picture-book spreads with a clear ground line and 3–4 depths; strong colour families per place;
- the form: a few shots of a small day, no words on screen; something alive in every shot; paper fades and dissolves;
- the sound: synthesised music (kalimba, glockenspiel, pad, bass, shaker), ambience per place, foley, footsteps on the
  heel strikes.

**Designed per topic** (never reused): the cast (who, story objects, hats, coats, patterns, mass), the places, the shots
and their order, the walks and glances, the small event and its big move, the critters, the key, tempo and progression,
the ambiences and events, the title.

## What's in this folder
| path | what |
|---|---|
| `lib/paint.js` | the media (shared with storybook-portrait): gouache, dryBrush, crayon, ink, blush, dabs, tooth, paper; geometry, seeded rng, noise, colour |
| `lib/head.js` | storybook-portrait's figure builder: heads, faces, hair styles, ears, turned views, live face (pupils, lids, brows, mouth) |
| `lib/motion.js` | storybook-portrait's head motion: breath, blinks, saccades, head on a mass spring with lead / counter-move / overshoot, hair lag, expressions |
| `lib/body.js` | full-body cut-out rig: `Actor` (head + coat sprites per facing, textured limbs, shoes, scarf, held props), `drawActor`, 2-bone `ik`, distance-based `gait`, `JOINTS` |
| `lib/wear.js` | hats and glasses as head extras: `beanie`, `beret`, `bucket`, `glasses` |
| `lib/kit.js` | place painters: sky, cloud, hill, water, ground, tree, house, stall, stripes, scallop, bench, lamp, fence, window_, pot, wall, vignette |
| `lib/critters.js` | live animals and air: birds, dog, cat, duck, butterfly, bunting, falling (leaves / petals / snow) |
| `lib/film.js` | `Film` (shots, plates, camera, transitions, seek, rig and motion reports), poses `walk` / `stand` / `sit` / `keyed` / `seq`, `camKeys`, `castSheet`, `mount` |
| `lib/score.js` | `makeScore`: music, ambience, events and footsteps on any AudioContext; offline WAV render |
| `templates/` | starter 「Windy Walk」: `BRIEF.md`, `cast.js`, `film.js`, `index.html` — what `new-film.mjs` copies |
| `examples/market-day/` | worked example: two characters at two sizes, five places, a walk pair, a keyed big move, critters, a full sound design |
| `scripts/new-film.mjs` | start a project (starter or `--from market-day`) with its own `lib/` |
| `scripts/render.mjs` | MP4 with sound (`--scale .5` preview), `--still`, `--sheet`, `--cast`, `--wav` |
| `scripts/check.mjs` | brief · loads · every shot draws · deterministic · style (ink, no flat fills, palette) · every shot alive · body (knees, reach, planted drift, elbows, facing) · motion (head motion, big-move gather + recovery, footsteps) · sound (no NaN, no clipping, not silent, every shot, steps = heel strikes) |
| `references/` | **BRIEF** (template + rubric) · **LOOK** · **CAST** (actors, poses, joint rules, cast sheet) · **FILM** (shots, plates, camera, kit, page contract) · **MOTION** · **SOUND** · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md     topic → cast → shots → motion → sound → review log
  cast.js      the actors (head design + body), at the sizes the shots need
  film.js      export film (the shots), score (makeScore), ACTORS
  index.html   the page (import map "ss/" → ./lib/)
  lib/         copy of the skill's lib/
  out/         MP4, WAV, stills, sheets (not committed)
```
Requirements: Node 18+ and Playwright's Chromium; ffmpeg. No network, no npm install, no GPU. A 42 s film renders at
960×540 in about a minute (4 workers); 1920×1080 takes ~4× as long.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` (references/BRIEF.md): the topic in one line with its small turn, what it must not
   become; the cast; a shot table; the motion (walks, glances, the big move's antic → big → settle); the sound.
2. **Start the project.** `node <skill>/scripts/new-film.mjs my-film` (or `--from market-day`). The starter is an example
   of the style: replace its cast, places, shots and sound with what the brief designs.
3. **Design the cast** in `cast.js` (references/CAST.md). Render the cast sheet (`render.mjs index.html --cast`) and score
   it both ways before any shot: turns, seated, walk cycle right and left.
4. **Paint the places and write the shots** in `film.js` (references/FILM.md): plates with `kit.js` (or your own painters
   with `paint.js` for a place the kit lacks), camera keys, cast poses (`walk`, `stand`, `sit`, `keyed`), critters, sound.
5. **Key the motion** (references/MOTION.md): cadence per mass, glances that the head follows, the big move with a gather
   and a recovery. Keys from a reference clip of your character if you have one (outside the repo; ElevenLabs or any paid
   generator only after the owner says yes for that request) or set by hand — the brief says which.
6. **Look.** `render.mjs index.html --sheet 16 --scale .5` and stills at the key moments; score with the rubric; fix the
   worst; log the round. `check.mjs index.html` must pass.
7. **Deliver.** `render.mjs index.html` (1920×1080 MP4 with sound); the live page.

## Rules
- **Design each film from its topic.** A new cast, new places, new shots and a new small event every time; the starter
  and the example are examples, not menus.
- **Never recreate the source film or the reference illustration** — no puffin girl, lighthouse cliff, Roman square,
  autumn park walk or tram; no copy of @Artedeingenio's character. Take the method and the style grammar.
- **One style.** Everything new is drawn with `paint.js` in the same hand: crayon with tooth over a tint, gouache,
  dry brush, broken ink. No image files, no fonts or text on screen, no libraries.
- **Bodies are possible.** Knees fold forward (shin back), elbows forward, within range; near shoulder and hip on the back
  side; walkers face their way; check the cast sheet both ways.
- **Weight sets timing**; **planted feet never move** (walks are distance-based; the stride snaps to end planted);
  **every idle breathes**; **parts follow through** (hair, scarf, held props, tails).
- **Big moves gather and recover**: an `antic` key the other way ≤ 0.6 s before the `big` key, a `settle` key after.
- **Something alive in every shot** besides the cast.
- **Story first**: if the event is not readable on the contact sheet, reframe (a medium shot) or enlarge the prop.
- **Every sound is Web Audio code**; footsteps come from heel strikes; no clipping.
- **Deterministic**: seeds only; `seek(t)` carries no state; never `Math.random`.
- **Generated video / images / voices are references, never assets**; keep them out of the repo and `docs/`.

## Contract
- `film.js` exports `film` (a `Film`), `score` (`makeScore`) and `ACTORS` (for the cast sheet); `index.html` calls
  `mount(film, { actors: ACTORS, score })`.
- `window.__ready`, `window.DURATION`, `window.FPS`, `window.seek(t)`, `window.__film = { film, rig(), motion(), events(), shots, score }`.
- 1920×1080 virtual px; `?scale` multiplies the output.
