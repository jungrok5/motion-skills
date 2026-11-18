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

- **Result:** 405 things after the fixes; `audit.py` clean; `check.py` 17 ok.

## Round 2 — the same reviewer, shown the fixes

Given: seven work-light views, seven stills, the log above. Asked for fixes that did not work and for new findings
only. It returned 7 of the first kind and 10 of the second (round 1: 24) and said scale, the sun's geometry and the
bookkeeping of who is here now pass.

| # | finding (short) | taken / declined |
|---|---|---|
| A3/8 | The heater now faces the tape wall: on film the rack is washed orange, the one thing her rule forbids | **taken** — turned 21° further, moved 0.1 m east, its light an 84° beam: it ends in the knee-hole of the desk. The rack is lit by lamp and screen spill until the torch comes on |
| A6 | The night window is still a lattice of lit windows in two blobs, with glowing roofs and tanks | **taken** — redrawn: at 02:14 about one window in twenty is lit, in mixed sizes and colours; street lamps strung along the lanes; roofs, decks and tanks near black; the plate one stop darker |
| A10 | The duvet is a flat striped sheet with a separate foam block on it; the mat controller has no cord | **taken** — one body, fat where it rolls back on itself (`kit.blanket(roll=)`, new); a lead from the controller into the bedding. **Declined:** a visible sliver of the mat itself |
| A18 | The air conditioner is a white block | **taken** — louvre slot, panel seam, display window |
| A21 | The water bottles still read as cola | **taken** — pale blue plastic, blue caps, no dark liquid |
| A1 | The circulator blows at the south wall, not the door; at 16:40 it is off while washing hangs | **taken** — turned 34° east; it runs in both hours, and the washing moves in both |
| A16 | The condensation reads as specks | **declined** — low priority by the reviewer's own mark; it is on screen for under two seconds at a size of a few pixels |
| B1 | The recorder's bag hangs over the wet washing | **taken** — the tote hangs on the door end of the clothes rail; the peg rail over the rack is gone |
| B2 | A tape is playing and nobody could be listening: headphones on a peg 1.5 m away, no pen out, no half-written label, no open case | **taken** — at 02:14 the headphones lie on the desk with a lead to the computer and the peg is bare; at 16:40 they are back on the peg (`r.away`, both ways). An empty case lies open, a pen is out of the cup, a half-written strip of masking tape is stuck on the top tape. **Declined:** a log book (the sound map on the wall is her log) |
| B3 | The bubble wrap is a grey band in the sunlit hour | **taken** — `mat.film` now lets light through and scatters it (a library fix): the wrap is the brightest part of the window |
| B4 | A 2.1 m leaf on a 0.1 m kerb leaves no wall over the door | **declined: misread** — 2.1 m is the opening measured from the room's floor and includes the kerb; the leaf is 1.95 m and 150 mm of wall shows over the frame. The brief now states the three numbers |
| B5 | Too few possessions for seven years | **taken in part** — a plastic three-drawer chest, a suitcase on its long side under the hanging clothes, nine hangers, chopsticks by the pan, a basin with detergent by the door. **Declined:** rice sack, ramen multipack, kimchi tub, broom (none of them would be on camera; `sheet.py --screen`) |
| B6 | The clothes are five flat cards | **taken in part** — sleeves, uneven spacing, each turned a few degrees (`kit.garment(sleeves=)`, new). **Declined:** quilting on the coat (0.4 s on screen at the frame's edge) |
| B7 | The curtain cannot be drawn: its hem would drag through the back row of the desk; the bunch is thin | **taken** — desk 140 mm off the wall; curtain 50 mm off it; the bunch 0.46 m wide in nine folds |
| B8 | The fridge door meets the clothes rail | **taken** — rail 0.23 m further north; the fan's lead goes round by the wall |
| B9 | Leads under the desk are stretched strings | **taken in part** — each drops straight down behind the desk, lies on the floor and turns to the strip. **Declined:** a coiled surplus on every lead |
| B10 | The strip's switch lamp is the most saturated point of the sunlit frame | **taken** — a fifth of its night strength at 16:40 |

- **The audit, after these edits and before any picture was looked at:** tipping 3 · intersecting pairs 7 — headphones
  through the computer and the pen cup, a pen through the recorder, the open case through the mixer, two twisted
  garments through each other, the heater on the rug's edge, a suitcase standing on two of its four wheels, and
  chopsticks laid across the pan's 2 mm rim, which the audit cannot tell from a thing balanced on a point (they now
  lie on the table in front of the pan). All fixed by moving things, none by loosening a tolerance.
- **Done when:** `audit.py` clean and `check.py` passing with 407 things. Both hold.
- **Why the rounds stop here:** what round 2 left undone is detail the walk does not find. A third review would be
  the next step for a longer film; it was not run.
