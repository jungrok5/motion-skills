# MOTION — a portrait that is alive, not animated

Read `references/MOTION-QUALITY.md` at the repo root first; this is how its rules land on a bust. The film is the
drawing being made (`motion.draw` seconds) and then the character alive (`motion.live` seconds); a live page keeps going.

## What moves, and the rule each motion follows

| part | motion | rule (MOTION-QUALITY) |
|---|---|---|
| chest | rises and falls (body scales from its planted bottom edge, in quicker than out, depth drifting) | 5 alive at rest; 6 the planted edge never slides (`check.mjs` measures it) |
| head | rides up a quarter-second after the chest | 7 force travels: chest → neck → head |
| eyes | saccades: fast spring (ω 34, ζ 0.62) with a little overshoot | 2 inertia |
| head turn / tilt | waits for the eyes (lead), makes a counter-move the other way (anticipation), turns on the mass's spring, overshoots and settles | 3 anticipation and recovery; 1 weight sets timing |
| shoulders | a third of the head's turn, later | 7 the whole body together |
| hair | hangs from the crown and lags the head (a softer spring), swings past | 2 follow-through |
| flyaways | sway on their own and pick up the hair's speed | 2 |
| earrings | pendulums pushed by the head's sideways acceleration | 2 |
| blinks | seeded, irregular (s.d. ≥ 0.35 s), a few doubles, one at the start of each real head turn | 5 |
| face | expressions ease in (default 0.09 s; a beat can set `ease`) | 4 the pose says the intent |

## Mass (`motion.mass`)

| mass | head spring ω / ζ | eye lead | counter-move | hair ω | breath depth | head beats at least |
|---|---|---|---|---|---|---|
| light (child, small animal-like) | 13 / 0.48 | 0.08 s | 0.10 s, 22 % | 7.5 | ×1.0 | 0.6 s apart |
| medium (adult) | 9.5 / 0.52 | 0.10 s | 0.15 s, 26 % | 6 | ×1.0 | 0.75 s apart |
| heavy (elder, big, tired) | 6.5 / 0.62 | 0.14 s | 0.22 s, 30 % | 4.6 | ×1.25 | 1.0 s apart |

## Beats

```js
export const motion = {
  draw: 7, live: 10, mass: 'medium', expression: 'wary', seed: 7,
  breath: { period: 4.2, depth: 1 }, blink: { mean: 3.4 },
  beats: [                                   // t = seconds after the drawing ends; a live page repeats them every `live` s
    { t: 1.0, gaze: [.7, 0] },               // eyes only
    { t: 2.4, gaze: [-.6, .1], head: { yaw: -.12, tilt: -.04 } },   // a glance the head follows
    { t: 5.0, face: { mouthOpen: .9, lids: .9 }, ease: .45, breathe: 2 },   // a slow face change with a deep breath
    { t: 6.5, expression: 'pleased' },
  ],
};
```

- `gaze` [x, y] in −1..1 (x right, y down) inside the eye. `head.yaw` (± ≤ 0.25 live) and `head.tilt` (± ≤ 0.35) in
  radians; the runtime adds lead, counter-move and overshoot — do not key them yourself.
- `expression`: `wary`, `calm`, `pleased`, `surprised`, `sleepy`, `stern`, `shy` (motion.js `EXPRESSIONS`), or `face`
  with any of `browTilt` (+ inner ends up), `browLift`, `mouthCurve` (− frown … + smile), `mouthOpen`, `lids`.
- `blink: false` on a head beat skips its turn-blink (e.g. the eyes are already shut in a yawn).

## Where the keys come from

The repo's default (MOTION-QUALITY method 6): a still of **your** character → a video model animates that image doing
the beat (a glance, a yawn, a laugh) → read the key moments off the clip (when the eyes move, when the head starts,
how far it goes, how long the hold is) → write them as beats; the runtime's springs do the in-betweens. The clip is a
reference: keep it outside the repo (a git-ignored `ref/` or scratch), never in `docs/`, and name it in the brief (model,
prompt, take). **ElevenLabs or any paid generator only after the owner says yes for that request.** No clip? Set the
keys by hand from observed timing and say so in the brief — never claim a reference you did not use.

## The big move

A bust's big moves are face-and-head moves: a yawn, a laugh, a sneeze, a startle, a sigh. Build them from beats:
the gather (a breath in with `breathe`, lids or brows first), the action (head + face, with `ease` for slow parts),
the hold, the recovery (a smaller head beat back, a blink, an expression after). The cast sheet's glance rows show the
keys of a glance both ways; `check.mjs` fails a head beat with no counter-move (< 3 %), no overshoot (< 2 %) or too much
(> 35 %), eyes that do not lead (< 0.06 s), hair that does not follow late, beats too close for the mass to land, a
frozen half-second, regular blinks, a planted edge that slides.
