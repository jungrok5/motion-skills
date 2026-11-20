# API — the world table and the extension points

`world.js` calls `FW.world({ … })` once. Positions are metres: X east, Y north, with the near (camera) edge at Y = 0.
Anywhere a position is taken, `['placeId', dx, dy]` means relative to a sited place.

## Top level
| field | type | meaning |
|---|---|---|
| `name`, `seed` | string, int | the world and its one seed (every random choice is derived from it) |
| `size` | `[Wm, Dm]` | metres east × north. The ground raster is `Wm·15.3` px wide |
| `sun` | `{ lat, decl, hour }` | degrees, degrees, hours from solar noon (negative = morning) |
| `wind` | `{ toward, speed }` | compass degrees the wind blows toward; m/s |
| `materials` | `{ id: Material }` | see below; the order is the material id |
| `cover` | `{ id: fraction }` | what fills the frame; sets adaptation (exposure) |
| `env` | material id | the surface that bounces light into shade (default: the largest `cover`) |
| `terrain` | Terrain | fields |
| `ground` | `[[mat, (f) => bool, opts?], …]` | first match wins |
| `places`, `trails`, `props`, `flora`, `cast`, `life` | see below | |
| `player` | cast id | the body the arrow keys walk in the live page |
| `tour` | `{ duration, follow }` or `{ duration, keys: [[t, pos], …] }` | the camera; `DURATION` = `duration` |
| `sheetGround` | material id | the cast sheet's floor (default: the first `cover`) |

## Material
`{ albedo: [r, g, b], rungs: 2–5, kind: 'surface' | 'water' | 'emit', src }` plus:
- surface: `shade` (sky view at the dark end, default .55), `lift` (residual beam at the dark end), `tilt` (light-end
  gain), `sheen`.
- water: `albedo` = the bed, `depth` (m, the deep end), `cdom: [r,g,b]` (extra absorption m⁻¹), `skyGain` (how bright
  the mirrored sky is relative to the mean).
- emit: `kelvin`, `peak`, `low` (intensity at the dark end).

## Terrain
`{ relief, scale, rise, river, lakes, terraces }`
- `relief` m of noise on a `scale` m cell; `rise` m added across the map toward the north (a hillside facing you).
- `river: { y, amp, wave, phase, width, depth, frozen, bank, valley }`: a meander west → east.
- `lakes: { level, scale, depth, frozen }`: water where noise < level.
- `terraces: { step, bund, bundH, depth, warp, from, to, below }`: flats every `step` m of height, a bund on each
  downhill edge, flooded `depth` m.

The field `f` passed to rules: `{ X, Y, elev, depth, kind ('river'|'lake'|'paddy'|''), frozen, shore (m, negative in
water), moist (0–1), trail (m from a trail edge, negative on it), step, bund, n (fine noise 0–1) }`.

## Ground rule options
`{ grain, grainScale, ao: (f) => factor, riser: mat, riserAo, tuft: { mat, h (m), cell (m), density, rows } }`.
Risers (faces uncovered where the land steps up away from you) take `riser` (default: the rule's own material; a
water rule falls back to the last rule's).

## Places, trails, props, flora
```js
places: [{ id, clear (m), flat (m of elevation spread allowed), grid (m), site: (f, X, Y) => score | null,
           props: [{ form, spec, at: [dx, dy], tag, sway }] }]
trails: [{ pts: [pos, …], width }]
props:  [{ form, spec, at: pos, tag }]
flora:  [{ id, form: 'tree', spec, cell (m), jitter, variants, where: (f) => bool, density: n | (f) => n, sway, trailGap }]
```
Form specs (metres; materials by id):
- `tree`: `{ form: 'conifer'|'broadleaf'|'birch'|'bamboo', height, crown, trunk, clear, bark, leaf (null = bare), snow,
  snowCover, droop (−1…1, season), marks, limbs, clusters, gaps, culms }`
- `house`: `{ w, d, h, pitch, overhang, stilts, deck, wall, roof, trim, glass, lit, windows, course, roofMarks, roofCourse (m), door: { w, h, at } }`
- `cone`: `{ r, h, poles, cover, pole, snow, seams, door }`
- `boulder`: `{ w, h, mat, snow, rough }` · `stack`: `{ w, h, d, log, mat, end }` · `rack`: `{ w, h, wood, hang, n, len }`
- `fence`: `{ w, h, gap, mat }` · `post`: `{ h, w, mat }` · `dome`: `{ r, h, mat }`

### A new form
```js
FW.forms.register('kiln', (sp, rng, ctx) => {
  const W = FW.px(sp.w), H = FW.px(sp.h), D = FW.pxEven(sp.d);
  const s = new FW.Spr(W + (D >> 1) + 2, H + (D >> 1) + 2, (W >> 1) + 1, H + (D >> 1) + 1); // anchor = the ground point
  FW.forms.H.box(s, 1, H + (D >> 1), W, D, H, { front: ctx.m(sp.mat), top: ctx.m(sp.mat), side: ctx.m(sp.mat) });
  return s;                                    // never a colour: material, normal, ao, height
});
```
`s.put(x, y, mat, normal, ao, z, depth)` writes one channel pixel (z = px above the ground, for shadows and
reflections). Normals are world axes (X east, Y north, Z up): `FW.N.FRONT` faces the camera.

## Cast
```js
{ id, type, kind: 'human', at, face (deg: 0 right, 90 away, 180 left, 270 toward), mass, fr, seed, loop,
  skin, hair, coat, legs, boots, sleeve, belt, accent, carry, coatLen: 'hip'|'knee', hem, hat: { kind: 'cone'|'fur'|'peak'|'band', mat },
  plan: [['idle', s], ['walk', [pos, …], { speed }], ['big', 'lift'], ['face', deg]] }
{ id, type, kind: 'quad', at, face, shoulderH, length (joint to joint), chest, width, neck, neckUp, head, tail, ears,
  mass, fr, duty, lag, legW, coat, belly, legs, hoof, muzzle, tailMat, graze, antlers: { kind: 'branch'|'crescent', span, mat }, plan }
```
`type` groups bodies on the cast sheet. A looping plan turns back to its first facing by itself. A big move is a key
table in `FW.body.BIG` (`{ dur, phases: { anticipation, action, recovery }, keys }`). Add your own in `world.js`
before `FW.world`, with phases so check can measure the gather and the settle.

## Life
```js
life: {
  smoke:  [{ on: tag, top, dx, dy, every, life, rise, spread, mat }],
  fires:  [{ on: tag, r, dx, dy, mat }],
  drift:  [{ mat, count, carry, fall, low, streak, parallax }],   // blown snow, falling snow, pollen, ash
  clouds: { cover, scale, speed, transmit, core },               // shadows only; transmit > .3 = dithered
}
```
