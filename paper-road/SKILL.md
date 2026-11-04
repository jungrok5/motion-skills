---
name: paper-road
description: Make a papercraft stop-motion "road trip" film drawn entirely in code — a toy car drives a paper road that is made just ahead of it, either unrolled from a paper roll (over hills, round a loop-the-loop) or inked onto the paper floor by a fountain pen, while cut-paper mountains fold up, clouds drop in and a paper sun rises against a teal paper wall. Poses are held on twos with a per-pose jitter so it reads as hand-animated stop-motion; a small 3D camera follows the car, pushes in and pulls back on the whole trip. Outputs a live page and a 1920×1080 MP4 (optional soundtrack). Use when asked for a papercraft / paper-cut animation, a stop-motion look, "the road draws itself", a pen drawing the path a vehicle follows, an imaginative paper world, or to recreate this genre from a reference video or prompt ("페이퍼 크래프트 애니메이션", "종이 공예 영상", "스톱모션 느낌", "길을 그리며 달리는 자동차", "펜으로 길을 그려", "종이 길", "paper craft animation", "stop motion road trip", "draw a road", "paper cut-out world", "the pen draws the road ahead"). Source — made from https://x.com/Artedeingenio/status/2117001260205543520.
---

# paper-road

Papercraft stop-motion road trips drawn with Canvas 2D under a small perspective camera. The world is a diorama: a teal
paper wall, a cream paper floor (y = 0), stand-up paper cards (mountains, clouds, a sun, trees, signs, the car) and a road
built like turtle graphics (`go`, `pitch`, `yaw`) that only exists up to `reveal(t)`. On paper it is a ribbon with a
printed road, shaded by which side faces the camera and led by a shrinking paper roll; on the floor it is ink, led by a
fountain pen. Cards are ordinary 2D drawings under an affine transform, so they fold up, drop and scale in with a springy
overshoot. Every frame is a pure function of `t`; poses hold on twos (`steps: 12` at 24 fps) and every card boils a
little per pose, which is what makes it read as stop-motion instead of CG.

Built in this repo on the worked example `examples/draw-a-road` (30 s), after an AI-generated papercraft clip shared on X
(@Artedeingenio, Nov 2026: *"Let's go for a drive. And if the road ends, we'll just draw a new one."*). Only the idea is
borrowed — the car, the driver, the story beats, the timing and every prop here are this repo's own code.

## What's in this folder
| path | what |
|---|---|
| `lib/paper.js` | the engine (`window.PR`): `PR.create()` → the film `R`; `PR.path()` (the road), `PR.track()` (keyframes, monotone), `PR.runMax()`; `R.road`, `R.card`, `R.pen`, `R.confetti`, `R.camera`, `R.follow`, `R.check`, `R.start`; paper grain, cheap blur (`R.soft`), depth of field, post (vignette, exposure flicker, grain) |
| `lib/kit.js` | paper props (`window.PK`): `car` (toy car, driver, wave), `mountain`, `range`, `cloud`, `sun`, `pine`, `hill`, `sign` |
| `templates/scene.html` | a commented 12 s starting scene: paper road → roll → bump → pen |
| `scripts/new-scene.mjs` | start a project: `lib/` + `scene.html` (from the template or `--from draw-a-road`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 4,12.5`), a contact sheet (`--sheet 12 [--from --to]`), or the MP4 (`--audio file` to mux a soundtrack); reuses held frames |
| `scripts/check.mjs` | proves the page: loads clean, same t → same pixels, frames in one pose identical, every `R.check` rule holds at every frame |
| `references/` | **LOOK** (the paper look, palette, reading a reference, shot grammar) · **KIT** (engine + prop API, writing a prop) · **LESSONS** (what broke and the fix) |
| `examples/draw-a-road/` | the worked example (30 s): road's end → roll unrolls over a hill and a loop → pen inks the rest → pull back |

## Project layout (what you create)
```
my-trip/
  scene.html     the film: PR.create(…), the path, the tracks, R.road / PK.car / R.pen, scenery, R.camera([...]), R.start()
  lib/           copy of the skill's lib/ (new-scene.mjs)
  out/           stills, sheets, scene.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs scene.html --stills 3,8`.

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install. 30 s renders in about two minutes
on a CPU box (half the frames are held poses and cost nothing).

## Workflow
1. **Brief → beats.** Settle the traveller (a toy car by default; any card works), the colour (one warm accent against
   teal and cream), and 4–6 beats with times, e.g. *arrive at the road's end → the road is made ahead → a set piece
   (hill, loop, drop) → the hand-off (paper runs out, the pen takes over) → the pull-back on the whole trip.* With a
   reference video, extract a contact sheet first (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=5x6 sheet.jpg`), list its
   beats and palette (`references/LOOK.md` → "reading a reference"), then plan your own — never copy a character or a shot.
