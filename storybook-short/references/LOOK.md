# LOOK — the picture-book film

The heads, faces, hair and media are the same as `storybook-portrait` (`lib/head.js` is its `figure.js`; `lib/paint.js`
is shared). What the film adds:

## Places (lib/kit.js)
- **Crayon for big areas**: skies in horizontal bands from a top colour to a pale horizon, walls, hills, water, ground —
  always over a thin gouache tint so the paper's tooth speckles through but nothing reads as a flat fill.
- **Gouache for small solid forms**: clouds (overlapping lobes on a flat belly, lavender crayon underneath), windows,
  fruit, pots, cones.
- **Ink for edges and grass**: thin wobbling lines, broken; grass blades and tall grass on hill edges.
- **Dry brush for trunks**, crayon scribble for foliage (round, poplar, umbrella pine).
- A shot is a **spread**: a clear ground line, three or four depths (sky, far, mid, near) for parallax, and one or two
  strong colour families per place (yellow wall / blue window; blue canal / coloured houses).
- `vignette`: the paper coming in at the edges, for one wide "spread" shot — not every shot.

## Characters (lib/body.js)
- Cut-out puppets: the head and the coat are painted once (sprites); legs and sleeves are segments filled with a crayon
  tile that moves with the limb; shoes are small gouache sprites; hats are head extras (`lib/wear.js`).
- Proportions in head radii `a`: head on a short neck, a bell coat from the shoulders to the knees (2.4–3.0 a), thin legs
  (0.2 a) below, small shoes. Close-ups are the same design at a ≈ 200.
- The far side is darker (coat shade, far leg, far sleeve); the near limbs are drawn in front.

## Life in every shot (lib/critters.js)
Birds (V flocks), a dog (quadruped gait), a cat (tail, ears, blinks), ducks (bob, ripples), butterflies, bunting
(fluttering), falling leaves / petals / snow. Something besides the cast moves in every shot (`check.mjs`).

## Frame
1920×1080, 30 fps. Shots open with a paper fade, a dissolve or a cut; the film ends fading to paper.
