# The Beekeeper — storybook-portrait brief (worked example)

## Topic
- Given: "양봉하는 할머니" (a grandmother who keeps bees) — a topic the source picture and the starter have nothing of.
- In one line: a grandmother who keeps bees on her roof, calm and amused, her eyes following the one bee that will not
  leave her alone.
- Not this: the starter re-dressed (short dark hair, yellow coat) or the source (long black-blue hair, stripes); not a
  beekeeper's veil and suit (it would hide the face, and the face is the style).

## Who
- Seventy-something; patient, dry humour, kind.
- The story detail: the bee — big enough to read, flying a lazy figure of eight round her head with a dotted pencil
  trail — and a wooden honey dipper pinned on her cardigan like a brooch, honey running from it.
- Mass: heavy — her head turns slowly (spring ω 6.5), the counter-move is long (0.22 s), the breath is deep (4.8 s).
- Idle: slow breath, blinks behind her glasses, eyes track the bee in small jumps; curls barely move.

## Design
- Head a = 205, softer jaw (0.26), eyes smaller (0.13) with heavy lids (0.25) and big pupils (0.45), a large button nose
  (1.25), mouth lower (0.70) in a small smile, grey brows, strong blush, pearl studs.
- Hair: a new style for this topic — `curly`: ~95 dry-brush spiral curls over the cap and down to the ears, darker ones
  underneath and lighter on top; base `#9c98a6`, streaks lavender-white `#e4e1e8`, dark violet-grey `#615c73` and a
  cold blue `#a3b4d8` (the style's streak signature, in grey).
- Clothes: `cardigan` in olive crayon `#7d8a3a` dotted with honey `#e9a91f` / `#f3c74d` (the pattern is pollen); a
  plain cream shirt under it (opaque, so the dots stop at the opening).
- Extras: round glasses (head layer, ride the face: brown ink rims, a bridge, a white glint), the honey-dipper brooch
  (body layer), the bee (front layer, live: gouache-yellow body, ink stripes, blurred wings, dotted trail).
- Palette: skin `#f1cfbd`, blush `#ec8590`, hair greys + lavender, olive `#7d8a3a`, honey `#e9a91f`, glasses brown
  `#5b3a2a`, ink `#241c22`, paper `#fbf8f0`. Olive against honey carries it; the grey hair keeps it quiet.
- Composition: head centre (540, 600), the bee's loop reaches just past the curls on both sides; ~65 % paper shows.

## Motion
- Draw 7.5 s, live 10 s.
- Reference: the bee's path is code (`beeAt` in character.js); the gaze keys are **read off that path** every 0.55 s
  (eyes track a moving thing in small jumps). The head goes along only when the bee is far to one side, and at most
  once every 1.1 s (a heavy head needs a second to land a turn). Set by hand; no generated video.
- Beats (generated in character.js from the bee): gaze every 0.55 s; head yaw ±0.12 / tilt ±0.05 when the bee crosses
  |x| > 0.6, back to 0 when it comes to the middle; "pleased" half way through.

## Review
- Round 1: curls drawn as a ring of separate circles round a flat grey cap, and a square notch where the hairline met
  the temples (hand 5, silhouette 6). Fix: curls sampled over the whole mass, darker underneath; a smooth hairline that
  eases from the forehead down to the ears.
- Round 2: the bee was too small to read at thumbnail size (topic 6); the cream shirt let the dots through (style 7).
  Fix: bee ×1.7; the inner shirt is painted opaque.
- Round 3: `check.mjs` failed on head beats 0.55 s apart (overshoot > 100 %, no counter-move): the head was changing its
  mind faster than a heavy body can turn. Fix: at most one head beat per 1.1 s, none in the last 1.2 s.
- Round 4: topic 8 · style 8 · face 9 · silhouette 8 · palette 9 · hand 8 · body 8 (strong 3/4 puts the far eye on the
  contour, glasses follow) · motion 8 · own picture 9 · cover 8. `check.mjs` passes.
