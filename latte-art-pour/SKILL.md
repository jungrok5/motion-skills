---
name: latte-art-pour
description: Make a short top-down film of latte art being poured — a cup on its saucer on a table, a steel pitcher coming in, and the milk drawing a figure in the crema through a simulated surface (foam that surfaces ahead of the stream, rocking that lays rosetta leaves, punches that keep tulip stacks apart, a thin high stream that cuts the stem, an etching pin), with step labels, a pour-score strip, height / flow meters, a held finished cup with its title and a synthesised pour sound. Give it a topic (a café, a season, a person, a brand, a moment) and it designs a new cup — the drink (espresso, matcha, hojicha, chai, ube, beet, golden or your colours), the cup and saucer glaze, the table, the figure and its pour score (heart, rosetta, tulip, wave, swan, etched details or your own), the direction, the words and the timing — all from code (no images, models or generated media). Output is a live HTML page (with a hands-on `?play=1` mode) and an MP4 (1080×1920 or 1920×1080). Use for "latte art", "latte art video", "pour animation", "barista", "rosetta", "tulip", "heart latte", "coffee motion graphics", "cafe promo", "라떼아트", "라떼아트 영상", "라떼 붓는 영상", "카페 홍보 영상", "로제타", "튤립", "하트 라떼", "커피 모션그래픽", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서". Source — made from https://www.threads.com/share/BAJMYuMY94.
---

# latte-art-pour

A latte poured from above, as a film. The cup sits on its saucer, the steel pitcher comes in, pours high to set the
base, drops to the surface and draws — and the figure is not painted: it comes out of a 2D surface model where the
foam surfaces ahead of the stream and is pushed forward, a rocking spout lays alternating lobes with brown dragged
between them (leaves), a full high burst punches a brown gap (stacks), and a thin high stream drawn across pulls it all
into a stem. Step labels and a pour-score strip say what the hand is doing; the finished cup is held with its title;
the pour is heard. One HTML page plays it (`seek(t)`), `render.mjs` writes the MP4, `?play=1` lets anyone pour.

Made from the Threads post by @ujae_ — https://www.threads.com/share/BAJMYuMY94 — sharing a latte-art pour simulator
by a New Zealand motion designer (two clips: a rosetta and a tulip poured from above; `references/SOURCE.md` says what
is taken and what is not: the idea and the physics seen in the clips, none of its code, UI or look). Built and proven
in this repo on `examples/matcha-tulip` 「Matcha Tulip」 — a four-stack tulip on matcha, poured upward in a
slate stoneware cup — and the starter 「Rosetta」.

**Fixed by the skill (the style)**
- Top-down, still camera (one push-in at the end); cup on saucer on a table; one light from one side, shadows agree.
- The figure is poured, never painted: the score drives the pitcher, the surface model draws (`lib/latte.js`).
- A steel pitcher with milk inside that enters and leaves on an arc; the stream and its ripples; an etching pin.
- Film shape: title over the empty cup → steps (number, label, strip, height / flow meters) while the figure builds →
  the finished cup held with title and caption. Synthesised pour sound. Bundled OFL fonts; no network.
- Output: the live page (`index.html` + `film.js` + `lib/`) and an MP4.

**Designed for every topic (never reused from an example)**
- The drink (crema and foam colours), the cup (glaze, rim, inner, handle, saucer), the table and the accent.
- The figure and its whole pour score: moves, positions, durations, rocking, stacks, direction, cuts, etches.
- Every word: kicker, title, step labels, caption — English on screen unless the brief says otherwise (`lang: 'ko'` for
  Korean labels; `references/OWNER-FEEDBACK.md`); the timing.

## What's in this folder
| path | what |
|---|---|
| `lib/latte.js` | the surface: foam + crema tone fields, closed-form velocity (source, forward bias, jet, drag, wall, pin), MacCormack advection, what the stream brings up (foam lingering, brown rushing, punch), the pin's ink; `PHYS` constants |
| `lib/pour.js` | the score → the pitcher's track (`compile`): fill, drop (with anticipation), pour, wiggle, punch, lift, cut, move, turn, stop, etch, wait; entrance / exit added; steps from `say` |
| `lib/film.js` | the film: table painter, cup and saucer, the liquid per pixel, the pitcher and pin, words with recorded boxes, the strip and meters, timing, checkpointed `seek(t)`, the page contract, live player, `?play=1` |
| `lib/principles.js` | the animation-principles toolkit (from `principle-pass`): easing and keys for the pitcher |
| `lib/fonts/` | Source Serif 4, Nanum Myeongjo, Inter, Noto Sans KR — OFL |
| `templates/` | the skeleton `film.js` (a placeholder heart, the contract not a look) and the `BRIEF.md` form |
| `starter/` | 「Rosetta」 espresso, white porcelain, oak, English, 15.8 s — runs as it is |
| `examples/matcha-tulip/` | 「Matcha Tulip」 matcha, slate stoneware, terrazzo, poured upward, 17.1 s; `BRIEF.md` with its stills review |
| `scripts/new-film.mjs` | start a project (`--title`, `--from <film>` to study one, `--refresh` re-copies the engine) |
| `scripts/render.mjs` | MP4 with the synthesised sound (workers × ffmpeg), `--stills`, `--sheet`, `--shots` (before, the end of every step, end) |
| `scripts/audio.mjs` | the pour sound from the score (stream, glug, splash, pin, saucer tick, room) → WAV |
| `scripts/check.mjs` | the gates (contract, code-only, pure, score, over the cup, pitcher motion, art, shape, settles, contrast, words, sound, designed, brief) |
| `references/` | **BRIEF** (form + stills review) · **SCORE** (moves, proven figures, building your own) · **LOOK** (frame, drink, cup, table, words, sound) · **PHYSICS** (the model and constants) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-cup/
  index.html     importmap: latte/ → ./lib/
  film.js        film({ title, kicker, caption, lang, size, drink, dir, cup, table, pour: [...] })
  BRIEF.md       topic, figure, cup, score table, words, timing, the stills review
  lib/           latte.js, pour.js, film.js, principles.js, fonts/ (from new-film.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run scripts from the project's parent: `node <skill>/scripts/check.mjs my-cup`. To watch it live:
`(cd my-cup && python3 -m http.server)` → http://localhost:8000/ (click / space pauses, ← → jump a second, `?t=8` opens
paused there, `?debug=1` shows time, move, height, flow, `?scale=.5` for a quick look, `?play=1` to pour by hand).

