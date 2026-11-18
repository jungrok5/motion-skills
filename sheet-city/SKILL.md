---
name: sheet-city
description: Make a live web page in which a small, real spreadsheet (a DOM table with formulas, selection, in-cell editing, undo and a slider) is drawn by WebGL through HTML-in-Canvas as a model city on a desk — every cell is a building whose height is its value and whose roof carries its printed number, losses dig red pits, soft window light rakes long shadows, the streets darken between tall towers, and props of the topic stand on the desk. Click a rooftop, type a number, press Enter: the building springs to its new height, light runs along the streets to every cell whose formula reads it, those cells count to their new figures and a ring spreads across the sheet. Give it a topic (a household budget, a café's weekly sales, a school library's loans, a marathon training plan, a club's season) and it designs the sheet's rows, formulas and slider, the palette, facades, desk, light, props and sound. One self-contained folder, no network, works from file:// and as a Claude artifact; Chrome/Edge 157+ or the Claude desktop app, a plain working spreadsheet elsewhere. Use for "spreadsheet city", "3D spreadsheet", "data as buildings", "interactive model city of numbers", "HTML-in-Canvas page", "what-if sheet that moves", or ("스프레드시트 도시", "엑셀이 도시가 되는 페이지", "숫자가 건물이 되는 표", "3D 표 웹페이지", "HTML-in-Canvas 페이지", "이 스타일로 ○○ 시트 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Sheet City" demo https://claude.ai/artifact/VZ6Un8f7RzJArq7wqMrE72 on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# sheet-city

A spreadsheet that is also a model city. The page is an ordinary DOM table (column letters, row numbers, cells, an edit
bar with a formula field, a slider, undo and sound) laid out inside a `<canvas>`; WebGL draws it through HTML-in-Canvas as a
card sheet lying on a desk, where each cell of the city range stands up as a building: one storey per unit of value, the
cell's live number printed on its roof, its fill colour on the walls with a row of windows per storey. A loss is a pit with
its number on glass. A low sun comes through a window, shadows rake toward you, streets darken between tall towers, glass
reflects the sky, and two or three props of the topic stand on the desk. It stays a working spreadsheet: click a roof to
select the cell (the browser hit-tests the real cell on the plane of that roof), type, Enter; formulas recalculate, the
light runs along the dependency graph through the streets, and every dependant counts up as its building moves. Give it a
topic and it designs a new sheet, palette, desk, light, props and sound in this style.

Made in this repo from Felix Rieseberg's "Sheet City" demo — https://claude.ai/artifact/VZ6Un8f7RzJArq7wqMrE72 — one of
fifteen on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in "All hail the weird web"
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. `references/LOOK.md` records what was
observed. All code here is this repo's own; no code, shader, data, text or sound of the demo was copied. The template is a
household budget; the worked example, `examples/marathon-block`, a 12-week marathon training plan in evening light on a
wooden table. Never re-make the demo's gelato-stand accounts: design the sheet for the topic.

**Code-only.** No generated or downloaded images, video, audio or fonts: system font stacks, synthesised sound, props
built from code.

**Fixed (the style)**: a real spreadsheet (DOM table + edit bar) as the only content; drawn as a card slab on a desk from a
long-lens three-quarter view; city cells as buildings (height = value ÷ unit storeys, the live cell as the roof, the fill
colour as the walls, one window row per storey, plinth, parapet, rooftop plant on tall ones, masts on the tallest); losses
as pits with glass lids; streets between buildings; window light with soft shadows and mullions, height-grid occlusion,
sky-reflecting glass, lit windows; the change grammar (spring with weight and overshoot → light along the streets along the
formula graph → dependants hold, then count → ring); the slider as a real input on the sheet; orbit / zoom; the opening
(flat → swoop as the city rises → the writer prop makes the first edit); the HTML-in-Canvas rules.

**Designed per topic**: the question the sheet answers; the book (columns, rows and their order, formulas, running sums,
which rows can go negative, the slider, units, the data's shape); the palette (row fills, accent, loss); facades per row;
the desk (mat, wood, linen), backdrop, light (time of day, sun, window, lit windows) and camera; the props and the writer;
the first edit; the sound (scale, base, timbre); the wording (sheet name, labels, hint). The template and the example are
examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/sheet.js` | `SheetBook.create(host, BOOK)`: the spreadsheet — DOM table, edit bar, formulas (+ − × ÷ ^, comparisons, SUM AVERAGE MIN MAX COUNT ROUND ABS IF), dependency graph, selection, in-cell editing, keyboard, undo, slider, live draft |
| `lib/sheet.css` | the sheet's structure, edit bar, selection on the roof, the page around the canvas, the plain-page fallback |
| `lib/city.js` | `SheetCity.start(config)`: the WebGL2 engine — slab, desk, instanced buildings, rooftop parts, pits, window light + shadow map, occlusion from the height grid, glass, pulses and rings, props from parts (`lathe`, `ball`, `box`, `torus`, `pencil`), the writer, camera, picking and hit-test placement, the opening, adaptive resolution, `__city` |
| `lib/sound.js` | `CitySound(o)`: synthesised ticks, taps, struck notes per building, slider runs (marimba / glass / pluck) |
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `templates/index.html` · `templates/BRIEF.md` | the house example (a household budget, commented, every DESIGN part marked) and the brief to fill |
| `examples/marathon-block/` | the worked example: `BRIEF.md` + `index.html` |
| `scripts/new-page.mjs` | start a project folder (lib/ + template or `--from marathon-block`, paths rewritten to `lib/`) |
| `scripts/check.mjs` | the shared checks + this style's (city, roof click, edit → growth / overshoot / settle / pulses / ring, undo, slider drag, orbit + click, still determinism, the opening, calm) |
| `scripts/still.mjs` | stills: `idle`, `edit` (`--at` s after Enter), `orbit`, `flat`, `close`, `slider`, `draft` |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (observed from the source) · **ENGINE** (API, config, adding things) · **HIC** (the HTML-in-Canvas notes, copy) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-sheet/
  BRIEF.md      the topic as a sheet city (references/BRIEF.md) — written first
  index.html    palette CSS + BOOK + SheetCity.start({...}) — one page
  lib/          copy of the skill's lib/ (new-page.mjs)
  out/          stills (not shipped)
```
Run scripts from the project's parent or anywhere, with paths: `node <skill>/scripts/check.mjs my-sheet/index.html`.

Requirements: Node + Playwright Chromium (for checks and stills). The page itself needs nothing: open `index.html` in Chrome
or Edge 157+ or the Claude desktop app (any other browser shows the working plain spreadsheet).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project and fill it from the topic (references/BRIEF.md): the
   question, the book (columns, rows back to front with totals behind their items, formulas, running sum, losses, slider,
   units, data shape), the look (palette, facades, desk, light, camera), the props and the writer, the first edit, sound,
   wording. Write it before code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-sheet` (or `--from marathon-block` when the topic is close to a plan).
3. **Book.** Write `BOOK` in `index.html`: rows as data, formulas as strings (build them with small functions per column).
   Open the page with `#fallback` in any browser to see and use it as a plain spreadsheet: every formula right, no `#ERR`.
4. **Palette and look.** Row fills in the page's CSS, `facade`, `look` (desk, light, window, glass), `camera`. Choose
   `unit` / `storey` / `tallest` so items are 2–6 storeys and totals 20–32 (the check prints the tallest).
5. **Props.** Compose 2–4 objects from parts in `props(P, W, H)`; give one `writer: true` and set `intro.write`.
6. **Sound.** `sound: { scale, base, timbre }`.
7. **Check**: `node <skill>/scripts/check.mjs my-sheet/index.html` must print only `ok` (it takes a few minutes in
   software GL). It proves the live page (click, type, upload, click, frames, phone, fallback) and the style (buildings,
   roof click selects that cell, edit grows ≥ 3 storeys with overshoot and settles < 3 s, pulses and a ring, undo, a real
   slider drag moves buildings, orbit then click, `#still` deterministic, the opening runs, `#calm` rests).
8. **Stills and review**: `node <skill>/scripts/still.mjs my-sheet/index.html --out my-sheet/out --act idle,edit,orbit,close --at 0.35`.
   Look at every still and score it against the still review in references/BRIEF.md (the question reads, numbers legible,
   tall behind short, heights, light on the sheet, the change visible, props at scale and on the desk, one style). Fix the
   brief or parameters and repeat until all pass.
9. **Hand over** the folder (`index.html` + `lib/`). It runs from file:// and as a Claude artifact (inline the four lib
   files into the page if the artifact must be a single file).

## Rules
- **Design for the topic.** The sheet, palette, facades, desk, light, props, writer, first edit and sound are designed for
  this topic. Do not reuse the budget or the marathon plan unless the topic is exactly theirs; never re-make the demo's
  gelato accounts.
- **One style.** Every sheet city is the same card-and-glass model on a desk under window light, with the same change
  grammar. New rows, facades and props keep the materials; nothing pasted on in another style.
- **The page stays real.** All text is DOM text in the table and the bar; the slider, buttons and fields are real controls;
  nothing is a picture of text or re-typeset in a shader. Undo, keyboard, find-in-page and selection work.
- **What you see is what you click.** The sheet is placed for hit testing on the plane under the pointer (roof height on a
  building, sheet level elsewhere, the cell itself on a wall) — never leave it at its layout position. `check.mjs` clicks
  real rooftops, the formula field, Undo and the slider through the drawing.
- **Upload only on paint.** The texture follows `onPaint`; the scene renders on demand (moves, uploads, the sim), not every
  frame. No idle animation that redraws forever.
- **Tall behind short.** Totals and running sums go behind the rows they add up; a running sum that would hide stays a
  printed row in front of the city. The edit bar is never covered by buildings or props.
- **Heights mean something.** One unit per storey for the whole sheet; a row in another unit says so in its `unit` and the
  brief. Never stretch a row to look good.
- **Weight and settle.** Buildings move on a spring: taller ones heavier and slower, a small overshoot, at rest within 3 s;
  dependants wait for their light and count. `#calm` removes overshoot, count-ups, the opening and camera moves.
- **A uniform city grid.** City columns share one width and city rows one height (occlusion and streets assume it; the
  check fails otherwise).
- **HTML-in-Canvas rules** (references/HIC.md): one fallback with the same HTML (`HIC.fallback`), `#still` and `#calm`,
  deterministic look (`HIC.rng`), sound synthesised and off until the ♪ button, no network, phone width without sideways
  scroll, upload size × devicePixelRatio with mipmaps.

## Contract (what a page exposes)
- `window.__hic.ready` after the first upload and the hit-test probe; `__hic.info` = `{ mode, lots, uniformGrid, firstFrameMs, aa, quality }`.
- `window.__hic.screenOf(el, fx, fy)` → canvas px where an element of the sheet is drawn (on its roof for a building).
- `window.__city`: `book`, `config`, `lots()`, `heightOf(addr)`, `goalOf(addr)`, `state()`, `roofPoint(addr)`, `pick(x, y)`,
  `advance(s, quiet)`, `settle()`, `camera(o)`, `home()`, `stopDemo()`.
- The config object passed to `SheetCity.start` (references/ENGINE.md) and the `BOOK` passed to `SheetBook.create`.
- Address flags: `#still=<s>` frozen at rest (no intro, no hint), `#calm` reduced motion, `#nointro`, `#q=<0.3–1>` fixed
  resolution, `#fallback` the plain page. Marked elements: `#fx` `[data-hic-edit]`, `#undo` `[data-hic-click]`, `#knob`.
