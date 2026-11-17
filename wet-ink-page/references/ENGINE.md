# ENGINE — lib/wet-ink.js

One file (~1000 lines), on top of `lib/hic.js`. `WetInk.start(config)` turns a page into wet ink and returns the API (also
`window.__hic.ink`). If HTML-in-Canvas or float render targets are missing it calls `HIC.fallback` and returns `null`: the
same HTML becomes an ordinary page (hide nothing the page needs; the engine hides the Settle button).

## Page contract
```html
<canvas id="stage" layoutsubtree content="drawable"><main id="page" drawable> … </main></canvas>
<script src="lib/hic.js"></script><script src="lib/wet-ink.js"></script>
<script> window.INK = { … }; WetInk.start(window.INK); </script>
```
- `#page` is exactly one window (`100vw × 100vh`, `overflow: hidden`), background = the paper colour. It is uploaded as one
  texture on paint (never per frame) at window size × devicePixelRatio (≤ 2).
- Print darker than the paper (it is treated as absorbance). Lighter print lifts a little; for a white pigment use `cover`.
- Mark one text field `data-hic-edit` and one button `data-hic-click` (the shared checks click them through the warp).
- Add `body:has(.hic-fallback){overflow:auto}` and `.hic-fallback #page{height:auto;min-height:100vh}` for the fallback.
- `#still=<t>`: the page as the idle demo leaves it t s after load, computed in fixed steps (deterministic). `#calm` (or
  reduced motion): no demo, no hover stir, quick settle. `#fallback`: the plain page. `#q=0.5`: canvas resolution.

## Config (WetInk.defaults has every field with a comment)
| key | default | meaning |
|---|---|---|
| `canvas`, `page` | `#stage`, `#page` | elements |
| `paper` | page background | paper colour |
| `pigments` | `input[name=pigment]` | radio inputs with `data-color`, optional `data-cover`, `data-name`; `value="none"` = water (stir only). Or an array `[{name, color, cover}]`. ≤ 8 |
| `viscosity` | `{input, value .6, damp [.5, 4.2], radius [.035, .085]}` | bound range input 0–100; damping per s and drag radius (h) thin → thick |
| `comb` | `{teeth 1, spacing .035, push .62, cap 4, ribbon .024, swell .75, threads .5, marker 9}` | tines, how hard the bath follows, ribbon width and swell, comb threads |
| `drop` | `{radius .05, rings 0, spread 1, bloom .45}` | a press without a drag |
| `hover` | `.2` | stir from a passing mouse (0 = off) |
| `look` | `{grain 1, rim .3, thin .45, vein .4, sheen .35, halo .55, vignette .08, markInk}` | the ink's surface |
| `settle` | `{key 'Escape', button, idle 14, min 1.1, max 4.2}` | rewind triggers and length |
| `demo` | `null` | `{delay, again, steps:[…]}` — steps below |
| `sound` | `null` | `{toggle: '#sound', labels: [off, on], volume}` — synthesised swish, plip, settle sweep |
| `on` | `{}` | hooks `stir()`, `drop(u, v)`, `settle()`, `pigment(i, name)`, `type()`, `resize()` |
| `acts` | `{}` | `name: function (ink) { … }` scripted states for stills |
| `probe` | first child | element used by `S.probe` to find the hit-test mode (use the headline) |
| `quality` | `'auto'` | steps the canvas (not the page texture) down to .75 / .5 on a slow machine |

Units: **h** = fractions of the page height. Positions in demo steps and API calls are page fractions `[u, v]`.

### Demo steps
`{ at, to, path, gain?, lay? }` a ghost stroke from `at` to `to` s · `{ at, drop: [u, v], radius?, rings? }` ·
`{ at, type: 'text', into: '#field', rate? }` · `{ at, pick: '#radio' }` · `{ at, settle: true }`.
At the end the demo puts back what it typed and picked (unless the user changed it). Any real input stops it.

### Paths
`WetInk.path.line(x0,y0,x1,y1)`, `.wave(x0,y0,x1,y1,amp,waves)`, `.spiral(cx,cy,r0,r1,turns,start)`, `.loop(cx,cy,r,turns)`,
`.zigzag(x0,y0,x1,y1,n)` — each returns `function(asp) → [[u,v]…]` (radii in h, so circles stay round). Or pass an array.
Strokes follow a Catmull-Rom through the points with ease-in-out.

`WetInk.fitText(el, {min, max, maxHeight})` fits a headline (call after its text changes and on resize).

## API (returned, and `window.__hic.ink`)
| call | does |
|---|---|
| `state` | `{W, H, atRest, flowing, rewinding, keys, maxShift (px), stain, pigment, pigments, viscosity, demo, stats}` |
| `stroke(pts, {steps 60, coast 0, gain 1, lay true})` | a synchronous stroke (stills, checks) |
| `drop(u, v, {radius, rings, spread})` | a drop, bloomed fully |
| `run(n)` · `settle()` · `finish()` | n steps · start the rewind · run it to the end |
| `reset()` · `pick(i)` · `viscosity(v)` · `demo(false)` · `act(name)` | |
| `toPage(x, y)` · `screenAt(px, py)` | screen ↔ page (CSS px) through the CPU map |
| `__hic.screenOf(el)` | where an element's centre is drawn now (checks click there) |

## The pipeline (per 1/60 s step)
1. `splat` each pointer (user, ghost): a gaussian velocity splat along the segment for every tine; lay a ribbon (MAX blend)
   through the map if the hand is pressing.
2. Drops bloom: `bloom` pass applies an area-preserving radial push in small increments.
3. While flowing: advect velocity (damped), divergence, 20 Jacobi iterations, gradient subtract, carry the map.
4. Every `keyEvery` steps push a 128-px-high snapshot of the map (≤ 90; when full, keep every other and halve the rate).
5. Rewind: replay snapshots backwards (B-spline upsampled, eased in-out cubic); pigment fades in the second half.
6. Read back a 150-px-high copy of the map (async PBO + fence; blocking for the API) → `S.placeLocal` at the pointer.
7. `show` draws when something changed.

## Adding behaviour in a project (without touching lib/)
- **New stroke shapes**: write a path function `function (asp) { return [[u, v], …]; }` and use it in demo steps or acts.
- **Patterns** (marbling "nonpareil", "bouquet"): an act that runs several strokes in a row (`ink.stroke(P.zigzag(…))`, then
  a comb of more tines by setting `ink.cfg.comb.teeth = 7` before the next stroke — the config object is live).
- **Topic events**: `on.drop`, `on.stir`, `on.settle` hooks tick a checklist, count pours, play a page sound.
- **A new ink surface**: copy `lib/wet-ink.js` into the project's `lib/` (the project is self-contained) and edit `FS.show`;
  keep the absorbance model so pigments and print stay one material.
