# 우키요에 목판화 (Ukiyo-e woodblock handscroll)

Kit: `kit.js` → vendored as `scenes/kit-ukiyoe.js`, global `window.Ukiyoe`. Source brief: lemo-opuscar `styles/ukiyoe`
(Hiroshige's Tōkaidō road stations, Hokusai's waves). Worked example:
[잘라 낸 건 다리였다 ④](../../sermons/2026-10-11-1cor4/film/scenes/cross-ukiyoe.html) (pilgrims, crosses, a cleft over the sea).
Template: `template.html` + `script.example.js` (the shared seed story: walk in, kneel, plant, wait, sprout, stand, end card).

## What it looks like
One long printed sheet seen through the portrait window and panned like a handscroll. Flat colour blocks (no shading
inside a block) printed a couple of pixels **out of register** with a thin sumi key line; a hand-wiped **bokashi** sky
(indigo band at the top, pale blue rising from the horizon); Prussian-blue sea with rows of paper crests and clawed
spray; Hiroshige pines with flat needle pads; long rounded **mist bands** (suyari-gasumi) of bare paper; Fuji. The
print texture is real: woodgrain in the ink, baren rubbing, goma-zuri specks, washi fibres. Depth is **oblique**
(fukinuki): one unit of depth = (+0.5, −0.42) px, so things lying flat show their tops as parallelograms.
**Light is bare paper**: the gate's glow, rays, foam, snow, mist are *cut out of the ink*, never painted white.
Figures are small pilgrims (kasa hat, indigo robe, tabi, straw sandals) that pose on 8 fps like a flip-book.
One accent block: **beni red** — the protagonist's thing (my cross, the seed and its flower).

## Meanings it carries
**Well:** pilgrimage, the road, a journey with others (a procession), distance and patience, the sea's power (the
hit = a wave's claws), a landscape that is bigger than the person, quiet faith, seasons and waiting, a parable told
like a folk tale; one red thing among many that are the same.
**Badly:** close-up emotion on a face (faces are a profile and a hat), interiors, modern settings (phones, cars),
darkness and horror (the paper is always there), fast cutting, anything that needs realistic light and shadow.

## Palette (`Ukiyoe.PAL`)
| role | hex |
|---|---|
| paper / mount | `#eee2c6` / `#bba679` (mount tile multiplied by `#c9b38a`) |
| Prussian blue (sea, sky band) | `#1d3a66`, dark `#13284a`, light `#4d6f98`; sky `#8db0c6`, `#bcd0d6` |
| sumi key | `#231f1c` |
| mountains | `#a6bccd`, `#7f9cb6` |
| greens | `#b5c07a`, `#8aa152`, `#50703c`; pine `#3e5a3a` |
| road / ochre | `#dcc28c`, `#c4a46a`; ochre `#cf9f4a`, `#e2c27e` (the warm light pool); straw `#c9a45c` |
| rock | `#8e9b8a`, `#66735f`, `#56604f`; gorge `#33465c` |
| wood | `#a27b4b`, `#bf9a66`, `#6e5233` |
| **accent beni** | `#b8412f` (`Ukiyoe.ACCENT`), top face `#cf6a50`, sawn/pale `#e3a08a` |
| pilgrim costume | robe `#3f5878` / `#2c4a70`, hakama `#25304a`, leggings `#1d2c44`, tekkō `#1d3a66`, skin `#ecd6b2` |

## Fonts and words
Noto Serif KR 700 (captions, title) + Noto Sans KR (source line, passage) — `Ukiyoe.FONTS` → `Pilot.run({ fonts })`.
Every caption sits on its own **cream cartouche** (`plate`: fibres, thick + thin ink border) at portrait y 430, dropping
in 14 px; sumi text with a faint paper halo. End card: the print washes back to paper (`print({ wash })`) and the card
is printed on a big cartouche (110–970 × 600–1150).

