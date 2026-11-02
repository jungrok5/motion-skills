# pop-up-textbook kit API

```js
import { createBook, THREE, U } from '../kit/book.js';
const book = createBook({ title, subject, lessons: [...], tour: [...] });
book.start();
```

## createBook(config)
| key | default | what |
|---|---|---|
| `title`, `subject` | — | book title (right-page running head, contents) and the contents kicker |
| `lessons` | — | array of lessons (below), one spread each |
| `start` | 0 | lesson index the book opens on |
| `startView` | `'book'` | camera view at t = 0 when a tour plays (`'lamp'` for the lamp-to-book opening) |
| `popAt` | 0.2 | when the first diorama starts popping up (s) — set it to arrive with the camera |
| `tour`, `duration` | — | tour steps (below); `duration` = `window.DURATION` (default: last step + 1.5 s) |
| `icon` | `'bulb'` | lesson progress icons in the HUD: `bulb`, `dot`, `star`, `moon` |
| `theme` | below | colours: `paper`, `flap`, `ink`, `soft`, `accent` (red kicker), `pencil` (margin hand), `cover`, `desk`, `shade` (lamp glass), `brass`, `glow` (lamp light), `hatch`, `fill` (default ink colour), `icon` |
| `views` | lamp, book, left, right | `{ name: { target: [x, y, z], az, el, fit: [w, h], portraitEl } }` — `fit` is the world size that must fit the frame; distance follows the screen aspect |
| `credit`, `hint` | — | small credit bottom right; the live hint line |
| `lessonWord`, `termsWord`, `predictWord`, `challengeWord`, `speedWord`, `formulaWord` | English | page and HUD words, for other languages |
| `lampPower`, `inkLit`, `outline`, `fov` | 2.2, 1.0, 0.0032, 32 | lamp intensity, ink calibration (light level that counts as fully lit), outline thickness (page units), camera fov |
| `lamp` | `[-0.15, 0, -2.0]` | desk lamp position (the light comes from behind the book) |

World units: a page is 1 wide and 1.32 deep; the spine is x = 0, the left page is x ∈ [−1, 0], the right x ∈ [0, 1];
+z is towards the reader, +y up. The desk is y = 0, the flat part of a page is y ≈ 0.08.

## Lesson
```js
{
  no: 7, title: 'Mains and the plug', page: 18,          // page = left page number (right is +1)
  lead: '…',                                             // ≤ 3 lines
  formula: { text: 'T = 1 / f', caption: 'period (s) = 1 ÷ frequency (Hz)', example: ['f = 50 Hz', 'T = 0.02 s'] },
  margin: ['f = 50 Hz', 'T = 1 ÷ 50', '   = 0.02 s'],    // handwritten working beside the formula
  terms: [['Fuse', 'a thin wire …'], …],                 // key words (3)
  predict: { q: '…?', options: ['…', '…', '…'], answer: 0, why: '…' },
  flap: { kicker, title, sub },                          // optional: the flap's words
  challenge: 'Plug in the desk lamp.',                   // stamp in the margin
  legend: [[1, 'wall socket'], …], legendCols: 2,        // numbers match D.callout
  fig: 'Fig. 7  …', action: 'Push the plug (2) into the socket (1), then look up.',
  speed: { options: ['25× slower', 'real'], factors: [0.04, 1], start: 0 },
  head: 'running head',                                  // optional (default 'Lesson 7 · title')
  diorama(D) { …; return { update(s) { … } }; },
}
```

## D — the diorama builder
`D.root` sits at the centre of the free area of the right page, on the paper (y = 0). `D.area` = `{ w: 0.84, d: 0.71 }`.
Every mesh made through `D` gets crease outlines (`EdgesGeometry`, `crease` degrees) and, for curved shapes, an
inverted-hull silhouette; both draw in when the page pops up. `parent` defaults to `D.root`; `pos`/`rot` are arrays.

