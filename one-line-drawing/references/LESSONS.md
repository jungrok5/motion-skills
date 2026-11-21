# LESSONS — problems met building this skill and its first pieces (problem → cause → fix)

- **X refused a plain fetch of the post (402).** → The public thread API (`api.fxtwitter.com/2/thread/<id>`) returned
  the text and the MP4 URL; `ffmpeg -vf fps=1/2,scale=240:-1,tile=6x2` made contact sheets to read the beats.
- **Bare diagonals across the picture.** The first route jumped from part to part with `to()`; every jump drew a long
  stray line through the sky or across a figure. → Route travels along things that exist (frame edges, the horizon, a
  waterline under the posts, a wire, a rod) and use detours (`contour … until` → excursion → `contour … until:
  L.last.start`). The line sheet makes every jump obvious.
- **The jetty contour started with a line through the angler's legs.** After the figure's loop the pen was at the
  figure's back; `contour('jetty', { from: 'near' })` connected straight down through it. → Enter the jetty first,
  stop at the figure's foot, loop the figure, then finish the jetty from where the pen already is.
- **Lanterns and the pot were never drawn.** They sat inside a hole of the stall silhouette (between the posts, under
  the valance), and only outer outlines are traced. → Things seen through a hole are their own shapes, reached by
  detours from the outline they hang on (LINE.md).
- **A comb instead of pines.** A pine treeline with a tooth every 9 px traced as a dense comb at the close zoom. → Teeth
  every 26 px; at 2.4× zoom every detail of the outline is seen, so silhouettes for tracing are simpler than for painting.
- **The boat's hull crossed itself.** Flipping `dir` mirrored only some points. → Mirror every x about the centre
  (`X(dx)` in `kit.boat`).
- **The hand could not reach the rod grip.** `reach` targets 7 px beyond the arm. → `check.mjs` fails unreachable
  reaches; pull the grip in rather than stretching the arm.
- **An umbrella arm swung 39° across the body in a back view.** The hand target was below the shoulder and inside it, so
  the IK folded the upper arm inward. → Hold umbrellas at chest height, outside the shoulder; the limit `out −10°`
  caught it.
- **The cast sheet's "as posed" figure had its arm flung out.** It reused absolute reach targets at a new scale. → Views
  carry the solved arm angles instead of the targets.
- **A render hung for minutes on a missing file.** The example's import map pointed one level too shallow, the module
  never loaded and `__ready` never came. → `render.mjs` treats "Failed to load resource" while loading as fatal.
- **The signature landed on the base rule.** Clamped to 70 px above the page bottom when the drawing reached y 1840. →
  Clamp 26 px above the bottom; leave the base rule ≥ 60 px above the page edge in a brief.
- **One of two stools was never drawn, and coverage said 100 %.** A shape with two separate pieces has two outlines;
  `contour` follows one (`loop: 0`, the largest) and coverage only measured that one. → Coverage measures every piece;
  draw the others with `contour(name, { loop: 1 })` (or make them separate shapes).
- **The umbrella's canopy overlapped the awning.** Its tip sat inside the stall, so every travel to and from it crossed
  the awning. → Keep silhouettes the line must enter from outside clear of each other in the composition; overlap only
  where the line can pass along a shared edge.
- **The live demo took 22 s to start.** Every `ctx.filter = 'blur(…)'` pushed the canvas onto a slow path in software
  rendering, and the next read-back cost ~3 s. → No `ctx.filter` anywhere: `boxBlur` (core.js) on cropped regions, a
  pre-blurred stylus shadow sprite. Startup 0.9 s.
