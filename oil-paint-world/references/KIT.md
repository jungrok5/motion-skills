# KIT — the world, its things and its shots

```js
import { World, pal, mix3, noise, fbm, sm, lerp, rng } from 'opw/world.js';
import * as kit from 'opw/kit.js';
import { Figure } from 'opw/figure.js';
```
Units are metres; y is up; a bearing (`az`) is a compass angle with 0 toward −z and 90 toward +x.
A palette is three mixes: `pal(light, half, shade[, own])` (hex strings or `[r, g, b]`, written as they should look —
nothing is converted) or `mix3(colour, { into, deep })` which derives the half-tone and a shade pulled toward `into`
(a cool violet unless given). `own` is the colour a carried lamp brings out.

## World
```js
const W = new World({
  name, seed, extent: 96,                 // the land map covers ±extent m; keep the way inside 0.9 of it
  sun: { az: 318, el: 27 },               // or { dir: [x, y, z] }
  wind: { az: 80, strength: 0.7 },        // where it blows toward; 0 still … 1.5 a gale
  air: { haze, sun, glow, density },      // colour of distance · of distance toward the sun · added round the sun · 0.004 clear … 0.012 mist
  glaze: { mul, add },                    // the wanderer's shadow: the ground's paint × mul + add (a plum over gold, a green over grass)
  bounce,                                 // light the ground throws up into shade (the ground's light colour, very dark)
  finish: { shafts: 0…1, steps, reach, glow, canvas: 0…1, varnish: 0…0.4, samples },
  shade: { size: [2048, 2048], box: [w, h], centre },   // the picture of the still world's shade, as the sun sees it
  open: 1,                                // beyond that picture: 1 open sun, 0 broken patches (a wood with no end)
  impasto: 1, clear, lamp, fps, size, ui: { film, walk, hint },
});
W.way([[x, z], …]);                       // a smooth line through the points; W.wayAt(s) → { x, z, hx, hz }, W.wayDist(x, z), W.wayLen
W.land({ height: (x, z) => m, cover: (x, z) => [r, g, b, a] });   // baked; W.groundAt(x, z), W.coverAt(x, z)
W.add(thing); W.figure(new Figure({…})); W.shots([…]); W.check(name, (W) => 'what is wrong' | falsy); W.start();
```
Call `way` before `land` (the cover usually asks `wayDist`), `land` before anything that stands on it, `figure` before `shots`.

## Things — `W.add(kit.…(W, {…}))`, far to near
| thing | what it paints | options |
|---|---|---|
| `sky` | a dome of broad level strokes over a flat underpaint | `zenith`, `horizon`, `glow`, `glowSize`, `n` (2600), `clouds: { pal, amount 0–1, scale, drift, low }`, `disc: { colour, size°, dir }` (the sun, or a moon with `dir`), `stars`, `starColour` |
| `ranges` | far hills, rows laid far to near, each a silhouette with strokes down its flanks | `rows: [{ dist, height, base, pal, haze 0–1, rough, seed, arc: [from°, to°], snow: { above 0–1, pal } }]`, `centre` |
| `water` | a level of long strokes wherever the land is below it: gives back the sky seen low, glints toward the sun, takes the world's shade | `level`, `deep`, `sky`, `shallow`, `glint`, `flow: [x, z]`, `speed`, `stroke`, `per`, `n`, `cell0`, `levels` |
| `ground` | the carpet: dabs lying flat, with the land in flat paint under them | `covers: [{ pals: [pal, …] }, …]` (the base, then one for each of the masks r, g, b; each with 1–4 palettes that lie in drifts), `size`, `per` (3 dabs a square), `n` (160), `cell0` (0.14 m), `levels` (6), `patch` (m), `sunny`, `wet`, `rough` |
| `growth` | clumps standing on the ground: blades, fronds, flower heads | `kinds: [{ pal, tall: [a, b], wide, fan, mark: 'blade'·'frond'·'curl'·'dab', share, mask: 'g'·'!b'…, drifts 0–1, stiff 0–1, head: { pal, size } }]` (≤ 8), `density`, `offWay`, `per`, `n`, `cell0`, `levels`, `name` |
| `trees` | trunks and limbs (underpaint + bark strokes) and crowns of leaf dabs; casts the shade | `kinds: { name: { trunk: { pal, r, h, lean, bark: 'long'·'band', scar, moss }, crown: { shape: 'round'·'column'·'cone'·'flat'·'bare', pals, spread, from, limbs, leaf, dense, dark, shade, through } } }`, `at: [{ x, z, kind, scale, hero }]`, `scatter: { grid, fill, kind(x, z, rand, wayDist) → name·null, offWay, reach, vary }`, `tiers: [full, some]`, `sway` |
| `solid` | paint on any triangles: lying strokes along a grain over an underpaint; casts shade | `(W, mesh·group·[meshes], { pals, size: [across, along], density (strokes/m²), grain: 'up'·'across'·[x,y,z], collide: [{x, z, r}], cast, cells, rough, name })` — each mesh's `userData` may set `pal`, `grain`, `size`, `density` |
| `shape` | meshes to build with, origin at the base: `box(w, h, d, o)`, `cyl(rTop, rBot, h, o)`, `cone(r, h, o)`, `ball(r, o)`, `gable(w, h, d, o)`, `boulder(r, o)`, `of(geometry, o)` | `o: { pal, at: [x, y, z], ry, rx, rz, grain, size, density, sides, seed }` |
| `flecks` | what falls or drifts round the wanderer | `n`, `pals`, `size`, `box: [w, h, d]`, `fall` (m/s, negative rises), `drift`, `sway`, `spin`, `additive` |
| `dabs` | your own still dabs (PAINT.md) | `count`, `attributes`, `head`, `body`, `minPx`, `maxPx`, `cells`, `additive`, `lod`, `shade` |

