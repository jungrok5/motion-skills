# KIT — building a set in code

A scene is `{ name, mood, ambient?, seed?, build(S) }`. `build` receives a `Stage` (`lib/kit.js`, with the props of
`lib/props.js` mixed in) and places things in metres: y up, the default camera looks towards −z, every primitive
stands on its `pos` (y = its bottom) unless noted. Rotations are degrees. Tones run 1 (paper white) … 0 (ink).

## Frames

- `S.at([x, y, z], ry, () => { … }, scale?)` — build children in a moved / turned frame (nest freely).
- `S.world([x, y, z])` — a point in the current frame → world coordinates (for wires between props).
- `S.rand()` — the scene's seeded random (never `Math.random`).

## Primitives (all take an options object `o`)

| call | what |
|---|---|
| `box(pos, [w, h, d], o)` | a box standing on pos (`o.center` centres it) |
| `cyl(pos, r, h, o)` | cylinder / frustum (`o.r2` top radius), `o.seg`, `o.open`, `o.center` |
| `cone(pos, r, h, o)` · `sphere(pos, r, o)` · `torus(pos, R, r, o)` | the rest of the solids (torus lies flat) |
| `plane(pos, [w, h], o)` | a vertical sheet facing +z (`o.floor` lays it down); double-sided |
| `extrude(pos, [[x, y], …], depth, o)` | a profile in XY pushed along +z (`o.centerZ`) — garments, iron, hulls' sides, stair treads |
| `slab(pos, [[x, z], …], thick, o)` | a floor plan given thickness upward — hulls, counters of any shape |
| `lathe(pos, [[r, y], …], o)` | turned shapes — bottles, buckets, lamp shades, dishes |
| `mesh(pos, geometry, o)` | any THREE.BufferGeometry |
| `line(points, o)` | a stroke-only polyline: wires, cables, rails, rope, cracks (`o.sag` droops a 2-point line, `o.closed`, `o.weight`) |
| `grid(pos, [w, d], step, o)` | seam lines: floor tiles, ceiling boards, panel joints (`o.plane: 'floor' / 'ceiling' / 'wall'`) |
| `sign(pos, [w, h], text, o)` | a board with lettering in the bundled font (`o.vertical`, `o.bg`, `o.ink`, `o.board` depth, `o.frame`) |
| `glow(pos, size, o)` | something that shines: bulbs, tubes, lit windows, screens (`o.shape: 'box' / 'sphere' / 'cyl'`) |
| `beam(pos, length, r0, r1, o)` | a shaft of light along the frame's +z (turn with `o.rot`), fading; lifts the tones it crosses |
| `light(pos, o)` | a point light for night (`o.intensity`, `o.distance`); ≤ 8 per scene |
| `sun(o)` | the key light: `dir` towards the sun, `area: { center, radius }` its shadow box, `shadow`, `strength` |
| `model(url, o)` | a GLB (your own file, or a Polyfork CDN URL under `references/3D-MODELS.md`): `pos`, `ry`, `scale`, `tone`, `crease` |

Options every primitive understands:

| option | meaning |
|---|---|
| `tone` | its grey before light: walls 0.9–1, wood 0.75–0.85, metal 0.5–0.7, dark cloth 0.3–0.5 |
| `flag` | `'glass'` (white with glare), `'light'` (white, blooms at night), `'ink'` (solid black) |
| `see: true` | see-through glass: hides nothing, what is behind it is toned and inked |
| `lines` | `'all'` (creases + silhouettes + borders) · `'outline'` (silhouettes + borders) · `'none'` |
| `crease` | degrees: an edge sharper than this is always inked (boxes 32, round things 40–55, low-poly GLBs 40+) |
| `weight` | stroke weight multiplier |
| `detail: true` | small things: thinner lines, dropped when far or tiny |
| `cast` / `receive` | shadows |
| `ry` / `rot: [x, y, z]` | turn about its own pos |

## Architecture

- `wall(x0, z0, x1, z1, h, { t, tone, openings: [{ at, w, y, h, kind: 'window' | 'door' | 'hole', … }], skirting })`
- `room({ w, d, h, t, wall, floor, ceil, open: ['s'], openings: { n, s, e, w }, ceiling, skirting })` — centred on the
  frame; walls n (−z), s (+z), e (+x), w (−x). Openings are measured along each wall from its start (n runs −x → +x,
  s runs +x → −x, e runs −z → +z, w runs +z → −z).
- `window(pos, w, h, { panes: [cols, rows], frame, sill, glass })` · `door(pos, w, h, { open, glassPanel, tone })`
- `stairs(pos, n, w, rise, run)` — straight flight going up towards −z.

## Props (lib/props.js) — examples of the level of detail

Indoors: `desk` `chair` `stool` `table` `shelf` (fills itself with books / cartons / bottles) `books` `counter`
`cabinet` `fridge` `monitor` `bottle` `can` `cup` `carton` `plant` `clock` `poster` `fluorescent` `pendant` `aircon`
`curtain` `bed` `trash`.
Outdoors: `building` (floors of windows, `shop: { sign, lit, awning }`, `balcony`, `lit` windows, `simple` far windows,
vertical `sign`) `pole` (returns wire attach points) `wires` `streetlamp` `vending` `bench` `railing` `fence` `tree`
(`round` / `conifer`) `road` (dashes, kerbs, crosswalk) `car` `crate` `lantern`.

Each is `S.prop(pos, ry, options)`; read its few lines in `props.js` before using it — they are short on purpose.

## Designing a new prop

A prop is a function in your `scenes.js` that takes `S` and a position and builds 3–30 primitives in `S.at(…)`.
Model it from real sizes (a counter is 0.95 m high, a step rises 0.16–0.19 m, a door is 0.85 × 2.05 m). Give each
part its own tone so the manga layer separates them. Mark small parts `detail: true`. Use `line()` for anything thin
(cords, hoses, rigging, hanger hooks) — a 1 cm cylinder only makes noise. For round things that should show the
seams a manga artist draws (a tower, a lantern), build a ring of straight panels instead of a smooth cylinder
(`examples/lighthouse/scenes.js` → `towerWall`).

## Cameras (in the shot list)

`cam: [{ pos, look, fov, roll? }, …]` — keys spread over the shot (or give each a `t` in 0–1), eased as one slow
dolly. Stand at a person's eye height (1.4–1.6 m) unless the beat wants a high or low angle; keep moves small
(≤ 1.5 m and ≤ 15° per shot, check.mjs fails a whip); keep 0.3 m clear of every surface; a vertical fov of 50–60°
reads natural, 65–78° for towers and tight rooms.
