# liquid-glass-page

A live web page with liquid lying on it: real text, fields, buttons and sliders seen through ripples, refracting beads and a
big drop you can drag as a magnifier, drawn by WebGL2 from the real DOM through HTML-in-Canvas. Everything under the liquid
stays selectable, typeable and clickable, even through the magnifier. Give it a topic and it designs the page, the liquid
(water, honey, oil, mercury, resin or a new one), the weather and the light, and hands back one self-contained folder.

```bash
node scripts/check.mjs templates/index.html                         # the template (rain card, water): all checks
node scripts/check.mjs examples/honey-tasting/index.html            # the worked example (honey tasting card)
node scripts/still.mjs examples/honey-tasting/index.html --out out --at 4 --act drag --to 'td.notes'
node scripts/new-page.mjs ../my-liquid-page                                 # start your own (or --from honey-tasting)
node scripts/check.mjs ../my-liquid-page/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn the feature on with `--enable-blink-features=CanvasDrawElement`).
No network, no npm install. View the pages in Chrome / Edge 157+ or the Claude desktop app; other browsers show the same HTML
as a plain page.

Example: `examples/honey-tasting/` — Hollow Oak Apiary's tasting card with heather honey on it: slow drips from a dipper that
leave ribbons, a warmth slider that sets viscosity, honey colours from acacia to buckwheat, a big golden dollop over the
tasting notes.

Source: made from Felix Rieseberg's "Liquid Glass" demo https://claude.ai/artifact/CxxmVRwFgSmV9xB7XFsjbf on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Samples page: https://jungrok5.github.io/motion-skills/liquid-glass-page/
