# BRIEF — topic → course

Write `BRIEF.md` in the project before any code. A topic ("simple machines", "how a fridge works", "light and lenses",
"plumbing for beginners") becomes a short course of hands-on lessons. Fill every section; delete nothing. The circuits
example is a style reference, not a menu: a new topic gets its own parts, its own models, its own diagrams.

```markdown
# <Course title> — brief

## Topic and learner
- Topic, in one sentence:
- Who learns (age / background) and what they already know:
- Course title + tagline (3 words, "· " between):           e.g. Machines 101 · Push · Lift · Turn
- Name of the experiment tab (what the bench *is*):           Circuit / Machine / Optics bench / Plumbing
- Languages (first = default; every text in all of them):     en, ko

## Units and lessons (4–9 lessons in 2–3 units)
For each lesson:
### <n>. <title>   (unit: …)
- The one idea, in one sentence a learner would repeat:
- The bench: the 3–6 parts on it, how big each is relative to the others, where they sit
- Inputs → controls: key · type (power / choice / slider / toggle / hold) · which part it lives on · range or options
- The model: the equations (and state, if it changes over time); units; numbers checked by hand once
- What the bench shows: what moves, glows, fills, turns, or flows — and which value drives it
- The diagram: which convention (circuit schematic, free-body diagram, ray diagram, pipe diagram…), and its parts
- The chart: y against x (a sweep of one input, or over time)
- The maths tab: 2–4 equations, each with the current numbers substituted
- Try it: 3 goals, each a condition on inputs/values
- Builds (optional): a second way to lay out the same bench

## The parts kit for this topic
Every part the lessons need, as a function (`parts.js`): name, made of which kit shapes, its colours (toy-bright,
one or two per part), the points other things attach to (terminals, hooks, axles), what it can animate.

## Tour (45–70 s)
Beats: one or two per lesson — the first change that makes something happen, one camera turn, the diagram blown up,
the maths tab once, the language switched once near the end. One click every ~1.2 s, 2–3 s on the big moments.

## Still review — a still fails if…
- a part floats, sinks into the floor, or passes through another part
- a wire / rope / pipe ends in mid-air instead of at its terminal
- the bench shows something the numbers don't (a lit bulb at 0 A, a lever tipping the wrong way, gears turning the same way)
- two labels overlap or a label hides the part it names
- the diagram and the bench disagree (a part in one and not the other, a different value)
- text is cut, wraps badly, or shows NaN / undefined
- (add the topic's own: e.g. "meshing gears' teeth overlap", "the ramp's box slides off the ramp")
```

## Still review, every time
Render with `scripts/render.mjs <course> out/lessons --lessons --on` and `--stills` at each tour beat. Look at every
still against the brief's list. `check.mjs` catches what a script can (frame, labels, schematic links, values, tour
targets); the eye catches the rest — the brief's list is for the eye.
