# KIT — every builder and option

## The poster — `SP.poster(spec)` (in `src/10_poster.js`)
```js
const POSTER = () => SP.poster({
  paper: '#F4F2EC', ink: '#111111', accent: '#FFD23F',
  fonts: { display: { family: 'Archivo Black', weight: 400 }, text: { family: 'Archivo', weight: 400 } },  // more roles allowed
  size: 2048,                 // texture width in px (1600 on a CPU renderer by default)
  draw(P) { … },              // called twice: P.plain = false (hero copy) and true (plain copy for the ribbons)
});
```
Units: 1000 × 1500, y down. `P.W`, `P.H`, `P.paper`, `P.ink`, `P.accent`, `P.dark` (paper darker than ink), `P.plain`, `P.ctx`.

| call | does |
|---|---|
| `P.text(str, {x, y, size, role, weight, align, color, tracking, maxW})` | one line on a baseline; reports overflow of `maxW` or the sheet |
| `P.fit(str, {x, y, w, cap, role, weight, tracking, optical})` | largest size spanning `w` with capitals ≤ `cap`; returns `{size, w, cap, top, bottom}` |
| `P.crop(str, {x, y, size, clip:[x,y,w,h], …})` | giant letters clipped by a box (only part shows) |
| `P.columns(text, {x, y, w, h, cols, gap, size, lead, role, seed})` | running text, repeats to fill; breaks words wider than a column (CJK) |
| `P.halftone(pic, {x, y, w, h, cell, mode, stagger})` | round-dot halftone; `pic` = `(ctx, w, h) => draw grey` or an image; `mode` `'object'` (backdrop → bare paper) or `'photo'` |
| `P.rule(x1, y1, x2, y2, width, color)` · `P.rect(x, y, w, h, color)` | rules and blocks |
| `P.band(x, y, w, h, color?)` | the accent band — drawn on the hero copy only |
| `P.mark('hero', {y0, y1})` | **required**: the hero rows (the hero ribbon, the lunge target) |
| `P.measure(str, o)` · `P.issue(msg)` | metrics · report a problem to `check.mjs` |

Fonts: `node scripts/font.mjs add <project> "<Google family>" <weight>` (or a path to your own file plus a family name).
The build embeds only the unicode-range chunks that cover characters in `src/`.

## The film — `SP.film(F)` (in `src/90_film.js`)
| key | default | notes |
|---|---|---|
| `title`, `fps`, `width`, `height` | —, 60, 1080, 1920 | |
| `cuts` | `{cascade: .5, machine: 2.37, rebuild: 4.4, end: 8}` | the beat sheet; keep the order |
| `poster` | — | `POSTER` (a function returning `SP.poster`) |
| `sheet.strips`, `.jitter`, `.seed` | 26, 0.22, 11 | the cut into horizontal strips (unequal by ±jitter) |
| `sheet.order` | `'top'` | rebuild landing order: `'top'`, `'bottom'`, `'middle'` |
| `sheet.lifts`, `.hold`, `.hookHold` | 3, 0.34 s, 4/60 s | strips that lift while landing · final hold · held frames at the start |
| `sheet.floor` | `{lo: .17, hi: .36, relief: .5}` | floor tones (linear), `tint`, `scale`, `seed` |
| `sheet.scale`, `.camY`, `.lunge`, `.lungeTo` | 4.7, −0.3, 0.29, 0.8 | framing (floor height shown), poster offset, lunge zoom and travel |
| `sheet.key`, `.fill`, `.keyStart`, `.keyEnd` | 3.2, 0.55, … | the key's strength and its drift |
| `cascade.width`, `.printScale`, `.heroScale` | 0.27, 1.5, 0.78 | ribbon width, print scale on ribbons, hero ribbon scale |
| `cascade.layers` | `[[16,.03,0],[18,.15,.03],[8,.24,.07]]` | `[count, arch amplitude, z]` per layer |
| `cascade.floor`, `.roll`, `.fov`, `.dof` | light, −40°, 50.6°, 16 | |
| `cascade.key`, `.back`, `.sky` | 2.6, 1.1, 0.9 | |
| `machine.lanes`, `.feed`, `.start` | 26, 0.75, 0.14 | lanes, paper speed under load, bottom edge above the cut at the start |
| `machine.body`, `.steel`, `.backdrop` | `#18181a`, `#a3a5a9`, `#2b2a28` | |
| `machine.inset`, `.bg` | 0.78, `#ffffff` | inset size and its ground (often the poster's paper) |
| `machine.key`, `.rim`, `.cameraKeys`, `.teeth` | 2.4, 1.6, …, 22 | keys: `[u, [x,y,z], [tx,ty,tz], fov°, roll°]` |
| `studio` | `{top, horizon, ground}` | the environment (reflections in the steel) |
| `grade` | `{exposure: 1, grain: .012, vignette: .13, glow: .35, warm: 1}` | |
| `sound` | `{on: true, lufs: -14, character: {bright: 1, body: 1}, extra(cues, cuts)}` | `extra` may push cues: `{t, kind, …}` |

Sound cue kinds: `rip`, `whoosh` (`f0`, `f1`), `swish`, `pat`, `motor` (`load(t)`, `spin(t)`), `grain` (`load(t)`),
`slide`, `click` (`big`, `f`), `thump`; common fields `t`, `dur`, `gain`, `pan`.

## Scripts
| | |
|---|---|
| `render.mjs <p> --poster` | `out/poster.png` |
| `render.mjs <p> --stills 0,1.3` · `--sheet [n]` | stills (3 sub-frames) · a contact sheet (3 per shot, or n even moments) |
| `render.mjs <p> --draft` | `out/draft.mp4`: half size, 30 fps, 2 sub-frames, with sound |
| `render.mjs <p>` | `out/film.mp4` (60 fps, 4 sub-frames, CRF 16, AAC 256k) + `sound.wav` + `cues.csv` + `cover.jpg` |
| options | `--fps --mb --scale --workers --from --to --crf --name --keep --resume --no-build` |
| `check.mjs <p>` | the automatic review |
| `font.mjs add|prune|list <p>` | fonts |
| `new-film.mjs <dir> [--from toego]` | start a project |