2. **Start**: `node <skill>/scripts/new-scene.mjs my-trip` (or `--from draw-a-road`).
3. **Build the road** with `PR.path()` and `mark()` every place you will time against. Keep loops ≥ r 200 with `dz ≥ 1.5×`
   the ribbon width; keep `pitch` bends ≥ r 400 (a toy car on a tight bend looks wrong).
4. **Time it with two tracks**: `carS = PR.track([[t, s, 'stop'?], …])` (where the car is) and a lead
   (`reveal = PR.runMax(t => carS(t) + lead(t), DURATION)`, how far the road exists). State the rules with `R.check`
   (the car stays ≥ 95 behind the head; the pen is down before ink starts; the road is complete before the pen lifts).
5. **Add the road, car, pen**: `R.road(path, {reveal, roll: {t}})`, `PK.car(R, {path, s: carS})`,
   `R.pen({at: t => path.at(reveal(t)).P, in, out})`. The pen's `in` is ≥ 0.7 s before the first ink.
6. **Scenery back to front**, popping up as the car gets near: `PK.range(R, {…, pop: {t: x => whenX(x - 650)}})`, clouds
   that `drop`, a `sun` that rises from behind the floor (`y: t => …`, it is clipped at y = 0). A still after each step:
   `render.mjs scene.html --stills 4,9,14` (~2 s).
7. **Camera**: keys `{t, target, dist, yaw, elev, fov}`; `R.follow(car.pos, lag, offset)` for a trailing target, a fixed
   point to frame a set piece, a big `dist` for the final pull-back. Elevation 12–16° on paper (lower and the ribbon
   reads as a line), 6–10° for low close-ups on the ink.
8. **Contact sheet**: `render.mjs scene.html --sheet 12` (whole film) and `--sheet 12 --from 10 --to 14` around each set
   piece. Nothing important leaves frame, the roll/pen is in frame while the road is being made, no card pops in view
   without a reason.
9. **Check**: `node <skill>/scripts/check.mjs scene.html` must print only `ok`.
10. **Render**: `render.mjs scene.html` → `out/scene.mp4`. Watch it once end to end. For sound, generate or bring a track
    (e.g. ElevenLabs: a light ukulele/whistle music bed, pen scratch, paper rustle, a tiny engine putter) and mux it with
    `--audio track.mp3`; say what you generated.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames. Choices are made once with `PR.rng(seed)`;
  jitter comes from `R.boil(id, amp)` (changes once per pose). `check.mjs` catches violations.
- **Stop-motion is the hold.** Keep `steps: 12` at 24 fps (on twos) for the whole film, camera included; `steps: 24` only
  for a deliberate fast beat. Do not add motion blur.
- **The road is made, never moved.** It exists up to `reveal(t)` (non-decreasing — use `runMax`), the car never passes its
  head, and something visibly makes it: the roll on paper, the pen on ink. Keep that maker in frame while it works.
- **Paper, not vector art.** Every card has an ink outline (2–2.6 units), a drop shadow, the paper grain and the per-pose
  boil; colours are flat with one fold of shade. One warm accent (the car, the sun); everything else teal + cream + kraft.
- **Pop-ups have a reason**: they fold up as the car approaches (`whenX(x − 650)`) or on a beat, with `backOut`
  overshoot ≈ 0.5 s; never pop in the middle of the frame at rest.
- **Cheap blur only.** Use `R.soft` (or depth of field, which uses it); never `ctx.filter = 'blur()'` — it is ~20× slower in
  a headless canvas.
- **Check by looking and by numbers**: a still after each change, sheets before rendering, `check.mjs` must pass.

## Contract every scene page fulfils
`window.seek(t)` draws frame t; `window.DURATION`, `window.FPS`, `window.STEPS`, `window.SIZE = {W, H}`,
`window.frameKey(t)` (frames with the same key are identical), `window.runChecks()`, `window.__ready = true` — all set by
`R.start()`. `?render=1` = 1920×1080 canvas, no live loop; `?t=12.5` = one frozen frame; `?steps=0` = smooth motion (for
debugging timing); `?off=dof,shadow,texture,grain,vignette,flicker,boil,road,roll,pen,confetti,band,<card name>` switches
parts off. The live page fits the window, plays on the video's pose grid and loops; click or space pauses.
