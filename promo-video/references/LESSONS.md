# Lessons (problem → cause → fix)

From making 9 promo videos (5 styles for a tax accountant, 4 for an overseas buying agent).

## Research and copy
- **Blog page would not fetch**: Claude's web-fetch tool refuses every Naver host (blog, m.blog, rss.blog) → from a shell,
  `curl` the RSS feed (`rss.blog.naver.com/<id>.xml`, first ~800 chars per post) and the full posts at
  `m.blog.naver.com/PostView.naver?blogId=<id>&logNo=<no>` with a mobile user agent (text + image URLs; download images
  with a `m.blog.naver.com` referer and read them — results and reviews are often images). No shell network → ask
  the person to paste or upload the posts.
- **A Q&A line was factually wrong** ("월세 2천만 원 이하 분리과세" applies to housing rent only) → keep a facts sheet with the
  source sentence for every claim; let a domain-literate pass read the script before narration is generated.
- **Tempting to add numbers** (clients served, ratings) that the site does not state → never; mark mock quote amounts
  "예시". Credibility comes from process and promises the site really makes (no hidden fees, no payment before the quote).

## Layout
- **Stamp covered the receipt text** it was stamping → move it (top 74 % of the receipt) and check the still at the
  moment of impact; overlays are the most common overlap bug.
- **Portrait is not a crop.** Re-lay out top→bottom, enlarge type, keep key info in the middle third; check every
  scene in both orientations before the full render.

## Rendering
- **Fonts must be ready before frame 0** (a late swap shows as a jump in the video) → wait for every `@font-face` (`document.fonts` + `load()`) before frame 0;
  ship fonts locally (no network during render).
- Variable font (one Pretendard woff2, 2 MB) instead of six static OTFs (9.5 MB) renders the same weights 400–900 (checked on stills).
- `-shortest` in the mux dropped the last video frames → mux without it; the soundtrack is cut to exactly `DUR`.

## Narration
- **A learner-paced voice** (described as slow/clear for learners) read 37 s of script in 80 s+, and even per-line takes
  stayed slow → switch voice (Sun) instead of speeding it up past 1.15×.
- **A take degenerated** after ~6 s (no more pauses, level rising) with one voice → regenerate with another voice; always
  listen to / measure the take before cutting it.
- **Auto-split put words in the wrong line** (a long pause inside a sentence) → explicit `splits` (take times between
  lines) in `mix.json`; read the report's "take a–b s" per line.
- Lines overlapping the next cue → the report warns; shorten the line or nudge speed (≤ 1.15).

## Music and mix
- **Karplus-Strong pluck had a DC offset** that pumped the limiter → subtract the buffer mean; `finish()` also removes
  the stereo mean.
- **Peaks over target after loudnorm** → `alimiter=limit=0.78` after `loudnorm`.
- **The MP4 peaked at 0 dB although the WAV was at −1.9 dB**: AAC overshoots sharp synthesized transients by ~2 dB → `mix.py --mux`
  measures the encoded true peak and, above −1 dB, limits only the peaks harder (0.62, then 0.5) and muxes again (−14.6 LUFS, −2.6 dB).
- **The restricted ElevenLabs connector refuses music** (voice + SFX only) → compose in code with `synth.py`, or connect
  the full connector for ElevenLabs Music.
- **ElevenLabs Music sang** although the prompt said "no vocals": the run had `instrumental=false`, `lyrics_type=auto` →
  set `lyrics_type: instrumental` and `instrumental: true` on the node before running; verify with speech-to-text.
- **Requested timeline ignored**: of 12 takes none placed every section where asked; most faded out ~2 s before the end →
  ask for DUR + 2 s and "stays full until N s", trim the tail; choose by loudness strips against the cuts; delay a take
  (e.g. +0.2 s) so its drop lands on a cut.
- **Generated music too loud under the voice** at the composed song's level → match RMS to the old track, then −1.5 dB.
- Background wait loops with `pgrep -f <pattern>` matched themselves and never ended → wait on a PID or a file instead.

## Shorts (vertical, 86 s, captions)
- **Silence split a 77 s narration take wrongly** (pauses inside lines ≈ pauses between them) → Speech to Text word
  timings; set `splits` from them and generate captions from the same words (`caption-timing.py`).
- **Content ran into the caption box** (5 chips wrapped to 4 rows, a CTA card's address under its search box) → fixed
  zones: content 180–1300 px, caption ≈ 1350, bottom 18 % empty; check stills at the busiest moment of each scene.
- **An element timed on a late word never showed** (a review card set 1.4 s after the line's last word, after its scene
  ended) → time elements on words *inside* their scene's line.
- **A progress bar did not fill**: `width` on an inline `<span>` does nothing → `display:block` on the fill.
- **Music 22 dB under the voice was too quiet** with a dense generated track → `mix.py` now reports the balance; 15 dB.
- **A 15 MB music WAV in the repo** → keep the picked track as MP3 (256 kbps); mix.py reads any format.

## Hand-drawn marks
- **Red-pen marks were all slightly off** in a test video made from the short prompt: a circle stretched from a generic path
  missed the minus sign it was meant to circle, an "O" around a button did not close, and a strike placed inside
  kinetic-split text was clipped word by word ("아이 탓" struck in two broken pieces) → `assets/pen.js` measures the target
  (offset box, transform-independent, after fonts) and generates the stroke: a 1.1-turn circle whose end crosses its start,
  a strike across the full phrase, etc.; for kinetic text pass the word spans. Check each mark on a still after it is drawn.

## Pipeline (why produce.py and check.mjs exist)
- A short prompt from a non-technical person produced a good video, but with small visual defects nobody asked about
  (marks off target, a blank card for a moment, the MP4 peaking at 0 dB, a stray mark left visible in later scenes) —
  the person cannot spot or describe these → the skill has to catch them itself: `check.mjs` before rendering
  (fails on errors), `produce.py` as the only way to make the deliverable (READY / NOT READY), starter templates with the
  rules built in.
- **A pen mark stayed visible in every later scene**: `visibility: visible` on a child overrides the hidden parent
  scene → pen.js shows/hides marks with `display`; check.mjs judges visibility per element (inherited, overridable)
  and flags marks drawn while their target is invisible.
- **The contact sheet showed duplicate frames** (a 0.04 s time window caught two frames) → select exact frame numbers.

## Running on the person's own machine
- The Claude desktop app's local environment had Node 22, ffmpeg 6, numpy, Playwright 1.63 + Chromium, but no
  outbound network from the shell, and Playwright installed globally (ESM `import` cannot see it) → read sources with
  web fetch; `render.mjs` loads Playwright through `createRequire` + `npm root -g`.
- The person being briefed had no ElevenLabs subscription → the prompt asks first: silent version now (text + composed
  music) or subscribe and connect for narration and generated music.

## Delivery
- Keep approved files; write variants under new names (`*-elmusic-*`) so the person can compare.
- Give a one-shot prompt per video with the ElevenLabs part separate (voice id, model, script, cue times, SFX and music
  prompts + the settings actually used) — that is what lets someone else re-make it.
- A long, scene-by-scene prompt is not what people send each other. When the skill holds the method, the hand-over
  prompt can be five lines (source link, audience, goal, format, "use the promo-video skill") — see `PROMPT.md`.
