# ENGINE — API

```js
import { Film, keys, win, env, clamp, lerp, hash, rng, bezPart, sCurve, ease, fmt } from 'lg/film.js';
import { stack, binaryTree, chain, fan, converge } from 'lg/lineage.js';
```

## Film (lib/film.js)
| call | does |
|---|---|
| `new Film({ dur, fps = 30, center = [540, 1238], palette, bloom = .85, grain = .05, dust = 1, fadeIn = .8, fadeOut = 1.5, score })` | the film |
| `F.camera([[t, {x, y, zoom}, ease?], …])` or `F.camera(t => ({ y, zoom }))` | the camera. `y` is the world row seen at `center`; zoom < 1 pulls back. Helper: `look = (wy, Y, z) => ({ y: wy - (Y - center[1]) / z, zoom: z })` puts world row `wy` at screen row `Y` |
| `F.world((g, t, film) => …)` | a world layer, drawn additively with the Glow painter |
| `F.overlay((ctx, t, film) => …)` | screen-space drawing after bloom (rare) |
| `F.caption(t0, t1, '줄 하나\n*금색* 줄 둘', { y = 330, size = 46, fi = .5, fo = .5 })` | a caption |
| `F.counter({ t0, t1, steps: [[t, value, label?], …], label, format = fmt, gold: t, y = 275, size = 96 })` | the counter; each step blurs in |
| `F.axis(t0, t1, [[worldY, '기원전 약 1000년'], …] or t => ticks, { x = 52, top = 470 })` | grey ticks pinned to world rows |
| `F.words(t0, t1, [{ text, x, y }], { size = 34, stagger = .3, drift = 14 })` | words that drift and blur away |
| `F.beat(name, t0, t1)` | a named stretch (sheets, check output) |
| `F.check(name, t => bool)` | a rule check.mjs samples |
| `F.start()` | load fonts, set the contract, play or render |

## Glow painter `g` (lib/glow.js): world coordinates, root at (0, 0), up is −y
| call | does |
|---|---|
| `g.curve([p0,p1,p2,p3], { a, w = 2.2, on = 1, u0, u1, tip, halo = true, fixed })` | a glowing cubic; `u1 < 1` grows it; `on` 0 = grey |
| `g.link(child, parent, o)` | the S-curve between two nodes |
| `g.line(x0, y0, x1, y1, o)` | a straight glowing line (brackets) |
| `g.fibers(curves, { a = .1, w = 1, halo, on })` | hundreds of thin curves in one stroke (fast) |
| `g.node(x, y, { r = 6, a, on, flare })` | a node sprite; `flare` adds a bloom |
| `g.flare(x, y, R, a, 'flare' / 'soft')` | a soft light of screen radius R |
| `g.horizon(y, { a, haze = 120, w = 2.5 })` | full-width glowing line with haze above |
| `g.label(x, y, text, { size = 28, dx, dy, align, color, glow, a })` | fixed-size label pinned to a world point, drawn after bloom |
| `g.spark(curve, u, o)` | a glint travelling along a curve |
| `g.cached(key, box, res, painter)` / `g.stamp(entry, { a, clip })` | paint a heavy region once, stamp it every frame |
| `g.X(x) g.Y(y) g.wx(sx) g.wy(sy) g.visibleY(y)` | world ↔ screen |

## Shapes (lib/lineage.js)
| call | gives |
|---|---|
| `stack({ first = 260, ratio = .82, min = 6 })` | `y(k)`: generation rows, packing toward a band |
| `binaryTree({ y, half?, slope = .78, explicit = 8, fibres = 420, seed })` | `.pos(k,i)`, `.link(k,i,side)`, `.draw(g, { grown, a, on: k=>…, onNode: (k,i)=>…, nodes, rows, labels: {'k,i': text}, fade })`. Near generations are drawn one by one, far ones as sampled fibres + a bright row |
| `chain(n, { y: i=>…, x: i=>…, k = .5 })` | `.pos(i)`, `.link(i)`, `.draw(g, { grown, down, a, on, w, linkW, linkA, nodeR, flare, labels, labelA, side, labelSize, labelColor, labelGlow, fadeTop })` |
| `fan({ from, n, to: (j, r) => [x, y], lift, seed })` | an array of curves from one point |
| `converge(curves, point, u, bulge)` | the same curves drawn into one point (lantern shape) |

## Score (lib/score.js)
`renderScore(SCORE, sampleRate, dur) → [Float32Array L, R]`. SCORE keys: `pad [[t, dur, [midi…], vel]]`,
`bell [[t, midi, vel]]`, `sub [[t, dur, midi, vel]]`, `rise [[t, dur, vel]]`, `hit [[t, vel]]`,
`shimmer [[t0, t1, vel, perSecond]]`, `tick [[t, vel]]`, `air [[t0, t1, vel]]`, `gain`, `reverb`, `key`, `scale`.
Aim for a WAV peak of .7–.9 (`score.mjs` prints it); raise `gain` if it is quiet.

## Core (lib/core.js)
`keys`, `steps`, `win(t, a, b, ease)`, `env(t, t0, t1, fi, fo)`, `ease.*`, `rng(seed)`, `hash(a, b, c)`, `noise1`,
`bez`, `bezPart`, `bezSeg`, `sCurve(child, parent, k)`, `fmt`, `rgba`, `mixc`.
