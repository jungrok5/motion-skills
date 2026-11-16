# Engine: film, scenes, pieces, camera, checks, contract

```js
import { Film, K, E, tw } from 'alf/film.js';
const F = new Film({ W: 1920, H: 1080, brand: { accent, glow, ground }, mascot: MASCOT, score: { bpm, root, chords } });
F.scene('name', { dur, xf, out, cam, glow, dof, mix }, (S) => { S.add(K.x(...), { at, in, … }); … });
F.check('my rule', (F) => true || 'what is wrong');
F.start();
```

## Stage and camera
- World units are px on the plane z = 0, which the default camera (z = −1000, focal 1000) sees 1 : 1. +x right, +y down,
  +z away from the viewer. A piece at z = 300 is ~23 % smaller and blurred; at z = −200 bigger and blurred.
- `cam: [[t, { x, y, z, rz, focus }], …]` per scene (scene-local seconds, eased in-out between keys). `focus` is the
  sharp distance (default: the z = 0 plane). Always give a scene a slow move (≈ 60–120 units of z).
- Depth of field: blur = `dof` × |distance − focus| / focus (Film `dof` 14, scene `dof` multiplies). Motion blur comes from
  each piece's screen speed. Glows parallax at 12 % of the camera.

## Scenes and hand-overs
- Scenes overlap by `xf` (default 0.6 s). `out` is how this scene hands over to the next: `recede` (default — every
  piece falls back, blurs and fades, staggered), `push` (the camera flies through it; the next scene's camera comes in
  from behind), `whip` (sideways), `rise` (up). `cut: true` is a hard cut — the check warns; the style does not use it.
- `glow: [{ x, y, r, c, a, sx, sy }]` (fractions of the frame; or a function of scene time) cross-fade between scenes.
- `mix: 'full' | 'soft' | 'bare' | 'out'` and `accent: true` steer the score for that scene.

## Placing pieces — `S.add(piece, opts)`
| opt | meaning |
|---|---|
| `at: [x, y, z]` | world position of the piece's centre |
| `in`, `out` | scene-local time it arrives / starts leaving (default out: the hand-over) |
| `enter` | `rise` (default) · `pop` · `fly` · `drop` · `left` · `right` · `fade` · `none`, or an offset object; `enterDur` 0.7, spring |
| `exit` | `recede` · `fall` · `rise` · `past` · `fade` · `left` · `right` · `none`, or an object; `exitDur` 0.55 |
| `keys: [[t, { x, y, z, rx, ry, rz, s, o }], …]` | keyframed offsets over the scene |
| `pose: (lt) => ({…})` | a function added on top (x y z rx ry rz blur add; s o multiply) |
| `rx ry rz s o` | base tilt / scale / opacity |
| `float` | idle drift amount (default 1; nothing is ever still) |
| `sharp: true` | no depth blur (cursor, a headline in front of a swarm) · `hud: true` screen-space |
| `read: true/false` | the check measures this piece as a line that must be read (default from the piece) |
| `readFrom` | when its reading starts, if later than its entrance (stacks do this) |
| `bleed: true` | may run off the frame |
| `quiet: true` | no entrance sound |

Devices on `S`: `S.row(items, { at, gap, focus: [[t, index]], depth, lift, tilt, squeeze, follow })`,
`S.stack(items, { at, every: s | [s, …] })`, `S.carousel(items, { at, radius, step, spin: [t0, t1, deg], face })`,
`S.swarm((i, rnd) => piece, { n, t: [t0, t1], spread, from })`, `S.cue(t, kind)`, `S.rng` (seeded per scene).

## Pieces (`K`)
`headline(text, { sub, size, n: { from, to, at, fmt, d, suffix }, type })` · `input({ placeholder, text, type: [t0, t1] | false,
button: 'arrow' | 'dots' | text, press, w, halo })` · `cursor({ path: [[t, dx, dy]], click: [t] })` · `chat(items, { w, keep })`
with items `{ who: 'agent' | 'user', text, at, think, name, initial, stream, cps }` · `card({ w, pad, tone, halo, parts, stagger })`
with parts `title(text, { badge })` `meta` `line(text, { size, muted })` `foot(text, meta)` `chips(list, { tone, read })`
`swatches([{ c, name }])` `sliders([[left, right, value]])` `stat({ value, fmt, label, caption, at })`
`quote({ text, source, meta, stars, mark })` `bars([{ label, a, fa, b, fb, note }], { at, h })` `rows(list, { cols, head, at, every })`
`progress({ at, label })` `html(html, { read, text, update })` · `chip(text, { icon, iconBg, tone })` · `tag(text, { color, small })` ·
`link(text)` · `poster({ w, h, bg, art, title, size, sub, badge, label })` · `phone({ w, screen })` ·
`persona({ name, role, initials, colors, stats })` · `mascot({ say, nod, size, sparks })`.
Markup in text: `*accent*`, `==highlight==`, `{n}` (counter).

A new piece is `{ node, kind, text, read, cues: [[t, kind, gain]], update(t, lt), pose(t), layout() }` — `update` sets
everything from `t` (time since it came on). Put it in the project (`art.js`), not in the skill's lib.

## Sound cues
Pieces register cues as they are built: `type`, `click`, `pop`, `send`, `blip`, `chime`, `tick`, `swish`, `whip`, `whoosh`,
`swarm`, `swipe`, `rise`, `nod`. `window.cues()` hands them, the scenes and `score` to `score.mjs`.

## Checks
`film.runChecks()` (in the page) and `check.mjs` (pixels) — see SKILL.md Workflow 6. Add the film's own with `F.check`.

## Contract
`window.seek(t)` / `renderAt(t)` draw frame t; `DURATION`, `FPS` (30), `SIZE = { W, H }`, `sceneAt(t)`, `runChecks()`, `cues()`,
`film` (with `mascotSheet()`), `READY = true` once fonts are in and every scene is built. `?render=1` fixed frame at
0,0 (the scripts screenshot `#frame`); `?t=6` one frozen frame; `?scene=name` loop one scene; `?speed=.5`; `?hud=1`;
`?audio=out/film.wav` (play in sync after a click). Live keys: space pause, ← → scene, L loop the scene.
