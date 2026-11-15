# BRIEF — 참았던 숨 · Held Breath

Worked example: a story that is not in the source post, run through the whole flow (brief → translation → art.js → check →
stills scored). Render: `node ../../scripts/render.mjs art.js --scale 2` (3840×2160).

## The story (as given)

> 몇 달을 기다린 결과 발표 날. 퇴근 버스 맨 뒷자리에서 휴대폰이 짧게 진동한다. 숨을 참고 연다. 합격.
> 버스 안이 너무 조용해서 소리를 지를 수가 없다. 한 정거장 일찍 내려서 언덕길을 뛰어 올라간다. 겨울 공기에 숨이 하얗게 나온다.
> 집 계단에 들어서자 된장찌개 냄새가 난다. 엄마가 문을 열고, 내가 말하기도 전에 운다.

## Feeling inventory

| beat | feeling | weight | temperature | motion | light |
|---|---|---|---|---|---|
| months of waiting | heaviness, a low ceiling over everything | 4 | cold | none, pressing down | dim, flat |
| the buzz, the held breath | stillness, everything compressed into one point | 3 | cold | frozen | one point about to break |
| 합격 | a burst: light breaking through | 5 | hot | sudden, upward | the brightest thing in the sheet |
| can't shout on the quiet bus | joy held in, almost too big to contain | 4 | warm inside, cool outside | swelling, twisting | glow behind a lid |
| running uphill in the cold | lightness, momentum, clean air | 3 | cold, clean | rising, streaming | crisp, sparkling |
| the smell on the stairs | home, being expected | 3 | warm | slow | low gold, small windows |
| mother cries first | being seen, overflow | 5 | warm | spilling over | light spilling onto everything |

Top feelings (what a stranger should name): **release after long waiting**, **joy that cannot stay down**, **warmth in the cold**.

## Never drawn

- bus, seat, window glass
- phone, screen, message, notification
- person, people, mother, face, hand, tears
- hill road, stairs, steps, door, house number
- stew, pot, food, kitchen

## Translation (feeling → what carries it in the picture)

| feeling | carried by |
|---|---|
| months of waiting | a low ceiling of slate-violet cloud over two thirds of the sky; slow, heavy, dark strokes |
| the held breath | the whole sheet holds still: frozen river, windless snow; the only movement is in the sky |
| the burst | one irregular tear in the ceiling, right of centre, the heaviest pressure and the lightest colour in the sheet (cream-gold → apricot → rose) |
| joy held in | a murmuration: thousands of birds turning as one body inside the light, a few breaking away toward us |
| running in cold air | mist on the ice, steam bent by the wind, frost sparkle on the snow |
| home, being expected | a far bank with many small lit windows; no single house is "the" house |
| overflow | the tear's light spilled down onto the river as a broken column, and into the reeds' plumes in the foreground |

## The one picture

A frozen river at winter dusk under a low ceiling of cloud, torn open right of centre where gold pours through; a
murmuration turns inside the light; far windows glow on the opposite bank; snow drifts and reeds in the foreground.
The eye goes: the tear (1) → the murmuration (2) → the gold column on the ice (3) → the windows (4).

## Composition (16:9, every pixel worked)

- Sky 0–650 (60 %): the ceiling's underside lifts away round the tear at x ≈ 1250 (right third), lower deck of small
  clouds 470–590 in perspective.
- Far bank 600–650: a dark band (the darkest value) so the light above it reads brighter.
- River 650–860: horizontal strokes; the reflection column under the tear leads the eye down.
- Foreground 830–1080: drifts as ridges (light crests, blue shadows), reed clumps framing left and right.
- Corners: top-left dark cloud, bottom corners snow + reeds — nothing left as paper.

## Palette (90s cel-era dusk)

- light: `#fff3d6 #ffe2a0 #f8b487 #ea8f9c` (cream-gold → apricot → rose)
- sky/cloud: `#a77fbf #6a64ad #434a8f #2c356f` (lavender → violet → slate)
- lit cloud ramp: `#4b4f97 #8b78b8 #e795a2 #f9c08e #fff0cf`
- snow: `#4e5aa0 #7f84c4 #b9a6d6 #f0c5c6 #fde8d6` (blue shadow → pink light)
- accents: window gold `#ffd56e`, bird violet `#4b3d78`
- logic: shadows are coloured (blue-violet, never grey); light is warm; mid-tones saturated; no black, no white — the
  darkest is `#1f2450`, the lightest `#fff6e0`.

## Tools (5)

| tool | role | why |
|---|---|---|
| soft pastel | block-in on its side, mist, the dust in the rays | the grain shows through: air, cold, haze |
| oil pastel | cloud masses, the tear, ice, snow | waxy, opaque: light over dark is how the light *breaks through* the ceiling |
| coloured pencil | the murmuration, windows, pencil hatching in snow shadows | the smallest, sharpest marks go where the eye lands |
| Conté | tree line, reed stems, the darkest edge under the bank | dense dark accents, sparingly |
| kneaded eraser | rays pulled out of the sky | light made by taking pigment away, the way a hand does it |

## Order of work (stages)

block-in → cloud ceiling → light → far bank → river → flock → foreground → accents

## References

None given. (If a folder is given: `scripts/palette.mjs` for colour, and notes on mark types — never its subjects.)

## Review log

| round | still | score /20 | what changed |
|---|---|---|---|
| 1 | first full render | 9 | the tear read as a sun disc; rays pointed sideways; birds invisible; drifts were balls; paper speckle everywhere |
| 2 | ceiling as a bank with rolls, irregular tear, ridged drifts | 13 | rolls read as bubbles (each lobe shaded alone) → shade the mass as one body (`lobe: 0.3`), flat floors on the low deck |
| 3 | rim line removed, murmuration body in the light | 15 | the murmuration was a closed ring (a halo) → an open, thick-and-thin ribbon; rays blended |
| 4 | final | 17 | feeling first 2 · nothing literal 2 · hand 2 · every pixel 2 · values 2 · colour 2 · depth 1 (lower deck as bright as the near snow) · detail at focus 1 (windows small) · its own picture 2 · would you hang it 1 |
