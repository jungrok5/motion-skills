# LESSONS — problem → cause → fix

What went wrong while building this skill, so the next hero does not repeat it.

## Getting the reference
- **X refused a plain fetch (402)** → the public thread API (`api.fxtwitter.com/2/thread/<id>`) returned the post,
  the quoted post and the clip's MP4; `ffmpeg -vf fps=3,tile=3x4` sheets were enough to read the hero, the HUD and the
  orbiting view. The clip stays in scratch, never in the repo.

## The cloak
- **The walk loop needed 17 cm of correction to close** → the front-edge chains collided with the swinging arms and
  flapped differently every cycle → the arms carry the side columns as a function of the (delayed) arm pose
  (`armKick`) instead of a collision.
- **The run still would not loop (21 cm)** → hard `twist` / `fold` / `cone` stops: the hem hit a stop a little earlier
  or later each cycle → every limit is a smooth saturation (tanh / softplus). The run closes to 0.1 cm.
- **"lag 3" measured as 1 frame on the walk** → the chain does not stretch, so the walk's vertical bob reaches the hem
  at once; and the row limits were evaluated in the body's frame *now* → the lag is measured on the horizontal swing,
  against the no-delay goal, and the limits use the delayed frame. Now 3 → ~3 frames.
- **A visible seam and a "shelf" at the shoulder** → the mantle and the body were two meshes → one mesh, custom
  weights: above the shoulder line the chest, below it the chains, blended over a 5 cm band.
- **Hands poked through the cloak** → the cloak's radius came from the shoulders only → it keeps clear of the hanging
  arm and hand (`arm_x`) at every height; the adult arms also hang closer (clearance search starts at 2°).

## Paint
- **The cream shirt looked stained** → auto shadow tone = darker and yellower → pale cloth gets a cool grey-violet
  shadow at a lower weight.
- **Dark hair got pale salmon streaks; tiny pieces painted flat** → the light tone lifted a fixed share of the
  distance to white; one stroke bigger than the piece covered it → lights scale with lightness; small pieces get a
  smaller brush; the tiniest stay plain.
- **The rectangles looked like tape, not paint** → straight-sided strokes → wobbling edges, a taper toward the tail,
  a round loaded head and a dry-brush tail.

## The body
- **Chibi proportions at seven heads** → shoulder, hip, arm, torso constants were tuned for a big head → every
  constant blends chibi → adult by `heads`.
- **A strip of skin at the crotch** → the trouser seat ended above the torso's bottom → seat down to hip − 0.08 H.
- **The beanie read as a headband and hair poked through its top** → the cap was head-sized under a hair shell → a knit
  cap is a size up from the head and sits higher (`sit` .4).

## Renders
- **The concept and the cast sheet cut the feet off** → portrait frames: Blender fits the 36 mm sensor to the longer
  side (the height), the framing maths assumed the width → `frame_dist` uses the height for portrait frames; the
  concept is framed at 80 % with the aim a little low.
- **A full review is slow on a CPU** (≈ 5 s a 960×540 frame, ~20 min for three clips) → look at `stills --clip` first,
  render `clip <name>` for the one you are fixing, and `review` once at the end.
