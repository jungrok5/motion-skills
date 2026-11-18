# CRITTER — the silhouette rig

```js
import { Critter } from 'scv/critter.js';
const kuma = new Critter({
  name: 'Kuma', a: 88, seed: 4,                       // a = head radius in world px at the reference depth
  ears: { type: 'bear', size: 1.05, spread: .7 },     // cat | bear | rabbit (droop) | mouse | fox | sprout | antenna | none
  eyes: { w: .24, h: .33, gap: .4, y: .08, pupil: 'oval' }, // pupil: oval | dot | none
  whiskers: 0,                                        // 0–3 per side
  tail: { type: 'puff' },                             // cat (len, w) | fox | puff | none
  wear: { type: 'scarf', color: '#c0473a' },          // skirt (len) | shorts | scarf | bag | hat | none
});
```

Proportions (in `a`): head 1.1 × 0.94, torso 0.8 wide × 1.0 tall, thigh 0.5, shin 0.5, upper arm 0.74, forearm 0.7.
Override `head`, `body`, `legs`, `arms` in the spec for a different build; keep the head about half the height.

## Facing and near / far
`yaw` 0 faces the camera, +π/2 faces screen right, ±π shows the back. A profile facing right shows the critter's
**right** side: the right arm is the near arm (drawn last), the right hip is the near hip. Front and back views draw
both arms at the sides. The head can turn on the body (`head.turn`, ±1.45 rad); eyes are drawn only on the face side.

## Pose (what `drawCritter` takes; the vignette builds it)
| field | meaning |
|---|---|
| `X, Z` | the pelvis over the floor (world) |
| `feet` | `[{ X, Z, lift, planted, k }]` — 0 = its left, 1 = its right; legs are 2-bone IK to these |
| `pelvis` | `[dx, dy]` local px (crouch is +dy) |
| `lean` | radians towards the facing (a profile shows it; front-on it reads as a dip) |
| `arms.L / arms.R` | FK `{ a, out, e }` (swing from down, sideways, elbow bend) and / or IK `{ target: [sx, sy] or t => [sx, sy], w }` |
| `head` | `{ turn, tilt, nod, gaze: [gx, gy], blink, lid }` |
| `tiptoe`, `squash`, `breath`, `tail`, `flare` | heels up; squash on landing; breath from `life`; tail and cloth lag (computed) |

## Joint limits (`JOINTS`, checked every frame by `film.rig()`)
- Knees fold **back** (the shin goes behind the thigh) in profile; bend ≤ 2.5 rad.
- Elbows bend ≤ 2.6 rad.
- Legs reach their feet (reach ≤ 1.0 leg length) — the walk sinks the pelvis so both feet reach at double support;
  tiptoe raises the pelvis only 0.08 a.
- Planted feet do not move on screen (≤ 1.5 px), measured at the toe.
- Neck turn ≤ 1.45 rad.
- Hands arrive at keyed targets (≤ 3 px) wherever two neighbouring keys both put the hand there.

## The arm and the head
The head is as wide as the arm is long. A hand target straight above the head ends *inside* the silhouette and the
reach disappears. Put targets beside the head (out to the facing side, at or a little above head height) and close
enough to reach on tiptoe; move the critter or the thing until the cast sheet and the stills show the hand.

## Cast sheet (`?cast`, `render.mjs --cast`)
Rows: turnaround (8 yaws), walk right, walk left, a stepped turn (3 steps, feet planted), the big move right and left
(rest → gather → jump-reach → land → settle), faces (open, blink, look up, glum, glance). Score it with the CONTRIBUTING
body rules before writing beats: "Is that the neck turning or the body?" on any cell is a fail.
