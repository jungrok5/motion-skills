# 보라 단색 (one-hue violet print)

Slug `monoroom` · kit `kit.js` → vendored as `scenes/kit-monoroom.js` · global `window.Mono` · worked example:
잘라 낸 건 다리였다 · 08 (`sermons/2026-10-24-cross-styles/film/scenes/cs-monoroom.html`; origin: the 6-s style-lab card
`sermons/2026-10-24-style-lab/` lab-monoroom — a kid in a room with a lamp while a storm blows outside). Sister kit:
`risoline` (same figure rig, different medium).

## What it looks like
A one-colour print. **Everything is violet in four values** — pale sky, mid, deep, near-black ink — plus the **cream of the
people**, under heavy mottled grain. A firm black line that only **breathes** (a faint boil on twos, calmer than
risoline). **Texture does what colour can't:** cross-hatching on dark things, single hatching on pale wood, pinstriped
trousers, wet tufty hair. **The weather is the world:** a drifting storm band, a far ridge, wind-bent black trees with torn
pale leaves, slanting rain over everything, puddles with rain rings, a ravine whose hatched walls sink to ink. There is
**one colour — a lamp yellow** — for the one thing the film is about; it comes on with the lab lamp's **flicker**. Other
light is a lighter **value** of the violet (pale halo), never a second hue. The hit is the storm's own: **a lightning bolt
and a frame bleached pale** for two flashes. The cast are the lab's wet-haired kids in hoodies: the accent kid in cream,
the others mid-violet + hatch.

**Carries well:** trouble and endurance (storm, rain, waiting it out), loneliness in a crowd, perseverance, small faith in a
hard season, a light that comes on in the dark, quiet tenderness after the storm; melancholy that is still gentle.
**Carries badly:** joy, celebration, summer, colour as meaning (only one hue + one yellow); bright comedy (use risoline);
anything that needs the viewer to read colour codes; very busy scenes (rain + trees + grain already fill the frame).

## Palette (`Mono.C`, `Mono.ACCENT`)
| token | hex | use |
|---|---|---|
| `sky` / `wall` / `mid` | `#b3b7da` / `#8b8fc4` / `#6b71aa` | sky gradient (bottom → top), cloud band, others' hoodies, ridge |
| `deep` / `deep2` | `#454a86` / `#363a6e` | ground, storm core, door frame, ravine, end plate |
| `ink` | `#15172b` | the line, tree trunks, hatching |
| `cream` / `cream2` | `#f2eee4` / `#e2ddd2` | people, captions; far side, pale wood |
| `leaf` / `pale` | `#c7cae8` / `#dcdef2` | torn leaves; non-accent light, rain rings, splashes, the flash |
| `yel` / `yelL` | `#f1e27c` / `#f8efaa` | **the accent** (the lamp) and its highlight |

## Type and captions
Gamja Flower 400 (soft hand), cream with a soft violet shadow. `Mono.captions(ctx, t, lines)` → size 76 at y 400 (source
line in `pale`); `Mono.endCard(ctx, t, card, at)` → title at y 870 on the deep hatched plate. Font: `Mono.FONT_CSS`,
`Pilot.run({ fonts: Mono.FONTS })`. The storm band sits behind the caption band (y 330–620) — keep it mid-value there.

## Kit API (`window.Mono`; world units = px at zoom 1)
- **Setup / frame:** `init()` · `onTwos(ctx, t, scene)` · `t12` · `boil(t)` · `cam(ctx, cm, p)` · `screen(ctx)` · `mixCam` ·
  `shake(t, t0, len, ax, ay)` · `grain(ctx, cm)` · `lw(v)` / `lwk()`.
- **Line:** `ink(ctx, pts, { fill, tone, lw, col, closed, smooth, raw, step, amp, single })` (fill sits on the line — no
  misregistration) · `line(ctx, a, b, lw)` · `ell` · `tube` · `resample` · `chaikin` · `pathOf` · `wob` · `rot2`.
- **Texture / light:** `pat(name, ox, oy)` ('hatch' | 'hatch2' | 'diag' | 'stripe' | 'grain') · `tone(dense, ox, oy)` ·
  `glow(ctx, x, y, r, a, pale)` (yellow, or `pale = true` for the violet halo) · `flicker(k)` (lamp switching on, k s after) ·
  `dashed(ctx, pts, t)` · `chips(ctx, t, list)`.
- **World:** `sky(ctx, cm)` · `storm(ctx, cm, t, { horizon, treeY, trees })` (band .2 / ridge .45 / trees .8 parallax) ·
  `stormBand`, `ridge`, `tree(ctx, x, y, s, ph, t)`, `TREES` · `makeGround({ top, lane, gaps: [[a, b]…] }).draw(ctx, x0, x1, t)`
  (deep ground, floor lines, puddles with rings, ravines at gaps) · `arch(ctx, x, gy, t, { light })` → `{ op, draw }` ·
  `rain(ctx, t, n)` · **hit** `lightning(ctx, t, t0, sx)` / `flash(k)`.
