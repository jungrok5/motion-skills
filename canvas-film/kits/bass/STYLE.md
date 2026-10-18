# 솔 바스 그래픽 (Saul Bass graphic title sequence)

Slug `bass` · kit `kit.js` → vendored as `scenes/kit-bass.js` · global `window.Bass` · first film: 문틈 C
(`sermons/2026-10-18-1cor5/film/scenes/door-c.html`). Source briefs: OPUSCAR no. 33 *The Apartment* (Saul Bass line
titles in black & white) and lemo-opuscar `styles/spy-titles/STYLE.md` (cut paper, stops on the beat).

## What it looks like
A 1960s title sequence cut out of paper. The ground is flat ink black. Thin grey **title lines slide in and build a set**
in strict one-point perspective: a baseboard sweeps out, posts grow up, a floor grid grows toward the camera. Flat grey
planes fill in. **Light is a flat paper shape**: it falls through a gap along true rays and shadows are cut out of it.
Every edge is **scissor-cut** (a slightly wobbly, hand-cut line). One sheet of paper texture is multiplied over the
whole frame. There is **one flat red**, and nothing else is coloured. Motion is decisive: moves **stop dead on the beat**,
cut-outs move **on twos**, a slam is a **two-frame negative**, and the camera **crash-pushes** onto the detail. Words cut
on and off (never fade), snap in word by word, or ride in on **cut-paper strips** that slide in and stop.

**Carries well:** sharp contrasts (light/dark, in/out, before/after); one decisive turn; a warning; something small that
grows; a threshold (a door, window, gate, road); a hidden presence shown as a shadow; a list of excuses (strips); a
countdown; the one thing that matters (the red); short, punchy Shorts rhythm.
**Carries badly:** tenderness, intimacy, faces and emotion on faces (no faces here); nature, softness, atmosphere,
gradients, painterly light; slow meditation (the grammar wants beats); crowds of detail; several colours of meaning.

## Palette (`Bass.C`, `Bass.RED`)
| token | hex | use |
|---|---|---|
| `ink` | `#0c0b0a` | the ground; silhouettes; shadows cut into light |
| `grey1` | `#38342f` | deepest flat plane (a wall, recesses) |
| `grey2` | `#47423d` | flat plane (a door panel) |
| `grey3` | `#5d574f` | dim light after the dark turn |
| `grey4` | `#a49c90` | small light detail (a knob) |
| `floor` | `#2b2724` | floor grid lines on ink |
| `line` | `#8d867c` | title lines (casings, baseboards, frames) |
| `src` | `#d3ccc0` | source lines, small type |
| `paper` | `#f1ede4` | light, words, caption strips |
| `warm` | `#f4d79a` | a light warming at the resolution (light only; never a second accent) |
| `RED` | `#9c1a1a` | THE accent — one subject or prop only (`Bass.init({ accent })` to change) |

## Type and captions
Noto Sans KR 900 for hook words and strips, Noto Serif KR 900 for scripture, Sans 600 27 px letter-spaced for source
lines (`Bass.FONTS` for `Pilot.run`). Captions sit in the upper third, y ≈ 395–556, centred on x 540; the picture's
subject lives in y 600–1500. End card: the shared `Story.endCard` at y 430 in Serif/Sans paper.

`Bass.captions(ctx, t, SCRIPT.lines, { specs })` works with any `SCRIPT.lines` with no specs at all:
- line 0 → **snap**: half of the words cut on, the rest after 0.7 s (the hook);
- a line with a source → **verse**: one line snaps in word by word (0.14 s/word) with the source + a 64 px rule at
  0.45 s; two lines appear 0.5 s apart, source at 0.9 s under a rule that grows 64 → 520 px;
- every other line → **strip**: a tilted cut-paper strip with ink words slides in from off-frame in 0.2 s and stops dead;
  placements cycle through `Bass.STRIPS` (left/right alternating, ±2–4°).
