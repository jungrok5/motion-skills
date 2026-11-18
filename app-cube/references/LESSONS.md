# Lessons (problem → cause → fix), from building this skill

- **The base check "canvas changed after typing" failed (diff 0.014).** A few typed characters on one tile of a cube drawn
  at a third of its size change too few sampled pixels. → The skill's check types a longer phrase (`typeText`); the change is
  real, just small. Do not inflate the effect to pass.
- **A first-click on the text field risked landing in a groove.** `screenOf` used the element's centre, which for a text
  field spanning rows 0–1 sits exactly on the 240 px seam, i.e. on the edge of a tile quad. → `screenOf` moves the point
  26 px into the tile that contains it, while staying inside the element.
- **Frames crawled (≈1 fps) while the cube moved, and screenshots timed out.** Two causes: heavy fragment shaders under
  software GL (five softboxes evaluated twice per pixel, per-pixel basis vectors, six floor taps), and a machine loaded by
  many other headless browsers (load ≈ 30 on 4 cores) — timings varied 10× between identical runs. → Fixed light count
  compiled in (`#define NL`), softbox bases computed on the CPU, one environment lookup per tile pixel, three floor taps,
  adaptive resolution (drops to half when frames stay > 45 ms while moving), and `#quality=` so checks run at 0.6 backing
  resolution. `gl.finish()` timings were useless here (≈2 ms) because the GPU process works asynchronously.
- **Wall-clock limits made checks fail on a slow machine.** The release spring and the orbit inertia step in engine time
  (frame dt is clamped to 50 ms), so at 1 fps they take 20× longer in wall time. → `state()` reports `clock` and `settle` in
  engine seconds; the check measures settling there (≤ 1.2 s twist, ≤ 3 s orbit) and only waits on wall time with large limits.
- **The twist check selected text instead of turning.** `elementFromPoint` was asked before the tile was hovered, so it
  answered "canvas" for every tile and the check pressed on the editor (which takes drags in mode auto). → Hover each
  candidate first (only the hovered tile is live), skip text and controls, then drag.
- **A scramble seemed to finish early, then Undo showed more moves.** The check's 15 s wait expired while the queue was still
  playing at 1 fps; `busy` was right. → Wait on `state().busy` with a generous limit and use a short scramble in the check.
- **`view()` did nothing in stills.** In `#still` mode the sway recomputed the orientation from HOME every frame. → The still
  sway applies only while the page is pristine; any `view()`, key or press makes it not pristine.
- **The reveal left the cube rolled onto a corner, then face-on and flat.** Aligning only the tile normal leaves the roll
  free; aligning it to the camera removes the three-quarter look. → The caret's face is sent to where the front face sits in
  the home view, then rolled about that axis so the tile's own up points up. Stills must wait for the spin to end
  (`still.mjs` polls `busy` / `spinning`), or they catch it mid-turn.
- **The grid check found a map pin across the 480 px seam.** Absolute positions drift when a design is tweaked. → Keep the
  check: every control inside one tile with a margin, or `data-span` on purpose.
- **Six faces share one origin.** In CSS hit-test mode every face child sits at the canvas origin and would all be hit there.
  → Every face is placed off-screen (`S.place(el, null)`) except the one under the pointer; the off-screen transform does not
  change the uploaded texture.
- **Which faces changed?** `lib/hic.js` does not pass the paint event's `changedElements` on. → The engine wraps
  `canvas.onpaint` (after `HIC.stage`) to note the changed faces, then calls hic's handler; when an event lists none (the
  CSS-mode settle repaint), the hovered and focused faces are re-uploaded.
- **Not verified here: the current API (Chrome 157 `updateElementGeometry`).** Headless Chromium 153 has only the earlier API
  (CSS hit testing). The source notes that Chrome 157 can return a cached hit-test result after a geometry change until an
  attribute outside the canvas changes; the engine sets `data-cube-hit` on `<html>` after each placement in geo mode as a
  guard. Test on Chrome 157+ before relying on it.