## API (world px; `p` = `[x, y]`; Path2D in world coords; everything prints into the ink layer `Ukiyoe.ix`)
- **Setup:** `init({ sheet: [x0,y0,x1,y1], ground })` builds the textures (~3.4 s once) and the ink layer.
  `sky(o)` → bokashi canvas (`top/topSoft`, `haze/hazeSoft/hazeA`, `ink/ink2/low` colours), `drawSky(c)`.
- **Frame:** `begin(ctx, cam)` (camera, mount, washi, clear ink) → draw the world → `print(ctx, { wash })` (woodgrain +
  erosion, ink onto paper) → `glow(ctx, p, rScreen, a, rgb)` → `captions(ctx, t, lines)` → `endCard(ctx, t, card, at, wash)`.
- **Camera:** `follow(z, x, gyScreen, gy)` (centre x, ground line at screen y), `camMix(a, b, k)` (log-zoom blend),
  `shake(t, at, dur, amp)`, `toScreen(x, y)`; after `begin`: `MK` (key), `MF` (colour, off register), `CAMZ`.
- **Blocks:** `fill(p, col, a)`, `key(p, w, col, a)`, `both(p, col, w)`, `erase(p, a, gradient?)`, `eraseStroke(p, w, a)`;
  light: `pool(p, r, col, a, {r0,w,h})` (ochre bokashi), `paperGlow(p, r, a)`, `rays(p, {n,a0,a1,len,spread,r,a})`.
- **Paths & maths:** `poly`, `smooth`, `capsule`, `circ`, `ik`, `add/sub/len/nrm/lp2`, `seg`, `trap`, `st8`, `st12`, `LN(d,x,y)`.
- **World pieces:** `ridge` + `land`, `pine(x,y,h,lean,seed,sc)` + `drawPine`, `mistBand(x,y,w,h,a)`,
  `jagged` (cliff edge), `roadTop(x0,x1,gy,depth)`, `roadMarks`, `rockFace(x0,x1,seed,top,bottom)` + `drawRock`,
  `chasm({xf,xn,gy,depth,bottom,sea})`, `sea(t,{x0,x1,y,bottom,gap})`, `claw`, `splash(t,{x,y,t0,sea,size})` (the hit),
  `arch(bx, by, {w,hp,th,fan,road})` (a lit stone gate), `border()`.
- **Long things:** `timber(c, {bar, accent, cut, ghost, alpha, fillA, kw})` + `timberGeo` (a cross / beam / staff:
  `c = {F, ang, L, fl}`, fl 0 upright … 1 lying flat), `shoulder(R, L, {drag, grip, phi})`, `upright(R, L, {ahead, tilt})`,
  `along(c, k)` (a grip point k px from the foot).
- **Figure:** `pose(st)` → joints (`mode` stand | walk | squat | kneel with `k` 0..1; `ph`, `stride`, `lean`, `hipH`,
  `bow` (− looks up), `f` (−1 left, +1 right; `turn(t, at, from, to)` for a squashed turn), `d`, `dy`, `s`), `walkPhase`,
  `figure(R, C, {near, far, back, front, top, farFist, nearFist, nearArm, st})` (layers far → near; hands AT the targets),
  `armTo`, `hangArm`, `hangHands`, `reach(R, p)`, `fistOn(g, d, s)` (fist round a handle), `pressHand(h, s)`,
  pieces `drawLeg/drawArm/drawTorso/drawHead` (`C.hat: 'kasa' | 'none'`), costume `COSTUME`.

