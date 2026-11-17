# API — the library (lib/)

Pages are ES modules with an import map: `"three": "./lib/vendor/three.module.min.js"`, `"pla/": "./lib/"`.

## film.js — the take
```js
import { Film, P, T, v3 } from 'pla/film.js';      // P = pencil.js, T = three.js, v3 = small vector helpers (add sub dot len nrm cross lerp)
const F = new Film({ dur, title, score, look, paper, lead, tone, grade: { vignette, grain }, fadeIn, fadeOut });
await F.load();                                    // the place: assets/manifest.json (or ?cdn=1 → manifest.cdn.json)
F.plate.turn(deg);                                 // turn the place (backdrop + light together)
```
**The real set** (metres; y up; the default camera looks along −z)
| call | does |
|---|---|
| `await F.table({ at: [x, z], r \| size: [w, d], top: .74, tex, legs: 'pedestal' \| 'four', legWood, corner, grain })` | a table from a scanned wood |
| `await F.ground(id, { radius, at: [x, z], tile, bump })` | a disc of scanned ground fading into the photographed ground |
| `F.sketchbook({ at: [x, y, z], rot, size: [.21, .297], rings, tone, lift })` → group (`userData.surfaceY`) | the page |
| `F.onPage(u, v)` | a world point on the page |
| `F.pencil({ colour, hold: [dx, dy, dz], enter, wobble })` | the real pencil; moved by every `by: 'pencil'` sketch, enters/leaves along `hold` |
| `await F.model(id, { pos, scale })` | a Poly Haven scan from the manifest |
| `F.real(obj, { track: t => ({ pos, rot, quat, scale, visible }), front })` | any three.js object; `front`: it covers the drawing (true or [t0, t1]) |

**The drawing** (drawing units: mm by default, y down)
| call | does |
|---|---|
| `F.upright(at, yaw, unit)` · `F.flat(at, rot, unit)` · `F.facing(at, unit)` | planes: standing (facing +z at yaw 0) · lying · turned to the camera |
| `F.sketch({ name, plane \| t => plane, parts \| t => parts, at, dur \| rate, by: 'pencil' \| 'self', lift, out, alpha, shadow, anchor, weight, hidden })` | a drawing drawn on in time; live parts keep the same stroke count |
| `F.hero(spec, track, { height: .07, shadow })` | the drawn hero (below) |
| `F.realify({ sketch, obj, at, dur, from, radius, sparkle })` | the drawing turns into `obj` from `from` outward (shader reveal + erase) |
| `F.iris({ at, draw, centre, r, shape: 'circle' \| 'heart' \| pts, by, fill: [t0, t1] })` | the closing frame; outside goes to paper |
| `F.camera([{ t, pos, look, mm, fstop, focus, focusOn: 'hero' \| [x,y,z] \| t => p, hand, roll, stop }])` | the lens (flowing spline; first/last at rest) |
| `F.beat(name, t)` · `F.action(name, { anticipation, action, recovery })` · `F.check(name, t => ok)` · `F.start()` | |

**The hero's track** — `track(t)` returns
`{ feet: { L, R } (world ground points), planted: { L, R }, face (deg: 0 = +z, 90 = +x), hip (world y), ground (y for the
contact shadow), tilt (deg, lean over the feet), stretch (reaching past the arm is meant), pose: { head: { yaw, pitch, roll },
look: [x, y], mouth, brows, arms: { L, R: { a, b } }, legs (when no feet), blink, breathe }, armsW: { L, R: world point } }`
or `{ at, hip, face, pose }` without feet (seated, floating). Helpers: `F.heroWorld(hero, t)` → `{ head, hand: { L, R }, top,
toWorld, toLocal, d (the drawing) }`, `F.heroHead(t)`.

## gait.js — feet that step
```js
const g = gait({ start: { L, R }, legLen: .37 * H, ankle: .025 * H, face0 });
g.walk({ to: [x, z] | path, t0, speed, stride, width, lift, lead, y: (x, z) => surface y });   // footholds every half stride
g.step(foot, to, t0, dur, lift); g.hop(t0, dur, height, offset); g.turnInPlace(face, t0, dur); g.face(face, t0, dur);
g.at(t) → { L, R, planted, lift, root, face, hipY, airborne }; g.lastEnd
```
The hip rides on the legs (as high as the lower foot allows), so the bob comes from the steps. Facing +z, the left foot is at +x.

## hero.js — the drawn figure (from pencil-dream-short)
`hero(spec, pose)` → `{ parts, at, audit }`. Spec: `name, H (240), hand, ink, head: { r, jaw, chin }, hair: { style:
'bob' | 'curls' | 'spiky' | 'short' | 'bun' | 'tufts' | 'none', vol, len, fringe, seed }, face: { eye, lashes, freckles,
nose, beard, brows }, items: [{ type: 'cap' | 'beanie' | 'glasses' | 'scarf' | 'bow' }] (graphite tone here), top: { kind:
'tee' | 'sweater' | 'coat' | 'dress', stripes, collar, pocket }, legs: { kind: 'trousers' | 'shorts' | 'skirt', boots }`.
Pose: `yaw, head, look, blink, mouth, brows, arms: { R: { a, b } | { to, stretch } }, legs: { R: { a, k } | { to } }, hip,
breathe, flow`. `LIM` holds the joint ranges; every frame is audited (`body: …`).

## plate.js — the real half
`new Plate({ W, H, base, cdn, look })`, `load()`, `surface(id, o)`, `model(id)`, `image(url, maxW)`, `render(cam)`,
`drawFront(ctx)`, `cocAt(p)`, `project(p)`, `depth(p)`, `turn(deg)`; builders `buildTable`, `buildGround`,
`buildSketchbook`, `buildPencil`, `paperTexture`, `planarUV`, `roundRect`; `parseHDR`.
Look: `{ expo, bright, gain, sat, contrast, lift, shadowTint, highTint, fstop, dof, sunBoost }`. The sun is found in the HDRI
(its brightest lobe is taken out of the image and becomes a shadow-casting light); exposure is set so a white page lands near
88 %; the backdrop is pre-inverted through the tone curve so the photograph shows as photographed.

## pencil.js / draw.js (from pencil-dream-short)
Lines: `line(pts, { w, a, passes, taper, col })`, `fill(poly, { col: 'spot' (graphite tone) | 'lead' | 'paper', gap })`,
`part(ops, knock)`, `stroke`, `hatch`, `scribble`; points `curve`, `arc`, `ellipse`, `bez`, `hand` (wobble + overshoot),
`resample`, `tf`, `bbox`; time `keys`, `span`, `ease`, `hash`, `n1`, `rng`. `Painter` draws parts through any point map (`xf`).

## sheet.js — the cast sheet
`castSheet({ hero, paper, lead, tone })`: eight turns, motion facing right and left (idle breath, turn on the spot,
hop: gather → air → land → settle), faces; `window.castSheet()` reports to check.mjs.

## score.js (from pencil-dream-short)
`SCORE = { box, keys, bell, pluck, bass, reed, pad, brush, air, sfx: [{ t, type, v, d, pan }], reverb }`; sfx types include
pencil, paper, whoosh, pop, step, thump, swell, sparkle, flutter, chime, fwump. The film adds pencil scratches from its strokes.
