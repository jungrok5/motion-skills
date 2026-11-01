---
name: promo-video
description: Make short promo / ad motion-graphics videos (15–90 s) for a business, shop, freelancer or service — landscape 1920×1080 (PC, YouTube, homepage) AND portrait 1080×1920 (Shorts, Reels) — from its website, blog or profile, with ElevenLabs narration, sound effects and music (generated or composed in code), mixed and muxed into MP4. One HTML page per video, rendered frame by frame. Also proposes styles and a storyboard first, and writes a one-shot prompt per video. Covers vertical Shorts/Reels up to 3 min with burned-in captions synced to the narration (ElevenLabs Speech to Text word timings). Use when asked for a promo video, ad, 홍보 영상, 광고 영상, 모션그래픽 홍보, 쇼츠/릴스 광고, "이 사이트 보고 영상 만들어줘", "맡기고 싶게 / 써보고 싶게 만드는 영상", "숏츠에 올릴 수 있게", "학부모가 등록하고 싶게", "자막", or to add narration / background music to such videos.
---

# promo-video

A pipeline for **conversion-minded promo videos**: a 15–40 s motion-graphics ad whose only job is to make the viewer want
to hire / try the business right now. Every video is one self-contained HTML page that draws any moment `t` on request
(kinetic type, UI mock-ups, paper collage, whiteboard, globe, …), recorded to MP4 at 30 fps in both orientations, then
scored: one ElevenLabs narration take cut into lines and placed on scene cues, synthesized UI sounds + a few ElevenLabs
SFX, and music either composed in numpy or generated with ElevenLabs Music — ducked under the voice and normalised.

Built for and proven on 9 videos for two clients (a tax accountant: 5 styles; an overseas buying agent,
fortimoveglobal.com: 4 styles) and an 86 s parent-facing Shorts for a small math academy (vertical, captions),
github.com/jungrok5/ysw-tax (private; `video/`, `fortimove/`, `pkmath/`, `audio/`).
The samples page shows all nine as live pages: https://jungrok5.github.io/motion-skills/promo-video/

## What's in this folder
| path | what |
|---|---|
| `scripts/produce.py` | **the pipeline with gates**: check → render → mix/mux → verify (frames, audio, loudness, peaks) → final contact sheet; prints READY / NOT READY |
| `scripts/check.mjs` | automatic QA before rendering: off-frame text, Shorts safe zones, caption overlap, text overlap, empty cards, pen marks off target or on hidden targets, stretched hand-placed SVG strokes, fonts not loaded, non-deterministic render(t), page errors; contact sheet |
| `scripts/render.mjs` | record a page to MP4 (landscape + portrait) or PNG stills with Playwright → ffmpeg (libx264 crf 18, yuv420p, faststart) |
| `scripts/mix.py` | build the soundtrack from a `mix.json`: narration take → lines on cues, `sound.py` sfx/song or a music file, −10 dB ducking, −14 LUFS; `--mux` puts it into the MP4s |
| `scripts/synth.py` | numpy instrument + SFX kit (pluck, marimba, e-piano, pad, bass, drums, pop, swoosh, chime, shutter, buzz, tick, reverb, Track) — no samples, deterministic |
| `scripts/caption-timing.py` | captions + per-word times on the video timeline (`timing.js`) from a Speech-to-Text of the narration take, mapped through mix.py's placement |
| `scripts/pick-music.py` | compare ElevenLabs Music variations against the scene cuts (loudness strips + spectrogram sheet) and cut the pick to length |
| `references/STORYBOARD.md` | from a website/blog to a 6–7 scene ad: research rules (facts only), the hook→problem→solution→proof→CTA arc, how to propose styles |
| `references/SHORTS.md` | vertical Shorts/Reels mode: length by decision type, safe zones, burned-in captions, scenes timed on spoken words |
| `references/STYLES.md` | the 9 proven looks (what each is, who it suits, how it is built, timings) + looks borrowed from canvas-film kits (e.g. the recipe/step card) |
| `references/SOUND.md` | ElevenLabs flow: voices that worked, one-take narration, SFX prompts, Music (instrumental flag, +2 s, 4 variations, picking), mixing levels |
| `references/PROMPT.md` | the one-shot prompt format (PART 1 video for Claude Code, PART 2 ElevenLabs) with a filled example |
| `references/song-recipes.py` | five composed songs (paper, chat, editorial, whiteboard, premium promo) to copy into a `sound.py` |
| `references/LESSONS.md` | what went wrong on the real work and the fixes |
| `examples/shorts/` | **starter for vertical Shorts** (fictional sample academy): scenes + transitions, captions from `timing.js`, `wt()` word timing, Pen marks, safe-zone guides (`?guides=1`), brand bug, composed music `sound.py`, `mix.json` — copy it and edit the EDIT blocks; passes check.mjs/produce.py as shipped |
| `examples/minimal/` | 30 s, 7 scenes, monochrome + one accent, iris transitions — page, `sound.py`, `mix.json`, narration take |
| `examples/pop/` | 18.75 s beat-synced kinetic short (128 bpm, every cut on the beat grid) — page, `sound.py`, `mix.json`, narration take |
| `examples/assets/` | Pretendard variable font (OFL), a logo, three ElevenLabs SFX takes (stamp, slap, typing), `pen.js` (hand-drawn marks that fit their target) |

