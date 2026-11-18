# BRIEF — from a topic to a building of live controls

Write `BRIEF.md` in the project before any code (`templates/BRIEF.md` is the form). The brief turns a topic into one
building whose rooms are the topic's places, and whose controls are the topic's objects.

## 1. The building
- **What it is and the question it answers.** A bakery at night: what happens to bread while the street sleeps. A
  lighthouse: what keeps the light turning. A space station: a day of its crew. A school after hours. A fire station waiting
  for a call. Pick a building that has rooms, levels and a reason to move between them.
- **Grid.** Columns (widths, m) × floors (heights, m), depth ~3–3.4 m. 2 × 2 is the smallest that reads; 2 × 3 with a shaft is
  rich; more than 8 rooms gets too small to use on a laptop. Rooms may span cells (`cell: [col, floor, colSpan, floorSpan]`);
  empty cells become closed bays with a lit window. A tower (lighthouse) is one or two narrow columns and many floors.
- **Shaft.** If the building has levels people or things move between, a narrow column spanning floors with a lift, hoist,
  dumbwaiter, bucket on a rope, airlock lift… (`Dollhouse.lift`, its own `car`).
- **Shell.** Frame colour (the cut face), wing brick and quoins, base and steps (which column is the door), cornice, roof
  (`flat` with chimneys, `gable` with an oculus, or your own `roof.build`), sign (its words are the page's name; neon colour),
  ground (`street` or `none` on a bare plinth), sky colours and moon.

## 2. Rooms
For each room: its name; 3–6 props (from `lib/props.js`, or built in the page); 1–3 lights (lamps, fires, bulbs; two may cast
shadows); a doll or two if people belong there (with mass); and **2–3 controls**. Light rooms and dark rooms alternate; give
each a wall pattern and floor of its own (stripes, dots, tiles, planks, check, diamond…).

## 3. Controls (the heart of it)
Each interactive object is one real HTML control, drawn where that object is and styled as it:

| object in the topic | control | what it does in the scene |
|---|---|---|
| a switch, a valve, an open/closed sign | `checkbox` | a light on/off, a fan, a heater, a tint |
| a dimmer, a dial, a thermostat, a throttle, a volume knob | `range` | light power and colour, flame size, a spring (dough rises, a level fills) |
| a selector plate, a menu board, a destination dial | `select` | a tint slot (wallpaper), a price `<output>`, a mode |
| a ledger, a chalkboard, a log book, a name plate | `input type=text`, `textarea` | the text itself (one is `data-hic-edit`) |
| a clock, an alarm, a timer | `input type=time` | a chime |
| a bell, a call button, a lever that fires once | `button` | a sound and a counter (one is `data-hic-click`) |
| a display, an indicator, a price card | `output` | shows state |
| the sign, a name board | contenteditable heading | its own words |
| the lift, hoist, crane, rope | vertical `range` (`data-thumb`) | the car between stops |

Rules: every control does something you can see; no two controls do the same thing in one room; each is ≥ 0.45 m wide and
clear of props in front of it; the wording is the topic's (Proof, Oven, Warmer — not "Slider 1").

## 4. Palette and look
Name 5–7 colours: frame, brick, the topic's signature colour (it rims enamel plates, carpets the lift), metal (brass, copper,
chrome), the lamp light, a contrasting light (a heat lamp, a screen), the sign. Set `look.rim` (lens rim) and `look.ink` (plain
sheet lines) to match.

## 5. Motion and weight
For each moving thing, its weight and spring: the lift's `mass` (light 0.7 quick with a small bounce; heavy 1.5 slow), a
rising or filling thing (slow, no overshoot), a fan or wheel (spins up, coasts down), lights (on fast, off slower). Dolls:
mass and pose (standing, sitting). Nothing moves on a plain sine in lockstep.

## 6. Sound
Which defaults (click, tick, clunk, key, bell, chime, hum) and which new voices the topic needs (an oven roar, a foghorn, a
radio crackle), all synthesised; off until the Sound button.

## Still review (score every still; fix anything that fails)
1. **Reads at a glance**: the building type is clear from the whole view; every room is lit enough to see what it is.
2. **Controls as objects**: each control looks like the object it stands for, sits where that object would be, is not hidden
   behind a prop and does not overlap another; its words are legible when zoomed into its room.
3. **Light**: lamps throw soft shadows; no room is a flat colour; the bloom is a glow, not a smear; the sign is readable.
4. **States**: a still with a light off, a dial at its top (`--set`), the lift at its top: each change is visible.
5. **The lens and the sheet**: the twin under the lens is readable; on the plain sheet no two twins overlap and the building's
   lines show behind them.
6. **Bodies**: dolls stand on the floor or sit on a seat (no floating, no sinking), face into the room, and are not cut by
   walls; the idle is a breath, not a bounce.
7. **Phone**: at 390 px the building fits the width and the buttons do not cover the plinth's rooms.
