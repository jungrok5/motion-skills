---
name: feeling-pastel
description: Make one masterpiece drawing in JavaScript that feels hand-drawn in dry media — oil pastel, soft pastel, coloured pencil, Conté, charcoal, wax crayon — and carries the feelings of a story without drawing anything from it. Give it a story, a memory or a list of feelings (and optionally a folder of reference art for palette and mark-making) and it writes a brief that turns each feeling into weather, light, place, colour and mark (never the people or objects in the story), chooses 3–5 dry tools (or invents its own), and lays down a 16:9 picture stroke by stroke on simulated paper with real tooth: pigment catches the grain, waxy strokes streak, light goes over dark, every pixel is worked. Pure JS on typed arrays — renders to PNG up to 4K and to an MP4 of the drawing being made in Node with no headless browser, and the same strokes play live on a page. 90s-anime-style colour (salmon, cobalt, cyan, cream-gold) by default. Use for "draw this feeling", "make art from this memory", "JavaScript drawing", "generative art that looks hand drawn", "oil pastel / crayon / coloured pencil style", "not digital, not like an SVG", "use every pixel of the canvas", "90s anime colours", "감정을 그림으로", "이 기억을 그림으로 그려줘", "이야기 속 물건은 그리지 말고 감정만", "자바스크립트로 그린 그림", "손으로 그린 것 같은 파스텔화", "오일파스텔 느낌", "색연필 느낌", "90년대 애니 색감", "이렇게 그림 그리는 걸 재사용", "이 스타일로 ○○ 그려줘", "주제만 바꿔서". Source — made from https://x.com/kevin_t_ngo/status/2121303379196662115?a=kjK3494e60EqYhancfQ&s=19
---

# feeling-pastel

