---
name: speedpaint-replay
description: Make a "making replay" (メイキング再生 / 메이킹 영상 / speedpaint) of one illustration drawn entirely in code. A warm beige page shows a title, six stage chips — rough · line art · flats · shadow · highlight · finish — and a canvas card. A white stylus draws the piece in front of you. Blue construction lines (head circle, centre line, eye line) come first, then tapered pen strokes one by one, then base colours brushed in with a ragged sweeping edge, multiply shadows on clipping layers, screen highlights (hair sheen, rim light, catchlights), and a finish of light, colour grade, bokeh and warmed lines. HTML Canvas, a bundled Korean font, no image files; outputs a live page and a 1080×1220 MP4 (~30–60 s). Give it a subject (a character, a scene, an object) and it designs a new illustration — composition, character, palette, light — and draws it stage by stage; or give it the user's own drawing (reference mode) and the replay draws toward that picture. Use for speedpaint / timelapse / drawing-process videos, "AI drew this in code" reveals, anime-style portrait making-of, illustration process explainers, or to remake this reference style on a new subject ("메이킹 영상", "그리는 과정 영상", "스피드페인팅", "코드로 그림 그리는 영상", "러프부터 채색까지", "선화 채색 과정", "이 영상처럼 주제만 바꿔서", "이 스타일로 ○○ 그려줘", "내 그림으로 메이킹 영상", "making video", "speedpaint replay", "drawing timelapse in code", "draw it stroke by stroke"). Source — made from https://x.com/yohakutoink/status/2120824797215310208?a=-D3pDsiFMNVDxo3e18k&s=19
---

# speedpaint-replay

A page that replays the making of one illustration, as if you were watching a painter's screen recording. The page
is warm beige with a bold title (「메이킹 재생」) and a quiet note on the right ("선도 색도 코드로 그리고 있습니다":
every line and colour is drawn in code). Under it sit six rounded stage chips: 러프 · 선화 · 밑색 · 그림자 · 하이라이트 ·
마무리. The current stage is filled orange and the stages already done turn dark. Below is a white canvas card. A white
stylus with a grey nib moves over the card and draws everything. Thin blue construction lines come first, then the
line art stroke by stroke (each stroke thin at both ends), then base colours brushed in by a sweeping brush with a
ragged edge. Then come shadows on clipping layers, highlights, and a finish of light, colour grade and glow. The rough
fades out as the line art arrives. Nothing is an image file: every line and colour is an item in `art.js`, and every
frame is `seek(t)`, so the same page plays live and renders to MP4.

Made in this repo after an X post by 余白とインク (@yohakutoink) —
https://x.com/yohakutoink/status/2120824797215310208?a=-D3pDsiFMNVDxo3e18k&s=19 (47 s: a model was asked to draw an
anime portrait in code, and the replay page shows it go from a blue head circle to a finished, lit painting; the author
half-suspected it had traced the original). This skill takes the *format*: the page, the six stages and how each one
looks and moves, the stylus. It does not take the portrait or its character (references/SOURCE.md). Worked example:
`examples/rainy-window` 「비 오는 창가」 (47 s: a girl with a black bob by a rainy window at dusk, cool window light, warm
lamp rim). Starter: `templates/` 「아침 커피」 (28 s, a mug in morning light). Reference mode: `examples/reference-mode` 「벚꽃 노을」
(43 s: the replay draws toward a given picture, here an image generated with ElevenLabs). Live: https://jungrok5.github.io/motion-skills/speedpaint-replay/

**Fixed by the style** (every piece): the 1080×1220 page; beige UI, the title, the note, the six chips (orange = now),
the rounded white card with a soft shadow; the stylus that follows the tip of whatever is being drawn, glides between
items and lifts away at the end. The six stages always run in this order, each with its own look:
- rough: thin blue lines, quick and a little loose.
- line art: dark, tapered pen strokes that are thin at both ends.
- flats: a sweeping brush paints them in with a ragged edge.
- shadow: multiply, clipped to the visible part of a region.
- highlight: screen or white.
- finish: light, grade and glow, plus the line art warmed into the colours.

The rough fades out under the line art. No item pops in: lines grow, regions are brushed in, the finish fades.
**Designed per subject** (never reused): what is drawn: the subject, the composition, the pose, the character's look
(hair, eyes, clothes) or the object, the background. Also the palette, where the light comes from and its colour, what
the finish adds (rain, bokeh, sun rays, sparkle, steam), the stage timings (where the viewer lingers), and the chip
language if the audience needs it.

