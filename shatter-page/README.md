# shatter-page

A live web page printed on a breakable pane (window glass, ice, a porcelain plate, sugar glass, or a material you design)
hanging in a sunlit room. Click it and it cracks from the blow; the pieces fall and spin as 3D plates with real edges,
refraction and coloured shadows; the page keeps working on every flying piece; a time slider pulls them back and Mend puts
the pane together with seams. Real DOM drawn by WebGL through HTML-in-Canvas. Give it a topic and it designs the page, the
material, the room and the impact.

## Quick start
```bash
# from this folder
node scripts/new-page.mjs ../my-pane                       # template (window glass); or: --from plate-for-luck
node scripts/check.mjs ../my-pane/index.html               # shared HTML-in-Canvas checks + break / fall / live / settle / mend
node scripts/still.mjs ../my-pane/index.html --out ../my-pane/out --act idle,fall,rest,mended
```
Open `../my-pane/index.html` in Chrome or Edge 157+ (or the Claude desktop app). Then write `BRIEF.md` for your topic and
redesign the page and `Shatter.mount({...})` (see `SKILL.md` and `references/`).

## Requirements
Node 18+ and Playwright's Chromium for checks and stills. Viewers need Chrome / Edge 157+ or the Claude desktop app; other
browsers show the same HTML as a plain page. No network, no build step, no npm install.

## Source
Made from the "Shatter" demo https://claude.ai/artifact/Berg7ureW47JTrMNVoH8TU on the HTML-in-Canvas demo page
https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared by Felix Rieseberg at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is new; the worked
example (`examples/plate-for-luck`) is a new topic.
