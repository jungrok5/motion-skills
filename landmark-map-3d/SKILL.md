---
name: landmark-map-3d
description: Make a short vertical film of a famous place as a cute 3D map — give it a landmark ("에펠탑", "Shibuya crossing at night in the rain", "Big Ben", "경복궁") and it downloads the real neighbourhood from OpenStreetMap (every building footprint and height, street, river, park, tree, street lamp), builds it as a soft toy city (pastel blocks with window grids, mansard / gable / flat roofs, painted ground, zebra crossings, sunk water with stone quays and reflections, thousands of round trees), hand-builds the landmark itself in code from its real dimensions, fills it with life (cars on the real roads, people, boats), adds map pins with category icons, street names painted on the road, a title and a clock chip, and flies a tilted map camera through a time-of-day story (day → golden hour → purple night with lit windows, lamp pools, bloom; rain optional) with a tilt-shift miniature look. Outputs a live page and a 1080×1920 MP4 with a synthesised lo-fi score. Use when asked for a 3D map video of a place, a landmark as a cute / toy / miniature city, a "map app" style fly-over, a place intro short or reel, a city at day and night ("유명 장소 영상", "랜드마크 3D 지도 영상", "장소를 영상처럼 만들어줘", "귀여운 3D 지도", "미니어처 도시 영상", "에펠탑 영상", "이 스타일로 ○○ 만들어줘", "장소만 바꿔서", "cute 3D map of", "miniature city video", "landmark fly-over", "map flyover reel"). Source — made from https://x.com/Nal_uh/status/2119508762298040469?a=AifzriFhkxBwD85fPCI&s=19.
---

# landmark-map-3d

A short vertical film of one famous place in the style of a cute 3D map app: the real neighbourhood, block by block,
as a soft toy city around a hand-built landmark, seen through a tilted map camera that glides, orbits and dives while
the light goes from afternoon to a purple night. Give it a place and it fetches the data, writes a brief, models the
landmark from its real dimensions, designs the palette, the camera path, the pins and the words for that place, and
renders a 1080×1920 MP4 (and a live page).

Made from Charly Delaroche's post on X (https://x.com/Nal_uh/status/2119508762298040469?a=AifzriFhkxBwD85fPCI&s=19,
Nov 2026: the Anywhere map app panning over Shibuya Crossing at night in the rain, with stills of Lombard Street and the
Golden Gate — "doing the whole world in nice cute 3D"). Only the look is borrowed (references/LOOK.md); the app's
interface is never drawn, and the code, the kit and every place are this repo's own. Worked example:
`examples/eiffel` 「에펠탑」 (18 s): an afternoon over the Champ de Mars turns gold and blue, the camera drops to the
Seine and rises to the Trocadéro view as the tower sparkles at 21:00. Map data © OpenStreetMap contributors (ODbL);
three.js r170 vendored in `lib/` (MIT).

**Fixed in every film (the style)**: the real city from OSM at true scale · toy materials (pastel blocks, pale roofs,
window grids, rounded cornices, roof boxes) · painted ground with purple-grey asphalt, zebras and lane dashes · water
sunk below stone quays with a planar reflection · lumpy round trees · a narrow-lens tilted map camera that never stops
moving · tilt-shift band + camera-relative haze + bloom + gentle grade · map pins (category badge + rounded name with
halo), street names lying on the road, star badge on the landmark · purple nights with warm lamps and windows · a
hand-built landmark · title, clock chip, end card, OSM credit · 1080×1920, 30 fps, 12–24 s · the lo-fi score.

