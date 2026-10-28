# 파스텔 색연필 그림책 (pastelbook)

A sunny picture-book meadow in soft coloured pencil: flat light fills with pencil grain and paper tooth, thin wobbly
outlines in a darker pencil of each colour, puffy clouds, cone and lollipop trees, a cream path, a pink cottage with a
warm open door — and a cast of small round bears. Kit: `kit.js` → `window.Pastelbook`. First film: 잘라 낸 건 다리였다 · 10
(`sermons/2026-10-24-cross-styles/film/scenes/cs-pastelbook.html`, the worked example). New scene: `template.html` +
`script.example.js` (the house demo story: walk in, kneel, plant a seed, wait, a sprout rises in the warm light, stand and look).

## What it looks like
A children's picture book you could hold: every shape is a flat pastel fill with a soft shade band and the pencil's
diagonal grain (white specks where the pencil skipped), outlined by a slightly darker pencil of its own colour drawn
twice, a hair apart. Nothing is black; the darkest ink is warm brown `#5A4034`. Depth is four parallax planes (clouds,
far hills, meadow, the path) — no blur, no haze except inside a ravine. The cast are round bears (cream "me", grey/beige
others) with dot eyes, blush, a muzzle, a short tail, posed on twos. One warm accent: honey-coloured wood and gold light
(a door, a glow, sparkle ticks). Emotion is told picture-book style: sweat drops, `> <` strain eyes, shock eyes, impact
ticks, speed ticks, dust puffs, a crash zoom with a wobble.

**Carries well:** parables and fables told to a child's eye, innocence, home and belonging (the lit doorway), small
honest moments (a choice, a gift, a seed, waiting), community (a row of the same bears), gentle humour, hope after a
fall. It disarms: a hard message (sin, loss, a cut-off bridge) lands softer and is watched to the end.
**Carries badly:** horror, real violence, night, deep grief, adult realism (faces, hands with fingers), anything that
must feel dangerous for long — the style keeps saying "it's all right". Dark scenes need the ravine's violet dark,
not black.

## Palette
| role | hex |
|---|---|
| sky top / bottom | `#A9D4EA` / `#D4EBF2` |
| cloud / outline | `#FDFCF6` / `#B9A596` |
| far hills / outline, hills / outline | `#A7CF93` / `#86B07A`, `#B4DA98` / `#8FBA7F` |
| meadow / outline / darker | `#BFE0A0` / `#97C084` / `#AED392` |
| trees: cone, round, trunk (+ outlines) | `#86BD78`, `#99CC84`, `#B48A72` (`#5F9862`, `#6AA064`, `#87604F`) |
| path / outline | `#F5EFC4` / `#D5C993` |
| cottage wall, roof, door frame | `#FBF5E6`, `#F3B6C0`, `#D9B494` |
| earth, ravine dark | `#E6C9AB` / `#D9B597` / `#AD8A70`, `#4A4276` |
| daisies | `#FFFDF4`, `#F6C0C8`, centre `#F8DE7C` |
| ink (ticks, frame) / dark ink (eyes) | `#8A6450` / `#5A4034` |
| bear "me" fur / far limbs / outline / muzzle | `#ECD0A6` / `#DCB98B` / `#A57D5A` / `#F8ECD6` |
| **accent** — honey wood body / light / grain / outline | `#EBA54C` / `#F8CF82` / `#C47A2C` / `#94582A` |
| warm light (door, windows, glow rgb) | `#FFD77A`, `rgb(255,222,150)` |
| caption / source / end title | `#4E3324` / `#5A3C2C` / `#4A3022` on cream `#FFFAF0` slips and a `#F8F0DC` end page |

## Type and placement
Gamja Flower 400 (hand lettering) for captions and the end-card title, Noto Sans KR for source lines and credits
(`K.FONTS` for `Pilot.run`). Captions at y = 410 on a cream paper slip with a soft pencil edge (`K.captions`), so they
read over clouds and the cottage roof. End card at y = 860 on a cream page framed by a wobbly pencil line with three
daisies (`K.endPlate` then `K.endCard`). Rendering needs `~/.local/share/fonts/GamjaFlower-Regular.ttf` (Google Fonts is
blocked while recording).

## Kit API (`const K = Pastelbook`)
World px (the 1080×1920 frame at zoom 1; ground lanes around y 1212–1352). Every function has a comment in `kit.js`.
- **setup** — `init({grainSeed, paperSeed, sky0, sky1})` → grain + paper tiles, `K.sky` (flat sky canvas), `K.puff`,
  `K.frame` (end-page frame), bear parts (≈ 0.3 s). Constants `C ME PALS XME XPIL ACCENT GLOW FONT SANS FONTS HIPH CROSS`;
  `bearPal('#hex')` a recoloured bear; `t12(t)` on twos; `frac`.