## Project layout (what you create)
```
my-promo/
  assets/fonts/…, assets/logo.png        shared by every video page (pages load ../assets/…)
  assets/sfx/*.mp3                        ElevenLabs SFX takes (only the sounds code can't fake)
  <video>/index.html                      one page per video/style: window.DUR, window.render(t), ?f=p portrait
  <video>/sound.py                        song(dur) and/or sfx(add, sfx_dir)
  <video>/mix.json                        narration take + cues, music, levels, output, videos to mux
  <video>/audio/narration.mp3             one ElevenLabs take; optional audio/music.mp3 (ElevenLabs Music pick)
  <video>/captions.txt, <video>/timing.js  Shorts: caption chunks per narration line → caption-timing.py → captions + word times
  prompts/0N-<video>.md                   one-shot prompt per video (PART 1 video, PART 2 ElevenLabs)
  out/                                    stills, <video>-landscape.mp4, <video>-portrait.mp4, <video>.wav
```
Scripts run from the project root: `node <skill>/scripts/render.mjs <video>/index.html`, `python3 <skill>/scripts/mix.py <video>/mix.json --mux`.

Requirements: Node + Playwright Chromium, ffmpeg, Python 3 + numpy. ElevenLabs connector (MCP) for narration/SFX; the
**full** ElevenLabs connector for Music (the restricted one refuses music — then compose with `synth.py`).
**No ElevenLabs at all** (not subscribed / not connected): say so before building and let the person choose —
(a) start now without a voice: on-screen text carries the message (captions-style lines timed by reading speed,
~6 Korean syllables per second), music composed with `synth.py` (`references/song-recipes.py`) and synthesized SFX;
narration can be added later by re-timing scenes on the take; or (b) subscribe, connect the full connector
(claude.ai/customize/connectors → custom connector `https://api.elevenlabs.io/v1/mcp`) and do the full version.
**Sandboxed desktop / Cowork environments** may block outbound network from the shell: read this skill's files with the
web-fetch tool instead, and fall back to locally installed fonts if the bundled ones cannot be downloaded (`render.mjs`
already finds a globally installed Playwright). **Naver (blog.naver.com, m.blog.naver.com, rss.blog.naver.com) is
refused by Claude's web-fetch tool**; only a shell with network (`curl` the RSS feed and
`m.blog.naver.com/PostView.naver?blogId=…&logNo=…` with a mobile user agent) can read it. Without that, say so and ask
the person to paste the posts or upload them as PDF / screenshots (results are often images) — never guess the facts.

## Simple requests (most requests look like this)
People who are not technical will send two lines: a link, "make a promo / Shorts for parents", "use the promo-video skill".
That is enough. Do not ask them to specify anything the skill already decides; do this:
1. **Gather silently.** Read the source (Naver: `curl` RSS + mobile posts, images too — results and reviews are often
   images). Check the tools (`node`, `python3` + numpy, `ffmpeg`, Playwright Chromium); check whether an ElevenLabs
   connector with music is available.
2. **Ask ONCE, in one short message, in plain words** (then wait), only what you cannot decide yourself:
   - ElevenLabs missing → (a) start now without a voice: captions + music composed in code, free, a voice can be added
     later, or (b) subscribe + connect the full connector (how: `PROMPT.md` → short version), with a rough credit cost.
   - Contact details to show: the numbers / address you found (and any that disagree between posts) — "use these?".
   - Missing tools → "may I install Node.js / Python / ffmpeg / Playwright? (one time, ~10–20 min)".
   - Your plan in 3 lines: length, the style you recommend and why, the scene list. "Reply OK or tell me what to change."
   If the person cannot answer (headless run, "just do it"), take the recommended defaults: no-voice version, the
   contact details from the blog's own profile/intro, the recommended style.
3. **Build from the starter**, not from scratch: Shorts → copy `examples/shorts` + `examples/assets`; landscape/both →
   `examples/minimal`. Fill `captions.txt` → `caption-timing.py` (`--reading` without a voice, `--words` with one) →
   scenes on `wt(line, word)` → marks with `Pen` only.
4. **Gate:** `python3 <skill>/scripts/produce.py <video>/index.html` until it prints READY; then open the final contact
   sheet and look at every frame. Never hand over a video that has not passed `produce.py`.
