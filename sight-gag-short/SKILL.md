---
name: sight-gag-short
description: Make a silent 25–40 s cartoon sight-gag short (16:9, 1920×1080) in the viral "handy hero" style — a deadpan hero strolls down one sunny painted-3D street while a single absurd gadget (by default a giant inflated glove on a stretchy rubber-hose arm out of a backpack machine) fixes the neighbourhood's little nuisances in 4–7 quick vignettes (help, comeuppance, help, bigger…), each told in one locked wide shot of 3.5–5 s (setup → notice → act → result → button), over one continuous street-funk groove with cartoon foley, ending on a pun title. Rendered entirely in code with three.js (no AI video model): vinyl-toy characters with real eyes and lids, a poseable five-finger glove with 20+ hand shapes, a hose rebuilt every frame, painted brick and plaster textures, crisp sun with blue shadows, motion blur, a synthesised score — to an MP4 and a live page. Give it a topic (a job, a hero, a place) and it designs the hero, the gadget, the street, the gags and the pun anew. Use for "sight gag short", "silent cartoon gag video", "a hero with a giant hand", "rubber hose arm", "glove gag animation", "make a video like that Seedance handy-hero clip", "this style but a different topic", or Korean requests like "개그 숏폼 애니메이션", "대사 없는 슬랩스틱 영상", "거대한 손 장갑 캐릭터 영상", "주인공이 동네 문제 해결하는 애니메이션", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서 이 영상처럼". Source — made from https://x.com/minstorylab01/status/2117637253015183423.
---

# sight-gag-short

A short silent cartoon in which one hero walks down one street and one absurd tool does all the work. The reference
is Min Story Lab's 31 s clip (made with Seedance 2.5): a lanky mad-scientist type with a backpack machine strolls a
sunny brick street while a giant tan leather glove on a rubber hose flicks a smoker into a bin, lifts a man off a
ladder, carries a girl over a puddle, wipes graffiti off a wall with the tagger and catches a purse snatcher — six gags,
one locked wide shot each, ~4 s apiece, under one ~130 bpm groove. This skill rebuilds that **format and look** as a
deterministic engine: a three.js street (painted brick with flaked plaster, white-painted brick with chips,
storefronts with striped awnings, cast-iron lamps with flower baskets), vinyl-toy people rigged and posed in code, a
glove rig with real finger joints and a hose that is a fresh Bézier tube every frame, a post chain (sub-frame motion
blur → PBR-Neutral tone map → grade → vignette → grain → title), and a synthesised groove + foley. Every frame is
`seek(t)`: the same page plays live with sound and renders to an MP4 frame by frame.

Made from the X post https://x.com/minstorylab01/status/2117637253015183423 (Min Story Lab, "Don't call me a hero. I
was just… handy.", Seedance 2.5 on ImagineArt). That clip is an AI video; nothing from it is included or traced —
its stills were studied for framing, timing, light and the gag grammar (references/LOOK.md, references/STORY.md).
Built in this repo; worked example: `examples/crossing-guard` 「Hands Down」 (27.5 s, 7 shots, 5 gags — a school
crossing guard whose white cartoon glove rides a red-and-white striped hose), a topic and cast that are not the
reference's. The template (`templates/film.html` 「Handle With Care」, a baker with a red knitted oven glove) shows the
topic swap again.

