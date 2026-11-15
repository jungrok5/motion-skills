---
name: ink-word-world
description: Make an interactive "living ink" page — a blank sheet of paper where every word you type (or tap) is written
  in brush script at the pointer, melts into a real-time fluid simulation of ink, and becomes the thing it names: an island
  rises, a whale swims and spouts, gulls flock, rain falls, night turns the sheet over. The things are alive and act on each
  other by rules (the moon pulls the tide, wind fills the sail and blows the fog away, gulls dive at the fish), dragging
  stirs the ink, and every word and event is synthesised sound over generative music. Give it a topic and it designs a new
  lexicon, new things, new rules and a self-playing performance in this style, checks them, and can film the performance
  to MP4. Pure code — WebGL2 fluid + Canvas 2D + Web Audio, no libraries, no image or audio files. Use for "type a word
  and it comes alive", "interactive ink painting", "fluid simulation art", "generative sumi-e", "word to world", "living
  ink", "typing toy", "글자를 치면 살아나는", "수묵 인터랙티브", "먹 유체 시뮬레이션", "글자가 그림이 되는", "이 스타일로 ○○ 세계
  만들어줘", "주제만 바꿔서", "타이핑하면 그려지는 수묵화". Source — made from
  https://x.com/op7418/status/2120085300185833878?a=9LfZwP5J_d739gBaN8Y&s=19
---

# ink-word-world

A page that is a sheet of paper. You type a word; it is written at the pointer in brush script, dissolves into ink that
swirls and settles in a fluid simulation, and what the word names appears and starts to live there. More words make a
world whose parts notice each other — and a short line appears at the side each time they do. Drag to stir the ink,
hold Shift to wash it with water, press 1 · 2 · 3 for the three pigments; type 밤 and the sheet turns over into night.
Left alone, the page plays its own performance, which is also what the scripts check and film.

**Fixed (the style — never redesigned):**
- the form: write a word → the glyph melts into the fluid → the thing it names comes alive where it was written
- ink on paper: a GPU fluid carries wet ink, still ink dries into the paper and fades slowly; pigments are absorbances and
  the sheet is `paper × exp(−ink)`; night is the same sheet turned over (pale ink on dark), spreading from the word
- one hand: tapered strokes with dry-brush gaps, wet washes, ridges that fade downward, leaves, dots (`lib/brush.js`);
  three pigments (a black, a red, a blue-green) and no outlines, gradients-as-shading or text labels on the sheet
- living things obey their bodies (`lib/life.js`): they move the way they face, bend within limits, keep their back up,
  stay in their element — and the fluid carries them
- mutual influence by rules, each with a one-line verse at the side; weather, time and a clearing word are always present
- chrome: a red seal with the title, three buttons (self-play · sound · keep a picture), a row of word chips, key caps
  while typing, a vertical line of verse; synthesised sound for every cue and a small generative score

**Designed for every topic (never reused from an example):**
- the lexicon: which 12–18 words, in which language and script, how each is typed (romanised keys), which pigment
- what each word becomes: its drawing (pure functions), its behaviour, where it lives on the sheet, how it uses the fluid
- the world's own clockwork (a tide, a season, a current) and its composition (a waterline? a horizon? top-down?)
- the rules — who affects whom — and the verse line for each
- palette (paper, the three pigments, night), brush font for the script, scale and voices of the music, extra sounds
- the performance: the order in which the words are written so that things meet

Built in this repo after the piece 歸藏 (@op7418) posted on X — 「墨生 · 字即世界」, a Chinese-character ink landscape
(山 月 竹 梅 鱼 鸟 蝶 龙 风 雨 雪 火 水 雷 夜 昼 空) made in one shot by a model asked for "an ambitious project nobody has
seen" (https://x.com/op7418/status/2120085300185833878?a=9LfZwP5J_d739gBaN8Y&s=19; what the post says and shows is in
`references/BRIEF.md`). Only the *form* comes from it. The engine, the drawings and both worlds here are this repo's own:
the worked example `examples/tide` 「물때」 is a different topic in a different script — the sea at the turn of the tide in
seventeen Hangul words — designed from a brief with this workflow, and `starter/` 「연못」 is a seven-word pond.

