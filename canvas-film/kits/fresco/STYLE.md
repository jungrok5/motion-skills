# 석회벽과 낮은 해 (fresco: lime plaster in a low sun)

Kit: `kit.js` → vendored as `scenes/kit-fresco.js`, global `window.FRESCO`. Source: one-scroll-bible
`motion/films/christ/fresco-cornelius.js` (「그리스도」, 2026-11, 1:59–2:05). In that film it draws N20, "'그리 마옵소서' 하던
베드로가 / 부활하신 예수님을 만난 뒤 전한 말" (Acts 10:24–27): the Peter of part 3 stands in the courtyard of a house and speaks with an
open hand to many men seated before him, most of them seen from behind. A low sun beyond the gateway burns its opening white-gold,
lays a shaft through the air and a long pool across the flagstones, falls on Peter head to feet, and throws every body's long
shadow toward us.

**About the name.** The review calls this look `fresco` because it started as a Pompeian wall painting (round 4: cinnabar panels,
flat colour in dark outlines, hairline cracks, raking light on the painted wall). Over the film's rounds it became the real place
such a wall stands in, and what shipped has no painting left in it: plastered stone walls, flagstones, a gateway and the sun.
The kit is that shipped engine. The painted-wall renderer is not in this kit; it is in one-scroll-bible's history
(`git show 42331cc:motion/films/christ/fresco-cornelius.js`). See Checks for how the look got from one to the other.

The engine moved out of the scene unchanged: the same canvas calls, in the same order, with the same seeds. The scene now aliases
it (`const cfP = CFC.P …`, `const { rim, edgeOn, lens } = FRESCO`). Before/after stills of the film (120.6, 122.5 and 124 s,
portrait and landscape) have identical PNG hashes, and two runs of the unchanged film gave the same hashes too. The courtyard's
props (latticed window, house door, bench, water jars, fig tree, reed awning), the men's body rigs (`cfMan`, `cfBack`, `cfArm`),
their colours, Peter's face and robe, and the camera stay in the film.
Template: `template.html` is a different subject. Late in the day a woman sweeps an empty courtyard in the beam. The dust she
raises turns in the light, something small glints in the pool on the floor, she stops, and the sun grows (a placeholder for
Luke 15:8–9).

## What it looks like
Late afternoon in a plain stone courtyard in the eastern Mediterranean, filmed like a live-action scene. It does not read as
an illustration. The light is the main character.
- **A world in metres.** One pinhole camera 1.55 m above the floor (`FRESCO.court`) projects everything: walls, floor, the
  gateway, the people. The beam's section at any depth, the pool on the floor, each body's shadow and each mote of dust come from
  the same sun direction, so they agree with each other without hand placement.
- **Lime plaster over stone.** Warm grey-ochre walls, mottled light and dark, the plaster fallen in a few places to show the
  stone courses beneath (never round the gate, never behind the main figure), a damp grime at the foot, plaster grain over
  everything. The back wall is kept plain, because bare patches there read as blots.
- **Hand-laid flagstones.** Rows of uneven limestone slabs with earth in the joints, each with a worn hollow or a stain.
- **The gateway burnt out.** A low sun stands beyond an arched opening of dressed stones. The opening is white-gold glare, the
  lane's far wall a paler shape lost in it, the left jamb's inner face and the soffit in shade, the threshold lit, and a bloom
  spills over the wall round it.
- **The sun's pool and the long shadows.** A pool of warm light lies across the flagstones toward the camera (the floor redrawn,
  multiplied warm and screened), fading toward us. Each figure standing in it cuts its own long shadow out of it.
- **The shaft and its dust.** A soft hull from the opening to the pool, with rays from points of the opening along the sun.
  The dust lives only inside the beam: brightest in its core, fading at its edge, sharp at the main figure's depth, with a few
  large out-of-focus discs nearer the camera. There is none over a face and none in front of a nearer body.
- **Open shade.** Everything outside the beam is lit by the courtyard itself: warm bounce off the sunlit floor, darker up the
  walls and to the right, darker on the near floor in the people's shade. The walls sit a touch out of focus and the near floor
  more.
- **Figures without outlines.** Each figure is a shape filled in the open-shade colour, with roundness, folds and a faint sky
  edge on top (`FRESCO.rim`). Its light plate adds the floor's warm bounce, a key **only where the beam really crosses it**
  (clipped to `C.beamAt(D)`), the sun's edge on the gate side, and on head cloths a warm edge from the light behind plus a little
  light through the thin cloth (`FRESCO.edgeOn`, spill). The light plate is screened by the sun's strength, so the sun can grow.
  Plates are blurred slightly (`FRESCO.lens`).
- **Grade.** A soft warm vignette, lighter toward the gate, a little soft-light contrast that keeps the haze, and moving grain.

