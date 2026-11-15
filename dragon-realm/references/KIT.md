# KIT — every builder and its options

All builders live on `DR`. Units are metres, y up; colours are `'#hex'` (converted to linear) unless noted. Everything
is built once at load and is a pure function of `t` afterwards. Each file's header comment is the full reference; this
page is the map.

## Light and weather — `DR.light(looks, timeline)` (`lib/20_sky.js`)
A look is an object; missing fields take the defaults (`DEF`). `timeline = [[t, 'name', ease?], …]` blends between them.
| field | meaning |
|---|---|
| `sun: [az, el]`, `moon: [az, el]` | bearings in degrees (0 = +z, 90 = +x) and heights; where the discs stand |
| `key: 'sun' \| 'moon'`, `keyDir: [az, el]`, `keyCol`, `keyK` | which body casts the shadows (or a film light from `keyDir`), its colour × strength |
| `sunCol`, `sunK`, `sunSize`, `sunDisc`, `sunDiscK`, `moonCol`, `moonK`, `moonSize`, `stars` | the discs and the glow round the sun |
| `zen`, `hor`, `gnd`, `warm`, `skyK`, `amb` | sky at the zenith / horizon, the ground's bounce, a warm band toward the sun, fill strength |
| `air`, `mist`, `mistBase`, `mistH`, `fogCol` | thin air per metre; valley mist per metre at its base, its base height and scale height, its tint |
| `haze: [base, top, density, scale]` | marched wisps of mist between two heights |
| `cloud: [base, top, scale, density]`, `cover`, `cloudDark`, `cloudDetail`, `cloudSpeed`, `shadowK` | the cloud deck, how much sky it covers, storm darkness, drift, how dark its shadows are |
| `wind: [x, z, strength]`, `rain`, `wet`, `rainbow` | wind bends plants, drives ripples, rain and cloud drift; `wet` darkens and glosses surfaces |
| `exposure`, `bloom`, `rays`, `vignette`, `grade: { lift, gain, sat, contrast }` | the finish |
Hooks a film may set: `DR.weather.rift = (t) → [x, z, radius, open]` (a tear in the deck that lets light through),
`DR.weather.flash = (t) → [x, y, z, k]` (lightning: use `DR.fx.flashAt`), `DR.weather.glow = (t) → [x, y, z, k]`
(a point glow), `DR.camKick = (t) → strength` (a shudder of the lens).

## Materials — `DR.mat(opts)` (`lib/05_glsl.js`)
A three.js built-in (`base: 'standard' | 'lambert' | 'basic'`) with the shared light, air and wetness, and hooks:
`vHead`/`vBody` (may move `drPos`, `drNrm`), `fHead`/`fBody` (may set `diffuseColor`, `roughnessFactor`,
`metalnessFactor`, world normal `N`, `drAO`, `drSun`, `drEmit`, `drThrough`), `alpha` (cut-outs, shared with the shadow
pass), `depth: true` + `DR.shadowed(mesh)` when the vertex stage moves things, `defines: { DR_WET: 1 }`.
GLSL helpers: `drN4(uv)` (tiling noise: two fbms, value noise, cell distance), `drWindAt(pos, looseness)`,
`drSkyBase(dir)`, `drCloudSun(pos)`, `drAerial(colour, pos)`; uniforms `uTime uKeyDir uKeyCol uWind uWet uPx uGlow uFlash`.

## Land — `lib/30_land.js`
- `DR.land.terrain({ size, center, res, height(x,z), focus: { at, power }, waterY, cover(x,z,h,ny) → [rock, grass, shore], palette, forestNear, forestFar })`
  → `{ mesh, heightAt, normalAt, scatter({ count, seed, bounds, minDist, filter(x,z,h,ny,rng) → 0..1 }) }`. Far slopes
  carry their forest as paint (three canopy colours); near ones want real plants.
- `DR.land.peak({ at: [x, yFoot, z], height, radius, profile: [[v, r], …], lobes, lean, squash, amp, col, bed, flute, nu, nv, seed })`
  → `{ geometry, sites: [{ p, n, v, r }], top }`. `profile` is the silhouette (apron, walls, crown); `col`/`bed` the
  joint spacing; `amp` the relief. Build a massif as one main peak with lower ones round it; build each twice
  (`nu`, `nv` halved) and show the fine one only near the lens.
- `DR.land.rockMat(palette, { waterY })` — jointed, stained, mossed rock; vertex colour = cavity, moss, age.

