---
name: ink-water-emergence
description: Make a short film (8–20 s, 16:9) of a creature condensing out of sumi ink drifting in still water — first a few wisps, then a translucent "pre-form" that only suggests the shape, then a pale body you can read, then dense ink in full detail that still sheds smoke from its edges — cut between wide shots, medium shots of the head and paws, and a final hold (a roar, a turn, a rise, or the ink letting go again). Drawn entirely in code (a 3D-posed body painted into density / coverage / emission channels, then a WebGL2 flow pass, a line-integral smoke pass and an ink-wash compositor — no AI video model), with a synthesised score; outputs a live page and a 1920×1080 MP4, plus optional translucent reference frames and prompts for an image-to-video model. Two dials run every shot — the emergence `e` and the `fluid` — so the form keeps its shape while the water never stops moving. Give it a topic and it designs the creature (a quadruped or a swimmer, its proportions and ink look), checks the body from every side, and writes the shots. Use for "ink in water", "a beast forming from ink", "sumi-e creature appears", "ink smoke turns into an animal", "fluid ink reveal", "먹물이 물속에서 퍼지다 동물이 되는 영상", "수묵 연기가 모여 형체가 되는", "물속 먹 번짐 영상", "먹으로 된 사자 · 고래 · 호랑이가 나타나는", "형태가 나타나기 직전", "유동성 있는 먹 애니메이션", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "ink emergence", "ink condensing into a creature". Source — made from https://x.com/taziku_co/status/2121541102700564482?s=19
---

# ink-water-emergence

A short film in which a creature gathers itself out of ink in water. It starts as nothing — a drop, a few wisps — and the
ink drifts into a translucent pre-form that only suggests the shape; the body becomes readable as a pale wash with dark
pools, then fills with dense ink and full detail (eyes, mane, claws, fins), and even then its edges keep shedding thin
smoke that curls upward. Cuts move between wide shots, medium shots and a final hold. Everything is code: a 3D body posed
from a few numbers and depth-sorted into three paint channels (ink density, coverage, emission), then a WebGL2 renderer
that moves that paint through a divergence-free flow field, carries ink away upstream as tendrils, and washes the body
like sumi on wet paper. Every frame is `seek(t)`, so the page plays live and renders to MP4 frame by frame.

Made from @taziku_co's post on X, https://x.com/taziku_co/status/2121541102700564482?s=19 — a 10 s generative
video "experiment in keeping fluidity" (流動性を残す実験): a guardian lion forms from ink in water; on top of prompt control
they added a translucent reference — the state just before the form appears — to raise the fluidity of the whole picture
while keeping the shape consistent. This skill rebuilds that *look and idea* as a deterministic engine: the pre-form is
the middle of the emergence curve, and the two goals become two dials (`e` holds the form, `fluid` keeps the water
moving). The creatures, shots and score here are this repo's own. `starter/` (「狛獅子 · Guardian Lion」, 13 s) is the
style example; `examples/whale/` (「鯨の息 · Whale Breath」, 12.6 s) proves the topic swap — a swimmer in open water, a
slow tempo, and the emergence run backwards at the end. `scripts/refs.mjs` also writes the reference's own technique out
as files (pre-form + formed stills and prompts) for anyone who wants an AI-rendered take.

## Fixed (the style) vs designed per topic
| fixed — every film | designed for each topic |
|---|---|
| ink in still water: a pale paper-grey tank, warm-grey thin ink, near-black thick ink, no colour, no text | the creature: body kind, proportions, mane / fins / tail, markings, eyes, its ink look (`look` densities, `emit`) |
| the emergence curve: wisps → translucent pre-form → pale readable body → dense ink that still smokes | what condenses first (`sweep`: head, tail, centre), how fast, and whether it lets go again at the end |
| the two dials `e` and `fluid` on every shot; the form never freezes | the action: walking, crouching, roaring, gliding, sweeping a fin, rising, turning |
| cut grammar: wide → medium on the part that is forming → wide; cameras always drifting | the shots, framing and order; the floor (studio tank) or open water; eddy size (`scale`, `detail`) |
| bodies that are anatomically possible from every side (cast sheet + checks) | the score: instrument choices, the sound of the creature, the water sounds |

