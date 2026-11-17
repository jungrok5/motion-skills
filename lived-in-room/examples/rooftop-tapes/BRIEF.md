# BRIEF — 옥탑 녹음실 (the rooftop tape room)

**Topic given:** "a rooftop room in Seoul whose tenant records the neighbourhood on cassette" — not in the source
article (a study in a high-rise concrete apartment, a rainy night over office towers).

## 1. Setting — the building, the person, the two hours
- **The building:** a rooftop room (옥탑방) added on a 1990s four-storey brick-faced walk-up on a hillside in an old
  low-rise quarter of Seoul. Block walls, the lowest ceiling the housing rule allows, sheet flooring over floor
  heating, one PVC sliding window, a steel door that opens straight onto the roof terrace. Plan-north (the window
  wall) really faces east-south-east: the sun comes in at dawn and is gone by noon.
- **The person:** 서하, 34. By day she scans records at the district office; for seven years she has recorded the
  neighbourhood on cassette — the tofu truck at 06:10, the print alley, rain on this roof — and at night she transfers
  the tapes to files, one a night, and labels them by hand. Invented for this example.
- **Her history, as things:** the speckled mug her mother threw; her grandfather's transistor radio, in the place
  his stood; the prism-shaped player she first recorded on; a flip phone with old voice memos on it; a toy racer and
  a battling top kept since 1999; an egg-shaped virtual pet whose battery died in 2003; monthly comics kept since school.
- **The two hours:** `night` — 02:14, mid-November, clear and cold. On: the desk lamp, the screen, the two-bar
  heater, the lamp by the pillow, every standby light, the circulator drying the washing. `dawn` — 06:50 the same
  morning, mist in the valley. On: the rice cooker's keep-warm lamp, the power strip, the circulator. The window has
  sweated all night.
