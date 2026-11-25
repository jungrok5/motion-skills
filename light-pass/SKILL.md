---
name: light-pass
description: Lay art-directed sunlight over another piece — god rays through trees, windows or slats, light pooling on the ground, a halo and a grade — the way a compositor masks light beams by hand in After Effects, but as a plan of numbers drawn by WebGL 2 over any canvas, video or still. Use it as an effect inside other work, live (a canvas piece calls lp.draw() after each frame) or offline (apply.mjs lights an MP4 or stills). Give it a shot and the light you want and it designs the beams, pools and grade for that shot. Triggers - "light shafts", "god rays", "sun beams", "volumetric light", "add sunlight", "light pass", "빛줄기", "햇살 효과", "빛 내림", "숲에 햇빛", "갓레이", "조명 효과 넣어줘", "빛 연출". Source — made from https://x.com/manwon_man/status/2124697362719453604?a=qHwbQc4rVBlcbntyv64&s=19
---

# light-pass

An effect, not a piece: it takes a picture someone else made — a canvas drawn by another skill, a rendered MP4, a still —
and lays sunlight over it. The light comes from a **plan** (`plan.json`): where the sun is, which shafts fall from it
through which gaps, where they pool on the ground, how warm the picture turns. `lib/lightpass.js` draws that plan with one
WebGL 2 context of its own in three passes: a mask of where light gets through (bright, pale, high in the frame), light
scattered away from the sun across those gaps, and a composite of hand-placed wedge beams, elliptical pools, a halo, haze
and a grade. The same plan and `t` always give the same picture, so it works frame by frame in a film and live in a page.

Made from [@manwon_man's post](https://x.com/manwon_man/status/2124697362719453604?a=qHwbQc4rVBlcbntyv64&s=19): a forest
shot lit in After Effects by drawing a masked path for every beam, then shaping its curve and spread, plus elliptical masks
for the glow on the ground. light-pass keeps that method (each beam a shape you place, the light designed shot by shot) and
turns the masks into numbers, adding what a mask cannot do — the scattered rays that follow real gaps as the picture moves.

**Fixed (the style):** light from one sun per shot; beams that fan from it, narrow at the source and widening; pools where
beams land; light that adds without blowing out; a gentle shimmer, never a strobe; the mask view for placing shapes; the
checks below. **Designed per shot:** where the sun is and how it moves with the camera, which gaps it comes through, how
many beams and how wide, where they land, the light's colour and the grade (a warm forest morning, a cold winter sun
through slats, haze at dusk), how strong.

## What's in this folder

| path | what |
|---|---|
| `lib/lightpass.js` | the effect: `LightPass.create(canvas)` → `lp.draw(source, plan, t)`; `lp.view = 'lit' \| 'mask' \| 'off'`; `lp.overlay(hostCanvas)` |
| `scripts/apply.mjs` | light stills, a folder of frames, or an MP4 (sound kept) offline in headless Chromium |
| `scripts/check.mjs` | judge plans on their frames: beams run from the sun, nothing blows out, the light shows but does not wash, same `t` same picture; contact sheet |
| `references/PLAN.md` | every field of a plan, keyframes, defaults, how to place each shape |
| `references/BRIEF.md` | the brief to fill per shot before writing a plan, and the review questions for stills |
| `references/LESSONS.md` | what went wrong building it and how it was fixed |
| `references/SOURCE.md` | the post it was made from |
| `examples/forest-path/` | a forest path under a tall trunk, warm morning: input frame, brief, plan |
| `examples/walker-clearing/` | a clearing with the sun off frame top left, golden afternoon |
| `examples/snow-cabin/` | a cold low winter sun through a cabin's frame (a different light, designed from its own brief) |
| `examples/live/` | a page: a forest drawn in code, lit live every frame; the stills too; mask view; drag the sun |

The example frames are stills from the `machine-wilds` film (drawn by its own engine, github.com/jungrok5/machine-wilds).

## Project layout (in the piece that uses it)

```
light/
  BRIEF.md            per shot: the light wanted (references/BRIEF.md)
  <shot>/input.jpg    a representative frame of the shot (for placing and checking)
  <shot>/plan.json    the plan; keyframed if the camera moves
lightpass.js          copied from <skill>/lib/ when lit live in the page
```

## Requirements

A browser with WebGL 2 for live use. Offline: Node 18+, Playwright's Chromium, ffmpeg. No GPU needed (SwiftShader).

## Workflow

