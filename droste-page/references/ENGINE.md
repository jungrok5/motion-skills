# ENGINE — lib/droste.js

`Droste.create(config)` turns one drawable page into a Droste page. Load `lib/hic.js`, then (optionally)
`lib/droste-sound.js`, then `lib/droste.js`, as plain scripts (file:// and artifacts work).

## The map
Screen point X (canvas CSS px). F = the window's fixed point, S = page width / window width.

```
q  = X − F                        z  = (ln|q|, θ + wind·spin)        θ ∈ [cut, cut + 2π)
z' = α·z − frac(fall)·ln S        α  = 1 − i·wind·ln S / 2π          (complex product)
w  = exp(z')                      while w is off the page: w /= S, level −= 1
                                  while w is in the window: w *= S, level += 1
page point = F + w                copy number = level + floor(fall) + offset
```
F comes from the window box: `F = window.topLeft / (1 − 1/S)` (the window is the page scaled by 1/S about F).
The inverse (for `screenOf`): w = (e − F)/S^k → z' = ln w + 2πim → z = (z' + frac(fall)·ln S)/α → X = F + exp(z),
tried for every branch m and level k, kept only when the forward map lands back on e. `mapPoint` (JS) and the shader
are twins: change one, change the other; the check's map/depth tests catch a mismatch.

## Config
| key | what | default |
|---|---|---|
| `canvas`, `page`, `window` | selectors or elements | `#stage`, `#page`, `[data-droste-window]` |
| `frame` | `{ style: 'gilt' \| 'gold' \| 'oak' \| 'black' \| 'print' \| 'none', width: U, segments }` | gilt, 3 |
| `windowRadius` | rounded window corners in U (screens) | 0 |
| `surfaces` | `{ base: {...}, <name>: {...} }` for the page and each `[data-surface="<name>"]` (≤ 11 regions, later wins) | flat |
| `light` | `{ moods, key: [x, y, z], lamp: selector, lampColor, panes: {x, y, w, h, cols, rows, skew, strength}, shadow }` | `MOODS.day` |
| `counter` | `{ el, start: 1, offset, cell: .64, ink, label }` | none |
| `wind` | `{ input, rest: 1, max: 2, spin: .7 }` | |
| `fall` | `{ rest: −.25, opening: 3.6 s, drift: 0 levels/s, wheel: .0012 }` | |
| `glow`, `ripple` | colours | `#fff3d6`, `#ffd36b` |
| `seam` | `{ style: 'crease' \| 'bead', color, width (css px), angle (× π, the cut's direction) }` | crease, .75 |
| `sound`, `soundToggle` | preset name / object; a real `<button>` (`data-on`, `data-off`) | none |
| `hint`, `keepHint` | an element hidden on the first fall | |
| `sharp`, `budget` | the quiet upload's scale cap (× screen) and pixel budget | 2.2, 9e6 |
| `quality` | backing-store scale (also `#q=`) | 1 |
| `probe` | the element `S.probe` uses | `[data-hic-edit]` |
| `onReady(D)` | called once the page is uploaded and placed | |

### Surfaces (all multiply the DOM's own colour; colours stay in CSS)
| type | parameters |
|---|---|
| `tiles` | `size` (U, or `'fit'` = one slab), `grout` (fraction), `groutColor`, `bevel`, `wobble`, `tilt`, `craze`, `chips`, `tint`, `gloss`, `warm` |
| `plaster` | `scale` (U), `rough`, `mottle`, `gloss` |
| `wood` | `plank` (U), `dir` (`'v'`/`'h'`), `grain`, `gloss`, `gap`, `tone` |
| `card` | `fiber`, `halftone` (dot pitch in U, 0 = none), `varnish` |
| `glass` | `sheen` |
| `metal` | `brush`, `gloss`, `dir` |
| `flat` | `gloss` |

A zellige wall: `{ type: 'tiles', size: 4.5, grout: .03, bevel: .12, wobble: .35, tilt: .2, tint: .14, gloss: 1.4, craze: 0, chips: .1 }`
over a CSS grid of coloured tiles. A bookshelf: base `wood` with `dir: 'h'`, shelves as regions.

### Frames
A frame is a list of members from the outer edge (x = 0) to the sight edge (x = 1):
`[x0, slope, material, kind, colour, spec]` — slope > 0 faces outward; material 0 lacquered wood, 1 gilt, 2 matte
(mat, print), 3 gloss black; kind 0 flat, 1 cove, 2 ripple. Up to 10 members. Write your own in the config:
`frame: { width: 2.4, segments: [[0, 1.2, 0, 0, '#5b3a22', .6], [.5, -1, 1, 1, '#c9a24c', 1.3], [.9, 0, 0, 0, '#1a120c', .2]] }`.
`style: 'none'` draws no frame: the DOM draws its own (a phone bezel, a printed border) round `#window`.

### Moods
`{ amb: [r, g, b], sun: [r, g, b], lamp: 0..1, side: 0 | 1 }` — up to 8, cycled one per copy and blended round the
spiral. `amb` lights the whole wall, `sun` the panes (if any), `lamp` the picture lamp's pool and specular, `side` which
side the panes come from. Presets: `Droste.MOODS.day`, `.kitchen`, `.even` (no change per copy).

## API
- `D.tap(el | [x, y], note)` — ripple from that page point across every copy and a tap sound pitched by the level last
  pointed at. Call it from the page's own click handlers.
- `D.typeInto(el, text, done)` — the intro: types text into an element, unless `#still`, `#calm`, `#nointro`; stops at
  the first input. `D.intro` says whether intros should run.
- `D.pose({fall, wind})` → Promise; `D.goal({fall, wind})` eases there; `D.state()`; `D.map(x, y)`;
  `D.screenOf(el)` → `[x, y, level, scale]`; `D.screenAt(el, level)`; `D.level()`; `D.U`, `D.G` (layout).

## Adding to a project (never edit `lib/`)
- A new material: choose the nearest type and tune its parameters; if none fits, give the region `flat` and draw the
  material in CSS (gradients, borders) — the shader still lights it per copy.
- A new frame: `segments`. A new day: `moods`. A new sound: an object for `sound` (`base`, `scale`, `modes`, `decay`,
  `click`, `rattle`, `room`, `air`).
- Things that change on click: plain DOM changes (attributes, classes, text). They show in every copy on the next paint.
