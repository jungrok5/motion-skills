# REFERENCE — reference mode: the replay draws toward the user's own picture

The source post ends with a question: did the model secretly trace the original image? Reference mode does draw
toward a target image, openly. It is for the user's own drawing, or one they may use. The replay shows that picture
being made: blue rough, line art, brushed flats, shadows, highlights, finish.

## What may be used
- The user's own illustration, a commission they own, or an image under a licence that allows it (CC0, CC BY with
  credit). Write in BRIEF.md who made it and on what terms.
- Not: someone else's art, fan art of an existing character, logos, brand art, screenshots of shows or games.
  "It's only a test" does not change this.
- Every mark is still a code item: regions, strokes, dabs. No bitmap is pasted or faded in, so the note on the page
  (「선도 색도 코드로 그리고 있습니다」) stays true.

## How it measures (scripts/from-image.mjs)
| stage | measured from | becomes |
|---|---|---|
| rough | heavy blur → difference of Gaussians at a large scale → thinned → the 46 longest contours | blue pencil lines (loose) |
| line art | difference of Gaussians on luminance (σ .7 vs 2.2, dark side) → Zhang–Suen thinning → traced, fragments joined when they continue straight on → the strongest `--lines` | tapered pen strokes; width and opacity from darkness; colour = the picture's colour darkened, pulled toward the ink (`inkMix`); drawn in nearest-next order from the top |
| flats | the picture softened → k-means in Lab (`--colors`, default 18) → majority filter → small regions merged → connected regions → outlines grown 1.8 units (no paper seams) | one flat per region, its mean colour; z = biggest first; time = nearest the centre first, big border-touching background last |
| shadow | where the picture is darker than its flats (two levels) | multiply regions, colour = measured ratio |
| highlight | where it is lighter (two levels) | screen regions, colour = measured screen value |
| finish | where the stages above still miss: oriented ellipses (along the edges) in the picture's colours, coarse → fine, up to `--dabs` | one "detail brush" fx that lays them in over the finish |

Options: `--colors 18` (more = closer, more regions), `--lines 1600`, `--dabs 7000`, `--res 720` (analysis
resolution), `--fit cover|contain`. It takes about 4 s and is deterministic: the same image and options give the same
ref.js.

## Using it
```bash
node <skill>/scripts/new-piece.mjs my-piece --from reference-mode
cd my-piece && node <skill>/scripts/from-image.mjs my-drawing.png --out ref.js
node <skill>/scripts/check.mjs piece.html && node <skill>/scripts/render.mjs piece.html --stages --scale .5
```
In `art.js`: `addReference(s, REF, { inkMix, lineScale, dabs, stages })`, then add your own finish (grain, a glow, a
vignette) and the body marks. For a character, read the eye boxes and marks off the image (`s.markEye`, `s.mark`,
`s.setPose`); check.mjs then proves the face turns one way as for a designed piece.

## Tuning
- The flats look posterised → raise `--colors` (24–32). The line art is broken → lower the line threshold in the
  script (`-.022`), or raise `lineScale`.
- The line art is too faint over a painterly picture → `inkMix: .8`, `lineScale: 1.5`.
- A flat, cel-shaded picture needs fewer dabs (`dabs: .3`); a painted one more.
- The stage timings matter more than in a designed piece: give the line art and the flats enough seconds that the
  making reads (line 10–14 s, flats 5–6 s).

## Limits
The result is a painterly re-making of the picture, not a copy: thin details (single hairs, eyelashes, text) soften,
and line art is found from dark lines, so a picture without line art gets edge lines instead.