1. **Shot and light → brief.** For each shot that needs light, write a block in `light/BRIEF.md` (template in
   `references/BRIEF.md`): what the shot is, where the light comes from (sun high or low, in frame or off it, time of
   day), what it comes through (canopy gaps, a window, slats, a doorway), what it should do for the shot (lead the eye to
   the walker, reveal depth, a cold lonely morning), colour, strength, and whether the camera moves.
2. **Grab a frame.** One representative frame per shot as `light/<shot>/input.jpg` (`ffmpeg -ss <t> -i shot.mp4 -frames:v 1`,
   or `canvas.toDataURL()` from a live piece).
3. **Place the light in the mask view.** Start a plan from `references/PLAN.md` (or a nearby example as a starting point
   only). Put the sun where the brief says, then the beams: 3–7 main ones and 1–3 thin ones, each from a gap toward where
   it lands; then pools where they land; then halo, haze, shade and grade. Look at it with
   `node <skill>/scripts/apply.mjs light/<shot>/input.jpg light/<shot>/plan.json out/<shot>-mask.jpg --view mask` and
   `… out/<shot>-lit.jpg`, or live in `examples/live/` (drag the sun, toggle mask and off).
4. **Check.** `node <skill>/scripts/check.mjs light/<shot> [light/<other> …] --sheet out/light-sheet.jpg` must print
   `check OK`. Then look at the sheet against the review questions in `references/BRIEF.md`.
5. **Moving camera.** Keyframe the sun (and beams if needed) over the shot's time: `"sun": [[0, [0.44, 0.02]], [3, [0.30, 0.04]]]`.
   A 3D piece should instead hand the sun's projected screen position each frame (see Contract), so the light stays on the sun.
6. **Put it in the piece.** Live: draw the piece, then `lp.draw(pieceCanvas, plan, t)` on a canvas laid over it.
   Offline: `node <skill>/scripts/apply.mjs film.mp4 light/<shot>/plan.json out/film-lit.mp4 --from <s> --to <s>` per shot,
   or light the whole cut with one keyframed plan. Look at the result at full size and at phone size.

## Rules

- **Design the light for this shot.** A forest morning, a winter window and a dusk haze are different plans; never drop in an
  example plan because it is close. The examples show the style, not a menu.
- **One sun, one direction.** Every beam fans from the sun: its line passes near the sun (`check` allows 25°). A second
  source (a window, a lamp) is marked `"free": true` and named in the brief.
- **Narrow at the gap, wider where it lands**, brighter near the source, fading along its length; uneven widths and spacing
  (3–7 main beams, 1–3 thin) — even, parallel stripes read as a pattern, not light.
- **Light needs something to pass.** Beams start at gaps the picture actually has (sky between leaves, a window, a slat);
  pools sit where beams land, on the ground or a wall, flattened to its plane.
- **Add, don't wash.** The light is a screen over the picture plus a little `shade` where it misses; whites do not grow
  (≤ 2 % blown), shadows stay dark (darkest tenth ≤ +0.12), mean change 1.5–18 %.
- **Colour follows the hour.** Warm low sun = amber light, warm grade; high noon = near white, little warmth; winter = blue
  white light, cool grade (`warm` < 0); moonlight = pale blue, low gain.
- **Movement is slow.** Shimmer ≤ 0.4 and drift ≤ 0.5 rad/s; the light breathes, it never flickers. A moving camera keyframes
  the sun or hands its projected position — light glued to the screen while the world slides is wrong.
- **Deterministic.** Everything is a function of `t`; the scatter's jitter is seeded by the frame counter, reset per still.
- **It is an effect.** It never redraws the piece, never adds objects, and its own canvas is the only thing it touches.

## Contract

```js
const lp = LightPass.create(outCanvas, { preserve: false });   // its own WebGL 2 context
lp.draw(source, plan, t);    // source: canvas | video | image | ImageBitmap at its own size; t in seconds
lp.view = 'lit';             // 'mask' shows beams, pools and the sun as outlines; 'off' shows the source untouched
lp.overlay(hostCanvas);      // optional: lay outCanvas over the host's canvas, same size and place
```

- Call `draw` right after the piece draws its frame (same task), so a WebGL host's buffer is still there.
- A three.js piece projects its sun each frame: `const s = sunWorld.clone().project(camera); plan.sun = [(s.x + 1) / 2, (1 - s.y) / 2];`
- `apply.mjs` lights frame `i` of a video at `t = i / fps` (24 by default), the same time a keyframed plan uses.
- The plan is plain JSON (`references/PLAN.md`); unknown fields are ignored, missing ones take the defaults listed there.