One picture, drawn in code, that looks like a person made it with dry sticks on toned paper — and that makes you feel a
story without showing any of it. The input is a story or a set of feelings ("the day I got the call, then the smell of
home…"). The output is a 16:9 still (PNG, 1920×1080 or 3840×2160), a live page where the picture is drawn stroke by
stroke, and optionally an MP4 of the drawing being made. There are no image files and no canvas drawing calls: every mark
is a stroke deposited on a simulated sheet whose **tooth** (paper grain) decides where pigment lands. Light pressure
catches only the peaks (the paper speckles through), heavy pressure fills the grain, oil pastel streaks and covers, soft
pastel dusts and saturates, coloured pencil builds in layers, the eraser lifts.

Made in this repo after an X post by Kevin Ngo (@kevin_t_ngo) —
https://x.com/kevin_t_ngo/status/2121303379196662115?a=kjK3494e60EqYhancfQ&s=19 — which shares the prompt behind a
"JavaScript drawing by Claude": pick 3–5 dry art tools (or make up your own), make it feel very human-drawn, not like an
SVG, 16:9, very detailed, use every pixel, aim for the colour of 90s anime but original, and above all *evoke the
emotions of two long personal stories without drawing anything from them* (the result: a sunset sky of oil-pastel
cumulus over a seaside town, hundreds of kites). This skill takes that **method** — feelings in, nothing literal,
dry tools, every pixel, a human hand — and builds the tools to do it again on any story. It does not take that picture
(references/SOURCE.md). Worked example: `examples/held-breath` 「참았던 숨」 (a story about waiting for a result:
a low ceiling of cloud torn open by gold, a murmuration inside the light, a frozen river, far windows). Starter:
`templates/` 「여름방학 마지막 밤」 (paddies at night on dark paper, a tall cloud, fireflies).
Live: https://jungrok5.github.io/motion-skills/feeling-pastel/

**Fixed by the style** (every piece):
- one 16:9 picture; every part of the sheet worked (no bare paper areas, no flat digital fields);
- dry media only, 3–5 tools per piece, chosen and explained in the brief (made-up tools allowed, defined as numbers);
- marks you can see: direction, pressure and colour change from stroke to stroke; edges are made by strokes, not paths;
  the paper's grain shows where the hand went lightly;
- painter's order: block-in on the side of the stick → big masses → forms → details → light and accents last;
- nothing from the story appears — no people, objects, places, logos, text or symbols named in it;
- colour logic of cel-era anime backgrounds (unless the brief asks otherwise): saturated mid-tones, coloured shadows
  (blue-violet, never grey), warm light, no pure black, no pure white.

**Designed per story** (never reused): the feeling inventory, the never-drawn list, the translation of each feeling into
something visible (weather, light, place, season, time of day, colour, a crowd of small things, motion), the one picture
and its composition, the palette, the paper colour, which tools and why, the stage plan.

## What's in this folder
| path | what |
|---|---|
| `lib/drawing.js` | `Drawing`: how a piece is authored, as strokes in the hand's order. `stage`, `stroke`, `line` (multi-pass, broken into pieces), `dabs`, `hatch` (rows of marks; angle field, zig-zag scribble, curve, coverage, sweep order), `side` (side of the stick), `scumble` (loops), `form` (contour hatching round masses lit as one body: clouds, crowns, drifts; `lobe`, `floor`, `shadeAt`), `blend` (finger), `lift` (eraser), `custom` |
| `lib/region.js` | where marks go: `R.poly` (optionally smoothed), `rect`, `circle`, `ellipse`, `lobes`, `above` / `below` / `between` curves, `fn`, `union`, `minus`; rasterised at output size, soft and ragged at the edge |
| `lib/tools.js` | the dry media as numbers: `softPastel`, `oilPastel`, `pastelPencil`, `colouredPencil`, `conte`, `charcoal`, `waxCrayon`, `blender`, `eraser`; `tool(base, overrides)` makes your own |
| `lib/surface.js` | the sheet: paper colour + tooth height map + how full the grain is; `apply(op)` stamps one stroke (pressure profile, tip striations, grain catch, powder, saturation, smear) — pure typed-array JS |
| `lib/core.js` | seeded random, value noise / fbm, colour ramps and jitter, splines, wobble |
| `lib/live.js` | the browser player: same strokes onto a `<canvas>`, time shared by stroke size; `window.__fp` |
| `templates/` | starter 「여름방학 마지막 밤」: `BRIEF.md`, `art.js`, `piece.html` — what `new-piece.mjs` copies |
| `examples/held-breath/` | worked example 「참았던 숨」: a full brief with feeling inventory, never-drawn list, translation table, review log |
| `scripts/render.mjs` | Node render: PNG (`--scale 2` = 3840×2160), `--stages` (+ sheet), `--crops` (100 % crops), `--film` (MP4 via ffmpeg) |
| `scripts/check.mjs` | 16:9 · 3–5 tools · stages · no bare paper · no flat fields · value range · not blown out · never-drawn words not in the code · deterministic |
| `scripts/palette.mjs` | palette from a folder of reference pictures (ffmpeg + k-means) → hex list + swatch |
| `scripts/new-piece.mjs` | start a project (starter or `--from held-breath`) with its own `lib/` copy |
| `references/` | **SOURCE** (the post and what is / is not taken) · **BRIEF** (template + rubric) · **FEELINGS** (feeling → picture) · **TOOLS** (the media, choosing 3–5, making your own) · **LOOK** (human hand, paper, every pixel, 90s colour) · **DRAWING** (API and the painter's order) · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md     story → feelings → never drawn → translation → one picture → composition → palette → tools → stages → review log
  art.js       export function art() → a Drawing (strokes in the hand's order, in stages)
  piece.html   the live page (import map "fp/" → ./lib/)
  lib/         copy of the skill's lib/
  out/         piece.png, stages, crops, piece.mp4 (not committed)
```
Run scripts from anywhere: `node <skill>/scripts/render.mjs my-piece/art.js`. The page is an ES module: serve the folder
(`python3 -m http.server`).

Requirements: Node 18+. ffmpeg only for `--film` and `palette.mjs`. No browser, no GPU, no npm install. A 1920×1080 piece
of ~100k strokes renders in ~20 s; `--scale 2` in ~70 s.

## Workflow
1. **Story → brief.** Write `BRIEF.md` (references/BRIEF.md) before any code:
   - **Feeling inventory**: one row per beat of the story — feeling, weight 1–5, temperature, motion, light. Name the top
     2–3 feelings a stranger should feel.
   - **Never drawn**: every person, object, place, brand, word and symbol in the story. `check.mjs` reads this list.
   - **Translation**: each feeling → what carries it in the picture (references/FEELINGS.md). Weather, light, season, time
     of day, a crowd of small things, a direction of movement, a colour temperature — not the thing itself.
   - **The one picture**: one place, one time, one light, in one line; where the eye goes first, second, third.
   - **Composition** (16:9): horizon, masses, the darkest dark beside the lightest light at the focus, what fills each corner.
   - **Palette** as ramps (hex), **paper** colour (dark paper for night), **tools** (3–5: role and why), **stages**.
   - References given (a folder of the user's art, "see the oav folder")? Look at them; `scripts/palette.mjs <folder>` for
     colour; note mark types and pressure. Take colour and hand, never subjects or compositions.
2. **Start the project.** `node <skill>/scripts/new-piece.mjs my-piece` — the starter is an example of the style; replace
   its art with what the brief designs.
3. **Draw in the painter's order** (references/DRAWING.md): block-in with `side` over the whole sheet → big masses with
   `hatch` (broken colour, zig-zag) → forms with `form` (one body per mass, lit from the brief's light) → detail where the
   eye lands (`dabs`, `line`, pencil) → light last (oil pastel light over dark, `lift`, `blend`) → a few decisive darks.
   One `stage()` per step. Make your own tool with `tool('oilPastel', { … })` or `tool({ … })` if the brief asks.
4. **Look.** `render.mjs art.js --stages --scale .5` (stage sheet), then full size with `--crops`. Open the PNGs.
   Score the still with the rubric in references/BRIEF.md (feeling first, nothing literal, hand, every pixel, values,
   colour, depth, detail at focus, its own picture, would you hang it); fix the worst item; log the round in BRIEF.md.
5. **Check.** `check.mjs art.js` must pass.
6. **Deliver.** `render.mjs art.js --scale 2` (3840×2160 PNG); `--film --seconds 30` for the drawing-being-made MP4;
   `piece.html` to watch it draw live.

## Rules
- **Design each piece from its story.** Feelings → translation → one picture, every time. The starter and the example are
  examples of the style, not menus: do not reuse their scene (night paddies, frozen river, murmuration) unless the brief
  arrives there on its own.
- **One style.** New scenes still use the same hand: dry tools only, visible marks, painter's order, coloured shadows,
  paper tooth. No smooth gradients, no vector shapes, no canvas fills, no filters standing in for a medium.
- **Nothing from the story.** No people (unless the story has none and the brief asks), no objects, places, text, logos or
  symbols the story names. If a stranger could point at something and name a beat of the story, it is too literal.
- **Every pixel.** No corner left as blank paper; no flat area. The paper may show through *marks*, as grain.
- **3–5 tools,** each with a job. More tools is not more human; the finger (`blender`) does not count.
- **Darkest dark next to lightest light at the focus.** Elsewhere, values stay closer together.
- **Small marks where the eye lands, big marks elsewhere.** Detail is a choice, not a texture over everything.
- **Night pieces on dark paper,** snow and fog on light paper: what shows through the grain is part of the colour.
- **Deterministic.** Seeds only (`core.rng`, the `r` passed to colour functions); never `Math.random`.
- **No headless browser needed** to render or check; keep it that way (the source asked for it).

## Contract
- `art.js` exports `art()` returning a `Drawing` with `W:H = 16:9` (1920×1080 virtual), `stages` and `ops`.
- `meta` export optional (`title`). `d.title` is shown on the page.
- Colours: hex, `[r,g,b]` 0..1, a list (picked per mark), or `fn(x, y, r)`. Lengths are virtual px; output scales.
- `piece.html` imports `fp/live.js` and `./art.js`; `window.__fp = { done, stage, progress, strokes, title }`.
