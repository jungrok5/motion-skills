# hypertext-hotel

A live web page that is a miniature building cut open at the front, at night: a doll's-house cutaway drawn by WebGL through
HTML-in-Canvas, with lit rooms, shadowed lamps, peg dolls and a neon sign, where every object you can work is a real HTML
control styled as that object — switches are checkboxes, dials are ranges, the lift is one vertical range whose thumb is its
lever. A magnifier lens and "Show just HTML elements" show the same controls as plain HTML. Give it a topic and it designs the
building, rooms, props, controls, palette and sounds.

```bash
node scripts/check.mjs examples/night-bakery/index.html           # the worked example: live-page + style checks (several minutes)
node scripts/still.mjs examples/night-bakery/index.html --out out --act idle,lens,plain
node scripts/new-page.mjs ../my-hotel                               # start your own (or --from night-bakery)
node scripts/check.mjs ../my-hotel/index.html
```

Requirements: Node + Playwright Chromium for the checks and stills. The page needs nothing else: open `index.html` in Chrome or
Edge 157+ or the Claude desktop app (other browsers show the same controls as a plain, working page). No network, no build
step; system fonts, synthesised sound.

Topic in, page out: the topic is first written as a brief (`references/BRIEF.md`). Template: a townhouse with four rooms and a
lift (`templates/`). Example: `examples/night-bakery/` 「The Night Loaf」 — a bakery at three in the morning: the oven dial makes
the fire roar, the extractor spins a fan, the proof slider makes the dough rise, and a bread hoist runs between the floors.

Source: made from Felix Rieseberg's "Hotel Hypertext" demo https://claude.ai/artifact/WgPzNowvy1DGy3jeXhzNMD on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Live pages: https://jungrok5.github.io/motion-skills/hypertext-hotel/