## Meanings it carries
**Well:**
- Witness and testimony told to many: someone who was changed now speaks, and the light falls on him and on those listening.
- An ordinary place visited by light: a home, a courtyard, a day's work (sweeping, mending, waiting at a gate) made quiet and
  holy by one beam.
- Arrival and threshold: someone at the gate in the glare, a door that opens onto light, the prodigal coming home at evening,
  a messenger.
- Something found in the light: a coin, a word, a face lit at the right moment.
- A gathering in a house (the early church in homes, a meal, a teaching), told so that it reads without knowing the passage.

**Badly:**
- Night, fire and storm. Its light is one low sun. For lamp and candle use `lamplit` or `oilpaint` (rembrandt, caravaggio).
- Wide landscapes, journeys and cities. It is one enclosed courtyard, and the camera only creeps.
- Close faces and emotion carried by expression. Faces are found by a few soft value shapes in shade. Closer than a medium
  shot they turn into masks (see Checks).
- Anything that needs the Bible to explain the picture (a Roman officer's house, a vision). The film dropped exactly that.
- Bright cheerful daylight or cool colour. Everything is warm and hazy and the sun is low.

## Palette
| role | value |
|---|---|
| ground / void | `#16100c` |
| walls (albedo) | right `#a28a70`, left `#a89076`, back `#b29b7f`; bare-stone patch `#7a6650`, courses `rgb(150,128,100)`×(.82–1.08); mottling light `rgba(214,196,166,.08–.18)`, dark `rgba(80,62,46,.06–.14)`; grime `rgba(60,44,30,.42)` at the foot |
| floor | joints `#6a5644`; slabs `rgb(162,140,110)`×(.86–1.08); hollows `rgba(200,176,140,.22)` / stains `rgba(70,52,36,.2)` |
| gateway | voussoirs `rgb(176,156,124)`×v, jamb stones `rgb(172,152,120)`×v; glare `#fff4dc` → `#ffeccc` → `#ffdcaa`; far wall `rgba(214,184,140,.4)`; jamb face `rgba(150,118,84,.9)`; soffit `rgba(120,94,66,.8)`; threshold `rgba(255,240,206,.95)` |
| open shade | base `rgb(222,206,188)`, bounce added `rgba(100,72,44)`/`rgba(96,70,42)`/`rgba(70,50,30)`; multiplied: top `rgb(140,130,124)`, right `rgb(176,166,160)`, near floor `rgb(160,150,140)` |
| sun | pool: floor × `rgb(255,214,160)`, screen `rgb(176,124,70)`; shaft `rgba(255,226,170,.55)` → `rgba(255,214,150,.3)` → 0; rays `rgba(255,232,190,.08–.26)`; bloom `rgba(255,220,160,.85)` + `rgba(255,240,210,.55)` |
| dust | small `rgba(255,228,184)` → `rgba(255,220,170)`; large discs `rgba(255,222,172)` |
| figures | colour × ambient `[a, .9a, .82a]` (a = .44–.6); shade `rgba(10,5,4)`; sky edge `rgba(206,196,182,.3)`; floor bounce `rgba(255,178,116)`; key `rgba(255,200,140)` (Peter `255,172,100`); sun edge `rgba(255,214,158)`; cloth edge `rgb(255,208,150)` + glow `rgb(255,184,104)` |
| the film's men | robes `#5a4c3e #4e4a44 #5c6448 #4c5060 #6a5e4c #4a5464`…, mantles `#6e5e4a #806c50`, head cloths `#b2a488`–`#c2b498` with band `#3e2e2c`; a Roman's cloak `#8e2a20` (in the shade) |
| grade | vignette `rgb(206,192,180)` (multiply), soft-light .45, grain .07 |
| template (the woman) | robe `#3c4660`, sash `#7a3a2a`, veil `#cbbfa6`, skin `#b08468`, broom `#6a5236` |

## API (`const F = window.FRESCO`)
World px = portrait screen px at zoom 1 (the scene's own camera scales and slides the plates). Load after `lib.js` (Pilot).
No images, no network. Every function is a pure function of its arguments.
- `F.court(c)` → `C`: the camera and the gateway, in metres. `c: { F (focal px, 1000), E (eye height, 1.55), YH (horizon px,
  700), CX (centre px, 540), DW (back wall depth), G0, G1 (the opening's X), GS (top of the jambs), GH (top of the arch), tanE
  (tan of the sun's height, ~.3), hx, hz (where the sun travels per unit of fall: right, toward us), n (16) }`. `C` carries `c`'s
  fields plus:
  - `C.P(X, Y, D)` → px. `C.wall(X, Y)` is a point on the back wall.
  - `C.sun(X, Y, D)` → `[X, D]`, where the sun through that point lands on the floor.
  - `C.archY(X)`, the arch's height. `C.AP`, the opening's outline `[X, Y]`.
  - `C.beamAt(D)` → px polygon, the beam's section at depth D. Clip a figure's key to it.
  - `C.cast(X, D, S)` → a map `(x, y) → px` that lays a figure built in units of its height S (m), standing at (X, D), on the floor
    along the sun. Pass it as the figure's map to build its shadow.
  - `C.pool(clip = .8)` → px polygon, the sunlit pool on the floor.
- Shapes: `F.poly(g, pts)` (a path on a context or a Path2D), `F.hull(pts)`, `F.clipD(poly, dmin)`, `F.circ(cx, cy, rx, ry, n,
  rot)`, `F.caps(a, b, w0, w1, n)` (a capsule polygon), `F.ik(s, t, a, b, bend)` → `{ el, wr }` (2-bone arm),
  `F.adder(P, f, q)` → `add(pts, ...parts)`. The adder adds a closed rounded polygon (unit coords, mirrored by f, mapped by P) to
  the silhouette q and to any part paths. Build bodies from these so there are no lines anywhere.
- `F.flagstones(x, P, { XL, XR, DW, near: .7, seed })`: the floor. Call it again on the pool plate.
- `F.plaster(g, pts, base, seed, wallMap, o)`: a wall clipped to `pts`. `wallMap(X, Y)` → px on that wall. `o: { patches (7; 0
  for a plain wall), avoid (X, Y) → true to keep a patch away, X ([-4, 3]), Y ([.3, 5.5]), mottle (90), MY ([0, 7]) }`.
- `F.grime(g, pts, y0, y1)`: the damp band at a wall's foot.
- `F.grain(g, w, h, seed = 5)`: plaster grain (overlay .45) over the whole plate.
- `F.openShade(g, w, h, ox, oy, { base, bounce: [[cx, cy, R, rgba]…], shade: lx => … })`: the courtyard's light, multiplied
  over the albedo. `bounce` is added, and `shade(lx)` multiplies more gradients (lx is translated by ox, oy).
- `F.gate(g, C, { depth: .5, veil: 400 })`: the opening burnt out. `F.gateStones(g, C, seed = 4)`: the dressed stones.
- `F.defocus(src, { blur: 1.2, oy, rows: [[y, px]…] })` → canvas: the plate a touch soft, each row band below y more.
- `F.rim(X, T, off, path, box, Lt, d, c0, c1, bl)`: a soft edge of light inside a shape (the shape minus itself moved by `Lt·d`,
  coloured `c0 → c1` top to bottom, blurred `bl`). X is the plate to draw on, T a scratch context; both are translated by
  `-off`. `Lt = [1, .4]` lights the left edge (a gate on the left), and `[.15, 1]` the top (the sky).
- `F.edgeOn(X, T, off, sil, region, box, Lt, d, col, bl, a, spill)`: the same band, only where the silhouette's **outer** edge runs
  along `region` (a head cloth, hair, the neck). With `spill` it is blurred past the edge, as light through thin cloth.
- `F.lens(c, bl = .8)`: blur a plate in place.
- `F.sunPool(C, PB, floor, shadows, { clip: .8, fade: [y0, y1, a] })` → canvas at `PB = { x, y, w, h }` (world px). Pass
  `floor(x)` to redraw the floor and `shadows(mx)` to fill every body's cast silhouette into the mask.
- `F.shaft(C, SB, { clip, n: 22, seed: 33, nearD: 1.2 })` → canvas at `SB`. `F.bloom(C, BB)` → canvas at `BB`.
- `F.dust(n = 96, seed = 41, big = 6)` → motes, then `F.drawDust(ctx, u, motes, C, { focus (m), I, top: .05, near: [2.5, 3.4],
  bodies: [[x, y, S, D, h]…], heads: [[x, y, r]…] })` each frame, at the people's layer transform.
- `F.grainTile(seed = 91)` → canvas, then `F.finish(ctx, u, tile, { soft: .45, grain: .07 })` last. It saves and restores.

```js
// init
const C = F.court({ F: 1000, E: 1.55, YH: 700, CX: 540, DW: 6.5, G0: -2.75, G1: -1.45, GS: 2.3, GH: 2.95, tanE: .3, hx: .72, hz: .7 });
F.flagstones(g, C.P, { XL, XR, DW }); F.plaster(g, wallPts, '#b29b7f', 19, C.wall, { patches: 0 }); /* side walls, grime, props */
F.gateStones(g, C); F.grain(g, RW, RH); F.openShade(g, RW, RH, OX, OY, { bounce, shade }); F.gate(g, C);
ROOM = F.defocus(room, { oy: OY, rows }); POOL = F.sunPool(C, PB, floorFn, mx => mx.fill(body(C.cast(X, D, Hm))));
SHAFT = F.shaft(C, SB); BLOOM = F.bloom(C, BB); DUST = F.dust(); GRAIN = F.grainTile();
// each frame
draw ROOM (parallax .94) → screen BLOOM → POOL (alpha ~I) → screen SHAFT (.75·I) → figures far to near (base plate, then light plate
screened at I) → screen SHAFT again (.14·I) → F.drawDust → F.finish → words
```
Draw in this order:
1. Albedo: floor, walls, grime, props, gate stones, grain.
2. Open shade, the gate burnt out, defocus.
3. Each frame: room, bloom, pool, shaft.
4. Figures far to near, each a base plate plus a light plate screened by I.
5. A thin veil of the shaft, the dust, `finish`.
6. A dark band and the words.

## Motion grammar
- The camera creeps in and slides a little toward the gate over the whole shot (`eio`). The film goes from 1.2 to 1.3 zoom in
  portrait and .86 to .92 in landscape. Plates move with parallax: walls .94, shaft .97, people 1.
- The sun's strength `I` rises from about .64 to 1 over the first 2.4 s, like a haze moving off, and everything lit is
  multiplied by it. In the template it rises once more at the turn (`joy`).
- The only body motion is small and slow: an open hand that reaches out, draws back a little and reaches again (41 cached
  steps of the gesture in the film), and a broom's swing in the template (21 steps). People do not walk.
- Dust drifts slowly in the opening's coordinates, settles a little and glints slowly. It never twinkles.
- No cuts inside the look. It dissolves in and out of the scenes around it.

## Performance
- `F.grain` is a per-pixel pass over half the room plate (1500×1050 in the film). The figures' rims and edges use scratch canvases
  and blur filters. Build all of it once in `init`, never per frame.
- Static figures go onto three shared plates (behind, front, near; the near pair blurred 3.5 px). Only a moving figure is drawn per
  frame, and it is cached by its pose step (`Map` keyed by `Math.round(step·40)`).
- Per frame: about six full-plate `drawImage`s, at most ~100 radial gradients for the dust, and one full-canvas soft-light
  self-draw in `finish`.
- The room plate is large (3000×2100) so that the landscape frame (zoom .86) still sees both side walls.

## Checks (what went wrong on the way)
- **The look changed four times for one five-second scene.** First the rock where Peter had stood repeated part 3, so it became
  a Hopper room. "호퍼가 약간 공포영화 느낌이라 다른 걸로" moved it to Vermeer. "이 영상에 제일 많이 차지하던 풍 아니야?" moved
  it to a Pompeian fresco. Then the painted wall got "테두리 선 있는 벽화풍 평면 그림이라 일러스트에 가까움, 문으로 든 아침빛이
  거의 안 보임". Round 6 went inside a Roman room with painted walls, with no outlines and the light as the main character.
  Round 7 ("고넬료 집 같은 장면은 성경 모르면 이해 어려움 … 억지로 그 장면의 배경 본문에 맞추지 말 것") took out the Roman room
  and the painted walls: one man, recognisably the Peter of part 3, telling many people in a sunlit courtyard. Check a look
  against the film's other scenes for repetition before drawing it. Make the scene read with no Bible knowledge.
- **Faces against the light.** Peter's face went through "이목구비 없는 검은 가면", then "매끈한 살색 면에 검은 수염만 —
  마네킹", then "눈 자리 흰 얼룩 둘 … 뭉개진 가면". What worked: the face in shade, found by a few soft value shapes where the
  gate's light grazes it (temple, cheekbone, brow, the bridge and tip of the nose), the warm floor's bounce from below as fill,
  and the beard melting into the shading. Never eyes or a mouth. Keep faces at a medium shot or further.
- **Heads.** Head cloths read as hard helmets and short hair as black balls ("3D 만화풍"). The fix: cloth folds falling from the
  band, an uneven hem lifted where it lies on the shoulder, hair strands from the crown, and a warm edge from the light behind
  with a little glow through thin cloth (`edgeOn`). Do not repeat the same white head cloth on every head ("같은 흰 두건을 반복해
  만화처럼"). Vary the tones and mix in short hair and mantles.
- **Bodies.** Torsos read as boxes and necks were missing ("목 없는 덩어리", "몸통 상자처럼 각짐"). Use a robe that tapers from
  broad shoulders to a sash and blouses over it, sleeves that hang, and a head on a neck. Make every figure legibly a man or a
  woman (the film's figures-gender-legible rule).
- **Dust.** 300 sharp white dots read as snow ("빛 파티클을 좀더 고급지고 덜 어색하게"). Use 96 motes, only inside the beam, with
  depth of field. This is the kit's `dust`/`drawDust`.
- **Template.** A short pole with a small head read as an old woman's walking cane. The broom became a long diagonal pole with a
  splayed bundle of twigs on the floor. The far hand floated on the robe with no arm behind it, so it is hidden.
