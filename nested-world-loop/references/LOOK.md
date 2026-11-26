# Look — making it from code without looking like code

Everything is drawn by the page: shapes from `lib/make.js` (lathe, extrusions, rounded boxes, tubes, gears, instancing),
maps painted on canvases from seeded noise, light from three.js lights. What separates a film from a tech demo:

## Light (per world)

- **A key you can point at** — a practical in or near frame (oil lamp, desk lamp, lantern, window, low sun). Give it a
  shadow map; keep everything round the bulb (flame, burner, chimney glass) from casting, or the lamp shadows itself.
- **A second light with a reason** — light through a hatch or window, a sconce on the far wall, the glow thrown back by
  the desk (a shadowless point light, warm). Never fill a room evenly; a corner left dark is part of the picture.
- **A low fill** — a `HemisphereLight` at 0.2–0.6 so shadows have colour, never pure black.
- **Units**: point and spot lights fall off as 1/d² in the world's units. In centimetres a desk lamp is ~5 000–10 000;
  in metres ~50–200. Render a still and adjust; `check.mjs` reports the median brightness of every world.
- **The inner world's light agrees with the outer one** — the sea in the bottle is keyed from the side the cabin's lamp
  stands on, in its colour. That is what makes the worlds one film.

## Materials (told apart)

| thing | recipe |
|---|---|
| brass, steel, iron | `mat.metal(colour, { rough })` — metal needs an environment: give every world `M.envMap(…)` |
| glass (bottles, panes, lenses) | `mat.glass({ opacity .06–.2 })` or a physical material with clearcoat; `castShadow = false` |
| wood | `M.wood({ base, dark, planks, ring })` → `mat.wood` — grain, plank seams, knots; tint walls lighter than furniture |
| ceramic, paint, paper | `mat.ceramic`, `mat.paint(…, { map: M.paper({ lines, scribble }) })` |
| water | a grid recomputed per frame from whole-cycle sines + `mat.water` (clearcoat, low roughness) |
| glow (flame, windows, bulbs) | `mat.emissive(colour, strength)` above the bloom threshold, and a real light beside it |

Canvas maps alias at a distance: avoid fine high-contrast noise on big surfaces (a rug at 3 m shimmered); prefer a
designed pattern (borders, motifs) at a scale the camera will see.

## Lens and print (`film({ look })`)

`exposure` (stops), `bloom { strength, threshold, radius }`, `dof { maxBlur }` (px at 1080p), `vignette`, `grain`,
`aberration`, `grade { shadows, highlights, lift, gain, contrast, sat }`, `bars` (e.g. 2.39). Per key: `bokeh` (px at
1080p — 3 for a room, 6–9 for a miniature seen close), `exposure` (stops, interpolated), `fov`.
Depth of field is what makes a 1/400 world read as a miniature *before* you enter it and as a world once you are in.

## Alive

Every world moves on its own, on whole cycles per loop: `ctx.angle(t, n)` / `ctx.cycle(t, n)` turn `n` times per loop,
so frame(DURATION) equals frame(0) (check.mjs). Flame flicker = a few sines with whole frequencies; waves = whole-cycle
travelling sines; boats on closed paths, one lap per loop; lenses and gears whole turns; dust motes on closed loops.
Things in different worlds that are the same thing share one angle (the lens in the lantern and the beam in the bottle).

No bodies: people and animals are implied (a cup, an open book, a lit window, a boat's lamp). A topic that needs a
moving figure goes to a skill with a rig.
