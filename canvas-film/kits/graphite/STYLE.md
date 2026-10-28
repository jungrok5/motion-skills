# 흑연·목탄 밤 그림책 (graphite)

A night picture book drawn in soft pencil on dark toothed paper: grainy charcoal masses, graphite hatching, white-pencil
highlights, a little town under the moon — and ONE warm colour, the yellow of a flashlight or a lit doorway. Kit:
`kit.js` → `window.Graphite`. Worked example: 잘라 낸 건 다리였다 · 13
(`sermons/2026-10-24-cross-styles/film/scenes/cs-graphite.html`, from `sermons/2026-10-24-style-lab/` lab-graphite).
New scene: `template.html` + `script.example.js` (`python3 tools/new-film.py sermons/<folder> --style graphite`).

## What it looks like
A dark page (`#3A3734`) where every mass is pencilled: a flat value plus grain that sits only on the paper's tooth peaks
(`fillG`), loose parallel hatching on top (`hatch`), finger-smudged soft tones (`smudge`). Lights are white pencil —
the moon, the rims of things, white-headed flowers, a picket fence, the lit edge of a trunk. The far layer is a little
town (scalloped shingles, clapboard, black windows framed in white pencil, bare black trees, a picket fence), the plate
is the ground the story happens on, the foreground is black bushes and one big charcoal trunk sweeping past. The
characters are little sheet-ghosts — a child under a sheet: dark oval eyes with a glint, pink cheeks, sleeves with round
mittens, small shoes under a scalloped hem. Gentle, never spooky. The main character is the brightest sheet; the others
are greyer. The warm colour is light (a flashlight cone, a lit door, a glowing sprout) and the one thing that matters.
The grain flickers on 8 fps over everything, under a soft vignette. Captions are hand-lettered (Gamja Flower) in warm white.

