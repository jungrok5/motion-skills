# LOOK — what makes it read as the reference

Studied from the two clips on X (Ann Nguyen's incense-stick diagram, 32 s, 975:779, 27 steps; Kevin Ngo's boba-shop
statechart it quotes). Pull your own study sheet from any reference clip with
`ffmpeg -i ref.mp4 -vf fps=1/2.5,scale=600:-1,tile=2x2 sheet%02d.jpg`.

## The sheet
- **Cream paper** (`C.paper #f3eee2`) with faint fibres and grain; the whole film is one long sheet scrolled vertically.
  Nothing is dark; the only "black" is navy text (`C.navy`).
- **Two inks**: cobalt blue (`C.ink`) for every line, arrow, outline and action text; red (`C.red`) for guards, the small
  tags, the active state's frame and the active dot. Fills are crayon colours: cream/yellow boxes, pink active box, sky and
  blush regions, then the props' own colours (yellow hats, red stools, green leaves).
- **Crayon hatching** everywhere a shape is filled: parallel diagonal strokes (≈ −50°) of varying weight over a pale wash.
  Flat fills read as vector art; hatching is what makes it look drawn. Box drop shadows are hatched too (blue, offset 5 px).
- **Pencil lines**: slightly wobbly, with a lighter second pass beside the first. Corners of transitions are rounded.

## Lettering
- **Typewriter** throughout (Courier Prime; Nanum Gothic Coding for Hangul).
  - chapter kicker: small, `the making of nhang · I`
  - chapter title: huge bold slab, Title case, one or two words (`A stick`, `Rolled`, `Two at once`)
  - subtitle: italic blue, one line (`from a bamboo pole to a red foot`)
  - second-language line: small italic red under it
  - state label: regular, lower-case, centred (`strips in the sun`)
  - state tag: tiny italic red, top-left, with a thin red rule under it (`phơi nan`)
  - action text on an arrow: italic blue, 1–2 short lines beside the arrow (`soaked, split / into strips`)
  - guard: italic red in brackets (`[by hand]`, `[still damp]`), above the bend of its branch, on the outside
  - caption: italic, centred under the buttons, numbered `I.3 — if the strips are still damp, one more day in the sun`

## The chart
- **States** are torn-ticket boxes: straight top and sides, a zigzag bottom edge, hatched cream fill, hatched blue drop
  shadow. Width fits the label; the tag sits in the left half so the entry dot (top centre) never covers it.
- **Entry dot** at the top centre of every state that is entered from above: blue (not yet), yellow (passed), red (now).
  The arrowhead stops just above it.
- **Active state**: pink fill and a red outline 5 px outside the box; it pops slightly when it becomes active.
- **Initial state**: a red dot in a blue ring above the first state. **Final**: a blue dot in a ring.
- **Transitions** are orthogonal with rounded corners: straight down; a split leaves the bottom at ±½ width and turns
  sideways to each child; a merge enters the top at ±0.45; a self-loop is a small hook on the right side; a back edge leaves
  the right side, runs up outside everything, and comes back in from the right.
- **Parallel state**: a big rounded box with an italic header `at the same time`, regions inside (tinted sky / blush,
  bold title, a rule under it), a dashed divider between them, each region with its own initial dot.
- **Chapters** stack down the sheet; the last state of one chapter has an arrow down into the first state of the next.

## The pictures
- Crayon illustrations sit **beside** the chart, not behind it: people working (a conical hat, a patterned shirt, an
  apron), the tools and materials of the step (a pot on a fire, bundles, a machine with a wheel), weather (sun, rain
  cloud). They appear with the step they belong to and keep moving a little (fire flickers, steam rises, rain falls, hands
  stir).
- Ingredients can stand in a row with a small caption under them (`mùn cưa · trầm   quế · hồi   keo`).
- Props are drawn in the same hand as the chart: ink outline, crayon hatch, the same palette.

## Motion
- Each step: the arrow grows from its source, its label types in, then the new box appears (a quick wipe + pop), then
  the active highlight moves to it. About 1.2–1.8 s a step.
- The camera only scrolls when the new part would leave the frame (eased, ~0.9 s); a new chapter scrolls its heading to
  the top. No zooms, no cuts.
- The player bar is part of the picture: a blue rule, rounded hand-drawn buttons (restart · prev · pause · next · ⚡ 3×),
  the red step counter, the caption.

## Must not look like
- clean vector flowchart (flat fills, perfect lines, sans-serif)
- dark mode, gradients, glows, drop shadows that are not hatched
- labels touching lines or boxes; arrows crossing boxes
- a wall of boxes with no pictures, or pictures that cover the chart
