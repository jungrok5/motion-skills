---
name: prompt-sprite-game
description: Make a small pixel game in the browser whose cast is painted from words — give it a topic and it designs a one-verb game (a side-view platform climb or a top-down arena gather), writes each character, item, enemy and goal as a few English words that Tessera-small (a 47.6M-parameter diffusion model, CC BY-NC 4.0) paints as a 16×16 sprite inside the player's browser (WebGPU ~1 s for four, the 115 MB model cached after the first visit; the title screen shows the sprites filling in pixel by pixel, and players can type their own hero and pick one of four), plus a matching hand-drawn pixel grid so the same game runs offline and commercial-safe. One data file (game.json) holds the cast, tiles, backdrop layers, level, rules, tune and text; one engine runs it at a fixed 60 Hz with keyboard and touch controls, a chiptune and sound effects. The one-frame sprites move with weight — a hop gait so planted bodies never slide, squat before every jump, landing squash, a lagging lean that overshoots on stopping, stepped turns, breathing idles, all timed by mass — and check.mjs proves it (planted drift, idle, facing, anticipation, landing, overshoot) along with reachability of every item, determinism and the sprite grids; sheet.mjs draws a cast sheet turned both ways and stills. Use for "픽셀 게임 만들어줘", "간단한 픽셀게임", "AI가 그린 스프라이트로 게임", "Tessera로 게임", "브라우저에서 도는 미니게임", "이 스타일로 ○○ 게임", "주제만 바꿔서 게임", "pixel game from a prompt", "tiny browser game", "sprites painted by a diffusion model", "emoji sprite game", "platformer", "top-down collect game". Source — made from https://x.com/calebfahlgren/status/2122745094205763668?a=3EjPTb2Z6tqo35PIW7s&s=19 (Slack Moji, https://huggingface.co/spaces/cfahlgren1/slack-moji, on Tessera-small https://huggingface.co/thejagstudio/tessera-small).
---

# prompt-sprite-game

A small pixel game that runs as a static web page, built from one data file. Its cast — the player, the thing to
collect, the enemies, the goal — is written as **a few English words each**, and **Tessera-small** paints each one as a
16×16 sprite **in the player's own browser** when they press start; every member also has a hand-drawn grid, so the
game is playable offline, on a machine without WebGPU, and in a commercial setting. Two kinds: `platform` (side view:
run, jump, stomp, reach the goal) and `arena` (top-down: gather, dodge, pounce). Output: `index.html` + `game.json` +
`lib/`, served by any static host.

