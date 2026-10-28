# 청사진 설계도 (blueprint)

A cyanotype engineering drawing: white line work on one sheet of Prussian-blue paper, section hatching, centre lines,
dimension lines — and one red correction pencil for "mine". After OPUSCAR no. 30 (The Bridge on the River Kwai). Kit:
`kit.js` → `window.Blueprint`. First film: 잘라 낸 건 다리였다 ① (`sermons/2026-10-11-1cor4/film/scenes/cross-blueprint.html`,
the worked example). New scene: `template.html` + `script.example.js`.

## What it looks like
The whole frame is the sheet: mottled Prussian blue (#142E64 → #2C5CA8), two faint fold creases, fibres, fine grain that
moves with the paper, a drafting grid every .5 m, a soft vignette. Everything is drawn in white lines of four weights
(outline, detail, thin, hair), drawn ON with a glowing pen nib. Ground is a band in cabinet-oblique (depth recedes up and a
little right) with a hatched section cut along its near edge and chainage ticks. Figures are hooded line-art pilgrims (tunic,
rope belt, tube limbs); their insides are filled with the sheet, so they hide what is behind them and still look like paper.
Numbers are big and few. The one red thing is drawn in red pencil (doubled, slightly off-register stroke) and is the only
thing that ever glows red. Light is cool blue-white, additive (a doorway, a pool).

**Carries well:** measuring and falling short (a requirement vs what I have), plans and design ("He knew the plan"), what
is hidden (a section or detail callout shows what the surface doesn't), cost and correction (a number struck through and
re-lettered), building, bridges, gaps, foundations, structure vs appearance, "the drawing proves it". Calm, clear, smart —
reads instantly for people outside the church.
**Carries badly:** warmth and intimacy, faces and emotions (the figures are diagrams), nature's softness, crowds, night
or darkness (the sheet is always mid-blue), chaos, joy. Avoid many numbers: one dimension per beat.

## Palette
| role | hex |
|---|---|
| sheet base / texture dark → light | `#1D4185` / `#142E64` → `#2C5CA8` |
| line work (INK) | `#E8F1FB` |
| accent — red correction pencil (RED) | `#FF5D4D` (glow `rgba(255,140,110)` → `rgba(255,90,70)`) |
| cool light (gate, glow) | `rgba(225,240,255)` / `rgba(244,250,255,.95)` |
| void (a chasm) | `rgba(10,26,66,.55)` → `rgba(3,10,30,.94)` |
| caption / source | `#F4F8FD` / `#D2E2F6` on a title-block box `rgba(12,30,74,.72)` |
| end card panel | `rgba(16,38,88,.84)` |

## Type and placement
Noto Sans KR 600 captions at y 430 inside a title-block box (dark panel, double white rule), 800 for dimension labels
(48–74 px for the ones that matter, 22–30 px for sheet notes), Noto Serif KR 700 end-card title in a drawing title block
(frame 110–970 × 600–1150, a rule at 930). `Blueprint.FONTS` for `Pilot.run`. Keep the picture's important lines below
y ≈ 560 when captions are on, and above y 1540.

## Kit API (`const BP = Blueprint`)
World = metres: x along the ground, y up, d depth (lane). Screen px where noted. Every function has a comment in `kit.js`.
- **setup** — `init({kx, ky, ax, ay, tex, creases, seed, red})` builds the sheet (≈ .3 s); `FONTS INK RED SHEET CAP SRC
  SANS SERIF`, weights `OUT DET THIN HAIR`, `Z0`, `fmt(v)` (3.0 / 1.86).
- **camera** — `setCam({cx, cy, z})` once per frame; `cam` (current), `KX`/`KY`; `P(x, y, d)`, `P3([x, y, d])` → screen;
  `LW(w)`; `camMix(a, b, k)`; `hitCam(c, t, at, to, {zoom, creep, shake, snap})`.
- **sheet** — `sheet(g)` first, `finish(g)` (grain + vignette) after the drawing; `paper()` = the sheet as a fill.
- **line work** — `line(g, pts, w, col, {k, alpha, dash, nib, close})` (k draws it on with the nib), `PL`, `trunc`, `nib`,
  `hatch(g, poly, sp, alpha)`, `section(g, pts3, o)`, `dim(g, a, b, off, label, {k, red, size, weight, strike})`,
  `dimW(g, a3, b3, offM, …)`, `label(g, s, x, y, {patch, size, col, align})`, `strikeOld(g, x, y, ang, old, fresh)` (the
  correction), `detail(g, c, r, cam, paint, {k, at, label})` (a detail callout: a circle showing another camera's view).
- **figure rig** — poses `walkPose(x, d, f, ph, amp, heavy, yb)`, `kneelPose`, `sitBackPose`, `crouchPose`, `mixPose(A,
  B, k)`, `look(F, k)` (+ up / − down), `turn(t, at, dur)` (facing f through 0 = squash); `figure(g, F, {hands, swing,
  thumb, farOver, mid, alpha, col})` — arms by `ik` (fixed bones .31/.30 m, elbows hang), hands drawn at the grip points;
  `shoulders(F)`.
- **long objects** — `shoulder(F, L, heavy)` + `carryHands(X)` (a cross on the shoulder), `carry(F, L, 'front'|'upright'|
  'shoulder')` → `{X, hands}`, `mixX` (pick-up / set-down), `cross(g, X, o)`, `plank(g, a3, b3, o)`, `beams`, `beamRect`.
- **world** — `road(g, segs, {d0, d1, lane, deep})`, `chasm(g, {x0, x1, d0, d1, deep, k, kf, label})`, `gate(g, {x, d0, d1,
  h, mid, gap, k, light})` (lit doorway under an arch), `glow(g, c, r, a)` (cool), `redGlow(g, c, r, k)`,
  `accentPlank(g, a3, b3, {glow, t})` ("mine", glowing).
- **hit, words** — `negative(g, t, at, frames)`, `captions(g, t, lines, o)` (boxes + Story.captions), `noteBoxes`,
  `endCard(g, t, card, at, o)`.

```js
const BP = Blueprint, S = SCRIPT, B = S.beat;
function draw(ctx, t) {
  BP.setCam({ cx: 0, cy: .9, z: 220 }); BP.sheet(ctx);
  BP.road(ctx, [[-16, 12]], { lane: 1 });
  const F = BP.walkPose(-1 + .3 * t, 0, 1, t * 7, .26, .2);
  const { X, hands } = BP.carry(F, 1.6, 'shoulder');
  BP.figure(ctx, F, { hands, mid: () => BP.plank(ctx, X.foot, X.top) });
  BP.dimW(ctx, X.foot, X.top, .5, '1.6 m', { col: BP.RED, red: true, k: Pilot.ss(2, 3, t) });
  BP.finish(ctx); BP.negative(ctx, t, B.hit);
  BP.captions(ctx, t, S.lines); BP.endCard(ctx, t, S.endCard, B.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: BP.FONTS, init: async () => BP.init(), draw });
```

## Frame skeleton (keep this order)
`setCam` → `sheet` → ground (`road`, `chasm`, `gate`) → figures and what they hold (far lanes first; `mid` draws a held
object between the arms) → cool `glow` over them → annotations (dimensions, labels, `detail`) → `finish` → `negative` →
`captions` → `endCard`.

## Motion grammar (what worked in ①)
- **The dimension narrates.** One number per beat, big: after every change the old figure is struck through in red and
  the new one lettered beside it (`strikeOld` + `dim(…red)`); a requirement hangs under the gap from its bearings
  ("필요 길이 3.0 m"); the shortfall arrives as a red dimension (−1.56 m). In the template a callout proves what the surface
  hides.
- **Lines draw on** with the nib (k 0→1 over .4–.8 s) — gaps, gates and dimensions are *drafted* into being.
- **Hard cuts on beats** (like turning to the next figure on the sheet), slow push inside a shot (+6–9 px/m per s); the hit
  = `hitCam` (snap .14 s, zoom +22 %, damped shake) + two frames of `negative`.
- **Others are drawn faded** (alpha .28) while the camera is on me; everyone at full weight in the wide.
- **Red = mine only.** The pieces glow red only when they turn out to be the answer (`accentPlank({glow})`).
- **Turning** = animate facing f from 1 to −1 over .25 s (the figure squashes through its edge-on frame).

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- Page ready (init: 880² fbm texture + first frame) ≈ .4 s. Per frame: ① 18.6 ms after the kit vs 19.9 ms before (median of 5 interleaved
  runs, 122 seeks); template 14.5 ms. Hatching and the 1080×1920 texture draw are the main costs; `detail` adds one
  clipped `sheet` (≈ 2 ms).

## Pitfalls
- **Keep the camera inside the texture.** The sheet texture covers x −12…10, y −10…12 (sheet metres, after the oblique
  shear); beyond it the flat `SHEET` colour shows as a hard edge. Widen with `init({ tex })` for a larger world.
- **`paper()` follows the main camera.** `detail()` re-syncs it after drawing; if you draw with another camera yourself,
  call `setCam(main)` and then `sheet()` again — or use `detail`.
- **Oblique depth goes UP the screen.** A far lane is drawn higher and to the right; draw far lanes first, and a figure in
  lane d stands on y = 0 at that d (not on the near edge line, which is d0).
- **Line weights scale with zoom^.65**: at a big push lines get only a little heavier — don't push past z ≈ 350 or hair
  lines look thin against the figures.
- **Hands are drawn at the grip point** — if the target is out of reach the arm straightens and the hand stops short
  (ik clamps); move the body (lean/kneel) rather than the hand. One hand, one object; a tool's handle can take a `thumb`.
- **`road({ lane: null })` still means the default** — pass `lane: false` for no dashed lane.
- **Captions sit in boxes**: two-line Korean at 54 px fits 900 px (~16 Hangul per line); the box grows with a source line.
- The refactor is pixel-identical (max diff 0 at 23 times): the kit keeps the scene's exact float order.

## What a scene author still draws
The story: the world's layout in metres (where the gap, gate, spot are), each character's pose-by-time (positions,
phases, which pose when, grip points), props (the saw in ①, the seed and sprout in the template), the numbers and when
they change, the camera timeline, and `script.js`. The template marks these with ✎.