| call | makes |
|---|---|
| `D.ink(colour, { hatch, opacity, map, sun })` | the engraving material: flat colour, hatching where the light falls off, cross-hatching in deep shade, fades in from paper. `sun: obj` (a point, e.g. a Sun sphere) or `sun: [x, y, z]` (a direction) shades from that light instead of the desk lamp |
| `D.basic(colour, { map, blend })` | unlit (bulbs, LEDs, electrons); fades with the pop |
| `D.group(parent, pos, rot)` | a group (joints, things that move) |
| `D.box(w, h, d, mat, parent, pos, { rot })` · `D.rbox(w, h, d, r, …)` | box · box rounded in x–y, depth along z |
| `D.cyl(r1, r2, h, mat, parent, pos, { axis: 'x' \| 'z', seg, theta })` | cylinder (y axis by default) |
| `D.sphere(r, …)` · `D.lathe([[r, y], …], …)` · `D.torus(R, r, …, { arc })` | round things (silhouette outline) |
| `D.prism([[x, y], …], depth, …, { axis })` | extruded profile |
| `D.tube(points \| curve, r, mat, parent, { seg })` | cables and wires; the mesh keeps `userData.curve` |
| `D.curve(points, closed)` | a `CatmullRomCurve3` from arrays |
| `D.flow(curve, n, { r, color, parent })` → `{ place(i => u) }` | n dots riding a curve (electrons, energy, water); `u` wraps 0..1 |
| `D.glow(colour, size, parent, pos)` → sprite with `.set(k)` | an additive halo (lit bulb, the Sun) |
| `D.screen(w, h, draw(ctx, s, w, h), parent, pos, rot, { res })` | a canvas panel redrawn every frame (dials, digits, oscilloscopes, insets) |
| `D.text(str, parent, pos, { size, hand, rot })` | flat lettering on the model (lies on the base unless `rot` is given) |
| `D.piece(obj, delay)` | the object pops up (scales from flat on its origin) at `delay` 0..1 in the pop; build pieces with their origin on the base |
| `D.callout(n, obj, anchor, offset)` | a numbered ink label: line from `anchor` (obj-local) to `anchor + offset` |
| `D.click(obj, id)` | the reader can click it; toggles act `id` (tour target `part:<id>`) |
| `D.setLamp(k)` | dim (k < 1) or brighten the desk lamp from `update` (call every frame while it matters) |

## update(s)
Called every frame while the diorama is visible. Only read from `s`:

| field | what |
|---|---|
| `s.t`, `s.time` | seconds since this lesson started popping up · the global time |
| `s.pop` | 0..1 pop-up progress (1 = standing) |
| `s.simT` | simulated seconds, scaled by the speed choice (`speed.factors`) |
| `s.on(id)` · `s.k(id, dur, ease)` · `s.since(id)` · `s.simSince(id)` | act toggled on · eased 0..1 transition · seconds since the last toggle · simulated seconds since it was switched on (−1 when off) |
| `s.choice`, `s.flap` | the predict choice (−1 = none) and whether the flap is open |

## Commands
`next`, `prev`, `goto:<i>`, `opt:<i>`, `flap`, `card:terms|predict|formula|challenge`, `speed:<i>`, `act:<id>`,
`loupe`, `loupe:on|off`, `menu`, `close`, `view:<name>`, `view:cycle`, `play`, `sound`. `book.cmd(c)` runs one live.
Keys: ← → turn, M loupe, Esc close, 0 lamp, 1 book, 2 left, 3 right, space play/stop the tour.

## Tour
```js
tour: [
  { t: 0.4, view: 'book', dur: 2.8 },        // camera move (no cursor)
  { t: 3.2, click: 'part:switch' },          // cursor glides (dur 0.75) and clicks: the act toggles at t + dur
  { t: 5.2, click: 'L:card:predict' },       // a page region: L: or R: + region id
  { t: 6.8, click: 'L:opt:0' },
  { t: 11.2, click: 'hud.next' },            // HUD buttons: hud.next, hud.prev, hud.menu, hud.loupe, hud.view, hud.play
  { t: 16.0, loupe: true, move: 'L:card:formula', dur: 0.9 },   // the loupe follows the cursor
  { t: 18.6, move: 'part:meter' },           // any clickable part; or 'L@0.5,0.3' (page u, v) or [x, y] (screen fractions)
  { t: 20.0, cmd: 'speed:1' },               // a command without the cursor
  { t: 28.4, hide: true, view: 'lamp', dur: 2.8 },
]
```
Page regions: `title`, `card:formula`, `card:terms`, `card:predict`, `opt:<i>`, `challenge`, `flap` (left);
`diorama`, `legend:<n>`, `speed:<i>` (right).

## Notes
- Dioramas are built after the fonts load, so `D.text` and screens can use `BookSerif` and `BookHand`.
- `book.overflow` lists text that did not fit; `scripts/render.mjs` prints it after rendering.
- The loupe is a second render of the scene with `setViewOffset` into a render target, masked to a lens in the same canvas, so it is baked into the MP4.
