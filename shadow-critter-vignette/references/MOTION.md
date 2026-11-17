# MOTION — beats as poses

Read `references/MOTION-QUALITY.md` at the repo root first. In this skill it becomes:

| principle | how |
|---|---|
| weight sets timing | small and light: 2.5–4 steps a second, a 0.15–0.25 s gather, a 0.2–0.35 s landing |
| planted feet | `walk` is distance-based (a short first step, alternating steps, a closing step beside the other foot); `turn` moves one foot at a time; the drift check measures the toe |
| anticipation / recovery | a big key has an `antic` key (the other way: crouch, lean back, arm back) ≤ 0.6 s before and a `settle` key after (`ease: 'back'`) |
| believable behaviour | stance and gaze per beat in the brief; the eyes lead (`gaze` now), the head follows (turn / tilt averaged over 0.2 s) |
| alive at rest | `life`: breath, irregular blinks (some doubles); the wait holds still but breathes |
| whole body together | the hand rides the moving thing; tiptoe, lean and crouch go with the reach; tail and cloth trail the pelvis |

## Poses
```js
walk(C, { from: [X, Z], to: [X, Z], t0, t1, stride: 1.6 * C.a })   // .contacts → footsteps
turn(C, { at: [X, Z], from: yaw0, to: yaw1, t0, t1, steps })      // ≥ one step per 1.25 rad
stand(C, { at: [X, Z], yaw })
keyed(base, [{ t, ease, lean, crouch, hop, tiptoe, squash, shift, arms: { L, R }, head, antic, big, settle }, …])
seq([[tEnd, pose], …])
```
`ease`: `smooth` (default), `in`, `out`, `snap` (a press, a flinch), `back` (overshoot and settle), `hold`.
A walk that starts after a turn should start ~0.1 s after the turn's last step (steps never closer than 0.16 s).
To turn through the back, keep the yaw continuous (`yaw + 2π`).

## Hands on things
`arms: { R: { target: t => R.proj(...), w: 1 } }` — a function of time, so the hand stays on a book that tilts or a lever
that goes down. Key the thing and the hand from the same function. The hand check counts only between two keys that
both put the hand on the target.

## The beats
- **arrive** — walk in, 3/4 to the camera if you can (the face shows).
- **look** — stop, turn (stepped), eyes first, then the head: the thing.
- **try** — the small version: arm up first, then the reach, tiptoe if it's high; the thing answers a little.
- **wait** — hold ≥ 1 s, looking where the result should appear; blink; nothing.
- **again** — gather, then the bigger version (a hop, both hands, a yank); land; settle.
- **nothing** — the thing does its ordinary thing; lids drop a little.
- **after** — what it does about it (puts it back, peeks in, gives up); then usually leave (stepped turn, walk out).

## Getting motion
Default: hand-keyed from the beats, as both bundled pieces are. A reference clip of *your* critter from a video model
can give better key poses (take key poses → rig numbers; never frame-match). Keep any clip outside the repo, name the
model / prompt / take in the brief, and ask the owner before any ElevenLabs or other paid call.
