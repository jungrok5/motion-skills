# jelly-page

A live web page set in a slab of jelly. Real HTML (an editable headline, fields, radios, a range, buttons) is drawn by
WebGL through HTML-in-Canvas as candy letters inside a glossy, moulded, translucent jelly on a plate. Press and pull it
and it wobbles; warm it and it loosens, then melts flat; drop it and it bounces. The page under it stays clickable and
typeable. Give it a topic and it designs the page, its controls, the flavours, the mould, the setting and the sound.

## Quick start
```bash
node jelly-page/scripts/new-page.mjs my-jelly                      # or: --from party-invite
node jelly-page/scripts/check.mjs my-jelly/index.html              # must end with "jelly checks passed"
node jelly-page/scripts/still.mjs my-jelly/index.html --out my-jelly/out --at 1
node jelly-page/scripts/still.mjs my-jelly/index.html --out my-jelly/out --act drop --at 0.3,0.85
```
Open `my-jelly/index.html` in Chrome / Edge 157+ or the Claude desktop app to play with it; other browsers show the
plain page. Run the commands from the folder that holds `jelly-page/`.

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). No network,
no npm install, no images or fonts.

Source — made from the "Jelly" demo https://claude.ai/artifact/HGJRkas2J1QTVjctgi5A7V on the HTML-in-Canvas demo page
https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is new; see
`references/LOOK.md`. Worked example: `examples/party-invite` (live: https://jungrok5.github.io/motion-skills/jelly-page/demo/examples/party-invite/).
