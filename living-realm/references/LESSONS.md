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

**Working without a GPU**
- A 720p still takes 10–60 s on a CPU rasteriser and far longer when several renders share the cores → bake materials
  small (`?mat=256`), render several shots per page load (`render.mjs --shot … --shot …`), judge at 960 × 540.
- Frame rate cannot be measured there → count instead (draw calls, triangles, passes) and say so.

**Working with helpers**
- Trees, ground cover and sound were written in parallel by three workers against the engine as it stood. What made it
  work: each owned named files only and was forbidden the rest; each had to render stills and judge them against the
  reference frames; anything they wanted changed in a shared file came back as a note, not an edit (that is how the
  shadow-atlas limit and the turf tiling were found).
