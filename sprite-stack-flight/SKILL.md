---
name: sprite-stack-flight
description: Make a pixel-art flight piece in the style of early-90s console flight games, drawn with sprite stacking — no 3D engine, no polygons, no image files, all in code. Give it a topic and it designs a new craft as a voxel model cut into slices (a biplane, an airship, a seaplane, a glider, a balloon, a rocket …), a terraced world of stacked layers (islands, mesas, fjords, any place) with stacked-disc clouds, the craft's own cockpit, and a flight plan cut between an overhead view, a chase view and the cockpit. Outputs a live page you can fly (pointer steers, click rolls, hold boosts, space changes the view) and a deterministic 1080p MP4 of the planned flight with synthesised engine and wind sound. Use when asked for a sprite-stacked or voxel pixel-art flight, a retro flight sim / flying scene, a "16-bit" plane over islands, a pixel airship or plane video, or "make one like this in another setting" ("스프라이트 스태킹", "픽셀아트 비행", "도트 비행 시뮬레이터", "레트로 비행 영상", "슈퍼패미컴 감성 비행", "이 스타일로 ○○ 비행 만들어줘", "sprite stacking", "pixel art flight sim", "retro flight", "voxel plane", "fly over pixel islands"). Source — made from https://x.com/meta_pavy/status/2122241297482408234?a=yknJyWI6foguElHQBnI&s=19, which shares https://x.com/creativedash/status/2122000830895386680 (demo: https://remix.ui8.ai/fly).
---

# sprite-stack-flight

Pixel-art flight pieces built from flat slices. A craft is a small voxel model (≈ 30 × 30 × 13) that the engine cuts into one
canvas per height and draws bottom to top, one affine transform per slice, so it turns, banks, pitches and rolls with crisp
pixels and real depth. The world is a wrapping height map of integer terraces: from above it is drawn as stacked layers
(front to back, a y-buffer, darker south faces); in perspective it is drawn as vertical stripes — one ray per column of pixels
marching out over the map — rotated as a whole for the roll. Clouds are stacked discs whose shadows drift over the ground.
Everything renders into a 480×270 canvas and is scaled up nearest-neighbour. A film is one flight integrated from a plan at
120 Hz, so every frame is a pure function of `t`; the live page lets the viewer take the stick with the same flight model.

