# FILM — shots, plates, camera, the page

```js
import { Film, walk, stand, sit, keyed, camKeys } from '../lib/film.js';
import * as K from '../lib/kit.js';      // places
import * as C from '../lib/critters.js'; // life
import { makeScore } from '../lib/score.js';
export const film = new Film({ W: 1920, H: 1080, seed, title, paper: '#fbf8f2', fadeOut: 1.2 });
export const score = makeScore({ key: 'G', tempo: 100, progression: ['I', 'IV', 'vi', 'V'], seed });
film.shot({
  name: 'canal', dur: 10, in: 'paper' | 'dissolve' | 'cut', res: 1.15, vignette: false | true | { inset },
  cam: [[0, { x, y, zoom }], [10, { … }]]  or  t => ({ x, y, zoom }),
  plates: [{ depth: .5, bb: [x0, y0, x1, y1], paint: g => { K.sky(g, …); … }, front: false, z }],
  fx: [{ depth: .8, z: 1, draw: (g, t) => C.duck(g, …) }],
  cast: [{ actor, pose: walk(actor, {…}), motion: {…}, z: 5, step: 'step', stepGain: .7 }],
  sound: { amb: ['water', 'birds'], music: 'soft' | 'full' | 'none', surface: 'stone', events: [[t, 'quack', { n: 2, x }]] },
});
```
- **Plates** are painted once (at `res` × the render scale) and drawn with the camera; `depth` 0 = fixed to the screen,
  1 = the world (where the cast is), between = parallax, > 1 = foreground. The `bb` must contain everything the plate
  paints (trees, lamps, roofs) and cover the frame over the whole camera move.
- **z** orders plates, effects and cast (defaults: plates 0, fx 1, cast 5, front plates 10, front fx 11).
- **Camera**: keys eased in-out, or a function (follow a walker: `t => ({ x: walk(t).x, y, zoom })`). Plates painted for
  zoom: set the shot's `res` ≥ its largest zoom.
- **Transitions**: `paper` (fade from the sheet), `dissolve` (the previous shot fades out over this one), `cut`.

## kit.js (places)
`sky`, `cloud`, `hill` (with grass, tall grass, flowers), `water`, `ground` (with pebbles), `tree` ('round', 'poplar',
'pine'), `house` (walls, roofs, windows, shutters, doors, awnings, flower boxes), `stall` (awning, cloth, fruit crates),
`stripes`, `scallop`, `bench({ seat })` (returns the seat height), `lamp`, `fence`, `window_` (with a `view` painter),
`pot`, `wall`, `vignette`. A place the topic needs (a lighthouse, a tram, a greenhouse) is a painter in the film's folder
using `lib/paint.js` the same way.

## critters.js (life)
`birds`, `dog` (distance-based trot; front lower legs fold back, hind forward), `cat`, `duck`, `butterfly`, `bunting`,
`falling` (leaves, petals, snow).

## Page contract
- `index.html` → `mount(film, { actors, score })`.
- `window.__ready`, `window.DURATION`, `window.FPS`, `window.seek(t)` (draws that moment; no state between calls).
- `window.__film = { film, rig(), motion(), events(), shots, score }` — what `check.mjs` reads.
- Query: `?render=1` (no clock) · `?scale=.5` · `?t=12` · `?cast` (`&cell=260`). Live: a button starts the sound (browsers
  need a click) and the picture follows the audio clock.
