---
name: promo-video
description: Make short promo / ad motion-graphics videos (15–40 s) for a business, shop, freelancer or service — landscape 1920×1080 (PC, YouTube, homepage) AND portrait 1080×1920 (Shorts, Reels) — from its website, blog or profile, with ElevenLabs narration, sound effects and music (generated or composed in code), mixed and muxed into MP4. One HTML page per video, rendered frame by frame. Also proposes styles and a storyboard first, and writes a one-shot prompt per video. Use when asked for a promo video, ad, 홍보 영상, 광고 영상, 모션그래픽 홍보, 쇼츠/릴스 광고, "이 사이트 보고 영상 만들어줘", "맡기고 싶게 / 써보고 싶게 만드는 영상", or to add narration / background music to such videos.
---

# promo-video

A pipeline for **conversion-minded promo videos**: a 15–40 s motion-graphics ad whose only job is to make the viewer want
to hire / try the business right now. Every video is one self-contained HTML page that draws any moment `t` on request
(kinetic type, UI mock-ups, paper collage, whiteboard, globe, …), recorded to MP4 at 30 fps in both orientations, then
scored: one ElevenLabs narration take cut into lines and placed on scene cues, synthesized UI sounds + a few ElevenLabs
SFX, and music either composed in numpy or generated with ElevenLabs Music — ducked under the voice and normalised.

Built for and proven on 9 videos for two clients (a tax accountant: 5 styles; an overseas buying agent,
fortimoveglobal.com: 4 styles), github.com/jungrok5/ysw-tax (private; `video/`, `fortimove/`, `audio/`).
The samples page shows all nine as live pages: https://jungrok5.github.io/motion-skills/promo-video/

## What's in this folder
| path | what |
|---|---|
| `scripts/render.mjs` | record a page to MP4 (landscape + portrait) or PNG stills with Playwright → ffmpeg (libx264 crf 18, yuv420p, faststart) |
| `scripts/mix.py` | build the soundtrack from a `mix.json`: narration take → lines on cues, `sound.py` sfx/song or a music file, −10 dB ducking, −14 LUFS; `--mux` puts it into the MP4s |
| `scripts/synth.py` | numpy instrument + SFX kit (pluck, marimba, e-piano, pad, bass, drums, pop, swoosh, chime, shutter, buzz, tick, reverb, Track) — no samples, deterministic |
| `scripts/pick-music.py` | compare ElevenLabs Music variations against the scene cuts (loudness strips + spectrogram sheet) and cut the pick to length |
| `references/STORYBOARD.md` | from a website/blog to a 6–7 scene ad: research rules (facts only), the hook→problem→solution→proof→CTA arc, how to propose styles |
| `references/STYLES.md` | the 9 proven looks (what each is, who it suits, how it is built, timings) + looks borrowed from canvas-film kits (e.g. the recipe/step card) |
| `references/SOUND.md` | ElevenLabs flow: voices that worked, one-take narration, SFX prompts, Music (instrumental flag, +2 s, 4 variations, picking), mixing levels |
| `references/PROMPT.md` | the one-shot prompt format (PART 1 video for Claude Code, PART 2 ElevenLabs) with a filled example |
| `references/song-recipes.py` | five composed songs (paper, chat, editorial, whiteboard, premium promo) to copy into a `sound.py` |
| `references/LESSONS.md` | what went wrong on the real work and the fixes |
| `examples/minimal/` | 30 s, 7 scenes, monochrome + one accent, iris transitions — page, `sound.py`, `mix.json`, narration take |
| `examples/pop/` | 18.75 s beat-synced kinetic short (128 bpm, every cut on the beat grid) — page, `sound.py`, `mix.json`, narration take |
| `examples/assets/` | Pretendard variable font (OFL), a logo, three ElevenLabs SFX takes (stamp, slap, typing) |

## Project layout (what you create)
```
my-promo/
  assets/fonts/…, assets/logo.png        shared by every video page (pages load ../assets/…)
  assets/sfx/*.mp3                        ElevenLabs SFX takes (only the sounds code can't fake)
  <video>/index.html                      one page per video/style: window.DUR, window.render(t), ?f=p portrait
  <video>/sound.py                        song(dur) and/or sfx(add, sfx_dir)
  <video>/mix.json                        narration take + cues, music, levels, output, videos to mux
  <video>/audio/narration.mp3             one ElevenLabs take; optional audio/music.wav (ElevenLabs Music pick)
  prompts/0N-<video>.md                   one-shot prompt per video (PART 1 video, PART 2 ElevenLabs)
  out/                                    stills, <video>-landscape.mp4, <video>-portrait.mp4, <video>.wav
```
Scripts run from the project root: `node <skill>/scripts/render.mjs <video>/index.html`, `python3 <skill>/scripts/mix.py <video>/mix.json --mux`.

