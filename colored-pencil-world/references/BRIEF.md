# BRIEF — from a topic to a drawn world

The brief is written before any code and saved as `BRIEF.md` in the project (`templates/BRIEF.md` is the empty form;
`examples/canal-october/BRIEF.md` is a filled one). It decides everything the style leaves open.

## What is fixed and what the topic decides
| fixed (the style) | decided per topic |
|---|---|
| everything drawn with the pencil material: strokes along each piece's fields, ~4.6 px apart, never swimming | what the world is made of, and how much of each |
| four layers on white: warm light · own colour all over · own colour in strokes into the shade · shadow pencil across | every thing's pencil (its colour); the sunlight and shadow pencils |
| paper tooth, flecks of white, graphite contour from depth, unfinished torn margin | where the sun is; the sky's blues and how much cloud; the wind |
| soft, slightly kneaded solids; clouds and glints left as bare paper; water drawn level, mirroring fronts | the land, the water, the way, the houses, trees and small things |
| a walker on a way; the eye behind, across, low, high or ahead | who they are, what they wear and carry, the shots |
| one caption in pencil handwriting; 1920×1080, 30 fps, silent | the caption's words; length (10–30 s); what is at the end of the way |

## Filling it in
1. **The picture in one line.** Who walks where, at what hour, in what season — and the one thing to remember (a
   colour against another, a bridge, a tower at the end, leaves coming down). If it cannot be said in a line, the topic
   is not chosen yet.
2. **Light.** Decide the hour, then the sun: its bearing (`az`, 0 toward −z) and height (`el`). The pencil needs a lit
   face and a shaded face on everything: a sun 20–40° high, to one side of the main shots, is best. Put the fronts that
   matter facing the sun, or in shade on purpose (a shaded row is crossed with the shadow pencil — rich, not dark).
   Choose the sunlight pencil (`warm`: a pale yellow at noon, a deeper apricot in late afternoon) and the shadow pencil
   (`shadow`: blue-violet by day; bluer on snow, plum at dusk). Stronger warm (`press[0]` 1.2–1.4) for golden hours.
3. **Colours are pencils.** Name the 5–8 pencils of the picture (walls, roofs, leaves, water, the walker's accent).
   Write each as the colour the thing is in the light: clear, fairly light, a little chalky (`#e9c46a`, `#c7573f`,
   `#8fb3c9`), never grey or black. Iron is slate (`#2f3a44`); white is cream (`#f8f4ea`). One accent, used on the walker.
4. **The place and the way.** 25–50 m of way is plenty for 20 s at a walk. Give it a turn, a crossing (a bridge, a
   gate, steps) and something at its end. Keep the ground under the way level or gently sloped; cut water below a level
   and wall it; a deck carries the walker over water.
5. **What it is made of.** One row per thing with its pencils and where it stands. Things of the topic first (the
   canal and its bridge, the barn, the stalls), then what fills (rows of houses, trees, lamps, benches). Houses: decide
   each one — width, storeys, wall, roof kind and colour, shutters or none, a shop, a balcony, a vine — so no two
   neighbours are alike. If something cannot be said in pencil (glass towers, neon, a close-up face), change the shot.
6. **The walker.** One person, drawn at street scale. A silhouette that reads from behind at 5 m: a coat or none, a hat
   that does not hide the face, one thing carried. Their accent colour is the brightest in the picture.
7. **Shots.** 3–7. Vary the eye: at least one from behind (the walk into the picture), one where the eye stays put and
   they pass (across the water, from a doorway), one low or high (from the water, from a bridge), and one that shows the
   thing at the end. Walks are 1.2–1.8 m/s; a shot may stand still (`walk` left out) and turn their head (`look`).
8. **Caption.** A few lower-case words naming the place and the hour ("the canal, october") — or one per shot.

## Review 1 — the cast sheet (`render.mjs world.html --cast --scale .5`)
Score each line pass / fail; fix `Figure` options or the rig until all pass (details: FIGURE.md).
- Front, back, both sides and both 3/4s are one body: the face (eyes, nose) shows from the front; hair and hat behind.
- The carried thing is in the hand the brief says in every view (their right is screen-left seen from the front).
- Walk: the knee of the forward leg points forward and the shin folds back; arms swing against the legs; elbows fold forward.
- Run: both feet leave the ground at some pose; the coat and scarf trail behind.
- Standing feet are on the ground. The coat, skirt or bag does not cut through the legs; nothing is seen through.
- Does any tile make you ask "is the neck turned or the body?" — fail.

## Review 2 — stills (`--sheet`, then `--stills` full size)
- **Is it a drawing?** Strokes everywhere, following each thing's form; the paper's tooth shows; a soft outline goes
  round things; no smooth gradient or flat fill larger than a hand.
- **Light.** One glance says where the sun is: lit faces have the warm touch, shaded faces the shadow pencil crossed
  over; cast shadows fall on the ground and across walls.
- **Colour.** Clear pencils on white; no black anywhere; the walker's accent is found first.
- **Depth.** Near strokes larger and darker-outlined, far things paler with fainter outlines; the sky's clouds are paper.
- **Water** (if any): it mirrors the fronts and boats in broken bands; glints are bare paper.
- **The walker.** Found at a glance, whole, inside the finished part of the sheet, on the ground or the deck.
- **The topic.** Someone who knows only the topic would name this place. The thing at the end of the way is seen.
- **Not the source.** No harbour quay of painted houses with a pier, lighthouse and a sailor in a red beret.
