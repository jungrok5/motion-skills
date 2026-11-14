---
name: shred-poster
description: Make an 8-second vertical (9:16, 1080×1920, 60 fps) seamless-loop video in which a printed typographic poster is ripped into strips, cascades as paper ribbons, is fed through a strip-cut shredder and is rebuilt line by line, with a synthesised sound design (rip, ribbons, motor, a click on every landing) mastered to −14 LUFS. Give it a topic (an event, a brand, a launch, a club, a book, a word) and it designs a new poster for that topic — the words and their hierarchy, the grid, the fonts, the palette with one accent, a picture drawn in code or a photo as a round-dot halftone, topic-specific marks — then a beat sheet, the cut, the floor, the machine, the grade and the sound character, all rendered as real paper in three.js (fibre, satin ink, light through thin stock, crease folds, a height-map pile so paper never passes through paper, true motion blur from sub-frames). One HTML file loops live in the browser and renders frame by frame to MP4. Use when asked for a shredded-poster video, a paper shredder reel, a typographic poster animation for Reels / TikTok / Shorts, "make a poster video like this", or a motion poster for an event ("포스터 파쇄 영상", "파쇄기 영상", "포스터가 찢어지고 다시 맞춰지는 영상", "타이포 포스터 릴스", "세로 루프 영상", "모션 포스터", "이 스타일로 ○○ 포스터 영상 만들어줘", "주제만 바꿔서", "shred poster", "shredder reel", "paper shred loop", "typographic poster reel", "motion poster", "poster loop 9:16"). Source — made from https://github.com/amirmushichge/shred-kit, shared at https://x.com/AmirMushich/status/2121339167800213934?a=knMN6C_A1VHmWGGzS4c&s=19
---

# shred-poster

An 8-second vertical loop whose protagonist is a **printed poster**: frame 0 is the finished poster, readable; its strips
rip sideways and the camera lunges at the hero line; paper ribbons fall and stack while a hero ribbon carries the
headline in the accent colour; the poster is fed bottom-first into the cutter discs of a strip-cut shredder (an inset on
the poster's paper) and the camera dives under them into the curtain of strips; then scrambled strips slide in and snap
into line in a wave, a click on every landing, and the last frame is the first frame again. Everything is code: the
poster is drawn on a 2D canvas with real type, the paper and the machine are three.js, the sound is synthesised from the
film's own timings. `build.mjs` joins the engine, the project's fonts and its sources into one `index.html` that loops
live (click for sound) and `render.mjs` turns into an MP4 with sound.

Made from **Shred kit** by Amir Mušić — <https://github.com/amirmushichge/shred-kit> (a Blender + Python template:
the poster drawn in PIL, four shots in Cycles, an OpenCV edit, a sound design on recorded paper), shared at
<https://x.com/AmirMushich/status/2121339167800213934?a=knMN6C_A1VHmWGGzS4c&s=19>. That kit is GPL-3.0 and fixed to
one poster layout; **none of its code is here**. Its methods — the four-shot grammar, the timings, the strip and ribbon
behaviour, the height-map stacking, the feed curve, the camera moves, the edit (whips, punches, the inset, the grade)
and the sound plan — were studied (`references/SOURCE.md`) and this engine was written from scratch in three.js around
them, so it runs in a browser with no Blender, and so the poster is **designed per topic** instead of filled in.
Built and proven in this repo on `examples/toego` 「퇴고」 — a poster for a Saturday writing circle on 원고지
(manuscript-grid paper) with an editor's red-pen marks, Noto Serif KR. `starter/` (Harbour Swim Club, "SWIM at first
light") is a second, unrelated topic.

**Fixed by the skill (the style)**
- The four-shot grammar and its clock: hook (readable poster → rip → lunge) · cascade (ribbons, the hero ribbon) ·
  machine (one move: rush, bite, dive under, curtain; an inset on a plain ground) · rebuild (a wave of landings, a click
  each, a hold) — and a seamless loop. 9:16, 1080×1920, 60 fps, 8 s by default.
- The poster is printed matter: real type on paper, a strict grid, big type cropped by the sheet, a round-dot halftone,
  rules, running text — and **one accent**. The hero line rides on the accent.
- The material: matte paper, satin ink, fibre, light through thin stock, the print faint on the back, crisp crease
  folds, ragged cut edges; ribbons never pass through each other (a height-map pile); a top-down long lens on the floor.
- The finish: true motion blur from sub-frames, whips on cuts, punches on the rip and the final click, depth of field in
  the cascade, glow, Khronos PBR Neutral, a gentle S with cool shadows and warm highlights, vignette, fine grain.
