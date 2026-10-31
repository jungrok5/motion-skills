---
name: motion-webtoon
description: Make a vertical-scroll motion webtoon (무빙툰 / 모션툰 / motion comic / motion manga) drawn entirely in code (HTML Canvas, 1080×1920) in Korean webtoon and manga craft — one long strip of panels a camera reads downward, speech balloons, SFX lettering, focus and speed lines, SD gags — with a consistent cast defined as data, bodies checked for physically possible joints, an optional premium black-and-white manga print finish, and optional ElevenLabs narration, music and SFX; rendered to a portrait MP4 frame by frame and published as live pages that draw in the browser. Use when asked for a webtoon, comic or manga video, a short gag / office comedy / everyday story told in panels, or an animated comic strip ("웹툰", "무빙툰", "모션툰", "망가", "만화 영상", "웹툰 영상으로 만들어줘", "짧은 개그 만화", "motion comic", "webtoon video", "manga animation", "comic strip video").
---

# motion-webtoon

A pipeline for **short motion webtoons** (무빙툰): each scene is one tall strip of panels that a camera scrolls down like a
phone reader — gutters are time — with motion inside the panels (blinks, hair springs, pops, zoom punches), Korean balloons
and SFX lettering, and register switches by beat (normal → fake-epic manga → SD gag). The people are drawn by a shared **cast
rig**: a film defines each person as data (look, wardrobe, values, a hair preset or a small hair drawing) and every scene
draws them through the same physically constrained body (fixed-length 3D IK, fixed elbow side, wrist ≤ 80°, hands at the
grip). Two looks: the **colour webtoon** of the kit, and the **premium mono-manga print** (cream paper, one ink, 45° dot
screentone, one accent colour) that `Manga.grade` lays over the whole frame. Output: a 1080×1920 MP4 per scene / per film
with a mixed soundtrack, and live scene pages (`seek(t)`) that play in a browser.

Built in this repo on the worked example `examples/donut` 「마지막 도넛」 (3 scenes, 74 s, five office workers and the last
donut, a grave documentary narrator) — live pages: jungrok5.github.io/motion-skills/motion-webtoon/demo/donut/. Craft
sources: a survey of 21 GitHub comic/manga projects (`references/RESEARCH.md`). The scene harness, the webtoon kit and the
render/mix/assemble/body-check scripts are vendored from this repo's `canvas-film` skill (headers name the source).

