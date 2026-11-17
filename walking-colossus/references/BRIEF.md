# BRIEF — from a topic to a colossus

The user gives a topic ("a church that walks", "our office building", "a lighthouse", "a tank farm", "my grandma's
hanok"). Before any code, write the project's `BRIEF.md` (`new-colossus.mjs` puts the form there). Show it to the
user when they are around to answer.

## Fixed by the skill (do not redesign)

Procedural three.js, no models or image textures · the post chain (AO, height fog + ground mist, DOF, bloom, ACES,
grade, grain, motion blur) · real-scale metres and lenses · the stateless gait, two-bone hydraulic legs with claw
feet, footprints, debris and spray · the nine-beat film grammar · determinism · amber warm lights, dark-brown rust ·
the soundtrack placed from the gait.

## Designed for each topic (never reused from an example)

1. **The thing.** What everyday structure, at its true size (look up real dimensions), and why it gets up and
   walks — the idea the film carries ("the sea left it behind", "the town moved and it followed").
2. **The box.** `BODY_LEN × BODY_DEPTH × BODY_H` and the origin; where the base is; how high it rides.
3. **What makes it read at its size.** Repeated human-scale parts: windows, balconies, railings, doors, containers,
   ladders, signs, people's things. Without them nothing reads as huge.
4. **Its belly and its hips.** What the legs bolt onto: a machinery slab, a welded girder belt, an iron frame.
   The legs are a later addition to something that was never meant to walk — show the join.
5. **Life on it.** Lit rooms, laundry, smoke, birds, a flag, water running off, a dog barking — and the loose parts
   that swing late (follow-through).
6. **Mass → motion.** Leg count and spacing, leg scale, cycle, duty, lift, bob, roll (GAIT.md). Heavier = slower.
7. **The place, the hour, the weather.** Ground (field, mudflat, snow, city), sky, fog, key light, colour targets.
8. **The nine beats** for this topic: what the open reveals, what the life shot shows, what the mirror is.
9. **Sound.** What it lands in, how much steel, its own sounds, the music's key and swells.

Write numbers, not adjectives. Every number in the brief goes into `colossus.js`.

## The stills rubric (score each storyboard frame 1–5; anything under 4 goes back)

| criterion | 5 means |
|---|---|
| reads as one huge thing | instantly; human-scale detail and air prove the size; the silhouette is clear |
| weight / grounding | feet in the ground (prints, rims, splash), the body sits into its legs, nothing floats |
| detail holds at framing | no bare boxes, no clean surfaces, repetition varied, the join between legs and body shown |
| light & colour | the air carries the colour, surfaces keep theirs, warm lights amber, nothing burnt or black (median 40–120) |
| composition | one subject, one move, the scale cue in frame, the cut lands on a footfall |
| motion (preview clip) | planted feet locked, idle never dead, big moves gather and settle, loose parts lag |

Questions that fail a still on sight: "Is that floating?" "Is that a bare box?" "What is that white blob?"
"Which way is it walking?" "Why is the sky brighter than the fog?" "Could that knee bend that way?"

## The check before rendering

`check.mjs` passes (structure, legs, gait, cameras, build, determinism, every shot lit and moving, clean console);
the storyboard is scored ≥ 4 everywhere; a low-resolution preview (`render.mjs --w 480 --h 270 --mb 1 --every 3`,
`encode.mjs --every 3`) has been watched for sliding feet, popping legs and cuts that miss their footfall.
