# The kit — film options, palette, layers, painting, flows, plants, panels

Everything below runs inside `paint({ pal, layer, kit, rng, W, H, wind, theme })` in the project's `film.js`.
Coordinates are art pixels (default 320 × 180, origin top-left); `x + .5, y + .5` is a pixel's centre.

## film(options)

| option | default | |
|---|---|---|
| `title` | — | shown nowhere in the frame; names the film in `filmInfo()` and the brief |
| `size` | `[1920, 1080]` | output pixels. Must be a whole multiple of `art` both ways (`check.mjs` → pixel grid) |
| `art` | `[320, 180]` | the picture's pixel grid. 320 × 180 at 6× (1920) or 3× (`?scale=.5`); 384 × 216 at 5× works too |
| `fps` | `30` | |
| `seed` | `1` | seeds `rng` and the wind's phases |
| `wind` | `{ strength: 1, speed: 70 }` | the shared gust: strength scales every bend; speed = art px/s the gust travels across |
| `timing` | `{ hold: 3, explode: 1.7, exploded: 1.5, fade: .5, panel: 3.6, back: 1.1, collapse: 1.5, end: 2.6 }` | seconds |
| `theme` | dark slate, see `THEME` in `lib/film.js` | `bg, card, ink, dim, rule, accent, glass, mark[5], bones[], arrow` |
| `paint(ctx)` | — | builds the picture once |
| `panels` | `[]` | 1–4 panels (below) |

Total length = hold + explode + exploded + panels × panel + fade + back + collapse + end (3 panels ≈ 23 s).

## Palette — `pal`

- `pal.ramp(name, colours)` → `{ name, start, len, i(k), pick(v, x, y) }`. Colours are `#rgb`, `#rrggbb`,
  `#rrggbbaa` or `'transparent'`. Index 0 is always transparent. 256 colours at most.
  - `ramp.i(k)` — the k-th colour's index (clamped). `ramp.pick(v, x, y)` — v ∈ [0, 1] → an index, ordered-dithered by
    the 4 × 4 Bayer matrix at (x, y): the house way to shade.
- `pal.cycle(ramp, { rate = 8, dir = 1, blend = false, name })` → turns the ramp's slots `rate` steps a second. The
  colour in slot k shows in slot k + 1 one step later, so bands travel toward **higher** slots. `blend` cross-fades
  between steps (later-era cycling; default off, the stepped look is the classic one).
- A cycle may hold clear slots (`'transparent'` or low alpha): a beam that turns, a flame's tongues, rain that blinks.

## Layers — `layer(name, { label, color })`

Created back to front. Each holds indices (`Uint8Array`, 0 = clear) and becomes one plane when the picture comes apart;
`label` is printed under its plane in `color`. Painting writes the layer's base once:

`L.set(x, y, i)` · `L.get(x, y)` · `L.fill(fn, [x0, y0, x1, y1])` with `fn(x, y, current) → index | null` ·
`L.rect(x, y, w, h, i)` · `L.line(x0, y0, x1, y1, i)` · `L.poly(points, i | fn)` · `L.disc(cx, cy, r, i | fn)`.

Per-frame painting goes on top of a copy of the base: `L.draw((L, t) => { … })` (sparks, a bird — anything that truly
travels; must be a pure function of t) and `kit.plant(L, …)` (rigged plants). Layers with either are *dynamic*;
`check.mjs` proves static layers never change an index.

## Painting kit — `kit`

| call | makes |
|---|---|
| `kit.gradient(L, ramp, y0, y1, { x0, x1, flip, wobble })` | a dithered vertical gradient |
| `kit.ridge(L, ramp, { y, amp, freq, seed, light, to, contrast, rim, fade, grain, peaks })` → `h(x)` | a noise ridge, filled below, rim-lit on the `light` side (−1 left) |
| `kit.rock(L, cx, cy, rx, ry, ramp, seed, { light, flat })` | a lumpy rock lit from the top-left |
| `kit.pine(L, x, yBase, h, ramp, { width, tiers, light })` | a tiered pine |
| `kit.stars(L, ramp, { count, y1, seed, big, only(x, y) })` | stars, each on a random slot of a (cycling) ramp → twinkle |
| `kit.orb(L, cx, cy, r, ramp, { light })` | a shaded disc (moon, sun, lamp) |
| `kit.flow(L, { name, cycle, mask, along, across, band, streak, wobble, seed, slots })` | indices laid along a flow (below) |
| `kit.plant(L, { name, x, y, ramp, kind, amp, stiff, fronds, flowers })` | a wind-rigged plant (below) |
| `kit.noise(x, y, s)` · `kit.fbm(x, y, s, oct)` · `kit.hash(x, y, s)` · `kit.bayer(x, y)` · `clamp` · `lerp` · `mod` · `smooth` | helpers |

