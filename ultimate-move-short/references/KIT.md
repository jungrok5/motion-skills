# KIT — the API

All modules are ES modules under `lib/`, imported through an import map (`"um/": "./lib/"`). World units are metres,
y is up, the ground is y = 0. Every function is pure: same inputs, same pixels.

## film.js — `new Film({ seed, score, accent, env, post, fadeIn, fadeOut })`
| call | does |
|---|---|
| `F.shot(dur, (w, t, u) => {…}, o)` | a shot. `o.cam` keys `[{ t, at:[x,y,z], yaw, pitch, dist, fov, roll, sx, sy }]` or `{ pos, at }` keys, or `t => cam`; `o.hits [{ t, a (px), d, roll, fov }]` impact shake; `o.holds [[t, d]]` hit-stop; `o.mb` shutter (number or `t => number`); `o.step` drawings per second; `o.env` overrides; `o.tr { type: 'white' \| 'black' \| 'flash', d }`; `o.name` |
| `F.impact(t, d, type, o)` | impact frame at film time: `invert` · `black` · `white` (`keepA`) · `burst` (`x`, `y`) · `flash` |
| `F.env.cracks.push({ crack, t0, d, until })` | a ground crack growing from film time t0 over d, gone at `until` |
| `F.check(name, t => bool)` | a rule check.mjs runs at every sampled t |
| `F.start()` | sets the contract, plays live or waits for `seek` |

Inside a shot, `w` (this frame's world; `t` is content time — hit-stop already applied):
| call | does |
|---|---|
| `w.fighter(H, o)` | the fighter at `o.t ?? t`. `o.flat`, `o.tone`, `o.alpha`, `o.outline` (halo colour) + `outlineW`, `o.ghosts [{ dt, a }]`, `o.glow`, `o.edge`, `o.noCloth` |
| `w.ink(H, o)` | the 墨影 trail: `span`, `w` (m), `from` (shot time it starts), `parts`, `red`, `alpha`, `near` (m; skip points closer to the lens), `lift`, `dry` |
| `w.smear(H, t0, t1, o)` | the blade's path as a crescent: `w`, `red`, `fade`, `inset` |
| `w.inked(p, (ctx, v) => …, dz, alpha)` | any ink at a world point, through the wet layer (slashes, splashes, plumes) |
| `w.layer(zOrPoint, alpha, (ctx, v) => …)` | draw on a separate layer and lay it down at one opacity (no overlap seams; `destination-out` works inside) |
| `w.add(z, (ctx, v) => …)` · `w.at(p, f, dz)` | anything, sorted by depth (`z` = camera depth; 1e6 = far back) |
| `w.flecks(list, o)` | ballistic ink pieces from `fleckList` |
| `w.screen(f)` · `w.top(f)` | drawn over the world · over everything incl. impact frames (the cut line) |
| `w.env({ dark, bg, noFar, groundMarks })` | the world going black (0…1) or a flat colour |
| `w.shear({ y, dx, angle } \| { bands: [{ y0, y1, dx }], zoom })` | cut the finished frame along lines, slide the parts |

URL: `?render=1` fixed canvas, motion blur on (5 sub-frames) · `?t=9` one frame · `?scale=.5` · `?mb=1` blur off ·
`?off=mb,grade,grain,vignette,paper,shear,inkblur`.

## fighter.js
`fighter(design, keys, { name })` → H. `H.pose(t)`, `H.rig(t)` (joints), `H.tip(t)`, `H.eye(t, ±1)`, `H.trace(t0, t1,
part)`, `H.limits(t)`. `POSES` (stand · ready · crouch · dash · slashEnd · rise · tuck · raise · plunge · skid · standUp ·
guard · drawBack · finalCut · endStand · land), `run(phase, { stride, lift, py, lean })`, `DESIGN` (every knob),
`LIM` (joint limits), `drawFighter(ctx, v, H, t, o)`.
Design: `build { scale, head, shoulder, hip, thigh, shin, upper, fore, torso, neck }` · `hair { style, len, seed,
tail, tie }` · `coat { len, back, flare, rag, collar, open, panels }` · `sash { col, tails, len }` · `scarf { len, col }`
· `weapon { kind, len, curve, guard, len2 }` · `face { brow, jaw, lash }` · `skin`, `gloves`, `ink`, `cloth`, `rim`,
`accent`. Pose numbers are listed at the top of the file.

## domain.js
`domain({ motif, seed, accent, wallGlow, fogDist })` then `.giant({ p, size, th, ck, gone })`, `.wall({ z, y0, rows,
cols, size, curve, phases })`, `.swarm({ n, c, r0, r1, size, phases })`. `drawDomain(ctx, v, D, { open, crack, gone,
look, threads, glow, alpha, only, eclipse, corona })`. `MOTIFS.eye · moon · mirror · seal`.

## fx.js
`slash(ctx, v, { c, r, a0, a1, axis, w, head, fade, red, seed, dry })` · `smear(…)` · `arcPts(…)` ·
`focusLines(ctx, W, H, { x, y, n, r0, col, a, t })` · `motionLines(…)` · `shardList(seed, n, { center, speed, size,
r0, tb, spin, white, flat })` + `shards(ctx, v, list, t, { freeze, swirl, pull, red, near })` · `spaceCrack(ctx, x, y,
len, angle, { grow, col, w, branch, glow })` · `cutLine(ctx, a, b, { col, w })` · `burst(…)` · `vortex(ctx, x, y, r, o)`.

## ink.js
`brush(ctx, pts, widthsPx, { dry, seed, head, tail0, fade, core, red: { n, w, side }, splatter, hairs })` ·
`brush3(ctx, v, pts3, widthsM, o)` · `blot(ctx, x, y, r, { dir, stretch })` · `splash(ctx, x, y, r, { grow, sy, spikes,
streaks, drops })` · `fleckList(seed, n, { t0, t1, at, dir, speed, life, size, g })` + `flecks(ctx, v, list, t)` ·
`inkShadow(ctx, v, H, t, o)`.

## world.js
`env({ seed, far: 'pillars' | 'city' | 'trees' | 'stones' | 'none', sky, ground, haze, marks })` · `drawEnv` ·
`groundCrack(seed, [x, z], angle, len, { w, branch })` · `drawCrack` · `groundRing(ctx, v, c, r, w, o)`.

## score.js — `renderScore(spec, rate, dur)`
See the header of `lib/score.js`: `drums` patterns (k s h o t m x c), `bass` (pulse), `drone`, `pad`, `sfx` types
(slash · shing · whoosh · dash · step · land · ink · impact · ultimate · glass · crack · cloth · riser · reverse · boom ·
rumble · ring · heart · tick · metal · thud · taiko), `gain` keys for the drops to silence, `reverb`.
