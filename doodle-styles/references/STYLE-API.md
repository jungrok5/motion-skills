# Style API — the scene, the drawing surface, the kit

Everything a piece author or a style author needs. Paths are relative to the skill folder.

## How a picture is made

```
piece.js  ──scene(K, t)──▶  S (prepared scene)  ──style.draw(D, S, K, opts)──▶  D (recorded marks)  ──play(P)──▶  pixels
```

- **piece.js** describes the subject once, in no style: regions and lines in painter's order.
- **a style** (`lib/styles/<id>.js`) draws ANY scene in its medium, in the order an artist in that medium works.
- **the player** shows any moment of the drawing (progress `P` 0 → 1). `P = 1` is the finished still, pixel for pixel.

## piece.js

```js
export default {
  title: '감 세 알',
  size: [1080, 1080],               // any W×H; 1080×1080, 1080×1350 (4:5), 1080×1920 (9:16), 1920×1080 (16:9)
  style: 'watercolour',             // the hand; overridden by ?style= and set by `styles.mjs apply` from the house style
  light: [-0.62, -0.78],            // a direction pointing TOWARD the light (here: up-left)
  seconds: { draw: 7, hold: 2, live: 0 }, // drawing film, held still, then optional life
  tweaks: { woodblock: { … } },     // optional per-style settings for this piece only
  scene(K, t) { return [ … items … ] }  // t = seconds of life after the still (0 for the still)
}
```

Items, back to front:

| item | fields |
|---|---|
| `{ region: pts, color }` | a closed outline with its local colour. Optional: `name`, `role`, `depth` (0 near … 1 far), `form` (0 flat … 1 round), `light` (override), `contour` (draw its outline? default by role), `grain` (radians: the way the material runs), `strength` (shadows) |
| `{ line: pts, color, w }` | an open line: a stem, a crack, a window bar, steam. Light-coloured lines are drawn as light (a lift, chalk, a scratch), dark ones as line work |

Roles: `bg` (wall, sky) · `ground` (table, floor, field) · `subject` (default) · `detail` (stems, knobs, small parts) ·
`shadow` (a cast shadow; colour = its tint, `strength` 0–1) · `glow` (a light source: window, flame, lamp) · `highlight`
(light falling on something: a patch of sun on the wall).

Rules for subjects (they decide whether the picture reads, in every hand):
- Build things from their real structure, never bare ellipses: a persimmon is a squarish four-lobed body with a calyx; a
  kettle is a lathe profile plus spout, lid, knob and handle (`K.tube`, `K.leaf`, `K.body`, `K.softBox`, `K.displace`).
- One light. Cast shadows go away from it, as `shadow` regions under each object.
- Give far things a higher `depth`, round things a higher `form`.
- Life (`t > 0`) must be periodic over `seconds.live` if the piece loops, and `scene(K, 0)` is the still.

## The prepared scene `S`

`S.W, S.H, S.light` (unit vector toward the light), `S.items` (in order), `S.regions`, `S.lines`, `S.solid` (regions that
are not shadow / glow / highlight), `S.bg` (the background colour), `S.colours`, `S.t`.

Each region `r`: `pts, color, lit, shade, role, depth, form, grain, light, bbox {x0,y0,x1,y1,w,h,cx,cy}, centre, area,
contour, strength, i` and
- `r.toneAt(x, y)` — 0 core shadow … 1 full light, for this shape under its light
- `r.colorAt(x, y)` — the shaded colour there (shade → local → lit)

Whole-picture lookups (from a value plate rendered at half resolution, exact region ids by scanline):
- `S.tone(x, y)` — 0 darkest … 1 lightest, including cast shadows and glows (stipple, engraving, halftone, scratchboard use this)
- `S.colorAt(x, y)` — `[r, g, b]` of the shaded picture
- `S.regionAt(x, y)` — the topmost solid region there
- `S.occluders(item, { light })` — the regions painted after `item` that overlap it. Transparent media pass these as a
  layer's `cut`, so a hand never paints or draws what it cannot see.

## The drawing surface `D`

Structure (call in medium order):

