# LOOK — what makes it read as this style

Observed from the reference (https://x.com/Artedeingenio/status/2117622425873736092: 30 s, 1280×720, 24 fps; and the
four stills of the quoted post https://x.com/Artedeingenio/status/2117254123653321201), then turned into rules the code
follows. The reference was generated (Midjourney stills, animated by a video model); nothing of it is copied here — not
its characters, its creature or its frames.

## What the reference does
- **Paper.** Every frame sits on a toned sheet — sage-khaki to grey-green, slightly mottled, a little lighter in the
  middle. Long passages are almost only paper with a figure on it.
- **Line.** Graphite-dark, rough, doubled; strokes overshoot corners and leave gaps; weight varies along a stroke;
  backgrounds are line drawings with ruled-but-wobbly perspective.
- **Colour.** Flat, muted, laid on like marker: sage, olive, khaki, dusty teal, cream, mauve-grey; one warm salmon /
  dusty red accent (awnings) and one magic gold ring. Colour often does not reach the line, or spills past it; big
  areas (walls, sky) are left uncoloured or washed only partly.
- **Cast.** Long-legged, small-torso figures (legs ~1/2 of the height), heads ~1/7; big wavy hair masses with loose
  locks; oversized open overshirts, very wide trousers that pool over chunky boots; almond eyes with a heavy upper
  lid and big irises, acting brows, small mouths; a long-eared, long-limbed pet.
- **Dark things** are pencil scribble: dense black loops with stray loops past the edge, living (re-scribbled each frame).
- **Meta-drawing.** The page draws itself: a line on the ground becomes a circle, a door is drawn in the air, pages and a
  pencil fly past, a scribble wipe turns a scene back into rough sketch; it ends where it started, on the blank page.
- **Camera.** Wide establishing frames, a one-point street, low angles on bridges, a dutch tilt in the fall; mostly
  locked or slowly pushing, fast only in the chase.

## The rules in code
| part | how |
|---|---|
| paper | `F.sheet` (S.paper: tone, 60 soft blots, fibres, specks) behind every shot (`g.paper()`), and multiplied + screened over the whole frame in the grade (`paperTooth`) so fills get the tooth too |
| pencil | `S.line`: Catmull-Rom through the points, resampled, wobbled by noise (whole-stroke shift + 2 frequencies), overshoot at both ends, a firm tapered pass + a thinner lighter pass a hair off it; closed outlines overlap their start (`loop`) |
| boil | `S.pen.boil` changes 8× a second (film.js); every stroke's wobble seed includes it, so lines crawl like hand-drawn animation while the drawing itself holds on twos |
| fills | `S.fill`: the shape shifted by `pen.misreg` (~5 px, turned per shape), edge wobbled, dry-marker streaks inside (`tex`) |
| shading | `S.shadeSide`: one flat darker tone where the shape, moved toward the light (upper left), no longer covers it — one shadow side, no gradients |
| architecture | `sharp: true` keeps corners; walls get a partial wash (`facade` `wash`) over an opaque paper `base`; windows are loose rects, some only two-sided; shade sides are hatched |
| scribble | `S.scribble` / `K.mass`: a core fill + 60–110 random loops + a sparser outer layer with strays; re-seeded every boil |
| palette | sage paper `#b7b996`, walls `#c9c8a9 #bfc4a6 #cdc6ad`, teal air `#86a09a`, deep `#6e8a84`, graphite `#2b2c29`, accent `#c48a7c` — muted means mean saturation ≤ .42 per frame (`check.mjs`) |
| grade | paper tooth, a cool soft-light top, a faint warm multiply, lifted blacks, a soft vignette, grain on twos, a tiny exposure flicker per boil |

## The cast
- People (`R.person`) are built from a spec: proportions (`legs`, `torso`, `head`, `shoulders`, `hips`, `arm` as parts of
  `h`), hair (`wild` long mass, `mop`, `bob`, `tied`, `spiky`, `bun`, `buzz`), `top` (with `len` < 1 for a midriff),
  `jacket` (an open coat / overshirt whose panels swing with `wind` and close over the body in profile), `pants` (`baggy`),
  `shoes` (`boot`), eyes, nose, brows, glasses, blush.
- Faces act with lids and brows: `EXPR` has neutral, smile, grin, joy, shock, scared, determined, sly, sad, wink, calm,
  yell, awe; `look` moves the irises, `blink` closes the lids.
- Companions (`R.critter`): a bean body, a head with a snout, ears (`long` floppy / `point` / `round`), a tail (`thin` /
  `fluffy`), gaits sit · stand · walk · run · leap · crouch; ears stream back in a run.
- Line weight thins a little with scale (`lw / s^.45`), so far figures stay pencil, not hairline.
- Sides: facing right, a figure shows its right side — the near (in-front) arm and leg hang from the shoulder and hip on the
  screen side behind the face; the open coat's fronts meet a centre-front line that moves toward the facing side as it turns;
  the far eye (on the facing side) is the narrower one.
- One light from the upper left for every shadow side in the film.

## Motion
- 24 fps; characters, effects and shakes on twos (`g.twos()`), line boil at 8 fps, camera and rain smooth.
- Big cartoon stride in the run (`R.run`: thighs ±.85 rad, the heel kicks to the seat), anticipation crouches,
  squash on landings (`squash: .88` → 1), overlap in hair and coat (`wind`, `flow`).
