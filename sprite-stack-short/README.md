# sprite-stack-short

A short 16:9 pixel-art film about **sprite stacking**: an object drawn as four pixel views (top, side, front, back), each
row of the side view becoming a slice, the slices stacked 1 px apart and turned to any angle — then the object living in
its own small pixel world, the camera turning around it. Give it a topic and it designs the hero, draws its four views,
builds the props, the world, the course and the beats; the mover's speed, turns, drift and body roll come from its mass,
and a chiptune score (a blip per slice, an engine that follows the speed) is synthesised. Code-only drawing on an HTML
Canvas, 480×270 scaled ×4; a live page and a 1920×1080 MP4.

Source: made from Kimo's post on X — https://x.com/asynkimo/status/2121716250820964431?a=8jjw0gVhdGPGqgSNo04&s=19 ("You can
turn pixel art to any angle with sprite stacking"). Worked example: `examples/tugboat-dawn` 「Tug at Dawn」 (28 s) —
live on the samples page: https://jungrok5.github.io/motion-skills/sprite-stack-short/

## Quick start
```bash
node sprite-stack-short/scripts/new-short.mjs my-short --from tugboat-dawn
cd my-short
node ../sprite-stack-short/scripts/check.mjs sheet.html              # the models: views agree, face the right way
node ../sprite-stack-short/scripts/check.mjs index.html --scale .5   # the short: beats, rules, pixels, motion, score
node ../sprite-stack-short/scripts/render.mjs index.html --sheet 12 --scale .5
node ../sprite-stack-short/scripts/score.mjs index.html               # → out/my-short.wav
node ../sprite-stack-short/scripts/render.mjs index.html --audio out/my-short.wav   # → out/my-short.mp4
```
Open `index.html` in a browser for the live version (click for sound). Without `--from`, the template (a post box on a
little square, orbit camera) is the starting point. Workflow and rules: [SKILL.md](SKILL.md).

Requirements: Node + Playwright Chromium, ffmpeg.
