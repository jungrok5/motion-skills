# LOOK — what makes it read as coloured pencil

Observed from the source's 14 s capture (a harbour town on a bright morning, a third-person walk) and its code. Each line
is a cause you can check in a still.

1. **Strokes belong to the surface.** Hatching on a wall runs one way and stays on the wall as the eye moves; on a
   roof it runs along the tile rows; on water it is level. Every vertex carries two fields and strokes are the level
   lines of each (`field`, `fieldBy`). If strokes are computed from screen space, the picture "swims" — the first thing
   that gives away a filter.
2. **Even spacing on the paper, at any distance.** Strokes stay ~4–5 px apart because the density is picked in whole
   octaves from how fast the field changes on screen, the in-between strokes fading in as a thing comes nearer. Far
   walls read as finely hatched, near ones as bold — never as noise.
3. **Colour is laid in layers on white.** The paper is the light. Warm yellow first where the sun is, the thing's own
   colour lightly all over, more of it in strokes pressed into the shade, then a blue-violet shadow pencil crossed over.
   So the lit side of a red house is pale pink-orange with strokes, its shaded side red crossed with violet — not dark red.
4. **The tooth.** Wax catches only on the paper's heights: every layer is broken by a two-scale noise, and the page adds
   flecks of pure white where the colour is light. It is what makes flat fills look like pencil.
5. **A soft outline from depth.** Where one thing ends against another or a surface turns a corner, a graphite line,
   pressed unevenly and fainter far off. It is found from the depth buffer (do neighbouring points lie on one flat?),
   so it needs real 3D corners: soft, slightly kneaded solids give a living line; razor boxes give a CAD line.
6. **Clouds are paper left bare;** the sky is blue strokes slanting long across it, a little violet under the clouds,
   warm round the sun.
7. **Water mirrors the town.** The line from the eye to the water, turned over, continues to the housefronts; where it
   meets one, the water is drawn with that front's pencil, broken by ripples. Sun glints are bare paper.
8. **The sheet is unfinished at the edges.** The drawing fades to bare paper along a torn, uneven line, and a caption
   is written in the corner in pencil handwriting ("the harbour, morning"). Together they frame each frame as a page.
9. **Bright, clear, storybook colours** — warm white walls, coral, butter yellow, sky blue, mint, lilac — on warm white
   paper. Nothing black: iron is slate, shade is violet.
10. **Small things move:** bunting flutters, washing sways, smoke curls as one pencil line, boats bob, gulls go round.
    A still town reads as a model; a breathing one reads as a place.

What this skill adds for films: the eye follows a planned path (shots), so each frame can be composed; low eyes over
water, a tripod on the far bank, a view from a bridge — the drawing holds at any angle because nothing depends on the eye.
