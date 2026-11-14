# 비 오는 창가 — speedpaint-replay brief (worked example)

A subject that is in neither the source post nor the starter: a girl, cool dusk light, rain. Made through the whole
flow (brief → rough → line → flats → shadow → highlight → finish → check → stills scored) to prove the skill designs a
new piece rather than re-rendering one.

## One line
A girl with a black bob by a rainy window at dusk, looking out; cool window light on her face, a warm lamp behind her.

## Composition
- crop: a tight bust, the face filling the card; the whole picture framed 1.5× about her face (`FRAME`)
- head: cranium centre ≈ (525, 355) before framing; chin (466, 606); the head leans 4° (`HEAD.rot = -0.07`)
- facing: left (toward the window). Head yaw −30°, roll −4°, pitch −6°; torso yaw −12°, roll 2°
- background: a window on the left (glass, frame, mullion), a dark warm wall on the right; her soft shadow on the wall

## Design
- hair: a black (navy-black) chin-length bob, side parting toward her left, bangs to the brows, side locks in front of
  both cheeks
- eyes: large, iris navy → periwinkle, looking out of the window (irises shifted left); heavy upper lids
- face: young adult, calm, slight blush
- clothes: an oversized cream knit sweater with a ribbed crew neck
- her detail: the cool sheen on black hair against a warm rim, the one thing that says "dusk window"

## Palette and light
| material | base | shadow (multiply) | highlight |
|---|---|---|---|
| skin | #f8e1d2 | #efc4c4, nose #e2aab3, blush #f4a9ab | #cfe0ff window light, white glints |
| hair | #2c2d3d | #171823 | #8fa6d8 sheen (window), #f0a868 rim (lamp) |
| knit | #ece4d6 (collar #e2d8c8) | #aaa4bf | #e4ecff (window side), #f0a868 (lamp side) |
| wall / glass / frame | #463c4a → #2f2935 / #4d5f82 → #8ea6c4 / #cfc6bb | #2a2231 (her shadow) | — |
- key light: cool blue window light from the picture's left (the side she faces)
- rim: a warm lamp behind her on the right
- line art: #231c24, tinted to #3a2c40 in the finish

## Finish
City lights through the wet glass (warm and cool bokeh), rain streaks with drops, a cool light gradient from the
window, a warm lamp bloom at the upper right, the lines tinted, a gentle vignette.

## Stage timings (seconds)
rough 5 · line 15 · flat 6 · shadow 6.5 · highlight 5.5 · finish 5 · hold 3 → 46.6 s (source: 47 s)

## Review log
| round | what failed (rubric line) | fix |
|---|---|---|
| 1 | 4: skin shadows red, a "bruise" on the near cheek | lighter pink shadow colours; crisp jaw strip with `s.edge` |
| 1 | 2/3: bangs gappy — forehead showing to the hairline between locks | a bangs base flat under the locks |
| 1 | 5: eyes mostly white, irises small | iris .29–.3 × .66 of the opening, set higher; eyes 10 % larger |
| 2 | 7: the neck read long, the figure small in the frame | body up 36 (`BODY`), whole picture framed 1.22× (`FRAME`) |
| 2 | 5: hair sheen a sawtooth crown | short `lens` strands along the head's curve over a soft band |
| 3 | 4: shadows clipped to the neck / back hair darkened the face | engine: clips use the visible part of a region (LESSONS) |
| 3 | 6: a hard diagonal band from the window glow | glow covers the whole square |
| 4 | 5: irises off-centre after framing | engine: eye helper transformed every point (LESSONS) |
| 4 | 8: flats opened with white eyes on a dark wall | eyes after the skin, background last (`order`) |
| 4 | 8: the hair flashed in for one frame | engine: no paint before the brush moves; check.mjs "no pops" |
| 5 | check: stylus off the card on window and arm lines | lines start and end at the picture's edge |
| 5 | 7: body sheet — the face turns left as one, far eye .71 of the near; the mirror reads | pass |
| 6 | self-review against the source: thin, sparse line art; flat colour; small centred figure; eyes mostly white | 1.5× crop; hair `strands` 5, `fly`, `passes` 2; crisp terminator across the face; `shade` gradients on hair, neck, knit; sheen strands along each lock; iris .33 × .78, eyes .86 open; colour grade + grain in the finish |
| 6 | 4: raindrop specks on the face read as a rash, on the sweater as stains | removed: rain stays on the glass |
| 6 | 2: the bangs base showed as a straight line | its lower edge raised under the lock bodies |
