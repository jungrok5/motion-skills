# droste-page

A live web page that contains a picture of itself, which contains a picture of itself, without end. One real DOM page has
a framed window, and WebGL draws the whole page again inside it through a conformal Droste map, through HTML-in-Canvas:
scroll to fall in through the copies forever, and wind the recursion into Escher's spiral with a real slider. Every copy
is live: typing changes every copy at once, and a click at any depth lands on what is drawn there. Each copy has its own
number and its own hour of light. Give it a topic and it designs the surface, the window, the content, the materials, the
light and the synthesised sounds.

```bash
node scripts/check.mjs examples/cereal-box/index.html        # shared live-page checks + map, depth click, live copies, fall, wind
node scripts/check.mjs templates/index.html
node scripts/still.mjs examples/cereal-box/index.html --out out --poses "rest;fall=-0.3,wind=0;fall=0.5,wind=2"
node scripts/new-page.mjs ../my-page                         # start your own (or --from cereal-box)
node scripts/check.mjs ../my-page/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn the HTML-in-Canvas flag on). To view a page live, open it in
Chrome / Edge 157+ or the Claude desktop app; any other browser shows the same HTML as an ordinary page.

Example: `examples/cereal-box/` 「Spiral Crunch」 — the back of a cereal box printed with a picture of the back of the box;
rename the brand, bite the loops on the puzzle, twist the box, and every box down the spiral follows. The template is a
gallery wall with a painting of itself.

Source: made from Felix Rieseberg's "Droste" demo https://claude.ai/artifact/RjZStie469yP8BUZGKAiUY on the HTML-in-Canvas
demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code, art and sound here are this
repo's own. Samples: https://jungrok5.github.io/motion-skills/droste-page/
