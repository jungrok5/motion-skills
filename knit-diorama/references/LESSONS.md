# Lessons (problem → cause → fix)

From building `examples/harbour` and the template.

- **The knit front had to be a pure function of t, but it is a running maximum.** → The edge keeps the bump the knitting
  head left as it passed each angle; that is history. → `D.front(t)` re-integrates the history every frame: it samples the
  head from the start of the window to t at 60 Hz and takes the max (knit) or min (unravel) per bin, only for the ±8 bins
  near the head. ~8k operations a frame, and `seek(t)` in any order gives the same frame (`check.mjs` proves it).
- **Field edges were staircases.** → Regions assigned per triangle follow the grid. → Triangles that cross a region change
  are split at the boundary found by bisection on `region()`; the cut point on each edge is cached so both neighbours share
  it. The same cut segments, chained into polylines, carry the seam stitches — no separate boundary tracing.
- **The template page threw "Maximum call stack size exceeded".** → `idx.push(...group)` with one region covering most of
  the ground spreads 200k arguments. → Push in a loop. (The harbour never hit it: its regions are smaller.)
- **The lighthouse stood in the sea.** → It was placed by eye from a still; the coast function put that point 1 m offshore.
  → A `D.check('the lighthouse stands on land', …)` caught it; the headland was widened and the tower moved. Write a rule
  for every placement that matters.
- **The hovering ball left the top of the frame.** → Camera keyed on y = 0.2 while the ball lifted to 3.5 m. → Lower hover
  (1.8 + r) and raise the camera target to ~1 while the ball works; check a sheet around the lift and the landing.
- **The last second of the loop drifted.** → Catmull-Rom through two equal end keys still bulges (the tangent comes from
  the key before). → A monotone cubic (Fritsch–Carlson tangents, uneven key spacing respected): equal keys hold still.
- **Knitting needles 2.4 m long dwarfed the cottages.** → Sized against the ball, not the world. → 1.3 m; they ride the
  head at the front, click on a sine and fade in/out over 0.5 s at the window edges.
- **The lighthouse beam was a flat yellow band.** → An additive cone with uniform opacity. → A shader cone whose
  brightness falls off along its length (`(1 − k)^1.6`), opacity 0.22, faded in after knitting and out before unravelling.
- **A 1080p frame took ~6 s on a CPU box.** → SwiftShader runs every fragment on the CPU: physical sheen, PCF-soft shadows
  and 6–12 fuzz shells per soft prop. → Preview at `--scale .5` (~2 s) and with sheets; render the MP4 once in the
  background with 4 workers (a 20 s film ≈ 45–60 min); `?lite=1` (standard materials, no shadows, half the shells) for
  fast timing checks. On a GPU none of this matters.
- **`pkill -f "chrome…"` in the same command as the render killed the command itself.** → `-f` matches the shell's own
  command line. → Don't kill browsers by pattern from the line that starts the render.
