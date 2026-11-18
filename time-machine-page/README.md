# time-machine-page

A live web page that travels through time. One real HTML page — an editable headline, text, a picture, a form and a notes
log — is restyled for each era on a dial and drawn by WebGL through HTML-in-Canvas through that era's shader passes:
letterpress and halftone on a desk, film grain and flicker in a cinema, phosphor and scanlines in a monitor, woodcut,
ditto, a dithered home page, a hologram. Turning the dial dives into the page's material and rises out in the next era;
the page stays clickable and typeable throughout. Give it a topic and it designs the document, the eras and their looks.

## Quick start
From inside this folder:
```bash
node scripts/new-page.mjs ../my-time-machine              # lib/ + the template (or --from daily-loaf)
node scripts/check.mjs ../my-time-machine/index.html     # every line must print ok
node scripts/still.mjs ../my-time-machine/index.html --out ../my-time-machine/out --all
```
Open `../my-time-machine/index.html` in Chrome or Edge 157+ (or the Claude desktop app). Then write `BRIEF.md` for your
topic and redesign the page, as `SKILL.md` describes.

Requirements: Node and Playwright Chromium for the scripts; no network, no npm install. Viewing needs HTML-in-Canvas
(Chrome / Edge 157+, the Claude desktop app); other browsers get the plain page with a working dial.

Source — made from the "Time Machine" demo https://claude.ai/artifact/VtYey85VQXYqqfURRYqpiq on the HTML-in-Canvas demo
page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19.
Worked example: `examples/daily-loaf` (a bread recipe, 1450 → 2040).
