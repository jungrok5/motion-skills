# BRIEF — topic → film (write this before any code)

Copy the template into the project as `BRIEF.md` and fill every part. The film is built from the brief; the review log
at the end grows as you check stills.

```markdown
# <title> — BRIEF

TOPIC      what the user asked for, in their words
THREAD     one sentence the film says (the last caption should land it)
SUBJECT    the one node — who / what it is, where it sits (≈ 64 % of the height), its label
LENGTH     60–110 s for a full explainer, 15–30 s for a short; 9:16, 30 fps

SHAPES     which shapes carry the idea, in order, and why the topic has that shape
  - tree (doubling, fan-in)      ancestors, "how many it took", anything × 2 per step
  - chain (one line, up or down) a royal / priestly / teacher line, a genealogy as written, a chain of events
  - fan (one → countless)        descendants, followers, spread, reach, "all nations"
  - converge (many → one)        shared ancestors, one source, everything traced back to one
  - switch (lit ↔ grey)          lost / forgotten / broken and restored; the road not yet lit
  - side nodes / brackets        named exceptions (the women in Matthew), grouping (3 × 14)

BEATS
| t | beat | picture (shape, camera) | caption (≤ 2 lines, ≤ ~20 chars a line) | counter / axis / words | sound |
|---|---|---|---|---|---|
| 0–6 | question | subject alone, close | … | — | pad, two bells |
| … | | | | | |
| end | return | back to the one light | the name / the thread | — | resolving chord |

FACTS      every name, date and number on screen, with its source (book · chapter · verse, a census, a paper …).
           Approximate dates say 약. Note any unusual way the source counts and how the film shows it.
QUOTES     only short public-domain wording (e.g. 개역한글), with the reference; otherwise paraphrase.
LOOK       anything that departs from LOOK.md (an accent colour, a second line in a cooler gold …) and why
SOUND      key, the chord per beat, which events get bells / sub / riser / hit / shimmer

QUALITY STANDARD — score stills with the rubric below; target ≥ 14 / 16 on every still, no 0 anywhere.

REVIEW LOG
- <date> sheet 24 @ .5: what failed → what changed
```

## Still rubric (0 / 1 / 2 each, 16 max)
1. **One subject.** The eye goes to one bright thing (the subject, the growing tip, the burst). Two equal lights = 0.
2. **Black stays black.** The ground is near-black; light is added, never a grey wash. check.mjs fails mean > .55.
3. **Type sits clear.** Caption or counter alone at the top, over black, nothing crossing it; ≤ 2 lines.
4. **The shape tells it.** With the caption covered, the picture still says the idea (doubling = widening cone,
   descent = light travelling down, collapse = lines meeting, loss = grey).
5. **Labels read.** Names at a fixed 26–32 px, alternate sides, never colliding with each other, a flare or the type.
6. **Light grows.** Lines grow from source to target with a tip; nodes fade in as reached; numbers step on arrival.
7. **Honest numbers.** Every number, name and date matches the FACTS and what is drawn (count the nodes).
8. **Ends on one.** The last beat returns to the single light and names it.

Ask of every still: "where does the eye go first?" and "would this read with the sound off?" A still that makes you
ask "what am I looking at?" fails.
