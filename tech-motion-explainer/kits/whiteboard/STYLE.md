# whiteboard kit — 그려 가며 설명 (draw while reasoning), Canvas 2D

A board you reason on, stroke by stroke. Marker lines wobble like a hand drew them (each wobble is seeded from the line's id), text is
written left to right while the pen follows it, sticky notes get slapped on, printouts get taped up, and an eraser wipes a chapter (or one
band of the board) away. The pen in hand and the markers left in the tray show which colour is being written.

**For:** arguments engineers make with a marker: timing/sequence diagrams, "first this, then that" flows, a picture that grows and gets
annotated, circled, struck through and redrawn beside itself (protocol behaviour, races, lookups, caches, queues).
**Not for:** spatial or 3D subjects (use a three.js approach), dense dashboards or code walls (a taped printout holds a few lines, not a
file), anything whose look should be a real screen (실물 / 게임 화면 재현).

Files: `whiteboard.js` (the kit), `template/index.html` (a 36 s DNS-lookup page using it).

## Loading
A classic script (the board pages are classic inline scripts). Copy `whiteboard.js` to `assets/kits/whiteboard.js` in your project, then:
```html
<script src="../assets/kits/whiteboard.js"></script>
<script>
const W = 1920, H = 1080, DURATION = 36.5;
const ctx = document.getElementById('c').getContext('2d');
const INK = { k: '#23262c', q: '#5b3cc4', a: '#0a7a73', c: '#c45a00', dim: '#5d6470', faint: '#9aa0a8' };   // YOUR topic's roles
const wb = Whiteboard.create(ctx, { W, H, ink: INK, markers: [INK.k, INK.q, INK.a, INK.c], surface: 'whiteboard' });
const { stroke, arrowS, boxS, ringS, say, sayParts, sticky, onBoard, eraser, clamp, p } = wb;
wb.setWipes([12.5, 25.5, [18, 960, W]]);         // when the eraser finishes each pass (optionally one band only)

function sThing(t) {
  onBoard(t, 4.5, 12.5, u => {                    // drawn while 4.5 <= t < 12.5, wiped at 12.5; u = t - 4.5
    boxS('srv', 1400, 270, 380, 110, clamp((u - .3) / .55), INK.k);
    say('권한 서버', 1428, 340, u, .7, { size: 28, color: INK.dim });
    arrowS('q1', 975, 305, 1385, 305, clamp((u - 1.2) / .6), INK.q, { lw: 5 });
  });
}
function renderAt(t) {
  wb.begin(); wb.board();
  sThing(t); /* … */
  const erasing = eraser(t);
  wb.frame(); /* your progress marks */ wb.tray(erasing);
  if (!erasing) wb.drawPen();
}
</script>
```
`create` throws if `ink` or `markers` is missing: the kit has no palette of its own.

## API
`Whiteboard.create(ctx, opts)` → `wb`. Also on `Whiteboard`: `SURFACES` and the pure helpers below.

**opts**
| key | meaning |
|---|---|
| `W`, `H` | canvas px (default: the canvas size). `W >= H` picks landscape defaults (eraser sweeps left→right, tray 32 px tall); otherwise portrait (sweeps top→bottom, tray 48 px, markers 1.3×). |
| `ink` | **required**, `{ role: '#rrggbb' }`. One meaning per colour, from the topic. |
| `markers` | **required**, the ink colours that are physical markers, in tray order. `markers[0]` is the default pen: grey notes and any non-marker colour are written "with" it. |
| `paperInk` | `{ role: '#rrggbb' }` darker inks for paper/stickies on a dark board (same role keys as `ink`). Paper ink never gets a halo, and the pen shows the matching board marker. |
| `surface` | `'whiteboard'`, `'glass'`, or a surface object: `{ ...Whiteboard.SURFACES.glass, reflections: [...] }`. |
| `fonts` | `{ sans, mono, hand }` CSS families. `hand` (default = sans) is what `wr`/`say` write with; load a handwriting face in `window.ready` if the topic wants one. |
| `hand` | `{ tilt: .012, cps: 26 }`: max seeded tilt of a written line (rad), writing speed (chars/s). |
| `line` | `{ lw: 6, amp: 1.8 }`: default stroke width and wobble amplitude. |
| `wipe` | eraser motion: `dir` `'x'`/`'y'`; `lead` .85 / `dur` .75 (pass starts at E − lead, lasts dur); `peelLead` 1.15 / `peelDur` .3 (stickies come off first); `fade` 1.6 (smear fades after E); `smearW` 200; `swing` 300 (zigzag amplitude); `center` (H/2 − 40 for x); `rot`, `scale`. Portrait defaults: .75 / .65 / .92 / .2 / 1.4 / 230 / 330, centre W/2, rot π/2, scale 1.2. |
| `tray` | `{ top, y, xs: [x per marker], scale, eraser: [x, y, scale] | null }`. Defaults right-align the markers before the eraser. |
| `cache` | default `true`: the static board is painted once into an offscreen canvas. `false` repaints it every frame (the source pages' behaviour). |

**Frame** — `begin()` (reset transform, alpha, pen, peel) · `board()` (empty board) · `eraser(t)` → erasing? (smear + moving eraser, lifts the pen) ·
`frame()` (board edge, tray rail) · `tray(erasing)` (markers; the one in hand and the eraser in use are missing) · `drawPen(scale=1)`.

**Wipes** — `setWipes([E, …] | [[E, a0, a1], …])`: the times passes end, optionally limited to a band along the sweep axis (x band for
`'x'`, y band for `'y'`) · `onBoard(t, S, E, fn(u), zone?)`: draws `fn(t − S)` while S ≤ t < E with the eraser clip and peel; give it the
same E (and zone) you gave `setWipes` · `eraseK(t, E)`, `eraserPos(e, zone)` for anything that must follow the eraser.

**Strokes** (`id` seeds the wobble — keep it unique and stable; `k` = 0..1 drawn fraction; while `k < 1` the pen sits at the tip) —
`stroke(id, [[x,y],…], k, col, {lw, amp, alpha, dash, pen=true, halo})` · `arrowS(id, x0,y0, x1,y1, k, col, {…, head=22})` ·
`pathArrow(id, pts, k, col, {…})` · `boxS(id, x,y,w,h, k, col)` · `ringS(id, cx,cy, rx,ry, k, col)` (circling, overshoots its start) ·
`xmark(id, x,y, half, k, col, lw)` · `checkS(id, x,y, size, k, col, lw)` · `strike(id, x0,x1, y, k, col)` · `dotS(x,y,r, col, a)` ·
`hatch(x,y,w,h, col, a, step)` (waiting time; lines anchored to the board) · `setPen(x, y, col)` (pen at a point you animate yourself).

**Writing** — `wr(text, x,y, k, {size, weight, color, align, mono, alpha, rot, ls})` → width · `say(text, x,y, u, t0, {…, cps})` (timed `wr`) ·
`sayParts([[text, col], …], x,y, u, t0, opts)` → `[left, width]` · `wk(u, t0, text, cps)` · `txt(...)` (printed, no reveal: labels on paper,
numbers) · `tw(text, size, weight, mono)` · `font(...)`.

**Stuck on the board** — `sticky(x,y,w,h, k, {rot, col}, fn(w,h))` · `paper(x,y,w,h, k, {rot, col, tape}, fn(w,h))`; both draw `fn` in local
coordinates and peel off before the next wipe of the `onBoard` they are in.

**State** — `wb.pen` (get/set `{x, y, col}` or null, canvas space) · `wb.peel` (multiply things that must leave with the stickies) ·
`wb.boardColor` · `wb.ink`, `wb.markers`, `wb.surface`, `wb.fonts`, `wb.wipe`, `wb.trayLayout`.

**Helpers** — `clamp lerp p eo eio rng hash rgba shade rr` (also on `Whiteboard`).

## Surfaces (the materials)
- `whiteboard` — matte off-white board, faint ghost marks of earlier sessions, aluminium frame and tray, a dry streak inside each line.
- `glass` — dark glass on a wall: wall gradient, optional blurred `reflections` of the room behind the viewer (none by default; the TCP
  page passes a monitor wall), a diagonal light strip, blurred ghosting, standoff caps, floating tray. Board ink gets a faint halo and a
  brighter sheen; write on paper with `paperInk`.

Every colour of the material is a field (`board`, `ghost`, `halo`, `sheen`, `hatch`, `smear`, `sticky`, `paper`, `pen`, `eraser`, `frame`,
`trayPen`); spread a preset and override what the topic needs (a warmer board, a pale-green sticky, no ghost marks: `ghost: false`).

## 새 주제마다 직접 설계할 것 / What every topic must design itself
The kit gives the pen, the board and the eraser. It does not give a picture. For each topic decide:
- **The ink roles.** Which 3–5 meanings get a marker (data, the reply, the cost, the fix, the cache…). Red only if something fails.
- **The one picture and how it grows.** A sequence diagram, a hub with spokes, a ladder, a timeline, a stack — whatever engineers draw for
  this subject — and in what order strokes appear. Do not reuse the source pages' Client/Server lanes unless the topic is a two-party exchange.
- **Chapter structure on the board.** Wipe the whole board per chapter (the TCP pages), or keep one drawing and wipe only a band
  (`setWipes([[E, a0, a1]])`, the DNS template), or never wipe until the end card.
- **Header and progress.** The kit has none. The source pages circle a chapter number top-left with a taped "03 / 07" card; the template
  stacks chapter stickies top-right and puts dots along the bottom. Pick something that fits the drawing's empty space.
- **Annotations.** What gets circled, struck through, hatched, given a sticky with the one number, or a taped printout.
- **The end card.** What is written out, and in which ink.

**Variety knobs:** surface (whiteboard / glass / your overrides: board tint, ghost seed and count, sticky and paper colours, frame);
ink palette and marker count; `fonts.hand` and `hand.tilt` / `hand.cps` (a calmer or quicker hand); `line.lw` / `line.amp` (fine pen vs
fat marker); wipe direction, `swing`, `center`, zones and how often you wipe; tray layout; composition (where the drawing grows, how
much stays up); landscape or portrait.

## Performance
Measured in headless Chromium in the container (renderAt only, mean over 11 / 10 chapter frames × 10 reps):

| page | original | on the kit |
|---|---|---|
| nagle-nodelay-board-wide (whiteboard) | 27–30 ms | 10 ms (`cache: true`) · 29–32 ms (`cache: false`) |
| tcp-retransmission-board-wide (glass, already cached) | 13–14 ms | 14 ms |
| template (DNS) | — | 6.4 ms |

The board image is the expensive part (full-screen gradients + ghost strokes, or blur filters on glass), so it is cached. Each `stroke`
rebuilds its wobbled path every frame (one point per 6 px); hundreds of long strokes per frame are fine, thousands are not. `filter: blur`
is used only inside the cached board.

## Pitfalls
- **Stroke ids are seeds.** Two strokes with the same id wobble identically; an id built from a changing value (`'a' + t`) makes the
  line crawl. Ids inside a loop need the index (`'fq' + i`). The smear id is `'smear' + E`.
- **Pass the same E to `onBoard` and `setWipes`**, and the same zone. Otherwise content vanishes without an eraser, or the eraser wipes nothing.
- **Zone wipes do not touch other layers.** Put everything that should go with the band in that band's `onBoard`; if a persistent drawing
  sits under the eraser's path it will look un-erased (keep the band clear of it, as the template does at x ≥ 960).
- **The eraser's zigzag** spans `center ± swing` plus half its height (~115 px). Move `center`/`swing` so it does not cross a sticky that stays.
- **Pen colour**: only colours in `markers` (or mapped through `paperInk`) show as the pen; anything else shows `markers[0]`. Setting
  `wb.pen` directly skips the transform mapping — use `setPen` inside a transformed sticky/paper.
- **`arrowS`/`pathArrow` k must reach exactly 1** for the head to finish (the kit adds a 1e-9 guard; the TCP page needed it because
  `(1 − .9) / .1` is 0.999…). Use `clamp(...)` for k.
- **Masking with `wb.boardColor`** (to cut a gap in a line) is exact on the whiteboard; on glass the board is a gradient, so a flat patch shows.
- **Text is a font, not a stroke.** `wr` reveals Pretendard (or `fonts.hand`) behind a moving clip; long lines at small sizes reveal too
  fast to read — follow the skill's 1 s per 10 Korean characters.
- **Fonts load in `window.ready`**: measure (`tw`) only after it resolves, or widths in `sayParts` come out wrong on the first frame.
- **Stickies and paper vanish at peel time** of their `onBoard`; things drawn on the board next to them (a ring around a sticky) should
  multiply their alpha by `wb.peel`.

## Where it came from
github.com/jungrok5/mmo-server-explained (worked example repo), four copies of one block with two-way drift:
- `nagle-nodelay-board-wide/index.html` — kit 171–387, wipes 389–425 (light whiteboard, black/blue/red/green markers).
- `tcp-retransmission-board-wide/index.html` — kit 181–438, wipes 440–475 (dark glass, liquid chalk with halo, paper inks, monitor-wall
  reflections, cached board, adds `pathArrow`, `xmark`, `checkS`, `dotS`, the arrow-head epsilon).
- `nagle-nodelay-board/index.html` 104–327 / 329–361 and `tcp-retransmission-board/index.html` 104–361 / 363–393 — the portrait (1080×1920)
  versions: tray at y 1872, markers ×1.3, top→bottom zone wipes (`onBoardV`).

Reconciled: both surfaces kept as presets (`whiteboard`, `glass`), landscape and portrait wipes unified as `wipe.dir` + zones, the glass
page's extra tools and arrow fix adopted for both, its board cache made the default for both. Topic parts left in the pages: palettes, the
glass page's monitor reflections (now a `reflections` parameter), headers, progress bars, all scenes.

Verified by re-pointing copies of both wide pages at the kit: 11 and 10 stills across all chapters and mid-wipe frames, max channel
difference 1 (one pixel) and 0, the same in reverse seek order.
