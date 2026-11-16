# LESSONS — what went wrong, why, and the fix

The first part is what was learned putting scans into the engine. The second part is the engine's own list, carried
over from the skill it came from: every one of them still holds here.

## Scans

**A scan's name is not its use.** `medieval_wood` on the beams read as courses of stone blocks from across the
square; `Barrel_01` is an oil drum (its maps are named "explosive"); `rock_07` is a 20 cm pebble with 15 000
triangles. *Fix:* read the tags, the `dimensions` and the `polycount` from the API before fetching, then judge each
on the material sheet (`?view=mats`) and on a wall from five metres — never from the id.

**Photographed albedo sits brighter than the recipes around it.** The first pass of scans made a pale village: the
sandstone quoins glared, the planks were dark, the plaster right — and the paving, which looked fine, put the square
at noon at 0.59 mean light against 0.55 generated: `check.mjs` called it washed out. The light was fine; the tones
were not matched. *Fix:* `gain` per scan (0.6 on the cobbles, 0.82 on the sandstone, 1.2 on the planks), set
against `check.mjs`'s day numbers — not by turning the sun down.

**One material name is used by many things.** Replacing `thatch` with a roof scan made every haystack a dark roof.
*Fix:* a `hay` material of its own (a copy of the generated thatch) for the props; before replacing a name, grep the
kit for who else uses it.

**A scan's height is not a recipe's height.** The engine reads a layer's height to decide where moss grows, where
paint has flaked and where water stands: recipes keep most of a surface high and its creases low. A scan with no
height map was given its brightness, a dark scan read as one deep crease, and the starter's plank walls came out
moss-green from sill to eave. *Fix:* the baker centres every scan's height (its displacement map, or its brightness
when it has none) on that map's own mean — read from its smallest mip — and lays it at 0.62 like the recipes.

**A scan cannot be turned.** Roof courses and plank grain have a direction; the baker lays every scan the same way up.
*Fix:* choose scans whose direction matches how the kit lays that material (courses across, grain along the board);
look at one roof and one door before accepting.

**A set is not an object.** Placing `rock_moss_set_01` put six boulders in a tidy 2 × 3 grid. *Fix:* every root node
of a model is also an object of its own (`'<id>#<k>'`), centred on itself.

**The scan's origin is the ground.** Seating a rock on its lowest vertex stood it on the earth it had been dug out
of: the brown underside showed and it looked dropped. *Fix:* the model's y = 0 is the land; rocks are sunk a little
further and tilted less than the generated ones (0.16 rad at most), or the earth-coloured foot comes up on one side.

**A scanned object is only as sharp as one material layer.** Six scanned boulders were the first thing wanted from
"assets allowed". They share one 1k texture — a third of it each — and a model's maps are re-baked into a single
layer of the material array (768 px on `high`): at arm's length they were smooth tan lumps, worse than the generated
blobs beside them, which wear a tiling scanned rock surface at full sharpness. *Fix:* rocks stayed generated shapes
with the scanned surface; scanned objects are kept for things a metre or so across (barrel, crate, bucket, stump,
fire pit) and one long trunk seen from a few steps. Judge an object by its texels per metre, not by being a scan.

**Sixty scanned objects cost two million triangles a frame.** The world's copies came to 0.72 M triangles, yet the
same view went from 3.3 M (no scans) to 5.2 M: everything written into the prop batches is drawn again in each of
three shadow cascades. `check.mjs`'s per-view numbers showed it; the totals alone did not. *Fix:* scans go into
batches of their own that are drawn into the G-buffer only, and an eight-sided hull per copy (48 triangles, back
faces only, so it cannot shade the scan inside it) throws the shadow and marks the rain map: 3.6 M, the same picture.
Compare a view with `?scan=0` in triangles, not only in looks.

**First come, first served starves the named pieces.** With one triangle budget, a hundred stand-in rocks used it up
before the fire pit, the buckets and the stumps — the objects placed on purpose — were reached; they silently did not
appear. *Fix:* stand-ins stop at 70 % of the budget; a prop called with `{ hero: true }` and every `place()` by
name may use all of it; `check.mjs` warns when a named object did not fit.

**Do not simplify a photogrammetry mesh by merging vertices.** A grid-clustered "light" copy looked like the cheap
answer to thirty-five barrels. Merged vertices average texture coordinates that belong to different islands of the
atlas: the barrels came out with torn zigzag hoops and black wedges. *Fix:* removed. Fewer copies, a lighter model,
a higher budget — a copy costs what it costs.

**A model's files do not sit together on the server.** Locally a glTF finds `textures/…` and its `.bin` beside it;
on Poly Haven's server the `.bin` lives under another resolution's folder. *Fix:* the manifest records the address of
every included file; the reader looks there first.

