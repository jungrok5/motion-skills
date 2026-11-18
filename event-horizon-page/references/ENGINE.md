# ENGINE — lib/event-horizon.js

One file, no dependencies besides `lib/hic.js`. Load both with plain `<script>` tags (works from file:// and as an artifact).

```js
var eh = EventHorizon.create({
  canvas: '#stage', page: '#page',      // <canvas layoutsubtree content="drawable"><div id="page" drawable>…
  eatRoot: '#main',                     // where Hungry looks for words (default: the page)
  atoms: '[data-eh-atom]',              // elements eaten whole (inputs, buttons, checkboxes); [data-eh-keep] is never eaten
  paper: null,                          // the paper colour; default: #page's computed background colour
  object: { … },                        // see below; defaults come from EventHorizon.KINDS[kind]
  mass: undefined,                      // starting mass 0..1 (else object.mass, else .45)
  rest: '#title',                       // an element (rest after the end of its first line) or [fx, fy]
  intro: { word: 'long', in: '#title' },// the opening takes this word from that element and hands it back (false: none)
  feed: { form, input, tray, keep: 8, leave: false, onFeed(text, el, state) },
  controls: { gravity, mass, hungry, restore, sound },   // selectors of the dock's real inputs / button
  dock: '[data-eh-dock]',               // pointer events over it never reach the lens; hidden in the fallback
  hint: { el: '#hint', after: 4 },      // a pill shown near the object after 4 s if nobody touched it
  sound: { root: 110, scale: [0,2,4,7,9], bed: .5, timbre: 'sine', pulse: false },
  on: function (event, detail) {},      // 'drag' 'type' 'select' 'feed' 'eat' 'hungry' 'restore'
  seed: 1977, probe: null, fallbackNote: undefined
});
```

## The object
| field | kinds | meaning |
|---|---|---|
| `kind` | all | `blackhole`, `neutron`, `wormhole` (index 0, 1, 2 in the shader) |
| `size: [a, b]` | all | CSS px per M at mass 0 and 1 (scaled down on small screens by `sizeK`); the Einstein radius is 14.14 × this |
| `mass` | all | starting mass 0..1 |
| `ramp: [5 colours]` | all | the object's light from the faintest to the hottest: disk, photon ring, rim, eaten-piece heat |
| `disk: {inner, outer, tilt, roll, gain, beaming, streaks, speed, spin}` or `false` | all | radii in M (inner ≥ 6 is outside the last stable orbit); `tilt` in degrees from face-on (75–84 reads as a disk seen almost edge on); `roll` rotates it on screen; `spin` ±1 picks the bright approaching side; `beaming` is the Doppler exponent; `streaks` 0..1 the gas texture; `speed` its orbital speed |
| `ring` | 0, 2 | photon ring strength |
| `glow`, `warm` | all | bloom strength; how much the bloom tints the paper (0 none, 1 strong) |
| `shadow: false` | 0 | no black shadow (a "gravity well" that only lenses) |
| `star: {radius, color, hot, spots}` | 1 | radius in M (> 3, outside the photon sphere); surface colour, the hot centre and polar caps, cap brightness |
| `beams: {color, tilt, angle, period, length, width, gain}` | 1 | spin-axis tilt toward you, magnetic-axis angle from it (degrees), turn period (s, may change live), beam length (M), opening |
| `throat: {bg, ink, reach}` | 2 | the far side's paper and ink colours; `reach` how much of the page the throat shows |

`eh.object` is the live object config: a topic may change it at run time (the example sets `eh.object.beams.period` on every
request). Colours: `#rgb`, `#rrggbb` or `[r, g, b]` 0..1.

## The API (`eh`, also `window.__hic.eh`)
`state` (x, y, s = px per M, mass, g, eaten, t, phase, drawn …) · `object` · `sourceOf(x, y)` → page point or null ·
`screenOf([x, y])` → where a page point is seen · `run(seconds)` simulate · `feed(text)` · `giveBack()` · `hungry(on)` ·
`gravity(on)` · `moveTo(x, y)` · `setMass(m)` · `einstein()` (px) · `pieces()` (mesh vertices) · `eatenCount()` ·
`alpha(b)` · `consts` (D, BC, THE, T0, T1) · `sound` (`enable`, `disable`, `enabled`) · `feedLeaves` · `redraw()`.
`window.__hic.screenOf(el)` gives an element's drawn centre (for checks).

## How it works (where to look in the file)
1. **Tables** (`tables()`): α(b) on 1024 samples, b = BC + (BA − BC) t³; u(b, φ) on 384 × 256 at texel centres. α is a
   R32F texture read with `texelFetch` and the same interpolation as `alphaOf()` in JS, so a click and a pixel agree. The
   float uploads need `UNPACK_PREMULTIPLY_ALPHA_WEBGL` off.
2. **Lens** (`FS_LENS`, `sourceOf`): b = |x − hole| / s; inside 3 θE the deflection α(b) × (1 − smoothstep(1.5 θE, 3 θE))
   moves the sample to hole + ê β s with β = b / cos α − D tan α. Inside BC (or the star, or the throat) no page shows.
3. **Emission** (`EMIT`): photon ring, star surface, three disk crossings back to front (φ₀ = atan(cos i, −e_y sin i), +π,
   +2π), Doppler × gravitational shift g = √(1 − v²)/(1 − v·v̂_z) × √(1 − 2/r), gas noise sheared by Ω ∝ r^−1.5 (two
   copies cross-faded so it never winds up), beams. Drawn into a 256² target; its mip levels 1.5–6 are the bloom.
4. **Pieces** (`tear`, `VS_BITS`): a rectangle of the page texture copied to a snapshot texture; a grid of vertices every
   ~2.4–6 px, each with a start time (near side first, a little ripple by direction), a duration, a strand id. The vertex
   shader starts each from where it is seen (outer image of a point lens) and spirals it in (r → 1.08 × the inner edge,
   turning faster as it nears); the fragment shader keeps only ink (distance from the paper colour), thins and heats it by
   the stretch (page area per screen pixel from `dFdx` / `dFdy`).
5. **Hit testing** (`placePointer`): `S.placeLocal(page, x, y, sourceOf)` on every pointer move and every frame the object
   moves. Measuring the DOM (`measure`) removes the placement first, since it transforms the page in CSS mode.
6. **Time** (`step`, `run`): the spring drag, fling, flare, mass growth, the opening, Hungry grazing, the restore. At
   `#still` the clock stands except while a hand drags; `run()` moves it.
7. **Draw** (`S.loop`): only when the signature (position, size, time, flare, pieces, phase) changed or after an upload,
   and only when the last frame's fence has signalled (one frame in flight; 400 ms cap).

## Adding to it in a project (never in the skill's lib)
- **A new look of an existing kind**: only config (ramp, disk, star, beams, throat). This covers most topics.
- **A "gravity well" for a brand**: `kind: 'blackhole', shadow: false, disk: false, ring: 0` and a ramp in the brand
  colours with `glow` up — a pure lens with a soft coloured bloom; or keep the disk in brand colours.
- **A new kind**: copy `lib/event-horizon.js` into the project, add an entry to `KINDS`, give it a shader index, and add its
  light to `emit()` (premultiplied RGBA, composited back to front) and its inner region to `FS_LENS` and `bInner()` (no page
  shows inside it, so clicks there reach the object). Keep the lens from the tables.
- **What a fed word does**: `feed.onFeed`. What the checklist ticks: `on(event)`.
- **Sound**: `sound` config; a new gesture sound is a method on the object `Sound()` returns.
