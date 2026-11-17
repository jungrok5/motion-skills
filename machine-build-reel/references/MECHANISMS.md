# MECHANISMS — joints, load paths, the stock builders, writing your own parts

## Load path first
Decide what holds the body up before any geometry, and write it in PARTS.md. Thin legs read as believable only when
the eye can find the structure:
- **Guyed mast** (ceramic finish): a compression beam per segment, tension tendons down its back on a spreader,
  an actuator across each joint. Long, slim, tall machines.
- **Box girder** (industrial finish): a painted box beam with stiffener ribs and bolt rows, a cable tray. Short, heavy.
- **Truss / ladder**: twin rails and rungs (the stock neck), lattice booms; light and long.
- The body bolts the limbs on through something you can point at: hip girders under a keel, coxa pedestals on a
  ladder frame, lugs either side of an abduction pin.

## Joints (all in `mbr/stock.py`)
| joint | made of | rides on |
|---|---|---|
| hinge | fork: two cheek plates on the upper part; a drum (with flanges) on the lower part between them; a steel pin through both; bolted flange rings and a cap on the cheeks' outer faces | cheeks + flange caps: upper bone; drum + pin: lower bone |
| abduction (mammal hip) | a block on a fore-aft pin between two body lugs; a fork at its foot for the thigh | block: `hip_<L>`; lugs: `body` |
| coxa yaw (insect hip) | a yaw drum in a bolted body ring, a coxa beam out to a fork | coxa: `hip_<L>`; ring: `body` |
| hydraulic actuator | barrel (eye, body, gland ring, port) + rod (eye, polished rod), each on its own bone aimed at the other; lugs (two cheeks, a web back to the beam, a pin) on the parts they pivot on | `act_<joint>_<L>_cyl` / `_rod`; lugs on the segment bones |
| foot | a steel ball at the end of the last segment in a socket cup; a hub under it with cheek pairs holding each toe's pin; toes with a curved tip, rubber pad, ceramic top plate | ball: last segment; hub: `foot_<L>`; toes: `digit<i>_<L>` |
| neck link | twin side rails, rungs, a drum and pin at the base, a cable bundle under, spine plates over (ceramic) | `neck_<i>` |

**Actuator anchors** are searched (`actuators.py`): for each powered joint every action is sampled; candidate pairs
(how far up the upper part, how far down the lower, which side, how far off the axis) are kept only if the barrel —
as long as the shortest pin-to-pin length allows, minus clearance for the far lug — keeps ≥ 20 % of the rod inside
at the longest stretch, and the line never passes closer to the pivot than the drum plus the barrel. The one with the
largest smallest lever arm wins. Sides alternate along the pin axis (hip outboard, knee inboard, …) so neighbouring
cylinders never meet. Give `anchors: {joint: {..., 'fixed': True}}` to pin one by hand.

## Limb keys (`MACHINE['limbs']`)
`name` (unique; `mirror()` makes the R copy of an L limb) · `role` leg | arm · `kind` mammal | insect | arm · `at`
(body space) · `segs` [2 or 3 lengths] · `knee` +1 / −1 (side the middle joint bulges: + = forward for a mammal, up for
an insect) · `gamma` (3-seg: lean of the last segment, degrees) · `coxa` (insect) · `hip_drop` (mammal: abduction pin
to flex pin) · `home` (x, y) on the ground (arms: x, y, z in body space) · `ball` · `digits` (count or spread angles) ·
`digit_len` · `width` · `drum` · `act` [0/1 per joint] · `act_lat` · `style` ceramic | industrial · `limits`
{joint: [lo, hi] degrees} · `anchors`.
Other keys: `body.z`, `neck.at`, `neck.links` [[length, angle from horizontal], …], `head.len`, `extras` (`fixed`,
`spin` {rate or `extra.<name>` key}, `lag` {lag s, gain, max_deg}), `palette`, `gait`, `idle`, `moves`, `plates`,
`reel`, `figure`, `figure_at`.

## Writing your own parts
```python
from mbr.geom import Mesh, T, RX, RY, RZ
def cab(k):
    m = Mesh()
    m.loft([(y, rx, rz, n, cx, cz), ...], 28, 0)          # lofts run along +Y (the head's forward)
    m.box(1.8, 0.16, 0.1, 1, c=(0, 0.6, 1.33))            # last positional arg = material slot
    k.part('CabBody', m, 'head', ('accent', 'frame'), stage=k.st('head'), bevel=0.03)
```
- Build in the **bone's frame** (`frame='bone'`, default) or in body space (`frame='body'`: X forward, Y left, Z up).
  Body lofts run along +Y — turn them with `M=RZ(-90)` to run along the body.
- Material slots index the `mats` tuple of palette **roles**; add a role to `palette` for a new colour (`'cargo'`).
- `stage` decides when it arrives in the assembly: `feet lower upper body hydraulics shells neck head lights`.
- `share='key'` reuses one mesh for identical parts (four legs → one mesh each).
- Scale: bolts, pins, cables at real sizes for the machine (a 25 m walker's pin is ~0.25 m across). The checks catch
  collisions, not scale — that is the rubric's job.
- Anything that moves gets its own bone: an `extras` entry (`spin` radar, `lag` antenna) and parts on it.

## Fixing a clash
`check` names the pair, the action and the time. Usual causes and fixes: an actuator through a cover → `act_lat`
or a slimmer cover; a hull edge hit by a folding thigh → hang the hips lower on girders; a trailing part folding into
its parent → shorter, different direction, smaller `max_deg`; a fold too deep in a move → a shallower key pose. Re-run
`check`; log the before / after number in BRIEF.md.
