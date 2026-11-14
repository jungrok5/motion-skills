# BRIEF — from a topic to a film

The brief is written before any code and saved as `BRIEF.md` in the film folder (`new-film.mjs` puts the empty form
there; `examples/cheongryong/BRIEF.md` is a filled one). It decides everything the style leaves open.

## What is fixed and what the topic decides
| fixed (the style) | decided per topic |
|---|---|
| one HTML file, pure three.js, nothing loaded, sound synthesised | — |
| every frame a pure function of film time | the beat sheet and its clock |
| a real landscape in air: jointed rock, mirroring water, ray-marched weather | which land: its height function, massifs, water, falls |
| one key light + sky fill + air, HDR finish | the looks (hour, weather, palette, grade) and when they change |
| one long-bodied creature on one rail; the world answers it | which creature: proportions, head, palettes, whether it changes, its route |
| buildings and plants made by code with the kits | which culture: roofs, ornament, species, colours |
| tableau → omen → eruption → climax → release → tableau; cuts on beats | the legend, the shots |
| a synthesised score on the same clock | instruments, mode, rhythm, the theme, every cue |

## Filling it in
1. **The legend in one line.** Who the creature is, what it wants, what changes. "An imugi that has waited a thousand
   years in a mountain lake takes the yeouiju in a storm and rises as the Blue Dragon." If the line has no change in it,
   the film has no middle.
2. **The culture sheet.** Six rows, researched, specific: *rock* (granite domes? basalt columns? chalk stacks?), *trees*
   (species and their silhouette), *buildings* (roof form, how eaves end, what is painted or carved and in which
   colours), *small things* (lanterns, poles, walls, boats), *instruments* (and what each is for), *mode and rhythm*
   (the scale degrees, the cycle of the drum). This sheet is what stops the film from being "generic fantasy". Name what
   distinguishes it from its neighbours (Korean eaves rise gently and bow outward; dancheong is green-led with five colours).
3. **The beat sheet.** 6–20 beats with times on a tempo grid where bars are whole or half seconds. Mark the two
   biggest hits and leave a breath before each. Mark where the weather turns.
4. **The looks.** One row per look: key body and its bearing and height, key colour, sky zenith / horizon / ground,
   air (thin air, mist, its scale height, haze wisps), cloud cover and deck height, wind, rain, exposure, grade — and the
   timeline. Put a change of key direction on a cut. Decide where the sun and moon stand in the opening and closing tableau.
5. **The land.** A sketch in words with numbers: where the lens stands for the tableau, where the water is, each massif
   (place, height, radius), falls, level ground for buildings. Then the framing: what is near on both sides, what is far.
6. **The creature sheet.** Length, radius, profile; head (snout, brow, nose, horns, whiskers, mane, beard, legs);
   palettes before / after (back, side, belly, rim) and hair; eyes; what its state does on each beat (jaw, lid, wet,
   glow, growth); then the **route**: control points with the times the head is there.
7. **The stage.** Which buildings stand where, facing what; which species grow where; what must stay clear (sight lines
   of each shot, the creature's low passes).
8. **The shot list.** Per shot: time, what it shows, where the lens is, one move, the lens angle, shadow span, whether
   the lake's mirror is needed. Vary scale: wide, close, wide. Follow the creature with a smoothed head.
9. **The score.** Tonic and mode, the theme written out, which instrument carries it in each section, the drum cycle,
   beds (water, wind, rain) and every cue with its beat.

## Review 1 — the empty world (before the creature)
Render `--sheet --scale .33` with only land and light. Score each look 0–2 on: the rock reads as *this* rock (not cones);
three depths are visible (near frame, subject distance, far range); the light has a direction and the shade a colour;
water is where the eye wants it; nothing is one flat colour. Below 8 of 10, fix the land or the look before going on.

## Review 2 — the film (every shot at start, middle, end)
| question | fail looks like |
|---|---|
| can you say what the shot is about in five words? | the subject is small, at the edge, or behind fog |
| is the creature one animal from here? | head and body disagree; a coil creases; it slides sideways |
| is the lens somewhere a camera could be? | under the ground, inside a tree, 3 m from a 4 m body |
| does the light of this look separate subject from ground? | grey on grey; a white-out; a silhouette with no rim |
| does something move? | a still frame for more than a second |
| does the cut land on a beat, and does the next shot change scale? | two wides in a row; a cut mid-phrase |
| is the culture in the frame? | a shot that could belong to any fantasy world |
Then full-size stills of the three most important frames (the tableau, the creature's face, the climax) and look at them
as a viewer would: any visible quads, floating plants, light leaks, stripes, banding?

<!-- form -->
# BRIEF — (title)

**The legend in one line:**

## Culture sheet
| | what, specifically | how it differs from its neighbours |
|---|---|---|
| rock | | |
| trees | | |
| buildings | | |
| small things | | |
| instruments | | |
| mode and rhythm | | |

## Beat sheet  (tempo: … bpm, a bar = … s)
| time | beat | what happens | weather / look |
|---|---|---|---|

## Looks
| look | key (body, bearing°, height°, colour) | sky (zenith / horizon / ground / warm) | air (air, mist, mistH, haze) | cloud (cover, deck) | wind · rain · wet | exposure · grade |
|---|---|---|---|---|---|---|

Timeline:

## Land
(the lens for the tableau; the water; each massif: place, height, radius; falls; level ground; what frames the view)

## Creature
(length, radius; head; palettes before / after; hair; eyes; state on each beat; the route with times)

## Stage
(buildings: what, where, facing; species: where; what stays clear)

## Shots
| # | time | shows | lens position → move | angle | notes |
|---|---|---|---|---|---|

## Score
(tonic and mode; the theme; who carries it where; the drum cycle; beds; cues by beat)
