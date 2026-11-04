---
name: knit-diorama
description: Make a knitted-world diorama in three.js — a little land made entirely of yarn (stockinette, rib, garter, seed and cable fields stitched together with running-stitch seams, fuzzy pom-pom trees, a ribbed sea, knitted cottages and props) that knits itself out of a yarn ball: the loose end is tugged, the ball lifts and spins, knitting needles ride the growing edge and every prop flies out of the ball as the knit front reaches it; optionally it all unravels back into the ball for a seamless loop. Outputs a live page (drag to pull the thread back and forth) and a 1920×1080 MP4. Use when asked for a knitted / yarn / wool / crochet / felt / handmade-craft 3D world, a cozy diorama that builds itself, "the world knits itself", a yarn-ball reveal, or to make something like a reference knitted animation ("뜨개질 디오라마", "털실로 만든 세상", "니트 질감 3D", "실을 당기면 세상이 떠지는", "털실 공", "뜨개 마을 영상", "knitted world", "yarn diorama", "wool world animation", "pull the thread", "knit it into existence"). Source — made from https://yarn.krisyang.dev/.
---

# knit-diorama

A small world in which everything is knitted — fields, sea, roofs, trees, clouds — sitting on a patchwork blanket, and
the film of that world knitting itself out of a yarn ball. The look comes from three things the engine does for every
material: **procedural stitch textures** (each stitch drawn as twisted-ply yarn strokes into a height field → albedo with
occlusion, normal map, roughness, plus a sheen layer), **shell fuzz** on soft things (an instanced stack of shells that keeps
only hash-placed fibres), and **seams**: the ground is one mesh whose triangles are split exactly where its region function
changes, and those split lines become a running stitch. The motion comes from a **knit front**: a radius per angle (96 bins)
that a pure function of t grows from the centre while a knitting head circles it; every ground material discards outside
it and shows a cream edge at it, and every prop pops out of the ball (flight in an arc, squash, a damped spring) when the
front passes its footprint. Every frame is `seek(t)`, so the same page plays live and renders to MP4.

