# KIT — the API

Import through the page's import map: `import * as S from 'scs/sketch.js'`, `* as R from 'scs/rig.js'`, `* as K from 'scs/kit.js'`,
`{ Film } from 'scs/film.js'`. All positions are stage px (1920×1080), y down. Every drawing call draws with the pencil and
counts as one stroke for the draw-on reveal.

## sketch.js — the pencil
| call | what |
|---|---|
| `line(ctx, pts, { w, col, a, wob, over, passes, smooth, k, taper, still, closed })` | one stroke through pts (curved unless `smooth: false`), overshooting, 2 passes; `k` draws part; `still` = does not boil |
| `loop(ctx, pts, o)` | a closed outline overlapping its start |
| `strokes(ctx, [pts…], o)` | many small strokes (windows, folds, strands) — one reveal unit |
| `fill(ctx, pts, col, { off, grow, a, tex, angle, wob, smooth })` | flat colour off the line (`off` or `pen.misreg`), rough edge, marker streaks (`tex` 0…1) |
| `shadeSide(ctx, pts, col, dx, dy, { sharp })` | one flat shadow side: the shape minus itself moved by (dx, dy) |
| `shape(ctx, pts, { fill, shade, light, line, w, tex, open, grow, sharp })` | fill + shade + outline — the unit of everything; `shade: true` = `tone(fill, −.22)`; `sharp` keeps corners; `open: [a, b]` leaves a gap |
| `hatch(ctx, pts, { angle, gap, w, col, a, len, cross, sharp, still })` | loose parallel strokes inside |
| `scribble(ctx, cx, cy, rx, ry, { col, core, coreA, n, w, a, stray, squash, swirl, k, still })` | a dense boiling scribble |
| `wash(ctx, pts, col, { a, blur, wob })` | a soft colour cloud |
| `paper(ctx, w, h, { tone, seed, fibres })` | the toned sheet (the film paints one: `F.sheet`, `g.paper()`) |
| `construction(ctx, cx, cy, R, o)` | faint stray under-drawing marks |
| `pen` | `{ boil, ink, w, wob, misreg, light, boilAmp, budget }` — film.js sets `boil` and the budget; change `ink`, `w`, `misreg`, `light` per film |
| points | `rect, ellipse, arc, seg, curve, resample, sub, length, bbox, move, scalePts, rot, trace` |
| motion | `span(t, a, b, ease)`, `ease.{lin, sine, in, out, io, in3, out3, back, pop}`, `keys(list, t, prop)`, `lerp`, `clamp`, `rng(seed)`, `hash(a, b)`, `n1(x, seed)` |
| colour | `mix(a, b, k)`, `tone(c, k)` (k < 0 darker toward graphite, > 0 lighter toward cream), `rgba(c, a)` |

## rig.js — the cast
`person(ctx, spec, pose) → G` · `where(spec, pose) → G without drawing (and without auditing)` · `critter(ctx, spec, pose) → { head, back, ground, box }`

Sides: a figure facing +x (face 1) turned toward us shows its right side; its **near** arm and leg (drawn in front) hang from
the shoulder and hip on the screen side behind it (−f), the **far** ones from the facing side (+f). Body rules: `R.LIM`
(`hip, knee, shoulder, elbow, wrist, spine, head, neck` as [min, max] radians in pose terms); a pose outside them is pushed
to `S.audit` as `body: <spec.name> <joint> out of range …`, which `window.runChecks` returns and `check.mjs` fails. Critters
are audited for lower legs folding the wrong way (front must fold back, hind forward; `sit` is exempt). Lean pivots on the
lowest sole.

Pose: `x, y` (ground under the figure), `s`, `face` (1 right / −1 left), `turn` (0 front … 1 profile), `lean`, `squash`,
`hip [dx, dy]`, `spine`, `neck`, `head`, `arm: { near: [shoulder, elbow], far }` (0 = hanging; + forward; elbow + folds up),
`leg: { near: [hip, knee], far }` (knee − folds back), `foot`, `wrist`, `grip: { near: 'open' | 'fist' }`, `plant` (default
true: lowest sole on y), `expr`, `look [x, y]`, `blink`, `talk`, `wind [x, y]`, `flow` (time for the flutter), `farFront`, `lw`.
G: `feet`, `ground`, `hands.{near, far}` `{ x, y, ang, wrist }`, `head {x, y, r}`, `box`, `chest`, `pelvis`.

