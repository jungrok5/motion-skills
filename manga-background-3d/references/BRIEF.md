# BRIEF — topic → sets → film

Write the project's `BRIEF.md` from this before any code. The topic is a story (a manga, a webtoon, a chapter) or a
place; the brief turns it into the handful of locations its pages need, then into a short film that shows those sets
turning from clay into manga backgrounds.

```markdown
# <title> — BRIEF

## ONE LINE
<the story or place in one sentence, and why its backgrounds matter: "a girl who grows up above her family's
laundry shop — the shop, the rooftop, the alley and the bus stop are where every chapter happens">

## Locations (3–5)
For each: the name shown in the letterbox (fits in ~42 % of the width), the mood (day / dusk / night) and why,
and what makes it THAT place — the 4–8 things a reader must recognise. Then what the camera sees first.
| id | name | mood | must read | built from |
|---|---|---|---|---|
| shop | 동네 세탁소 | day | garment rail in covers, counter + till, press table, sewing machine, price list, curtained door to the house | room(), counter, shelf, + garment(), pressTable(), sewingMachine() in scenes.js |

## Props this story needs (not in the kit)
<each a small function in scenes.js built from primitives: what it is, its parts, real sizes in metres>

## Light
Per location: sun direction (towards the sun) and why — windows that throw patches on a floor, a low side sun for
long shadows across stairs, light from above in a tower; night: which things glow (≤ 8 point lights), what the
sky does.

## Shots (one beat each, 1.8–7 s; the film ~20–40 s)
| # | scene | mode (model / wipe / manga) | camera (pos → pos, look, fov) | caption |
|---|---|---|---|---|
The film opens on the clay model and wipes to manga; at least one more wipe later; the last shot is a card.
Captions are the film's voice, written for THIS topic: short, plain claims about what was built and how freely it
can be drawn — never the source video's lines.

## Card
<1–2 lines + a small sub line>

## Page (optional)
<3–5 panels: which shot and moment each panel is, its rect on the page, the narration boxes. No characters — the
artist draws them.>

## Review log
<date — what failed in the stills, what changed>
```

## Still rubric (score each 1–5; fix anything under 4 before rendering)

Render `render.mjs piece.html --shots --scale .5` (and `--page`) and score:

1. **It is that place.** Without the caption, a reader names the location from its 4–8 must-read things.
2. **It reads as a manga background.** Paper white dominates a day frame; greys are flat bands with soft marker
   edges; black is line, not fill (except night skies and deliberate darks). No photo-like gradients.
3. **The pen has habits.** Lines overshoot at corners, bow a little, taper; long edges sometimes split in two reaches;
   the odd doubled line. No ruler-perfect wireframe, and no scribble either.
4. **Perspective sells it.** Floors, ceilings and walls carry seams (tiles, boards, panels) that converge; the camera
   height is a person's (≈1.5 m) unless the beat asks for a high or low angle.
5. **Density is right.** Near things carry detail, far things simplify (detail props thin out; far buildings take
   `simple` windows). Nothing muddy (ink ≤ 30 %), nothing empty (≥ 60 strokes).
6. **Light tells the time.** Day: sun patches, cast shadows in one direction. Night: dark flat sky, glowing windows,
   lamps that bloom, light pools under them.
7. **Glass is glass.** Windows read white with diagonal glare; see-through glass (`see: true`) only where the
   story needs what is behind it (a lantern's lens, a shop's shelves).
8. **The wipe is a reveal.** The model side is plainly a grey 3D model; the line between them moves at a readable
   pace (≥ 0.8 s); the label flips at the middle.
9. **Text is clean.** Location name top-left, mode label top-right, caption bottom-centre, all inside the bars; signs
   in the set are legible where the camera is close.
10. **Nothing flickers.** Play the shot (or check.mjs): no surface shimmers between two tones as the camera moves.
11. **The camera breathes.** A slow dolly, push or roll per shot; no whips; never inside or against geometry.

Log failures in the project's BRIEF.md under Review log, fix, render again. Then `check.mjs` must pass.
