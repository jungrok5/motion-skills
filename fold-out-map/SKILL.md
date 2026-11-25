---
name: fold-out-map
description: Make a fold-out travel map film in three.js — a folded paper travel leaflet lies on a wooden desk (its printed cover on top), opens over its cross fold and fans out its accordion panels into a printed city map (cream stock, street network, coastline bands, contour-lined hills, serif names, a title and legend), then a low camera follows a red route that draws itself from stop to stop while painted die-cut pop-up standees of each landmark spring up out of the paper beside tent label cards (number, local name, romanised name, one note), the light turns from day through golden hour to night (windows, lanterns and bridge cables lit, pools of lamp light on the paper), and it rises to the whole map at night on the desk. Code only — landmarks are drawn in code, no image or video model. Give it a place and a route (a city, a trip, a campus, a festival, a made-up town) and it designs the map, the stops, the pop-ups, the camera and the light for that place. Outputs a live page and a 1080×1920 MP4 with a generated score (paper rustles, card flaps, a pad that darkens at night). Use for "travel map video", "unfolding map", "pop-up map", "folded map animation", "route map with landmarks", "trip itinerary video", "city guide short" ("여행 지도 영상", "펼쳐지는 지도", "접힌 지도가 펴지는", "팝업 지도", "여행 코스 영상", "명소 지도 쇼츠", "이 스타일로 ○○ 여행 지도 만들어줘", "도시만 바꿔서"). Source — made from https://x.com/yyyole/status/2125234904992776492?a=NGnIQg0wBl6JEjDN2Fw&s=19.
---

# fold-out-map

A short vertical film of a trip in the style of a printed fold-out travel map. A leaflet lies folded on a desk under window
light — its cover printed with the place's name and an emblem. It opens over its cross fold (the guide panel inside), then
the accordion creases open one after another and the sheet settles flat with its creases still showing. The camera comes
down low over the paper and follows a **red route that draws itself** from stop to stop; as it reaches each stop a
**painted die-cut pop-up** of the landmark springs upright out of the paper (one soft overshoot) and a **tent label card**
tilts up beside it. The light moves through the day — golden hour, dusk, night — and at night the pop-ups' windows,
lanterns and cables glow and pools of warm light lie on the paper. The camera rises to the whole map at night on the desk.
Every frame is `seek(t)`, so the same page plays live and renders frame by frame to MP4.

Made from 沐阳 (@yyyole)'s post on X (https://x.com/yyyole/status/2125234904992776492?a=NGnIQg0wBl6JEjDN2Fw&s=19,
Nov 2026: a 55 s Three.js travel map of Chengdu "from one prompt" — a folded leaflet on a desk unfolds, landmark
cut-outs stand along a red route, the camera skims low, day turns to night). Only the form is borrowed — the leaflet,
the unfold, the red route, the stand-up landmarks, the low camera, the day-to-night light. The source painted its
landmarks with an image model; here every pop-up is drawn in code (`lib/cardart.js`), and the code, the map and every
place are this repo's own. Worked example: `examples/busan` 「부산」 (38 s): Gamcheon → Taejongdae → Haeundae →
Haedong Yonggungsa at golden hour → Gwangan Bridge at night. three.js r170 is vendored in `lib/` (MIT).

**Fixed in every film (the style)**: a paper leaflet (accordion of panels × one cross fold) on a wooden desk, cover
printed on the back of one panel, a guide on the back of the last · the unfold: cross fold first, then the accordion
creases from the top of the stack, each settling with a small overshoot · a printed-map front: cream stock with fibres,
tan streets, blue-green water with coastline bands, contour hills, serif names (Map Serif + Map Italic), a big title, a
border, a legend, compass and scale bar, the crease lines baked in · a red route drawn by arc length, with a head dot ·
painted die-cut pop-ups (white cut border, gouache grain, grey board back) that are hidden until the line reaches them,
then grow out of the paper and spring upright · tent labels (red number disc, local name, romanised italic, a red rule,
one note) · a low touring camera that settles on each stop, drifts, and lifts between stops · window light from the upper
left, day → golden → dusk → night with lit windows and lamp pools · tilt-shift depth of field from the paper plane,
vignette, grain · 1080×1920, 30 fps, 25–45 s.

