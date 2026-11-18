# lit-room

A live 3D room at night whose monitor shows a real, working web page, and the page is the room's light: its colours and
layout colour the desk and the walls, a glow dragged across the page moves the light across the room, room lamps add warm
pools, glossy things reflect the screen and the desk things throw soft shadows away from it. You drag the room to look
around and click, select and type on the screen in 3D (real DOM drawn by WebGL through HTML-in-Canvas). Give it a topic and
it designs the room, its props, palette and lamps as data, and the page on the screen. One self-contained folder, code
only, no network.

From the skill folder:

```bash
node scripts/new-page.mjs ../my-lit-room                       # start a project (or --from night-watch)
node scripts/check.mjs ../my-lit-room/index.html               # shared checks + light, lamps, look, keys
node scripts/still.mjs ../my-lit-room/index.html --out ../my-lit-room/out --act "idle;close;mood:neon,tab:mood"
node scripts/check.mjs examples/night-watch/index.html         # the worked example
```

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). To view live,
open the page in Chrome / Edge 157+ or the Claude desktop app; other browsers show the same page as a plain page.

Example: `examples/night-watch/` — a sailing ship's chart table at night. The watch page has the port (red), starboard
(green) and masthead (white) running lights to drag, the course to type, a log and three seas (calm, squall, dawn); the
brass lantern is switched from the page. The compass, chart roll, rope coil and hanging lantern are props made for this
topic inside the page.

Source: made from Felix Rieseberg's "Lit Room" demo https://claude.ai/artifact/D5pdvChFfvxBsvVNb5KNCJ on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code, props, pages and wording
here are this repo's own. Samples page: https://jungrok5.github.io/motion-skills/lit-room/