Requirements: Node + Playwright Chromium (Canvas 2D, no GPU needed), ffmpeg; Python 3 only to serve the page.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md`: who pours this cup and why; the figure and why it
   fits; the direction; drink, cup, table, ink and accent; the score as a table (one row per move, `say` rows are the
   3–7 steps); kicker, title, caption (English unless the brief says otherwise); timing.
2. **Start**: `node <skill>/scripts/new-film.mjs my-cup --title "…"` (or `--from matcha-tulip` to study one — then
   replace everything; a bundled film is not a template).
3. **Pour the figure** (`references/SCORE.md`): write the score, look at `render.mjs my-cup --shots` (the end of every
   step), adjust positions, durations, rocking and stacks until the figure is the one in the brief. Change the score,
   not the physics. Add `etch` details where the topic needs them.
4. **Dress the cup** (`references/LOOK.md`): drink, cup, table, light, words.
5. **Check**: `node <skill>/scripts/check.mjs my-cup` must end `all checks passed` (`--no-brief` until step 6).
6. **Look**: `render.mjs my-cup --shots` and `--stills <t>` at full size; answer the stills review in `BRIEF.md`
   (10 questions); fix; repeat 5–6.
7. **Render**: `node <skill>/scripts/render.mjs my-cup` → `out/my-cup.mp4` (with sound; `--silent`, `--audio x.wav`).
   Watch a contact sheet of the MP4 (`ffmpeg … fps=1,tile`) and play it once with sound.

## Rules
- **Design per topic.** A new topic gets its own drink, cup, table, figure, score and words. Never re-skin the starter's
  rosetta or the example's tulip; `check.mjs` fails words and scores borrowed from the bundled films or left as the
  skeleton's `Replace:` placeholders.
- **One style.** Top-down, one light, the cup on its saucer, the steel pitcher, serif titles, the strip and meters,
  the held end. A side view, a hand, a 3D camera move or a photographed cup belongs to another skill.
- **Pour it, never paint it.** The figure comes only from the score through the surface model. No overlays, no drawn
  foam shapes, no images. If the figure is wrong, change the pour.
- **Physics is fixed per film.** Tune the score first; `sim.phys` overrides are a last resort, named in the brief.
- **High is brown, low is white.** Start with a high `fill` (no white), drop to draw, lift to cut. The spout stays over
  the liquid (r ≤ .9, ≤ .85 when low).
- **The pitcher is keyed with the principles** (`references/ANIMATION-PRINCIPLES.md`): every move eases in and out, every
  drop lifts first (anticipation), it enters and leaves on an arc, no jumps (`check.mjs` → ease, anticipation, no
  teleport, in and out). Code-only: no generated or captured motion.
- **The finished cup is held clean.** The pitcher has left; the surface is still (`settles`); title and caption fade in.
- **Readable on a phone.** Title ≥ 56 px, step ≥ 40, caption ≥ 28 at 1080; nothing over the saucer or on another line.
- **Code only, pure.** No images, models, video, audio files or fetches; everything a function of t and the seed (no
  `Math.random`, `Date`, timers in `film.js`); `check.mjs` renders the same frame twice from different seeks.
- **Look before you finish.** The stills review in `BRIEF.md` is answered from rendered frames.

## Contract
`index.html` with the importmap (`latte/` → the engine) and `<canvas id="film">`; `film.js` calls `film({ title, kicker,
caption, lang, size, fps, seed, drink, dir, cup, table, ink, accent, light, level, timing, sim, steps, strip, pour })`
(references/LOOK.md, references/SCORE.md). The page sets `window.seek(t)`, `DURATION`, `FPS`, `SIZE`, `filmInfo()`,
`__film` (`at`, `pitcherScreen`, `foamStats`, `foamGrid`, `audio`, `texts`, `layout`, `colors`, `camAt`, `levelAt`,
`fontsOk`), `__ready`. Query: `?render=1` (no player), `?t=`, `?scale=`, `?debug=1`, `?play=1`, `?grid=`.
