# 파스텔 클로버 피크닉 — 수채 + 색연필 (clover)

A sunny clover meadow at a hamster's eye level, in transparent watercolour with a thin coloured-pencil contour: big
three-leaf clovers with pale chevrons, white clover flower balls on tall stems, a sandy path, a willow-twig arch with
sunlight pouring through. Kit: `kit.js` → `window.Clover`. First film: 잘라 낸 건 다리였다 · 11
(`sermons/2026-10-24-cross-styles/film/scenes/cs-clover.html`, the worked example). New scene: `template.html` +
`script.example.js` (the house demo story: walk in, sit and plant a seed, wait, a clover sprout rises in a sunbeam, stand and look up).

## What it looks like
Every shape is a **wash**: flat transparent colour, soft light/dark blooms and granulation (one tiling bloom texture),
pigment pooled darker at the edge, and a thin broken pencil contour in a darker shade of the same colour. Depth is
softness and value — the far meadow is pale and blurred (3 px), the near clover crisp and saturated, the foreground
clover big and swaying. The camera sits low, at the hamsters' height, so the clover is a forest. The cast are round
hamsters (an orange "me", pale grey/cream others) with dashed outlines, a belly patch, big ears, whiskers, stubby
capsule arms. One accent: honey-gold wood and warm sunlight (a sunbeam with motes, a glow, a rim light on fur). The hit
is a watercolour splash with a pale flash and a shake. The whole frame sits on cold-press paper (screen-locked).

**Carries well:** smallness and trust (a tiny creature in a big world), providence and daily bread, gratitude, rest,
childlike faith, growth from small beginnings (seeds, sprouts), gentle loss and hope (the gully, the brook), community,
picnic/table imagery, anything for children and families. Warm, safe, Sunday-afternoon.
**Carries badly:** darkness and threat (a dark gully is as far as it goes), crowds of people, cities and interiors,
fast action, solemn adult grief, anything that needs hard contrast or a black frame. Human figures don't belong in it.

## Palette
| role | hex |
|---|---|
| sky top / mid / bottom | `#A9D8D6` / `#B9E0DC` / `#E9F3D6` |
| far / mid / near / deep clover (+ pencil) | `#A3D38C` / `#79C164` / `#66B558` / `#55A64F` (`#86BD76`, `#4F9A4A`, `#3F8A40`) |
| leaf mix colours (`LEAFS`) | `#6FBD5C #5DAF52 #86CA6A #4FA24C #93D070 #72B95F` |
| chevron / blade / stem | `rgba(232,248,210,.55)` / `#8CC67A` (`#5D9A58`) / `#9CCC86` |
| clover flower / outline / centre | `#FDFDF8` / `#C6CDB9` / `#DFE6C8` |
| path / pooled / pencil | `#EFE2C2` / `#DCC59A` / `#B89A6E` |
| earth / dark / pencil, water | `#CAA47A` / `#9B7651` / `#6F5238`, `#A7D4DD` |
| **accent** — honey-gold wood / pooled / pencil; warm light | `#EBB35A` / `#C27F2C` / `#8F5D24`; `#FFD88A`, `rgb(255,214,140)` |
| other wood | `#CDC6B7` / `#A49B8A` / `#7B7366` |
| willow twig / pencil | `#A9825C` / `#6F523A` |
| hamster "me" fur / ears / outline / belly / paws / nose | `#F3BF8A` / `#E3A46E` / `#B97C4E` / `#FFFAF1` / `#F5B8B0` / `#E88F8C` |
| caption / source / end card | `#335A2C` / `#3F5137` / `#335A2C` + `#46573D` on cream `#FAF7EA` with blue gingham `#DBE9F1` |

## Type and placement
Hi Melody 400 (soft hand lettering) for captions and the end-card title, Noto Sans KR for source lines and credits
(`K.FONTS` for `Pilot.run`). Captions at y = 420 in deep clover green over a soft cream glow (`K.captions`); end card at
y = 860 on a cream page between two gingham ribbons with a clover sprig (`K.endPlate` → `K.endCard`, no title glow).
Rendering needs `~/.local/share/fonts/HiMelody-Regular.ttf` (Google Fonts is blocked while recording).

## Kit API (`const K = Clover`)
World px (1080×1920 frame at zoom 1; path y ≈ 1204–1352, feet on y ≈ 1250–1300). Every function has a comment in `kit.js`.
- **setup** — `init()` → bloom (1024²) + paper (W×H) textures, 18 leaf stamps `K.LS`, a flower ball `K.flowerS`, the
  hamster body, end plate, caption glow (≈ 0.9 s). Constants `C PAL ACCENT GLOW FONT SANS FONTS CROSS HAM LEAFS`;
  `hamPal('#hex')`, `shade(hex, k)`, `t12`, `frac`.
