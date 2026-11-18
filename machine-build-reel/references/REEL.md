# REEL — the build reel, section by section

The order and look are fixed (the source video's grammar); what each section frames comes from the machine.
Sections are separated by a 0.4 s dip to dark. All cameras sit on the studio's cyclorama, which turns so its wall
stands behind the subject; the sun key, fill and rim keep their angles to the camera.

| # | section | camera | machine | length |
|---|---|---|---|---|
| 1 | `walk` | static, eye level, three-quarter front (`walk_yaw`, default −62°), framing 1.12 H | `walk`, travelling so it passes the figure mid-shot | `walk_dur` 9 s |
| 2 | `assembly` | slow orbit −70° → −20° | rest pose; parts drop in by `stage` (feet → lower → upper → body → hydraulics → shells → neck → head), each with a small overshoot; lights at 90 % | `assembly_dur` 9 s |
| 3 | `stride` | low (1.5 m) among the legs near the figure, 24 mm, f/5.6 on the figure, drifting | `walk`, travelling | `stride_dur` 7 s |
| 4 | `move` | wide three-quarter (`move_yaw`), slow 6° orbit | the big move (`reel.move` or the first non-`wake` move) | its `dur` |
| 5 | `head` | head three-quarter front, 50 mm, f/5.6 on the head | `wake` (dark → lift → lights stutter → look L, R) | its `dur` |
| 6 | `sheet` | — | `refs/concept.png` if present, else the design sheet (front / left / top / three-quarter line drawings + height, length, stride, cycle) | 3.5 s, slow push-in |
| 7 | `plates` | — | every plate in a 4-wide grid, labelled | 3 s |
| 8 | `compare` | — | pairs, left = `refs/plates/<plate>.png` ("reference") or the same camera as a line drawing ("drawing"), right = the render ("built"); then front / left / three-quarter views | 2.2 s each |

Overrides in `MACHINE['reel']`: `walk_dur stride_dur assembly_dur walk_yaw move_yaw move walk_t0 stride_t0`.

## Before rendering the whole thing
- `machine.py reel --res 640x360 --samples 8 --step 24 --no-encode` renders one frame a second of each section plus
  the boards — look at them (scale reads, nothing cut off, the figure visible, the head in frame).
- Then `--res 640x360 --samples 14` (≈ 4–5 s a frame on 4 cores, ~1 h for ~1,100 frames) or `--res 1280x720
  --samples 32` for the final. Frames already on disk are skipped; delete a section's folder to redo it.
- The reel refuses to run while a check fails (`--force` for a draft only).
