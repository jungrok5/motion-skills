---
name: doodle-styles
description: Pick one of 32 hand-drawn styles (pencil & watercolour, coloured pencil, ballpoint, crayon, charcoal, chalkboard, stipple, single-line engraving, ink & line-wash, sumi-e, marker comic, rubber-hose, scratchboard, oil, broken colour, dream glaze, mid-century gouache, folk-tale, ukiyo-e woodblock, risograph, newsprint halftone, cyanotype blueprint, scrapbook, cut paper, toy theatre, embroidery, toy brick, flat vector, isometric, low-poly, pixel art, storybook) and keep reusing it. Give it a topic and it writes a brief, builds the subject once as a scene in no style, draws it in the chosen hand as a still (PNG) and as a film of the picture being drawn in that medium's order (MP4, with optional life such as rising steam), and saves the chosen hand as a studio's house style so every later picture arrives in the same hand. Compare hands on your own subject with a contact sheet. Use for "draw this in a woodblock style", "pick an illustration style", "hand-drawn illustration", "a drawing that draws itself", "drawing timelapse", "same style for all our images", "house style", "brand illustration style", "원하는 화풍으로 그려줘", "화풍 골라서", "화풍 재사용", "같은 화풍으로 계속", "우리 브랜드 그림체", "그려지는 과정 영상", "수채화/목판화/픽셀아트 느낌으로 ○○ 그려줘", "주제만 바꿔서 같은 화풍으로". Source — made from https://github.com/alexgreensh/anidoodle.
---

# doodle-styles

Thirty-two hands, one subject. A piece describes its subject once — regions and lines with local colours, one light,
depth, cast shadows — in no style. A **hand** (`lib/styles/<id>.js`) draws any such scene in its medium: the mark, the
edge, the paper and the order the marks go down all change, the way 32 illustrators would draw the same persimmons.
Every hand also gives the film of the picture being made (pencil lay-in before washes; keyblock before colour blocks;
drum by drum on a riso), whose last frame is the still pixel for pixel. Pick a hand once, save it as the studio's
**house style**, and every later piece in that studio is drawn in it. Plain JavaScript and Canvas 2D: no build step, no
network, deterministic (`renderAt(t)` is pure).

Made from **anidoodle** by Alex Greenshpun — https://github.com/alexgreensh/anidoodle (Apache-2.0), "hand-drawn art,
written as code", 32 styles. Each hand here was studied from its style recipe (`skills/anidoodle/references/styles/*.md`,
`references/styles.md` and the plate headers in `engine/src/canvas-core/*.ts`: medium, mark, edge, order, palette, paper,
motion grammar) and **re-implemented** for this skill's scene model; no anidoodle code is copied or run. Its picking
guide, craft bar and "the last frame is the still" rule come with it (`references/BRIEF.md`). anidoodle itself does far
more (scores, narration, 3D, launch films); use it directly for those.

**Fixed (the style)** — each hand's medium, mark, edge, paper and order of marks (`references/STYLES.md`); the drawing
film in that order, nothing faded in, last frame = still; one light per piece and cast shadows away from it; occlusion
(a hand never draws what it cannot see); the house style shared by a studio; deterministic rendering.

**Designed per topic** — the subject and its construction (parts, proportions, local colours), composition and format,
the light's side, what is near and far, cast shadows, what lives after the drawing (steam, a flame, a leaf) and the
hand's settings (paper, inks, palette) when the brief needs them. The two examples are construction references, not a
menu: a teapot is not a recoloured kettle.

## What's in this folder
| path | what |
|---|---|
| `lib/kit.js` | seeded randomness and noise, geometry (`blob`, `tube`, `body`, `leaf`, `softBox`, `hatchLines`, `scatter`, `runs` …), colour, seamless paper tiles, blur, tapered ribbons |
| `lib/scene.js` | the scene model: roles, light, depth, form; per-region tone; a value plate for whole-picture tone, colour and region lookup; occluders |
| `lib/draw.js` | the drawing recorder `D` (passes, layers, strokes, washes, fills, dots, rects) and the player that shows any moment of the drawing |
| `lib/doodle.js` | `renderer(canvas, piece, style)` → `renderAt(t)`, `drawAt(P, live)` |
| `lib/stage.js` | the page player: style picker, replay, `?style= ?still ?t= ?live ?bare`, house style |
| `lib/styles/` | the 32 hands, `index.js` groups them |
| `template/piece.js` | a blank piece (a pear on a table) for `new-piece.mjs` |
| `examples/persimmons/` | 감 세 알 — a still life, light from the left, square |
| `examples/kettle/` | 저녁 주전자 — made from its `BRIEF.md`: 4:5, light from a window on the right, steam that keeps rising |
| `scripts/styles.mjs` | `list`, `show <id>`, `pick <id>` (save the house style), `house`, `doc` |
| `scripts/new-piece.mjs` | start a piece in a studio (copies `lib/`, creates `house-style.json` once) |
| `scripts/sheet.mjs` | contact sheets: one subject in many hands (`--all`, `--group`, `--styles`), or one hand's drawing order (`--steps`) |
| `scripts/render.mjs` | still PNG, drawing-progress stills, the film MP4 |
| `scripts/check.mjs` | determinism, the drawing grows with no dead air, the still was drawn, life moves and loops, page clean |
| `references/` | **BRIEF** (topic → brief, choosing a hand, still review) · **STYLE-API** (scene, `D`, `K`, the style contract) · **STYLES** (all hands, generated) · **LESSONS** |

