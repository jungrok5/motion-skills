---
name: scanned-realm
description: Make a place you can walk through in the browser in a game-engine look — an MMORPG town, a harbour, a mountain shrine, a camp, a ruin — with photo-scanned surfaces, objects, plants and leaves instead of generated ones. It is the living-realm engine with its conditions lifted - the page may read files. The paving, wall stone, plaster, roofs, timber, paths, forest floor, rock and bark a place is made of are photographed PBR materials at their real size; its barrels, tables, baskets, pots, tools, market goods, boulders and rock faces are photogrammetry models drawn instanced with levels of detail made at load (meshoptimizer) and chosen by how wide their triangles are on screen; its ferns, nettles, docks and flowers are scanned cut-out plants that move in the wind and turn with the season; and the leaves on its generated trees are painted from photographed leaf and twig atlases - all CC0 from Poly Haven, fetched by a script from a list in the realm (assets.json), put through the engine's own renderer so every scan takes the same sun and shadows, rain, puddles, moss and snow. Land, buildings, the trees' wood, grass, sky, weather, light and sound are still built by code - a deferred WebGL 2 renderer (cascaded shadows that widen with distance, contact shadows, ambient occlusion, a bounce of light off what is on screen, mirrors on wet ground and water, fog with sun shafts, temporal anti-aliasing that upsamples, bloom, an AgX grade), the hour running from dawn through night, rain and winter as smooth changes, keyboard, mouse, touch or gamepad to walk and look, an automatic tour, four quality tiers, a per-pass GPU timer. The walk starts on the generated place and the scans arrive while you walk (41–126 MB); a realm is a folder - index.html plus assets/ - or one html that reads the scans from Poly Haven's server with the credit shown. Megascans cannot be served from a public page (Fab licence) - the skill says so and uses CC0 scans. Give it a topic (a place, a culture, an hour) and it writes a brief, designs the land, the buildings from parts, the list of scans that place is made of, the plants, the walk and the words, checks that every scan arrived and baked, that the realm can be walked and reads in every state, and renders stills, a contact sheet or a film of the tour. Use when asked for a walkable 3D village or game zone with realistic scanned textures, models or foliage, "use real assets this time", "lift the no-asset rule", an Unreal-like or AAA look in a web page, Poly Haven or photogrammetry assets in a web 3D scene, a higher-fidelity version of a living-realm place ("스캔 텍스처로 마을 만들어줘", "에셋 써서 더 사실적으로", "포토스캔 재질", "실사 텍스처 3D 마을", "조건 풀고 고퀄로", "언리얼 느낌으로 걸어 다니는 마을", "AAA 게임 느낌", "메가스캔 같은 애셋", "폴리헤이븐 에셋", "PBR 스캔 재질", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "walkable village with scanned assets", "photoscanned textures", "photogrammetry props", "scanned foliage", "PBR scanned materials in three.js", "Poly Haven CC0 assets", "realistic game environment in the browser"). Source — made from https://x.com/RezAIT00/status/2120498246426706176?a=CUYTAAEWhBIL6PS4ZPk&s=19 and https://claude.ai/artifact/D8t6NHbpDJXtCovZU6KADP and https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp with scans from https://polyhaven.com
---

# scanned-realm

A place you walk through, in the look of a current game engine, whose **surfaces, objects, ground plants and
leaves are scans**: photographed materials, photogrammetry models drawn instanced with levels of detail, cut-out
plants, and leaf atlases that the generated trees are painted from (Poly Haven, CC0) — put through the same renderer,
weather and walk as everything the code builds. three.js r170 is inlined as a thin WebGL 2 layer; a realm is a folder of small source
files plus a list of scans (`assets.json`); `fetch-assets.mjs` downloads them, `build.mjs` joins the sources with the
engine into `index.html`, which reads the scans from `assets/` beside it — or, built with `--cdn`, from Poly Haven's
server. The page opens on a slow tour while the hour and the weather go round; the first key, touch or stick hands you
the walk (W A S D and the mouse, two thumbs on a phone, a gamepad). The walk starts at once on the generated place;
the scans arrive in it over the next seconds.