**Blended and cut-out materials do not belong in an opaque world.** The lantern's glass panes came in as black
cards. *Fix:* the reader skips materials with `alphaMode` `BLEND` or `MASK` — which is also why scanned plants are
not carried (`references/LOOK.md`).

**Textures do not load from `file://`.** The page that used to run from disk showed its generated recipes with no
error in sight. *Fix:* the render and check scripts open the page with file access allowed; a person serves the
folder; `check.mjs` fails when a scan is missing instead of passing a different picture.

**Holding every photograph at once is a quarter of a gigabyte.** Sixty 1k maps decoded and uploaded together.
*Fix:* maps are fetched four layers ahead of the baker and freed after their layer.

**A page must not hang on somebody else's server.** With `--cdn` every map comes from Poly Haven. *Fix:* each map and
model has a time limit (`?scanwait`, 40 s); what does not arrive is drawn from its recipe or its generated prop, and
the list is printed.

**Never write `//` in the middle of a one-line statement.** Twice in this build a trailing comment swallowed the rest
of a long line. *Fix:* `/* … */` inside a line; `node --check` every file after a scripted edit.

**Open — earth painted close to the starter's cabin is drawn as short turf.** Round Tarn Cabin (within about five
metres of its walls) a `dirt` patch or road clears the grass blades, and the cover map read back on the CPU says
`dirt 1.0`, but the land is drawn as turf there; the same road shows as earth a few metres further on. It is the
same in the engine this came from and has nothing to do with scans (`?scan=0` shows it too). Not yet explained:
the splat texture holds the right values and was re-uploaded, the land mesh there is the inner one, no other mesh
covers it. The village's ways and yards do not show it. Until it is found, do not rely on a painted yard right
against a small house on a small (`half: 128`) land — look at a still.

### Round 2 — instancing, plants, leaves (what the first round's lessons turned into)
Three of the lessons above were limits of the first design, and are gone: a scanned object is no longer "one material
layer" (it has two textures of its own), sixty of them no longer cost two million triangles (they are instanced with
levels of detail), and cut-out materials are carried (plants). The triangle budget and `hero` are gone with them.

**The catalogue's triangle count is not the file's.** The first triage threw out every grass and flower set as "a
million triangles": `grass_medium_01` is listed at 1.6 M and its glTF holds 24 730; `celandine_01` 9 000. *Fix:*
`fetch-assets.mjs` counts triangles from the file and prints them; choose from that, and per member of a set
(`dandelion_01#0` is 23 000, `#2` is 2 300).

**A plant's cut-out is not in its glTF.** The first ferns were green rectangles: Poly Haven's glTF carries a JPEG
colour map, and the cut-out is a separate file (`Alpha`, `opacity`) that only the Blender file wires up; the glTF's
`alphaMode` cannot be trusted either way. *Fix:* the fetch takes the cut-out map whenever the asset has one, and a
model that has one is drawn cut-out.

**A simplifier that keeps seams stops on a scan that is all seam.** `boulder_01` (66 000 triangles) has two vertices
to every position: photogrammetry unwraps into thousands of small islands. meshoptimizer's `simplify` treats every one
as a seam and stopped at 82 % whatever error it was allowed — so the level was rejected, the boulder had one level, and
forty of them were 2.8 M triangles in the view and as many again in the shadows. *Fix:* when the result is far from
the target, collapse **across** seams (`simplifyWithAttributes` … `'Permissive'`) with the texture coordinates
weighing in the error: 4 % of the triangles end up spanning islands at a quarter of the count, 16 % at a fifteenth,
where they are a few pixels of rock among rock. Grid clustering (`simplifySloppy`) tears 27–80 %. `check.mjs` warns
by name on a dense scan with fewer than three levels.

**Reach is not size.** Solid things are drawn to 320 × their size, which is right for a statue and gave every pile of
twigs in the forest a reach of 450 m: 1 270 of them, a million triangles, in a view of the lane that has no forest in
it. *Fix:* what `scatter` strews gets a short reach (24–70 m) and no shadow when small; a plant is gone at 16–45 m.
Read the per-model numbers, not the total — the total said "the scans are heavy", the list said which two.

**Level by size was wrong for both ends.** Switching at 9 and 26 times a thing's size kept a 66 000-triangle boulder
whole to 21 m and would have switched a 950-triangle table for nothing. *Fix:* a level is used while its triangles are
about two pixels wide — `584 × size / √triangles` metres on a 1080-line screen. Measured on `high`: the village's
views went from 11–14 M triangles drawn to 3.4–4.2 M (`?scan=0` is 3.1–3.7 M), the scans from 3–4 M to 0.07–0.23 M
in 93–331 copies and 27–82 draw calls.