## Project layout (what you create)
```
my-studio/
  house-style.json   { "style": "woodblock", "tweaks": { "woodblock": { "paper": "#f3ead6" } } } — the hand every piece reuses
  lib/               copied by new-piece.mjs (the engine and the 32 hands)
  menu-persimmon/    one piece
    BRIEF.md         written first (references/BRIEF.md)
    piece.js         the subject: scene(K, t) → regions and lines
    index.html       the player (mount(piece, { house: '../house-style.json' }))
    out/             <style>.png, <style>.mp4, sheet.jpg
  menu-kettle/       the next piece — same hand, no extra step
```

## Requirements
Node 18+, Playwright with Chromium (`require('playwright')`), ffmpeg for MP4. No npm install in the studio.

## Workflow
Run scripts from anywhere; paths below are the skill folder `<skill>` and the piece folder.

1. **Topic → brief.** Write `BRIEF.md` first (`references/BRIEF.md`): the idea in one sentence, the focal subject, the
   light, the hand (house style or why this one), size and where it lives, the film (draw / hold / live), and every
   object with how it is built and its local colour. Ask only what the request leaves open.
2. **Start the piece.** `node <skill>/scripts/new-piece.mjs my-studio/<name> --format 4x5 --title "…"` (`--style <id>`
   on the first piece sets the studio's house style; on a later piece it overrides that piece only).
3. **Build the subject in no style** (`piece.js`, contract below). Real structure, never bare ellipses: profiles,
   spines with widths, tubes, leaves; one light; a `shadow` region under each object; `glow` for light sources; light
   lines for steam and glints. Study `examples/` for construction, do not copy them.
4. **Choose the hand on the subject** (skip if the studio has one): `node <skill>/scripts/sheet.mjs <piece> --all`
   (or `--group print`, `--styles woodblock,risograph,watercolour`), show the sheet, recommend two or three with one
   reason each (`references/BRIEF.md` → Choosing the hand), then save it:
   `node <skill>/scripts/styles.mjs pick <id> --studio my-studio [--set paper=#f3ead6]`.
5. **Render and review the still.** `node <skill>/scripts/render.mjs <piece> --still --at 0.3,0.7`; look at all three
   and score them against the still review in `references/BRIEF.md` (reads at thumbnail size, real structure, one light,
   the hand unmistakable, nothing lost in the medium, the film tells the making). Fix the scene (or the settings) until
   every line passes.
6. **Check.** `node <skill>/scripts/check.mjs <piece>` must pass (add `--all` to check every hand on it).
7. **Deliver.** `render.mjs <piece> --still out/x.png --scale 2` for print/retina; `render.mjs <piece> --film` for the
   drawing film (+ life); `sheet.mjs <piece> --steps 6` for a making-of strip; the page itself plays live.
8. **Reuse.** The next topic: `new-piece.mjs my-studio/<next>` and start again at 1 — it is drawn in the house style
   with no further choice. Changing the house style (`styles.mjs pick`) redraws every piece in the studio in the new hand.

## Rules
- **Design each topic new.** Build the subject from the brief; never re-skin an example or the template (a teapot is
  not a recoloured kettle). The examples and template show construction only.
- **One hand per studio.** Every piece in a studio uses the house style; a one-off override is written in that piece's
  `piece.js` and named in its brief. A palette change is a setting (`tweaks`), not a new hand.
- **A style is a way of making marks.** When writing or changing a hand, change the medium, mark, edge and order — never
  just the colours. Each hand handles every role, light from any side, dark and light lines, any size.
- **Nothing fades in.** Marks are made (grow, spread, wipe, land); the last drawing frame is the still.
- **Deterministic.** `K.rng(seed)` / `K.noise` only; no `Math.random`, no clock in a piece or a hand.
- **Life loops.** If `seconds.live > 0`, `scene(K, t)` must move something every second and match at `t = 0` and
  `t = live`.
- **Credit the source.** Hands keep their `source` line (the anidoodle recipe they were studied from); a new hand says
  where its look came from.

## Contract
A piece (`piece.js`) default-exports `{ title, size: [W, H], style?, light: [x, y], seconds: { draw, hold, live },
tweaks?, scene(K, t) }`; `scene` returns items in painter's order: `{ region: pts, color, role?, depth?, form?, grain?,
strength?, contour? }` and `{ line: pts, color, w? }`. Roles: `bg ground subject detail shadow glow highlight`.
A hand (`lib/styles/<id>.js`) default-exports `{ id, name, ko, medium, mark, edge, order, paper, palette, bestFor,
source, defaults, draw(D, S, K, opts) }`. The page exposes `window.doodle = { renderAt(t), drawAt(P, live), DURATION,
timing, W, H, styleId, setStyle(id), passAt(t), canvas }`; `renderAt(seconds.draw)` is the still. Full API:
`references/STYLE-API.md`.
