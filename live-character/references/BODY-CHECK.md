# Body check for live-character

The rig is front-facing 2.5D: no side or back views. "Both directions" means every turn, tilt and one-sided pose is
seen to the left and to the right on the cast sheet (`scripts/sheet.mjs`), and idle moves run mirrored both ways in
`check`.

## Directions
1. Head, chest and feet face the viewer; the head turns at most ±15° in idle (the rig caps it), the torso ±12°, the lean ±5°.
2. On a turn, the eyes, the nose / muzzle and the mouth all move toward the turn (they are deeper than the face
   outline); the far half of the face narrows. If the outline moves more than the features, the depths are wrong.
3. Back hair and ears behind the skull move against the turn (negative depth); bangs move with it, a little more than the face.
4. Clothes keep their front in front: plackets, buttons, zips, collars on the torso transform (`body2`), never on the head.
5. Asymmetric details (a hair clip, a parting, a tag) stay on their side whatever the pose.

## Joints (numbers in each limb's `lim`; `check` fails a pose that asks past them)
1. Arms (front view): `sh` −30…170 (across the chest … overhead), `el` −150…165 (in toward the body … up), `wr` ±70,
   pitch 0…80. The forearm never passes through the upper arm.
2. Forelegs of a quadruped: `sh` −15…25, `el` −60…20; lifted (`pu`) the lower leg hangs back from the raised elbow — it
   folds backward, never forward.
3. Bone lengths are fixed (two-bone FK / IK). Planted feet stay on their ground point (IK), with slack: the legs must be
   longer than the shoulder-to-ground distance, or breathing pulls them off the ground.
4. A lifted foot lands when the leg's pitch comes back down, not when the pose's weight reaches zero.
5. Hands and paws near the face are drawn in front of it (`front: 1`); a raised arm does not hide the face.

## The sheet
Score every tile: front; left / right ends; up / down ends; tilts both ways; both diagonals; eyes closed; mouth shapes;
every expression; every pose held; every action at its peak. Fail it for anything in the brief's still review.
