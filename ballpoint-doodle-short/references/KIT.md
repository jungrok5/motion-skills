# API (lib/)

Pages import the library through an import map (`"bds/": "<path>/lib/"`); modules (`cast.js`, `props.js`, `score.js`)
import it by relative path. `new-film.mjs` points both at the project's `./lib/`.

## pen.js — the two hands
| call | does |
|---|---|
| `ink(ctx, pts, { col, w = 2.6, closed, amp = 1.4, over = 3, second = .35, step })` | a ballpoint stroke through points (smoothed, wobbling on the boil, a second lighter pass, overshooting open ends) |
| `crayon(ctx, pts, { col, ang = −.95, gap = 5.2, w, a, base = .22, inset = .97, off, shade: { col, dir, k, a }, cross, knock })` | coloured-pencil hatching clipped to a closed shape; lays the sheet colour first (`knock: false` = a see-through tint, for cheeks and pads) |
| `shape(ctx, pts, { fill, shade, line, gap, w, sdir, sk })` | crayon + ink (the normal way to draw a thing); `line: false` = no outline |
| `blot(ctx, pts, col)` | a solid ink shape (pupils, notes) |
| `hatch(ctx, x, y, w, h, { col, gap, ang, taper })` | ballpoint scribble in a box (shadows, cliff faces) |
| `hand(ctx, text, x, y, { size, col })` · `handWidth(ctx, text, size)` | handwriting (Caveat, bundled as `DoodleHand`) |
| `paper(ctx, w, h, { tone })` | the sheet (film.js paints it once) |
| points | `ellipse`, `egg`, `rect`, `arc`, `move`, `scale`, `rot`, `centroid`, `bbox`, `trace` |
| time | `span(t, a, b, ease)`, `keys(list, t, prop)`, `ease.{in,out,io,sine,back,bounce}`, `arcAt(a, b, h, k)`, `clamp`, `lerp` |
| determinism | `hash(a, b)`, `n1(x, seed)`, `rng(seed)` — never `Math.random` |
| colour | `INK` (pens), `CRAYON` (pencils), `PAPER`, `mix(a, b, k)`, `rgba(c, a)` |
| state | `pen` (boil, paper, draw-on budget), `audit` (body rules broken this frame) |

## rig.js — round creatures
| call | does |
|---|---|
| `critter(ctx, SPEC, POSE)` | draws one creature; returns `where()` for that pose |
| `where(SPEC, POSE)` | `{ head, mid, top, hand: { R, L }, feet, w, h, facing }` without drawing (aim props, drops, catches) |
| `LIM` | joint ranges: arm raise `a` −.35…2.95, arm swing `f` −1…3.05, tilt ±.7, squash ±.45, stride 0…1.25 |
| `TURNS` | `[−90, −45, 0, 45, 90, 180]` for cast sheets · `blend(a, b, k)` poses |

SPEC and POSE fields are listed at the top of `lib/rig.js` and `templates/cast.js`. `yaw` turns the whole ball (0 front,
+90 facing screen right, −90 left, 180 back). `roll` is a whole-body spin for tumbles (not audited); `tilt` is a lean
about the feet (audited). `hold: { arm: 'R' | 'L', draw(ctx, info), ang }` draws a prop in the hand's frame.
`wear(ctx, info, layer)` on a SPEC draws hats / scarves / glasses on the ball (`info.g.psi`, `info.g.top`, `info.g.cy`).

## kit.js — the world
| call | does |
|---|---|
| `track(pts, { water: [[x0, x1]], col, wcol })` | the line: `y(x)`, `slope(x)`, `isWater(x)`, `draw(ctx, x0, x1)`; equal x = a cliff |
| standing things (x, ground y) | `grass`, `flower`, `fern(h, { lean, sway })`, `mushroom`, `rock(w, h)`, `stump(w, h)`, `tree(h)`, `lilypad(w)`, `sign(text, { layout })` → where a later letter goes |
| sky | `sun(x, y, r, t)`, `cloud(x, y, s)` |
| shadows | `shadow(x, y, w, k)` (k = 1 on the ground → 0 high up) |
| effects | `rays`, `speed`, `drop`, `notes`, `stars`, `puff(k)`, `splash(k)`, `gust(k, dir)`, `mark('!' | '?')`, `heart`, `zzz`, `tremble(t)` |

## film.js — the runtime
`new Film({ seed, score, paper, W = 1080, H = 1080, fps = 24, boil = 8, fadeIn, fadeOut })`;
`F.shot(dur, draw(g, lt, u), { name, cam, tr })`; `F.check(name, t => bool)`; `F.start()`.
In `draw`: `g.paper()`, `g.world(fn)` (camera transform), `g.at(z, fn)` (depth layer), `g.screen(fn)`, `g.view`
(the visible world strip), `g.twos(lt)`, `g.drawOn(k, fn)`. `cam` = keys `[{ t, x, y, zoom, rot, e }]` or `lt => ({ x, y, zoom })`
(the world point at the centre). Transitions into a shot: `{ type: 'wipe' | 'paper' | 'white' | 'dissolve', d }`.
Contract: `window.seek(t)`, `DURATION`, `FPS`, `SIZE`, `runChecks(t)`, `shotAt(t)`, `film`, `__ready`;
`?render=1`, `?t=12`, `?scale=.5`, `?off=grade,grain,vignette`.

## score.js — the band
`renderScore(spec, sr, dur)` → `[L, R]`. Instruments: `pluck`, `mallet`, `glock`, `keys`, `bass`, `whistle`, `reed`, `pad`,
`drum` (kick, snare, tick, clap), `brush`, `air`; `sfx` types: pencil, paper, flip, whoosh, pop, boing, step, thump, fwump,
chime, splash, slideup, slidedown, crack, caw, gust, sprout, squeak, drip, tick. Helpers: `beat(bpm, n, t0)`,
`oompah(bpm, [[root, beats]…], t0)`, `tune(bpm, [[midi | null, beats]…], t0)`.