**Designed for each place**: the map (projection centre and scale, coast, islands, rivers, hills, districts and their
grids, main roads, every name, title and colours where the place asks for it), the cover and guide panels, the route
and its order, 3–6 stops — what each pop-up **shows** (new art drawn with the card kit: buildings, roofs, towers, bridges,
trees, water, people printed on the card), its layers, its size, which way it faces — each label's words, the camera on
each stop (yaw, height, distance), the timing, when the light turns, the desk props, the closing shot, the music.

## What's in this folder
| path | what |
|---|---|
| `lib/foldmap.js` | the engine: `Film` (desk, props, `sheet`, `unfold`, `trip` = route + pop-ups + labels + touring camera, `light`, `track`, `title`, checks, cues, live player, post: tilt-shift DOF from the paper plane, vignette, grain), `Sheet` (the folding: accordion chain + cross fold, cell textures, `toWorld`), `projector`, `spline`, light presets `LIGHTS` |
| `lib/mapart.js` | `paint` / `paintBack` → a `MapPainter` in map units: `paper sea land river park hills streets road rail text border compass scalebar` + `maskOf` |
| `lib/cardart.js` | `card({ aspect, draw })` → a die-cut pop-up (colour, night lights, grey back). The `Card` painter: `ground block windows gable hanok hall tree(round·pine·cone·palm·willow·bush) rock waves sand lighthouse pagoda lanterns cable umbrella people houses` + `poly rect line circle vgrad shade lit` |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/film.html` | a commented 24 s film of a made-up harbour town (three stops), with `fonts/` |
| `templates/BRIEF.md` | the brief form, copied into each project |
| `scripts/new-film.mjs` | start a project: `lib/`, `film.html` (template or `--from busan`), `fonts/`, `BRIEF.md`, `out/` |
| `scripts/fonts.mjs` | subset "Map Serif" (Noto Serif KR/JP/SC) + "Map Italic" (Noto Serif italic) for exactly the film's text → `fonts/` (network once) |
| `scripts/render.mjs` | stills (`--stills 2,9`), a contact sheet (`--sheet 12 --from 5 --to 9`), or the MP4 (workers × ffmpeg; `--audio`) |
| `scripts/check.mjs` | proves the page: loads clean, fonts cover the text, deterministic, no blank frames, every rule at every 0.25 s |
| `scripts/score.mjs` | a WAV score from the film's cues: pad + plucks that darken at night, paper rustles on the unfold, flaps on pop-ups, chimes on labels |
| `references/` | **BRIEF** (topic → brief, review criteria) · **LOOK** (numbers that make the style) · **KIT** (API, drawing your own pop-up) · **LESSONS** |
| `examples/busan/` | the worked example with its `BRIEF.md` and `fonts/` |

## Project layout (what you create)
```
my-trip/
  BRIEF.md       the design, written first (templates/BRIEF.md)
  film.html      Film.create → sheet (front map, backs) → cards → STOPS → desk → unfold → trip → light → track → start
  fonts/         fonts.css + subset woff2 for the film's text (fonts.mjs)
  lib/           copy of the skill's lib/ (new-film.mjs); imported through the import map
  out/           stills, sheets, score.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --stills 2,9 --scale .5`. To view the
page live, serve the folder (`python3 -m http.server`) — it is an ES module; the scripts pass Chromium the flag for file://.

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg; network once for `fonts.mjs`. No npm install. Half-size stills
take under a second; a 1080×1920 frame takes about 1–2 s on a CPU box with 4 workers (38 s ≈ 15–25 min).

## Workflow
1. **Place → brief.** Write `BRIEF.md` from `templates/BRIEF.md` following `references/BRIEF.md`: the trip in one line,
   the map (centre, km per unit, what is on it), 3–6 stops in route order with what each pop-up shows and its words,
   the cover and guide, where the light turns, the camera on each stop, the sound. Design for this place — never fill the
   template's or the example's slots with new names.
2. **Start**: `node <skill>/scripts/new-film.mjs my-trip` (or `--from busan` to study a full film).
3. **The map.** Sheet size (`cols`, `panel`), `projector`, then `S.front(paint(m => …))`: paper → sea/coast → hills →
   rivers → streets (with a land mask) → roads → names → title, border, legend, compass, scale. Then
   `S.backs(paintBack(…))`: the cover (c 0, top row), the guide (last column), plain panels. Still the open map from
   above (`?off=pop`): names readable and not overlapping, the title clear, no stop on a busy name.
4. **The pop-ups.** One `card({ aspect, draw })` per stop, drawn with the Card painter (`references/KIT.md`) — what
   the place really looks like, simplified to a few shapes; lights where they would be lit at night; a ground strip or
   water at the foot. Layers (`art: [{ card, dz, k }]`) for depth (a skyline behind, a beach in front). Look at each
   card flat (`card(...).canvas`) and in the film.
5. **The trip.** `STOPS` with `at`, `art`, `w`, `yaw` (which side it is seen from — the card faces the camera), `label`,
   then `F.unfold(...)`, `F.trip({ stops, route, start, hold, travel })`, `F.light([...])`, and your own opening and
   closing keys with `F.track([...])`. `run fonts.mjs` once the words exist.
6. **Sheets**: `render.mjs film.html --sheet 12 --scale .4` for the whole film, `--sheet 12 --from 1 --to 7` for the
   unfold, stills on each stop (`--stills` at each arrival + 1 s). Score them with the review criteria; write the
   results into `BRIEF.md`.
7. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`.
8. **Sound and render** (background): `node <skill>/scripts/score.mjs film.html` → `out/score.wav`, then
   `render.mjs film.html --workers 4 --audio out/score.wav` → `out/film.mp4`. Look at stills from the MP4 before
   handing it over (`ffmpeg -ss 20 -i out/film.mp4 -frames:v 1 x.png`).

