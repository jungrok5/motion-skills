# CAST — characters, rigs, poses

```js
import { Actor } from '../lib/body.js';
import * as W from '../lib/wear.js';
const head = { /* a storybook-portrait design: head, face, ears, hair, extras (W.beanie(), W.beret(), W.bucket(), W.glasses(), your own) */ };
const body = {
  coat: { color, pattern: { type: 'solid' | 'stripes' | 'checks' | 'dots' | 'quilt', colors, width, gap }, length: 2.7, width: 1.7, shoulder: .9, placket: true, buttons, collar, pockets },
  legs: { color, w: .2, thigh: 1.25, shin: 1.3 }, shoes: { color, size }, arms: { color (default: coat), upper: .85, fore: .8, w: .4, mitten },
  scarf: { colors: [a, b], tail: 1, wind: .35 }, held: { draw(ctx, hand, actor, pose, t) }, extras: [{ layer: 'behind' | 'front', ops: A => [...] }],
};
export const HERO = new Actor({ name: 'Hero', seed: 7, head, body: { ...body, a: 64 } });
export const HERO_CLOSE = new Actor({ name: 'Hero (close)', seed: 7, head, body: { ...body, a: 220 } }, { res: 1.2 });
```
- One design, several sizes: the close-up and the wide shots are one person (same seed, same head design).
- A prop the topic needs is a `held` drawer (a basket, a cone, an umbrella) or a body/head extra — never an edit to `lib/`.
- `actor.groundFor(headY)` gives the ground y that frames a close-up on the head.

## Poses (lib/film.js) — a pose is a function of shot time
| helper | what | rules it keeps |
|---|---|---|
| `walk(actor, { from, to, y, t0, t1, yaw, stride })` | eased walk; distance-based gait; arms swing against the legs; pelvis lowest at each heel strike; `.contacts` = heel strikes | planted feet never move; stride snaps so both feet end planted; facing = direction |
| `stand(actor, { x, y, yaw })` | weight shifts over planted feet, arms hang and breathe | feet stay put |
| `sit(actor, { x, y, seat, arms })` | front-on on a seat; coat bunches on the lap; feet on the floor or dangling | pelvis on the seat |
| `keyed(base, keys)` | layered keys: `lean`, `crouch`, `hop`, `arms` | `antic` → `big` → `settle` for big moves |
| `seq([[tEnd, fn], …])` | one pose after another | |

Arm angles: `a` = shoulder angle from hanging (radians, + towards the facing; front-on, + towards screen right), `e` =
elbow bend 0–2.4 (forearm folds forward). Knees fold forward by IK (the shin folds back); range 0–2.6 rad.

## Head motion
`motion: { mass, expression, gaze, breath, beats }` on each cast entry — storybook-portrait's `motion.js` (eyes lead,
counter-move, overshoot, hair lag, blinks, breath, expressions). Beats are in shot time.

## Checks (film.rig())
Per actor per shot, every 1/30 s: knees fold the right way (cross product against the facing) and within range; ankles
reach their targets (≤ 1.5 px); planted feet drift ≤ 1 px; elbows in range; walkers face the way they move.

## Cast sheet
`index.html?cast` (or `render.mjs --cast`): each actor turned −0.45 / 0 / +0.45, seated, and the walk cycle at four
phases to the right and to the left. Score it before writing shots: "is the neck turned or the body?", "does a knee
bend backwards?", "does the near shoulder sit on the back side?".
