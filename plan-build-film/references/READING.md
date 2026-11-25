# Reading the input into numbers

The film's first frame is the input, and the building lands on top of it at the real scale, so a wrong number shows
as a wall standing beside its own drawn line. Read the input into `plan.json` (metres, origin at the lot's
south-west corner, +y north) before any geometry, and write in the brief what did not add up.

## A topic only (no drawing)

Research the building type first: typical footprints, bay widths, wall thickness, plinth and eave heights, roof
pitch or profile, openings, the yard and what stands in it. Write `plan.json` from that (the example's is a full
pattern: lot, contours, buildings with bays / rooms / openings / furniture, yard, fence and gate, tree, path, items,
materials), then draw the sheet: `python3 <skill>/scripts/draw-sheet.py <project>` and look at it. The sheet is part
of the film - its labels, washes, legend and elevation are the first thing a viewer reads - so judge it like a still.

`draw-sheet.py` draws what `plan.json` has: the lot and its dashed boundary, contour lines broken at the lot, a
green wash, rubble walls stone by stone (back and ends), the timber front with posts and door swings, room washes by
floor kind (`boards` hatched, `paper`, `earth`), names beside each building (`label_end`), the yard, the fence with
its gate, the tree (wash + fruit dots), items (jars, pots: `shape: circle`), the path stones, dimensions, the first
building's front elevation (`roof: thatch` a loaf, anything else a pitched band), a materials legend with washes,
the north arrow, the scale bar and the title block. A building type it does not draw yet: add a function to it in
the project (copy the script next to the project) rather than leaving the sheet blank.

## A sketch, a plan, a photo of one

1. Photograph it straight down, evenly lit. A skew of a few degrees is fine; a perspective view is not.
2. Pick two points whose metres you know (two corners the drawing dimensions) and calibrate:
   `python3 <skill>/scripts/calibrate.py <project> --image plan.jpg --a 412,1630:0,0 --b 1580,522:14,14`.
   It writes `sheet.png`, `sheet.json` and `grid.png` (a metre grid over the image).
3. **Trust the labels over the pixels.** An image model drew a 14 m square 745 px wide and 670 px tall (blueprint's
   courtyard sketch); the house was built a true 14 x 14 and the sheet mapped with the labels. If the two axes'
   scales differ by more than 3 %, `calibrate.py` says so: re-shoot, or `--anisotropic` when the drawing itself is
   stretched.
4. Walls: from a plan's poché (the grey or black fill) at the scale bar's px/m; from a sketch, along the drawn lines.
5. **Doors and windows by hand on `grid.png`.** Automatic opening detection put doors across the middle of rooms on
   blueprint's apartment plan. Read each opening's wall, centre, width, and, from the elevation or the type, its
   height and sill.
6. Furniture from the plan's symbols, at their drawn size.
7. List what does not add up (a dimension string that does not sum, a door wider than its wall, a stair with too few
   risers) and decide each in the brief.

A brochure plan or a sketch the person brings is theirs: it stays out of the repo unless they own it and say so.

## The numbers every building needs

lot · footprint · wall thickness · plinth height · floor level · wall top · eave · ridge · overhang · bays (or grid)
· rooms and their floors · every opening (wall, centre, width, height, sill, open or shut) · furniture (position,
size) · the focal point (where the wave starts) · what stands on the site (trees, walls, paths, water).
