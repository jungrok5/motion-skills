# KIT — every builder and its options

This is the engine's kit as `scanned-realm` has it (land, water, materials, scans, geometry, buildings, props, trees,
weather, the walk). What `machine-wilds` adds:
- **Machines** — `LR.mech` (lib/48_mech*.js): `references/MACHINES.md`. In every `avoid` of a scatter use
  `LR.mech.wayDist(x, z)` (metres outside the nearest way; negative on it).
- **Materials** (lib/17_mechmats.js): `steel chrome paintmetal rustplate ceramic rubber concrete asphalt`.
- **Weather**: `LR.wx.looks.mist` and `?wx=mist` (its `glow` is the light the mist holds after dark; `LR.wx.airGlow`, 0.015, scales it); `LR.start({ round: [{ t, tod, weather }, …, { t, end: true }] })` sets
  the automatic round of the realm.
- **The walker on slopes** (lib/80_player.js): a climb slows the step from a grade of 0.18, and a face steeper than a
  grade of 0.94 (43°) is slid along, not climbed. Decks (`LR.world.floors`) are not slopes.
- **Views** (`lib/80_player.js`): `LR.player.view` is `'first'` (inside the head; the body is not drawn, its shadow is),
  `'third'` (a boom behind and above, shortened where the ground is in its way) or `'top'` (high over it, looking down);
  `LR.player.setView()` goes round them (V, the HUD's camera button, a pad's Y), `LR.player.zoomBy(k)` zooms — the lens
  in the first view, the distance in the others (wheel, + −, a pinch, a pad's ↑ ↓). `?eye=third` (or `top`) starts there. The
  second and third exist only in a realm that spawns a body (`references/MACHINES.md`). `LR.player.torch` (B) is its lamp.
- **Solids with a height**: `LR.world.solidBox(x, z, hx, hz, yaw, { y0, y1 })` stops only who stands between those heights.
  Give `y1` the thing's real top, not a wall's: a walker who has hopped to within `LR.player.mantle` (0.4 m) of the top is
  let onto it and stands on it (a hop, `LR.player.hop` 5 m/s, rises 0.96 m — parapets and barriers up to about 1.3 m).
  Whoever steps off a deck, a parapet or a bank more than 0.6 m high falls under gravity and lands (`'landed'` is emitted
  with the speed; the eye dips with it). Nothing is lost by a fall: make sure there is a way back up.
- **A film**: `LR.start({ film: [{ name, dur, tod, weather, t, cam: (u, LR, seconds) => ({ at: [x, z], up | y, look: [x, y, z] | yaw, pitch, fov }) }] })` → `scripts/film.mjs`.
- **Lamps** that move: `k.lamp(...)` on a machine; `?off=lamps`, `?off=shake`.
- **Events**: `LR.on('footfall', (p) => …)` (`{ x, y, z, tonnes, size, unit, leg }`), `LR.on('mechcall', …)`;
  `LR.audio.footfall({ d, side, tonnes, wet })`, `LR.audio.call({ d, side, f, len, gain })`.
The village named in the examples below is scanned-realm's worked example; the builders are the same here.

Units are metres; +x east, +y up, +z south. A compass yaw of 0° looks north (−z), 90° east. A building's own frame has
x along its ridge, z out of its front, y up from its levelled site; `yaw` (radians) turns it about y — yaw 0 fronts
south, `Math.PI / 2` east, `Math.PI` north, `-Math.PI / 2` west. Everything is seeded: the same source builds the same realm.

## Land — `LR.land` (lib/35_terrain.js)
| call | what |
|---|---|
| `create({ height(x, z), half: 256, res: 0.5, far: 4096, biome(x, z, h, slope) → [forest, rock, snowcap] })` | samples the height function into the editable middle (± `half`); `biome` paints the far country |
| `h(x, z)` · `normal(x, z)` · `coverAt(name, x, z)` | read the land |
| `level(x, z, hx, hz, yaw, y?, margin)` · `levelDisc(x, z, r, y?, margin)` | flatten a site (returns its height) — `house()` and friends do this themselves |
| `road(points [[x, z]…], width, { kind: 'dirt' | 'paved', wobble, soft, strength, ease })` | paints a way, keeps grass off it, eases the ground across it |
| `patch(x, z, r, { kind, box: [hx, hz], wobble })` | a square or yard |
| `carve(points [[x, z, waterLevel]…], width, depth, { bank })` | a brook's bed under the given water levels, gravel on its shores |
| `pond(x, z, r, level, depth, { wobble })` | a bowl with a rim; pair it with `LR.water.pond(level, rect)` |
| `apron(x, z, hx, hz, yaw, { width, strength })` · `border(x, z, hx, hz, yaw, { width, flowers, weeds })` | worn earth round a building's foot · a strip outside it where weeds and flowers are left (`house()` does both; `apron: false`, `garden: false` to opt out) |
| `roughen(amp = 0.09, { radius, scale })` | a gentle swell under everything (less under paving): call after the ways, before building |
| `paint(name, fn(x, z, index) → 0..1, mode: 'set' | 'max' | 'min' | 'mul')` | cover maps at 0.5 m: `dirt`, `paved`, `litter` (forest floor), `grass` (density), `tall` (blade height), `flowers`, `fern`, `shore` |

The mesh is built for you after `build()` returns: 1 m cells inside ±128 m, 2 m to ±256, 8 m to ±1024, 64 m to ±4096.
The land shader lays turf by one grass-colour law (`LR.chunk.grasscol`, shared with the blades), then leaf litter,
dirt, gravel, cobbles and rock by height-blended masks; far country is forest paint, bare rock and a snow line.

## Water — `LR.water` (lib/55_water.js)
`pond(level, [x0, z0, x1, z1])` · `stream([[x, z, level]…], width, { speed })` · `disc(x, y, z, r)` (basins) ·
`levelAt(x, z)` · `color`, `clarity` (set before the build ends). Still water freezes when the season reaches winter
and the walker can cross it; brooks half-freeze.

## Materials — `LR.mat` (lib/15_materials.js, 16_matlib.js)
`LR.mat.define(name, { glsl, tile, bump, ao, por, pud, stick, moss, metal, pom, paint })` before the bake (top level of a
source file, or `materials(LR)` in `LR.start`).
- `glsl`: `void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal)` — `uv` in 0..1, and the
  result **must tile**: use the periodic helpers `pn(p, per)`, `pn2(uv, vec2 per)`, `pg`, `fbm(uv, freq, oct)`,
  `fbmv`, `ridged`, `vor(uv, vec2 cells, jitter)` (x = distance to the cell's border, y / w = cell ids, z = distance
  to its centre), `bond(uv, vec2 n, shift)` (running bond), `box2`, `S(r, g, b)` (sRGB → linear).
- `tile` metres per repeat · `bump` relief depth in metres (drives the normal) · `por` porosity: how much rain darkens
  it · `pud` holds puddles · `stick` how much snow stays · `moss` how readily moss takes · `metal` · `pom` parallax depth (m; walked in eight
  layers on `high`) · `paint: 1` the tint given where the thing is built colours only what stands above height 0.45, so
  a painted material writes its bare wood low and grey and any paint colour flakes correctly (`boards`).
- Stock: `plaster timber planks boards rubble ashlar brick cobble dirt turf litter gravel rock moss slate tiles thatch
  bark birch pinebark barkoak barksmooth barkpine iron cloth glass snow waves`. `boards` and `cloth` are pale so a
  tint is the paint. See them with `?view=mats`. The engine carries 48.

## Scanned surfaces — `LR.mat.photo` (lib/15_materials.js) · `references/ASSETS.md`
`LR.mat.photo(name, id, { tile, gain, tint, rough, normal, aoK, pom, por, pud, stick, moss, paint })` inside
`materials(LR)` of `LR.start`: the scan `id` (named in `assets.json`, fetched by `fetch-assets.mjs`) takes the place of
the stock material `name`, at the scan's real size; whatever is not given is inherited from the recipe it replaces. A
`name` that does not exist yet becomes a new material. If the scan is not in the manifest, or its maps do not arrive
within `?scanwait=40` seconds, the recipe is drawn instead (`LR.mat.missed` lists them; `check.mjs` fails on it).
The scan's height is centred on its own mean and laid where the recipes keep theirs (most of a surface high, creases
low), so moss, flaking paint, puddles and `pom` read it as they read a recipe. `?scan=0` skips every scan.

