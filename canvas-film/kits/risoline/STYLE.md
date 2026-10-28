# 리소 라인 (risograph comic line)

Slug `risoline` · kit `kit.js` → vendored as `scenes/kit-risoline.js` · global `window.Riso` · worked example:
잘라 낸 건 다리였다 · 07 (`sermons/2026-10-24-cross-styles/film/scenes/cs-risoline.html`; origin: the 6-s style-lab card
`sermons/2026-10-24-style-lab/` lab-risoline). Sister kit: `monoroom` (same figure rig, different medium).

## What it looks like
A two-ink risograph comic. The ground is a **flat, mottled teal-blue field** (the riso world is all sky: clouds above and
below a floating road strip). Shapes are **cream, printed a hair out of register** under a **thick, wobbly black line
that boils** (fresh jitter 12×/s). Shade is a **dot screen** (two densities), and a heavy print grain lies over everything,
locked to the camera. There is **one extra ink — yellow** — for the thing the film is about (and its light). The cast are
**beanie kids**: the accent kid in plain cream with a black-and-cream striped scarf whose tail blows back, the others
dot-toned. Everything poses **on twos**; only caption fades run on ones. The grammar is a comic's: sweat drops and gloom
lines under weight, surprise ticks, squiggle motion lines and heel puffs, a pop-in inset panel for a face, **manga focus
lines for the hit**, a cream comic plate dropped in for the end card.

**Carries well:** parables and everyday moral stories told lightly; a small person and one burden / one gift (the yellow
thing); comedy that turns serious (the comic marks make the turn land); before/after, cut/kept, short/long; children,
families, Sunday-school warmth; a crowd of "the others" who are all alike (dot tone) and one who isn't (plain + scarf).
**Carries badly:** awe, terror, darkness, night (the field is always light blue); grief that must not be cute; realistic
faces or hands; scenery-led meditations; more than one colour of meaning; fast camera work (the boil and the twos fight it).

## Palette (`Riso.C`, `Riso.ACCENT`)
| token | hex | use |
|---|---|---|
| `field` | `#7fb0bc` | the page / sky (with mottling) |
| `panel` | `#9cc5cf` | inset panel ground |
| `cream` / `cream2` | `#f1ebdc` / `#e6dfcb` | figures, clouds, bushes; the far side of a figure |
| `ink` | `#1d2123` | the line, shoes, scarf stripes, focus lines, captions |
| `yel` / `yelL` | `#f1c75e` / `#f7da86` | **the accent** (one thing + its light); print highlight |
| `road` / `ground` / `deep` | `#6d9fac` / `#5f909d` / `#33555e` | road top / front face (dot-toned) / deep shade |

## Type and captions
Gaegu 700 (hand lettering), black ink, no shadow (the field is light). `Riso.captions(ctx, t, lines)` → size 70 at y 405;
`Riso.endCard(ctx, t, card, at)` → title at y 860 on the dropped cream plate. Load the font with `Riso.FONT_CSS` and
`Pilot.run({ fonts: Riso.FONTS })`. Keep words in the top band (y 330–620); the bottom 380 px and right 140 px stay clear.

## Kit API (`window.Riso`; world units = px at zoom 1)
- **Setup / frame:** `init()` (textures + on-twos cache) · `onTwos(ctx, t, scene)` · `t12(t)` · `boil(t)` (call first in scene) ·
  `cam(ctx, cm, p)` (world transform at parallax p, scales line/jitter/dots; → zoom) · `screen(ctx)` · `mixCam(a, b, k)` ·
  `shake(t, t0, len, ax, ay)` → [sx, sy] · `grain(ctx, cm)` (last) · `lw(v)` / `lwk()` (line-width multiplier).
- **Line:** `ink(ctx, pts, { fill, tone, lw, col, closed, smooth, raw, step, amp, mx, my, single })` — THE primitive ·
  `ell` · `tube(line, widths)` · `resample` · `chaikin` · `pathOf` · `wob` · `rot2` · `spark4`.
- **Print:** `tone(dense, ox, oy)` dot screen fill · `glow(ctx, x, y, r, a)` yellow light · `sparkle(ctx, x, y, r, a)` ·
  `dashed(ctx, pts, t)` marching outline · `chips(ctx, t, list)` thrown flecks.
- **World:** `field(ctx, cm)` · `sky(ctx, cm, t, { high, low })` (cloud layers) · `cloud(ctx, x, y, s, seed)` ·
  `makeRoad({ top, front, bottom, gaps: [[a, b]…] }).draw(ctx, x0, x1)` (floating road strip, broken ends at gaps, bushes,
  tufts) · `arch(ctx, x, gy, t)` → `{ op, draw }` (open arched door, yellow light; clip walkers to `op`, then `draw()`).
- **Figure:** `kid(ctx, F, back, mid)` (beanie kid in pose F; `F.me` accent kid; `F.held(ctx, F)` a tool in the near hand;
  options `F.scarf`, `F.wind`, `F.sweater`, `F.beanie`, `F.sx`) · parts `head`, `leg`, `sleeve`, `mitten`, `FACE`/`BEANIE`/`FOLD`.
