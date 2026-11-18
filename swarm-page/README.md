# swarm-page

A live web page whose own pixels lift off as a flock and settle back into the readable page. Every grain of ink is one
creature (starling, bee, firefly, fish, paper plane, or your own shape) that gathers, lifts off in a wave, flies in a
flock where each bird follows its seven nearest neighbours, and glides home to its place. Formed, the page is real HTML
drawn by WebGL through HTML-in-Canvas: selectable, clickable and typeable. Give it a topic and it designs the page, the
creature, the flock, the sky and the trigger.

```bash
node scripts/check.mjs examples/bee-ledger/index.html                                 # shared + swarm checks, with numbers
node scripts/still.mjs examples/bee-ledger/index.html --out out --act fly --at 0.5,3   # stills by simulated time
node scripts/new-page.mjs ../my-swarm-page                                             # start your own (or --from bee-ledger)
node scripts/check.mjs ../my-swarm-page/index.html
```

Requirements: Node + Playwright Chromium (checks and stills turn on `--enable-blink-features=CanvasDrawElement`). To see
a page live, open it in Chrome / Edge 157+ or the Claude desktop app; other browsers show the same HTML as a plain page.

Example: `examples/bee-ledger/` — a beekeeper's honey ledger whose figures go out foraging as bees on a late summer
afternoon and come home to the comb; the table sorts and the rows fly to their places. Template: a lane bulletin whose
words fly as swifts over the rooftops at dusk and bring the night.

Source: made from Felix Rieseberg's "Swarm" demo https://claude.ai/artifact/NfKoLhxvZ9AcX32i9CBvHU on the HTML-in-Canvas
demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Samples: https://jungrok5.github.io/motion-skills/swarm-page/
