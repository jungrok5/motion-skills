# Animation principles — the pass every moving thing gets

A shared note for every skill in this repo that moves anything: bodies, creatures, mascots, props, logos, cameras, UI.
Read it with [`MOTION-QUALITY.md`](MOTION-QUALITY.md) (what reads as AI slop and why) **before keying motion**, and when
you add a skill. This note is the how: the twelve principles as a pass you apply in a fixed order, the numbers to start
from, a toolkit you can copy, and a meter that tells you — in numbers — whether the pass happened.

Source of the method: the `principle-pass` skill, made after Endel's X post "when you ask AI to follow Disney's animation
principles" (https://x.com/endel/status/2125224240488354066?a=X8s7fGWOhQz93WbUoz8&s=19): the same beat before and after
the principles, stacked. The principles are Thomas & Johnston's twelve (*The Illusion of Life*, 1981).

## The idea: story keys first, then the pass

1. **Story keys** (pose to pose): only the poses that tell what happens, at their times. Played linearly this is what a
   first pass gives — and what reads as stiff: everything moves at one pace, every part on the same curve, on straight
   lines, feet skating, nothing alive between moves.
2. **The pass**: leave the story poses alone and add, in this order —
   1. **timing & spacing**: hold where it matters, ease in and out of every key (never linear on a body);
   2. **anticipation**: a key before each big move, the other way;
   3. **arcs**: the root path is one smooth curve through the keys; speed carries through apexes; limbs swing on lifted arcs;
   4. **planted contacts**: feet / hands / bases locked while they bear weight, stepping between;
   5. **follow-through & overlap**: tails, ears, hair, cloth, antennae, held things, secondary elements on springs —
      they start late, overshoot, settle late;
   6. **squash & stretch**: on impacts and fast moves, area kept;
   7. **secondary action**: breath, blinks, flicks, sway — nothing is ever a still picture;
   8. **exaggeration**: push the pass keys past the story poses until it reads at thumbnail size;
   9. **staging, solid drawing, appeal**: judged on stills — silhouette readable, volume kept, the thing is lovable.
3. **Measure** both: the first pass should fail the meter, the pass should pass it.

## The twelve, as numbers

| principle | without it (the "before") | recipe — start here | toolkit (`principle-pass/lib/principles.js`) | meter id |
|---|---|---|---|---|
| squash & stretch | rigid on impact; or shrinks / balloons | 0.85–0.92 on contact, 1.05–1.15 at speed; cross axis = 1/s; a spring (f 4–5, z .3) wobbles it back | `squash(s)`, `stretchFromVelocity`, `dynamics` | `squash` |
| anticipation | moves start from nowhere | 10–25 % of the move the other way, 0.15–0.6 s before (longer for heavier / bigger moves) | `anticipate(a, b, .2)`, `E.inBack`, `dynamics({ r: -.5 })` | `anticipation` |
| staging | the action hides behind the body | side or 3/4 view chosen per beat; silhouette test at every story key | — | judged |
| straight ahead / pose to pose | — | pose to pose for the story; straight ahead (springs, sims) for what follows | `keys`, `dynamics` | — |
| follow-through & overlapping action | parts move as one block, stop dead | parts lag 2–6 frames per joint down the chain; overshoot and settle over 0.2–0.6 s | `dynamics({ f, z })`, `chain`, `lag` | `follow`, `overlap` |
| slow in / slow out | constant speed, sudden starts and stops | inOut on every key; `E.snap` for strikes, `E.back` for settles; `e: 'in'`/`'out'` only next to a mid-motion key | `E`, `keys` | `ease` |
| arcs | straight lines with corners at keys | a Hermite / Catmull path through the keys; no stop at an apex; feet lift `0.14·leg + 0.22·stride` | `catmull`, `arc`, `swing` | `arcs` |
| secondary action | dead idle | breath 2–4 s (rib / chest 2–4 %), blinks 2.5–5 s (some double), a flick every few seconds, sway with noise | `breath`, `blinks`, `flick`, `noise` | `alive` |
| timing | everything one pace | peak speed ≥ 2× average in a big move; weight: duration × √size | `timeFor(s, size)` | `timing` |
| exaggeration | correct but flat | push pass keys 20–40 % past the story pose (crouch deeper, lean further) | `exaggerate(v, base, k)` | judged |
| solid drawing | flat cut-outs, volume changes | keep volume under squash; near / far limbs layered and shaded; 3/4 where it helps | `squash` | judged |
| appeal | generic | clear proportions, readable face, one idea per pose | — | judged |