Built in this repo on the worked example `examples/harbour` 「Knitted Harbour」 (20 s loop), after Kris Yang's interactive
*Yarn World* (https://yarn.krisyang.dev, @krisyangdev on X, Nov 2026: "A knitted diorama in three.js. Pull the thread to
knit the world, pull the loose end to unravel it."). Only the idea and the general techniques are borrowed — stitch normal
maps, shell fuzz, a revealing front, spring pop-ins; the code, the props, the harbour scene and its timing are this repo's
own. three.js r170 is vendored in `lib/` (MIT, `lib/THREE-LICENSE`).

## What's in this folder
| path | what |
|---|---|
| `lib/knit.js` | the engine: `Diorama` (renderer, light, blanket, `ground()`, `add()`, the knit front, the yarn ball, thread, needles, `cameraKeys()`, `onFrame()`, `check()`, `start()`), `yarn()` materials, `fuzz()`, `tube()`, `PAL`, seeded `rng`/`hash`/`noise1`, `spring`, `ease` |
| `lib/kit.js` | props: `tree`, `pine`, `bush`, `flowers`, `rock`, `cottage`, `puffs` (smoke), `lighthouse`, `windmill`, `boat`, `wave`, `pier`, `cloud`, `fence`, `scatter` |
| `lib/three.module.min.js` | three.js r170 (MIT) |
| `templates/scene.html` | a commented 12 s starting scene: a meadow with a pond, a cottage, trees — knits once and holds |
| `scripts/new-scene.mjs` | start a project: `lib/` + `scene.html` (template or `--from harbour`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 12 [--from --to]`), or the MP4 (workers × ffmpeg chunks; `--audio` muxes a track) |
| `scripts/check.mjs` | proves the page: loads clean, same t → same pixels, loop seam (frame DURATION = frame 0), every rule at every 0.25 s |
| `references/` | **LOOK** (what makes it read as yarn, palette, stitch scale, light) · **KIT** (engine + prop API, writing a prop) · **LESSONS** (what broke and the fix) |
| `examples/harbour/` | the worked example: a harbour island — fields, lane, beach, sea, lighthouse, 4 cottages, windmill, boats, pier — knits and unravels in 20 s |

## Project layout (what you create)
```
my-world/
  scene.html     new Diorama({…}) → D.ground({height, region, mats}) → K.<prop>(D, {at}) … → D.cameraKeys([...]) → D.start()
  lib/           copy of the skill's lib/ (new-scene.mjs); the page imports it through an import map
  out/           stills, sheets, scene.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs scene.html --stills 3,8 --scale .5`.
The page is an ES module: open it through a local server (`python3 -m http.server`), not by double-click; the scripts pass
Chromium the flag that lets file:// modules load.

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg. No network, no npm install. On a GPU a frame takes milliseconds;
on a CPU-only box SwiftShader takes ~3–7 s per 1920×1080 frame (a 20 s film ≈ 40–60 min with 4 workers) — preview with
`--scale .5` stills and sheets (~2 s each) and render the MP4 once, in the background.

## Workflow
1. **Brief → world and beats.** Settle the place (a harbour, a farm, a snowy village, a desert oasis …), one accent colour
   (the ball and one or two props), the props list (5–8 kinds, 30–80 pieces) and the timing: *ball at rest (≈2 s) → tug →
   knit (6–8 s) → life (4–6 s: boats bob, smoke rises, sails turn, camera orbits) → unravel (3–4 s) → rest*, or knit once and
   hold. With a reference, list its palette, stitches and props — then design your own world; never copy a scene.
2. **Start**: `node <skill>/scripts/new-scene.mjs my-world` (or `--from harbour`).
3. **Ground first.** Write `height(x,z)` (hills as gaussians, water sunk 0.1–0.2 with a smooth shore) and `region(x,z)`
   (water / shore / paths by distance, then a warped grid of fields picked by `hash`), and one `yarn({...})` per region.
   Still at a late t with `?off=pops` hiding nothing but showing all props in place: `render.mjs scene.html --stills 12 --scale .5`.
4. **Big props, then small.** Landmarks first (lighthouse, cottages, windmill), then trees and bushes with `K.scatter`
   (give it an `ok(x,z)` that keeps them on land, off paths and away from buildings), then flowers, rocks, waves, clouds
   (`rho` ≥ half so they drop in at the end). Add a `D.check(...)` for anything that must hold (on land, not in the sea).
5. **Camera**: keys `{t, yaw, elev, dist, target, fov}`; close on the ball at the start (dist ≈ 1.6 × half, elev 20–24°), pull
   back while it knits so the front stays in frame (target y up to ~1 while the ball hovers), elev 30–34° on the whole world,
   one slow half-orbit during life, back to the first key for a loop (repeat the first key ~0.7 s before the end to hold).
6. **Contact sheet**: `render.mjs scene.html --sheet 16 --scale .5`. The ball never leaves the frame, the front and the
   needles are in frame while knitting, props do not pop inside each other, the parked ball (`ball.home`) is visible or
   deliberately off-frame.
7. **Check**: `node <skill>/scripts/check.mjs scene.html` must print only `ok`.
8. **Render** in the background: `render.mjs scene.html --workers 4` → `out/scene.mp4`. Look at stills from the MP4
   (`ffmpeg -ss 12 -i out/scene.mp4 -frames:v 1 x.png`) before handing it over. For sound, bring or generate a bed (e.g.
   ElevenLabs: soft music box or ukulele, wind, a few "pop" and "knit-click" effects at the pop times) and pass `--audio`.

## Rules
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames — `rng(seed)` once at build time, `hash`,
  `noise1(t)`, `spring(s)`; animate props in `D.onFrame(t => …)` from t alone. `check.mjs` catches violations.
- **Everything is yarn.** Every surface gets a `yarn()` material (or the kit's), stitches sized ~0.3 m per tile on the
  ground (`repeat ≈ 2.8` with metre uv) and ~0.22–0.3 m on props (`rep()` in kit.js does it) — at 1080p a stitch must be
  6–12 px; smaller turns to moiré, bigger looks like a toy close-up. Soft round things (crowns, clouds, pom-poms, bushes)
  get `fuzz()`; hard things (walls, roofs, boats) do not.
- **Seams make it a patchwork.** Fields are separate regions with seams; water–shore boundaries skip the seam
  (`seams.skip`). Keep regions ≥ ~1.5 m across — smaller ones become confetti.
- **Things appear because the front reaches them.** Props are built where they stand and registered with `D.add` (the kit
  does it); never fade a prop in. Clouds drop in last (`rho` beyond the world). A prop's footprint must be inside the world
  (`sqNorm(x/half, z/half) < .9`).
- **The ball tells the story.** It is the biggest accent; it shrinks as it gives yarn and grows back when unravelling.
  Keep it in frame while it works; park it on the blanket (`ball.home`) while the world lives.
- **Soft light.** Hemisphere + one warm sun with soft shadows, Neutral tone mapping, warm fog into the blanket. No bloom,
  no dark scenes — knitted worlds read in daylight.
- **Check by looking and by numbers**: a still after each step, a sheet before rendering, `check.mjs` must pass.

## Contract every scene page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (names of
broken rules), `window.D` (the diorama), `window.__ready = true` — all set by `D.start()`. `?render=1` = fixed W×H canvas, no
live loop; `?t=12` = one frozen frame; `?scale=.5` = preview size; `?lite=1` = standard materials, no shadows, fewer fuzz
shells; `?off=fuzz,shadow,seams,clip,needles,thread,ball,fog,blanket,pops` switches a part off (`clip` shows the whole world
at every t, `pops` puts every prop in place). The live page fits the window and loops (when `unravel` is set); drag
sideways to pull the thread back and forth through time, click or space pauses, ← → jump a second.