It is the engine of this repository's `living-realm` (one HTML file, no assets, everything generated) **with that
condition lifted**, made when the owner asked for a separate skill that may use assets. The look both aim at is the
post by Rez (@RezAIT00) on X — <https://x.com/RezAIT00/status/2120498246426706176?a=CUYTAAEWhBIL6PS4ZPk&s=19> — a clip
of an Unreal Engine forest and meadow; two more references given to raise the first engine's tone,
「Larkhollow」 by @lucian__03 (<https://claude.ai/artifact/D8t6NHbpDJXtCovZU6KADP>) and 「Saltline」
(<https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp>), are carried in its look numbers. None of their code or assets
is here; the scans are from <https://polyhaven.com> and are **not committed** — each realm lists its own and fetches
them (`references/SOURCE.md`, `references/ASSETS.md`).
Built and proven on `examples/village` 「은여울 마을」 (Silverford: the same village as living-realm's, now with 18
scanned surfaces, 50 scanned models and 3 leaf atlases — a square with a market of scanned goods, an inn, a smithy, a
chapel, a mill on the brook, a stone bridge to a flower meadow, a farm, a pond, tors of bedrock in the woods; 300 m
across). `starter/` (Tarn Cabin: a forester's cabin by a mountain
lake, with a second, different list of scans) is a second, unrelated topic.

**Fixed by the skill (the style)**
- Scans go **through the engine**, never beside it: a scanned surface is re-baked into a material layer (it takes the
  shared rain, puddles, moss, snow, grime and relief); a scanned object or plant is drawn by the engine's own surface
  law from two maps of its own — instanced, with levels of detail, shadowed, rained and snowed on, bumped into; a leaf
  atlas is painted into the trees' own leaf texture. No second material system, no loader scene graph.
- **Cost follows the screen**: a model's level is the one whose triangles are about two pixels wide; a plant is gone
  at 16–45 m; strewn clutter does not reach across the valley. A view pays 0.1–0.3 M triangles for all its scans.
- **The walk does not wait for the download**: recipes first, scans as they arrive; stills and checks wait for all.
- A surface has a generated twin (its recipe), and so have the kit's barrel, crate, stump and rock; `?scan=0` shows
  the place with no scans. `check.mjs` fails when a named scan is missing or baked empty.
- CC0 scans listed per realm (`assets.json`), fetched by script, credited (`assets/CREDITS.md`, a line on the glass);
  `assets/` is never committed here.
- The frame, the state and the walk of the engine: G-buffer → cascaded sun/moon shadows → ambient occlusion → fog
  marched through the shadows → a bounce of light off what is on screen → one lighting pass → water and particles →
  temporal resolve that upsamples → bloom → eye adaptation → AgX and a grade that follows the hour. One state for the
  hour, the season and the weather; nothing switches. W A S D / arrows, Q E or ← → to turn, mouse or touch to look,
  Shift to run; a tour until you take over; a HUD; four quality tiers and a governor. `check.mjs` must pass.

**Designed for every topic (never reused from the example or the starter)**
- The place: whose it is, where and when; its plan, landmarks, ways, water and edges.
- Its building tradition — as new builders made from the kit's parts — and **the list of scans it is made of**: which
  photographed paving, wall, roof, timber and ground belong to this place, at what tone; which objects are scans.
- Its land, its trees and ground cover (species from numbers), its small things.
- What each state shows here: what is lit at night, where puddles gather, what the snow lies on, what freezes.
- The walk (spawn, tour, views), the sounds placed in it, the words on the glass and their language.

## What's in this folder
| path | what |
|---|---|
| `scripts/fetch-assets.mjs` | `assets.json` → `assets/` (maps, models, leaf atlases, `manifest.json` with real sizes, server addresses, triangle counts and every model's measured boxes, `CREDITS.md`) from Poly Haven's API, with `curl`; which maps per asset (`"maps": "d"`) |
| `scripts/build.mjs` | sources + engine + the manifest → `index.html`; `--cdn` makes the page read the scans from Poly Haven's server; `--out file` |
| `scripts/check.mjs` | loads clean · **every scan arrived and baked**, copies per scanned model, the scans' triangles per view, dense scans without levels · the world can be walked (spawn, views, the whole tour) · every state reads · budgets; `--walk` does only the walking part and draws the walk map |
| `scripts/render.mjs` | the material sheet (`--mats`), stills (`--shot`, `--views`), every view in every state (`--sheet`), stills along the tour (`--tour 12`), a film (`--film`) |
| `scripts/new-realm.mjs` | start a realm folder from the starter or `--from village` (with its `assets.json`) |
| `lib/15_materials.js` · `16_matlib.js` | the material baker — a tileable GLSL function **or a scan's four maps** → two texture arrays — `LR.mat.photo`, and the stock recipes (the twins) |
| `lib/47_models.js` | `LR.models`: a small glTF reader, maps re-baked per model, levels of detail (meshoptimizer), instancing and per-frame culling, cut-out plants, `place`, `scatter`, sets (`id#k`), stand-ins for the kit's barrel / crate / stump / rock, kits (`goods:…`, `yard`, `weeds`), streaming |
| `lib/46_atlas.js` | `LR.atlas`: photographed leaf, twig and frond pictures → the trees' leaf sprays (`species.leaf.scan`) and the ground cover (`LR.grass.scan`) |
| `lib/00_core.js` … `lib/90_app.js`, `lib/shell.html`, `vendor/` | the engine: numbers and hooks, shader chunks and weather on a surface, the renderer and tiers, sky, weather state, geometry writer and world, terrain, building parts and builders, props, trees, grass, water, particles, the frame and its post passes, the walker, sound, the HUD, boot · three.js r170 and meshoptimizer's simplifier (both MIT) — `references/KIT.md` lists every builder |
| `starter/` | Tarn Cabin — the smallest realm that uses every part, steps ⓪–⑧ commented, with its own `assets.json` |
| `examples/village/` | 「은여울 마을」 — `BRIEF.md`, `realm.json`, `assets.json`, `src/` (land, words, town, details, plants, start) |
| `references/` | **ASSETS** (choosing scans, fitting them, weights, licence, shipping) · **BRIEF** (topic → brief, the review) · **LOOK** (the ingredients, and where the look stops) · **KIT** (every builder and option) · **PERF** (the frame, the budgets) · **SOURCE** (what this is made from; what lifting the conditions changes) · **LESSONS** |

## Project layout (what you create)
```
my-realm/
  BRIEF.md            written first (references/BRIEF.md) — the plan and the list of scans
  realm.json          { "title", "subtitle", "lang", "bg" }
  assets.json         { "res": "1k", "textures": [ids], "models": [ids | { id, maps }], "atlases": [{ id, map }] }
  src/10_land.js      the height function, water, ways, cover maps; a shared sheet of coordinates
  src/15_words.js     place names and the HUD's strings (any language)       (optional)
  src/20_town.js      buildings — the kit's, and builders of your own from its parts
  src/30_details.js   lamps, stalls, signs, fences, rocks, the scanned objects placed by name, tors and set pieces
  src/40_plants.js    species of your own, named trees, scatter by a woods function, the far forest, flowers, scanned plants by rule
  src/90_main.js      LR.start({ materials (surfaces, models, atlases, kits), build, weather, tour, views, strings })   ← always last
  assets/             fetched (never committed here): tex/<id>/…, models/<id>/…, atlas/…, manifest.json, CREDITS.md
  index.html          built (the realm; needs assets/ beside it, or build with --cdn)
  out/                stills, sheets, film.mp4
```
Sources are plain scripts joined in name order into one module: a later file sees the earlier ones; no import/export.

## Requirements
Node 18+ with Playwright Chromium, `curl`, ffmpeg (sheets and films); network access to `api.polyhaven.com` and
`dl.polyhaven.org` when fetching. No npm install, no keys. The page needs WebGL 2 and wants a real GPU; without one
(CI, containers) stills render on the CPU at 1–4 minutes each. A person looking at a realm serves its folder
(`python3 -m http.server`) — browsers do not read textures from `file://`.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md` and write `BRIEF.md`: the place in one line, its setting, the plan with
   coordinates, what each state shows, what must be made new, **what it is made of** (the surfaces and objects that
   will be scans), the walk, the words. Research what you do not know.
2. **Choose the scans** (`references/ASSETS.md`): for each surface (the barks too) two or three candidates through
   Poly Haven's API (tags, `dimensions`, thumbnails); the objects the place would have lying about — what is sold,
   what is worked with, what the ground throws up — and the plants that grow there; leaf atlases for its trees. Write
   `assets.json` (`maps` per asset keeps the download down); `node scanned-realm/scripts/fetch-assets.mjs my-realm`
   prints each model's real triangles.
3. **Start the folder** (`new-realm.mjs my-realm`) and write `src/10_land.js`; in `src/90_main.js` name the scans in
   `materials` with `LR.mat.photo`. Render the material sheet (`render.mjs my-realm --mats`)
   and judge each scan: what it reads as, its direction, its tone. Swap the wrong ones now.
4. **Land and light first.** With no buildings yet, render stills from three or four spots at noon, at dusk and from
   200 m up: is the plan there, do ways and water read, do the ground scans repeat too visibly?
5. **Buildings.** `LR.arch.house` and the builders where they are right for the topic; otherwise a builder of your own
   from the parts (`references/KIT.md`). Check one building alone at arm's length and from across the square: set
   each scan's `gain` so walls, quoins and roof sit in one tone with the day's numbers (`check.mjs`), give `pom` only
   to what has depth.
6. **Details, objects and plants.** Load the models (`MD.load`, plants with `plant: true`, big rocks with
   `detail: 'rock'`), `stand` them in for the kit's props, set the kits (`goods:<kind>` for stalls, `yard`, `weeds` —
   `A.stall` and `A.dress` use them), place the set pieces by name where the plan has a reason for them, scatter the
   plants by cover and noise. Load the leaf atlases, find the boxes of their leaves, give each species its
   `leaf.scan`. Then lamps, named trees, scatter by the woods function. Look at one tree, one stall and one square
   metre of forest floor at arm's length before looking at the whole.
7. **The walk.** Spawn, tour way-points, 8–12 views, named places, sounds. `check.mjs my-realm --walk` lists every
   stretch of the tour that is inside something and draws `out/walk.png`; `render.mjs my-realm --tour 12 --scale .5`
   shows the walk as its camera looks.
8. **Judge it, then verify.** Put the stills beside the reference (or the brief's own words), list where they fall
   short, worst first — air and light before plants before surfaces — and fix the top of the list. Compare one view
   with `--q "scan=0"`: if the scans did not make it better, the choice or the tone is wrong.
   `node scanned-realm/scripts/check.mjs my-realm` must print `check OK`; then `render.mjs --sheet` and the review in
   `references/BRIEF.md`. Read the check's `scans … × … M tris` per view: a view should pay 0.1–0.3 M for them.
   Open the page from a server on a machine with a GPU and walk it; `?prof=1` shows the milliseconds a pass.
9. **Deliver.** The folder (`index.html` + `assets/`) on any static host, or `build.mjs my-realm --cdn --out realm.html`
   for one file that reads from Poly Haven. Say which, how many megabytes arrive, and where the look stops.

## Rules
- **Design for the topic.** The example's timber houses, clay tiles and beech woods — and its list of scans — belong to
  its brief. A new topic gets its own plan, builders, scans, species and words; reuse the kit's parts, not the designs.
- **Scans through the engine.** A surface comes in with `LR.mat.photo`, an object or a plant with `LR.models`, leaves
  with `LR.atlas`. Do not add a three.js loader, a second material, or a mesh outside `LR.world`: it would not get
  wet, cast the engine's shadows or stop the walker.
- **Licence first.** Poly Haven (CC0) by default. Anything else only when its licence allows the use and
  redistribution intended — written into `assets/CREDITS.md` with author and link. **Not Megascans**: free on Fab, but
  its licence forbids serving the raw files from a public page and fetching them by script (`references/ASSETS.md`).
  Never a ripped game asset.
- **Do not commit `assets/`** to this repository, and never put scans in `docs/`. The samples site reads them from
  Poly Haven's server (`--cdn`) and says so on the page.
- **Keep the credit on the glass** when the page reads from Poly Haven's server (their terms ask a page to say where
  the content comes from); keep `CREDITS.md` with a folder you ship.
- **Every surface keeps its twin.** Replace stock material names, or give a new one `like:` an old one, so a missing
  map still gives a surface; where a set piece matters, place it as `place(…) || generated()`. The page must load and
  be walkable with `?scan=0`.
- **Tone is set per scan** (`gain`, `tint`), never by moving the light to suit one photograph.
- **Count what you load.** The catalogue's triangle count is not the file's; a plant set's members differ tenfold;
  goods on a counter throw no shadow; clutter strewn by a rule gets a short reach. Read `check.mjs`'s per-view
  `scans` and fix what is heavy — a dense scan the simplifier could not reduce is warned about by name.
- **Plants where they grow, with gaps** — and a spray of leaves with gaps in it: a card that is all leaf makes a crown
  that reads as cabbage. No glass or blended materials on scanned objects: the reader skips them.
- **Budget** (`references/PERF.md`): one mesh per building, props through `LR.props.g`, trees through `LR.flora`,
  ground cover through the cover maps, scans through `LR.models`. Keep a view under ~520 draw calls and ~4.2 M
  triangles on `medium` (`check.mjs` warns above that); the scans of a view should be 0.1–0.3 M of it.
- **A page that cannot start says so.** No WebGL 2, or a context lost: a panel in the realm's language (`strings`:
  `noglTitle`, `nogl`, `lostTitle`, `lost`, `again`, `safe`) with what to do — never a stack trace or a blank canvas.
  Do not remove `LR.warm`, `LR.watchContext` or the safe mode; translate their strings.
- **Weather goes through the state**, openings are real, everything opaque is alpha-tested not blended, and the
  walker must be able to walk — the engine's rules (`references/KIT.md`, `references/LESSONS.md`).
- **Say where the look stops** (`references/LOOK.md`): scanned surfaces, objects, plants and leaves on generated land,
  buildings and tree skeletons; no scanned trees or buildings; levels of detail, not Nanite; screen-space light, not
  Lumen; frame rate on real GPUs is whatever you measured (`?prof=1`), or not measured.
- **Never put `out/`, `assets/` or an MP4 in a repository.**

## Contract
- `assets.json`: `{ "res": "1k" | "2k", "textures": [id | { id, maps: "dnah" }], "models": [id | { id, maps: "dna", res }],
  "atlases": [{ id, map: "leaves" | "twig" | … }] }` → `fetch-assets.mjs <realm> [--res] [--force]`.
- `LR.start({ materials(LR) (may be async — scans are named here), build(LR) (may be async), weather: { tod, weather },
  tour: [{ x, z, look: [x, z], pull, pitch }], views: [{ name, cam: [x, z, compass yaw°, pitch°, y?] }], strings })`;
  `window.READY` when the page can draw.
- `LR.mat.photo(name, id, { tile, gain, tint, rough, normal, aoK, pom, por, pud, stick, moss, paint, like })`.
- `await LR.models.load([id | { id, plant, wind, trans, turn, shadow, far, lod, lodK, px, gain, tint, rough, normal,
  metal, moss, detail, detailTile, detailReach }])`; `place(id | 'id#k', x, z, { h | scale, yaw, pitch, roll, sink, y,
  lie, tint, solid })` → boolean; `scatter({ ids, density(x, z), spacing, area, seed, scale, sink, tilt, tintVar,
  avoid })`; `stand('barrel' | 'crate' | 'stump' | 'rock', ids, { min, h, max })`; `set('goods:<kind>' | 'yard' |
  'weeds', [{ id, s: [lo, hi], n, big, sink, lean, … }])`; props take `{ generated: true }` (`references/KIT.md`).
- `await LR.atlas.load([key])` (`'<id>:<map>'` or a cut-out model's id); `LR.flora.defs.<species>.leaf.scan = { atlas,
  parts: [[u0, v0, u1, v1, turn]], kind: 'leaves' | 'spray', cut: 'oak' | …, size, fill, own, gain }`;
  `LR.grass.scan = { frond: [key, part], leaf: [key, part] }`.
- Page options: `?safe=1` (lowest tier, optional passes off: what the page reopens itself in once if its graphics
  context is lost), `?warm=0` (do not prepare the shader programs before the first frame), `?scan=0` (generated recipes only), `?stream=0` (wait for every scan before the walk), `?scanwait=40`
  (seconds before a scan is given up), `?go=1` (do not wait for a press inside a frame or on a phone), `?prof=1`
  (milliseconds a pass), `?pcss=1.4` (how wide the sun is taken to be, degrees), `?q=low|medium|high|ultra`,
  `?scale=`, `?mat=512`, `?off=ao,gi,skyshare,shadow,pcss,contact,mirror,shafts,bloom,taa,grass,fx,water,ssr,audio`,
  `?tod=`, `?wx=clear|rain|snow|winter|autumn`, `?wet=1&puddle=1`, `?tour=0`, `?auto=0`, `?at=x,z,yaw`, `?stats=1`, `?hud=0`, `?view=mats`.
- Still mode `?render=1&w=&h=`: `window.realm = { canvas, shot({ cam, tod, weather, season, snow, wet, frames, t }) →
  info, info(), place(), filmStart(fps), filmFrame(), LR }`.
- Hooks: `LR.on('built' | 'init' | 'input' | 'frame' | 'after' | 'key' | 'thunder' | 'tour' | 'scan', fn, order)`
  (`'scan'`: a surface or a model has arrived).
- A generated material (the twin of a scan, or what no scan does well): `LR.mat.define(name, { glsl: 'void surf(vec2 uv,
  out vec3 col, out float h, out float rough, out float metal)', tile, bump, por, pud, stick, moss, metal, pom, paint })`.
- A built thing: write an `LR.Geo`, `LR.world.add(geo)`, register `LR.world.solidBox / solidCircle`, lights with
  `LR.world.light`, smoke with `LR.world.smokers.push`, sounds with `LR.world.sounds.push`.
