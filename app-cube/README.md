# app-cube

A live web page that is a glossy 3×3 twisty cube in a small photo studio, where every face is a working app made of ordinary
HTML: type into its notes, press its buttons, drag its sliders. Drag a tile and its layer turns, scattering the apps across
the cube as tiles, and each tile still works as its own part of its own app. Drawn in WebGL2 through HTML-in-Canvas. Give it
a topic and it designs the six apps, their words, the cube's material, the studio light and the sounds.

```bash
node scripts/check.mjs examples/lisbon-weekend/index.html        # shared checks + tiles map, grid, twist, live after twist, solve, orbit
node scripts/check.mjs templates/index.html                      # the Desk Cube template
node scripts/still.mjs examples/lisbon-weekend/index.html --out out --act idle,twist,typed,back,under   # stills for the review
node scripts/new-page.mjs ../my-cube                             # start your own (or --from lisbon-weekend)
node scripts/check.mjs ../my-cube/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). To see a page
live, open it in Chrome or Edge 157+ or the Claude desktop app (straight from the folder; no server needed). Other
browsers show the same six apps as an ordinary page.

Topic in, cube out: the topic becomes a brief (`references/BRIEF.md`): six apps with six different jobs, laid out on a grid
of 240 px tiles, a control face worded for the topic, a material, a studio and sounds. Then the faces are written as plain
HTML, `CONFIG` sets the look, `check.mjs` proves every tile maps and the stills are reviewed.

Example: `examples/lisbon-weekend/` — a weekend in Lisbon: a plan you type into, a map drawn in code with district pins, a
tram-ticket control face, a packing grid, a euro converter and a phrasebook, on an ivory enamel cube under a warm dusk studio.

Source: made from Felix Rieseberg's "Six Apps, One Cube" demo https://claude.ai/artifact/287yYEVG3FekMqofmJkUki on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. Everything here is this repo's own code
and design. Samples page: https://jungrok5.github.io/motion-skills/app-cube/
