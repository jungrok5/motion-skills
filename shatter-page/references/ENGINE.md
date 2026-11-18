# ENGINE — lib/shatter.js

`Shatter.mount(config)` wires a page to the engine and returns `{ sim, stage, api, material }` (or `{ fallback }`).
Load order: `lib/hic.js`, `lib/shatter-sound.js`, `lib/shatter.js`. Units: metres, seconds; floor `y = 0`, wall
`z = room.wallZ`, the pane hangs at `pane.at` facing +z (the camera).

## config
| field | meaning |
|---|---|
| `canvas`, `page` | `<canvas layoutsubtree content="drawable">` and its drawable child (the page; its CSS size is the pane's size) |
| `material` | `{ base: 'glass' \| 'frosted' \| 'ice' \| 'porcelain' \| 'sugar' \| {…}, …overrides }` (below) |
| `room` | `wall`, `floor`, `floorStyle` (`boards`, `tiles`, `plain`), `boardWidth` (board or tile size, m), `skirting`, `skirtingHeight`, `wallZ`, `gloss` (floor reflection 0–.4), `sun`, `sunPower`, `sunDir` [x,y,z] towards the sun, `ambient`, `window` `{cols, rows, width, height, mullion, soft, at:[u,v]}`, `vignette` |
| `pane` | `shape` (`rect`, `rounded` + `corner` m, `disc`, or a polygon in page px), `width` (m, real size), `at` [x, y, z] centre |
| `impact` | `kind` (`throw`, `tap`, `drop`), `strength` 0–1, `slowmo` (slowest time scale; 1 = off), `prop` `{color, radius, metal}`, `tip` (rad/s for `drop`; negative tips back) |
| `mend` | `style` (`none`, `line`, `gold`), `color`, `light`, `duration` (s of rewind) |
| `text` | `pieces(n)`, `state` `{whole, broken, held, rewinding, mended}`, `clock(t)` |
| `camera` | `fov` (deg), `margin` (framing), `follow` (0 keeps the camera on the pane, 1 follows the glass down) |
| `seed`, `maxShards`, `quality` | random seed of the page, cap on pieces (default 420), render scale (also `#q=`) |

## material
| field | meaning |
|---|---|
| `opaque` | false: clear (refraction, tinted body, print on both faces); true: glazed (page colour is the glaze) |
| `thickness` | m; shows in the edges and the weight |
| `tint`, `body`, `frost`, `refract` | clear body colour, its opacity (0–1), blur of what is behind, refraction strength |
| `edge`, `edgeAlpha`, `rim` | colour of the broken edge, its opacity, width (m) of the bright bevel on the faces |
| `glaze`, `back`, `printBack` | opaque face colour, back face colour, how much print shows on the back (0–1) |
| `shine` | strength of reflections |
| `crack` | `rays`, `rayJitter`, `rings`, `ringGrow`, `crush` (crushed-zone radius as a fraction of size), `ringJitter`, `ringSkip`, `cleave` (max piece area as a fraction of the pane), `crumble`, `minArea` (m²: smaller cells become dust) |
| `physics` | `density` (kg/m³), `bounce`, `friction`, `spin`, `throw`, `air` (plate drag), `breakSpeed` (m/s: a piece landing faster breaks again; 0 off) |
| `sound` | `pitch`, `ring`, `crunch`, `body` (see `lib/shatter-sound.js`) |
| `dust`, `dustColor` | specks per blow and their colour |

**Adding a material in a project**: pass a full object as `material` (or `{ base: {...your preset...} }`), or register it
before mounting: `Shatter.MATERIALS.slate = { base: 'porcelain', glaze: '#3a3f44', … }` then `material: { base: 'slate' }`.
Tune by stills: `crack` first (render `crack` and `rest`), then `physics` (render `fall` at .15 and .5), then `sound`.

## Pieces of the engine (for changing behaviour in a project)
- `Shatter.fracture(P, q, s, crack, rng, ref)` → `{cells, lost, rays, r0}`: pure 2D, convex cells that tile `P`.
- `new Shatter.Sim(o)`: `addShard`, `addBall`, `strike(id, at, dir, s, 'blow'|'land')`, `release(id, tip)`, `step()`,
  `poseAt(t)`, `truncate(t)`, `pickAll(origin, dir)`, `onBreak(res, s)` (landing breaks).
- Rendering passes per frame: sun transmittance map of the pieces (multiplicative, print casts its own colour) → room
  ray-cast into a target (wall, floor, window light, that shadow, the ball's shadow) → pieces mirrored in the floor →
  room to screen → ball → pieces back to front (refracting the room target) → dust points.
- Test hook `window.__hic.shatter`: `strikePage(u, v, s)`, `strikeScreen(x, y)`, `advance(sec)`, `hold(t)`, `resume()`,
  `mend(instant)`, `bare()`, `state()`, `soundTest()`.
