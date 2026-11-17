# BRIEF — Tug at Dawn

Topic (as given, for the worked example): "a little harbour tug going round the lighthouse island at dawn" — chosen because
it is NOT the source's subject (a sports car on a race track): a boat floats, slides and rocks, so it exercises drift,
wake, roll and an idle that never stops, and its world is water instead of road.

## The hero (drawn from four sides)
- **What it is**: a harbour tug — navy hull, red bottom, white waterline and rail, a white wheelhouse with three windows a
  side, a yellow funnel with a red band, a mast with a warm masthead light, tyres hung as fenders.
- **Why this object**: a tug is all silhouette — low hull, tall funnel and mast — so it reads from above at any angle.
- **Size in voxels**: 36 × 16 × 18.
- **Silhouette**: rounded stern, tapered and raised bow (the sheer rises 2 voxels), wheelhouse amidships, funnel aft.
- **Palette** (18 keys): outline `#1c1a2b`; hull navy `#27407a` / `#3657a0`; bottom red `#b23a3a`; white `#ecebe4`; deck
  wood `#c08f5a` / `#9e6f42`; wheelhouse `#f2eee3` / `#cfc8b8`; glass `#5fc1d6` / `#2f7891`; roof `#8a95a3` / `#a7b1bd`;
  funnel `#f0b63c` / `#c98f25`; mast `#6b6f7a`; light `#ff6a3d`; tyres `#26252c`. Light from the upper left.
- **Front / back tells**: front — the wheelhouse windows and the raised bow rail; back — the yellow funnel and the stern
  name plate.
- **Thin parts**: the mast shares rows with the funnel top in the front view, which would widen it into a 2 × 6 block; the
  funnel stops at z = 14 and the mast starts at 15, so only one row (z = 14, read as a roof hatch) is shared.
- **Moves**: yes — mass 3, cruise 34 px/s, drift 9° (a boat slides in the turns), roll .035, lean ≤ 1.5 px, diesel engine.
- **Idle**: afloat it rocks (roll .8 px, 3.2 s), on the paper too.

## The world
- **Ground**: water (deep blue with dawn-orange glints that move); the mainland and the island are grass with sand edges.
- **Places**: the mainland along the left with three harbour houses and pines; a plank pier with crates and bollards;
  the lighthouse island (lighthouse, three pines).
- **Props**: lighthouse (lathe, red and white bands, lit lantern room), pine (lathe, tiers), red and green buoys (lathe,
  they sway), crates (box), bollards, harbour houses (voxels, pitched roofs).
- **The course**: a clockwise loop ~95 × 80 px round the island, past the pier end; must stay on water.
- **Camera**: follow, turn .45 (the world half-turns with the tug), look-ahead .4 s.

## Beats (28 s)
| # | kind | dur | caption |
|---|---|---|---|
| 1 | world | 3.2 | 픽셀아트 예인선, 어느 각도로든 |
| 2 | views | 4.0 | 예인선을 네 방향에서 그립니다 (tiles in) |
| 3 | slices | 5.5 | 옆모습의 한 줄이 슬라이스 한 장이 됩니다 |
| 4 | stack | 3.2 | 슬라이스를 1px씩 띄워 쌓고 돌립니다 |
| 5 | turn | 3.0 | 어느 각도든 같은 배 |
| 6 | world | 6.5 | 새벽 항구, 등대 섬 한 바퀴 (tiles in) |
| 7 | title | 2.6 | Tug at Dawn / sprite-stack-short |

Caption language: Korean.

## Sound
- key D (62), 104 bpm, melody `1 3 5 . 6 5 3 . 2 3 5 . 3 2 1 .`, chords `1 6 4 5`
- engine: diesel (thumps quicken with speed)

## Reviews
- Model sheet: `check.mjs sheet.html` found 4 % of the front view lost — the back view lacked the bow rails that show past
  the wheelhouse at z = 8–9; added. 90° shows the wheelhouse front, 270° the funnel: front and back are right.
- Stills: the course first ran too far from the island (the lighthouse was never in frame) — pulled in to ~80 px; the
  explainer beats picked zoom 1 (tiny) — fitZoom now measures the stack's real height.
