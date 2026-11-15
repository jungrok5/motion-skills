# oil-paint-world

A walkable 3D world drawn as thick oil paint, and a film of someone walking through it. Every leaf, blade, stone, wall,
wave and fold of a coat is a dab of a loaded brush pinned to the world, in three mixed paints per thing (light,
half-tone, shade), so the paint stays on things as the eye moves. Plain three.js in a browser page, everything made in
code → a live page (the film loops; W A S D takes over the wanderer) + a 1080p MP4. Give it a topic — a place, an hour,
who walks there — and it designs the light, the land, the things, the wanderer and the shots.

```bash
cd oil-paint-world/examples/lighthouse-path
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --cast --scale .5       # out/world-cast.jpg: the wanderer from every side, in every gait
node ../../scripts/render.mjs index.html --sheet --scale .5      # out/world-sheet.jpg: every shot at its start, middle, end
node ../../scripts/render.mjs index.html --preview               # out/world-preview.mp4 (960 × 540, half the paint)
node ../../scripts/render.mjs index.html                         # out/world.mp4 (1920 × 1080, 30 fps, 20 s)

node ../../scripts/new-world.mjs ~/my-world                      # a new world from the template (Orchard Morning)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys (a film renders on the CPU at
about 4–6 s a 1080p frame; the live page wants a GPU).

Source: made from https://x.com/BlendiByl/status/2120341251178594532?a=KltytYZPeeW0-pPdgsw&s=19 (Blendi's "hand-painted"
game: every frame about 1.5 million brush strokes) and the project he open-sourced with it,
https://patch.gg/blendi/oil-paint (Oil paint, code MIT © 2026 Patch). `lib/paint.js` is adapted from that project's
`src/oilpaint/` (`lib/LICENSE-oil-paint`); the engine, the kit, the wanderer and the scripts are this repo's. Worked
example: `examples/lighthouse-path` 「The Lighthouse Path」; starting world: `templates/world.html`.
Samples: https://jungrok5.github.io/motion-skills/oil-paint-world/
