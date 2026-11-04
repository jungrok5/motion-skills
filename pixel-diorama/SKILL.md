---
name: pixel-diorama
description: Make an animated pixel-art diorama that loops seamlessly — a cozy little world (a floating island, a cabin, a campfire, a character) on a rainy or snowy night, drawn entirely in code on a small canvas and scaled up crisp to 1080p or 4K; rain, lightning, fire sparks, drifting smoke, flickering window and lantern light with a strong warm/cold contrast. Outputs a live page, a one-loop MP4 that repeats without a visible seam, and a 10-hour video (optionally with music) for lofi / ambience / study streams. Use when asked for a pixel-art loop, a lofi cover or background, an ambient looping scene, a "10 hour" video, a cozy pixel scene, or to recreate a pixel-art scene from a prompt or reference ("픽셀아트 루프", "로파이 영상 배경", "10시간 영상", "픽셀 디오라마", "비 오는 픽셀아트", "루프 영상 만들어줘", "pixel art loop", "lofi cover", "animated pixel diorama", "looping ambient scene"). Source — made from https://x.com/zer0point_eth/status/2116832762912973220.
---

# pixel-diorama

Animated pixel-art dioramas built to loop forever: one HTML page draws a scene into a 480×270 canvas using integer-only raster
helpers (no antialiasing, no image files), then one post pass adds stepped light pools, soft glows, lightning flashes and a
dithered vignette. Every frame is a pure function of `t`, and every period inside the scene is snapped so it divides the loop,
so `seek(LOOP)` draws exactly the pixels of `seek(0)`. The renderer grabs the tiny frames with Playwright and lets ffmpeg scale
them ×4 nearest-neighbour into a 1920×1080 H.264 loop (×8 = 4K); `extend.mjs` repeats that loop into a 10-hour file without
re-encoding, with music underneath if you give it one.

Built in this repo on the worked example `examples/halloween-rain` — a floating island with a cabin, a campfire, a skeleton
under a red umbrella, jack-o'-lanterns, lanterns in a bare tree, wisps, a waterfall, rain and lightning — made from a prompt
shared on X (@zer0point_eth, Nov 2026): *"an animated pixel art Halloween diorama, built to be the looping cover for a 10 hour
lofi music video … strong warm/cold contrast: a cold, rainy night against warm pockets of firelight and glowing windows …
rain, fire sparks, drifting smoke and flickering light … crisp full screen at 1080p and loop smoothly for hours."*
The scene and every prop here are this repo's own code; only the prompt is borrowed.

