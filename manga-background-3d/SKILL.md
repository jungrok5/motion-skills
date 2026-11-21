---
name: manga-background-3d
description: Build a manga's or webtoon's background sets as 3D scenes in code, then draw them as manga backgrounds — hand-inked pen lines found from the 3D edges (overshoot at corners, bow, taper, ink dots, the odd doubled stroke; hidden lines removed by depth; habits seeded per edge so they stay put while the camera moves) over flat screentone-like greys (quantised light with soft marker edges, white windows with diagonal glare, glowing lamps and fading light beams at night). Outputs a 1920×1080 MP4 in the "it is all 3D" reveal format — each location first as a grey clay model, a vertical wipe turns it into the manga background, letterbox with the location name, a mode label and a handwritten caption, slow camera moves, a closing card, a synthesised felt-piano track with pen-scratch wipes — plus print-size background plates (line layer on transparent, tone layer) for an artist to draw characters over, and a manga page laid out from the same sets. three.js + Canvas, a prop kit (rooms, walls with windows and doors, stairs, shelves, counters, buildings with shop fronts, poles and sagging wires, street lamps, roads, trees, lanterns …), bundled fonts, no network, no GPU. Give it a story or a place and it designs the locations, builds them, lights them, chooses the shots and writes the captions. Use for manga / webtoon background art from 3D, "3D model to manga background" reels, background plates for comics, location sheets for a story, line-art renders of a set, or to remake this reference style on a new topic ("만화 배경 3D로", "3D로 만화 배경 만들어줘", "웹툰 배경 3D", "3D 모델을 만화 배경으로", "배경 선화 렌더", "만화 배경 메이킹 영상", "이 영상처럼 만화 배경", "이 스타일로 ○○ 배경 만들어줘", "주제만 바꿔서", "manga background from 3D", "3D to manga line art", "comic background plates", "webtoon backgrounds", "漫画の背景を3Dから"). Source — made from https://x.com/nukosama/status/2123025321620644032?a=LlKRf28dkLpGafIAw10&s=19
---

# manga-background-3d

A story's background sets, built once in 3D and drawn as manga backgrounds from any angle. Each location is a
scene in code — a laundry shop, a rooftop, a spiral stair, a pier — made from a small kit of primitives and props in
real metres. The renderer looks at it through one camera two ways: as the grey clay model it is, and as a manga
background: the edges that matter (creases, silhouettes, open borders, wires) are found in 3D, kept only where the
depth buffer says they are in view, chained into strokes and drawn with a pen's habits; the light becomes a few flat
greys with soft marker edges; glass turns to paper with diagonal glare; lamps glow and beams scrape the tone at night.
The film shows that: each location opens as clay, a vertical wipe reveals the manga background, the camera drifts,
a handwritten caption says what was built, a card closes. The same sets give print-size plates (lines and tones on
separate layers) and a manga page. Every frame is `seek(t)`: the page plays live and renders to MP4.

Made in this repo after an X post by the manga artist ぬこー様ちゃん (@nukosama) —
https://x.com/nukosama/status/2123025321620644032?a=LlKRf28dkLpGafIAw10&s=19 (35 s: rooms, a classroom, a store, a
train, streets and a night festival shown as 3D models that wipe into manga backgrounds; "not one line drawn by
hand"). This skill takes the *format and the look* — clay → wipe → manga background, the letterbox, the pen and tone
language — not the artist's locations, captions, page or the AI 3D models (references/SOURCE.md). Starter:
`templates/` 「세탁소집 딸」 (27 s: a laundry shop, its rooftop room, the alley stairs, the bus stop at night). Worked
example on a topic the starter does not cover: `examples/lighthouse` 「등대지기의 섬」 (23.8 s: a spiral stair seen down
its well, a pier with two boats on a stroked sea, the lamp room at night with see-through glass and sweeping beams).
Live: https://jungrok5.github.io/motion-skills/manga-background-3d/

