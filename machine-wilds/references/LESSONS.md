# LESSONS — what went wrong, why, and the fix

Three parts. First what was learned putting **walking machines on uneven land** into the engine (this skill). Then what
was learned putting scans into it (scanned-realm), then the engine's own list (living-realm): every one still holds.

## Machines on the land (machine-wilds)
- **The body jumped a metre and a half when a foot lifted.** → Its height was "ride over the mean of the feet, then, if
  a leg is over-stretched, come down by the excess": the excess vanished the moment the stretched leg went into swing.
  → The height is bounded by every leg's own limit — hip height over that leg's ground, a swinging leg counted through
  its swing (its ground eases from the last footfall to the next) — the bound is soft (a smooth minimum), and the
  whole is eased through a window. The instant correction stays as a last resort and `gym` fails if it runs.
- **A five-tap average is not smooth.** → The body's vertical speed stepped whenever a tap crossed a kink: 3 m/s² on a
  machine of 86 tonnes. → Thirteen taps of a raised cosine; the limit of a leg rounded off; the sink into a landing a
  raised-cosine pulse instead of `t·e^-t` (whose second derivative at the start is its largest value). The check
  measures the body's acceleration over 0.3 s and fails over 1.6 m/s² for heavy machines.
- **The ankle folded backward at a long reach forward.** → A three-segment leg's tarsus leaned a fixed angle; with the
  foot far ahead and the leg nearly straight the shin came round past it. → The tarsus leans with the fold (it takes
  60 % of the shin's swing) and never comes within 20° of the shin's line.
- **No cylinder fitted the knee.** → Twice. First the leg stood too crouched (75 % of its reach): every joint swung
  twice as far as with 86 %. Then the search only tried anchors in the middle of each part: a wide swing wants one eye
  near the pin and the other far along its part, where the length changes little with the angle. → `ride` set for
  80–88 %; the search covers 10–85 % of the upper part and 8–62 % of the lower; barrel radius is its own number
  (`bar`) so a colossus does not get a barrel 1.7 m thick.
- **Footprints tripped the next foot.** → A print 22 cm deep in a 1.7 m bowl has a 23° wall; the hind foot landed on
  the front foot's wall and the check said the sole could not turn that far. → Prints are 6 % of their radius deep,
  with a wide soft profile.
- **A way cut a bench into the hillside with a wall of stretched earth above it.** → The engine's `road()` eases the
  ground with a 2.5 m margin. → Ways are eased by the machine code: toward level across, a skirt 1.2 half-widths or
  2.6 times the cut on either side, the grade along it capped (cut and fill), its bumps put back afterwards.
- **A way worn level makes the terrain walk pointless.** → Eased 80 %, not 100 %, with its own roughness returned and
  the rises and falls along it kept: on the side-view sheet the legs must be at different lengths.
- **The land's edit zone ends before its edge.** → The colossus's way ran where strokes fade out (the last 28 m of
  the editable middle): half-eased ground, cliffs. → The land was made 640 m wide for a way at 240 m.
- **Three carriers walked through each other.** → 9.5 s apart at 1.5 m/s is 14 m for a machine 12 m long with legs.
  → `check.mjs` walks every pair of units through a lap and fails when two come within their legs' reach.
- **Stains swam over a walking machine.** → Grime, moss and grain were looked up at the world position. → A skinned
  mesh passes its rest position to the fragment shader and those lookups use it.
- **A still at the wrong hour.** → Still mode took the engine's default (16:24, clear), not the realm's
  (`weather: { tod, weather }`); twenty minutes of renders were of a sunny afternoon. → A still starts in the realm's
  own hour and weather.
- **A lamp at 100 m, looked into, whites out the picture.** → The beam's forward peak times a power set for seeing it
  from the side. → Powers are set looking into the beam; a relic's eyes at 150, a crane's search light at 90, a
  carrier's at 22 read as cones from the side and as a glare (not a blank) from in front.
- **Guessing where a machine is costs two minutes a guess.** → On a CPU a still takes that long. → The walk is a pure
  function of time, so Node knows where every unit is at any second: ask it for the camera, then render once.
- **A vm context made the land take 28 s in Node.** → Every `Math` and `LR` was looked up through the context's
  interceptors. → The gym runs the sources as one function with their globals passed in: 1.4 s.
- **Night in the mist was a blank picture.** → `check.mjs` measured it: light 0.13 ± 0.02. Fog after dark was lit only by
  what the sky dome gave, which is what the trees got too: everything the same dark. → The mist holds a light of its own
  after dark (`glow` in the look → `uAirGlow` in the air pass, on the marched part and on the far haze): trunks and machines
  are shapes against it, and the lamps still own the picture. The dawn hour (5–6) needs nothing: the engine's morning mist
  with a low sun is already shafts through the trees.
- **A crane's neck went through the viaduct it walked under.** → Its way crossed the viaduct line twice: once through the gap
  made for it, once under a standing span 20 m up — and the machine is 25 m tall. Nothing checked heights. → The way goes
  round the south abutment (and now crosses the walker's road by the way in, which is the better picture). Draw every way
  over the ruins on the map before building either.
- **Parapets 22 m up stopped the walker on the ground beneath them.** → Solids are circles and boxes on the map. → A solid may
  carry `{ y0, y1 }`: it stops only who is at that height, and neither the footing nor the way check counts it.
- **A still inherits the hour of the still before it.** → `shot({ cam })` without `tod` and `weather` keeps whatever the last
  one set: a batch that mixes hours must name them every time.
- **A tour along the road walked through the cars parked on it.** → The walk map (`check.mjs --walk`) shows it in
  one picture; the cars went to the verge.
- **"Rusted, mossed hydraulics under some pale shells" was asked for; the watcher came out showroom white.** → The
  materials had rust and moss in them, but a pale ceramic shell never reached the threshold of either, and nothing on
  a cast sheet at noon asks "how old is this?". → Every kind has an `age`: the kit lowers the vertex's alpha in
  patches laid in the machine's own space (more on what faces up), and the surface turns that into grime, into rust
  streaks that run down from seams, and into moss — all walking with the machine. *Rule:* read the look the owner
  named off the cast sheet word by word before any mood still; mist hides exactly what was asked for.
- **A flyer turned about in a circle is never level.** → The first kite sheet showed wings "hanging" in every side
  view: the studio's oval kept it banked 25° the whole way round. → A flyer's studio is two long straights joined by
  half circles; it is turned about on a straight, in the middle of a downstroke, and shown banked on purpose after.
- **A skein strung out over 180 m is five birds, not a flight.** → Offsets of three seconds at 14 m/s are 45 m apart.
  → Closed up to about a second — and then, in the one tight turn of the line, two of them came within six metres with
  nine-metre wings: the gym judges each unit alone, only `check.mjs` measures pairs, and it had not been run after
  the change. Two seconds apart, a little to one side and above. *Rule:* after moving any unit's offset or shift, run
  the pair check before anything is rendered — a film was made with the wrong spacing.
- **The kites' line climbed 27° and pulled 2.6 g.** → A line through points sixty metres apart with twenty metres of
  height between them is a roller coaster. → No turn tighter than forty metres at 14 m/s, no more than one in four up
  or down; `gym` fails on pitch, bank and load.
- **Mist at dawn was a white wall.** → The engine thickens the air sixfold at dawn, which is right for clear weather
  and absurd on top of a look that is already mist. → Capped; a look that is mist grows by a quarter at most.
- **Far hills in lawn green with white caps turned a noon still into a cartoon.** → Above the far forest's tree line
  the land fell back to turf, and the far forest's own albedo was nearly a meadow's. → A wood seen across a valley is
  dark (its crowns shade each other), and above the trees the biome is rock. Look at one clear-noon still for the
  horizon even if the piece is all mist.
- **A lone dark cloud hung in the mist like an ink blot.** → Under mist the sky still broke into clouds, unlit at night
  against the glowing air. → A mist look closes the sky (`cloud: 1`).
- **A planted tree stood on a way that had been moved.** → Scatters ask `wayDist`; three trees placed by hand did not.
  → `check.mjs` names the first solid on a way; hand-placed things are checked like the rest.
- **The film's sound came back empty.** → Audio is off in a render page; the offline render refused too. → `film.mjs
  --sound` opens the page with `sound=1`.
- **"Can't I jump off the bridge and go to the machine? It stops me."** → The set piece put the walker 26 m from a
  machine and behind a three-metre invisible wall: the barriers' solids had been given `y1: Y + 3` so that nobody could
  leave the deck. The owner's first wish on the live page was the obvious one. → Solids carry their real tops; a hop
  gets a walker onto anything about a metre high and over it; stepping off a deck is a fall with gravity, a landing and
  a way on. *Rule:* never fence the walker off from the thing the place is about — if the picture makes them want to
  go there, the page lets them, and the brief says how they get back.
- **A trailing `//` swallowed the rest of a one-line handler — for the third time.** → The page loaded to nothing and
  the test waited ten minutes for it. → `new Function(source)` on every edited file before a build; a test that waits
  for a page has a timeout and prints the page's errors as they come.
- **A body that follows a hand cannot be planned — and the first rule for its feet left one a metre behind.** → "Lift a
  foot when it is half a step behind" works only in a steady walk: from a stand both feet are under the hip, the first
  lifts late, and by the time it lands the other is beyond the leg's reach; the reach guard then dropped the body two
  metres. → A foot leaves when the other can carry the body for as long as the swing takes (from a stand: at once, a
  short quick step); a foot the hip has outrun is lifted whatever else is true; the hip's height is bounded by what
  the legs reach, never corrected by more than a hand's breadth in a frame.
- **Walking down a steep bank, the body dropped a hand's breadth at every step.** → Its height came from the feet that
  were down; the leading foot lands lower, and the limit arrived with it. → Through each swing the limit comes down
  from the foot that stands to the place the other will: a descent is walked down.
- **Everything added to the hip's height after the limit must only lower it** (a breath, the rise of mid-stance, a
  landing's rebound) — or the leading knee goes straight exactly where the leg is longest.
- **A 76° knee found no cylinder on a small leg.** → Drum and barrel sized like a colossus's in proportion left no room
  between pin and lug. → Slim joints on a small machine; a hip that swings through a right angle is a rotary drive.
- **The avatar's exercise must be walked again after the land is pressed** — its footfalls stood 78 mm off ground that
  the other machines' footprints had since lowered.
- **A still's camera is not the walker.** → The body (and its shadow, and its lamp) stood at the spawn point in every
  still. → Hidden in the first view; no shadow and no lamp in a render unless asked (`torch=1`).
- **Cast-sheet tiles of a walk were blocked by the 1.75 m figure** — it stood beside a way, and the walker's body walks
  past where it stands. It stands behind the start instead.

- **"Put in the ones with shells too — monsters, all sorts."** → Three more kinds for one valley (a turtle under a dome,
  a crayfish in plates with claws, a file of woodlice) took more from the numbers than from the parts. A woodlouse's
  body snapped about for a third of its lap: the swing's default clearance is a quarter of a metre, a third of its leg
  → `clear` in its own size. The course asked it to step off a wall taller than itself → the course's drop, ditch and
  mound now come in the kind's size. The turtle's hip cylinders found no anchors until its legs were longer — and then
  it stood a metre and a half above its `ride`, on tanks that hung below its `belly` box → both declared as built.
  Four in file walked into each other at the first halt → halts placed per machine so the file stops as one. A post
  with a 14 s breath and a 20 s move was "150 mm off a lap later" → the loop made whole breaths. See MACHINES.md,
  "Small kinds, sprawled kinds, files and posts".
- **A shell is a loft with half its ring left out.** → `k.loft(axis, rings, { from, to, caps: false })` over the upper
  half is a dome; the same rings a few centimetres larger over a narrow band are its rim; plates that overlap are short
  lofts, each a little smaller than the one before, each ending a little wider than it begins. Scutes are `k.hatch`
  along the dome's own normal. Nothing here needed a new part in the kit.

- **"Like a trailer: a free camera that roams, follows a bird down, then goes to the character."** → The reel (`film.mjs`)
  has cameras but no body in it; the player film had the body but only its own eye. A trailer needs both: the body driven
  by keys every frame (`P.keys`, `P.update`), the camera placed after it (`cam.position`, `cam.rotation`) and before the
  frame is emitted, the clock owned by the script. `examples/iron-valley/trailer.mjs` is that: shots as `{ T0, start,
  act(s, keys), cam(s) }`, a dry pass first (where does the body go), three key frames a shot (is it in the picture), then
  the long render. Found on the way: the walk ended 18 m short of the rim way, so nobody could go under the relic → the
  realm's `world.radius` to 262; a low camera in reeds sees reeds → two metres up at the tarn; a body on a bank below the
  camera falls out of the bottom of the frame → check its feet's height, not just its place on the map.
- **A red rectangle in the mist.** → With the crayfish's lamps at 2.4 × and the camera 20° off its nose, hard straight
  edges crossed the picture: the camera was inside a lamp's cone, and a cone seen from inside ends on straight lines. →
  Camera 60° off the nose (beams read as shafts), the flare lowered to 1.5 ×. The beam's edge in the air pass is still
  hard from inside; a film keeps its camera out of the beams.

## Scans in the engine (scanned-realm)
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
thirty metres and wrong where you stand under the crown. *Fix:* a tree's levels are kept to 14 / 30 / 60 / 110 / 190 m
(a sapling a third of that) — a hero tree is one tree and can afford every leaf when you are beside it. Not every
triangle, though: a still taken 3.5 m from one drew 1.07 M for it alone, so a tree of over 600 000 triangles starts
at its first level (every leaf, at half the triangles).

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

**On a phone the picture looked out of focus — from its first frame.** The owner's words: not crisp, hazy, as if the
focus were off, and so from the start. Nothing here had looked at a phone's picture at a phone's size: every still
was 1280 × 720 at full scale. Rendered the way a phone ran it (the tour's frames at the canvas and scale of the `low`
tier, stretched to the screen's 1170 pixels), the cause was plain, and it was three things on top of each other.
(1) *Too few pixels.* `low` drew 0.4–0.8 of a canvas of 1.5 pixels a CSS pixel: 350 pixels across at the start, and
the governor, chasing sixty frames a second, takes it to 230 within seconds on any device that cannot hold them (what
the owner's phone did was not measured: no phone here). (2) *The resolve did not resolve.* It took every frame at the same weight wherever that frame's sample had
fallen, which adds up to the small frame stretched — held still for a minute it was as soft as in the first second.
(3) *Textures were read for the small frame*, a level coarser than the canvas could show. *Fix:* a phone's canvas has
two pixels a CSS pixel on any tier and its governor aims at thirty frames a second (`?fps=60` for sixty), from 0.7 of
the canvas; a canvas pixel listens to a frame by how near that frame's sample fell to it, with more places for the
sample to fall the smaller the frame; the history is read with a Catmull-Rom filter, so a walk does not blur it a
little every frame; textures take a level bias of log2 of the scale; `low` filters them at four samples of
anisotropy, not two. The same applies on any device whose frame is smaller than its canvas — every guessed tier starts
in the middle of its range. *Rule:* judge the page at the size and scale its visitors get, not at the size the stills
are made; and a resolve that is called "upsampling" must be shown to gain detail on a still view (`?off=taau` against
not, at `?scale=0.5`).

**"Do the puddles mirror the light and the sky?" — asked, and the honest answer was "the sky, and a glint".** The
mirror on wet ground marched the reflected ray in steps that grew by 1.3: fourteen of them on `high` reach ten metres
from a puddle eight metres off, and a lit window across a square needs fifteen — so by night a pool showed a dark sky
and nothing of the house behind it; `medium` and `low`, which is every phone, had no mirror at all. Nobody had put a
pool between the eye and a house in a still, so nothing showed it. *Fix:* the ray is walked along its line on the
screen, in even steps there, not in metres — a window thirty metres beyond a pool is a short way up the screen — 8 /
12 / 18 / 24 steps by tier, on every tier; the crossing is narrowed by halving once the ray is found behind
something; a ray that ran its whole reach and met nothing is given the sky itself (not the share of sky a lane is
allowed); and the rougher wet film beside a pool spreads the ray, so a lamp draws out into a streak. The pools
themselves were wrong too, once the sky showed in them: laid on one wide field of noise, a whole square stood under a
single sheet while the next lay dry — a flood, not puddles. With a finer field laid in they are one to four metres
across, about a fifth of open paving when full, stone tops standing out along their edges. And the rings
rain makes were drawn on the lawns as well — hung over the blades at four tenths of their strength, because the test
against the depth buffer had been softened to keep them whole on cobbles: they are made only where the ground is
stone, earth or water. (The rain map also took everything built as a roof; what sways in the wind — flags, washing,
pot plants, signs — is left out of it now: it shelters nothing.) *Rule:* a reflection is judged with something to reflect in the picture — a pool between the eye and a lit house, at
dusk — on the lowest tier too; and a wet square is looked at by day, from above eye height, where every mistake in
where the water lies is plain.

**A reload the page gives itself came back to the start button.** In a frame or on a phone the page waits for a press
before it fetches anything. The quality button reloads the page, and so does the step down a slow device is given
after ten seconds below its tier — and each reload stood at the start button again, mid-walk. It showed only when the
streaming grew long enough for the step down to fire inside the samples page's frame (on the CPU rasteriser every
device is a slow one). *Fix:* a reload the page makes carries `go=1`, as the safe-mode retry already did. *Rule:* what
the visitor agreed to once is carried through every reload the page makes itself.
