# 다시 그리기 — speedpaint-replay brief (reference mode)

## Reference
`reference.jpg`, the finished 「비 오는 창가」 from this repo (`examples/rainy-window`), so the repo owns it. A user
brings their own drawing here instead: their own illustration, a commission they own, or an image they have a licence
for. Never someone else's art or a known character.

## One line
The replay draws toward the user's picture: a girl with a black bob by a rainy window, measured from the image.

## Measuring
`node ../../scripts/from-image.mjs reference.jpg --out ref.js` (defaults: 18 colours, 720 px analysis).
Result: 46 rough contours, 127 line strokes, 185 flats, 215 shadow and 196 highlight regions, 3,447 detail dabs.

## Body marks (read off the image by hand, art units)
eyes L (370, 455, 123 × 84) and R (565, 444, 174 × 93); nose (396, 548); mouth (461, 629); chin (468, 707);
ear (753, 445); neck (568, 851); shoulders (125, 944) and (990, 926). Pose: facing left, head yaw −30°, roll −4°.

## Finish (the author's own, over the measured picture)
A little grain and a gentle vignette.

## Stage timings (seconds)
rough 4 · line 12 · flat 6 · shadow 5 · highlight 4 · finish 6 · hold 3 → 40.6 s

## Review log
| round | what failed | fix |
|---|---|---|
| 1 | every flat region came out empty | closed-loop simplification (LESSONS) |
| 2 | white seams between all regions, then fat white outlines | regions grown outward with the right winding sign |
| 3 | line art in dashes, light grey lines over the eye whites | fragments joined; weak lines dropped; ink pulled darker (`inkMix` .65) |
| 4 | the line art faint over the painted finish | `lineScale` 1.25; analysis at 720 px |
| 5 | check.mjs + body sheet | pass |