**Fixed by the style** (every piece): 1920×1080, 24 fps, black letterbox bars; the order — open on clay, wipe to
manga, one location per beat, hard cuts, a closing card; the wipe (left manga, right clay, a dark seam, the label
flipping at mid-wipe); handwritten text (Gaegu) — location top-left, mode label top-right, caption bottom-centre;
the manga look — lines from 3D edges with the pen habits of `LOOK.pen`, greys quantised to `LOOK.levels`, glass
glare, night glow and beams, paper grain; slow dolly cameras at eye height; the felt-piano and pen-scratch sound;
plates and pages from the same renderer. No characters: backgrounds are the product.
**Designed per topic** (never reused): which locations the story needs and what makes each one *that* place; the
props built for it; tones, sun direction and mood per location; the shot list, cameras and timings; the captions and
the card; the page layout and its narration boxes; the location names; the signs and writing in the sets.

## What's in this folder
| path | what |
|---|---|
| `lib/kit.js` | `Stage`: frames (`at`, `world`), primitives (`box` `cyl` `cone` `sphere` `torus` `plane` `extrude` `slab` `lathe` `mesh`), `line` (wires), `grid` (seams), `sign` (lettering), `glow`, `beam`, `light`, `sun`, `model` (GLB), architecture (`wall` with openings, `room`, `window`, `door`, `stairs`) |
| `lib/props.js` | the prop kit: indoor furniture and fittings, buildings with shop fronts, poles + wires, lamps, roads, trees, lanterns … (examples of the level of detail) |
| `lib/engine.js` | `Engine` + `LOOK`: lit / info / glow / post passes (clay and manga tone), edge extraction, depth-tested visibility, chaining, the pen |
| `lib/film.js` | `Film`: shots on a timeline, wipe, letterbox text, card, live player, plates (`?plate=`), the page (`?sheet=page`), the contract |
| `lib/core.js` | seeded random, hash, noise, easing, keyed cameras |
| `lib/fonts/` | Gaegu Bold (OFL) + licence |
| `lib/vendor/` | three.js r170 (MIT), GLTFLoader + BufferGeometryUtils |
| `templates/` | 「세탁소집 딸」 starter: `index.html`, `scenes.js`, `BRIEF.md` — what `new-piece.mjs` copies |
| `examples/lighthouse/` | 「등대지기의 섬」: the same files, a different world designed from its brief |
| `scripts/new-piece.mjs` | start a piece (starter, or `--from lighthouse`) |
| `scripts/render.mjs` | `--shots`, `--stills`, `--sheet`, `--plates`, `--page`, the MP4 (workers × ffmpeg) with the sound |
| `scripts/sound.mjs` | felt-piano arpeggio, pen scratch on wipes, taps on cuts, bell on the card |
| `scripts/check.mjs` | film shape, ink and tone per shot, stroke count, line stability, camera speed and clearance, determinism, glyphs, text fit, transparent plates |
| `references/` | **SOURCE** (the post beat by beat; what is / is not taken) · **BRIEF** (template + still rubric) · **KIT** (building sets, the API, cameras) · **LOOK** (passes, the pen, constants, film, plates) · **LESSONS** |

## Project layout (what you create)
```
my-sets/
  BRIEF.md     story → locations, props, light, shots, captions, card, page, review log
  scenes.js    export const scenes = { id: { name, mood, build(S) { … } } } — the sets, in code
  piece.html   new Film({ scenes, shots, page, look? }).start()
  lib/         copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("mb/", "three")
  out/         stills, sheets, plates/, page, piece.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs piece.html --shots --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flags it needs
(file access, SwiftShader WebGL).

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. A 27 s film renders in ~3 min
on 4 cores.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code: the ONE LINE; 3–5 locations, each
   with its mood and the 4–8 things that make it that place; the props the story needs that the kit lacks (real
   sizes); light per location; the shot list (open on a wipe, one beat per shot, 1.8–7 s, ~20–40 s in all) with
   captions written for this topic; the card; optionally a page. If the user brings a reference video, pull stills
   (`ffmpeg -i ref.mp4 -vf fps=1,scale=320:-1,tile=6x6 sheet.jpg`) and note its beats, then design your own sets.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-sets` (or `--from lighthouse`). Replace the laundry shop — it is
   an example of the style, not a template.