## What's in this folder
| path | what |
|---|---|
| `lib/core.js` | seeded `rng` / `hash` / `noise2` / `fbm`, `keys` (monotone cubic keyframes), `ease`, `v3`, two-bone `ik`, `spline` |
| `lib/body.js` | `quadruped(spec)` (spine, neck, head with jaw, tail chain, four IK legs whose planted paws never slide; walk gait from distance walked), `swimmer(spec)` (spine wave, pectoral fins, flukes), `LIM_QUAD` / `LIM_SWIM` joint ranges, `checkPose()` |
| `lib/paint.js` | `camera()` (orbit, projection, the plane the water's noise is anchored to), `paintForm()` — depth-sorted parts into R density / G coverage / B emission; the guardian-lion head (mane flames swept back, cheek ruff, brows, eyes, nose, jaw, fangs), legs with tufts and claws, tail plume, swimmer silhouette, fins, flukes, grooves, knobs; `LOOK` defaults |
| `lib/water.js` | `createWater()` — WebGL2: flow (¼ res curl noise + buoyant rise) → smoke (½ res line integral upstream) → compose (warped body, wash, wet edge, rim shading, smoke, specks, studio floor, grade, grain); `WATER_DEFAULTS` |
| `lib/film.js` | `Film()` — cast tracks (film time, continuous across cuts), shots (cameras that can aim `on: 'name.head'`), `waterState(e, fluid)`, the live player (loop, space, ← →, ♪), the page contract, `runChecks` |
| `lib/cast.js` | `CastSheet()` — every creature from 7 sides and in its key poses, labelled with any out-of-range joint |
| `lib/score.js` | `renderScore(spec)` — pads, strings, bass, bell, flute, drums, and sfx incl. `drip`, `bubbles`, `swell`, `ink`, `roar`, `boom`, `gong` (adapted from ink-summoning) |
| `starter/` | 「狛獅子 · Guardian Lion」: `index.html` (7 shots, 13 s), `score.js`, `cast.html`, `BRIEF.md` |
| `examples/whale/` | 「鯨の息 · Whale Breath」: `index.html` (6 shots, 12.6 s), `whale.js` (the cast), `score.js`, `cast.html`, `BRIEF.md` |
| `scripts/new-film.mjs` | start a project from the starter or `--from whale` (copies `lib/`, rewrites the import map) |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/check.mjs` | loads clean, every shot draws, creature on screen, deterministic, `checkPose` on every frame, score renders, cast sheet clean |
| `scripts/score.mjs` | `score.js` → WAV |
| `scripts/refs.mjs` | per shot: translucent pre-form still + formed still + `PROMPTS.md` (the reference's technique, for image-to-video models) |
| `references/` | **BRIEF** (template + review rubric) · **LOOK** (what makes it read as ink in water; the two dials) · **KIT** (API, body rules, shot recipes) · **AI-VIDEO** (the reference's technique and how `refs.mjs` maps to it) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written into references/BRIEF.md's template — written first
  index.html   cast (body + look + track) → shots (cameras, water keys) → Film(...).start()
  cast.html    the cast sheet for this film's creatures (copied from the start; edit the poses)
  score.js     export const SCORE = { pad, strings, bass, bell, flute, drums, sfx, air, reverb }
  <cast>.js    optional: the creature shared by index.html and cast.html (examples/whale/whale.js)
  lib/         copy of the skill's lib/ (new-film.mjs), imported through the import map ("inkwater/")
  out/ refs/   stills, sheets, film.wav, film.mp4, reference frames (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs my-film --sheet 16 --scale .5`.
The page is an ES module: view it through a local server (`python3 -m http.server`), not `file://`.

Requirements: Node + Playwright Chromium (WebGL2 via SwiftShader when there is no GPU), ffmpeg. No network, no npm
install. A 1080p frame takes ~0.6–1.2 s per worker on a CPU; a 13 s film renders in ~4–6 min with 3 workers.

## Workflow
1. **Topic → brief.** Fill references/BRIEF.md's template and save it as `BRIEF.md` before any code: the creature (body
   kind, proportions, signature parts, what it does), the emergence plan (what condenses first; when it is a pre-form,
   readable, fully inked; whether it lets go at the end), the setting (studio tank with a floor, or open water), 5–8 shots
   with framing and action, the sound. Keep the QUALITY STANDARD and MUST NOT LOOK LIKE lists. If the user gives a
   reference clip, pull stills first (`ffmpeg -i ref.mp4 -vf fps=2,scale=336:-1,tile=4x5 sheet.jpg`) and note its stages and cut rhythm.
2. **Start.** `node <skill>/scripts/new-film.mjs my-film` (quadruped) or `--from whale` (swimmer). The starter's lion and
   shots are an example of the style, not a menu — redesign them for the topic.
3. **Design the creature.** `quadruped({...})` / `swimmer({...})` with this topic's proportions (references/KIT.md lists
   every parameter: `len`, `chest`, `neck`, `head`, `arm`, `legH`, `tail`, `mane`, `profile`, `fins`, `flukes` …) and a
   `look` (densities: pale body, dark mane/back; `emit`: what smokes most; `sweep`: what condenses first). A new part the
   kits lack (antlers, a horn, a crest, whiskers) is drawn in the project: add a part to the pose and a painter case
   (KIT.md → "Adding a part"), never by editing the skill's lib.
