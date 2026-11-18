# knitted-page

Give it a topic and it makes a live web page knitted out of yarn: every stitch takes one colour from the real page under
it, on a table, with a loose thread hanging off. Pull the thread (or press the page's Unravel control) and the knitting
unravels row by row into a heap of crinkled yarn, revealing what lay underneath; let go and needles knit it back up.
The page stays a working page: type into the headline and the changed stitches re-knit. Real HTML drawn by WebGL through
HTML-in-Canvas, all code, sound synthesised.

```bash
node scripts/check.mjs examples/apple-cake/index.html          # shared + knitting checks, with numbers
node scripts/still.mjs examples/apple-cake/index.html --out out --act pull --u 0.35
node scripts/new-page.mjs ../my-knitted-page                    # start your own (template), or --from apple-cake
node scripts/check.mjs ../my-knitted-page/index.html
```

Requirements: Node + Playwright Chromium (the global install is found). The scripts run Chromium with
`--enable-blink-features=CanvasDrawElement`. To see a page live, open it in Chrome / Edge 157+ or the Claude desktop app;
other browsers show the same HTML as a plain page.

Topic in, page out: the topic is written as a brief (`references/BRIEF.md`) — the page and its controls, the yarns and
gauge, the motifs, the table, the needles, and what unravelling reveals — then laid out in stitch units and proven with
`check.mjs` and stills. Template: a winter-fair poster in three colourways. Example: `examples/apple-cake/`, Oma's
apple-cake recipe on a gingham cloth (servings stepper, oven timer, her secret underneath).

Source: made from the "Knitted Page" demo https://claude.ai/artifact/Y8uZf2xz48joUiM1nPhxLW on Felix Rieseberg's
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code, art and wording here are this
repo's own. Live pages: https://jungrok5.github.io/motion-skills/knitted-page/