3. **Build the sets** in `scenes.js` (references/KIT.md): architecture first (rooms, walls with openings, slabs,
   stairs), then the must-read props — the story's own as small functions built from primitives, generic ones from
   the kit — then the dressing near where the camera looks, seams on floors and ceilings, wires, signs; tones per part;
   the sun; at night the glowing things and ≤ 8 lights. A GLB may stand in for something code would make badly
   (`S.model`, references/3D-MODELS.md) — never commit it unless its licence allows, with its credit.
4. **Cameras and shots** in `piece.html`: per shot `scene`, `mode`, `wipe`, `cam` keys (eye height, small moves),
   `caption`; the card; the page panels.
5. **Review stills**: `render.mjs piece.html --shots --scale .5` (model / mid-wipe / manga for each wipe shot) and
   `--page --scale .6`; score the rubric in references/BRIEF.md. Log failures in BRIEF.md, fix the set, the light or
   the camera, render again.
6. **Check**: `node <skill>/scripts/check.mjs piece.html` must end with `all checks passed`. Read the warnings too.
7. **Render**: `render.mjs piece.html` → `out/piece.mp4` (`--silent`, or `--audio music.wav` to mix your own track).
   `--plates` writes each shot's line / tone / full layers at 2400 px (`--w 3600` for print). Look at stills pulled
   from the MP4.

## Rules
- **Design per topic.** The laundry shop and the lighthouse are examples, not menus. A new story gets its own
  locations, props, light, shots and captions; never re-dress another piece's scene as a different place.
- **One style.** Every piece keeps the same film grammar (clay → wipe → manga, letterbox, handwritten text, slow
  cameras, card) and the same manga look (`LOOK`): lines only from 3D edges with the pen's habits, flat quantised
  greys, glass glare, night glow. No photo textures, no image filters standing in for line work, no second font look.
- **Built, not faked.** A location is a 3D set (check.mjs fails one under 40 primitives) that holds from every
  angle the shots use. Signs and writing are part of the set (`S.sign`), so they move with it.
- **It is that place.** Each location carries the 4–8 things the brief names, at real sizes; dress where the camera
  looks; seams on floors and ceilings for perspective.
- **Manga backgrounds breathe.** Day frames keep paper white (warned under 12 %); greys are bands, not gradients;
  ink is line (≤ 30 % of the frame), and a frame is drawn (≥ 60 strokes).
- **The lines hold still.** Stroke habits are seeded by edges, never by frame or screen position: ≥ 85 % of the
  ink stays put between frames (check.mjs). Do not add per-frame jitter.
- **The camera is a person on a slider.** Eye height unless the beat says otherwise; ≤ 0.06 m and ≤ 0.5° per
  frame; never inside or within 0.3 m of geometry (check.mjs fails both).
- **No characters.** People, animals and balloons are the artist's. Pages carry narration boxes only.
- **Code-built sets; outside models only with their licence.** Sets are code. A GLB is allowed where the style holds
  (it is inked and toned like everything else); Polyfork models follow references/3D-MODELS.md, AI-generated models
  stay out of the repo (keep them in a git-ignored folder), nothing generated is committed.
- **Pure function of t.** No `Math.random`, `Date` or state between frames; seeded randomness only. check.mjs proves
  determinism.
- **Text in the bundled font.** Gaegu covers Hangul and Latin; another script (Japanese, Chinese) needs a font that has
  it (`new Film({ fonts: [{ family, url }] })`, `font`), and check.mjs fails missing glyphs.

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS` (24), `window.SIZE = {W: 1920, H: 1080, bar}`, `window.filmInfo()`
(shots, scenes with prim / edge / wire counts, signs), `window.viewAt(t)`, `window.wipeAt(t)`, `window.linesAt(t, w)`
(the line layer as a mask), `window.depthStats(t)`, `window.textCheck()`, `window.glyphCheck()`,
`window.soundEvents()`, `window.strokeCount()`, `window.film`, `window.__ready = true` — all set by `Film.start()`
after the fonts load and the sets are built. `?render=1` = fixed canvas, no live loop; `?t=12` = one frozen frame;
`?scale=.5` = preview size; `?plate=<shot>&layer=lines|tone|full&w=2400` = a background plate; `?sheet=page` = the page.
The live page fits the window and loops: click / space pauses, ← → jump 3 s, the bar at the bottom scrubs.
