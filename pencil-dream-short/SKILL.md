---
name: pencil-dream-short
description: Make a short "the drawing draws its own world" film (15–40 s) — one continuous take on one sketchbook spread. A doodled hero in loose graphite, wearing one thing in the film's single spot colour, wakes on the blank page, catches a flying pencil and draws the first spot-colour mark in the air; the world spreads out from that line by itself while the camera pulls back; a few huge sweeping strokes become a giant fantasy creature behind the landscape; its eyes are coloured in; the spot colour lifts off the page as a swirling swarm; crayon colour blooms over the sky; and the camera pulls back to show the sketchbook lying on a desk with real coloured pencils. Drawn entirely in code on an HTML Canvas (pencil lines that are drawn on stroke by stroke and boil, marker colour laid in with a zig-zag, paper tooth, crayon grain), with a synthesised music-box score and pencil scratches derived from the drawing itself. Outputs a live page and a 1920×1080 MP4 (24 fps). Give it a topic and it designs the hero, the first mark, the world, the giant, the swarm, the colour and the desk. Use when asked for a pencil doodle that comes alive, "a drawing that draws its world", a sketch character with a pencil creating a fantasy world, a one-take sketchbook animation, "make a video like this but about X", or to remake this kind of clip on a new subject ("연필 낙서가 세상을 그리는 영상", "그림 속 캐릭터가 연필로 세계를 그리는 애니메이션", "스케치북 속 그림이 살아나는 영상", "연필 드로잉 원테이크 애니메이션", "이 스타일로 ○○ 이야기 만들어줘", "이 스타일로 주제만 바꿔서", "pencil dream short", "doodle draws a world"). Source — made from https://x.com/Artedeingenio/status/2119895981403894112?a=_9q1hjQOFazzyl1wwv0&s=19.
---

# pencil-dream-short

A drawing that draws its own world. A doodled hero in loose graphite on cream paper — one thing on them in a single spot
colour — wakes on a blank page, catches a pencil and draws the first mark; the world spreads out from that mark by itself
as the camera pulls back; a few huge strokes become a giant creature; the spot colour lifts off the page as a swarm; crayon
colour blooms over the sky; and the camera pulls back to the sketchbook lying on a desk. One continuous take, no cuts.
Give it a topic ("a lighthouse keeper and a whale", "a girl who draws a train to the moon", "a beekeeper's giant bee") and
it writes a brief, designs the hero, the first mark, the world, the giant and the swarm, and times them on one take.
Every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Made in this repo after the post by OscarAI (@Artedeingenio) on X — https://x.com/Artedeingenio/status/2119895981403894112?a=_9q1hjQOFazzyl1wwv0&s=19
("A simple drawing, almost a doodle, brings an entire fantasy world to life with nothing more than a pencil"): a 30-second
AI-generated clip of a pencil girl with orange glasses who draws flowers, a village and a dragon that turns into a swirl
of orange butterflies, ending on a sketchbook on a desk. This skill keeps that clip's grammar and medium
(`references/LOOK.md` lists what was observed) and draws everything with its own deterministic Canvas code. The worked
example `examples/keeper` 「The Keeper's Whale」 (32 s) is a different story with an original cast: an old lighthouse
keeper in a coral beanie, a boat, the sea, a breaching humpback and a spout of coral fish. Never recreate the reference's
girl, dragon, flowers or butterflies — design new ones for each topic.

**Fixed (the style)** — one continuous take on one sketchbook spread, the camera only ever pulling back (close-up on the
hero → the world → the whole spread → the desk); cream paper with tooth; graphite lines drawn on stroke by stroke with a
loose second pass, overshoot and pressure taper, boiling 6 times a second; ONE spot colour laid in with a marker zig-zag a
little off the line (nothing else is coloured until the wash); paper knock-outs so drawings hide what is behind them; the
grammar (wake → the pencil → the first mark → the spread → the giant → its eyes → the swarm → the wash → the desk); the hero
draws only within arm's reach — everything farther draws itself, spreading from the hero's mark; the giant is drawn in a
few huge sweeping strokes and stays behind the landscape; the wash is crayon (tints of the spot colour + one neighbour hue)
blooming from a light source; the desk is "real" (smooth shading, cast shadows, wood, depth of field) against the drawn
page; 1920×1080 at 24 fps; the music-box / pencil sound palette with scratches derived from the strokes.