| call | |
|---|---|
| `D.ground(fn)` | the sheet: there at frame 0, never animated (`D.sheet(colour)`, a toned ground) |
| `D.pass(name, weight, fn)` | one stage of the medium's order; `weight` = its share of the drawing time |
| `D.top(fn)` | always over everything (paper texture, film grain) |
| `D.layer(opts, fn)` | offscreen: `{ blend, alpha, off:[dx,dy], soften: px, tooth: tile, toothScale, cut: [pts…], mask: pts }` |
| `D.clip(pts, fn)` | draw only inside |

Marks (each has a cost; the player draws them in call order):

| mark | while drawing |
|---|---|
| `D.stroke(pts, { w, color, alpha, taper, pressure, rough, wobble, boil, smooth, seed, closed, blend, cost })` | grows along its centreline, tip pointed like a lifting nib |
| `D.line(pts, { w, color, alpha, cap, dash, smooth, blend, cost })` | constant width; grows by length |
| `D.fill(pts, color, { alpha, blend, grow: 'spread' \| 'wipe' \| 'cut', from, dir, cost })` | spreads from `from`, wipes across at `dir`, or lands whole |
| `D.wash(pts, color, { alpha, seed, shrink, edge, dx, dy, rim, from })` | watercolour: displaced wet edge, misses its line, rim |
| `D.dots(list [[x,y,r,(c)]…], color, { alpha })` | the first k·n in list order |
| `D.rects(list [[x,y,w,h,c]…], { alpha })` | the first k·n in list order |
| `D.mark(cost, (ctx, k) => …)` | anything else; `k` in (0, 1] is how much of it is done |
| `D.pause(cost)` | a breath between passes |
| `D.texture(tile, { opacity, blend })` | a seamless grey tile multiplied over everything so far |
| `D.sheet(colour)` | flat colour over the whole sheet |

`D.frame` is 0 for the still and counts drawings (12 a second) once the piece is alive: pass `boil: true` to strokes
that should re-wobble on twos.

**Nothing fades in.** There is no opacity ramp in the player; a mark is either drawn, being drawn, or not yet.

## The kit `K` (lib/kit.js)

- numbers: `clamp, lerp, smoothstep, rng(seed), noise(seed,x,y), fbm(seed,x,y,freq,oct)`
- geometry: `bbox, area, length, centroid, inside, smooth, densify, resample, upTo, normals, outward, translate, scale,
  turn, jitter, wobble, displace, offset`
- shapes: `ellipse, rect, softBox, blob, tube, body, leaf, arc, segment`
- filling shapes with marks: `hatchLines(pts, angle, gap)` (parallel lines clipped to a shape), `scatter(pts, n)`,
  `gridIn(pts, step, jitter)`
- light on outlines: `runs(pts, keep)` (split an outline into runs, e.g. lose the lit edge), `facing(normal, L)`, `litPoint(r, L)`
- colour: `rgb, hex, mix, rgba, lum, darken, lighten, toHsl, fromHsl, adjust, nearest(c, palette), litOf, shadeOf, isLight`
- surfaces: `canvas, path, tile(name, env), soften, ribbon`; tiles: grey `paper coldpress canvas linen grain slate kozo
  newsprint`, alpha `tooth fine gran speck mottle dry`

## A style module

```js
export default {
  id: 'woodblock', name: 'Ukiyo-e woodblock', ko: '우키요에 목판화',
  medium: '…what touches what…', mark: '…the mark that makes it…', edge: '…', order: ['keyblock', 'colour blocks', 'bokashi'],
  paper: '…', palette: '…', bestFor: '…(Korean, short)…', source: 'anidoodle woodcut.ts',
  defaults: { paper: '#f1e8d4' },          // every key here can be overridden by the house style (tweaks)
  draw(D, S, K, opts) { … },
}
```

Rules every style keeps:
1. **A style is a way of making marks**, not a palette. Medium, mark, edge and the order of marks all change.
2. **Any scene**: every role, any number of regions, light from any side, any size, dark and light lines, life (`t > 0`).
3. **Medium order**: passes in the order an artist in that medium works; the last pass ends on the finished still.
4. **Deterministic**: `K.rng(seed)` only; no `Math.random`, no clock. Same scene, same pixels.
5. **Occlusion** for transparent media (`cut: S.occluders(r)`); opaque media cover in painter's order.
6. **Fast enough**: a still in about a second at 1080 px; `draw()` itself cheap enough to rerun every frame of a living piece.
