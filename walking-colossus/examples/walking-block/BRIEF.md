# BRIEF — 「Walking Block」 (the source film, ported as the style example)

> A colossal Soviet panel apartment block on eight hydraulic legs crosses a wet field in blue dusk fog; life
> goes on in its flats.

Source: <https://github.com/Leonxlnx/walking-block> (MIT). Every number below is the source film's, carried into
`colossus.js`; its body (`mods/building.js`, `mods/chassis.js`) is the source's own code.

## 1. The colossus
| | |
|---|---|
| What | a 6-storey prefab panel block (sections 5–7 floors), 88 m × 15 m, loggias, laundry, AC units, satellite dishes, roof clutter |
| Why it walks | it just does — the film never explains, life inside carries on |
| Box | `BODY_LEN 88, BODY_DEPTH 15, BODY_H 19`; origin = base slab centre |
| Ride height | 17 m |
| Belly / hips | `mods/chassis.js`: a 4.5 m machinery band — reactor drum, turbines, catwalks, cabins, tanks, ≤ 6 warm lamps; hip yokes at x = ±11, ±33, z = ±9.2 |
| Life on it | lit flats (interior-mapped windows), laundry swaying, curtains, roof smoke, birds flushed from the grass |

## 2. Mass → motion
| | value |
|---|---|
| Legs | 4 a side, thigh 12.5 m, shin 18 m, feet at z ±23 splayed to x −36.5 … 39.5 |
| Cycle | `T 6.4 s`, duty 0.70, stride 13 m → 2.9 m/s |
| Body | bob 0.34 m, shudder 0.07 m, sway 0.28 m, roll 0.013 rad |

## 3. Place, hour, weather
Wet field at blue dusk: olive grass with khaki tips, mud, water-filled ruts at z ±35, puddles (hero puddles for the
`ref6` view and `f_puddle`), debris (tyres, planks, concrete chunks, a sign), trees and poles in the fog. The engine's
default `LOOK` is this film's.

## 4. The film (45 s)
`f_open` grass rack focus · `f_side` long lens · `f_hero` low 3/4 · `f_foot` leg 2 plants at t 18.75 by the lens ·
`f_belly` overhead · `f_life` balconies and laundry · `f_knee` leg 1 lifts 33.06, slams 34.98 · `f_puddle` mirror,
leg 2 plants 37.95 behind it · `f_away` crane up into the fog.

## 5. Sound
The source used freesound CC0 recordings and Scott Buckley's "The Long Dark" (CC-BY 4.0), not redistributed here;
`audio.mjs` synthesises the same placement (mud, steel, groans, hydraulics, a pad in the default key).
