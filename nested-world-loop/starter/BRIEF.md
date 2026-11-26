# 액자 속 오두막 · The Cottage in the Frame — brief (starter)

The smallest ring the engine runs: two worlds, two aperture portals. It shows the contract, not a look.

## The ring
`room (m) —the painting's canvas, 1:100→ painting (m) —the cottage window, 1:1→ room`

| world | units | what it is | its light (key / practicals / fill) | what moves (whole cycles per loop) | portal → next (type, scale, where) |
|---|---|---|---|---|---|
| room | m | a study at dusk: a framed painting over a desk | desk lamp (key, shadow) / dusk through the window (cool spot) / low hemisphere | — (the painting's world moves) | aperture: the canvas (0.8 × 0.6 m) → the painting at 1:100, its ground on the canvas's lower edge |
| painting | m | a hillside at dusk with a cottage and pines | low sun behind the hills (warm rim, shadows) / the door lamp / sky hemisphere | — | aperture: the cottage window → the room at 1:1, its window in the cottage's |

Loop zoom: 1/100. Duration: 14 s.

## Seams
- **room → painting**: the camera crosses the canvas (a hole in the wall, framed); the painting's space starts just
  behind the wall (`bounds` z ≤ 36.8 in its units) so the cottage shell around the room never shows in it.
- **painting → room**: down the hill to the lit window; through it into the room (`bounds` = the room's inside).

## Camera
Room: from the window across the room to the painting. Painting: from high over the hill down to the cottage window.

## What would make it look like a tech demo
Bare walls and a flat sky → plaster maps, a gilt frame, a dusk gradient dome and fog that starts at the canvas.

## Stills review
From `render.mjs starter --sheet 6 --scale .5`.

| still | reads at a glance | light (key, falloff, no flat fill) | materials told apart | depth (dof, haze, layers) | alive (something moves) |
|---|---|---|---|---|---|
| 0 s | ✓ a room with a painting | ✓ lamp pool, the shade's shadow | ✓ plaster, gilt, wood | ✓ | ✓ the painted world is lit and hazy (the starter keeps motion to the contract) |
| 2.3 s | ✓ the painting | ✓ lamp on the frame | ✓ gilt, canvas world | ✓ frame sharp, hills in haze | ✓ |
| 4.7 s | ✓ hills and pines at dusk | ✓ low sun, long shadows | ✓ grass, bark, plaster | ✓ fog layers | ✓ |
| 7 s | ✓ the cottage | ✓ door lamp, window glow | ✓ | ✓ | ✓ |
| 9.3 s | ✓ the lit window | ✓ | ✓ | ✓ | ✓ |
| 11.7 s | ✓ the room through the window | ✓ the room's lamp seen inside | ✓ | ✓ window reveal, room | ✓ |

Seams: room → painting ✓ · painting → room ✓.
