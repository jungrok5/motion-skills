# LANDMARKS — building the hero by hand

The city comes from the data; the landmark never does. OSM has its footprint and maybe a height, not its shape. The
landmark is the one thing every viewer checks, so it is modelled in code for each film, with the kit (lib/kit.js), from
its real dimensions. Budget: 40–150 lines.

## 1. Measure before you model
- Footprint and orientation from the data: `place-map.mjs place.json --find "<name>"` lists its ways with ids and
  centres. A square or rectangle's edge angle gives `rot`; the parts (pillars, wings, towers) give the centre.
- Heights of every stage from a reliable source (official site, Wikipedia infobox, drawings). Write them in BRIEF.md.
- Clear the OSM ways it replaces: `F.world({ clearIds: [...], clear: [{ at, r }] })` — also the restaurants, floors and
  parts mapped *on* it (they carry `min_height`).

## 2. Block out, then add the signature details
1. Big masses first, at true size: `box`, `cyl`, `lathe`, `extrude`, `column`. Render a still at the film's widest
   shot (`render.mjs --stills`); the silhouette must already read.
2. Add the 2–4 details that make it *that* landmark at 300 px tall (the Eiffel Tower's leg curve and arches, Big Ben's
   clock faces and spire, the Golden Gate's towers and cables, a pagoda's stacked eaves). Skip everything else.
3. Keep the city's toy language: rounded boxes (`round`), flat colours, no textures, one or two materials per part.
   Iron lattices use `K.lattice` (alpha-cut — you see through it and it casts lattice shadows), with the cell big
   enough to read from the film's distance (5–8 m on a 300 m tower).
4. Night: decide how it is lit in reality and do that — `emissive` + `glow` on the materials for floodlighting,
   `K.lights` along edges for outline bulbs, `twinkle` for a sparkle show, `K.beacon` for a searchlight, `K.screen`
   for billboards and departure boards. Lights are on layer 1: they bloom, but are not mirrored in the water (lit
   materials are).

## 3. Check it from every side the camera uses
Render stills at each camera key. It must read from all of them: no side that collapses (a flat billboard seen
edge-on), no part floating, no part sunk into the ground, proportions right against the buildings around it (a
57 m platform is level with a 17-storey block).

## Recipes
- **Lattice tower (Eiffel, Tokyo Tower, a pylon):** `column` per leg through 6–10 sections from the real profile,
  `edges` for the corner members, `band` friezes at platforms, `arch` between legs, `lights` sampled along the corners
  (`K.sample(path, 3)`). Tokyo Tower: same, painted `#ff5a36` / white bands (a `paint` per section height).
- **Clock tower (Big Ben):** stacked `box` stages with `round`, `screen` for the four clock faces (draw the hands from
  t — the real time of the film's clock chip), `lathe` or a 4-sided `cyl(…, { seg: 4 })` for the spire, gold trim
  boxes.
- **Suspension bridge (Golden Gate):** two towers (`box` legs + cross beams), deck `box` along the span, main
  `cable(a, b, sag)` per side, vertical suspenders as thin `beam`s every 15 m, `lights` along the deck. Put it over the
  sunk water (`y` = 0 is street level, the water is at −2.4).
- **Domes and temples (Taj Mahal, a cathedral):** `lathe` for onion domes and drums (profile in metres), `extrude` for
  plans with holes (cloisters), `cyl` minarets with `lathe` caps.
- **East-Asian roofs (Gyeongbokgung, a pagoda):** stacked eaves from `extrude` of the plan, slightly larger each tier,
  with a `lathe`-free trick: two `extrude`s per tier (roof slab + a thin upturned rim box at each corner). Dancheong
  colour bands as thin `box` strips under the eaves.
- **Glass tower / neon district (Shibuya, Times Square):** the city's own buildings + `paint` to give them curtain
  glass (`windows: 3`), then `screen`s on the façades (billboards drawn from t, never real ads or logos), and `lights`
  in strips.

## Do not
- Do not download a model of the landmark (the style is code-built, and models of famous buildings carry their own
  licences). Small generic props from Polyfork are fine where `references/3D-MODELS.md` allows.
- Do not draw real brands, logos or ads on screens. Make up signage in the film's language.
- Do not let the landmark break the city's scale to look bigger — the camera makes it big.