**Designed per topic** — the hero (who, silhouette, hair, face, clothes, and the ONE thing they wear in the spot colour),
the spot colour itself, how the pencil arrives (flying in, found, already in hand), the first mark (something small the
hero would draw — a boat, a star, a flower, a key), what the world is (sea, village, forest, city, sky, the inside of a
clock), the giant (a whale, an owl, a dragon, a tree spirit, a moon — drawn from primitives for this topic), what the
swarm is (fish, stars, petals, sparks, notes, leaves) and where it comes from, the wash and its light (sunset, moonrise,
dawn, lamplight), the desk props, the tune. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/pencil.js` | the medium: `line` (graphite or marker), `fill` (coloured in), `part` (knock-out + strokes), `stroke`, `hatch`, `scribble`; points `curve`, `arc`, `ellipse`, `bez`, `hand` (wobble + overshoot), `tf`, `resample`; `keys`, `span`, `ease`, `hash`, `rng`, `n1`; colour `mix`, `rgba`, `hue`; textures (paper tooth, graphite grain, crayon tooth, film grain) |
| `lib/draw.js` | `Painter`: renders parts through the camera — knock-outs, tapered double graphite ribbons with grain, marker zig-zags clipped to the shape, draw-on progress per stroke, the boil; `opWeight`, `opHead` (where the pencil is) |
| `lib/hero.js` | `hero(spec, pose)`: the doodled hero from data, turned like a small 3-D model (features on a sphere and an elliptic cylinder → correct near/far side at any yaw, back views included); hair styles, faces and expressions, beard, items in the spot colour (glasses, beanie, scarf, cap, bow); 2-bone arm IK that holds the pencil on its line; `LIM` joint ranges audited every frame (`body: …`); `pencil()` prop; `blinkAt` |
| `lib/kit.js` | world marks: `flower`, `house`, `tree` (bare / round / pine / poplar), `bush`, `hill`, `ground`, `fence`, `grass`, `bird`, `cloud`, `wave`, `sun`, `star`, `glyph` ('?', '!', '*', '♪'), `rays`; swarm `SHAPES` (butterfly, fish, petal, star, leaf, ember) and `swarmParts` |
| `lib/film.js` | `Film`: `hero`, `draw` (a mark drawn on by 'hero' / 'pencil' / 'self', with `move` and `out`), `spread` (marks that start as a wave from an origin), `pencil` (the flying pencil and the catch), `swarm`, `wash`, `desk`, `camera`, `beat`, `check`; the paper, the gutter, the grade; live player with sound; `penSfx` (pencil scratches from the drawing); the contract |
| `lib/desk.js` | the reveal: wood texture (pre-blurred), lamp pool, the book's shadow, cover board and page block, page curl light, real coloured pencils and an eraser |
| `lib/score.js` | `renderScore(spec, sr, dur)`: music box, felt keys, bell, pluck, bass, reed, pad, brushes, air; sfx pencil, whoosh, pop, splash, sparkle, swell, breath, flutter, chime, paper … (adapted from sketch-cartoon-short) |
| `lib/sheet.js` | `castSheet({ hero, … })`: eight turns (front, 3/4 and profile both ways, back), the drawing reach both ways, the catch, a head turn on a front body, faces |
| `templates/` | `BRIEF.md`, `cast.js` + `cast.html`, `film.html` (「Night Owl」, 16 s — the whole grammar, short), `score.js` |
| `examples/keeper/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html`, `whale.js` (the giant, lighthouse, boat, rock — designed for this topic), `index.html` (32 s), `score.js` |
| `scripts/new-film.mjs` | start a project: `lib/` + the template (or `--from keeper`) + `out/` |
| `scripts/render.mjs` | stills (`--stills 3,8`), a contact sheet (`--sheet 16`), or the MP4 (workers × ffmpeg chunks, `--audio out/x.wav`) |
| `scripts/score.mjs` | the score → WAV, read from the page so the pencil scratches follow the strokes |
| `scripts/check.mjs` | proves the page: loads clean, every beat draws, no blank frames, deterministic, the body rules, graphite + one spot colour until the wash, the paper shows, the lines boil, the score renders; on a cast sheet, the body rules for every view |
| `references/` | **BRIEF** (topic → brief, the cast and still reviews) · **LOOK** (what makes it read as this style, observed from the reference) · **GRAMMAR** (the beats, timing, the camera, a beat table) · **API** (the library) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-film/
  BRIEF.md     the topic written out (references/BRIEF.md) — written first
  cast.js      the hero as data (hero spec) + PAPER / SPOT / LEAD — reviewed on cast.html
  cast.html    the cast sheet (eight turns, both reaches, faces)
  giant.js     the giant and any props this topic needs, drawn with lib/pencil.js (see examples/keeper/whale.js)
  film.html    hero track → marks (draw / spread) → pencil → giant → swarm → wash → desk → camera → checks → F.start()
  score.js     export const SCORE = { box, keys, bell, pad, air, sfx … } (pencil scratches are added from the drawing)
  lib/         copy of the skill's lib/ (new-film.mjs); pages import it through an import map ("pds/")
  out/         stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet 16 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (Canvas 2D: ~0.1–0.4 s a 1080p frame;
32 s renders in ~4–6 min with 4 workers).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the hero
   and the one thing they wear in the spot colour, the spot colour, how the pencil arrives, the first mark, the world and
   what spreads, the giant (silhouette in words, where it rises from, what it does when its eyes open), the swarm (what
   and from where), the wash and its light, the desk props, the beats with times, the sound. Save it as `BRIEF.md` before
   any code. If the user gives a reference clip, extract stills (`ffmpeg -i ref.mp4 -vf fps=1,scale=320:-1,tile=5x6 sheet.jpg`)
   and note its grammar, then design your own hero, world and giant.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from keeper`).
