# LESSONS — problems met while building this skill, and the fixes

- **Every sub-frame but the last vanished** (frames 2–3× darker with motion blur than without). Cause: three.js
  `renderer.autoClear` cleared the accumulation target before each additive pass. Fix: `autoClear = false`; the post
  pass clears the scene target itself.
- **Washed-out print on the poster strips and the shredder lanes.** Cause: the grid's rows ran top-down, so the front
  face pointed at the floor and the camera saw the back (which shows the print at 16 %). Fix: rows go up in the sheet;
  lanes list their vertices right-to-left so the printed face looks at the camera. Check winding whenever a new paper
  mesh is built: a faded print is the symptom.
- **A `//` comment inside a one-line loop swallowed its closing brace** after a scripted edit. Keep comments after the
  closing brace, and run `node --check lib/*.js` after edits.
- **The shredder shot was framed far too tight** (discs filling the frame) and later showed a black void above the
  sheet. Cause: guessed camera keys and feeding from the hero line near the top. Fix: the source's scale (camera from
  y = −4.9, 32–40 mm) and a bottom-first feed that starts just above the cut — the bottom half is what gets bitten, so
  the poster stands tall above the discs for the whole move.
- **Visible tile seams in the concrete.** Cause: the noise blur did not wrap. Fix: `SP.field(…, wrap = true)`.
- **Sheet shots blown out.** A three.js `SpotLight` with `decay = 0` lights at its candela value everywhere: 95 was 30×
  too much. Keys in these scenes sit around 2.5–3.5.
- **Korean fonts are 120 unicode-range chunks per weight** (~3.5 MB). Embedding only the chunks that cover characters in
  `src/` (and `font.mjs prune` before committing) keeps 「퇴고」 at 30 chunks, 780 KB for two weights.
- **A filter sweep clicked** when a biquad was re-created each block. Retune one filter in place (`.set()` keeps state).
- **CPU rendering**: SwiftShader takes ~0.4 s per half-size sub-frame and 1–2 s per full-size one; the cascade costs
  most (the pile is rebuilt every sub-frame). Use `--stills` with `--mb 1 --scale 0.5` while composing.