4. **Cast sheet — before any shot.** Edit `cast.html`'s poses (stand, walk ×2, crouch, the big action) and render it:
   `render.mjs cast.html --stills 0`. Score it with KIT.md's body rules: front / 3/4 / side turned BOTH ways read as one
   animal (head, chest, hips, feet the same way; the near legs drawn over the body; the near eye only), knees and hocks
   bend the right way, paws flat on the floor, nothing out of range (red text on a tile = a failure).
5. **Track.** One continuous track per creature in film time: `e` (0 → 1, the emergence), `s` (metres walked/swum —
   paws plant from it and never slide), `y`, `pitch`, `crouch`, `rear`, `look`, `nod`, `roar`, `beat`, `finFlap`. Pre-form
   around e ≈ .2–.4, readable around .55–.7, full ink at .9–1.
6. **Shots.** 5–8 shots, 1.2–2.6 s, cut on the stages of the emergence: wisps (wide, `fluid` 1) → the part that forms
   first (medium) → the pale body moving (wide) → a detail (paws / fin) → the ink darkening (medium, low or 3/4) → the
   action (medium) → the hold (wide). Aim cameras with `on: 'name.head|body|withers|paws|tail'` + `off`; keep every camera
   drifting. **Closest framing ≈ the head and mane filling a third to half of the frame** (dist ≥ ~2 m for a 2 m animal):
   tighter than that shows the painted shapes instead of ink. `water` keys per shot: `fluid` mostly; `len`, `warp`,
   `smoke`, `rise`, `detail` only to override.
7. **Sheet and review.** `render.mjs my-film --sheet 16 --scale .5`, then ~8 full stills at random moments, scored with
   the rubric in references/BRIEF.md: the ink billows and curls into filaments (not blur, not vertical streaks), the
   pre-form suggests the shape before you can read it, the formed body is a pale wash with dark pools and still smokes,
   the creature reads in silhouette with eyes in place, the frame is high-key with deep blacks, nothing floats. Put a
   reference still next to yours. Fix and repeat.
8. **Check.** `node <skill>/scripts/check.mjs my-film` prints only `ok` and the shot table.
9. **Score.** `score.js` by the shot starts check.mjs prints: still water first (`drip`, `air`, `swell`), an `ink` bloom on
   every stage of the form, a slow line (bell / flute) over a drone, the creature's sound at its action (`roar`, a whale
   call as a flute bent far down), a hit (`boom`, `gong`) into the hold. `score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render.** `render.mjs my-film --workers 3 --audio out/film.wav` → `out/my-film.mp4`; look at frames from the MP4
    itself (`ffmpeg -ss 6 -i out/my-film.mp4 -frames:v 1 x.png`).
11. **Optional: AI reference frames.** `refs.mjs my-film` → `refs/` with a translucent pre-form still and a formed still
    per shot and `PROMPTS.md` (references/AI-VIDEO.md). Say plainly that the code film is the deliverable and these are inputs
    for a different tool.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames; seeds everywhere. Smoke is a line
  integral through a flow field that is itself a function of t — never a simulation that remembers the last frame.
  `check.mjs` proves it.
- **Design per topic.** A new topic gets its own creature, look, track, shots and score; never drop the lion (or the
  whale) into a topic it does not fit. Templates are examples of the style.
- **One style.** Whatever the creature: ink in still water, the emergence curve, warm-grey thin ink and near-black thick
  ink on paper-grey, depth-sorted brushwork, no colour, no text on screen, no outlines that read as vector cartoon.
- **The form never freezes.** Even at e = 1, `fluid` ≥ .3: the body bends a little, edges shed smoke, ink rises. A fully
  static, crisp creature is a failure (and so is one that never becomes readable).
- **Sizes in the world, not the screen.** Eddies (`scale`) and texture (`detail`) are set for the animal's size: about
  `scale` 1.6 / `detail` 1 for a 2 m animal; divide both by (length / 2 m) for a big one (whale: .5 / .38). Wrong sizes
  give leopard spots or hairy vertical streaks.
- **Bodies are possible.** Run the cast sheet and `checkPose` (via check.mjs) whenever a body or a pose changes: joints
  inside `LIM`, knees fold back, front lower legs fold back, hind lower legs fold forward, planted paws on the floor and not
  sliding, the head leading the way it travels.
- **Medium is the closest shot.** See workflow 6.
- **Original casts.** Creatures and stories are designed per topic; no named characters, brands or the reference's frames.

## Contract every film page fulfils
`window.seek(t)` (returns the frame state), `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)`,
`window.shotAt(t)`, `window.film`, `window.__ready = true` — all set by `Film(...).start()`. `?render=1` = fixed canvas, no
live loop; `?t=6` = one frozen frame; `?scale=.5` = preview size; `?e=.3` / `?fluid=1` freeze the dials (refs.mjs);
`?off=smoke,flow,grain`; `?form` shows the painted form channels in a corner (debug). The live page fits the window and
loops; click/space pauses, ← → jump by shot, the bar scrubs, ♪ plays the score in sync.
