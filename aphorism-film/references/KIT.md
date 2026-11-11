# KIT — the API

All drawing is in stage units (1920 × 1080); painters take `o.seed` so the same call paints the same picture.

## film.js — `new Film({ seed, score, fadeIn, fadeOut, post })`
| call | does |
|---|---|
| `F.plate(w, h, (ctx, w, h) => …, { blur })` | a picture painted once in `start()` (after fonts load); `blur` = depth of field |
| `F.shot(dur, (g, lt, u) => …, { name, cam, shake, tr })` | a shot. `cam` = keys `[{ t, x, y, zoom, rot, e }]`; `tr` = transition INTO it `{ type, d, dir, at, sheets, n, col }` |
| `F.quote(Q)` | a quote on the type timeline (TYPE.md) |
| `F.check(name, t => bool)` | a rule check.mjs evaluates on every sampled frame |
| `F.start()` | loads fonts, paints plates, sets the contract, plays live (or renders with `?render=1`) |
| `g.put(plate, x, y, z, { a, op, rot, s, ox, oy })` | place a plate at depth z |
| `g.at(z, ctx => …)` | draw per frame at depth z (characters, hands of a clock, flying sheets) |
| `g.screen(ctx => …)` | draw in screen space |
| `g.twos(v = lt)` | `v` held on twos (12 drawings a second) |
Transitions: `papers` · `crack` (`at`: impact point) · `vortex` (`at`: centre) · `ink` (`col`) · `slide` (`dir`) ·
`dissolve` · `white` · `black` · `cut`.

## kit.js — `import * as K from 'af/kit.js'`
- ink: `INK`, `PALETTES.pop`, `path`, `smoothPath`, `outline(ctx, fill, lw, col)`, `shape(ctx, pts, fill, lw, { smooth, open })`, `leafPath`
- surfaces: `pattern(ctx, kind, x, y, w, h, { pal: [ground, a, b, line], s, lw })` with kind `damask` · `checker` ·
  `diamond` · `stripes` · `rosette` · `botanical` · `dots` · `scales` · `tiles` · `grid`; `stoneWall(ctx, x, y, w, h,
  { bh, bw, col, crack })`; `cracks(ctx, x, y, len)`; `marble`; `collage(ctx, x, y, w, h, { ground, cols, n })`
- nature: `leaf`, `foliage(ctx, x, y, w, h, { pal, shadow, size, n, hang })`, `flowers(ctx, x, y, w, h, { kind: rose |
  hydrangea | daisy | tulip | star, cols, n, size })`, `vine`, `grassEdge`, `sun(ctx, x, y, r, { cols, ringA })`
- things: `frame(ctx, x, y, w, h, { kind: poster | portrait | abstract | mirror, frame, pal })`, `paper(ctx, w, h)`,
  `microtext(ctx, x, y, w, lines)`, `clock(ctx, x, y, r, { h, m, time, rim, face, numerals, seconds })` (per frame ok),
  `hourglass(ctx, x, y, h, k)` (per frame ok), `books(ctx, x, y, w, h)`, `lamp`, `door(ctx, x, y, w, h, { open,
  inside })`, `window(ctx, x, y, w, h, { sky, inside })`, `chair`
- space: `room(ctx, W, H, { back, deep, walls, ceiling, floor: marble | checker | tiles | fn, floorPal, tilesX, tilesZ,
  lights, panels, panel: (ctx, quad, side, i, R) => …, panelV })` → `{ vp, at(u, d), scaleAt(d), wallQuad(side, d0, d1,
  v0, v1), ceilQuad(u0, u1, d0, d1) }`

## figure.js — `import * as P from 'af/figure.js'`
`bust`, `body`, `walk`, `run`, `stand`, `LIM`, `issues`, `clearIssues`, `withDef` — see CAST.md.

## type.js
`loadFonts`, `addFont(family, url, desc)`, `FALLBACK`, `drawQuote`, `quoteBox`, `ROLES` — see TYPE.md.

## core.js
`rng(seed)`, `hash(a, b, c)`, `noise2`, `fbm`, `keys(list, t, prop, def)` (monotone cubic; `e: 'io' | 'in' | 'out'` per
key), `ease.{io, in, out, sine}`, `span`, `onTwos`, `clamp`, `lerp`, `smooth`, `mix`, `rgba`, `shade(c, ±k)`, `vary`, `lum`.

## score.js — `export const SCORE = { … }`
`pad`, `strings`, `bass` (`{ t, d, notes | n, v }`), `bell` and `piano` (`{ t, n, v, d }`), `tick` (`{ from, to, every,
v }`), `air` (level keys), `sfx` (`{ t, type, v, d, pan }`: `paper` · `crack` · `swirl` · `ink` · `slam` · `whoosh` ·
`rumble` · `chime` · `thump` · `rustle` · `chirp` · `flutter` · `flicker`), `reverb` (`{ mix, room }`).
