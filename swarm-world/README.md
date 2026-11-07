# swarm-world

A low-poly 3D world built live by a crew of agent cursors, just ahead of a traveller. A little train (or a tram, a rover,
a boat) sets off along a line; labelled cursors lay the track, shape the ground far ahead, pull houses up and drop the
roofs on, hop from pine to pine, sweep fields row by row and raise windmills or domes — each thing rising as a coral
wireframe and turning solid as its cursor reaches it, every tag saying what its agent is doing, a HUD and a log keeping
score — then the camera rises over the finished world. Drawn entirely in three.js code; a live page and an MP4. Give it a
topic and it designs a new world in the same style.

```bash
node swarm-world/scripts/new-world.mjs my-world                 # a 12 s starter (or --from moon-base / valley-line)
cd my-world
node ../swarm-world/scripts/check.mjs world.html                # proves it: schedule, determinism, rules
node ../swarm-world/scripts/render.mjs world.html --sheet 12 --scale .5   # out/world-sheet.jpg — look at it
node ../swarm-world/scripts/render.mjs world.html --sfx         # out/world.mp4, 1920×1080 with synthesised sound
python3 -m http.server                                          # the live page: http://localhost:8000/world.html
```

Requirements: Node 18+, Playwright (Chromium), ffmpeg.

Source: made from [harnoorDev/swarm-build](https://github.com/harnoorDev/swarm-build) (MIT © Harnoor Singh) — the 3D part,
[`skills/swarm-build/examples/3d.html`](https://harnoordev.github.io/swarm-build/skills/swarm-build/examples/3d.html), re-implemented
as a seekable engine. Examples: `examples/valley-line` (the source's world on this engine) and `examples/moon-base`
「고요의 바다 기지」 (a new topic, brief-first). Samples: https://jungrok5.github.io/motion-skills/swarm-world/
