# Sound: narrator, music, SFX (ElevenLabs), mixed in code

The donut film's soundtrack is part of the joke: a **grave Korean documentary narrator** (a nature-film voice) reads short
lines over a trivial office fight, the music changes register exactly where the picture does (lazy office groove → mock-epic
hit; mock-serious tension → shōnen battle cut dead by a record scratch), and SFX land on the lettering. Everything below is how
that was made; `examples/donut/scenes/*.sound.json` are the specs, `scenes/audio/` the files actually used.

## 1. The spec: `scenes/<id>.sound.json`
```json
{ "duration": 26,
  "music": [ { "id": "m1", "src": "m1_b", "at": 0, "len": 11.25, "db": -3, "fin": 0.4, "fout": 0.3,
               "prompt": "Mock-serious comedic tension, 96 bpm, D minor: pizzicato, low toms, bassoon (12 s)" } ],
  "sfx":   [ { "id": "shout", "src": "impact_b", "at": 11.25, "db": -7, "prompt": "impact on 그럼… 가위바위보!" },
             { "id": "n1", "kind": "narration", "src": "n1-cut", "at": 0.05, "len": 1.78, "db": 2, "text": "겉으로는, 양보." } ],
  "ducks": [ { "from": 0.02, "to": 1.85, "db": -10, "ramp": 0.3 }, { "from": 1.85, "to": 1.98, "db": -7.5, "ramp": 0.01 }, … ] }
```
- Files: `scenes/audio/<id>__<src>.mp3` (or `<src>.mp3`, shared — the starter reuses four donut SFX that way).
- **Narration lines live in `sfx`** with `"kind": "narration"` and their `text` (mix.py mixes music + sfx; the kind and text are
  for you, `sound-levels.py` and the next person). A line starts on or just after the frame where its ✱ tag appears and must end
  before the next line or the punchline.
- **Music**: ≤ 3 cues per scene, **split at the register switches** (a cue that must hit a visual beat starts ON that beat).
  A take that thins out or fades before the length you asked for is cut where it thins (`len`) and the next cue takes over.
  To land a later part of a take on a beat (a climax under the slow-motion lunge), cut a **tail**: the same take from an offset
  (`audio-cuts.py`, `tails`) placed as its own cue.
- **SFX**: ≤ 8 distinct sounds per scene, re-used by `src` (one taiko for 가위/바위/보/하나/둘/셋 at different `db`).
- **Ducks**: mix.py pulls everything placed before a duck down by `db` and snaps back at `to`. Under narration, duck the bed
  −10 dB (−15 under a soft line) and release it in **steps** (×.75, ×.5, ×.25 over 0.39 s, 0.13 s each) so it does not jump back.
  A hard duck (−30) before a climax makes the silence the beat.

## 2. Generating (ElevenLabs MCP "creative" tools)
- **One flow per batch** (`creative_create_flow`), one node per cue; **generations_count 2** (a pick and a fallback, `_b`);
  **never retry a generation** — it charges again; use the other take.
- Music: `node_type: music`, `eleven_music_v2_5`, instrumental, `duration_seconds: ceil(len) + 1` (min 10). Prompt how it
  SOUNDS (genre, instruments, bpm, key, how the energy moves), never the picture.
- SFX: `node_type: sfx`, `eleven_text_to_sound_v2`, `duration_seconds` 0.5–30, prompt_influence 0.5. One concrete sound per prompt.
- Narration: `creative_generate_speech` with a voice picked from `creative_list_voices` for "deep, grave, documentary narrator"
  that reads Korean well (a multilingual model); one line per generation, the exact text, two takes. Write lines with
  `…` and commas where the pause should be — then cut the pauses to length anyway (below).
- Poll `creative_get_flow_run_status` (≤ 20 session ids per call); let large results land in a file and pull the
  `content_url`s with `jq` (they expire after ~2 h). Keep a map `session id → <scene>__<id>` (and `_b`) as you start each batch.
- Keep the raw takes locally and gitignore the unused ones (`examples/donut/.gitignore` lists them); commit only what the
  spec uses.

### What the donut film generated (and an estimate of what it cost)
10 narration lines × 2 takes (114 characters, ~56 s of speech), 5 music cues × 2 takes (~150 s), 17 SFX × 2 takes (~65 s).
With the rates canvas-film measured (music ≈ 15 credits/s per take, SFX ≈ 3 credits/s) and speech at about 1 credit per
character, that is roughly **2.3 k (music) + 0.2 k (SFX) + 0.2 k (speech) ≈ 2.7 k credits** for 74 s — music is ~85 % of it.
Shorter music takes (10–12 s, re-used across a scene) are the lever.

## 3. Narration editing: `scripts/audio-cuts.py`
A generated read is slower and pausier than comic timing wants. For each line: `audio-cuts.py --info <take>` prints where speech
starts and ends and every pause > 0.15 s; choose the segments; write them to `scenes/audio/cuts.json` with the silences between
(0.25–0.4 s worked) and an optional tempo (1.12–1.15 tightened two slow reads without changing pitch); run `audio-cuts.py` →
`<scene>__<id>-cut.mp3`, each line brought to **−18 dBFS active-speech RMS** and peak-limited. A word can be dropped this way
(ep3's 「자연은 늘…」 became 「자연은…」). `examples/donut/scenes/audio/cuts.json` rebuilds every `-cut` / `-tail` file there.

## 4. Mix and check — you cannot listen
`python3 <skill>/scripts/mix.py` → `scenes/<id>.wav` (48 kHz, peak-normalised to 0.89 when it goes over). Then measure:
`python3 <skill>/scripts/sound-levels.py <id>…` (voice vs the bed under every line, the mix per second) and
`ffmpeg -i scenes/<id>.wav -af ebur128 -f null -` (integrated loudness). Measured on the donut film:

| | ep1 | ep2 | ep3 |
|---|---|---|---|
| voice (active RMS) | −19.6…−20.2 dBFS | −22.3…−23.0 | −19.9…−20.6 |
| bed under a line (−10 dB duck) | −31.3…−32.5 → voice +11.7…12.9 dB | −33.5…−35.7 → +10.5…13.0 | −33.6 → +13.0 |
| deliberate silence (−30 duck) | — | voice +30.6 dB before the lunge | +21.2 (no music until 18.45 s) |
| integrated loudness of the wav | −17.5 LUFS | −17.7 | −16.6 |

`assemble.py` brings each scene to −16 LUFS when it joins them, so a quieter scene does not vanish. When a hit must land on a
frame, compare its cue `at` with the beat in `SCRIPT.beat` (and the SFX lettering's `at`) — they should be the same number.
