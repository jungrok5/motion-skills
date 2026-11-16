---
name: agent-launch-film
description: Make an AI-agent product launch film — a 15–60 s video (and a live page) where a mascot object with a dot-matrix screen for a face greets the user, an input bar is typed and clicked, glass UI cards (a stack of what it learned, a carousel of what it read with a counter running, highlighted quotes, a chat where the agent proposes and the user answers in accent bubbles, a swarm of outputs pouring past the lens, a row of results, a ready bar with a button, before / after bars) float in a bright 3D space with soft breathing glows, depth-of-field blur and motion blur, and every scene hands over by moving (recede, push through, whip) — never a hard cut. Everything is HTML/CSS pieces drawn in code for the topic; every frame is a pure function of time; the sound (a soft synth bed plus a UI click, tick, pop or whoosh on every action) is synthesised from the film. Outputs a live looping page and an MP4 (1920 × 1080 by default; any size). Give it a product, an app, a service or an agent and it writes the brief, designs the mascot, the cards, the lines and the drawings, and renders it. Use when asked for a product launch video, a SaaS / AI agent demo film, a UI motion graphics promo, an "introducing X" video, an app explainer with floating cards ("런치 영상", "제품 출시 영상", "AI 에이전트 소개 영상", "서비스 소개 모션그래픽", "UI 카드가 떠다니는 영상", "채팅으로 일하는 걸 보여주는 영상", "앱 홍보 영상", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "launch video", "product demo video", "agent demo"). Source — made from https://x.com/UseFastlane/status/2116024028708196432?a=3dL47zV5VgDkc5ipWFw&s=19.
---

# agent-launch-film

A launch film told as an agent doing the work while you watch. A little object — a calculator, a rice cooker, whatever
belongs to the product's world — wakes up with its name on a dot-matrix screen; a greeting with the user's name sits
above it; an input is typed and a cursor clicks. Then glass cards float in a soft, bright space: what it learned about
you in a stack, what it read on a turning arc while a counter runs, a chat where it proposes and you answer, dozens of
results pouring past the lens, one row of them in focus, a shopping list or a table ticking in, one button, a chip
saying it's done, before / after bars, and the object again saying "done". Nothing cuts: pieces fall back and blur,
or the camera flies through them, into the next scene. Give it a product and it writes the brief, designs the mascot,
the cards and the drawings for that product, and renders the film with its sound.

Made in this repo from the post by Fastlane (@UseFastlane) on X —
https://x.com/UseFastlane/status/2116024028708196432?a=3dL47zV5VgDkc5ipWFw&s=19 — a 97 s launch film for an AI ad-making
product. The skill keeps that film's grammar (references/LOOK.md) and rebuilds it as a reusable engine of HTML/CSS
pieces on a projected 3D stage. The worked example `examples/bori` 「보리」 (a meal-planning agent, Korean, 9 scenes,
≈ 49 s) is a topic the source never touched, designed from a brief. Never recreate the source's product, helmet mascot,
racing theme, ads, people or footage.

**Fixed (the style)** — a bright off-white ground with 2–4 soft glows that breathe and cross-fade; glass cards
(white, large radius, hairline edge, long layered shadows); one tight grotesk in near-black, mono caps for meta; one
accent colour for the words, numbers, buttons and bars that matter; a status mascot (an object with a dot-matrix screen)
that opens and closes the film and is the agent's chat avatar; pieces at different depths with depth-of-field blur
and motion blur; a camera that always drifts; everything arrives by moving (rise + unblur, spring pop, fly from depth)
and leaves by receding or being flown through; typing with a caret, streamed agent bubbles, counters, highlighter
sweeps; the devices in references/LOOK.md; a UI sound on every action and a soft synth bed; 30 fps.

