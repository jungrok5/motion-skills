---
name: ballpoint-doodle-short
description: Make a wordless doodle cartoon short (10–90 s, square 1080×1080, 24 fps) in a ballpoint-and-coloured-pencil style on cream paper — thin wobbly navy ballpoint outlines drawn twice, parallel crayon hatching with paper between the strokes, round egg-shaped creatures with big glossy eyes and pink blush, one red ballpoint line for the ground that the camera follows as it tilts into hills, turns blue for a pond and drops straight down at a cliff, pen effects that act (rays, "!", speed lines, sweat, notes, splashes), one handwritten sign as the only words, and an errand-gone-wrong chase that ends back where it began — drawn entirely in code on an HTML Canvas, with a synthesised bouncy score (pizzicato, marimba, whistle) and cartoon foley. Outputs a live page and an MP4. Give it a topic and it writes a brief, designs the creatures, the precious thing, the places along the line and the beats for that topic. Use when asked for a "ballpoint doodle animation", "crayon / coloured-pencil cartoon", "pen doodle short", "every frame drawn with JavaScript", "make a video like this but about X", a cute wordless chase cartoon, or a loopable doodle story ("볼펜 낙서 애니메이션", "색연필 그림체 단편 애니메이션", "낙서 같은 귀여운 캐릭터 영상", "종이에 볼펜으로 그린 듯한 만화", "이 스타일로 ○○ 이야기 만들어줘", "주제만 바꿔서 이런 영상", "자바스크립트로 그린 애니메이션"). Source — made from https://x.com/kevin_t_ngo/status/2121261917016903748?a=bVC63lRPjOI0jxwuEOg&s=19
---

# ballpoint-doodle-short