**Fixed (the style):** 16:9, 25–45 s, no dialogue; one deadpan hero who strolls and never runs; one gadget that
stretches from a machine on the hero's back and has all the personality; one sunny street (or one place) in painted
3D — warm sun from the left, blue-violet shadows, saturated shopfronts; 4–7 gags, one locked wide shot each (slow
push-in, a tilt only when the gadget goes vertical), every gag = setup → notice → act → result → button, help and
comeuppance alternating and escalating; the hero glances at the camera on some buttons; one continuous groove with
foley on every contact; a pun title over the last beat.
**Designed per topic (in `BRIEF.md`, built in the project):** the hero (job, build, outfit, face, the machine), the
gadget (glove style and colour, hose, or another tip), the place (buildings, signs, props), the cast of nuisances,
every gag and its physical joke, the pun, the groove's key, tempo and sections — the example and the template are
examples of the style, not a menu (references/BRIEF.md).

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: renderer + look (`LOOK`: sky, sun, hemisphere, rim, env, fog, grade), `F.S` (the kit bound to the film), `F.actor` / `F.prop`, `F.shot({ id, dur, marks, sfx, fn })`, `F.cues()`, `F.title`, `F.mirror` (puddles), `FX` (puffs, steam, dizzy stars, sweat, drops, speed lines, contact spots), adaptive sub-frame motion blur, live player with ♪, `check()` rules, the contract |
| `lib/figure.js` | `person(F, o)`: `BUILDS` (lanky, average, stocky, boss, round, teen, kid, elder), tops (tee, shirt, flannel, suit, sweater, hoodie, coat, raincoat, dress, apron, vest), bottoms, shoes (boot, sneaker, dress, rain, slipper), hair (wild, slick, short, side, bun, puffs, curly, long, bald), hats (cap, cap-back, beanie, hood, bowler, hardhat, ranger, bucket, guard, chef), beards, extras (goggles, glasses, shades, contraption, beacon, backpack, satchel, vest-hivis, scarf, badge, tie, watch); `pose(P.*)`, `walk`, `run`, `stroll`, `KP`, `mixPose`; `face(EXPR)` with gaze and blinks; `socket`, `pin`, `axis`, `hold`, `steps()` |
| `lib/gadget.js` | `gadget(F, o)`: the glove rig (styles leather · cartoon · rubber · oven · boxing, any colour, stitched cuff, left/right), `SHAPES` (open, relaxed, flat, stop, cup, fist, point, pointUp, beckon, flickReady, flick, pinch, grab, claw, thumbsUp, ok, peace, gun, horns, hold, shoo, spin), `KS` / `mixShape`, `set({ at, aim, palm, shape, squash, slack, lag })`, `point()`, `align()`, `Glove.scold`, the hose (plain or striped), `o.tip` for any other tool |
| `lib/kit.js` | the set: `street` (sidewalk, curb, road, zebra), `building` (brick · painted · plaster, real window openings, shopfronts, awnings, fascia signs, blade signs, cornices, non-repeating chip / flake decals), `awning`, `blade`, `sign` (text or icons), `lamp`, `bin`, `hydrant`, `bench`, `ladder`, `car`, `scooter`, `tree`, `planter`, `pipe`, `bollard`, `skyline`, `park`, `hedge`, `pond`; hand props `paddle`, `scoop`, `cone`, `snack`, `balloon`, `handbag`, `pie`, `parcel`; `mat`, `rbox`, `lathe`, `merge` for custom pieces |
| `lib/paint.js` | hand-painted canvas textures: `brick` (per-brick colour, dry-brush streaks, white-painted variant), `chip`, `flake`, `plaster`, `concrete`, `asphalt`, `stripes`, `leather`, `cloth` (plaid, denim, knit, stripe), `wood`, `grass`, `glass`, `label`, `cloud`, puffs |
| `lib/score.js` | `renderScore(spec)`: the groove (moods intro · groove · tiptoe · break · hit · outro · silence; swung drums, finger bass, Rhodes, brass stabs, whistled hook, stops) + 35 foley kinds (`SFX_KINDS`: stretch, retract, snap, flick, thwack, clang, boing, splash, squeak, honk, skid …), reverb, BS.1770 master to −14 LUFS |
| `lib/castsheet.js` | `castSheet(F, CAST, { glove })`: every person front, 3/4 and side both ways, back, walk, run, an action pose (each a different face), and every hand shape — the body-rules review page |
| `lib/core.js` | `K` keyframe tracks with named eases (snap, back, elastic, bounce …), `wob` springs, `win`, `arc`, seeded `rng`, noise, vector helpers |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `fonts/` | Barlow Condensed Bold (OFL) for signs and the title; how to add a Hangul font |
| `templates/` | `film.html` (a 12 s, 2-gag starting film), `cast.js` (its people), `cast.html` (their cast sheet), `score.js`, `BRIEF.md` |
| `examples/crossing-guard/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html` (the cast sheet), `index.html` (7 shots), `score.js` |
| `scripts/new-film.mjs` | start a project (template or `--from crossing-guard`) |
| `scripts/check.mjs` | loads clean · every shot draws at its marks · deterministic · nothing under the ground · body rules (`body: …` — a joint outside `LIM`, a figure moving sideways or backwards to where it faces) · format rules · sfx kinds exist · prints the shot table and cues |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/score.mjs` | the film's sound (its `SCORE` + every shot's sfx cue) → WAV, read from the page itself |
| `references/` | **BRIEF** (fixed vs per topic, the brief template, the stills rubric) · **STORY** (topic → hero → gadget → gags; the gag grammar and timing) · **LOOK** (the measured reference and the values that match it) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-short/
  BRIEF.md     the topic written into the brief (references/BRIEF.md) — written first
  cast.js      export const CAST = { name: person() options }, GLOVE = gadget() options — shared by both pages
  cast.html    the cast sheet (castSheet) — rendered and scored before any gag
  film.html    set → cast + gadget + props → helpers → one F.shot per gag → F.title → F.start(SCORE, renderScore)
  score.js     export const SCORE = { bpm, key, swing, sections, stops }
  lib/ fonts/  copies of the skill's (new-film.mjs); imported through an import map ("three", "gag/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs film.html --sheet 24 --scale .5 --q mb=1`.
