# BRIEF — topic → mark → film

Write `BRIEF.md` in the project before any code. Copy this template and fill every line. A topic is usually a brand
(name + what it does + who it is for) or a thing to make a mark of ("a mark for a night bakery").

```markdown
# <Brand or piece name>

ONE LINE: <what the mark shows, for whom> — e.g. "a heron standing in reeds, for a riverside tea house"

## Subject
- What it depicts: <animal / object / letter / scene in one symbol>
- Why this subject: <one line tying it to the brand>
- Reading at 24 px: <the one silhouette feature that must survive: ears, beak, beam, the letter's counter>
- Facing / stance: <right / left / front; standing on what>

## Grid
- Lean: <degrees, or 0 for an upright mark> — <why: motion, speed, calm, symmetry>
- Main slants / uprights: <names and roles: rump, nape, chest / tower walls>
- Horizontals: <crown, jaw, back, belly, ground / decks>
- Free lines: <muzzle, ear fronts …> — reuse directions with parallel(); aim ≤ 6 directions (mirrored pairs count once)
- Circles: <eye, lamp, waves …> — cut, add, or measure
- Families: <which parallels are drawn once and copied; which get distributed by the Align panel>

## Shapes
- <name>: <corners as guideA&guideB …>, round <r>
- Joints between shapes stay sharp (automatic); feet stay sharp on the ground (':0')

## Film
- Signature: <@handle — the brand's or the user's own; never someone else's>
- Wordmark: <TITLE> / <subtitle> (optional; Korean needs no extra font, other scripts do)
- Ink / paper: <#hex> / <#hex>
- Mockups (2–4, chosen for the brand): <kind: base, ink, text>  e.g. sign for a shop, tote for a bookshop, bottle for outdoors
- Timings: sketch · construct · select · build · clean · refine · reveal · mockup (s)

## Review log
- <date / render>: <what failed in the rubric> → <fix>
```

## Still rubric — score each render (`--mark`, `--acts`, `--sheet 24`)

Answer yes / no; any no is fixed before the MP4.

**The mark (mark sheet)**
1. At 256 px, does it read as the subject at a glance, without the wordmark?
2. At 24 px, does the one feature in "Reading at 24 px" survive? (check.mjs fails a hole that closes at 48 px)
3. Is every edge on a guide (no magenta dots)? Are there few directions — does the grid look *designed*?
4. Does it face one way as a whole (eye, nose, ears and stance agree)? Do legs stand on the ground guide, knees and
   hocks bending the way that animal's do? Does the mirrored copy still read?
5. Are the rounded corners the outside corners, joints sharp, tips crisp?

**The film (acts and sheet)**
6. Does the sketch look like a loose first idea — the same idea, not the finished mark in grey?
7. Do the guides arrive in a sensible order (big structure first, details after), with copies dragged across and
   circles zoomed into?
8. Does the cursor travel like a hand — no teleports, lines drawn from the nearer end, never off the frame?
9. During the shape builder, is each region hovered (dots + red edge) before it fills?
10. After the guides go, does the rounding read (zoom close enough to see the widgets)?
11. Is the reveal calm: the mark small, centred, signature or wordmark under it, nothing else on the page?
12. Mockups: does the mark sit on the surface (texture, folds, wrap, light) rather than float? Do the colours suit the
    brand and stand off each other?
