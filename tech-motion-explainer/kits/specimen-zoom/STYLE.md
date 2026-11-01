# specimen-zoom — 표본 속으로 들어가기 (Canvas 2D)

A short (20–40 s) vertical film that tours the parts of one specimen: a painted **cutaway overview**, one **close-up plate**
per part, and a camera that pulls back to the overview and pushes into the next part every couple of seconds — under a
sci-fi **HUD** (frosted panels, live pill, typed caption card, locator, data rows). Everything is drawn in Canvas 2D from
seeded noise, so no image generator and no photos: the same `t` always gives the same frame.

Worked example: `../../examples/plant-cell/index.html` — a plant cell, 14 shots × 2 s, 9:16 (shorts) and `?ar=4:5` (feed).
Recreated from a reel whose pictures were AI-generated stills; here every picture is code.
Template on a different subject: `template/index.html` — a cylindrical battery cell, 5 shots.

## When to use it
- **Use it for** "what is inside X" pieces with 4–15 named parts in one place: a cell, an organ, a seed, a battery, a chip
  package, a watch movement, a volcano, a city block. Each part earns one shot, one fact card and one zoom number.
- **Don't use it for** processes over time, comparisons or flows (use the 2D template or `zoom-levels` for a real nesting with
  motion inside the levels). The kit shows *where things are and what they look like*, not how they interact.

## The look, and the techniques that make it
| technique | kit call | what it fakes |
|---|---|---|
| lit from the top-left everywhere | `sphere`, `body`, `tube` | one light direction is what makes flat shapes read as 3D |
| inner shadow + inner rim | `innerShadow(g, path, colour, blur, dx, dy)` | thickness of a membrane or shell, a concave cavity |
| tube = 4 offset strokes (dark → base → light → glint) | `tube(g, path, w, rgb, { hl })` | folds, cristae, cisternae, cables, ridged edges |
| fibre band: hundreds of short strokes shaded by a cylinder profile + rope bundles | `fiberBand(g, A, B, T, seed, o)` | walls, wood, muscle, fabric, cable sheaths |
| texture only where something was painted | `layer(g, fn, { tex, texA, blur, shadow })` | surface grain on whole groups, cheap depth of field, contact shadows |
| tileable value noise; ridged noise for caustics | `noiseTex`, `TEX.grain / fine / caus` | granular surfaces; light in water |
| liquid body: gradient + caustics + rim + highlight | `liquidBody(g, path, bbox, { caus })` + `bubbles` | vacuoles, droplets, lenses, gel |
| field: dark gradient + grain + wandering strands | `fieldBase(g, x, y, w, h, seed, o)` + `network` | cytoplasm, matrix, background "stuff" |
| depth of field | `blurLayer(g, px, fn)` | out-of-focus neighbours in front of / behind the subject |
| bloom | `bloom(canvas, a, r)` (done on every plate) | the soft glow that AI renders have |
| extruded outline with fibre-textured faces | `prism(g, poly, centre, depth, yaw, pitch, S, tex, o)` | the closed specimen turning before the cutaway opens |
| edge-detected x-ray half | `F.drawXray(g, cam, cutX, alpha)` (from `overview.xray`) | "translucent half-section", a wipe into a schematic |
| transition: log-zoom pull-back + push-in through the overview, plates cross-fade on the way | `film` | a continuous camera across separately painted close-ups |
| typed caption card, focus reticle, scale bar, locator box | `ui(F)` | the documentary-instrument feel |

