# Brief: 제주 돌집 스테이 (a Jeju stone house stay)

## 1. The building
A traditional Jeju farmstead turned into a two-room stay: 안거리 (the main house) and 밖거리 (the outer house) face
each other across a packed-earth yard inside a field-stone wall (돌담), with a 정낭 pole gate on the east and a
tangerine tree in the yard's west corner. Late afternoon in early winter, the tangerines ripe, the wind low. The last
frame stands inside the main hall (상방) with tea on the low table and looks out through the open lattice doors at
the yard, the outer house and the wall - warm inside, gold outside.

## 2. The input
No sketch was given, so the sheet is drawn in code from `plan.json` (`draw-sheet.py`): a 1:100 site plan at 75 px/m
with watercolour washes, contour lines, the rubble walls drawn stone by stone, door swings, dimensions, a front
elevation of 안거리, a materials legend and a title block. The film maps it at 75 px/m, origin (300, 1903) px.
Decided while reading: the traditional thatch is kept (no metal roof); the main house's hall doors are drawn open
(the camera's way in); the 정낭 poles are all down ("someone is home").

## 3. The numbers
Lot 20 x 16 m. 안거리 10.0 x 4.5 m, four 2.5 m bays (정지 kitchen / 상방 hall x2 / 구들 room), plinth 0.30, rubble
walls 0.5 thick to 2.30, eave 2.45, ridge 4.55, overhang 0.65. 밖거리 7.0 x 4.0 m, bays 2.4 / 2.4 / 2.2 (방 room x2 /
고팡 store), plinth 0.25, walls to 2.10, eave 2.25, ridge 4.10. 돌담 1.35 high, 0.45 thick. Every opening and the
furniture are in `plan.json`.

## 4. The look
| view | reference | materials named |
|---|---|---|
| high (`hero`) | a Jeju farmstead seen from the south-east, late sun | porous grey basalt laid dry with moss on the tops, golden thatch in a rope net, black-stone wall |
| yard (`yard`) | eye level from the gate | cedar posts and boards, 띠살 lattice doors with hanji, flat stepping stones, a dark glossy tangerine with orange fruit |
| room (`hall`) | inside the hall looking out | straight-grained floor boards, a low cedar table, celadon tea set, a paper floor lamp, a cedar chest with brass fittings |
No image model was used: the references are described in words and the stills were compared against these lines.

## 5. The build
| stage | parts | how many | held up by |
|---|---|---|---|
| foundation 기단 · 주춧돌 | plinths, edge stones, post stones, steps | 48 | the ground, the plinth |
| walls 현무암 벽 | mud cores, rubble courses stone by stone, window lintels and sills | 611 | the plinth, the course below |
| frame 기둥 · 보 · 도리 | round posts, sills between posts, plates, crossbeams, king posts, purlins, ridges | 46 | post stones, walls, posts |
| floor 마루 · 장판 | joists, hall boards, ondol slabs with oiled paper, earth floors | 32 | the plinth, joists |
| doors 띠살문 · 판벽 | front board infill, lintels, lattice leaves (stiles, rails, 6 muntins, 9 band rails, hanji), partitions | 408 | sills, lintels, frames |
| roof 서까래 · 새 · 줄 | rafters, thatch bundles, the rope net | 143 | ridge, plates, thatch |
| interior 살림 | table, tea set, cushions, chest, lamp, bedding, pot shelf, desk | 41 | floors |
| yard 돌담 · 정낭 · 귤나무 | wall stones course by course, 정주석 posts and poles, jars and lids, path stones, the tree | 700 | the ground, the course below |

Counted: 2,029 parts (the site's land, sea, orchard and windbreaks are not parts: they grow with the wave).

## 6. The film
- tempo: 88 bpm - unhurried, a stone set per sixteenth; length 22.9 s
- stage beats as in `film.json`; the wave on beat 20 (bar 6's downbeat, 13.64 s) from the tangerine tree; lights on beat 21
- camera: straight down on the sheet with the coffee cup at its corner -> a spiral down to the south-east -> a slow
  drift while it builds -> the hero view at the wave -> in over the gate along the stepping stones -> through the
  open doors of the hall's east bay -> a turn past the chest and table -> the `hall` view, looking out
- title: 제주 돌집 스테이 / 현무암 · 띠 · 삼나무 / {parts} PARTS · FROM ONE SHEET

## 7. The sound
- foundation `stone_heavy`, walls `stone`, frame `wood`, floor `wood_light`, doors `paper`, roof `straw`,
  interior `soft`, yard `stone_light`
- music: composed in code, D minor (Dm - Bb - F - C), a soft kick on each beat growing through the build, a riser
  into the wave, a crash and an open chord on it, a plucked pentatonic line after
- ambience after the wave: low wind, a few birds