**Designed for each place**: the area and its size · the city palette from the city's real materials · roof styles and
storeys · the landmark model, its materials and how it is lit at night · the camera path · the time-of-day and weather
story · which pins, areas and streets are named, in which language · traffic side, crowds, boats · the end line ·
tempo and key. The template's placeholder and the Eiffel example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `scripts/fetch-place.mjs` | place → `place.json`: Nominatim geocode, OSM download (Overpass, else the OSM API in tiles, cached), converted to metres: buildings (height, levels, roof, colour, parts), roads (kind, width, lanes, bridges, names in every language), areas, water (multipolygons closed at the box edge), rivers, rail, trees, lamps, crossings, benches, shelters, POIs |
| `scripts/place-map.mjs` | draw place.json from above with a metre grid (`out/place-map.png`); `--find "name"` prints coordinates and ids |
| `lib/world.js` | the city: ground atlas (areas, paths, contact shadows), water + quays + reflection, roads / markings / zebras / bridges with arches, buildings (facade shader: windows lit at night, cornices; flat / mansard / gable / hip / dome roofs; party walls; roof boxes, chimneys), trees (tiled instancing, wind), lamps (glow, light pools), benches and shelters, `DEFAULT_PALETTE` |
| `lib/life.js` | cars and buses on routes joined from the road network, people on footways and sidewalks, crowds, boats with wakes |
| `lib/kit.js` | the landmark kit: `mat box cyl sphere lathe extrude beam cable lattice column band arch dome lights beacon screen sample every` |
| `lib/labels.js` | pins (16 category icons), area names, street names on the ground, title, clock chip, end card, credit |
| `lib/look.js` | time-of-day presets (day, morning, golden, dusk, night, overcast) and blending, sky dome, post chain (tilt-shift, bloom, shoulder, grade, vignette, grain, rain) |
| `lib/film.js` | the film: renderer, camera keys, light with snapped shadows, timeline, `poi / autoPois / street / area`, checks, the contract |
| `lib/core.js` | seeded rng, hashing, easing, keyed tracks, polylines, spatial grid |
| `templates/` | `film.html` (a first look at any place.json: auto orbit, auto pins and streets, a placeholder landmark), `BRIEF.md` |
| `examples/eiffel/` | the worked example: `BRIEF.md`, `index.html`, `place.json` (OSM, ODbL), `fonts/` |
| `scripts/new-film.mjs` | start a project (fetches the place, or `--from eiffel`) |
| `scripts/fonts.mjs` | subset Nunito (Map Round) + Noto Sans KR/JP/SC (Map Sans) for exactly the film's text |
| `scripts/check.mjs` | proves the page: loads, fonts, determinism, no blank / blown frames, pins never pile up, frame on the map, camera above roofs, the film's own rules |
| `scripts/render.mjs` | stills, sheet, preview, MP4 (workers, `--audio`) |
| `scripts/score.mjs` | the lo-fi score from the film's cues → WAV |
| `references/` | **BRIEF** (place → brief, still review) · **LOOK** (the style, observed from the source) · **LANDMARKS** (modelling the hero, recipes) · **ENGINE** (the API) · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md      the place written out (references/BRIEF.md) — first
  place.json    the neighbourhood from OSM (fetch-place.mjs); keep its credit line
  film.html     Film.create → world → life → landmark → time / camera / focus → words → checks → start
  lib/          copy of the skill's lib/ (new-film.mjs)
  fonts/        fonts.mjs output
  data/         the raw .osm cache (not committed)
  out/          stills, sheets, score.wav, film.mp4 (not committed)
