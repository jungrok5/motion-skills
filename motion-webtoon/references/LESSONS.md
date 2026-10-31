# Lessons (what went wrong on 「마지막 도넛」 and the starter, and the fix)

Problem → cause → fix. Most of these cost a render or a review round once; none should cost one again.

## Tooling
- **A scene rendered blank or half drawn, with no error.** → canvas-film's render.mjs never listened for page errors; a scene
  that threw mid-draw just drew less, and `body-check.py` captured the render's output and hid it too. → `scripts/debug.mjs`
  (page errors with stack lines, console errors/warnings, failed requests, ms per frame) after every big edit; the vendored
  render.mjs prints page and console errors; the vendored body-check.py prints a failed render's stderr.
- **Stills vanished after a body check.** → canvas-film's body-check.py deleted `out/still-<scene>-<o>-*` before rendering
  its pack into `out/`, taking the scene's review stills with it. → re-render stills after a pack (old copies), or use the
  vendored script, which renders into the pack's own `raw/` folder (`render.mjs --outdir`).
- **A wait loop never ended.** → `while pgrep -f render.mjs; do sleep 5; done` matches its own shell's command line, which
  contains "render.mjs". → wait on the PID (`node … & pid=$!; wait $pid`), or `pgrep -f "[r]ender.mjs"`, or poll for the output file.
- **A render with missing fonts looks fine at a glance.** → canvas-film's render.mjs stops when a film.json family is missing;
  keep it that way. The starter ships subset fonts in `fonts/` so its quick start runs offline — and those subsets miss any
  character you add (see `examples/starter/fonts/README.md`).
- **`Canvas2D: Multiple readback operations … willReadFrequently`** in the console → `Manga.grade` reads the frame back once per
  frame; harmless. `debug.mjs` hides it.

## The mono-manga finish
- **Soft colour washes became busy fields of dots.** → `Manga.grade` maps luminance to dot levels; a gradient or a glow spans
  several levels and turns into noisy bands. → draw for print: flat paper, solid black, deliberate `Manga.tone(ctx, coverage)`;
  step a ramp in 2–3 tone fills, or grade with `smooth: true` on purpose.
- **Two people merged in mono.** → same values (mid-grey shirt, mid-grey jacket). → give each person a different value per
  garment (ink / dark dots / light dots / paper), checked on the cast sheet.
- **A black sleeve vanished on a black panel.** → ink on ink. → a paper outline under black sleeves on dark panels (donut
  ep2's "sleeve halo on black" fix; `Cast.reachArm` adds it by default for ink sleeves).
- **Thin lines must not break into dots.** → a plain luminance screen treats a 2-px line like a flat grey area. → the grade's
  edge test keeps line art solid (a pixel ≥ 38 lighter/darker than its 8-px neighbourhood stays paper/ink); keep lines ≥ 2 px.
- **The grade is the frame's cost** (≈ 40–120 ms per 1080×1920 frame). → keep drawing cheap, cache textures in `init`, and expect
  ~8–20 fps for a live page.

## Bodies (the owner: "joints must be physically possible")
- **Straight, stiff arms.** → IK targets out of reach (farther than upper arm + forearm): the solver returns a straight limb. →
  keep targets inside reach; derive them from geometry (`G.shoulders` + an offset — the SD `sdGeom` now returns shoulders too).
- **A grab read as a wrist turned 180°.** → the palm-to-camera hand was reused for a grab from above. → a palm-down hand (back
  of the hand to camera) for grabs from above (donut ep2's lunge).
- **Arms began in mid-panel.** → close-up arms were drawn from a point inside the panel. → put the shoulder OFF the panel and solve
  the arm on the 3D IK (`Cast.reachArm`), or give `Cast.hand` a sleeve long enough to leave the frame.
- **Thumbs on the wrong side.** → one hand drawing used for both hands and both facings. → a left hand is the mirror of a right
  (`flip`); palm to camera = thumb on the midline side, back of hand = thumb outside. Check every close-up.
- **The 'point' pose read as a rude gesture** at close-up size. → the lone extended finger read as the middle one. → point with
  the thumb showing and the finger on the thumb side, or use an open hand.
- **Elbows flipped mid-reach.** → a pole recomputed per frame. → a fixed pole per reach (`bend`, `pole`); `bone-check.mjs`
  flags elbow jumps.
- **Hands floated over desks; a mug changed hands between panels.** → hand targets guessed per panel. → targets on the surface
  (the desk top), held things as the `prop` of one named hand in every panel; compare consecutive panels.
- **Cast-level vs scene-level fixes.** → fixing the same wrist in three scenes. → if every scene would show it, fix the cast
  rig/cast file once and re-run `bone-check.mjs` on every scene; one pose → fix the scene.
- **`expr: 'joy'` gave a crying face.** → in the kit `joy` = tears of joy (`cry` too). → `happy` / `smile` for plain happiness.

## Words and panels
- **A balloon covered the speaker's face** (starter, first pass). → balloon placed at head height. → place balloons above the
  head, tail to `G.mouth`, and check the still at every camera stop.
- **Moustache + side part + dark hair** on a small face can read as an unfortunate historical likeness. → keep facial hair wide
  and soft (the kit's note; 김과장's brush moustache).

## Sound
- **Generated narration was too slow and pausy for comic timing.** → TTS reads every comma. → cut segments and set the pauses
  (`audio-cuts.py`), tempo 1.12–1.15 where needed, level every line to −18 dBFS active RMS.
- **Music takes thinned out before the requested length.** → generation tails off. → cut each cue where it thins; split cues
  at register switches; use a tail of the same take to land its climax on a beat.
- **The bed jumped back up after each line.** → mix.py ducks snap back at `to`. → stepped release (three 0.13 s steps).
- **Levels without ears.** → `sound-levels.py` (voice vs bed per line) + `ebur128`; numbers in SOUND.md.

## Process
- **Restyle on the cast sheet first.** The donut film's switch to the riso construction + mono print was settled on
  `cast-sheet.html` and only then carried into the three scenes, one scene per commit.
- **A fresh reviewer finds what the author cannot.** Every scene's body pack went to an agent that had not seen the story, and
  each review produced a round of fixes (ep1: sleeping hand, desk arms, raised-arm root, flinch, walk legs; ep2: palm-down lunge
  hand, frame-break arms, sleeve halo on black, mug continuity, counter legs).
