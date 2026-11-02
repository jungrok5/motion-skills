# Engine and kit API

## The diorama — `const D = PD.create(opts)`
| option | default | |
|---|---|---|
| `W`, `H` | 480, 270 | art size in pixels |
| `scale` | 4 | upscale for the video (render.mjs `--scale` overrides) |
| `loop` | 60 | seconds in one seamless cycle |
| `fps` | 30 | |
| `bg` | `#000000` | cleared each frame |
| `lightGain` | 2.2 | how strongly surface light brightens what is under it |
| `lightStyle` | `'bands'` | `'dither'` = Bayer-dithered steps instead of hard bands |
| `vignette` | 0.35 | dithered darkening toward the corners |
| `flashColor` | `#b9c4ff` | lightning tint |

Layers: `D.add(fn, { static, name })`, `fn(ctx, t, D)`. Static layers run once (with t = 0) and are cached; consecutive
static layers share one cache, so order is kept. `name` lets `?off=<name>` hide it.

Lights: `D.light({ x, y, r, color, power = 1, halo = .35, surface = 1, levels = 6, falloff = 2, style, cone })`.
`x`, `y`, `r`, `power` may be functions of t. `cone = { dir, spread, soft, floor }` (radians; `floor` = light left outside).

Flashes: `D.flash(t => 0..1)` brightens the whole frame (lightning). Post: `D.post((imageData, t, D) => …)` after lighting.

Time (all loop-safe):
- `D.phase(t, period, offset)` → 0..1 sawtooth; `D.wave(t, period, offset)` → −1..1 sine
- `D.noise(seed, t, hz)` → smooth 0..1 value noise; `D.flicker(seed, t, amt, hz)` → ≈ 1 ± amt
- `D.step(t, fps)` → t on a slower frame grid (sprites "on twos"); `D.cycles(period)` → whole repeats per loop
- `D.particles({ n, seed, period: s | [a, b], life: s | p => s, draw(ctx, p, age, k, t) })` → a layer function.
  Each particle repeats with its own snapped period; `p.r1..r4` fixed per particle, `p.h(j)` random per repeat. `life ≤ period`.

Start: `D.start()` appends the canvas, sets the page contract (`seek`, `DURATION`, `FPS`, `PIXEL`, `__ready`) and runs the
live loop unless `?render=1` or `?t=`.

## Raster helpers (`PD.*`, integers only)
`rect(ctx, x, y, w, h, c)` · `px(ctx, x, y, c)` · `line(ctx, x0, y0, x1, y1, c)` (Bresenham) · `disc(ctx, cx, cy, r, c)` ·
`ellipse(ctx, cx, cy, rx, ry, c)` · `poly(ctx, [[x, y], …], c)` (scanline) · `ditherRect(ctx, x, y, w, h, c, alpha)` ·
`ditherDisc(ctx, cx, cy, r, c, alpha, soft)` · `paint(ctx, x, y, w, h, (x, y) => colour | null)` (per pixel, for static areas) ·
`gradient(ctx, x, y, w, h, cols)` · `sprite(ctx, x, y, rows, map, flip)` (character grid, `.` = transparent).
Also `rng(seed)` (`r()`, `r.range`, `r.int`, `r.pick`, `r.sign`), `hash(i, seed)`, `bayer(x, y)`, `ramp(cols, v, x, y)`,
`mix(c1, c2, k)`, `rgb`, `toHex`, `clamp`, `lerp`, `smooth`.

## Props (`K.*`) — call back to front; each returns anchors
| prop | key options | returns |
|---|---|---|
| `sky(D)` | `cols`, `y`, `h` | |
| `stars(D)` | `n`, `seed`, `area` | |
| `moon(D)` | `x`, `y`, `r`, `glow`, `glowR`, `glowColor` | `{x,y,r}` |
| `clouds(D)` | `n`, `seed`, `y:[a,b]`, `w:[a,b]`, `sway`, `cols` | |
| `hills(D)` | `y`, `amp`, `seed`, `cols:[fill, rim]`, `freq` | |
| `mist(D)` | `y`, `h`, `alpha`, `color`, `sway` | |
| `lightning(D)` | `times:[s…]`, `x:[a,b]`, `top`, `bottom`, `strength` | (add before the hills) |
| `aurora(D)` | `y`, `h`, `x0`, `x1`, `cols`, `alpha` | |
| `island(D)` | `x0`, `x1`, `y`, `depth`, `tip`, `seed`, `grass` (ramp: use `PAL.snow` for winter), `stones` | `{x0,x1,y,depth,bottom(x)}` |
| `roots(D, isl)` | `n`, `glow` (share with cyan tips) | |
| `crystal(D)` | `x`, `y`, `h`, `n`, `cols`, `r` | |
| `pond(D)` / `waterfall(D)` | `x0`, `x1`, `y`, `depth` / `x`, `y0`, `y1`, `w` | |
| `house(D)` | `x`, `y`, `w`, `h1`, `h2`, `roofH`, `windows`, `snow` | `{chimney, door, windows, top, left, right}` |
| `smoke(D)` | `x`, `y`, `wind`, `rise`, `life`, `cols` | |
| `lampPost(D)` | `x`, `y`, `h`, `r`, `color` | |
| `campfire(D)` | `x`, `y`, `size`, `sparks`, `wind`, `r` | |
| `tree(D)` | `x`, `y`, `h`, `lean`, `lanterns`, `leaves` | `{tips, segs, lanterns}` |
| `pine(D)` / `snowman(D)` | `x`, `y`, `h`, `tiers`, `snow` / `x`, `y`, `size` | |
| `pumpkin(D)` / `grave(D)` | `x`, `y`, `size`, `face` / `x`, `y`, `w`, `h` | |
| `skeleton(D)` | `x`, `y`, `facing`, `sip` (s), `umbrella`, `scarf` | `{umbrella:{x0,x1,y}}` (pass to rain `shelter`) |
| `bats(D)` / `wisps(D)` | `n`, `y:[a,b]`, `period`, `cross` / `area:[x,y,w,h]`, `n`, `color` | |
| `rain(D)` | `n`, `speed:[a,b]`, `len:[a,b]`, `slant`, `cols`, `shelter:[[x0,x1,y]…]`, `name` | |
| `snow(D)` | `n`, `speed:[a,b]`, `sway`, `cols`, `big`, `name` | |
| `splashes(D)` | `segs:[[x0,x1,y]…]`, `n` | |

## Writing a new prop
```js
K.bench = (D, o) => {
  const { x, y } = o;
  D.add(ctx => {                                   // static: drawn once
    PD.rect(ctx, x, y - 6, 14, 2, K.PAL.wood[3]);
    PD.rect(ctx, x + 1, y - 4, 1, 4, K.PAL.wood[1]); PD.rect(ctx, x + 12, y - 4, 1, 4, K.PAL.wood[1]);
  }, { static: true, name: 'bench' });
  D.add((ctx, t) => {                              // dynamic: a cat's tail, 1 px, every 6 s
    const up = D.phase(t, 6) < 0.15;
    PD.px(ctx, x + 10, y - 7 - (up ? 1 : 0), K.PAL.ink);
  }, { name: 'cat' });
  D.light({ x: x + 7, y: y - 8, r: 12, color: '#ffb04a', power: t => 0.6 * D.flicker(7, t, 0.2, 4) });
  return { seat: [x, y - 6] };
};
```
Randomness: decide shapes with `PD.rng(seed)` *outside* the draw functions. Inside, only `t` and the loop-safe helpers.
