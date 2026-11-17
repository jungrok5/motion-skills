# KIT — the API

Load order in a page: `lib/stack.js` → `lib/world.js` → `lib/film.js` → `lib/score.js` → `cast.js` → the page script.
Everything is a classic script on `window` (`SS`, `SSScore`), so pages run from `file://` with no build step.

## Models (`lib/stack.js`)

```js
const M = SS.model('tug', {
  palette: { k: '#1c1a2b', n: '#27407a', … },     // one character per colour; '.' or ' ' = empty
  top:   [ … W strings of L ],                       // looking down, front → right, row 0 = the LEFT side
  side:  [ … H strings of L ],                       // the RIGHT side, front → right, row 0 = the top
  front: [ … H strings of W ],                       // from the front (the object's right on your left)
  back:  [ … H strings of W ],                       // from behind
  left:  [ … H strings of L ],                       // optional: the LEFT side, front → left (default: the side's colours)
  edit: v => { v.set(x, y, z, 'k'); v.set(x, y, z, null); v.get(x, y, z); },   // optional, after carving
  idle: { roll: .8, pitch: 0, bob: 0, period: 3.2 }, // what breathes when still (px at the top slice / px up)
});
```
Carving: a voxel at (x, y, z) exists where all views have a pixel. Colours by view ray: the first voxel hit from above takes
the top view's colour, the first from the right the side's, from the front the front's, and so on; other exposed faces take
the side view's colour at (x, z). Every voxel keeps its top-view colour for its top face, so a slice seen alone (the
`slices` beat) shows the top view masked by that row — the source's look.

Generators (their views are projected, so they can be shown in a `views` beat too):
```js
SS.lathe(name, { h, r: z => radius, col: (z, ang, dx, dy, rr) => colour, top?: (z, ang, dx, dy) => colour, palette?, idle? })
SS.box(name,   { l, w, h, col: (x, y, z) => colour | null })
SS.voxels(name, { l, w, h, fill: (x, y, z) => colour | null, top?: (x, y, z) => colour | null, palette? })
```
A colour is `'#rrggbb'` or a palette key. `ang` is the screen angle round the axis — `Math.cos(ang + 2.3) > .3` is the side
toward the default light (upper left), handy for a lit tone.

`SS.audit(M)` → `{ lost: { top, side, front, back }, problems: [], notes: [] }` — the share of each view's pixels that carve
to nothing (> 2 % is a problem), whether the side view faces right (front-only / back-only colours at its ends), empty slices.

## Drawing (`lib/stack.js`)
```js
SS.draw(R, M, { x, y, a, lift: 1, spread: 0, z0, z1, zfn: z => dy | null, lean: [fwd, right], alt, light: -2.3, shade: .2, cap, tint })
SS.shadow(R, M, { x, y, a, dx, dy, f: .62 })          // the footprint darkens what is drawn; SS.shadowOffset(M, light)
```
`R` is an `SS.Raster(w, h)` (Uint32 pixels; `fill`, `px`, `rect`, `line`, `disc`, `grid`, `darken`). `a` is the facing on
screen (0 = right, clockwise positive). For each slice bottom to top: offset `z · (lift + spread)` up, plus `lean · z / (H−1)`
in the model frame, then every pixel of its bounding circle is mapped back into the slice (nearest). The face shown for a
voxel is the exposed side face most turned toward the viewer (screen down) when it is turned more than ~22°, else its top.

