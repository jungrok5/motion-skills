# Sound: narration, effects, music, mix

Everything goes through `scripts/mix.py <video>/mix.json`. Generation is done with the ElevenLabs MCP connector
(tools `creative_*`). Each generation spends the person's credits: poll a run with `creative_get_flow_run_status`
(wait `poll_after_seconds`), never start it again to "retry". Download results with `curl -o` from the signed
`content_url`. A status result for many variations can be too big to read inline — save it and pull the urls with `jq`.

## Narration — one take, cut into lines
1. Write one short line per scene (해요체 for Korean ads). Budget about 5.5–6.5 syllables per second; a 4 s scene holds
   ~22 syllables. Brand name last, alone, in the CTA line.
2. Pick the voice with `creative_list_voices` (voice ids only ever come from that list or the person). What worked:
   | voice | character | used for |
   |---|---|---|
   | Dahye – Clear Korean Explainer | clear, mid-pace female | minimal main, pop short (fast lines), chat |
   | Sun – Calm Korean Narrator | calm announcer-like female, normal pace | whiteboard, unboxing |
   | Kevin – Deep, Trustworthy & Professional | low, trustworthy male | editorial, globe |
   | Wisdom (corporate female), 복덕누나 (bright friendly female) | — | premium promo, paper collage |
   Avoid voices described as learner/slow ("Soo" read a 37 s script in 80 s+); test a 2-line preview first if unsure.
3. Model **Eleven v4** (`eleven_v4`), emotion tags in brackets, and `[long pause]` between lines — one call for the
   whole script, e.g. `[curious] 이거 어디서 팔아요? [long pause] 판매처도 모르고, 해외 직구는 복잡하고. [long pause] [warmly] …`.
   It returns several takes: download all, take the **shortest** that sounds right (check for a degenerate take:
   a voice that stops pausing and rises in level after ~6 s — regenerate with another voice).
4. Fill `narration` in `mix.json`: `lines`, `cues` = `[scene_start + 0.15…0.35, speed]`, `gap_cap` 0.15–0.3 (shortens
   pauses inside a line), `thr` −50 dB. Run `mix.py` and read the report. If a line is split wrong, set `splits` = take
   times between lines (look at the "take a–b s" numbers in the report). Speed ≤ 1.15; beyond that, rewrite the line.
   A cue can keep only the first N parts of a line: `[15.25, 1.1, 2]`.

## Sound effects
- Synthesize UI sounds in `sound.py` with `synth.py`: `pop(f0,f1)` bubbles/chips, `swoosh(dur, rise, seed)` transitions,
  `tick()` counters, `chime()` notification, `shutter()` camera, `buzz()` error, `kick()` impact. Gains 0.15–0.35.
- Use ElevenLabs Sound Effects only for physical sounds, ~2 s each, then cut one hit with `synth.clip(x, a, b)`:
  | sound | prompt |
  |---|---|
  | stamp | One firm rubber stamp thump pressed onto paper on a wooden desk. Single hit, punchy, close-up, dry. |
  | typing | Soft smartphone touchscreen keyboard typing, light quick taps with subtle haptic clicks, about two seconds, close-up, quiet room. |
  | slap (paper + tape) | A single small paper card slapped onto a wooden desk, then a strip of masking tape pressed down over it. Short, crisp, close-up, dry, no reverb. |
  | marker | Dry erase marker writing quickly on a whiteboard, continuous light squeaky felt tip strokes, steady, close-up, no voices. |
  | eraser | Whiteboard eraser wiping across a board in two quick strokes, soft felt rubbing swoosh, about one second. |
- Place effects on the frame the visual event happens (same constants as the page). Not every word needs a sound.

## Music — two ways
**A. Composed in code** (`sound.py: song(dur)`, `synth.py`, recipes in `song-recipes.py`). Follows the cuts to the
frame (impacts on scene starts, a break under the "honest" line, final chord on the logo), costs nothing, always
instrumental. Use it by default, and always when only the restricted ElevenLabs connector is connected.

**B. ElevenLabs Music** (full connector; node type `music`, model `eleven_music_v2_5`). Richer sound, but it does not
follow a timeline precisely.
1. `creative_add_flow_node` (node_type `music`) with `model_parameters`
   `{"duration_seconds": DUR + 2, "lyrics_type": "instrumental", "instrumental": true}` — check names with
   `creative_get_model_schema` first. Without the instrumental flag the model may sing even if the prompt says "no vocals".
   (`creative_generate_in_flow` starts immediately with default parameters — don't use it for music.)
2. Prompt: genre, bpm, key, instruments, then the timeline in seconds ("at about 8 seconds bursts into …"), "no vocals",
   and "stays full until N s" — otherwise most takes fade out early. Several nodes on one flow can run in one
   `creative_run_flow_nodes` call. Default 4 variations; cost scaled with length (≈ 900 credits per 30 s take, ≈ 405 per 27 s, ≈ 315 per 21 s on v2.5).
3. Compare: `python3 <skill>/scripts/pick-music.py compare take*.mp3 --cuts 4.2,8.2,12.6,… --sheet out/music.png`.
   Choose the take whose drops and lifts sit near the cuts and that does not go quiet before the CTA. Takes tend to
   change section on 4/8-bar boundaries (8 s at 120 bpm), so a requested lift at 10 s may arrive at 16 s; a constant
   groove with steps up can beat a "structured" take with a 6 s silent intro (bad for a short's hook).
4. If unsure about vocals, put the pick on the flow (`creative_add_flow_asset_node` with its generation_id) and run
   speech-to-text (`creative_transcribe_audio`, ~165 credits): empty text = instrumental.
5. `pick-music.py cut take.mp3 --dur DUR --delay 0.2 --out <video>/audio/music.wav` (delay so a drop lands on a cut),
   set `"music"` in `mix.json`, and match the level (below).

## Mix levels
`mix.py`: music × `music_level` × duck (−10 dB while the voice is above −38 dBFS, 40 ms attack, 350 ms release) + voice ×
0.95 + sfx; 0.4 s tail fade; `loudnorm=I=-14:TP=-1.5:LRA=11` then `alimiter=0.78`; AAC 192k into the MP4 (`-c:v copy`, no `-shortest`).
- Composed songs: `music_level` 0.26 (whiteboard, voice-heavy) … 0.42 (editorial).
- A generated track is denser than a composed one at the same RMS. Compute the level that matches the old song's RMS
  (`old_level × rms_old / rms_new`) and go about 1.5 dB under it (× 0.84).
- After muxing check: `ffprobe` frame count = DUR × 30, audio duration = DUR, `ebur128` integrated ≈ −14 LUFS.