## What's in this folder
| path | what |
|---|---|
| `lib/lib.js` | the scene harness (vendored from canvas-film): `Pilot.run`, the `seek`/`DURATION`/`__ready` contract, easing, seeded rng/noise, `Pilot.text`/`Pilot.tr` |
| `lib/webtoon.js` | the webtoon kit (vendored from canvas-film `kits/webtoon`), global `Webtoon`: strip + camera, balloons, SFX, focus/speed lines, screentone, mood backgrounds, emotion symbols, flash/freeze, SD/stone/crumble, the colour cel rig `Webtoon.Rig` |
| `lib/manga.js` | global `Manga`: the mono-manga finish — `Manga.grade` print pass, `ink`/`taper` boiling lines, dot `tone`, bold `focus`/`speed` wedges, `puff`, `ticks`, the ✱ caption `tag`, chunky `sfx`; accent colour via `Manga.setAccent` |
| `lib/cast-rig.js` | global `Cast`: the cast rig — `Cast.define(key, spec)`, `draw` / `sd` / `face` / `stone` / `crumble` / `hand` / `reachArm`, 5 hair presets, wardrobe flags, `Cast.style = 'manga'|'riso'`, `?bones=1` joint overlay and `Cast.boneLog` |
| `scripts/new-film.py` | start a project from the starter (copies `lib/` into `scenes/`, writes film.json with the full fonts) |
| `scripts/render.mjs` | stills or the MP4 of a scene with Playwright + ffmpeg, frame by frame, muxes `scenes/<id>.wav` (vendored; prints page errors, reads `fonts/`, `--outdir`) |
| `scripts/debug.mjs` | open a scene like render does and print page errors, console errors, failed requests and the ms per frame |
| `scripts/bone-check.mjs` | numeric body check over every frame: bone lengths fixed, elbow jumps, wrists past 80°, elbows in the torso, grade cost |
| `scripts/body-check.py` | the visual body pack: full-size stills every 0.2 s around the action beats + index sheets, for a fresh reviewer (vendored) |
| `scripts/mix.py` · `scripts/assemble.py` | place music/SFX/narration cues from `<id>.sound.json` → `<id>.wav`; join scenes → `out/film-v.mp4` at −16 LUFS (vendored) |
| `scripts/publish.py` | live pages for a site: scene pages + their scripts + subset woff2 fonts + m4a sound + an index |
| `references/` | **STYLE** (the two looks, palette, fonts, the riso construction) · **CAST** (defining people, poses, hands, arms that enter panels) · **STORYBOARD** (strip, gutters, camera, comedy timing, reading time) · **BODY-CHECK** (the numeric + visual check and the reviewer prompt) · **SOUND** (narrator, music cues, SFX, ducks, levels, cost) · **RESEARCH** (the 21-source craft survey) · **LESSONS** (what broke and the fix) |
| `examples/starter/` | a 10 s scene, two people, one gag (「하이파이브」), subset fonts and reused SFX — runs offline from the quick start |
| `examples/donut/` | the worked example: 3 scenes, the five-person cast file, scripts, sound specs, the audio actually used, `BRIEF.md`, `cast-sheet.html` |

## Project layout (what you create)
```
my-webtoon/
  film.json                 { title, source: "ko", scenes: [{ id, label, dur }], fonts: { base: [[family, weight, file.ttf]…] } }
  scenes/lib.js, webtoon.js, manga.js, cast-rig.js     vendored copies (new-film.py) — scenes load them relatively
  scenes/<film>-cast.js     Cast.define per person (+ the film's props and backgrounds)
  scenes/script-<id>.js     window.SCRIPT = { DUR, stops, beat, lines, sfx, … } — words and beats per scene
  scenes/<id>.html          one page per scene: panels → strip → camera → draw(ctx, t) → Manga.grade → fade
  scenes/<id>.sound.json, scenes/audio/*.mp3, scenes/<id>.wav (mix.py)
  out/                      stills, body packs, MP4s (not committed)
```
All scripts run from the project root: `node <skill>/scripts/render.mjs v --scene <id> --stills 2,8`.

Requirements: Node + Playwright Chromium, ffmpeg, Python 3 with numpy + Pillow (fonttools + brotli for `publish.py`), and the
Korean webtoon fonts (Jua, Do Hyeon, Black Han Sans, Nanum Pen Script, Gaegu, Noto Sans KR, Noto Serif KR — SIL OFL) as TTFs in
`<project>/fonts/` or `$FONTS_DIR` (default `~/.local/share/fonts`). Renders never touch the network.

## Workflow
1. **Story and storyboard** (`references/STORYBOARD.md`). One gag or one turn per scene, 20–30 s, setup → beat → punchline →
   aftermath. Write the strip as a table (panel, gutter, what moves, the words, the SFX) and the beats as times. Pick the
   register per beat (normal / fake-epic / SD) and the ONE accent object. Show the board to the person before building.
2. **Cast sheet first.** `python3 <skill>/scripts/new-film.py my-webtoon`, then define every person with `Cast.define`
   (`references/CAST.md`): hair (a preset or a small drawing), wardrobe, and a distinct **value** per person (ink / dark dots /
   light dots / paper). Build a `cast-sheet.html` (front, 3/4 with IK hands, SD, faces, hands, `?bones=1`) like
   `examples/donut/scenes/cast-sheet.html`, render stills and get the look approved before any scene.
