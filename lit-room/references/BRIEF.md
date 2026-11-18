# BRIEF — from a topic to a lit room

Write `BRIEF.md` in the project before any code (`templates/BRIEF.md` is the form). The topic gives you three things to
design together: **a room**, **the page on its screen**, and **the light the page throws**, which joins them. A good lit
room is a place you could sit in, a page that person would really have open, and a light that makes the two one picture.

## 1. The room
- **Place and hour.** Where, when, who sits here. Night or dusk: the screen must be the brightest thing (a sunny room
  kills the style). "A night-shift nurse's station", "a ship's chart table at 02:40", "a kid's bedroom after lights-out",
  "a café counter after closing", "a classroom at dusk", "a radio booth".
- **Size** (`size: [w, h, d]` metres): small rooms read best, 3–4.5 m wide, 2.2–2.8 m high. The desk stands against the
  back wall (z = 0) and the camera looks at it from the room.
- **Shell**: wall kind and colour (`plaster`, `paint`, `boards` for planking, `wood`), a wainscot or skirting, floor
  (`planks`, `rug`…), ceiling; one or two holes (window, porthole, hatch) with the outside behind (`outside`: sky
  colours, stars, far lights, or a sea with the moon; keep its `power` low, about 0.05–0.15).
- **Props: 8–14**, chosen for the person and the topic, 2–4 of them **new** (written with the kit in the page: a compass,
  a lunchbox, a microphone, a cash register…). At least one thing on the desk throws a visible shadow from the screen
  (a mug, books, a lamp). Keep tall things away from the space between the camera and the screen.
- **Palette and materials**: 3–5 colours for the room, warm or cool, against which the page's colours will read.
  Materials by kind: wood, planks, boards, plaster, paint, fabric, rug, ceramic, plastic, metal, brass, paper, leaf,
  rubber, glass. Art (a picture, a chart, a poster, a rug pattern) is painted in code with Canvas 2D.
- **Room lamps: 1–3** (desk lamp, pendant, lantern, candle…), with kind, colour, power, and which one the page switches.
  They are accents: the page should still win.

## 2. The page on the screen
- **What it is for this person**: a watch page, a lesson board, a playlist, an order screen, a bedtime story… Its name,
  2–4 tabs (`[data-tab]`), and the first screen.
- **The first screen holds**: 2–4 draggable glows (`[data-lamp]`) whose colours mean something for the topic (running
  lights, stage lights, nightlights, neon signs), one big editable line (`data-hic-edit`: a course, a headline, a name),
  and a switch for a room lamp (`[data-room-lamp]`, `data-hic-click`).
- **Presets** (`[data-mood]`): 3–4 palettes for the page that change the room's light: one dark, one vivid, one bright
  (paper / dawn / daylight). Each preset is named for the topic (Calm night / Squall / Dawn).
- **Typography and wording**: system font stacks only; big type (the page is seen at a distance); wording in the topic's
  voice, short. Never the source demo's words.
- **Colours as light**: a dark ground with bright coloured areas reads as coloured light; bright full screens flood the
  room. Note in the brief what each screen should do to the room.

## 3. The light and the view
- `look`: `screenLight` (how strongly the page lights the room; 6 by default, 10–25 for a page that is mostly dark),
  `exposure`, `bloom`, `vignette`, `grain`.
- `ambient`: a faint sky / ground fill so the corners are not black (power 0.04–0.08).
- `camera.home`: a three-quarter view that shows the screen readable, the desk, one wall feature and the window;
  `close` for the double-click; `start` for the opening glide.

## Still review (score every still; fix and re-render until all pass)
1. **Readable**: the page's big line is readable in the home view and sharp in the close view; no part of the screen is
   cut or hidden by a prop.
2. **The page is the light**: you can name the page's colour on the desk and the wall in front of the screen in a still of
   each preset; a glow dragged left lights the left of the desk.
3. **Exposure**: nothing black-crushed where it matters (desk, keyboard, the wall around the screen); the window is not a
   glaring white patch; the brightest preset does not wash the room out.
4. **Solid**: no prop floats above or sinks into its surface, nothing pokes through a wall, shadows sit under things.
5. **Composition**: the home view has the screen near the centre, the desk's front edge low, one wall feature (window,
   picture, porthole) and depth; nothing large and dark fills a corner (a chair too close to the camera).
6. **One style**: new props share the materials and the light of the kit; no flat-coloured, unlit or pasted-looking things.
7. **Topic**: someone shown only the still can guess the topic from the room and the page.
