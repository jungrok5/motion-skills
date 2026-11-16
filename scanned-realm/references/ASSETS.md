# ASSETS — choosing scans, fitting them, shipping them

What this skill adds to the engine is read from files: **scanned surfaces** (photographed materials), **scanned
objects and plants** (photogrammetry models, drawn instanced with levels of detail), **whole scanned trees** and
**kits of scanned structures** (the same models, with what a tree and a wall need), and **foliage atlases**
(photographed leaves, twigs and fronds that the engine's own trees and ground cover are painted from). Land, houses,
the forest's trees, grass blades, sky, weather and sound are still built by code. This note is how to pick the
files for a topic, make them sit in the picture, and ship the page.

## Where scans may come from (read 2026-11-16)
| library | licence | can a public page or a fetch script use it? |
|---|---|---|
| **[Poly Haven](https://polyhaven.com)** | CC0, every asset | **yes** — an API with no key, files served to any origin; `fetch-assets.mjs` knows only this one |
| ambientCG | CC0 | yes in law; downloads are zips, single maps come from a preview host with no written hot-link policy — host them yourself |
| **Quixel Megascans** (on Fab) | free since late 2026, under the *Fab Standard Licence* | **no.** The licence allows use in any engine and in what you ship, but forbids handing the raw files on standalone or leaving them extractable (a web page serves them in the clear), and Fab's terms forbid scripted download; an account is required. Stills and video *rendered* with Megascans are fine — a page that serves them is not |
| ShareTextures, cgbookcase, 3dtextures | CC0 or CC0-like | by hand only (no API): download, put under `assets/`, write the entry and the credit yourself |
| Sketchfab | per model | downloads need a token; licences differ model by model — read each |

A scan from elsewhere can be used if its licence allows redistribution: put the files under `assets/`, add its entry
to `assets/manifest.json` by hand (same fields) and its author and licence to `assets/CREDITS.md`.

## The files
```
my-realm/assets.json
  { "res": "1k",
    "textures": ["cobblestone_floor_04", { "id": "pine_bark", "maps": "dna" }, …],
    "models":   ["wine_barrel_01", { "id": "fern_02", "maps": "d" }, { "id": "rock_face_01", "res": "2k" },
                 { "id": "island_tree_02", "maps": "dn", "heavy": true }, …],
    "atlases":  [{ "id": "island_tree_02", "map": "leaves" }, { "id": "fir_tree_01", "map": "twig" }] }
node scanned-realm/scripts/fetch-assets.mjs my-realm [--res 2k] [--force]
my-realm/assets/tex/<id>/… · assets/models/<id>/… · assets/atlas/<id>_<map>_{diff,alpha}.jpg · assets/manifest.json · assets/CREDITS.md
```
- `maps` says which maps to fetch: **d** colour, **n** normal, **a** occlusion-roughness-metal, **h** height
  (surfaces only). Default all. Height is what the relief march and the crease logic read — bark and cloth do without
  (`"dna"`); a plant, a tool or a loaf does with colour alone (`"d"`), furniture with `"dn"`. A plant's cut-out map is
  fetched whatever you ask — the model's one `Alpha` map, and a tree's `leaves_alpha` / `twigs_alpha`, which belong to
  the material whose colour map carries the same name.
- `"heavy": true` marks a model of tens of megabytes (a whole tree). The page loads heavy models last and **leaves
  them out on a phone, on the `low` tier and in safe mode** (`?heavy=1 | 0` decides by hand); the button a framed
  page waits behind states the megabytes that device will really fetch. `check.mjs` warns about a model over 15 MB
  that is not marked.
- `manifest.json` holds what the page needs: files, real sizes, every file's address on Poly Haven's server, and
  **each model's measured boxes** (so the page can place a model before its triangles have arrived). `build.mjs`
  inlines it. `assets/` is never committed to this repository; run the fetch after cloning.

## Surfaces
A surface is three or four 1k JPEGs from one photographed patch. At load they are re-baked into the engine's two
texture arrays **in the place of the generated material of the same name** — every wall, roof and prop that says
`'rubble'` is now that wall at its real size, and still takes rain, puddles, moss, snow, grime and the relief march.

1. **List what the place is made of** from the brief's building tradition: paving, wall stone, dressed stone,
   plaster, roofs, timber, boards, brick, the earth of the paths, the floor of the woods, gravel, rock — **and the
   bark of each kind of tree** (a generated bark beside scanned ground reads as a drawing).
2. **Find two or three candidates each**: `curl https://api.polyhaven.com/assets?t=textures` (ids, categories, tags);
   `…/info/<id>` gives `dimensions` (mm). Thumbnails: `https://cdn.polyhaven.com/asset_img/thumbs/<id>.png?width=256`.
3. **Try them on the sheet, then on a wall**: `render.mjs my-realm --mats`, then one still at arm's length and one
   from across the square. Judge what it *reads as* from five metres, its direction (roof courses across, grain along
   the board), its tone (`gain` 0.6–1.2; `check.mjs` day numbers 0.40–0.46), its repetition, its relief (`pom` only
   for what has depth).
4. **Leave generated what a scan does worse**: thatch on small props, cloth, glass, iron fittings, snow, turf under
   the blades.

`LR.mat.photo(name, id, options)` — `name` is the stock material it replaces, or a new one:

| option | what | usual |
|---|---|---|
| `tile` | metres one repeat covers | from the scan |
| `gain` · `tint: [r, g, b]` | brightness and colour | 0.6–1.2 |
| `rough` · `normal` · `aoK` | roughness offset, normal strength, how much of the scan's occlusion | 0 · 1 · 1 |
| `pom` | depth of the relief march, metres | 0 for flat things |
| `por` `pud` `stick` `moss` `paint` | how it takes water, puddles, snow, moss, paint | from the material it replaces |
| `like: 'barkpine'` | a **new** name starts from that material's recipe and numbers — and *is* that material when the scans are not there | — |

## Objects
An object is a glTF. Its maps are re-baked into two textures of its own in the engine's encoding (about 600 texels a
metre, never larger than the files), its triangles are drawn **instanced**: one draw call a level of detail for all
its copies, chosen each frame.

- **Triangles come from the file, not the catalogue.** The library's `polycount` is of another version of the model
  (`grass_medium_01` is listed at 1.6 M and is 24 730 in its glTF). `fetch-assets.mjs` prints the real number.
- **Levels of detail are made at load** (meshoptimizer's edge collapse, which keeps texture seams together): about
  26 %, 6.5 % and — for dense scans — 1.6 % of the triangles. Each level is used **while its triangles are about two
  pixels wide** on a 1080-line screen: `584 × size / √triangles` metres. A 66 000-triangle boulder 2.4 m across is
  drawn whole only within 5 m, at a quarter to 11 m, at a fifteenth to 21 m and at 1 000 triangles beyond; a
  950-triangle table never changes. `lod: [d0, d1, d2]` or `lodK` overrides.
- **Reach**: a solid thing is drawn to `320 × its size` (an apple to 45 m, a barrel to 300 m), fading out by a dither
  over the last fifth; `far` overrides. Tiers scale every distance (0.6 / 0.8 / 1 / 1.3).
- **Shadows**: a small solid thing throws an eight-sided hull's (`shadow: 'hull'`), a big or open one its lowest
  level's (`'mesh'`), goods on a counter none (`'none'`).
- **Where its origin is**: a rock, a stump or a fire pit is modelled part buried and keeps that; a thing modelled
  about its middle (a tool, a lemon, a shield) is stood on its lowest point. `sink` pushes either further in.
- **A set is several objects**: `'fern_02#2'`, `'hamburger_buns#0'` — place the members, not the row they were laid
  out in. An object in several parts (a bucket and its handles, a table and its cloth) is placed by its plain id.
- **A rock face is one side of a cliff** (an open shell): from behind you look into it. Stand two back to back, or
  set its back into a slope.
- **Big scans need grain**: a 7 m rock face at 1k has 150 texels a metre. `detail: 'rock'` lays one of the engine's
  tiling materials over it near the eye (triplanar — its light and dark over the scan's colour, its normal over the
  scan's), fading out by `detailReach` (14 m). This is why big rocks can now be scans and stay sharp at arm's length.
- **Options per model** (in `MD.load`): `plant`, `tree`, `wind`, `trans` (light through leaves), `turn` (how much the
  season turns it), `fall` (how much of a tree's foliage winter sheds), `leafGain` / `leafTint` (a tree's foliage
  apart from its bark), `shadow`, `far`, `lod`, `lodK`, `px` (map size), `gain`, `tint`, `rough`, `normal`, `metal`
  (the whole object's metalness: the engine keeps none per texel), `moss`, `detail`, `detailTile`, `detailReach`.

```js
await MD.load(['wine_barrel_01', { id: 'boulder_01', detail: 'rock', moss: 0.9 }, { id: 'brass_pot_01', metal: 0.85 },
  { id: 'food_apple_01', shadow: 'none' }, { id: 'fern_02', plant: true }]);
MD.stand('barrel', 'wine_barrel_01');             // every P.barrel() of the kit — the builders' too — draws the scan
MD.stand('rock', 'boulder_01', { min: 0.8 });     // rocks of that size and up; smaller ones stay generated
MD.place('gothic_statue', x, z, { yaw, scale | h, sink, pitch, roll, lie, y, tint, solid: false | factor | 'box' });
MD.scatter({ ids: ['fern_02#0', 'fern_02#1'], density: (x, z) => …, spacing, scale: [lo, hi], seed, avoid });
MD.set('goods:fruit', [{ id: 'food_apple_01', s: [0.8, 1.05], n: 9 }]);   // A.stall({ goods: 'fruit' }) lays them on its counter
MD.set('yard',  [{ id: 'wooden_bucket_02', s: [0.7, 0.9] }, { id: 'rusted_spade_01', s: [1, 1.1], sink: 0.17, lean: 0.1 }]);   // A.dress() stands them by walls
MD.set('weeds', [{ id: 'nettle_plant#0', s: [2.2, 3.4] }]);                // A.dress() grows them at the foot of walls
```
A kit is used only where its scans are loaded; without them the stall has its generated trays, the wall its bare foot.

## Plants
A scanned plant is a bundle of **cards**: flat pieces carrying a photograph, cut out by a second map that is **not in
the glTF** (Poly Haven keeps it beside: `Alpha` / `opacity`). `fetch-assets.mjs` fetches it; a model that has one is
drawn cut-out — tested with a dither and with coverage kept in the small copies, moved by the wind from its foot,
lit through its leaves, turned by the season, laid low by deep winter.

- Plants come as sets: place members (`'nettle_plant#0'`), and look at each member's triangles — `dandelion_01#0` is
  23 000, `#2` is 2 300.
- Levels: first fewer triangles a card, then fewer cards (the stems stay). The same two-pixel rule, sooner
  (`350 × size / √triangles`), and gone at 16–45 m: beyond that the engine's own grass and fern layers carry the ground.
- Scatter them where they grow — ferns under trees, docks and dandelions on the ragged edge of a way, nettles at the
  foot of a wall, celandine at the wood's edge — by cover and noise, never evenly. Scans a few metres from the eye are
  what make a forest floor read as photographed; a carpet of them costs a million triangles and adds nothing.

## Whole trees
A tree model is a trunk, thousands of twigs, and tens of thousands of leaves or needle sprays, each a little piece of
mesh of its own, with the foliage cut out by a map beside the glTF (`leaves_alpha`, `twigs_alpha`). Measured in the
files, not the catalogue (read 2026-11-16):

| model | triangles | download | usable in a page? |
|---|---|---|---|
| `fir_tree_01` · `pine_tree_01` | 6.98 M · 17.2 M | 465 MB · 914 MB | no — take their twig atlases instead |
| `jacaranda_tree` · `pine_sapling_medium` | 3.86 M · 6.04 M | 205 MB · 255 MB | no |
| `island_tree_01` · `island_tree_03` · `tree_small_02` | 1.6 M · 2.1 M · 2.1 M | 63 · 81 · 96 MB | too heavy for what they add |
| **`island_tree_02`** (a gnarled thorn, 3.4 m: place it at 1.3–1.6 ×) | 1.07 M | 44.6 MB | **yes**, a handful |
| **`fir_sapling`** · **`pine_sapling_small`** (three young trees each, 0.7–1.3 m) | 433 k · 398 k | 22.8 · 19.1 MB | **yes** |
| **`searsia_lucida`** (seven evergreen shrubs, 0.7–2.3 m) | 377 k | 18.6 MB | **yes** |
| `fir_sapling_medium` | 1.53 M | 74 MB | no |

```js
await MD.load([{ id: 'island_tree_02', tree: true, fall: 0.9, leafGain: 1.45, leafTint: [0.96, 1, 0.8] },
  { id: 'fir_sapling', tree: true, turn: 0 }]);                                  // turn: 0 — an evergreen keeps its colour
MD.place('island_tree_02', x, z, { scale: 1.4, yaw, trunk: 0.32 }) || LR.flora.plant('beech', x, z, { scale: 0.8 });
MD.scatter({ ids: ['fir_sapling#0', 'fir_sapling#1', 'fir_sapling#2'], density: (x, z) => …, scale: [1.1, 2.3] });
```
- `tree: true` draws the model's **wood** as a solid thing (bark, moss, snow, the weather) that sways with the gusts,
  and whatever has a cut-out map as **leaves**: cut out, lit through, trembling each on its own, darker inside the
  crown than at its skin (every vertex is told how deep in its tree's box it is), turning gold and russet in autumn
  (`turn`) and shed in clumps in winter (`fall`; the shadow sheds with it).
- **Levels of detail cannot be edge collapse**: the pieces do not touch. `lib/46_lods.js` makes seven when the model
  arrives — leaves dropped by a fixed lottery (each level a subset of the one before) and the ones left enlarged about
  their own middles so the crown keeps its cover; twigs dropped thinnest first (by their share of the surface); what
  is kept simplified within itself; wood of a few triangles not drawn at all. `island_tree_02`: 1.07 M → 498 k →
  124 k → 44 k → 17 k → 5.8 k → 2.0 k triangles, kept to 5 / 14 / 30 / 60 / 110 / 190 m (times the tier's reach);
  a sapling or a shrub (under 4.5 m) takes five of the seven — 157 k → 71 k → 21 k → 2.8 k → 0.3 k — at about a
  third of those distances. Making them takes about two seconds for the big tree, a part at a time between frames.
- **They are heavy**: mark them `"heavy"`, name them last in `MD.load` (they then arrive last), place few whole
  trees (seven in the village) and always as `place(…) || F.plant(…)`, because a phone will not have them.
- A set of saplings is three trees in a row: place the members (`'fir_sapling#0'`). Parts of a tree that wear the
  same maps (a shrub's leaves and twigs off one atlas) are joined into one at load: half the draw calls.
- `trunk: metres` is what stops the walker (a tree's box is its crown); keep other trees out from under it yourself
  (the village keeps a list of where they stand).
- Out in the light a sapling is a young tree; under a closed canopy it is a dark stick. Put them at the wood's edge,
  in clearings, by walls.

## Structures — kits
Poly Haven has no houses. What it has are **kits**: `modular_fort_01` (22 pieces: walls 2.5 m and 4.2 m thick and
8.6 m high with battlements, a gate, corners, ends, walkways, stairs, a round tower 15.8 m across — 28 000 triangles
and 10.6 MB for all of it), `modular_wooden_pier` (deck sections on poles, a ramp, a hoist frame, loose planks and
poles — 85 000 triangles), and doors and gates in several parts (`large_castle_door`, `large_iron_gate`).

```js
await MD.load([{ id: 'modular_fort_01', moss: 0.85, detail: 'rock', detailTile: 2.4, detailReach: 24 }, 'modular_wooden_pier']);
MD.place('modular_fort_01#12', x, z, { yaw: Math.PI / 2, y, solid: false });       // one piece, about its own middle
MD.arrange('modular_wooden_pier', [4, 3, 2, 5, 1, 0], x, z, { yaw, scale: 0.8, about: [0.05, z0], y });   // pieces as the file has them
MD.swing('large_castle_door', 1, x, z, { scale: 1.8, y, open: 1.6 });              // a leaf, turned on its hinge
```
- **Look at every piece from above before placing one** (a few lines that plot the glTF's vertices are enough): its
  size, which way it runs, **which face is its outside** (the fort's walls: −x), where its ends are open. Then set
  the plan out in the kit's own frame and turn pieces by quarter turns.
- A kit's pieces **tile** (their UVs run far past 0–1): the maps are repeated where they do, and `detail: 'rock'`
  gives a wall grain near the eye that a 1k map over metres of masonry does not have.
- A piece of a kit lies **tens of metres from its file's origin**. The engine places it about its own middle, and
  culls it and chooses its level by that middle (`references/LESSONS.md`: a tower that was there from one side only).
- `arrange` keeps the pieces as their author set them (a pier's sections butt as they should); `about` is the model's
  own point that lands on (x, z). Pieces are **not** stood on their lowest points there (`base: false`): a pier's
  poles go below its zero by different amounts.
- **The walker**: give every wall a `LR.world.solidBox`, leave the gate's opening out, give a deck a floor
  (`LR.world.floors.push({ x, z, hx, hz, yaw, c, s, h: () => deckY })`). Sink the pieces a hand's breadth so uneven
  ground does not show under them; let weeds grow along the foot.
- **Open ends**: a wall piece is a shell, open where the next piece joins. End a run in a tower, a corner or a rock,
  never in the air.
- A door can be the leaves of a bigger gate: `scale` it to the arch and `swing` the leaves open.

## Foliage atlases — photographed leaves on generated trees
A whole tree is 0.4–17 million triangles (above); its leaves are two small pictures. Name them under `"atlases"` and
only those are fetched. The engine's trees are still grown from numbers; their leaf sprays, and the
fern fronds and broad leaves of the ground cover, are **painted from the photographs**:

```js
await LR.atlas.load(['island_tree_02:leaves', 'fir_tree_01:twig', 'fern_02']);      // a cut-out model's own maps work too (its id)
LR.flora.defs.beech.leaf.scan  = { atlas: 'island_tree_02:leaves', parts: [[u0, v0, u1, v1, turn], …], size: 1.5, own: 0.3 };
LR.flora.defs.oak.leaf.scan    = { atlas: 'island_tree_02:leaves', parts: […], cut: 'oak' };          // the photograph seen through a generated outline
LR.flora.defs.spruce.leaf.scan = { atlas: 'fir_tree_01:twig', kind: 'spray', parts: […] };             // a whole photographed spray fills the card
LR.grass.scan = { frond: ['fern_02', part], leaf: ['weed_plant_02', part] };
```
- A **part** is a box in the picture (0..1, origin top left) and where its base is (`turn` 0 bottom, 1 left, 2 top,
  3 right). Find the boxes by looking at the atlas with its cut-out applied; only the largest connected piece inside a
  box is kept, so a neighbour's corner does not come along. Atlases of game trees are sometimes flat-shaded drawings —
  look before you use one (`tree_small_02` is).
- `own` is how much of the photograph's own hue is kept against the species' palette (0.3–0.5); `size` and `fill`
  set how big and how many the leaves are in the spray. **Leave gaps**: a spray that is all leaf makes a card that is
  all green, and a crown of such cards reads as cabbage. Each leaf shades the ones under it in the atlas.
- There is no photographed leaf of every species: an outline the engine draws (`cut: 'oak'`) can be cut out of any
  pinnately veined leaf.

## What the two realms here use
`examples/village` — 18 surfaces, 58 models, 3 atlases:

| for | scan | note |
|---|---|---|
| paving | `cobblestone_floor_04` | `pom 0.035`, `gain 0.6` |
| wall stone · well · plinths | `rustic_stone_wall` | `pom 0.05` |
| quoins, sills | `white_sandstone_blocks_02` | `gain 0.82` |
| plaster | `white_rough_plaster` | wall paint still tints it |
| roofs | `clay_roof_tiles_02` · `roof_slates_02` · `reed_roof_03` | |
| boards, doors, stalls · beams | `weathered_brown_planks` (`gain 1.2`) · `rough_wood` (`gain 0.75`, `tile 1.2`) | |
| chimneys | `medieval_red_brick` | |
| paths · woods · shore · rock | `stony_dirt_path` · `leaves_forest_ground` · `gravel_floor_02` · `mossy_rock` | |
| bark: oak · beech and bushes · pine · spruce | `bark_brown_02` · `chinese_hackberry_bark` · `pine_bark` · `knotted_pine_bark` (`like: 'barkpine'`) | no height map |
| leaves | `island_tree_02:leaves` (oak through an oak outline, beech, bushes) · `shrub_03` (birch, climbers) · `fir_tree_01:twig` (spruce) · `pine_tree_01:twig` (pine) · `fern_02`, `weed_plant_02` (ground cover) | |
| rocks | `boulder_01` (stand-in for rocks ≥ 0.8), `rock_face_01` + `rock_face_02` back to back as tors | `detail: 'rock'` |
| stand-ins | `wine_barrel_01`, `wooden_crate_02`, `tree_stump_01` | |
| the market | goods on the counters: `food_apple_01`, `lemon`, `croissant`, `hamburger_buns#k`, `ceramic_pot`, `brass_pot_01`, `metal_jug` (`yellow_onion` and `sweet_potato` are in baskets at the farm: no stall sells greens here); tables `WoodenTable_01`, `painted_wooden_table`; `wicker_basket_01/02`, `wooden_crate_01`, `planter_box_01` | goods throw no shadow |
| set pieces | `dining_table` and `painted_wooden_stool` at the inn, `small_wooden_table_01` with `cross_pein_hammer` and `hatchet` and a `kite_shield` at the smithy, `wooden_ladder_02`, `picke_dirty_01`, `wooden_axe`, `rusted_spade_01`, `watering_can_metal_01` at the farm, `painted_wooden_bench` by the pond, `spinning_wheel_01` at the cottage door, `gothic_statue` in the chapel yard, `stone_fire_pit`, `dead_tree_trunk`, `wooden_bucket_01/02` | |
| plants | `fern_02`, `weed_plant_02`, `nettle_plant`, `shrub_03`, `dandelion_01`, `periwinkle_plant`, `flower_ursinia`, `flower_empodium`, `grass_medium_02`, `celandine_01`, `dry_branches_medium_01` | `maps: "d"` |
| whole trees | `island_tree_02` (seven old thorns: chapel yard, pond, fort, farm, meadow, mill hill), `fir_sapling` and `pine_sapling_small` (about 160 young trees at the wood's edge and in groves), `searsia_lucida` (about 100 shrubs at the feet of walls and fences, and round the fort) | `heavy`, `tree: true` |
| structures | `modular_fort_01` (the old fort beyond the meadow: eleven pieces — gate, five walls, three corners, the round tower), `large_castle_door` (its gate leaves, at 1.8 ×, open), `modular_wooden_pier` (the pond's pier: three deck sections, the hoist frame, loose planks and poles, at 0.8 ×), `large_iron_gate` (the churchyard gate, one leaf open) | `detail: 'rock'` on the fort |

`starter` — a second, different list: `raw_plank_wall` (`gain 0.8`), `wood_planks_grey`, `thatch_roof_angled`
(`gain 1.25`), `stacked_stone_wall`, `forest_ground_04`, `brown_mud_dry`, `river_small_rocks`, `rock_pitted_mossy`,
`pine_bark`; `wine_barrel_01`, `tree_stump_01`, `stone_fire_pit`, `boulder_01` (every rock of 0.5 and up),
`fern_02` (strewn under the trees); the twigs of `fir_tree_01` and `pine_tree_01` on its spruces and pines.

Tried and dropped: `Barrel_01` (an oil drum), `rock_07` / `rock_09` (pebbles at 12 000–15 000 triangles),
`wooden_lantern_01` (blended glass), `rock_moss_set_01/02` (six rocks sharing one map), `mountainside` (153 000
triangles and 7 MB for one cliff), `moss_01` and `grass_bermuda_01` (tufts of a few centimetres, meant to be scattered
by the hundred thousand), `tree_small_02`'s leaves (a drawing), `jug_01` (printed tulips), `CheeseBox_01` (a printed
brand), the Namaqualand boulders (desert granite), `brown_mud_leaves_01` (a moss-green carpet), `medieval_wood`
(read as stone blocks); the big trees in the table above; the quiver trees and `othonna_cerarioides` (desert plants);
the library's other structures (a modern alley: fire escapes, dumpsters, roller doors); the pier's ramp (it climbs
2.4 m: the pond's bank is a step high).

## Weight, and how the page starts
| | surfaces | models + atlases | the page loads |
|---|---|---|---|
| `examples/village` | 18 · 50 MB | 58 + 3 · 204 MB (105 MB of it the four heavy ones) | **254 MB** besides a 1.4 MB html — **149 MB** on a phone or on `low` |
| `starter` | 9 · 25 MB | 5 + 2 · 15 MB | **41 MB** |

That is a lot to wait for, so **the live page does not wait** (streaming): every surface is baked from its generated
recipe at once, every model is placed from its measured box, the walk begins — and each scan takes its layer, each
model appears, as its files arrive, a few at a time; the credit line counts them in. Only the foliage atlases (a few
megabytes) are waited for, because the trees are painted from them. Stills, films and `check.mjs` wait for everything
(`?render=1`); `?stream=0` makes the live page wait too. A model that never arrives leaves nothing where it was placed
(a console warning says which) — `check.mjs` fails on it.

- **It asks before it downloads** where that matters: inside another page's frame, on a phone, or with data saving
  on, the page waits behind a button that states the size, with a link to open without scans; `?go=1` skips it.
- `?scan=0` opens the same realm from its generated recipes only — for comparing, and for a slow line.
- Poly Haven's smallest size is 1k, and nothing is baked larger than its files, so 1k is the right size; `--res 2k`
  quadruples the download for a gain only big scans show.

## Shipping the page
- **A folder** — `index.html` + `assets/` on any static host. A browser will not read textures from `file://`; the
  render and check scripts open it with that allowed.
- **One file that reads from Poly Haven** — `build.mjs my-realm --cdn [--out file.html]`. Poly Haven's API terms
  (<https://github.com/Poly-Haven/Public-API/blob/master/ToS.md>): free for any use; **a page that reads from their
  server must say where the content comes from** — the HUD's line "Scanned surfaces and objects: Poly Haven · CC0" is
  that, keep it; no uptime is promised. For a page with real traffic, host the files yourself (CC0).
- **Credits.** CC0 asks for none; give them anyway: `assets/CREDITS.md` lists every scan with its author and page.
