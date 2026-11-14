# colored-pencil-world

A walkable 3D world drawn in coloured pencil on a sketchbook page, and a film of someone walking through it. Every
surface is shaded in strokes of its own pencil that follow its form and stay on it as the eye moves; light is a touch of
warm yellow, shade a blue-violet pencil crossed over; the paper's tooth, a soft graphite outline, water that mirrors the
fronts, an unfinished torn margin and a handwritten caption. Plain three.js in a browser page, everything made in code
→ a live page (the film loops; W A S D takes over the walker) + a 1080p MP4. Give it a topic — a place, an hour, who
walks there — and it designs the light, the houses, trees and water, the walker and the shots.

```bash
cd colored-pencil-world/examples/canal-october
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --cast --scale .5       # out/world-cast.jpg: the walker from every side, in every gait
node ../../scripts/render.mjs index.html --sheet --scale .5      # out/world-sheet.jpg: every shot at its start, middle, end
node ../../scripts/render.mjs index.html --preview               # out/world-preview.mp4 (960 × 540)
node ../../scripts/render.mjs index.html                         # out/world.mp4 (1920 × 1080, 30 fps, 20 s)

node ../../scripts/new-world.mjs ~/my-world                      # a new world from the template (Sunflower Track)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys (a film renders on the CPU at
about 2–4 s a 1080p frame; the live page wants a GPU).

Source: made from https://x.com/BlendiByl/status/2121130385723789637?a=s7WiEBvN2S0iOCmb8w4&s=19 (Blendi's "colored
pencil" game slice: every surface's shading and the whole town are code) and the project he open-sourced with it,
https://patch.gg/blendi/coloured-pencil (Coloured pencil, code MIT © 2026 Patch). `lib/pencil.js`, `lib/page.js` and
`lib/shape.js` are adapted from that project (`lib/LICENSE-coloured-pencil`); the engine, the kit, the walker and the
scripts are this repo's. Worked example: `examples/canal-october` 「Canal in October」; starting world: `templates/world.html`.
Samples: https://jungrok5.github.io/motion-skills/colored-pencil-world/
