# Brief — 은여울 마을 (Silverford)

**One line.** A fording village under wooded hills — late-medieval Central Europe as an MMORPG starting town would
draw it — on a summer afternoon, with the hour, rain and winter passing over it.

The request: "like the video (a forest and meadow with light shafts, ferns, mossy rocks, an old oak — the Unreal look),
but an MMORPG village; day and night, rain and winter changing; walk round it with the keyboard; fast."

## Setting
- Region and period: timber-framed Franconia / Alsace, c. 1500, tidied the way a game tidies it. Not a copy of any game's town.
- Walls / roofs / openings / ornament: rubble-stone ground floors with dressed quoins; jettied half-timbered upper
  floors, lime plaster in off-whites; steep gables (50–57°) in plain clay tile, slate on the better houses, thatch at
  the edges; small leaded casements with painted shutters and window boxes; plank doors with iron straps; hanging
  iron-and-board signs cut to a shape (mug, anvil, loaf, key).
- Ground and ways: cobbles on the square and the main lanes breaking into packed earth, then turf; gravel at the water.
- Trees and ground cover: beech and oak woods with birch by the brook and spruce and pine higher up; a meadow of long
  grass with poppies, ox-eye daisies and cornflowers north of the brook; ferns on the forest floor.
- Water: a brook off the north-west hills, a mill pond in the south-east, a fountain in the square.
- Light: 47° N; the page opens at 16:36 in midsummer, sun in the west-south-west.
- Sounds: brook, fountain, forge, water wheel, windmill, chapel bell, frogs at the pond.

## Plan (metres; +x east, +z south; the fountain is 0, 0)
- The middle and why here: the ford — now a stone bridge — and the square just south of it.
- Landmarks: 샘터 광장 the square, fountain · 0, 0 · everywhere — 붉은 지붕 여관 the inn, three storeys with a cross wing ·
  −12, −25 · the square — 모루 대장간 the smithy with its open forge · 27, −4 — 언덕 예배당 the chapel and tower on a knoll ·
  −60, 6 · the skyline from everywhere — 여울 물레방아 the mill and wheel · 53, 13 — 바람 언덕 풍차 the windmill on its
  hill · 80, −62 · the skyline north-east — 돌다리 the bridge · 3, −41 — 꽃 초원 the meadow and its lone oak · −6, −82 —
  남문 the south gate in its palisade · 0, 100 — 방앗간 연못 the pond and pier · 62, 50 — 보리밭 농장 the farm · −56, 58 —
  숲속 빈터 a glade at the end of a path through the north-west woods · −110, −82.
- Ways: the paved lane from the gate north to the square; paved arms west to the chapel and east to the mill; a path
  over the bridge into the meadow; tracks to the farm, the pond and the windmill; a footpath from the farm between
  two houses to the lane (the farm's fences leave a gap for it and for the farm track).
- Edges: palisade along the south; woods too thick to pass on every other side (the walker is held at 150 m).
- Far country: forested hills from 200 m, bare ridges and snow caps beyond 800 m.

## States
- Day: white plaster against blue shade, cloud shadows crossing the roofs, motes in the sun under the trees.
- Dusk: the sun down the west lane, long shadows across the square, the first windows.
- Night: moon shadows; windows, door lanterns and the ring of lamps round the square; the forge; fireflies at the pond and in the meadow.
- Rain: cobbles go dark and hold puddles between the stones, rings in every puddle and on the pond, mist to the tree line, lamps lit early, thunder.
- Winter: leaves turn and fall first; then snow on roofs, sills, walls' tops and open ground but not under eaves or
  stalls; the pond freezes and can be walked on, the wheel stops; smoke stands taller.

## The scans (→ `assets.json`)
The same village as living-realm's, asked for again with the no-asset rule lifted: what a walker sees within a few
metres becomes photographs. Chosen for a Central European village of rubble stone, lime plaster, oak frames and clay
tiles; all Poly Haven, CC0, 1k.

| what the place is made of | scan id | on the sheet and on a wall |
|---|---|---|
| paving of the lane and the square | `cobblestone_floor_04` | 1.5 m patch; `pom 0.035`; pale as it comes — the square at noon measured washed out (0.59) → `gain 0.6`; the engine's relaid stretches and worn gaps break its repeat |
| wall stone, the well, plinths, the bridge | `rustic_stone_wall` | `pom 0.05`; warm brown rubble, right for the half-timber above it |
| quoins, sills, the fountain | `white_sandstone_blocks_02` | glared beside the rubble → `gain 0.82` |
| plaster panels | `white_rough_plaster` | wall paint still tints it per house |
| roofs: clay tiles · slates · reed thatch | `clay_roof_tiles_02` · `roof_slates_02` · `reed_roof_03` | courses run across on all three |
| boards, doors, stalls, the mill wheel | `weathered_brown_planks` | dark → `gain 1.2` |
| frames, posts, beams | `rough_wood` | `gain 0.75`, `tile 1.2`; `medieval_wood` read as blockwork and was dropped |
| chimneys, the forge | `medieval_red_brick` | |
| paths · the floor of the woods · the shore | `stony_dirt_path` · `leaves_forest_ground` · `gravel_floor_02` | `tile 3.0` and `2.4` on the first two |
| rock (on generated shapes) · bark (oaks, logs, stumps) | `mossy_rock` · `bark_brown_02` | |

Objects: `wine_barrel_01` (10 820 triangles; every barrel, 35 of them) · `wooden_crate_02` (5 176; every crate) ·
`tree_stump_01` (41 046; the three named stumps) · `dead_tree_trunk` (101 802; one, in the glade) · `stone_fire_pit`
(3 887; the glade) · `wooden_bucket_01` (5 116; the well, the smithy, the farm).
What stays generated, and why: hay and haystacks (a roof scan on a rick goes dark), cloth, glass, iron, snow, turf
under the grass, every leaf — and the rocks' shapes: the scanned boulder set shares one texture between six rocks and
was blurred at arm's length (`references/ASSETS.md`).

## To make new
Everything here is the kit's stock (this example is where the stock came from). A different topic starts from this table.

## The walk
- Spawn 0.5, 88 facing north: the lane, washing and bunting across it, the inn's red roof closing the view.
- Tour: lane → square → inn front → smithy → mill → back and over the bridge → the meadow oak → the path into the
  woods to the glade and back → chapel → farm → the footpath to the lane → gate.
- Views: gate, lane, square, inn, smithy, mill, bridge, meadow, chapel, farm, pond, woods, glade.

## Words
Korean on the glass; place names as above; the title card reads 은여울 마을.
