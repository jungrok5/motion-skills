---
name: perspective-illusion
description: Make a ~10 s seamless illustrated 3D loop in the Japanese perspective-illusion style (after @garments__) of any place with a long axis — a street, a crossing, a station platform, a shop aisle, a corridor, a pier. A clean line-art scene squashed flat by a telephoto lens opens into deep perspective with dolly zooms, swings round to corner views that first read flat and then turn 3D, and similar objects quietly swap depth (a row becomes a diagonal) while the view is flat. Ink lines, flat two-tone shading, hatched cast shadows, a painted sky, GPU anti-aliasing and motion blur, rendered in code with three.js to an MP4 and a live page. Give it a topic and it designs the place, its hero, its repeats, its swap objects, the light and the palette for that topic. Use for "perspective illusion video", "optical illusion loop", "dolly zoom loop", "flat to 3D", "telephoto flat illustration that turns out to be 3D", "isometric-looking illustrated street loop", or Korean requests like "원근 착시 영상", "평면처럼 보이다가 입체로 열리는 일러스트 루프", "돌리 줌 착시", "이 스타일로 우리 동네 역 만들어줘", "주제만 바꿔서 같은 스타일로". Source — made from https://github.com/dotslashsimran/simcraft/blob/main/skills/video/perspective-illusion/SKILL.md.
---

# perspective-illusion

A ~10-second loop built on one optical trick, drawn like an illustration. A level camera on a very long lens (1.5–2°,
~600 m away) flattens a deep scene into what reads as one flat drawing. Then it dolly-zooms — the lens widens while the
camera moves in, so the subject keeps its size and the space behind it stretches open — and swings round to corner views
that each start flat and open into 3D. While the view is flat, similar objects slide in depth where nobody can see it, so
when depth comes back a row has become a diagonal. Everything is clean ink line art with flat two-tone shading, hatched
cast shadows and a sky painted by view direction; every frame is a pure function of time, and the loop is seamless.

Made from the simcraft skill at https://github.com/dotslashsimran/simcraft/blob/main/skills/video/perspective-illusion/SKILL.md
(`skills/video/perspective-illusion/` in dotslashsimran/simcraft). That repo has no license, so no code or image was
copied: the method (the shot rig and its keys, the monotone timeline, the ink / two-tone / hatching passes, the render
contract, the blink check and the lessons) was rebuilt here from its description, with new code, a new kit, new scenes
and new tooling. Starting scene: `templates/scene.html` (Corner Street, a day back street). Worked example on a topic the
source does not have: `examples/country-platform` (솔내역, a Korean country station). Sister skill: `parallax-facade`
(the same trick as a pastel toy town on a 1 s beat) — use this one for the line-art illustration look, corner views and
depth swaps.

