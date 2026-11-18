# WADER — brief

**One line:** a 25 m four-legged walker that crosses shallow water and marsh like a heron, sensing the ground ahead
with a long-necked sensor head.
**Why it walks:** tidal marsh — too soft for wheels, too shallow for a hull; long legs keep the body dry.

## Scale and load
- Height 25.4 m to the whisker tips (head 23 m), body 12 m long, colossal (~600 t class) — the height of an 8-storey
  building; the 1.75 m figure reaches the ankle ball.
- What carries the weight: each segment is a guyed mast — a black carbon compression beam, tendons down its back on a
  spreader, a hydraulic cylinder across every joint; the legs hang from two hip girders under a carbon keel.
- Size proof: the figure at the front-right foot; bolt rings on every joint cap; the line of belly lights.

## Body plan
- Legs: 4 × mammal 3-segment (thigh 6.9, shin 6.1, tarsus 3.5 m), width 0.74 m; front knees forward, rear knees back.
- Powered joints: hip, knee, ankle on every leg (12 cylinders). Feet: a steel ball in a socket hub, three toes
  (two forward, one heel).
- Neck: four ladder links rising forward (64° → 30°), a sensor head 3.6 m long on a yaw bearing; four whiskers that
  trail the head.
- Body: carbon keel, belly frame, a split ceramic carapace on posts, a neck boom with a fork, a tail fin.

## Finish
- Ceramic (white #e9e7e2) over carbon (#131416), graphite drums, polished steel rods, rubber hoses.
- Lights: blue sensor dots on the head and a dotted strip under the carapace; they pulse at rest, stutter on when it
  wakes.

## Motion (weight sets timing)
- Gait: lateral four-beat, cycle 5.2 s, duty 0.68, stride 5.0 m, lift 1.7 m — a heron: the heel rises high
  (`swing_gamma` 26°), the foot leaves quickly and sets down slowly; the body sinks 0.32 m into each landing over
  0.42 s, sways 0.7 m and rolls 2° toward the planted side; the neck rocks while the head stays level. 1.41 m/s.
- Idle: breath 0.14 m, shift 0.22 m, head scan 14°, period 12 s.
- Big move "probe" (main `body.dz`): gathers (rises 0.37 m, lifts its head), the front legs fold as the body tips 13°
  nose-down and drops 3.4 m over 3.2 s, the neck reaches, holds and looks left and right, then it pushes up 0.45 m
  past rest and settles.
- Wake: head hangs dark, lifts, the lights stutter on (2.4–3.1 s), it looks 48° left, 38° right, settles.
- Follow-through: whiskers, 0.22–0.3 s behind the head, soft-limited to 22°.

## Plates
hip, knee, ankle, foot (front left), rear knee, head, neck base, belly.

## Reel notes
Figure at (10.5, −7); walk camera −62°; move `probe` at −38°.

## Review log
| pass | what was off (number) | fix | after |
|---|---|---|---|
| 1 | swinging toes 159 mm below the ground | toe pitch and droop scale with clearance | +3 mm |
| 2 | 15 clashes (tarsus × toes, cover × hip barrel, neck plates) | socket higher, toe pins on hub cheeks, actuators beside the beam, plates shorter | 4 |
| 3 | whiskers folding into the visor on the probe's rise | soft-limited lag | 1 |
| 4 | thigh covers × keel, hip barrel × belly frame in the probe | hips hung under the keel on girders, hip barrels outboard | 0 |
| 5 | taller carapace × neck plate | carapace ends before the neck | 0 — 15/15 |

## What differs from the drawings
Code-only: the design sheet and line drawings come from the model itself, so they agree by construction; the review
is the rubric (references/BRIEF.md) on the turnaround and plates.
