# MOTION — clips one at a time

```json
"motion": {
  "fps": 24,
  "start": { "x": -0.3, "y": 0.1, "yaw": -20 },
  "blend": 0.25,
  "clips": [
    { "type": "idle", "dur": 2.0, "blinks": [0.9] },
    { "type": "turn", "dur": 1.3, "to": 62 },
    { "type": "walk", "dur": 2.8, "stride": 0.42, "cycle": 0.78 }
  ]
}
```
Yaw 0 faces the default camera (-Y); +90 faces screen right (+X). Each clip starts where the previous one left the root;
`blend` seconds of cross-fade join them. `label` renames a clip in the HUD (`"label": "twirl"`).

| clip | keys | what it does |
|---|---|---|
| `idle` | `blinks [t]`, `sway`, `look` (head yaw) | breathing (chest), weight shift (hips sway + roll), small head drift, blinks (lids shut ≥ 2 frames at 24 fps) |
| `turn` | `to` (absolute yaw) or `by` (deg) | wind-up against the turn, ease to the new facing with the head leading and the chest following, a dip, two small steps (the foot on the turning side first); arms lift a little with the spin speed |
| `walk` | `stride` (× leg length), `cycle` (s per two steps), `bounce`, `arms`, `blinks` | the root moves forward (ramps up over half a cycle); feet are placed by distance travelled, so a planted foot never slides; two-bone IK legs; heel strike and toe-off; hips bob (highest at mid-stance), sway and twist; spine and chest counter-rotate; arms counter-swing |
| `spin` | `by` (360) | a twirl: the turn with arms lifting out — the showcase for a skirt that should bloom |
| `wave` | `side` R/L | idle with one arm raised and waving |
| `hop` | `height` | crouch, a small hop, land |

Review clip by clip: `hero.py stills --clip walk` renders 12 stills of that clip only. Add one in project `parts.py`:
```python
import math
from crc.clips import clip, idle
@clip('nod')
def nod(m, c, t, root):
    p = idle(m, c, t, root)
    p['head'] = (12 * max(0, math.sin(t * 6)), 0, 0)   # (pitch, roll, yaw) degrees
    return p
```
A pose dict: `root (x, y, yaw)`, `hips (dx, dy, dz, pitch, roll, yaw)` (offsets in the root frame), `spine / chest / neck /
head (pitch, roll, yaw)`, `arm.L/R (raise, swing, elbow)`, `leg.L/R (ankle x, y, z world, foot pitch, foot yaw)`, `blink`.
`m.arm_rest` is the arm raise that clears the skirt; `m.stand_feet(root)` gives standing ankle targets.

## The review camera
Fixed for the whole sequence (the source rule). `build.review_camera` frames every root position plus the hero's height,
from `camera.yaw` (−12°) and `elev` (7°), shifted left by 7 % of the walk span so the hero stays clear of the inset.
Override with `review.camera {yaw, elev, lens, fill, zoom, dx}`. Keep the walk short (2.5–3 s) so the hero stays big.
