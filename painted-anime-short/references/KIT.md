# Kit — the API

All drawing is in stage units (1920 × 1080). `R` is a seeded random function from `P.rng(seed)`; pass the same one through
a plate's painters so the plate is reproducible.

## Film (`lib/film.js`)
```js
const F = new Film({ seed, score: SCORE, title, post: { bloom, split, top, bottom, warm, cream, lift, vignette, grain, letterbox } });
F.fadeIn = .8; F.fadeOut = 1.6;                                   // seconds of fade from / to black at the ends
const p = F.plate(w, h, (c, w, h) => { … }, { blur: 10 });       // painted once now; blur = depth of field
F.shot(dur, (g, lt, u) => { … }, { name, cam: [{ t, x, y, zoom, rot, e: 'io' }], shake: lt => px, tr: { type: 'dissolve' | 'white' | 'black', d } });
F.check('rule name', t => true /* holds */);
F.start();
```
Inside a shot: `g.put(plate, x, y, z, { a, s, rot, ox, oy, op })` places a plate whose top-left is (x, y) at depth z;
`g.at(z, c => …)` draws in the space of depth z; `g.screen(c => …)` draws without the camera; `g.lt` local time, `g.t`
global time, `g.u` = lt / dur, `g.cam`. Depth: 0 fixed, 1 focal plane, > 1 foreground; a layer at z moves by cam · z and
scales by zoom^z. A plate must cover the frame for every camera key: extend it by |cam.x| · z and by (zoom^z − 1) · 960.
Transitions are the *incoming* shot's `tr`; a shot keeps being drawn past its end during the next shot's dissolve, so
shot functions must be fine with lt > dur.

## Brushes (`lib/paint.js`)
| call | draws |
|---|---|
| `dab(c, x, y, r, col, R, { jag, n, sx, sy, rot, a })` | one irregular blob of paint |
| `blob(pathOrCtx, x, y, r, R, o)` | the blob's path only (works on a `Path2D` too) |
| `streak(c, x, y, len, w, ang, col, { bend, taper: 'both' \| 'tip', a })` | one tapered brush stroke |
| `scrub(c, x, y, r, col, R, { n, ang, len, w, spread, sy, a })` | dry-brush bundle of strokes |
| `flecks(c, x, y, r, col, R, { n, size, light, bias, sy })` | leaf marks inside an ellipse, denser toward the light |
| `spray(c, x, y, r, col, R, { n, size, dir, arc })` | loose leaves around a rim |
| `ribbon(c, pts, s => width)` · `curve(x0, y0, cx, cy, x1, y1, n)` | a filled stroke along a polyline (vines, roots, blades) |
| `flower(c, x, y, r, col, eye, R)` · `sparkle(c, x, y, r, a)` · `ink(c, pathFn, w, col)` | details |

## Painters
| call | paints |
|---|---|
| `sky(c, w, h, stops, R)` | gradient + faint horizontal strokes |
| `cloud(c, x, y, len, h, R, pal)` | a flat-bottomed cumulus band |
| `cumulus(c, x, y, w, h, R, pal)` · `cloudBank(c, x0, x1, y, h, R, pal, { rows, mist })` | a cumulus mass · a cloud sea |
| `clump(c, x, y, r, R, pal, { light, spray, detail })` | one foliage clump (dark mass → mid → light → highlight flecks) |
| `canopy(c, R, { x0, x1, y0, y1, size, rows, pal, darken, spray, light, fill, below, grow })` | rows of clumps, back → front |
| `conifer(c, x, yb, h, w, col, R, { lit })` · `conifers(c, x0, x1, yb, h, w, col, R, { gap, lit })` | spruce silhouettes |
| `trunk(c, x, yTop, yBot, w, R, pal, { lean, flare, moss, vines, lightSide, detail })` | a trunk with bark, rim light, moss, vines |
| `grass(c, x0, x1, y, h, R, pal, { density, below, lean, w })` · `fern(c, x, y, len, ang, col, R)` | ground |
| `mist(c, x0, x1, y, h, col, R, { a, n })` | flat soft dabs — put it on a blurred plate or `layer` |
| `haze(c, w, h, col, a \| [[k, a], …])` | fades what is already painted toward a colour |
| `layer(c, w, h, fn, { haze: [col, a], blur, a })` | paint a depth on its own, haze/blur it alone, lay it down |
| `shadow(c, x, y, w, h, a)` | soft contact shadow |
| `weather(c, pathFn, R, { base, box, scale, amount, rust, shadow, shadowPath, light, lightPath })` | cel-painted weathered surface |

## Moving things (call per frame inside `g.at`)
`leaves(c, t, { x0, x1, y0, y1, n, fall, sway, size, wind, seed, cols })` (fall < 0 rises) · `flock(c, t, { x, y, vx, vy, n,
spread, size, seed })` · `motes(c, t, { x0, x1, y0, y1, n, seed, a })` · `rays(c, x, y, { ang, spread, n, len, width, a, t,
seed })` · `glow(c, x, y, r, col, a)`. All are pure functions of t.

## Kit (`lib/kit.js`)
`bird(c, x, y, size, { dir, flap, look, tilt, crouch })` — (x, y) is the feet; `flap` = wing phase (radians), omit when
perched · `puff(c, x, y, r, k, R)` — k ∈ (0, 1) age · `sapling(c, x, y, h, R, { lean, clumps, pal })` · `mossCap(c, pts, R,
{ size, cover, tufts, flowers, pal })` · `rock(c, x, y, w, h, R, { base, moss })`.

## Writing a hero
```js
export function hero(c, seed = 7) {
  const R = P.rng(seed);
  // 1 back parts (wheels, legs) · 2 body panels with P.weather (base, cel shadowPath, rust) · 3 openings (windows, eyes)
  // 4 top parts · 5 P.ink outlines · 6 K.mossCap on every top edge, clumps, K.sapling, vines
}
export const EYE = { x: 120, y: -80 };   // export the points shots need (lamp, eye, top) in local units
const heroWide = F.plate(800, 600, c => { c.translate(400, 560); c.scale(.6, .6); hero(c); });   // origin (400, 560)
```
Paint it again for each scale it is seen at (`c.scale(2.7, 2.7)` for a close-up), always with the same seed. Draw its
light (lamp, eyes) per frame at the exported points × the plate's scale.

## Score (`lib/score.js`)
`renderScore(spec, sampleRate, dur)` → `[L, R]`. Spec fields: `pad`, `strings` (`{ t, d, notes, v }`), `bass` (`{ t, d, n, v }`),
`bell` (`{ t, n, v }`), `air` (`[{ t, v }]` keys), `sfx` (`{ t, type, v, d, pan }` with type `chirp | flutter | whoosh |
rumble | flicker | chime | thump | rustle`), `reverb` (`{ mix, room }`). MIDI numbers: 50 = D3, 62 = D4, 74 = D5.
