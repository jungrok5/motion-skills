# Engine, land and kit API

All paths are the project's `lib/` (copied from `map-dive/lib/` by `new-film.mjs`); the page imports them through an
import map (`"dive/": "./lib/"`).

## dive.js — the film
```js
const F = await Film.create({ duration: 30, fps: 30, W: 1920, H: 1080 });   // loads fonts/fonts.css faces first
const S = F.stage('name', { night, sky, nightSky, skyColors, light, nightLight, sunDir, haze, fog, shadow, shadowHalf });
F.shot('name', { from, to, keys: [{ t, at: [x, y, z], dist, yaw, elev, fov, roll }, …], blur });
F.title(text, { from, to, pos: 'top' | 'bottom' | 'top-left' | 'center', size, weight, color, sub, shadow });
F.credit(text, { from, to });          // small, top-left, white
F.check(name, t => bool);              // film-wide rule (check.mjs)
F.start();                             // sets the contract, plays live or waits for seek(t)
```
- **Stages** are separate three.js scenes with their own sky, sun, hemisphere light, haze and night value. `night` is a
  number or `t => 0..1` (`ramp(20, 23)`, `ramp(a, b, true)` for dawn). `haze: [near, far]` × camera distance (default
  `[2.4, 7]`, `null` for none); `fog: [near, far]` in world units instead. `sky: 'day' | 'dusk' | 'night'`.
- **Shots**: keys are absolute times; missing fields carry over from the previous key. `yaw` 0 looks north (camera to the
  south), positive moves the camera from the south toward the east (counter-clockwise seen from above); `elev` degrees above the ground; `dist` from `at`
  (interpolated in log space). Two shots that overlap crossfade; if both zoom the same way across the overlap it is a
  dive/rise and gets a zoom blur (`blur` overrides). Overlapping shots must use different stages.
- `S.label(text, [x, y, z], { from, to, size = 34 })` a pin label (pops with a spring, shrinks before `to`).
- `S.glow(points, { size, color, strength, day })` additive light dots that follow night.
- `S.onFrame((t, night) => …)` animate from t alone. `S.check(name, t => bool)`. `S.add(obj)`.
- `S.surface(x, z)` ground height (set by `island` / `terrain`); kit props sit on it.
- Helpers: `projector({ center: [lon, lat], km })` → `(lon, lat) => [x, z]` (or `geo([lon, lat])`), `smoothLoop(pts, n,
  closed)`, `offsetLoop(loop, d)`, `inside(p, loop)`, `distToLine(p, pts)`, `sdLoop(p, loop)`, `rng(seed)`, `hash`,
  `noise`, `fbm(x, z, oct)`, `smooth(a, b, x)`, `ramp`, `spring`, `hex('#…') → linear rgb`, `mixc(a, b, t)`, `lerp`, `clamp`.
- `F.cues()` (for score.mjs): transitions, pins, titles, night per 0.25 s. `F.allText()` (for fonts.mjs).

## land.js — the ground
```js
L.island(S, { land: [loop, …], sea: [loop, …], base: (x, z) => rgb, paint: P => {…}, depth = .55, bevel = .1,
  lip, soil: [top, bottom], seaColor, shallow, foam, seaDrop = .13, glow = 1.6, tex = 4096, res = 640 });
L.terrain(S, { size, center, seg, height: (x, z) => y, base, paint, trees: { where, n, size, colors, shape },
  water: { level, color, opacity }, apron: { size, base, paint, y }, glow });
L.city(S, { size, center, angle, block: [u, v], street, avenues: [polyline, …], avenueWidth, parks: [loop], waters: [loop],
  keep: (x, z) => bool, floors: (x, z, r) => n, floorH, walls, roofs, waterColor, lampEvery, base, paint, trees, glow });
L.forest(S, {...}); L.windowMaterial(material, S.uNight, {...}); new L.Painter(bounds, {...})
```
- `base(x, z)` returns linear rgb (`hex('#a8d26a')`, `mixc(...)`); it runs once per texel of a 640-px grid.
- **Painter** (`P` in `paint`): world units everywhere. `P.fill(loop, color, { alpha, blur, stroke, strokeWidth })`,
  `P.line(pts, width, color, { alpha, dash, blur })`, `P.river(pts, width)`, `P.road(pts, width, { color, edge, glow })`,
  `P.fields(loop, { cell, angle, colors, alpha, border, keep })`, `P.dot(p, r, color)`, `P.light(p, r, strength)`
  (night glow layer), `P.text(str, [x, z], { size, weight, color, halo, rotate })`, raw `P.ctx` with `P.X(x)`, `P.Z(z)`,
  `P.S(len)`. Colours are CSS strings or linear rgb arrays.
- `terrain`: keep `height` near 0 at the square's edges (the apron sits at `apron.y`, default 0) and below the water
  level wherever the water plane should show. `city` adds its own far-city apron; pass `ground: { … }` to override.

## kit.js — props
Every prop: `K.name(S, { at: [x, z], s = 1, rot = 0, y, ...options })`, y from `S.surface`.

| prop | options | notes |
|---|---|---|
| `mountain` | `peaks, color, shade, snow, seed` | faceted cones, lavender by default |
| `crater` | `h, color, rim, inner, lake, water` | volcano / tuff cone / caldera (`lake: true`) |
| `waterfall` | `w, h, rock, top, water, pool, arc` | horseshoe cliff on the −z side, scrolling falls, pool, mist |
| `dam` | `len, h, color, rib` | ribbed wall |
| `tower` | `kind: 'spire' \| 'tv' \| 'pagoda', color, roof` | cathedral, TV tower, pagoda |
| `lighthouse` | `color, stripe` | striped, lit lamp |
| `pavilion` | `roof, ridge, pillar, band, base, bays: [n, m]` | East-Asian hall, two-tier hipped roof |
| `turbine` | `speed, phase, color` | blades turn with t |
| `statue` | `color, dark` | stone guardian |
| `stadium`, `bridge`, `dome` | | |
| `houses` | `n, spread, roofs, wall, size, seed` | a village cluster |
| `trees` | `n, spread, kind: 'round' \| 'pine' \| 'palm' \| 'orange', size` | a clump |
| `animals` | `n, spread, kind: 'cow' \| 'horse', size` | grazing |
| `skyline` | `n, spread, height, colors` | downtown towers |
| `cloud` | `at, y, s, color, drift` | pastel puffs drifting with t |
| `plane` | `path: t => [x, y, z], s` | faces its direction of travel |
| `boat` | `at` or `path: t => [x, z], s, y, hull, sail` | bobs |

### Your own prop
```js
import { group, part, mat } from 'dive/kit.js';
function torii(S, { color = '#d9442f', ...o } = {}) {
  const g = group(S, o), box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  for (const x of [-.4, .4]) g.add(part(box, color, { x, sx: .08, sy: .9, sz: .08 }));
  g.add(part(box, '#2b2b2b', { y: .9, sx: 1.2, sy: .08, sz: .12 }));
  g.add(part(box, color, { y: .72, sx: 1, sy: .06, sz: .08 }));
  return g;
}
torii(I, { at: geo(135.77, 34.97), s: .4 });
```
Rules for props: built at unit size around the origin with the base at y = 0, Lambert colours from the place's palette,
chunky proportions (no detail under ~1/20 of the prop), `castShadow` on (part() does it), motion only in `S.onFrame`.
