# BRIEF — from a topic to a world

Write `BRIEF.md` (template: `templates/BRIEF.md`) before `world.html`. The brief is where the topic becomes a world; the
code only follows it. `examples/moon-base/BRIEF.md` is a filled one.

## Fixed (the style) — do not redesign these
- Low-poly, flat-shaded geometry made from primitives in code (`lib/kit.js`), vertex colours, no textures or assets.
- The build effect: each thing grows up from its base as an accent (coral) wireframe, then dithers into its solid colours
  (`WIN` ≈ 0.8 s); the ground and water appear the same way, far ahead.
- A traveller on a line, the build front running just ahead of it; it starts slowly, stops at the last stop as the build ends.
- The crew: named cursors with coloured tags; arrow = travelling, crosshair = raising, pen = drawing / sweeping / laying;
  a second line under the name says what it is doing, counting ("planting pines 3/5").
- Work types: **raise** (one big thing), **hop** (a run of 3–5 small things, each built as the cursor lands on it, optionally
  "then" a second pass such as roofs), **lay** (along a stroke: fences, cables, poles), **sweep** (a field, row by row),
  **fronts** (track, terrain, sea — one cursor each, the whole way).
- Construction marks: accent boxes with white corner handles round the work, a "Label ×n" count, a ring as each thing lands.
- The session pill (● title · objects · agents · clock → "built in 0:20.0") and the log (the last five finished jobs).
- Timeline: the crew flies in and gathers (1.2 s) → the build → the crew clocks off at the pill and the camera rises and
  turns to look back over the whole world (7 s).
- The light changes through the build (day → golden hour by default); lamps / windows glow at the end.
- The sound: pops as things land, thuds for raises, ticks for log lines, the traveller (chuff or hum), an arrival chime, a pad.

## Designed per topic — every one of these
| part | questions |
|---|---|
| traveller | What moves through this world? Train, tram, rover, ferry, delivery van, a parade float … Its cars, colours, smoke / dust / none, sound. |
| line | Where does it start and end? 3–5 stretches, each a different place (fields → town → forest; pads → panels → rigs → domes). Length 200–400 m for a 12–20 s build. |
| land | Flat plain, valley, coast, crater rim, islands, city blocks? Height function, colours by height / slope / zone, water or none. |
| kinds | What is built in each stretch? Design each as 3–12 primitives in the topic's palette. Size it (`size`) and word it (`words` / `say`). |
| jobs | Which work does each stretch show? Mix raise, hop, sweep and lay so stretches look different. |
| crew | 5–16 names that fit the topic and its language (tracklayer, roofer … / 포장공, 용접공 …), colours readable on the ground, who may do what (roles). |
| words | Doing lines (≤ ~24 characters), log lines with places ("by the windmill", "태양광 밭에서"), HUD words. One language. |
| light | Start and end sky / sun / fog; stars? a sky body (the Earth, a moon)? What glows at the end? |
| camera | Zones along the line (height, distance, side, look), the final shot (where from, what it shows). |
| length | Build 12–20 s (+ 8.2 s intro and outro). |

## How to brief well
- Start from what the cursors *do*: a world reads as built by agents when you can see a cursor sweeping a field, hopping
  three houses then dropping three roofs, dragging a fence along, pulling a dome up. Give each stretch one signature job.
- Put the big raises beside the line 15–40 m out, so the chase camera sees them going up.
- Keep hops near the line (`it.d < 30`): far work happens off screen.
- The final shot should show the line winding back through every stretch, and the thing the topic ends on.

## Review — score stills 0–2 each (render `--sheet 12` and `--stills` at the key moments)
1. **Place:** the topic reads at a glance (not "a valley in another colour").
2. **Work:** every visible cursor is on something being built; its line says what, in the topic's language.
3. **Ahead:** the track / road is always just in front of the traveller; nothing beside the line is a wireframe as it passes.
4. **Stretches:** each stretch reads as its own place, with its own kind of work.
5. **Readable:** tags and log readable at 1080p and in a 9:16 / 390 px cut; tags not stuck over the HUD; marks not a mess.
6. **Ending:** the reveal shows the whole world, the line back through it and the topic's last image.
7. **Style:** low-poly flat shading, accent wireframe → dithered solid, the same HUD, marks, glyphs and camera grammar.

Ship at ≥ 12/14 with no 0. Write what you changed after each round in your notes; problems worth keeping go to
`references/LESSONS.md`.
