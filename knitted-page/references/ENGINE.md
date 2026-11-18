# ENGINE — lib/knit.js

`Knit.start(config)` builds everything on `canvas#stage`; with HTML-in-Canvas missing it calls `Knit.fallback` and returns
null. Returns `{ unravel(), knitBack(), sound(on), mode(), info(), config }`.

## Markup
```html
<canvas id="stage" layoutsubtree content="drawable">
  <div id="page" drawable><div class="knit-mount"><article id="card" class="knit-card"> … the page … </article></div></div>
  <div id="under" drawable><div class="knit-mount"><div class="knit-under"> … what unravelling reveals … </div></div></div>
</canvas>
```
`#page` and `#under` fill the canvas (`position:absolute; inset 0`). The engine measures the card's design size (zoom 1),
derives the grid (`cols = width / stitch[0]`, `rows = height / stitch[1]`), places both mounts at the fitted spot and sets
`zoom` on the card and the `.knit-under` box (which it sizes to the card). The page is drawn at identity, so hit testing
is exact. The engine adds `i.knit-caret` to the card. Attributes: `data-knit-motif="name"`, `data-knit-unravel`,
`data-knit-back`, plus the shared `data-hic-edit`, `data-hic-click`.

## Config (`Knit.DEFAULTS`)
| field | default | meaning |
|---|---|---|
| `canvas, page, card, under` | `#stage, #page, #card, #under` | selectors |
| `stitch` | `[10, 8]` | design px per stitch |
| `palette` | `null` | yarns: CSS colours or `--var` names read from the card on every paint |
| `paletteReach` | `0.03` | snap a stitch only this close (squared √linear RGB distance) |
| `yarn` | `thick .21, ply 3, twist .55, fuzz .75, sheen .22, sparkle .25, wobble .16` | radius/stitch width, plies, twist per diameter, fuzz halo, rim sheen, glints, hand-knit unevenness |
| `table` | `kind 'wood', a, b, c, scale 16` | `wood` (planks `scale` stitches deep), `linen`, `gingham` (checks `scale` stitches), `felt`/`slate`; a/b/c colours |
| `lamp` | `x .34, y .28, r .68, floor .42, key, amb` | lamp place and radius (fractions of the window), darkest level, key and ambient colours |
| `needles` | `shaft '#cfa46a', knob '#6d2a1c', metal 0` | needle colours; `metal 1` = steel shading |
| `margin` | `side .06, top .07, bottom .1, min 22` | room around the card (the thread lies in the side margin) |
| `thread.length` | `22` | rope points (≈ stitches of loose end) |
| `heap` | `x .8, y .8, size 1` | heap centre as fractions of the card; scale |
| `reveal.hold` | `0` | seconds bare before knitting back by itself (0 = wait for `data-knit-back` or the thread) |
| `knit.secs`, `unravel.secs` | `2.4`, `2.8` | rough durations |
| `intro` | `true` | knit up from half-way on load (not with `#calm`, `#still`, `#nointro`) |
| `caret` | `width 2, color ''` | drawn caret width in stitches; colour (default `var(--accent)`) |
| `motifs` | `{}` | `name → { rows, colors, repeat, gap }` |
| `hint, sound, soundPitch` | `#hint, #sound, 1` | the hint (hidden after the first pull) and the sound toggle |
| `seed, onMode` | `7, null` | deterministic noise/heap; callback on each mode change |

Modes: `boot → intro → idle ⇄ pull | auto → bare → knit → idle`. Pointer events: `#page` only in `idle`, `#under` only
in `bare`.

## Passes
1. **Downsample** (`FS_DOWN`): 4 × 4 taps per stitch from the page texture; split the taps in two clusters along the
   darkest–lightest axis; the bigger cluster wins and is shown by its extreme tap; then snap to the nearest yarn within
   `paletteReach`. Read back to the CPU; changed stitches are scheduled (`t0`) lowest row first, each row in its own
   direction; `uNew.a` is the re-knit progress, `uOld.a` the lift.
2. **Height** (`FS_HEIGHT`): the stitch field's height and coverage at scene resolution, with mips.
3. **Shade** (`FS_SHADE`): table, reveal layer (premultiplied, with its own blurred shadow), the cloth's shadow (height
   mips), the stitch field (`field()`: three rows × two legs + live loops) shaded by `shadeYarn`, contact shadows from the
   height pass, fuzz, the dent, needles, vignette, tone map.
4. **Present**: the cached scene copied to the screen, then ribbons: heap (shadow, yarn; older yarn buried darker), the
   thread / strand (Catmull-Rom through the rope, crimped once per stitch), the feed strand of a re-knit.
The scene is redrawn only when something changed; frames wait on a GPU fence so software GL never queues a backlog;
quality drops (`L.q`) when the GPU is slow; `#q=` fixes it.

## Adding things in a project
- **A motif**: digit strings in `motifs`, or generate rows in the page (see the star and apple functions).
- **A table**: copy `lib/knit.js` into the project's `lib/` (it already is a copy), add a branch in `tableAt()` for a new
  `uTab.x` kind and a name in `C.kind`; note it in BRIEF.md.
- **A stitch pattern** (rib, garter): change the leg placement in `field()` per column/row parity (e.g. purl columns as
  horizontal bumps) — keep `existsAt()` so unravelling still works.
- **Behaviour on mode change**: `onMode(m)` (e.g. play a sound, change the hint).
