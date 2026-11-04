# KIT — the API

```js
import { Board, defineSketch } from 'sk/board.js';
import { C, circle, ellipse, arc, rect, roundRect, polygon, curve, lens, squiggle, pencil, wash, write } from 'sk/hand.js';
const F = new Board({ title, W: 1920, H: 1080, zoom: 1.9, pace: 1, tail: 3, music: { key: 'F', bpm: 76 } });
```

## Board
| call | what |
|---|---|
| `F.beat(main, second, o)` | a beat. `o.zoom`, `o.focus` (ids or `[x0, y0, x1, y1]`), `o.hold` (s after the drawing), `o.dur` (min s), `o.card` ('left' / 'right'), `o.move` (s the camera takes), `o.lead` |
| `F.finale(main, second, o)` | the last beat: the camera pulls back to the whole sheet; draw the title and note card after it |
| `F.sketch(name, { x, y, s, flip, rot, id, … })` | a kit drawing or one you defined; its own options pass through |
| `F.draw((o, K) => strokes, { x, y, s, id })` | a one-off drawing |
| `F.label(text, x, y, { sub, size, color, align, subSize })` | handwriting; `sub` = the smaller second-language line under it |
| `F.arrow([x, y], [x, y], { bend, color, label, head, w })` | a hand-drawn arrow (red), optional label over its middle |
| `F.line(pts, { w, color, dash, closed })` · `F.wash(pts, color)` · `F.guide(pts)` · `F.mark(x, y, w, h)` | single strokes |
| `F.title(text, x, y, { size, marks: [words], sub, underline })` | the title: written, highlighted words, red underline, sub line |
| `F.note(x, y, w, h, lines, { color, size })` | the pinned card |
| `F.check(name, t => bool)` | your own rule, checked by check.mjs |
| `F.start()` | fonts, build, contract, live player |

Any group takes `id`, `overlap: true` (allowed to sit on others — a label inside a drawing, steam over a comb),
`focus: false` (the camera ignores it), `wait` (s before it), `together` (starts with the previous group).

## Strokes (`K`, in a sketch's local coordinates)
| | |
|---|---|
| `K.guide(pts, { closed })` | faint construction line — first |
| `K.line(pts, { w: 2.6, color, closed, dash, alpha, dur })` · `K.curve(ctrl, o)` | the pencil (curve = smooth through points) |
| `K.wash(pts, color, { off: [4, 3], angle, alpha })` | watercolour, set off the line by `off` |
| `K.text(str, x, y, { size, color, align, font: 'hand' / 'k' / 'sans' })` | handwriting (y = top) |
| `K.mark(x, y, w, h)` | highlighter (under text) |
| `K.dot(x, y, r, color)` | a quick filled dot |
| `K.anim([x0, y0, x1, y1], (g, lt, k, s) => …, { reveal, hold, with, layer })` | something that moves: draw with `g` in local coordinates; `lt` = s since it appeared, `k` = its reveal 0…1. Use `pencil`/`wash`/`write` from hand.js so it shares the hand |

Every stroke takes `dur`, `wait`, `with` (start with the previous stroke), `pen: false` (the stylus does not draw it).

## Designing a drawing
```js
defineSketch('bee', (o, K) => [
  K.guide(ellipse(4, 4, 74, 40)),                              // 1. guides
  K.line(ellipse(-12, 10, 42, 28), { closed: true }),          // 2. line
  K.wash(ellipse(-12, 10, 42, 28), C.yellow),                  // 3. colour
  K.curve([[-22, -15], [-27, 10], [-22, 35]], { w: 6, color: C.brown }),
  ...(o.fan ? [K.anim([-30, -80, 70, -8], (g, lt, k) => { /* wings beating with Math.sin(lt * 38) */ })] : []),
]);
F.sketch('bee', { x: 480, y: 380, flip: true });
```
Build from the point lists in hand.js (`circle`, `ellipse`, `arc`, `polygon`, `curve`, `lens` for leaves / petals /
wings, `squiggle`); size it around (0, 0) at 100–300 px; scale with `s` when placing. Look at it alone first
(a beat with only it), then in the film.

## Kit drawings (lib/kit.js — see examples/kit)
`cup` (liquid, band, steam) · `jar` (fill, level, lid, tag) · `spoon` (fill, amount) · `leaf` (len, w, bend, color) ·
`flower` (petals, r, color, center, stem) · `sun` (r, rays) · `cloud` (w, h, color, rain, rainH) · `drop` (r, color) ·
`mountain` (w, h, color, snow) · `waves` (w, rows, color) · `heat` (n, w) · `callout` (r, to, ring, inner) ·
`swatches` (colors, labels, size, gap) · `gauge` (h, w, from, to, delay, dur, hold, color, label) · `burst` (r, n) ·
`bracket` (w, h) · `hexgrid` (r, cols, rows, fills, skip) · `steam` (w, h, n) · `rain` (w, h)

## Palette (`C`)
paper, line, soft, guide, red, redSoft · green, leaf, greenDark, yellow, mark, orange, cinnamon, brown, coffee · cream,
peach, pink, sky, blue, navy, card, grey, white, honey, amber, violet, sand

## Sound
`music: { key, bpm, volume, pencil }` on the Board, or `music: false` for pencil sounds only. render.mjs writes
`out/<name>.wav` and muxes it; `--audio your.wav` replaces it, `--mute` drops it.
