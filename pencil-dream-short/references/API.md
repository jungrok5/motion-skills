# API — the library in one page

Pages import the library through an import map: `{ "imports": { "pds/": "./lib/" } }`.

## pencil.js — the medium (`import * as S from 'pds/pencil.js'`)
| call | does |
|---|---|
| `line(pts, { w, a, col, passes, taper, world, seed })` | a graphite line (`col: 'spot'` = marker). `w` px at page zoom; `world: true` = width in world units (thick rims) |
| `fill(poly, { col, gap, angle, a, edge, off })` | a shape coloured in with a zig-zag (spot by default; `'lead'`, `'paper'`, or css) |
| `part(ops, knock)` | a drawing step: optional paper knock-out polygon + strokes in order |
| `stroke(ctrl, o)` | shorthand: a smoothed, hand-wobbled line through control points |
| `hand(pts, amp, seed, over)` | wobble along the normal + overshoot past both ends |
| `curve(pts, n, closed)` · `bez(a, c1, c2, b, n)` · `arc(cx, cy, rx, ry, a0, a1, n, rot)` · `ellipse(…)` · `resample` · `tf` · `bbox` | geometry |
| `hatch(poly, { angle, gap, w, a })` · `scribble(cx, cy, rx, ry)` | shading as lines |
| `keys(list, t, prop)` · `span(t, a, b, ease)` · `ease.*` · `hash` · `rng` · `n1` | time and determinism |
| `mix` · `rgba` · `hue` | colour |

Seeds: give live drawings (rebuilt every frame) explicit seeds or rely on the default (from the first point), never a counter.

## hero.js
`hero(spec, pose) → { parts, at, audit }` — spec and pose fields are documented at the top of the file. `at.tip` is the
pencil point, `at.hand`, `at.shoulder`, `at.head`, `at.top`. `LIM` holds the joint ranges. `pencil(grip, dir, len)` is the
pencil prop; `blinkAt(t, seed)` a seeded blink schedule.

## kit.js (`import * as K from 'pds/kit.js'`)
World marks return parts: `flower`, `house`, `tree` (`kind`), `bush`, `hill` (knock to `bottom`), `ground` (`knock`),
`fence`, `grass`, `bird` (`flap`), `cloud`, `wave` (`knock`), `sun` (`rays`, `spot`), `star`, `glyph`, `rays`, `starShape`.
`SHAPES` (butterfly, fish, petal, star, leaf, ember) are swarm shapes in local units: `(phase, i) => ops`.

## film.js
```js
const F = new Film({ dur, paper, spot, lead, page: { w: 3400, h: 2200 }, score, seed, fadeIn, fadeOut, grade: { warm, vignette, grain } });
F.hero(SPEC, t => pose, { z: 10, drawOn: [t0, t1] });
const m = F.draw(parts | t => parts, { at, dur | rate, by: 'hero' | 'pencil' | 'self', z, move: t => ({ x, y, s, r, ox, oy }), out: [t0, t1], name });
F.spread([{ at: [x, y], parts, z, delay }], { at, origin, speed, rate, z, name });
F.pencil({ intro: m, catchAt, meet: [x, y], tilt, arc });
F.swarm({ n, at, spawn, from, centre, radius: [rx, ry], spin, rise, size, shape, flap, blend, zBack, zFront, out, seed });
F.wash([{ poly, at, dur, gap, angle, a, col | grad: { c, r: [r0, r1], stops }, reach, reveal: 'bloom' | 'zig' }]);
F.desk({ wood, cover, light, pencils: [{ x, y, ang, len, col, lead }], eraser: { x, y, ang, col, sleeve }, props: (ctx, pt, t) => {} });
F.camera([{ t, x, y, w, r }]);  F.beat(name, t);  F.check(name, t => ok);  F.start();
```
- z order: lower is behind. Hero 10, pencil 11, marks 0 by default; the giant −5, the sun −6; the swarm splits into
  `zBack` / `zFront` by its orbit.
- A mark drawn `by: 'hero'` moves the hero's drawing arm: the pencil tip follows the stroke being drawn, lifts between
  strokes, and reaches in/out 0.45 s around the mark. If the arm cannot reach, `runChecks` reports it.
- `F.camAt(t)`, `F.heroAt(t)`, `F.headOf(mark, t)` (where a mark's pencil is) help aim checks and other marks.

## desk.js, score.js, sheet.js
`deskTexture`, `drawDesk`, `deskFront`, `pencilReal`, `eraser` (used by `F.desk`). `renderScore(spec, sr, dur)` (see the
header for instruments and sfx). `castSheet({ hero, paper, spot, lead, extra })`.
