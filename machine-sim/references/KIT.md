# machine-sim kit API

```js
import { createSim, THREE, U, DT } from '../kit/machine-sim.js';
const sim = createSim({ views, display, isolate, duration });
const { K, root, hud } = sim;
```

## createSim(config)
| key | default | what |
|---|---|---|
| `views` | one `hero` | `{ name: { az, el, dist, target: [x, y, z], fov } }`, relative to `model.follow()`. `az` 0 = camera on +z, 90 = on +x; `el` degrees above the target. Order = number keys 1…n and the Views panel order. |
| `startView` | first view | |
| `display` | labels, x-ray, exploded, orbit | `[[mode, 'Button label'], …]` from `labels`, `solver`, `xray`, `exploded`, `isolate`, `orbit` |
| `isolate` | `null` | `{ group: 'leg-FL' \| ['a', 'b'], view: 'leg' }` — what stays solid in `isolate` mode and the view it flies to |
| `duration` | tour end + 2 s | tour length in seconds (`window.DURATION`) |
| `bg`, `grid`, `gridColor` | `#ebeae6`, 1, `#cbc7be` | floor colour, grid cell (model units), grid line colour |
| `shadowBox`, `orbitSpeed` | 9, 14 | half-size of the shadow camera (units), orbit °/s |

The machine faces **+z**, up is **+y**, its left side is **+x**. Model units are metres unless you say otherwise
(the engine uses 1 unit = 100 mm so it has the same on-screen scale as a vehicle; its footer says "grid 10 cm").

## K — geometry and materials
| call | makes |
|---|---|
| `K.mat(color, { rough, metal, emissive, ei, flat })` | cached `MeshStandardMaterial` |
| `K.group(parent, pos, rot)` | a `Group` (joints are groups) |
| `K.box(w, h, d, mat, parent, pos, { bevel, rot })` | chamfered box — the bevel catches light on every edge |
| `K.prism(pts, depth, mat, parent, pos, { axis, bevel })` | extruded profile. `axis: 'x'` profile in (z, y), depth along x (hull side views); `'z'` profile in (x, y) (leg beams along +x); `'y'` plan in (x, −z), depth up (turrets) |
| `K.cyl(r1, r2, h, mat, parent, pos, { axis, seg })` | cylinder along `x`, `y` or `z` |
| `K.strut(mesh, a, b)` | stretch a unit-height cylinder between two points of its parent (rams, rods) — call in `pose` |
| `K.line(points, color, parent, { opacity, depthTest })` / `K.setLine(line, points)` | debug lines for the solver overlay (shorter point lists are padded) |
| `K.mesh(geo, mat, parent, pos, rot)` | any geometry, shadows on |

## Parts
`sim.part(obj, opts)` registers an object (group or mesh). Meshes below it belong to it until another registered part.

| opt | what |
|---|---|
| `label`, `sub` | leader-line label (shown upper-case) and its grey second line |
| `anchor` | `[x, y, z]` in the object's local space where the leader line starts |
| `side` | force `'l'` or `'r'` column |
| `explode` | offset in the **parent's** space at full exploded view (so a tibia flies along the leg) |
| `group` | isolate group name |
| `role` | `'shell'` (default; ghosts in x-ray), `'frame'` (stays solid in x-ray: legs, crank train), `'internal'` (hidden until x-ray: engines, tanks, seats) |

Every frame the kit puts each part back at its registered position, calls `model.pose`, then adds explode offsets and
ghosting. So `pose` writes rotations and *relative* moves (`gun.position.z -= recoil`), never accumulates.
Set `mesh.userData.noGhost = true` on effects (muzzle flash, combustion glow) to keep them out of the ghost pass.

## Model
```js
sim.model({
  inputs: { speed: 4.0 },              // slider keys → S.in
  init(S) { return { … } },            // state m (S.in is ready)
  step(m, dt, inputs, S) { … },        // fixed DT = 1/60; state only
  pose(m, S) { … },                    // transforms from m; may stash derived values on m for hud
  follow: m => [x, y, z],              // camera, floor, grid and light follow this point
  solver(m, S, k) { … },               // update sim.solverGroup contents; k = 0..1 fade
  hud(m, S) { … },                     // write readouts
  commands: { walk(m, S, arg) { … } }, // button ids that are not views / display modes / inputs
});
```
`S` also holds `S.time`, `S.view`, `S.on[mode]` (toggles), `S.k[mode]` (eased 0..1), `S.cam`.

## HUD
| call | builds |
|---|---|
| `hud.top({ code, kicker, title, sub, logo })` → `{ status(a, b), big(a, b) }` | orange logo block, title with the accent slash, status at the right, big number |
| `hud.panel('l' \| 'r', title, { no, portraitHide })` → body | a panel in a column |
| `hud.stat(body)` → `set(big, cap, right, rightCap)` | big number with captions |
| `hud.chart(body, rows, { caption })` → `set(head, [row, seg], note, hot)` | timeline rows of segments in 0..1, a playhead and a note line |
| `hud.bars(body, rows, { head, footer })` → `set(i, frac, value, trailing, sub, hot)`, `footer(a, b)` | bar rows |
| `hud.slider(body, { key, label, min, max, step, fmt })` | bound to `S.in[key]`; command id `in.<key>` |
| `hud.buttons(body, items, { seg, on })` | items `{ id, label, red }`; `on(id, S)` decides the pressed look |
| `hud.svg(body, w, h)` | an SVG box to redraw in `hud()` (plan views, dials, p–V loops) |
| `hud.standard({ col, no })` | Views + Display panels from the config |
| `hud.foot(text)` | the hint line at the bottom |

## Tour
```js
sim.tour([
  { t: 1.4, click: 'display.labels' },          // cursor flies to the button, presses it
  { t: 13.6, drag: 'turret', to: 38, dur: 1.2 },// cursor drags a slider thumb
  { t: 15.4, click: 'fire' },                   // model command
  { t: 20, cmd: 'walk' },                       // no cursor
  { t: 4, move: [640, 400] },                   // cursor only (design px)
]);
sim.keys({ w: (S, cmd) => cmd('in.speed', S.in.speed + 0.5), ' ': 'fire' });   // 1…n = views
sim.start();
```
The tour plays on load and stops on the first user input; the state carries on live. `window.sim` is the sim object (handy in the console: `sim.S.on`, `sim.S.m`). `renderAt(t)` replays `step` from
the last state (or from 0 if `t` went back), so seeking is exact.