Source: made from [Pavian's post](https://x.com/meta_pavy/status/2122241297482408234?a=yknJyWI6foguElHQBnI&s=19) on X, which shares
[Dash's post](https://x.com/creativedash/status/2122000830895386680) — *"No 3D engine, no polygons, 32 KB of code"* — a pixel-art fighter
jet built by sprite stacking over stacked islands, with overhead, chase and cockpit views
([live demo](https://remix.ui8.ai/fly)). This skill borrows the technique and the three-camera format; the engine, the kit and
both examples are this repo's own code, and no craft, world or cockpit from the demo is reproduced.

## Fixed (the style) vs designed per topic
| fixed — every piece | designed for each topic |
|---|---|
| sprite stacking: the craft is a voxel model drawn as slices, shaded per open face, with a dark rim slice under it | what flies: its silhouette, size, palette, parts, animated part, where its nav lights sit |
| the world is integer terraces: stacked layers from above, stripes in perspective, darker south faces | the place: how height is made, the terrace colour bands, water, decorations, a landmark |
| stacked-disc clouds, one wind, moving shadows; ordered-dither sky, fog to the horizon | the time of day: sky stops, fog, sun or stars, cloud tones and altitude |
| three cameras — overhead, chase, cockpit — with cuts on step boundaries | the cockpit: the seat, the frame, the instruments, one part that moves with the flight |
| 480×270, nearest-neighbour ×4 (1080p) / ×8 (4K), 30 fps; integer pixels; a 3×5 pixel font | the title, subtitle and captions |
| a flight model with weight: springs on bank and pitch (lag + overshoot), coordinated turns, rolls that gather | mass, speed, turn rate, bank limit — and whether it can roll at all |
| deterministic film from a plan; a flyable live page; synthesised engine / wind sound | the plan: the beats, where it flies, which camera when; the engine's voice |
| code-only: no image, model or video files | |

## What's in this folder
| path | what |
|---|---|
| `lib/stack.js` | the engine (`window.SS`): `SS.create()` → the piece `F` with `F.look`, `F.world`, `F.clouds`, `F.craft`, `F.plan`, `F.cockpit`, `F.hud`, `F.caption`, `F.start`; `SS.model` (voxel builder → slices), `SS.drawStack`, `SS.projectVoxel`; renderers (oblique layers, perspective stripes, clouds both ways), the flight model, the painter `F.P`, pixel font, seeded `rng` / `hash` / wrapping `noise`, colour helpers, `?map=1` plan map, `?sheet=craft` craft sheet, the page contract |
| `lib/kit.js` | parts (`window.SK`): terrain (`bands`, `blobs`, `scatter`, `tree`, `pine`, `rock`, `house`), craft (`fuselage`, `wings`, `fin`, `prop`, `flame`, `envelope`, `navLights`), cockpit and HUD (`canopy`, `dash`, `gauge`, `attitude`, `radar`, `readout`, `hudLadder`) |
| `templates/flight.html` | a commented starting piece (a seaplane over an archipelago) — every part meant to be replaced |
| `templates/BRIEF.md` | the brief to fill before code, and the review list stills are scored on |
| `scripts/new-flight.mjs` | start a project: `lib/` + `index.html` + `BRIEF.md` + `out/` (`--from <example>` to start from an example) |
| `scripts/render.mjs` | stills, a contact sheet, the plan map / craft sheet (`--q map=1`, `--q sheet=craft`), the MP4 with sound |
| `scripts/check.mjs` | proves a piece: loads, draws, deterministic, clears the ground, handedness of the craft, weight in numbers, format, code-only, speed |
| `references/` | **LOOK** (pixels, terraces, palette, light, cameras, reading a reference) · **KIT** (engine + kit API, how to build a craft / world / cockpit) · **LESSONS** (what broke and the fix) |
| `examples/canyon-biplane/` | *Dust Mail* (32 s): a red mail biplane over desert mesas at golden hour, one roll, an open cockpit with brass dials |
| `examples/fjord-airship/` | *The Winter Post* (36.5 s): a heavy airship up a fjord at blue hour, a three-quarter chase, a lamp-lit bridge whose wheel turns with the bank |

## Project layout (what you create)
```
my-flight/
  BRIEF.md       the brief (written first)
  index.html     the piece: F.look → F.world → F.clouds → SS.model + F.craft → F.plan → F.cockpit → F.start()
  lib/           copy of the skill's lib/ (new-flight.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs index.html --stills 3 --scale 2`.

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install. A 30 s film renders in about a minute.

## Workflow
1. **Topic → brief.** Fill `BRIEF.md` (`templates/BRIEF.md`): the craft (what it is, **mass** and why, palette, parts, animated
   part, nav lights, can it roll), the world (how height is made, terrace bands, water, decorations, a landmark), the time of
   day and clouds, the cockpit (seat, frame, instruments, one live part), and the plan table. With a reference, list its
   elements first (`references/LOOK.md` → "reading a reference"), then design your own — never copy a craft, map or cockpit.
2. **Start**: `node <skill>/scripts/new-flight.mjs my-flight` (or `--from canyon-biplane` / `--from fjord-airship`).
3. **World first.** Write `height` and `color`, then look at the whole map: `render.mjs index.html --q map=1 --stills 0 --scale 2`.
   Islands / mesas / fjords must read on the map; adjust thresholds until the place is right. Add decorations.
4. **The craft.** Build the voxel model with `SS.model` + kit parts (your own shapes are just more `M.box / M.ell / M.tube /
   M.plate / M.fin` calls). Look at `--q sheet=craft`: 8 headings, chase, both banks, a climb, a roll. It must read at 1× from
   every side; red port light on the left of the nose, green on the right.
5. **Look + clouds**: sky stops, fog, cloud tones and altitude (above / among / below the flight), sun or stars.
6. **The plan.** Steps of `{ dur, cam, bank, climb, thr, roll, caption }`. Start overhead with the title, use every camera,
   end wide. Re-check on the map: the path is coloured by camera and the lowest height above the ground is printed.
7. **The cockpit**: `static(P)` (drawn once) and `over(P, s, t)` (every frame). One part moves with the state.
8. **Stills and sheet**: `render.mjs index.html --sheet 8` and a few `--stills` at ×2. Score them on the brief's review list;
   fix anything under 2.
9. **Check**: `node <skill>/scripts/check.mjs index.html` — every line `ok` (it prints numbers: lowest clearance, bank rate,
   overshoot per change, roll counter-roll, camera lag, size, ms per frame).
10. **Render**: `render.mjs index.html` → `out/<folder>.mp4`, 1920×1080, H.264, with sound (`--mute` for none,
    `--scale 8` for 4K). Watch it once through.

## Rules
- **Design for the topic.** The craft, world, look, cockpit and plan come from the brief. The examples and the template show the
  style; never drop the biplane, the airship or the seaplane into a topic they don't fit, and never recreate the reference
  demo's jet, islands or cockpit.
- **One style.** Whatever the topic: a sprite-stacked craft with a rim slice, terraces with darker south faces, stacked-disc
  clouds, dithered sky and fog, the 3×5 font, the three cameras. New parts use the same voxel and painter vocabulary.
- **Pixels stay pixels.** Draw into the 480×270 canvas only: slices through `SS.drawStack`, the world through the renderers,
  overlays through `F.P` (integer rects). No smoothing, no `arc` / `stroke` / `filter`, no text other than the pixel font, no
  image files. The video is an integer upscale with `flags=neighbor`.
- **The stack is the craft.** At least 8 slices; every face shaded by the bake; one voxel ≈ one screen pixel overhead
  (`over: 1`). Put red `port` and green `starboard` lights where they are seen from above (`SK.navLights`) — `check` reads them.
- **Weight sets the timing.** Mass in the brief → `F.craft({ mass })`: the bank and pitch are springs that lag and overshoot
  a little; turns follow the bank (never a heading tween); the chase camera swings after the heading. Only a light craft rolls,
  and the roll gathers first (a small counter-roll) and settles after. Never animate the craft's angles directly.
- **Pure function of t.** No `Math.random`, `Date` or state between frames in a piece; random choices are made once with
  `SS.rng(seed)` / `W.rng` / `n.rnd`. Animated parts pick their frame from `t` (`frame: (s, t) => Math.floor(t * 24) % 3`).
- **The flight clears the world.** Height above the terrain ≥ the craft's `clearance` everywhere; plan on `?map=1`.
- **Cuts read.** No step under 1.5 s; ≥ 3 steps and ≥ 2 cameras; the title over the first overhead shot.
- **Check by looking and by numbers**: the map, the craft sheet, a contact sheet, stills scored on the review list, and
  `check.mjs` all `ok` before the render.

## Contract every piece fulfils
`window.seek(t)` draws frame t; `window.DURATION` (the plan's length), `window.FPS`, `window.PIXEL = { W, H, scale }`,
`window.__ready = true`, `window.FLIGHT` (`sample(t)`, `terrainAt(x, y)`, `steps`, `clearance`, `mass`, `sound`, `handedness()`)
— all set by `F.start()`. Queries: `?render=1` (no fitting, no live loop), `?t=12.5` (one frozen frame), `?cam=over|chase|cockpit`
(force a camera), `?sheet=craft`, `?map=1`, `?play=1` (fly at once), `?off=clouds,trail,hud,cockpit,title`. The live page plays the
film on a loop at the largest integer scale; the first click or key hands the craft to the viewer (pointer = bank and climb,
short click = roll, hold = boost, space = next view, Esc = back to the film).