- **The rule of the room:** *she keeps heat, damp and sun away from the tapes.* So the tape wall is the west wall
  (never in the sun, furthest from the door's damp); the heater stands at the far end of the desk, aimed at the seat;
  the washing dries by the door; the bed takes the east wall under the air conditioner.
- **Reference:** none. No generated picture was used; the composition was decided on the plan view.

Questions the skill asks, and the answers used (all "assumed", the person being invented):
1. Whose room? — assumed: an invented tenant, described above.
2. Which building? — assumed: a Seoul rooftop room, because its skeleton differs from the source's in every part.
3. What happens here, when? — assumed: tape transfer and labelling, 22:00–02:00; sleep; washing dried indoors.
4. Which machines? — assumed: a portable field recorder, a hi-fi deck, a small mixer, a desk microphone; no makers.
5. On the desk right now? — assumed: tonight's three tapes, a bare cassette, masking tape, a cold mug.
6. Given or made by someone? — assumed: the mug (mother), the radio (grandfather).
7. Played with at twelve? — assumed: the five things under "nostalgia" in RESEARCH.md.
8. Never allowed here? — assumed: heat, damp and sun near tapes — the rule above.
9. On the screen? — assumed: the waveform of the tape being transferred, the tape list, an overnight export.
10. Own work on shelf or wall? — assumed: the tapes themselves, and a hand-drawn map with a pin per tape.
11. Which two hours? — assumed: 02:14 and 06:50.
12. Must be in it? — assumed: the map.

## 2. Spec — the building in numbers
| part | number | source |
|---|---|---|
| inside size, ceiling | 3.3 × 4.3 m (14.2 m²), 2.25 m | shell |
| outer wall | 150 block + plaster both faces = 190 mm | shell |
| window | PVC single sliding, 1500 × 1200, sill 900, frame 120 deep flush outside (70 reveal + stool inside), crescent 80, pull 280 | window |
| door | steel, 900 × 2100 frame, 45 leaf, opens outward, hinges east, lever at 1,000 | door |
| finishes | wood-print sheet floor; PVC skirting 60 × 9; PVC moulding 40 × 12; wallpaper walls and ceiling | finish |
| power | switch at 1,200 on the door's latch side; sockets at 300 (N, W, E); a high socket for the air conditioner; board by the door | power |
| heating / cooling | floor heating, controller beside the switch; wall split unit 754 × 308 × 189, 150 under the ceiling, one 65 mm sleeve sloping out | boiler, ac |
| light | one 500 × 500 × 47 LED panel in the middle of the ceiling | ceiling-light |
| not here | no sprinkler, no guard rail: neither is called for in a single room opening onto its own roof | shell, window |

## 3. Inventory — 369 things of 81 kinds
`inventory.py` is the list; `python3 ../../scripts/sheet.py --inventory` prints it with what was built. In short:

| zone | things | n |
|---|---|---|
| the building | floor, ceiling, 4 walls, skirting, moulding, window, door frame and leaf | 11 |
| services | switch, controller, board, 4 sockets, ceiling light, air conditioner, pipe sleeve | 10 |
| desk | desk, monitor, keyboard, mouse, recorder, mixer, microphone, lamp, mug, bottle, pens, 3 flat tapes, a bare cassette, masking tape, 2 notes | 18 |
| under the desk | drawers, power strip, rug, stool, seat pad, bin, heater | 7 |
| window | plant, 3 tapes on the sill, 39 beads of water on the pane | 43 |
| tape wall | rack, **188 tapes** in five rows + 2 lying flat, sideboard, deck, radio, 5 childhood things, 16 books, 5 magazines, 2 cartons, headphones on a peg, the sound map | 224 |
| north wall | clock and its second hand, 3 notes, 2 nails | 7 |
| bed | mattress, blanket, pillow, low table, pan, night lamp, a book, phone, a pile of 5 books, 2 posters, calendar and its nail | 18 |
| washing | drying rack, 4 cloths, 4 socks, circulator and its blades | 11 |
| door | fridge, rice cooker, kettle, 6 water bottles, peg rail, tote, umbrella, mat, 2 shoes, 2 slippers | 17 |
| cables | strip → socket, lamp → strip, heater → socket, phone → socket | 4 |

By support: place 277 · stick 47 · fix 32 (11 of them the building) · hang 12 · lean 1 · suspend 0.
Every one is modelled in code (`method='model'`) or is a drawn picture on a sheet (`'image'`); nothing was generated or downloaded.

**What makes them read as real** (modelled for the things the camera gets close to):
- a cassette case: 109 × 69.6 × 16.8, clear, the J-card spine hand-lettered top to bottom with a date first
- a bare cassette: the thicker step at the head end, two hubs in the window
- the rack: 78 mm of shelf for a 69.6 mm case — tapes pushed in unevenly, one row still filling, gaps where one is out
- the deck: a lit meter window, a row of keys, three knobs; the recorder: transport keys and two needle meters on top
- the window: sashes on two tracks, the right one inside; a crescent lock at mid-height; water on the inside of the glass
- **Never drawn:** maker's names and marks. The machines are types, not products.

## 4. Placement by use
| zone | what happens here | left off-square / ajar / half-used |
|---|---|---|
| desk | she sits, plays the day's tape into the computer, speaks the slate, writes the label | keyboard turned 4.5°; recorder turned to the left hand; mouse at −14°; mug a third full, handle outward; bottle half drunk; the three tapes a slipped pile |
| under the desk | feet on the rug, heater on the shins | middle drawer 3 cm open; stool pushed back and turned 22°; seat pad askew on it |
| tape wall | filing while standing at the deck | the newest row half full; two tapes lying flat, unfiled; gaps; her grandfather's radio turned 7° to the room |
| bed | supper from the pan, reading, sleep | blanket thrown back; pillow dented; a book face up; the phone at an angle; a pile of books on the side she gets out |
| washing | drying overnight in the circulator's air | towels at different heights; socks where the towels leave room |
| door | shoes off, bag on its peg, water set down | sneakers kicked off; slippers pointing two ways; the umbrella leaning since the last rain; six bottles where the carrying stopped |

## 5. Film
- **The outside:** one picture, 3600 × 1350, drawn in code: near roofs at our own height with green decks and yellow
  tanks, a slope of small houses, far apartment slabs, two hills — a mast on one, a chimney on the other. It hangs
  40 m beyond the glass, 90 m wide, its horizon at eye level (1.45 m). Lights follow the rule in RESEARCH `beacon`:
  flashing red on the two tops at 30 and 46 a minute, steady red half-way up, steady neon crosses. All off at dawn.
- **Moves — night (31):** clock second hand · circulator blades · 8 cloths in its air · 5 sticky notes · the calendar
  on its nail · 5 beads of water running down the pane · the screen changing page at 4.6 s and 11.2 s · desk lamp,
  heater glow and night lamp flickering by different amounts · recorder and deck meters · six mixer LEDs following
  the tape · two flashing beacons · the visitor's torch at 9.2 s. **Dawn (21):** the clock, the blades, the cloths,
  the notes, the calendar, the water.
- **Light — night:** a dark room with five places picked out — the desk under its lamp, the screen, the heater's
  orange on the floor, the pillow end, and the window. Lamps 2,400–2,700 K. Target median 20–35.
  **Dawn:** nothing on; sun at 9° through the window lays a patch across the tape wall; haze 0.04 per metre. Target median 30–60.
- **The walk — night (16 s):** in at the door looking at the desk and window (0–4 s), four steps in (4–8 s) turning
  toward the west wall, up to the tapes with the focus hunting once (12 s), then along the row. The torch comes on at
  9.2 s. **Dawn (10 s):** in at the door looking at the window, forward, then left to the sun on the tape wall.
  Turn cap 12° a second in both (RESEARCH `handheld`).

## 6. Review rounds
See `REVIEW.md` beside this file for the rounds, what the reviewer found and what was done about it.

## 7. Stills, scored
See the end of `REVIEW.md`.

## 8. Retro — what the next room should know
See `REVIEW.md` → Retro; the conclusions are in the skill's `references/LESSONS.md`.