**Designed per topic** — the product, the one line and the arc of scenes; the user's name; the brand accent and
glows; the mascot object, its screen size, LED colour, what it says, its idle (sparks, steam, dust…); every line of
text and every card (what it shows, what is read and what is texture); the drawings on cards and outputs (art.js);
the numbers; which device carries each beat; every camera move and hand-over; the tempo and chords; the frame size.
The template (「Tally」, a bookkeeping agent with a calculator) and the example (「보리」, a rice cooker that plans dinners)
are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | the engine: `Film` (scenes with overlapping hand-overs, projected 3D stage, camera keys, depth of field, motion blur, glows, grain), devices `S.row` `S.stack` `S.carousel` `S.swarm`, `runChecks`, `cues`, `mascotSheet`, the live player, the contract; easings `E`, `tw`, `rng` |
| `lib/kit.js` | the pieces `K.*`: headline (counter, typed), input, cursor, chat, card + parts (title, meta, line, foot, chips, swatches, sliders, stat, quote, bars, rows, progress, html), chip, tag, link, poster, phone, persona, mascot (dot-matrix screen, sparks), SVG gradient helpers |
| `lib/film.css` | the look as tokens and classes (ground, glass, shadows, type, bubbles, buttons) |
| `lib/fonts/` | ALF Sans (Pretendard subset: Latin + 2,350 Hangul syllables, renamed per the OFL) and JetBrains Mono — SIL OFL |
| `templates/` | `film.html` (「Tally」, English, 4 scenes, ≈ 20 s), `mascot.js` (a calculator), `BRIEF.md` |
| `examples/bori/` | the worked example: `BRIEF.md`, `index.html` (9 scenes, ≈ 49 s), `mascot.js` (a rice cooker with steam), `art.js` (ingredient tiles, dishes from above) |
| `scripts/new-film.mjs` | start a project from the template or `--from bori` |
| `scripts/check.mjs` | proves the page: loads clean, readable lines (time, pace, size, in frame, sharp, not covered), every scene moves, no dead frame, no hard jump at a hand-over, bright ground, accent as punctuation, deterministic |
| `scripts/render.mjs` | contact sheet, a strip of one scene, the mascot sheet, stills, a preview, the MP4 (`--audio`) |
| `scripts/score.mjs` | the sound from the film's cues and scenes → WAV (`--sfx-only` for laying over the user's track) |
| `references/` | **BRIEF** (topic → brief, review lists) · **LOOK** (the grammar, observed from the source) · **ENGINE** (stage, scenes, pieces, devices, contract) · **MASCOT** (designing the object and its screen) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-film/
  BRIEF.md      the product written out (references/BRIEF.md) — written first
  film.html     new Film({...}) → F.scene(...) × 4–10 → F.start()
  mascot.js     the mascot designed for this product (references/MASCOT.md)
  art.js        (optional) drawings and custom pieces for this product
  lib/          copy of the skill's lib/ (new-film.mjs); the page imports it through an import map ("alf/")
  assets/       (optional) the user's logo / images / track, with their licences
  out/          sheets, stills, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet --scale .4`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts open them as files with the flag for that.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. A 1920 × 1080 frame is a
screenshot of the page (~0.08 s at half size, ~0.2 s full); the 49 s example renders a half-size preview in about two
minutes with 4 workers.

## Workflow
1. **Product → brief.** Copy `templates/BRIEF.md` and fill it (references/BRIEF.md says how): the one line, the user's
   name, the arc of 4–10 beats (hello → learn → look → ask → do → scale → act → result → end, dropping what the
   product does not do), the readable lines (≤ 8 words, one or two accent words), the cards and what is texture, the
   drawings, the numbers, the mascot. Save it as `BRIEF.md` before any code. Lines come from the user or are written
   for the product — numbers are real or plainly illustrative, never claims about a real company. If the user gives a
   reference video, tile it (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=6x4 sheet.jpg`) and read its devices; then
   design your own.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from bori`). Replace the template's mascot, lines,
   cards and drawings with the product's own.
3. **Mascot** (references/MASCOT.md). Draw the object in `mascot.js`; `render.mjs film.html --mascot --scale .5` shows
   every screen it says, turned both ways, and the chat avatar. Score it and fix before writing scenes.
4. **Scenes** (references/ENGINE.md, references/LOOK.md). One `F.scene(name, { dur, out, cam, glow }, (S) => …)` per beat,
   each with one device, a slow camera move and a hand-over. New pieces or drawings go in the project (`art.js`) as
   `{ node, update(t) }` — not in the skill's lib.
5. **Sheet and review**: `render.mjs film.html --sheet --scale .4` (two moments of every scene), `--strip <scene>` when a
   move is in doubt, ~8 stills full size (`--stills`). Score against the still review in references/BRIEF.md. The live
   page helps: `film.html?scene=<name>&hud=1` loops one scene.
6. **Check**: `node <skill>/scripts/check.mjs film.html` must end with `check OK`. It fails on a line that is on screen
   too briefly for its words (0.7 s + 0.24 s a word, after typing), typed faster than a person, under 17 px, off the
   frame, blurred, or covered by another; a scene that does not change; ground alone for over 0.5 s; a hand-over whose
   adjacent frames jump (> 16); a dark frame; accent over 8 % of the pixels; a frame that draws differently the second
   time. Add the film's own rules with `F.check(name, fn)`.
7. **Sound**: `node <skill>/scripts/score.mjs film.html --out out/film.wav` (tempo, chords, arpeggio and gains in
   `new Film({ score })`; per scene `mix`, `accent`). With the user's track: `--sfx-only` for the UI sounds, mix them
   under it (`ffmpeg -i track -i sfx.wav -filter_complex amix …`) and pass that to `--audio`.
8. **Render**: `render.mjs film.html --preview --audio out/film.wav`, watch it with sound against the motion review in
   references/BRIEF.md, then `render.mjs film.html --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4
   before handing it over.
