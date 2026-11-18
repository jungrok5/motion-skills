# RIDGE HAULER — brief

**One line:** a 9 m six-legged cargo walker that carries a 20 ft shipping container over rocky mountain ground to
villages no road reaches, and kneels to set it down.
**Why it walks:** scree, boulders and broken switchbacks — wheels and tracks slide or high-centre; six feet choose
where to stand and three are always down.

## Scale and load
- Height 10 m to the whip antennas (cab roof 6.3 m, radar 9.3 m); chassis 8.6 × 3.4 m; heavy (≈ 60 t with a full
  container) — a large excavator. The container itself (6.06 × 2.44 × 2.59 m) proves the size; the 1.75 m figure
  stands level with the coxa pedestals' feet.
- What carries the weight: a galvanized ladder frame (two box rails, three cross members, X-bracing); each leg turns
  on a coxa yaw drum in a bolted ring on a pedestal; painted box-girder femur and tibia, each with a hydraulic cylinder.

## Body plan
- Legs: 6 × insect 2-segment (coxa 1.35, femur 4.3, tibia 5.1 m), width 0.5 m; knees ride high (`knee` +1).
- Powered joints: femur lift (hip) and knee on every leg — 12 cylinders. Feet: ball, hub, three toes.
- Cab: a crew cab on a yaw bearing on a short neck link, wrap-around windscreen, roof light bar, rails, two whip
  antennas that trail it. A radar mast at the back of the deck; the radar antenna spins on its own bone.
- Cargo: a 20 ft ISO container (corrugated sides, corner castings, door bars) on four twist-lock posts.

## Finish
- Industrial: safety-yellow paint (#e2a91c) on beams and cab, galvanized forks and frame (#a3a8ab), graphite drums,
  steel rods and pins, black rubber; the container in blue (#2f5f8a).
- Lights: amber beacons at the deck corners and on the cab; they stutter on when it wakes.

## Motion (weight sets timing)
- Gait: tripod, cycle 2.6 s, duty 0.6, stride 2.0 m, lift 0.85 m — quick, low, insect-like; three feet always down;
  the body barely bobs (dip 0.14 m over 0.22 s) and rolls 1.2° toward the planted triangle. 1.28 m/s.
- Idle: breath 0.05 m, shift 0.08 m, the cab scans 18°, the radar keeps turning (90°/s).
- Big move "kneel" (main `body.dz`): braces (rises 0.25 m, cab tips up 6°), all six knees fold together and the
  chassis comes down level 1.75 m over 2.8 s, the cab looks the load over left and right, then it pushes back up
  0.19 m past ride height and settles.
- Wake: cold and settled, beacons stutter on (1.8–2.5 s), the cab lifts and looks round, the radar spins up.
- Follow-through: whip antennas 0.18 s behind the cab, soft-limited to 18°.

## Plates
coxa, knee, foot, cab, radar, hip hydraulics, container lock, chassis.

## Reel notes
Figure at (5.2, −6.2); walk camera −58°; move `kneel` at −42°.

## Review log
| pass | what was off (number) | fix | after |
|---|---|---|---|
| 1 | 47 clashes: knee rods through the cable trays | actuators beside the beam for 2-segment legs too | 29 |
| 1 | `move:kneel` anticipation 0 % — judged on the cab's look-around | `main: body.dz` | 22 % |
| 2 | 29 clashes at the kneel's deepest point (fold 144°) | trays / hoses stop short of the joints; kneel −2.35 → −1.75 m | 13 |
| 3 | 13 clashes: barrel × the rod's lug at full retraction | barrel shortened by the lug clearance (skill fix) | 1 |
| 4 | front beacons × cab when it looks 34° | beacons moved back to x 3.25 | 0 — 15/15 |

## What differs from the drawings
Code-only, as the starter. Accepted: the femur and tibia are plain box girders (no lightening holes); the cab has no
interior.
