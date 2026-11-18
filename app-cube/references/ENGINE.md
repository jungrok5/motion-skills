# lib/cube.js — config and API

```html
<canvas id="stage" layoutsubtree content="drawable">
  <section class="face" id="a" drawable>…</section> … six sections, 720×720 px, position:absolute; left:0; top:0
</canvas>
<script src="lib/hic.js"></script><script src="lib/cube.js"></script>
<script> const cube = AppCube.create(document.getElementById('stage'), CONFIG); </script>
```
`create` returns the API, or `null` after falling back to the plain page (no feature, or no WebGL2).

## CONFIG (every key optional except `faces`; defaults in `AppCube.DEFAULTS`)
| key | default | meaning |
|---|---|---|
| `faces` | first six children | six selectors/elements: **front, right, top, back, left, bottom** |
| `face` | 720 | face size in CSS px (tiles are `face/3`) |
| `texScale` | 1 | texture size = face × min(2, dpr) × texScale (≤ 2048) |
| `mode` | `'auto'` | `'auto'` (text/sliders/[data-drag] take drags, the rest turns), `'write'` (never turns), `'twist'` (always turns) |
| `view` | yaw −0.62, pitch 0.44, fov 26, distance 14.2, height 1.9, lookY −0.25, fitAspect 0.92, offset [0,0], midOffset [.1,−.04], phoneOffset [0,−0.06] | home orientation and camera; below `fitAspect` the camera backs off; `offset` (≥ 900 px wide), `midOffset` (640–900) and `phoneOffset` (< 640) shift the picture in NDC to clear the HUD |
| `intro` | yaw −2.5, pitch 0.16, dur 1.15 | the swing-in on load (skipped by #still / #calm) |
| `idle` | sway 0.075, speed 0.42, resume 7 | turntable sway (radians, Hz); eases out under the pointer, returns after `resume` s untouched |
| `body` | color `#0c0c11`, gloss 1, roughness .1, metal 0, radius .085, groove .55 | the cubies |
| `tile` | size .935, radius .11, glass .18, rim .55, bevel .75, emit .86, light .22, hot `#fff` | the glass screens: size of a cubie face, corner radius, reflection cap, rim highlight, edge roll, app brightness, key-light share, hover rim colour |
| `studio.ambient` | `['#020203', '#0c0d14']` | environment below / above |
| `studio.lights` | five softboxes | `{dir, size:[hw,hh], color, power, soft}` (≤ 6; world dirs, camera looks down −Z, y up) |
| `studio.key` | [.38,.8,.46] | the direction that lights tiles and bodies diffusely |
| `backdrop` | navy | `center`, `edge`, `centre:[u,v]`, `glowA/glowB: {at:[x,y], color, size}` |
| `floor` | y −2.75, reflect .42, blur .55, shadow .92, tint, fade [9,30] | reflection strength, blur growth with distance, contact shadow, far fade |
| `sweep` | color `#fff3df`, power .55, dur .95 | the light band when solved |
| `turn` | flick 2.4, freq 4.2, zeta .52, dur .16, scramble 20, scrambleDur .085, seed 11, tickDeg 18, recoil .035 | flick speed (rad/s), release spring (Hz, damping < 1 overshoots), move time, scramble length/time, seed, detent spacing, landing recoil |
| `sound` | on, volume .55, snap {freq 150, body .09, click 2600}, tick {freq 3400, gain .12}, chime [72,76,79,84], chimeWave 'sine' | synthesised; starts at the first gesture |
| `onChange(state)` | — | after every move and at ready |
| `onReady(api)` | — | once the faces are uploaded and hit testing is probed |

## Attributes inside faces
`data-cube="scramble" | "undo" | "solve" | "home" | "sound"` (sound gets `aria-pressed`), `data-cube="mode" data-mode="auto|write|twist"`
(`aria-pressed` on the active one), `data-span` (a control allowed to cross tiles; check `grid` skips it), `data-drag`
(an area whose drags belong to the page, e.g. a drawing pad), `data-hic-edit` / `data-hic-click` (what the shared checks use).

## API
| call | does |
|---|---|
| `scramble(n?)`, `undo()`, `solve()`, `home(dur?)` | the controls (seeded scramble; solve replays the history backwards) |
| `turn(a, l, q)`, `moves("R U' F2")` | animated moves (axis 0 x / 1 y / 2 z, layer −1/0/1, quarter turns right-handed) |
| `apply(movesOrString, record?)` | apply at once (stills, restoring) |
| `hold(a, l, angle)` / `hold(null)` | freeze a layer mid-turn (stills) |
| `view(yaw, pitch)` | set the orientation (stops the sway) |
| `reveal(el)` | turn the cube so el's tile faces front, upright |
| `setMode(m)`, `mode` | the drag mode |
| `state()` | `{solved, moves, log, last, busy, mode, sound, twisted, clock, settle, spinning}` (clock/settle in engine seconds) |
| `visibleTiles()`, `tileAt(x, y)` | facing tiles with screen centres / the tile at a canvas point |
| `toScreen(face, x, y)`, `toLocal(el, clientX, clientY)` | face px ↔ canvas px through the tile's homography (for drawing apps use `toLocal`) |
| `localBox(el)`, `faceOf(el)`, `slotOf(f, r, c)` | an element's box in face px / its face index / where a tile sits now |
| `sound.tone(hz, dur, {type, gain, at, glide})`, `sound.click(k)`, `sound.chime()`, `sound.toggle()`, `sound.on` | sound for the apps |
| `window.__hic.screenOf(el)` | where el is drawn now (checks) |

Events: `cubechange` (detail = `state()` + `user`), `cubeuse` (`{face, afterTwist}`: an input or click on a face).

## Adding things in a project (without editing lib/)
- **A new app**: plain DOM in a section; for pointer-drawn content read coordinates with `cube.toLocal(el, e.clientX, e.clientY)`
  (offsetX is unreliable under a projective transform) and mark the area `data-drag`.
- **A new material**: only `body` / `tile` / `studio` values. Metal: `metal .5–.8`, `color` = the metal tint, `roughness .15+`.
  Matte: `gloss .3`, `roughness .3`. Keep `emit` ≥ .8 so the apps stay true to their CSS colours.
- **A new control**: any element can call the API (`cube.scramble()`); the HUD outside the canvas can too.
- **New sounds**: `cube.sound.tone()` from the app's handlers; keep gains ≤ .2.
- **Behaviour the engine lacks** (a scripted demo turn, a timed reveal): drive `moves()`, `view()`, `reveal()` from the page;
  change `lib/cube.js` only in the skill, never in a project copy.

## Inside (for changing the engine)
`Model()` holds cubies (integer `pos`, rounded rotation `rot`) and 54 stickers (face basis n/u/v, row, col). `layout()` builds
world matrices (cube orientation `Q` × layer turn × cubie rotation), the tile vertex buffer and each tile's screen quad;
`pick()` finds the nearest facing quad under a point; `tileH()` is the square-to-quad homography × the tile's offset, given to
`S.place(face, matrix3d)` by `bindTile()`. `render()`: mirrored cube into a half-size target with mips, backdrop, floor
(blurred reflection, contact shadow, far fade), cube (bodies, then glass tiles per face texture). `step()`: intro, reveal
spin, orbit inertia, the move queue, the release spring, recoil, sweep, hop, sway. Uploads happen in `S.onPaint` for the
faces named in the paint event's `changedElements` (plus the hovered and focused faces when the event lists none).
