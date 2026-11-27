# 등대 포구의 밤 (A night cove under a lighthouse)

## Topic
A night cove under a lighthouse on a cliff: the beam turns, waves roll in to a dune, surf runs up the sand, the moon
glints on the water, the stars twinkle, sea oats bend in the sea wind. Korean on screen. A topic the source (a forest
waterfall) does not have.

## Picture (320 × 180 pixels, read at a glance)
- Subject and where the eye lands first: the red-and-white lighthouse on the right cliff, its beam sweeping left over the sky.
- Light: the moon top-left (cool, lights the left faces and lays a glint column on the sea); the lamp (warm accent).
- Depth: sky + moon + low headland on the horizon (far) · sea and cliff with the lighthouse (middle) · dune with sea oats and rocks (near).
- Palette family: night blues and violets (sky 8, sea 8, rock 6), muted sand (6), sage reeds (6); accent = the lamp's warm yellow, echoed by the beam and the oat heads.

## Layers (back to front)
| layer | label on screen | what is on it | static / drawn per frame / rigged |
|---|---|---|---|
| back | 하늘 · 절벽 · 등대 | sky, stars, moon, headland, still water under the sea, cliff, lighthouse, keeper's hut, dune, rocks | static (stars and lamp cycle) |
| sea | 바다 | three flows: open sea, surf along the dune, the moon's glint | static (all cycling) |
| light | 등대 불빛 | the beam as indices around the lamp | static (cycling, 18 clear slots) |
| reeds | 바람에 흔들리는 갈대 | four sea-oat clumps on the dune, two turf tufts on the cliff | rigged |

## What moves, and how
| thing | technique | ramp (slots) | rate | why this technique |
|---|---|---|---|---|
| beam | cycle (flow by angle) | beam 24 (2 × 4 lit, 16 clear) | 7 | a turning light is a fixed fan of indices — only the colours turn |
| waves | flow + cycle | sea 8 (one crest) | 4.5 | they move along a fixed direction forever |
| surf | flow + cycle | surf 7 | 7 | runs up the shore line |
| moon glint | flow + cycle | glint 7 | 8 | shimmer down a column |
| stars | cycle | stars 9 (one bright) | 2.5 | twinkle without moving |
| lamp | cycle | lamp 4 | 4 | a slow pulse |
| sea oats | rig | reed 6 + oat 2 | wind 1.15, 80 px/s | they bend, colour cannot do that |

## Flows
- sea — along: `34·log(y − 97 + 3) − 0.1·x` (toward the viewer and the dune; bands thin at the horizon), band 3; across: `x / (1.6 + 0.22·(y − 97))` (crests break into segments that widen near); mask: sea minus surf and glint.
- surf — along: distance up to the dune line, band 1.4; across: x / 5; mask: the 5 px before the dune.
- glint — along: y, band 1.5; across: x; mask: a column under the moon, widening downward, 80 % of pixels.

## Plants
- dune-1…4 at x 12, 40, 70, 104 on the dune line: 9 / 7 / 8 / 6 fronds, blades with every third a reed carrying an oat head, 26–46 px, spread 70°, amp 12.
- cliff-1, cliff-2 at x 232 and 306 on the cliff top: 5–6 short blades, amp 7.
- gust: strength 1.15, travelling 80 art px/s from left to right.

## Panels
| # | kind | source | crop, zoom | kicker | title | left | right | caption |
|---|---|---|---|---|---|---|---|---|
| 1 | cycle | beam | (236, 52), 3 | 팔레트 순환 | 불빛은 그려 둔 부채꼴, 도는 건 색뿐. | 고정된 인덱스 | 같은 픽셀, 도는 색 | 보라색이 순환 슬롯 24칸, 빛은 그중 8칸입니다. |
| 2 | flow | sea, surf, glint | (110, 120), 3 | 흐름장 | 파도에 방향을 주면 색이 해안으로 밀려온다. | 흐름 벡터 | 흐름장 + 팔레트 순환 | 화살표는 인덱스가 커지는 방향을 잰 값입니다. |
| 3 | rig | reeds | (62, 146), 6 | 바람 리그 | 한 번의 돌풍, 줄기 끝마다 다르게 휜다. | 갈대 컷아웃 | 줄기마다 관절 | 같은 돌풍을 끝으로 갈수록 늦게 받아 줄기가 따라 휩니다. |

## Timing
hold 3 · explode 1.7 · exploded 1.5 · 3 panels × 3.9 · fade .5 · back 1.1 · collapse 1.5 · end 2.6 = 23.6 s.

## Stills review
(answered from `render.mjs examples/lighthouse-cove --shots`, `--stills 8.6,12.5,16.4` and a contact sheet of the MP4)
- [x] **One place.** Moon, lighthouse and dune read at once as one cove at night; the lamp is where the eye goes.
- [x] **Each cycle reads as its thing.** The beam sweeps and thins into dither, waves roll toward the dune (slowed from 6 to 4.5 steps/s, it raced), surf runs up the sand, the glint shimmers, stars twinkle.
- [x] **Fixed indices.** Panel 1: only the beam's 24 slots are purple, the fan of stripes is plain to see over the dimmed cove.
- [x] **Flow.** Arrows point down and slightly left, where the bands travel; clipped to the view (they spilled out at first); none cross the cliff or the dune.
- [x] **Wind.** Roots planted on the dune line, tips lag 0.27 s, every clump sways in the holds; bends stay small and smooth.
- [x] **Layers apart.** Four planes, opaque cove furthest, beam and reeds readable on their glass, names in their colours, all inside the frame.
- [x] **Panels on a phone.** 54 px titles, 28 px labels, 26 px captions; 24 swatches with every 4th numbered, clear slots dashed; no overlaps (check.mjs → legible).
- [x] **One style.** One night palette, hard pixels, Bayer dither in sky, beam and sand.
- [x] **Back together.** The planes collapse to the opening picture, which holds 2.6 s.
- [x] **Designed for the topic.** A cove, a beam, waves, sea oats — none of the source's waterfall, gorge or ferns; every line says what this picture does.
