# KIT — engine and parts

Load `lib/stack.js` then `lib/kit.js`, then write the piece in one `<script>`:

```js
const F = SS.create({ title, sub, fps: 30, far: 360, overElev: 62, fovK: 1, cockpitEye: .12, titleDur: 3.2 });
F.look({ sky: [horizon … zenith], fog, cloud: [shadow, mid, light, highlight], shadow: .72, sun: { az, el, r, color, halo },
         stars: 0, starColor, band, text, textShadow, trail });
F.world({ size: 512, seed, unit: 1, height(x, y, n), color(level, x, y, info), water: { ramp, depth, glints, glint, foam, rate, shore }, side: .68, lip: 1.1, decorate(W) });
F.clouds({ count, base: [lo, hi], size: [r0, r1], puffs: [n0, n1], stretch, angle, flat, wind: [wx, wy], seed, where(x, y) });
const craft = SS.model({ w, h, d, frames, outline }, (M, f) => { … });
F.craft(craft, { mass, speed, turn, bankMax, clearance, over, chase, chaseDist, chaseRise, chaseSide, eye, voxelSize, frame(s, t), trail: { color, from: [[x,y,z],[x,y,z]] }, trailWhen(s), sound: { engine: 'prop'|'jet'|'drone', hz, wind, level } });
F.plan({ start: { x, y, z, heading }, steps: [{ dur, cam, bank, climb, thr, roll, caption }, …] });
F.cockpit({ static(P) {}, live(P, s, t, F) {}, over(P, s, t, F) {} });
F.hud((P, s, t, mode, F) => {});            // optional overlay on every view
F.start();
```

## World
- `height(x, y, n)` returns levels (float). `> 0` is land, rounded to integer terraces; `≤ 0` is water, its value the depth.
  `n` wraps at the world size: `n.fbm(x, y, cell, oct, gain)` (cell = the biggest feature in cells), `n.ridge(x, y, cell, oct)`,
  `n.value(x, y, cell)` (smooth, for masks), `n.rnd(x, y, k)` (per cell), `n.dist(ax, ay, bx, by)` (wrapped distance).
- Useful shapes: thresholds of fbm with `SS.smooth(a, b, v)` make plateaus (mesas, islands); `ridge³` makes peaks; the contour
  `|fbm − .5| < w` makes rivers and fjords (carve with `SS.lerp(−depth, h, SS.smooth(w0, w1, cut))`); `SK.blobs` places islands.
- `color(level, x, y, info)`: `info = { raw, slope, n, rnd }` (slope 0 = a flat terrace cell). `SK.bands([[maxLevel, colour |
  [a, b, pA]], …])` is a quick band table.
- `decorate(W)`: `W.level(x, y)`, `W.height`, `W.isLand`, `W.raw`, `W.paint(x, y, c)` (colour only), `W.stamp(x, y, dh, top, side)`
  (raise a cell), `W.rng` (seeded), `W.n`; `SK.scatter(W, { count, where, stamp })`, `SK.tree`, `SK.pine`, `SK.rock`, `SK.house`.
- Plan on `?map=1`: the world from above (brighter = higher), the path coloured by camera, the lowest clearance, each step's start.

## Craft (`SS.model`)
Axes: **x** across (port → starboard when the nose points up), **y** along (0 = the nose), **z** up (0 = the belly). `M` builds
voxels; every colour may be a function `(x, y, z) => colour` (stripes, bands, tips).

| call | what |
|---|---|
| `M.set(x, y, z, c)` / `M.get` | one voxel (`c = 0` clears) |
| `M.box(x0, y0, z0, x1, y1, z1, c)` | a box, inclusive |
| `M.ell(cx, cy, cz, rx, ry, rz, c)` | an ellipsoid |
| `M.tube(cx, cz, y0, y1, r, c, squash)` | a tube along y; `r = [r0, r1]` or `u => r` (u = 0 at y0) |
| `M.plate([[x, y], …], z0, z1, c)` | a flat polygon (wings, tailplanes) |
| `M.fin([[y, z], …], x0, x1, c)` | a vertical polygon (fins, rudders, masts) |
| `M.mirror()` | copy the port half onto the starboard half where empty |
| `M.light(name, x, y, z, c)` / `M.glow(x, y, z, c)` | emissive voxels; `'port'` / `'starboard'` are checked |
| `SK.fuselage`, `SK.wings`, `SK.fin`, `SK.prop`, `SK.flame`, `SK.envelope`, `SK.navLights` | parts built from the above |

`frames: n` calls the builder once per frame (`f`) — use it for props, flames, flags, flapping. `F.craft({ frame: (s, t) => … })`
picks one from the state and `t` (never from a counter). Look at `?sheet=craft`.

`SS.drawStack(ctx, model, { x, y, yaw, pitch, roll, elev, scale, frame })` draws any stack anywhere — use it for extra stacked
props (a lighthouse, a balloon tethered to the ground) in a `F.hud` overlay if the topic needs one.

## Flight
- Mass `m`: bank spring ω = 3.4/√m (ζ .62, small overshoot), pitch ω = 2.6/√m, speed lag 1.1·m s; turn rate = `turn/√m · tan(bank)`;
  the chase camera follows the heading on its own spring; the overhead camera leads the craft by half a second of travel.
- `plan.steps`: `bank` and `climb` in degrees (targets, not angles), `thr` 0..1 (.5 cruise, .9 boost → trail), `roll: 'left' |
  'right'` starts a roll at the step start (anticipation and settle are in the curve). Values carry over to the next step.
- `F.sample(t)` → `{ x, y, z, psi, bank, phi, th, v, thr, camYaw, bankCmd, rolling, agl, heading }`.

## Cockpit + painter
`P.rect`, `P.px`, `P.line(x0, y0, x1, y1, c, every)`, `P.disc`, `P.ring(cx, cy, r0, r1, c, a0, a1)`, `P.poly`, `P.dither(x, y, w, h, c, density)`,
`P.text(s, x, y, c, k, align, shadow)`; colours are CSS strings or packed. `static` is drawn once into a layer; `live` under it,
`over` on top. Kit: `SK.canopy`, `SK.dash`, `SK.gauge(P, x, y, r, v01, o)`, `SK.attitude(P, x, y, r, s)`, `SK.radar(P, x, y, w, h, s, F)`,
`SK.readout`, `SK.hudLadder(P, s, o)`.
