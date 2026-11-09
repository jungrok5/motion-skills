# LOOK — the cute-map style, observed from the source

Source: Charly Delaroche (@Nal_uh) on X, 8 Nov 2026 — https://x.com/Nal_uh/status/2119508762298040469?a=AifzriFhkxBwD85fPCI&s=19
("Keeping a high quality bar + performances + doing the whole world in nice cute 3D is such a challenging problem"):
a 5 s phone screen recording of the Anywhere map app panning over Shibuya Crossing at night in the rain, and two
stills — Lombard Street by day, the Golden Gate Bridge at dusk. Only the look is borrowed; the app's interface (status
bar, dock, buttons, avatar bubbles) is theirs and is never drawn. Everything here is rebuilt in code from
OpenStreetMap data.

## What makes it read as "a cute 3D map"
1. **A real place, whole.** Every block, street, tree and river is where it is in the world. The landmark stands on
   its real spot, on its real axis, at its real height relative to the city. (→ `fetch-place.mjs`, real heights.)
2. **Toy materials.** Soft rounded-looking blocks, pastel walls, pale (lavender / white) roofs, small roof boxes and
   chimneys, window grids drawn on the walls. No textures, no photographic detail. Saturated but soft.
3. **Painted ground.** Light warm sidewalks and plazas, purple-grey asphalt with crisp white zebra crossings and lane
   dashes, rich lawns with a darker rim, blue water sunk below a stone edge. Soft contact shadow where blocks meet
   the ground.
4. **Trees as lumpy round canopies** — dark green, lighter on top, thousands of them, casting soft round shadows.
5. **A tilted map camera.** Perspective, narrow lens (≈30° vertical), pitched 25–60°, always gliding (a finger pan, a
   slow orbit, a push). Vertical frame (9:16 — a phone).
6. **Tilt-shift depth.** A sharp band across the subject, blur growing toward the top and bottom of the frame, haze at
   the far edge. It is what makes a real city look like a model.
7. **Map words.** POI pins: a round coloured badge with a white glyph + a bold rounded name with a halo, colour by
   category. Street names lying on the road in big spaced caps, translucent white. The landmark gets a star badge.
8. **Life.** Little rounded cars with headlights moving along the streets, people on the crossings, boats on rivers,
   rain streaks, glowing billboards.
9. **Night is purple, not black.** Indigo-lavender ambient so every block still reads, warm orange street-lamp pools
   on the roads, lit windows in warm whites, neon and screens glowing, bloom on lights, reflections on water.

## Fixed in every film (do not change per place)
the grammar above · 1080×1920, 30 fps, 12–24 s · the tilt-shift + haze + bloom post · labels in Map Round / Map Sans ·
the pin design and category colours · purple nights with warm lights · the OSM credit · a hand-built hero landmark.

## Designed per place (never reuse another film's)
the area and its size · the city palette (walls, roofs, ground, water, trees) from the city's real materials · roof
styles and default storeys · the landmark model and its night lighting · the camera path · the time-of-day story and
weather · which pins, streets and areas are named and in which language · the life (traffic side, boats, crowds) ·
the end line · the score's key and tempo.