Poses (spread into a pose, merge with `pose(a, b)`, mix with `blend(a, b, k)`): `stand(t)`, `walk(ph, {stride})`,
`run(ph, {stride, lean})`, `leap(k)`, `crouch(k)`, `reach(angle, side)`, `fall(t)`.

Critter pose: `x, y, s, face, gait: 'stand' | 'sit' | 'walk' | 'run' | 'leap' | 'crouch', ph, k (leap), look, expr:
'calm' | 'alarm' | 'happy' | 'sleep', ears (0…1 streaming back), wind, flow, plant`.

Spec fields: see the top of `templates/cast.js`.

## kit.js — places and effects
| call | what |
|---|---|
| `facade(ctx, x, y, w, h, { floors, cols, wall, trim, awning, roof, wash, door, shade, windowFill, base, seed })` | a building front standing on y |
| `street(ctx, x0, x1, y, { pal, awnings, awningP, hmin, hmax, wash, base, seed })` | a row of facades |
| `avenue(ctx, { vp, W, H, half, depth, pal, awning, lamps, tall, seed })` | a one-point perspective street → `{ P(X, Y, Z), vp, gY }` |
| `skyline(ctx, x0, x1, y, { col, hmin, hmax, spires, a, seed })` | far towers in flat colour |
| `bridge(ctx, x0, x1, y, yb, { n, col, rise })` | an arched viaduct |
| `roofs(ctx, x0, x1, y, { pal, roof, chimneys, seed })` | pitched roofs → `[{ x0, x1, peak, y }]` |
| `lamp(ctx, x, y, h, { face, glow })` · `door(ctx, x, y, w, h, k, { col, light })` · `ground(ctx, x0, x1, y)` · `shadow(ctx, x, y, rx, { a, dx, flat })` | |
| `speed(ctx, x, y, { dir, n, len, spread })` · `puff(ctx, x, y, k, { r, n, col, up })` · `gust(ctx, x, y, s, k, { dir, n })` · `rain(ctx, W, H, t, { n, len, slant, a })` | motion effects (pass `g.twos()` times) |
| `sheet(ctx, x, y, s, rot, { flap, doodle, col })` · `pencil(ctx, x, y, ang, l)` · `trail(ctx, pts, k)` | the page's own things |
| `ring(ctx, x, y, r, k, { col, squash })` | the warm magic ring |
| `mass(ctx, x, y, rx, ry, { k, col, core, n, stray, eyes: { shape: 'slit' | 'round' | 'moon', look, open } })` | a scribble mass |

## film.js
`new Film({ seed, paper, score, fps (24), boil (8), fadeIn, fadeOut, post })` · `F.plate(w, h, paint(ctx, w, h, v), { boil, blur })`
· `F.shot(dur, draw(g, lt, u), { name, cam: [{t, x, y, zoom, rot, e}], shake: lt => px, tr: { type: 'dissolve' | 'scribble' |
'paper' | 'white' | 'black', d } })` · `F.check(name, fn)` · `F.start()`.
In `draw`: `g.paper(z)`, `g.put(plate, x, y, z, { a, s, rot, op, v })`, `g.at(z, ctx => …)`, `g.screen(ctx => …)`,
`g.twos(v, fps)`, `g.drawOn(k, fn)`, `g.lt`, `g.u`, `g.t`, `g.cam`, `g.boil`.
Grade options (`post`): `paperTooth, warm, warmA, cool, coolA, lift, vignette, grain, flicker`.

## score.js
`renderScore(spec, sr, dur)`; spec keys and sfx types are listed at the top of `lib/score.js`. Helpers:
`beat(bpm, b, t0)`, `oompah(bpm, [[root, beats, third]…], t0)` → `{ bass, pluck }`, `tune(bpm, [[midi | null, beats]…], t0)`.
