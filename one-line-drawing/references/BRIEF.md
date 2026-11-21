# BRIEF — topic → scene → route → film

Write `BRIEF.md` in the project before any code. Copy this template and fill every line. A topic is a place with a
person in it ("a lighthouse keeper at dawn", "my grandmother's market stall", "a cyclist crossing a bridge in snow").

```markdown
# <Piece name>

ONE LINE: <who, where, doing what, in what weather> — e.g. "an angler at the end of a jetty in lake fog"

## Scene (scene.js → scene(S))
- Setting: horizon <y> · ground <wet | water | field | snow | floor> · fog <#hex> — <why this light>
- Main subject (the figure): facing <left | right | toward | away>, stride <0–1>, coat / hat / bag, what the hands hold
  (reach targets), height <px> — the subject fills at least a quarter of the page height
- Props in hand: <umbrella, rod, lantern … or a shape you draw>
- Middle ground: <2–4 shapes: a stall, a boat, a lamp, a fence …> — new subjects are drawn in scene.js
- Far: <ridge, skyline, treeline> — depth ≥ .7, pale in the photo
- Things seen through holes (under an awning, inside a frame): their own shapes, reached by detours
- Painted only (trace: false): <puddles, haze, a second reflection>

## Route (scene.js → line(L, S)) — the one line, in order
1. Start: <where and why: a corner of the frame, the top rule, the base of a wall>
2. <tag>: <what is drawn, with which calls: contour / steps / curls / sweep …>
3. … every tag in drawing order …
- Travels: <how the line gets from each part to the next — a frame edge, the horizon, a kerb, a wire, a doubling back>
- Detours: <contour until a point → excursion (a rod, steam, a lantern) → finish the contour>
- Reflections / fills: <which shapes reflect; where the zigzag water or road goes>
- End: <the base rule or the last edge; where the signature will sit>

## Film (piece.html)
- Draw time <s> (35–60) · zoom <2–2.8> · breathers <auto | times>
- Pauses: <where the hand stops to look: after the first big contour, before the figure …>
- Signature: <the user's own handle in Latin, or null for loops only>
- Timings: intro · draw · pull · fade · clean · sign · hold (s)

## Review log
- <render>: <what failed in the rubric or check.mjs> → <fix>
```

## Still rubric — score each render (`--line`, `--cast`, `--acts`, the end frame)

Answer yes / no; any no is fixed before the MP4.

**The line (line sheet, end frame)**
1. Does the clean drawing on white read as the place and the person at a glance, without the photo?
2. Is it one line throughout — and does every travel look meant (a frame edge, horizon, kerb, wire, a doubling back),
   not a stray diagonal across a subject?
3. Does it speak the vocabulary — loops at corners and wire ends, right-angle steps, zigzag water / road, zigzag
   reflections that follow the body, rows of loops for foliage or smoke?
4. Is the page filled like the source: subjects large, the frame closing round them, margins left for the signature?
5. Does the coverage on the line sheet have no red on anything that matters?

**The body (cast sheet)**
6. Does the figure face one way as a whole — head, chest, hips, feet; hat brim, bag and toes on the right sides?
7. Do elbows fold forward and knees backward; does each hand reach what it holds (check.mjs fails it otherwise)?
8. Is the stance plausible: feet on the ground, stride and lean matching what the person is doing? "Is the neck
   turned or the body?" — if that question comes up, the pose is wrong.

**The film (acts, MP4 stills)**
9. In the close shots, is the nib always in frame, the photo legible under the line, the stylus coming from the lower
   right like a right hand?
10. Does the pace feel like a hand — racing down long rules, slowing into loops, a few pauses?
11. Do the breathers show where the line has got to, then go close again?
12. Is the reveal calm: pull back, the photo fades, the clean page, the signature, a hold of at least 2 s?
