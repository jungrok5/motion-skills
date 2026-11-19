# BODY — people in a ten-second scene (lib/body.js)

One rig for every renderer. A body is a 3D skeleton in metres (y up) posed by numbers and projected by a camera, so a
Canvas figure and a three.js figure come from the same joints, and front / back / left / right are always one body.

## Make
`Body.make({ id, seed, height, build, shoulders, child, hair, hat, coat, padded, scarf, bag, colors })` → a spec with
segment lengths from height (adults 7.5 heads, `child: true` 6.2), widths from build, a mass, a breath period and a sway
period of its own.

## Pose
`Body.pose(spec, P)` → `{ J, viol }`. `P`: root `x, z, yaw, ground`; `pelvisY` or `drop`; `fwd`, `lat`; `lean`, `side`,
`twist`; `headYaw`, `headPitch`; `breath`; `armL/armR: { pitch, abd, elbow }`; `footL/footR: { p, yaw, planted }`.
Legs are two-bone IK with the knee towards where the foot points; the pelvis lowers until both feet are reachable
(that is where the walking bob comes from). Out-of-range joints are listed in `viol` (elbow 0–150°, knee 0–155°, hip
−35–130°, shoulder pitch −60–185°, neck ±90° / ±45°, waist ±45°).

## Actors
`Body.actor(spec, { root(t) → {x, z, yaw}, walk, ground, idle, overlay(t, P, info), actions, t1 })`:
- **root**: where the body is — ease it; weight sets the timing (a bus driver, a grandmother and a child do not start alike).
- **footsteps**: planned once from the root's motion (`walker`): a foot steps when it falls behind where the hip wants
  it, lands ahead by half a stride, and **does not move while planted**. Turning in place makes steps too.
- **idle**: breath (chest and shoulders), weight sway, head drift — always on.
- **overlay**: the beat's poses — use `TSS.act(t, { t0, antic, dur, depth, over, settle, back })` for anticipation →
  action → overshoot → return with a bounce. Declare big moves in `actions` with the channel that should move *against*
  the action first (`pelvisY`, `head`, `handL`, `handR`) so check.mjs can measure the anticipation.
- **probe(t, camera)** returns feet (world, planted), joints, channels, actions, violations, height in px at its depth.

## Draw
- Canvas: `Body.draw2d(ctx, actor.pose(t), camera, { light, lightColor, ambient, rim, rimScreen, fog, shadow })` —
  parts depth-sorted; torso as the hull of a box (depth from every side); coat, padded quilting, zip, pockets, scarf,
  bag straps; hair placed by where the face points; contact shadow.
- three.js: read the joints and place instanced capsules per part (see examples/stadium-wave `PARTS`).

## Cast sheet
Define `cast() { return [spec, …] }` in the scene; `render.mjs scene.html --cast` draws every figure through eight
views, a walk, a stepped turn and a big move, facing right and facing left, with planted feet marked and the joint
report. Look at it before the scene: "did the neck turn or the torso?" is a failure.

## What check.mjs measures
Heads tall (adult 6.4–8.4, child 4.2–7.6) · joint violations · planted-foot slide ≤ 1.5 px between frames · every figure
moves at least min(0.6 px, 0.4 % of its height) within every 2 s · each declared big move first goes against its
direction by ≥ 0.8 px.