A short cartoon that looks drawn in a sketchbook with a ballpoint pen and a few coloured pencils: every outline is a thin
wobbly ballpoint line gone over twice, every fill is parallel pencil hatching with the cream paper showing between the
strokes, the creatures are round eggs with big glossy eyes, and the whole world hangs on one red pen line that the camera
follows — it tilts into a hill, turns blue for a pond, drops straight down at a cliff. No words but one handwritten sign.
Give it a topic ("a little mole asked to look after a seed", "a snail delivering a letter in the rain", "a penguin who
loses his scarf") and it writes a brief, designs the cast, the precious thing and the places for that topic, and
animates 3–10 shots. Every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Made in this repo from the clip posted by Kevin Ngo on X — https://x.com/kevin_t_ngo/status/2121261917016903748?a=bVC63lRPjOI0jxwuEOg&s=19
("Every frame drawn with JavaScript by Claude Fable 5.2", 80 s, 1080×1080: a round blue bird told by a sign to "watch the
egg" chases it down hills, over a waterfall and past a snake, until it hatches and the story loops). This skill keeps
its look and its grammar (`references/LOOK.md` lists what was observed) and draws everything with its own deterministic
Canvas code. The worked example `examples/seed` 「Water the Seed」 (46.5 s, 9 shots) is a different story with an original
cast: a mole, his gran and a crow. Never recreate the clip's bird, egg, snake or gags — design new ones for each topic.

**Fixed (the style)** — the cream sheet; the ballpoint (thin, two passes, wobble that breathes 8× a second, ink colour by
material: navy creatures, red ground, green plants, brown wood, blue water); coloured-pencil hatching that lets the paper
through, denser on the shadow side, covering what is behind; round egg creatures that turn as balls (front / 3/4 /
profile / back from one `yaw`), glossy bean eyes, blush, lids and brows that act; the single ground line and its shapes
(slope, water, cliff); pen effects; drawings on twos; one handwritten sign; square 1080×1080 at 24 fps; the small bouncy
band and foley.

**Designed per topic** — the hero, whoever gives the job, any thief or threat (species, silhouette, crayon colours,
tells, props); the precious thing and what it becomes; the places along the line and what stands there (new props drawn
in the same two hands); the sign's words and how they change for the loop; the beats and the gags; the camera; the tune
and the effects. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/pen.js` | the two hands: `ink` (ballpoint), `crayon` (hatching, knock-out under it), `shape`, `blot`, `hatch`, `hand` (handwriting), `paper`; points, timing (`span`, `keys`, `ease`, `arcAt`), determinism (`hash`, `n1`, `rng`), `INK` / `CRAYON` colours |
| `lib/rig.js` | `critter(ctx, SPEC, POSE)`: round creatures from data — ears, nose / beak, wings / paws, feet, tail, wear hooks — placed on a ball so one `yaw` turns everything; 8 eye states, brows, mouths; `where()`; `LIM` joint ranges audited on every draw |
| `lib/kit.js` | `track()` (the ground line: slope, water, cliff), grass, flower, fern, mushroom, rock, stump, tree, lily pad, sign, sun, cloud, shadow; effects: rays, speed, drop, notes, stars, puff, splash, gust, mark, heart, zzz |
| `lib/film.js` | `Film`: shots, the camera that follows the line, boil, twos, draw-on, wipe / paper / white / dissolve, the paper grade, live player with sound, `check()`, the contract |
| `lib/score.js` | `renderScore(spec, sr, dur)`: pizzicato, marimba, glockenspiel, felt piano, bass, whistle, reed, pad, light kit, foley (boing, pop, splash, whoosh, crack, caw, gust, sprout, slide whistle …), reverb; `oompah`, `tune`, `beat` |
| `lib/fonts/` | Caveat 500 (OFL) for the sign's handwriting |
| `templates/` | `BRIEF.md` (the form), `cast.js` + `cast.html` (one hero + a prop, and its sheet), `film.html` (a commented 11.5 s, 3-shot film), `score.js` |
| `scripts/new-film.mjs` | start a project: `lib/` + the template (or `--from seed`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 24`), or the MP4 (workers × ffmpeg chunks, `--audio out/x.wav`) |
| `scripts/score.mjs` | the score → WAV |
| `scripts/check.mjs` | proves the page: loads clean (font too), every shot draws, no blank frames, deterministic, the film's rules and the body rules, the paper shows, ink present, crayon-light colour, lines breathe, the score renders |
| `references/` | **BRIEF** (topic → brief, cast review, still review) · **LOOK** (what was observed in the source) · **STORY** (the chase grammar, shots, timing) · **KIT** (API) · **LESSONS** |
| `examples/seed/` | the worked example 「Water the Seed」: `BRIEF.md`, `cast.js` + `cast.html`, `props.js` (seed, mound, sunflower, sunflower hat), `index.html` (9 shots), `score.js` |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written out (references/BRIEF.md) — written first
  cast.js      the creatures as data (rig specs) + their props — designed from the brief, reviewed on cast.html
  cast.html    the cast sheet (turns both ways, gaits, poses, faces)
  props.js     (optional) the precious thing and anything else the topic needs, drawn with lib/pen.js
  film.html    the line → decor → shots (F.shot) → rules (F.check) → F.start()
  score.js     export const SCORE = { pluck, mallet, whistle, bass, drum, keys, sfx, … }
  lib/         copy of the skill's lib/ (new-film.mjs); pages import it through an import map ("bds/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet 24 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (Canvas 2D: ~0.07 s a frame with
4 workers; the 46.5 s example renders in under 1.5 min).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the
   precious thing and what it becomes, the hero and its prop, who gives the job (the one sign), any thief, 3–5 places
   with different line shapes, 6–10 beats with one gag each, the loop. Save it as `BRIEF.md` before any code. If the user
   gives a reference video, pull stills (`ffmpeg -i ref.mp4 -vf fps=1/2,scale=360:-1,tile=5x4 sheet.jpg`) and note line,
   palette, proportions, framing — then design your own cast and story.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from seed` to start from the 9-shot film).
3. **Cast.** Write `cast.js` from the brief — every creature designed for this topic (field list at the top of
   `templates/cast.js`); the props they carry as functions drawn in the hand's frame. Put every creature on `cast.html`,
   render `--stills 0 --scale .5` and score it with the cast review in references/BRIEF.md: readable at 30 %, the turns
   agree (−90 … 180: face, nose, cheeks, feet go round together, the far eye narrower, the tail on the side away from the
   face, no face on the back), gaits look right facing right *and* left, wings sweep back at rest, faces act. If a pose
   makes you ask "did it turn its head or its body?", it fails. Fix and re-render until it passes.
4. **The line and the props.** Write the `track()` for the whole story (x left → right; equal x = a cliff; `water`
   ranges), the decor along it, and `props.js` for anything the topic needs that the kit lacks — closed shapes with
   `P.shape` (crayon + ink), details with `P.ink`, tints with `P.crayon(..., { knock: false })`.
5. **Shots, one at a time** (references/STORY.md): each shot = a camera (`lt => ({ x, y, zoom })` following the hero and
   the thing along the line) + where everyone is as pure functions of local time (`hero(lt, t2)`: positions on ones,
   poses on twos) + a `draw` that puts the line, decor, the thing, shadows, creatures and effects. A still after each
   shot: `render.mjs film.html --stills 9 --scale .5`.
6. **Motion**: anticipation before runs and jumps, arcs for hops (`arcAt`, a `hops([...])` table), squash on landing,
   holds after gags; aim catches and pours with `R.where()` (hands, head, top).
7. **Sheet and review**: `render.mjs film.html --sheet 24 --scale .5`, then full-size stills of ~12 moments, scored with
   the still review in references/BRIEF.md (paper everywhere, hatching not paint, things in front cover things behind,
   nothing floats, facing, the thing findable, the line shapes clear). Fix and repeat.
8. **Check**: `node <skill>/scripts/check.mjs film.html` must end in `ok`. It fails any pose out of the joint ranges
   (`body: <name> armL swing … out of range`). Add `F.check(...)` for the film's promises: on the line unless jumping,
   never standing on open water, facing the way it moves, the hero in frame (with an exception window for entrances),
   the thing in frame during the chase.
9. **Score**: write `score.js` against the shot starts (check.mjs prints them): pencil while the page draws, the tune
   (marimba / whistle over pizzicato oom-pah) for home, a faster groove with kick / snare for the chase, tiptoe pizzicato
   for a threat, everything drops out for the loss, felt piano for the sad beat, a shimmer and chime for the turn, the
   tune again and a button for the loop; foley on the beats (boing on hops, splash, whoosh, caw, crack, slide whistle on
   "!" and falls). Listen on the live page (♪), then `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Pull stills from the MP4
    (`ffmpeg -ss 20 -i out/film.mp4 -frames:v 1 x.png`) and look before handing it over.

