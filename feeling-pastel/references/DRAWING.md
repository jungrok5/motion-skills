# DRAWING — the API and the painter's order

```js
import { Drawing, R, tool, core } from 'fp/drawing.js';
const { ramp, mix, rng, fbm, clamp, smooth, catmull } = core;

export function art() {
  const d = new Drawing({ seed: 1, title: '…', paper: { color: '#e7ddcc', grain: 1.35 } });   // 1920×1080 virtual
  const soft = tool('softPastel'), oil = tool('oilPastel', { width: 9 }), pencil = tool('colouredPencil');
  const sky = R.above((x) => 640, 0, 1920);
  d.stage('block-in');
  d.side(sky, { tool: soft, color: (x, y, r) => skyRamp(y / 640) });
  …
  return d;
}
```

## Regions (`R`)

`R.poly(pts, { smooth })` · `R.rect(x, y, w, h)` · `R.circle` · `R.ellipse` · `R.lobes([[cx, cy, r], …])` ·
`R.above(f, x0, x1)` / `R.below(f, x0, x1, yMax)` / `R.between(fTop, fBot, x0, x1)` for land, sea and sky bands ·
`R.fn(bbox, (x, y) => bool)` · `R.union(…)` · `R.minus(a, …cut)`. Let neighbouring regions **overlap** a few px (the
paper shows through any gap as a bright seam).

## Marks

| call | what | key options |
|---|---|---|
| `side(region, o)` | broad light passes, side of the stick | width 26–42, length 40–90, pressure .35–.55 (raise to .6–.8 to cover) |
| `hatch(region, o)` | rows of short marks: the workhorse | `angle` or `angleAt(x,y)`, `angleJitter`, `length`, `width`, `spacing`, `pressure`, `curve`, `zigzag` (legs), `coverage`, `where(x,y)`, `order`, `feather`, `rag`, `clip` |
| `form(lobes, o)` | contour hatching round masses, lit as one body | `light [x,y,z]`, `shade(t,x,y)`, `shadeAt(t,x,y,gy)`, `lobe` (0.2–0.4), `around`, `floor`, `wrap`, `clipScale` |
| `scumble(region, o)` | little loops | `size`, `turns`, `squash`, `clip` |
| `dabs(points, o)` | short marks at points (windows, birds far off, sparkle) | `length` (0 = a dot), `angle`, points may carry a colour `[x, y, colour]` |
| `line(pts, o)` | a drawn line, broken into strokes, optionally gone over again | `passes`, `passOffset`, `maxLen`, `smooth`, `wobble` |
| `stroke(pts, o)` | one stroke | `smooth`, `wobble`, `taper` |
| `blend(region, o)` | finger: soften and fill grain | spacing, width |
| `lift(region, o)` | eraser: back toward the paper | pressure, width |
| `custom(fn)` | anything else, with `d.push(pts, o, r)` | — |

Colour everywhere: hex, `[r, g, b]`, a list, or `fn(x, y, r)`; `vary` (default .05) jitters each stroke's stick.

## The painter's order (one `stage()` each)

1. **block-in** — `side` over every region, the whole sheet, in the big colours. Nothing left white after this stage.
2. **masses** — `hatch` with broken colour over the big areas; zig-zag scribbles in skies; directions that follow the
   form (sky diagonals, water horizontals, ground along its slope).
3. **forms** — `form` for clouds, crowns, drifts, rocks: back to front, each mass lit as one body.
4. **light** — the brightest passages in oil pastel over the dark (pressure ≥ .9), `lift` for rays and mist, `blend` to
   soften what should be soft.
5. **detail** — where the eye lands: pencil and small dabs (windows, birds, grass, sparkle).
6. **accents** — a few decisive darks and the last highlights. Sparingly.

## Making it fast

Strokes cost by area. ~100k strokes at 1920×1080 ≈ 20 s; `--scale .5` for iteration (4× faster). Stamps step by 0.3 of the
radius, so very wide strokes are cheap per area; thousands of tiny dabs are cheap; giant `blend` regions are the slowest.
