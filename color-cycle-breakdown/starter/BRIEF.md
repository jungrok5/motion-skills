# Campfire

## Topic
A campfire in a night clearing: flames climb, the ground glow pulses, sparks rise, stars twinkle, grass bends.
The starter — small on purpose (two panels); a new topic designs its own picture.

## Picture (320 × 180 pixels, read at a glance)
- Subject and where the eye lands first: the fire in a ring of stones, centre-bottom.
- Light: the fire (warm, lights the ground in rings); a dim violet sky glow at the horizon.
- Depth: sky + stars + far ridge (far) · near hill with pines (middle) · the clearing, fire, grass clumps (near).
- Palette family: night violets (sky 7, ridges 4 + 4), earth browns (5), grass greens (6); accent = the fire's orange-yellow.

## Layers (back to front)
| layer | label on screen | what is on it | static / drawn per frame / rigged |
|---|---|---|---|
| back | Sky & clearing | sky, stars, ridges, pines, ground with glow rings, stones, logs | static (stars and glow cycle) |
| fire | Flames | outer flame flow (two clear slots → tongues), hot core flow | static (cycling) |
| sparks | Sparks | 18 sparks rising and swaying | drawn per frame |
| grass | Wind-rigged grass | five clumps of blades and reeds with flowers | rigged |

## What moves, and how
| thing | technique | ramp (slots) | rate | why this technique |
|---|---|---|---|---|
| flames | flow + cycle | flame 9 (2 clear) | 13 | bands climb a fixed shape; clear slots make tongues |
| core | flow + cycle | core 6 | 15 | the hot centre flickers faster |
| ground glow | cycle (rings) | glow 6 | 5 | light pulses outward from the fire |
| stars | cycle | stars 8 | 3 | twinkle |
| sparks | drawn per frame | spark 3 | — | they really travel |
| grass | rig | grass 6 + bloom 2 | wind 1, 60 px/s | bending needs a rig |

## Flows
- flame — along: `146 − y` + noise (up), band 2.2; across: distance from the swaying centre line; mask: a teardrop with a ragged edge.
- core — along: `146 − y`, band 2; across: x; mask: the inner 45 % below y 118.

## Plants
- left / left-small / right / right-small / mid: 9 / 6 / 10 / 6 / 5 blades (every fourth a reed with a yellow head), 16–50 px, spread 64°, amp 11; two clumps carry red flowers.
- gust: strength 1, 60 art px/s.

## Panels
| # | kind | source | crop, zoom | kicker | title | left | right | caption |
|---|---|---|---|---|---|---|---|---|
| 1 | cycle | flame | (160, 128), 4 | Palette cycling | Nine colors climb. The pixels never move. | Fixed indices | Same pixels, rotating colors | Purple marks the nine flame slots; two are clear. |
| 2 | rig | grass | (282, 150), 6 | Wind rig | One gust, a different bend at every tip. | Grass cutout | Blade pivots | The tips lag the roots, so every blade follows through. |

## Timing
hold 3 · explode 1.7 · exploded 1.5 · 2 panels × 3.8 · fade .5 · back 1.1 · collapse 1.5 · end 2.6 = 19.5 s.

## Stills review
(answered from `render.mjs starter --shots` and `--stills 1.5,5.3`)
- [x] **One place.** A fire in a clearing under stars, pines on the hill; the fire is the one warm thing.
- [x] **Each cycle reads as its thing.** Flames climb with tongues, the core flickers, the glow pulses outward (was a sandy noise until the rings got solid), stars twinkle.
- [x] **Fixed indices.** Panel 1: the flame's nine slots in purple, the bands visible in the teardrop.
- [x] **Flow.** No flow panel in the starter; check.mjs measures both flame flows climbing (87 % and 100 %).
- [x] **Wind.** Roots planted, tips lag the base, every clump moves in the holds.
- [x] **Layers apart.** Clearing furthest, flames, sparks and grass nearer, names in their colours, inside the frame.
- [x] **Panels on a phone.** Titles 54 px, labels 28, captions 26, nine numbered swatches with two dashed (clear); no overlaps.
- [x] **One style.** One night palette, hard pixels, dithered sky and glow edges.
- [x] **Back together.** Returns to the opening picture and holds 2.6 s.
- [x] **Designed for the topic.** A campfire and grass, not the source's waterfall; the lines say what this fire does.
