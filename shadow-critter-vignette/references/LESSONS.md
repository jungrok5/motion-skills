# LESSONS — problem → cause → fix

- **The room came out pale and grey, nothing like a backlit painting.** → Three 40 % washes let ~20 % of the paper
  through everywhere, and the room had no falloff. → A paper sheet under everything, denser passes, darker walnut / olive
  palettes, `grade({ light })` darkening away from the window, a golden floor patch in `screen`.
- **A reaching arm vanished.** → The head is as wide as the arm is long; a target above the head ends inside the black.
  → Arms 0.74 + 0.70 a; targets beside the head; the cast sheet's big move reaches out to the side.
- **"Planted foot drift 319 px".** → Two walks named their plants `m0`, `m1` … so the check compared feet of different
  walks. → Every pose function names its plants with a unique id.
- **Seven steps a second.** → A long walk in too little time with a 1.25 a stride. → Stride 1.6 a, shorter walks;
  2.5–4 steps a second; `motionReport` fails steps closer than 0.16 s.
- **A leg overstretched on the first step and at double support.** → The pelvis stayed at standing height while the
  back foot lagged 0.7 of a step. → The walk sinks the pelvis (computed from the step length) as it starts; turns dip,
  not rise; tiptoe lifts the pelvis only 0.08 a.
- **Tiptoe read as drift.** → The check measured the ankle, which rises on tiptoe by design. → Measure the toe.
- **The hand fell short mid-move and failed the check.** → A hand interpolating from a rest pose to a target is short on
  the way there. → Only frames between two keys that both put the hand on the target count.
- **The red book's gap was at the wrong end of the shelf.** → The side face's u runs from the far end (z1) to the near
  end (z0). → Compute u from the prop's Z.
- **The lever was hidden behind the head.** → The thing's moving part sat on the side of the toaster that the critter's
  head covered. → Move the thing right, let the lever stick out towards the critter, lower the bench.
- **A foreground table filled a third of the frame, or vanished.** → Things near the camera are huge, and what is on
  screen at depth Z is only `X ∈ [−vpX·Z/refZ, (W−vpX)·Z/refZ]`. → A low crate, placed with that range.
- **The cast sheet was empty.** → Its camera put the floor below the cell. → A camera per actor: the floor at 86 % of
  the cell height, the critter 60 % tall.
