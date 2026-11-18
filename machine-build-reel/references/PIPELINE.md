# PIPELINE — the reference-first method, as commands

A machine goes from a topic (or one image) to a rigged, animated, checked model built entirely by a script, then to a
reel. The order matters more than any single step: each step is checked before the next one starts.

| # | step | what is made | here |
|---|---|---|---|
| 1 | Brief | the machine on paper: job, size, load path, legs, finish, gait, moves, plates | `BRIEF.md` (references/BRIEF.md) |
| 2 | Concept | one image of the machine in its world, a person for scale | `refs/concept.png` — the user's, or generated with the owner's yes |
| 3 | Turnaround | the same machine clean on grey: front, side, back, top, three-quarter | `refs/turnaround.png` (`jobs_turnaround.json`) |
| 4 | Single views | each view alone, large enough to measure | `refs/front.png left.png …` (`jobs_views.json`) |
| 5 | Close-up plates | one plate per **mechanism** (hip, knee, ankle, foot, head, …), more angles where needed | `refs/plates/<plate>.png` (`jobs_plates.json`) |
| 6 | Parts breakdown | axes, dimensions, joint housing sizes, **the load path**, every part → bone, powered joints, conflicts | `PARTS.md` |
| 7 | Build script | numbers + parts as code; mechanisms; anchors searched; rig; actions | `machine.py` → `machine.py build` |
| 8 | Checks | 15 checks with numbers; what's off | `machine.py check` → `out/REVIEW.md` |
| 9 | Check renders | turnaround both sides, motion sheet both sides, plates; plates beside references | `machine.py sheet`, reel `compare` |
| 10 | Motion reference | (optional) video-model clips of renders of the model, *read* for timing, not tracked | `refs/motion/` (owner's yes) → key poses in `moves` |
| 11 | Reel | the film | `machine.py reel` |
| 12 | Export, verify | `.glb` re-loaded in the player | `machine.py player` |

Steps 2–5 are optional and need the owner's permission when they use a paid model (references/REFERENCES.md).
Without them the skill runs **code-only**: the brief and PARTS.md carry the design, the design sheet and Freestyle
line drawings (the same cameras as the plates) stand in for references in the reel, labelled "drawing".

## Rules that made references usable (from the source)
- **One plate per mechanism, not per body area.** A joint cannot be modelled from a whole-body picture.
- **Each image is made from the ones before it** (turnaround from the concept; views from the turnaround; plates from
  the views + turnaround + concept), or the design drifts.
- **Say the scale in the prompt** ("a joint housing is 1.5 to 2.5 m across"), or details come back sized for a toy.
- **Approve before going on.** A wrong turnaround makes every later image wrong; a person looks at each set.
- **Keep the prompts** (`refs/jobs_*.json`) — they are the record of how each image was asked for.

## Habits in the build (all enforced or done for you)
- **Every joint is a real mechanism** (references/MECHANISMS.md).
- **Let the script pick what a person would fudge**: actuator anchors from every action (`actuators.py`).
- **Assert the rules**: a part on exactly one bone; no part named like a bone; no duplicate names.
- **Write the numbers out**: `machine_info.json` — parts, bones, rest frames, anchors, strokes, walk speed, light curves.
- **List what differs from the references** in BRIEF.md, don't leave it for someone to find.

## What it costs
The source's Stilt: 40 reference images each looked at by a person, a 2,200-line script, ~40 check renders; it was
its fourth machine. Here a new machine is a `machine.py` of 200–300 lines (the engine is shared), a build in seconds,
checks in seconds, a reel in about an hour on a CPU at 640×360. What generalises is the order of work and the checks.