- The sound follows the picture's own timings and is mastered to −14 LUFS with −1 dBFS of headroom.
- A frame is a pure function of film time; `check.mjs` must pass.

**Designed for every topic (never reused from the example or the starter)**
- The poster: the words (hero line, subline, small lines, giant cropped letters, running text in the topic's voice),
  the hierarchy and the grid, the display and text fonts, paper / ink / accent, the picture and how it is drawn, any
  topic-specific marks (a manuscript grid, proof marks, a ticket stub, a map, a score…).
- Which rows are the hero (`P.mark('hero')`) and what sits at the bottom (the shredder bites the bottom half on camera).
- The cut (strip count, unevenness), the landing order (top, bottom, middle), the floor (concrete, a desk, a board),
  the machine's body colour, the inset ground, the beat sheet if the topic needs another tempo, the grade's warmth and
  the sound's character (crisper or heavier paper).

## What's in this folder
| path | what |
|---|---|
| `lib/00_core.js` | `SP`: numbers, easing, seeded randomness, smoothed fields, crease folds, colour and contrast |
| `lib/10_poster.js` | `SP.poster` + the layout kit `P` (text, fit, crop, columns, halftone, rule, band, mark), paper grain, font loading |
| `lib/20_materials.js` | paper (fibre normal, satin ink, translucency, back print), floor, steel, plastic, studio environment, strip meshes |
| `lib/30_sheet.js` | the poster as strips on the floor: the **hook** and the **rebuild** (plan, wave, springs, shiver, glint) |
| `lib/40_cascade.js` | the **cascade**: `Ribbon` (arches, sway, twist, landing), `Stack` (height-map pile), the hero ribbon, camera |
| `lib/50_machine.js` | the **machine**: feed curve, sheet, lanes, cutter discs, combs, lights, the camera rail (`SP.rail`) |
| `lib/80_post.js` | sub-frame accumulation and the finish pass (DOF, whips, punches, inset, glow, tone map, grade, grain) |
| `lib/85_sound.js` | voices (rip, whoosh, swish, pat, motor, grain, slide, click, thump), BS.1770 loudness, master, WAV |
| `lib/90_film.js` | `SP.film`: renderer, timeline, the edit, sound cues, the live loop, the render API |
| `lib/shell.html` · `vendor/` | the page shell · three.js r170 (MIT, `vendor/LICENSE`) |
| `scripts/build.mjs` | sources + fonts → one `index.html` (only the font chunks the text uses) |
| `scripts/font.mjs` | `add` a Google Fonts family (its @fontsource package, OFL) or your own file · `prune` · `list` |
| `scripts/render.mjs` | `--poster` · `--stills` · `--sheet` · `--draft` · the final MP4 + `sound.wav` + `cues.csv` + `cover.jpg` |
| `scripts/check.mjs` | loads clean · poster issues · every shot reads · deterministic · seamless loop · lands and holds · loudness |
| `scripts/new-film.mjs` | start a project from the starter or `--from toego` |
| `starter/` | Harbour Swim Club — Archivo Black + Archivo, signal yellow, steps ①–⑤ commented |
| `examples/toego/` | 「퇴고」 — `BRIEF.md`, a 원고지 grid with proof marks, Noto Serif KR 900/400 (pruned), middle-out rebuild |
| `references/` | **BRIEF** (topic → brief, the reviews) · **LOOK** (what makes the style) · **KIT** (every option) · **SOURCE** (what was learned, what is not taken) · **LESSONS** |

## Project layout (what you create)
```
my-poster/
  BRIEF.md            written first (references/BRIEF.md)
  film.json           { "title", "lang", "bg" }
  fonts/<face>/       faces.json + woff2 + LICENSE   (scripts/font.mjs add)
  src/10_poster.js    const POSTER = () => SP.poster({ paper, ink, accent, fonts, draw(P) { … } })
  src/90_film.js      SP.film({ cuts, poster: POSTER, sheet, cascade, machine, studio, grade, sound })
  index.html          built (do not edit)
  out/                poster.png, stills, sheet.jpg, draft.mp4, film.mp4, sound.wav, cues.csv, cover.jpg
```
Extra sources (`src/20_picture.js`, `src/30_marks.js` …) are fine: files are joined in name order.

## Requirements
Node 18+, Playwright with Chromium, ffmpeg; npm access once per font family. A GPU is optional: without one WebGL runs
on the CPU (SwiftShader): the final 480 frames (1080×1920, 4 sub-frames each) took 38 min (4.7 s a frame) on 4 cores with
3 workers for 「퇴고」, the cascade being the slowest shot; a draft takes 3–4 min, a contact sheet under a minute.

## Workflow
Run scripts from anywhere; paths are `<skill>/scripts/…` and the project folder.

1. **Topic → brief.** Write `BRIEF.md` in the project before any code, from `references/BRIEF.md`: who it is for, the
   hero line (3–7 characters hit hardest; Korean 2–4 syllables), every other line with its length, the grid sketch, the
   fonts and why, paper / ink / accent (contrast ink:paper ≥ 4.5, ink:accent ≥ 2), the picture and how it will be drawn,
   the topic's own marks, what sits at the bottom (it is what the shredder bites on camera), the cut and landing order,
   floor, machine colour, inset ground, grade and sound character, and where it will be posted.
2. **Start the project.** `node <skill>/scripts/new-film.mjs my-poster` (from the starter), then fonts:
   `node <skill>/scripts/font.mjs add my-poster "Space Grotesk" 700` (any Google Fonts family by name; your own file by
   path if you own it). Never download fonts from anywhere else.
3. **Design the poster** in `src/10_poster.js` for the topic — this is the main creative work, not a fill-in. Use the
   kit (`references/KIT.md`): `P.fit` for the big lines, `P.band` for the accent behind the hero line, `P.mark('hero')`
   on those rows, `P.crop` for giant letters, `P.halftone` with a picture drawn in code (or an `<img>`), `P.columns` for
   running text, and `P.ctx` for anything the topic needs (a grid, proof marks, a stamp, a diagram).
   `node <skill>/scripts/render.mjs my-poster --poster` → `out/poster.png` in seconds; iterate until it is a poster
   worth printing (review A in `references/BRIEF.md`).
4. **Tune the film** in `src/90_film.js`: strips and jitter, landing order, floor, machine body, inset ground, grade,
   sound character; change `cuts` only if the topic needs another tempo (keep the four shots).
5. **Stills.** `render.mjs my-poster --sheet` (three moments per shot) and `--stills 0,1.3,3.9,6.2`; open them and
   score review B. Fix and repeat.
6. **Check.** `node <skill>/scripts/check.mjs my-poster` must pass (poster issues, every shot reads, deterministic,
   seamless loop, lands and holds, −14 LUFS with headroom).
7. **Draft, then final.** `render.mjs my-poster --draft` (half size, 30 fps) to judge the motion and the sound; then
   `render.mjs my-poster` → `out/film.mp4` (1080×1920, 60 fps, AAC) + `sound.wav` + `cues.csv` + `cover.jpg`. Tell the
   user the expected time before a final render on a machine without a GPU.
8. **Lessons.** Anything that broke and how it was fixed goes into `references/LESSONS.md`.

## Rules
- **Design for the topic.** Every word, the grid, the fonts, the palette, the picture and the marks come from the
  topic's brief. Never re-use the starter's or 「퇴고」's poster with new words, and never pick "the closest example".
- **One style.** New posters keep the grammar: printed matter, one accent, a hero line on the accent, big cropped type,
  a halftone, a strict grid; the four shots and their order; the paper material; the finish.
- **Frame 0 must read** as a finished poster; the hook's first frames are held (the loop needs them).
- **The hero line must be marked** (`P.mark('hero', {y0, y1})`) on the rows it occupies — the hero ribbon is cut from
  exactly those rows and the hook lunges at them. Keep it short; give it the accent band.
- **The bottom half is what the shredder eats on camera** — put a line there worth seeing sliced (often the hero again).
- **No text off the sheet or over its box** (`poster.issues`; check fails). Mind descenders in the giant lines.
- **Contrast**: ink on paper ≥ 4.5:1, ink on the accent ≥ 2:1. Dark paper with light ink works (the halftone keeps it positive).
- **Determinism**: no `Math.random`, no `Date`, no state carried between frames — `SP.rng(seed)`, `SP.hash`, closed forms.
- **Fonts**: Google Fonts (OFL) through `font.mjs`, or files the user owns; keep the LICENSE next to them; `prune` before
  committing an example.
- **Never put the MP4 in a docs site**; the live page is the demo.

## Contract
- `SP.film(F)` once, last. `F.poster` is a function returning `SP.poster({...})`; the page sets `window.READY`.
- `window.film`: `DURATION`, `FPS`, `renderAt(t)` (draws the frame at t, sub-frames included), `shots`, `cuts`,
  `issues`, `marks`, `cues()`, `sound()` (WAV base64 + loudness), `soundStats()`, `posterPNG()`, `landings()`.
- `?render=1&scale=…&mb=…&t=…` — render mode (fixed size, preserved buffer, `mb` sub-frames); without it the page
  loops live at the display's rate with 4× MSAA and one sub-frame.
- Poster units: 1000 × 1500, y down from the top; world: the poster is 2 × 3 units, z up.
