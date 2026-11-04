# KIT — API

`import { Film, THREE, KIT, lin, smooth, smoother, clamp01, rng } from "essay/film.js"`

## Film
```js
const F = new Film({ brand: { title, sub }, score, W: 1920, H: 1080, fps: 30, grain: .06, vignette: .35, tail: 1.2, fadeIn: .6 });
F.chapter({ from, n, title, en });
const L = F.say([{ text, en, accent: ["word"], pause, dur, cps }], { from, gap: .55 });   // → [{ from, to, … }]
F.set(name, (S) => { …; return { objectsTheShotsMove }; }, { fogNear, fogFar, bg, fog, sun: { az, el }, shadowR, shadow });
F.shot({ from, set, light, cam, update: (lt, objects, t, set) => {}, xfade, dip, sun, exposure, chrome: "ink" | "pale" | false });
F.callout({ set, from, to, at: [x, y, z] | (lt) => [x, y, z], text, en, dx, dy });
F.card({ from, to, title, seal, en, sub, footer, stroke });
F.overlay({ from, to, draw: (g, lt, k, W, H, s, chrome, tone) => {} });   // your own 2D drawing on the chrome layer
F.start();
```
- `cam`: `{ path: [[x,y,z]…], look: [x,y,z] | [[…]…], fov: n | [a, b], roll: n | [a, b], ease: "glide" | "inout" | "linear" | "in" | "out" }`
  or a function `(lt, u) => ({ pos, look, fov })` (orbits). Paths are centripetal Catmull–Rom, arc-length timed.
- Shots tile the timeline: a shot's `to` is the next shot's `from`; the last ends at the film's end (last line + tail,
  or the card's end).
- `F.project([x, y, z])` → screen px (for overlays that follow a 3D point).

## Set builder `S`
Every kit builder is bound: `S.hall({...})` builds, adds to the set, sets shadows and registers its ticks.
`S.add(obj)`, `S.mesh(geo, matOrColor, at)`, `S.tick((t, cam) => {})`, plus `S.mat`, `S.MAT`, `S.merge`, `S.bar`,
`S.taperTube`, `S.latticeSegments`, `S.mountainGeo`, `S.THREE`, `S.KIT`. All builders take `at: [x, y, z]`, `rotY` (deg).

### Landscape
| builder | options |
|---|---|
| `inkMountains` | `n, x: [a, b], z: [near, far], h: [min, max], seed, ink, wash, mist, mistY, mistSoft, strength, sharp, round (0 pointy karst – 1 rounded), aspect, base, light` |
| `mistSea` | `y, color, size, drift, seed` — the paper-white sea that hides the mountains' feet |
| `mistBanks` | `n, x, z, y, size, color, opacity, drift` — soft drifting billboards |
| `islet` | `r, seed, rocks, color` · `pine` `h, seed, lean, tiers, trunk, needles` · `boat` `len, drift, color` |
| `water` | `w, d, color, ripple, opacity` · `moon` `r, color, halo, haloOpacity` |

### Plants and stones
`bamboo({ n, x, z, h, color, dark, leafColor, leaves })` · `tree({ kind: "plum" | "cherry" | "maple" | "bare", h, seed, color, trunk, depth })` ·
`rock({ kind: "scholar" | "boulder" | "slab", size, seed, color })`. Foliage sways with the film clock (`KIT.WIND`).

### Architecture
| builder | options |
|---|---|
| `floor` | `w, d, kind: stone · wood · gravel · earth · grass · moss · raked, color, tile` |
| `platform` | `w, d, h, steps, stepW, color, top, topColor` |
| `roof` | `w, d, rise, lift (corner lift), hip (0 pyramid … 1 gable), sag (concavity), flare, color, under, ridge` |
| `hall` | `w, d, h, bays: [nx, nz], base, overhang, lift, hip, sag, rise, colColor, lacquer, beamColor, roofColor, under, floor, floorColor, steps, sides: { front, back, left, right }: "open" · "lattice" · "wall" · "rail" or per bay [..], pattern, cell, glow, wallColor, latticeColor` → `userData.cols, top` |
| `wall` | `len, h, thick, color, cap, capColor, base, openings: [{ shape: moon · rect · gourd · octagon, x, y, w, h, lattice, paper, seed }]` |
| `lattice` | `w, h, pattern: grid · tti · diamond · ah · ice · rings, cell, bar, depth, color, paper, paperColor, glow, glowColor, segments (your own [[x0,y0,x1,y1]…])` → `userData.setGlow(k)` |
| `railing` | `len, h, color` · `table` `kind: low · tall, w, d, h, color, legColor, leg` |

### Objects
| builder | options |
|---|---|
| `vessel` | `shape: bowl · cup · moonjar · vase · jar · plate · censer · [[r, y]…] (your profile, height 1), h, width, glaze: celadon · white · ivory · black · ash · onggi · blue · "#hex", crackle, speck, rough, wobble, seam, seed, open, fill: { level, color }` |
| `zither` | `len, w, t, strings, bridges (movable, gayageum / koto), hui (guqin studs), color, stringColor, stringGlow` |
| `censer` | `h, color` → `userData.top` · `smoke` `h, w, color, opacity, seed` |
| `lantern` | `r, h, color, glow, paperColor, ribColor, light, lightPower, range` → `userData.paper` |
| `panel` | `w, h, draw: (g, w, h) => {}, key, bg, scroll, px` (a painting, calligraphy, a sign) |
| `assembly` | `parts: [{ size, at, dir, color }]` → `userData.explode(k)` · `brackets` `tiers, size, color` (a dougong / gongpo set) |

### Light and particles
`ribbons({ n, x, y, z, paths, color, width, speed, glow, seed })` → `userData.reveal(k)` ·
`dust({ n, x, y, z, color, size, rise, opacity })` · `fall({ kind: "rain" | "petals" | "snow", n, x, y, z, color, speed, size, opacity })`.

### Materials and textures
`mat(color, { rough, metal, map, emissive, glow, emissiveMap, side, flat, vc, transparent, opacity, alphaTest, env })`,
`flat(color, {...})` (unlit: seals, glows), `MAT.wood(color, repeat) · lacquer · plaster · stone · tiles · bronze · ink`.
`lib/tex.js`: `wood, stone, ground, raked, plaster, tiles, paper, glaze, bronze, bark, mist, leaves, blossom, dot,
painted(key, w, h, draw)`; `rng, vnoise, fbm` for your own.

## Score (`lib/score.js`)
`export const score = (F) => ({ tonic: "E", scale: "pyeongjo", bpm: 52, seed, reverb: .65, gain, end, sections: [{ at, mood, gain }], hits: [{ at, kind, deg, gain, dur, slide }] })`
- moods: `mist` (wind, sparse plucks) · `walk` (zither phrases) · `flow` (zither + flute, fuller) · `flute` (flute lead) ·
  `still` (bells, breath) · `night` (low plucks, wind) · `close` (a run up to the tonic + bell) · `silence`; a drone
  under every mood but `close`.
- hits: `bell · gong · chime · pluck · drum · wood · swell · rain · wind · water`.
- scales: `gong shang jue zhi yu` (Chinese), `pyeongjo gyemyeonjo` (Korean), `in yo ryukyu` (Japanese),
  `major dorian aeolian lydian hijaz`.
