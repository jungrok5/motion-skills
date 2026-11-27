# The brief

Write `BRIEF.md` in the project before any code (`new-film.mjs` puts the form there). The topic is a **place** that has
something moving in it — water, fire, light, weather, a machine, a sign, a sky — and the film shows the picture alive,
then takes it apart to show *how* it moves: palette cycling, a flow field, a wind rig.

## The form

```markdown
# <title>

## Topic
One line: what place, what time, what moves. ("A night cove under a lighthouse: the beam turns, waves roll in.")

## Picture (320 × 180 pixels, read at a glance)
- Subject and where the eye lands first:
- Light: where it comes from, what is lit, what is in shadow:
- Depth: far / middle / near bands (sky, horizon, the thing, the foreground):
- Palette family (4–6 hues, each a ramp of 3–8 steps, dark → light), and the one accent:

## Layers (2–5, back to front — each becomes one plane when the picture comes apart)
| layer | label on screen | what is on it | static / drawn per frame / rigged |
|---|---|---|---|

## What moves, and how
| thing | technique (cycle · flow · drawn · rig) | ramp (slots) | rate (steps/s) | why this technique |
|---|---|---|---|---|
Every moving thing names its technique. Prefer cycling where the motion repeats along a fixed path (water, fire,
light, shimmer, twinkle, a conveyor, rain streaks, neon chase); draw per frame only what truly travels (sparks, a bird);
rig what bends (plants, cloth tassels, antennae).

## Flows (for each flow)
- along(x, y): which way it moves (grows downstream), how fast the bands are (band width), how the bands thin with depth:
- across(x, y): the streamlines (what makes streaks):
- mask: where it is:

## Plants (for each rigged clump)
- where the root is planted, how many fronds, kind (fern · blade · reed · leaf), length, spread, stiffness:
- the gust: strength, how fast it travels across the picture:

## Panels (1–4, each about one technique the picture really uses)
| # | kind | which cycle / flows / layer | crop centre, zoom (3 · 4 · 6) | kicker | title (≤ 1 line) | left label | right label | caption |
|---|---|---|---|---|---|---|---|---|

## Timing
hold, explode, exploded, panel length, back, collapse, end (defaults in references/KIT.md) — and the total.

## Stills review
(answer from rendered frames: `render.mjs <film> --shots`, `--stills`, a contact sheet of the MP4)
- [ ] …
```

## Stills review (copy these into the brief and answer each one from rendered frames)

1. **One place.** The held picture reads as one place at a glance — subject, light, depth — not a sampler of effects.
2. **Each cycle reads as its thing.** Water falls, fire climbs, light turns, stars twinkle; no band looks like stripes
   painted on, and no cycle strobes (too few slots for its rate) or crawls (rate too low for its slot count).
3. **Fixed indices.** In the cycle panel the purple marks only that cycle's slots and you can see the stripes that,
   rotated, become the motion.
4. **Flow.** The arrows point where the colour visibly moves; none crosses a mask edge or points the wrong way.
5. **Wind.** Roots stay planted; tips lag the base (follow-through); every clump keeps moving in the holds; no bend
   looks broken.
6. **Layers apart.** Every plane's content is readable, the names sit under the right planes in their colours, nothing
   is clipped, the opaque picture is the furthest plane.
7. **Panels on a phone.** Title, labels and caption are readable at phone size; nothing overlaps; the swatches are the
   cycle's real slots, clear slots dashed.
8. **One style.** One palette family across all layers, hard pixel edges, ordered dither for gradients; nothing smooth,
   anti-aliased or photographic pasted in.
9. **Back together.** The film returns to the same picture it opened on and holds it long enough to watch it live.
10. **Designed for the topic.** No waterfall, ferns, campfire or lighthouse unless the topic is that; panel lines say
    what *this* picture does.

`check.mjs` fails the brief row while any review line is still `- [ ]` or a blank (`TODO`, `___`) is left.
