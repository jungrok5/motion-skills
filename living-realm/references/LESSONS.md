# LESSONS — what went wrong, why, and the fix

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
faster progress, not another class of picture. What sets the ceiling is the method: generated geometry, screen-space
light, one file with no assets. A film still needs sculpted or scanned assets and an engine's or an offline
renderer's light. Say this when asked; do not let "no GPU here" stand in for it.
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

**A page that works on the machine it was built on has not been run on a PC.** The owner opened the live pages on a
Windows PC: one realm's canvas went white with the browser's broken-picture mark (the WebGL context was lost while the
page started) and the sister skill's page could not make a context at all ("Error creating WebGL context", printed as a stack
trace). Nothing here could reproduce it — the pages had only ever run on a CPU rasteriser and on phones — so the cause
is not proven; the likely ones are a graphics process killed while one long shader compiled (Direct3D's compiler is
slow on long shaders and the browser's watchdog does not wait), or a first frame too heavy for the card the tier was
guessed for. After a few such crashes the browser stops handing out contexts until it is restarted. *Fix:* every
program is prepared in the background before the first frame (`LR.warm`, `KHR_parallel_shader_compile`); small and old
graphics chips start on `medium`, and a guessed tier in the middle of its resolution range; a lost context reopens the
page once in safe mode (`?safe=1`: lowest tier, optional passes off — the smallest shaders); and when there is no
context a panel says so in the realm's language, with what to do, the card's name and the ways on. *Rule:* a failure
to start is a screen the visitor reads — never a stack trace, never a blank canvas.
