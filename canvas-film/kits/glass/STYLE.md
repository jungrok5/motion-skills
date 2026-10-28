# 스테인드글라스 (glass)

One tall lancet window in a dark stone wall; the story is a living stained-glass panel inside it — every shape a cut,
leaded piece of coloured glass with grisaille painting; figures step at 12 fps; light is the medium. One accent: ruby.
Kit: `kit.js` → `window.Glass`. First film: 잘라 낸 건 다리였다 ⑦ (`sermons/2026-10-11-1cor4/film/scenes/cross-glass.html`,
the worked example). New scene: `template.html` + `script.example.js`.

## What it looks like
A pointed lancet fills the frame: blue border with white pearls, a white fillet with a painted vine, an eight-petal
rosette medallion in the arch, cobalt lozenge quarries for the sky (each with a little painted curl, fixed in the window),
a white-glass **inscription band** (y 324–598) where the words are painted in dark brown, and an iron saddle bar low across.
Below the band the panel: slate mountains with snow caps, two-tone green hills, leaded trees, buff flagstone roads, umber
rock cut in a jittered grid, an unlit chasm of near-black glass. Every piece: its own colour shade, streaks and seed
bubbles, darker matting inside the lead, a 4–6 px black lead came. Light is brightest mid-lancet and falls off to the
border; the brightest panes bloom. Figures are rigid hooded pilgrims (profile face with an almond eye and heavy lid; a
frontal hunched kneeling body for work at the ground).

**Carries well:** holiness and light, the sacred story as a picture (a pilgrim, a gate, a seed, a lamb), what is broken
and mended (the medium itself can crack and be re-leaded), joining pieces into a whole (offcuts welded into a bridge —
pieces slide along the leads and weld with a spark), the hidden made visible (a cutaway ground band shows the root),
"my piece" (the one ruby). Reads instantly as church — warm, reverent, beautiful; strong as a thumbnail.
**Carries badly:** speed and action (12 fps rigid pieces), modern life (phones, cities, cars look wrong in glass),
close-up emotion (faces are small icons), darkness and threat (glass needs light; dark scenes go muddy), humour.
For viewers outside the church it can feel "religious art" — keep the image itself everyday (a seed, a road, a door).

## Palette
| role | hex |
|---|---|
| sky quarries (cobalt) | `#162F82` → `#1D3A9C` → `#3A5DB3` |
| border / lead | `#142A70` / `#131417` |
| greens (hills, trees) | `#2F7F36` `#22602E` `#6B7A22` `#3F6A2A` `#2A6E44` |
| earth (rock, road) | `#7A4E24` `#5E3B1C` `#6A4220` / buff `#A89C72` `#968A62` `#B5A980` |
| stone (gatehouse) | `#8B819C` `#776D8B` `#9A90AB` |
| white door glass / inscription | `#FBF8EE` / `#ECE3C7` |
| **accent — ruby** (dim) | `#C3121F` (`#4A0B12`); others carry amber `#D99A2B` / clear `#E3DAB6` |
| grisaille trace / half | `rgba(44,26,12,.88)` / `rgba(44,26,12,.55)` |
| caption / source | `#2A160A` / `#4D3219` on the band |
| robes (`ROBES`) | me `#9DB0AE`, green `#2F6F3A`, murrey `#632A63`, olive `#6B7A22` |

## Type and placement
Noto Serif KR 600 captions painted on the inscription band (y 478 one line, 432 two lines, 418 with a source line; the
source in Noto Sans 28 px shrunk to fit 800 px), the end card on a white-glass plate (118–962 × 584–1150) after the panes go
dark. `Glass.FONTS` for `Pilot.run`. The band is always there, so captions never cover the picture; the picture field is
y 602–1840 (keep the subject above y 1540 for the platform UI).

## Kit API (`const G = Glass`)
World px (y down) inside the panel; screen px for the window. Every function has a comment in `kit.js`.
- **setup** — `init({skySeed, medallion, petals, border, bars})` (≈ .4 s); `C` palette, `ROBES`, `LEAD INK INK2`, `FONTS`,
  `PX0 PX1 PY0 PY1 BAND0 BAND1`, `step(t)` (12 fps).
- **glass** — `piece(c, path, col, id, {lead, mat, vary, ts, tex, paint, flat})` (THE primitive), paths `smoothP` (a point
  `[x, y, 1]` is a sharp corner), `polyP`, `rectP`, `ellP`, `limbP`; paint `brush` (tapered grisaille), `stroke`; `vary`, `h2`.
- **window** — `lancet(d)`, `lancetPts(d, step)`; frame passes `begin(ctx)` (sky) → `panel(ctx, cam, paint)` →
  `cloud(ctx, t, o)` (ambient shadow) → `glaze(ctx, dim)` (light falloff, frame, `bloom`, band) → `captions` → `endCard`.
- **world builders** (once, into a canvas) — `world({x0, y0, w, h, scale, seed, id}, wb => …)`, `drawWorld(c, wd)`;
  `mountains`, `hills` (+ `hillY`), `tree`, `gatehouse` / `door` (lit white doorway), `road` (flagstones, `lit` stones),
  `ground` (rock band, ragged `left`/`right` edges), `chasm` (unlit band + cliff lips).
