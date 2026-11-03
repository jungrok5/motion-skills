# Kit — the API in one page

```js
import { Film } from 'ink/film.js';
import * as I from 'ink/ink.js';
import { summoner, moves, POSES } from 'ink/summoner.js';
import { quadruped, serpent, bird, PRESET, brush } from 'ink/beasts.js';
import { v3, smooth, clamp, keys } from 'ink/core.js';
```

## Film
- `new Film({ seed, score, title, W: 1920, H: 1080, fps: 30, room: {…ROOM overrides}, post: {…POST overrides}, mbSamples: 7 })`
- `F.shot(dur, (w, lt, u) => {…}, { name, cam, mb, shake, dof, tr, room })`
  - `cam`: keys `[{ t, at: [x,y,z], yaw, pitch, dist, fov, roll, e: 'io'|'in'|'out' }]` (props you leave out hold) or `lt => cam`.
    yaw 0 = camera on +z looking at −z; pitch > 0 looks down from above.
  - `mb`: shutter in frames (0 = off, .4 calm, 1 fast, 1.4 whip). `shake: lt => radians`. `dof`: blur the room (px).
  - `tr`: `{ type: 'white' | 'black' | 'dissolve', d }` into this shot. `F.fadeIn`, `F.fadeOut` (white in, black out).
- `F.check(name, t => bool)` · `F.start()`

## The world `w` (inside a shot)
- `w.summoner(S, { t?, shadow? })` — draws the figure at shot time (or `t`), with a contact shadow.
- `w.trace(S, t0, t1, { w, reach, lift, floor, dry, splat, seed, fade: { at, d }, n })` — the ribbon the brush lays from
  `t0` to `t1`; it grows as `lt` passes. `reach` (m or `u => m`) flings it beyond the brush; `floor` clamps its height.
- `w.ink(rib, { head, fade })` — a free ribbon (`I.rib(I.arc(...))`, `I.rib(I.path(...))`); `head` 0…1 painted, `fade` 0…1 evaporated.
- `w.floorInk(rib, { head })` — a ribbon lying on the floor (drawn under everything, reflected nothing).
- `w.beast(B, { t? })` · `w.puffs(I.billow(lt, {...}))` · `w.drops(I.drops(lt, {...}))` · `w.shadow([x,0,z], r, a)`

## Ink (`lib/ink.js`)
- `I.arc(c, r | u => r, a0, a1, e1, e2, n, { twist, wobble, rise, seed })` — a circle/arc/spiral in the plane (e1, e2).
  For a ring lying on the floor: `e1 = [1,0,0], e2 = [0,0,1], { twist: π/2, wobble: 0 }`.
- `I.path(ctrl, n, axis | (u, tangent) => axis)` — a Catmull-Rom path; also the path serpents and birds follow.
- `I.rib(shape, { w | w(s), seed, dry, splat, wash, tone, alpha, bristles, entry, tail, sheen, ink })`
- `I.billow(lt, { at, t0, n, every, r0, grow, life, rise, spread, a, dir, seed })` → puffs
- `I.drops(lt, { at, t0, n, dir, speed, cone, size, spread, seed })` → `{ air, floor }` (pass to `w.drops`)

## Summoner (`lib/summoner.js`)
- `summoner({ mask: 'oni'|'fox'|'noh'|'crow', keys, hair, robe, staffLen: 2.55, brushLen: .5, strands: 34, colors })`
- `moves([[t, 'pose', { overrides…, e: 'io' }], …])` — `POSES`: ready · coil · sweepR · sweepL · overhead · chop ·
  lowSweep · thrust · plant · spinHigh · spinLow. Params: `x z yaw crouch jump lean side twist stance step sY sP gx gy gz look lookP`.
- `S.rig(t)` (joints, staff `D`, `brushMid`, `tipEnd`, `head`…), `S.tip(t, reach)`, `S.trace(t0, t1, o)`.

## Beasts (`lib/beasts.js`)
- `quadruped(PRESET.tiger | PRESET.wolf | {...}, keys)` — keys `{ t, x, z, yaw, gait (0 stand … 1 run), roar (0…1), crouch,
  rear, lift, look, lookP, form }`. The gait phase comes from the distance travelled, so feet don't slide.
  Preset params: `len sh hip leg head r tail tailW stripes ears ('round'|'point') snout ruff stride body base hi stripe`.
- `serpent(PRESET.dragon | PRESET.koi | {...}, path, keys)` — keys `{ t, along (m of path the head has travelled), form,
  roar, wave }`. Params: `len r legs antlers whiskers crest scales fins fat body base hi belly smoke` (smoke 0 turns the trailing ink smoke off).
- `bird(PRESET.crane | PRESET.phoenix | {...}, path, keys, { phase })` — keys `{ t, along, form, flap (beats/s), glide }`.
  Params: `span body neck beak legs tail plumes body0 shade tips`.
- `brush(ctx, v, pts, widths, { dry, wash, tone, ink, bristles, tail, entry, seed })` — paint any new body part.

## Score (`lib/score.js`)
`{ pad, strings, bass, flute: [{ t, d, n, v, bend }], drums: [{ from, to, bpm, div, pattern: 'x..k..s.o..kx.s.', v }],
sfx: [{ t, type, d, v, pan, dir, f }], air: [{ t, v }], reverb: { mix, room } }`. sfx types: taiko · boom · shime · ka ·
gong · riser · brush · splash · roar · dragon · whoosh · rumble · thump · flutter · chime · chirp · rustle · flicker.
