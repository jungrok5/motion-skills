# Lessons

Problems met while building this skill — problem → cause → fix.

- **The first pour made one white blob.** Depositing foam wherever the low stream touched paints a solid disc. → The
  stream brings up foam only when it lingers and brown when it rushes (speed thresholds); a wiggle then lays lobes
  with brown lines between — leaves appear from the physics, not from drawing.
- **Rings instead of crescents.** A round source pushes as much backward as forward, so a rocking stream left concentric
  rings. → Bias the outflow forward (`forward` .95) and add a jet ahead of the spout: the figure grows forward and the
  spout stays at its back edge, as in the source clips.
- **Tulip stacks merged into one lobed blob.** The brown between stacks was squeezed to nothing (a ring's thickness
  falls as 1/r while it spreads). → A full high burst (`punch`) carves a wide brown hole first (∝ flow²) and each next
  stack is pushed in behind the last; a gentle high cut stays thin because the same term is ∝ flow².
- **Pushes went the wrong way when the pour direction changed.** Stacks must step *backward* (against `dir`); a tulip
  poured upward steps down the screen. Write positions knowing which way is forward (`references/SCORE.md`).
- **The etching pin left no mark.** Dragging foam inside foam shows nothing. → The pin carries a bead of crema
  (`ink: 0`) or foam (`ink: 1`) and leaves it along its path.
- **The steel pitcher rendered white.** A canvas gradient lives in the transform at fill time; built in screen space and
  filled in the pitcher's rotated frame, it clamped to its brightest stop. → Build it in the local frame.
- **Blurry foam after many steps.** Plain semi-Lagrangian advection diffuses edges. → MacCormack (forward + backward,
  clamped) and a smoothstep edge in the renderer.
- **Slow seeks.** Re-simulating from 0 on every seek is too slow for workers. → Checkpoints every second; `seek(t)`
  restores the nearest one and steps on (identical to straight stepping, so frames stay deterministic).
- **A meter label ran into its bar.** Lay a bar after the measured label width, not at a fixed offset.
