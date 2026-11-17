# Engine — lib/time-machine.js + lib/passes.js

```html
<canvas id="stage" layoutsubtree content="drawable"><main id="page" drawable> …slots… </main></canvas>
<div id="dial"></div>
<script src="lib/hic.js"></script><script src="lib/passes.js"></script><script src="lib/time-machine.js"></script>
<script>
  TimeMachine.pass('mymedium', { … });            // optional: a medium the library lacks
  var tm = TimeMachine.start({ eras: [ … ], notes: [ … ] });
  tm.on('era', function (ev) { … });               // topic controls re-render here
</script>
```

## Config — `TimeMachine.start(cfg)`
| field | meaning |
|---|---|
| `eras` | 2–6 eras in dial order (design 3–5) — see below |
| `start` | era id shown first (`#era=<id>` overrides) |
| `notes` | `[{year, text}]` already in the log |
| `hints` | three strings for the top pill (dial, type, magnify); `false` for none |
| `words` | dial words: `{sound, earlier, later, xray, xrayNote, dial}` |
| `accent` | default dial accent; `texScale` (1.25) upload sharpness; `gutter` (12 px); `maxDpr` (2); `logMax` (12) |
| `canvas`, `page`, `dial` | selectors (default `#stage`, `#page`, `#dial`) |

### An era
| field | meaning |
|---|---|
| `id`, `year`, `label` | `data-era` value, dial numerals, dial label |
| `page`, `phone` | page size in CSS px, desktop and ≤ 520 px wide (match your `@media (max-width: 520px)` CSS) |
| `frame`, `phoneFrame` | room round the page for the surround, page px `[top, right, bottom, left]` |
| `sheet` | paper beyond the page edge, page px (desk, paper) |
| `maxScale` | largest page scale at rest (1.6) |
| `focus`, `phoneFocus` | page uv the camera dives into |
| `dive` | zoom at the bottom of the dive (16); `maxZoom` wheel limit (8) |
| `raster`, `filter` | `raster: 1` uploads at 1 texel per CSS px; `filter: 'nearest'` shows texels as blocks (640×480 screens) |
| `passes` | `[name, {params}]` list — sorted by stage, order kept within a stage |
| `content` | slot values: string → text; array → `<p>` / `<li>` / `[dt, dd]` pairs; `{html}` → markup you wrote |
| `data` | anything for your page script (`tm.era.data`) |
| `sound` | room tone: `{hum:[f,g], whine:[f,g], noise:[type,f,q,g], gate:[rate,depth], pulse:[every,f,g], pad:[[f…],g]}` |
| `tone`, `accent` | arrival bell pitch (Hz); dial accent colour |