## What's in this folder
| path | what |
|---|---|
| `lib/world.js` | `InkWorld`: `word()` · `rule()` · `perform()` · `start()`; what things call (`add`, `all`, `ink`, `push`, `swirl`, `water`, `flow`, `cue`, `say`, `setNight`, `summon`, `clear`); typing and IME matching, pointer brush, chips, the self-playing performance, page chrome, the script contract |
| `lib/fluid.js` | `Fluid`: WebGL2 stable fluids (advect · vorticity · pressure), wet ink + dried stain, splats, glyph stamps, water, the sheet shader (paper grain, edge pooling, things and light layers, night); `pigment()` |
| `lib/brush.js` | the marks: `stroke` (taper, dry brush), `wash`, `ridge`, `leaf`, `dot`, `glow`, `curve`; `INK` palette; seeded `rng`, `hash`, `noise`; `paperTile` |
| `lib/life.js` | `Flock` (boids, fluid-carried, flee / seek / rest), `Chain` (a spine with a bend limit, `swim`, `frame`, roll), `Tendril`, `Drift` (rain, spray), `side` / `above` (drawing frames), `report` (body rules → `world.violations`) |
| `lib/things.js` | things every world can use as they are: `night`, `day`, `clear`, `rain`, `wind` — also the model for writing a thing |
| `lib/sound.js` | `Sound`: `tone` / `pluck` / `noise` / `loop` voices, built-in cues, the composer (scale by day and night), offline WAV render |
| `lib/cast.js` | `castSheet(world, cast)`: every creature posed eight ways with heading arrows |
| `lib/inkworld.css` · `lib/fonts/` | page chrome · YeonSung (Hangul + Latin brush face, OFL) |
| `starter/` | 「연못」: the smallest complete world (7 words, 1 creature, 5 rules) — `index.html`, `world.js`, `cast.html`, `BRIEF.md` |
| `examples/tide/` | 「물때」: the worked example (17 words, 5 kinds of body, 19 rules, 96 s performance) with its `BRIEF.md` |
| `scripts/new-world.mjs` | start a project from the starter (or `--from tide`), with its own copy of `lib/` |
| `scripts/check.mjs` | page · source · words · rules · performance (bodies, flood, lines) · determinism · sound · cast · phone |
| `scripts/stills.mjs` | stills at given seconds, a contact sheet, the cast sheet |
| `scripts/render.mjs` | film the performance: frames + offline sound → MP4 |
| `scripts/font.py` | subset a brush font to the characters a world writes (other scripts; small published pages) |
| `references/` | **BRIEF** (the source, the brief template, the review rubric) · **WORLD** (API: world, things, brush, life, sound, cast) · **LOOK** (what makes it read as ink, with numbers) · **LESSONS** (what went wrong and the fix) |

## Project layout
```
my-world/
  BRIEF.md          the topic turned into a lexicon, things, rules and a performance (written before code)
  index.html        starts the world
  world.js          1 the world · 2 drawing functions · 3 words → things · 4 rules · 5 the performance
  cast.html         the cast sheet
  lib/              a copy of <skill>/lib (the page runs from any static host, offline)
  out/              stills, cast.png, film.mp4 (not committed)
```

