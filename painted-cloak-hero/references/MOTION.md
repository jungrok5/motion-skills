# MOTION — cycles, one clip at a time

```json
"motion": {
  "fps": 24,
  "clips": [
    { "type": "idle", "dur": 4.0, "blinks": [1.2, 3.1] },
    { "type": "walk", "dur": 1.0, "stride": 0.42 },
    { "type": "run",  "dur": 0.66, "stride": 0.8 },
    { "type": "turn", "dur": 2.2, "by": 180, "move": 1.2 }
  ]
}
```
Each clip is baked as **its own action** (one glTF animation per clip, named by `label` or `type`) and reviewed on
its own. Yaw 0 faces the front camera (-Y).

## Loops (idle, walk, run)
Seamless: every term in the pose repeats a whole number of times in `dur` (rounded to whole frames), the walk / run
root advances at a constant speed, and the cloak is warmed up for three loops before frame 0 so it is in its steady
cycle; the last key equals the first. The hero is baked **in place** (the root's travel is taken off after the cloth
is simulated, so the cloak still trails as if moving); the review floor scrolls under the feet at the clip's speed,
so a planted foot stays locked to the grid. `motion.json` stores each clip's `speed` and direction for a game engine.

| clip | keys | what it does |
|---|---|---|
| `idle` | `dur`, `blinks [t]`, `sway`, `look` (head yaw), `breath`, `breathPeriod` (1.9 s) | breath 2–3× a loop (chest + head), weight shift once a loop (hips sway + roll), head drift on 1× and 3× periods, arms breathe; lids shut ≥ 2 frames |
| `walk` | `dur` (one stride cycle = two steps), `stride` (× leg), `bounce`, `arms`, `lean`, `stance` | feet placed by distance travelled (planted feet never slide), two-bone IK legs, heel strike / toe-off, hips bob and twist, spine counter-rotates, arms counter-swing |
| `run` | the same; defaults stride .78, dur .64, stance .36, lean 9° | flight phase, knees higher, arms bent 75°, bigger bob |

## One-shots
| clip | keys | what it does |
|---|---|---|
| `turn` | `by` (deg, 180) or `to`, `move` (s of turning; the rest is recovery) | wind-up against the turn, head leads, chest follows, two steps over planted feet, then the hips settle while the cloak keeps swinging |
| `wave`, `hop`, `spin` | (from cloth-rig-character) | still available as one-shots |

Weight sets timing: a heavy hero gets a longer walk `dur`, a longer `move` on the turn, a lower `bounce`.

## A clip of your own (project parts.py)
```python
import math
from pch.clips import clip, LOOPS, idle
@clip('lookout')
def lookout(m, c, t, root):
    p = idle(m, c, t, root)
    p['head'] = (-4, 0, 25 * math.sin(math.tau * t / c['dur']))   # (pitch, roll, yaw) degrees — whole periods per loop
    return p
LOOPS.add('lookout')            # bake it as a seamless loop
```
A pose dict: `root (x, y, yaw)`, `hips (dx, dy, dz, pitch, roll, yaw)`, `spine / chest / neck / head (pitch, roll,
yaw)`, `arm.L/R (raise, swing, elbow)`, `leg.L/R (ankle x, y, z world, foot pitch, foot yaw)`, `blink`.

## The review camera and floor
The hero stays on the spot; for every clip the camera orbits from `review.orbit[0]` to `orbit[1]` (default −25° →
80°: front-left three-quarter round to the left profile, as the source's view swings) over `clipSeconds`, eased. The
light never moves (the source's "fixed light"). The target sits `camera.dx × H` to the hero's side so the hero stays
left of the concept inset. The floor scrolls one grid step at a time (wrapped), so it never jumps.
