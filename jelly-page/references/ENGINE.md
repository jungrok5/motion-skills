# ENGINE — lib/jelly.js and lib/squelch.js

```html
<canvas id="stage" layoutsubtree content="drawable"><div id="page" drawable> …the page… </div></canvas>
<button id="snd" type="button" aria-pressed="false" hidden>Sound off</button>
<script src="lib/hic.js"></script><script src="lib/squelch.js"></script><script src="lib/jelly.js"></script>
<script>
  var J = JELLY.create({ canvas: stage, page: page, soundButton: snd, flavours: {…}, mould: {…}, … });
  if (!J.fallback) { /* wire the page's controls to J */ }
</script>
```

`JELLY.create(config)` returns `J`. Without HTML-in-Canvas (or WebGL2) it calls `HIC.fallback(canvas)`, the same HTML
becomes an ordinary page, and `J.fallback` is true. Wire controls so they still do something sensible there (the example
answers its RSVP either way).

## Config (every field has a default; see `DEFAULTS` at the top of jelly.js)

| field | meaning |
|---|---|
| `canvas`, `page` | the canvas and its single drawable child (the page). The page's CSS size decides the page aspect; change it with a media query and the mould is rebuilt to fit |
| `soundButton` | a button outside the canvas; the engine toggles sound and sets its text and `aria-pressed` |
| `flavours` | `{ name: { jelly, glow, bits: [a, b], cloth } }`. `jelly`: the colour of white light through `material.depth` units (absorption is derived from it); `glow`: light scattered inside; `bits`: fruit colours; `cloth`: the tablecloth pattern colour for this flavour |
| `flavour` | starting flavour (default: the first) |
| `candy` | what dark ink on the page becomes inside the jelly |
| `paper` | the colour behind the page when melted flat |
| `mould.shape` | `rect` or `oval` (an ellipse through the page's corners) |
| `mould.margin` `[x, y]` | jelly beyond the page; never less than shoulder + fluteDepth + .03 (enforced) |
| `mould.corner`, `.height`, `.shoulder` | corner radius (rect), height of the set jelly, width of the rounded shoulder |
| `mould.flutes`, `.fluteDepth` | scallops per quarter outline and how deep they cut |
| `mould.tiers` | 1 smooth shoulder; 2–3 stepped ledges |
| `mould.dome` | swell of the top (keep ≤ .02: a domed top bends the window reflection into blobs) |
| `material.ior`, `.depth` | refraction index; the depth `jelly` colour refers to |
| `material.firmHz`, `.softHz`, `.damping [firm, loose]` | whole-body wobble frequency and damping ratio across the temperature range |
| `material.pageDepth`, `.ink`, `.bend` | how deep the page hangs, how thick the candy letters are, how much more the top leans than the waist |
| `table.pattern` | `gingham`, `stripes`, `dots`, `linen`, `wood`; `base` colour, `colour` (if the flavour has no `cloth`), `scale`, `angle` |
| `plate.kind` | `glass` (refracts the cloth, tinted lip) or `china` (white glaze, painted `band`); `shape` `rect` / `round`; `margin`, `corner`, `tint` |
| `room` | `window` colour, `panes [across, down]`, `lamp`, `wall`, `light` (direction of the key light), `pool` (window light on the table) |
| `bits` | `kind` `fruit` / `bubbles` / `mixed` / `none`, `count` (≤ 24), `size [min, max]`, `seed`, `colours` (overrides the flavour's) |
| `sound` | `{ pitch, wet, volume }` for squelch.js |
| `temperature` | starting value, 0 firm … .72 loose … 1 melted |
| `intro` | live pages start melted and set (skipped for `#still` and `#calm`) |
| `tilt`, `fill` | degrees the view tips from straight down; how much of the window the plate fills |
| `actPoint` | where acts grab and poke, as a fraction of the page half-size |
| `mesh`, `grid`, `upload` | jelly mesh cells, wobble grid cells (long side), page texture resolution factor |

## Methods

| call | does |
|---|---|
| `J.setFlavour(name)` | eases colour, bits and cloth to that flavour, with a little jiggle and a plink |
| `J.setTemperature(v)` | 0…1: stiffness, wobble frequency, damping; above .72 it melts toward a flat page |
| `J.drop()` | gather, lift, fall, squash and lurch on landing (ignored while melted or already dropping) |
| `J.poke(ex, ey, k)` | a prod at page px |
| `J.release()` | lets go of a grab |
| `J.settle()` | back to rest at once (checks) |
| `J.tick(sec)` | simulates `sec` seconds now (checks, acts) |
| `J.act(name, sec)` | runs an act from rest (see below) |
| `J.screenOf(el)`, `J.screenAt(ex, ey)` | where a page element / page point is on screen (inverts the warp) |
| `J.mapPoint(x, y)` | what is under a canvas point: `{hit, ex, ey, rx, ry, wz, s}` (`ex` null where no page is drawn) |
| `J.project([x, y, z])` | world → canvas px |
| `J.energy()`, `J.peak()` | wobble energy, largest displacement (world units) |
| `J.redraw()` | draw the next frames even if nothing moved |
| `J.sound.toggle()`, `.enabled`, `.ctx()` | sound |

Events on the canvas: `jelly:touch` (first contact of any kind: hide the hint), `jelly:land` (`detail.v`).

## Contract with checks and stills
- `window.__hic.ready` after the first upload and the hit-test probe; `__hic.info` has the mesh, grid, page and upload sizes.
- `window.__hic.screenOf(el)` = `J.screenOf(el)`; `window.__jelly` = `J`; `window.__hic.owed` = frames still owed
  (stills and checks wait for 0, so a busy machine cannot catch an undrawn act).
- `J.state.freeze = true` stops the live loop from advancing time (checks hold a wobble still while a real click lands).
- `#still=<s>`: time stands still. With no act the jelly is set and at rest. With `&act=<name>` the act starts at time 0
  from rest and the picture is `s` seconds later: `pull` (grab at `actPoint` and drag for .4 s, held), `release` (pull
  for .5 s, let go), `drop`, `poke`, `type` (a jiggle under the headline), `melt` (temperature .9), `set` (the intro),
  `flavour:<name>`. Same picture on every load.
- In `#still` the camera never leans toward a stray pointer and no `jelly:*` events fire (deterministic pictures).
- `#calm` (or reduced motion): no intro, no camera lean. `#fallback`: the plain page.
- Controls marked by tag are "live" (input, button, select, textarea, label, a, summary, contenteditable, `[data-live]`):
  a press there goes to the page with a gentle prod. A press anywhere else on the jelly grabs it.

## How it works (where to change things)
1. `Mould` — outline signed distance (`sd`), flutes, tiers, dome → `height(x, y)`; baked into a 384-wide RGBA16F texture
   (h, ∂h/∂x, ∂h/∂y, sd) with box-filtered mips made on the CPU. A new shape: add a branch in `base()` returning the
   signed distance and a 0…1 position along a quarter of the outline (for the flutes).
2. `Wobble` — columns displaced by `d`; a point at height fraction `s` moves by `d · s^bend`. Springs, waves, a volume
   coupling (a dent pushes material out, spreading lowers the top), viscosity; plus eight body modes (sway x/y, twist,
   squash, rock x/y, two swells). 240 Hz semi-implicit Euler, clamped. `impulse()` feeds both.
3. Camera — tipped by `tilt` (straight down when melted), fitted to the plate (the page when melted), leaning toward the
   pointer.
4. Shaders — `FS_GROUND` draws the cloth, plate and coloured shadow (the key light marched through blurred heights) into a
   framebuffer (Reinhard-encoded linear colour); `FS_BLIT` shows it; `FS_JELLY` shades the mesh: refraction, the cached
   ground read back at the refracted point, Beer–Lambert colour, glow, bits (ray–sphere), candy letters with side walls,
   room reflection with Fresnel, the wet line. A new cloth: add a branch in `cloth()` and a name in `PAT`.
5. Mapping — the pointer ray is marched against the displaced surface on the CPU (the same bilinear height and wobble the
   GPU filters), refracted with the same normal, and turned into a page pixel. `S.placeLocal` places the page with that
   warp's local affine under the pointer on every move, and each frame while the jelly moves.
6. Frames — nothing is drawn while nothing moves (`dirty` counts frames still owed after an upload, a resize or an API call).

## squelch.js
`SQUELCH.create({ pitch, wet, volume })` → `play(name, amount, flag)` for `poke`, `grab`, `release`, `type`, `lift`,
`land`, `melt`, `flavour`. Each is a falling or rising sine "bloop" plus band-passed seeded noise (the squelch); firmer
jelly is higher and shorter (`firmness`, set by the engine). No AudioContext exists until `toggle()` is called from a
click. Add a sound: a new `case` built from `bloop()` and `slosh()`.