## Rules
- **Design for the topic.** The creatures, the precious thing, the places, the props and the sign are made for this
  topic. Do not pull in the template's kitten and yarn or the example's mole, seed and crow unless the topic is exactly
  theirs; never recreate the source clip's bird, egg, snake, pot hat or its gags.
- **One style.** Everything new is drawn with the same two hands: ballpoint outlines (two passes, wobble) and pencil
  hatching that lets the paper through. No flat fills, no gradients, no glossy highlights except the eyes' two dots, no
  thick vector strokes, no outline-only creatures. Ink colour by material, crayon colours soft but clear.
- **The sheet shows.** At least a third of every frame is bare paper (check.mjs); the drawing lives on the line.
- **One line.** The ground is one ballpoint line; places are shapes of it (flat, slope, blue water, vertical cliff), not
  painted backdrops. Everyone stands on it or is plainly in the air; a scribble shadow under each.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames — `hash`, `n1`, `rng(seed)`, `span`,
  `keys`, `arcAt`. check.mjs proves it.
- **Lines breathe, drawings hold.** The pen re-draws 8× a second; poses, faces and effects change on twos; positions
  along the line and the camera move smoothly.
- **Bodies that can exist.** One `yaw` turns the whole ball — never mirror parts to fake a turn. Facing right shows the
  creature's right side (its near arm is its right arm, on the back side of the ball). Arms stay inside `R.LIM`; tilt
  is a lean (±0.7), tumbles use `roll`. Creatures face the way they move. Every creature is checked on the cast sheet
  facing both ways before it goes into a shot.
- **Wordless.** The only words are handwritten on a thing in the world (the sign), plus pen marks ("!", "?", notes).
- **Readable at a glance.** One action at a time; the hero's head and the chased thing never cut when they matter; hold
  after each gag.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (24), `window.SIZE = {W, H}` (1080×1080),
`window.runChecks(t)` (names of broken rules, including `body: …`), `window.shotAt(t)` (`{i, name, lt}`), `window.film`,
`window.__ready = true` — all set by `F.start()` (after the handwriting font loads). `?render=1` = fixed canvas, no live
loop; `?t=20` = one frozen frame; `?scale=.5` = preview size; `?off=grade,grain,vignette`. The live page fits the window,
draws at 24 fps and loops; click or space pauses, ← → jump a second, the bar scrubs, ♪ plays the score in sync.