## Scanned objects and plants — `LR.models` (lib/47_models.js) · `references/ASSETS.md`
- `await LR.models.load([id | { id, …options }])` inside `materials(LR)` (which may be `async`). On the live page it
  returns at once — the models are known from their measured boxes and drawn when they arrive; stills wait for them.
  Options: `plant` (cut-out, wind, season, light through leaves), `tree` (a whole tree: wood solid and swaying,
  foliage as leaves, seven levels — `fall`, `leafGain`, `leafTint`), `wind`, `trans`, `turn`, `shadow: 'hull' | 'mesh'
  | 'none'`, `far`, `lod: [d0, d1, d2]`, `lodK`, `px`, `gain`, `tint`, `rough`, `normal`, `metal`, `moss`,
  `detail: '<material>'` (+ `detailTile`, `detailReach`, `detailColor`, `detailRelief`). A model marked `"heavy"` in
  `assets.json` is not loaded on a phone, on `low` or in safe mode (`LR.models.heavy()`, `LR.models.skipped`).
- `LR.models.place(id | 'id#k', x, z, { h | scale, yaw, pitch, roll, sink, y, tint, lie, solid: false | factor |
  'box', trunk: metres, base: false })` in `build` → `true`, or `false` when the model is not in the manifest or was
  left out (so `place(…) || P.log(…)` keeps the place whole without scans). `y` puts it on a table top; `lie` lays a
  long thing on its side; `trunk` is the circle that stops the walker at a tree; `base: false` keeps the model's own
  zero at `y` instead of standing it on its lowest point.
