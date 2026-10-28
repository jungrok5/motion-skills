# 잉크 + 수채 + 색연필 스케치북 (inkwash)

A sketchbook page: bare warm-white paper with a real tooth, grey watercolour washes that pool and granulate, dip-pen ink
lines that taper and boil, graphite hatching, orange coloured-pencil construction lines running off into the unfinished
sheet, and ONE warm colour: an amber wash. Kit: `kit.js` → `window.Inkwash`. Worked example: 잘라 낸 건 다리였다 · 12
(`sermons/2026-10-24-cross-styles/film/scenes/cs-inkwash.html`, from `sermons/2026-10-24-style-lab/` lab-inkwash).
New scene: `template.html` + `script.example.js` (`python3 tools/new-film.py sermons/<folder> --style inkwash`).

## What it looks like
Mostly bare paper (≈ 55 % of the frame is untouched sheet; the drawing fades out into it at the top). Washes are flat,
light grey (alpha .1–.3), with a darker rim where the pigment pooled, granulation on the tooth peaks and the odd brush
streak; the darkest wash is a gap or a pit (alpha .55 plus a smooth multiply gradient). Ink lines are 3–6 px, tapered,
slightly wobbly and **boil** (3 drawings cycled at 8 fps). Orange pencil lines are construction: horizon, a grid on the
ground, verticals running up off the drawing — the sketch shows how it was built. The main character is solid ink; the
others are grey-washed with an ink outline. The one amber wash marks the thing that matters (the character's own cross,
a seed, a lamp), and its light is a wet **bloom** of warm washes spreading over the page. Captions sit on a lifted patch
of paper; the end card is a fresh page with a quiet grey wash band and one orange rule.

**Carries well:** journeys and pilgrimage (a road, a procession), a plan vs. what happened (the construction outline =
"what should have been there"), quiet parables, humility and smallness, memory, gentle humour, reflection, a sketch of
an idea becoming real (lines → wash → colour), the moment a light is found.
**Carries badly:** night, fear and horror (the page is white — use `graphite` or `charcoal`), big action and speed,
crowds of detailed faces, saturated or many colours, glamour, anything that needs a dark mood in the first second.

## Palette
| role | value |
|---|---|
| paper (under the tooth) | `#FBFAF6` (tile varies ±10) |
| ink | `#161413` |
| grey washes (glaze / dark / hills) | `rgb(96,96,100)` · `rgb(70,70,74)` · `rgb(72,72,78)` at α .07–.3; the gap `rgb(70,70,74)` α .55 + gradient to `#2A282C` |
| warm grey (stone, wood) | `rgb(150,132,112)` |
| graphite pencil / orange pencil | `rgb(60,58,58)` / `rgb(210,101,44)` — on the tooth peaks only (`K.PAT.graphite` / `.orange`) |
| **accent — amber wash** (body / dark side / flecks) | `rgb(222,136,52)` α .7 / `rgb(176,92,34)` / `rgba(214,132,56,.85)` |
| the bloom (light) | `rgb(246,190,96)` washes α .16–.2, opening `rgb(250,204,120)`, rim `rgba(214,150,84,.3)` |
| caption / source line | `#2A2522` / `#5B4A3E` on a lifted paper patch |
| end card title / credits | `#221D1A` / `#5B4C40` |

## Type and placement
Gowun Batang 700 for captions (54 px two lines / 62 px one line, Story defaults) and the end-card title, Gowun Batang for
source lines too (`K.FONTS` for `Pilot.run`). Captions at y = 420 in warm ink on `K.captionLift` (no shadow — it would
look digital on paper). End card at y = 860 on `K.endPlate`. Rendering needs Gowun Batang installed locally
(`~/.local/share/fonts/GowunBatang-*.ttf`); the Google Fonts link covers the live preview.

## Kit API (`const K = Inkwash`)
World px unless noted (camera `{x, y, z, sx, sy}`; world y 960 is the frame centre at z = 1). Every export has a comment.
- **setup / constants** — `init()` (paper tiles + sprites ≈ 1.5–2 s); `INK PAPER AMBER AMBER_DK WARM GREY W0 WARMG GREYW
  ORANGE FONT FONTS rgba`; patterns `PAT.paper .peaks .orange .graphite .ink .pool`; sprites `TX.shadow .lift .endWash`.
