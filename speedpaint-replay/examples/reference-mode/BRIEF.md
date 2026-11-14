# 벚꽃 노을 — speedpaint-replay brief (reference mode)

## Reference
`reference.jpg`: generated with ElevenLabs (model `gpt-image-2.5-sunburst`, 4 variations, the first chosen; it came
out 1280×720 and the square was cropped at x 250). Prompt:

> Square 1:1 anime-style illustration, bust portrait of an original character: a young woman with long wavy silver
> hair tied loosely with a red ribbon, amber eyes, gentle smile, looking slightly to the right, wearing a navy school
> blazer over a white shirt. Golden-hour sunlight from the right, soft pink cherry blossom petals drifting, blurred
> spring park background with warm bokeh. Clean dark line art, cel shading with crisp shadows and soft highlights, rim
> light on the hair, rich warm colours, high detail face, professional anime key visual quality. No text, no logo.

## One line
The replay paints the picture the way a person would: a silver-haired girl in golden-hour light under cherry blossoms.

## What the agent saw (plan.json, read off the gridded picture in quadrants)
- construction: cranium ellipse (420, 250, r ≈ 255), the face's centre line curving right with the turn, the eye line
  leaning 13°, nose and mouth lines, both eye ellipses, the ear, the jaw, the neck, both shoulder lines, two gesture
  lines for the hair
- materials, in paint order: skin (face + neck, ear) · eyes · hair · ribbon (the hair ribbon and the tie) · shirt ·
  blazer · petals · background (the rest); each a rough lasso with sample points for its shades
- order of work: eyes → face → hair → body

## Measuring
`node ../../scripts/from-image.mjs reference.jpg --plan plan.json --out ref.js --debug out/ref`
Result: 15 construction lines, 608 ink strokes (450 drawn lines + 158 contour strokes; 406 fainter lines left to the
detail pass), 8 flats, 42 tone shapes (crisp and soft-brush), 1,565 airbrush dabs, 1,200 detail strokes. Predicted finish: mean error 4.4 %.

## Body marks (read off the picture, art units)
eyes L (424, 271, 132 × 63) and R (646, 322, 97 × 63): she faces right, so R is the far, narrower eye; nose (597, 389);
mouth (521, 458); chin (479, 569); ear (181, 333) on the back of the head; neck (333, 653); shoulders (83, 778) and
(889, 722). Pose: facing right, head yaw 30°, roll 13°, pitch −4°; torso yaw 10°, roll −4°.

## Stage timings (seconds)
rough 5 · line 16 · flat 5 · shadow 6 · highlight 5 · finish 10 · hold 3 → 50.6 s

## Review log
| round | what failed | fix |
|---|---|---|
| 1 | first version stamped the picture: 633 colour patches, 906 tone patches, 4,246 dabs, lines as 721 dashes in nearest order (owner: "this is not how a person paints") | rewritten as a painter's process: construction → ink → one flat per material → tone shapes → blending → detail → line colour |
| 2 | "bucket fill inside the lines" gave one cell covering 99 %: this picture's lines are thin and open | materials from the agent's rough lassos, edges snapped by colour |
| 3 | line art fat and blobby | width measured at half the line's own darkness; widths smoothed along the stroke |
| 4 | line art in dashes | chains joined across short gaps when both ends point at each other; specks dropped; 450 strokes inked |
| 5 | the nose was not inked (short, faint) | strokes in early focus boxes rank higher |
| 6 | the blush was a hard-edged patch | each tone shape's edge softness measured; soft shapes use a soft brush |
| 7 | finish lacked fine hairs and lash weight | detail strokes target the picture itself outside the ink |
| 8 | check.mjs + body sheet; render 33 s for 50.6 s (the first version took 46 min) | pass |
