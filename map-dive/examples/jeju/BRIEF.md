# BRIEF — 제주 (Jeju Island)

A topic the source video never had (it showed Paraná, Brazil): an island in the sea, a volcanic cone, an old town.

## The place
- **Region**: Jeju Island, plus Udo to the east.
- **Outline source**: 36 lon/lat points traced by hand clockwise from the west tip (Gosan); Udo as a small blob.
  Projector centre 126.55 E, 33.38 N, `km: 6` → the island is ~12.5 units across.
- **One-line idea**: one volcano made the whole island — dive into the crater by the sunrise, then into the old town at
  dusk, and see the island's ring road light up at night.

## The toy map
- **Ground colours**: by distance from Hallasan (an ellipse, the island's shape): pale field green at the coast →
  greener slopes → a dark forest belt → bare brown summit; dry-grass patches low down, darker groves.
- **Painted**: the coastal ring road (glows at night), the 516 and 1100 roads over the mountain, two streams (Hancheon to
  Jeju city, the Cheonjiyeon stream to Seogwipo), a faint patchwork of stone-walled fields in the lowlands, a beige
  town patch + a night light per town, 11 town names (제주시 and 서귀포 bold), landmark names.
- **Landmarks as toys**: 한라산 → wide crater with a lake (`crater`, lake); 성산일출봉 → steep crater (`crater`);
  산방산 → one lavender peak (`mountain`); 천지연폭포 → `waterfall`; 우도 lighthouse; a stone guardian (돌하르방) by
  Jeju city (`statue`); oreum → seven small cones; wind farms west and east (`turbine`); horses in the mid-mountains;
  orange groves at Seogwipo and Namwon (`trees` orange).
- **Life**: a plane circling the airport, two boats, turbines turning, six pink clouds drifting.
- **Sea**: one sea slab offset 0.9 units around the island (painted shallows + foam on the coast), so the island sits in
  the sea and its soil lip still shows.

## The dives
| # | stage | what it is | landmark + pin label | why |
|---|---|---|---|---|
| 1 | `seongsan` | coast close-up, 1 unit = 50 m: crater cone with a grassy bowl, cliffs, a narrow neck, a village, stone-walled fields, sea | 성산일출봉 | the island's best-known sight; shows the volcano idea |
| 2 | `city` | Jeju old town, 1 unit = 20 m: grid at 8°, harbour to the north, the Sanjicheon stream, a plaza and a park | 관덕정 | the oldest building in town; the town falls into night |

## Timeline
| t | shot | camera | on screen |
|---|---|---|---|
| 0 – 4.6 | island | dist 15.2 → 13.6, yaw −9° → 3°, elev 40° | 제주 / Jeju Island · 1,850 km² |
| 4.6 – 6.5 | island → Ilchulbong | dist → 0.9, elev → 60°, yaw 20° | |
| 5.9 – 6.5 | dive (crossfade) | seongsan starts at dist 190, yaw 20° | |
| 6.5 – 11.7 | seongsan | settles at 44, slow orbit to yaw 56° | pin 성산일출봉 7.4 – 11.6 |
| 11.7 – 12.3 | rise (crossfade) | island from dist 0.95, yaw 60° | |
| 12.3 – 16.7 | island | glide west along the north coast to Jeju city | |
| 16.9 – 17.5 | dive (crossfade) | city starts at dist 240 | |
| 17.5 – 25 | city | settles at 34, orbit −14° → 30°; night 20.2 → 22.8 | pin 관덕정 18.9 – 24.6 |
| 25 – 26 | dissolve | island at night | |
| 26 – 30 | island, night | slow pull, yaw −16° → −5° | 제주의 밤 · credit |

## Text
제주 · Jeju Island · 1,850 km² · 성산일출봉 · 관덕정 · 제주의 밤 · map-dive · motion-skills · 제주시 서귀포 한림 애월 조천 구좌
성산 표선 남원 중문 대정 한라산 우도 천지연폭포 제주국제공항 · 관덕로 · 산지천

## Sound
`score.mjs` (92 bpm, D): pad + plucks by day, minor and slower at night, a whoosh on each dive and rise, chimes on the pins.

## Review (stills at 2, 9, 14, 19.5, 23.5, 28 s and sheets around each crossfade)
| criterion | pass? | what was fixed |
|---|---|---|
| outline reads as Jeju | yes | — |
| reads as a toy | yes | the first sea slab was flush with the land (no lip) and navy; the land now stands 0.13 above a painted sea with shallows and foam |
| names readable, not overlapping | yes | 0.13 → 0.19 units; 성산 and 성산일출봉 overlapped → moved 성산일출봉 north of the cone; 한라산 hid behind the cone → moved south |
| dives land where the map pointed | yes | yaw matched on both sides of each crossfade; city start 330 → 240 to match the map's last frame |
| no edge shows | yes | close-ups first showed a square on bare ground → apron (Seongsan) and the painted far city (city) |
| pins on screen | yes | (the first build registered none — a comment swallowed the line; LESSONS) |
| night reads | yes | road glow was too wide and orange → narrower, weaker; far city got lit windows |
| check.mjs | ok | the crater rule first failed: the cone floored the sea at 0 (also caused z-fighting with the water) |