## What's in this folder
| path | what |
|---|---|
| `lib/pixel.js` | the engine (`window.PD`): `PD.create()` → the diorama `D` with loop-safe time (`D.phase`, `D.wave`, `D.noise`, `D.flicker`, `D.step`), layers (`D.add`, static ones cached), lights (`D.light`), flashes, `D.particles`, the post pass and the page contract; raster helpers (`rect`, `px`, `line`, `disc`, `ellipse`, `poly`, `ditherRect`, `ditherDisc`, `paint`, `gradient`, `sprite`), seeded `rng`, `hash`, `bayer`, colour `ramp` / `mix` |
| `lib/kit.js` | props (`window.K`) drawn in code, each adding its own layers and lights: `sky`, `stars`, `moon`, `clouds`, `hills`, `mist`, `lightning`, `island`, `roots`, `crystal`, `pond`, `waterfall`, `house`, `smoke`, `lampPost`, `campfire`, `tree` (+ hanging lanterns), `pumpkin`, `grave`, `bats`, `wisps`, `skeleton` (+ stump, mug, umbrella), `rain`, `splashes`; winter: `snow`, `pine`, `snowman`, `aurora`, `house({ snow })`; the palette `K.PAL` |
| `templates/scene.html` | a commented starting scene (a ledge, a lamp, rain) |
| `scripts/new-scene.mjs` | start a project: `lib/` + `scene.html` (from the template or `--from <example>`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 0,17.3`), a contact sheet across the loop (`--sheet 8`), or the loop MP4 (`--scale 4`, `--gif 6` preview) |
| `scripts/loop-check.mjs` | proves the loop: `seek(LOOP) === seek(0)` pixel for pixel, same `t` → same pixels, the seam step is an ordinary step |
| `scripts/extend.mjs` | repeat the loop MP4 to `--hours 10` (stream copy, seconds), optional `--audio` looped under it |
| `references/` | **LOOK** (the warm/cold recipe, palette, light, composition, motion budget) · **KIT** (engine + prop API, how to write a prop) · **LESSONS** (what broke and the fix) |
| `examples/halloween-rain/` | the worked example (60 s loop): the prompt above |
| `examples/first-snow/` | the same kit in winter (40 s loop): aurora, pines, snowman, fire pit, snowfall |

## Project layout (what you create)
```
my-cover/
  scene.html     the scene: PD.create(…), K.<props>(D, …) back to front, your own D.add(…) layers, D.start()
  lib/           copy of the skill's lib/ (new-scene.mjs)
  out/           stills, sheets, scene.mp4 (one loop), scene-10h.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs scene.html --stills 0,10 --scale 2`.

Requirements: Node + Playwright Chromium, ffmpeg (+ ffprobe). No GPU, no network, no npm install. A 60 s loop renders in a
couple of minutes on a CPU box.

## Workflow
1. **Brief.** Settle: the place (island, rooftop, shop front, cabin in snow …), one character doing one quiet thing, the
   weather, the time of night, and which pockets are warm (fire, windows, lanterns) against the cold (sky, rain, moon,
   crystals). Pick the loop length: 30–60 s (`loop`), 30 fps. With a reference (image, video, prompt), list its elements and
   its palette first (`references/LOOK.md` → "reading a reference"), then plan your own composition — never copy a picture.
2. **Start**: `node <skill>/scripts/new-scene.mjs my-cover` (or `--from halloween-rain` to start from the example).
3. **Build back to front**, a still after each step (`render.mjs scene.html --stills 3 --scale 2`, ~1 s):
   1. sky, stars, moon, clouds, hills, mist — the cold field; keep it dark (sky top ≈ `#06071a`, horizon ≈ `#3b3366`);
   2. the ground mass (island / street / ledge) and the big shapes (house, tree) — read the silhouettes with `?pass=base`
      (no light) and `?off=light`;
   3. the warm pockets: windows, fire, lamps, lanterns — then look at `?pass=light` (the light buffer alone): pools must
      overlap a little, never cover the frame;
   4. the life: smoke, sparks, flicker, a character's slow cycle (a breath, a sip), bats, wisps, lightning (1–2 per loop);
   5. the weather in front: two rain layers (far: short, dim, slower; near: longer, brighter), splashes, drips, shelters.
   Crop and look at ×4 (full size) — pixel art is judged at the pixel.
4. **Contact sheet**: `render.mjs scene.html --sheet 8` — eight moments across the loop. Nothing should leave the frame, the
   flicker should never go dark, lightning frames should still read.
5. **Loop check**: `node <skill>/scripts/loop-check.mjs scene.html` must print three `ok`. Fix every FAIL before rendering.
6. **Render** the loop: `render.mjs scene.html` → `out/scene.mp4` (1920×1080, CRF 16). `--scale 8` for 4K, `--gif 6` for a
   preview. Open the MP4 and look at the first and last second; play it on repeat once to see the seam.
7. **Extend** (when asked for a long video): `node <skill>/scripts/extend.mjs out/scene.mp4 --hours 10 [--audio music.mp3]`.
   The music is the user's; for rain ambience you may generate one (e.g. ElevenLabs sound effects, a 30–60 s seamless bed)
   and say so.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames. Random choices are made once at build time
  with `PD.rng(seed)` (or per particle repeat with `p.h(j)`); never call an rng inside a draw or a `power: t => …`.
- **Every motion through the loop-safe helpers**: `D.phase(t, period)`, `D.wave(t, period)`, `D.noise(seed, t, hz)`,
  `D.flicker(seed, t, amt, hz)`, `D.particles({period, life})` — periods and rates are snapped to divide the loop. A raw
  `Math.sin(t * 1.7)` breaks the loop; slow drifts (clouds, mist) sway over the whole loop instead of travelling.
- **Pixels stay pixels.** Draw only through the raster helpers at integer coordinates; never `arc`, `stroke`, `filter`,
  `globalAlpha`, scaled `drawImage` or text. Transparency is ordered dither (`ditherDisc`, `ditherRect`), shading is `ramp()`.
  The canvas is the art size (480×270); the video is an integer upscale (×4 / ×8) with `flags=neighbor`.
- **Warm against cold.** The base scene is painted cold and dark; warmth comes only from lights and emissive pixels (glass,
  flame, lantern). At most ~5 warm pockets, each with a reason (window, fire, lamp, lantern, jack-o'-lantern), plus 1–3 cold
  accents (moon, crystals, wisps). Lights: `surface` lights what is under them in steps, `halo` is the soft glow in the air.
- **Quiet motion.** A lofi cover is watched for hours: no camera move, no cuts, nothing fast except rain and sparks; the
  character moves on a 8–15 s cycle; lightning ≤ 2 per loop and dimmed (`strength` ≤ 0.5).
- **Check by looking and by numbers**: a still after each change, a sheet before rendering, `loop-check` must pass.

## Contract every scene page fulfils
`window.seek(t)` draws frame t; `window.DURATION` (= the loop length), `window.FPS`, `window.PIXEL = { W, H, scale }`,
`window.__ready = true` after build — all set by `D.start()`. `?render=1` = no fitting, no live loop; `?t=12.5` = one frozen
frame; `?pass=base` = no lighting pass, `?pass=light` = the light buffer alone; `?off=light,flash,vignette,post,<layer name>`
switches parts off (layer names: `rain`, `rain-far`, `sparks`, `smoke`, `clouds`, …). The live page fills the window at the
largest integer scale that fits, draws on the video's frame grid, and loops; click or space pauses.
