---
name: embroidery-reel
description: Make a vertical three.js film in which every item of a list is embroidered on a sewing table — a needle sews each item's satin-stitch patch and stitches its title letter by letter into linen, a paper tag drops beside it, one low gliding camera with shallow depth of field moves from item to item under leaf-dappled sun among spools, scissors and a thimble, and at the end a gold cord is couched through every item into an end card with the list. Give it a topic (a list of tools, a recipe's ingredients, a route, a lineup, steps, a menu, a team) and it designs a new reel — every patch drawn for its item from shapes that become real stitches (fill, satin, running stitch, raised edges, sheen), its own palette, titles, tags and end card — all from code (no models, images or generated media). Output is a live HTML page and an MP4 (1080×1350 by default). Use for "자수 영상", "자수 놓는 애니메이션", "수놓는 모션그래픽", "바느질 영상", "패치 자수로 리스트 소개", "한 땀 한 땀", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "embroidery animation", "stitched patches reel", "needle sewing motion graphics", "embroidered listicle", "stitch by stitch video". Source — made from https://x.com/flxrnc/status/2125681086722097551?a=cv8JTTCnpK--OKdJuUQ&s=19.
---

# embroidery-reel

A list told as embroidery. On a linen-covered table, a needle sews each item's patch — satin and fill stitches you can
see, a raised edge, thread catching the light — then stitches the item's name under it letter by letter, and a printed
paper tag falls beside it. The camera, low and close like a macro lens, glides to the next item. At the end it rises over
the whole cloth while a gold cord is couched through every item, and lands on a paper card with the list. One HTML page
plays it live (`seek(t)`); `render.mjs` writes the MP4.

Made from the post by @flxrnc — https://x.com/flxrnc/status/2125681086722097551?a=cv8JTTCnpK--OKdJuUQ&s=19 — a
36-second vertical film that embroiders 15 animation repos onto a sewing table, one patch, title and tag each, ending on
"15 repos. Stitch by stitch." (`references/SOURCE.md` says what is taken and what is not). Built and proven in this repo
on `examples/bibimbap` 「비빔밥 한 그릇」 — a recipe, a topic the source does not have.

**Fixed by the skill (the style)**
- Linen, a low warm sun through moving leaves, sewing props in the reel's threads; a macro camera with depth of field.
- Per item: an embroidered patch, an embroidered title below it, a printed paper tag; a needle that sews them.
- Stitches are real geometry from the design (fill rows, satin columns, running stitch, satin edges), shaded thread by
  thread, revealed in sewing order; the unsewn pattern shows as a faint marked outline.
- One gliding camera, item to item; the outro rise, the gold cord and the end card.
- Code only: no model files, images, HDRIs, video, audio or generated media; bundled OFL fonts; no network.
- Output: the live page (`index.html` + `reel.js` + `lib/`) and an MP4.

**Designed for every topic (never reused from an example)**
- The items and their order; every patch (what picture says the item, its base shape and colour, the shapes in sewing
  order, stitch angles); the titles and tag lines; the palette (cloth, threads, paper, accent, cord).
- Tag placement per item, timing, props that suit the topic, the end card's words.

## What's in this folder
| path | what |
|---|---|
| `lib/reel.js` | the engine: `reel({ items, outro, … })` — layout (serpentine grid sized to the frame), embroidered elements, tags, card, cord, props, linen, the leaf sun, the needle and thread, the camera rig (holds that drift into quintic moves), the timeline, depth of field + grade, the page contract and live player, measurements for `check.mjs` |
| `lib/stitch.js` | design → stitches: shapes (rect, circle, ellipse, poly, SVG path, text, line, run) → fill / satin / running stitches in sewing order → colour map, normal + order map, transfer guide, the needle's path |
| `lib/props.js` | the table from code: linen weave, leaf gobo, studio env map, spool, thimble, scissors, pincushion, button, needle |
| `lib/fonts/` | Archivo Black + Black Han Sans (titles), Inter + Noto Sans KR (tags), JetBrains Mono, Source Serif 4 — OFL, `README.md` |
| `lib/three.module.min.js` | three.js r170 (MIT, `THREE-LICENSE`) |
| `templates/reel.js`, `templates/BRIEF.md` | the skeleton `new-reel.mjs` writes: two placeholder items (the contract, not a look) and the brief form |
| `starter/` | 「A small morning」 three items + outro: runs as it is |
| `examples/bibimbap/` | 「비빔밥 한 그릇」 six ingredients, Korean titles and tags, 21 s; `BRIEF.md` with its stills review |
| `scripts/new-reel.mjs` | start a project (`--title`, `--from <example>`, `--refresh` re-copies the engine) |
| `scripts/render.mjs` | MP4 (workers × ffmpeg, `--ss`, `--audio`), `--stills`, `--sheet`, `--items` (each item when its tag lands + outro) |
| `scripts/check.mjs` | the gates (contract, code-only, pure, designed per item, legible, stitched, framing, needle, camera, outro, picture, brief) |
| `references/` | **BRIEF** (form + stills review) · **KIT** (shapes, item, film options) · **LOOK** (stitches, table, light, lens, camera, needle) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-reel/
  index.html     importmap: three → ./lib/three.module.min.js, reel/ → ./lib/
  reel.js        reel({ title, items: [{ title, lines, patch: { w, h, shapes } }, …], outro })
  BRIEF.md       the topic, items, patches, palette, timing, the stills review
  lib/           reel.js, stitch.js, props.js, three.js, fonts/ (from new-reel.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run scripts from the project's parent: `node <skill>/scripts/check.mjs my-reel`. To watch it live:
`(cd my-reel && python3 -m http.server)` → http://localhost:8000/ (click / space pauses, ← → jump a second, `?t=7.5` opens
paused on a moment, `?debug=1` shows the time, `?scale=.5` for a quick look).

