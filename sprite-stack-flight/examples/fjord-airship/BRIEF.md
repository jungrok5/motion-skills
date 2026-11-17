# BRIEF — The Winter Post

## Topic
- **One line:** a slow mail airship carries the winter post up a fjord at blue hour — warm gondola windows against a cold world.
- **Title / subtitle:** THE WINTER POST / NORTH OF THE LAST ROAD

## Craft
| field | design |
|---|---|
| what it is | a small rigid airship with a gondola and two engine pods |
| mass and why | 4 — huge, slow, it leans into turns late and never rolls |
| speed, turn, bank limit | 11 cells/s, .7, 22° |
| model size | 31 × 46 × 19 voxels (+1 outline slice) |
| palette | canvas #d8d0bc / #c6bea8 panels, red band and fins #a8322c, frame #4a3a30, warm windows #ffd27a, outline #1a1a2c |
| parts | panelled envelope, a red band, cruciform fins, the gondola with lit windows, two pods on struts |
| animated part | the two pod propellers, 2 frames at 16 fps |
| nav lights | side-fin tips |
| trail | none |
| can it roll? | no |

## World
| field | design |
|---|---|
| place | fjords: steep mountains cut by long deep inlets |
| shape | fbm base + cubed ridged noise for peaks; two noise contours carved to −6 for the fjords |
| terrace bands | 1 shore stones · 2–9 dark pine with snow patches · 10–18 blue-grey rock with snowfields (more higher up) · 19+ snow in blue light |
| water | navy ramp, rare warm glints (the last light), ice floes |
| decorations | pines (some snow-capped), red boat houses with one warm window, ice |
| landmark | the fjord itself — the plan follows it north |
| time of day | blue hour: pink horizon → deep indigo zenith with 140 stars, lilac fog |
| clouds | 30 clouds above the ship (base 52–64), cool tones, slow wind |

## Cockpit
- **The seat:** the gondola's bridge.
- **In view:** a bay of tall leaning window mullions, a roof beam with a lamp, a wooden console.
- **Instruments:** compass binnacle, altitude readout, the engine telegraph (AHEAD), the ship's wheel.
- **Live part:** the wheel turns with the bank command (the helmsman leads the turn), the telegraph lever follows the throttle.

## Plan
| t | dur | cam | bank | climb | thr | caption | beat |
|---|---|---|---|---|---|---|---|
| 0 | 5 | over | 0 | 0 | .5 | | up the fjord; title |
| 5 | 4.5 | over | 8 | | | | a slow lean |
| 9.5 | 6 | chase | 0 | 2 | | | three-quarter from behind (chaseSide 16), the mountains |
| 15.5 | 5 | chase | -14 | | | | |
| 20.5 | 6 | cockpit | 0 | -2 | .6 | | the bridge |
| 26.5 | 4 | cockpit | 12 | | | | the wheel turns |
| 30.5 | 6 | over | 0 | 3 | | THE WINTER POST ARRIVES | |

## Motion
Mass 4: bank answers in ~1.2 s, small overshoot; no roll; the camera swings after the heading.
