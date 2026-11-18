# ROOM — the painted place

## Camera
```js
const room = K.makeRoom({ W: 1080, H: 1440, horizon: 650, vpX: 470, eye: 520, refZ: 1000,
  left: -760, right: 600, back: 2500, ceiling: 1500, near: 480, light: { color: '#ffd98c' } });
room.proj(X, Y, Z) → [sx, sy]   room.floor(X, Z)   room.scaleAt(Z)   room.zAtY(sy)
room.walls.back / left / right / floor / ceiling   // face maps: (u, v) in 0..1 → screen
```
World units are pixels at `refZ` (scale 1 there). X across (0 = the camera's axis), Y up from the floor, Z depth. A thing
of world size S at depth Z is S × refZ / Z on screen. What is on screen at depth Z spans X from `-vpX·Z/refZ` to
`(W − vpX)·Z/refZ` — check it before placing anything near the camera.

## Face maps
`R.face([tl, tr, br, bl])` maps a planar rectangle; `K.sub(map, u0, v0, u1, v1)` is a part of it; `K.quad(map, …)` gives
a subdivided polygon so a rough wash edge follows the perspective. Paint anything on a wall, a box face or the floor
through a map: posters, panels, buttons, shelves of spines, a rug.

## Kit
| call | paints |
|---|---|
| `shell(g, R, { wall, back, floor, ceiling, boards, beams, dark, paper })` | paper, walls, floor, ceiling; boards, grain, knots, beams, seams |
| `windowLight(g, R, map, { cols, rows, outside, frame })` | a backlit window in a face region: outside haze, frame, mullions, bloom, spill |
| `lightShaft(g, R, map, { dz, dx, k, color })` | the window's panes as a patch on the floor + a soft beam |
| `box(g, R, { x0, x1, y0, y1, z0, z1 }, { color, faces: { front, left, right, top } })` | any box (machine, shelf, counter, crate, toaster); a face is a colour or a painter `(g, map, seed)`; returns the maps |
| `shelf(g, R, X0, X1, Y, Z0, Z1, { items })` | a plank shelf with things on it |
| `frame`, `note`, `buttons`, `row` | things on a face |
| `plant`, `jar`, `books`, `stool`, `lamp` | free-standing things |
| `faceWash(g, map, colour, seed, o)` | wash + outline a face or part of it |
| `grade(g, W, H, { light, fallK, fall, warm, warmK, k })` | darker away from the light, warm soft light, corners |

The Vignette also lays a `grade` over the critter, so it sits in the same light.

## Layers
- `plates`: `{ z, paint(g, { R, K, P }) }` — painted once, cached. `z < 5` behind the critter, `z > 5` in front.
- `fx`: `{ z, draw(ctx, t, { R, P, K }) }` — every frame: dust in the light, a lamp flicker, **the moving part of the
  thing** (a lever, a book, a lid) as a function of time, shared with the hand target so they move together.
- `light`: the window's centre on screen — the rim light and the shadow direction come from it; `styleReport` checks
  it is the brightest place.

## Composition checklist
- The window and the critter's path don't overlap darkly: the critter crosses the lit floor or stands against a lit wall.
- The thing's moving part is beside the head on screen, not behind it.
- One foreground object (a crate, a table corner) at the frame's edge, not in the path.
- The floor in the lower third is not empty: the light patch, a rug, a few objects.
