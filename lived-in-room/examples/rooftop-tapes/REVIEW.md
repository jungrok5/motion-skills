# REVIEW — 옥탑 녹음실

The rounds this room went through. The method is in the skill's `references/REVIEW.md`.

## Round 0 — built by reasoning, measured before anything was looked at

- **This round did:** the whole room placed from the brief, zone by zone, without rendering.
- **Result:** 357 things. `audit.py`: floating 25 · sunk 23 · tipping 3 · held by nothing 25 · intersecting pairs 17.
  About a dozen of those were the audit's own false alarms (fixed in the library; `references/LESSONS.md` has each),
  the rest were real: a radio standing in a phone, a pan on a book, a blanket 45 mm into the wall, headphones hung
  with their cups in the wall, flat tapes deeper than their shelf, upright tapes 2 mm into the rack's back, a radio
  aerial into the shelf above, a rug corner under the mattress, a cable through the drawer unit, 39 beads of water
  2 mm off the glass. None of it was visible in the dark stills.
- **Done when:** `audit.py --break` passed with nothing floating, sunk, tipping or intersecting. It did, after the fixes.

## Round 1 — the first review by a second agent

Given: eight work-light views, the supports picture, nine stills, the setting and the rule of the room, the audit
line. Asked for what is wrong, most damaging first. It returned 24 findings and read the plan against the brief
more strictly than the builder had.

| # | finding (short) | taken / declined |
|---|---|---|
| 1 | The drying rack and the circulator stand on the tape wall, 0.25 m from the tapes: the one thing her rule forbids | **taken** — rack to the south wall beside the door; circulator between it and the tapes, blowing toward the door; the freed west wall takes the clothes rail |
| 2 | The dawn sun lies on the tape rack, at an hour (06:50, before sunrise) and angle that cannot happen for that window | **taken, and the building was turned** — the window now faces west-north-west, the only orientation in which one side wall never gets direct sun at any season; the second hour became 16:40, sun at azimuth 240°, 6° up, 60° to the left of the window: it lands on the east wall by the bed |
| 3 | Three tapes stand on the wet sill; the blank-tape drawers are 0.2 m from the heater; the heater warms a drawer side, not her shins | **taken** — outgoing tapes on the sideboard; drawers to the west end of the desk; heater south-east of the seat, clear of table and bedding, its axis passing north of the rack |
| 4 | The only window has no curtain or winter cover | **taken** — a rail and a heavy curtain bunched to one side; bubble wrap on the lower panes (it also answers the fogged glass of 6 and 16) |
| 5 | Not a dwelling: no clothes, nothing to cook on, no trace of where she washes | **taken in part** — a clothes rail with a padded coat and work clothes, a portable burner, a toiletries basket and outdoor slippers by the door, a mirror, a tissue roll, a tied rubbish bag. The sink and toilet are in a lean-to across the terrace, out of the film: the brief now says so. **Declined:** a sink unit in the room (this building type has none) |
| 6 | The window view: a dusk-blue sky at 2 am, glowing roofs, no reflection of the room in the glass, no parapet of its own roof | **taken** — night picture two stops darker; the terrace modelled for real (deck, parapet, water tank), which also gives true parallax; with the outside dark the glass now mirrors the room |
| 7 | The torch is a hard-edged theatre spot | **taken** — 85° cone, soft edge, 6,500 K, strong enough to bounce |
| 8 | The desk lamp hangs past the desk and lights the bin; the heater paints the whole room; the night lamp is clipped | **taken** — the lamp's turn was mirrored: swung over the recorder; heater light cut and aimed; night lamp halved |
| 9 | No computer, no signal leads, running machines with no plug | **taken** — a mini PC; recorder → mixer → PC and microphone leads; a second strip in the fridge corner; leads for the circulator, cooker, fridge, deck, night lamp, monitor |
| 10 | The bed is a slab under a striped sheet | **taken in part** — a thick duvet folded back on itself; an electric mat's controller by the pillow. **Declined:** a fitted sheet (never on camera at a size that shows it) |
| 11 | Nobody is here at night though everything is running; nothing has changed by morning; the clock still says 02:14 | **taken** — the person holding the phone is the tenant herself: at 02:14 coming back in from the roof, at 16:40 coming home from work. What she carries is not in the room at that hour (`r.away`): sneakers, tote and recorder at 16:40; her outdoor slippers at 02:14. No phone lies on the table: it is the camera. Clock hands are set per hour. The screen shows one transfer advancing, not pages changing by themselves; the deck is idle |
| 12 | The fridge cannot open | **taken** — follows from 1 |
| 13 | No sign that she manages damp; the rack is flat on an outside wall | **taken** — the rack stands off the wall on battens; a hygrometer in the top row; absorber tubs under it |
| 14 | The shadowed walls are blotched like mould | **taken in part** — wall dirt cut by more than half; more samples for the daylight hour. **Declined:** wallpaper seams (cost against benefit at film size) |
| 15 | No kerb at a door onto a roof; no lock or closer; nothing holds the door open in November | **taken** — a 100 mm kerb, a lock case and a closer; the door is open because she has just come through it |
| 16 | The window trim reads as a Western casing with a horned stool; the condensation reads as dust | **taken** — a plain papered reveal with a flush board; water only above the bubble wrap, and only at night |
| 17 | The sound map is the wall's colour and its pins are printed dots | **taken** — on a cork board, with pin heads |
| 18 | Placeholders: deck, air conditioner, clock (a square dial in a round rim), washing, sneakers, tote | **taken by screen time** — clock face made round; air conditioner given its line cover and lead; deck meter dimmed. **Declined:** washing, sneakers, tote (`sheet.py --screen`: never on camera, or away) |
| 19 | The floor reads as hardwood strip, not sheet flooring | **taken in part** — plank contrast and gloss cut. **Declined:** welded seams every 1.83 m |
| 20 | Tape rows too regular: random colours and random years though "in the order recorded" | **taken in part** — J-card colours in runs, as blanks are bought by the box; years ascend along the rows. **Declined:** leaning tapes (the skill has no thing-leans-on-thing support; noted for the library) |
| 21 | Water bottles read as dark glass | **taken** — clear, labelled |
| 22 | The rug stops short of the desk | **taken** — under the knee-hole |
| 23 | The calendar's grid is November 2025 under a 2026 heading | **taken** — the 1st on a Sunday, the 17th ringed |
| 24 | Sticky notes cover the screen's picture; the "off" screen still shows a picture | **taken** — all five notes on the wall by the window; a screen that is off is black glass (a library fix) |

Nothing was found wrong with scale.