**Freeing a texture right after the pass that read it lost the pass.** With fifty models baked before the material
layers, every layer came out empty — a black world with correctly lit grass. The draw calls were there, their state
was right, a read-back straight after each draw showed the pixels; at the end the textures were zero. Nothing had
cleared, re-allocated or deleted them: the sources of each bake had been freed in the same breath as the bake, and
the software renderer, loaded with uploads, dropped passes whose inputs were gone (it is legal WebGL, and it worked
with fifteen models). *Fix:* everything a bake has read is freed through `LR.settle()` — passes are finished first
where stills are made, and the freeing waits a moment on the live page. `check.mjs` now reads the smallest copy of
every layer and every model map and fails on an empty one. *Finding it:* halve the list until it works (36 models
fine, 42 not), then stop guessing and log — draw state, then deletions and re-allocations with stacks, then each
texture's content at draw time against the end.

**A card that is all leaf makes a crown that reads as cabbage.** The first photographed sprays were laid as densely as
the painted ones, with leaves half as large again: every card became a solid green polygon, and bushes turned into
balls of shards. *Fix:* fewer, smaller leaves (`fill` 0.72, `size` 1.15), each shading the ones under it in the atlas;
crowns darker inside, under and within a clump (0.4 → 1), with less light filtering down the deeper a leaf sits; far
cards cut out by a hash instead of a threshold on a blurred map, so a crown thins into lace.

**A box round one piece of an atlas catches its neighbour.** The pine sprays came out with grey triangles in them:
corners of the bark that shares the picture. *Fix:* only the largest connected piece inside a box is kept (grown by
two texels first, so a needle a hair off its twig still belongs).

**Not every atlas is a photograph.** `tree_small_02`'s leaves are a flat-shaded drawing. Look at an atlas with its
cut-out applied before giving it to a species.

**A generated bark beside scanned ground reads as a drawing.** The conifers and beeches still wore recipes (plates
with black cracks) after the oaks had a scan, and were the first thing the eye caught in the woods. *Fix:* a bark
scan for every kind of tree; `like:` lets a new material name fall back to an old recipe when the scans are away.

**Soft shadows need the depth the shadow map will not give back.** A depth texture set up for comparison cannot be
read as a number, and the distance to what throws the shadow is what sets its width. *Fix:* every shadow pass writes
its depth again into two bytes of colour. And a wide disc on a surface that leans from the light finds the surface
itself in its own way: each tap is compared at the depth the surface has *there* (its plane, from the normal).

**The licence is part of the asset.** Megascans, asked for by name, is free now — and cannot be served by a web page
or fetched by a script (`references/ASSETS.md`). Find that out before designing around a library, not after.

**126 MB is not a loading screen.** Fifty models and eighteen surfaces at 1k. *Fix:* the walk starts on the recipes
and the measured boxes; scans arrive in it. `maps` per asset (`"d"` for plants, tools and food) took a fifth off.

