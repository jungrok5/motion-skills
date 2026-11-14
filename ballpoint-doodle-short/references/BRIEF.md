# Topic → brief, and the two reviews

The brief is written before any code, as `BRIEF.md` in the project (copy `templates/BRIEF.md`). It turns the user's
topic into: a cast designed for it, the thing that gets away, one world on one line, 6–10 beats, the one sign, the loop.
`examples/seed/BRIEF.md` is a filled one.

## From a topic to a story in this grammar
Most topics fit the errand-gone-wrong chase (references/STORY.md). Ask four questions of the topic:

1. **What is precious, and small enough to roll, float or be carried?** (a seed, an egg, a letter, a balloon, a
   lost key, a cupcake, a paper boat, a firefly in a jar). This is the chased thing; draw it as a prop in `props.js`.
2. **Who is told to look after it, and by whom?** The hero is a round creature with one prop that matters later
   (a watering can, a net, an umbrella, a spoon). The one who gives the job writes the one sign.
3. **Where can the line go?** Pick 3–5 places whose *line shapes* differ: flat, slope, water, cliff, stairs, a bridge,
   a log. Each place gets one gag (a hop, a skip on lily pads, a slide, a fall).
4. **What does it become?** The loss turns into something better (a seed → a sunflower, an egg → a chick, a letter →
   a paper plane that lands where it was meant to). The last shot is home again with a twist that could restart it.

If the topic is not a story ("our café's opening", "how rain is made"), find the creature and the precious thing in it
(a coffee bean who must reach the cup; a droplet who wants to get back to the sea) — the grammar stays the same.

## Designing the cast (for this topic, never from the template)
- **A silhouette in words** first: body proportions (rx, ry, egg), ears or none, nose or beak, arms as wings or paws,
  a tail, one tell (a scarf, glasses, a hat, three hairs). Describe it so it could be drawn from the sentence.
- **Crayon colours**: one body colour + a darker shade + one accent. Keep two creatures apart in value and hue
  (warm brown vs cool slate vs pale grey + red).
- **What it carries**: props are functions drawn in the hand's frame (`hold: { arm, draw }`), designed for the topic.
- **The faces it needs**: list the expressions the beats call for; the rig has open, half, happy, shut, squeeze,
  wide, sad, dizzy + brows (angry, worried, up) + mouths.

## Cast review (on `cast.html`, before any shot)
Render `node <skill>/scripts/render.mjs cast.html --stills 0 --scale .5` and look. Every line must hold:
1. **Readable at 30 % size**: the silhouette and colour tell who it is.
2. **The turns agree** (−90, −45, 0, 45, 90, 180): the face, nose / beak, cheeks and feet go round the ball together;
   the far eye (on the side the face turns toward) is the narrower one; the tail is on the side away from the face;
   the back view has no face. A creature facing screen-right shows its right side: its near arm is its right arm,
   attached on the back side of the ball.
3. **Gaits both ways**: walk and run facing right *and* left look like mirror images in pose, not in drawing (no
   flipped asymmetric details — a scarf knot, a side parting — that change sides).
4. **Wings and paws**: a wing at rest sweeps back and down; a paw hangs at the side; nothing bends past the rig's
   ranges (`R.LIM`; check.mjs reports `body: …`).
5. **Faces act**: each listed expression reads without the body.
6. If a pose makes you ask "did it turn its head or its body?", it fails. Fix the spec or the pose and re-render.

## Still review (every ~12 random stills from the sheet and from the MP4; score 0–2 each)
1. **On the sheet**: bare paper in every frame; outlines are thin ballpoint (two passes, a little wobble); fills are
   parallel hatching with paper between the strokes, never flat paint or gradients.
2. **Things in front cover things behind** (a fill lays the sheet's colour under its hatch); overlays (cheeks, pads)
   tint.
3. **Nothing floats**: everyone stands on the line or is plainly jumping / falling; a scribbled contact shadow under them.
4. **Faces and facing**: faces read; everyone faces the way they move; the hero's head is never cut by the frame.
5. **The chased thing is findable** whenever it matters; one action per moment.
6. **The line reads as a place**: slope, water (blue with ~ marks), cliff (vertical, hatched) are clear at a glance.
7. **The words**: only the sign (and marks like "!"), in handwriting.
Fix anything below 2 and re-render that moment.
