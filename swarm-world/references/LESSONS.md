# LESSONS — what broke, why, and the fix

- **The source cannot be rendered frame by frame.** Its cursors live in a DOM engine on wall-clock timelines; seeking is
  impossible. → Re-implemented each agent as a list of segments (jobs, fronts, the ride) and computed its position at `t`:
  on a segment it follows the job's work point; between segments it lingers 0.25 s, travels in world space with a little
  arc, and waits at the next site. Glyphs and tags are drawn on the same canvas as the 3D frame.
- **Grabbing the WebGL canvas gave black frames.** Without `preserveDrawingBuffer` the buffer is gone after the task. →
  The page's frame is a 2D canvas; each `seek(t)` renders WebGL and `drawImage`s it in the same task, then draws the overlay.
- **Some jobs "build themselves".** With a crew of 16 and ~150 jobs, a job nobody can reach before the traveller is skipped
  (the source does the same: the thing appears on its own). → `check.mjs` warns below 30 % skipped and fails above; add
  roles to the job, crew, or lead.
- **Fences beside the line were still wireframes as the train passed.** A lay job spreads its items over its duration, so
  the last posts are late. → Short runs (6–9) and a lead ≥ 26 m; `audit()` counts things within 5 m of the line built
  after the traveller passes (warn ≤ 5 %).
- **Dust sat on the rover.** Puffs start `fwd` metres along the line from the front car; a negative `fwd` smaller than the
  train put them inside it. → `fwd` behind the last car (−7.6 for a rover + trailer).
- **The reveal looked at the wrong thing.** The default reveal looks back from behind the last stop; a base built round
  the stop ended up below and behind the camera. → Put `reveal.pos` beyond the stop, high, with `tgt` back along the line,
  and check the last frame (`--stills <DURATION-0.5>`).
- **A sky body hid under the HUD pill.** The Earth's direction put it top-left. → Check the last frame for HUD overlaps;
  move the body's direction, not the HUD.
- **Korean in a monospace tag.** JetBrains Mono has no Hangul; the canvas falls back per glyph to the bundled Noto Sans
  KR (`"SW Mono", "SW KR"`). Only the 2,350 common syllables are in the subset → `check.mjs` lists anything else.
- **The live page crawled on a CPU-only browser.** Frame time capped at 0.05 s made the build slow-motion. → Cap 0.1 s
  and a pixel budget of 2.4 M; on a GPU it runs at 60 fps.