## What's in this folder
| path | what |
|---|---|
| `lib/sketch.js` | `Sketch`: how you author a piece, item by item, stage by stage. `rough` / `ellipse`, `ink` (tapered pen), `flat` (named region), `shadow`, `light`, `glow`, `fx` (custom finish), `inkTint`; helpers `lock` (hair lock: ribbon + edge lines + strands + shade), `eye` (anime eye: white, iris, pupil, lids, lashes, lid shadow, catchlights), `edge` (rim / edge strip), `lens` (sheen strand, glint), `bloom`; `push`/`pop` transforms; `setPose` / `mark` for the body check |
| `lib/sketch.js` (more) | `hatch` (pen hatching inside a region), `shade` (light-direction gradient over a whole region), `dapple` (scattered soft specks), `grain` (paper grain), `markEye` (an eye box for the body check without drawing one); `ink({ passes })` sketchy over-drawn lines; `lock({ strands, fly, passes })` denser hair |
| `lib/reference.js` | reference mode: `addReference(s, REF)` turns a measured image (ref.js) into rough, line, flat, shadow, highlight and a finish "detail brush" |
| `lib/replay.js` | `Replay`: times every item (stage seconds shared by how much drawing each item is), draws the page (header, chips, card, stylus), visible-area clipping masks, the line art layer and its tint, the rough fade, the live player (click a chip to jump), the body sheet, the contract |
| `lib/brush.js` | the marks: `pen` (pressure-tapered filled outline), `pencil`, `fillWhole`, `fillVia` (sweeping-brush reveal through a mask, blend mode, blur) |
| `lib/core.js` | seeded random, easing, Catmull-Rom spline, resample, arc, bbox, normals, transforms, colour |
| `lib/fonts/` | Pretendard SemiBold + Bold (KS X 1001 subset: all 2,350 common Hangul + Latin), OFL licence beside them |
| `templates/` | 「아침 커피」 starter: `index.html`, `art.js`, `BRIEF.md`. This is what `new-piece.mjs` copies |
| `examples/rainy-window/` | the worked example: `BRIEF.md` (design + review log), `index.html`, `art.js` |
| `examples/reference-mode/` | reference mode: `reference.jpg` (the picture it draws toward), `ref.js` (measured), `art.js`, `BRIEF.md` |
| `scripts/from-image.mjs` | reference mode: image → `ref.js` (posterised flats, measured shadows and highlights, traced line art, rough contours, detail dabs) |
| `scripts/new-piece.mjs` | start a piece (starter, or `--from rainy-window`) |
| `scripts/render.mjs` | stills, `--stages` (end of each stage + finished), contact sheets, the MP4 (workers × ffmpeg) |
| `scripts/check.mjs` | loads clean; every stage has items and time; every item leaves a mark; no fill pops in; stylus on the card; covered, not black or blown out; glyphs; deterministic; body check + body sheet |
| `references/` | **SOURCE** (the post, beat by beat; what is / is not taken) · **BRIEF** (template + still rubric) · **LOOK** (the page, stages, timing, colour) · **DRAWING** (how to draw a piece in items: API, order, layering, faces, hair) · **REFERENCE** (reference mode: what may be used, how it measures, how to tune) · **BODY** (pose and body check) · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md     subject → design: composition, character / object, palette, light, finish, stage timings, review log
  art.js       export function art() → a Sketch: rough → line → flats → shadow → highlight → finish
  piece.html   new Replay(art(), { stages, hold, labels }).start()
  lib/         copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("sp/")
  out/         stills, sheets, body sheet, piece.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs piece.html --stages --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flag.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.3 s a frame on a CPU).