9. **Live page** (if it goes on a site): the same `film.html` loops; ship it with its `lib/`.

## Rules
- **Design for the product.** Every line, card, drawing, number and the mascot are chosen because they tell this
  product. Do not reuse the template's calculator and receipts or the example's rice cooker and dishes unless the
  product is exactly theirs; never recreate the source's product, helmet, racing words, ads, people or footage.
- **One style.** Bright ground, breathing glows, glass cards, one grotesk + mono meta, one accent. No dark scenes, no
  gradients on type, no outlines on cards, no stock photos of people. A new piece follows the same tokens (film.css) or
  it is not this style.
- **One thing to read at a time.** Each moment has one line in focus, nearest and sharpest; the rest is texture,
  behind and blurred. Readable lines ≤ 8 words, on long enough for their words (the check measures), ≥ 17 px.
- **The accent is punctuation.** One or two accent words per line (a name, a number, a deadline), the user's bubbles,
  the button, the "after" bars. Under 8 % of the pixels.
- **Everything moves, nothing cuts.** Pieces arrive by moving and leave by receding or being flown through; every scene
  has a camera drift; every piece floats; hand-overs overlap (`recede` / `push` / `whip` / `rise`). The check measures
  adjacent frames at every hand-over.
- **Weight and settle.** Springs overshoot ~9 % and settle within half a second; big moves ease in and out; the mascot
  dips before it nods and the nod rings down; typing is uneven like a person; counters ease out. Nothing starts or
  stops dead.
- **The mascot is an object, not a character.** An object from the topic's world with a dot-matrix face — no limbs, no
  walk, no turning past ~25°. It opens and closes the film (the check warns otherwise) and is the chat avatar. Its
  idle always breathes (bob, tilt, sparks / steam).
- **Drawn in code.** Cards, thumbnails, dishes, receipts and posters are HTML/CSS/SVG made for the topic. The user's own
  logo or images may go in `assets/` with their licence. Generated video / images / voice are references only, never
  committed; ElevenLabs only after the owner says yes for that request.
- **Pure function of t.** No `Math.random`, `Date` or state between frames: use `S.rng` / a seed at build time and set
  every style from t in `update(t)`. `check.mjs` proves it.

## Contract every film page fulfils
`window.seek(t)` / `window.renderAt(t)` draw frame t (seconds); `window.DURATION`, `window.FPS` (30),
`window.SIZE = {W, H}`, `window.sceneAt(t)` (`{i, name, lt, p}`), `window.runChecks()`, `window.cues()` (for the
sound), `window.film` (with `mascotSheet()`), `window.READY = true` — all set by `F.start()` once fonts are loaded and
every scene is built. `?render=1` = the frame at native size at 0,0, no live loop; `?t=6` = one frozen frame;
`?scene=name` = loop one scene; `?speed=.5`; `?hud=1` = scene name and time; `?audio=out/film.wav` = play in sync after
a click. Live keys: space = pause, ← → = previous / next scene, L = loop the scene. The frame is `#frame`.
