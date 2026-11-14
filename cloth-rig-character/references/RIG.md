# RIG — bones in the clothes

"Put bones only in the body and the skirt and ribbon walk frozen. Put bones in the clothes and let them swing."

## The skeleton
Body: `root` (ground, carries position + yaw) → `hips` → `spine` → `chest` → `neck` → `head` (+ `eye.L/R` for blinks);
`upper_arm / forearm / hand .L/.R` under `chest`; `thigh / shin / foot .L/.R` under `hips`. Bone rolls are 0, rest pose is
a relaxed A-pose with the knees a touch forward (so the IK always knows which way they bend).

Cloth chains (`ctx.chain(name, parent, points, …)`): a row of connected bones `<name>.0 … <name>.<n-1>` following the
cloth's rest shape, parented under a body bone (skirt → `hips`, front goreum → `chest`, braid → `head`, daenggi → the
braid's last bone). Typical rows:

| cloth | chains × segments | parent |
|---|---|---|
| bell skirt / chima | 10–12 × 3–4 round the hem | hips |
| coat hem | 8 × 3 | hips |
| bow | 2 loops × 1 + 2 tails × 4 | spine (back) / chest (front) |
| scarf | 2 tails × 5 | chest |
| braid / ponytail | 1 × 5 (+ ribbon 1 × 3) | head |
| cape | 5 × 4 across the back | chest |

## Skin weights
Each piece lists the bones it may follow. Every vertex is weighted to its 3 nearest bone segments (inverse distance⁴),
so limbs bend smoothly and a skirt vertex between two rows blends both. Skirts follow **only** their chains — never the
thighs — so they swing instead of stretching. Rigid pieces (eyes, hat, shoes) follow one bone.

## Follow-through (crc/spring.py)
Each chain joint is a particle stepped 6× per frame (Verlet, fixed steps → deterministic):

| param | default | effect |
|---|---|---|
| `stiff` | skirt .045, bow tail .06, loop .1, braid .12, coat hem .14 | pull back to the animated rest shape; lower = more swing, more lag |
| `damp` | .07–.12 | velocity loss; higher = settles faster, less wobble |
| `drag` | .03–.08 | air resistance |
| `gravity` | .5–1.0 | how much gravity shows *when it moves* (at rest it is compensated, so the cloth hangs in its designed shape) |
| `cone` | 40–70° | max angle from the rest direction (never flips) |
| `twist`, `fold` | skirt 16° / 8°, cape 25° / 20° | skirt rows: sideways lag and inward fold limits; outward flare stays free, so rows never cross (a twirl would otherwise wrap the skirt round the legs) |
| `kick` | skirt .8 | the hem follows the knee and ankle on its side, so it swings with the stride |
| `collide` | skirt: legs; tails: torso, skirt | capsules on the thighs, shins and torso; registered skirt surfaces; the floor |
| `radius` | ~1 cm | particle radius for collisions |

What to expect: a turn makes the rows lag tangentially and then swing outward (flare) as the body stops; a walk makes the
hem swing with the legs and the tails bob with the hips; idle breathing barely moves anything. The checks measure it:
every chain must move ≥ 1.2 % of the height, and the turn must move the cloth ≥ 1.6× more than idle.

Tuning, one change per pass: skirt too stiff → `stiff` −.01; too floaty → `damp` +.03; tails through the skirt → add
`skirt` to `collide` and start them outside `ctx.outer_r()`; skirt wraps the legs on a spin → lower `twist`; long skirt
sags → raise `stiff` (gravity is compensated at rest, so a sag at frame 1 means a collision is pushing it — see check).
