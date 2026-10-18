# Lessons (problem → cause → fix)

From making 9 promo videos (5 styles for a tax accountant, 4 for an overseas buying agent).

## Research and copy
- **Blog page would not fetch** (Naver blog blocks scrapers) → use the blog's RSS feed (`rss.blog.naver.com/<id>.xml`) for
  post titles and summaries.
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
- **The restricted ElevenLabs connector refuses music** (voice + SFX only) → compose in code with `synth.py`, or connect
  the full connector for ElevenLabs Music.
- **ElevenLabs Music sang** although the prompt said "no vocals": the run had `instrumental=false`, `lyrics_type=auto` →
  set `lyrics_type: instrumental` and `instrumental: true` on the node before running; verify with speech-to-text.
- **Requested timeline ignored**: of 12 takes none placed every section where asked; most faded out ~2 s before the end →
  ask for DUR + 2 s and "stays full until N s", trim the tail; choose by loudness strips against the cuts; delay a take
  (e.g. +0.2 s) so its drop lands on a cut.
- **Generated music too loud under the voice** at the composed song's level → match RMS to the old track, then −1.5 dB.
- Background wait loops with `pgrep -f <pattern>` matched themselves and never ended → wait on a PID or a file instead.

## Delivery
- Keep approved files; write variants under new names (`*-elmusic-*`) so the person can compare.
- Give a one-shot prompt per video with the ElevenLabs part separate (voice id, model, script, cue times, SFX and music
  prompts + the settings actually used) — that is what lets someone else re-make it.