The page is an ES module: view it through a local server (`python3 -m http.server`).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. On a CPU (SwiftShader, which
already uses every core) a 1920×1080 frame takes ~3 s, ~6–9 s where the adaptive motion blur kicks in on fast moves;
the 27.5 s example (825 frames) takes about an hour on a 4-core machine whatever the worker count (`--workers 3`,
`--q mb=3` caps the blur at 3 sub-frames). Previews with `--q mb=1 --scale .5` are ~1 s a frame.

## Workflow
1. **Topic → brief.** Fill references/BRIEF.md's template from the user's topic and save it as `BRIEF.md`: the hero
   (a job or a type, deadpan, one silhouette detail people remember), the machine on their back, the gadget and why it
   fits the topic (a crossing guard → a raised hand; a baker → an oven glove; a librarian → a shushing glove; a
   plumber → a plunger tip), the place, 4–7 gags as a table (setup → notice → act → result → button, help or
   comeuppance, escalating), the pun, the groove, and the MUST NOT LOOK LIKE list. If the user gives a reference
   clip, pull stills first (`ffmpeg -i ref.mp4 -vf fps=1,scale=420:-1,tile=4x4 sheet.jpg`) and its cut times
   (`-vf "select='gt(scene,0.12)',metadata=print"`) and note framing, gag length and rhythm.
2. **Start**: `node <skill>/scripts/new-film.mjs my-short` (or `--from crossing-guard`).
3. **Build the set** along +x: one building per 8–10 m, a gag station every ~10–12 m, signs and props each gag needs
   (a bin for the litter gag, a sign to point at, a crosswalk). Keep lamp posts and trees out of the punchline's line
   of sight.
4. **Cast** in `cast.js`: the hero with `extras: ["contraption"]` (+ `"beacon"`) and the gadget options; one nuisance
   (or helped person) per gag, each a different build and palette. **Cast sheet first:** `render.mjs cast.html
   --sheet <shots> --scale .5 --q mb=1` and `check.mjs cast.html`, then score every view with the body rules
   (references/BRIEF.md 11): head, chest, hips and toes the same way, the near shoulder and hip on the far side from
   the face, coat fronts, buttons and toe caps at the front, knees bending back and elbows forward only, feet on the
   ground — "did the neck turn or the body?" is a fail. In the film: `person(F, { ...CAST.x, name })`, the gadget with
   `from: () => hero.socket("hose"), fromDir`, props as `F.prop(KIT.…)` so they can fly, be caught and handed back.