Write your own shapes with `L.fill` / `L.poly` and `ramp.pick` — the kit is a starting set, not the menu.

## Flows — `kit.flow`

`index = cycle.start + mod(floor(along(x, y) / band + offset(across)), cycle.len)` inside `mask`.

- `along(x, y)` grows **in the direction of motion**; the panel's arrows are its measured gradient, so they point where
  the colour goes (with a positive rate). Bands are `band` along-units wide. For depth, grow `along` faster near the
  horizon (`34 * log(y − horizon + 3)`) so bands thin with distance.
- `across(x, y)` names the streamline; every whole unit of it gets its own random offset × `streak` — streaks in a
  waterfall, broken wave crests, flame tongues. Scale it with depth too.
- `wobble` adds noise to the offset (less mechanical). `slots(k, x, y)` lets one flow pick between ramps.
- Several flows can share a layer: paint them nearest-first or keep their masks disjoint.

Recipes: **falling water** along = y, across = x (+ per-column jitter) · **river** along = distance downstream along the
bank curve, across = distance from the bank · **waves** along = log depth (± a drift toward the shore), across =
x / depth · **fire** along = −y (+ noise), across = x from the centre, clear slots for tongues · **light beam** along =
angle around the lamp (one beam = a few lit slots among clear ones) · **lava** slow along the channel, dark crust slots ·
**neon / marquee chase** along = distance along the tube · **rain** along = y + x·slant, mostly clear slots ·
**aurora** along = x, across = curtain bands · **conveyor / pipes** along = path length.

## Plants — `kit.plant`

`{ name, x, y (the root, planted), ramp (dark → light), kind, amp = 9, stiff = 1, fronds: [ … ], flowers: [[dx, dy, i, r]] }`.
Each frond: `{ a (deg, 0 up, + right), len, segs = 5, curl (deg per joint), width, kind, stiff, lag = .09, phase, amp, tip (index) }`.
Kinds: `fern` (leaflets both sides, lit side lighter), `blade` (tapered grass), `reed` (thin + seed head at the tip),
`leaf` (broad).

Every joint bends by `curl + amp / stiff · (.3 + .7 · j / segs) · wind.at(t − phase − j · lag, x)` clamped to ±34°: one
shared gust that travels across the picture (`speed`), felt later toward the tip — follow-through comes from the rig,
not from tweening limbs separately. Bones never change length; the root never moves (`check.mjs` → rig).

## Panels

All panels share one layout (1920 base): kicker `NN / KICKER` (mono 22), title (54), two 768 × 432 views with labels
(28) and a caption (26). A view shows a crop of the art at `zoom` 3 (256 × 144), 4 (192 × 108), 6 (128 × 72) or 8,
centred on `center` (clamped to the picture). Whole-number zooms keep pixels square at 1920.

| kind | needs | left view | right view | extra |
|---|---|---|---|---|
| `cycle` | `cycle` | the same indices through a fixed palette: the cycle's slots in purple, everything else dimmed | live | one swatch per slot (current colour, its purple chip, its number; clear slots dashed; > 12 slots number every 4th) |
| `flow` | `flows: [names]` | dimmed, flow pixels tinted, arrows = gradient of `along` sampled on a grid, a dot travelling each | live | |
| `rig` | `layer` (with plants) | the layer alone | the layer dimmed + every frond's joints as coloured polylines and dots, live | a rule and the caption under both |

Fields: `kind, kicker, title, left, right, caption, center, zoom` (+ `cycle` / `flows` / `layer`).

## The page contract

`window.seek(t)` · `DURATION` · `FPS` · `SIZE` · `ART` · `filmInfo()` · `__film` (`camAt`, `planeQuads`, `texts`,
`layerIdx`, `paletteAt`, `compositeRGBA`, `rigAngles`, `rigPose`, `flowField`, `wind`, `fontsOk`) · `__ready`.
Query: `?render=1` · `?t=7.5` · `?scale=.5` · `?debug=1`.