- **washes** — `wash(ctx, path, col, edge, {bloom, ew, pool, line, lw, la, dash})` (the style's mark), `bloom()`,
  `smooth`, `rough`, `pathOf`, `ellPts`.
- **clover pieces** — `cloverLeaf(ctx, x, y, s, rot, tilt, col, line, seed)`, `leafSprite`, `cloverSprite` (on a stem,
  pivot `.px/.py`), `flowerSprite(r, seed, pale)`, `blade`, `violet`, `stamp`, `ladybug(ctx, t, cx, cy)`.
- **world** (builders take the scene's ONE shared rng `r`; keep the call order) — `sheet`, `drawSheet`; `skySheet(r)`
  (.1), `farMeadow(r, x0, x1)` (.32, blurred), `tallFlowers(r, x0, x1)` + `drawTall(ctx, t, list)` (.55, sway),
  `midBand(r, x0, x1)` (.72), `ground(r, {x0, x1, top, bottom, y1, gap:{E, G}})` (path + clover bank; a gully cut when
  `gap`), `gully(r, {E, G, top, y1})` (inside the gap; draw first), `brook(ctx, t, E, G, y)`, `dapple()` +
  `drawDapple(ctx, t, img, x0, x1, top, bottom)`, `sunbeam(r)`, `motes(r, x)` + `drawMotes(ctx, t, list, x, base)`,
  `arch({x, top, base, R0}, beam, motes)` → `{back(ctx), clip(ctx), front(ctx, t)}` (the lit doorway: draw figures
  walking in between `save(); clip()` and `restore()`), `foreLeaves(r, x0, x1)` + `drawFore(ctx, t, list, bugIndex)` (1.18).
- **the hamster** — pose `F = {x, gy, k, f, lean, bob, crouch, sq, breath, head, eye, feet, paws, pal, rim, farBehind,
  nearLow, alpha}`; `drawHam(ctx, F, mid, front)`, `hamShadow`; poses `hamWalk(x, gy, k, f, ph, {stride…} | {hop})`
  (waddle or bounding hop), `standSpec`, `kneelSpec` (sit low and lean in), `lookUp(F, k)`, `reach(F, far, near)`,
  `turn(A, B, k)` (squash), `mixSpec`, `stepTo(F, max)` (step/crouch until the paws reach their grips — bones never
  stretch), `worldPt(F, u, v)`, `bodyPt`. Eyes: `open strain closed down shock wet up`.
- **long things held** — `carryLong(F, a0, {contact, u0, at})` (hugged against the chest, never through the ground),
  `holdFront(F, len)`, `holdUpright(F, len)`, `upOn(X, u, off)` (a paw ON the object), `cpt`, `mixX`, `rotAbout`.
- **wood** — `crossSprite(col, edge, line, lying, seed, D, endc)` (`D.CBX = null` → a plain beam), `glowSprite(X)`,
  `drawCross(ctx, X, u0, u1, x, y, a, alpha, glow)`, `crossPts(hb, D)`.
- **effects** — `chips(ctx, t, list)`, `splashDrops(seed, n)` + `splash(ctx, u, x, y, drops, {clip, scale, alpha})`
  (THE hit), `flash(ctx, t, at)`, `warmGlow(ctx, x, y, R, a)`, `warmWash(ctx, k)`, `cutFlash(ctx, x, y, h)`.
- **camera** — `layer(ctx, cm, p, fn(z))`, `mixCam`, `shakeAt(t, at, dur, ax, ay)`.
- **post and words** — `endPlate(ctx, t, at)`, `paperPass(ctx)`, `capGlow`, `captions(ctx, t, lines, o)`, `endCard(ctx, t, card, at, o)`.

```js
const K = Clover, S = SCRIPT, B = S.beat, T = {};
async function init() { K.init(); const r = Pilot.rng(5);
  T.sky = K.skySheet(r); T.far = K.farMeadow(r); T.mid = K.midBand(r, -1300, 2300);
  T.ground = K.ground(r, { x0: -1200, x1: 2600 }); T.fore = K.foreLeaves(r, -1200, 3000); }
function draw(ctx, t) { const cm = { x: 600, y: 1150, z: 1.4, sx: 0, sy: 0 };
  ctx.fillStyle = K.C.sky1; ctx.fillRect(0, 0, Pilot.W, Pilot.H);
  K.layer(ctx, cm, .1, () => K.drawSheet(ctx, T.sky)); K.layer(ctx, cm, .32, () => K.drawSheet(ctx, T.far));
  K.layer(ctx, cm, .72, () => K.drawSheet(ctx, T.mid));
  K.layer(ctx, cm, 1, () => { K.drawSheet(ctx, T.ground); const F = K.hamWalk(300 + 80 * t, 1300, 2.5, 1, t, {}); F.pal = K.PAL.me; K.hamShadow(ctx, F); K.drawHam(ctx, F); });
  K.layer(ctx, cm, 1.18, () => K.drawFore(ctx, t, T.fore)); K.endPlate(ctx, t, B.end); K.paperPass(ctx);
  if (t < B.end) K.captions(ctx, t, S.lines); K.endCard(ctx, t, S.endCard, B.end); }
```

## Frame skeleton (keep this order)
sky fill → sky (`.1`) → far meadow (`.32`) → tall flowers (`.55`) → clover band (`.72`) → world (`1`): gully → brook →
ground → dapple → `arch.back` → figures inside (clipped) → `arch.front` → bridges → shadows → the others → props → the
hero (`drawHam` with the held thing in `mid`) → splash, chips → foreground clover (`1.18`) → `warmWash` → `flash` →
`endPlate` → `paperPass` → `captions` → `endCard`.

## Motion grammar (what worked in the film)
- **Low and close**: the hook at z 1.62 on the hero, widening to ~1.0 by 2.6 s; z 1.32 on hands; .74 wide on the turn
  (the gap and the sunlit arch at once); crash zoom (`eo` over .09 s) + `shakeAt` + `flash` on the hit, settle over .7 s.
- **Hamster acting**: a strain waddle (`strain` eyes, crouch .25–.37, slow sway), a bounding **hop** when lighter
  (`hamWalk({hop})`: stretch in the air, squash on landing), a shocked stop (lean back, `shock` eyes), `wet` eyes at
  the end. Turns get a `.09` squash (`turn`). Pick-ups and set-downs ≥ 0.4 s with the paws ON the object (`upOn`), the
  far arm behind the body (`farBehind`), shoulders an arm-width apart.
- **Native ambient motion** (never stops, never story): tall flowers and foreground clover sway, dappled light drifts on
  the path, the brook glints, motes drift down the beam, a ladybug walks a foreground leaf.
- **The accent is sunlight**: it arrives (beam + motes + warm wash), touches what matters (`rim` on fur, `glow` on the
  honey wood), and the hope beat is a dashed outline lighting slot by slot with warm light, not wood.

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- `init` ≈ 1.1–1.3 s for the film (bloom 1 M px + paper 2 M px + 18 leaf stamps + sheets; the ground sheet is the biggest).
- Film ≈ 57–61 ms/frame before the kit, 59–67 ms after (interleaved runs; noise ±8 ms — same code path).
- Template ≈ 63 ms/frame, `init` ≈ 1.1 s.
- Washes are the cost: each `wash` = fill + pattern fill + 3 edge strokes + a dashed contour. Draw static things on
  sheets; live washes (a growing leaf, a seed) are fine in ones and twos, not in dozens.

## Pitfalls
- **One rng stream, fixed order.** The builders scatter with the `r` you pass; adding a builder call in the middle
  changes everything after it. Append new ones at the end (or give them their own `rng(seed)`).
- **Roughen once.** `rough()` wobble is keyed on coordinates — build a path once in local units and move it with the
  transform. `cloverLeaf` and `wash` have no noise in them, so they can be drawn live (the sprout in the template).
- The bloom texture is a world-space pattern on sheets but a local-space one on live washes (it moves with them) — fine
  for small things, visible as "swimming" on a big moving wash: put big ones on sheets.
- `drawHam` IK clamps out-of-reach targets (window.__reachLog lists them when set to `[]`) — use `stepTo` / `kneelSpec`
  to bring the body to the grip; a hamster's reach is ≈ 100 px at k = 2.5.
- A hamster is a ball ~300 px wide at k 2.5: keep its x ≥ 200 px away from a thing it looks at, or the body covers it.
- The far meadow is blurred after building (`farMeadow` returns the blurred canvas) — don't draw on it later.
- `endPlate` must come before `paperPass` (the plate is paper too), captions after.
- Body-check findings fixed in the film: cross on the far shoulder with the far paw over the crossbar, the near arm
  never crossing the beam (`nearLow` / `farBehind`), no visible stretch at the reach over the edge (stepTo), the short
  cross carried flat below the face.
- Refactor note: the kit reproduces the film pixel for pixel (max channel diff 0 at 10 times); only `crossSprite` /
  `drawCross` take the dims object `D`, and `carryLong` is the old `carryX` without the story's contact/flat rules.

## What a scene author still draws
The story: the layout (path band, where the gap / arch / subject stand), the subject (washes and clover pieces, paths
built once), the beat timeline and each figure's pose function of t, what the figures hold and where their paws grip it,
the camera keys, and `script.js`. The template shows each with ✎ marks.
