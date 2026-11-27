---
name: color-cycle-breakdown
description: Make a short explainer film of a pixel-art scene that lives by colour cycling (palette cycling — the old 8-bit trick where the pixels never move and only the palette rotates) and then pulls itself apart to show how — the layers fly apart as labelled planes in space, then one panel per technique ("fixed indices" in purple beside "same pixels, rotating colours" with slot swatches; flow vectors beside the flow; a plant cutout beside its frond pivots), then everything comes back together. Give it a topic (a place with something moving: a harbour, a forge, a rainy street, a volcano, a lighthouse, a waterfall, a neon sign, an aurora) and it designs a new indexed scene — its palette ramps, which things cycle (water, fire, light beams, stars, surf, lava, rain, neon), flow fields, wind-rigged plants, per-frame sparks, layers and panel lines — all from code (no images, models or generated media). Output is a live HTML page and an MP4 (1920×1080). Use for "컬러 사이클링", "팔레트 사이클링", "색 순환 애니메이션", "픽셀아트 원리 설명 영상", "레이어 분해 영상", "장면을 분해해서 보여줘", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "color cycling", "palette cycling", "palette animation breakdown", "pixel art explainer", "how it works breakdown", "exploded layers". Source — made from https://x.com/JungleSilicon/status/2126107723460907414?a=yo9l1g21bGwO0nwzfCw&s=19.
---

# color-cycle-breakdown

An indexed pixel picture that is alive — water running, fire climbing, a lighthouse beam turning, stars twinkling —
although no pixel ever moves: only the colours inside a few palette slots rotate. Then the film explains itself. The
picture comes apart into its layers as glass planes in space, each named; panels show the trick one technique at a time
(the same indices through a fixed palette, with the cycling slots in purple, beside the live picture; the flow's arrows
beside the flow; a plant beside its joints bending in one shared gust); and the planes come back together into the living
picture. One HTML page plays it (`seek(t)`); `render.mjs` writes the MP4.

Made from the post by @JungleSilicon — https://x.com/JungleSilicon/status/2126107723460907414?a=yo9l1g21bGwO0nwzfCw&s=19 —
"it's an old graphics trick called color cycling. i pull the scene apart so you can see how it works!!", a 16-second
pixel waterfall pulled apart into four planes and three panels (`references/SOURCE.md` says what is taken and what is
not). Built and proven in this repo on `examples/lighthouse-cove` 「등대 포구의 밤」 — a night cove the source does not
have — and the starter 「Campfire」.

**Fixed by the skill (the style)**
- Indexed pixel art: one palette (≤ 256) of dark → light ramps, every pixel an index, Bayer-dithered gradients, hard
  pixels at a whole-number scale (320 × 180 → 1920 × 1080).
- Motion by colour cycling first (cycles, flows laid along a direction, clear slots), per-frame drawing only for what
  travels, a wind rig for what bends.
- The film's shape: hold the living picture → the layers come apart as labelled planes → 1–4 panels on a dark slate
  (mono kicker, one-line title, two views, caption) → back together → hold.
- The panel kinds: `cycle` (fixed indices vs rotating colours + slot swatches), `flow` (measured vectors vs the flow),
  `rig` (cutout vs joints).
- Code only: no images, models, video, audio or generated media; bundled OFL fonts; no network.
- Output: the live page (`index.html` + `film.js` + `lib/`) and an MP4.

**Designed for every topic (never reused from an example)**
- The place, the picture and its palette; the layers and their names; what cycles and how (ramps, slots, rates, clear
  slots); every flow's direction and streaks; the plants (where, how many, what kind) and the gust; drawn particles.
- Which panels (1–4, only techniques the picture really uses), their crops, and every word: kickers, titles, labels,
  captions — in the topic's language.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | the film: timeline (shots that cross-fade), the stage (flat picture or the layers as perspective planes, fitted and centred), the colour modes (live · fixed indices · dimmed · flow-tinted), the three panel kinds, text with recorded boxes, the page contract and live player, measurements for `check.mjs` |
| `lib/pixel.js` | the picture: `Palette` (ramps, cycles, clear slots), `Layer` (indices, paint calls, per-frame drawing, rigs), the kit (gradient, ridge, rock, pine, stars, orb, flow, plant), the shared wind, noise and dither |
| `lib/fonts/` | Inter 500/700, Noto Sans KR 500, JetBrains Mono — OFL (`OFL-*.txt`) |
| `templates/film.js`, `templates/BRIEF.md` | the skeleton `new-film.mjs` writes: a placeholder picture (the contract, not a look) and the brief form |
| `starter/` | 「Campfire」 4 layers, 2 panels, 19.5 s: runs as it is |
| `examples/lighthouse-cove/` | 「등대 포구의 밤」 4 layers, 3 panels (beam cycle, sea flow, reed rig), Korean, 23.6 s; `BRIEF.md` with its stills review |
| `scripts/new-film.mjs` | start a project (`--title`, `--from <film>` to study one, `--refresh` re-copies the engine) |
| `scripts/render.mjs` | MP4 (workers × ffmpeg, PNG frames), `--stills`, `--sheet`, `--shots` (picture, layers apart, every panel, coming together, end) |
| `scripts/check.mjs` | the gates (contract, code-only, pure, pixel grid, palette, pixels stay put, colour moves, flow direction, rig, camera, framing, legible, panels, picture, designed, brief) |
| `references/` | **BRIEF** (form + stills review) · **KIT** (film options, palette, layers, painting, flows, plants, panels) · **LOOK** (picture, motion, breakdown, words) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-film/
  index.html     importmap: cycle/ → ./lib/
  film.js        film({ title, art, size, wind, timing, paint({ pal, layer, kit }), panels: [...] })
  BRIEF.md       the topic, picture, layers, what moves and how, flows, plants, panels, timing, the stills review
  lib/           film.js, pixel.js, fonts/ (from new-film.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run scripts from the project's parent: `node <skill>/scripts/check.mjs my-film`. To watch it live:
`(cd my-film && python3 -m http.server)` → http://localhost:8000/ (click / space pauses, ← → jump a second, `?t=8` opens
paused there, `?debug=1` shows the time and shot, `?scale=.5` for a quick look).

