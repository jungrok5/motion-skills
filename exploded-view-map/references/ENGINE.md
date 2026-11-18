# ENGINE — lib/exploded.js

`ExplodedView.create(canvas, cfg)` turns the page inside `<canvas layoutsubtree content="drawable">` into an exploded
model. The full config and API are in the header of `lib/exploded.js`; this file explains how the parts fit and how to add
to them inside a project without editing `lib/`.

## Files
| file | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit) |
| `lib/terrain.js` | `EVTerrain`: noise, `ridges`, `bumps`, `warp`, `rough`, `floor`, `sample`, `contours` (marching squares), `spline` |
| `lib/exploded.js` | `ExplodedView`: plates, pieces, camera, springs, shaders, hit-test placement, input, `daylight` |
| `lib/exploded.css` | the default look of the pieces it makes (plates, pins, marker, route, tag) and the live-page rules |
| `lib/paper-sound.js` | `PaperSound`: riffle, land, flick, lift, tick, touch, all synthesised; silent until enabled |

## Markup contract
- `#page` (or `cfg.page`): the layout root at the canvas origin. Not drawable. Its CSS decides the flat layout, with a
  media query for phones. The engine measures every piece's offset from it (`offsetLeft` chains, so no transforms on
  ancestors).
- `[data-ev=sheet][drawable]`: the paper under everything; holds `[data-ev-base]`, the box under the map where the engine
  puts the base map (minor contours under the first level, `decorate(0, …)`), coloured by the variant's `base`.
- `[data-ev-map]`: same box as `[data-ev-base]`. The engine adds the plates (`.ev-plate`), pins (`.ev-pin`), the marker
  and a route SVG that only the fallback page shows.
- `[data-ev=card][drawable]`: cards, any HTML. Drawables never nest inside other drawables.
- `[data-pin=<id>]` anywhere: rows that light up with the pin of that id and emit `pin` when clicked.
- `[data-hic-edit]`, `[data-hic-click]`: what the shared check clicks.

## The plates
- **Terrain**: `terrain.height(u, v)` is sampled on a grid (`grid` across), cut at each level with marching squares
  (`closed` so fills close along the border, even-odd so basins are holes), smoothed once, written as one SVG per plate in
  map units (1000 across). Minor contours between levels and labels along `labels.from → to` go in the same SVG.
  `decorate(k, info)` returns extra SVG for plate k (0 = the base): `info.at(u, v)` gives plate-local coordinates,
  `info.level`, `info.x/y/w/h` (bbox in map units). Test `height(u, v)` against `info.level` to print only where that plate
  is the visible top (the reef's corals do this).
- **Layers**: `layers: true` and write the plates yourself in `[data-ev-map]`: each `[data-ev=plate]` element covers the
  whole map box and holds an `<svg viewBox="0 0 1000 H">` with one `path.ev-fill` (the plate's outline) and anything else
  (rooms, labels, rows of vines). The engine rasterises the paths to build the plate field. Bottom plate first.
- **The field** (`uLev`, 384 px wide): at each map point, the fractional index of the highest plate there. Plate j covers
  where the field ≥ j. Every lighting term reads it.

## Motion (weight and settle)
- One spring `e` (apart amount, 0 flat … 1 apart … 1.2 extra) drives everything. `targetLevels(e, k)`: thickness grows
  first (lower plates first), then gaps open (top plates first).
- Each plate follows its target with its own spring (lighter, faster ones low; the top plates lag and overshoot a little),
  cards rise with a softer spring, pins pop past upright (ζ 0.42) and settle. `material.weight` slows all of them.
- `#still` and `#calm` snap every spring; `__ev.settle()` does the same for checks.

## Light
`setLight({ dir, col, amb, expo, night })`. `ExplodedView.daylight(f, o)` makes one from a 0..1 slider (sunrise → sunset at
0.9 → night), with `rise`, `set` (minutes), `maxEl` (radians), `az0`, `az1` (degrees, 0 = map top), `amber`. Write your own
for other slider meanings (a season, a tide, a hour of a festival): it only has to return those five fields.
In the shader: sun visibility = product over plates above of "is there paper where the sun ray crosses that plate's
underside"; plate-top AO from the distance to the next plate's edge and the air above; wall slices lit by the field's
gradient normal; card shadows as rounded boxes; lamps at the pins after dusk; `atmos.deep` tints lower plates,
`atmos.caustics` adds moving light nets (static in #calm / #still).

## Hit testing
Every piece gets `S.place(el, matrix3d)`: the same camera, written as a CSS 3D matrix from element px to canvas px. In CSS
mode the matrix is pre-multiplied by the element's layout offset (a CSS transform starts at the layout box). Range inputs
are driven from the camera (`localPoint`, the inverse of the piece's homography), so a tilted slider follows the pointer in
both modes. `__hic.screenOf(el)` / `__ev.screenOf(el, fx, fy)` give where any element is drawn.

## Adding things in a project (no edits to lib/)
- **A new readout or control**: plain HTML in a card; wire it in the page script. If it changes plate pixels, call
  `view.refresh()`; card changes upload by themselves.
- **A new material look**: `material.core`, `thickness`, `gap`, `tooth`, the variant ramps; print texture into the plate
  SVG with `decorate` (hatching, dots, rows).
- **Another light model**: a function returning `{dir, col, amb, expo, night}`.
- **Another sound**: call `PaperSound` from your handlers, or add your own Web Audio next to it (start only after the
  toggle).