3. **Scenes.** One page per scene from the starter's shape: panels with `draw`/`over`/`cam`, the strip, camera stops from
   `SCRIPT.stops`, `Manga.grade` (or `?look=riso`), `Webtoon.fade`. Every balloon holds ≥ `Webtoon.readTime(text)`. Render
   stills at every stop and LOOK at them: balloons off faces, text out of the safe zones, panels reading on a phone.
   `node <skill>/scripts/debug.mjs --scene <id>` after each big edit (render.mjs output alone can hide a thrown error).
4. **Body check** (`references/BODY-CHECK.md`), every scene with acting figures:
   `node <skill>/scripts/bone-check.mjs --scene <id>` (must say "bones OK") → `python3 <skill>/scripts/body-check.py . --scene <id>
   --around <action beats> --dur <DUR>` → a **fresh rigger agent** reviews the pack with the prompt in BODY-CHECK.md → fix every
   HIGH (in the cast rig when every scene shows it, in the scene otherwise) → re-run both on the same times.
5. **Sound** (`references/SOUND.md`): `<id>.sound.json` per scene — narration lines, ≤ 3 music cues split at the register
   switches, ≤ 8 SFX, ducks under every line. Generate with ElevenLabs (two takes, never retry), tighten and level the narration,
   `python3 <skill>/scripts/mix.py`, check levels with ffmpeg (you cannot listen).
6. **Render**: `node <skill>/scripts/render.mjs v --scene <id>` per scene (run it in the background; the starter's 300 graded
   frames take ~30 s with 4 workers on a 4-core box), then `python3 <skill>/scripts/assemble.py v` → `out/film-v.mp4` (`--upload`, `--shorts` as in canvas-film).
   Open the MP4's first, middle and last seconds as stills before handing it over.
7. **Publish live** (optional): `python3 <skill>/scripts/publish.py . site/` → static pages that draw the scenes in the browser,
   with the sound as the clock.

## Rules
- **Deterministic**: every frame is `draw(ctx, t)` of `t` alone. Seeded randomness only (`Pilot.rng`, `Webtoon.hash`); boil on
  twos via `Manga.boil(t)`. No `Math.random`, no state carried between frames.
- **Portrait 1080×1920**, `?o=v`. Nothing important in the top 140 / bottom 300 px when the camera stops (phone UI).
- **Reading time**: a balloon stays ≥ 1.2 s + 0.07 s per character; ≤ 2 balloons in the reading zone; ≤ 2 lines per balloon,
  breaks at 어절 spaces. Every string goes through the kit / `Pilot.tr` (pass Korean, whole strings).
- **One accent colour** for the one thing the story is about; everything else paper, ink and dots. For the grade, draw flat
  paper, solid black and deliberate `Manga.tone` — soft colour washes turn into busy dot fields.
- **Bodies are physically possible**: limbs only through the rig (`Cast.draw` / `Cast.sd` / `Cast.reachArm` / `Cast.ik3`),
  fixed bone lengths, targets inside reach (an out-of-reach target gives a straight stick), wrist ≤ 80°, hands drawn at the grip
  and held things moving with them, arms that enter a panel start at the frame edge, near limbs in front.
- **Same cast everywhere**: people are drawn only through the film's cast file; a fix to how a person looks goes there, once.
- **Check by looking**: stills at every camera stop, the body pack, the first/middle/last second of the MP4. Fonts must be
  present (render.mjs stops rather than draw in a fallback face).

## Contract every scene page fulfils
`window.seek(t)` draws frame t; `window.DURATION`; `window.__ready = true` after fonts and init (all through `Pilot.run({ W,
H, dur, fonts: Webtoon.FONTS, draw })`). `?render=1` = no UI; `?o=v` = portrait; `?grade=0` = the raw frame before the print
pass; `?look=riso` (starter) / `?style=riso&grade=0` (donut cast sheet) = flat riso colour; `?bones=1` = joint overlay.
`window.SCRIPT` holds the scene's words and beats so timing changes never touch drawing code.
