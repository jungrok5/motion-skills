# 은행잎 저녁 — speedpaint-replay brief (reference mode, second sample)

## Reference
`reference.jpg`: generated with ElevenLabs (model `gpt-image-2.5-sunburst`, aspect 1:1, resolution 2K → 2048 × 2048,
quality high; 2 variations, the first chosen; stored here at 1400 px). Prompt:

> Anime-style illustration, bust portrait of an original character: a young man with short messy black hair and round
> thin-framed glasses, calm half-smile, looking slightly to the left, wearing a mustard yellow knitted scarf and a dark
> green wool coat. Autumn evening: warm street-lamp light from the upper left, cool blue dusk sky, a few yellow ginkgo
> leaves falling, softly blurred city street behind. Clean confident dark line art with clear continuous outlines,
> crisp cel shading with distinct shadow shapes, a few soft gradients, rim light on the hair, professional anime key
> visual quality, high detail face. No text, no logo, no watermark.

Why a second sample: the first reference was 720 px with thin, soft lines. This one tests the claim "a larger picture
with clear line art inks better", on a different subject (dark hair, glasses, night light).

## One line
The replay paints the picture the way a person would: a boy in glasses and a mustard scarf under a street lamp at dusk.

## What the agent saw (plan.json, read off the gridded picture in quadrants)
- construction: cranium circle (520, 235, r 215), the face's centre line curving left, the eye line, nose and mouth
  lines, both eye ellipses, both lens circles, the ear, the jaw, the neck, a gesture line for the hair, two for the
  scarf, both shoulder lines, the lamp post and lantern
- materials, in paint order: skin · eyes · hair · scarf · coat · lamp · leaves · background (the rest)
- order of work: eyes → face (glasses, nose, mouth, jaw) → hair → body

## Measuring
`node ../../scripts/from-image.mjs reference.jpg --plan plan.json --out ref.js --debug out/ref`
Result: 20 construction lines, 604 ink strokes (450 drawn lines + 154 contour strokes (outlines where materials meet without a
drawn line: the black hair against the sky, the scarf, the coat)), 8 flats, 39 tone shapes, 1,425
airbrush dabs, 1,200 detail strokes. Predicted finish: mean error 4.0 %.

## Body marks (read off the picture, art units)
eyes L (328, 290, 55 × 30) and R (470, 288, 80 × 36): he faces left, so L is the far, narrower eye; nose (340, 378);
mouth (380, 416); chin (372, 505); ear (640, 345) on the back of the head; neck (500, 540); shoulders (140, 820) and
(900, 625). Pose: facing left, head yaw −30°, roll −1°; torso yaw −20°, roll −8°.

## Stage timings (seconds)
rough 5 · line 16 · flat 5 · shadow 6 · highlight 5 · finish 10 · hold 3 → 50.6 s

## Review log
| round | what failed | fix |
|---|---|---|
| 1 | the jaw, the hair and the coat had no outline: an edge between a light and a dark area is not a "thin dark line" | contour strokes where two materials meet without a drawn line |
| 2 | a third of the ink went into the blurred background | strokes outside every lasso rank low |
| 3 | hair and scarf outlines in dashes | an outline is kept whole unless a drawn line already covers 80 % of it |
| 4 | check: a contour stroke with no extent (a tiny closed loop smoothed to a point) | strokes without extent dropped |
| 5 | check.mjs + body sheet; render 29 s for 50.6 s | pass |

Compared with the 720 px sample: long clean strokes on the coat, the glasses and the face. The larger source helps.
Still weak: the lit, wispy hair edge at the upper left stays in dashes, and the knit texture is suggested, not drawn.
