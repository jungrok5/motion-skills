# BRIEF — <working title>

Write this before any code. Every line is designed for the topic; nothing is copied from an example or the reference.

## Topic
- **One line:** <who walks, across what, when, why — e.g. "a salt courier crosses the dunes at noon to the last well">
- **Title / subtitle:** <TITLE ≤ 24 characters> / <SUBTITLE ≤ 70 characters> (pixel font: A–Z 0–9 . , : - ! ? ' / ( ) + = & ·)
- **Day or night:** <day (night 0) / night (night 1, ambient colour, what lights the way)>

## Grounds — one texture, each read its own way
List 3–5 grounds the walk crosses. At least two must read the trail; one that keeps nothing (a road, rock, boards)
makes the others' memory visible. No two may read it the same way.

| ground | kit or own | reads (foot / body / wave) | what it does with the memory | how long it remembers | step sound | slows / sinks |
|---|---|---|---|---|---|---|
| <dune sand> | TK.sand | foot | shallow prints, a lit lip, filled by wind | 50 s | hiss | .9 / 0 |
| <road> | TK.ground | — | nothing (the contrast) | — | tap | — |
| <…> | | | | | | |

## Map
- **Size:** <w × h px (≈ 3 × the 320 × 180 frame each way is plenty)>
- **Shape — how each ground is placed:** <a pool as a noisy ellipse; a creek as a wandering line `n.wander(y, x0, amp)`; a clearing as fbm > k …>
- **Edges:** <rims, banks, outlines between grounds (base(x, y, n, e) with e.d / e.other)>
- **Decorations:** <rocks, bushes, trees, palms, lilies, lamps, shrooms … where; solid ones kept off the route>
- **Look:** <palette per ground (3 tones each, light → dark), band / text colours, the memory view colours>

## Walker
| field | design |
|---|---|
| who | <…> |
| mass (0.6 light … 1.6 heavy) and why | <e.g. 0.7 — a child, quick steps; 1.4 — a porter with a load> |
| speed (px/s), step (px), accel, turn rate | <30, 6.5, 150, 170 — heavier: slower, longer steps, lower accel and turn rate> |
| art: down / up / right (≈ 11 × 15, origin = the hip) | <hood, coat, belt … ; left mirrors right only if the body is symmetric> |
| asymmetric things | <a lantern in the right hand → a follower at handR; a bag on one hip → its own left art> |
| legs / arms | <colours; arm length; which shoulders> |
| followers (they lag) | <scarf end / lantern pendulum / tail / cape — lag, damp, flare> |
| idle | <breath, blink (eye → skin), weight shift — automatic; anything else that should move> |
| light it carries (night) | <lantern r, colour, flicker> |

## Route
Start still (title over it); show the memory at least once (`view: 'split'` or `'trail'`); every ground that reads the trail is
walked on long enough to see it; one hop or a stop that shows a landing; end walking away. Check it on `?map=1`.

| step | to / wait / hop | view | caption | the beat (why) |
|---|---|---|---|---|
| 0 | at (x, y), face, wait 2 | world | | the place and the walker, title |
| … | | | | |

## Motion (weight)
- Mass <m>: starts gather (<0.13·√m> s dip and lean back), stops overshoot and settle, corners become arcs (turn rate / m).
- Planted feet never move; every print is exactly where a foot landed; turns on the spot are two steps.
- Hops gather (crouch <0.2·√m> s), fly, land on both feet (deeper prints, a bigger splash) and recover (<0.24·√m> s).
- Idles breathe; followers lag every start, stop and turn.

## Review (score every still 0–2; fix anything under 2)
1. The trail reads: you can tell where the walker has been on every ground that remembers, and the hard ground shows nothing.
2. Each ground reads it its own way — prints vs bending vs rings vs glow vs pushed leaves — and remembers for its own time.
3. The memory view (split / trail) shows the same walk: feet bright, the body's path, the rings, the walker as a silhouette.
4. Pixels are crisp: one pixel size, no smoothing; 3 tones per ground with ordered dither; outlines on props and the walker.
5. The walker's body agrees with itself: face, chest, hips and toes point one way; the near leg in front; left foot left.
6. Does anything float, skate, or stand dead still? Does the start gather, the stop settle, the hop gather and land?
7. One light: shadows, rims and (at night) the lantern / lamps / glow agree.
8. Nothing is copied from the reference or an example — the grounds, the walker and the route are this topic's own.
9. Title and captions are short and readable; nothing important sits under the title band or the caption.
