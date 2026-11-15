# BRIEF — from "a famous place" to a plan

The user gives a place ("에펠탑", "Shibuya crossing at night in the rain", "경복궁 영상처럼 만들어줘"). Before code, write
`BRIEF.md` in the project from `templates/BRIEF.md`. Every film is designed for its place: never reuse another film's
palette, camera path or words.

## 1. Find the place and look at the data
1. Coordinates of the landmark (Nominatim via `--q`, or `--at lat,lon` when you know them better).
2. Size: the camera must stay over data. ≈ 2× the farthest distance you will look: a 100 m landmark seen from
   400–700 m → `--size 1600x1600`; a 300 m tower orbited from 1 km → `2400x2400`. Bigger costs build time and file size.
3. `place-map.mjs place.json` → read the map: where the water is, the main axes, which streets have names, where
   parks and plazas are. `--find "<name>"` for coordinates of everything you will name.
4. What is mapped: heights (`with height` in fetch's summary), trees, lamps. Few heights → set `levels` from what the
   city really looks like; few trees → raise `trees.fill`.

## 2. Decide the story in one line
A map film is short (12–24 s) and needs one change that carries it: light (day → night, sunset), weather (rain
starting, fog lifting), life (a crossing filling, boats leaving), or a reveal (from the street up to the whole
landmark). Pick the one this place is known for: the Eiffel Tower sparkling on the hour, Shibuya's scramble in the rain,
Gwanghwamun's guard change at noon, the Golden Gate in fog.

## 3. Camera
- 3–6 keys. Open wide and high (pitch 50–60°) so the place reads as a map; come closer for the landmark; end on its
  best-known view.
- Keep moving: every key changes target, yaw or distance. Rotation ≤ 20°/s, distance changes ≤ 2× per 3 s.
- Vertical frame: the landmark sits in the middle third, its top under the title zone when the title is up.
- The checks keep the frame over the data and the landmark in frame (add `F.check` for "the whole landmark in frame").

## 4. City palette — from the city's real materials, made cute
Look at photos of the streets: wall colours (Paris cream limestone, Tokyo white tile and grey concrete, Seoul beige and
red brick, San Francisco pastel Victorians), roof colours and shapes, ground, trees, water. Keep 4–7 wall tones,
weights favouring the dominant one; roofs lighter than walls in the cute style; asphalt purple-grey.

## 5. Words
6–12 pins, each on screen for 3+ s, timed so 2–5 are visible at once; the landmark's pin big with a star. Names in the
user's language when the data has them (`lang`), otherwise translate the few you show. 2–4 street names on the ground,
1–3 area or water names. Title: kicker (city · country), name, local name, coordinates. End card: one line about the
place (a fact, the moment you showed).

## Still review (score each 0–2; ship at ≥ 14/16, nothing at 0)
1. The landmark is recognisable in one glance at phone size, from every camera angle used.
2. It is in proportion with the city (real heights) and sits on its real spot and axis.
3. The city reads as *this* city (palette, roofs, street pattern from the data) and as cute (soft, saturated, toy-like).
4. Every frame has depth: tilt-shift band on the subject, haze at the far edge, nothing cut off by the map's end.
5. Pins: few, legible, never overlapping, never on the title or the bottom 8 %, each names something real.
6. Light changes are motivated and smooth; night has warm lights against purple, not black.
7. The camera moves like a hand on a map: always moving, never faster than the eye can follow, no jumps.
8. Life: something moves in every shot (cars, people, boats, light).
Render the sheet (`render.mjs --sheet 12 --scale .4`) and ~8 full stills; fix and re-render until it passes.