- **Figure:** `kid(ctx, F, back, mid)` (wet-haired kid in a hoodie; `F.me` cream accent kid; `F.held(ctx, F)`; options
  `F.body`, `F.hair`, `F.sx`) · parts `head`, `leg`, `sleeve`, `mitten`, `FACE`, `HAIR`.
- **Rig (`Mono.Rig`, shared with risoline):** `walkSpec` · `standSpec` · `crouchSpec` · `kneelSpec` / `kneelLegs` · `mixSpec` ·
  `turnSpec` · `lookAt` · `hangHands` · `hangGrip` · `fitReach` · `placeByShoulder` · `Beam` / `CROSS` / `cpt` ·
  `onShoulder` · `gripShoulder` · `steadyBehind` · `inFront` · `holdFront` · `holdLow` · `holdUpright` · `mixX` · `rotAbout` ·
  `mirrorX` · `ik` · `frame` · `headFrame` · `armGeo` (see risoline/STYLE.md for the pose fields).
- **Things / marks:** `beam(ctx, B, X, u0, u1, accent, alpha)` · `drips(ctx, hc, s, t)` · `splashes(ctx, F, gy, k)` ·
  `grit(ctx, x, y, t, t0)`.
- **End:** `endPlate(ctx, t, at, { stamp })` · `stamp(ctx, x, y, sc, rot, draw)` · `sproutIcon` · `captions` · `endCard`.

```js
function init() { Mono.init(); GROUND = Mono.makeGround({ top: 1180, lane: 1300 }); }
function scene(ctx, t) {
  Mono.boil(t); const cm = { x: 600, y: 1080, z: 1.4 };
  Mono.sky(ctx, cm); Mono.storm(ctx, cm, t);
  const z = Mono.cam(ctx, cm, 1); GROUND.draw(ctx, cm.x - 540 / z - 60, cm.x + 540 / z + 60, t);
  const F = Mono.Rig.kneelSpec(560, 1300, 1, 1); F.me = true; Mono.kid(ctx, F);
  Mono.glow(ctx, 660, 1200, 200, Mono.flicker(t - 3)); Mono.glow(ctx, 660, 1200, 320, .6 * Mono.flicker(t - 3), true);
  Mono.screen(ctx); Mono.rain(ctx, t); Mono.lightning(ctx, t, 8, 700); Mono.grain(ctx, cm);
}
function draw(ctx, t) { Mono.onTwos(ctx, t, scene); Mono.captions(ctx, t, S.lines); Mono.endCard(ctx, t, S.endCard, S.beat.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: Mono.FONTS, init, draw });
```

## Draw order (keep it)
boil → sky → storm (band, ridge, trees) → cam(1) → ground → world back to front (door light, clipped walkers, door frame,
lying things, figures by x, accent kid last) → marks (drips, splashes, grit) → screen → rain → lightning → end plate →
grain. Captions / end card text on ones.

## Motion grammar and native moves
On twos like the lab; the line breathes rather than boils, so stillness reads as stillness (good for waiting). The world
always moves a little: trees sway and shed leaves, rain falls, puddle rings spread, the storm band drifts. Native moves:
trudging through rain (drips off the hair, splashes at each footfall), the lamp coming on (`flicker`: flash · dip · on ·
settle · hum) — the accent's entrance; the pale halo for non-accent light; the lightning hit (bleach, bolt, crash zoom +
shake); easing the rain (`rain(ctx, t, n)` with fewer drops) as the resolution; the deep plate rising for the end card.

## Performance (1080 × 1920, Chromium headless, 4 shared CPUs; seek per new pose)
Worked example: 65–71 ms/pose before and after the refactor (noise between runs is larger than the difference).
Template: 51 ms mean (93 ms worst). The trees (leaf polygons through `ink`) and the rain are the cost; on twos halves it.

## Pitfalls
- `glow(…, true)` is the pale halo; passing a canvas also works (the worked example passed its own sprite). Don't light the
  non-accent things yellow — the style has one hue + one colour.
- The ravine path is smooth (`pathOf` default) while the ground polygons are not — keep it, the walls' first 20 points are
  inked separately.
- Trees are parallax .8 and stand on y 1220 (`treeY`): with a different horizon pass `{ horizon, treeY }` to `storm`.
- The flash uses `screen` compositing over everything except grain; keep captions outside the cache (they stay readable).
- Body check: same rig rules as risoline (hands at grip points, a hand on every carried thing, in-betweens, no one-frame
  turns). The hood lies round on the back — keep it round, never pointed.
- Refactor note: pixel-identical to the pre-kit scene (max channel diff 0 at 10 times).

## What a scene author still draws
The one image (the seed/sprout; the cross and saw in the example), the beats from Rig specs, the camera path, story
marks. Start from `template.html` + `script.example.js`.
