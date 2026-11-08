# Camera: shots, timeline, the cheat

## Why a long lens flattens
Perspective scales a thing by 1/distance. From 6 m, something 30 m further back is 6× smaller; from 600 m it is 5 %
smaller. So a 1.5° lens from ~600 m shows a 60 m deep street as one elevation: repeated poles line up into one, signs on
far facades pile into one wall, a diagonal row of cones reads as a row. Widen the lens while moving in (a dolly zoom,
W kept) and the same frame tears open into depth.

## A shot
`{ x, y, zf, W, fov, H, el, yaw, lay, cs }` (plus any numeric key the scene reads in `update`, e.g. a light level)

| key | meaning |
|---|---|
| `x`, `y` | camera side position and height (m) |
| `zf`, `W` | the focus plane (world z) and the width framed there (m). Keeping `W` while changing `fov` is the dolly zoom. |
| `fov` | horizontal lens angle (deg): 1.5–2 flat, 25–90 deep |
| `H` | lens shift: where the horizon sits (−1 bottom, 0 middle, 1 top); with `el` 0 the point at camera height on the focus plane sits there |
| `el` | look down by raising the camera (`D · tan el`) and shifting the lens, never by tilting: the focus point stays put through a dolly zoom |
| `yaw` | swing round the focus point (deg): + puts the camera on the right looking left, − on the left looking right |
| `lay`, `cs` | swap-object layout (0 row, 1 diagonal) and their scale (drawn bigger in the flat view so they read) |

Rig (`F.rig(s)`): `D = (W/2) / tan(fov/2)`, camera at `(x + sin(yaw)·D, y + D·tan(el), zf + cos(yaw)·D)`, looking along
`(−sin yaw, 0, −cos yaw)`, level; the projection's vertical shift is `H + tan(el) / tan(vfov/2)`. Near and far planes hug
the scene's bounds, so depth stays precise even 600 m out (no z-fighting between surfaces centimetres apart).

## Shot vocabulary
| shot | settings |
|---|---|
| flat | fov 1.5–2, H ≈ 0, el 0, yaw 0: the whole place as one elevation |
| worm's eye | knee height, fov 80–90, horizon low (H ≈ −0.65) |
| high | camera up on a medium lens (fov 35–40), horizon above the frame (H ≈ 1.5) |
| corner view | yaw ±18–35, el 9–25, as a pair: fov ≈ 4 first (flat at the new angle), then 25–46 at the same yaw |
| low | a medium-wide lens near the ground showing the swap objects (or rails, a kerb) in depth |

Drifts (`F.drift("flat", { W: 0.965 })`) are tiny variations so holds breathe instead of freezing.

## The loop
flat → deep (worm) → corner A (tele → wide) → flat (swap the objects) → high → corner B (tele → wide) → low → flat (swap
back). The last key repeats the first. The first corner view goes to the side the hero object does not cover.

## Timing
- All parameters run through one Fritsch–Carlson monotone cubic over the key times: speed never jumps, holds (equal keys)
  stay flat, nothing overshoots. `W` and `fov` are interpolated in log space, so a dolly zoom feels even.
- 10 s feels smooth; 7 s rushed. To change the length, scale the key times: `F.keys(list, { scale: 1.2 })`.
- A move between keys 400–700 ms apart reads as a snap; holds of 400–600 ms between them let the eye read the frame.

## The cheat
Change `lay` only while the lens is long (fov ≤ 6) at both ends of the segment: `check.mjs` fails otherwise. If the camera
moves in depth while objects move, the trick shows.

## Motion blur and anti-aliasing
`F.frame(ms)` measures how far `probe` points (a grid over the scene's bounds) move on screen over one frame and renders
4 jittered sub-frames when still (anti-aliasing) up to 32 on fast moves (a 360° shutter: one frame's streak meets the
next). `check.mjs` reports the fastest move: wrap anything that loops (walkers, a train) during it, where nobody can see.
