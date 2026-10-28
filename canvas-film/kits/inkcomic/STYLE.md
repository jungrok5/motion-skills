# 미니멀 잉크 만화 — Minimal ink comic (흰 종이, 마커 선, 곰)

House style `inkcomic` · kit `kit.js` → `scenes/kit-inkcomic.js` · global `window.InkComic` · worked example:
[잘라 낸 건 다리였다 · 16](../../sermons/2026-10-24-cross-styles/film/scenes/cs-inkcomic.html) (origin: style lab `lab-inkcomic.html`, ref 16).

## What it looks like
White paper with a real tooth (ink drops out of the valleys), and a wobbly, slightly blobby black **marker** line:
variable-width ribbons with pressure, tapered ends and a blob where the pen rested. Every line **boils** — three drawings
cycled on 8 fps — so even a still frame is alive. Fills are paper white. Mostly empty page, deadpan comic timing. The
default character is a round **bear** on four legs (or sitting up on its haunches like a bear does); the hero in black,
the others in a quieter grey line. ONE colour on the page: a pale-warm beam yellow (`WARM`) for the thing that matters, and
the same warm as a **multiplied highlighter** light (a doorway, a glow under something precious). Comic marks do the
acting: shine ticks, impact strokes, speed dashes, a sweat drop.

**Carries well:** a fable told deadpan; the one thing that matters shown by the only colour on the page; weight and
burden (a load pressing the bear down), small stubborn choices, honest humour; a road / a gap / a door; "the others vs
me" in black vs grey; a quiet ending where the page goes blank and one line remains.
**Carries badly:** dark or violent material (a monster is a doodle), anything needing atmosphere, night or real light
(there is no dark — black is only line), crowds, many colours, fine hand acting (bears have paws, not fingers).

## Palette, type, captions
| role | value | key |
|---|---|---|
| paper | `[253, 253, 251]` + tooth (emboss 5, mottle 2, vignette .015) | `TX.paper` |
| ink (me) | `#141414` | `INK` |
| ink (the others) | `#9a9a9a` | `GREYI` (via `setGrey(true)`) |
| fills | `#ffffff` | `PAPER` |
| **accent** | `#f7d27a` (side face `#e9b955`) | `WARM` / `WARMF` — the ONE colour. `init({ warm, warmF })` |
| warm light | `rgba(253,226,140, a)` multiplied | `LIGHT` (append `alpha + ')'`) |

Font: **Gaegu** 700 (captions) / 400 (end card) + Noto Sans KR 400 (source lines); `<link>` = `InkComic.FONT_LINK`,
`Pilot.run({ fonts: InkComic.FONTS })`. Captions: `#151515`, size 78, centred at **y 400**, white halo (blur 10), and they
jiggle 1 px with the boil (hand-lettered). End card: the ink page goes blank white with one ruled line (`endWhite`), the
card in Gaegu 1.2× around y 860.

