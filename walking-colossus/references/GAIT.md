# GAIT — mass, legs and the motion rules

The colossus walks on a **stateless gait** (`engine/gait.js`): every foot, the body and the camera shake are closed-form
functions of `t`. Motion is keyed in code from these numbers — no generated or downloaded motion (this skill is
code-only for motion; see `references/MOTION-QUALITY.md` at the repo root for why the rules below exist).

## The model

- Legs are numbered `0 … N-1` on the +Z side, then `N … 2N-1` on the −Z side, one per hip column `LEG_X[k]`.
- **Alternating tetrapod**: neighbouring legs on a side, and opposite legs, are half a cycle apart, with a small
  ripple (`k × 0.035`) so footfalls never land on one frame.
- **Stance** (fraction `duty` of `T`): the ankle is fixed in the world at its plant point; the body travels `stride`.
- **Swing**: the foot peels off slowly (smoothstep in x), rises fast to `lift`, hangs, then drops with a cubic
  (a slam), pitching toe-down and back.
- **Body**: sinks `bob` after each group touchdown and **shudders** (damped `shudder` at 15 rad/s), surges
  `surge` fore-aft, sways `sway` and rolls `roll` once per cycle. Speed = `stride / (duty × T)`.
- **IK**: two-bone, analytic, knee pole up (knees bend up and out), from a trunnion 2.2 m × `LEG_SCALE` out from the
  kingpin toward the foot. Bone lengths never change. Hydraulic cylinders are sized from a sampled cycle so they
  never bottom out.

## Mass → numbers

| | light (a kiosk, a house) | the block (6 storeys) | heavy (a ship, a cathedral) |
|---|---|---|---|
| `T` | 4.5–5.5 s | 6.4 s | 7–9 s |
| `duty` | 0.62–0.66 | 0.70 | 0.72–0.76 |
| `lift` | 3.5–4.5 m (× scale) | 4.6 m | 3.5–4 m (heavy feet barely clear the ground) |
| `bob` / `shudder` | 0.2 / 0.04 | 0.34 / 0.07 | 0.4–0.5 / 0.09 |
| `roll` | 0.01 | 0.013 | 0.02 (a ship rolls) |
| legs a side | 2–3 | 4 | 5+ for anything long |

Rules of thumb: heavier and taller → slower cycle, longer stance, lower lift, deeper sink; a long body needs more
hips (spacing ≥ 2 × claw reach + ~5 m so feet never collide); wider `FOOT_Z` = more stable, more dramatic A-frame.

## What `check.mjs` measures (every project must pass)

| check | limit | why |
|---|---|---|
| leg reach | hip→ankle within 1.08 × \|thigh−shin\| … 0.97 × (thigh+shin) | the IK never clamps (a clamped leg pops) |
| knee angle | 25–170° | never folded flat, never locked straight |
| knee direction | knee above the hip→ankle chord, both sides | no inverted knee |
| bone lengths | fixed | two-bone IK, lengths never animated |
| planted feet | ≤ 2 mm slide | planted feet never slide |
| feet on the ground | 0 sink / float while planted | |
| support | ≥ 3 feet down, ≥ 1 a side, the body over the planted polygon | it can actually stand |
| foot spacing | warn when feet on a side come closer than 2 pads | claws colliding |
| anticipation | lift-off speed ≤ 35 % of mid-swing | the foot peels off, it does not teleport up |
| slam | at touchdown sideways speed ≤ 35 % of downward | it lands straight down |
| weight | body rides up and down each step | the idle breath is never zero |

`check.mjs --events` prints every touchdown and lift-off per shot with its world position: aim `f_foot`,
`f_knee` and `f_puddle` at real footfalls from that list (the source film does exactly this).

## Follow-through on the body

Anything loose (chains, cables, flags, laundry, weed, signs, lamps on arms) hangs on a pivot and swings with
`lagSwing(gait, t, {T, zeta, gain, axis})` from `engine/kit.js`: a damped pendulum driven by the body's own
acceleration, convolved in closed form over the last few seconds — it lags the roll and overshoots it, and any
frame still renders on its own. Counter-rotate by `-pose.roll` so it hangs plumb.

## Cast sheet (both ways)

The structure is not a character, but the legs are a rig. Before the film: `shot.mjs --shots leg --ts 0,1.6,3.2,4.8
--sheet` (a leg through its cycle) and the same from the other side (`--cam` with negative z), plus `foot` and `back`.
Look for: knees bending the same way on both sides, cylinders not bottoming out, hoses not passing through plates,
toes flat when planted and drooping in swing, the foot never sliding in the print.
