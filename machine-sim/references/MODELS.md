# Models behind the readouts

A machine-sim page is convincing because the numbers move with the picture. Pick one small model, keep its state in `m`,
and derive both the pose and the readouts from it. Recipes, smallest first.

## Walking machines — creep gait (examples/walker)
- **Phase** `φ ∈ [0, 1)` advances at `v / stride`. Each leg swings for a share `SW` (0.2 for four legs) starting at its
  offset. Lateral sequence RL → FL → RR → FR (offsets 0, .25, .5, .75) keeps three feet down and is the stable order.
- **Feet live in world space.** A planted foot never moves (no sliding). On lift-off store the lift point; the landing
  target is `body_z + neutral_z + 0.4·stride + (1 − s)·SW·stride` — the body's travel during the rest of the swing is
  `(1 − s)·SW·stride` whatever the speed. Swing path: `lerp(lift, target, smoothstep(s))`, height `lift·sin(πs)`.
- **Finish a swing** when halting: give the phase a minimum rate while any foot is in the air.
- **Body sway**: lean away from the leg about to lift — `−Σ side_i · bell(u_i)` — so the centre of mass sits inside the
  triangle of the other three. Sag a few cm per raised foot.
- **Leg IK** (yaw + 2-link, knee up): `yaw = atan2(−dz, dx)`; in the leg plane `r = horizontal − coxa`, `v = dy`;
  `D = min(hypot(r, v), L1 + L2 − ε)`; `θ1 = atan2(v, r) + acos((L1² + D² − L2²) / 2L1D)`; knee position from θ1;
  `θ2 = atan2(v − ky, r − kx) − θ1`; foot level with `−(θ1 + θ2)`. Interior knee angle `acos((L1² + L2² − D²) / 2L1L2)`.
- **Static loads** on planted feet: vertical forces `f` with `Σf = W`, `Σf·x = 0`, `Σf·z = 0` (about the CoM).
  Three feet → unique; four → least-norm `f = Aᵀ(AAᵀ)⁻¹b`. Clamp negatives (CoM outside) and renormalise.
  Hip torque ≈ `f × horizontal hip-to-foot distance`.
- **Stability margin**: smallest signed distance from the CoM's ground point to the support polygon's edges (convex,
  counter-clockwise). Positive inside. Red when < 0.15 m.
- Other gaits: trot (diagonal pairs, `SW` 0.5), hexapod tripod (two triangles), biped (needs a ZMP story — keep it
  quasi-static and say so).

## Reciprocating engines (examples/engine)
- **Crank-slider**: wrist pin height `y = r cosθ + √(l² − r² sin²θ)`; rod angle `atan2(−r sinθ, y − r cosθ)`;
  piston speed numerically `dy/dθ · ω`.
- **Four-stroke cycle** 0–720°: intake 0–180, compression 180–360, power 360–540, exhaust 540–720.
  Cam at half crank speed; valve lift `L·sin²(π·u)` over its open window (e.g. IVO −12°, IVC 212°, EVO 508°, EVC 732°).
  Overlap near TDC is worth showing.
- **Pressure (teaching model)**: intake at manifold pressure (throttle); compression polytropic `p₁(V₁/V)^1.32`;
  combustion as a Wiebe burn `1 − exp(−5u³)` from ignition multiplying the polytropic curve; blow-down to ~1.1 bar.
  Volume `V = Vc + A·(r + l − y)`, `Vc = swept / (CR − 1)`. Torque `(p − 1 bar)·A·r·sinθ·(1 + r cosθ / √(l² − r² sin²θ))`,
  mean torque over 720°, power `T·ω`. Label it a model, keep the peak plausible (40–70 bar at full throttle).
- Show it slower than life (`SLOW = 60`) and say so in the subtitle; readouts use the real rpm.

## Other machines
- **Gear trains**: one input angle; each gear `θ_out = −θ_in · z_in / z_out`; planetary: `ω_c = (ω_s z_s + ω_r z_r) / (z_s + z_r)`.
  Readouts: ratio, output speed, torque ×ratio. Mesh teeth phase-aligned: offset half a tooth on the driven gear.
- **Linkages** (four-bar, scissor lift, excavator arm): solve closure with two-circle intersection each frame; readouts
  are angles, stroke, mechanical advantage. Hydraulic rams = `K.strut` between the two pins; extension = length − closed.
- **Cranes / arms**: forward kinematics from joint angles, tip load moment `m·g·reach`, tipping line from the outrigger
  pads (same margin function as the walker).
- **Rotors / props / turbines**: one shaft angle; thrust `∝ ρ n² D⁴`, power `∝ ρ n³ D⁵` with a stated coefficient.
- **Conveyors, printers, CNC**: a path parameter `s` along a polyline; position, speed, current layer/segment.

## HUD patterns that read well
- A **timeline chart** of the cycle with a playhead (footfall, strokes, valve windows).
- A **plan-view SVG** of the thing that matters in plan (support polygon, gear layout, crane footprint).
- **Bars** for per-part quantities (foot loads, valve lifts, ram forces) with a sub line saying the part's state.
- A **dial** for any rotating command (turret azimuth, steering, crank angle).
- A **loop plot** for cyclic thermodynamics (p–V) or mechanics (force–stroke).
- Status words in the top bar (WALKING / HALTING / HALTED, RUNNING / STOPPED) from the model, not from the buttons.
