# BRIEF — The Last Well

## Topic
- **One line:** a salt courier crosses the dunes at noon to the last well before the salt flats, wades its pool and hops its channel.
- **Title / subtitle:** THE LAST WELL / ONE TEXTURE REMEMBERS THE WALK · EACH GROUND READS IT ITS OWN WAY
- **Day or night:** day (night 0), hot noon: warm sand, teal water, dry gold reeds.

## Grounds — one texture, each read its own way
| ground | kit or own | reads | what it does with the memory | remembers | step sound | slows / sinks |
|---|---|---|---|---|---|---|
| dune sand | TK.sand (warm tones, ripples) | foot | shallow prints, a darker top wall and a lit lip, filled by wind | 50 s | hiss | .9 / 0 |
| caravan road | TK.ground (packed, cracked) | — | nothing — the contrast | — | tap | — |
| dry reeds | TK.reeds | body | tall gold blades bend away from the body, overshoot, spring back; trodden ground darkens | 6 s | swish | — |
| well pool + channel | TK.water (teal) | wave + body | two rings from every step, foam round the body, a waterline on the legs | 3 s | splash | .62 / 5 px |
| wet shore | TK.mud (sand-brown) | foot | deep prints that hold a pale water shine, almost never fill | 80 s | squelch | .8 / 1 px |

## Map
- **Size:** 1000 × 560.
- **Shape:** the pool is a noisy ellipse at (560, 300); the shore is the next ring; a channel leaves it east as a wandering line
  (`n.wander(x, 312, 6)`), water ±5 px, shore ±14 px; the reeds are a noisy ring round the pool with a wandering gap to the
  south-east (the path); the caravan road is a wandering north–south band at x ≈ 270; sand everywhere else.
- **Edges:** reeds have a dark outline band and their blades stand up at the patch edge like a wall; the pool has a green bank
  line and lighter shallows; the road has a darker edge.
- **Decorations:** four palms round the pool, lilies (one in flower), sandstone rocks and dry bushes on the dunes (kept 22 px off
  the route), pebbles on sand and road, tufts on the shore.

## Walker
| field | design |
|---|---|
| who | a salt courier in a long cream robe, rust hood, teal scarf, belt with a brass buckle |
| mass and why | 1.1 — an adult walking steadily in heat, a little load |
| speed, step, accel, turn | 33 px/s, 8 px, 150, 170 °/s |
| art | down / up / right, 11 × 15, origin (5, 13); robe to the shins, legs show below the hem |
| asymmetric things | none (belt centred) — left mirrors right |
| legs / arms | brown trousers, dark boots; sleeves in robe shadow, outlined, hands skin |
| followers | the scarf's loose end: hidden at rest, it trails behind when walking and swings after stops (lag .45, damp .22, flare .07) |
| idle | breath, blink, weight shift (engine) |

## Route
| step | action | view | caption | beat |
|---|---|---|---|---|
| 0 | at (96, 300) right, wait 2.2 | world | | title over the dunes |
| 1 | to (250, 330) | world | DUNE SAND KEEPS SHALLOW PRINTS | the first prints |
| 2 | to (300, 350) | world | THE CARAVAN ROAD KEEPS NOTHING | the contrast |
| 3–4 | to (420, 380) → (520, 352) | split | ONE TEXTURE: FEET, BODY, RIPPLES / DRY REEDS BEND AWAY AND SPRING BACK | the memory beside the world |
| 5–6 | to (560, 340) → (600, 334) | split | THE WELL POOL RINGS OUT | wading: rings, slower |
| 7–9 | to (660, 360) → along the channel's shore | world | THE WET SHORE HOLDS DEEP PRINTS | deep prints |
| 10–11 | wait face down 1.4, turn up | world | | look back at the prints; a stepped turn |
| 12 | hop over the channel | world | A LANDING PRESSES HARDER | gather, fly, both feet, recover |
| 13 | wait .8 | trail | THE MEMORY ITSELF | only the texture: the gap where it flew |
| 14–15 | walk off north-east | world | | the end |

## Motion (weight)
Mass 1.1: starts gather 136 ms, the hop gathers 220 ms with a 2.4 px crouch and recovers 260 ms; corners at the reeds' gap
and the pool become arcs; the scarf end lags every start and stop.

## Review
Scored on `templates/BRIEF.md`'s list; check: every line `ok` (sand 152 / 150 / 76 px at +0.5 / 2 / 6 s; reeds bend then recover;
pool rings; shore prints persist; road 0 — the contrast).
