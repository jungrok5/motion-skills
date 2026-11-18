# RIG — a cloak that follows the body a few frames late

"the cloak never moves with the body. it follows it, a few frames late. that delay is what makes it look like fabric"

## The skeleton
Body: `root` → `hips` → `spine` → `chest` → `neck` → `head` (+ `eye.L/R` for blinks); `upper_arm / forearm / hand`
under `chest`; `thigh / shin / foot` under `hips`. Rest pose: a relaxed A-pose, knees a touch forward.

The cloak (`cloak` part): N columns (`cloak_00 … cloak_08`) of `segments` bones each, from the shoulder line to the
hem, parented under `chest`. The mantle above the shoulder line has no bones of its own: its vertices ride the chest
(and blend to the neck at the collar), then hand over to the chains over a short band, so the shoulder has neither a
seam nor a lever. The cloak is one mesh with custom weights (`wfn`).

## The delay (pch/spring.py)
Every chain with `lag` keeps the last few seconds of its parent's pose. Joint `i` of `n` chases where the body's rest
shape put it **`lag × i / n` frames ago** — the shoulder line moves now, the middle a frame or two later, the hem
`lag` frames later. Everything that pushes the cloak arrives that late too: the arms' swing (`armKick`, a function of
the arm pose — not a collision), and the frame of the soft row limits (`twist`, `fold`). On top of the delayed goals a
particle step (Verlet, 6 sub-steps a frame, fixed → deterministic) gives the cloth its weight: inertia, `stiff` pull,
gravity (compensated at rest), `damp`, `drag`, a soft `cone`, collisions with legs, torso and the floor.

| param | cloak default | effect |
|---|---|---|
| `lag` | 3 (starter 4, postman 5) | frames the hem trails the body by. 2 = stiff canvas, 3–4 = wool, 5–6 = light cloth; < 1 fails the check ("moves with the body"), > 8 fails ("floats") |
| `stiff` | .08 | pull to the delayed rest shape; lower = more swing |
| `damp` | .1 | velocity loss; higher = settles sooner, loops close more easily |
| `drag` | .08 | air: the hem streams back on a run |
| `gravity` | .9 | how heavy it looks *when it moves* |
| `cone` | 62° | soft limit round the rest direction (smooth saturation, never a hard stop) |
| `twist`, `fold` | 30°, 22° | soft limits on sideways lean and inward fold of a column, so columns never cross |
| `armKick` | .9 | how much the arm on that side carries the side columns (the arms swing inside the cloak) |
| `collide` | legs, torso | capsules on thighs, shins, torso; the floor |

## Why soft limits and no arm collisions
A loop only loops if the cloth is periodic. Hard clamps (a cone or twist stop the hem hits at a slightly different
moment each cycle) and collisions with a swinging arm made the front edges flap differently every cycle: the run's hem
needed 21 cm of correction to close. With smooth saturation and the arm push as a function of the (delayed) arm pose,
the same run closes to 0.1 cm. The `loop` check reports this residual for every loop.

## Tuning, one change per pass (REVIEW.md names the knob)
Glued to the body (lag < 2 on a moving clip) → `lag` +1. Floats like silk → `lag` −1 or `damp` +.04. Loop needs
correction → `damp` +.04, softer `twist` / `fold`. Hem touches a leg → `flare` +.05 or shorter `length`. Hands poke
through → the cloak keeps clear of the hanging arm (`arm_x` in the part) — raise `flare` or lower `body.arms`.
