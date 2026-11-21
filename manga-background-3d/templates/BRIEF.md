# 세탁소집 딸 — BRIEF

## ONE LINE
A slice-of-life webtoon about a girl who grows up above her family's neighbourhood laundry shop. Almost every chapter
happens in four places — the shop, the rooftop room where she lives, the alley stairs she climbs home, and the bus
stop in front of the shop at night — so those four sets are built once and drawn from any angle.

## Locations
| id | name | mood | must read | built from |
|---|---|---|---|---|
| shop | 동네 세탁소 | day | a rail of garments in dry-cleaning covers with claim tags; the counter with till and folded stacks; the steam press with its hose; the sewing machine (수선); the price list; the curtained door to the house; tiled floor, board ceiling, tube lights | `room()` with shop window + glass door, `counter`, `shelf`, `fluorescent`, + `garment()`, `pressTable()`, `sewingMachine()`, `foldedStack()` |
| roof | 옥탑방 옥상 | day | the little rooftop room with barred window and outdoor unit; the water tank on its stand; washing on lines; plastic table and chairs; styrofoam planters with spring onions; neighbours' roofs, apartment blocks behind, a church spire, wires | slab + parapet, boxes, `cyl`, + `washing()`, `building({ simple })` grid, `pole`/`wires` |
| stairs | 비탈 골목 계단 | day (low side sun) | a long flight between houses that step up with it; the central handrail; barred windows, gas meters, downpipes; plants on the steps; a pole with a convex mirror at the top; wires overhead | `stairs()`, house blocks per side, `plant`, `pole`, `streetlamp` |
| busstop | 밤의 버스 정류장 | night | the shelter (glass, bench, lit advert, time board); the stop post with route numbers; across the road a row of shops, one lit late (24시 편의점, 분식); lamps pooling light; wires; a parked car; a traffic light | `road`, `building({ shop, lit })`, `streetlamp`, `pole`/`wires`, `car`, shelter in scenes.js |

## Props this story needs
- `garment` — hanger hook (line) + an extruded shirt/coat outline 0.46–0.52 m wide, 0.82–1.15 m long, 3.5 cm thick,
  a claim tag on half of them; hung every 12 cm along a rail at 1.95 m.
- `pressTable` — a board with a rounded nose 1.2 × 0.4 m at 0.86 m, two splayed legs, the iron, its hose to the ceiling.
- `sewingMachine` — base, C-arm, spool, hand wheel.
- `washing` — a sagging line with towels, shirts, socks and pegs.
- `foldedStack` — folded shirts, 4.5 cm each, alternating tones.

## Light
- shop: sun from the street side, high (dir 0.25, 0.7, 1): patches of window light on the tiles.
- roof: sun from the left front, high: shadows of washing on the slab.
- stairs: sun from the right, high (0.6, 0.95, −0.25): left houses lit, right in shade, steps white.
- busstop: night; the shelter tube, three lamps and two shop interiors are the point lights (6); lit windows above.

## Shots
| # | scene | mode | camera | caption |
|---|---|---|---|---|
| 0 | shop | wipe 0.30–0.72 | from the door towards the counter, dolly left | 세탁소 한 채를 3D로 지었다. |
| 1 | shop | manga | reverse: from behind the counter to the windows | 앵글은 마음대로. |
| 2 | shop | manga | close on the counter and its sign | 컷이 몇 개든. |
| 3 | roof | wipe 0.26–0.70 | from the front corner across the slab | 옥상 빨랫줄 한 가닥까지. |
| 4 | stairs | manga | at the foot, rising 0.45 m and climbing 2.4 m | 비탈 골목도 그대로. |
| 5 | busstop | wipe 0.25–0.68 | from the kerb past the shelter along the street | 밤 장면은 불만 켜면 된다. |
| 6 | card | | | 펜은 한 번도 / 잡지 않았다. — 3D 세트에서 뽑은 만화 배경 |

## Page
Four panels: the shop wide with 「우리 집은 / 세탁소다.」; the rooftop and the counter side by side; the alley stairs
with 「저녁마다 이 계단을 오른다.」. No characters.

## Review log
- First stills: roof neighbours scattered at random angles read as junk → street grid, `simple` windows.
- Alley: a blank house side filled half the frame → camera starts inside the street.
- Rooftop washing 1.5 m from the lens → line moved back to z 1.1, table forward.
- Night too grey → night ambient 0.36; sky on a level (0.22).
- `·` and `→` missing from Gaegu → rephrased the sign and the card.
- Alley under 12 % paper → sun raised; still a warning (narrow streets are grey).
