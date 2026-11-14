# KIT — the engine and every maker

## World
```js
const W = new World({
  name, seed, extent: 80,                 // the land is ±extent metres; landRes 321 (grid points a side)
  sun: { az: 250, el: 27, strength: 1.35, colour },   // az: bearing it shines FROM (0 = -z, 90 = +x); el: height in degrees
  sky: '#ffffff', skyStrength: 0.3, ground: '#000000', // the sky's light in the shade (ambient + hemisphere)
  pencil: { px: 4.6, warm: '#ffd98a', shadow: '#4a3a9e', press: [warm, all over, strokes, shadow] },
  page: { paper: '#f9f3e9', margin: 1, line: 1, flecks: 1, samples: 4 },
  caption: 'the canal, october',          // or { text, at: 'left' | 'right', size: 34, font }
  wind: { az: 300, strength: 0.7 },       // flags, leaves, smoke, the coat
  shadow: { box: [110, 110], centre: [x, z], size: 4096 },   // where the sun's shadows are computed (default: the way + 40 m)
});
W.way([[x, z], …]);                       // a smooth line; W.wayAt(s), W.wayDist(x, z), W.wayLen
W.land({ height: (x, z) => metres });     // W.groundAt(x, z) reads the same triangles the ground is drawn with
W.add(thing); W.figure(new Figure({...})); W.shots([...]); W.check(name, fn); W.start();
```
`W.standAt(x, z)` is the ground or a deck laid over it (piers, bridges): the walker stands on it, feet and all.
Helpers: `noise(x, z, seed)` 0..1, `fbm`, `rng(seed)`, `sm(a, b, x)`, `lerp`, `cl`, `tone(colour, k)` (k < 1 darker, > 1 toward white).

## Makers (`import * as kit from 'cpw/kit.js'`)
| maker | what | main options |
|---|---|---|
| `sky(W, o)` | blue strokes, bare-paper clouds | `horizon`, `zenith`, `cloud` 0..1, `cloudShade`, `warm`, `scale`, `drift` |
| `ranges(W, o)` | far hills and mountains in rows | `rows: [{ dist, height, colour, haze, from, to, seed, jag, snow, trees }]` |
| `ground(W, o)` | the land as one piece | `colour` (a pencil, or `fn(x, z, y, slope)`), `a`, `b` (stroke slant) or `field` |
| `paving(W, o)` | flagstones / cobbles, running bond | `rect` (+ `turn`) and/or `inside(x, z)`, or `way: { width, from, to }`; `size: [along, across]`, `gap`, `colours`, `y` |
| `water(W, o)` | water at a level; mirrors every `front` | `level`, `near`, `far`, `dark`, `glints`, `ripple`, `mirror`, `open` (a sea to the horizon) |
| `house(W, o)` | one house | `at`, `turn` (front faces +z at 0), `w`, `d`, `storeys`, `storey`, `wall`, `trim`, `base`; `roof: { kind: gable/eaves/hip/flat, pitch, colours, chimney, smoke }`; `windows: { cols, shutters, arched, glass, boxes, blooms }`; `door: { colour, arched, at }`; `shop: { awning, stripes }`; `sign`; `balcony` (storey); `vine`; `pipe`; `pots`; `clock` |
| `row(W, o)` | houses side by side along a line | `from`, `dir` (0 = +x), `face`, `d`, `gap`, `houses: [{ w, …house }]` |
| `trees(W, o)` | trees of kinds | `list: [{ at, kind: round/cypress/poplar/pine/fir/bush/bare/fruit, h, r, leaves, trunk, fruit }]` or `scatter: { n, inside, offWay, kinds, h, spacing }` |
| `props(W, list)` | small things | `{ kind: lamp/bench/barrel/crate/pot/bollard/cafe/stall/post/hay/well/sign/cart, at, turn, colour, … }` |
| `fence(W, o)` | picket / rail / rope | `points`, `kind`, `h`, `colour` |
| `wall(W, o)` | rendered or stone-coursed wall; water mirrors it | `points`, `h`, `w`, `colour(s)`, `stones`, `coping`, `base` (its foot, e.g. a canal bed) |
| `deck(W, o)` | pier, boardwalk, bridge (the walker stands on it) | `from`, `to`, `width`, `y`, `arch` (rise), `planks`, `posts`, `rail`, `stone` |
| `bunting(W, o)` | flags or washing on strings, fluttering | `lines: [{ from: [x,y,z], to, sag, colours, n }]`, `kind: 'flags' | 'washing'` |
| `boats(W, o)` | rowing or sailing boats, bobbing; mirrored | `level`, `list: [{ at, turn, hull, trim, kind: row/sail, len, sail }]` |
| `birds(W, o)` | birds circling, flapping | `n`, `centre`, `radius`, `colour`, `wing`, `size`, `flap` |
| `flecks(W, o)` | leaves, petals, snow falling | `n`, `centre`, `radius`, `top`, `colours`, `size`, `fall`, `sway`, `spin` |
| `smoke(W, o)` | one curling pencil line | `at`, `colour`, `height` (houses add it with `roof.smoke`) |
| `make(W, name, fn)` | a thing of your own | `fn({ line, both, flat, shapes, field, fieldBy, hue, rng, V, W, tone })` → extra fields (`colliders`, `fronts`, `floor`, `update`) |

A thing is `{ name, group, colliders: [{ x, z, r, top }], fronts: [{ a: [x, z], b: [x, z], y0, y1, colour, roof, roofH }],
count, floor(x, z), update(t, W, camera) }`. Colliders keep the walker and the eye out (`top`: a walker standing higher
passes over it — a wall under a bridge). Fronts are what water mirrors (up to 40, nearest first).

Your own pieces: build with `shape.js` (`block(w, h, d, round, cell)`, `ball(r, detail)`, `turned(profile from the
bottom up)`, `roll(points, radius)`, `arched(w, h, deep, arch)`, `prism(outline, deep)`, `knead(g, amount, grain, seed)`),
transform, then `line.add(g, colour, a, b)` — `a`, `b` are the two slicing directions of its strokes (default: the slant
of a right hand). Colour a piece by place with `hue(g, (x, y, z) => colour)` *before* moving it; `add` computes the
field *after*, so strokes run the same way across a merged batch. Materials: `line` (solid, one side), `both` (cloth,
flags, awnings), `flat` (strings, smoke: one even line).

## Shots
```js
W.shots([{ name, dur, walk: [from, to] /* m along the way; left out: stands */, ease, look: [x, y, z], figure: false | 'off-screen',
  caption: 'this shot's words', cam: { from: KEY, to: KEY, ease } }]);
```
A KEY is one of: `{ back, side, up, yaw }` round the walker (yaw 0 behind, 180 in front; side + is toward their right hand), `{ at: [x, up, z] }` (an eye that stays put; up is over the ground or deck
there), `{ way: [s, side, up] }` (a point beside the way, side + to the right of the way's direction); plus `look: [side, up, ahead]` from their feet, or
`lookAt: [x, y, z]`; `fov`. Between `from` and `to` the eye moves with `ease` (default in-out).