5. **One shot per gag** (references/STORY.md): `F.shot({ id, dur, marks: { notice, act, button, … }, sfx: [[kind,
   mark, offset, opts] …], fn(t, s) })`. In `fn`: `s.cam` (locked wide, slow push), the hero (stroll in, stop, deadpan,
   look at what matters, glance at the camera on the button), the other actors (poses keyed with `KP`, faces with
   expressions), the props (in a hand, ballistic with `arc`, on a fingertip), the glove (`gloveTo` between its rest
   spot and keyed targets, shapes keyed with `KS`, `squash` on impacts, `slack`/`lag` on the hose, `align` when it
   holds something that leads). The sfx list uses the same marks, so sound and motion share one clock.
6. **Sheet and review**: `render.mjs film.html --sheet 30 --scale .4 --q mb=1`, then full stills at every `act`
   and `button` mark (`--stills …`), scored against the rubric in references/BRIEF.md: the gag reads with the sound
   off, the glove's shape says the intention, the hero is deadpan and in frame, the hose is one continuous stretch,
   everyone is grounded, faces read, no lone raised finger facing the camera. Fix and repeat; look at reference stills
   next to yours.
7. **Check**: `node <skill>/scripts/check.mjs film.html` ends with `check OK`.
8. **Score** (`score.js`): bpm and key per topic, `sections` (intro → groove, a `tiptoe` for a sneaky or slow beat,
   `outro` under the title), `stops` (a beat of silence on the biggest impacts). `node <skill>/scripts/score.mjs
   film.html` → `out/film.wav`.
9. **Render**: `node <skill>/scripts/render.mjs film.html --workers 3 --q mb=3 --audio out/film.wav` → `out/film.mp4`; look at
   stills from the MP4 itself (`ffmpeg -ss 12 -i out/film.mp4 -frames:v 1 x.png`).

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state carried between frames; seeds everywhere. `check.mjs`
  proves determinism per shot.
- **Design per topic.** A new topic gets its own hero, gadget, street, cast, gags and pun; never drag in the example's
  crossing guard or the template's baker because they are close. Never copy the reference's hero, glove or gags.
- **One style.** New pieces keep the look: vinyl-toy proportions, painted textures, the sun from the left with blue
  shadows, one continuous groove, deadpan hero, the gadget doing the acting.
- **One gag per shot, readable with the sound off.** Locked wide (push-in ≤ 0.6 m), the whole action in frame, 3.5–5 s
  (8–10 beats at 120 bpm); cuts land on the beat (`check` warns).
- **Every gag has setup → notice → act → result → button** as marks (`check` warns when one is missing), and a sound on
  every contact.
- **The gadget acts, the hero doesn't.** The hero walks, stops, looks; only the last beat earns a smile.
- **No lone raised finger palm-on or back-on to the camera** — from the front it reads as the middle finger. Scold by
  pointing (`Glove.scold`), spin things on a loose `spin` hand, say "wait" with an open `stop` palm.
- **Nothing floats or sinks.** `place([x, null, z])` stands a figure on the ground and every `pose()` plants its lowest
  foot on it; give an explicit y only for jumps, rides and flights. `check` fails when a foot or the glove's wrist goes
  under the ground. Things that are held follow the hand (`socket`, `align`).
- **Bodies that can exist.** Joints stay inside `LIM` (knees bend back only, elbows forward only, hips back ≤ 75°, the
  neck ≤ 90°, wrists ≤ 80°) and a figure moves the way it faces, unless something holds it (`pin`) — `check` fails
  with `body: …` otherwise. Score the cast sheet before the gags.
- **Original casts, no brands, no real people.**

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.cues()`, `window.SCORE`,
`window.runChecks()`, `window.shotAt(t)`, `window.film`, `window.__ready = true` — all set by `F.start()`.
`?render=1` = fixed canvas, motion blur on (up to 5 sub-frames, only where something moves > 2.5 px across the
shutter); `?t=9` = one frozen frame; `?scale=.5` = preview size; `?mb=1` = blur off; `?off=shadow,aa,vignette,grain,mb,
mbauto`. The live page fits the window and loops; click/space pauses, ← → jump, the bar scrubs, ♪ synthesises and
plays the score in sync.
