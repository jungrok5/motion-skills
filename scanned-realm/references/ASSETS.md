# ASSETS — choosing scans, fitting them, shipping them

What this skill adds to the engine is two things read from files: **scanned surfaces** (photographed materials) and
**scanned objects** (photogrammetry models). Everything else — land, buildings, trees, grass, sky, weather, sound — is
still built by code. This note is how to pick the files for a topic, make them sit in the picture, and ship the page.

## What a scan is here
- **A surface** is four 1k JPEGs from one photographed patch: colour (`diff`), normal (`nor`, OpenGL), occlusion ·
  roughness · metal in one (`arm`) and height (`disp`). At load they are re-baked into the engine's two texture arrays
  **in the place of the generated material of the same name** — so every wall, roof and prop that says `'rubble'` is now
  that photographed wall, at its real size (the tile comes from the scan's measured dimensions), and still takes rain,
  puddles, moss, snow, grime and the relief march like any other layer.
- **An object** is a glTF: its maps become one material layer each, its triangles are written into batches of the
  world (one per 48 m cell). After that it is ordinary world geometry: lit, rained on, bounced off, bumped into,
  with an eight-sided hull to throw its shadow.
- **Where they come from:** [Poly Haven](https://polyhaven.com) — every asset CC0, measured sizes and triangle counts
  from an API, no key. `fetch-assets.mjs` only knows that source. A scan from elsewhere can be used if its licence
  allows it: put the files under `assets/` and add its entry to `assets/manifest.json` by hand (same fields), and write
  its licence and author into `assets/CREDITS.md`.

## The files
```
my-realm/assets.json      { "res": "1k", "textures": ["cobblestone_floor_04", …], "models": ["wine_barrel_01", …] }
node scanned-realm/scripts/fetch-assets.mjs my-realm [--res 2k] [--force]
my-realm/assets/tex/<id>/{diff,nor,arm,disp}.jpg · assets/models/<id>/… · assets/manifest.json · assets/CREDITS.md
```
`manifest.json` holds what the page needs (files, real size, the address of every file on Poly Haven's server);
`build.mjs` inlines it. `assets/` is never committed to this repository (`.gitignore`); run the fetch after cloning.
A project of your own may commit it — CC0 allows that — and should keep `CREDITS.md` with it.

## Choosing surfaces
1. **List what the place is made of** from the brief's building tradition — not from the example. Usually: paving, wall
   stone, dressed stone (quoins, sills), plaster or daub, the roof, structural timber, boards, brick (chimneys), the
   earth of the paths, the floor of the woods, gravel, rock, bark.
2. **Find two or three candidates each.** `curl https://api.polyhaven.com/assets?t=textures` lists every id with its
   categories and tags; `…/info/<id>` gives `dimensions` (mm) and the authors. Names lie about use: read the tags.
3. **Try them on the sheet, then on a wall.** `render.mjs my-realm --mats` shows every layer lit by a
   raking light; then one still at arm's length and one from across the square. Judge, in this order:
   - *what it reads as* from five metres (a beam scan that reads as masonry is wrong however good it is);
   - *direction*: roof courses must run across, plank grain along the board — a scan cannot be turned per wall;
   - *tone*: photographed albedo is often brighter than the generated recipe it replaces. Bring it to the picture with
     `gain` (0.6–1.2) before touching the light; check `check.mjs`'s day numbers (mean luma 0.40–0.46);
   - *repetition*: a 1.5 m patch repeats twenty times across a square. The engine's stains, damp and relaid patches
     hide a lot; a scan with one loud stone does not hide. Prefer patches ≥ 1.5 m and even ones for big areas;
   - *relief*: give `pom` (0.01–0.05 m) only to what has real depth (cobbles, rubble, roof tiles). The height map
     is used either way: centred on its own mean, it is what tells moss, flaking paint and puddles where the
     creases are.
4. **Leave generated what a scan does worse:** hay and thatch on small props (a roof scan on a haystack goes dark), cloth,
   glass, iron fittings, snow, turf under the grass blades, leaves. A material that is not named in `materials` simply
   stays its recipe.

`LR.mat.photo(name, id, options)` — `name` is the stock material it replaces (or a new one); options:

| option | what | usual |
|---|---|---|
| `tile` | metres one repeat covers | from the scan; override when the scan's patch is not what you want repeated |
| `gain` · `tint: [r, g, b]` | brightness and colour of the albedo | 0.6–1.2 |
| `rough` | added to the scan's roughness | −0.1 … 0.1 |
| `normal` | strength of the scan's normal map | 1 |
| `aoK` | how much of the scan's own occlusion is kept | 1 |
| `pom` | depth of the relief march in metres | 0 for flat things |
| `por` `pud` `stick` `moss` `paint` | how it takes water, puddles, snow, moss, wall paint | inherited from the recipe it replaces |

## Choosing objects
- Ask for `polycount` and `dimensions` first (`…/info/<id>`): a pebble scanned at 15 000 triangles is not a boulder,
  and a 200 000-triangle root cluster is one hero piece, not a scatter.
- **Opaque only.** Materials with cut-out or blended alpha (leaves, grass, glass) are skipped by the reader: scanned
  plants and trees cannot be used yet (`references/LOOK.md`, limits).
- The model's **origin is the ground**: scanned rocks, stumps and fire pits come part buried, which is what seats them.
- **A set is several objects.** `rock_moss_set_01` is six rocks laid out side by side: place `'rock_moss_set_01#3'`,
  never the whole set — and know that a set shares one texture between its objects.
- **A model's maps become one layer of the material array** (512–1024 px by tier, whatever the files' size): plenty
  for a barrel or a bucket, thin for anything metres across seen from a step away. A big scanned rock is better
  replaced by the kit's generated rock wearing a scanned rock *surface*, which tiles at full sharpness.
- **Stand-ins.** `LR.models.stand('barrel', 'wine_barrel_01')` makes every `P.barrel()` in the kit — the ones the
  builders and `A.dress` place too — draw the scan; `'crate'`, `'stump'` and `'rock'` likewise. A copy that would not
  fit the triangle budget is drawn generated, so the place is whole either way.
- **Budget.** Every copy is real triangles: 0.6 / 1.2 / 2.0 / 3.0 M on low / medium / high / ultra
  (`LR.models.budget`). Stand-ins stop at 70 % of it (`LR.models.share`) so the objects you place by name still fit.
  Rocks under `min` stay generated (a blob wearing the scanned rock surface is fine at that size); rocks under `full`
  use the lightest third of the scans given. `check.mjs` prints copies and triangles per object, says how many
  stand-ins fell back on its tier, and warns when an object placed by name did not fit.
- **A scan is drawn once.** Its shadow is thrown by an eight-sided hull fitted to its box, not by its own ten thousand
  triangles in each of three cascades — so the shadow of a barrel is the shadow of a prism, which nobody sees, and a
  thing with a hole in it (a ladder, a wheel) would throw a solid shadow: such things should stay generated.
- **There is no lighter copy.** Merging vertices on a grid was tried and wrecks a scan's texture — merged vertices
  average coordinates from different islands of its atlas: barrels came out with torn hoops. Fewer copies, or a
  lighter model, are the only honest levers.

## What the two realms here use (tried, with what was changed)
| for | scan | note |
|---|---|---|
| paving | `cobblestone_floor_04` | `pom 0.035`, `gain 0.6` — pale as it comes: the square at noon measured 0.59 against 0.55 generated |
| wall stone · well · plinths | `rustic_stone_wall` | `pom 0.05` |
| quoins, sills | `white_sandstone_blocks_02` | `gain 0.82` — too bright and busy as it comes |
| plaster | `white_rough_plaster` | wall paint still tints it |
| roofs | `clay_roof_tiles_02` · `roof_slates_02` · `reed_roof_03` | courses run the right way |
| boards, doors, stalls | `weathered_brown_planks` | `gain 1.2` — dark as it comes |
| beams, posts | `rough_wood` | `gain 0.75`, `tile 1.2`; `medieval_wood` was tried first and read as stone blocks |
| chimneys | `medieval_red_brick` | |
| paths · woods · shore | `stony_dirt_path` · `leaves_forest_ground` · `gravel_floor_02` | `tile` 3.0 and 2.4 on the first two |
| rock · bark | `mossy_rock` · `bark_brown_02` | the same bark on oaks, logs and stumps |
| starter | `raw_plank_wall` (walls, `gain 0.8`), `wood_planks_grey` (shutters, door), `thatch_roof_angled` (`gain 1.25`), `stacked_stone_wall`, `forest_ground_04`, `brown_mud_dry`, `river_small_rocks`, `rock_pitted_mossy`, `pine_bark` (trunks, logs) | a second list for a second place; `brown_mud_leaves_01` was tried for the yard and laid a moss-green carpet over it |

| object | triangles | size | used as |
|---|---|---|---|
| `wine_barrel_01` | 10 820 | 0.74 × 0.87 m | stand-in for `barrel` |
| `wooden_crate_02` | 5 176 | 0.52 × 0.44 × 1.16 m | stand-in for `crate` |
| `tree_stump_01` | 41 046 | 1.4 m across | stand-in for `stump` (named ones; scattered ones stay generated) |
| `dead_tree_trunk` | 101 802 | 3 m | one fallen trunk in the glade |
| `stone_fire_pit` | 3 887 | 1.45 m | the glade; the starter's camp fire |
| `wooden_bucket_01` | 5 116 | 0.35 m | by the well, the smithy, the farm |

Tried and dropped: `Barrel_01` (an oil drum — its maps are named "explosive"), `rock_07` / `rock_09` (pebbles of
20 cm at 12 000–15 000 triangles), `wooden_lantern_01` (its glass is blended), `planter_pot_clay` (the kit's pots carry
their plants), and **`rock_moss_set_01`** — six 2 m rocks that share one texture: a third of a 1k map each, and that
map re-baked into one 768 px layer, so at arm's length they were smooth tan lumps. The kit's generated rock wearing
the scanned `mossy_rock` surface is sharper, and that is what both realms use.

## Weight
| | surfaces | objects | the page loads |
|---|---|---|---|
| `examples/village` | 15 (60 files) 40.0 MB | 6 · 16.8 MB | **57 MB** besides a 1.2 MB html |
| `starter` | 9 (36 files) 25.8 MB | 3 · 7.4 MB | **33 MB** |

Poly Haven's smallest size is 1k, and the baker's layers are 512–1024 px, so 1k is the right size; `--res 2k` only
pays on `ultra` (`?mat=1024`) and quadruples the download. The maps are fetched four layers ahead of the baker and
freed after their layer, so memory holds a handful at a time.

## Shipping the page
- **A folder** — `index.html` + `assets/` on any static host (`python3 -m http.server` to look at it). A browser
  will not read textures from `file://`; the render and check scripts open it with that allowed.
- **One file that reads from Poly Haven** — `build.mjs my-realm --cdn [--out file.html]`: the same page with the
  addresses of the files on `dl.polyhaven.org` (it answers any origin). Poly Haven's API terms (read 2026-11-16,
  <https://github.com/Poly-Haven/Public-API/blob/master/ToS.md>): free for any use including commercial; requests must
  be identifiable (a browser sends the page's address as Referer); **a page that reads from their server must say
  where the content comes from** — the HUD's line "Scanned surfaces and objects: Poly Haven · CC0" is that, keep it;
  no uptime is promised. So the page does not depend on it: a map that has not arrived after `?scanwait=40` seconds
  leaves that layer to its generated recipe, an object that fails leaves the generated prop. For a page with real
  traffic, host the files yourself (CC0) rather than lean on a commons.
- **It asks before it downloads** where that matters: inside another page's frame, on a phone, or with data saving
  on, the page waits behind a button that states the size ("Load the scans and start · ≈ 57 MB · from Poly Haven")
  with a link to open without scans; `?go=1` skips the wait. Opened on its own on a desktop it starts at once.
- `?scan=0` opens the same realm from its generated recipes only — for comparing, and for a slow line.
- **Credits.** CC0 asks for none; give them anyway: `assets/CREDITS.md` lists every scan with its author and page.
