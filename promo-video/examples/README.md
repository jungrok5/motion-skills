# Examples

Both were made for a real client (Fortimove Global, an overseas buying agent) and are kept as the reference quality bar.

| folder | length | what it shows |
|---|---|---|
| `minimal/` | 30 s, 7 scenes | monochrome + one accent colour, word-by-word kinetic headlines, UI mock-ups (post, search, chat, quote card), iris transitions, music composed in `sound.py` that follows the cuts |
| `shorts/` | 24 s, 4 scenes, vertical | **the starter for Shorts** (fictional academy): captions from `captions.txt` → `timing.js`, `wt()` word timing, `Pen` marks, safe-zone guides (`?guides=1`), composed music; copy the folder + `assets/`, edit the EDIT blocks, run `produce.py`. In your project set `mix.json` `videos` to `../out/<video>-portrait.mp4` |
| `pop/` | 18.75 s (40 beats at 128 bpm) | beat-synced kinetic short: every cut and hit on the beat grid, sticker/stamp graphics, colour-block backgrounds |

Each folder: `index.html` (the video), `sound.py` (`song(dur)`, `sfx(add, sfx_dir)`), `mix.json` (narration cues, levels,
outputs), `audio/narration.mp3` (one ElevenLabs take). Shared fonts/logo/SFX are in `assets/`.