```js
const U = Ukiyoe, B = SCRIPT.beat;
async function init() { U.init({ sheet: [0, -520, 1800, 2250], ground: 1300 }); SKY = U.sky(); HILL = U.ridge(-20, 1820, 1205, 60, 4.2, 20, .0034); }
function draw(ctx, t) {
  U.begin(ctx, U.follow(1.4, 800, 1260));
  U.drawSky(SKY); U.both(U.land(HILL, 1320), U.PAL.green); U.sea(t, { x0: 0, x1: 1800, y: 1480, bottom: 2250 });
  const st = { x: 850, d: 60, f: -1, mode: 'walk', ph: U.walkPhase(t * 120, 24), stride: 24, lean: .08 }, R = U.pose(st);
  U.figure(R, U.COSTUME, { st });                                   // hands hang and swing; pass near/far to grip things
  U.border(); U.print(ctx, { wash: Pilot.ss(B.end, B.end + .6, t) });
  U.captions(ctx, t, SCRIPT.lines); U.endCard(ctx, t, SCRIPT.endCard, B.end, Pilot.ss(B.end, B.end + .6, t));
}
```

## Motion grammar (what worked)
- **Three clocks:** figures on 8 fps (`st8` for pose timing), water on 12 (`sea`, `splash`), camera and captions on ones.
  The stepped figures read as printed frames; smooth figures look like vector animation.
- **The scroll:** long lateral pans across one sheet; a big move = a camera `camMix` over 0.4–1 s with `eio`.
- **The hit:** a hard cut to a tight print (z ≈ 1.9) + `splash` claws + a short `shake` — Hokusai's wave as punctuation.
- **Light arrives** as paper: `rays` / `arch` fan cut out of the ink + `pool` (ochre in the sky) + a screen `glow` on top.
- **Ghost outline** (`timber({ ghost })`): a dashed key-line of "what should be there" — the key block without colour.
- **Procession / depth order:** draw lanes back to front (sort items by depth `d`, then by layer); the depth offset
  `LN` keeps far figures higher and to the right.
- Mist bands drift slowly (± 16 px sine) — the only "ambient" that never stops; geese, waves and smoke are good waits.

## Performance (4-core box, 1080×1920)
`init` ≈ 3.4 s (paper, 1024² woodgrain, baren, specks, fibres); `sky` ≈ 0.04 s. Per frame: worked example 57 ms avg
(54–62 run to run; identical to the pre-kit scene), template 55 ms. The print pass (grain + erosion patterns over W×H)
is ~15 ms of that and is fixed cost.

## Pitfalls
- **`erase` also removes key lines** under it (it is destination-out on the one ink layer): re-key outlines after cutting
  paper out (the template re-keys Fuji's rim after the snow cap).
- `fill` prints through `MF` (off register), `key` through `MK`; when you clip or set a transform yourself (a saw blade
  hidden in a kerf), use `Ukiyoe.ix` and `Ukiyoe.MK` and `save/restore` round it.
- The mount shows wherever the camera leaves the sheet — size `sheet` to cover every camera, or use it on purpose
  for a pull-back.
- `pose` uses `st.gy ?? Ukiyoe.GY`: pass `ground` to `init` (or `gy` per figure) when your ground line isn't 1270.
- Bodies (from the 1cor4 reviews and body checks): a hand that holds something is drawn **at** the grip and the arm comes
  from IK (`figure({ near, far })`); clamp far targets with `reach`; a fist round a handle = arm with `nearFist: false`
  + `fistOn` in `top`; the far hand pressing an object = `pressHand` drawn after the object. A load on the shoulder is
  the `back` layer so it sits behind the head and the near arm.
- Kneeling is one knee down (far leg) with the near foot planted forward; blend in/out with `k` on 8 fps steps.
- A one-line plate is sized from the measured text; keep captions ≤ ~13 Korean characters a line or the plate hits
  the 500 px half-width cap.
- Don't paint white for light or foam: it looks like a sticker on the paper. Erase.

## What a scene author still draws
The story's layout (where the road, cleft, field, gate are — `buildStatic` in the scene), the props (the cross is
`timber`, a saw/seed/flower is yours), the timelines (`meState`-style pose functions per beat), the depth sort of the
lanes, and the camera path. Everything about the medium — paper, ink, blocks, sea, sky, pines, mist, the arch, the
pilgrim and his hands, captions, end card — comes from the kit.
