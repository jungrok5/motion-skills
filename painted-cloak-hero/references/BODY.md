# BODY — front / back / left / right and joint checks

The repo rule (CONTRIBUTING.md): every skill with characters checks each body for impossible bends and for front /
back / left / right, and takes the "AI slop" look out of the motion (references/MOTION-QUALITY.md at the repo root).

## Automatic (hero.py check)
| check | how |
|---|---|
| facing | rest pose: eyes in front of the head (-Y), toes forward, `.L` hands, thighs, eyes on +X, the cloak's chains behind the body |
| body, every frame of every clip | knee on the toe side of the hip–ankle line (folds back only), ≤ 150°; elbow folds forward only; head vs chest yaw ≤ 90°, pitch ≤ 45°; chest vs hips yaw ≤ 45°; thigh behind the body ≤ 75° |
| feet | toes not under the floor, IK reaches the floor, a planted foot moves < 3 mm a frame **on the scrolling floor** (in-place position + the clip's travel) |
| direction | a locomotion loop travels the way it faces |
| idle | the chest moves > 3 mm and the head > 4 mm over the loop, and it blinks |
| anticipation | the turn's root winds up > 1° against the turn before it turns |
| lag, trail, clear, loop | the cloak (RIG.md) |

Limits live in `pch/body.py` `LIMITS`; the solver keeps them by construction and the check proves it.

## Sheets (hero.py sheet)
- `out/turnaround.png`: front, 3/4 left, left, back, right, 3/4 right.
- `out/cast-motion.png`: walk / run contact and passing, the turn's wind-up and middle, idle — each from **both**
  sides.

Score both with the BRIEF rubric rows 3–5 and 8–9: buttons, clasp, toes in front; cloak behind; left is left from
both sides; knees and elbows bend the right way; nothing floats, skates or stands dead; the turn gathers and lands. A
still that makes you ask "did the neck turn or the body?" fails — fix the clip and log it in BRIEF.md.
