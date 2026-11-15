# BODY — front / back / left / right and joint checks

The repo rule (CONTRIBUTING.md): every skill with characters checks each body for impossible bends and for front /
back / left / right. Here it is automatic plus two sheets.

## Automatic (hero.py check)
| check | how |
|---|---|
| facing | rest pose: eyes in front of the head (-Y), toes forward, `.L` hands, thighs and eyes on +X |
| joint limits, every frame | knee: the knee sits on the toe side of the hip–ankle line (folds back only), bend ≤ 150°; elbow: on the back side of the shoulder–wrist line (folds forward only); head vs chest yaw ≤ 90°, pitch ≤ 45°; chest vs hips yaw ≤ 45°; thigh behind the body ≤ 75° |
| feet | toes never under the floor, IK reaches the floor (miss ≤ 1.2 % of height), a planted foot moves ≤ 0.4 % of height per frame |
| direction | while walking, the root moves the way it faces (≤ 20°) |
| bake | Blender's evaluated pose = the solver's numbers (so the .glb and the checks show the same body) |

Limits live in `crc/body.py` `LIMITS`; the solver keeps them by construction (IK pole = foot direction, elbows bend
about the forward axis, turns spread over head / chest / hips), and the check proves it on every frame.

## Sheets (hero.py sheet)
- `out/turnaround.png`: front, 3/4 left, left, back, right, 3/4 right of the idle pose — the concept sheet. The back view
  becomes the review inset (or `concept/back.png` if the user gave one).
- `out/cast-motion.png`: idle, the middle of every turn / spin and two walk frames, each seen from **both** sides.

Score both with the BRIEF rubric rows 4–5: eyes, nose, buttons, goreum, toes in front; braid, back bow, hood behind;
left is left from both sides; knees and elbows bend the right way. A still that makes you ask "did the neck turn or the
body?" fails — fix the clip or the rig and log it in BRIEF.md.
