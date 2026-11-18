# ENGINE — lib/paper-desk.js

One file (≈1200 lines, commented) on top of `lib/hic.js`. A page loads both with plain `<script>` tags (no modules, so it
works from `file://` and as a Claude artifact).

## Markup the engine expects
```html
<div id="stage" style="position:fixed;inset:0;overflow:hidden">
  <canvas id="desk" layoutsubtree content="drawable" style="position:absolute;inset:0;width:100%;height:100%">
    <article id="sheet" drawable style="position:absolute;left:0;top:0;width:560px;height:792px;background:#fff"> … the document … </article>
  </canvas>
  <div class="ui"> … top bar, [data-pd-hint], a dock of [data-pd-tool] buttons … </div>
</div>
<script src="lib/hic.js"></script><script src="lib/paper-desk.js"></script>
```
The engine adds one transparent overlay after the canvas to catch tool gestures (hidden in Type mode).

## `PaperDesk.create(config)` → desk
| field | default | meaning |
|---|---|---|
| `canvas`, `sheet` | — | the drawable canvas and the sheet element (its CSS size is the page size) |
| `sheetWidth` | 2.1 | world width (1 unit = 10 cm) |
| `stock` | `'wove'` | a name in `PaperDesk.STOCKS` or an object `{ tint, back, laid, fibre, sheen, tooth, gsm, char }` (linear RGB) |
| `gsm` | stock's | override the weight (40–300): curl radius, spring stiffness and damping, crumple speed, fold spring |
| `desk` | `'felt'` | a name in `PaperDesk.DESKS` or `{ kind: 'felt'|'wood'|'leather'|'laminate', a, b, scale, gloss, plank }` |
| `lamp` | warm, upper left | `{ on, pos, aim, color, power, cone }` |
| `room` | dim blue-brown | ambient `{ sky, ground, off }` (`off` = share of ambient left with the lamp off) |
| `props` | `[]` | `[{ kind, at: [x, y] (half-sheets from the centre), rot, scale, z, …kind options }]`; `kind` may be a function |
| `acts` | curl, fold, crumple, burn | `{ curl, fold: { max }, crumple, burn: { max, size, speed }, stain: { color, size } }`; `false` turns one off |
| `camera` | fov 26°, tilt 15° | `{ fov, tilt, margin: { top, bottom, side }, phone: {…} }` — margins keep the sheet clear of the page's UI |
| `look` | | `{ exposure, bloom, vignette, grain }` |
| `hints` | | text per tool for `[data-pd-hint]` |
| `sound` | true | synthesised; the AudioContext starts on the first gesture |
| `idle` | true | the untouched sheet's corner breathes (never under `#calm` or `#still`) |
| `quality` | grid 120, shadow 1024, msaa 4 | `#q=low` in the address drops to no MSAA, grid 90, shadow 512 (checks) |
| `seed` | 7 | noise, facets, burn sizes, particles |
| `onAct(name, info)` | | `curl fold crumple burn stain lamp flatten fresh stock` and `fold-limit burn-limit` |

## The desk's API
`tool(name)` · `flatten()` · `fresh()` · `lamp(on)` · `stock(nameOrObj)` · `gsm(g)` · `ignite(u, v)` · `stain(u, v)` ·
`crumple(on, [u, v])` · `sound(on)` · `stage(names, opts)` · `wire(root)` · `screenOf(el)` · `surface(u, v)` → world point ·
`toScreen(p)` · `pick(x, y)` · `isFlat()` · `redraw()` · `state` (tool, clock, folds, cr, wrinkle, burns, stains, lamp …) · `burns` ·
`particles` · `uploads` · `renders` · `settled` · `audio` · `size`. When HTML-in-Canvas is missing, `create` calls `HIC.fallback` and
returns a stub with `fallback: true` (the page becomes an ordinary document; `html.pd-fallback` hides the dock).

`wire()` connects plain controls: `[data-pd-tool=type|curl|fold|crumple|burn|stain]` (buttons for acts that are off are
hidden), `[data-pd=flatten|fresh|sound]`, `input[data-pd=lamp]`, `select[data-pd=stock]`, `input[data-pd=gsm]` (+
`[data-pd=gsm-out]`), `input[type=radio][data-pd=ink]` (sets `--ink` on the sheet).

## The address
`#still=<s>` freezes time · `#calm` drops idle motion · `#fallback` forces the plain page · `#act=burn,wrinkled` stages
states at load (`curl fold crumple half wrinkled burn stain night select stock:<name> tool:<name>`) · `#q=low`.

## Adding things in a project (never edit lib/)
- **A stock:** `PaperDesk.STOCKS.vellum = { tint: [.9,.9,.86], back: [.85,.85,.8], laid: 0, fibre: .1, sheen: .3, tooth: .1, gsm: 110 };`
- **A desk:** `desk: { kind: 'wood', a: [.03,.02,.015], b: [.09,.06,.04], gloss: .5, plank: 1.8 }`.
- **A prop:** `PaperDesk.PROPS.stapler = function (B, o) { B.box(1.2, .34, .07, PaperDesk.color('#2c2f33'), PaperDesk.MAT.satin); … };`
  Local space: 1 unit = 10 cm, z up, base on z = 0. `B.box(w, d, h, col, mat)`, `B.lathe([[r, z] …], seg, col, mat)`,
  `B.rod(x0, x1, r, seg, col, mat)` (along x), `B.surface(fn(u, v) → [p, n], nu, nv, col, mat)`, `B.push(matrix)` /
  `B.pop()` (use `HIC.mat4`), `B.flames.push([x, y, z])` (a flame sprite), `B.lights.push([x, y, z])` (a flickering light).
  Materials `PaperDesk.MAT.matte | satin | gloss | metal | brass | glass` or `[roughness, metal, emissive]`.
- **A behaviour of the document:** ordinary DOM code in the page. Every DOM change re-uploads the texture by itself.

## How it works (one frame)
1. `update`: springs (peel: `HIC.spring`, frequency and damping from the weight), fold angles, crumple amount, wrinkles,
   the fresh-sheet slide, burn and stain growth, particles, sound levels.
2. `deform` (only when something moved): every grid vertex = rest bow + wrinkles (facet heights) + burnt-edge lift, then
   each fold's cylinder wrap, the live peel's wrap, the ball wrap; normals from neighbours.
3. `place` (on pointer move or deform): pick the nearest triangle under the pointer on the projected grid; flat → the
   plane's homography as `matrix3d`; bent → that triangle's affine; a hole, the back side or the desk → hidden.
4. `render` (only when something on screen changed; spaced out when frames are slow): lamp shadow map → top-down contact
   coverage → desk, props, paper (DOM × stock, creases, wrinkles, stain, burn bands, lamp + fire + room light,
   translucency) → embers, smoke, flames → bloom → ACES tone map, vignette, dither.
