# Lessons

Problems met while building the two examples, and the fixes. Problem → cause → fix.

- **The first hero view was a close-up** → view distances guessed in metres for a 10 m-wide machine at fov 30 →
  start views at ~2.5× the machine's largest dimension and tune from stills; close-up views ~1.5×.
- **Leader labels landed on the model** → label columns placed relative to the anchors only → place them just outside
  the model's projected bounding box (`Box3.setFromObject(root)`), clamped to the gap between the HUD columns.
- **Solver lines crashed after a foot landed** → `BufferGeometry.setFromPoints` on an existing geometry updates in place
  and reads past a shorter point list (r170) → `K.setLine` pads with the last point and rebuilds only when it grows.
- **Feet slid on the floor** → feet animated in the body frame → keep footholds in world space; only swing feet move,
  and the landing target accounts for the body's remaining travel.
- **A leg froze in the air on HALT** → phase rate is `v / stride`, which hits 0 → minimum phase rate while any foot is
  in the air.
- **Metal parts rendered nearly black** → high `metalness` with no environment map → keep metalness ≤ 0.35 on this
  paper-white stage; use colour and roughness to say "steel".
- **Exploded view looked broken when started in a close-up** → explode offsets push parts out of a tight frame → in the
  tour, return to the hero view before exploding.
- **Readouts disagreed with the picture** (a raised foot reading 40 kN) → loads computed from a separate timeline →
  compute every readout from the same state `pose` used for that frame; stash IK results on `m` in `pose`.
- **Tour and live mode drifted** → a clock inside `pose` → only `step` advances state; `renderAt(t)` replays steps from 0
  when seeking back, so a frame is a pure function of `t`.
- **Dark muzzle-flash ball in the turret view** → flash sphere too big when the camera is behind the gun → keep effects
  small (scale ~0.5 + 5t) and short (< 0.15 s).