## Requirements
A browser with WebGL2 and float render targets to view (every current desktop and phone browser). For the scripts:
Node 18+, Playwright with Chromium, ffmpeg (`render.mjs`, `stills.mjs --sheet`); Python with `fonttools` + `brotli` only
for `font.py`. Run scripts from the project folder or pass it as the first argument.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md` and write `BRIEF.md` in the project before any code: the one-sentence
   world, the composition of the sheet (where is ground / water / sky; side view or from above), the lexicon table
   (word · keys · role · what it becomes · how it moves · what it does to the fluid · pigment), the rule table (who meets
   whom → what happens → the line), palette and font, sound, and the order of the performance. Roles to cover: at least one
   landform or fixture, one thing that drifts on the fluid, two kinds of creature, two weathers, time (night and back), and
   the clearing word. Do not start from an example's lexicon: `examples/tide` and `starter` show the style, not a menu.
2. **Scaffold.** `node <skill>/scripts/new-world.mjs my-world` (the starter; `--from tide` to read a full one). Serve the
   folder (`python3 -m http.server`) and open it: the starter runs as it is.
3. **The world (section 1 of `world.js`).** Title (two glyphs read best on the seal), palette (`ink`, `pigments`, `paper`),
   font (the bundled YeonSung covers Hangul and Latin; for other scripts run `scripts/font.py --font <an OFL brush font>`),
   music (`root`, `day` and `night` scales, `bpm`), and the world's clockwork in `env` / `tick` (a waterline, a tide).
4. **Draw each thing (section 2).** One pure function per thing — `drawWhale(ink, body, t)` — built only from
   `brush.stroke / wash / ridge / leaf / dot / glow` in `INK` colours. Creatures on a spine take a `life.Chain` and hang
   fins and limbs from `chain.frame(s)` (which side is the back is already decided there); single-agent creatures draw
   inside `life.side()` or `life.above()`. Export them in `cast`, then **render the cast sheet and look at it**
   (`node <skill>/scripts/stills.mjs . --cast`): each head at its arrow, backs up in both directions, fins on the right
   side, nothing folded past its limit, readable at its size in the world. Fix here, before scenes.
5. **Words → things (section 3).** `world.word(id, { keys, home, pigment, unique | max, spawn(w, x, y) })`. A thing is
   `{ z, grow, update(w, dt), draw(w, ink, light) }`; move creatures with `Flock` / `Chain.swim` (never by setting
   positions), let the fluid carry them (`flow`), and give something back to it (`w.push` a wake, `w.ink` a splash,
   `w.water` a wash). Use `w.rand` and `w.t` only. Weather, night, day and the clearing word come from `lib/things.js`.
6. **Rules (section 4).** `world.rule({ id, when: [words], line, then })` for every meeting in the brief. Continuous
   reactions live in `update()` (steering around a stone); the rule marks the moment and says its line. Every word
   except the clearing one must take part in at least one rule.
7. **The performance (section 5).** `world.perform([...])`: write the words in an order that makes things meet, with
   `['stir', path, seconds]` strokes between them and enough `wait` for each meeting to be seen. 40–100 s. End with the
   clearing word.
8. **Check.** `node <skill>/scripts/check.mjs .` — fix everything it reports (it names the word, rule or body and the
   time). `--quick` plays only the first 30 s while iterating.
9. **Stills, scored.** `node <skill>/scripts/stills.mjs . --sheet 12` and `--at <the moments that matter>`; open them and
   score against the rubric in `references/BRIEF.md` (does it read as ink on paper, is the sheet legible or muddy, does
   each thing read at a glance, are day and night both composed, do the chrome and the things collide). Check a phone
   size too (`--size 390x844`). Change the world and repeat 8–9 until every row passes.
10. **Deliver.** The project folder is the piece (static files; any host). For a film:
    `node <skill>/scripts/render.mjs . --out out/film.mp4` (1080p, 30 fps, sound included). To publish small, subset the
    font (`scripts/font.py .`) and point `font.url` at the subset.

## Rules
- **Design for the topic.** New words, new things, new rules, new palette, new performance for every topic. Never drop a
  topic into an example's lexicon or keep a thing because it was already drawn. What stays is the form and the hand.
- **Keep one style.** Everything on the sheet is drawn with the `brush.js` marks in `INK` colours and the three pigments;
  no outlines around fills, no CSS or image sprites, no text on the sheet except the written word itself.
- **The word is the only way in.** No buttons that spawn things, no menus; chips are the same words for people without a
  keyboard. Each word has a romanised key so it can be typed without an input method.
- **One clock, one dice.** `w.t`, `thing.age`, `w.rand` — never `Math.random`, `Date.now`, timers. The check fails on them,
  and a world that is not repeatable cannot be checked or filmed.
- **Bodies are checked, not eyeballed.** Creatures move through `Flock` / `Chain` so heading, bend, roll and element are
  reported; anything with a front and a back is on the cast sheet facing both ways. Zero violations in the performance.
- **Ink is a budget.** Every glyph adds ink and wet ink dries where it stops; a sheet that turns grey is a failure. Keep
  per-word ink near the defaults, space the words, let rain and the clearing word wash. `check` fails on a flooded sheet.
- **Things answer the fluid both ways**: carried by it, and pushing it. A thing that ignores the ink is a sticker.
- **Sizes read at 1280 px**: a hero creature 250–350 units long, flock members 25–40, a landform 400–600 wide; the bottom
  12% of the sheet is under the chips, the top corners under the seal and buttons — keep homes out of them.
- **Night is composed too**: put light (`glow` on the light layer) where the night needs it; look at a night still.
- **No assets, no network**: fonts are bundled (OFL, licence beside them); sound is synthesised; nothing is fetched.

## Contract
A world page exposes `window.__inkworld` (always; with `?drive` the page does not run by itself and a script owns the clock):
`FPS` (60) · `DURATION` (seconds of the performance) · `reset(perform = true)` · `advance(steps, draw = true)` ·
`seek(seconds)` (forward; earlier times replay from 0) · `summon(id, fx, fy)` · `state()` → `{ t, things, ink, lines,
fired, cues, violations, bodies, night, hash, summoned, nan }` · `thumb()` · `missingGlyphs()` · `timeline` ·
`audio(seconds)` → the WAV (base64) of the cues so far · `words` · `rules` · `world`.
Query flags: `?auto` start the performance at once · `?drive` script clock · `?q=low` coarse fluid for quick checks ·
`?px=1280` cap the backing size. A cast page sets `window.__cast = { ready, creatures }`.
The same seed and the same steps give the same sheet on the same machine.
