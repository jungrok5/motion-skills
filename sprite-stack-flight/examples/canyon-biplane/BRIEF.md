# BRIEF — Dust Mail

## Topic
- **One line:** a red mail biplane's last run over desert mesas at golden hour, to a small adobe town by a river.
- **Title / subtitle:** DUST MAIL / THE LAST RUN TO RED BUTTE

## Craft
| field | design |
|---|---|
| what it is | a two-bay biplane with an open cockpit |
| mass and why | 1.5 — fabric and wood, light, but not a fighter: it rolls, slowly |
| speed, turn, bank limit | 22 cells/s, .85, 70° |
| model size | 35 × 30 × 13 voxels (+1 outline slice) |
| palette | red #c8342c / #e0503a, cream #efe0bc, wood #5a3a26, cowl #2c2428, outline #2a1512 |
| parts | tube fuselage tapering to the tail, finned cowl, two cream wings with red tips, wooden struts, tailplane, red fin, wheels, the pilot's helmet in the open cockpit |
| animated part | the propeller, 3 frames at 24 fps |
| nav lights | top-wing tips |
| trail | white smoke from the lower wingtips while rolling or at full throttle |
| can it roll? | yes, once |

## World
| field | design |
|---|---|
| place | desert country with mesas and buttes, one winding river |
| shape | fbm floor 2–6 + a mesa threshold (+11–14) + a butte threshold (+9), a river carved along a noise contour |
| terrace bands | 1 green bank · 2–5 sand · 6+ red strata, one colour per terrace (the layers read as rock bands) · flat mesa tops pale |
| water | teal ramp, few glints, no foam |
| decorations | sage on the floor, cottonwoods on the banks, rock spires, the adobe town of Red Butte |
| landmark | the town (the last overhead shot flies past it) |
| time of day | golden hour: peach horizon → dusty violet zenith, warm fog, a low sun at az 250° |
| clouds | 16 thin high clouds (base 72–86, above the flight), warm tones |

## Cockpit
- **The seat:** open cockpit behind the engine.
- **In view:** the underside of the top wing with ribs, the cabane and interplane struts, the long red cowl, a brass-framed windscreen.
- **Instruments:** brass dials on a wooden panel — airspeed, altimeter, attitude, RPM, compass, an altitude counter.
- **Live part:** the propeller blur ahead of the cowl; the needles.

## Plan
| t | dur | cam | bank | climb | thr | roll | caption | beat |
|---|---|---|---|---|---|---|---|---|
| 0 | 4 | over | 0 | 0 | .55 | | | the river, the town, the plane; title |
| 4 | 3.5 | over | -32 | | | | | turning toward the mesas |
| 7.5 | 4.5 | chase | 0 | -6 | | | | down toward the canyon walls |
| 12 | 3.5 | chase | 28 | 0 | | | | along the rim |
| 15.5 | 3 | chase | 0 | | .9 | right | | one roll, smoke |
| 18.5 | 5 | cockpit | -22 | 5 | .6 | | | the pilot's view over the river bend |
| 23.5 | 3.5 | cockpit | 18 | 0 | | | | |
| 27 | 5 | over | -12 | 9 | | | MAIL FOR RED BUTTE | climbing away |

## Motion
Mass 1.5: bank answers in ~0.7 s with ~2–3° overshoot; the roll gathers with a ~7° counter-roll; the chase camera lags the heading ~20° in turns.
