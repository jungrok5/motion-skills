# Brief: topic → a town that hides itself

Every film starts here. Write the project's `BRIEF.md` (copy `templates/BRIEF.md`) **before** any code: the topic decides the
place, the gap, the plug, the landmark, the palette, the moving things and the sound. The template's Clock Square and the
example's Hanok Alley are two answers to two topics, not a menu.

## What is fixed (the style) and what is designed per topic

**Fixed — every film in this skill:**
- The trick: one 3D place that reads as a single flat 2D elevation through a long lens (`flat`, fov ≈ 6°, eye at the
  roofline), then breaks open — a dolly zoom through a gap, a crane, an orbit — and snaps back to the same flat picture.
- The loop: ~8 s, a move every beat (1 s: ~0.58 s hold + ~0.42 s snap), first and last view `flat`, seamless (the frame at
  `DURATION` equals frame 0; cars, birds and boats complete whole cycles).
- The picture grammar: toy-scale 3D with two-step toon shading (lit side ≈ the albedo, shade side tinted lavender), hard
  cast shadows, a solid cobalt sky, flat cartoon clouds, haze by depth (not by camera distance); motion blur on every move.
- Two finishes of the same style: `soft` (pastel, no outlines) and `ink` (cel + dark outlines). Pick one per film.
- 16:9 1920×1080 (9:16 with `?ar=9:16` or `aspect`), 30 fps (60 with `fps: 60`), MP4 + a live page.
- Sound grammar: a soft beat under the picture and an air whoosh on every move that lands on a tick.

**Designed per topic — written in `BRIEF.md`, built in `film.html`:**
- The **place**: what town, street, harbour, campus, market, temple lane … and its building language (roof kind, walls,
  windows, doors, awnings, base, trim) — expressed with `building()` options or new pieces made in the project.
- The **front row**: the elevation the flat view shows — widths, heights, the rhythm of doors and windows, one or two
  surprises (a cafe among hanok, a tall shop among low houses).
- The **gap** and what is behind it: a street, an alley, a canal, a stair, a bridge, a pier.
- The **plug**: what fills the gap in the flat view so it does not read as a hole — a set-back gate, bridge, wall or house
  that lines up with the front row.
- The **landmark**: the far thing that peeks over the roofline in the flat view and shrinks ≥ 3× in the reveal (a tower,
  a pagoda, a lighthouse, a mountain hut, a ferris wheel, a rocket on a pad …).
- The **palette**: 4–6 wall colours, one roof colour, one glass colour, one warm accent. Sky and shade from the finish
  unless the topic asks (dusk, snow, night with lit windows via `glow`).
- The **near layer**: one tree, pole, lamp, sign or planter in front of the row so the flat view has depth cues that the
  reveal then explains.
- The **moving things**: cars, boats, birds, a train, a ferry, kites — all `F.lap()` periodic.
- The **beats**: which views, in which order (references/MOVES.md), and any per-view overrides the place needs.
- The **sound**: tempo, chords, mood, ambience (waves, birds, bell, water, wind, city, cicadas).

## The brief (fill this in, in order)

```
# <Title>
Topic:        <the user's words>
Place:        <one sentence: where, when, what kind of street>
Finish:       soft | ink          Aspect: 16:9 | 9:16          Length: 8 s (beats × 1 s)
Palette:      walls …, roof …, glass …, accent …, sky (finish default or …)

Flat picture (what the viewer believes for the first half-second):
  front row:  <houses / shops, their rhythm, heights, roof kind>
  gap:        <x range, how wide>
  plug:       <what fills it, how far back (m), why it lines up>
  landmark:   <what, how far back (m), how much of the frame it fills when flat>
  near layer: <tree / pole / lamp / sign in front>
  sky:        <clouds, birds, wires>

Reveal (what the camera finds):
  behind the gap: <street / alley / canal … and what lines it>
  the town:       <how far it goes, how it stays hidden (F.hide), what rises at the back>

Moving things: <cars on the front road, boats, birds …, all whole cycles per loop>
Beats:         flat → deep → … → flat   (overrides: …)
Sound:         mood …, bpm …, chords …, ambience …
```

## Stills rubric (score the contact sheet, 1–10 each; fix every area under 7)

Render `render.mjs film.html --sheet 9 --scale .4 --q blur=1` (one still per beat) plus the flat frame at full size, and
score:

1. **Flat reads as one drawing.** Looking only at the flat still: does it look like a 2D illustration of a street front?
   No visible depth cues that give the trick away (no long floor through the gap, no rows of roofs over the roofline, no
   sky strip down the sides).
2. **The plug.** The gap is filled — by the gate / bridge / set-back house — and lines up with the row (its top near the
   roofline, its sides behind the neighbours).
3. **The landmark.** Visible over the roofline in the flat still (check.mjs proves it) and plausible as "just behind".
4. **The reveal surprises.** In the `deep` still the gap is a long street and the landmark is small and far; the plug sits
   clearly further back than the front row.
5. **Every view is a picture.** Each held view has a subject, a strip of sky where it helps, nothing crowding the lens
   (no roof or wall filling half the frame — check.mjs warns), no cars blocking the alley.
6. **One style.** All new pieces share the finish (two-step toon, the shade colour, ink or no ink everywhere), the palette
   and the toy scale. Nothing looks borrowed from another film.
7. **Motion.** Moves are fast and blurred, holds are still; the loop seam is invisible (check.mjs `loop seam` < 1 level).
8. **Topic.** Someone shown the flat still names the topic (the place, its building language, its landmark).

A fresh reviewer agent with only the sheet, the flat still and this rubric is a good scorer.