Made after a post by Caleb (@calebfahlgren) —
https://x.com/calebfahlgren/status/2122745094205763668?a=3EjPTb2Z6tqo35PIW7s&s=19 — "Someone trained a tiny 47M-param
diffusion model that paints pixel art emoji in your browser 👾 I built a tiny Slack emoji maker on top of it. Type
anything, get 4 to pick from": Slack Moji (https://huggingface.co/spaces/cfahlgren1/slack-moji) on Tessera-small by
Jagrat Patel / TheJagStudio (https://huggingface.co/thejagstudio/tessera-small) through its ONNX browser build
(https://huggingface.co/cfahlgren1/tessera-small-onnx). This skill takes the model and the type → four → pick loop and
builds a game around them; it copies nothing from Slack Moji and commits no generated sprite (references/SOURCE.md).
Worked examples, both topics of this skill's own: `examples/lighthouse-cat` 「등대 고양이」 (platform: a cat climbs a
night sea cliff for five fish to relight the lighthouse; crabs to stomp, a gull overhead, sea urchins and water) and
`examples/mushroom-basket` 「버섯 숲 바구니」 (arena: a hedgehog fills a basket with ten red mushrooms before sunset;
beetles to pounce, a wasp that chases, thorns, a pond). Live: https://jungrok5.github.io/motion-skills/prompt-sprite-game/

**Licence.** Tessera-small is CC BY-NC 4.0. A game played with Tessera sprites is non-commercial and shows the credit
(the engine prints it under the canvas). A game played with the hand-drawn grids uses nothing of the model.

**Fixed by the style** (every game): 16×16 sprites on a 16 px tile grid, a 320×192 logical screen scaled in whole pixels;
one data file; Tessera paints in the player's browser at a pinned revision, never at build time, never committed; a
hand grid for every member; the title screen with the live painting and the "내 주인공 그리기" box; the hop-gait body
(planted never slides, squat before a jump, landing squash, lagging lean, stepped turn, breathing idle, all from mass);
pixel-font HUD (hearts, item count with the item's own sprite, timer); a code-made chiptune and sound effects;
keyboard + touch; deterministic 60 Hz steps; check.mjs green.
**Designed per topic** (never reused): the verb and the kind; every cast member — role, name, prompt, seed and pick,
faces, mass, gait, movement — and its hand grid; palette, backdrop layers and tile looks; the level and its route;
rules (need, lives, time); the tune; the intro, win and lose lines.

## What's in this folder
| path | what |
|---|---|
| `lib/engine.js` | the runtime: `boot` (page, title screen, input, loop), `Game` (platform / arena worlds, tiles, enemies, items, rules, camera, HUD), `Body` + `timing(mass)` (the carried one-frame body), `drawSprite` (feet-anchored squash, flip, sheared lean in whole pixels), tile looks, backdrop layers, `Sound` (sfx + tune), `reach` / `reachArena`, `yard` (test ground), `autopilot`, `window.GAME` test hooks |
| `lib/tessera-link.js` | loads Tessera-small from the Hub at a pinned revision, `paint` (four variations, live `onStep`), `spriteFor` (cache first), localStorage cache, `TESSERA_CREDIT` |
| `lib/painter-link.js` | a themed painter of your own (made with `train/`): loads `<name>.onnx` + `<name>.json` with onnxruntime-web on the CPU and paints in seconds; same unmasking loop as Tessera |
| `lib/game.css` | the page shell (crisp scaling, title card, touch pad; phone layout) |
| `templates/` | `index.html` (the page), `starter-platform.json`, `starter-arena.json` (placeholders that fail check until designed) |
| `scripts/new-game.mjs` | start a project (`--kind`, `--title`), copy an example (`--from`), or `--refresh` its `lib/` |
| `scripts/paint.mjs` | preview what Tessera paints for each prompt and seed → `ref/tessera/*.png` + `sheet.png` (git-ignored) |
| `scripts/check.mjs` | the gates (files, data, sprites, reach, run + determinism, motion per member both ways, page errors; `--tessera`) |
| `scripts/compare-painters.mjs` | the same prompts side by side: Tessera and/or a themed painter under several settings → `ref/compare.png` |
| `scripts/repaint-sheet.mjs` | same character, new look: a base sprite, then one region repainted per edit (hat, scarf, glasses …) → `ref/repaint.png` |
| `lib/decorate.js` | accessory regions measured from a sprite's bounds, `keepMask`, `ACCESSORIES`, RGBA → Tessera palette ids |
| `scripts/sheet.mjs` | cast sheet turned both ways with the motion, and five stills of the level played by the autopilot (`--tessera` → ref/) |
| `train/` | train a themed painter on a subset of Pixel Art Atlas 1.4M (CC0): `prepare.py` → `train.py` → `export.py` (int8 ONNX + NOTICE); README with the licence reading (Tessera, the atlas, Krea 2) |
| `models/cat/` | the cat painter trained here: 5,775 cat sprites, 3.24 M parameters, int8 ONNX 3.56 MB, 352 words |
| `examples/lighthouse-cat/` | 「등대 고양이」 platform: `game.json`, `BRIEF.md`, `index.html`, `lib/`, `sheets/` |
| `examples/mushroom-basket/` | 「버섯 숲 바구니」 arena: the same files |
| `references/` | **BRIEF** (template + review) · **GAME-JSON** (the data format) · **TESSERA** (model, licence, prompts that read, seeds) · **MOTION** (how a one-frame sprite carries weight; what check measures) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-game/
  index.html         the page (loads lib/engine.js and game.json)
  game.json          the game
  BRIEF.md           topic → verb, kind, cast, place, level, tune, text; Tessera picks; review notes
  lib/               engine.js, tessera-link.js, game.css (a copy of the skill's; refresh with new-game.mjs --refresh)
  sheets/            cast.png, still-1..5.png (hand sprites)
  ref/               git-ignored: Tessera previews and Tessera-sprite sheets
```

## Requirements
Node 18+ and Playwright's Chromium (scripts). The game itself: any static server and a browser; Tessera needs network
access to huggingface.co and cdn.jsdelivr.net, and WebGPU for the fast path.

## Workflow
Run scripts from the folder that holds the project.

1. **Topic → brief.** `node <skill>/scripts/new-game.mjs my-game --kind=platform|arena --title="…"` then fill
   `my-game/BRIEF.md` from references/BRIEF.md: one verb, the kind, the cast (role, name, prompt, faces, mass, gait,
   movement), the place, the level route in beats, rules, tune, text. Design for the topic; the examples are only
   examples of the style.
2. **Prompts → Tessera previews.** Write the cast prompts into game.json, then
   `node <skill>/scripts/paint.mjs my-game --seeds=7,21,42` and open `my-game/ref/tessera/sheet.png`. Pick, per member,
   the seed and the one of four whose silhouette reads at 1× and stands on a flat base; set `seed`, `pick` and `faces`.
   Change the words when none reads (references/TESSERA.md). Note the picks in the brief.
3. **Hand grids.** Draw each member's 16×16 grid to match its picked Tessera sprite (same thing, same angle, same
   main colours, outline `k`). Keep to a 2–5 colour ramp per member; leave the bottom row of a walker on its feet.
4. **Place, level, tune, text** in game.json (references/GAME-JSON.md): palette, backdrop layers, tile looks, the level
   rows, rules, the tune, the intro / win / lose lines.
5. **Check.** `node <skill>/scripts/check.mjs my-game` — fix until every gate passes (an unreachable item is moved
   or given a step; a motion gate is fixed in mass / gait / faces, never by loosening the check).
6. **Sheet and stills → review.** `node <skill>/scripts/sheet.mjs my-game`, look at `sheets/cast.png` and the stills at
   100 % and score them with the review table in references/BRIEF.md. Write findings and fixes under *Review*; repeat
   from the step the finding belongs to.
7. **Play it.** `cd my-game && python3 -m http.server 8000` → http://localhost:8000/. Play both sprite sets to the end
   once (hand: "손그림 스프라이트로 시작"; Tessera: "Tessera로 스프라이트 그리기"), and at a phone width with the touch pad
   (`?touch=1`). Optionally `check.mjs --tessera` and `sheet.mjs --tessera` (CPU, slow) to check the painted cast.

## A themed painter instead of (or beside) Tessera

Tessera paints anything but is 115 MB and non-commercial, its outputs included. A game whose cast all belongs to one
theme can carry its own painter: `train/` cuts the theme out of Pixel Art Atlas 1.4M, trains a 2–4 M-parameter painter
with the same recipe in about an hour on a 4-core CPU, and exports a 3–4 MB int8 ONNX that paints four sprites in
4–5 s on the CPU (16 steps, nucleus sampling, NMS and a despeckle pass, the settings `train/eval.py` chose). `game.json` names it:

```jsonc
"painter": { "src": "https://cdn.jsdelivr.net/gh/<owner>/<repo>@<commit>/prompt-sprite-game/models/cat/cat",
             "name": "cat", "label": "고양이 모델로 그리기", "size": "3.6 MB", "for": ["cat"] },
"cast": { "cat": { "painterPrompt": "front-view ginger cat", "painterSeed": 7, "painterPick": 0, "painterFaces": "front", "…": "…" } }
```

The title screen then leads with that button (members not in `for` keep their hand grid), and "내 주인공 그리기" paints
with it. check.mjs fetches the painter's vocabulary and fails a prompt word it does not know. Its prompts may only use
the theme's words (the cat painter knows 352). Direction is not controllable: training mirrors every sprite, so a
side view may face either way — use `front-view` for anything that turns, or pick a seed by looking. Licence: read
`train/README.md` ("Provenance and licence") — the data is CC0 but was made with Krea 2, whose terms allow commercial
use below US$1M yearly revenue.

## Rules
- **Design per topic.** A new topic gets its own verb, cast, prompts, grids, place, level and tune. Do not reuse an
  example's cast or level because it is close; the starters fail check until every placeholder is replaced.
- **One style.** New sprites are 16×16 with an outline and a short ramp, new tiles use the base / dark / light logic,
  everything is drawn at whole pixels, every body moves through the same `Body`.
- **Tessera runs in the player's browser, and only when they choose it.** Never start the 115 MB download on load;
  never bake, commit or put in `docs/` a sprite the model painted (previews live in git-ignored `ref/`); show the
  credit and say non-commercial whenever its sprites are on screen.
- **Every member has a hand grid that matches its prompt.** Same thing, angle and colours; it is the offline,
  checked and commercial-safe version.
- **Prompts are 1–4 plain English words for one thing.** No scenes, no text, no non-English (CLIP reads English).
- **Weight sets timing.** One mass per member in the brief; do not hand-tune frame counts per member.
- **Planted bodies never slide.** Ground travel is the hop gait; turns, squats and landings are planted.
- **Anticipation and recovery.** A jump or pounce squats first and squashes and settles after; heavier = longer.
- **Follow-through.** The top lags and overshoots; flyers bob; items float with a shadow.
- **Every idle breathes** — at least one drawn pixel, on an irregular period, with a weight shift now and then.
- **Faces is true.** `faces` is the way the drawing looks; a front drawing is never mirrored; movement = facing.
- **Teach, then combine.** Each hazard or enemy appears once in safety before it appears with another.
- **Deterministic.** All randomness from the seeded RNG; the game is a function of (game.json, seed, inputs).
- **No generated motion.** The motion is keyed in code (references/MOTION.md); no video model, no mocap.

## Contract
- `index.html` imports `boot` from `./lib/engine.js` and calls `boot({ root, src: './game.json' })`.
- `game.json` follows references/GAME-JSON.md: exactly one `player`, at least one `item`, a `goal` for a platform game
  that wins at the goal; every level character is a tile or in the legend; every member has `prompt` and `pixels`.
- Query: `?sprites=hand` starts at once with the hand grids; `?autostart` the same; `?touch=1` forces the touch pad;
  `?seed=` overrides the world seed; `?test=1` loads without a loop for the scripts.
- `window.GAME`: `newGame({ seed, sprites })`, `yard(key)`, `step(input, n)` → snapshot, `snap()`, `hash()`, `reach()`,
  `draw()`, `hand` (hand sprites), `sprites()`, `data`. Input: `{ left, right, up, down, jump, jumpPressed }`.
- Sprites are drawn from their foot row (lowest opaque pixel) at the body's foot point.
