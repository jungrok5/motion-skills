# ENGINE — shots, elements, values, camera, checks

```js
import { Film, tw, tb, seq, seqb, on, stepped, E } from 'ktc/film.js';
const F = new Film({ bpm, size, paper, ink, colors, tints, fonts, score });
F.prop(name, (K) => object3D);                       // references/KIT.md
F.shot(name, { beats, …options }, (S) => { … });     // in order; each is one cut
F.check(name, (film) => true | 'what is wrong');     // the film's own rules
await F.start();
```

## Film options
| option | default | |
|---|---|---|
| `bpm` | 120 | the grid: one beat = 60 / bpm seconds |
| `size` | `[1350, 1080]` | frame in px (any even size) |
| `paper`, `ink` | `#e8e8e6`, `#0b0b0b` | the two grounds |
| `colors` | `{ red }` | ≤ 3 named accents — the only other colours type, bars and grounds may use |
| `tints` | `{}` | named colours for props and pictures only (`K.mat('steel')`, `K.css('leek')`) |
| `fonts` | `{}` | extra voices: `{ mine: { css: '700 {px}px "My Face"', files: [['My Face', 'assets/x.woff2', { weight: '700' }]] } }` |
| `score` | `{}` | patterns for `score.mjs` (see below) |
| `audio` | — | a track the live page plays in sync after a click |

## Shot options
| option | |
|---|---|
| `beats` | length on the grid (½, 1, 2 …) |
| `bg` | ground: `'paper'` (default), `'ink'` or an accent |
| `cam` | `{ yaw, pitch, dist, target, roll, fov, punch }` — orbit around `target` (degrees; yaw 0 looks down −z, type faces the camera). Or `{ pos, target }`. `punch: 0.06` = a zoom kick on the cut |
| `ground` | y of the invisible floor that catches the shadow (omit for none); `shadow` = its strength (0.2) |
| `light` | `{ az, el, key, fill, env, span }` — key direction (−30°, 42°), strengths (1.9, 0.7, 0.3), half-size of the shadow area (12) |
| `frame` | `[cx, cy, w, h]` in flat units: the 3D world is drawn only in this window; `frameBg` = a colour or `[top, bottom]` |
| `hold` | the end card: allowed to be long and still |
| `mix`, `accent`, `sfx` | for the beat: `'full' 'drums' 'half' 'hats' 'break' 'out'`; a crash on the cut; `'riser' 'hit' 'whoosh'` |

## Layers and units
- `S.type / S.obj / S.img / S.rect` — the **3D world**: your own units, lit props, perspective. Type planes face +z.
- `S.under.*` and `S.over.*` — **flat** layers behind and in front of the world: the frame is 2 units tall, x runs
  −aspect … +aspect (±1.25 at 1350 × 1080), y −1 … +1. `at: [x, y, z]`, larger z is nearer. No props here.

## Elements
Common to all: `at`, `rot` (degrees, x y z), `scale` (number or `[x, y, z]`), `spin` (degrees / s added to `rot`),
`show: [fromBeat, toBeat]` (there or not — nothing fades), `face: true` (world: always turn to the camera).

**`type(text, o)`** — `\n` breaks lines.
| | |
|---|---|
| `font` | `sans` (heavy grotesque, default) · `italic` · `cond` (tall condensed) · `han` (Korean poster black) · `serif` · `brush` · `text` (captions) · `note` (light italic) |
| `size` \| `w` \| `h` | em height in units, or fit the ink box to a width / height |
| `color`, `box`, `pad` | palette names; `box` draws a label behind the word, `pad: [x, y]` in em |
| `align`, `anchor` | `'left' 'center' 'right'`; `anchor: [0–1, 0–1]` = which point of the ink box sits at `at` |
| `track`, `lh` | letter-spacing and line height in em |
| `outline` | stroke only, width in em (≤ 0.09) |
| `pixel` | bitmap letters: rows of pixels per em (10–16) |
| `px` | raster size (192; 96 for `text` / `note`). Raise to 320 for a glyph that fills the frame |
| `read` | the viewer must catch it — the check enforces frame, size and time |
| `chars`, `each`, `fit` | one plane per character. `each(i, n, p, lt, b)` returns `{ at, rot, scale, sx, color, show }` per character; `sx` stretches it and pushes its neighbours, and with `fit` (default) the line keeps its width — the band squeeze |

**`obj(what, o)`** — `what` = a prop name, `(K) => Object3D`, or an Object3D. `cast: false` for things that should not shadow.

**`img(src, o)`** — `src` = `(g, w, h, K) => …` painter, an image URL, or a texture. `w`, `h` in units, `res` px on the
long side (1024), `cut: 0.07` adds a die-cut border (`cutColor`), `lit: true` takes the light.

**`rect({ w, h, color })`** — a bar or block.

## Values
Any of `at rot scale color show bg frame` and every `cam` field is a constant or a function `(p, lt, b)` →
shot progress 0–1, seconds, beats since the cut.
| helper | |
|---|---|
| `tw(a, b, ease = 'slam', p0 = 0, p1 = 1)` | a → b over progress (numbers or arrays) |
| `tb(a, b, ease, b0, b1)` | the same over beats |
| `seq([p, v, ease?], …)`, `seqb([beat, v, ease?], …)` | keyframes; the ease belongs to the segment ending at that key |
| `on(beat, before, after)` | a switch on a beat |
| `stepped(fn, n)` | hold a move on n poses |
Easings (`E`): `slam` (most of the way in the first third, then creeping — the default), `lin`, `in`, `out`, `io`,
`in5`, `out5`, `io5`, `back`, `hold`. Random numbers: `const r = S.K.rng(seed)` at build time, never per frame.

## The beat (`score.mjs`)
`score: { root: 43.65 (Hz), k, s, h, oh, bass, swing, stab, reverb, gain }` — `k s h oh` are 16-step strings
(`x` = hit, `.` = rest, `X` = accent); `bass` uses semitones above the root (`0 3 5 7`, `a` = 10, `b` = 12, `-` = −2);
`stab` = the chord on accents. Per shot: `mix`, `accent`, `sfx`.

## Checks
`F.runChecks()` (geometry, run by `check.mjs`): mean shot ≤ 1.25 s; no empty or sub-2-frame shot; long shots need
`hold`; every `read` word whole in the frame at ≥ 2 of 3 sampled moments, ≥ 24 px, on for max(0.3 s, 0.085 s × syllables);
≤ 3 accents; no off-palette colour on type, bars or grounds; three shots without a word warns; `F.check` rules.
`check.mjs` adds pixels: something drawn (≥ 0.6 %), first frame ≠ last, a cut changes the picture, ≤ 3 light ↔ dark
swings a second, strong colour ≤ 30 % of the film, same t → same pixels.

`film.screenBox(el, t)` returns where an element is on screen — use it in `F.check` for a film's own layout rules.
