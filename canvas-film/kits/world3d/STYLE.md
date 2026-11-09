# 3D 세계 (painted 3D world — a camera through real space, light that changes over time)

Kit: `kit.js` → vendored as `scenes/kit-world3d.js`, global `window.W3`. Source: one-scroll-bible
`motion/films/messiah/kit-world3d.js` (「메시아 예언과 성탄」, 2026-11-02), which follows the first film's 「포로 귀환」
(`motion/pilot/return.html`). In that film it draws:
- the opening night flight over the hills of Judea, down toward Bethlehem with lamps in its windows (`buildFly`/`partFlight` in `film.html`), and the same flight drawing back before the magi;
- backlit Rome: the camera walks up a colonnade of `W3.prism` columns toward a temple in the sun, with red banners, sun shafts, the eagle standard and a herald between two soldiers drawn as small 2D silhouettes (`buildRome`/`partRome`);
- (2nd cut) the road to Bethlehem at dusk and the travellers on a ridge (`buildRoad`/`partRoad`, `partRidge`). In the 3rd cut the journey became Remington oil (`oilpaint`); the code is still in `film.html`.

The film vendors this exact file. The kit added two comment lines to its header, in both copies, and the film's stills
before and after were byte-identical. The land is not in the kit: the film's own `terrain()` draws it (see Checks).
Template: `template.html` is a different subject, a fishing village across a lake at dusk. The camera flies in low over
the water toward one lit window.

## What it looks like
A world in metres (y up), seen through one camera that moves on keys, lit by one light that also moves on keys. There are
no textures. Colour comes from the light, the haze and the distance.
- **Camera:** keys of position, look-at and focal length, joined by monotone cubics, so it never overshoots. Height and focal length move in log space, so a climb or a zoom feels even. Portrait and landscape each have their own focal length (`Fv`, `Fh`).
- **Light:** keys of sun elevation and azimuth, sun intensity and colour, ambient, sky top and horizon, glow, fog colour and distance, and `night` (stars). One shot can go from dusk to night, or from day into dusk, without a cut.
- **Faces:** each face is lit by the sun plus ambient, through a soft tone curve (no clipping). Then it is fogged toward the fog colour by distance (`1 − e^(−d/fogD)`, at most 94 %). Back faces are culled and faces are painted far → near. Seams are stroked in each face's own colour, so no cracks show. The result is matte, flat-lit planes that **layer apart in haze**, like aerial perspective in a painting.
- **Sky:** a gradient from top to horizon, a broad soft glow round the sun (or moon), and stars at night.
- **Lens:** `bloom` gives a bright core with a coloured falloff, a thin horizontal anamorphic streak, and two faint ghosts mirrored through the frame centre.
- **Finish:** film grain (four noise tiles cycled at 12 fps, overlay) and a warm vignette over everything.
- **Near things are not 3D.** People, animals, boats, standards and eagles are 2D silhouettes placed in the world: `W3.P` gives a screen point and the px-per-metre scale at that depth, so a path drawn in metres moves with true parallax. Give them a rim only on the edge toward the light.

In the film: a deep-blue starry sky with the Milky Way over grey hills, a small hill town of warm lamps, a pale road
winding up to it. Then Rome, pale and hazy against the sun: columns marching to a vanishing point, red banners, the sun
blooming through, tiny backlit figures on the podium.

