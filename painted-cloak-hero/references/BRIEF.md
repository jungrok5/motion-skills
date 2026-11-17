# BRIEF — topic → hero

Write `BRIEF.md` in the project **before** `character.json`. The brief is where the topic becomes a hero; the spec
is the brief in numbers. Copy the block below and fill every line.

```markdown
# <hero name> — brief

## One line
<who, wearing what, doing what> (e.g. "a ferryman in a sedge hat and a moss-green rain cloak, waiting at the landing, then off up the bank")

## Topic → design
- Topic / occasion: <what the user asked for>
- Silhouette in one shape: <hat shape over cloak shape — wide disc over a bell, cone over a column, cap over a triangle>
- Proportions: height <m>, heads <6.5–7.2 adult; ~4 for chibi>, build <0.9–1.1>
- Mass / weight: <light and quick | average | heavy and slow> — sets clip timings (walk cycle, turn "move")
- Palette (3–5): <hex + where>; the cloak's paint tones <dark, mid, light (+ accent)>
- Face: eyes <hex>, expression (small eyes for an adult; the hat shades the face)

## Concept (source step 1)
Front and back view, cloak included: <given by the user — concept/front.png, back.png | rendered with hero.py concept>

## Parts, in layering order (= the order in character.json)
1. hair: <bob / tail, colour, length>
2. trousers / skirt: <colour, fit>
3. shirt / top: <colour, sleeves, collar, buttons>
4. <belt, satchel, scarf … custom parts in parts.py>
5. boots: <colour, height>
6. cloak: <colour, length, opening, flare, fringe, clasp>
7. hat last: <wide / cone / beanie / cap …, brim fringe>
Custom parts (project parts.py): <name — why the library has none>

## Paint (source step 4)
| material | tones (dark → light) | stroke len × width (m) | direction | edge |
|---|---|---|---|---|
| cloak | #… #… #… | .14–.34 × .026–.05 | down (90) | frayed hem .06 |
| hat | #… #… #… | .03–.08 × .008–.016 | radial on the brim | frayed brim .02 |
| clothes | auto from the colour | style default | | |

## Cloak (source steps 5–6)
- chains × segments: <9 × 4>; lag <3–5 frames at the hem>; stiff <.06–.1>; damp <.1–.16>
- What should it feel like? <heavy wool: lag 3, damp .14 | light linen: lag 4–5, stiff .06>
- What must it never do? <cover the satchel, touch the floor on the run …>

## Clips (each on its own; the body does the moving, the cloak only follows)
| clip | dur | stance / gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| idle (loop) | 3.5–4 s | weight on one leg, looking <where> | — | breath 2× a loop, weight shift, blinks at <t> | — |
| walk (loop) | 0.9–1.1 s | upright, eyes ahead | — | stride .42 | — |
| run (loop, optional) | 0.6–0.7 s | lean 9° | — | stride .8 | — |
| turn (one-shot) | 2–2.4 s | <by ° and why> | wind-up against the turn | steps round over planted feet | hips settle; the cloak keeps swinging |

## Review scene (source step 7)
Backdrop / floor / grid colours, orbit <from° → to°> (default -25 → 80: front-left 3/4 round to the profile),
clip seconds in the review (default 3).

## Review log (one fix per line: what was off → the one change → result)
- <clip f…> <what was off, with the number from REVIEW.md> → <the one change> → <new number>
```

## Still rubric (score the stills, the turnaround, the cast sheet and each clip MP4; any 0 is a fail)

| # | Question | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | Does it read as THIS topic's hero at thumbnail size? | could be anyone | partly | unmistakable |
| 2 | Simple stylized adult proportions, one clear silhouette (hat over cloak)? | proportions drift | ok | strong shape |
| 3 | Layers: every garment over the one before, nothing poking through (hands through the cloak, skin at the crotch)? | pokes through | tiny gaps | clean |
| 4 | Turnaround both ways + back: eyes, buttons, toes in front, cloak behind, left = left? | flipped part | — | all consistent |
| 5 | Cast sheet: knees fold back, elbows forward, no "did the neck or the body turn?" moment | a bad bend | — | none |
| 6 | Paint: strokes read as paint on cloak, hat and clothes, glued to the cloth when it moves; the frayed hem is ragged like a painted edge | flat CG / stains | some | painterly |
| 7 | The cloak follows the body a few frames late — on the walk the hem trails and swings after the stride, on the turn it swings wide and keeps going after the feet stop | moves with the body | a little | clearly late, like fabric |
| 8 | Idle breathes (chest, weight shift, blink); does anything float, skate or stand dead still? | frozen / sliding | stiff | alive |
| 9 | Turn: wind-up, steps over planted feet, recovery? Does it gather and land? | starts cold | ok | convincing |
| 10 | Review frame: flat floor, fixed light, concept top right, HUD readable (name, time, counter), hero clear of the inset at every orbit angle | missing pieces | ok | matches the source scene |

`hero.py check` covers the measurable part (weights, facing, joint limits, feet, direction, lag, trail, clearance,
loops, idle, anticipation, paint, determinism) and writes `out/REVIEW.md` — the "what's off" list. The rubric covers
what only eyes can judge. Fix one thing per pass and log it.