- **lines** — `HD` (hash, t12, spline, seg, poly, arc, wob, boil, ribbon, ink, pathOf); `boilAt(t)` → `K.BF` (call first
  in draw); `ink(g, pts, seed, f, o)` dip pen; `pencil(g, pts, seed, f, pat, o)` coloured pencil / graphite.
- **washes and layers** — `whiteLayer(w, h, ox, oy, k)` a white-based layer; `scratch(w, h, ox, oy, k)` / `scratchFree()`
  the wash scratch (same mapping as the layer); `wash(g, pts, col, a, o)`; `washLive(ctx, pts, col, a, o)` for live
  shapes; `bloomEdge(…)`; `bbox`; `prop({w, h, ox, oy, k, base(g), lines(g, f)})` → a boiled sprite (`c[K.BF]`).
- **camera** — `layer(ctx, cam, parallax, fn)`, `vis(ctx)`, `mulSheet(ctx, layer)`, `mixCam(a, b, k)`,
  `camExtent(camAt, dur, p)` (size layers), `hitShake(t, at, dur, ax, ay)` (the hit), `paper(ctx, cam)` (the sheet).
- **figure rig (crow-traveller)** — `drawFig(ctx, F, mid, back)`; poses `walk stand crouch kneel turn mix`, `lookUp(F, k)`,
  `hangHands(F, swing)`, `reachGround(F, d)`; `ik frame shoulderOf`; long objects `onShoulder inFront upright gripBeam
  beamPt mixBeam rotAbout`. Spec fields are listed above `drawFig` in `kit.js` (`me`, `farFront`, `wash`, `sx`, …).
- **world pieces** — road `road roadWashes roadLines` (R = {segs, top, near, rows, sw, ob, x0, x1}); `field(g, f, …)` bare
  ground; `poplarWash/poplarLines`; `postWash/fenceLines`; gap `gapWash/gapLines` (Gp = {e, w, top, bottom}); arch
  `archWall archOpening archWash archLines` (A = {x, base, cy, ra, ro}); `farLand(g, x0, x1, o)` sky + hills + far poplars;
  `foreground(g, x0, x1, o)` weeds + flowers.
- **light / marks of meaning** — `bloomSheet(c, o)` + `drawBloom(ctx, sheet, c, R, t, under)` (the amber light),
  `halo(ctx, x, y, hl, pulse)`, `ghostOutline(ctx, pts, t, al, glow, clip)` (gel pen + orange: what should be there),
  `spatter(x, y, seed, o)` + `drawSpatter(ctx, drops, t, t0)` (paint flung on the hit).
- **words** — `captions(ctx, t, lines, o)` (= `captionLift` + Story.captions), `endPlate(ctx, t, at)`, `endCard(ctx, t, card, at, o)`.

```js
const K = Inkwash, S = SCRIPT, B = S.beat, TX = {};
async function init() { K.init();
  K.scratch(2400, 2000, -600, 400); TX.plate = K.whiteLayer(2400, 2000, -600, 400);
  K.field(TX.plate.g, -1, -600, 1800, 1236, 2400);    // the washes (f < 0) …
  K.field(TX.plate.g, 0, -600, 1800, 1236, 2400);     // … then the lines, drawing 0 (the template builds 3 boiled copies)
  K.scratchFree(); }
function draw(ctx, t) { K.boilAt(t); const cam = { x: 540, y: 1100, z: 1.5 };
  K.paper(ctx, cam);
  K.layer(ctx, cam, 1, () => { K.mulSheet(ctx, TX.plate); const F = K.walk(400 + 80 * t, 1300, 1, 1, t, 150, .1); F.me = true; K.drawFig(ctx, F); });
  K.endPlate(ctx, t, B.end); if (t < B.end) K.captions(ctx, t, S.lines); K.endCard(ctx, t, S.endCard, B.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, init, draw });
```

## Frame skeleton (keep this order)
`K.boilAt(t)` → camera → `K.paper` → far layer ×.5 (`mulSheet`) → plate ×1: paper fills for things that must hide what is
behind them → `mulSheet(plate[K.BF])` → live: bloom → props lying down → figures (back-to-front, `back()` / `mid()` for
what they hold) → outlines, spatter → foreground ×1.25 → `endPlate` → `captions` → `endCard`.
Build: `K.init()` → timeline numbers → `camExtent` per parallax → `scratch` + `whiteLayer` per layer → washes once into a
base → 3 copies of the base with `buildLines(g, f)` for f = 0..2 (multiply) → `bloomSheet` → props → `scratchFree()`.

