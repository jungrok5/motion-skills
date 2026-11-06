# The motion recipe

Studied from LivLiv Player (github.com/livliv-dev/player, Apache-2.0, `runtime/idle.ts`, `actions.ts`, `puppet.ts`);
numbers re-tuned for vector characters. Everything is in `lib/rig.js`.

## Head and torso
- Targets wander on value noise (fbm of two octaves): yaw 4°, pitch 3°, roll 5°, torso turn 3°, lean 2.5° (× `wander`).
  Noise, not sines: a sum of sines repeats and the eye finds the loop.
- Targets are eased 0.12 s, then followed by damped springs: head [55, ζ 0.72] (a small overshoot), roll [45, 0.75],
  torso [14, 0.9] / [12, 0.9] (trails). `bounce` scales stiffness up and damping down.
- The torso also takes 0.35 of the head's turn and 0.18 of its tilt, 0.2 s behind, capped at ±12° / ±5°.
- Turns are soft-capped (yaw 15°, pitch 11°, roll 12°) while idle; actions may go further (to the rig's ±30 range).

## Face
- Breath: in 40 %, out 48 %, pause; each cycle 3.2–4.6 s (÷ `breath`). Shoulders rise ~5 px, the chest widens 1 %.
- Blinks: close 75 ms, open 120 ms; next in 1.8–5.6 s (÷ `blink`); 18 % double; a gaze jump > 0.5 brings one.
- Saccades every 0.6–2.2 s, a jitter of ±0.11 / ±0.08 around the attention; the gaze inside an ellipse 0.8 × 0.6.
- Attention: a pointer arriving → brow flash + chin lift; while it moves or for 2.2 s after → the head turns toward
  it (10° × `look`); resting on the face → a soft squint and a tilt; leaving → a look back with a small nod.

## Idle moves
Every 10–20 s (`moves`), never the same twice in a row, mirrored at random, faded out when the character talks or acts.
People: glance, lookAround, sway, think, lookDown, hum (+ tuck, fidget in haru). Animals: lookAround, glance, lookDown,
earFlick, sniff, tilt, pant, yawn.

## Chains (`CHAIN`)
| preset | k | damp | drive | hang | for |
|---|---|---|---|---|---|
| bangs | 170 | 12 | 1.1 | 0.08 | fringe |
| side / back | 70 / 50 | 6.5 / 5.5 | 1.4 | 0.6 | long hair |
| ahoge | 70 | 3.6 | 1.6 | 0.1 | the antenna lock |
| cord | 30 | 3 | 1.3 | 0.9 | drawstrings, straps |
| ear / floppyEar | 260 / 45 | 11 / 4.5 | 0.5 / 1.4 | 0 / 0.75 | pricked / hanging ears |
| tail | 55 | 4.2 | 1.0 | 0.05 | tails (wag through `target`) |
| tag | 20 | 2.2 | 1.6 | 1 | pendants, name tags |
Each chain gets ±12 % stiffness at random and its own wind phase, so neighbours never move in lockstep. Tips are
looser than roots (`tip`). `hang` keeps a piece hanging when the head tilts.

## Limbs
Springs [70, 0.7] toward the pose; a free arm hangs plumb when the torso leans and opens slightly on each breath; the
torso's acceleration throws it (pendulum). Planted limbs solve IK each step and land only when their pitch is back down.

## Temperaments (`temper`)
| feel | wander | bounce | blink | breath | moves |
|---|---|---|---|---|---|
| calm adult | 0.7 | 0.85 | 0.8 | 0.85 | [14, 24] |
| default | 1 | 1 | 1 | 1 | [10, 20] |
| bouncy kid / puppy | 1.2 | 1.25 | 1 | 1.3 | [6, 12] |
| sleepy cat | 0.6 | 0.8 | 0.6 | 0.8 | [12, 22] |
| nervous | 1.3 | 1.3 | 1.6 | 1.4 | [5, 10] |
