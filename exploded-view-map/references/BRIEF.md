# BRIEF — from a topic to a page

Write the brief (`templates/BRIEF.md`) into the project as `BRIEF.md` before any code. The style is fixed (see SKILL.md);
every field below is designed for the topic.

## 1. What is taken apart
Pick the thing whose layers mean something for the topic. The plates must be *the subject*, not decoration.
- **Ground that rises or sinks** → a height function: mountains, islands, a reef (depth as negative height), a ski area,
  a city's hills under a cycling route, a quarry, a lake basin, a crater.
- **Things stacked by kind** → a layer list: a building's floors, a vineyard's terraces, soil strata, an archive's shelves,
  a museum's levels, the decks of a ship. Each layer is an outline + its own printed content.
Name the unit (m, m of depth, storey, era…) and the number of plates: 6–15. Fewer than 6 reads as a cake; more than 15 is
beyond the shader.

## 2. The height function (terrain mode)
Build it from parts, then look at the flat still: `ridges` for crests and spurs (a crest line, its height along it, how
fast it falls away), `bumps` for domes, plateaus and pits (negative `h`), `warp` so lines are not ruler-straight, `rough`
for texture where it matters (gate it by height), `floor` for a sea bed or valley floor. The base sheet is everything under
the first level. Write a feature list and check each one is visible as contours: a saddle, a wall (plates close together
in plan), a channel, a plateau (a wide plate).

## 3. Palette and variant
- The ramp runs low → high and should read as the material of that topic (sea → sand → coral, meadow → scree → snow,
  basement grey → office white). Keep adjacent plates close in value so the stack reads as one relief; the lighting
  supplies the separation.
- The toggle is a variant that *means* something for the topic (winter/summer, living/bleached, before/after a fire,
  day/night plan, two eras). It swaps ramps and anything printed through CSS (`#page[data-variant=…]`).
- Desk: the surface the model sits on (wood, a drafting mat, plain) and its lit colour (the dark it turns to when lit;
  pick one that makes the paper read).

## 4. Cards
Four is the default: title (an editable name, one line of context), numbers (3–4 readouts in the topic's units + a
profile along the route), light (a slider whose meaning fits the topic + the variant toggle), a list (the stops, each a
`[data-pin]` button). Keep wording short and true. Readouts come from `view.route` (length in map widths, ascent in the
height function's unit, profile) times the topic's scale and rules of thumb; say when a rule of thumb is illustrative.

## 5. Route, pins, marker
The route visits the pins in a sensible order and uses the relief (it climbs, crosses a saddle, follows a ledge). 3–6 pins
with short names; a number each (height, depth, floor). The marker follows what the slider means (the hour of the day, the
minute of the dive).

## 6. Material and air
`thickness` 5–8 px, `gap` 14–26 px (taller relief → smaller gap), `core` the colour of cut card for the topic,
`weight` 0.8 (light paper) … 1.4 (heavy board). `atmos.deep` and `caustics` only where the topic has water or haze.

## 7. Sound
`PaperSound.voice({ desk, paper })`: a lower desk Hz for a heavier counter, a darker paper for thick board. Never on
before the toggle.

## Still review — every still must pass
Render `node <skill>/scripts/still.mjs index.html --out out --act flat,apart,turn,night,variant,phone` and look at each:
1. **Flat**: it is a believable, finished web page for the topic. Nothing overlaps, no text is clipped, the map's shape
   has the features the brief lists.
2. **Apart**: the relief reads as the topic's thing (not a cone, not a blob); the steps are visible; shadows fall from the
   sun's side; nothing is pure black; the cards are upright, fully on screen and readable; pins do not cover each other.
3. **Turned**: the model holds from the other side and low; cards still face the camera.
4. **Night**: lamps at the pins, the route glows, the text on the cards is readable.
5. **Variant**: the toggle's change is visible and meaningful; nothing else jumps.
6. **Phone (390 px)**: the narrow layout fits, nothing is cut, no sideways scroll.
A still that makes you ask "what is that dark band?" or "why is that card cut off?" fails: fix the page, not the review.
