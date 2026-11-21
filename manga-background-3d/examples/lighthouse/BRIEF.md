# 등대지기의 섬 — BRIEF

## ONE LINE
A quiet manga about the last keeper of a small island lighthouse. Its pages live in three places — the spiral stair
he climbs every evening, the pier where the two island boats tie up, and the lamp room at night — so those three are
built once. A topic the starter does not touch: round architecture seen from above, open water, rigging and rope, a
lit lantern behind glass and a beam over a dark sea.

## Locations
| id | name | mood | must read | built from |
|---|---|---|---|---|
| tower | 등대 안 나선계단 | day, light from above | an open-well spiral of 46 treads, a baluster on each at the well, the handrail spiralling round; a tower wall of 20 panels with slit windows climbing with the stair; flagstones; the builder's plate (1931); an oil can and a bucket at the foot | `towerWall()` ring of panels, extruded wedge treads, `line()` rail and stringer, `grid()` floor |
| pier | 선착장 | day | a long plank pier on posts; bollards and mooring lines; a coil of rope; crates, barrels, a fish box under a net; two fishing boats with wheelhouses, masts and stays (새벽호, 등대호); a calm sea drawn as short strokes; the boat shed; the lighthouse on its headland; hills | planks as boxes, `boat()`, `sea()`, `torus`, `crate`, `lathe` barrels, distant tower from `cyl`s |
| lamp | 등대 꼭대기 램프실 | night | the gallery with its round railing; the twelve-sided lantern of see-through glass with astragals and a door ajar; the lens of stacked glowing prism rings; the copper roof and ventilator ball; two beams sweeping over the sea | `cyl` floor and roof, ring of panes (`see: true`), `glow`, `beam()`, `light()` |

## Props this story needs
- `towerWall(y, r, h, n, t, windows)` — a round wall as n straight panels, window gaps at chosen panels.
- `boat(len, beam, name, mast)` — pointed plan-view hull (`slab`), gunwale, rub strake, wheelhouse with windows,
  mast and stays (lines), fenders, the name on the bow.
- `sea(y, size, tone, n)` — one flat sheet (no lines) and n short horizontal strokes thinning towards the horizon.

## Light
- tower: sun from straight above (the lantern), 0.32, ambient 0.8: tread tops white, undersides and shadows grey.
- pier: high sun from the left front; the sea at 0.94 so the strokes carry it.
- lamp: night; the lens lights the lantern and the gallery (two point lights); the beams lift the sky by bands.

## Shots
| # | scene | mode | camera | caption |
|---|---|---|---|---|
| 0 | tower | wipe 0.30–0.74 | from the top landing straight down the well, rolling 20° | 나선계단을 3D로 쌓았다. |
| 1 | tower | manga | standing mid-stair across the well | 계단 중간에 서 봐도. |
| 2 | pier | wipe 0.26–0.70 | from the shore end down the pier | 배 두 척과 선착장까지. |
| 3 | pier | manga | close and low on the rope coil and bollards | 밧줄 한 사리도. |
| 4 | lamp | wipe 0.25–0.68 | from the air beside the gallery, drifting round | 등불이 켜지는 밤도. |
| 5 | card | | | 이 섬의 선은 / 전부 3D에서 나왔다. — 등대지기의 섬, 배경 세트 세 곳 |

## Page
The lamp room wide with 「오늘 밤도 / 불을 켠다.」; the well looking down (tall panel); the pier; the rope coil with
「배는 새벽에 나간다.」.

## Review log
- Look-up from the foot of the stair read as a fan of grey wedges → open well, light from above, the shot looks down.
- Lens hidden behind white glass → see-through glass (`see: true`).
- Beam ended in a white blob → `S.beam()` fades and lifts the tones by bands.
- Tower had no paper white → sun from above.