## Motion grammar (what worked in the worked example)
- **Lines boil on 8 fps (3 drawings), bodies move on twos** (`K.t12`): an animated drawing, not a puppet.
- **The camera is a reader's eye**: close on the character at frame 0 (z ≈ 1.6), widen to the world, push on the decisive
  beat, one move back along the road to the evidence, then settle. Far layer .5, foreground 1.25 parallax.
- **Light is a wet bloom**: `drawBloom` with R = 600·eo((t − t0)/1.3) — it spreads like water on paper, its rim boils.
- **The sketchbook carries the turn**: a construction outline (`ghostOutline`) of what should be there, lit slot by slot.
- **The hit** is a shake (`hitShake`, .55 s) + paint flung off the impact that stays where it lands (`spatter`).
- **One colour**: the amber wash only on the one thing (and its light); everything else grey.
- **The end card** is a clean page laid over the picture in .55 s.

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- Worked example: init ≈ 3.5–4.5 s (tiles ≈ 1.5 s, three 4 k-wide plate copies, washes), ≈ 45 ms/frame (paired runs
  before/after the kit: 45.5 → 46.6 ms mean, +2.4 %, noise level). Template: init ≈ 1.9 s, ≈ 34 ms/frame.
- Memory: the plate exists 3 times (one per boiled drawing). A plate of 4000 × 2000 px is 32 MB each — keep the camera's
  travel modest or split the plate.
- `wash` is the expensive call (scratch clear + fill + pool + streaks + granulation + blit): build-time only; use
  `washLive` for the few live shapes.

## Pitfalls
- **Everything multiplies.** Colour can only darken the paper; to hide what is behind a thing, fill it with `PAT.paper`
  first (the crosses, the grey figures, the arch wall in the worked example). A lighter colour over a darker one needs a
  paper fill under it.
- **`K.scratch` must match the layer you wash into** (size, origin, k). A wash after `scratchFree()` throws; a wrong
  scratch puts the wash in the wrong place.
- **Call `K.boilAt(t)` first in `draw`** — live lines, props and plates all read `K.BF`; a stale BF makes one part stop
  boiling.
- **Captions need the lift.** Ink-coloured words over a wash or a figure disappear; `K.captions` lifts the paper first.
  Two lines must fit 900 px at 54 px Gowun Batang (≈ 16 Hangul per line).
- **Bodies (two rounds of body checks on this film):** a long object rides on the FAR shoulder BEHIND the head (draw it
  in `back()`), with one fist on the beam above the head and the other low behind; switch it to the front (`mid()`,
  `farFront`) only once it is below the chin (k ≈ .3 of a set-down). Every set-down / pick-up takes 3–5 in-betweens with
  BOTH hands pinned to the beam (`beamPt`) — never a one-frame jump, never a beam in the air. One fist, one object (a saw
  in one hand, the beam in the other). Arms start at the shoulder on the outline, never at the beak. A far fist with no
  arm behind the robe: hide it or draw the arm. Turns: `K.turn`, not a one-frame mirror. Reaching the ground: use
  `reachGround` — a kneeling figure must bow to lean ≥ 1.0 to touch the soil (the template does).
- **The main character's near hand gets a paper halo** so it reads over the black cloak — it looks like a white ring; that
  is intended.
- Refactor note: the kit reproduces the worked example pixel for pixel (max channel diff 0 at 10 stills). `camExtent`
  must step 0.05 s like the original loop, and the road/gap/arch numbers are passed exactly (keep expressions like
  `RT - 4` in the scene, not re-derived), or seeds and extents shift.

## What a scene author still draws
The story: the world's numbers (ground y, where the gap / arch / spot is), the camera keys (`camAt`), the poses per beat
(`pose(t)` from `walk`/`kneel`/… + grips), the one amber thing (a `prop` sprite or a live shape with `washLive` + `ink`),
its light (`bloomSheet` centre and timing), any outline of meaning, and `script.js` (beats, lines). The template marks each
with ✎.