Spring starting points (`dynamics({ f, z })`, f in Hz): long tail f 1.4–1.8, z .4 · ears f 3–3.5, z .3 · hair / scarf
f 1.2–2, z .3 · antenna f 3–5, z .2 · a held prop f 4, z .5 · a camera f 1–1.5, z .9 (no overshoot) · UI pop f 3, z .55.
Bigger or heavier → lower f.

## Copy the toolkit, run the meter

**In a skill** (each skill folder works alone, so copy, don't import across folders):
```bash
cp principle-pass/lib/principles.js <skill>/lib/principles.js     # keep its header line
```
```js
import { E, keys, dynamics, chain, squash, breath, blinks, swing } from './principles.js';
const tail = chain(t => bodyAngle(t), 6, { f: 1.6, z: .42, t0: 0, t1: DURATION });   // precomputed: seek(t) stays stateless
```
**Expose a track** so the meter can read what the page draws (screen px, one sample per 1/60 s):
```js
window.__principles = { fps: 60, sides: ['after'],   // or ['before', 'after'] for a comparison
  track: side => ({ fps: 60, scale: bodyLengthPx, root: 'hips',
    points: { hips: [[x, y], …], head: […], tailTip: […], footL: […] },
    squash: [[sx, sy], …],                                  // optional
    beats: [{ name, t0, t1, big: true, point: 'hips' }],
    chains: [['hips', 'tailTip', 'chest']],                 // driver, follower, anchor (turns with the driver)
    planted: [{ point: 'footL', t0, t1 }], rest: [{ t0, t1 }], impacts: [t] }) };
```
**Run it**:
```bash
node principle-pass/scripts/audit.mjs --page <skill>/examples/x/index.html --strict
node principle-pass/scripts/audit.mjs track.json            # or before.json after.json
```
and put the same call in the skill's `check.mjs` (fail on `ease`, `arcs`, `anticipation` of big moves, `planted`, `alive`,
`teleport` — the rest as numbers). For three.js skills, project each point to screen px per sample; for 2D, use the
drawn positions. For things that are not bodies (logos, UI, cameras) use the rows that apply: ease, arcs, overshoot /
settle (follow), stagger (overlap), squash on impacts, timing — and leave `planted` / `alive` out of the track.

## What the meter measures

| id | passes when | the usual fix when it fails |
|---|---|---|
| `ease` | no part changes speed by > 35 % of its peak in one 60 fps frame (impacts excused) | a linear key, an `e: 'out'` after a hold, a foot leaving its plant at full speed, a hard IK clamp |
| `arcs` | no fast part turns > 30° in one 60 fps frame | a key with no arc through it; a channel that reverses at a key without inOut |
| `anticipation` | each big beat's point first moves ≥ 4 % of the move the other way | add the gather key (crouch, lean back, wind-up) |
| `follow` | after the driver rests, the follower keeps moving on its own ≥ 0.08 s | put the part on a spring instead of keying it rigid |
| `overlap` | parts start a big move ≥ 0.05 s apart | offset the chain (head / eyes lead, tail lags) |
| `squash` | ≥ 8 % range on big beats, area within 5 % | key squash on contact; derive the cross axis as 1/s |
| `timing` | peak speed ≥ 1.8 × average moving speed | hold before, snap through, cushion after |
| `alive` | something moves ≥ 0.6 px in every rest | breath, blink, flick |
| `planted` | a planted foot drifts ≤ 1.5 px | IK to locked targets; step, don't slide |
| `teleport` | the root never jumps > 0.2 body lengths in one frame | overlapping actions that restart from another spot |

Staging, solid drawing, appeal and exaggeration are judged on stills with the rubric in `principle-pass/references/BRIEF.md`.

## Gotchas (from `principle-pass/references/LESSONS.md`)
- `e` on a key is the ease *into* it: `'out'` starts the segment at full speed (a jump at the previous key), `'in'` arrives
  at full speed. Default inOut; carry speed through an apex with the path, not with eases.
- A channel that reverses at a key (a leg reaching then pulling) must slow to zero there.
- Lift feet by `sin²`, never `sin` (no vertical jump at lift-off); blend a long swing into the body's free pose with smoothstep.
- Ease a leg's IK out toward full reach instead of clamping it, or every take-off kinks.
- A foot target is the contact point both planted and free, or the release pops.
- Measure follow-through in a frame that turns with the driver, or a rigid part on a turning head reads as overlap.
- Springs are precomputed from t0 on a fixed step, so `seek(t)` is deterministic and order-free.

## Rules for this repo
- Generated motion stays a reference (see `MOTION-QUALITY.md`); code-only skills hand-key all of the above.
- A skill with moving bodies ships the MOTION-QUALITY checks; it **may** add the meter (recommended for new skills): copy
  `principles.js`, expose `window.__principles`, run `audit.mjs` from its `check.mjs`.