- **pencil** — `smooth(pts, closed)`, `rough(pts, amp, seed, step)`, `ellPts`, `linePath`, `pencil(ctx, path, col, w)`,
  `fillPencil(ctx, path, col, {shade, shadeDir, bbox, grain, pat})`, `shape(ctx, pts, fill, line, o)`,
  `blobs(ctx, circles, fill, line, o)` (union of circles, one outline), `grain()`, `grainScaled(k)`.
- **meadow furniture** — `cone`, `roundTree`, `bushRow`, `flower` (daisy), `grassTicks`, `cloudSprite`, `clouds()` (the
  film's sky), `drawClouds(ctx, t, list)`, `butterfly(ctx, t, x, y, a)`.
- **sheets and world** — `sheet(x0, y0, x1, y1, fn, K)`, `drawSheet(ctx, s)`, `ridge`, `ridgeY`, `crestY`;
  `farHills(x0, x1)` (parallax .35), `midMeadow(x0, x1)` (.65), `road({x0, x1, ridge, top, bottom, pathEnd, y1, gap})`
  (the near meadow + cream path), `ravine({E, G, top, bottom, ridge})` → `{trench(y), path, sheet}` (a gap: pass it as
  `road({gap})`), `cottage({x, base, doorW, doorTop, wins, spillTo})` → `{back(ctx, t), front(ctx, t)}` (lit door; draw
  figures entering between back and front).
- **the bear** — pose `F = {s, f, pal, gy, hip, ang, feet, hands, hand, tilt, eye, sweat, farFront, sq, alpha}`;
  `drawBear(ctx, F, mid, back)`; poses `walkSpec(x, gy, s, f, phase, stride, lean, lift, bounce)`, `standSpec`,
  `crouchSpec`, `kneelSpec`, `lookUp(F, k)`, `reach(F, far, near, types)`, `turn(A, B, k)` (squash at the middle),
  `mixSpec(A, B, k)`; `hangHands`, `hangGrip` (a small thing carried at the side), `shoulderOf`, `frame`, `ik`;
  `bearShadow`. Eyes: `calm strain shock down happy up`. Paws: `fist grip flat open`.
- **long things held** — `carryLong(F, a0, {w, contact})` (on the shoulder), `holdFront(F, len)`, `holdUpright(F, len)`,
  `gripLong(F, X, [u, v], [u, v])` (paws ON the object), `cpt(X, u, v)`, `mixX`, `rotAbout`.
- **wood** — `crossSprite(pal, lying, seed, D)` (`D.CBX = null` → a plain beam), `drawCross(ctx, X, u0, u1, x, y, a, alpha, shadow)`
  (cut ends get end grain), `crossPts(hb, D)`.
- **effects** — `sparkles(ctx, x, y, r0, k, t, n)` (the warm-light sign), `warmGlow(ctx, x, y, R, a)`, `chips(ctx, t, list)`
  (sawdust / crumbs / soil), `snapTicks(ctx, t, at, x, y)`, `hit(ctx, t, at, x, y)` (dust curls + burst), `speedLines`,
  `dust(ctx, t, steps, gy)`, `dashedOutline(ctx, path, t, o)`.
- **camera** — `layer(ctx, cm, p, fn)`, `mixCam(a, b, k)`, `shakeAt(t, at, dur, ax, ay)`, `crashZoom(cm, t, at, target, back)`.
- **post and words** — `paperPass(ctx, cm)` (world-locked tooth), `endPlate(ctx, t, at)`, `captions(ctx, t, lines, o)`
  (slips + Story.captions), `capPlates`, `endCard(ctx, t, card, at, o)`.

```js
const K = Pastelbook, S = SCRIPT, B = S.beat; const T = {};
async function init() { K.init(); T.clouds = K.clouds(); T.far = K.farHills(); T.mid = K.midMeadow();
  T.road = K.road({ x0: -1200, x1: 2400, pathEnd: 1300 }); T.cot = K.cottage({ x: 1050, base: 1252 }); }
function draw(ctx, t) { const cm = { x: 600, y: 1150, z: 1.3, sx: 0, sy: 0 };
  ctx.drawImage(K.sky, 0, 0); K.layer(ctx, cm, .12, () => K.drawClouds(ctx, t, T.clouds));
  K.layer(ctx, cm, .35, () => K.drawSheet(ctx, T.far)); K.layer(ctx, cm, .65, () => K.drawSheet(ctx, T.mid));
  K.layer(ctx, cm, 1, () => { K.drawSheet(ctx, T.road); T.cot.back(ctx, t); T.cot.front(ctx, t);
    const F = K.walkSpec(400 + 90 * t, 1300, 1.16, 1, t, 78, .12); F.pal = K.ME; K.drawBear(ctx, F); });
  K.paperPass(ctx, cm); K.endPlate(ctx, t, B.end);
  if (t < B.end) K.captions(ctx, t, S.lines); K.endCard(ctx, t, S.endCard, B.end); }
```

## Frame skeleton (keep this order)
`K.sky` → clouds (`layer .12`) → far hills (`.35`) → meadow (`.65`) → world (`1`): ravine sheet → road sheet →
`cottage.back` → figures in the doorway → `cottage.front` → bridges/props on the back lane → the others (sorted by x)
→ the hero and what they hold → effects (dust, speed, snap, hit, chips) → `paperPass` → `endPlate` → `captions` → `endCard`.

## Motion grammar (what worked in the film)
- **Figures on twos, camera on ones**: poses are evaluated at `t12(t)` and slid by the camera's own smooth motion.
  For walking figures keep the x on ones (`meX(t) − meX(t12(t))` offset) so they don't stutter across the frame.
- **Hook close, then widen** (z 1.75 → 1.14 over ~1 s); **push in on hands** (z 1.4 on every cut); **wide on the
  turn** (z .86 shows the gap, the cottage and the procession at once); **crash zoom with a wobble** on the hit
  (`.09 s` snap + `shakeAt`); a slow travel back along the road for the reveal.
- Picture-book acting: a startled stop (lean back + shock eyes + sweat), a big bouncy run with speed ticks and dust
  puffs, a strain walk (`> <` eyes, sweat, heavy bob). Pick-ups/set-downs ≥ 0.4 s (in-betweens with the paws on the object).
- The accent light is **where hope is**: the door, then the glowing cut pieces / a dashed outline that lights slot by
  slot. Sparkle ticks (`sparkles`) mark anything glowing.
- Ambient life without story weight: clouds drift (4–7 px/s), chimney smoke puffs, a butterfly, the door light flickers 3 %.

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- `init` ≈ 0.55–0.65 s for the film (tiles 2 × 512², sheets ≈ 0.25 s, the ravine sheet is the biggest).
- Film ≈ 52–61 ms/frame before the kit, 56–64 ms after (interleaved runs; noise ±8 ms) — same code path.
- Template ≈ 50–56 ms/frame, `init` ≈ 0.57 s.
- Most of a frame is the bears (each ≈ 3–5 ms: grain-filled limbs, two-pass pencil) and the paper pass (soft-light full frame).

## Pitfalls
- **Roughen once, in local units.** `rough()` keys its wobble on coordinates: a shape re-roughened at a moving position
  crawls. Build paths once (the bear's parts, a leaf, a mound) and move them with the transform.
- **The grain pattern is in world units**; a sprite drawn at 2× and scaled down needs `grainScaled(2)` or its grain is
  half size (the wood sprites do this).
- `drawBear` IK clamps: a paw target out of reach (> 98·s from the shoulder) leaves the paw short — move the hip (crouch,
  lean, step), never the bone lengths. Kneeling bears can't reach the ground in front: lean into `crouchSpec`.
- `F.sq` squashes the whole bear about its feet — use it for turns and landings only (gripped paws would leave the grip).
- `mixSpec` switches hand types, face and `f` at k = .5; a turn needs `turn()` (squash hides the flip).
- The others' crosses were drawn with their paws ~20–40 px off the beam in early versions — always derive grips from
  the object (`gripLong` / `cpt`) and draw the object in `mid` so the near paw closes over it.
- Body-check findings fixed in the film: the far paw over the shoulder on the beam, the near paw on the rising beam end
  at a pick-up, the cross kept below the chin when held in front.
- Refactor note: the kit reproduces the film pixel for pixel (max channel diff 0 at 10 times); the only API change is
  that `crossSprite`/`drawCross` take the dims object `D` and `layer` passes the zoom to `fn`.

## What a scene author still draws
The story: the layout (lanes, where the gap/door/subject stand), the subject (built once as local paths, drawn with
`fillPencil` + `pencil`), the beat timeline and each figure's pose function of t (from the kit's poses), what the
figures hold and where their paws grip it, the camera keys, and `script.js`. The template shows each with ✎ marks.
