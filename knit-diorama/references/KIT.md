# Kit — engine and prop API

```js
import { Diorama, THREE, PAL, yarn, fuzz, tube, sqNorm, rng, hash, noise1, spring, ease, smooth, clamp, lerp, V, col } from 'knit/knit.js';
import * as K from 'knit/kit.js';
```

## `new Diorama(o)`
| option | default | meaning |
|---|---|---|
| `dur`, `fps`, `W`, `H` | 20, 30, 1920, 1080 | film length and size (`?scale` previews smaller) |
| `half` | 8 | the world is a rounded square (superellipse n = 8) of half-size `half` metres, top at y ≈ 0 |
| `thick` | .35 | slab thickness; the blanket is at y = −thick |
| `knit` | [2, 10] | the knitting window: front grows from −0.3 to past the rim |
| `unravel` | null | `[t2, t3]`: the front shrinks back, props fly back into the ball; sets `loop` |
| `spin`, `lead` | 2.6, .55 | how fast the knitting head circles (rad/s) and how far it runs ahead of the front (m) |
| `ball` | — | `{ color, r:[min,max], home:[x,z] \| null, hover, tail:[[x,z]…], pom, needles }` |
| `blanket` | — | `{ colors:[…], patch, wave, repeat, stitch, seed }` — the patchwork under the world |
| `light` | — | `{ sky, ground, hemi, sun, sunI, sunDir:[x,y,z], ambient }` |
| `bg`, `fogNear`, `fogFar`, `exposure` | `#efe2cf`, 26, 70, 1.05 | background / haze / tone mapping exposure |

### `D.ground({ height, region, mats, seg, side, rim, seams })`
- `height(x, z)` → y; `region(x, z)` → a key of `mats`; `mats` = `{ key: yarn(...) }`. Both are called ~100k times at build:
  keep them cheap (no allocations).
- `seg` (200): grid cells per side. Triangles crossing a region change are split at the exact boundary (bisection), so
  boundaries are smooth at any `seg`; 160–240 is plenty.
- `seams`: `{ color, dash, gap, r, skip:(a,b)=>bool }` or `false`. The split lines are chained into polylines and dressed with
  a running stitch (one instanced mesh).
- `side` / `rim`: materials for the slab's side (rib) and the corded rim (strand), or `rim: false`.
- After `ground()`, `D.groundAt(x, z)` gives the height for props.

### `D.add(obj, { at:[x,z], kind:'pop'|'drop'|'none', rho, height, delay, shadow })`
Registers a prop that is already built at its final place. `rho` (default: its rounded-square radius) is where the knit
front must reach for it to appear; `drop` props fall from `height`. The kit calls this for you.

### Camera, life, rules
- `D.cameraKeys([{ t, yaw, elev, dist, target:[x,y,z], fov }, …])` — degrees and metres around `target`; a monotone cubic
  between keys (equal neighbouring keys hold still, no overshoot).
- `D.onFrame((t, D) => …)` — move things from t alone (boats, smoke, blades). Runs after props are posed.
- `D.check(name, (t, D) => bool)` — a rule `check.mjs` evaluates at every 0.25 s. Built in: every prop has popped by the
  end of knitting; the ball stays above the blanket.
- `D.start()` — sets the page contract and starts the live loop (or one frame with `?render` / `?t`).
- Read-only helpers: `D.phase(t)` (`'ball' | 'knit' | 'done' | 'unravel'`), `D.radius(t)`, `D.ballAt(t)`, `D.pops` (each
  with `tIn` / `tOut` — use them as sound cue times).

## Materials and geometry
- `yarn({ color, stitch, repeat, pattern, color2, sheen, roughness, emissive, flow })` → `MeshPhysicalMaterial`.
  `repeat` = tiles per uv unit (number or `[u, v]`); `flow: [u, v]` slides the maps (water) in uv units per second.
- `fuzz(mesh, { color, length, density, layers, opacity, droop })` → an instanced shell mesh added as a child. `density` is
  fibres per uv unit: ~140 on a tree crown of r 0.5, ~60 on a small pom-pom. Needs uv + normals.
- `tube(points, r, { seg, radial, closed })` — a Catmull-Rom tube; uv.x runs along it (use `stitch: 'strand'`).
- `sqNorm(x, z)` — the rounded-square norm (1 on the world's edge when divided by `half`).

## Props (`K.*`, all take `D` first and `{ at:[x,z] }`)
| prop | options |
|---|---|
| `tree` | `crown, trunk, size, shape:'round'|'tall'|'double', stitch, seed` |
| `pine` | `color, size, tiers, pom` |
| `bush` | `color, size, seed, berries` |
| `flowers` | `n, spread, colors:[…], height, seed` (one instanced cluster) |
| `rock` | `color, size, seed` |
| `cottage` | `rot, w, d, h, wall, wallPattern, wall2, roof, door, smoke, size` |
| `lighthouse` | `h, r, c1, c2, beam, period` |
| `windmill` | `rot, h, color, sail, cap, speed` |
| `boat` | `rot, hull, sail, sail2, size, seed, drift` |
| `wave` | `rot, len, color, seed` (a white crest on the water) |
| `pier` | `to:[x,z], wide, color, y` |
| `cloud` | `y, size, color, seed, rho, drift` (drops in) |
| `fence` | `path:[[x,z]…], color, every` |
| `puffs(D, parent, fromV3, { n, period, rise })` | rising smoke on any group |
| `scatter(n, { seed, half, ok, gap })` | positions for trees, bushes, rocks |

## Writing a prop
```js
export function haystack(D, o = {}) {
  const { at = [0, 0], color = PAL.butter } = o;
  const g = new THREE.Group(); g.name = 'haystack';
  const m = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                           yarn({ color, stitch: 'garter', repeat: [10, 3] }));      // ~0.3 m tiles
  m.castShadow = true; g.add(m);
  fuzz(m, { color, length: .04, density: 120 });                                     // soft → fuzz
  g.position.set(at[0], D.groundAt(at[0], at[1]) - .02, at[1]);                      // built where it stands
  D.onFrame(t => { m.rotation.y = .05 * Math.sin(t); });                              // life from t only
  return D.add(g, { at });                                                           // pops when the front arrives
}
```
Build at the final place, give every mesh a `yarn()` material sized with ~0.3 m tiles, add fuzz only to soft round
parts, animate in `onFrame` from t, register with `D.add`.