## The world (`lib/world.js`)
```js
const world = SS.world({
  size: [w, h],                                      // the painted texture; outside it the base material continues
  ground: 'grass' | { kind: 'water', colors: […], glint, lite } | { base: (x, y) => c, anim?: (x, y, step) => c | 0 },
  areas: [{ name, poly: [[x, y], …], fill, edge: { w, kind: 'curb' | 'foam' | 'line', colors, dash, fill, name } }],
  paths: [{ pts, closed: true, width, fill: 'asphalt', edge: { w, kind: 'curb' }, centre: { color, dash, w }, paint: false, name }],
  decals: [(tex, W, H, put) => {}],                  // anything painted by hand into the texture
  props: [{ m, x, y, a, sway }],
  scatter: [{ models: [m…], n, on: ['land'], seed, gap, area: [x0, y0, x1, y1], turn: true }],
  mover: { model, path: 0, mass, speed, accel, brake, lat, drift, yaw, roll, pitch, lean, stiff, damp, start, stop, s0,
           on: ['water'], engine: 'diesel' | 'motor' | 'electric' | 'none', trail: { kind: 'wake' | 'dust', n, dt, spread, colors } },
  camera: { turn: .5, lead: .35, stiff: 3.2, rot0 },
  light: -2.3,
});
```
Materials (`SS.MAT`): `grass`, `asphalt`, `water` (animated glints), `sand`, `snow`, `dirt`, `planks` (`board`, `len`,
`vertical`), `tiles` (`a`, `b`, `grout`, `size`), `flat` (`color`). A new one is `{ base(x, y), anim?(x, y, step) }` —
deterministic (use `SS.hash`, `SS.vnoise`), no `Math.random`.

`world.plan(dur)` (the film calls it) builds the mover's tables at 240 Hz: the fastest speed allowed at each arc length
(`sqrt(lat / curvature)`, then braking ahead), the speed integrated within `accel` / `brake`, the heading (equal to the course
for `drift: 0`; a lagging, clamped yaw for drifters), roll = −lateral accel × `roll` and pitch = −longitudinal accel × `pitch`
through a damped spring (`stiff`, `damp`: it overshoots and settles), and the camera spring. `world.T.at(t)` → `{ x, y, a,
v, roll, pitch, … }`; `world.matAt(x, y)` → the material name under a point.

## The film (`lib/film.js`)
```js
SS.film({ title, paper, ink, accent, light, hero, models, world, beats: […], score: {…} }).start();
```
Beats (all take `dur`, `caption`, `in: 'tiles'`, `tin`; `zoom` = an integer or `'auto'`):

| kind | options | what it shows |
|---|---|---|
| `views` | `model`, `labels: { top, side, front, back }` | the four views drawn in row by row (a pen row in the accent), labels, front arrows |
| `slices` | `model`, `spread` (2), `angle` (−.62), `sideLabel`, `sliceLabel` | side view + scan line · top view masked to the slice · the stack growing |
| `stack` | `model`, `spread`, `angle`, `turn` (.9 rad) | the exploded stack closing to 1 px, then turning; idle |
| `turn` | `model`, `angle`, `turns` (1), `dir` (±1) | a full turntable with its shadow; idle |
| `world` | `zoom` (1–3), `camera: { orbit: [x, y], rate, rot0 } \| { at: [x, y], rot }` | the world, following the mover unless a camera is given |
| `title` | `text`, `sub`, `over: 'world' \| 'paper'`, `camera` | a title band over the world (or on paper) |

The page contract (`start()`): `window.seek(t)`, `DURATION`, `FPS` (30), `PIXEL = { W: 480, H: 270, block }`, `film`,
`runChecks(t)`, `shotAt(t)`, `__ready`. Query: `?render=1` (no fitting, no loop), `?t=12.5` (one frozen frame), `?scale=.5`
(the block size: 4 × scale), `?off=captions,labels,mover`. Live: fits the window at an integer block size, loops, click =
sound on / off (the score is rendered in the page), space = pause.

`SS.sheetPage(models, { paper, lean, movers })` — the model sheet page (views, exploded slices, 8 angles with the side each
one shows, the lean poses of the movers); `runChecks()` returns every model's audit problems.

## The score (`lib/score.js`)
`SSScore.arrange(film, { bpm, key, melody, chords, engine, level, engineLevel })` → `{ notes, sfx, engine }`;
`SSScore.render(spec, sr, dur)` → `[L, R]` Float32Arrays; `SSScore.wav(spec, sr, dur)` → base64 WAV. Voices: pulse 12.5 / 25 /
50 %, triangle, saw, noise (hat, snare, kick, click, scratch, whoosh), a small room reverb. The engine follows the mover's
speed: `diesel` (thumps that quicken), `motor` (two detuned saws), `electric` (a whine).