## Workflow
1. **Subject → brief.** Write `BRIEF.md` from references/BRIEF.md before any code. Fill in:
   - the ONE LINE: who or what, doing what, in what light.
   - the COMPOSITION: crop, where the subject sits, which way it faces, what is behind.
   - the DESIGN: the character (hair shape and colour, eyes, clothes, one detail that makes them theirs) or the object.
   - the PALETTE: base, shadow, highlight per material, plus the two lights: key (colour, side) and rim or bounce.
   - the FINISH: what the last stage adds that says the mood (rain on glass, sun rays, steam, petals, a neon sign).
   - the TIMINGS: seconds per stage. Line art is the longest stage; the finish is short and sure.

   If the user brings a reference video, extract stills (`ffmpeg -i ref.mp4 -vf fps=1/2,scale=360:-1,tile=6x4
   sheet.jpg`), note what the stages do, then design your own picture.
   **Reference mode** (the user gives a picture and wants the replay to draw *that*): note where the image came from
   in BRIEF.md, then `node <skill>/scripts/from-image.mjs drawing.png --out ref.js` and start from `--from reference-mode`. The
   rough, line art, flats, shadows, highlights and a finish detail brush are measured from the picture
   (references/REFERENCE.md). You still own the timings, the finish, and the body marks. Then continue at step 8.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-piece` (or `--from rainy-window`, or `--from reference-mode`).
3. **Rough**: blue construction in the order a painter would make it. For a figure: head circle, jaw, centre line
   (curved by the turn), eye / nose / mouth lines, eye ellipses, neck, shoulder line, hair silhouette. For an object:
   axis, ellipses, boxes. Render `--stills 4` and fix the proportions *here*. Everything after is laid on it.
4. **Line art**: `s.ink` stroke by stroke, then the hair with `s.lock` (5+ `strands`, a `fly` or two, `passes: 2` for a
   hand that goes over the line), eyes with `s.eye`. Author the head upright inside
   `s.push(HEAD)` and lean it with the transform. Thick outer contours, thinner inner lines, tapered ends. Keep every
   line inside the 1000 × 1000 picture (check.mjs fails a stylus off the card).
5. **Flats**: one named region per material (`s.flat('skin', …)`, `'hair'`, `'knit'`, `'wall'`), with `z` for paint
   order and `order` for time order. Paint the character first and the background last. Then render the flats stage
   (`--stages`): it should already read as a clean picture.
6. **Shadow → highlight**: shapes clipped to regions (`clip: 'skin'`), so they may be loose. The clip uses the *visible*
   part of a region, so a neck shadow never darkens the chin. Light comes from the brief's key side: crisp cel shadows
   (blur 1–2) on skin and cloth, a cast shadow under bangs and chin, rim light on the far edge (`s.edge`), and sheen
   strands along each lock (`s.lens` with `abs`), a light-direction gradient over each material (`s.shade`), pen
   hatching for line-art shading (`s.hatch`).
7. **Finish**: `s.glow` / `s.bloom` / `s.fx` for light, mood and grade; `s.inkTint` to warm the lines into the colours.
   A full-canvas glow must cover the whole picture, with the falloff in the gradient (a hard polygon edge shows as a
   band).
8. **Review stills**: `render.mjs piece.html --stages` and `--sheet 24 --scale .5`, then score each with the rubric in
   references/BRIEF.md. Look at the face at full size (crop it). Log what failed in BRIEF.md, fix it, render again.
9. **Check**: `node <skill>/scripts/check.mjs piece.html` must end with `all checks passed`. For a character, open
   `out/<name>-body.png` and answer its question for each panel (references/BODY.md).
10. **Render**: `render.mjs piece.html --workers 4` → `out/piece.mp4`. Look at stills pulled from the MP4. The source
    is silent; add music only if the user asks (`--audio music.wav`).

## Rules
- **Design per subject.** The mug and the rainy-window girl are examples of the style, not menus. A new subject gets
  its own composition, design, palette, light and finish. Reuse the *helpers* (`lock`, `eye`, `edge`, `lens`), never
  another piece's coordinates.
- **One style.** Every piece goes through the same six stages with the same marks. New things you draw use the same
  pen (tapered ink), the same brushed flats, clipped shadows and screen highlights. Don't add photos, image files,
  traced bitmaps or a second UI look.
- **Every stage is shown, in order.** All six have items and time. The rough appears first and fades. Lines are drawn,
  not faded in. Flats and shadows are brushed in, not switched on (check.mjs fails a fill that pops). The finish is the
  only stage that may fade.
- **Every mark is a code item.** A designed piece is drawn from its brief; reference mode draws toward the given
  picture. Either way nothing is a pasted or faded-in bitmap, so the note on the page stays true.
- **Bodies are possible.** A character turns one way as a whole: the far eye is narrower, and the nose and chin point
  the way the face turns. The ear sits on the back of the head. The neck stays within 90° of turn and 45° of tilt from
  the torso, and the shoulders within 30° of level. `s.setPose` + `s.mark` + `s.eye` let check.mjs prove it.
  Review the body sheet every time you change the rig of a face (references/BODY.md).
- **Inside the picture.** Art units are 0…1000 square. Lines, rough and brush sweeps stay on the card; big background
  regions may overhang, and the brush is clamped to the picture.
- **Pure function of t.** No `Math.random`, `Date` or state between frames: `s.r` (seeded) for layouts, everything else
  from `t`. check.mjs proves determinism.
- **UI text in the bundled font.** Korean and English labels are built in (`labels: 'ko' | 'en'`). For another
  language, bundle a font that has its characters, or check.mjs fails the glyphs.

## Contract every replay page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS`, `window.SIZE = {W: 1080, H: 1220}`, `window.runChecks(t)` (names of
broken rules), `window.stageAt(t)`, `window.itemCheck()` (items that leave no mark), `window.glyphCheck()`,
`window.replayInfo()` (stages, items, pose, marks, eyes), `window.replay`, `window.__ready = true`, all set by
`R.start()` after the fonts load. `?render=1` = fixed canvas, no live loop; `?t=20` = one frozen frame;
`?scale=.5` = preview size; `?off=stylus`; `?sheet=body` = the body sheet. The live page fits the window and loops:
click/space pauses, a click on a chip jumps to that stage, ← → jump 3 s, the bar scrubs.
