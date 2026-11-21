# The plate — the folded view and its kit

## Coordinates
- 1440 × 1080 virtual px. `K.floorY` is where the back wall meets the floor (0.3–0.78 of the height). Above it is
  elevation (x, y as on screen). Below it is plan: a thing "further back" sits higher, at a smaller ground line `G`.
- A figure stands at `(X, G)`. Floor depth toward the viewer moves down the screen by `KD` (0.5) px per px — that is all
  the depth there is. No scale change, no vanishing point.

## Painting both printings from one layout
Write one function `paint(ctx, K, then)` and call it twice (`A: { paint: (c, k) => room(c, k, false) }`, `B: … true`).
Branch only on colour, light and state (`then ? '#cdbb8c' : '#8c9a96'`, a broken window, a hat on the rack). Same
positions, same objects: B must read as the same block printed again.

## The kit (lib/plate.js)
| function | view | notes |
|---|---|---|
| `wall(ctx, K, { x0, x1, y0, y1, color, kind, color2, size })` | elevation | `plain`, `stripe` (wavy paper with crosses), `damask`, `brick`, `plank` (with grain), `tile`, `sky` (cloud bands + hatch) |
| `wainscot(ctx, K, { y0, y1, color })` | elevation | upright boards under a rail |
| `sideWall(ctx, K, { side, x, top, slope, color, kind })` | shear | returns `map(u, v)`; paint on it with `quad(ctx, map, u0, v0, u1, v1, color)` |
| `floor(ctx, K, { kind, color, color2, size, y0, y1 })` | plan | `tile`, `check`, `brick`, `stone`, `plank`, `grass`, `earth`; a dark band where it meets the wall |
| `rug(ctx, K, { x, y, w, h, colors, pattern })` | plan | `diamond`, `scroll`, `band`; fringe |
| `win(ctx, K, { x, y, w, h, cols, rows, cross, view, curtain, sill })` | elevation | `view(ctx, box)` paints outside; returns the glass box for `rain` |
| `door(ctx, K, { x, y, w, h, open })` | elevation | bottom on `y` |
| `shelf`, `counter` | elevation | books / bottles / jars or your own `fill(ctx, box, i)` |
| `table(ctx, K, { x, y, w, depth, legH, shape })` | plan top + elevation legs | returns the top box to set things on |
| `chair(ctx, K, { x, y, facing, kind })` | elevation | `front`, `back`, `left`, `right` |
| `frame` + `portrait` | elevation | the long-necked sitter of the style |
| `lamp` + `glow(…, t)` | elevation | a live chalky cone that flickers |
| `vine`, `plant`, `tree`, `fence` | elevation | `vine` is the source's favourite accent carrier — use it only if it *is* the clue |
| `pool` + `ripple(…, t)`, `rain(…, t)` | plan / live | |
| `label`, `caption`, `slip` | text | the scene draws `label` and `caption` itself; per-printing colour with `labelStyle` |

Anything else is painted with `print.js` in the project (the starter's barber chair, barber pole, clock and mirror; the
example's school, swing set and ball): `ink` for every flat shape, `grain` for wood, `hatch` / `scratches` for shading
and glass, `speckle` for highlights, `blot` for shadows.

## Layers, in order
1. the plate (static, painted once per scale, then the print pass);
2. `live(ctx, K, t)` — weather, cones, pendulums, ripples, thrown things;
3. `change.draw(ctx, K, k, t)` on A after the return;
4. the figures, back to front by `G` (shadows under each), each with its grain;
5. `front` — what stands in front of the figures (a fence, a table edge, a doorframe);
6. label and caption.
