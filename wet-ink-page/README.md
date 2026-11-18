# wet-ink-page

A live web page printed in wet ink: a poem, a menu, a gallery opening or a manifesto that the reader stirs like a marbler's
bath. Dragging combs the real page's letters and colour blocks into ribbons that coast and settle, a press drops blooming
pigment, and the page keeps working while it swims (type, click the drifted buttons, select). Esc plays the stir backwards.
Real DOM drawn by WebGL2 through HTML-in-Canvas, all code. Give it a topic and it designs the content, paper, named
pigments, viscosity, comb, drops and idle demo, as one self-contained folder.

```bash
node scripts/check.mjs examples/tea-room/index.html            # the worked example: shared checks + stir, drop, warp-hit, settle …
node scripts/still.mjs examples/tea-room/index.html --out out --at 1,8 --act latte,whisk
node scripts/new-page.mjs ../my-page                           # start your own (the broadside template; or --from tea-room)
node scripts/check.mjs ../my-page/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). To view a page:
Chrome / Edge 157+ or the Claude desktop app; other browsers get the plain-page fallback. No network, no npm install.

Example: `examples/tea-room/` — Low Tide Tea Room's menu, stirred with a five-tine whisk, with milk bullseye drops, Pour
buttons and a tray that still count while the ink moves. Template: `templates/` — a poetry broadside.

Source: made from the "Ink" demo https://claude.ai/artifact/WEmmb18oUbyCSkYyB1JMiB on Felix Rieseberg's HTML-in-Canvas demo
page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19.
All code, text and design here are this repo's own. Live pages: https://jungrok5.github.io/motion-skills/wet-ink-page/
