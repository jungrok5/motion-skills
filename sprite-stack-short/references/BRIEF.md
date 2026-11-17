# BRIEF — from a topic to a short

Write the brief before any code, as `BRIEF.md` in the project (`templates/BRIEF.md` is the blank). The topic can be an
object ("a food truck"), a place with an object in it ("a lighthouse keeper's boat"), a product ("our delivery robot"),
an event ("the first tram of the morning"), or just a mood ("a snowy night, a little snowplough").

## 1 · Pick the hero
- **One object** the topic is about, that reads from above: vehicles (cars, trucks, boats, trams, tanks, planes on the
  ground, spaceships, rovers), buildings (a shop, a lighthouse, a windmill), machines (a robot vacuum, a coffee machine),
  toys and figurines. It is a solid: sprite stacking has no limbs. A person or an animal becomes a **rigid figurine**
  (a statue, a toy, a mascot standing still) — or use another skill (e.g. `pixel-diorama`, `motion-webtoon`).
- **Size**: 10–48 long, 6–24 wide, 8–28 tall. Bigger reads better close-up, but more to draw; 30–40 long is a good hero.
- **Silhouette first**: what sticks up (a funnel, a mast, a chimney, a sign), what tapers (a bow, a nose), what hangs off
  (mirrors, fenders). Each must be visible in the top view or the side view, or it will not exist.

## 2 · Draw the four views (cast.js)
- Axes: the **front points right** in the top and side views; the **side is the right side**; the front view is seen from the
  front (so the object's right side is on your left); the back view from behind. `left` (optional) is the left side, front
  pointing left — only when the two sides differ (a door on one side).
- Each view is pixel art: outline colour, 2–3 tones per material, one accent. Heights must match (side, front and back have
  the same number of rows), lengths too (top and side), widths too (top, front and back).
- **The carve is a visual hull**: a voxel exists where all four views have a pixel. Two consequences:
  - a hollow (an open cockpit, a hull's inside) cannot come from views: use `edit` to remove voxels, or a voxel model;
  - thin parts that share rows in the front view with a wider part widen each other (a mast in front of a funnel becomes a
    slab): give them different rows, or cut them with `edit`.
- **Front / back tells**: give the front and the back at least one colour the other does not have (windows, lamps / a door,
  exhaust). `check.mjs` uses them to verify that the side view faces right.
- Props: generators — `SS.lathe` (round: trees, towers, buoys, barrels, lamps), `SS.box` / `SS.voxels` (crates, houses,
  benches, anything with a formula). Designed for this topic, in the hero's palette family.

## 3 · The world
- **Ground**: one base material (grass, asphalt, water, sand, snow, dirt, planks, tiles, or a new one — a material is two
  functions, see KIT.md); **areas** (polygons: islands, lawns, a pier) with an edge band (sand, curb, foam, line);
  **paths** (splines: a road with curbs and a centre dash, a river, or an invisible course with `paint: false`).
- **The course** (a mover): a closed loop that turns both ways, long enough to reach cruise speed (≥ 400 px), curves wide
  enough for the speed (check.mjs reports the turn rate), on the surface the hero belongs to (`on: ['water']`).
- **Mass and motion** (references/MOTION-QUALITY.md, for machines): `mass` sets acceleration, braking and the lateral grip;
  the body rolls out of turns and pitches back on acceleration through a spring that overshoots and settles; wheels have
  `drift: 0` (they point where they go), boats and hovercraft 5–12°; the engine sound follows the speed.
- **Camera**: follow (`turn` 0 = north up … 1 = the hero always points up; .4–.6 shows the turning best) or orbit (a still
  hero; `rate` .2–.4 rad/s).

## 4 · The beats
The form (references/LOOK.md): world teaser → views → slices → stack → turn → world → title. 16–32 s. Captions: one short
sentence each, one language. `in: 'tiles'` for a beat that changes place (paper → world, world → paper).

## 5 · Sound
A tune in scale degrees (8–16 steps, `.` = rest), a key (MIDI root) and a tempo; chords as degrees per bar; the engine kind.
The beat sounds come by themselves (a pop per view, a blip per slice rising up the scale, a chord when the stack closes, a
whoosh for the turn, a sparkle per shard transition).

## Reviews

**Model sheet review** (`sheet.html`, before any beat; `check.mjs sheet.html` must print ok):
- The four views agree (0 % lost); the side view faces right.
- At 0° you see the right side, at 90° (facing down) the front, at 180° the left side, at 270° the back — check the tells
  (windows at the front, the funnel at the back …). "Is that the front or the back?" — a doubt fails.
- At 45° steps the silhouette holds: no hole, no slab where a thin part should be, nothing floating.
- The light: the faces toward the upper left are the lit ones at every angle.
- The hero's lean poses: roll and pitch move the top, not the base.

**Still review** (each beat mid-way, and each shard transition mid-way):
- One pixel size in the frame; nothing smoothed; nothing cut by the frame edge (labels included).
- Views: the four read as the same object; the arrows say where the front is.
- Slices: the scan line is on the row whose slice is dropping; the top view shows that slice; the stack grows from the bottom.
- World: the hero reads at a glance (contrast with the ground); its shadow is under it; something else moves (glints,
  wake, swaying props); the course shows it turning; it never floats off its surface.
- Captions: one line, inside 90 % of the width, readable on the frame behind them.