**Carries well:** night and fear made gentle, loneliness, searching and finding (a torch finding what was lost — "이것을
잃어버렸다고요?"), a small light in the dark, childlike faith, comfort and company, waiting, home and belonging,
bedtime-story parables.
**Carries badly:** daylight joy and celebration, bright or many colours, speed and action, solemn adult weight or
violence (the ghosts read cute), crowds (white sheets merge), detailed faces and hands.

## Palette
| role | value |
|---|---|
| the page / end plate | `#3A3734` / `rgb(40,38,36)` + hatch |
| graphite values (black / dark / mid / light) | `rgb(30,28,27)` · `rgb(52,49,47)` · `rgb(104,99,94)` · `rgb(158,152,145)` |
| white pencil (chalk) | `rgb(232,227,219)` (grain `#E8E3DB`) |
| sky / hills / road | `rgb(62,59,56)` · `rgb(38,36,35)` · `rgb(176,170,162)` (chalk grain) |
| ghost sheet (main / others) | `rgb(226,222,214)` / `rgb(160–182, …)` greys; outline `PAT.mid` / `PAT.dark`; cheeks `rgba(214,150,150,.45)` |
| **accent — warm light** | `rgb(246,228,176)` (`K.C.warm`), grain `#F3DFAE`; door light `rgb(236,206,140)`→`rgb(252,238,196)`; wood `#6A4A2A` |
| caption / source line | `#EFE9DF` / `#D8CFC2`, shadow `rgba(10,9,8,.9)` blur 16 |
| end card title / credits | `#EFE9DF` / `#D4CABD` |

## Type and placement
Gamja Flower 400 at 74 px for captions (one AND two lines), source lines and the end card (`K.FONTS`). Captions at
y = 420, end card at y = 860 on `K.endPlate`. Two lines must fit 900 px at 74 px (≈ 12 Hangul per line — shorter than
other kits). Rendering needs `~/.local/share/fonts/GamjaFlower-Regular.ttf`; the Google Fonts link covers the preview.

## Kit API (`const K = Graphite`)
World px unless noted (camera `{x, y, z, sx, sy}`; world y 960 is the frame centre at z = 1). Every export has a comment.
- **setup / constants** — `init()` (grain masks + sprites ≈ 1 s); `C` (black dark mid light chalk warm), `INK BG FONT FONTS
  rgba`; patterns `PAT.black[0..2] .chalk[0..2] .mid .dark .light .warm .brown .sheet`; sprites `TX.shad .puff .vig
  .flick .endPlate`.
- **marks** — `fillG(g, pts, col, a, dens, tone)`, `strokeG(g, pts, seed, pat, o)`, `hatch(g, pts, ang, sp, len, pat, a,
  seed, o)`, `smudge(g, pts, col, a, blur, seed)`, `tuft`, `flower`, `R4`, `bbx`, `HD` (line toolkit), `prop({w, h, ox,
  oy, k, draw})` a sprite canvas.
- **camera / layers** — `layer(ctx, cam, parallax, fn)`, `vis`, `layerCanvas(x0, y0, x1, y1)`, `drawSheet(ctx, layer)`,
  `mixCam`, `camExtent(camAt, dur, p)`, `hitShake(t, at, …)`, `ground(ctx)`, `post(ctx, t)` (vignette + grain flicker).
- **figure rig (sheet-ghost)** — `drawFig(ctx, F, mid, back)` (+ `F.lit`, `F.sheet`, `F.after`); poses `walk stand crouch
  kneel turn mix`, `lookUp`, `hangHands`, `reachGround`; `ik frame shoulderOf`; long objects `onShoulder inFront upright
  gripBeam beamPt mixBeam rotAbout`.
- **world pieces** — far: `nightSky moon hills house farTree street picketFence`; plate: `groundStrip` (bed + road +
  ground), `field` (open soil), `gap` (Gp = {e, w, top, bottom}), `archDoor` (A = {x, base, cy, ra, ro}); foreground:
  `bushes`, `trunk`.
- **light (the one colour)** — `torchGeo(F, aim)`, `drawBeam(ctx, lens, c, rx, ry, on)` (a clean cone), `drawTorch`,
  `lensGlow`, `warmHaze(ctx, c, on)` (light on whatever stands in the pool), `glow(ctx, x, y, hl, pulse, R)`,
  `ghostOutline(ctx, pts, t, al, glow, clip)` (dashed white pencil: what should be there), `puff(ctx, x, y, k)` (the hit).
- **words** — `captions(ctx, t, lines, o)`, `endPlate(ctx, t, at)`, `endCard(ctx, t, card, at, o)`.

```js
const K = Graphite, S = SCRIPT, B = S.beat, TX = {};
async function init() { K.init();
  TX.far = K.layerCanvas(-900, -340, 1900, 1330); K.nightSky(TX.far.g, -900, -340, 1900, 1330); K.moon(TX.far.g, 500, 770);
  K.street(TX.far.g, -900, 1900); K.picketFence(TX.far.g, -900, 1900);
  TX.plate = K.layerCanvas(-600, 660, 2000, 2470); K.field(TX.plate.g, -640, 2040, 1236, 2470); }
function draw(ctx, t) { const cam = { x: 540, y: 1100, z: 1.5 };
  K.ground(ctx); K.layer(ctx, cam, .5, () => K.drawSheet(ctx, TX.far));
  K.layer(ctx, cam, 1, () => { K.drawSheet(ctx, TX.plate); const F = K.walk(400 + 80 * t, 1300, 1, 1, t, 150, .08); F.me = true; K.drawFig(ctx, F); });
  K.post(ctx, t); K.endPlate(ctx, t, B.end); if (t < B.end) K.captions(ctx, t, S.lines); K.endCard(ctx, t, S.endCard, B.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: K.FONTS, init, draw });
```

## Frame skeleton (keep this order)
`K.ground` → far ×.5 (`drawSheet`) → plate ×1: `drawSheet(plate)` → light on the ground (`drawBeam`, `glow`) → things lying
down → helper figures → figures back-to-front (`back()` / `mid()` / `after()`) → outlines, crumbs, `puff` →
`warmHaze` → foreground ×1.3 → `K.post` → `endPlate` → `captions` → `endCard`.

## Motion grammar (what worked in the worked example)
- **Light is the actor**: a friend clicks a torch on (a two-drawing flicker 0 → .5 → 1), the pool travels to where the
  story is, rests on the main character, and later sweeps back to FIND things; whatever stands in the pool warms
  (`F.lit`, `warmHaze`).
- **The grain is alive** (3 speckle drawings at 8 fps, overlay .2); bodies move on twos (`K.t12`); nothing else boils.
- **The camera** starts close (z ≈ 1.6) on the character, widens, pushes on beats; the foreground trunk frames the opening
  and leaves (it must never cross the character); far .5 / foreground 1.3 parallax.
- **The hit**: a shake (`hitShake`), a dust puff (`puff`), crumbs falling into the dark.
- **The end card** is a calm opaque charcoal plate fading in over .55 s.

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- Worked example: init ≈ 3 s, ≈ 51 ms/frame (paired runs before/after the kit: 50.4 → 52.2 ms mean, +3.5 %, noise level).
  Template: init ≈ 1.9 s, ≈ 36–41 ms/frame.
- The fixed per-frame cost is the full-frame vignette + overlay grain flicker; the beam adds its gradients; the layers
  are single canvases (no boiled copies), so memory is a third of `inkwash`.

## Pitfalls
- **Dark on dark disappears.** Anything that must read gets a white-pencil edge (`strokeG(…, PAT.light | PAT.chalk[2])`) —
  a soil mound, a road edge, a rim. Check stills at phone size.
- **The warm colour is light**, not decoration: keep it for the torch / door / the one thing; use `screen` / `soft-light`
  for light (it adds on a dark page) — `multiply` (inkwash's habit) only darkens here.
- **Grain is locked to the world** because patterns follow the layer transform — draw grainy marks inside `K.layer`, not
  in screen space, or the grain slides over the drawing on a push.
- **The flashlight cone** needs the lens OUTSIDE the pool ellipse (`cone` returns null otherwise); the torch is rigid on
  the axis from the mitten to the pool centre (`torchGeo`).
- **Bodies (two rounds of body checks on this film — it was the worst of three before the fixes):** sleeves root on the
  sheet's FRONT edge at shoulder height, below the face — never from the cheek or mouth (a sleeve hanging from the face
  reads as a trunk or a tongue on a phone). The far sleeve hides behind the head when raised. A long object rides behind
  the head; grip it at chest height, never across the face (`GHI` 140 in the worked example). Set-downs / pick-ups: 3–5
  in-betweens with both mittens pinned to the beam. One mitten, one object. A cut / break happens where the tool is.
  Turns: `K.turn`. Bowing: kneel lean ≤ .75 already reaches the ground (`reachGround`); deeper and the sheet lies flat
  like a slug.
- Captions in Gamja Flower run wide: ≈ 12 Hangul per line at 74 px.
- Refactor note: the kit reproduces the worked example pixel for pixel (max channel diff 0 at 10 stills); world-piece
  defaults ARE the example's numbers (house base 1180, picket top 1120, bushes 1700…) — pass your own for another layout.

## What a scene author still draws
The story: the world's numbers and layout (which pieces, where), the camera keys, the poses per beat (with grips), the
one warm thing and its light (where the pool goes and when), any helper character (the torch friend is `stand` +
`torchGeo` + `drawTorch`), and `script.js`. The template marks each with ✎.
