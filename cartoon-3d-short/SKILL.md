---
name: cartoon-3d-short
description: Make a ~55–70 s vertical (1080×1920) animated story short in the viral "2D cartoon characters in a colourful 3D world" style — flat bean-head characters with plum ink outlines standing in a painted 3D town or room drawn with black ink lines, saturated sky, lens-blurred backgrounds, gliding cameras that creep in on every hold, a fast steady narrator, a bouncy synthesised score and cartoon SFX. The script follows the measured formula (absurd fact as the hook → setting → escalation → "You see," + an everyday analogy → ironic twist). Rendered in code with three.js (no AI video model) to an MP4 and a live page. Give it a topic (a surprising true story with a physical cause) and it writes the script, records the voice (ElevenLabs), times every shot to the words, and renders. Use for "animated story short", "history / science short with cartoon characters", "viral cartoon explainer shorts", "make a video like those 1-minute animated shorts", "cartoon short about …", or Korean requests like "애니메이션 쇼츠", "카툰 쇼츠 만들어줘", "이 스타일로 주제만 바꿔서 영상", "역사 썰 애니메이션", "1분 애니메이션 영상", "만화 캐릭터 3D 배경 쇼츠".
---

# cartoon-3d-short

A one-minute vertical cartoon story short, the format that took off on YouTube Shorts in autumn 2026: flat 2D
characters (bean heads, stick limbs, plum ink, deadpan faces) living in a lit, painted 3D world with black ink outlines,
a camera that glides and never stops creeping in, one fast narrator, and a script that opens on an absurd true fact and
ends on an ironic twist. Everything is code: a three.js world (two-tone painted materials, a camera-relative sun frozen per
shot, fog = horizon), characters drawn on Canvas 2D as lit billboard cards, a post chain (world ink → thin-lens blur →
bloom → Neutral tone map → grade), and a synthesised score. Every frame is `seek(t)`, so the same page plays live with
sound and renders to an MP4 frame by frame.

Absorbed from **mromidev/claude-animated-shorts** (MIT, https://github.com/mromidev/claude-animated-shorts — skill
`cartoon-3d-short`, proven on "The Bridge That Fell for a Song", a 67 s short about the 1831 Broughton bridge), shared on
X at https://x.com/DDJCXX/status/2117420560963821868. That skill renders with Remotion + React Three Fiber + Kenney CC0
models; here the same look (its measured targets and final values, its character drawing, ink, lens and grade shaders,
its camera grammar and sound design) runs as plain three.js in a browser page with procedural props, so it needs no npm
install, no downloads and no GPU. Worked example: `examples/leaning-tower` "The Tower That a War Saved" (62 s, 19 shots,
ElevenLabs voice). The reference channel's videos are not included and are never copied: story, characters, props and
voice are always original; the look is studied, not traced.

**Fixed (the style):** the 9:16 one-minute format; the script shape (absurd fact → escalation → "You see," + analogy →
twist) at ~3.7 words/s with one steady narrator; flat bean-head characters as lit cards in a painted, ink-lined 3D world;
the light presets, grade, ink and lens values; the camera grammar; a ducked bouncy score with cartoon SFX.
**Designed per topic (in `BRIEF.md`, built in the project):** the facts and the analogy, the cast (outfits, props), the
sets and the props that carry the jokes, the light per beat, the effect cards, the moods and SFX — the example and the
template are examples of the style, not a menu (references/BRIEF.md).