- **Rig (`Riso.Rig`, shared with monoroom):** poses `walkSpec(x, gy, s, f, ph, stride, lean, lift)` · `standSpec` ·
  `crouchSpec(x, gy, s, f, depth, lean)` · `kneelSpec(x, gy, s, f, lean)` / `kneelLegs(F)` · `mixSpec(A, B, k)` (blends
  knees in/out of a kneel) · `turnSpec(A, B, k)` (head leads, body flips at .5, x-squash) · `lookAt(F, p)` · hands
  `hangHands`, `hangGrip`, `fitReach(F, i, target)` (leans until the hand reaches), `placeByShoulder(F, target)` · long
  things `Beam({ L, PW, bar })`, `CROSS`, `cpt(X, u, v)`, `onShoulder`, `gripShoulder`, `steadyBehind`, `inFront`,
  `holdFront`, `holdLow`, `holdUpright`, `mixX`, `rotAbout`, `mirrorX` · low level `ik`, `frame`, `headFrame`, `armGeo`.
- **Things:** `beam(ctx, B, X, u0, u1, accent, alpha)` (plank / cross; yellow when accent).
- **Marks:** `sweat(ctx, hc, s, t)` · `gloom(ctx, hc, s)` · `ticks(ctx, hc, s, k, dir)` · `runLines(ctx, F, k)` ·
  `puffs(ctx, F, gy, k)` · `squiggle(…)` · **hit** `focus(ctx, sx, sy, k)` · `inset(ctx, t, a0, a1, [x, y, w, h], content)`.
- **End:** `endPlate(ctx, t, at, { stamp })` · `stamp(ctx, x, y, sc, rot, draw)` · `sproutIcon` · `captions` · `endCard`.

```js
function init() { Riso.init(); ROAD = Riso.makeRoad({ top: 1180, front: 1366, bottom: 1450 }); }
function scene(ctx, t) {
  Riso.boil(t); const cm = { x: 600, y: 1080, z: 1.4 };
  Riso.field(ctx, cm); Riso.sky(ctx, cm, t);
  const z = Riso.cam(ctx, cm, 1); ROAD.draw(ctx, cm.x - 540 / z - 60, cm.x + 540 / z + 60);
  const x = 200 + 80 * t, F = Riso.Rig.walkSpec(x, 1300, 1, 1, x / 120, 120, .1); F.me = true;
  Riso.kid(ctx, F); Riso.beam(ctx, Riso.Rig.Beam({ L: 300 }), { x: 700, y: 1290, a: 0, u0: 0, lie: true }, 0, 300, true);
  Riso.screen(ctx); Riso.grain(ctx, cm);
}
function draw(ctx, t) { Riso.onTwos(ctx, t, scene); Riso.captions(ctx, t, S.lines); Riso.endCard(ctx, t, S.endCard, S.beat.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: Riso.FONTS, init, draw });
```

## Draw order (keep it)
boil → field → sky → cam(1) → road / world back to front (door light, figures inside the door clipped to `op`, door frame,
lying things, figures sorted by x, the accent kid last) → marks → screen → hit (focus) → inset → end plate → grain.
Captions and the end card text are drawn on ones, outside the cache.

## Motion grammar and native moves
On twos for everything posed (12 fps) — the boil is the life; a held pose still boils. Moves land with ease-in-out, comic
beats with a little overshoot (inset pops 1.12×). Native moves: the burdened stagger (lean .34, short stride, sweat +
gloom), the light run (stride ×2.4, scarf flying, squiggles, heel puffs), the shocked stop (surprise ticks, eye 'shock',
mouth 'o'), the crash push in for the hit (camera z ×1.25 in 0.1 s + shake 0.5 s + focus lines 0.5 s), the look back (head
first, body flips a frame later — never a one-frame 180°), glow-on of the yellow thing, the dashed outline of "what's
missing", the dropped cream plate. Camera: slow push-ins on waits, quick snaps on hits; parallax .25 / .55 for clouds.

## Performance (1080 × 1920, Chromium headless, 4 shared CPUs; seek per new pose, perf.mjs)
Worked example: 32–34 ms/pose before the refactor, 31–33 after (on twos, so half the frames are a cached blit).
Template: 22 ms mean (93 ms worst, the end-card frame). init ≈ 0.3 s (grain 512², mottle 1024² pre-scaled).

## Pitfalls
- The boil must be keyed on the pose time: `Riso.boil(t)` inside `scene` (which onTwos calls with t12) — never Date/random.
- `Riso.cam` sets the line scale; draw screen-space things only after `Riso.screen(ctx)`, or lines come out the wrong weight.
- An unscaled 128² mottle pattern fill was ~3× slower than the pre-scaled 1024² one the kit builds.
- Body check (twice on the worked example): hands go AT the grip point and the arm is solved from the shoulder; one hand
  one object (the saw hand never also holds the beam); a carried beam always has a hand on it (`steadyBehind`); 1–2
  in-betweens for set-down / pick-up (crouch); no one-frame 180° turns (`turnSpec` / head first). `lookAt` only turns the
  head round when the point is clearly behind — a point under the chin is a nod, not a turn.
- The kid's arms are short (64 + 60): reaching the ground from a kneel needs a deep bow; put the target a little "back" on
  the road (y − 30…40) or crouch (`placeByShoulder`) — `fitReach` leans the body until the hand gets there.
- Refactor note: the kit reproduces the worked example pixel-identically (max channel diff 0 at 10 times); the rig's newer
  additions (kneel, knee blending, lookAt, turnSpec, holdUpright) are not used by that film.

## What a scene author still draws
The film's one image (the seed/sprout, the cross and saw in the example are scene code using `ink`/`tube`/`beam`), the
beats (`pose(t)` built from Rig specs), the camera path, any close-up for the inset panel (the example's big face is in the
scene), and story-specific marks. Start from `template.html` + `script.example.js`.