- **figures** — `profile(c, f)` (walk phase/amp, stand, lean, crouch, look, dir incl. squash, `hand` grip with IK,
  `elbowUp`, `farHand`, `holding` hook for a tool, `noArm`/`armOnly` split), `kneelBody(c, f)` + `kneelGeo(f)` + `arm(c, Sh,
  T, s, col, id, down)` (frontal kneeling at work, hands at the grip points), `ik`.
- **long objects** — `cross(c, X)` (leaded in `segs`, `noBar` for a plain beam, `glow`), `carry(f, len)` (on the
  shoulder: grip, front, drag), `upright(f)`, `along`, `lerpCross`, `byHead`; `D` = dimensions.
- **light** — `radial(c, x, y, r, stops, o)`, `doorLight`, `haloAt`, `rubyGlow`, `spark` (weld), `lightFlow` (light runs
  down a beam).
- **the hit** — `shards` + `shatter` (the ruby piece breaks and falls into the dark) + `breakFlash`; `cracks` +
  `drawCracks` (the window itself cracks, light races through, heals); `shake(cam, t, at)`.
- **camera** — `camKeys([[t, x, y, z, ease], …], t)`, `toScreen(cam, x, y)`.

```js
const G = Glass, S = SCRIPT, B = S.beat; let WD;
async function init() { G.init(); WD = G.world({ x0: -240, y0: 260, w: 2000, h: 1900 }, wb => {
  G.mountains(wb, -240, 1760); G.hills(wb, -240, 1760); G.road(wb, -240, 1760); G.ground(wb, -240, 1760, 0); }); }
function draw(ctx, t) {
  const tf = G.step(t), cm = G.camKeys([[0, 500, 1230, 1.7], [30, 560, 1230, 1.8]], t);
  G.begin(ctx);
  G.panel(ctx, cm, c => { G.drawWorld(c, WD);
    G.profile(c, { x: 300 + 40 * tf, y: 1368, s: 1.08, dir: 1, lean: .08, phase: (300 + 40 * tf) / 34 * Math.PI, col: G.ROBES.me, id: 900 }); });
  G.glaze(ctx); G.captions(ctx, t, S.lines); G.endCard(ctx, t, S.endCard, B.end); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: G.FONTS, init, draw });
```

## Motion grammar (what worked in ⑦)
- **12 fps for everything that is glass** (figures, pieces, poses: `G.step(t)`), smooth camera and light. In-betweens are
  stepped (`Math.floor(q·3)/3`): a cross is lowered in three positions, not a slide.
- **Light tells the story**: the door leaks more light as each one goes in (`doorLight` gl .55 → 1.2); a bridge lights
  up as light runs down it (`lightFlow`); people walking into the light get a halo and fade.
- **Pieces join with a spark**: offcuts slide along the leads into the ghost outline and weld (`spark`); the template's
  root and sprout are leaded in joint by joint the same way.
- **The hit breaks the glass**: the ruby piece shatters into triangles that fall into the unlit chasm (`shatter`,
  `breakFlash`), a 3-frame stepped shake, the window dims 20 % (`glaze(dim)`). `drawCracks` is the alternative (v1).
- **End**: a cloud covers the sun (every pane goes unlit) and the card is painted on a white-glass plate.
- **Ambient while waiting**: cloud shadows drift across the window (`cloud`), breathing on 12 fps (a 1 px stepped bob).

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- Page ready (init + world canvas at scale 1.5 + first frame) ≈ .6 s. Per frame: ⑦ 47.0 ms after the kit vs 47.5 ms before
  (median of 5 interleaved runs, 122 seeks); template 43 ms. The cost is per-piece texture fills (`piece` clips +
  multiplies a pattern) — build everything static into `world()` once; draw only moving pieces per frame.

## Pitfalls
- **Ids are seeds.** `piece(…, id)` picks the colour shade and texture rotation from `id` — a moving piece must keep the
  same id every frame (or it flickers). Figures use id … id+31: give each figure its own block of 100.
- **Builders share one rng in call order** (`world({ seed })`): adding or reordering a builder call re-cuts everything
  after it. Append new builders at the end if a look is already approved.
- **Never `dir: 0`** — the profile divides by dir (a turn passes through ±.4, never 0).
- **Out-of-reach grips**: `ik` clamps the arm; the frontal kneel reaches ≈ 119 px at s 1.08 from shoulders at
  knees − 121 px. Put work points within reach rather than stretching arms.
- **Glow + bloom add up**: halos above ≈ .5 strength blow the panel out to white (bloom doubles them). Keep `haloAt`
  ≤ .5 near the subject, rubyGlow ≤ .7.
- **The band is drawn after bloom** so words are never glared; anything you draw after `glaze` is not lit by the window.
- **Texture scale**: the world canvas is built at 1.5×; zooms above ≈ 2.4 show softness. Raise `scale` for closer shots.
- Dead code kept: ⑦'s v1 cracks (unused in the final cut) are the kit's `cracks`/`drawCracks`, checked in isolation.
- The refactor is pixel-identical (max diff 0 at 28 times).

## What a scene author still draws
The world layout (which builders, where the road/gap/door are), the story's props (the saw in ⑦; seed, root, sprout in
the template — all as `piece`s), each character's pose by time (positions, phases, holds, grip points), the camera keys,
light timings, and `script.js`. The template marks these with ✎.
