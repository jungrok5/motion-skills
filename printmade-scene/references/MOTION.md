# Motion — weight, planted feet, breath (references/MOTION-QUALITY.md, applied)

The plate is still; what moves in it must move like a body, or the whole thing reads as "AI slop".

## Poses (lib/scene.js) — every pose is a pure function of t
- `walk(F, { from: [X, G], to: [X, G], t0, t1, step, lead, accel })` — distance-based: feet are planted at fixed points
  and the pelvis is carried between them, so easing the speed never slides a foot. `accel` (default 0.16 + 0.06 × (mass −
  1)) is the share of time spent speeding up and slowing down: heavy bodies start and stop late. Arms swing against the
  legs; the body leans a little into the walk. Heel strikes become footsteps. Pace: 1.3–2.6 steps/s.
- `turn(F, { at, from, to, t0, t1, first })` — a stepped turn: each foot lifts and re-plants under the new facing, one
  after the other (overlapping 16 %); planted feet never pivot.
- `stand(F, { at, yaw, t0, t1 })` + `keyed(base, keys)` — gestures over planted feet: `drop`, `lean`, `shift`, `head`,
  `arms` / `reach`; each key eases from the last with its own `ease` (`smooth`, `snap`, `back`, `in`, `out`).
- `seq(...)` — one figure's poses in time order; the earlier holds its last frame until the next begins. Make each pose
  end where the next begins (`stance()` is the shared start / end; hang the arms before a turn).

## The rules, as numbers
1. **Weight sets timing** — the brief gives each figure a mass; it drives `accel` and the breath period, and the brief
   uses it for gathers and settles (heavy: gather ≥ 0.35 s, settle ≥ 0.6 s).
2. **Inertia** — coats and skirts trail the pelvis (`flow`, from the pelvis velocity 0.1 and 0.2 s ago); held cloth hangs
   from the hands and swings with them; `back` easing overshoots and returns.
3. **Anticipation and recovery** — a big move is three keys tagged `antic` (the other way: crouch, wind back, breathe
   in; ≤ 0.6 s before), `big`, `settle` (≤ 1.2 s after). `check` fails a `big` without both.
4. **A believable stance** — gaze leads: the head turns and lowers before the hand reaches.
5. **Alive while still** — `life()` adds breath (3.2–4.3 s), irregular blinks (a double now and then) and a small weight
   sway over planted feet to every figure; `check` fails a frozen moment and fewer than one blink per 5 s on screen.
6. **Planted feet** — walks are distance-based, turns stepped, crouches bend the knees over planted feet; `check`
   measures every planted ankle on screen (≤ 1.5 px).
7. **The whole body** — the pelvis drops with the stride, the chest leans with the walk, arms swing a beat behind.

## Keys from a reference (optional)
Shoot or generate a clip of *your* figure doing the beat (kept out of the repo in `ref/`; ElevenLabs or any paid
generator only after the owner says yes for that request), pick the key poses, and write them as `keyed` keys (drop,
lean, head, hand targets) with their times. Never trace frames.