## API
| call | what |
|---|---|
| `SZ.film(cfg)` → `F` | `cfg.layout` (`SZ.LAYOUT['9:16']` or `['4:5']`), `shot` (s), `shots: [{ t: [x, y, zoom], plate: 'key' \| null, draw?(g, cam, lt, alpha, F), drift?, rgb? }]`, `overview: { x, y, w, h, scale, paint(g, F), xray }` (world units; `t` targets are in the same units), `plates: { designCY, paint: { key(g, F) } }`, `textures(TEX, F)`, `built(F)`, `hud(g, t, F)`, `push`, `transition`, `motes`, `vignette` |
| `F.renderAt(ctx, t)` · `F.build(progress, onBasic)` · `F.shotAt(t)` → `{ k, lt }` · `F.camOf(k, lt)` · `F.toScreen(cam, x, y)` · `F.thumb(cx, cy, w, h, worldH)` · `F.PW / PH / PY0` | plates are painted in a frame `PW` wide; `PY0 … PY0 + PH` is the slice of it the layout shows, with `designCY` landing on the focus point |
| `SZ.player(F, canvas, { stage, pp, seek, time, load })` | sets `window.ready / renderAt / DURATION` for `scripts/render.mjs`, `?render` mode, play / seek bar |
| `SZ.ui(F)` → `U` | `T` (text), `glass`, `head`, `bar`, `segMeter`, `gauge`, `histo`, `wave`, `stream`, `log`, `corners`, `live`, `pill`, `card`, `reticle`, `scaleBar`, `locator`, `seq`, `typed` |
| painters | `sphere`, `body`, `tube`, `fiberBand`, `network`, `dots`, `liquidBody`, `bubbles`, `fieldBase`, `prism`, `fiberTex`, `xrayOf` |
| helpers | `rng`, `clamp`, `lerp`, `p`, `eo`, `eio`, `ss`, `wob`, `hx`, `mix`, `rgba`, `lit`, `drk`, `circleP`, `ellP`, `lineP`, `cr`, `smoothP`, `blobPts`, `insetPoly`, `reflect`, `noiseTex`, `texOver`, `innerShadow`, `blurLayer`, `layer`, `bloom` |

Fonts: Barlow Condensed (body), Saira Condensed (display), JetBrains Mono — OFL, in `fonts/`, loaded relative to the kit script.

## Load
```html
<script src="../../kits/specimen-zoom/specimen-zoom.js"></script>   <!-- or a copy in <project>/assets/kits/specimen-zoom/ with its fonts/ -->
```
Render (from the folder that contains both the page and the kit):
```bash
node <skill>/scripts/render.mjs <page>/index.html out/x.mp4 --size 1080x1920
node <skill>/scripts/render.mjs <page>/index.html out/x-feed.mp4 --size 1080x1350 --query ar=4:5
RENDER_ARGS='--size 1080x1920' <skill>/scripts/render-chunked.sh <page>/index.html out/x.mp4 4   # parallel
```

## 새 주제마다 직접 설계할 것 / What every topic must design itself
- **The specimen and its parts**: the overview painting (shape, where each part sits), one plate per part, and what makes each
  plate different (composition, what is in focus, what is blurred in front or behind). Never reuse the plant cell's layout.
- **Palette = parts.** One colour per part, used for its plate, its card title, its pill dot, its sequence square and locator box.
- **The shot order** — a route a viewer can follow (outside → inside, big → small), and the camera target and zoom per shot.
- **The HUD's words and numbers**: which panels exist, which data rows, which log lines. Real numbers from the subject; label
  example numbers. The kit gives the primitives, not the panels.
- **Opening and closing shots** (`draw`): the closed specimen turning (`prism`), an x-ray wipe, or something of your own.

## Knobs that make variety
`shot` length · `transition` length · `push` (Ken Burns per plate) · `drift` on overview shots · motes on/off · bloom strength ·
the light direction in `prism` · tube highlight `hl` · fibre density / bundles / scale · how much is blurred (`blurLayer`, `layer({ blur })`) ·
HUD panel set and placement (`LAYOUT` zones are only where the panels may go).

## Layout (9:16 shorts)
Top panel y 110–322 (app bar above), picture window y 350–1288, caption card bottom-left of the window, bottom panel y 1312–1657
(the app's own caption and buttons sit below ~1640 and at the lower right — keep the right column of the bottom panel to
low-value detail). 4:5: top 10, window 240–966, bottom 985.

## Performance
Plates are built once (~1–3 s each in headless Chromium; the page plays after the overview is ready and fills plates in). A frame
is a handful of `drawImage` calls plus the HUD, so it plays in real time on a phone. Keep plate painting deterministic (`rng(seed)`).