Requirements: Node + Playwright Chromium, ffmpeg, Python 3 + numpy. ElevenLabs connector (MCP) for narration/SFX; the
**full** ElevenLabs connector for Music (the restricted one refuses music — then compose with `synth.py`).

## Workflow
1. **Research → facts sheet.** Read the site/blog/profile (use the RSS feed if the blog blocks fetching). Write down only
   what the source says: services, process steps, promises, contact, credentials. **Never invent numbers** (clients,
   ratings, years) — mock amounts get an "예시/example" label. See `references/STORYBOARD.md`.
2. **Propose before building.** Recommend one style and say why it fits the audience; offer 3–4 alternatives
   (`references/STYLES.md`); give a scene-by-scene storyboard with timings for landscape and portrait. Get a yes.
3. **Build the page** from the closest example: copy `examples/minimal` (or `pop`) and `examples/assets`. Keep the
   contract below. Portrait is a re-layout (stack top→bottom, key info in the middle third), never a scaled landscape.
4. **Check stills, both orientations**: `node <skill>/scripts/render.mjs <video>/index.html --stills 2,6,10,14,…`
   at every scene's busiest moment. Look at them: overlapping text, a stamp covering the words it stamps, clipped
   portrait edges, unreadable small text. Fix, re-shoot, then render: `node <skill>/scripts/render.mjs <video>/index.html`.
5. **Narration** (`references/SOUND.md`): write one line per scene (해요체, short), estimate syllables against scene
   length, generate ONE take with `[long pause]` between lines (Eleven v4), pick the shortest variation, set cue times
   (scene start + ~0.2 s) and `splits` in `mix.json`, run `mix.py` and read its report: no overlaps, ends before `dur`.
   Speed lines up with `atempo` 1.05–1.15 at most; if more is needed, shorten the line.
6. **Sound effects + music.** SFX: synthesize UI sounds in `sound.py` (`synth.pop/swoosh/tick/chime/shutter/buzz`), use
   ElevenLabs only for physical sounds (stamp, tape, typing) and cut the hit you need with `synth.clip`. Music: compose
   `song(dur)` with `synth.py` (follows the cuts exactly), or generate with ElevenLabs Music (instrumental on,
   duration = video + 2 s), compare with `pick-music.py compare … --cuts …`, cut with `pick-music.py cut`, set `"music"`.
7. **Mix and mux**: `python3 <skill>/scripts/mix.py <video>/mix.json --mux`. Re-run after every re-render (rendering
   writes a silent MP4). Verify: frame count = `DUR × 30`, audio duration = `DUR`, `ffmpeg -i x.mp4 -af ebur128=peak=true -f null -`
   ≈ −14 LUFS, peak ≤ −1 dB. Listen-check by reading the loudness of voice vs music if you cannot listen.
8. **Hand over**: both MP4s per video, and a one-shot prompt per video (`references/PROMPT.md`) so the person can
   re-make or vary it; keep the ElevenLabs part separate (voice, script, cue times, SFX/music prompts and settings).
   When adding a variant (e.g. a different music), write new files (`-elmusic-`) instead of overwriting the approved ones.

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
- **One accent colour per video** (+ one functional colour such as KakaoTalk yellow if the CTA needs it).
- **Sound**: narration peaks clear of music (duck −10 dB), effects short and quiet (gain 0.15–0.35), no effect on every
  word. Final mix −14 LUFS, true peak about −1.5 dB, AAC 192k.
- **Credits**: ElevenLabs generation spends the person's credits; never re-run a generation to "retry" — poll it.

## Contract every video page fulfils
`window.DUR` (seconds) and `window.render(t)` (draws time `t`, idempotent, any order). `?f=p` → portrait 1080×1920 layout
(otherwise landscape 1920×1080). `?render=1` → no preview UI, no own clock (the recorder calls `render`). Without
`?render`, the page plays itself in real time (requestAnimationFrame calling `render`) — that is the live preview and the
demo on the samples page. Fonts are declared with `@font-face` and loaded from `../assets/` (the recorder waits for them).