```
Run every script from anywhere with the page's path: `node <skill>/scripts/render.mjs my-film/film.html --stills 1,8`.
Pages are ES modules that fetch place.json: view them through a server (`python3 -m http.server`); the scripts serve
them themselves.

Requirements: Node 18+, Playwright Chromium, ffmpeg; the network once for the place (openstreetmap.org) and fonts
(Google Fonts). No API keys, no GPU (SwiftShader: ~5–15 s per 1080×1920 frame; an 18 s film ≈ 40–60 min with 3 workers).

## Workflow
1. **Place → brief.** Copy `templates/BRIEF.md` and fill it (references/BRIEF.md): where, the one moment the film must
   show, the story in one line, camera keys, the landmark's real dimensions and signature details, the city palette,
   light and weather, the words, the sound. Save it before code.
2. **Start + data**: `node <skill>/scripts/new-film.mjs my-film --q "Eiffel Tower, Paris" --size 2400x2400` (or
   `--at lat,lon`). Size the area so the camera stays over data (≈ 2× your farthest look). Then
   `place-map.mjs my-film/place.json` and `--find "<name>"` for coordinates of the landmark, pins, streets; note the
   OSM ids of the landmark's own ways to clear.
3. **City** — `F.world({ palette, levels, roofs, paint, clear, clearIds, trees })` with this city's palette.
   `F.life({ cars, drive, people, crowds, boats })`.
4. **Landmark** — `F.landmark(name, (K, g) => …, { at, rot, top })`, built from the kit at true size
   (references/LANDMARKS.md): masses → 2–4 signature details → night lighting. Render stills from every camera key and
   fix until it reads from all of them.
5. **Timeline** — `F.time` (day → golden → dusk → night, or what the brief says), `F.camera` (3–6 keys: open high and
   wide, come close, end on the best-known view), `F.focus`, `F.weather`, `F.clock`, `F.cue`.
6. **Words** — `F.title`, `F.label` (the landmark, big, star), `F.poi` / `F.autoPois`, `F.area`, `F.street`, `F.end`, in
   the user's language (`lang`). Then `node <skill>/scripts/fonts.mjs my-film/film.html`.
7. **Sheet and review** — `render.mjs film.html --sheet 12 --scale .4`, then ~8 stills full size; score them against the
   still review in references/BRIEF.md; fix and repeat until ≥ 14/16.
8. **Check** — `node <skill>/scripts/check.mjs film.html` must end with `check OK`. Add `F.check` for the film's own
   rules (e.g. the whole landmark in frame).
9. **Score** — `node <skill>/scripts/score.mjs film.html --out my-film/out/score.wav` (`--bpm`, `--key`, `--drums 0`).
10. **Render** — `render.mjs film.html --preview` to judge the motion, then `render.mjs film.html --audio out/score.wav
    --workers 3` → `out/film.mp4`. Look at stills pulled from the MP4 before handing it over.

## Rules
- **Design for the place.** Every film gets its own palette, roofs, landmark, camera path, story and words. Do not reuse
  the Eiffel example's Paris palette, its camera or its sparkle for another place; never draw the source app's UI.
- **One style.** New landmarks use the kit's toy language (rounded boxes, flat colours, no textures, emissive night
  lighting); new pins use the label system; nights stay purple with warm lights.
- **The real place.** The city comes from OSM unedited except for clearing what the landmark replaces; the landmark sits
  on its real spot, axis and height. Credit "© OpenStreetMap contributors" stays on screen (built in) and keep the ODbL
  line in place.json.
- **The landmark is hand-built,** from measured dimensions, never a downloaded model of it; no real brands or ads.
- **Readable at phone size.** The landmark recognisable from every angle used; 6–12 pins, each ≥ 3 s, never overlapping
  (checked); nothing in the top 4 % or bottom 8 % but the clock and credit.
- **Always moving, never rushing.** Camera rotation ≤ ~20°/s; no cuts unless the brief says why.
- **Pure function of t.** No `Math.random`, `Date` or state between frames in a page; `check.mjs` proves it.
- **Stay on the map.** The frame never shows past the data except deep in haze (checked); fetch a bigger area rather than
  hiding it.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `renderAt(t)` the same; `DURATION`, `FPS` (30), `SIZE` (`{W: 1080, H: 1920}`),
`runChecks(t)` (broken rule names), `cues()` (for the score), `FILM` (the Film), `__ready = true` — all set by
`F.start()`. The composited frame (3D + pins + titles) is the canvas `#frame`. `?render=1` fixed canvas, no live loop;
`?t=8` one frame; `?scale=.5`; `?msaa=0`; `?shadow=2048`; `?off=post,labels,life,shadows,reflect`.