Override per line with `specs: { 6: { y: 395, lineDelay: beat − from, srcAt: beat − from } }` (times are seconds after the
line's start — tie words to a story beat by passing `beat − from`). Modes/fields are listed above `K.captions` in kit.js.
`Bass.plainCaptions` gives the shared fading captions in Bass type if a film really wants fades.

## Kit API (`window.Bass`, design space 1080 × 1920, units px unless "m")
- setup: `init({ accent, paperSeed, paperScale })`, `W`, `H`, `C`, `RED`, `SANS`, `SERIF`, `FONTS`
- timing: `eo4(x)` snap ease · `snap(t, at, dur=.2)` · `twos(t)` · `flicker(t, at, vals, before=0, after=1)`
- cut paper: `jag(pts, amp, seed, step=9)` · `poly(c, pts)` · `cut(c, pts, color, amp, seed, step)` ·
  `paperShadow(c, pts, dx=5, dy=4, alpha=.35)` · `mirror(half, tail)` · `swipe(c, a, z, 'h'|'v', k, color, seed)`
- lines: `seg(c, a, b, k, color, w)` · `drawOn(c, polyline, k, color, w)` · `gridBuild(c, V, { xs, zFar, zNear, t, at, stagger, dur, color, width })`
- perspective (m): `view({ F, eye, horizon, cx })` → `V.P(x, y, z)`, `V.zAt(py)`, `V.quad(x0, x1, y0, y1, z)`
- light: `ray(L, x, z, zTo)` · `wedge(V, L, x0, x1, zWall, zNear)` · `toFloor(L, [x, y, z])` ·
  `castShadow(V, L, shape, { x, z, width, yTip })` · `floodFront(V, zFront, zWall, opts)` ·
  `lightBegin(cam)` / `lightAtop(fn)` / `lightEnd(ctx)` (the light layer)
- camera: `cam(s, x, y, jx, jy)` · `applyCam(c, cam)` · `crashPush(t, at, to=1.72, dur=.32)` · `pullBack(t, at, to=.6, dur=.75)` · `jolt(t, at, dur=.25)`
- frame/post: `begin(ctx)` · `paperPass(ctx)` · `negFlash(ctx, t, at, dur=.07)` · `fadeOut(ctx, t, dur, fo=.6)`
- words: `captions(ctx, t, lines, { specs, strips })` · `autoSpec(i, line, lines)` · `STRIPS` · `stripCaption(ctx, s, dt, o)` ·
  `wordsLine(ctx, s, cx, y, o, nShow)` · `srcLine(ctx, src, y, a, rule)` · `plainCaptions(...)` · `endCard(ctx, t, card, at, o)`

```js
const S = window.SCRIPT, B = S.beat, V = Bass.view({ F: 1200, eye: 1.5, horizon: 800 }), L = { x: .8, y: 6, z: 7.5 };
function draw(ctx, t) {
  Bass.begin(ctx); const cm = Bass.cam(Bass.crashPush(t, B.turn), 650, 620);
  ctx.save(); Bass.applyCam(ctx, cm);
  Bass.gridBuild(ctx, V, { xs: [-1.2, -.6, 0, .6, 1.2], zFar: 4, zNear: 1.1, t, at: 1, color: Bass.C.floor });
  ctx.restore();
  const lc = Bass.lightBegin(cm); lc.fillStyle = Bass.C.paper; Bass.poly(lc, Bass.jag(Bass.wedge(V, L, -.2, .2, 4, 1.1), 2, 5)); lc.fill();
  Bass.lightEnd(ctx);                                   // (cut shadows into it with Bass.lightAtop first)
  Bass.paperPass(ctx); Bass.negFlash(ctx, t, B.flash);
  Bass.captions(ctx, t, S.lines); Bass.endCard(ctx, t, S.endCard, B.end); Bass.fadeOut(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: Bass.FONTS, init: async () => Bass.init(), draw });
```

## Draw order (keep it)
`begin` → world under the camera (lines, flat planes) → `lightBegin(cam)` light shapes → `lightAtop` (floor lines in
the light, shadows, floods) → `ctx.restore(); lightEnd(ctx)` → cut-outs in front (figures, panels, the red) →
`paperPass` → `negFlash` → `captions` → `endCard` → `fadeOut`. Words go **after** the paper pass so type stays crisp.

## Motion grammar and native moves
- **Open on one line.** A single thin paper line in black (a door's edge, a window jamb), then the set builds itself in
  ~2 s: baseboard sweeps out, posts grow, lintel runs across, the grid grows toward us (`seg`, `gridBuild`, `snap`).
- **Every move lands on a beat** with `eo4` (0.2–0.55 s) and stops dead. No eased drifts, no dissolves.
- **On twos** for cut-outs (a figure sliding in, a shadow, claws, a recoil jerk): `snap(twos(t), at, dur)`. Lines,
  camera and caption strips on ones.
- **Light is a shape.** A gap's light on the floor by true rays (`wedge`, `toFloor`); a presence is a shadow cut out of
  it (`castShadow`, or project the outline with `toFloor`). The light stutters on with `flicker` (on twos).
- **Crash push** onto the decisive detail (0.32 s, ×1.6–1.7), **two-frame negative** on a slam, a seeded **jolt**.
- **Black and silence** after the stab, then the lines **rebuild** the set (replay the build with a time offset).
- **The red arrives last and stays**: swipes that tear on (`swipe`) or a cut disc that lands with a slap.
- **Excuses on strips**: each short line a strip from alternating sides; scripture in serif, word by word.
- **Pull back** for the end card (`pullBack` about y 1400) so the set shrinks under the title.

## Performance (1080 × 1920, Chromium headless, 4 shared CPUs)
- `init`: paper sheet 540 × 960 (≈ 80 ms). Per frame (120 frames × 3, mean / median): door scene 13.8 / 13.3 ms
  before the refactor, 14.4 / 13.7 ms after (+3 %, noise level); template 12.8–14.8 / 13–14 ms. Stills ~1 s each.
- The paper sheet is half-res and scaled up — fibres stay soft enough, and it is 4× cheaper to build.

## Pitfalls
- **Edges that crawl**: `jag` depends only on the edge index and the distance along it, so a cut-out that *translates*
  keeps its cut; one that *scales* or reshapes re-cuts a little each frame. Give every piece a fixed seed; on twos the
  re-cut reads as animation, on ones it shimmers.
- **Paper over words** greys the type: draw words after `paperPass`.
- **Captions that fade** are not Bass — cut on/off. (`Pilot.text` alpha only for the shared end card.)
- **Light layer and camera**: `lightBegin(cam)` applies the camera to the light; composite it with `lightEnd` only after
  `ctx.restore()` of the world camera, or the light is transformed twice.
- **Ink on ink vanishes**: an ink figure needs a grey plane, a light shape or `paperShadow` behind it.
- **Camera push centre**: everything above the centre moves up — centre the push on the top of the subject, or the
  picture climbs into the caption band (y 395–556).
- **Flicker on twos**: compare `twos(t)` with times on the 1/12 s grid — thresholds like 19.58 vs 19.583 silently skip a
  step (the door scene's original `.8` step never showed; `flicker` keeps that exact sequence).
- **Two-line verses**: give the second line its own time (`lineDelay`) when it should land on a story beat.
- **Portrait only by design**: landscape (`?o=h`) pillarboxes the 1080 × 1920 frame in `begin`.
- **Negative flash inverts the red** to cyan for its two frames (it is a `difference` pass over everything). That reads as
  a stab; if the red must stay red, draw it after `negFlash`.
- Swipe seeds: `swipe(…, seed)` uses `rng(300 + seed)` and jag seed `90 + 7·seed` — vary the seed per stroke.

## What a scene author still draws
The story's set (which planes, where the gap is, the light's position `L`), the subject and its parts (silhouette
outlines in metres → `mirror`, articulated pieces as separate cut strips), its acting and beats (`script.js`), any
door/panel hinge geometry, the per-line caption specs where words must meet a story beat, and the sound.
