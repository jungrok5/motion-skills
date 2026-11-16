# MOTION — taking the slop out of a cut-out film

Read the repo's `references/MOTION-QUALITY.md`. How each rule lands here:

| rule | where | how |
|---|---|---|
| 1 weight | `motion.mass`, walk stride / cadence | heavy: slow head spring, long counter-move, longer stride, slower cadence (Grandpa); light: quick (Mina) |
| 2 inertia | motion.js, critters | hair lags the head, the scarf and basket swing, earrings swing, the dog's tail and ears |
| 3 anticipation / recovery | `keyed` keys | `antic` (the gather, the other way) ≤ 0.6 s before `big`, then `settle`; `check.mjs` fails without them |
| 4 believable behaviour | beats | eyes lead, the head follows, expressions per beat (surprised → shy → pleased) |
| 5 alive at rest | motion.js, `stand`, critters | breath, irregular blinks, weight shifts over planted feet, flyaways; every shot has life besides the cast |
| 6 feet that step | `gait` | distance-based: a planted foot stays exactly at its plant until it lifts; the walk eases in and out without skating; the stride snaps so both feet end planted; `check.mjs` measures drift and reach |
| 7 the whole body | `walk` | pelvis bob (lowest at heel strike), arms swing against the legs, a slight lean while moving, the head rides the bob |

## Where keys come from
A video-model clip of your character doing the beat (outside the repo; ElevenLabs or any paid generator only with the
owner's yes for that request) → read the key moments → write beats and keys. Or set them by hand from observed timing and
say so in the brief. The starter and the example are hand-keyed.

## Cadence
Children ≈ 2–2.3 steps/s, adults ≈ 1.8–2, elders ≈ 1.6–1.9. Choose `from`, `to` and the seconds so the walk lands there
(steps = distance / (stride / 2)). `check.mjs` reports the step spacing.
