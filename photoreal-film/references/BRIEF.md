# BRIEF — from a topic to a film on paper

Step 1 of every film. The user gives a topic ("a mechanical watch", "espresso", "our drone", "a violin"); you design a
**new** film for it in this style and write it down as `BRIEF.md` in the project before any code. Never reuse the
bundled example's subject, palette or shots because they are there: `examples/aperture` is one answer to one topic.

## How to get from a topic to the chain
1. **Find the mechanism.** What is the smallest part that *does* the thing? (watch → escapement; espresso → the
   portafilter basket and the first drops; violin → a string under the bow; drone → a rotor hub.) That is the first shot
   and usually the background of the title.
2. **Find the machine.** What whole object is it part of, and what are its 8-20 nameable parts? They become the exploded
   view and the hero shot. List them with real dimensions.
3. **Find the world.** Where is the object used, or what does it make / see / play? One wide shot with weather and a
   time of day.
4. **Find the picture.** How does that world end up on a maker's desk? (a print, a postcard, a blueprint, a label, a
   phone screen, a score.) That is the turn of the film.
5. **Close the loop.** From the desk, how do we get back into the mechanism? The last image before the title should
   rhyme with the first.
6. **Name it.** One word, a part or a property of the mechanism (ESCAPEMENT, APERTURE, CREMA, RESONANCE).

Then decide palette, materials, light, lens per shot, sound, and count frames.

## The form (new_film.py writes this into the project)
```markdown
# __TITLE__ — brief

**Topic given:** …

## One line
What happens, in one sentence that names the first and the last image.

## The chain of worlds
| # | shot | scale | what it shows (one thing) | how we get to the next |
|---|---|---|---|---|
| s01 | … | … | … | … |

## Design decided for this topic
- **Subject and mechanism:** the object, its parts (with real sizes in mm), what moves and how.
- **Palette:** the warm colour, the cool colour, the one saturated accent; which shots invert it.
- **Materials:** each surface and the recipe it uses (metal / paint / glass / leather / wood / rock / water …) with its finish.
- **Light:** per set — what is in the picture (practicals), what shapes the form, what fills.
- **Lens and camera moves:** per shot — focal length, f-stop, the one move.
- **Title:** the word, its material, what is behind it.
- **Sound:** the bed, what ticks or clicks, where the whooshes and hits fall, the one musical moment.
- **Length:** frames per shot, total seconds.

## Review of the stills
(fill in the rubric below after the first contact sheet, again before the full render)
```

## The rubric (score every shot 1-5 on a full-size still, not on a thumbnail)
| question | 5 looks like | 1 looks like |
|---|---|---|
| Does it read as a photograph? | you would have to be told it is rendered | flat, even, "3D software" lighting |
| Is the subject sharp, and does depth fall off? | one plane tack sharp, the rest melts | everything sharp, or nothing |
| Do edges catch light? | a highlight line on every edge | razor edges, parts merge into a blob |
| Do surfaces vary? | brushing, wear and smudges change the highlight | one roughness everywhere, plastic |
| Is exposure in the film's range? | median and p95 inside the table in LOOK.md | grey fog or burnt-out areas |
| Does the move keep the subject? | framed start, middle and end | drifts out, cropped, or dead still |
| Does the cut make sense? | motivated by shape, light or movement | arbitrary |
| Is it this topic's own design? | parts, palette and world belong to the topic | the example with the names changed |

Anything under 4: fix the shot before rendering the film. Write down what you fixed; put what you learned in the
project notes (and in `references/LESSONS.md` when it is about the skill).
