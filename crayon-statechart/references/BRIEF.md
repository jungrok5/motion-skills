# BRIEF — from a topic to a chart of its own

Every film starts here, before any code. Copy the template below into the project as `BRIEF.md` and fill it from the
user's topic. The worked example (`examples/kimchi/`) and the template (`templates/film.html`) are **examples of the
style**, not a menu: a new topic gets its own chapters, states, guards, loops, tags, props and captions. Reuse their
layout recipes (STORY.md), never their content. `examples/kimchi/BRIEF.md` is a filled one.

## What stays the same for every topic (the style)
- cream paper, cobalt ink, red for guards / tags / the active state, crayon hatching, pencil lines (LOOK.md);
- typewriter lettering: kicker · big chapter title · italic subtitle · red second-language line; lower-case labels;
- the chart grammar: torn-ticket states with an entry dot, initial / final dots, orthogonal arrows with rounded corners,
  `[guards]` on choices, self-loops and back edges for "not yet", parallel regions for "at the same time";
- one step at a time (arrow → label → box → highlight), a camera that only scrolls when it must, the player bar with a
  numbered caption;
- crayon illustrations beside the chart, never on it.

## What is designed per topic
```markdown
# BRIEF — <topic>

**Topic (as the user said it):** "…"
**What the viewer should understand at the end (one sentence):** …
**Facts checked against:** <sources, or "common knowledge: …">

## Languages
- main lines: <language> · tags: <second language, or none> — why (the topic's own words are best)

## Chapters (2–4; one is fine for a short film)
| # | title (1–2 words) | subtitle | tag line | what changes in this chapter |
|---|---|---|---|---|

## States and transitions, per chapter
For each chapter, in order:
- states (noun phrases, lower-case) with their tags
- transitions (verb phrases, ≤ 2 short lines)
- the **choice**: parent → `[guard A]` child A / `[guard B]` child B (both guards true-to-life)
- the **"not yet" loop**: self-loop or back edge, its guard and action
- (last chapter, if the topic has it) the **parallel state**: region A states / region B states, a guard that reads the
  other region

## Steps (15–30)
| step | caption (lower-case, ≤ 60 chars) | adds | active |
|---|---|---|---|

## Pictures, per chapter (1–3)
- who (a `person`: pose, action, clothes that fit the place and time)
- with what (vessels, tools, machines — kit props or a `defineProp` designed for this topic)
- where / when (weather, a building, a table)
- the one object the kit lacks that says the topic → design it (`defineProp`, KIT.md)

## Must / must not
- must be true to how <topic> is really done …
- must not use logos, brands, real people, named characters, or copy an existing diagram.
```

## Review rubric (score a sheet plus full stills of each chapter's busiest moment — fix anything below "yes")
| | question |
|---|---|
| topic | Covering the captions, do the chart and the pictures alone say the topic? Would they be wrong for the example's topic? |
| true | Is every state, guard and loop how the process really goes? Is each choice a real choice? |
| grammar | States are nouns, transitions actions, guards conditions in red brackets; at least one choice and one loop; parallel regions only for things that truly happen at once? |
| read | At phone size (390 px wide), can the labels be read? Does each step add one idea? Is the active state always on screen? |
| clean | Does `check.mjs` print only `ok`? No text touching a line or a box in the stills? |
| pictures | Does each chapter show hands doing that chapter's work? Is at least one picture designed for this topic? |
| style | Same paper, inks, hatching and lettering as the kit; no flat fills, gradients or dark backgrounds? |
