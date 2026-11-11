# BRIEF — from a topic to a painted world

The brief is written before any code and saved as `BRIEF.md` in the project (`templates/BRIEF.md` is the empty form;
`examples/lighthouse-path/BRIEF.md` is a filled one). It decides everything the style leaves open.

## What is fixed and what the topic decides
| fixed (the style) | decided per topic |
|---|---|
| everything is dabs of one brush sheet, pinned to the world | what the world is made of, and how much of each |
| three mixes per thing: light · half-tone · shade, broken dab by dab | every palette |
| shade in whole dabs; the wanderer's shadow a glaze; mist toward the sun | where the sun is, the air's colour and thickness, the wind |
| ground dabs lie flat; growth stands; leaves and cloth face the eye | the land's shape, the way, the masks |
| a wanderer on a way; the eye behind, beside, ahead, low or looking up | who they are, what they wear and carry, how they move, the shots |
| brush relief, weave, varnish; no text; 1920×1080, 30 fps, silent | length (10–30 s), what is at the end of the way |

## Filling it in
1. **The picture in one line.** Who walks where, at what hour, in what weather, and the one thing to remember (a light,
   a colour meeting another, a thing at the end of the way). If you cannot say it in a line, the topic is not chosen yet.
2. **Light first.** A painting is its light. Decide the hour, then the sun: its bearing (`az`, a compass bearing with 0
   toward −z) and height (`el`). Low suns (10–30°) give the long shadows and edge light this style is best at; put the
   sun ahead of the main shot and off to one side. Noon (el > 55) flattens everything: avoid unless the topic is noon.
   Night works with a moon as the "sun" (cool light mixes, deep blue shades), stars, and a carried lantern (`uLamp`).
3. **Three colours and one accent.** Name the picture's light, half-tone and shade colours and the one accent. Every
   palette you write later leans toward them: lights toward the light colour, shades toward the shade colour (so shadows
   on grass, wall and coat are relatives). Shades are colours — plum, deep green, indigo — never grey or black.
4. **The way and the land.** 60–130 m of way is plenty for 20 s. Give it bends (a straight way is a corridor) and
   something at its end. The land's masks: `r` is always the way; give `g`, `b`, `a` meanings the kit will read
   (a second ground cover, where flowers grow, where rock shows, where trees may not stand).
5. **What it is made of.** One row per thing with its three mixes and where it is. Things that are *of the topic* come
   first (the lighthouse, the blossom, the market stalls); fillers (grass, far hills) support them. If something cannot be
   said in strokes (glass, neon text, a face in close-up), change the shot, not the style.
6. **The wanderer.** One person, drawn at landscape scale. Choose a silhouette that reads from behind at 5 m: a coat or
   none, a hat, a pack, one thing carried. Choose colours that are the accent or its neighbour, so the eye finds them.
7. **Shots.** 3–7. Vary the eye: at least one from behind (the walk into the picture), one where the eye stays put and
   they pass (a tripod low in the growth), one that shows the thing at the end. Walks are 1.2–1.8 m/s, runs 3–5.5.
   A shot may stand still (`walk: [s, s]`) and may turn their head (`look`).

## Review 1 — the cast sheet (`render.mjs world.html --cast --scale .5`)
Score each line pass / fail; fix `Figure` options or the rig until all pass (details: FIGURE.md).
- Front, back, both sides and both 3/4s are one body: cap peak / face toward where they face; pack on the back.
- The carried thing is in the hand the brief says in every view (their right is screen-left seen from the front).
- Walk: the knee of the forward leg points forward and the shin folds back; arms swing against the legs; elbows fold forward.
- Run: both feet leave the ground at some pose; the trailing leg is not past the hip's range; the coat trails behind.
- Standing feet are on the ground, not in it or over it. The coat does not cut through the legs.
- Does any tile make you ask "is the neck turned or the body?" — fail.

## Review 2 — stills (`--sheet`, then `--stills` full size)
- **Is it a painting?** Strokes are visible everywhere; no smooth gradient larger than a hand; no bare canvas.
- **Light.** One glance says where the sun is. There is sun and shade in the frame; shadow edges are ragged, not ruled.
- **Colour.** Lights are not white, shades are not black; shadows share a colour family; the accent appears once or twice.
- **Depth.** Near things are sharp-edged and rich, far things paler and larger-stroked; the mist separates rows.
- **The wanderer.** Found at a glance, whole in the frame, on the ground, lit like the world (their shade is the world's shade colour).
- **The topic.** Someone who knows only the topic would name this place. The thing at the end of the way is seen.
- **Not the source.** No autumn wood with a cloaked wanderer, no aurora ridge and cabin.