## Page conventions
`[data-slot=key]` filled per era · `[data-slot-placeholder=key]` · a `contenteditable [data-slot]` keeps the reader's edits per
era · `[data-log-list]`, `[data-log-input]`, `[data-log-add]` make the log (Enter or the button; each note stamped with
the era's year) · `[data-hic-edit]` and `[data-hic-click]` are what the shared checks click.

## Passes (`lib/passes.js`)
| stage | pass | params | does |
|---|---|---|---|
| warp | `barrel` | k | CRT bulge (JS inverse for hit testing) |
| warp | `weave` | amount, fps | gate weave under a page px |
| page | `paper` | tint, fibre, age, specks, fold | stock, fibres that resolve when diving, age to the edge, specks, a fold |
| page | `letterpress` | ink, rough, gain, uneven | type as ragged pressed ink; leaves pictures and strong colours |
| page | `halftone` | pitch, angle, ink, gain | the picture (warm tint) as a dot screen |
| page | `woodcut` | pitch, angle, ink, rough | the picture as cut lines (cross-cut in deep shadow); gouged type |
| page | `mono` | dark, light, contrast, gamma | one ramp: film stock, phosphor |
| page | `grain` | amount, size, fps | silver grain per frame |
| page | `dust` | amount, fps | specks and a wandering scratch |
| page | `scanlines` | pitch, depth | beam lines that swell when bright |
| page | `mask` | pitch, depth | RGB phosphor stripes (seen when magnified) |
| page | `bloom` | amount, lod, tint, colour | glow from the page's mipmaps |
| page | `dither` | levels, cell | 4×4 Bayer, n levels per channel (6 = web colours) |
| page | `chroma` | shift, bleed | misregistered, smeared colour |
| page | `holo` | tint, bands, fringe, glitch, flicker | the page as light: fringes, bands, sweep, torn lines |
| surround | `desk` | wood, light, lamp, shadow, pool | a sheet on wood under a lamp |
| surround | `cinema` | room, curtain, spill, heads, mask | a screen, curtains, pelmet and heads lit by the picture |
| surround | `monitor` | plastic, room, glass, bezel, radius, sheen | a tube in a plastic bezel |
| surround | `lab` | room, emitter, gain | a dark room, an emitter ring; adds the page as light |
| post | `vignette`, `flicker`, `grade` | amount / amount, fps / contrast, saturation, lift, gain | the whole frame |

Order inside an era: warps → page passes (as listed) → the surround → post. Put screening passes (letterpress, halftone,
woodcut) before `paper` (they produce ink on white; paper multiplies white into stock). `mono` comes before grain,
scanlines and bloom. A surround that is light (`lab`) wants a page pass that outputs light (`holo`).

## Adding a pass in a project
```js
TimeMachine.pass('cyanotype', {
  stage: 'page',                       // warp | page | surround | post
  animated: false,                     // true if it changes with x.t (the engine then draws every frame)
  params: { blue: '#1d4f91', paper: '#f3f0e6' },
  glsl: 'vec3 pass_cyanotype(vec3 c, Ctx x) { float L = luma(c); return mix($blue, $paper, L); }'
  // a warp also gives toPage: function (u, v, p) { return [u2, v2]; }  — the same maths in JS, for clicks
});
```
In GLSL, `$name` is the parameter (a uniform `u_<pass>_<name>`): numbers → float, `'#rrggbb'` → vec3, `[a, b(, c)]` → vec2/3.
Prefix helper functions with the pass name. Available: `Ctx x` (`sp`, `suv`, `uv`, `px`, `u`, `t`, `src`), `page(uv)`,
`pageLod(uv, lod)`, `hash11/12/22`, `vnoise`, `fbm`, `sdBox`, `sdRoundBox`, `luma`, `toneOf`, `bayer4`, uniforms `uRes`,
`uRect`, `uPageCss`, `uTime`, `uSheet`, `uSeed`. A material should read well at rest **and** at the bottom of a dive:
scale its structure in page px and fade fine detail in with `x.u` (device px per page px), as `paper` and `mask` do.
`TimeMachine.pass` throws on a wrong stage, a missing `pass_<name>` or a `$param` that is not declared.

## Runtime
- Uploads: on paint, the page goes into its era's texture (size × dpr × scale × `texScale`, mipmapped). Each era keeps its
  last texture, so a journey can draw the era it leaves while the DOM already shows the next.
- The journey: dive 0.62 s (zoom eases in from the current view to `dive`), then per hop 0.4 s (0.28 s when passing through
  several eras) crossfading the material at depth with a soft flash, then a 1 s rise with a small dip below ×1 and back.
  It holds at the bottom (up to 2.5 s) until the new era's page has been uploaded once. Journeys requested on the way queue.
  `#calm` turns it into a 0.45 s crossfade.
- Hit testing: the page element is placed with the matrix of the layer on top (an affine rect), or, for a warped era with
  the pointer over the canvas, with `S.placeLocal` at the pointer. It is hidden while another era is on top.
  `__hic.screenOf(el)` inverts the warp for checks.
- Dial: the drum is a spring (2.2 Hz, ζ 0.55: it overshoots and settles); a drag follows the pointer with rubber ends, a
  release projects the flick a little (≤ 0.6 era), a click on a year goes there; ← → keys travel when no field has focus.
- Events: `tm.on('era' | 'leave' | 'arrive' | 'note', fn)`. `tm.go(i | id, {instant})`.
- Test hook `window.__tm`: `era`, `index`, `busy`, `zoom`, `zoomPeak`, `travels`, `audio` (off / on / muted), `xray`, `ids`,
  `animated`, `go()`, `advance(seconds)` (steps the journey on simulated time), `state()`.
