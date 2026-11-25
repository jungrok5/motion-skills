# BRIEF — Lantern Hollow

## Topic
- **One line:** a child with a lantern crosses a forest hollow at night — leaf litter, a clearing of glowing moss, a creek and
  its mud banks, a rill to hop — on the way home.
- **Title / subtitle:** LANTERN HOLLOW / THE GROUND REMEMBERS EVERY STEP · EACH IN ITS OWN WAY
- **Day or night:** night (1), ambient deep blue `#3a4a86`, 5 light levels; light from the lantern (warm, flickering), glowing
  mushrooms (cyan) and the moss under each step (green-cyan).

## Grounds — one texture, each read its own way
| ground | kit or own | reads | what it does with the memory | remembers | step sound | slows / sinks |
|---|---|---|---|---|---|---|
| leaf litter | TK.leaves (autumn chips) | body | leaves are pushed aside and stay pushed; bare soil shows | 45 s | crackle | — |
| glowing moss | TK.moss | foot + body | each print lights up and fades; it lights the ground round it at night | 6 s | soft | — |
| creek (+ rill) | TK.water (night blue) | wave + body | rings that catch the lantern light, foam round the legs | 3 s | splash | .62 / 5 px |
| mud banks | TK.mud (wet grey-brown) | foot | deep prints with a pale water shine | 90 s | squelch | .8 / 1 px |

## Map
- **Size:** 900 × 560.
- **Shape:** the creek is a wandering north–south line at x ≈ 520 (water ±9 px, mud ±24 px); a rill at x ≈ 716 (water ±3.5,
  mud ±14); the moss clearing is a noisy ellipse at (320, 300); leaves everywhere else.
- **Decorations:** dark pines/broadleaves (canopy over a trunk) and bushes kept 40 px off the route; mossy rocks; eleven glowing
  mushrooms on the moss (small cyan lights); a mossy log; tufts on the mud.

## Walker
| field | design |
|---|---|
| who | a child in a yellow raincoat with the hood up, red boots, navy trousers |
| mass and why | 0.7 — a child: quick, short steps, short gathering |
| speed, step, accel, turn | 30 px/s, 6.5 px, 150 (→ 214 at mass .7), 170 °/s |
| art | down / up / right, 11 × 15, origin (5, 13); the face framed by brown hair inside the hood |
| asymmetric things | the lantern in the right hand → a follower at `handR`: in front facing right, behind the body facing left |
| followers | the lantern: a pendulum (lag .6, damp .14) that swings after every start, stop and turn; its glass glows (`glow: 'lL'`) and lights a 74 px circle that flickers |
| idle | breath, blink, weight shift (engine) |

## Route
| step | action | view | caption | beat |
|---|---|---|---|---|
| 0 | at (80, 262) right, wait 2.4 | world | | title; the lantern's circle in the dark |
| 1 | to (200, 282) | world | LEAVES ARE PUSHED ASIDE AND STAY | a cleared path behind |
| 2–3 | to (330, 300) → (420, 322) | world | MOSS LIGHTS UP UNDER EACH STEP | a glowing trail that fades |
| 4 | wait 1.8, face down | world | AND FADES | turn to watch it go out |
| 5–7 | to the creek, wade across | split | ONE TEXTURE UNDER EVERYTHING / THE CREEK RINGS OUT | the memory beside the world |
| 8–9 | to the rill's mud bank | world | MUD KEEPS DEEP PRINTS | deep prints with water in them |
| 10–11 | wait .8, hop the rill | world | A LANDING PRESSES HARDER | gather, fly, land |
| 12 | wait 1 | trail | THE MEMORY ITSELF | only the texture |
| 13–14 | walk off east | world | | home |

## Motion (weight)
Mass 0.7: starts gather ~110 ms; the hop gathers ~170 ms and recovers ~200 ms; the lantern swings back on every start and
forward on every stop, and its light moves with it.

## Review
Scored on `templates/BRIEF.md`'s list; check: every line `ok` (leaves stay pushed at +6 s; moss glows then fades; creek rings;
mud prints persist).
