# KIT — every builder and its options

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
| `paint(name, fn(x, z, index) → 0..1, mode: 'set' | 'max' | 'min' | 'mul')` | cover maps at 0.5 m: `dirt`, `paved`, `litter` (forest floor), `grass` (density), `tall` (blade height), `flowers`, `fern`, `shore` |

The mesh is built for you after `build()` returns: 1 m cells inside ±128 m, 2 m to ±256, 8 m to ±1024, 64 m to ±4096.
The land shader lays turf by one grass-colour law (`LR.chunk.grasscol`, shared with the blades), then leaf litter,
dirt, gravel, cobbles and rock by height-blended masks; far country is forest paint, bare rock and a snow line.

## Water — `LR.water` (lib/55_water.js)
`pond(level, [x0, z0, x1, z1])` · `stream([[x, z, level]…], width, { speed })` · `disc(x, y, z, r)` (basins) ·
`levelAt(x, z)` · `color`, `clarity` (set before the build ends). Still water freezes when the season reaches winter
and the walker can cross it; brooks half-freeze.

## Materials — `LR.mat` (lib/15_materials.js, 16_matlib.js)
`LR.mat.define(name, { glsl, tile, bump, ao, por, pud, stick, moss, metal, pom })` before the bake (top level of a
source file, or `materials(LR)` in `LR.start`).
- `glsl`: `void surf(vec2 uv, out vec3 col, out float h, out float rough, out float metal)` — `uv` in 0..1, and the
  result **must tile**: use the periodic helpers `pn(p, per)`, `pn2(uv, vec2 per)`, `pg`, `fbm(uv, freq, oct)`,
  `fbmv`, `ridged`, `vor(uv, vec2 cells, jitter)` (x = distance to the cell's border, y / w = cell ids, z = distance
  to its centre), `bond(uv, vec2 n, shift)` (running bond), `box2`, `S(r, g, b)` (sRGB → linear).
- `tile` metres per repeat · `bump` relief depth in metres (drives the normal) · `por` porosity: how much rain darkens
  it · `pud` holds puddles · `stick` how much snow stays · `moss` how readily moss takes · `metal` · `pom` parallax depth.
- Stock: `plaster timber planks boards rubble ashlar brick cobble dirt turf litter gravel rock moss slate tiles thatch
  bark birch pinebark barkoak barksmooth barkpine iron cloth glass snow waves`. `boards` and `cloth` are pale so a
  tint is the paint. See them with `?view=mats`. The engine carries 48.

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
own from `g.poly` strips (see `gableRoof` for thickness, soffit and ridge), then `LR.world.add` and `solidBox`.

## Props — `LR.props` (lib/45_props.js)
`barrel crate sack haystack woodpile bench cart lampPost rock rocks log stump signpost trough tombstone scarecrow pot`
take `(x, z, { yaw, scale, y, … })`; `fence(points, { kind: 'rail' | 'wattle' | 'picket' })`, `stoneWall(points)`,
`bunting(a, b, { washing, colors })` and `hangSign(x, y, z, yaw, { shape: P.SHAPES.mug | anvil | loaf | key | [[x, y]…] })`
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
the hour runs by itself. `LR.sky.lat` sets the latitude. Everything else follows from the state.

## The walk and the glass
`LR.start({ tour: [{ x, z, look: [x, z], pull: 0..1, pitch }] })` — a closed loop walked at 1.55 m/s; `look` is what
that stretch is about. `views` name the stills. `strings` replaces any of `LR.hud.t` (see `examples/village/src/15_words.js`
for a full Korean set). `LR.player.walk / run / eye / radius` are the walker's numbers.
