# Engine and kit API

```js
import { Illusion, THREE, rng, lerp, smooth, clamp01 } from "illusion/illusion.js";
import { kit } from "illusion/kit.js";
const F = new Illusion({ sun: { az, el }, look: { … }, shadowReach, shadowCenter, fps, blur: { mink, maxk, step } });
const K = kit(F, { seed });
await K.fonts();          // before any label
… build …
F.shots({ … }); F.keys([[0, "flat"], …, [10000, "flat"]]); F.start();
```

## Illusion (`F`)
| call | does |
|---|---|
| `F.mat(color, { map, ink, glow, side, opacity })` | the cached flat-colour material (`ink` 1 / 0.5 / 0, `glow`, `side: "double"`) |
| `F.add(obj)` | add to the scene root (kit pieces add themselves to the current group) |
| `F.keep(obj)` | keep it out of the static merge (anything moved in `update`) |
| `F.swap(obj, row, diag)` | a swap object: `{ x, y, z, ry }` at lay 0 and lay 1; scaled by the shot's `cs` |
| `F.update((ms, F) => …)` | set moving things from ms (never accumulate) |
| `F.cycle(ms, n)` | phase [0, 1) with n whole cycles per loop |
| `F.shots({ name: shot })`, `F.drift(name, { W: .96, x: .1 })` | shots and their breathing variants |
| `F.keys([[ms, name \| shot], …], { scale })` | the timeline: first at 0, last = loop length, last shot = first shot |
| `F.shotAt(ms)`, `F.rig(s)`, `F.place(s)` | the interpolated shot, where its camera stands, set the camera |
| `F.start()` | merge, lights, passes, the contract, the live player (unless `?render=1`) |
| `F.check()` | the timeline rules (check.mjs prints them) |

Options: `look` (references/LOOK.md: `ink`, `line`, `shade`, `hatch`, `hatchPitch`, `shadeAt`, `groundLine`, `vignette`,
`sky: { zenith, horizon, low, cloud, clouds, cloudScale, seed }`), `sun: { az, el }` (az 0 from behind the camera, + from
the right, 180 from behind the scene), `shadowMap` (4096), `shadowReach`, `shadowCenter`, `shadowBias`, `bounds`
(clip the box near / far and probes use), `fps`, `ss` (supersampling), `blur`.

## The page contract
| hook | what it does |
|---|---|
| `#frame` | the canvas |
| `window.READY` (`__ready`) | true once built and the first frame is drawn |
| `window.render(ms)` | draws frame ms (one render, current jitter) |
| `window.renderMany([[ms, jx, jy], …])` | averages several renders on the GPU in one call |
| `window.probe(ms)` | screen positions `[x, y, ndcZ]` (px at 1920 × 1080, centre 0) of a grid of scene points |
| `window.setJitter(x, y)` | sub-pixel lens offset in px (projection elements 8 and 9) |
| `window.frame(ms, { fps, mink, maxk, step })` | one finished frame: jitter AA + adaptive motion blur; returns the render count |
| `window.seek(t)`, `LOOP`, `DURATION`, `FPS`, `film` | seconds-based seek and the loop facts |
| query | `?render=1` (no player) · `?scale=.5` · `?ss=1.5` · `?t=2.4` · `?fps=60` · `?autoplay=1` |

Everything animated is a pure function of ms, periodic in `LOOP`.

## Kit (`K`) — metres, y up, things stand on y; colours are CSS strings or `F.mat` materials
Primitives: `K.box(w, h, d, c, x, y, z, { rx, ry, rz, ink, map, glow, noCast })` · `K.cyl(r, h, c, x, y, z, { rt, seg })` ·
`K.ball(r, c, x, y, z, { s: [sx, sy, sz] })` · `K.tube(points, r, c)` · `K.wire(a, b, { sag, r })` (no shadow by default) ·
`K.quad(w, h, c, x, y, z, { ry, map, double })` (vertical, facing +z) · `K.slab(x0, x1, z0, z1, c, y)` (horizontal) ·
`K.prism(outline2D, depth, c, x, y, z)` (roofs, ramps, ballast).
Groups: `K.group({ x, y, z, ry, s, name }, () => { … })` builds inside a new group; `K.into(g, fn)`.
Textures: `K.tex(w, h, (g, w, h) => …, { rep })` · `K.label(text, { w, h, bg, fg, font: "latin" | "kr", size, lines, border, round })` ·
`K.ground({ x0, x1, z0, z1, y, ppm, base, paint: (g, P, rand) => … })` — one plane painted in metres (`P.x`, `P.z`, `P.s`):
markings go on it, never stacked as planes · `K.asphalt(g, P, rand)`.
Signs: `K.sign({ x, y, z, w, h, ry, text | map, bg, fg, font, frame, post, both })` ·
`K.roadSign({ x, z, ry, shape: round | tri | diamond | rect | octagon, size, face: (g, w) => … })`.
Pieces: `K.building({ x, z, ry, w, d, floors, storey, color, trim, glass, win: { cols, side, back }, ac, pipes, bands, roof: { parapet, tank, rail, antenna, slope }, shop: { color, shutter, awning, sign, signBg, signFg, font }, door })` (front at local +z) ·
`K.ac(x, y, z, ry)` · `K.pole({ x, z, h, ry, transformer, lamp, plate })` → `{ group, tops }` · `K.wires(poles, { pick, sag })` ·
`K.cone({ x, z, c })` · `K.vending({ x, z, ry, c, label })` · `K.bin` · `K.fence({ x0, x1, z, h, gap })` · `K.guard({ x0, x1, z })` ·
`K.mirror` · `K.tree({ x, z, h, r, c })` · `K.planter` · `K.bench({ x, z, ry })` · `K.car({ x, z, ry, c, kind: kei | sedan | van, plate })` ·
`K.lamp({ x, z, h })` · `K.bike`.

## Making new pieces (in the scene file)
```js
const mast = (x, z, dir) => K.group({ x, z, name: "mast" }, () => {
  K.box(0.32, 7.4, 0.32, "#8e949c", 0, 0, 0);
  K.tube([[0, 6.8, 0], [dir * 2.8, 6.65, 0]], 0.045, "#7a8088");
});
```
Build at true scale; give every box trim, seams, a base or a label; keep separate surfaces either merged or at least a few
centimetres apart; texture text with `K.label` (`ink: 0.5`). The example's `track`, `mast`, `canopy`, `nameBoard`, `train`
are written this way.
