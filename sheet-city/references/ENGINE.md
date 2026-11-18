# ENGINE — lib/sheet.js, lib/city.js, lib/sound.js, lib/sheet.css

A page loads, in order: `lib/sheet.css`, then `lib/hic.js`, `lib/sheet.js`, `lib/sound.js`, `lib/city.js`, then its own script:

```html
<div class="sc-stage">
  <canvas id="city" layoutsubtree content="drawable" aria-label="…"><div id="sheet" drawable></div></canvas>
</div>
<script>
  var book = SheetBook.create(document.getElementById('sheet'), BOOK);
  SheetCity.start({ canvas: document.getElementById('city'), sheet: document.getElementById('sheet'), book: book, …config });
</script>
```
`<html class="sc-page">` gives the full-window stage. With HTML-in-Canvas off, `start` calls `HIC.fallback` and the same sheet is an
ordinary, working, scrollable spreadsheet (`html.sc-plain`).

## The book — `SheetBook.create(host, BOOK)` (lib/sheet.js)
| field | meaning |
|---|---|
| `title` | the sheet's name in the edit bar (contenteditable) |
| `rows` | `[{ cls, cells: ['Label', '12', '=SUM(B3:B6)', …], fmt: {dp, pre, suf, group}, unit, facade, h }]` — cell 0 is column A; `cls` is the `<tr>` class (its colour, its facade); `unit` overrides the value of one storey for that row |
| `city` | `'B2:M12'`: the cells that stand up as buildings. Must be a uniform grid (one column width, one row height) |
| `widths` | `{ A: 170, default: 90, rowHead: 36 }` column widths in px; `rowH` row height (56) |
| `fmt` | default number format `{ dp: 0, pre: '', suf: '', group: true }` |
| `slider` | `{ cell, min, max, step, label }`: a real range input in the edit bar that writes that cell |
| `select` | the cell selected at start (the formula field edits the selected cell) |
| `labels` | `{ undo, sound, fx }` wording of the bar |

API: `book.value(i)`, `raw(i)`, `text(i)`, `set(i, text, kind)`, `select(i)`, `edit(i, initial)`, `commit()`, `cancel()`, `undo()`,
`dependents(i)` / `precedents(i)` (the formula graph), `parse('B9')` → index, `addr(i)`, `box(el)` (px inside the sheet),
`lots()`, `inCity(i)`, `show(i, n)` / `unshow(i)` (display a figure without changing the value), `on(fn)` with
`fn({ kind: 'init'|'select'|'edit'|'cancel'|'type'|'slide'|'undo', source, changed: [i…], before: {i: value} })`.
Elements: `fx` (formula field, `data-hic-edit`), `slider` (`#knob`), `undoButton` (`data-hic-click`), `soundButton`, `editor`.
Keys: arrows / Tab move, Enter or F2 or a second click edits, typing starts an edit, Delete clears, Escape, Ctrl/⌘+Z.
Typing in the formula field shows the draft in the cell (class `draft`, fill `--draft`), which recolours its building.