## Meanings it carries
**Well:**
- Arriving at a place from far away: a town at night named in a prophecy, a homecoming (the first film's return from exile).
- One small place in a large land. Scale against power: the empire's colonnade marching into the sun, then a village on a hill.
- Time passing within one shot: dusk becoming night, lamps coming on one by one, the sun setting or rising, waiting.
- Geography that has to be true in space: a road between two places, a hill, a lake, a walk that takes days.

**Badly:**
- Things close to the camera. Houses, trees and temples seen near read as an architecture model, a game render, or "floating boxes".
- People acting, faces, hands. The engine has no characters, so figures are silhouettes.
- Materials that must look rich (marble, carved stone). Flat grey faces look like a 3D preview.
- Bright noon with no haze. Without a low light and fog it is plain CG.
- Coming back too often. The same 3D world three times in one film reads as reuse.

## Palette
| key | sky top → horizon | sun / moon | ambient | fog (distance) | accents |
|---|---|---|---|---|---|
| night (the flight) | `[6,10,30]` → `[44,56,102]`, stars, Milky Way | moon `[150,170,226]`, intensity .5, elev 40° | `[24,30,56]` | `[26,32,60]` (1300 m) | lamps `[255,214,140]` → `[255,180,90]`, roof edge at night `rgba(176,196,236,.45)`, land albedo `[.86,.72,.52]` with noise |
| backlit day (Rome) | `[52,92,158]` → `[244,230,204]` | `[255,236,200]`, intensity 1.25, elev 30°, behind the subject | `[92,92,112]` | `[226,214,196]` (230 m) | marble `[.95,.92,.86]`, banners `[.62,.12,.1]`, gold rim `[255,214,130]` |
| dusk → night (the road) | `[74,98,150]` → `[252,192,130]` … `[12,18,46]` → `[70,64,104]` | `[255,192,122]` elev 9° → −6° | `[92,72,90]` → `[36,38,72]` | `[226,176,146]` → `[52,54,90]` (1100 → 800 m) | the travellers `rgb(28,20,18)` with a sun-coloured rim |
| dusk on a lake (template) | `[56,74,126]` → `[252,180,124]` … `[10,14,40]` → `[56,54,90]` | `[255,184,120]` elev 6° → −5° | `[86,72,92]` → `[32,34,64]` | `[214,162,142]` → `[46,48,78]` (900 → 700 m) | windows `[255,206,130]`, whitewash `[.86,.8,.68]`, roofs `[.56,.38,.3]` |

## API (`const W3 = window.W3`)
Units are metres, y up, angles in degrees, azimuth 0 = +z (straight ahead of a camera looking down +z).
- `W3.cam(keys)` → `camAt(t)`. Keys are `[[t, x, y, z, tx, ty, tz, Fh, Fv], …]`, with focal lengths in px. Orientation comes from `Pilot.ori` (the header's `ori` argument is not used). The camera `c` has `{ x, y, z, F, f, r, u, cy }`.
- `W3.light(keys)` → `lightAt(t)`. Keys are `[[t, elev, az, sunI, sunC, amb, skyT, skyH, glow, fog, fogD, night], …]`, eased between keys. `L.sd` is the unit vector toward the sun.
- `W3.P(c, X, Y, Z)` → `[sx, sy, s, depth]` or `null` behind the near plane (0.5 m). `s` is px per metre at that depth: `ctx.translate(sx, sy); ctx.scale(s, s)` draws a path in metres there.
- `W3.poly(ctx, c, pts)` clips a world polygon at the near plane and sets the path (returns false if nothing is visible). You fill it.
- `W3.shade(alb, n, dist, L, k = 1)` → `[r, g, b]`: sun + ambient through the tone curve, fogged by distance.
- `W3.faces(ctx, c, L, list, { seam = true })` culls, sorts and paints faces `{ pts (counter-clockwise from outside), alb, n?, k?, two? }`. Normals are cached on each face (`f.n`), so build the list once and keep it.
- `W3.box(x0, y0, z0, x1, y1, z1, alb, k)` → 6 faces. `W3.prism(x, z, r, y0, y1, n, alb, k)` → an upright n-sided column.
- `W3.sky(ctx, c, L, t, { stars })` paints the whole frame and returns `{ sun: [sx, sy, …] | null, hy }` (the sun's screen point, the horizon line).
- `W3.bloom(ctx, x, y, col, k, { r = 140, streak = .55 })` gives a lens bloom (screen blend), for the sun, a lamp, or the head of a moving light.
- `W3.finish(ctx, t, { grain = .09, vignette = .62 })` adds grain and the vignette. Call it after the picture and before the words.
- Also exported: `W3.css(rgb, a)`, `W3.curve(ts, vs)` (a monotone cubic for your own animated values), `W3.toC`, `W3.tone`, `W3.normal`.

```js
const CAM = W3.cam([[0, -8, 9, -160, 8, 62, 640, 1300, 1750], [30, 2, 2.4, 500, 8, 11, 640, 1600, 2400]]);
const LIGHT = W3.light([[0, 6, 6, 1, sunC, amb, skyT, skyH, glow, fog, 900, 0], [30, -5, 6, 0, …, 700, 1]]);
function draw(ctx, t) { const c = CAM(t), L = LIGHT(t), sk = W3.sky(ctx, c, L, t, { stars: true });
  /* far land (far → near) */ W3.faces(ctx, c, L, FACES); /* near silhouettes at W3.P points, lamps */
  if (sk.sun) W3.bloom(ctx, sk.sun[0], sk.sun[1], L.glow, L.sunI); W3.finish(ctx, t); /* words */ }
```
Draw in this order: sky → ground or water → far things in 3D, far → near → near things as silhouettes → lamps and bloom →
`finish` → a dark band and the words. Land is yours to build. The film's `terrain()` (in `film.html`) draws rows of quads
on a world-locked grid. The template uses ridge "curtains" standing in a lake, each with its mirrored reflection.

## Checks (what went wrong on the way)
- **Close faces looked cheap.** Making the cinematic 3rd part (2026-11-02), houses, trees and the temple seen near looked like an architecture model. The class came from backlit silhouettes, fog, shafts of light and far land. So use 3D for land, sky and distance, and draw near things as silhouettes.
- **Houses read as floating black boards.** Every look review (r4–r7, both orientations): at 19 s "집이 두께 없는 검은 판자로 떠서 상자·카드 더미로 읽힌다", "floating boxes". Two fixes. In round 4 the roof's top face catches the moon (a thin cool stroke at night). In the 4th cut the camera stops (`flightIn`, camT ≈ 12.5) before the backlit front walls turn into boards. The template's flight also stops about 100 m short.
- **The land swam, then looked like bricks.** A grid that moves with the camera makes the ground shimmer, and one colour per cell looks like brickwork. Lock the grid to the world (cells of 2^k m that grow with distance, with coarse rows taking heights along the fine edge so no cracks open). Shade each cell with a gradient from near edge to far edge, using normals of the smoothed surface (`terrain()`, 2026-11-03).
- **Low-poly grey hills on a TV.** In the landscape reviews, "화면의 2/3가 로우폴리 면이 보이는 회색 산" and "각진 폴리곤 언덕". Keep the land under haze or night, don't let bare land fill the lower half, and lay the caption band over it.
- **Flat grey marble looks like a 3D preview.** Rome was rated the most cinematic shot in landscape (columns converging, backlight), but every round also said "질감 없는 회색 기둥 … 시안용 3D 박스". The film did not fix this. Next time vary the value per face (`k`, noise in `alb`) or keep it deep in backlight.
- **"No one is there — an architecture render"** (Rome, round 3). A herald and two soldiers were added on the podium, small, as 2D silhouettes at `W3.P` points with a gold rim. A world needs one small person to read as a place.
- **Too much glare for a TV** (round 3). The sun bloom went down to .7 and the shafts to .07. A place label over the glare needs the sky darkened under it.
- **Too dark and too still.** The first measured cut averaged 49/255 brightness (the first film's Shorts: 78–97), with 58 % dark frames and 24 % nearly still frames. The slow night flight was among the stillest stretches. Make the camera really travel ("첫 8초 카메라가 더 지나감").
- **The same world three times.** The opening town came back at the name "Jesus" and at the end. Every reviewer flagged it ("the opening's 3D town again — floating boxes, nothing new at the peak"), and the maintainer said "오일 느낌이랑 3D 맵이 제법 많이 나오네" (2026-11-05). Both scenes were remade as new places in `cinematic-3d` (a lane at eye height, a room at dawn). Use one 3D world once or twice per film.
- **Template.** Round window glows hid the houses, so it uses a small lit pane with a tight glow. The sun's glitter with one dash per row read as a striped bar, so the dashes are scattered and broken. Evenly spaced reflection dashes read as ladders, so they are jittered.
