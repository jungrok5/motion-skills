---
name: aesthetics-film
description: Make a chaptered 16:9 "aesthetics essay film" about a culture, a craft or an idea, entirely in code — slow camera moves through procedural three.js sets (ink mountains melting into a mist sea, curved-eave halls, plastered walls with moon gates, lattice windows of paper, bamboo, pines, scholar's rocks, turned vessels, zithers, censers with smoke, lanterns, bracket sets that come apart, flowing light), framed by numbered chapter badges, bilingual subtitles typed character by character with accent words in seal red or gold, callout labels on objects, a synthesised score (plucked zither, flute, drone, bells) and a closing title card with a red seal. Zero 3D assets, zero image files, no npm install; renders frame by frame to a 1920×1080 MP4 and plays live in a browser with sound. Give it a topic ("Korean beauty", "wabi-sabi", "the tea ceremony", "Islamic geometry", "a Gothic cathedral's light") and it writes the brief and the essay, designs the sets, objects, light and music for that topic, and renders. Use for "aesthetics film", "cultural documentary in 3D", "essay film", "three.js art film", "Chinese / Korean / Japanese aesthetics video", "ink painting 3D", "make a film like 中国美学", or Korean requests like "미학 영상", "한국의 미 영상 만들어줘", "문화 다큐 3D 영상", "수묵화 느낌 3D 영상", "이 스타일로 주제만 바꿔서 영상", "three.js로 미학 영상". Source — made from the X post https://x.com/YFeng2022/status/2117924044439712156 (LanFeng, 《中国美学》: pure code, zero 3D assets, Three.js + TypeScript + Vite, music synthesised in Python).
---

# aesthetics-film

A slow, chaptered essay film about the beauty of something — a culture, a craft, an idea — told in five or so short
chapters, each one an idea, a place and a few objects: ink peaks dissolving into a mist sea, a walk through a garden
court, a close look at a bowl or an instrument, structure coming apart and together, a closing title card stamped with
a seal. Everything on screen is generated in code: three.js geometry and shaders for the sets, canvas-painted textures,
a 2D chrome layer for the badges, subtitles and callouts, and a synthesised score. Every frame is `seek(t)`, so the same
page plays live (the score is synthesised in the browser) and renders to an MP4 frame by frame.

Made from **LanFeng's X post** https://x.com/YFeng2022/status/2117924044439712156 — 《中国美学》 (Chinese Aesthetics),
a 3 min 28 s film "made in pure code with zero 3D assets — Three.js, TypeScript, Vite; the music synthesised in Python".
The post shares only the video; there is no source repository. What this skill takes from it is the grammar (studied
from stills, see `references/LOOK.md`): the chapter structure and chrome, the paper-and-ink palette, the slow camera,
the typed bilingual subtitles, callouts, the seal card, procedural everything. The film itself, its text and its scenes
are never copied. Worked example: `examples/korean-beauty` 「비움의 미학 · 한국의 미」 (58 s, 4 chapters, Korean +
English) — a different culture with every set, object and melody designed new from its `BRIEF.md`.

**Fixed (the style):** 16:9, 30 fps; 3–6 numbered chapters + the closing card; the chrome (seal-red number badge with
title + spaced English caps top-left, the brand mark top-right, subtitles typed character by character bottom-centre
with the English line in italic serif under it, accent words in seal red on paper / gold on dark, gold-ruled callouts,
the card: dry-brush stroke → title + seal → one quiet line); slow continuous camera paths, cross-fades within a chapter
and a dip through paper between chapters; far things dissolve into the paper or the fog, never into black; one light
preset per shot from `lib/look.js`; procedural geometry and canvas textures only; a score of plucked strings, flute,
drone and bells on one scale.
**Designed per topic (in `BRIEF.md`, built in the project):** the thesis and the chapters, every line, the sets (what
places say this culture), the objects (what things carry each idea), colours inside the presets, the scale, tonic and
moods of the score, the brand mark, the seal. The template (a lantern on a night lake) and the example (Korean beauty)
are examples of the style, not a menu — `references/BRIEF.md`.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: sets (`F.set`), the essay as data (`F.chapter`, `F.say` → timed lines, `F.callout`, `F.card`, `F.overlay`), shots (`F.shot`: a camera path through a set under one light preset; cross-fade, dip to paper), the picture chain (Neutral tone map, grade, paper tooth + grain, vignette, chrome on top), the live player that synthesises the score, `check()`, the render contract |
| `lib/kit.js` | the world kit — landscape: `inkMountains`, `mistSea`, `mistBanks`, `islet`, `pine`, `boat`, `water`, `moon`; plants and stones: `bamboo`, `tree` (plum · cherry · maple · bare), `rock` (scholar · boulder · slab); architecture: `floor`, `platform`, `roof` (the curved, corner-lifted roof), `hall`, `wall` (moon · rect · gourd · octagon openings), `lattice` (grid · tti · diamond · ah · ice), `railing`, `table`; objects: `vessel` (bowl · cup · moonjar · vase · jar · plate · your profile; glazes), `zither`, `censer`, `smoke`, `lantern`, `panel`; structure: `assembly`, `brackets` (explode); light: `ribbons`, `dust`, `fall` (rain · petals · snow); helpers `mat`, `MAT`, `merge`, `bar`, `taperTube` |
| `lib/tex.js` | canvas-painted textures: wood, stone pavers, ground (gravel · earth · grass · moss), raked gravel, plaster, roof tiles, hanji paper, glaze (crackle, speck), bronze, bark, mist, leaves, blossom, soft dot, `painted()` for your own |
| `lib/chrome.js` | the 2D layer: badge, brand, typed subtitle with accents, callout, dry-brush stroke, seal, title card |
| `lib/look.js` | the look as numbers: `LIGHTS` (paper · garden · interior · golden · hall · night · snow) and the chrome colours |
| `lib/score.js` | `renderScore(spec)`: zither (Karplus–Strong with slides), flute, drone, bells, gong, drum, woodblock, wind / rain / water; moods mist · walk · flute · still · flow · night · close; `SCALES` (Chinese, Korean, Japanese pentatonics, church modes, hijaz); Freeverb |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `film.html` 「一盏灯 · A Lantern」 (2 chapters + card, 28 s, Chinese + English), `score.js`, `BRIEF.md` (the brief to fill), `fonts/` |
| `examples/korean-beauty/` | the worked example: `BRIEF.md` (facts, chapters, designed-for-this-topic list, rubric), `index.html`, `score.js`, `fonts/` |
| `scripts/new-film.mjs` | start a project (template or `--from korean-beauty`) |
| `scripts/fonts.mjs` | fetch subset fonts holding exactly the film's characters (Noto Serif KR / SC / TC / JP or Cormorant + EB Garamond, OFL) into `fonts/` |
| `scripts/check.mjs` | loads clean · every shot draws · deterministic · lines readable and not overlapping · callouts on screen · fonts cover every character · prints DURATION and the tables |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/score.mjs` | the score → WAV at −18 LUFS, read straight from the page (`score.mjs film.html`) |
| `references/` | **BRIEF** (fixed vs per topic, the brief, the stills rubric) · **ESSAY** (thesis → chapters → lines → shots) · **LOOK** (what was measured on the source, the values) · **KIT** (API) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md        thesis, facts, chapters + lines, sets/objects/colour/sound designed for the topic, rubric (written first)
  film.html       essay (chapters, lines) → sets → shots → callouts + card → F.start()
  score.js        export const score = (F) => ({ tonic, scale, sections, hits })   (times from the film's chapters)
  fonts/          subset fonts from fonts.mjs (fonts.css, *.woff2, chars.txt)
  lib/            copy of the skill's lib/ (new-film.mjs), imported through an import map ("essay/")
  out/            stills, sheets, score.wav, the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`.
The page is an ES module: view it through a local server (`python3 -m http.server`); the scripts pass Chromium the flag
for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg; the network once per text change for `fonts.mjs` (Google Fonts).
No npm install, no GPU, no API keys. Without a GPU, SwiftShader spreads one browser over every core, so keep 1–2 workers
(the default is 2): on 4 cores a 1920×1080 frame takes ~1–1.8 s (shadowed interiors are the slow ones), a `--scale .5`
frame ~0.3–0.8 s — the 58 s example is ~45 min at full size, ~15 min at half size. With a GPU it is real time.

## Workflow
1. **Topic → brief.** Take the user's topic (a culture, a craft, a material, a building, an idea). Write `BRIEF.md` from
   `templates/BRIEF.md` (`references/BRIEF.md`): a one-line thesis; 3–6 chapters, each one idea with a two-word title and
   an English name; the facts each line rests on, with sources; then — designed for *this* topic — the sets, the objects,
   the colours, the scale and moods of the score, the brand mark and the seal. Show the user the thesis, the chapter
   list and the lines; once they agree, do the rest without asking.
2. **Lines** (`references/ESSAY.md`): 2–3 lines a chapter, ≤ 20 characters in CJK (≤ 9 words in Latin scripts), each
   with an English line; never describe what the picture already shows — say what it means. One accent word a line at
   most. 50–120 s is the sweet spot (the source ran 208 s; render time grows with length).
3. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from korean-beauty`). Replace the template's essay,
   sets, shots and card — keep nothing because it is there.
4. **Sets** (`references/KIT.md`): one set per place (2–5 in a film), built once with the kit and returned objects the
   shots move (`return { jar, doors }`). New things the topic needs (a stupa, a loom, a mihrab, a kiln) are built in
   the project from the same pieces (`S.vessel` with your own profile, `S.lattice({ segments })`, `S.roof`, `S.assembly`,
   `S.mesh` + `S.MAT`, `painted()` textures) — not by editing `lib/`.
5. **Shots**: one to three per chapter; each a slow path (2–3 points) and a look target, 4–12 s, the light preset that
   fits; `xfade` 1–2 s inside a chapter, `dip` 1.2–1.5 s at a chapter change; time them from the lines (`L[1].from`).
   Callouts name a thing on screen with its native name and an English gloss.
6. **Fonts**: `node <skill>/scripts/fonts.mjs film.html` (again after any text change).
7. **Check**: `node <skill>/scripts/check.mjs film.html` until `check OK`; fix every warning you can.
8. **Stills and rubric**: `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`, open the sheet, score it
   against the rubric in `BRIEF.md` (≥ 12 / 14), fix, repeat. Look at full-size stills of every callout and the card.
9. **Score**: write `score.js` (moods per chapter, a knock or bell at chapter changes), then
   `node <skill>/scripts/score.mjs film.html` → `out/score.wav`. Play the live page to hear it with the picture.
10. **Render**: `node <skill>/scripts/render.mjs film.html --audio out/score.wav` → `out/film.mp4`. Watch it once through.

## Rules
- **Deterministic**: every frame is a function of `t` — seeded `rng`, ticks driven by `t`, `update(lt, objects)` *sets*
  state and never accumulates. No `Math.random`, no `Date`. check.mjs proves it.
- **Design per topic**: the sets, objects, colours and music come from the brief. Never drag in the template's lantern,
  the example's moon jar, or anything recognisable from the source film (its pavilion, guqin, Taihu rock, ink-tone dots)
  because they are there.
- **One style**: whatever is new keeps the grammar — paper and ink, far things dissolve into paper or fog, materials
  from `mat` / `MAT` / tex (never flat unlit colour except seals and glows), presets from `look.js`, the chrome as is.
- **The camera never stops and never hurries**: every shot moves (a path of ≥ 2 points, a look that travels, or a fov
  change); the default `glide` ease keeps a little speed at both ends; no cuts on motion — cross-fade or dip.
- **Text is short and true**: ≤ 20 CJK characters a line, an English line under each, one accent word at most; every
  claim rests on a fact in `BRIEF.md`. Lines never overlap and stay up long enough to read (check.mjs).
- **Callouts point at the thing**: the anchor is on the object, inside the frame, not under the subtitle (check.mjs).
- **Fonts are subset and bundled**: run `fonts.mjs` after any text change; check.mjs fails on a missing glyph.
- **Original everything**: never reuse the source film's text, chapter titles, scenes or brand ("AI 科普"); the brand
  mark is the topic's.

## Contract every film page fulfils
`window.seek(t)` draws frame t synchronously; `window.DURATION`, `window.FPS`, `window.film`; `window.__ready = true`
after fonts and the warm-up — all set by `F.start()`. `film.scoreSpec()` returns the score spec; `film.allText()` every
character drawn. Query: `?render=1` (no player), `?scale=.5`, `?t=12.4` (open on a frame), `?msaa=0`, `?mute=1`.
