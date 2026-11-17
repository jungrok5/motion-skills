# BRIEF — 「__TITLE__」

> One sentence: what huge ordinary thing gets up and walks, where, at what hour, and why.

Fill every table before writing code (references/BRIEF.md explains each row). Numbers here go straight into
`colossus.js`; keep the two in step.

## 1. The colossus
| | |
|---|---|
| What | |
| Why it walks / where to | |
| Box (`CFG`) | `BODY_LEN`, `BODY_DEPTH`, `BODY_H` — and what the origin is |
| Ride height | `RIDE_H` |
| What it carries | |
| Its belly / where the hips bolt on | |
| Life on it | (lit rooms, people's things, smoke, animals, loose parts) |

## 2. Mass → motion
| | value | why |
|---|---|---|
| Legs | count a side, `LEG_X`, `HIP_Y`, `HIP_Z`, `FOOT_Z` | |
| Leg size / paint | `LEG_SCALE`, `LEG_PAINT` | |
| Cycle | `T`, duty, stride → speed | heavier and taller = longer cycle, later start, later stop |
| Body | bob, shudder, sway, roll | its idle breath — never zero |
| Follow-through | which loose parts swing on `lagSwing()` | |
| Anticipation / recovery | peel-off, sink + shudder after touchdown | |

## 3. Place, hour, weather
| | |
|---|---|
| Ground | mud share, water, ruts, plants, stones (`GROUND`) |
| Dressing | hand-placed things for the shots |
| Hour / sky / fog / key light | (`LOOK`) |
| Colour targets | measured sRGB for the main surfaces; windows ≈ 242,193,130 |

## 4. The film (9 beats)
| # | shot | t | what it shows |
|---|---|---|---|
| 1 | f_open | | something huge in the haze |
| 2 | f_side | | the whole thing, long lens |
| 3 | f_hero | | low 3/4 hero |
| 4 | f_foot | | a foot lands by the lens |
| 5 | f_belly | | it passes overhead |
| 6 | f_life | | life goes on up there |
| 7 | f_knee | | the machine: knee, pistons |
| 8 | f_puddle | | a mirror / a reflection |
| 9 | f_away | | it walks on into the haze |

## 5. Sound
Steps (ground, metal), groans, hydraulics, the place's own sounds, music root / chords / swells (`SOUND`).

## 6. Stills review (after the storyboard)
| shot | reads as one huge thing | weight / grounding | detail holds at framing | light & colour | composition | notes |
|---|---|---|---|---|---|---|