3. **The hero.** Write `cast.js` from the brief (the spec fields are at the top of `lib/hero.js`). Render
   `cast.html --stills 0` and score it against the cast review in references/BRIEF.md: a readable doodle at 10 % height,
   the spot item reads first, the face acts — and the body: every turn both ways has the narrower eye, nose and toes on the
   facing side and the ear toward the back; the back views show no face or beard; the reach both ways keeps the arm off the
   face. `node <skill>/scripts/check.mjs cast.html` must print `ok`.
4. **The giant and the props** in `giant.js`: build them from `curve`, `bez`, `arc`, `ellipse`, `hand`, `line`, `fill`,
   `hatch`, as parts with a knock-out silhouette (the giant hides what is behind it). A spine + thickness profile works for
   long bodies (whale, dragon, snake); circles and arcs for round ones (owl, moon). Keep parameters for the life after it
   is drawn: eye open / blink, a limb that waves, a mouth that smiles — and keep the stroke count the same at every t.
   Render it alone (a still with only the giant drawn) and fix the silhouette before timing anything.
5. **The take, beat by beat** (references/GRAMMAR.md): wake (0–3 s) → the pencil → the first mark (by: 'hero', within
   reach; the film moves the arm and fails the check if the pencil cannot reach the line) → the spread (`F.spread` from the
   hero's mark, the camera pulling back) → the giant (`by: 'self'`, 3–4 s of huge strokes, behind the landscape by z) → its
   eyes coloured in → the swarm (`F.swarm`, from a source that makes sense: the flowers, the spout, the stars) → the wash
   (`F.wash`, blooming from the light) → the desk (`F.desk`, the camera to ~2× the spread). A still after each beat:
   `render.mjs film.html --stills 9 --scale .5`.
6. **Acting**: the hero's track gives yaw, head turn / pitch / roll, where the eyes look, mouth and brows over time; eyes
   follow the pencil and the giant; the hero turns toward what they draw and draws with the arm on the facing side (the far
   arm), so the arm never crosses the face. A raised hand meets the pencil at the catch (`F.pencil({ meet })`).
7. **Sheet and review**: `render.mjs film.html --sheet 16 --scale .5`, then ~10 moments as full stills, scored against the
   still review in references/BRIEF.md: one spot colour only, the paper shows, the hero's pencil on the line it draws, the
   giant behind the landscape, nothing important cut by the frame, no frame without something being drawn or alive.
8. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`. Add `F.check(...)` for the film's own rules
   (the hero in frame while acting, the giant behind the horizon).
9. **Score**: write `score.js` against the beat starts (check.mjs prints them): a music-box tune for the hero, a low bell
   and breath for the giant, a sparkle when its eyes open, flutter / splash for the swarm, a swell into the wash, the room
   at the desk. The pencil scratches come from the drawing. Listen on the live page (♪), then
   `node <skill>/scripts/score.mjs film.html --out out/film.wav`.
10. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4
    (`ffmpeg -ss 20 -i out/film.mp4 -frames:v 1 x.png`) before handing it over.

## Rules
- **Design for the topic.** The hero, the spot colour, the first mark, the world, the giant and the swarm are made for this
  topic. Do not pull in the template's boy and owl or the example's keeper and whale unless the topic is exactly theirs;
  never recreate the reference clip's girl, dragon, flowers or butterflies.
- **One style.** Everything new is drawn with the same pencil: loose double lines with overshoot (`hand`), knock-outs,
  marker fills coloured in with the zig-zag. No gradients or shading on the drawing (the wash is the only gradient, the
  desk the only realism), no clean vector outlines, no fills except the spot colour, the eyes' graphite and paper.
- **One spot colour.** Graphite and one colour until the wash; the colour sits on the hero's item, the first mark, the
  giant's eyes and the swarm — the things the story is about. `check.mjs` fails a second hue on the page.
- **One take.** No cuts and no dissolves; the camera moves smoothly and mostly pulls back. Scale changes are camera moves.
- **Within reach.** The hero's pencil draws only what the arm can reach (the film puts the hand on the line and the check
  fails when it cannot); everything farther draws itself, starting from the hero's mark and spreading outward.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames: `S.rng(seed)`, `hash`, `n1`, `keys`, `span`
  in marks and tracks; live marks (`F.draw(t => …)`) keep the same number of strokes at every t. `check.mjs` proves it.
- **Lines boil, drawings live.** Lines boil 6 times a second; the hero, the giant and the swarm move smoothly; a finished
  drawing still breathes (blinks, bobs, flaps).
- **Bodies that can exist.** Head, chest, hips and toes face one way (the rig builds it — never fake a turn by mirroring
  parts); a figure facing right shows its right side; neck ≤ 90°, elbows fold forward, knees back (`LIM`); the back view
  shows no face; the drawing arm is the far one. Every hero is looked at turned both ways on the cast sheet first.
- **Behind and in front.** The giant sits behind the landscape (lower z) and the landscape's knock-out hides its base; the
  hero is in front of the world; the swarm passes both in front of and behind the giant.
- **The paper shows.** Nothing fills the page except the wash at the end; the page is never dark.
- **No text on screen** except a doodled glyph ('?', '!') or something written in the world.

## Contract every film page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (24), `window.SIZE = {W, H}` (1920×1080 stage units),
`window.runChecks(t)` (names of broken rules, including `body: …` from the rig), `window.shotAt(t)` (`{i, name, lt}` — the
beat), `window.film` (with `spotHue`, `washes`, `deskShows(t)`, `penSfx()`), `window.__ready = true` — all set by
`F.start()`. `?render=1` = fixed canvas, no live loop (with `?t=20`: that frame); `?t=20` on the live page = start playing at 20 s; `?scale=.5` = preview size;
`?off=grain,grade,vignette,tooth`. The live page fits the window, draws at 24 fps and loops; click or space pauses, ← →
jump a second, the bar scrubs, ♪ plays the score in sync.
