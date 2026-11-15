# BRIEF — subject → design, written before any code

Copy this into the project as `BRIEF.md` and fill it in. The brief decides the picture; `art.js` only draws it.
Keep the review log at the bottom: every round of stills adds a line.

```markdown
# <title> — speedpaint-replay brief

## Reference (reference mode only)
image file · where it came from (a drawing, a generated image + tool + prompt, a photo)

## One line
<who / what>, <doing what>, <in what light>.            e.g. "A girl with a black bob by a rainy window at dusk."

## Composition
- crop: bust / half body / full figure / object close-up / scene
- subject placement (art units, 1000 × 1000): head centre, chin, shoulders / object axis
- facing: left / right / front; head yaw, roll, pitch; torso yaw, roll        (characters: s.setPose)
- background: what is behind, and how it supports the light (a window, a wall, sky, a table)

## Design
- character: hair (shape, length, parting, colour), eyes (shape, iris colours), face (age, mood), clothes, one detail
  that makes them theirs.
- object / scene: the parts, the materials, what makes it this one

## Palette (per material: base / shadow / highlight) and light
| material | base | shadow (multiply) | highlight (screen) |
|---|---|---|---|
| skin | | | |
| hair | | | |
| … | | | |
- key light: colour, side, hard or soft
- rim / bounce: colour, side
- line art: ink colour, and the tint it warms to in the finish

## Finish
What the last stage adds that says the mood (rain on glass, bokeh, sun rays, steam, petals, a lamp glow, a vignette).

## Stage timings (seconds)
rough · line · flat · shadow · highlight · finish · hold  (line art is the longest; total 25–60 s)

## Review log
| round | what failed (rubric line) | fix |
|---|---|---|
```

## Still rubric — score every review round
Render `--stages` (end of each stage + finished) and `--sheet 24 --scale .5`, and crop the face / subject at full size.
Each line is pass / fail; fix every fail before rendering the MP4.

1. **Rough reads as construction.** Head circle, centre line curved by the turn, eye line, jaw, neck, shoulders (or axis
   and ellipses for an object). The proportions are already right here.
2. **Line art alone reads as the picture.** Contours are thicker than inner lines, and the ends taper. There are no
   stray strokes outside the subject and nothing important is missing. The eyes carry the most weight.
3. **Flats alone read clean.** Every region filled, no gaps between hair and skin, no flat leaking past its lines; the
   background is painted (check.mjs: card covered ≥ 60 %).
4. **Shadows follow one light.** The key side is lit and the far side shaded. There is a cast shadow under bangs, chin
   and collar. Shadows are crisp on skin and cloth, and never spill onto a part that covers the region (the visible-area
   clip handles this, so look for it anyway).
5. **Highlights are few and placed.** Hair sheen follows the head's curve; rim light on the edge away from the key;
   catchlights in both eyes on the key side; no highlight floating off its part.
6. **The finish adds mood without hiding the drawing.** The lines are still readable, and the face is not washed out.
   No hard edges from glow polygons; the vignette is gentle.
7. **The face turns one way** (characters). The far eye is narrower, and the nose and chin point the way the face
   turns. The ear is on the back of the head, and the neck and shoulders are possible. Open out/<name>-body.png and look
   at the mirrored panel.
8. **It moves like a making.** In the sheet, every stage is visible. The rough fades under the line art. The flats are
   painted character first, background last. Nothing pops (check.mjs). The stylus is on the tip.
9. **It is this subject.** Nothing in the picture is carried over from the starter or the example unless the brief asks
   for it.
