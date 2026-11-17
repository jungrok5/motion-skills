# BRIEF — 옥탑 녹음실 (the rooftop tape room)

**Topic given:** "a rooftop room in Seoul whose tenant records the neighbourhood on cassette" — not in the source
article (a study in a high-rise concrete apartment, a rainy night over office towers, then dawn haze).

This is the brief as it stands after two review rounds. What the reviews changed is in `REVIEW.md`; the biggest
change was the building's orientation and the second hour.

## 1. Setting — the building, the person, the two hours
- **The building:** a rooftop room (옥탑방) added on a 1990s four-storey brick-faced walk-up on a hillside in an old
  low-rise quarter of Seoul. Block walls, the lowest ceiling the housing rule allows, sheet flooring over floor
  heating, one PVC sliding window, a steel door that opens straight onto the roof terrace. The tap and the toilet are
  in a lean-to across the terrace, out of the film. **Plan-north (the window wall) really faces west-north-west.**
  With that window the sun is only ever to the left of the window's axis, so its light can fall on the east wall and
  never on the west wall (RESEARCH `sun`). The room gets about an hour of direct sun, late in the day.
- **The person:** 서하, 34. By day she scans records at the district office; for seven years she has recorded the
  neighbourhood on cassette — the tofu truck at 06:10, the print alley, rain on this roof — and at night she transfers
  the tapes to files, one a night, and labels them by hand. Invented for this example.
- **Her history, as things:** the speckled mug her mother threw; her grandfather's transistor radio, in the place
  his stood; the prism-shaped player she first recorded on; a flip phone with old voice memos on it; a toy racer and
  a battling top kept since 1999; an egg-shaped virtual pet whose battery died in 2003; monthly comics kept since school.
