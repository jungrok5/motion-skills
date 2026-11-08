# paper-cutout-short

Short paper cut-out animations on a tabletop paper stage: torn and cut paper with white fibrous rims, layers that cast soft
shadows on each other, the sun on a thread and the moon on a stick, a profile puppet pinned at its joints doing a small
errand while the camera trucks along the set, 12 drawings a second with a hair of hand-placed jitter, warm light, a paper
title label. Give it a topic and it designs the puppet, the set and the beats. The paper parts come from an image model
(one parts sheet per puppet, cut into PNGs and pinned to a rig) or are cut in code; the motion is always code. Outputs a
live page with a synthesised music-box score and a 1920×1080 MP4.

Source — made from the post by Lemomo (@lemomo_ai): https://x.com/lemomo_ai/status/2119327014041842157 (GPT image generation
+ cut-out animation: "the content stays controllable and the cost is low").

## Quick start

```bash
cd paper-cutout-short/examples/lamplighter
node ../../scripts/check.mjs index.html                       # proves the film (prints ok)
node ../../scripts/render.mjs cast.html --stills 0 --scale .5  # the cast sheet → out/cast-0.png
node ../../scripts/render.mjs index.html --sheet 12 --scale .5 # contact sheet → out/lamplighter-sheet.jpg
node ../../scripts/score.mjs score.js --dur 20.2 --out out/lamplighter.wav
node ../../scripts/render.mjs index.html --workers 4 --audio out/lamplighter.wav   # → out/lamplighter.mp4

# the image route: cut a parts sheet into PNG parts, then rig them
cd ../parts-route
node ../../scripts/cut-parts.mjs sheet.png --names head,torso,tail,armN,foreN,thighN,shinN,footN --out parts/ember
node ../../scripts/check.mjs index.html
OPENAI_API_KEY=… node ../../scripts/gen-parts.mjs --prompt "Parts sheet for one character facing right: …" --out sheets/mine.png

# a new film
node ../../scripts/new-film.mjs ../../../my-film                # or --from lamplighter / --from parts-route
```

Requirements: Node + Playwright Chromium, ffmpeg (no npm install, no GPU). The image route also needs an image model
(`OPENAI_API_KEY` for `gen-parts.mjs`, or any tool that saves a PNG).

Worked example: 「The Lamplighter」 (20.2 s, 3 shots) — a fox lights the lamps of a paper harbour at dusk; samples page:
https://jungrok5.github.io/motion-skills/paper-cutout-short/