## What's in this folder
| path | what |
|---|---|
| `lib/film.js` | `Film`: sets (`F.set`), shots timed to words (`F.shot`, `F.at("word", n)`), camera grammar (glides, creeping push, cuts, kicks, rolls, punch words), light preset per shot with a frozen camera-relative sun, lens blur per shot, crossfades, white flash, optional one-word captions, live player, `check()`, the contract |
| `lib/toon.js` | the cartoon cast on Canvas 2D: `person({...})` outfits, `bodyFront` / `bodySide` (walk, march, stand, sit, fall, push; gestures up / point / shrug / hips; any held prop as a draw function), 14 expressions, hats (hair, cap, tophat, bonnet, shako, crown, helmet, hardhat, wizard, beret, hood), beard, glasses, the `FX` effect cards (burst, bang, splash, puff, stars, creak, ring, question, exclaim, sweat, speed, zzz, heart, bulb, sparkle, glow, arrow, note, cloud, plank) |
| `lib/cast.js` | `Stage`: characters as lit yaw-billboards (front / side view picked from the camera, mirroring, distance tiers, auto blinks), contact shadows, real card shadows at golden hour, effect cards; canvas pool |
| `lib/kit.js` | the world kit: `ground`, `path`, `hill`, `mountains`, `house`, `street`, `tree`, `grove`, `fence`, `lamp`, `barrel`, `crate`, `table`, `bench`, `well`, `cart`, `rock`, `flag`, `banner`, `sign`, `tower`, `wall`, `room`, `water`; materials `lam` / `col` / `paintMat` / `glow` / `unlit`; `Batch`, `boxGeo`, `quad`, `tri` for custom pieces |
| `lib/look.js` | the look as numbers: `LIGHTS` (day · golden · night · interior), `LOOK` (sky stops, water, clouds), `GRADES`, the `DOF` ladder |
| `lib/shade.js` | two-tone world shading (`twoTone`), lit character cards (`cardShade`), tone-map inversion (`untone`) |
| `lib/post.js` | the post chain: world ink, lens blur (pre + main + near field), bloom, Neutral tone map + grade, crossfade mix |
| `lib/paint.js` | hand-painted canvas textures: grass, cobbles, stone, planks, beams, roofs, bricks, facades with windows, clouds, water |
| `lib/score.js` | `renderScore(spec)`: moods (march, bouncy, sneaky, tense, wonder, explain, payoff, silence), 22 cartoon SFX, ducking under the voice |
| `lib/three.module.min.js` | three.js r170 (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `film.html` (a 5-shot, 19 s starting film that runs before any voice exists), `score.js`, `BRIEF.md` (the formula to fill) |
| `examples/leaning-tower/` | the worked example: `BRIEF.md` (facts + sources), `voice/` (voice.mp3, words.json), `index.html` (19 shots), `score.js` |
| `scripts/new-film.mjs` | start a project (template or `--from leaning-tower`) |
| `scripts/check.mjs` | loads clean · every shot draws · deterministic · no gaps · rules · voice inside the picture · prints DURATION and the shot table |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`, `--scale 1.3333` for 1440×2560) |
| `scripts/score.mjs` | the score → WAV; with `--voice` + `--words`, the final mix (ducked, −14 LUFS, peak −1 dB) |
| `references/` | **BRIEF** (fixed vs per topic, the brief, the stills rubric) · **STORY** (topic → facts → script formula → shot plan) · **LOOK** (the measured targets and the final values) · **KIT** (API) · **VOICE** (narration and word timing) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-short/
  BRIEF.md          facts with sources → script → cast, sets, props, light, sound → shot plan (written first)
  voice/voice.mp3    the narration (ElevenLabs), tightened to ~3.5 words/s
  voice/words.json   [{ "w": "Seventy-four", "s": 0.14, "e": 0.62 }, …]  word times (speech-to-text)
  film.html          sets → cast → shots (timed by F.at("word")) → F.start()
  score.js           export const SCORE = { bpm, key, sections, sfx, … }  (times from the same words)
  lib/               copy of the skill's lib/ (new-film.mjs), imported through an import map ("toon/")
  out/               stills, sheets, mix.wav, the MP4 (not committed)
```
Run every script from the project root, e.g. `node <skill>/scripts/render.mjs film.html --sheet 20 --scale .35`.
The page is an ES module and imports `voice/words.json`: view it through a local server (`python3 -m http.server`);
the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg; ElevenLabs (the MCP connector or an API key) for the voice.
No npm install, no GPU. On a 4-core box without a GPU (SwiftShader) the 62 s example renders at 810×1440
(`--scale .75`) in ~50 min with 4 workers (~1.6 s a frame); 1080×1920 takes roughly twice as long; previews at
`--scale .35` take ~0.7 s a frame. Each worker gets its own browser (pages of one browser share one GPU process).

## Workflow
1. **Topic → brief.** Pick (or take the user's) one surprising *true* story with a physical cause and effect, that can
   be shown literally, plus one everyday analogy that explains it (a swing, a sponge, a crowded doorway). Write `BRIEF.md`
   (`templates/BRIEF.md`, references/BRIEF.md): the facts with their sources (every joke is a real fact), then — after the
   script — the cast, props, sets, light per beat, effect cards and sound designed for this topic.
2. **Script** (`references/STORY.md`): ~200–240 words for 55–70 s at ~3.7 words/s. Hook = the absurd fact in sentence one,
   no setup → setting (year, place, pride) → 3–6 escalating beats (others laugh / doubt) → "But wait…?" → **"You see,"**
   the mechanism through the analogy → consequence → a short ironic twist that ends the video on its last word. Never
   describe what the viewer already sees. Show the script to the user; once they approve it, do the rest without asking.
3. **Voice** (`references/VOICE.md`): one male narrator, steady and fast. ElevenLabs TTS (two takes, never retry), pick
   one, tighten the pauses and speed to ~3.4–3.7 words/s with ffmpeg, then speech-to-text for word times →
   `voice/words.json`. Hand-check the words with numbers ("1173", "45").
4. **Start**: `node <skill>/scripts/new-film.mjs my-short` (or `--from leaning-tower`). Put the voice in `voice/` and switch
   the page to `import WORDS from "./voice/words.json"`.
5. **Sets** (`references/KIT.md`): 1–3 places, built once with the kit (`S.street`, `S.house`, `S.tree`, `S.room`,
   `S.tower`, custom pieces with `S.Batch`). Return the objects the shots move (`return { tower, door }`). The props carry
   the jokes: whatever a sentence names must be on screen.
6. **Shots** (`references/STORY.md` · shot grammar): one shot per sentence or beat (1.5–5 s, ~15–20 per minute), each
   starting on its word: `F.shot({ from: F.at("Then"), set, light, cam: [...], cast: (lt, t) => [...], fx, update })`.
   Every visual reaction lands 0–3 frames before its word (`t > F.at("snaps") - 0.07`). Light per beat: day for the
   story, golden for time passing / the payoff, night-blue for the explanation or a pause, interior for analogies.
7. **Look at it**: `node <skill>/scripts/check.mjs film.html` (must print `check OK`), then
   `render.mjs film.html --stills <two times per shot> --scale .35` and LOOK at every still: is every character the line
   names in frame (portrait frames are only 0.56× as wide as tall), faces readable, nothing cut at the frame edge, the
   prop that carries the joke visible, no camera inside a wall? Score the sheet with the rubric in references/BRIEF.md
   (a fresh reviewer agent works well); fix every area under 7 and re-render those shots.
8. **Sound**: `score.js` sections per beat (mood changes on the turns: the snap, "You see,", the twist) and an SFX on every
   on-screen hit; `node <skill>/scripts/score.mjs score.js --dur <DURATION> --voice voice/voice.mp3 --words voice/words.json`
   → `out/mix.wav` (voice ~9 LU over the bed, −14 LUFS). Lock the shot times before the sound; re-run it after any change.
9. **Render** in the background: `node <skill>/scripts/render.mjs film.html --audio out/mix.wav` (`--scale 1.3333` for a
   1440×2560 "2K" final). Then open stills from the MP4's start, middle and end
   (`ffmpeg -ss 30 -i out/film.mp4 -frames:v 1 x.png`) and check the length equals the voice + ~0.3 s.
10. **Deliver**: the MP4, the live page (`film.html` through a server plays it with sound), and `BRIEF.md`.

## Rules
- **Deterministic**: every frame is a function of `t` (seeded `rng`, blinks from seeds, no `Math.random`, no state
  carried between frames). `update(lt)` must *set* poses, never accumulate. check.mjs proves it.
- **Portrait 1080×1920, 30 fps.** The voice starts at frame 1–4: no intro, logo, outro or call to action. The picture ends
  ~0.3 s after the last word.
- **The camera never stops**: every hold creeps in (`push` 0.15–0.35 %/frame, 0.6 on `punch` words); moves are
  smootherstep glides of 18–40 frames; big reframes are hard cuts (a new shot or `cut: true`); impacts get a 7-frame `kick`;
  rolls of 3–5° on drama. A shot with one key and `push: 0` reads as a freeze.
- **Ink and look come from the presets** (`lib/look.js`): don't hand-tune per shot except `sun: { az, el }` to put the
  light where the shot needs it. Characters are never outlined by the world ink (they carry their own plum ink).
- **Lens blur on about a third of the screen time**: close-ups and medium shots (`dof` 10–16, focus on the eyes of the
  front character), wides and establishing shots sharp (`dof: 0`).
- **Design per topic**: every topic gets its own cast, sets, props, light plan and sound from its brief; never drag in
  the example's tower or the template's kitchen because they are there. New pieces are built in the project (kit
  builders, `S.Batch`, `person()`, prop draw functions, new FX with the same `Pen`), not by editing the skill's lib/.
- **One style**: whatever is new keeps the same language — plum-inked flat characters, two-tone painted world materials
  (`S.col`, `S.paintMat`, never unlit colour except signs and glows), the presets of `look.js`, the camera grammar.
- **Original everything**: our story, our characters, our voice. Never copy a channel's scripts, characters, shots or
  name; never say the reference channel's name in the voice-over or description.
- **No captions** unless the user asks (`?captions=1` or `captions: true` adds the reference's one-word white captions).
- **Facts are checked**: numbers and claims in the voice match the sources in `BRIEF.md`.

## Contract every film page fulfils
`window.seek(t)` draws frame t synchronously; `window.DURATION`, `window.FPS`, `window.film`; `window.__ready = true`
after the warm-up — all set by `F.start()`. Query: `?render=1` (no player UI, fixed canvas), `?scale=.5` (preview size),
`?t=12.4` (open on a frame), `?captions=1`, `?post=noink,nolens,nobloom,nograde` (A/B the post chain).