- **The two hours, and who is holding the phone — she is, both times:**
  `night` — 02:14, mid-November, clear and cold. She stepped out onto the roof for a minute and comes back in. On:
  the desk lamp, the screen (tonight's tape playing into the computer), the two-bar heater, the lamp by the pillow,
  every standby light, the circulator drying the washing. Her terrace slippers are on her feet.
  `afternoon` — 16:40 the same day. She comes home from work. On: the rice cooker's keep-warm lamp and the power
  strips. The sun is 6° up and 60° to the left of the window; its light lies on the east wall by the bed head. Her
  sneakers, her bag and the recorder in it are with her; the window is dry.
- **The rule of the room:** *she keeps heat, damp and sun away from the tapes.* So the tape wall is the west wall —
  the one wall the sun never reaches — on battens, with a hygrometer and absorber tubs; the heater stands east of the
  seat with its axis passing north of the rack; the washing dries on the door wall with the circulator between it and
  the tapes, blowing toward the door; the bed takes the east wall, where the late sun lands.
- **Reference:** none. No generated picture was used; the composition was decided on the plan view.

Questions the skill asks, and the answers used (all "assumed", the person being invented):
1. Whose room? — assumed: an invented tenant, described above.
2. Which building? — assumed: a Seoul rooftop room, because its skeleton differs from the source's in every part.
3. What happens here, when? — assumed: tape transfer and labelling, 22:00–02:00; sleep; washing dried indoors.
4. Which machines? — assumed: a portable field recorder, a hi-fi deck, a small mixer, a desk microphone, a mini PC; no makers.
5. On the desk right now? — assumed: this week's three tapes, a bare cassette, masking tape, a cold mug.
6. Given or made by someone? — assumed: the mug (mother), the radio (grandfather).
7. Played with at twelve? — assumed: the five things under "nostalgia" in RESEARCH.md.
8. Never allowed here? — assumed: heat, damp and sun near tapes — the rule above.
9. On the screen? — assumed: the waveform of the tape being transferred, advancing.
10. Own work on shelf or wall? — assumed: the tapes themselves, and a hand-drawn map with a pin per tape.
11. Which two hours? — assumed: 02:14 and 16:40.
12. Must be in it? — assumed: the map.

## 2. Spec — the building in numbers
| part | number | source |
|---|---|---|
| inside size, ceiling | 3.3 × 4.3 m (14.2 m²), 2.25 m | shell |
| outer wall | 150 block + plaster both faces = 190 mm | shell |
| orientation | the window faces 300° (west-north-west) | sun |
| window | PVC single sliding, 1500 × 1200, sill 900, frame 120 deep flush outside (a plain 70 mm reveal inside), crescent 80, pull 280; insulating film on the lower 42 % of each pane for the winter | window |
| door | steel, 900 × 2100 frame over a 100 mm kerb, 45 leaf, opens outward, hinges east, lever at 1,000, lock case, closer | door |
| finishes | wood-print sheet floor; PVC skirting 60 × 9; PVC moulding 40 × 12; wallpaper walls and ceiling | finish |
| power | switch at 1,200 on the door's latch side; sockets at 300 (N, W, E); a high socket for the air conditioner; board by the door | power |
| heating / cooling | floor heating, controller beside the switch; wall split unit 754 × 308 × 189, 150 under the ceiling, one 65 mm sleeve sloping out behind it | boiler, ac |
| light | one 500 × 500 × 47 LED panel in the middle of the ceiling | ceiling-light |
| outside | her own terrace: deck 150 below the room floor, parapet 1.1 m, a one-tonne tank | rooftop |
| not here | no sprinkler, no guard rail, no sink: none is found in a single room opening onto its own roof | shell, window |

## 3. Inventory — 405 things of 94 kinds
`inventory.py` is the list; `python3 ../../scripts/sheet.py --inventory` prints it with what was built. In short:

| zone | things | n |
|---|---|---|
| the building | floor, ceiling, 4 walls, skirting, moulding, window, door frame and leaf | 11 |
| services | switch, controller, board, 4 sockets, ceiling light, air conditioner, pipe sleeve | 10 |
| desk | desk, monitor, mini PC, keyboard, mouse, recorder, mixer, microphone, lamp, mug, bottle, pens, 3 flat tapes, a bare cassette, masking tape | 17 |
| under the desk | drawers, power strip, rug, stool, seat pad, bin, heater | 7 |
| window | plant, 39 beads of water on the pane, curtain rail, curtain | 42 |
| tape wall | rack on battens, **188 tapes** in five rows + 2 lying flat + the next 3 by the deck, hygrometer, sideboard, deck, radio, 5 childhood things, 16 books, 5 magazines, 2 cartons, 2 absorber tubs, headphones on a peg, the sound map on cork, 2 fixings | 231 |
| north wall | clock, its three hands, 5 notes, a nail | 10 |
| bed | mattress, duvet and its fold, pillow, mat controller, low table, pan, night lamp, a book, tissue roll, a pile of 5 books, burner | 17 |
| east wall | 2 posters, calendar, mirror, 2 nails | 6 |
| clothes | clothes rail, a padded coat and 4 garments | 6 |
| washing | drying rack, 4 cloths, 4 socks, circulator and its blades, 6 water bottles under the rack | 17 |
| door | fridge, rice cooker, kettle, second power strip, peg rail, tote, umbrella, mat, 2 sneakers, 2 terrace slippers, 2 house slippers, wash basket | 15 |
| leads | 16: two strips to their sockets; lamp, monitor, PC, heater, night lamp, charger, fridge, cooker, circulator, deck, air conditioner; recorder → mixer, microphone → mixer, mixer → PC | 16 |

By support: place 289 · stick 46 · fix 49 (11 of them the building) · hang 20 · lean 1 · suspend 0.
Every one is modelled in code (`method='model'`) or is a drawn picture on a sheet (`'image'`); nothing was generated or downloaded.

**What makes them read as real** (modelled for the things the camera gets close to):
- a cassette case: 109 × 69.6 × 16.8, clear, the J-card spine hand-lettered top to bottom with the date first; card
  colours in runs (blanks come by the box) and the years climbing along the rows
- a bare cassette: the thicker step at the head end, two hubs in the window
- the rack: 78 mm of shelf for a 69.6 mm case — tapes pushed in unevenly, the newest row half full, gaps where one is out
- the deck: a meter window, a row of keys, three knobs; the recorder: transport keys and two needle meters on top
- the window: sashes on two tracks, the right one inside; a crescent lock at mid-height; film on the lower panes, water above it at night
- **Never drawn:** maker's names and marks. The machines are types, not products.

## 4. Placement by use
| zone | what happens here | left off-square / ajar / half-used |
|---|---|---|
| desk | she sits, plays the day's tape into the computer, speaks the slate, writes the label | keyboard turned 4.5°; recorder turned to the left hand; mouse at −14°; mug a third full, handle outward; bottle half drunk; the three tapes a slipped pile; the lamp swung in over them |
| under the desk | feet on the rug, heater on the shins | middle drawer 3 cm open; stool pushed back and turned 22°; seat pad askew on it |
| window | the lights of the hill while she works; the curtain across when she sleeps | curtain bunched to the right; film on the lower panes only |
| tape wall | filing while standing at the deck | the newest row half full; two tapes lying flat, unfiled; the next three stood by the deck; gaps; her grandfather's radio turned 7° to the room |
| bed | supper from the pan, reading, sleep | duvet folded back on itself; pillow dented; a book face up; the charger's end lying where the phone was; a pile of books on the side she gets out |
| clothes | dressing by the door | the padded coat nearest the door; hangers at different angles |
| washing | drying overnight in the circulator's air, by the door | towels at different heights; socks where the towels leave room; six bottles set down under the rack |
| door | shoes off, bag on its peg, wash things to carry across the terrace | sneakers kicked off; house slippers stepped out of, pointing two ways; the umbrella leaning in the corner since the last rain |

## 5. Film
- **The outside:** her own terrace built for real — a green deck, a parapet whose top is just above the sill, a
  yellow tank — and beyond it one picture, 3600 × 1350, drawn in code: roofs with green decks and yellow tanks, a
  slope of small houses, far apartment slabs, two hills with a mast on one and a chimney on the other. It hangs 40 m
  beyond the glass, 90 m wide, its horizon at eye level (1.45 m). Lights follow RESEARCH `beacon`: flashing red on
  the two tops at 30 and 46 a minute, steady red half-way up, steady neon crosses. All hidden in the afternoon.
- **Moves — night (31):** clock second hand · circulator blades · 8 cloths in its air · 5 sticky notes and the curtain
  in the window's draught · the calendar by the open door · 5 beads of water running down the pane · the screen's
  transfer advancing once a second · desk lamp, heater glow and night lamp flickering by different amounts · the
  recorder's meters · six mixer LEDs following the tape · two flashing beacons · her torch at 9.2 s.
  **Afternoon (8):** the second hand, the five notes, the curtain, the calendar.
- **Light — night:** a dark room with five places picked out — the desk under its lamp, the screen, the heater's
  orange on the rug, the pillow end, and the window. Lamps 2,400–2,700 K; the sky outside nearly black. Median 15–25
  until the torch, 50–60 with it. **Afternoon:** nothing on; the sun through thin haze (0.03 per metre) lays two
  strips on the east wall; the open door behind her lets in the terrace's cool light. Median 35–45.
- **The walk — night (16 s):** in at the door looking at the desk and window (0–4 s), four steps in (4–8 s) turning
  toward the west wall, up to the tapes with the focus hunting once (12 s), then along the row. The torch — a wide soft
  flood with a hot middle — comes on at 9.2 s. **Afternoon (12 s):** in at the door looking at the window, forward, then
  round to the right, to the light on the wall by her pillow, the focus hunting once as it arrives. Turn cap 12° a
  second in both (RESEARCH `handheld`); the fastest turns are 8.2 and 6.8.

## 6. Review rounds
`REVIEW.md` beside this file: round 0 (the audit), round 1 (24 findings), round 2.

## 7. Stills, scored
At the end of `REVIEW.md`.

## 8. Retro — what the next room should know
`REVIEW.md` → Retro; what is true of any room went into the skill's `references/LESSONS.md`.
