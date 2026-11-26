# The kit — designing an item

An item is `{ title, lines: [tag line, small line], patch, tagAt?, threadColor?, tagWidth? }`. The patch is the part you
design for every topic; the title is embroidered for you in the title voice; the tag is printed paper.

## Patch

```js
patch: { w: 100, h: 80, scale: 1, shapes: [ …in sewing order… ] }
```
- `w`, `h` — your design units (any numbers). `w` maps to one patch width (≈ 5 cm on the table, `scale` multiplies it).
  `h / w` sets the patch's shape; 100 × 80 is the house size, 100 × 100 a square, 100 × 60 a band.
- Shapes are sewn in order. **What is under goes first**: base → picture → details → (each shape's edge after its fill).
  A later shape that covers an earlier one hides it in the finished patch, and while sewing the covered part waits as a
  gap until the later shape is sewn (it reads as the pattern being filled).

### Shapes

| shape | keys | sewn as |
|---|---|---|
| `rect: [x, y, w, h]` | `r` corner radius, `rot` deg | fill |
| `circle: [cx, cy, r]` | | fill |
| `ellipse: [cx, cy, rx, ry]` | `rot` | fill |
| `poly: [[x, y], …]` | `rot` about its centre | fill |
| `path: 'M … Z'` | SVG path data: M L H V C S Q T Z, absolute or relative (no arcs — use circle / ellipse); holes by even-odd | fill |
| `text: '…', at: [x, y]` | `size` (cap ≈ .72 × size), `font` (`title` · `sans` · `bold` · `mono` · `serif`), `align`, `rot` | fill (angle 78° default) |
| `line: [[x, y], …]` | `width`, `closed` | satin column along the line (a stem, a vein, a wheel, steam) |
| `run: [[x, y], …]` | `len` stitch length, `closed` | running stitch (dashes: a seam, clouds, a dotted ring) |

Every shape takes:
- `fill` — the thread colour (hex). Two shapes with the same colour share a thread.
- `angle` — stitch direction in degrees (0 = along x). Follow the subject: grain, hair, water, light. Neighbouring shapes
  at different angles catch the light differently, which is half of what makes embroidery read.
- `stitch: 'satin'` — never split long stitches (smooth, shiny; for narrow shapes). Default: satin up to 7 mm, longer rows
  split in a brick pattern (fill / tatami).
- `outline: '#hex'`, `outlineWidth` (design units) — a satin edge around a filled shape. Give the base an edge
  (≈ 3.2 units at w = 100): it is the patch's raised merrowed border.

Sizes that sew well at w = 100: details ≥ 4 units across, `line` widths 1–4.5, lettering inside a patch ≥ 8 units.
Thread width is fixed by the engine (0.65 mm), so a smaller detail cannot get sharper, only blurrier.

### Helpers worth writing in your reel.js
The examples define small point generators rather than a library: `ring(cx, cy, r)` for a circle as points (for `line` /
`run`), `wave(…)` for steam and water, `leaf(x, y, angle, length, halfWidth)` for any leaf or petal. Write the ones your
topic needs; the engine takes plain points.

## Title
The item's `title` is stitched below the patch in the `title` voice (Archivo Black, Hangul in Black Han Sans), fitted to
1.3 patch widths, in `threadColor` (default `thread`). Keep it ≤ 14 characters; a long title is stitched smaller.

## Tag
`lines: [tag line, small line]` — printed on paper with a sewn dashed border; the tag line in Inter Bold (wraps to 2–3
lines), the small line in JetBrains Mono in the accent colour (a handle, a URL, a quantity, a time). `tagAt: 'above'`
puts the tag above the patch (vary it: the source does). `tagWidth` (default .86 patch widths).

## Film options
| key | default | |
|---|---|---|
| `size` | `[1080, 1350]` | 4:5 vertical; `[1080, 1920]`, `[1920, 1080]` also work — the grid and framing adapt |
| `fps`, `seed` | 30, 7 | the seed moves props, jitter and the camera's small choices |
| `cloth`, `thread`, `paper`, `ink`, `accent`, `cord`, `bg` | linen greige, navy, cream, near-black, brick red, gold | |
| `beat`, `stitch`, `travel`, `intro`, `punch` | 2.2, 1.2, .7, .9, 4.5 | seconds per item / stitching / the move; punches per second |
| `camera` | `{ fov: 30, elev: 52, swing: 11, roll: 2.2, margin: 1.22 }` | elevation in degrees; swing = left/right alternation |
| `look` | `{ exposure: .92, warmth: .5, bokeh: 1, grain: .03, vignette: .38, leaves: 1, leafScale: 5, sun: [-.5, .78, .36] }` | |
| `props` | `{ count, seed, kinds, threads }` | kinds: `spool`, `spoolLying`, `button`, `thimble`, `pincushion`, `scissors` |
| `outro` | `null` | `{ title, sub, footer, list, thread, rise, cord, land, hold }` — the cord and the end card |