Requirements: Node + Playwright Chromium (SwiftShader WebGL, no GPU needed), ffmpeg; Python 3 only to serve the page.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from `references/BRIEF.md`: the items in order (2–24; 6–8 reads best on a phone),
   each one's title (≤ 14 characters), tag line and small line, and the patch idea — the one picture that says the item.
   Then the patches (base shape and colour, shapes under → over, stitch angles), the palette, timing, props, outro.
2. **Start**: `node <skill>/scripts/new-reel.mjs my-reel --title "제목"` (or `--from bibimbap` to study one — then replace
   everything; an example is not a template).
3. **Design each patch** in `reel.js` with the shapes in `references/KIT.md`: base with a satin `outline` first, the
   picture, then details; angles that follow the subject; neighbouring patches differ in base colour or shape. Look at one
   item at a time: `?t=<its time>` live, or `render.mjs my-reel --stills <t>`.
4. **Check**: `node <skill>/scripts/check.mjs my-reel` must end `all checks passed` (the brief rows need step 5).
5. **Look**: `render.mjs my-reel --items` and `--sheet 12` at full size; answer the stills review in `BRIEF.md`
   (references/BRIEF.md, 9 questions); fix; repeat 4–5.
6. **Render**: `node <skill>/scripts/render.mjs my-reel` → `out/my-reel.mp4` (`--audio track.wav` to lay a track; the
   film is silent). Look at a contact sheet of the MP4.

## Rules
- **Design per topic.** Every item gets a patch drawn for it; a new topic gets its own palette, titles, tags and card.
  Never re-skin the starter's cup, sun and bicycle, the example's bowl and jars, or the source's repo icons.
- **One style.** Every patch in the same grammar: a satin-edged base, 3–8 shapes, the house thread width, one palette
  family; the title in the title voice; the tag printed with a sewn border. A look that needs another medium (flat
  vector, pixel, cross-stitch grid, felt) belongs to another skill or a new one.
- **Code only.** No model files, images, HDRIs, video or audio fetched or generated; no generated motion (this skill is
  code-only: references/MOTION-QUALITY.md's generated-reference path does not apply). check.mjs fails a fetch.
- **The patch says the item.** Cover the title: the patch alone should tell what it is. Readable detail ≥ 4 units at
  w = 100; lettering inside a patch ≥ 8 units.
- **Sewing order is under → over.** Base first, picture next, details and edges last; check.mjs proves every element goes
  from 0 to fully sewn in its window.
- **Readable on a phone.** Titles ≤ 14 characters; tag line ≤ 28; check.mjs fails tag caps under 14 px, title caps under
  28 px (at 1080 wide), a patch under 28 % of the frame, or an item cut off when its tag lands.
- **The needle sews.** Planted while through the cloth (no slide), a rise before every plunge, thread from the last
  stitch to the eye in the colour being sewn, a breathing hover between items, no teleport — keyed in code with the
  principles pass (references/ANIMATION-PRINCIPLES.md); check.mjs measures each.
- **One camera, gliding.** Holds drift toward the next item, moves ease with no acceleration step, nothing freezes;
  every item framed whole when its tag lands and rests ≥ .35 s before the camera leaves.
- **Pure.** Everything is a function of `t` (seeded `rng`, no `Math.random`, `Date`, timers); check.mjs renders the same
  frame twice.
- **Look before you finish.** The stills review in `BRIEF.md` is filled from rendered frames.

## Contract
`index.html` with the importmap and `<canvas id="film">`; `reel.js` calls `reel({ title, size, fps, seed, cloth, thread,
paper, ink, accent, cord, beat, stitch, travel, camera, look, props, items, outro })` (references/KIT.md).
Each item: `{ title, lines: [tag, small], patch: { w, h, scale, shapes }, tagAt, threadColor, tagWidth }`.
The page sets `window.seek(t)`, `DURATION`, `FPS`, `SIZE`, `filmInfo()`, `__reel` (`camAt`, `needleAt`, `progress`,
`frameOf`, `cardFrame`, `renderAt`, `fontsOk`), `__ready`. Query: `?render=1` (no player), `?t=`, `?scale=`, `?ss=`,
`?msaa=`, `?debug=1`.