5. **Hand over** the MP4, a facts-and-sources table (scene → source post), and what the person should confirm
   (contacts, consent for quoted parents/customers, anything dated).

## Workflow (detail)
1. **Research → facts sheet.** Read the site/blog/profile (Naver blogs: `curl` the RSS feed / mobile post pages from a
   shell; web-fetch is refused). Write down only what the source says: services, process steps, promises, contact,
   credentials. **Never invent numbers** (clients, ratings, years) — mock amounts get an "예시/example" label.
   See `references/STORYBOARD.md`.
2. **Format.** Shorts/Reels/"세로"/"3분 이내" → `references/SHORTS.md`: portrait only, 60–90 s for a considered
   purchase (parents, clinics) or 15–30 s for an impulse one, captions burned in, narration (or captions) timed *before*
   the scenes. Otherwise both orientations.
3. **Propose before building** (one message, see above): style + why (`references/STYLES.md`), scene list, length.
4. **Build the page** from the starter (`examples/shorts`, `examples/minimal`, `examples/pop`) + `examples/assets`.
   Keep the contract below. Portrait is a re-layout, never a scaled landscape. All hand-drawn marks via `Pen`.
5. **Check** while you build: `node <skill>/scripts/check.mjs <video>/index.html` (layout, safe zones, caption overlap,
   pen marks on target, fonts, determinism + a contact sheet). Fix every ERROR; look at every WARN on the sheet.
6. **Narration** (`references/SOUND.md`), when ElevenLabs is available: one line per scene, ONE take with
   `[long pause]` between lines (Eleven v4), Speech-to-Text word times → `splits` + `caption-timing.py --words`.
   Without a voice: `caption-timing.py --reading` (reading speed) and the captions carry the message.
7. **Sound effects + music.** SFX synthesized in `sound.py`; ElevenLabs only for physical sounds. Music: `song(dur)` with
   `synth.py`, or ElevenLabs Music (instrumental on, video + 2 s, `pick-music.py`).
8. **Produce**: `python3 <skill>/scripts/produce.py <video>/index.html [--fmt p|l|both]` — check → render → mix/mux →
   verify (frames, audio length, −14 LUFS ±2, true peak ≤ −1 dB) → final contact sheet. READY or it is not done.
9. **Hand over**: the MP4(s), sources table, and a one-shot prompt (`references/PROMPT.md`) so it can be re-made;
   variants under new names (`-elmusic-`), never over the approved files.

## Rules
- **Deterministic frames.** `render(t)` sets every element from `t` alone: no `Date.now`, no CSS animations/transitions
  running on their own, no unseeded `Math.random`. The same `t` must give the same pixels (that is what makes the MP4
  and the live preview match).
- **Both orientations composed on purpose**; text never under the Shorts/Reels UI (keep the bottom ~18 % and right
  edge of portrait free of key info); brand mark small in a corner, hidden on dark scenes if it clashes.
- **Readable**: ≥ 1 s per short phrase, ≤ 2 lines of headline at once, headline 64–120 px landscape, body ≥ 28 px.
  Korean: `word-break: keep-all`, tight tracking (−0.03…−0.05 em) on big Pretendard.
- **Truthful**: only facts from the source; example prices labelled; no imitation of a real messenger/app's logo or exact
  UI (draw a generic chat); don't promise what the business doesn't (e.g. "가품 취급 안 함" only if the site says so).
- **Hand-drawn marks (red pen circles, strikes, underlines, ticks) come from `assets/pen.js`**, never from hand-placed SVG
  paths: `Pen.circle('#el')`, `Pen.strike(words)`, … measure the real text and draw a closed, fitted stroke. Never put an
  overlay inside kinetic-split text (each word clips it) — pass the word spans to Pen instead.
- **One accent colour per video** (+ one functional colour such as KakaoTalk yellow if the CTA needs it).
- **Sound**: narration peaks clear of music (duck −10 dB), effects short and quiet (gain 0.15–0.35), no effect on every
  word. Final mix −14 LUFS, true peak about −1.5 dB, AAC 192k.
- **Captions on every Shorts/Reels video** (most are watched muted), from word timings, never typed in by guess.
- **Credits**: ElevenLabs generation spends the person's credits; never re-run a generation to "retry" — poll it.

## Contract every video page fulfils
`window.DUR` (seconds) and `window.render(t)` (draws time `t`, idempotent, any order). `?f=p` → portrait 1080×1920 layout
(otherwise landscape 1920×1080). `?render=1` → no preview UI, no own clock (the recorder calls `render`). Without
`?render`, the page plays itself in real time (requestAnimationFrame calling `render`) — that is the live preview and the
demo on the samples page. Fonts are declared with `@font-face` and loaded from `../assets/` (the recorder waits for them).