Notes
- **Masks.** `ground` paints cover 1 where `r` is, 2 where `g`, 3 where `b`. `growth` kinds take `mask: 'g'` (only
  there) or `'!b'` (not there) and all keep off the way (`offWay`). Use `a` for anything of your own.
- **Trees** near the way (`tiers[0]`) are painted in full, those behind with fewer, larger touches. Blossom is a round
  crown with pale palettes, `dense` 100+, `leaf` 0.2, a light `dark`. A conifer is `cone` (its strokes hang). A poplar
  or cypress is `column`. Winter is `bare`. `hero: true` gives one tree three times the paint.
- **Solids.** Build with `kit.shape`, put each on the ground (`at: [x, W.groundAt(x, z), z]`), give walls `grain: 'up'`
  (boards, plaster) or `'across'` (courses of stone, planks of a deck) and roofs a grain down the slope. A GLB works the
  same: load it, place it, set `userData.pal` on its meshes (read `references/3D-MODELS.md` at the repo root first; its
  textures are ignored — colour comes from the palettes).
- **How much paint.** `ground` at its defaults is 460,800 dabs, `growth` 221,184, a wood of 150 trees ~200,000; about a
  third are in view. `?q=.5` halves everything for previews. On the CPU a frame costs ~15 µs a dab in view.

## Shots
```js
W.shots([{ name, dur, walk: [from, to], ease: 'linear'·'in'·'out'·'inout', look: [x, y, z], figure: true·false·'off-screen',
           cam: { …key } | { from: { …key }, to: { …key }, ease: 'inout' } }, …]);
```
`walk` is in metres along the way (left out: they stand where the last shot ended; `to < from` walks back).
A camera key is one of
- **round the wanderer**: `{ back, side, up, yaw, look: [side, up, ahead], fov }` — the eye `back` metres behind them
  (turned `yaw` degrees round them: 0 behind, 180 in front, +90 on their left, −90 on their right), `side` metres to its
  own right, `up` above their feet; it looks at a point given from their feet.
- **staying put**: `{ at: [x, up, z] }` or `{ way: [s, side, up] }` (a point of the way, `side` metres to its right,
  `up` above the ground) — a tripod they walk past — with `look` as above or `lookAt: [x, y, z]` in the world.
`from` and `to` are blended over the shot. The eye is kept 0.3 m above the ground; the check fails an eye inside a
collider or inside the wanderer, and a shot where they leave the picture.

Useful eyes: behind `{ back: 5.2, up: 1.8, side: 0.8 }` · low and behind `{ back: 4.5, up: 1.0 }` · in profile
`{ back: 5.5, up: 1.4, yaw: -88 }` · ahead looking back `{ back: 4.5, up: 1.3, yaw: 160 }` · in the grass
`{ way: [s + 6, 2, 0.45], fov: 40 }` · looking up at something `{ way: […], lookAt: [x, y + 10, z] }`.
