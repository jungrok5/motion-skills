# GRAMMAR — the beats, the timing, the camera

One continuous take. A beat is a stretch of the take, not a shot: the camera flows from one framing to the next.

| beat | ~time (30 s) | what happens | camera |
|---|---|---|---|
| **the page** | 0 – 3 | the hero alive on the page (idle, looks around, at the world beyond) | close, at page height, 45–50 mm, f/2.8, focus on the hero |
| **the real touch** | 3 – 4.5 | the real pencil arrives (or another real thing); the hero startles: gather → hop/flinch → settle | eases back to include the pencil |
| **the way out** | 4 – 8 | the pencil draws something standing up from the page, stroke by stroke; the hero watches the tip | holds, small drift (parallax shows the drawing stands) |
| **off the page** | 8 – 12 | the hero walks to it (stepped feet), climbs or steps on | follows at the hero's height |
| **the way down** | 12 – 15 | the drawing carries the hero down to the ground (it may draw itself on ahead); landing: deep knees, settle | rides along (keys sampled from the hero's own path), descending to ~4–6 cm above the ground, lens to 40 mm |
| **the world** | 15 – 17 | awe at the real place; a look around | low, the ground sharp at the feet |
| **the drawn thing** | 17 – 20 | something is drawn beside/above the hero (by the pencil in a close frame, by itself in a wide one) and comes to the hero | holds; focus on the hero |
| **real** | 20 – 21.5 | the touch: the drawing turns real from the touch point (scan or built mesh, glints at the edge) | holds |
| **after** | 21.5 – 26 | the real thing acts; the hero acts with it (anticipation and recovery for each pull or push) | follows what moves, focus pulls between them |
| **the close** | 26 – 30 | a frame drawn round the hero and the thing; outside it the world goes back to paper | settles and holds |

Short form (15–18 s, the template): page 0–2 · way out 2–5 · off/down 5–10 · drawn thing 10–12.5 · real 12.5–14 · close 14–16.5.

## Timing rules
- Drawing speed: the pencil draws ~150 mm/s (`rate`), lifting 0.06 s between strokes; things drawing themselves 300–600 mm/s.
- The hero is ~7 cm tall: walking ~5 cm/s, a step every ~0.25 s; a hop 0.3 s in the air; landing crouch 0.4–0.6 s.
- Every big move is an `F.action` with anticipation ≥ 0.15 s and recovery ≥ 0.2 s (check.mjs).
- Something is always alive or being drawn; idles never stop breathing.

## Camera rules
- Keys: `{ t, pos, look, mm, fstop, focus | focusOn }`. The first and last keys start and stop at rest; the ones between
  flow. During a fast move, generate keys from the moving thing's path (`examples/kite`: `slideKeys`).
- Focus follows the hero (`focusOn: 'hero'`), or a function of t (between the hero and the kite).
- The real pencil only appears when the camera is close enough that its far end leaves frame (check.mjs counts frames
  where the back end is in frame). In a wide frame let the drawing draw itself.
- Keep the camera off the table plane by at least a few mm, and outside the drawn planes it rides past.
