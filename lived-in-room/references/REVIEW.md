# REVIEW — rounds, the second pair of eyes, the retro

A long piece of work is done in rounds, and each round ends by being looked at by someone who did not do it.

## Rounds

A round is one sitting of work with a stated end:

    round N
      fixed from the last review:   …
      this round does:              …   (one zone, or one kind of thing, or light, or the walk)
      done when:                    audit.py passes · the named stills are rendered and looked at · …

Write the round's three lines before starting it and its result when it ends, in the project's `REVIEW.md`. Rounds
can run unattended (a render resumes; `audit.py` and `check.py` say plainly whether the round's end was reached), but
a round that fails the same way twice stops and researches (`METHOD.md` §2) instead of trying a third time.

Order the work by what the camera sees: `sheet.py --screen` ranks every thing by how long and how large it is on
screen. Fix what is large and crude first; do not polish what the walk never finds.

## The reviewer

The one who built the room judges it by the conditions they set themselves, and cannot see past them. A second
reviewer brings conditions from outside — in the source, a phone lying on a chair seat was "correctly placed" to the
builder and "you will sit on it" to the reviewer.

So after each round of fixes, hand the room to **a separate agent that has not seen your reasoning**. Give it the
pictures and the facts, not your conclusions:

- the work-light views (`render.py --view plan,<every view in room.py>`) and the supports picture (`--view plan --supports`)
- a few stills of each version (`render.py --still …`) or the contact sheet (`sheet.py --walk`)
- BRIEF §1 (the building, the person, the rule of the room) and the inventory table
- the audit's summary line
- from the second round on: the list of earlier findings, with what was done about each

Its brief (adapt the nouns):

> You are reviewing a 3D model of a room for whether it would pass as a real, lived-in room. You did not build it.
> Read the setting and the rule of the room, then look at every picture. Report only what is wrong or unconvincing,
> most damaging first. For each finding give: where (zone / thing), what you see, why a person would not have it so
> or why it cannot physically be so, and what would fix it. Look for:
> 1. **use** — would the person described put this thing there? does it get in the way of sitting, walking, opening
>    a door or drawer, reaching? does anything contradict the rule of the room?
> 2. **physics** — anything that looks as if it floats, is cut by another thing, would tip or slide, or hangs from nothing
> 3. **the building** — a window, door, switch, socket, pipe or fitting that this kind of building would not have, or
>    has somewhere else, or at another size
> 4. **scale** — a thing that is the wrong size beside its neighbours
> 5. **hidden effort** — things that can never be seen from the walk; things that are seen large and are crude
> 6. **too tidy / too messy** — where it reads as a showroom, or as a mess nobody would live in
> 7. **light and walk** — places lit that nobody would light; a lamp burnt white; a turn too fast; nothing moving in frame
> Do not praise. Do not repeat a finding from the list of earlier ones; if an earlier fix did not work, say so.
> End with the three findings you would fix first.

## What to do with the findings

Findings are **material for judgement, not instructions.** Some are excessive, some contradict the brief, and
taking all of them costs time without making the film better. For each: take it, or decline it with a reason, and
write both down:

    | round | finding | taken / declined (why) |

Then fix, run `audit.py`, re-render the views that show the fix, and review again — giving the reviewer the log and
asking for **new findings only**. The count of new findings falls round by round (in the source: 25, then fewer,
to 6 by the seventh, the last of them small things round the sockets). Stop when a round brings only details you
would not notice in the film.

## The score

Score the final stills with the rubric in `BRIEF.md` (ten lines, 1–5) and put the table at the end of the project's
`REVIEW.md`. Anything under 4 goes back to the step that owns it.

## The retro

When the room is finished, write down what you would tell the next room's builder — what cost time, what the audit
or the reviewer caught that you had not, what you would decide earlier. Put the project's own in its `REVIEW.md`;
put what is true of any room into the skill's `references/LESSONS.md`, as *problem → cause → fix*, so the next
room starts from it. In the source the four conclusions were: fix the skeleton first; have a rule for how each
thing is made; stop guessing and look it up; measure floating and sinking in numbers, by each thing's support.
