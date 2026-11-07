# KIT — the World API

```js
import { World, THREE, kit, cl, sm, lerp, noise, fbm } from 'sw/world.js';
const { part, merge, Box, Cyl, Cone, Ico, Dodeca, Dome, Ball, Ring, Gable, Sail, jitter, props, C } = kit;
const W = new World({ title, build: 20, seed, crew: { name: '#hex', … }, accent: '#ff5b3a', ui: { … }, alt, size: [1920, 1080] });
```

## World options
| option | default | |
|---|---|---|
| `title` | `'world'` | the HUD title |
| `build` | `20` | seconds of build; `intro` (1.2) and `outro` (7) are added |
| `seed` | | the layout's random seed (`W.rnd()`, `W.rr(a, b)`, `W.pick(arr)`) |
| `crew` | | `{ name: colour }`, 5–16. Dark colours get white text on their tags. |
| `accent` | `'#ff5b3a'` | the build wireframe and the marks |
| `ui` | `{ theme: 'light', objects: 'objects', agents: 'agents', builtIn: 'built in' }` | `theme: 'dark'` for a dark sky; words may be templates: `'{n}개'`, `'{t} 만에 완성'` |
| `alt`, `againLabel` | | accessible description; the replay button's label |
| `size` | `[1920, 1080]` | the render size (`?size=1080x1920` overrides) |

## The line
- `W.line([[x, y, z], …])` — a Catmull-Rom route; `y` is the height of the track bed. Sets `W.LEN` and the timetable.
- `W.timetable({ from, to, start, stop, crawl })` — where the traveller starts / stops (path length) and how it eases.
- `W.at(s)` → `{ p, t, r }` (point, tangent, right) · `W.beside(s, side, off)` → `[x, z]` · `W.heading(s)` → `ry`
- `W.nearest(x, z)` → `{ d, s, y, yn, yb }` · `W.travS(p)` / `W.pOfS(s)` · `W.buildAt(s, lead)` · `W.frontS(p, lead)`

## The land
- `W.land({ height(x, z, nr), color(x, y, z, ny, nr, out), bounds: [x0, x1, z0, z1], res: [nx, nz], lead: 84, spread: 0.32, bed: true })`
  — a heightfield coloured per face; `bed` cuts a bed for the line. `W.ground(x, z)` is the height with the bed.
- `W.sea({ level, bounds, res, color, opacity, waves, lead })` — low-poly water.
- `W.track({ by, lead: 24, spacing: 0.9, gauge, sleeper: geo, rail: geo | false, label, doing, did, drop })` — sleepers
  (or tiles, markers) along the whole line, and their front.

## Things
- `W.kind(name, { geo, label, size: [halfW, height, halfD], words: [doing, done, plural], one, say: { doing, did, sweep }, lead, shadow, quiet })`
  — `size` is in instance units (multiplied by `sx / sy / sz`): it frames the marks and puts the cursor on top of what is
  rising. `quiet` keeps it out of the log.
- `W.add(kind, { x, z, y?, ry, sx, sy, sz, color, s?, lead?, b? })` — `y` defaults to the ground; `b` (when it is built,
  in build progress) defaults to `buildAt(s + max(0, d − 10) · 0.3, lead)`. `color` tints a white geometry per instance.
- `W.claim(x, z, r)` / `W.free(x, z, r)` keep footprints apart (the track claims its bed).
- `W.list(kind)`, `W.side(it)`, `W.lined(list)` (one side, then along the line), `W.chunk(list, n)`.
- `W.animate(kind, (it, i, t, p) => ({ ry, y, rz, … }))` — per-frame overrides (blades, boats, clouds, a turning dish).

## Jobs
Each job is one cursor building something. Roles are who may take it: the scheduler hands jobs out in the order they are
wanted to whoever can start soonest and still beat the traveller there; a job nobody can reach in time builds itself.
Each thing is then built at the moment its cursor reaches it.
- `W.raise(item, roles, { doing, did, glyph, across })` — one big thing, crosshair on its rising top (`across` for a cloud).
- `W.hop(items, roles, { doing, did, then: { n, label, doing } })` — a run; `then` makes the last items a second pass.
- `W.lay(items, roles)` — built along a stroke, the pen dragging from one to the next.
- `W.sweep(items, roles, { field: { c, u, len, wid }, lanes: 4, u0, u1 })` — a field swept row by row (boustrophedon).

Words: templates with `{k}` `{n}` `{where}` `{row}` `{rows}` `{plural}` `{label}`, or functions of those. Defaults are
English from `words` (`'planting pines 3/5'`, `'planted 5 pines in the hills'`). `{where}` comes from `W.landmark(x, z, words, r)`
and `W.places((x, y, z) => words)`.

## Fronts
- `W.front({ by, label, p0, p1, at: (p) => [x, y, z], box: half | (p) => points, count: 'terrain' | 'sea' | kind | sorted array, doing, did })`
- `W.terrainFront({ by, phase, amp, freq, lead, doing, did, label })` — a cursor sweeping side to side far ahead.
- `W.groundAt(s, L)` — a point L metres beside the line at s, just above the ground.

## The traveller
`W.vehicle(cars, { by, offsets, lift, top, smoke: { color, y, fwd, rise, size, opacity } | false, sound: 'chuff' | 'hum' | false, say: { place, drive, arrive, arrived } })`
— each car is a list of `[geometry, colour, { x, y, z, rx, ry, rz, sx, sy, sz }]`, front = +z. The driver places it, then rides it.

## Light, camera, extras
- `W.sky({ zen, hzn, sun, glow, light, lightI, hemi, ground, hemiI, elev, az, golden: [p0, p1], exposure, stars })` —
  each colour is `[start, end]`; the end weighs in from `golden[0]` to `golden[1]` of the build.
- `W.camera({ zones: [[s, { h, back, side, look }], …], reveal: { pos, tgt, turn }, fov, tallFov, fog, shadow })`
- `W.glow(points, { from, color, size })` — additive glows that fade in at the end.
- `W.onFrame((t, p, rv, W) => …)` — anything else per frame (a sky body: `W.scene.add(mesh)`, position from `t` only).
- `W.check(name, (t, p, W) => ok)` — a rule `check.mjs` samples; `W.project([x, y, z])` → `{ x, y, a }` or null.
- `W.text(...strings)` — extra strings for the font check.

## The kit
`part(geometry, colour, { x, y, z, rx, ry, rz, sx, sy, sz, shade })` → one coloured piece (scale → rotate → move);
`merge([...parts])` → one geometry. Primitives stand on y = 0: `Box(w, h, d)`, `Cyl(r0, r1, h, n)`, `Cone(r, h, n)`,
`Ico(r, detail)`, `Dodeca(r)`, `Dome(r)`, `Ball(r)`, `Ring(r, tube)`, `Gable(w, d, h)`, `Sail(h, w)`, `jitter(g, k, seed)`.
`props.tree() / pine({ snow }) / rock() / cloud() / lamp() / fence() / house() / roof()` are examples of the style.
Keep a kind to 3–15 parts and 6–16 segments round; flat shading does the rest.
