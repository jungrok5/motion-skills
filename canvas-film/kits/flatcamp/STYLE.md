# 픽셀 캠프파이어 (flatcamp)

Flat geometric pixel diorama: a blue night forest painted on a coarse pixel grid (whole pixels, no anti-aliasing), blown up
nearest-neighbour at an integer scale per shot, seen through a dark blobby window frame; little hooded wanderers on twos;
campfire light as a palette swap inside a dithered pixel circle, with rising ember pixels. Kit: `kit.js` → `window.Flatcamp`.
Worked example: 잘라 낸 건 다리였다 · 05 (`sermons/2026-10-24-cross-styles/film/scenes/cs-flatcamp.html`). New scene:
`template.html` + `script.example.js`.

## What it looks like
A cosy pixel-game night: periwinkle/navy trunks with light shafts, mushroom-cap trees, pines, bushes, mist bars drifting on
twos, a green-lit forest floor wherever the fire reaches. The camera *cuts* between pixel scales (13× close-up … 6× wide)
and pans in whole pixels. Everything blue except the fire: the accent is campfire orange (wood, door, embers).
The frame (the lab's window, `#24273D`) is always there, and closes in to a plain plate for the end card.

**Carries well:** fables told small and warm; a journey of little figures; a fire/light that is found, kept, given, lost;
a group of the same kind with one who is different; game-like beats (try → fail → retry); hope as a circle of warmth that
turns the world green. Very readable at phone size, playful without being silly.
**Carries badly:** subtle faces (a 1–2 px eye), fine gestures (hands are 3×3 blocks), realism, grief that needs weight,
long text in the picture, very fast motion (on twos it strobes), many overlapping figures at wide scales.

## Palette
| role | hex |
|---|---|
| night bg / dark trunk / light trunk / shaft | `#29358A` / `#232B70` / `#2D3D9C` / `#4A64C4` |
| ground night / top row / lower band | `#2A3A92` / `#3A4FB0` / `#222A6A` |
| ground lit (inside the fire's circle) / top | `#73A97B` / `#8AC48A` |
| chasm / deep | `#1D2366` / `#0D0F2E` |
| **accent** fire bands outer / mid / core | `#F08424` / `#F8B830` / `#FFF0A0` |
| accent wood body / shade / highlight | `#D8782C` / `#94461E` / `#F4A850` |
| embers young / old | `#F0A030` / `#C86020` |
| cold wood (everyone else) | `#4A5288` |
| hero hood / face / cloak / legs | `#7482C4` / `#F2DCB8` / `#5D6BB0` / `#24243E` |
| crowd hood / face | `#4E5894` / `#A89CAC` |
| frame / frame edge | `#24273D` / `#2B2F4A` |
| captions / caption shadow / source | `#F4F0DC` / `#121633` / `#D4DAF4` |

Full `NIGHT` and `LIT` tables (identical keys) and figure palettes `FIG.me/other.{N,L}` are in `kit.js`.

## Type and placement
Do Hyeon 400 at 66 px for captions — crisp at full resolution (not pixelated), cream with a hard 5-px navy offset shadow,
y = 410; end card in Do Hyeon cream on the closed frame plate (y = 860). `FC.FONTS` for `Pilot.run`.
Rendering needs `DoHyeon-Regular.ttf` installed locally (Google Fonts is blocked while recording).

## Kit API (`const FC = Flatcamp`)
Design units = the 1080×1920 frame at 8× (`U = 8` per world pixel); pixel primitives take buffer pixels (`B2([x, y])`).
- **setup** — `init()` (frame plate); `forest(seed=11, {from, farTo, midTo})` → `{far, mid, haze}` once.
- **palette/type/timing** — `NIGHT LIT FIG WOOD EMBER WOOD_COLD FIRE EMBERS CREAM FRAME FONT FONTS BODY U`;
  `step8` (figures, on twos), `step12` (falling/flying/sparks), `backEase`.
- **view** — `setView(K, x, y, shx, shy)`, `view()`, `bx by B2`, `shake(shot, t)`, `bufs(K)` → `{n, l, m, tmp}`,
  `present(ctx, bb)` (nearest-neighbour blow-up).
- **pixel primitives** — `R pxCircle pxRR capsule pine pxLine pxPoly pathB sprite arcPts`.
- **world** — `background(c, P, forest, gyw)`; `haze(c, t, forest)`; `ground(c, P, gyw, {gap:[x, w], inGap})` (ground,
  grass, chasm walls); `gatePos(x, gy)` + `gateDoor(c, P, t, G)` (burning doorway) + `gateArch(c, P, G)`;
  `campfire(c, t, x, y, s)`; `embers(c, t, x, y, n, seed, spread)`.
- **light** — `lit(bb, D, g => paint(g, LIT, 'L'), flash)`: D in design units; pixel circles with a dithered 8-px rim.
  `dashedPx(c, pts, t, xmax)` marching outline; `fireFill(c, a, b, fresh)` a slot catching fire.
- **frame/words** — `windowFrame(ctx, t, endAt, {eyes})` (closes in from `endAt − .25`); `captions(ctx, t, lines, o)`;
  `endCard(ctx, t, card, at, o)`.
- **long things** — `crossGeo(o)` (PW 40), `cross(c, K, g, u0, u1, x, y, a, lying)`, `outline cpt mixX rotAbout carry
  gripCarry holdUpright holdFront` (same as flatnight).
- **rig** — same pose spec and functions as flatnight (`walk stand kneel crouch lookUp hangHands hangGrip reach handR handL
  mix turn ik frame shoulderOf`), drawn by `figure(c, F, C, mid, back, over)` on the pixel grid.

```js
const FC = Flatcamp, forest = FC.forest(11); FC.init();                       // in init()
function draw(ctx, t) {
  const sh = { K: 9, x: 120, y: 1040 }, bb = FC.bufs(sh.K); FC.setView(sh.K, sh.x, sh.y, ...FC.shake(sh, t));
  const F = FC.walk(-200 + 90 * FC.step8(t), 1300, 1.04, 1, 90 * FC.step8(t) / 146, 140, .12);
  const paint = (g, P, k) => { FC.background(g, P, forest, 152); FC.ground(g, P, 152); FC.figure(g, F, FC.FIG.me[k]); };
  paint(bb.n, FC.NIGHT, 'N'); FC.lit(bb, [{ x: 200, y: 1250, r: 300 }], g => paint(g, FC.LIT, 'L'));
  FC.haze(bb.n, t, forest); FC.present(ctx, bb); FC.windowFrame(ctx, t, SCRIPT.beat.end);
  FC.captions(ctx, t, SCRIPT.lines); FC.endCard(ctx, t, SCRIPT.endCard, SCRIPT.beat.end);
}
```

## Motion grammar
- Shots, not moves: hard cuts between integer scales (13 hook close-up, 10–12 hands-on beats, 8–9 medium, 6–7 wide);
  pans only in whole pixels; shake in whole pixels (±2) decaying on the hit, plus a one-frame white `flash` (whole frame lit).
- Figures and their props evaluated at `step8(t)` (on twos); falling, flying, sawdust and flame flicker on `step12`.
- Light pops open with `backEase` (overshoot) on twos; ember pixels rise from every fire; mist bars drift; the frame closes
  in whole pixels for the card.
- No half-transparency on figures: they step out of sight (`alpha ≤ .5` = not drawn).

## Performance
1080×1920, Chromium, 4 shared CPUs: worked example **≈ 6–7 ms/frame** median (p90 ≈ 10–15 ms: drawing happens at 1/K
resolution); template ≈ 5 ms. Refactor to the kit: max channel diff 0 on 10 stills, timing unchanged (7.2–7.4 → 6.0–6.3 ms).

## Pitfalls
- Never draw anti-aliased paths into the buffers — use `pxPoly`/`pxLine`/`R`; a single `arc()` or smoothed `drawImage`
  breaks the look. `present` and `windowFrame` set `imageSmoothingEnabled = false`.
- Call `setView` before anything uses `B2` (it reads the current view); `background`/`ground` take the ground line in WORLD
  pixels (`Math.round(groundY / U)`).
- The kit has two "frames": `frame(F)` is the body frame of the rig; the window is `windowFrame` (a name clash cost a
  refactor round).
- The forest is finite (`from`…`farTo`/`midTo` world px): widen it for long walks or the backdrop ends.
- Captions are drawn at full resolution on purpose (v2): pixel captions at 2× were hard to read.
- Body check (rig reports): hands on the shaft through every lowering/tipping in-between; tool and load in separate hands;
  hoist frame before a 180° turn; no one-handed cantilever.
- Ghosts from the lab (pixel sprites) were removed in v2 — use `sprite()` if a story needs them.

## What a scene author still draws
The one image in pixels (seed, door, tool…), the poses on twos, the shot list (scales and cuts), where the fire is and how
big its circle gets, the props' pixel palettes. Script text and end card come from `script.js` / `source.json`.
