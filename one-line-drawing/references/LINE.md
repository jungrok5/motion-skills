# LINE — designing a scene and routing one line through it

## The scene: `scene(S)`

Page coordinates are 1080 × 1920, y down. The scene is what the photo under the pen shows *and* what the line traces.

| call | what |
|---|---|
| `S.setting({ horizon, ground, fog, sky, earth })` | horizon y; ground `wet` (road, reflections) · `water` · `field` · `snow` · `floor`; grey tones |
| `S.shape(name, { depth, draw, ground, reflect, trace, tone })` | a silhouette. `depth` 0 near/dark … 1 far/pale; `draw(g)` fills in the current colour; `ground` the y it stands on (reflections flip about it); `trace: false` paints it only |
| `S.figure(name, rig)` | a person from the rig (below); returns the rig — `rig.joints['near hand']` places props |
| `S.contour(name, i)` · `S.loops(name)` · `S.bounds(name)` · `S.span(name, y)` | the traced outline(s), bounds, the row extent |
| `S.kit` | silhouettes: `pole`, `lamp`, `fence`, `house`, `tower`, `skyline`, `pine`, `tree`, `treeline`, `hills`, `bird`, `jetty`, `boat`, `umbrella`, `rod`, `lantern`, `figure`; drawing helpers `poly`, `bar`, `disc`, `ell` |

A new subject is a plain canvas path in the piece (`examples/noodle-stall/scene.js` draws its stall, counter and wall
that way). Draw with `g.fill()` / `g.stroke()` and **don't set colours** — the caller does (black for the mask,
a fog tone for the photo).

**Holes are not outlines.** Only the outer boundary of each silhouette is traced. Anything seen through a hole — a
lantern under an awning, a pot on a counter between two posts — must be its own shape, reached by a detour.

### The figure rig
`S.figure(name, { x, ground, h, facing, stride, lean, arms, reach, hat, coat, bag, depth })`
- `facing`: `left` / `right` (profile, walking that way) or `toward` / `away` (frontal; `left` / `right` arms are the
  **screen** sides).
- `stride` 0…1 sets hip and knee angles (front thigh forward, back knee folded); `lean` degrees forward.
- `arms`: profile `{ near: { sh, el }, far: { sh, el } }` — `sh` swings forward from hanging, `el` folds the forearm
  forward; frontal `{ left/right: { sh (out from the side), el } }`.
- `reach: { near: [x, y] }` solves that arm for the hand at the point; an unreachable point is reported, never stretched.
- Limits (`kit.LIMITS`): hip −35…95°, knee 0…140°, shoulder −70…180°, out −10…165°, elbow 0…150°, lean ±25°. The
  lowest foot always lands on `ground`. `check.mjs` fails anything outside; `render.mjs --cast` shows the pose turned
  four ways.

## The line: `line(L, S)`

`L.start([x, y])` once; every other call continues from the pen. There is no way to lift.

| call | the vocabulary |
|---|---|
| `to(p, { bow })` · `curve(c, p)` · `path(pts, { smooth })` | ruled travels and hand-placed outlines |
| `contour(name, { from, until, part, dir, curl, corner, gap, maxCurls, inset })` | round a silhouette. `from: 'near'` or a point; `until` a point (else `part` of the way, 1 = all round); `dir` `'cw'` / `'ccw'` (on screen; along a top edge `cw` runs right); `curl` = loop radius at turns sharper than `corner`° at least `gap` px apart |
| `L.last` | `{ name, start, end, dir }` of the latest contour — finish it later with `contour(name, { until: last.start, dir: last.dir })` |
| `steps(p, { n, first, hook })` | right-angle staircase (wires, parapets, the top rule); `hook` loops at the corners |
| `hook({ dir, len, r })` · `curl(r, { side, toward })` · `curls(p, { n, r, up })` | a drop ending in a loop · one loop · a row of cursive loops (treelines, steam, smoke) |
| `zig(p, { n, amp, round })` · `wave(p, …)` · `scallop(p, { n, h, up })` | zigzag (grass, road edge), wave, bumps (bushes, valances) |
| `sweep(region, { step, from, pad, jitter, round, rows, x, mirror, squash })` | fill a shape or polygon with a row-by-row zigzag (water, road) |
| `reflect(name, opts)` | `sweep` of the shape's reflection below its ground — width follows the mirrored body |
| `back(len)` | retrace the last stretch a hair to the side |
| `pause(s)` · `tag(name)` | the hand stops · names the stretch (line sheet labels, breathers) |

## Routing — how a one-line artist gets around

1. **Start at an edge.** A corner of the frame, the top rule, the foot of a wall. The source starts at the top left
   and builds a stepped rule.
2. **Big structure first, then the subject, then the ground.** Frame / far shore → middle ground → figure → reflections
   → open ground → base rule.
3. **Every travel is something.** A frame edge, the horizon, a waterline under posts, a wire, a kerb, a rod, a doubling
   back (`back`). A bare diagonal across a subject is the most visible mistake (LESSONS.md).
4. **Detours instead of jumps.** Stop a contour `until` the point where something hangs off it, draw that, come back,
   finish the contour with `L.last`. The angler's rod and fishing line, the stall's lanterns and steam work that way.
5. **Enter a silhouette where you already are.** `from: 'near'` starts at the outline point nearest the pen; check the
   line sheet that it is the side you meant, or give a point.
6. **Reflections run long and narrow** (`squash` 1.05–1.2, `step` 24–36, `round` .3). Open water and roads are wide
   zigzags (`step` 36–60, `jitter` .25–.3, `round` .35–.4).
7. **Loops are punctuation.** 5–9 per big contour (`maxCurls`), more on wires and treelines; radius 5–10 px. Fewer
   than six in the whole drawing fails `check.mjs`.
8. **Fill the page.** The drawing spans ~110 px margins to the base rule near y 1800–1840; the signature goes under its
   right end.

Read the line sheet (`render.mjs piece.html --line`) after every change: colour runs blue → red with time, green dot
start, red square end, circles are pauses, red dashes are outline the line misses.