- `LR.models.arrange(id, [k, …], x, z, { yaw, scale, y, about: [mx, mz] })` — several objects of a set, standing to
  each other as the file has them (a pier's sections, a kit laid out by its author); (x, z) is where their middle
  goes, or the model's own point `about`. `LR.models.swing(id, k, x, z, { yaw, scale, y, open })` — one leaf of a
  door or gate where `arrange(…, { about: [0, 0] })` would put it, turned about its outer edge by `open` radians.
- `LR.models.scatter({ ids, density(x, z) → 0..1, spacing, area: [x0, z0, x1, z1], seed, scale: [lo, hi], sink, tilt,
  tintVar, avoid(x, z) })` → how many it placed. What it strews gets a short reach.
- `LR.models.stand('barrel' | 'crate' | 'stump' | 'rock', id | [ids], { min, h, max })`: the kit's prop of that name
  — the builders' and `A.dress`'s too — draws the scan (`min`: rocks at least that big). `{ generated: true }` on a
  prop keeps that copy generated.
- `LR.models.set(name, [{ id, s: [lo, hi], … }])` — kits other code looks for: `'goods:fruit'` / `'goods:bread'` /
  `'goods:greens'` / `'goods:pots'` (`A.stall({ goods })`: `n` a tray, `tumble`, `rise`, or `big: true` to stand
  alone on the counter), `'yard'` (`A.dress`: `sink`, `lean`, `spin: false`, `solid`), `'weeds'` (`A.dress`).
- Read-outs: `LR.models.by` (copies per model), `LR.models.live` (`.lod` distances, `.tri` triangles by level),
  `LR.render.info.scans` (`inst`, `tris`, `calls`, `shadowTris` this frame), `LR.models.failed`, `.due` / `.arrived`,
  `.skipped` (heavy ones left out).
- `LR.lods.tree(part, 'leaf' | 'wood', MeshoptSimplifier)` (lib/46_lods.js) is what makes a tree's levels;
  `LR.lods.LEAF` / `LR.lods.WOOD` are its tables (share kept, share of their triangles, error allowed, a ceiling).

## Leaf atlases — `LR.atlas` (lib/46_atlas.js)
- `await LR.atlas.load(['<id>:<map>', '<cut-out model id>'])` in `materials(LR)`; `LR.atlas.has(key)`.
- `LR.flora.defs.<species>.leaf.scan = { atlas, parts: [[u0, v0, u1, v1, turn]], kind: 'leaves' (default) | 'spray',
  cut: '<outline>' ('oak' | 'ovate' | 'birch' | 'lance'), size, fill, own, gain }` before the trees are built;
  `LR.grass.scan = { frond: [key, part], leaf: [key, part], frondStretch, leafStretch }`.
- A pine's `leaf.scan` parts are tufts hung on its painted twigs; a species without `scan`, or whose atlas did not
  load, keeps its painted spray.

## Geometry — `LR.Geo` (lib/30_geo.js)
`const g = new LR.Geo()` then:
- `g.mat(name, { tint: '#rrggbb' (a multiplier: white leaves the material as it is), flags, seed, weight, ao, soft, scale, uv: false keeps the texture offset })`
- `g.at(x, y, z, yaw, pitch, roll)` … `g.pop()` — a transform stack; write in the local frame.
- `g.poly(points, { u, v, n, ao, hint, two })` (convex, counter-clockwise from outside; `hint` flips it to face that
  way; `two` both sides) · `g.quad(a, b, c, d)` · `g.box(cx, cy, cz, sx, sy, sz, { skip: '+y-y', soft, grain, ao })` ·
  `g.beam(a, b, w, h, { up, caps, soft })` · `g.tube(points, radius | radii, { sides, caps })` · `g.cyl` ·
  `g.lathe(cx, cz, profile [[r, y]…], { sides })` · `g.blob(cx, cy, cz, r, { squash, amp, seed, flat })` · `g.merge(other)`.
- `g.aoFn = (x, y, z, wx, wy, wz) => 0..1` shades vertices as they are written (dark at the foot of walls).
- Flags (`LR.FLAG`): `WINDOW` (lit from inside at night; `seed` decides which windows), `GLOW` (lamp glass), `FIRE`
  (always glowing, flickers), `SWAY` (moves with the wind by `weight`), `NOWEATHER`.
- `LR.world.add(g, { name, double, kinetic, shadow, topo })` draws it, makes it cast shadow, and puts it in the rain
  map. `kinetic: true` returns a mesh whose matrix you may move (`LR.arch.spin(mesh, axis, radPerSec, windShare)`).

## The world — `LR.world`
`solidBox(x, z, hx, hz, yaw)` · `solidCircle(x, z, r)` · `floors.push({ x, z, hx, hz, yaw, c, s, h(lx, lz) })` (decks) ·
`light({ x, y, z, r, power, color, kind: 'lamp' | 'fire', flicker, glow })` (lamps come on at dusk; fires burn always) ·
`smokers.push({ x, y, z, amount })` · `fires.push({ x, y, z, size })` · `sounds.push({ x, y, z, kind, r, gain })` with
kind `stream fountain fire forge mill waterwheel bell chimes frogs` · `places.push({ x, z, r, name, sub })` ·
`fireflyAreas = [{ x, z, r }]` · `spawn = { x, z, yaw° }` · `radius` (how far the walker may go).

## Buildings — `LR.arch` (lib/40_arch.js, 42_buildings.js)
Parts, written in a wall's frame (x along the wall, y up, z out) or a building's frame:
- `A.side(g, '+z' | '-z' | '+x' | '-x', w, d, y, out, fn(len))` runs `fn` in the frame of one side of a w × d box.
- `A.wall(g, len, h, items, { style: 'timber' | 'stone' | 'boards', mat, tint, timberTint, bay, brace, skipCorners })`
  with `items: [{ type: 'window' | 'door', at, w, h, y, arch, point, shutters, box, seed }]` — half-timber walls frame
  each bay and brace the blank ones; stone walls get dressed quoins.
- `A.window(g, cx, cy, { w, h, depth, frame: 'timber' | 'ashlar', shutters: '#hex', box, arch, point })` · `A.door(g, cx, { w, h, arch, frame, tint })` ·
  `A.lantern(g, x, y)` · `A.lamp(g, x, y, z)`.
- `A.gableRoof(g, w, d, y, { pitch, mat: 'tiles' | 'slate' | 'thatch', tint, eave, verge, thick, sag, rafters, gables: 'timber' | 'stone' | 'boards' })`
  → `{ ridgeY, tan }` · `A.chimney(g, x, z, y0, y1, { smoke })` · `A.dormer(g, x, d, yEave, tan, side)`.

Whole buildings (each levels its site, adds itself to the world, registers its solids, lights, smoke and sounds):
- `A.house({ x, z, yaw, w, d, floors, floorH, plinth, ground: 'stone' | 'timber' | 'boards', upper, jetty, roof: { mat, pitch, tint, eave }, plaster, timber, shutters, stone, door: { side, at, w, tint }, windows: { '+z': share … }, chimneys: [[fx, fz, smoke]], dormers, boxes, seed })`
  → `{ y, w, d, top, door: [x, z], toW(lx, lz) }`
- `A.smithy(o)` (a house plus an open shed with hearth, anvil, trough) · `A.chapel({ x, z, yaw, w, d, h, tower, towerH, spire })` ·
  `A.windmill({ x, z, yaw, r, h, sail })` · `A.waterWheel(x, y, z, yaw, { r, width, speed })` ·
  `A.palisade(points, { h, r })` · `A.gate({ x, z, yaw, gap, banner })` → `{ ends }` ·
  `A.bridge(a, b, { width, rise, span })` (registers a deck) · `A.well(o)` · `A.fountain({ x, z, r })` · `A.stall({ x, z, yaw, goods: 'fruit' | 'bread' | 'cloth' | 'pots' | 'greens', colors })`.

**A building the kit does not have** is written the same way these are: a function in the project that makes an
`LR.Geo`, calls `LR.land.level`, uses `A.side` + `A.wall` for walls (or `g.poly` / `g.box` directly), a roof of its
own from `g.poly` strips (see `gableRoof` (ridge tiles and uneven tile ends at eaves and verges by default; `ragged: false` for a clean edge) for thickness, soffit and ridge), then `LR.world.add` and `solidBox`.

## Props — `LR.props` (lib/45_props.js)
`barrel crate sack haystack woodpile bench cart lampPost rock rocks log stump signpost trough tombstone scarecrow pot`
take `(x, z, { yaw, scale, y, … })`; `fence(points, { kind: 'rail' | 'wattle' | 'picket' })`, `stoneWall(points)`,
`bunting(a, b, { washing, colors, lights, bare })` (`lights`: a bulb between flags, lit when the lamps are; `bare`: the
line and its bulbs only), `planter(x, z, { len, yaw, bloom })`, `pot(x, z, { size, bloom })`, and `hangSign(x, y, z, yaw, { shape: P.SHAPES.mug | anvil | loaf | key | [[x, y]…] })`
take world points; `pier(a, b, y)` registers a deck. A prop of your own: `const g = LR.props.g(x, z)` gives the batch
for that part of the world — write into it.

## Trees — `LR.flora` (lib/50_flora.js, 51_flora_species.js)
- `species(name, def)` — a tree from numbers; every field is listed at the top of `51_flora_species.js` (`kind`,
  `height`, `bark`, `trunk`, `levels` of branching, `crown`, `leaf` spray and colours for summer and autumn, `wind`,
  `lod1`, `evergreen`). Stock: `oak beech birch spruce pine bush`.
- `plant(name, x, z, { scale, yaw, variant, hero })` · `scatter({ species: [[name, weight]…], density(x, z), area, spacing, seed, avoid(x, z), scale })` ·
  `far({ density, inner, outer, spacing, species })` (billboards only). The app calls `build()` after the realm's build.
- Trunks register solids; leaves turn with `season`, fall by winter (twigs stay), carry snow; three levels of detail.

## Crown cover — `LR.canopy` (lib/72_canopy.js)
Built by itself from the planted trees: a 1 m map of how much of the sky the crowns hide. `LR.canopy.shade` (0.56: how
much sky light a closed canopy takes), `LR.canopy.mist` (1: the woods' own haze; 0 for dry woods), `LR.canopy.at(x, z)`.
Plant woods with a density that varies so the sun has gaps to come through.

## Ground cover — `LR.grass` (lib/52_grass.js)
Reads the land's cover maps: `grass` density, `tall` height, `flowers`, `fern`. `LR.grass.flowers = [{ color, center,
size, height, share, petals }…]` (up to four kinds, growing in drifts), `LR.grass.opts = { density, height,
flowerDensity, fernDensity, fernSize }`, `LR.grass.enabled = false` for none.

## Weather and the hour — `LR.wx` (lib/25_weather.js)
`LR.wx.looks.clear | rain | snow | winter | autumn = { cloud, dark, rain, snowfall, season, wind, fog, fogH, turb }` may be
edited or added to; `LR.wx.round` is the automatic round (a list of `{ t, tod, weather }`); `LR.wx.flow` is how fast
the hour runs by itself. `LR.sky.lat` sets the latitude. The look is four numbers on the state: `LR.wx.key` (how
bright the meter keeps the picture, 0.15), `punch` (contrast, 1.2), `colour` (1.27), `fill` (how much sky fills the
shade, 0.85), `bounce` (the screen-space bounce, 1.3; 0 switches it off), `shafts` (rays toward the sun, 1), and `LR.sky.skyGain` (the sky's brightness against the sun's, 0.62) — a ruin at noon may want less fill, a
snowfield less punch. Everything else follows from the state.

## The walk and the glass
`LR.start({ tour: [{ x, z, look: [x, z], pull: 0..1, pitch }] })` — a closed loop walked at 1.55 m/s; `look` is what
that stretch is about (`pull` 0 looks down the way, 1 at `look`). The way is a smooth curve through the points, so it
cuts corners: check it with `check.mjs --walk` (the walk map) and see it with `render.mjs --tour 12`. Pass a
landmark at the distance where the whole of it is in frame; do not walk up to its door and turn round. `views` name the stills. `strings` replaces any of `LR.hud.t` (see `examples/village/src/15_words.js`
for a full Korean set). `LR.player.walk / run / eye / radius` are the walker's numbers.

The walker is a first-person eye (no body is drawn) that stands on the land, on bridges, piers and the frozen pond,
and cannot pass walls, trunks, fences, placed scans or deep water. Input, all at once and none required:
| | walk | look | run · hop |
|---|---|---|---|
| keyboard + mouse | W A S D / ↑ ↓ | drag, or click to capture the pointer; Q E / ← → turn | Shift · Space |
| touch | left half of the screen is a stick that appears under the thumb | drag on the right half | push the stick to its rim |
| gamepad | left stick | right stick | a trigger or a pressed left stick · the bottom face button |
**The lens** (`LR.render.lens`, lib/75_post.js): on the tour what the middle of the picture shows is sharp and what
is nearer or farther goes soft — a depth of field between the lit picture and the temporal resolve. `amount` (0.026:
the blur of what is infinitely far is 0.26 % of the picture's height with the focus at 10 m), `max` (the largest
radius, 1.3 % of the height), `tour` / `walk` (how much each way of looking gets; `L` switches `walk`), `?dof=` scales
it, `?off=dof` and the `low` tier have none. A still asks for it: `shot({ dof: 1, focus: 3.5 })` — `focus` in metres,
else the middle of the picture. The near side is held back to six tenths: a walk is not a macro shot.

Walking input ends the tour; looking only pauses its head for a few seconds. A visible character would be a body that
moves — a rig, clips and the repository's motion rules (`references/MOTION-QUALITY.md`) — and is not part of this skill.
