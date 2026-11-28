# The brief

Write `BRIEF.md` in the project before any code (`new-film.mjs` puts the form there). The topic is **a cup someone
pours** — for a café, a season, a person, a brand, a moment — and the film shows that cup being poured from above until
its figure is finished, then holds it with a title.

## What is fixed, what is designed
Fixed by the skill: top-down camera, a cup on a saucer on a table, one light from one side, the milk drawing through
the simulated surface (never painted), a steel pitcher that comes in and leaves, step labels and the pour score strip,
the held finished cup with title and caption, the synthesised pour sound, 1080×1920 (or 1920×1080) MP4 + live page.

Designed for every topic: the drink (crema and foam colours), the cup (glaze, rim, inner, handle, saucer), the table,
the **figure and its pour score** (which moves, where, how long, which direction), the words (kicker, title, step labels,
caption, language), the accent colour and the timing.

## The form (`templates/BRIEF.md`)
Topic · the figure (what, why it fits, direction, what makes it not the starter's rosetta) · the cup (drink, cup,
table, words colour) · the score table (one row per move, `say` rows = steps) · words · timing · stills review.

## Choosing the figure
- Say why this figure for this topic in one line: a heart for a wedding, a tulip for spring, a rosetta for a morning bar,
  stacked hearts for a family, a swan for a lake town, a wave for a surf café, etched initials for a person.
- Pick the direction for the frame: a tall frame likes figures pointing up or across; poured upward (`dir: 270`) puts
  the pitcher below the cup, toward the strip — keep the strip text readable.
- Prove the figure in a scratch project with `--shots` before writing words. If a figure needs more than the moves can
  give, add `etch` details — never a painted overlay.

## Stills review (copy into the brief, answer each from rendered frames)
1. The figure reads at thumbnail size, as the figure named in the brief.
2. Foam edges are clean: no grey fog, no speckle, thin lines stay lines.
3. The figure builds on camera in readable stages, one per step label.
4. The pitcher reads as steel, comes in and leaves on an arc, and never covers the finished figure.
5. High pours stay brown (no white), low pours make white, the cut leaves a clean line.
6. The cup, saucer and table read as one light from one side (shadows agree).
7. Words are readable on a phone, clear of the saucer, and never cover the figure.
8. The finished cup is held still long enough to look at (the outro).
9. The sound follows the milk (heard while pouring, quiet on the held cup).
10. Designed for the topic: drink, cup, table, figure and words are this topic's, not the starter's.

`check.mjs` fails the brief row while any review line is still `- [ ]` or a blank (`TODO`, `___`, `Replace:`) is left.
