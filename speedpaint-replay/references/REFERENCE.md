# REFERENCE — reference mode: draw toward a picture the way a painter would make it

Give the skill a picture and the replay shows that picture being made. The point is the *process*, not the
pixels. A digital painter builds the construction, inks the lines, fills one flat colour per material, lays shadow
shapes and light shapes, blends, draws in the detail and colours the lines. Reference mode reads the picture into
exactly those steps.

Two readers work together:
- **the agent** can *see* the picture, so it says what things are: where the head circle and the eye line go, which
  area is skin and which is hair, what gets drawn first. That goes into `plan.json`.
- **`scripts/from-image.mjs`** cannot see meaning but measures precisely: where each line runs and how wide it is, where
  one material ends and the next begins, which few colours shade it, where the edges are soft.

Every mark is still a code item (strokes, regions, soft dabs). No bitmap is pasted or faded in.

## Steps
```bash
node <skill>/scripts/new-piece.mjs my-ref --from reference-mode && cd my-ref
node <skill>/scripts/from-image.mjs picture.png --out ref.js --debug out/ref        # 1. first pass, to get the sheets
#    look at out/ref/grid.png (coordinates) and lines.png, then write plan.json       2. say what is what
node <skill>/scripts/from-image.mjs picture.png --plan plan.json --out ref.js --debug out/ref
#    look at out/ref/materials.png (the flats), tones.png, sim.png (predicted finish)  3. fix the plan, repeat
node <skill>/scripts/render.mjs piece.html --stages --scale .5                        # 4. the real stages
node <skill>/scripts/check.mjs piece.html && node <skill>/scripts/render.mjs piece.html
```
To read coordinates accurately, cut the gridded picture into quadrants and look at each:
`ffmpeg -i picture.png -vf "scale=1000:1000,drawgrid=w=100:h=100:c=black@0.5,crop=500:500:0:0,scale=1000:1000" qa.png`.

## plan.json (art units, 1000 × 1000)
```json
{
  "construct": [["ellipse", 420, 250, 255, 250, 0], ["line", 560, 40, 576, 300, 495, 598], ["line", 320, 242, 725, 338]],
  "materials": [
    { "name": "skin", "poly": [[330,120, 545,60, 705,300, 492,603, 232,970, 240,500]], "samples": [[470,345], [300,560]], "tones": 4 },
    { "name": "hair", "poly": [[100,0, 720,0, 998,650, 600,1000, 0,1000, 20,140]], "samples": [[250,100], [750,250], [180,580]] },
    { "name": "background", "rest": true }
  ],
  "focus": [["eyes", 335, 215, 165, 100], ["face", 300, 150, 420, 470], ["hair", 0, 0, 1000, 620], ["body", 0, 620, 1000, 380]]
}
```
- **construct**: the rough. What a painter blocks in first: the cranium ellipse, the face's centre line (curved by the
  turn), the eye line, nose and mouth lines, eye and ear ellipses, the jaw, the neck, the shoulder lines, a gesture line
  for the hair. `["ellipse", cx, cy, rx, ry, rotDeg]`, `["line", x, y, x, y, …]` (a smooth curve through the points).
- **materials**: one entry per thing that gets its own flat colour, in paint order (skin first, background last).
  `poly` is a rough lasso: one or more polygons, within about 20 units of the real edge. Lassos may overlap (hair over
  the face): the colours decide. `samples` are points whose colour is typical for the material, one per shade (lit,
  mid, shadow): give them whenever a lasso overlaps another material. `tones` forces how many colours shade it.
  `"rest": true` is whatever no lasso claims.
- **focus**: boxes in the order they are drawn; a stroke belongs to the first box that holds its middle. Eyes first.
- **silhouettes**: how many big material outlines to add to the rough (default 0 with a construction, 6 without).
- `ink` (line colour while drawing), `band` (how far from a lasso the edge may move, default 26).

Without a plan the tool still works: no construction, materials by colour clusters, strokes drawn nearest-next. The
stages will look like a painter's, but nothing will be *about* anything. Write the plan.

## What the tool measures
| step | how | becomes |
|---|---|---|
| lines | thin dark structures (black top-hat on luminance, hysteresis) → skeleton → chains joined through junctions and across short gaps when they run straight on; width = full width at half the line's own darkness; colour = its darker half | ink strokes with a width that changes along them, drawn in the ink colour; `color2` = their own colour |
| which lines | the longest, darkest, widest `--lines` (450), boosted inside early focus boxes (a nose is short and faint and matters), demoted outside every lasso (nobody inks a blurred background) | the rest are left to the detail pass |
| contours | where two materials meet and the picture has no drawn line (black hair against the sky, a jaw against a scarf): the boundary, unless a drawn line already covers 80 % of it; `--contours` (200) | ink strokes of even width; in the trace they take the darker side's colour and all but disappear |
| materials | per pixel: the nearest material by colour (its samples, or what lies in its lasso alone), with a penalty that grows outside the lasso; majority filter; stray islands joined to their surroundings | one compound region per material, filled with its base colour |
| tones | k-means in Lab inside the material: as few colours as describe it; the largest is the base; darker = shadow, lighter = light; shapes smoothed; each shape's edge measured (colour step ÷ gradient) | crisp shapes for hard edges, soft-brush shapes (blurred, clipped to the material) for soft ones: a cast shadow and a blush of the same colour are told apart |
| airbrush | what the tones still miss at low frequency: soft dabs in rows, coarse then fine, inside the material | one blending pass per material |
| details | where the picture (lines included) still differs outside the ink: strokes traced along the picture's own direction, widest error first | fine hairs, lashes the pen left thin, iris and lip accents |
| order | focus boxes, then nearest-next, each stroke entered from its nearer end | the stylus moves like a hand, not a scanner |

Options: `--lines 450`, `--contours 200`, `--details 1200`, `--detail-thr .075`, `--materials 8` (clusters without a plan),
`--line-weak .024 --line-strong .06` (line detection), `--fit cover|contain`. About 10 s; deterministic.

## In art.js
```js
import { addReference } from 'sp/reference.js'; import { REF } from './ref.js';
const s = new Sketch({ ink: REF.ink, meta: { title: '…' } });
addReference(s, REF);              // options: stages, lineScale, details (fraction kept), trace: false
s.setPose({ … }); s.markEye('L', x, y, w, h); s.mark('nose', x, y);     // body check, read off the picture
```
After `addReference` you may add your own finish (grain, a glow, a vignette). Stage seconds that read well:
rough 5 · line 16 · flat 5 · shadow 6 · highlight 5 · finish 10.

## Judging it (besides the rubric in BRIEF.md)
- **The flats stage must look like a painter's flats**: a handful of colours, each material one colour, the picture
  readable from them alone. If a material is split or two are merged, fix the lasso or the samples.
- **The line stage must look inked**: eyes first, strokes with a pen's width. If it looks like dashes, lower
  `--line-weak`; if it looks like noise, raise it.
- **Soft things soft, hard things hard**: a blush is a soft shape, a cast shadow a crisp one.
- The finish is a painter's version of the picture, not a copy: hair fine as thread and noise-level texture soften.

## Limits
- A picture without line art gets few ink strokes; its edges are then carried by the flats and tones.
- The source's resolution limits the line art: at 720 px lines are 1–2 px wide and break up more. Prefer 2K and
  ask for "clean dark line art, clear continuous outlines" when generating a reference (compare the two samples).
- The plan's lassos are the agent's judgement: where two materials have the same colour and the lasso is loose, the
  edge follows the lasso.
