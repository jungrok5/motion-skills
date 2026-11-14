# ink-water-emergence

Short films (8–20 s, 16:9) of a creature condensing out of sumi ink drifting in still water: wisps, then a translucent
pre-form that only suggests the shape, then a pale readable body, then dense ink in full detail that still sheds smoke
from its edges — cut between wide and medium shots. Pure code (a posed 3D body painted into ink channels, a WebGL2 flow /
smoke / ink-wash renderer, a synthesised score); a live page and a 1920×1080 MP4. Give it a topic and it designs a new
creature, checks its body from every side, and writes the shots.

Source — made from https://x.com/taziku_co/status/2121541102700564482?s=19 (taziku's "experiment in keeping fluidity":
a translucent "just before the form appears" reference for a generative video). Agents: see [SKILL.md](SKILL.md).

```bash
# run from the folder that will hold your project
node ink-water-emergence/scripts/new-film.mjs my-film              # quadruped starter (or --from whale)
node ink-water-emergence/scripts/render.mjs my-film/cast.html --stills 0   # cast sheet: every side, both ways
node ink-water-emergence/scripts/check.mjs my-film                 # → ok + the shot table
node ink-water-emergence/scripts/render.mjs my-film --sheet 16 --scale .5  # contact sheet
node ink-water-emergence/scripts/score.mjs my-film/score.js --dur 13 --out out/film.wav
node ink-water-emergence/scripts/render.mjs my-film --audio out/film.wav   # → out/my-film.mp4
node ink-water-emergence/scripts/refs.mjs my-film                  # optional: pre-form + formed stills and prompts
```

Requirements: Node + Playwright Chromium (WebGL2; SwiftShader is fine), ffmpeg. No network, no npm install.

Examples: `starter/` 「狛獅子 · Guardian Lion」 (13 s, 7 shots) · `examples/whale/` 「鯨の息 · Whale Breath」 (12.6 s, 6 shots,
a topic the reference never had). Samples page: https://jungrok5.github.io/motion-skills/ink-water-emergence/