## Rules
- **Design for the place.** The map, the stops, what every pop-up shows, the words and the camera come from the brief.
  Do not reuse the template's clock tower or the example's bridge because they exist; draw what the place has.
- **One style.** New pop-ups use the same language: flat gouache shapes lit from the upper left, a white die-cut border,
  grain, a grey back; the printed map keeps its palette, serif names and line weights. No photo textures, no real map
  tiles, no bloom, no generated images or video (code only).
- **Pure function of t.** No `Math.random`, `Date` or state between frames — `rng(seed)` at build time, `hash`,
  `noise`; animate in `F.onFrame((t, light) => …)`. `check.mjs` catches violations.
- **Paper is paper.** The unfold opens the cross fold first, then the accordion from the top of the stack (`order:
  'out'`) so the sheet never lifts off the desk; creases stay visible; the open sheet keeps a small zigzag. Props on the
  desk never touch the open sheet (a check).
- **Pop-ups wait for the line.** A pop-up is hidden until the route reaches it, then grows out of the paper and springs
  up; nothing is popped before the map is open. The card faces the camera that visits it; its layers pop back to front.
- **Readable at every stop.** While a stop is visited its pop-up and its label are in frame and the label is at least 7 %
  of the frame width tall (check.mjs). 9:16 is narrow: keep the label within ~0.5 of the card's width to its side, the
  camera 2.3–2.8 units away, and test with stills.
- **No collisions.** Pop-ups and labels stay on the sheet and their footprints do not overlap (built-in checks); keep
  stops off busy names and, where you can, off the crease lines.
- **Light tells the time.** Day → golden → dusk → night in order; at night pop-ups glow only where lights would be
  (windows, lanterns, lamps, cables) and the pool under each is soft.
- **Words through fonts.mjs** (check.mjs fails on a missing glyph); the map carries its own words — on-screen titles
  only at the end, small.
- **Check by looking and by numbers**: a still after each step, sheets of the unfold and of each stop, `check.mjs`
  before rendering.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS`, `window.SIZE = {W, H}`, `window.runChecks(t)` (names
of broken rules), `window.FILM` (the film: `allText()`, `cues()`, `S`, `pops`, `labels`, `trip_`), `window.__ready = true`
— all set by `F.start()`. `?render=1` fixed W×H canvas, no live loop; `?t=12` one frozen frame; `?scale=.5` preview
size; `?tex=.5` texture size; `?msaa=0`; `?off=dof,shadow,grain,hud,route,pop` switches a part off (`pop`: every
pop-up and label up from the start). The live page fits the window and loops; drag sideways to scrub, click or space
pauses, ← → jump a second.
