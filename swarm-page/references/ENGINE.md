# ENGINE — lib/swarm.js

`Swarm.start(config)` builds everything on `HIC.stage` (lib/hic.js). One call per page. Defaults: `Swarm.DEFAULTS`.

## Markup
```html
<canvas id="stage" layoutsubtree content="drawable">
  <article id="page" drawable> …the live page; transparent background… </article>
  <div id="scene" drawable aria-hidden="true"><svg>…silhouettes in front…</svg></div>
</canvas>
<script src="lib/hic.js"></script><script src="lib/swarm.js"></script>
```
Both children are `position:absolute; left:0; top:0`, full viewport; `#scene` has `pointer-events:none`; hide `#scene`
in the fallback (`.hic-fallback #scene{display:none}`). Mark the editable headline `data-hic-edit`, controls that must
never fly `data-swarm-hold`, single-line editables `data-swarm-oneline` (Enter is ignored).

## Config
| field | meaning |
|---|---|
| `canvas`, `page`, `scene` | selectors (`#stage`, `#page`, `#scene`) |
| `grains` | grains over a 1280×800 view (default 90 000; cell = √(area/grains)); `#grains=` overrides |
| `seed` | scatter seed |
| `sky` | `stops: [[y, '#hex'], …]` (≤ 6, y 0 top → 1 bottom), `sun`/`moon: {x, y, r, color, glow}`, `stars` 0..1, `clouds: {amount, y0, y1, shade, lit, scale}`, `cirrus`, `rays`, `vignette` |
| `skyB`, `light` | the second light; `light: {turn, delay, dur}` turns sky ⇄ skyB on every full flight and sets `data-swarm-light` |
| `water` | `{y, deep, mirror, glint, glintX}`: waterline (0..1), mirrors sky, birds and scene |
| `creature` | `shape` (`starling` `bee` `firefly` `fish` `plane` `dot`), `glsl` (custom shape), `size` (cells), `flap` (Hz), `glide` 0..1, `tint`/`tintMix`, `tintB`/`tintMixB`, `blend` (`over`/`add`), `haze` |
| `flock` | `leaders` (8–128), `shape` (`sheet`/`ball`/`stream`), `speed`, `minSpeed` (px/s at 800 px), `maxTurn` (rad/s), `neighbours` (7), `reaction` (s), `align`, `salience`, `cohere`, `separate`, `goal`, `wander`, `spread`, `thick`, `stretch`, `area: [x0,y0,x1,y1]`, `depth`, `follow: [k0,k1]`, `jitter`, `startle: [a,b]` s |
| `lift` | `speed` (wave px/s), `jitter` (s), `gather` (s), `kick` (px/s) |
| `land` | `order` (`top`/`origin`/`random`), `span` (s), `jitter` (s) |
| `idle` | `hops` (bool), `every: [a,b]` s, `sheen` |
| `trigger` | `fly`, `land` (selectors), `intro: {el, at, back, scope}`, `escape`, `startle` (click in the sky in flight) |
| `sound` | `{kind: 'wings'|'buzz'|'paper'|'hum', ambience: null|'crickets'|'birds', toggle: selector}` |
| `onResize(W, H)` | draw the scene for this size |
| `onMode(mode)` | `'rest'`, `'fly'`, `'land'` |

Returns `{ fly(fromEl, scopeEl), land(), recall(el, secs), reflow(mutate, els), sound(on), mode }`.
`reflow(fn, els)`: snapshots the elements' boxes, runs `fn` (which reorders the DOM), and the moved ones fly from where
they were.

## How it works
1. **Upload.** On paint, `#page` goes into one of two page textures (the other keeps the previous picture), `#scene` into
   its own. At rest, a diff pass sends grains whose pixels changed (typed letters) in from the sky.
2. **Grains (GPU).** Float textures, one texel per cell: `pos` (offset from home, birdness), `vel` (velocity, wing phase),
   `aux` (ink, |a|, dip, in the air), `bind` (lead bird, neighbour, blend, lift time). One fragment pass per step: the
   gather quiver; the lift kick; the flock target (between the lead bird and its neighbour, at the grain's place in the
   bird's frame: forward × stretch, side, up × thick); a spring with the grain's own stiffness; the glide home and the
   under-damped settle; the pointer hawk; the acceleration cap; the wingbeat (flap when climbing, glide spells).
3. **Lead birds (CPU, `Leaders`).** N birds, each answering its K nearest neighbours (alignment to their velocity
   `reaction` s ago, weighted up for neighbours that are turning; cohesion; separation), a slow roaming goal, soft walls,
   wander and startles. Heading turns ≤ `maxTurn` rad/s (×2 when startled); speed eases (mass); bank follows the turn.
   Uploaded each step into a 5-row float texture.
4. **Drawing.** The sky (painted once per size per light) + water + the formed page (a hole where a grain is away) in one
   pass; the birds as point sprites (shape in the bird's frame, turned to its screen heading, banked; a pixel square near
   home morphing into the creature as it rises); mirrored birds under the waterline (scissor); the scene in front.

## Adding a creature in a project
```js
creature: { glsl: `
  float shapeCustom(vec2 p, float ph, float bank){       // p: x forward, y left, about -1..1; ph: wing phase; bank -1..1
    float body = length(p / vec2(0.6, 0.2)) - 1.;        // a leaf that tumbles: width breathes with the phase
    float w = 0.25 + 0.2 * sin(ph);
    float sd = length(p / vec2(0.7, w)) - 1.;
    return 1. - smoothstep(-0.08, 0.08, sd);
  }`, size: 3, flap: 2, glide: 0 }
```
The helpers `seg`, `ell`, `cover(sd, aa)` from the library are in scope. Keep it a silhouette that reads at 6–10 px.

## Test hook (`window.__swarm`)
`manual()` stops real-time stepping; `advance(sec, dt)` steps simulated time and draws; `grains()` → `{ink, quiver, away,
birds, air, maxOff, meanOff, maxAccel, dip, amax}`; `offsetIn(sel)` → `{n, max}`; `ripple()` → `{reached, first, median,
last, neighbours}`; `maxTurnRate(sec)`; `wings(sec)` → `{meanHz, flapping, gliding}`; `leaders()`; `info()`.
