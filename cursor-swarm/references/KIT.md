# KIT — the API

```js
import { Build, defineArt, pixelText, rrect, alpha, mix, rng } from 'cs/build.js';   // the import map points cs/ at lib/
```

## new Build(o)
| option | default | |
|---|---|---|
| `title` | | the site's name (tab title, seeds) |
| `url` | `my-site.dev` | shown in the HUD; green at the end |
| `prompt` | `build a website for …` | typed into the HUD pill at the start (≤ ~60 characters) |
| `page` | `{ w: 860, bg: '#121217' }` | `h` (auto = lowest block + 56), `name` (`index.html`) |
| `agents` | 24 | how many cursors |
| `names` | `agent-01…` | name tags (cycled) |
| `W`, `H`, `fps` | 1080, 1350, 30 | frame size |
| `finale` | `'zoom'` | `'top'` (scroll back up) or `'none'` |
| `hold`, `zoomDur`, `end` | 0.9, 2.6, 2.4 | seconds |
| `zoom` | auto (≤ 1.3) | page → screen scale while building |
| `tags` | true | name tags while typing / dropping |
| `labels` | English | `{ agents, layers, building, publishing, live, generating }` for the HUD |

## Ops — `B.kind(id, { …props, …timing })`
Timing on any op: `at` (seconds), `after: id` (+ `delay`), `with: id` (+ `delay`), `dur`, `next`.
Coordinates are page px (0…page.w); `y` grows downward.

- **`rect`** `x y w h` · `fill` (colour or `{ stops: [...], angle }`) · `r` · `line` (border colour) · `lw` · `shadow`
  (true or a colour) · `alpha`
- **`text`** `x y` · `text` (`\n` breaks) · `w` (wrap width; the box for `align: 'center' | 'right'`) · `font`
  (`sans` `serif` `mono` `hand` `kr` `pixel`) · `size` · `weight` · `italic` · `color` · `lh` (× size) · `track`
  (letter spacing × size) · `cps` · `h` (check: must fit)
- **`image`** `x y w h` · `art` (name) · `args` · `r` · `reveal` (`mosaic` | `scan` | `fade`) · `file` (card label) ·
  `from` (`left` | `right`)
- **`paint`** `x y w h` · `art` · `args` · `px` (cell size, 10) · `inset` · `by` (max agents)
- **`cells`** `x y cols rows cell gap r` · `color(i, j, R)` → colour | null, or `values` (2D or flat, 0…1) + `ramp` ·
  `empty` (slot colour) · `by`
- **`chips`** `x y w` · `items` (`'text'` or `{ text, dot, bg, fg, line }`) · `font size weight h pad gap r` · `bg fg line
  dot` · `stagger`
- **`line`** `x1 y1 x2 y2` · `color` · `width` · `dash`
- **`button`** `x y w h` · `label` · `fill` · `color` · `r` · `font size weight` · `line` (a `rect` `id-box` + a `text` `id`)

Structure: `B.section(name, { scroll })` · `B.wait(s)` · `B.sync(extra)` · `B.check(name, t => ok)` · `B.get(id)` ·
`B.start()` (async; sets the contract).

## Pictures — `defineArt(name, (g, w, h, a, R) => { … })`
Draw into a `w × h` box in page px with the Canvas 2D context `g`; `a` = the op's `args`, `R()` = a seeded random in [0, 1)
(seeded by the op id: same picture every frame). It is rendered once per scale and cached. For `paint`, it is sampled at
the centre of each `px` cell (alpha < 40 = no cell), so draw on a `px` grid for crisp pixel art.

Built-ins (`args`):
| art | args |
|---|---|
| `pixel` | `rows` (strings), `palette` ({ char: colour }), `bg` |
| `gradient` | `stops`, `angle` |
| `blobs` | `bg`, `colors`, `n` — a soft out-of-focus "photo" |
| `site` | `bg`, `fg`, `accent` — a tiny web-page screenshot |
| `monogram` | `text`, `bg`, `fg`, `font`, `k` |
| `pattern` | `kind` (`dots` `stripes` `checker` `grid`), `a`, `b`, `size` |
| `map` | `land`, `water`, `road`, `park`, `pin`, `px`, `py`, `river` |
| `bars` | `values`, `color` (or a list), `bg`, `gap` |
| `pixel-text` | `text`, `fg`, `bg`, `cell` |

Helpers from `core.js`: `pixelText(g, s, x, y, cell, colour)`, `pixelWidth(s, cell)`, `rrect(g, x, y, w, h, r)`,
`mix(a, b, k)`, `alpha(c, a)`, `rng(seed)`, `n1(x, seed)`, `setFont(g, style)`, `wrap(...)`.

## The pixel font
5 × 7 cells, advance 6 (3 for `. , : ' ! ( ) ·`). Capitals (lower case is drawn as capitals), digits and
`. , ! ? : - + ' / & # * % ( ) ♥ · × $ " = < >`. No Hangul — use `serif` / `kr` for Korean lines.
