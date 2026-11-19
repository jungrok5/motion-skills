# Motion — carrying a one-frame sprite

A Tessera sprite is one 16×16 picture: no legs to animate, no second frame. The repo's motion rules
(`references/MOTION-QUALITY.md` at the repo root) still apply — the motion is in **how the whole sprite is carried**.
All of it is code-keyed in `lib/engine.js` (`timing`, `Body`, `Game.gait`, `drawSprite`); no generated motion is used.
Every number is drawn in whole pixels, so the motion never blurs the pixel art.

## The parts

| rule (MOTION-QUALITY) | how a one-frame sprite does it | where |
|---|---|---|
| planted feet never slide | **hop gait**: a body on the ground travels only while it is in the air. Contact frames (planted, x frozen) alternate with hops (x eased: zero at take-off and touch-down, fastest at the top). A turn, a squat and a landing are planted too. | `Game.gait` |
| weight sets timing | `timing(mass)`: contact and hop frames, hop height, squat, landing squash and recovery, turn length, lean lag, squash spring, breath period — all from one mass number (√mass) | `timing` |
| anticipation and recovery | jump / pounce: **squat** frames (planted, squashed) before the take-off; a landing squashes by the impact speed and settles over `recover` frames on a spring | `stepPlatformPlayer`, `stepArenaPlayer`, `land` |
| inertia / follow-through | the top row of the sprite follows the body's mean velocity with a lag (sheared, whole pixels): it trails when the body sets off and swings past upright when it stops, then settles | `Body.carry`, `drawSprite` |
| turns are stepped | the body stays planted and narrows through the flip (a sliver edge-on) with a one-pixel step; a front-facing drawing is never mirrored — it turns by weight only | `Body.turnTo`, `carry` |
| every idle breathes | height ±1 px on an irregular period (two sines that never line up), and a weight shift (lean ±1 px) every 1.5–5 s at random; flyers bob 0–3 px | `Body.carry`, `pose` |
| the whole body together | squash, lean and lift come from the same body state: a squat squashes and leans; a take-off stretches; the lean lags the squash | `Body` |
| believable behaviour | enemies decide only while planted (a hop, once begun, finishes); a chaser that sees the player re-aims on every contact; a stomped body goes flat and pops, a pounced beetle flattens and slowly pulls itself back up | `stepPlatformEnemy`, `stepArenaEnemy`, `interact` |
| flat feedback is slop | landing dust, a screen shake scaled by mass, pick-up sparkle and pop, stomp shake, hurt blink and knock-back, a sound for each | `land`, `interact`, `Sound` |

## Feet on the ground

The engine draws every sprite from its **foot row** (its lowest opaque pixel) at the body's foot point, so a sprite
whose picture has empty rows at the bottom still stands on the ground line. Squash is anchored at the feet. Items and
flyers get a shadow on the ground under them; anything else touching the ground has no gap.

## What check.mjs measures (on a flat test yard, every moving member, both ways)

- planted drift — max px a planted body moves (fail > 1; the engine gives 0)
- idle — distinct drawn heights / lean offsets / lifts over 3.5 s (fail if all are 1)
- facing — frames moving against the facing (fail > 0)
- stepped turn — turn frames ≥ 3 with no travel (side-facing drawings)
- anticipation — squat frames before leaving the ground (fail < 2)
- landing — lowest drawn height on landing (fail above 95 %)
- stop overshoot — px the top swings past upright after a run (fail < 0.5)

## Cast sheet

`scripts/sheet.mjs` draws every moving member facing right and facing left: IDLE ×4, HOP (one cycle), STOP ×5,
TURN, SQUAT, LIFT, APEX, LAND, SETTLE, RECOVER — a grey ground line under each planted cell. Items and goals get an
idle strip. Judge it with the review in references/BRIEF.md.