**Fixed (the style):** the flat telephoto view and its dolly-zoom reveals; level camera, lens shift instead of tilt;
corner views as telephoto → wide pairs; swap objects that change depth only while flat; one monotone cubic through ~10 s
with breathing holds, ending on the shot it starts on; ink lines from depth, creases and colour, two-tone shading,
hatching only in cast shadows, a sky by view direction, 6–10 flat colours + one accent; 16:9, MP4 + live page.
**Designed per topic (in `BRIEF.md`, built in `scene.html`):** the place and its long axis, the hero that closes it, the
repeats that stack in the flat view, the hero object (and so the first corner view's side), the swap objects, the light,
the palette, extra shots the place needs, the detail and its wear, and new pieces written in the scene. The template and
the example are examples of the style, not a menu (references/BRIEF.md).

## What's in this folder
| path | what |
|---|---|
| `lib/illusion.js` | `Illusion`: shots `{ x, y, zf, W, fov, H, el, yaw, lay, cs }` and the level rig with lens shift, `keys()` on a Fritsch–Carlson cubic (log W / fov), `drift()`, `swap()`, `update()` / `cycle()`, static merge by material, the three passes (flat colour · normals + depth + ink level · sun mask) and the post (ink lines, two tones, world-anchored hatching in cast shadows, sky by direction), `renderMany` / `frame` (jittered AA + adaptive motion blur on the GPU), `probe`, `setJitter`, `check()`, the live player |
| `lib/kit.js` | parts at real scale: `box cyl ball tube wire quad slab prism`, `group`, `tex label ground asphalt`, `sign roadSign`, `building` (frames, sills, mullions, bands, AC units, pipes, shop floor, roof kit), `pole` + `wires`, `cone vending bin fence guard mirror tree planter bench car lamp bike` |
| `lib/fonts/` | Barlow Condensed Bold, Noto Sans KR (OFL) for code-drawn signs |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `scene.html` (Corner Street: poles, wires, a crossing, five cones that swap, a bookshop as the hero, a parked van), `BRIEF.md` |
| `examples/country-platform/` | the worked example: `BRIEF.md` and `index.html` (an island platform, canopy, catenary masts, a train, a footbridge, four caution boards that swap; its own pieces) |
| `scripts/new-scene.mjs` | start a project (template, or `--from country-platform`) |
| `scripts/check.mjs` | loads clean · opens flat · the loop joins · lay changes only while flat · corner pairs · no frozen holds · 3–6 swap objects · every key draws · deterministic · seam · flat frame density |
| `scripts/render.mjs` | stills, a contact sheet of every key, a preview MP4 or the final (workers, `--fps 60`, `--ss 1.5`, `--loops`) |
| `scripts/blink.mjs` | the final's blink map (pixels flickering in nearly still frames) and freezes |
| `references/` | **BRIEF** (fixed vs per topic, the stills rubric) · **CAMERA** (the rig, shot vocabulary, loop, timing, the cheat) · **LOOK** (passes, lines, two tones, hatching, sky, palette, night) · **KIT** (API, the page contract) · **LESSONS** (blinking table, pitfalls, costs) |

## Project layout (what you create)
```
my-loop/
  BRIEF.md      topic → place, axis, hero, repeats, hero object, swap objects, light, palette, shots, detail (written first)
  scene.html    look → kit → layout → pieces → buildings / structure → detail → swap objects → shots → keys → start
  lib/          copy of the skill's lib/ (new-scene.mjs), imported through an import map ("illusion/")
  out/          stills, sheets, previews, the MP4, blink.png (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/check.mjs scene.html`. The page is an ES module: view it
through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On a 4-core box without a GPU:
a half-size sheet still ~0.3 s, a preview ~6 min for 10 s, the final ~70 min for 10 s at 30 fps (4 workers; ×2 with `--ss 1.5`).

## Workflow
1. **Topic → brief.** Take the user's topic and write `BRIEF.md` (`templates/BRIEF.md`, references/BRIEF.md): the place
   and its **long axis** (lay it along −z), the **hero** that closes it square on to the camera, the **repeats** at
   different depths (they stack into one in the flat view), the **hero object** and its side, 3–6 **swap objects** with
   their row and diagonal, the sun and the palette (6–10 colours + one accent), and any extra shot the place needs. Show
   it to the user in a few lines; once they agree, do the rest without asking.
2. **Start**: `node <skill>/scripts/new-scene.mjs my-loop` (or `--from country-platform`). Keep the engine sections (look,
   shots, keys, start) and replace the scene sections with the brief's place — do not keep the bookshop or the platform
   because they are there. New pieces go in the scene file as functions over `K` (references/KIT.md).
3. **Forms first** (pass 1): main masses at true scale (a 0.72 m cone, a 3 m storey, a 1.1 m platform), the axis, the hero,
   the repeats, the swap objects, and the shots + keys from the loop grammar (references/CAMERA.md). Run
   `node <skill>/scripts/check.mjs scene.html` and `render.mjs scene.html --sheet --scale .4`: does the flat still read
   flat, and does every move reveal something?
4. **Detail passes**, each checked on stills before the next: **structure** (everything a real place of this kind has —
   list it from photos first), **wear and story** (3+ per lingering surface: posters, stickers, plants, a left bicycle),
   the **corner-view audit** (render each wide corner still, fill the bare sides, backs, roofs and ground), **light and
   shadow** (every object casts a readable shadow, main forms show the two-tone step), **life** (optional: walkers, a
   train, screens — whole cycles per loop via `F.cycle`, wrapped during the fastest move), **polish** (palette, line
   weight, sky). Density rule: the flat frame is full edge to edge (check.mjs warns over 20 % empty tiles).
5. **Score the stills** with the rubric in references/BRIEF.md (every key and every move's middle, plus the flat frame at
   full size; a fresh reviewer agent works well). Name the three weakest areas of each frame, fix them, repeat until
   every area is ≥ 7. `check.mjs` must print `check OK`.
6. **Preview**: `node <skill>/scripts/render.mjs scene.html --preview` (half size, 30 fps, light AA) — watch it for
   stutter, pops and pacing. Fix and re-preview; previews shimmer by design.
7. **Final** in the background, once the preview is approved: `node <skill>/scripts/render.mjs scene.html` (add
   `--fps 60` for posting, `--ss 1.5` for steadier lines, `--loops 3` for a post that plays three times). Then
   `node <skill>/scripts/blink.mjs out/scene.mp4` — compare the count before and after a change; what blinks should be
   intended motion only. Open a few stills from the MP4.
8. **Deliver**: the MP4, the live page (`scene.html` through a server: ▶, scrub), and `BRIEF.md`.

## Rules
- **The camera never tilts or rolls.** Look down with `el` (raise + lens shift), aim with `H`, swing with `yaw`.
- **The flat view is the hook**: fov ≤ 2, level, square on, filled edge to edge, nothing that betrays depth. If the flat
  still does not read as one drawing, nothing after it works.
- **Cheat only while flat**: `lay` changes only between flat holds (check.mjs fails otherwise); swap objects keep their x.
- **Corner views come as pairs** (fov ≈ 4, then wide, same yaw); the first turns away from the hero object.
- **Deterministic and seamless**: every frame a function of ms; no `Math.random` (`rng(seed)`), nothing accumulates,
  moving things complete whole cycles per loop (`F.cycle`); the last key repeats the first.
- **Real-world scale in metres**: the lenses and the depth precision only make sense at true scale.
- **Nothing in screen space**: hatching, noise, haze anchor to the world or the view direction (references/LESSONS.md).
- **Text in code** with the bundled fonts (`K.label`, `ink: 0.5`), made-up names, spelled right.
- **Design per topic**: every topic gets its own place, hero, repeats, swap objects, light and palette from its brief;
  never drag in the template's bookshop or the example's train because they are there. New pieces are built in the
  scene file over `K`, not by editing `lib/`.
- **One style**: whatever is new keeps the same language — ink lines on everything with ink 1, outline-only text and
  busy textures, two tones with the look's shade, hatching only in cast shadows, flat colours from the palette.
- **Ready-made models only when a box sells a thing badly** (a bicycle, a scooter): a free Polyfork low-poly GLB may stand
  in — see https://github.com/jungrok5/motion-skills/blob/main/references/3D-MODELS.md. Give every mesh `F.mat(colour)` so
  it gets lines and two tones; never commit a model's `.mjs` source; a committed GLB keeps its CC BY credit line.
- **Original**: use the technique, never a reference's artwork, characters, compositions or real brands. If people
  appear, follow the repo's body check (a cast sheet turned both ways, joint limits).

## Contract every scene page fulfils
`#frame` (the canvas) · `window.READY` · `window.render(ms)` · `window.renderMany([[ms, jx, jy], …])` ·
`window.probe(ms)` → `[[x, y, ndcZ], …]` · `window.setJitter(x, y)` · `window.frame(ms, opts)` · `window.seek(t)`,
`LOOP`, `DURATION`, `FPS`, `film` — all set by `F.start()`. Query: `?render=1` (no player) · `?scale=.5` · `?ss=1.5` ·
`?t=2.4` · `?fps=60` · `?autoplay=1`.
