# Shorts / Reels mode: vertical only, 60–90 s, burned-in captions

Use this when the person asks for a Shorts / Reels / TikTok video ("숏츠에 올릴 수 있게", "세로로", "3분 이내").
Proven on an 86 s parent-facing promo for a small math academy (vertical only, narration + music + captions).

Start from `examples/shorts` (everything below is already built in) and finish with `scripts/produce.py`.

## Length
YouTube Shorts takes up to 3 minutes, but length should follow the decision the viewer makes:
- impulse / low price (an app, a shop item): 15–30 s, hook in the first second (`examples/pop`).
- considered purchase (a school, a clinic, a tax accountant — parents, owners): 60–90 s. They watch longer if every
  scene answers the next question in their head (`STORYBOARD.md` → "Long Shorts for considered purchases").
Do not fill 3 minutes because it is allowed.

## Layout (1080 × 1920)
- Build portrait only (`DUR`, `W=1080, H=1920` fixed; no `?f` branch) and render with `--fmt p`.
- Key content between y ≈ 180 and 1300. Caption box at y ≈ 1350 (left-aligned at x 60, max width 860).
- Keep empty: the bottom ~18 % (title, description, music line) and x > 940 in the lower half (like / comment / share).
- Small brand mark top-left (logo square + name), visible from the first second.
- The first frame is the thumbnail and the hook: show the problem object (e.g. a report card with the grade) at t = 0,
  not a fade from blank.

## Captions (burned in)
Most Shorts are watched muted, so the narration must be on screen. Do it from word timings, not by hand:
1. Generate the narration (one take, `[long pause]` between lines) and set `mix.json` (cues, `splits`, `gap_cap`).
2. Transcribe the take with ElevenLabs Speech to Text: put the take on its flow
   (`creative_add_flow_asset_node` with its generation_id), `creative_transcribe_audio` (model `eleven_scribe_v1`,
   ≈165 credits for 77 s), poll, then `curl -o words.json "<words_download_url>"`.
   The word times are also the reliable way to set `splits` for a long take: silence detection alone mis-splits when
   pauses inside a line are as long as pauses between lines.
3. Write `<video>/captions.txt`: one line per narration line, chunks of ≤ ~22 characters separated by " / "
   (break at commas; a chunk must fit 2 lines of the caption box).
4. `python3 <skill>/scripts/caption-timing.py <video>/mix.json --words words.json --chunks <video>/captions.txt --out <video>/timing.js`
   It maps every word through mix.py's placement (cue, capped pauses, speed), so re-run it whenever `mix.json` changes.
5. In the page, load `timing.js` before the main script, show the active caption, and drive animations by word:

```html
<script src="timing.js"></script>
<style>
#cap{position:absolute;left:60px;top:1352px;width:860px;z-index:60;display:flex}
#cap div{background:rgba(27,37,80,.93);color:#fff;font-weight:700;font-size:44px;line-height:1.36;padding:16px 30px 18px;border-radius:20px}
</style>
<div id="cap"><div id="capt"></div></div>
<script>
const T = window.TIMING;
const wt = (li, sub) => { const w = T.words[li].find(x => x[0].includes(sub)); if (!w) throw new Error('no word ' + sub); return w[1]; };
// inside render(t):
//   pop($('#badge'), t, wt(8, '합격') - 0.2);          // animate on the spoken word
const cap = T.caps.find(c => t >= c.t0 && t < c.t1), ce = $('#capt');
if (cap) { ce.parentElement.style.display = 'flex'; if (ce.textContent !== cap.x) ce.textContent = cap.x; ce.style.opacity = clamp(prog(t, cap.t0, 0.12)); }
else ce.parentElement.style.display = 'none';
</script>
```
The same `timing.js` can be read by `sound.py` (parse the JSON after `=`) so effects land on the same words.

## Scene timing from the narration
Generate the narration first, then lay the scenes on it: scene start = a little before its line's cue, ≥ 0.6 s of air
between lines, 2–4 s of hold after the proof and CTA lines (numbers need reading time). Every animated element starts
from `wt(line, word)`, so changing the take only means re-running `caption-timing.py`.

## Checks before the full render
- Stills at every scene's busiest moment: nothing under the caption box, nothing in the bottom 18 %, no element
  appearing after its scene has ended (an element timed on a late word can miss its scene).
- Every hand-drawn mark checked on a still *after* it finishes drawing: circles closed around the whole target, strikes
  across the whole phrase (use `pen.js`; marks typed as SVG coordinates are always a little off).
- Contact sheet of 10–12 frames from the final MP4 (ffmpeg `-ss t -frames:v 1`) — the MP4 is what gets uploaded.
- `mix.py` report: no overlaps; the `levels:` line in range.