Requirements: Node + Playwright Chromium (Canvas 2D, no GPU needed), ffmpeg; Python 3 only to serve the page.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md`: the place and what moves in it; the picture (subject,
   light, three depth bands, a palette family of ramps and one accent); 2–5 layers back to front with their on-screen
   names; for every moving thing its technique (cycle · flow · drawn · rig), ramp, slots and rate; each flow's `along`,
   `across` and mask; each plant clump; 1–4 panels with every line; timing.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film --title "…"` (or `--from lighthouse-cove` to study one — then
   replace everything; a bundled film is not a template).
3. **Paint the picture** in `film.js` (`references/KIT.md`, `references/LOOK.md`): ramps and cycles first, then each
   layer back to front with the kit and your own `fill` / `poly` shapes; lay flows so `along` grows the way things move;
   plant the clumps. Look at the held picture: `?t=1` live, or `render.mjs my-film --stills 1`.
4. **Write the panels**: one per technique the picture really uses, a crop that frames it (zoom 3 · 4 · 6), a title
   that says what *this* picture does.
5. **Check**: `node <skill>/scripts/check.mjs my-film` must end `all checks passed` (the brief row needs step 6; use
   `--no-brief` until then).
6. **Look**: `render.mjs my-film --shots` and `--stills <t>` at full size; answer the stills review in `BRIEF.md`
   (10 questions); fix; repeat 5–6.
7. **Render**: `node <skill>/scripts/render.mjs my-film` → `out/my-film.mp4` (`--audio track.wav` to lay a track; the
   film is silent). Look at a contact sheet of the MP4 (`ffmpeg … fps=1,tile`), and watch the holds play.

## Rules
- **Design per topic.** A new topic gets its own place, palette, layers, cycles, flows, plants and words. Never re-skin
  the starter's campfire, the example's cove or the source's waterfall; `check.mjs` fails titles, layer names and panel
  lines borrowed from the bundled films or left as the skeleton's `Replace:` placeholders.
- **One style.** Indexed pixel art in one palette family, ramps dark → light, Bayer dither for gradients, light from one
  side, hard pixels; the panels in the house slate layout. A look that needs smooth gradients, vector shapes, 3D or
  photographs belongs to another skill.
- **The pixels stay put.** Colour cycling changes colours, never indices: static layers keep every index for the whole
  film (`check.mjs` → pixels stay), and colour changes only where a cycle or a drawn layer is (→ colour moves).
- **Cycle what repeats along a path; draw only what travels; rig what bends.** Every moving thing names its technique in
  the brief. Cycles: 5–9 slots at 4–14 steps/s read; one highlight slot is what the eye tracks; clear slots make shapes
  appear and vanish.
- **Flows point where the colour goes.** `along` grows downstream and the cycle turns forward (rate × dir > 0);
  `check.mjs` measures that steps along the arrows climb the cycle (≥ 60 %).
- **The wind is one gust.** Shared by every plant, travelling across the picture, felt later toward each tip
  (follow-through); bones fixed, roots planted, ≤ 34° a joint, never still in the holds, no snapping (≤ 2.5 art px a
  frame) — keyed in code with the principles in `references/ANIMATION-PRINCIPLES.md` (arcs, follow-through, secondary
  motion). This skill is code-only: `references/MOTION-QUALITY.md`'s generated-reference path does not apply.
- **Whole pixels.** `size` is a whole multiple of `art` both ways; panel zooms are whole numbers (3 · 4 · 6 · 8).
- **One camera move each way.** The layers come apart and back together on quintic easing (no velocity step); the
  exploded hold still drifts; every plane stays inside the frame above the names.
- **Readable on a phone.** Titles ≥ 44 px, labels ≥ 24, captions ≥ 22 at 1920 wide; each line fits its column; nothing
  overlaps (`check.mjs` → legible). Titles are one line.
- **Code only, pure.** No images, models, video, audio or fetches; everything a function of t and the seed (no
  `Math.random`, `Date`, timers); `check.mjs` renders the same frame twice.
- **Look before you finish.** The stills review in `BRIEF.md` is answered from rendered frames.

## Contract
`index.html` with the importmap (`cycle/` → the engine) and `<canvas id="film">`; `film.js` calls `film({ title, size,
art, fps, seed, theme, wind, timing, paint, panels })` (references/KIT.md). Panels: `{ kind: 'cycle' | 'flow' | 'rig',
cycle | flows | layer, center, zoom, kicker, title, left, right, caption }`. The page sets `window.seek(t)`, `DURATION`,
`FPS`, `SIZE`, `ART`, `filmInfo()`, `__film` (`camAt`, `planeQuads`, `texts`, `layerIdx`, `paletteAt`, `compositeRGBA`,
`rigAngles`, `rigPose`, `flowField`, `wind`, `fontsOk`), `__ready`. Query: `?render=1` (no player), `?t=`, `?scale=`,
`?debug=1`.
