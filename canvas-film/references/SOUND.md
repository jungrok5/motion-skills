# Sound with ElevenLabs (music + SFX), mixed in code

`<scene>.sound.json`
```json
{ "duration": 30,
  "music": [ { "id": "m1", "at": 0, "len": 30, "db": -2, "fin": 0.5, "fout": 1.5,
               "prompt": "how the music SOUNDS: genre, instruments, mood, tempo, how energy evolves (no visuals)" } ],
  "sfx":   [ { "id": "s1", "at": 4.2, "len": 2, "db": -4, "loop": false,
               "prompt": "one concrete sound, short: 'Heavy wooden door slamming shut, deep thud'" } ],
  "ducks": [ { "from": 12.0, "to": 13.5, "db": -25 } ] }
```
A cue may name `"src": "pen"` to share one generated file between cues (`audio/<scene>__pen.mp3`).

## Generating (ElevenLabs MCP "creative" flow tools)
- One **flow** per batch (`creative_create_flow`), one **node per cue**: music → `node_type: music`,
  `model_id: eleven_music_v2_5`, `{duration_seconds: ceil(len)+1 (min 10), instrumental: true}`; SFX → `node_type: sfx`,
  `eleven_text_to_sound_v2`, `{duration_seconds: len (0.5–30), prompt_influence: 0.5, loop}`. Prompt = the cue's prompt verbatim.
- `creative_run_flow_nodes` with **generations_count 2** (a pick + a fallback). The queue holds ~64 concurrent generations:
  run batches of ≤ 30 nodes and wait for each to finish.
- **Never retry or re-run a generation** — it charges again. A failed one is recorded; use its `_b` variant.
- Poll `creative_get_flow_run_status` (≤ 20 session ids per call). Results are large: let them land in a file and pull
  `content_url`s with `jq`; signed URLs expire after ~2 h. Keep a map `session_id → <scene>__<id>` (and `_b`) as you start
  each batch, and a small downloader that maps the session id in each URL path to its file name.
- Cost guide (2026): music ≈ 15 credits/s per variation, SFX ≈ 3 credits/s. A 13-min film with 2 variations of everything
  ≈ 23 k credits. Delegating the whole generate→download→mix loop to one background agent keeps the main context clean.

## Mixing
`python3 <skill>/scripts/mix.py <scene>…` → `scenes/<scene>.wav` (cues placed, trimmed/looped, faded, ducked, peak 0.89).
`assemble.py` and `publish.py` loudness-normalise each scene to −16 LUFS, so quiet scenes don't vanish.
You can't listen: sanity-check with `ffmpeg -af volumedetect` (mean/max) and duration, and trust the cue times.
