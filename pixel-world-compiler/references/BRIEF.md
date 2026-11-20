# BRIEF — topic → causes → tables

Write the project's `BRIEF.md` **before** any row of `world.js`. A world is reasons first: every row you write later
must point back to a line here. `templates/BRIEF.md` is the blank you fill (`new-world.mjs` copies it).

## The frame

```
# <world name>

Topic (the user's words): …
One sentence: what a viewer should feel in the first second.

## Place and light (the sun is a fact, not a mood)
latitude: …° (SOURCE: the real place, or the real place this invented one borrows its sky from)
season → declination: …°   time → hour from solar noon: …
derived: sun altitude …°, shadows fall toward …, length … × height   (read them from check.mjs)
wind: blows toward …° at … m/s (TASTE or SOURCE) — it drives sway, smoke, drift, reflections, all of them

## Land and water
relief (m), landform (river / lakes / terraces / plain / hillside rising away), water model and depth, what is frozen
ground surfaces in order (the first rule that matches wins) and why each is where it is

## Materials (reflectance, not colour)
| id | albedo R G B | rungs | kind | SOURCE / TASTE |
cover: the 2–4 surfaces that fill most of the frame (the eye adapts to them — this sets exposure)
palette budget: Σ rungs ≤ ~60 (the lock is 64)

## Life and culture
flora: species, real height / crown, the condition it answers (moisture, shore, slope, altitude), density
places: what is built, by whom, why HERE (the siting score in words), real dimensions of each form
trails: who walks from where to where

## Cast — per body
| id | kind | real size (SOURCE) | mass kg | Fr (walk) | look (materials) | read: one silhouette fact + one colour fact nobody else has |
idle: what breathes, what flicks (ears, tail, a blink, a weight shift)
at most one invented law per world, with its boundary (what it changes, what stays ordinary)

## Beats (the tour)
| t | camera | who | stance + gaze | anticipation | action | recovery |
weight sets timing: heavy bodies start, stop and turn slowly; turns are steps
the big move per body (human: lift; quadruped: toss — or register your own) and what it means in this world

## Medium overrides
anything the pixel medium overrules (a head floor, a spacing that aliases) — say the measured value and the used one
```

## Stills review (score every still you render; a no fails the still)

1. **One sun.** Do all shadows fall the same way and to a length that matches the altitude check.mjs prints?
2. **Scale by division.** Does every thing stand at its real size against the 26 px person (check.mjs scale table)?
   Nothing enlarged "to read better" without a floor recorded in the brief.
3. **The palette is the world's.** Do the colours come from the materials and the sun — warm beam, cool shade at high
   latitude; short dark shadows under a high sun? No hex was typed.
4. **Silhouettes first.** At ×1, does each body read by outline alone? Does each have its own silhouette and colour fact?
5. **Bodies.** Head, chest, hips and toes face one way; knees forward, elbows back; the near limb is the lighter one;
   quadruped fore cannon folds back, hind cannon folds forward. "Did the neck or the body turn?" — if you ask, it fails.
6. **Motion.** Does anything float, skate, or stand dead still? Does the big move gather and land? (check.mjs numbers)
7. **Reasons.** Can you say, for each prop and plant in frame, why it is *there* — which field or place put it?
8. **Composition.** Does the first frame show the topic (the place, the people, the life) — not empty ground?

## Before you render

- `check.mjs` ends in `ok`. Fix the cause it names, never the limit.
- The cast sheet (`render.mjs index.html --cast`) is scored with items 4–6 in both directions.
- A contact sheet (`--sheet 8`) is scored with items 1–3, 7, 8.