**A page that works on the machine it was built on has not been run on a PC.** The owner opened the live pages on a
Windows PC: one realm's canvas went white with the browser's broken-picture mark (the WebGL context was lost while the
page started) and the next page could not make a context at all ("Error creating WebGL context", printed as a stack
trace). Nothing here could reproduce it — the pages had only ever run on a CPU rasteriser and on phones — so the cause
is not proven; the likely ones are a graphics process killed while one long shader compiled (Direct3D's compiler is
slow on long shaders and the browser's watchdog does not wait), or a first frame too heavy for the card the tier was
guessed for. After a few such crashes the browser stops handing out contexts until it is restarted. *Fix:* every
program is prepared in the background before the first frame (`LR.warm`, `KHR_parallel_shader_compile`); small and old
graphics chips start on `medium`, and a guessed tier in the middle of its resolution range; a lost context reopens the
page once in safe mode (`?safe=1`: lowest tier, optional passes off — the smallest shaders); and when there is no
context a panel says so in the realm's language, with what to do, the card's name and the ways on. *Rule:* a failure
to start is a screen the visitor reads — never a stack trace, never a blank canvas.

### Round 3 — whole trees, kits of structures, a lens, ground that does not repeat
Asked for: the three things the second round said it had not done.

**"Scanned trees" is decided by a table, not by wanting them.** The catalogue lists a tree's triangles for another
version of the model; the files said: the full-grown fir and pine are 7.0 and 17.2 million triangles and 465 and
914 MB each, the jacaranda 3.9 million and 205 MB. A page that reads originals from the library's server cannot take
those. What it can take: one gnarled 3.4 m tree at 1.07 million and 45 MB, sets of saplings and shrubs at 0.4 million
and 19–23 MB. *So:* measure every candidate from its glTF (triangles, megabytes, objects, which materials are cut
out) before promising anything; say which trees are scans and that the forest is not.

**A tree's levels of detail cannot be edge collapse.** A crown is tens of thousands of leaves that do not touch each
other or the twig: a simplifier that works within connected pieces stops at "every leaf is still two triangles".
*Fix (lib/46_lods.js):* find the pieces (weld by position, union over triangles); leaves are dropped by a fixed
lottery — each level a subset of the one before — and the ones kept are enlarged about their own middles (growth
`(1 / share)^0.45`, capped at 6, less for a spray several times the usual size); twigs are ranked by their share of
the surface and dropped thinnest first, which is what "sub-pixel from here" means; a ceiling on the triangles of each
wood level keeps a trunk from staying at ten thousand. The first version called anything six times the median a stem
and never dropped it: a fir's bigger sprays are that, and the far levels would not go under 16 000.

**A level in view is a draw call, and a tree has seven.** Five kinds of shrub and six of sapling, two or three
materials each, seven levels: the lane went from 444 draw calls to 602. *Fix:* parts of a tree that wear the same
maps (a shrub's leaves and twigs off one atlas) are one part; a sapling or a shrub takes five levels, not seven;
wood that has come down to a few triangles is not drawn; fewer kinds. 545 — and the count now says how many of them
are the shadow cascades (a still draws all three, the live page one or two a frame).

**The second level, at nine metres, looked like a different tree.** A third of the leaves, enlarged, is right at
thirty metres and wrong where you stand under the crown. *Fix:* a tree's levels are kept to 5 / 14 / 30 / 60 / 110 /
190 m (a sapling a third of that) — a hero tree is one tree, it can afford to be whole when you are beside it.

**A scanned tree needs the year too.** It stood green among gold neighbours in autumn and kept every leaf in the snow.
*Fix:* its leaves turn early and whole, each tree and clump to its own gold or russet, and are shed in clumps by the
season (`fall`); the shadow pass sheds the same leaves, or a bare tree throws a full crown's shadow.

**A kit piece is not where its file's origin is.** The fort's pieces are laid out in a field 70 m across; a piece is
placed about its own middle by moving the copy's origin — and culling and distance used that origin. The tower was
there from the woods and gone from the meadow; two corners were missing from above. It looked like a placement
mistake and was not. *Fix:* each copy keeps where its middle is, and view, range and level are decided there.

**A kit's wall tiles.** Its UVs run from −7 to 11; baked maps clamped at the edge drew a smear. *Fix:* a model's maps
repeat when any of its UVs leave 0–1 (measured at load). The same was true of a sapling's bark.

**"Stand it on its lowest point" lifts a pier.** Pieces whose poles go 0.6–0.9 m below their zero were each lifted
by a different amount. *Fix:* `arrange` and `swing` keep the model's own zero (`base: false`).

**Draw a kit before placing it.** Twenty-two pieces with names like `wall_thin_corner_02` say nothing about which
face is the outside or where the open ends are. Sixty lines that plot each piece's triangles from the front, the side
and above (no renderer) answered it in a minute: walls run along z, the outside is −x, a corner's two arms. Then the
plan was set out in the kit's frame with quarter turns, and looked at from above in the engine (`up=48`) before
anything else — which is where the missing tower showed.

**Letting go of vertex copies found the one place that still read them.** Dropping a buffer's array once the
graphics card has it saved 60 MB after one still (347 → 286 MB of array buffers) and crashed the next frame: the
renderer measures a geometry's bounding sphere when it first draws it, and another level shared the positions that
were gone. *Fix:* every scan geometry is given its sphere when it is made. And measure memory after a forced
collection — before one, the heap figure was 553 MB with or without the change.

**A lens before the resolve, not after.** Fourteen taps a pixel is a noisy blur; after temporal anti-aliasing it would
stay noisy and would read a depth buffer that jitters. Between the lit picture and the resolve, with the disc turned
every frame, the resolve adds the frames up and a still has two hundred taps. A map of the largest blur in each 8 px
tile sizes the disc (and lets the sharp parts of the picture skip the pass); what is behind a sharper pixel may not
spread over it. The focus is the median of nine depths in the middle of the picture, eased in dioptres. The first
stills had the bottom third of every picture melted — real for that aperture, wrong for a walk: the near side is held
back to six tenths, and the amount came down. **Focus on a subject, not on a distance:** the first "close-up" still
named 2.5 m and focused on grass.

**A tile shows from above, most on what is laid in rows.** The cobbled lane from seven metres up showed a grid of
the same dark stone; stains and relaid patches did not hide it. *Fix:* each ground layer is read twice with offsets
that change from patch to patch of a noise that does not repeat, and the two are joined along whichever stands
taller — the join runs round stones. Offsets only, so normals stay true; explicit gradients, so the mip level does not
jump at a patch's edge. Cobbles were the worry (two layouts cross-faded would ghost) and were fine: a height blend is
not a cross-fade.

**A time limit on a whole file fails exactly the big ones.** The live test, run while stills were rendering on the
same machine, reported 54 of 58 models: the four trees had "not arrived". Each request had forty seconds; a 20–45 MB
file read between slow frames took longer — and so it would on a slow line with nothing else wrong. *Fix:* a
download is given up when nothing of it has arrived for forty seconds, not when all of it has taken that long. Test
the live page under load, and with the heavy scans forced on (`?heavy=1`): the still renderer waits for everything
and would never have shown this.

**254 MB is a decision, not a detail.** The four heavy scans are 105 MB of it. They are marked, come last, and a
phone, the lowest quality and safe mode do without them — the button a framed page waits behind states what *that*
device will fetch — and every one of them has the engine's own tree as its fallback, so the place is whole either way.

## The engine
**The picture**
- Shade under eaves and jetties was black → the computed sky was physically dim next to the sun (single scattering
  only), so sky light could not fill shade → the sky table is scaled up and given a stand-in for multiple scattering,
  shade gets a small floor, and occlusion is tinted by the surface's own colour (light walls lose less).
- Night looked like day with stars → moonlight was a twelfth of sunlight and night exposure twenty times the day's →
  the moon is a fiftieth, night exposure about seven times; windows and lamps, not the moon, carry a night.
- Lit windows were white rectangles and lamp halos white discs → emissive strength multiplied by night exposure blew
  past the filmic curve → emissives are kept at 1.5–5 × their colour, halos scale with how misty the air is.
- Looking toward a low sun the whole frame went white → the fog's in-scatter carried an extra factor of π and an
  uncapped forward phase → radiance = illuminance × phase, with the phase capped below 1.
- Whole roofs turned green → the moss law reads vertex occlusion ("damp creases"), and the geometry writer kept the
  previous material's occlusion value for the next one → `g.mat()` resets occlusion unless it is given.
- A signpost's arms and a cart's wheels came out dark and mossy → the "dark at the foot" shading read *local* height
  inside a nested transform → shading functions receive world coordinates as well (`aoFn(x, y, z, wx, wy, wz)`).
- Tints made timber black and shutters black → a tint multiplies the material; mid-brown × mid-brown is black → base
  materials are pale where they are meant to be painted (`boards`, `cloth`, `plaster`), tints for the rest stay near white.
- Stone walls looked like a cartoon map → cell colours differed in hue (blue next to ochre) with black joints → one
  stone colour varied a few percent in value and warmth, joints lighter than the stones and wide.
- In rain the lawn became a pond with rings on it → every porous material was given a mirror's roughness when wet, and
  the puddle level put all paving under water → wet roughness depends on porosity (earth and turf stay rough, stone
  shines), puddles fill about half of the low places, and grass holds none.
- Snow painted posts and bench legs white → the cover threshold let vertical faces through at full snow → snow needs a
  face that looks up; walls stay bare, and the rain map keeps the ground under eaves and stalls clear.
- The brook was swimming-pool cyan → the water's body colour was treated as a lit surface's → a far smaller
  back-scatter colour and much clearer water, so a shallow brook shows its bed and only the far water mirrors the sky.
- The pond was a sheet of sky with trees standing round it unmirrored → the water marches its reflected ray through
  the depth buffer (steps that grow with distance, a per-pixel start offset, five bisections at the hit) and takes the
  lit scene there; the sky stays where nothing is hit. It is the one place screen-space reflection is cheap: only water
  pixels run it, and what a pond mirrors — the far bank — is nearly always on screen.
- Dirt paths looked strewn with broken glass → sparse, pale, sharp voronoi "pebbles" → smaller, fewer, close to the
  earth's own colour.
- A thin dark line crossed the grass 12 m ahead → skirts hung under terrain chunk edges won single pixels along the
  seam and were (correctly) in shadow → no skirts: on a ring's outer edge the finer mesh takes the coarser ring's line.

**Judged against the reference, and what closed the gap**
- The first complete village read as a tidy indie game, not as the reference: bright flat woods, no shafts, toy
  paving, neon lawn. Scoring it frame against frame gave the order of work — air and light first, then plants, then
  surfaces — and each step was judged again from stills before the next.
- Woods were as bright as a lawn and sun shafts had nothing to stand against → every place under the sky got the same
  sky light → a 1 m map of crown cover built from the planted trees (`lib/72_canopy.js`): under crowns the sky's light
  drops to under half, a little green comes back from the leaves, and reflections dim with it.
- No shafts between trunks even with fog → clear-day fog is too thin for the few lit metres under a canopy, and what
  the fog scattered was mostly sky light → woods hold their own damp air (a density added under crowns, thick at dawn
  and toward evening, thin at noon), the sky's share of the scatter is cut under crowns, and a little of the sunlight
  is scattered every way so shafts read from the side too. A dense stand closes completely and has no shafts at all:
  plant woods with a density that varies (noise) so the sun has holes to come through.
- A forest interior was nearly black → the eye-adaptation range was a camera's, not an eye's → it may now open 2.5 ×.
- Back-lit crowns were black slabs → leaves were shadowed like walls → part of the sun passes through foliage, and the
  back-light term no longer needs an unshadowed leaf.
- Ferns and leaves shone like plastic → roughness 0.36 on ferns, 0.6 on leaves, and a normal tilt per pinna that
  striped the fronds white → rougher, gentler tilt, less light through.
- Sunlit and shaded sides had the same temperature → the key light is warmed a little after the atmosphere, the film
  grade cools the shade and warms the light and adds a soft S-curve.
- A view sat in flat light for no visible reason → the sun was behind a fair-weather cloud's shadow → cloud shadow
  strength follows cover: slight on a clear day, full under overcast.
- Paving was one sheet to the horizon and houses stood on mown lawn → paving wears through to earth in patches, every
  house gets a ragged apron of earth and a border where weeds and flowers are left, bushes at some corners; walls get
  grime where they are creased or low and broad stains across them.
- The lawn was neon → the grass colour law was pulled toward olive; blades and ground share it, so one edit moved both.
- Rain put white rings on everything → ring strength and puddle level halved; snow lay as a flat white sheet → drift
  normals at two scales and a slight tone variation.
- The tour walked through the inn (it stood on the road to the bridge) → found by `check.mjs`, which walks the whole
  tour against every solid; the inn moved off the road.
- With the inn fixed the check found the next block, then the next: it reported only the worst one, and the way-points
  had been placed by reading coordinates. → `check.mjs --walk` now lists every blocked stretch in one page load and
  draws `out/walk.png` (solids, water, ways, decks, the tour, the views, from above) with a close-up of each. The map
  showed twelve at once: a market stall, the smithy, a log and a lamp on the way — and two real faults in the plan
  that no still had shown: the farm's fence ran across its own road, and a house stood on the way to the pond.
  Look at the walk map as soon as there is a tour, and again after every building or fence that moves.
- Every view had been judged, the tour never: it is the first thing the page shows, and it is not a list of views.
  → `render.mjs --tour 16` renders stills along it as its camera looks. One stretch walked up to the chapel porch and
  turned round staring into the gap between two walls → the tour now passes the chapel across the green, where the
  whole of it is in view, and never walks into a dead end to turn. (The same strip showed that stills taken on the
  bridge stood on the land under it — still mode now stands on decks and ice like the walker.)

**Judged against a second reference, measured — "too flat"**
The owner's verdict on the first delivery was "too flat", with a link to a farm generated the same way (`SOURCE.md`).
It ran in the same headless browser, so both were rendered at the same hours and reduced to numbers (mean luma,
saturation, 5th-percentile luma). The village was a third brighter and far less saturated: flat was tone.
- The sky was brighter than sunlit paving → the shade was filled by it and the sky itself pale. The sky's radiance
  is scaled against the sun (`LR.sky.skyGain` 0.62) and the fill is one number (`LR.wx.fill`). A clear zenith is
  darker than a sunlit grey card: check that in a still before anything else.
- Mist came with every low sun, so every evening was a white-out toward the light (in-scatter was ten times the lit
  ground) → thick mist belongs to dawn and burns off by nine; an evening only goes golden. Clear-day fog was halved twice.
- Exposure rose three-fold by late afternoon and the meter was not allowed to pull it back → a gentler curve, a wider
  meter (0.5–2.2), a lower key (0.15).
- The ACES fit left colours chalky at this key → AgX with a look applied in its log space (power 1.2, saturation 1.27).
- The sun at 15° was white → its colour is deepened as it sinks (clean-air extinction alone is too pale).
- Grass was green to the root on green ground: a carpet → dark earth under standing grass (fading out where the blades
  end) and blades that start at 0.17 of their colour. Depth in a meadow is its dark roots.
- Walls were clean → plaster loses patches in world space (not in the tiling texture) and the brick behind shows.
- Small things floated → contact shadows: eight steps toward the sun through the depth buffer, on `high` and above.
Rule: when a picture is called flat, measure it against the reference before touching geometry.

**A second opinion on one close-up (the owner asked another model what it lacked)**
Four findings, each true of the still it was shown — a stone wall with blue shutters, from an arm's length:
- "Flat stone, angular corner blocks" → the relief was two parallax steps and joints as wide and pale as drawn outlines.
  Now: tight dark joints, each stone its own value, eight-layer parallax through the height field (explicit
  gradients, so nothing implicit sits in the loop), deeper normals; dressed blocks get knocked-off corners, tool
  rows, lichen and rain streaks; moss keeps to the joints and the foot of the wall.
- "Shutters one clean colour" → paint flakes from the board edges and along the grain to bare grey wood, crackles,
  streaks; iron straps rust. The trick that makes any paint colour work: a material flagged `paint: 1` takes the
  vertex tint only where its height says paint is still there. (First try: moss grew in the flaked wood, because moss
  likes low height — a painted material is given no moss.)
- "Hazy, weak shadow edges" → the tone pass above, plus contact shadows.
- "Lawn cut along the path with scissors, bare earth" → way edges are broken up by noise before the height blend,
  the track has stones in dark sockets, twigs and chaff (keep stones close to the earth's colour: bright ones read
  as broken glass — the second time that lesson was learned).
Rule: judge materials from an arm's length as well as from the view; a walker stands next to walls.

**"Is it the GI?" — the bounce, and what it did not change**
The owner asked whether missing global illumination was why it looked cheap. Half: the model was physically based
from the start; what was wrong was the numbers on top of it (above). But indirect light was only sky + occlusion.
- Added a screen-space bounce: half size, 3–5 cosine-spread rays of eight growing steps (reach ≈ 8 m) through the
  depth buffer; a hit that faces back returns last frame's lit picture there, so light goes round more than once;
  a depth-aware blur, then the temporal resolve cleans the rest.
- It is subtle outdoors (mean change under one grey level in an open lane) because an open sky is most of the
  indirect light and grass and stone are dark; it shows in shaded lanes, under eaves and by lamplight. Say so: the
  jump in quality came from tone and wear, not from this.
- Do not judge it in a debug view that replaces the picture: the history it reads then holds the debug view. Compare
  two stills, `?off=gi` and not, and subtract.
- First attempt reached 2–3 m and did nothing visible: light bounces across a lane, not across a doorstep.

**A picture of the target (the same four views, at a film still's finish)**
Read it as a list of what is in it that the engine lacks, not as a style to imitate; take what a frame budget allows:
- Wet paving that mirrors → smooth pixels (wet stone, puddles, ice, glass) march their reflected ray through the depth
  buffer and take last frame's picture; rough ones keep the sky. Wet cobbles were made glossier (porosity 0.55).
  It reads at grazing angles and in puddles; a lamp is small, so its mirror image is small — streaks need a lamp
  that is large or close.
- Rays from the sun → the air pass walks across the screen to the sun and counts open sky. First try painted a bright
  column on the grass under the sun: a ray shows in the air it crosses, so it is weighted by how much air the line of
  sight holds, and the glow is kept within a few degrees of the sun.
- Stars → a wider, cloudier Milky Way with dust lanes; it only shows when the moon is down and the sky is clear.
- The shot list carried state from one still to the next (a wet meadow, an autumn map) → every still that follows a
  weather still names its own weather.
What that picture has and this does not is said in `SOURCE.md` and `LOOK.md`; do not promise it.

**"Is it the lighting?" — no: it is what stands there**
After tone, wear and the bounce, what still separated the village from the target picture was not light transport but
things: nothing grew up the walls, nothing stood by the doors. → `A.dress(house)` puts against each house what people
leave there (a climber or two, pots by the door, a planter under a window, barrels, crates, a woodpile), all within a
metre of the wall and all found by the walk check; a `climber` species (a tall narrow bush planted 0.1 m from the wall:
half of it is in the wall, the rest covers it); bulbs on a string from lamp post to lamp post (`bunting` with
`lights`, lit when the lamps are). Forty-seven things and six strings changed the lane more than the bounce did.
- Rain was only visible in a lightning flash: the streaks took the sky's light, and the sky had just been made
  darker. They were then made three times brighter and half as long again, and a still looked slashed with chalk.
  A streak wants to be a little brighter than what is behind it, thin, and many. Check rain in a still at noon and
  under a lamp, not only in the dark.
- Outlines: a roof drawn as two planes meets the sky in ruled lines, and that reads as a model before anything else
  does. → the roof builder lays single cap tiles along the ridge (each a little askew, one in a dozen slipped), tile
  butts of uneven length along the eaves and across the verges, a shaggy fringe on thatch (`ragged: false` switches it
  off); corner stones differ in length, height and how far they stand proud. About 2,400 triangles a house.
- Indirect light again: besides the bounce, the lighting pass now asks the top-down height map of built things how
  much sky a point can see (eight directions, two reaches) and gives a lane or the foot of a wall less of the sky's
  light. Like the bounce it is a small number (under one grey level across an open lane) that grounds things; `medium`
  now runs the bounce too (two rays). Neither is Lumen: say so.

**"It looks too honest" — everything was plumb, level and even**
The owner's word for what was still wrong, after light, wear and things: 정직하다 — ruled. Environment artists' notes
on game towns say the same in other words (`LOOK.md`, "What makes a built place read as natural"): traces of use,
uneven ground, buildings grounded in the land, repetition broken at every scale, outlines that vary.
- The land was level wherever it had been levelled → `LR.land.roughen()` lays a gentle swell under everything (less
  under paving), called after the ways are laid and before anything is built, so sites are still flat where they must be.
- Paving was one pattern from end to end → the land shader relays it in stretches (a noise picks another size and
  direction of the same cobbles), and the worn gaps where earth shows are wider.
- Lawns were even → rank grass and weeds in patches, worn earth where feet turn, flowers in drifts (cover maps
  painted by noise inside the village).
- Every house stood plumb and every ridge sagged alike → each house leans its own half degree, each roof sags by its
  own amount.
Rule: after the plan is right, go through it with one question — what here is straight, level, even or repeated? —
and break each at the scale it shows.

**"Is it because there is no GPU here?"** — no, and it is worth saying exactly. The page is a GPU program; the
machine it is developed on has none, so every still is the same shaders run by a CPU rasteriser: the same pixels, a
minute apiece. A GPU machine shows it moving, sharper (`ultra`, more pixels) and lets it be tuned by eye and measured —
faster progress, not another class of picture. What sets the ceiling is the method: generated geometry and
screen-space light. This skill lifts one part of it — surfaces and small objects are scans — and the rest stands: a
film still needs sculpted or scanned buildings and plants too, and an engine's or an offline renderer's light. Say
this when asked; do not let "no GPU here" stand in for it.
- Up close a baked texel is a centimetre wide and surfaces went smooth → a fine grain (normal, tone, roughness) from
  the noise texture within eight metres, on built things and on the land.
- The square at noon measured washed out because its paving was pale and even → darker cobbles, each its own value.
- Leaves were painted at 512 px on every tier above `low` → 768 on `high`, 1024 on `ultra`.
- The square was dressed house by house and stood empty in the middle of its own market → goods in groups round
  each stall (what is sold there), a cart, and open paving between.

**The engine**
- `flat` is a reserved word in GLSL ES 3.00 (a local variable named `flat` failed every surface shader at once).
- A `RawShaderMaterial` with its own `#version` line fails: three.js writes defines above it → use `glslVersion: GLSL3`.
- three.js r170 has no 10-bit target type → normals are packed octahedral into 12 + 12 bits of an RGBA8 target.
- Mip-maps of a texture array are regenerated every time three.js leaves the target → switched off after the first
  layer and on again for the last (one generation instead of one per material).
- The highest tier rendered everything in shadow on some devices → three 4096 cascades side by side exceed an 8192
  texture limit and the frame buffer is incomplete → the cascade size is clamped to the device's limit.
- One "water level" for the whole land rejected every tree below the highest point of the brook → water level is asked
  per place (`LR.water.levelAt`), never kept as one number.
- Far land rings cost sixty draw calls for a few thousand triangles → joined into one mesh per quarter of the compass.
- What a CPU rasteriser cannot show has to be read in the shaders: Direct3D (Windows, through ANGLE) must unroll any
  loop that samples with implicit derivatives, and flattens a branch that does. The shadow compare sat inside the
  cascade loop, the tap loop and the 24-step fog march → it samples with an explicit level (`textureLod(…, 0.0)`), as
  do the G-buffer reads inside the lighting branch and the baker's cavity loop. Rule: inside a loop, or a branch
  that should stay a branch, never `texture()` — `textureLod` or `texelFetch`.

**Working without a GPU**
- A 720p still takes 10–60 s on a CPU rasteriser and far longer when several renders share the cores → bake materials
  small (`?mat=256`), render several shots per page load (`render.mjs --shot … --shot …`), judge at 960 × 540.
- Frame rate cannot be measured there → count instead (draw calls, triangles, passes) and say so.

**Working with helpers**
- Trees, ground cover and sound were written in parallel by three workers against the engine as it stood. What made it
  work: each owned named files only and was forbidden the rest; each had to render stills and judge them against the
  reference frames; anything they wanted changed in a shared file came back as a note, not an edit (that is how the
  shadow-atlas limit and the turf tiling were found).
