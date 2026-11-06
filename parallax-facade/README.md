# parallax-facade

An ~8 s seamless loop of a toy-like 3D street that reads as one flat 2D picture through a long lens — until the camera
dolly-zooms through a gap and reveals a long street, a far landmark and a whole town behind, cranes up, orbits, and
snaps back to the same flat picture every beat. Soft pastel or ink-outlined, motion-blurred moves, a synthesised beat
with a whoosh per move. Plain three.js in a browser page → MP4 + live page. Give it a topic; it designs the town.

```bash
cd parallax-facade/examples/hanok-alley
node ../../scripts/check.mjs index.html                                  # check OK, writes out/cues.json
node ../../scripts/render.mjs index.html --sheet 9 --scale .4 --q blur=1  # one still per beat
node ../../scripts/score.mjs --mp3                                       # out/loop.wav + out/loop.mp3
node ../../scripts/render.mjs index.html --audio out/loop.wav            # out/film.mp4 (1920×1080, 8 s)

node ../../scripts/new-film.mjs ~/my-loop                                # a new loop from the template
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from the video at https://x.com/lemomo_ai/status/2118516216180740585 (posted by @lemomo_ai, after a design
by @garments__). Worked example: `examples/hanok-alley`; starting film: `templates/film.html`.
Samples: https://jungrok5.github.io/motion-skills/parallax-facade/
