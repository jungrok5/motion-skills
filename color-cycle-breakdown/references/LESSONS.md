# Lessons

Problem → cause → fix, from building the skill and its two films.

- **The near plane hid the others.** First exploded view put the opaque picture nearest (as the source does) and the
  flames' plane disappeared behind it. → Opaque content in front occludes every transparent plane behind. → The first
  layer is the furthest plane; later layers come nearer and to the right, each a thin glass pane (`theme.glass` ≈ .2 —
  at .38 three panes darkened the picture behind them).
- **The exploded stack sat off-centre and clipped the frame.** → The nearest plane projects larger, so the stack's bbox
  is not centred on the camera. → Fit once at full spread: zoom so the bbox fills 84 % × 60 %, then shift it to the
  centre, both scaled by the explode amount so the move stays continuous.
- **A planes' yaw read backwards.** Two sign flips (the yaw and the depth term) cancelled. → Check one plane's edge
  heights in a still: the far edge must be shorter.
- **Flow arrows vanished.** The mask asked `layer.get(x, y)` to skip pixels another flow had painted — after painting,
  every pixel is taken, so the mask was empty for the panel. → Masks are pure functions of (x, y); keep flows disjoint
  by geometry (`!nearShore && !inGlint`), not by what is already painted.
- **Arrows spilled out of the view.** → Clip the arrow layer to the view rectangle.
- **Ridges had vertical streaks.** Slope shading was per column and constant down the whole column. → Smooth the slope
  over ±2 px, clamp it and fade it with depth below the rim (`rim`).
- **Glow pulsing on the ground looked like sand.** Random-hash sparsity turned rings into noise. → Solid rings with
  Bayer-dithered edges only at the outer falloff.
- **A comment in a one-line object ate the rest of the line** (`// …` before `across:`), a syntax error only the page
  showed. → `check.mjs` / `render.mjs` stop on page errors; read the first one.
- **24 swatch numbers collided.** → Over 12 slots, number every 4th slot under the row.
- **Waves too fast.** One slot every 3 along-units with `log` depth moves ~36 art px/s near the viewer at 6 steps/s. →
  4–5 steps/s for open water; fire and light can run 10–15.
