# BRIEF — Lantern Reef, a dive plan taken apart

**Topic.** "Make an exploded-view page for a coral-reef dive plan." A dive centre's planner page for one guided dive on an
invented reef: a sand cay, a shallow coral garden, a swim-through arch and a wall that drops into blue water. Taken apart,
the depth contours become a terraced reef you can turn and look under; the cards stand up beside it.

## The ground
- **Height function**: depth in metres as negative height. A reef crest running north-east from a sand cay (0 m), a
  coral garden plateau around −8 m, a channel cut through the crest (the swim-through), a wall falling steeply to the east,
  sand slopes to the west. `ridges` for the crest and spurs, `bumps` for the plateau and the cay, a narrow negative bump for
  the channel, `floor` at −40 m for the sand plain.
- **Levels**: every 4 m from −36 m to 0 m (10 plates). The base sheet is the deep sand plain below −36 m.
- **Labels**: "−12 m" style, along a line from the cay out over the wall (east), where the plates are widest apart.
- **Decoration** (`decorate`): coral heads (small round clumps, three coral colours) scattered on the plates above −20 m,
  only where the plate is the visible top; a few sand ripples on the deepest sheet.

## Palette (variants = the toggle)
- **Living reef**: sand-turquoise low → bright aqua and pale sand on the cay; corals coral-pink, ochre, violet.
- **Bleached**: the same ramp a little greyer; every coral white with a faint pink rim. The toggle is the page's point:
  the same reef after a marine heatwave.
- Base (−40 m plain): deep blue `#2a6a8d`. Minor lines dark teal at low alpha.

## Material, desk, air
- Plates: 6 px card, gap 15 (a reef is lower than a mountain, so the stack is shorter); core a cool off-white `#e6efee`.
- Desk: a dive-shop counter, a pale drafting mat (`mat`), lit to dark teal `#183f52`.
- Atmos: `deep 0.75`, tint `#7fc2e6` (deeper plates bluer), `caustics 0.55` (moving sun nets on the tops; still in #calm).

## Cards (live HTML)
1. **Title**: brand "Dive plan" + "Contours every 4 m", the editable dive name "Lantern Reef — the arch and the wall",
   one line: "Guided from the mooring. Safety stop at 5 m."
2. **Numbers**: Max depth (m), Swim (m), Dive time (min), Air used (bar, 12 L tank, rule of thumb), and the depth profile
   (inverted: deeper is lower), the stops marked A–E. A small note: "Illustration, not dive advice."
3. **Light**: "Sun at the surface" slider (sunrise → night) with the clock, and the **Living reef / Bleached** toggle.
4. **Stops**: A Mooring, B Coral garden, C The arch (swim-through), D Wall edge — each a button that winds the clock to
   when the group gets there. (A fifth, the safety stop, sat under the mooring and its pin covered the mooring's; it went
   into the title card's line instead.)

## Route
From the mooring over the cay's lee, down to the coral garden, through the arch channel, out to the wall edge at its
deepest (about 24 m), then back up the crest to the mooring. The marker walks it with the clock from 09:10.

## Pins
Four, short names in italics with the depth in mono. The mooring pin sits on the cay plate.

## Sound
Same paper set, a softer desk (`desk: 80`, `paper: 0.45`): a laminated dive slate on a counter.

## Still review (scored)
- flat: reads as a dive-plan page; the reef shape is not a blob (crest, plateau, wall, channel visible as contours).
- apart: terraces read as a reef sloping into blue; the wall side is visibly steeper (plates close together in plan);
  cards upright and readable; no card clipped; pins not overlapping each other.
- bleached variant: the corals change and nothing else jumps.
- night: lamps at the pins, the route glowing; text still readable.
