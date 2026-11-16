# Dawn Baker — storybook-portrait brief (worked example)

## Topic
- Given: "새벽 빵집 견습생" (the apprentice at a bakery, before dawn) — not in the source picture or the starter.
- In one line: the youngest baker at the corner bakery at 4:50 a.m., flour on her face, losing a fight with a yawn.
- Not this: a chef's hat and a croissant icon; the starter (rain, yellow) or the source (long black-blue hair).

## Who
- Around twenty; sleepy, warm, good at her job anyway.
- The story detail: flour — a smear on her cheek, a dab on her nose, a handprint on the apron, dust drifting up through
  the oven light — and the yawn.
- Mass: medium.
- Idle: sleepy lids (0.3), slow blinks, gaze drifting low to the left (the counter), a gold hoop that swings when she moves.

## Design
- Head a = 212, jaw 0.2, eyes 0.15 with two lashes each, lids 0.3, button nose, auburn brows, freckles (10), hoops.
- Hair: `bun` — pulled back (combed dry-brush strands from a high hairline to the crown, tucked behind the ears) with a
  bun on top; auburn `#6e2c18`, streaks of orange `#d9692a` / `#f09a4a`.
- Clothes: `collar` garment in cream crayon `#f5ecda` with thin blue stripes (a work shirt), a navy apron bib and straps
  `#2c3e6b` over it, a red kerchief `#d8432f` knotted at the throat.
- Extras: apron (body layer, with a flour handprint), kerchief (body layer), flour on the face (head layer, rides the
  face), flour dust (front layer, live: warm specks drifting up).
- Palette: skin `#f4d2c0`, blush `#f08a84`, auburn + orange, cream, navy, red, flour `#fffdf6`, ink, paper `#fbf7ef`.
  Navy against red and orange carries it.
- Composition: head centre (540, 590), the bun near the top third; ~68 % paper shows.

## Motion
- Draw 7.5 s, live 10 s.
- Reference: set by hand from how a yawn goes (gather → open → hold → let go → shake it off); no generated video.
- Beats:

  | t | gaze | head | face | why |
  |---|---|---|---|---|
  | 0.6 | [−0.6, 0.3] | — | sleepy | looking at the counter |
  | 1.8 | [0.2, 0.1] | — | lids 0.6 | the eyes start to close: the yawn coming |
  | 2.6 | [0.1, −0.5] | tilt −0.14, yaw 0.06 | mouth open 0.95, lids 0.92, brows up; ease 0.45 s; breath ×2.2 | **the yawn**: a breath in, the head goes back and over, the mouth opens slowly (the runtime adds the counter-move first) |
  | 4.4 | — | tilt 0.03, yaw 0 | mouth closed, lids 0.35; ease 0.2 s | lets go |
  | 5.2 | [0.6, 0.1] | yaw 0.10, tilt 0.05 | calm | shakes it off, one way… |
  | 6.0 | [−0.5, 0.05] | yaw −0.08, tilt −0.02 | — | …and the other |
  | 7.2 | [0.5, −0.2] | yaw 0, tilt 0 | pleased | awake (for now) |
  | 8.8 | [−0.6, 0.3] | — | sleepy | and back to sleepy |

## Review
- Round 1: the bun's sides came down to the brows in a flat line (a helmet, silhouette 5); the open mouth was a dark
  smile, not a yawn (face 5). Fix: a high hairline that eases down behind the ears; an open mouth drawn as a dropped jaw
  (a tall oval with a tongue).
- Round 2: apron straps ran sideways from the shoulders to the bib (body 6). Fix: straps rise from the bib's corners to
  the shoulders beside the collar.
- Round 3: `check.mjs` failed: head beats 0.35 s apart in the shake never landed (no overshoot), and the flour dust at
  the bottom edge read as the body sliding. Fix: shake beats 0.8–1.2 s apart; the planted check measures the body
  without the front layer.
- Round 4: topic 8 · style 8 · face 8 · silhouette 8 · palette 9 · hand 8 · body 8 · motion 9 (the yawn gathers,
  holds and lets go) · own picture 9 · cover 8. `check.mjs` passes.