## Kit API (`window.InkComic`; world px, camera `{ x, y, z, sx, sy }`; ink is drawn in screen space via `cam(pts)`)
- **Frame** `init({ warm, warmF })` (paper + dropout mask + ink layer, ~1.2 s); `begin(ctx, t, cm)` → `g` (paper on ctx, a
  clean white ink layer, this frame's boil `F8`, zoom `ZK`, marker width `MW`, matrix `CAM`); draw on `g`;
  `endWhite(g, t, at)`; `finish(ctx)` (dropout + multiply); then `captions(ctx, t, lines)`, `endCard(ctx, t, card, at)`.
- **Marker** `mk(g, screenPts, seed, { w, wob, boil, mn, ts, te, blob, col… })` — THE stroke; `fillC(g, screenPts, seed, col)`
  (boiled flat fill); `tube(g, pts, w, seed)` / `tubeNear(…, clipOut)` (outlined limbs); `cam(worldPts)`; `setGrey(v)` → previous;
  `setCAM(m)` / `CAM` (draw in another space, e.g. a falling object scaled about its centre); getters `MW ZK F8`.
- **HD toolkit** `HD.spline / seg / poly / arc / wob / boil / ribbon / ink / fillPts / pathOf / xf / mat / mul / pt / hash /
  tooth / paper / toothMask / layer / clearWhite / dropout / multiply / walker(x0, x1, T, dec)` (a walk with a slowing stop).
- **The bear** `drawBear(g, F)`; `F = { x, gy, f, rot, sag, head (− looks up), sit (0…1), sq, lift, ph, stride, liftLeg, moving,
  legs: [near fore, far fore, near hind, far hind] | null, face: calm|happy|down|shock|strain|look, sweat, grey, id, alpha,
  back + drawLoad(seed) + loadSide, strapOn, strapItem(seed), behind() / mid() / preNear() / front() }`.
  `bodyM(F)`, `headM(Mb, F)` (body/head-local → world: hang things on the bear, e.g. a seed at the mouth `HD.pt(headM, 250, −30)`),
  `legRoot`, `footOf(F, k)`, `paw(g, pt, seed, dir)`, `backLoad(F, uAt)` (a long object along the back), `strapPoint(F)`
  (a tool tucked in the belly strap), `bearSeed(F)`, `SC` (.95), `PV`, `LEGX`.
- **Poses** `walkSpec(x, gy, f, phase, { stride, lift, bob, sag, rot, head, face, sweat })`, `standSpec(x, gy, f, o)`,
  `sitSpec(x, gy, f, [nearPaw, farPaw], { sit, head, rot })`, `lieSpec(x, gy, f, o)`, `legsOf(F)`, `mixSpec(A, B, k)` (turns on
  the spot with planted feet and a front-view squash), `t12`.
- **Long objects** `objPt(X, u, v)`, `rotAbout(X, pivot, th)`, `mixObj(A, B, k, dir, len)` (dir ±1: turned over the top like a baton).
- **World** `road(g, cm, { front, back, gaps, from, to })` (two marker lines + dashes; a gap = the road stops and cliff lines
  go down); `door(g, t, { x, gy, w, h, floor }, fillPass)` (fill pass first, lines after figures that enter);
  `glowAt(g, screenPt, t, R, seed, al)`; `ticks(g, screenPt, r0, r1, n, seed)`.
- **Effects** `burst(g, screenPt, u)` (the hit), `clunk(g, screenPt)` (landing), `speedLines(g, t, F, a, dir)`.
- **Camera** `mixCam(a, b, k)`, `shake(t, t0, ax, ay, dur)` → [sx, sy].

```js
const IC = InkComic, S = window.SCRIPT;
const pose = t => IC.walkSpec(200 + 80 * t, 1388, 1, (200 + 80 * t) / 150, { stride: 22, sag: 4 });
function draw(ctx, t) {
  const cm = { x: 200 + 80 * t + 150, y: 1190, z: 1.2, sx: 0, sy: 0 }, g = IC.begin(ctx, t, cm);
  IC.road(g, cm, { front: 1404, back: 1286 });
  const F = pose(IC.t12(t)); F.back = true; F.drawLoad = s => { /* draw what it carries, with IC.mk / IC.fillC */ };
  IC.drawBear(g, F);
  IC.endWhite(g, t, S.beat.end); IC.finish(ctx);
  if (t < S.beat.end) IC.captions(ctx, t, S.lines); IC.endCard(ctx, t, S.endCard, S.beat.end);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: IC.FONTS, init: async () => IC.init(), draw });
```

## Motion grammar (what worked)
- Poses on 12 fps (`t12`), drawings boil on 8 fps, camera on ones. A bear's walk: diagonal leg pairs, `sag` + bob; heavy =
  stride 18, sag 14, strain face + sweat; light = stride 40, lift 34, bob 22, head up, happy.
- **Put-down / pick-up in beats with four feet planted** (never airborne): the load slides off the near flank onto the road →
  turn round (squashed body, ≥ .35 s) → sit back and lift one end onto the lap with a forepaw while the other takes the tool
  from the strap. After: stand on four feet first, then nose/paw the load back up. One saw on screen, ever.
- A bear uses its paws only when sitting up (`sitSpec`); on four legs it can push with a forepaw or carry in its mouth.
- **The hit**: a zoom (`eo` .09 s) + `shake` 18/13 + `burst`. Landing: `clunk` for .3 s. Running: `speedLines`.
- Precious things: `glowAt` (breathing highlighter) and `ticks`. The ending: the page empties (`endWhite`) except one line.
- Hook: frame 0 already close on the hero with the telling prop (z 1.45), widening by ~2.6 s.

## Performance (1080×1920, headless Chromium, 4 shared CPUs)
- cs-inkcomic: **~20 ms/frame** mean (orig 18.8–22.1, refactored 18.9–23.7 over four interleaved runs — same code, load noise).
  init ~1.2 s (tooth + paper + mask are full-frame loops).
- Template: **~12 ms/frame**. Costs: every `mk` builds a ribbon + boil each frame; the multiply of the full-frame ink layer.

## Pitfalls
- Ink is drawn in **screen space**: convert world points with `cam()` before `mk`/`fillC`; sizes that should scale with the
  camera use `IC.ZK`. `begin()` must run before any `mk` (it sets `F8`, `MW`, `CAM`).
- The ink layer is **multiplied**: white = nothing; colour fills must be drawn on `g` (not on ctx), lights with
  `globalCompositeOperation = 'multiply'` on g.
- `setGrey` is global state — restore the value it returns (drawBear does for itself).
- Legs are free tubes (no fixed bone length): keep paw targets within ~140 px of the leg root or the leg reads stretched.
- The bear's head covers ~±130 px ahead of its body: back it off (a backwards `walkSpec`, still facing) to look at a thing.
- Body checks (round 1–2) fixed: no shaft through the torso (load on the back + strap), saw never in the mouth, forelegs from
  the shoulders, turns with planted feet, put-down/pick-up split into beats, one saw on screen.
- Refactor: kit = the scene's code moved verbatim + hooks (`drawLoad`, `strapItem`); cs-inkcomic renders **bit-identical**
  (max diff 0 on 10 brief stills + 8 extra in-between times).

## What a scene author still draws
The story's props (the cross, the saw — see the worked example's `drawCross` / `drawSaw` for how to draw a prop with `mk` and
`fillC`), the choreography and beat timing, camera keys, which world pieces appear (gaps, door) and `script.js`.
Not in the kit: other species, interiors, weather, text balloons.
