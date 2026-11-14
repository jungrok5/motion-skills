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
The replay draws toward the picture: a silver-haired girl in golden-hour light under cherry blossoms.

## Measuring
`node ../../scripts/from-image.mjs reference.jpg --out ref.js --colors 22`
Result: 46 rough contours, 721 line strokes, 633 flats, 484 shadow and 422 highlight regions, 4,246 detail dabs.

## Body marks (read off the image by hand, art units)
eyes L (424, 271, 132 × 63) and R (646, 322, 97 × 63) — she faces right, so R is the far, narrower eye; nose (597, 389);
mouth (521, 458); chin (479, 569); ear (181, 333) on the back of the head; neck (333, 653); shoulders (83, 778) and
(889, 722). Pose: facing right, head yaw 30°, roll 13° (the eye line leans 13°), pitch −4°; torso yaw 10°, roll −4°.

## Finish (the author's own, over the measured picture)
A faint warm glow from the sunset side, a little grain, a soft vignette.

## Stage timings (seconds)
rough 4 · line 14 · flat 6 · shadow 5 · highlight 4 · finish 6 · hold 3 → 42.6 s

## Review log
| round | what failed | fix |
|---|---|---|
| 1 | check: big flats "popped" — 633 small regions starved the big ones of time | engine: fill time ∝ brush travel + area, small constant; every region over 3 % of the picture gets ≥ 5 frames |
| 1 | the pop check itself compared whole frames, so many tiny fills in one frame looked like a pop | pop check draws each big fill alone at its first frame's progress |
| 2 | the finish glow made the picture hazy next to the reference | glow .35 → .14 |
| 2 | check.mjs + body sheet | pass |
