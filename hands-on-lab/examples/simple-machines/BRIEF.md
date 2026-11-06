# Machines 101 — brief

## Topic and learner
- Topic: simple machines — how a lever, a ramp, pulleys and gears trade force for distance (or speed).
- Learner: 11–14, knows that weight is a force in newtons; no algebra beyond multiply and divide.
- Title + tagline: **Machines 101 · Push · Lift · Turn** (ko: 기계 101 · 밀고 · 들고 · 돌리기)
- Experiment tab: **Machine** (ko: 장치)
- Languages: en, ko
- Simplifications, said once in each maths tab: g = 10 N/kg, no friction, ropes and pulleys weigh nothing.

## Units and lessons
### 1. The lever  (unit: Levers and ramps)
- Idea: a small force far from the pivot balances a big force close to it — moment = force × distance.
- Bench: a 6-unit wooden plank on a red triangular fulcrum; a 40 N crate on the left end; a stack of 10 N brass weights
  on the right end. Floor-standing ruler marks along the plank.
- Controls: `pivot` slider (fulcrum position 1.0–5.0 from the left end, on the fulcrum) · `load` choice 20/40/60 N (crate)
  · `weights` slider 0–8 (×10 N, on the weight stack).
- Model: moments about the pivot; net = effort × dE − load × dL. The plank tips toward the bigger moment (±11°), easing
  in with a damped spring (state: angle, speed). Effort needed = load × dL ÷ dE.
- Bench shows: tilt; the side that wins goes down; a value tag with the net moment.
- Diagram: free-body diagram — beam, triangle pivot, load and effort arrows with their distances.
- Chart: effort needed against pivot position (sweep).
- Maths: M = F × d (both sides) · balance when equal · effort needed.
- Try: balance it · lift the 60 N crate with 3 weights or fewer · make it tip the other way.

### 2. The ramp  (unit: Levers and ramps)
- Idea: a gentler slope needs a smaller push but a longer path; the work F × d stays the same.
- Bench: a wooden wedge (height 1.6) whose angle changes; a 20 N crate pulled by a spring balance along the slope.
- Controls: `angle` slider 10–50° (wedge) · `pull` hold (spring balance): pulls the crate up the slope.
- Model: F = W × sin θ; slope length = h ÷ sin θ; state: crate position along the slope (0–1), it slides back to the
  bottom when the angle changes.
- Bench shows: wedge angle, crate position, spring stretched, the balance's screen reading in N.
- Diagram: right triangle with W, the pull along the slope, h and the slope length.
- Chart: pull needed against angle (sweep).
- Maths: F = W sin θ · d = h ÷ sin θ · W × h = F × d.
- Try: pull the crate to the top · use a slope under 20° · use a slope over 40°.

### 3. Pulleys  (unit: Wheels)
- Idea: every rope segment holding the load shares its weight; with n segments you pull W ÷ n but n times as far.
- Bench: a wooden gantry with one fixed pulley block; 1, 2 or 4 supporting segments (a movable block for 2 and 4);
  a 40 N crate on the hook; the free rope end with a ring.
- Controls: `n` choice 1/2/4 (pulley block, rebuilds) · `pull` hold (rope end).
- Model: effort = W ÷ n; state: rope pulled (m), load height = pulled ÷ n, stops at the top (1.6).
- Bench shows: crate rising, pulleys turning, rope stripes moving along every segment while pulling.
- Diagram: pulley diagram — circles, rope lines, load and effort arrows.
- Chart: effort against number of segments (sweep 1–6).
- Maths: F = W ÷ n · rope pulled = n × height.
- Try: lift it with one rope · lift it with four · raise it to the top.

### 4. Gears  (unit: Wheels)
- Idea: meshed gears turn opposite ways; the ratio of teeth trades speed for turning force.
- Bench: a wooden board, two gears lying flat on pins — an orange driver with a crank handle and a blue driven gear.
- Controls: `rpm` slider 0–60 (crank) · `za` choice 12/24/36 (driver) · `zb` choice 12/24/36/48 (driven) — rebuilds.
- Model: ratio = zB ÷ zA; ωB = −ωA × zA ÷ zB; torque × ratio. State: driver angle; driven angle derived so the teeth mesh.
- Bench shows: both gears turning at the computed speeds, opposite ways; value tags with rpm.
- Diagram: two pitch circles with rotation arrows and tooth counts.
- Chart: output speed against driven teeth (sweep).
- Maths: ratio · output speed · turning force.
- Try: make the output faster than the crank · make it exactly 4× slower · turn the crank at 60 rpm.

## The parts kit for this topic (`parts.js`)
plank (box, with tick marks), fulcrum (extruded triangle, red), crate (box with slats, text "40 N"), weight (brass
cylinder with a hook), wedge (extruded right triangle, angle as parameter), spring balance (tube + screen + hook),
gantry (posts + beam), pulley (torus + disc + axle, turns), rope (tube with flow stripes), gear (extruded tooth profile
from module and tooth count, hub, spokes), crank (arm + handle), board (box). Colours: wood #c08a55, brass #d9a441,
crate #e7b26b, fulcrum #e0503a, driver #f5a524, driven #3a7bea, rope #e9dcc0, metal #c9ced6.

## Tour (~58 s)
lever: add weights → it tips; drag the pivot → balance; turn the camera · ramp: hold pull → crate climbs; steeper
slope; maths tab · pulleys: hold pull with 1 rope; switch to 4; hold pull again; diagram big · gears: crank 30 rpm;
driven 48 teeth; driver 12; turn the camera · switch to Korean, overview tab.

## Still review — a still fails if…
- the plank tips toward the lighter moment, or the crate / weights float off the tilted plank
- the crate leaves the slope or sinks into it; the rope or balance does not reach the crate
- a rope does not touch its pulley or the hook; the crate moves without the rope moving
- gear teeth overlap or a gap shows between pitch circles; both gears turn the same way
- a label overlaps another or hides its part; the diagram and the bench disagree
