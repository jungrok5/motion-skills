# lib/liquid.js — the engine

One file (≈ 900 lines) on top of `lib/hic.js`. Load both, then call `Liquid.start(config)` once.

```html
<canvas id="stage" layoutsubtree content="drawable"><main id="page" drawable> …the page… </main></canvas>
<script src="lib/hic.js"></script><script src="lib/liquid.js"></script>
<script>
  const L = Liquid.start({ canvas: '#stage', page: '#page', liquid: { extends: 'honey', tint: [1, .7, .2] },
                           weather: { rain: 0, drip: { at: [.3, .6], every: 3 } }, lens: { anchor: '#word' } });
  if (L.fallback) return;   // the plain page is showing
</script>
```
`#page` needs `position: relative` (elements are measured by offsets, so a hit-test transform on the page never disturbs them).

## Passes
1. **Ripples**: RGBA16F ping-pong at `rippleCell` CSS px per cell; r = height, g = velocity; `v = (v + lap·speed)·damp`,
   `h = (h + v)·decay`; 16 impulses per step; 120 steps a second.
2. **Bead field**: every bead (and the big drop with three lobes) is one instanced quad; the kernel `k = (1 − q²)²` with
   `q = distance / (1.6 · radius)` in coordinates stretched along the bead's velocity (round front, drawn-out tail) is added
   into RGBA16F: `(Σk, Σk·R, Σ∇k)`. The bead edge is the contour `k = T = (1 − 1/1.6²)²`.
3. **Glass**: per pixel, `u = 1 − 1.6²(1 − √f)` (0 at the edge, 1 at the centre), height `h = R̄ · cap · u^capExp`, slope from
   the stored gradient → normal; `refract()` at `spectral` wavelengths through depth `h + R̄·lens`; ripple slope; the big drop's
   exact lens; contact shadow (a band measured in px with the gradient); caustic; Beer–Lambert `exp(−(1 − tint)·density·d)`
   with `d` saturating; `body`; scatter; rim; sheen; Fresnel reflection of `room()` (window, sky, bounce; grazing rays see the
   paper around); metal.

## Config (`Liquid.DEFAULTS`)
| key | meaning |
|---|---|
| `canvas`, `page` | selectors or elements |
| `liquid` | a name from `Liquid.LIQUIDS`, or `{ extends: name, …overrides }` |
| `weather` | `rain` 0..1, `wind` −1..1, `drip` `{ at: [x fractions], every: s, size: px, preRun: 1 }` or null, `intro` `sheet` / `fall` / `none` |
| `light` | `dir` [x, y] toward the lamp; `window` `{ dist, w, h, panes, glow, color }`; `sky`, `skyDark`, `bounce`; `paper` (null = read the page background) |
| `lens` | `on`, `radius` (× short side), `min`, `max` (px), `magnify` (pull = magnify · (1 − 1/n)), `anchor` (selector it rests on) |
| `beads` | `density`, `clusters`, `big`, `mid`, `small` (per 1.3 Mpx) |
| `keepDry` | selectors where big beads are not seeded |
| `noTrail` | extra selectors where the fingertip leaves no beads (controls never get one) |
| `typeWet` | fields whose typing wets the letters |
| `spectral` | 1, 3 or 5 wavelengths per wet pixel |
| `fieldScale`, `rippleCell`, `maxDrops`, `seed`, `probe`, `onReady`, `fallbackNote` | resolution, budget, determinism, hooks |

## Liquid parameters (`Liquid.LIQUIDS.<name>`)
Optical: `ior`, `dispersion`, `tint`, `density`, `body`, `scatter`, `scatterColor`, `metal`, `metalColor`, `sheen`, `cap`,
`capExp`, `lens`, `film`, `shadow`, `caustic`, `rim`. Motion: `slide`, `stick`, `trail`, `ribbon`, `merge`, `evaporate`,
`bead` [min, max], `lobes`, `ripple` `{ speed (< 1.95), damp, decay }`, `wobble`. Meanings are in the comment above `LIQUIDS`.

## API (`L = Liquid.start(…)`)
| call | does |
|---|---|
| `L.set({ ior, dispersion, rain, wind, lens, magnify, slide, plain, …any liquid key })` | change live; `lens` true/false |
| `L.liquid(nameOrSpec)` | swap the whole liquid |
| `L.splash(x, y, power)`, `L.wipe()`, `L.shake(x, y, power)` | the verbs |
| `L.addDrop(x, y, r, vx, vy)` → bead | add a bead; set `kind = 'trail'`, `th = 999`, `hold = 1e9` for one that stays put and joins a ribbon |
| `L.impulse(x, y, radius, strength)` | push a ripple |
| `L.boxOf(el)` → [x, y, w, h] | where an element is, in canvas CSS px |
| `L.toPage(x, y)`, `L.inLens(x, y)` | the lens mapping (screen → page) |
| `L.run(n)`, `L.freeze(bool)`, `L.redraw()` | step n × 1/60 s; stop the clock; draw now |
| `L.state()` | `{ drops, cover, hero, dark, uploads, W, H, frozen, lensK }` |
| `L.rippleAt(x, y, r)` | the largest ripple height near a point (read back) |
| `L.params`, `L.mat`, `L.cfg`, `L.drops`, `L.hero`, `L.stage` | live state |
| `Liquid.range(input, output, fn)` | keeps a range's track fill (`--p`) and read-out; `fn(value)` → `{ label }` |

Hash: `#still=<s>` (simulate s seconds once, then hold), `#calm` (no rain, drips, intro or idle wobble), `#fallback`,
`#liquid=<name>` (swap the liquid for a quick look), `#dark` (the template and example switch their paper).

## Adding things in a project (without editing lib/)
- **A new liquid**: `liquid: { extends: 'water', tint: [.6, .1, .2], density: 1.6, body: .2, slide: .7 }` (red wine), or
  `Liquid.LIQUIDS.milk = { …all keys… }` before `start`.
- **A topic verb**: write it in the page with `L.addDrop` / `L.impulse` (the honey example's Drizzle lays a ribbon).
- **A control**: `Liquid.range('#salt', '#saltOut', v => { L.set({ ior: 1.33 + v * .0005 }); return { label: v + ' g/l' }; })`.
- **Weather that changes**: change `L.cfg.weather.drip.every` or call `L.set({ rain })` from a control or a timer.
- **Sound** (optional): synthesise with Web Audio, start on a gesture, add a visible toggle; hook it to `pointerdown` and the
  splash verb. No samples.
