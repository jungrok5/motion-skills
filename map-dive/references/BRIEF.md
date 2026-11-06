# From a topic to a brief

map-dive takes a **place** (a country, province, island, city, campus, theme park, a fictional land) and designs a new
film of it in one fixed style. The brief is written first, into the project's `BRIEF.md` (`templates/BRIEF.md` is the form;
`examples/jeju/BRIEF.md` is a filled one). Code comes after.

## Fixed (the style) vs designed per topic

| fixed — every map-dive film | designed for each place |
|---|---|
| the region as a **floating toy slab**: painted top, grass lip, thick terracotta soil sides (or sea slabs) on a pastel sky | the outline, its scale, which side is sea |
| soft daylight (hemisphere + one low sun, soft shadows), no tone-mapping tricks, pastel pink clouds | the ground colours: the gradient that tells this place's climate / terrain |
| names **painted lying on the map**, bold for the big ones; pin labels (white pill, stem, dot) only in close-ups | the names, the language, which towns |
| oversized chunky landmark toys on the map | which landmarks, built from kit props or new props |
| **dives**: the camera zooms into a point of the map while the next stage zooms in from high above, crossfaded with a zoom blur, same yaw on both sides | which places to dive into (1–3), each a new close-up stage |
| close-ups are stylised maps too: painted ground + 3D canopies / buildings, an apron so no edge shows, haze that scales with height | the close-up's terrain, coast, city grid, landmark |
| optional night: navy sky, warm road glow, lit windows, lamps | whether night falls, and where |
| title at the top on the opening map, small credit at the end; 16:9, 1920×1080, 30 fps, ~20–40 s | the words |

The template (`The Ula Basin`) and the example (`제주`) are style examples. Do not start from them by swapping names:
a desert region needs a new ground gradient and dunes, a river city needs a new grid angle and bridges, an archipelago
needs several land slabs. If a needed landmark has no kit prop, write one in the film (see KIT.md → "Your own prop").

## Steps
1. **Place → outline.** Find the outline on a map and type 25–40 lon/lat points clockwise (follow capes and bays, skip
   wiggles under ~2 km at region scale). Pick the projector centre and `km` so the region is ~11–13 units across.
   Fictional places: draw 8–12 xz points and smooth them.
2. **What the map says.** One gradient for the ground (the place's main contrast), 1–3 rivers, 1–3 roads, 6–12 names,
   4–8 landmarks, one or two kinds of life.
3. **Where to dive.** 1–3 close-ups, each with a reason (the most famous sight, the capital, the thing the place is
   known for). Write each one's scale (1 unit = 20–60 m) and what fills it (coast + crater, falls + forest, a grid city).
4. **Timeline.** Opening map 4–6 s with the title, each dive 0.6 s crossfade, each close-up 4–8 s with its pin label after
   it settles, a rise or a dissolve back. Total 20–40 s.
5. **Text and sound.** List every string (fonts.mjs needs them), pick bpm/key for score.mjs or name a track.

## Review criteria (score the stills and the sheet, write the result into BRIEF.md)
1. The outline reads as the place at first glance (compare with a map side by side).
2. It reads as a toy: thick slab with visible sides, soft light and shadow, props clearly oversized, pastel sky.
3. Painted names are readable at 1080p (cap height ≥ 18 px) and none overlap a prop or each other.
4. Each dive lands where the map pointed: the same yaw on both stages, the close-up's first frame shows about as much
   ground as the map's last frame (match `dist × km per unit`), the zoom keeps the same direction across the crossfade.
5. No close-up shows an edge, a hole or a seam (check the first and last 1 s of each close-up shot).
6. Each pin label is on screen, readable and points at its landmark.
7. Night (if used) reads: roads glow warm, windows lit, the sky navy; the map at night still shows its outline.
8. `check.mjs` prints only `ok`.