## The city — `SheetCity.start(config)` (lib/city.js)
| key | default | meaning |
|---|---|---|
| `unit` | 1000 | value of one storey (rows may override) |
| `storey` | 15 | px per storey (the sheet's px are world units) |
| `tallest` / `deepest` | 520 / 70 | caps in px; masts stand on buildings above 70 % of `tallest` |
| `inset` | 6 | half street width |
| `slab` | 9 | card thickness |
| `texScale` | 2 | texture px per sheet px |
| `shadowSize` | 1536 | shadow map |
| `facade` | `{default:'punched'}` | row class → `punched` · `ribbon` · `bays` · `curtain` |
| `camera` | `{yaw:-0.27, pitch:0.6, fov:26, margin:0.9, phonePitch:0.95}` | home view; portrait screens look down more |
| `look.backdrop`, `desk`, `deskLine`, `deskKind` (`mat`/`wood`/`linen`), `deskGrid`, `grain`, `paper` | | the desk and the card edge |
| `look.sun` [x,y,z], `sunColor`, `sunPower`, `sky`, `bounce`, `ambient` | | the light (y of `sun` 0.3–0.5: low and raking) |
| `look.window` `{x0,y0,x1,y1, soft, bars:[nx,ny], bar}` | | the window pane in the light's own 0–1 frame (fitted around the sheet and props), its soft edge, mullion counts and width |
| `look.glass`, `lit`, `litShare` | | window glass tint, warm lit windows and their share |
| `look.accent`, `pulse`, `ring`, `loss` | | selection glow, the light in the streets, the ring, pit walls |
| `look.vignette`, `contrast`, `textShadow` | | finish; `textShadow` = how much printed faces take the shade (lower keeps numbers legible) |
| `props` | `null` | `function (P, W, H) → [objects]` (below) |
| `intro` | `{swoop:true, write:null}` | `write: { cell, text }` — the writer prop types the first edit |
| `sound` | `{}` | `CitySound` options |
| `hint` | | the pill shown above the stage |

Address flags: `#still=<s>` (frozen, no intro), `#calm` (no intro, no overshoot, no count-up), `#nointro`, `#q=0.6` (fixed
resolution), `#fallback` (the plain page).

### Props — parts
`P.lathe(profile, colours, {axis:'y'|'x', sides, smooth, gloss, capStart, capEnd})` — a surface turned around an axis;
`profile` = `[[pos, radius], …]`, colour per segment. `P.ball(c, r, colour, gloss, scale)`, `P.box(lo, hi, colour, gloss)`,
`P.torus(c, R, r, colour, gloss, axis)`. `P.object({ at: [x, z], yaw, lift, parts, writer, tip })` places them: `at` in sheet
px from the sheet's centre (the sheet spans ±W/2, ±H/2), the desk is y = 0 of the object. Upright objects turn by `yaw`;
objects built along x (`axis: 'x'`) lie on the desk pointing along yaw and are raised by `lift` (their radius).
A **writer** has `writer: true` and `tip: [length, 0, 0]`: it lifts with a small pull-back, swings its tip onto the cell's
roof, wiggles while the digits appear, and goes back. `P.pencil({...})` is a ready writer (an example; design your own).
Colours are sRGB hex; gloss 0 (paper, wood) to 1 (lacquer, glaze, metal).

### Adding something in a project (never edit lib/)
- **A new facade feel**: give the row its own class and fill colour, and a `facade`; for a material the four styles cannot
  give, copy `lib/city.js` into the project as `city-<topic>.js`, add a style index to `STYLE` and a branch in the facade block
  of `FS_BOX` (`r` = window rectangle inside a bay, `bw` = bay width).
- **A new prop**: compose parts in the page's `props` function. Check its scale against the sheet (cells are ~90 px).
- **A different chart rule** (e.g. log heights): `book.unitOf` comes from `row.unit`; for a curve, wrap the value in the
  formula itself (`=SQRT(…)` is not built in — compute in a helper row).
- **More formulas**: `SheetBook.evaluate(src, get)` is the evaluator; add a function in `call()` in a project copy.

### What the engine exposes — `window.__city`
`heightOf(addr)`, `goalOf(addr)`, `lots()`, `state()` (`moving`, `pulses`, `rings`, `spawned`, `tween`, `demo`, `quality`,
`renders`, `sim`, `cam`), `screenOf(el, fx, fy)` (also `__hic.screenOf`), `roofPoint(addr)`, `pick(x, y)`,
`advance(s, quiet)` (steps simulated time), `settle()`, `camera(o)`, `home()`, `stopDemo()`, `book`, `config`.

## Sound — `CitySound(o)` (lib/sound.js)
`{ scale: [0,2,4,7,9], base: 220, octaves: 2.6, timbre: 'marimba'|'glass'|'pluck', level: 0.5, room: 0.35 }`. Off until the ♪
button (a real button in the edit bar) is pressed. Key ticks, a tap on selection, a struck note per arriving building
(taller = higher; growing scoops up, shrinking settles down), a thinned run on the slider.
