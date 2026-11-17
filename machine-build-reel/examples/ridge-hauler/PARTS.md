# RIDGE HAULER — parts breakdown

## Axes and origin
Metres. +X forward, +Y left, +Z up; origin on the ground under the body point; body point (deck centre) at z = 5.0.

## Overall
| | |
|---|---|
| height | 10.0 m to the whip antennas; radar 9.3 m; container roof 8.3 m |
| footprint | feet at (±4.7, ±4.5) and (0, ±5.4); 13.7 × 15 m over everything |
| chassis | ladder frame 8.6 × 2.7 m; coxa pedestals at x −2.7, 0, 2.7, y ±1.5 |
| legs | 6 × insect, coxa 1.35 / femur 4.3 / tibia 5.1, width 0.5, drum 0.56 |
| container | 20 ft ISO, 6.06 × 2.44 × 2.59 m, centre x −0.4, on twist locks at z 0.75 |

## Load path
The ladder frame takes the container on four twist-lock posts over the cross members; each leg's coxa turns in a
bolted ring on a pedestal over a cross member; femur and tibia are box girders in bending with a cylinder each across
the femur lift and the knee; the knee is high, so the tibia is mostly in compression.

## Parts → bones (per leg; ×6)
| part | bone | mechanism | stage |
|---|---|---|---|
| Coxa_<L> | hip_<L> | yaw drum + bolted ring flange, coxa beam, fork for the femur | upper |
| CoxaRing_<L> | body | the ring the coxa turns in | body |
| Thigh_<L> · Shin_<L> | segment | drum + pin, painted box beam with ribs and bolt rows, fork / socket cup | upper / lower |
| *Flange_<L>, *Tendon_<L> (cable tray), *Hose_<L> | segment | | hydraulics |
| Barrel_/Rod_<joint>_<L>, LugUp_/LugLo_<joint>_<L> | actuator bones / segments | searched anchors, beside the beam | hydraulics |
| Ball_<L> · FootHub_<L> · Toe0..2_<L> | shin · foot · digits | | feet |
Body: Chassis, Lockers, Beacons, Container, TwistLocks, Mast (body); Radar (radar). Neck01 + NeckCable01 (neck_01).
Cab: CabBody, Windscreen, CabRails, CabLights, CabBearing (head); WhipL / WhipR (lag bones).

## Powered joints
Femur lift (`hip`) 0..35°, knee −138..−114° (front left, all actions).
