# BRIEF — topic → hero

Write `BRIEF.md` in the project **before** `character.json`. The brief is where the topic becomes a character; the
spec is the brief in numbers. Copy the block below and fill every line.

```markdown
# <hero name> — brief

## One line
<who, wearing what, doing what> (e.g. "a kid in a yellow raincoat and a long striped scarf, waiting, then off through the rain")

## Topic → design
- Topic / occasion: <what the user asked for>
- Silhouette in one shape: <bell / A-line / column / cape triangle ...> — the cloth that will swing
- Proportions: height <m>, heads <3.6–4.6>, build <0.9–1.1>
- Palette (3–5): <hex + where>
- Face: eyes <hex>, blush <hex or none>, expression

## Parts, in layering order (= the order in character.json)
1. hair: <bob / tail / braid, colour, length>
2. <first garment>
3. <second ...>
n. hat / shoes last
Custom parts (project parts.py): <name — why the library has none>

## Cloth that moves (bone chains)
| part | chains × segments | stiff | why it must move |
|---|---|---|---|
| skirt | 10 × 3 | .045 | sells the walk |
| bow tails | 2 × 4 | .06 | lags on the turn |

## Clips (one at a time)
1. idle <s> — blink at <t>
2. turn <s> — to <yaw>
3. walk <s> — stride, cycle
(+ spin / wave / hop if the topic wants it)

## Review scene
Backdrop / floor colours, camera yaw / elevation if not default, concept art in concept/ (front, side, back)?

## Review log (one fix per line, as in the source: one prompt = one fix)
- f<frame> <what was wrong> → <the one change> → <result>
```

## Still rubric (score the stills, the turnaround and the cast sheet; any 0 is a fail)

| # | Question | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | Does it read as THIS topic's hero at thumbnail size? | could be anyone | partly | unmistakable |
| 2 | Big head, small body, one clear silhouette? | proportions drift | ok | strong shape |
| 3 | Layers: does every garment sit over the one before, nothing poking through? | skin / layer pokes through | tiny gaps | clean |
| 4 | Turnaround both ways + back: eyes, nose, toes, buttons in front; braid, back bow behind; left = left? | flipped part | — | all consistent |
| 5 | Cast sheet: knees fold back, elbows forward, no "did the neck or the body turn?" moment | yes, a bad bend | — | none |
| 6 | Idle: breathing, sway, one clear blink | frozen | stiff | alive |
| 7 | Turn: head leads, the skirt flares, ribbons / tails lag and catch up | cloth turns rigidly | some lag | clear follow-through |
| 8 | Walk: feet planted, hips bob, arms counter-swing, hem swings with the legs | sliding / floating | ok | convincing |
| 9 | Review frame: grey floor, fixed camera, back-view inset, HUD readable, hero not under the inset | missing pieces | ok | matches the source scene |

`hero.py check` covers the measurable part (weights, facing, joint limits, feet, direction, cloth motion, settle,
determinism). The rubric covers what only eyes can judge. Log each fix in the review log.