## Water — `lib/35_water.js`
- `DR.water({ level, bounds, height(x,z), palette: { shallow, deep, scatter, foam } })` → `{ mesh, ring(t0, x, z, strength, life, speed, r0), wake(posAt, t0, t1, step, strength, life) }`.
  A shot with `mirror: false` skips the mirror view; objects with `userData.noMirror` are left out of it.
- `DR.falls({ lip: [x,y,z], dir: [x,z], width, drop, speed, sheets })` → `{ mesh, foot }`.

## Plants — `DR.flora` (`lib/40_flora.js`)
`atlas` (sprays painted with Canvas 2D into a data texture), `ramp`, `bark`, `skeleton`, `foliage`, `species({ name,
variants, atlas, build, leaf, bark, wood, lod })`, `tufts(...)` for ground cover. `species.plant(scene, sites, { near(p)
→ metres to the nearest lens position, lodBias, cluster, shadow })`; `species.stats`. Sites are
`{ p, s, r, seed, n, tint, variant }` — from `terrain.scatter` or a massif's `sites`. See the header of the file and
`examples/cheongryong/src/20_flora.js` (pine, cliff pine, maple, oak, plume grass, turf, fern, shrub, reed).

## Buildings — `DR.arch` (`lib/45_arch.js`)
`materials({ pattern: glsl, lamp, events })` (timber / stone / tile / paper / metal; `pattern` paints ornament from each
member's metres), `writer()` (box, beam, lathe, extrude, sweep, tube, lattice, stairs, blockWall, railing, pivot for
things that hang), `roof(W, { … })` (curved tiled roofs: hip, hip-and-gable, gable, pyramid; rise curve, corner lift,
plan flare, double eaves, ridges), `slabRoof`, `eaveAO`, `swing`, `audit`. See
`examples/cheongryong/src/30_hanok.js` (pavilion, kiosk, pagoda, stone lantern, bird poles, wall, bridge).

## Creature — `lib/60_creature.js`, `lib/62_dragon.js`
`DR.creature({ name, length, radius, rings, sides, profile, rail: { points, keys }, wave, scale, palette, state(t), castTime, limits })`
→ `C` with `group`, `headAt(t)`, `bodyAt(t, a)`, `speedAt(t)`, `strips(items, colours)`, `ride(obj, a, fn)`,
`partMat(...)`, `LIM`. `DR.dragon(C, { headScale, head, antlers, legs, hair, hairColors, hornColor, iris, iris2 })`
→ `{ head, antlers, whiskers, legs, point(x, y, z) (head-space → world), mouthWorld() }`. See `CREATURE.md`.

## Effects — `DR.fx` (`lib/70_fx.js`)
- `sprites({ count, seed, kind: 'puff' | 'drop' | 'spark' | 'leaf', init(i, rng) → { p, v, t0, life, size, grow, a, col, spin }, gravity, drag, wind, cover, lit, bright, stretch, soft, loop })`
- `rain({ count, box, speed })` (driven by the look's `rain`), `bolt({ t0, from, to, seed, k, width, forks })`,
  `glow({ at(t) → [x,y,z,size,k], color })`, `beam({ at(t) → { a, b, width, k }, color })`, `splash({ t0, at, power })`.
Events along a moving body: compute each particle's birth place from `C.bodyAt(t0, a)` in `init` — it is a table, not a simulation.

## Sound — `DR.score(fn(K, B, o), { beats, bar, beat, duration, master })` (`lib/85_audio.js`)
`fn` is self-contained (it runs in a worker). Groups and automation first (`K.group`, `K.duck`, `K.gap`), then buses
(`K.bus(name, { group, gain, pan, rev, dly })`), then notes: `K.flute` / `K.bowed` (lines with glides, late vibrato,
breath), `K.pluck`, `K.drum`, `K.janggu`, `K.gong`, `K.bell`, `K.chimes`, `K.choir`, `K.strings`, `K.drone`, `K.sub`,
`K.glass`; effects `K.bed`, `K.wind`, `K.rain`, `K.thunder`, `K.splash`, `K.roar`, `K.whoosh`, `K.spray`, `K.shimmer`.
`master: { lufs, reverb: 'valley' | 'hall' | 'room' | 'cave', delay, tilt }`. `node scripts/score.mjs <film> --stems`.

## Film — `DR.film({ title, duration, fps, far, near, build({ scene, fx, cam }), shots, ground(x,z), fade(t) })`
`DR.rail([[u, position, target, fov, roll], …], ease)` makes a camera move through keys (a position or target may be a
function of `t`). A shot may also give `cam: (u, t) => ({ p, l, fov, roll })`. `shadow: { span, at }` sizes the shadow
map round a point (small = sharp). `fade(t) → [r, g, b, amount]` for whites and blacks.
