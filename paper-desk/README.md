# paper-desk

A live web page that is a sheet of paper on a lamp-lit desk. The document is real HTML (type on it, select and bold a line,
tick its boxes, find it with ⌘F), drawn in WebGL2 through HTML-in-Canvas, and the reader can curl it, fold it, crumple it,
spill coffee on it and set it alight while it keeps working. Give it a topic and it designs the document, the paper and
ink, the desk, its props and light, and the acts that fit. One self-contained folder, offline, also a Claude artifact.

```bash
node scripts/check.mjs examples/resignation-letter/index.html          # shared HTML-in-Canvas checks + every act, with numbers
node scripts/check.mjs templates/index.html
node scripts/still.mjs examples/resignation-letter/index.html --out out --act "idle;fold;crumple;burn,stain"
node scripts/new-page.mjs ../my-desk                                    # start your own (or --from resignation-letter)
node scripts/check.mjs ../my-desk/index.html
```

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). Viewing live
needs Chrome / Edge 157+ or the Claude desktop app; other browsers show the same HTML as a plain page. No network, no npm install.

Example: `examples/resignation-letter/` 「I Quit」 — a typed resignation memo on copy paper, on a grey office desk with a
mug of coffee, a pencil, paper clips and a stapler. A Tone slider rewrites the letter; fold it for the envelope, crumple
it, spill the coffee, burn it.

Source: made from Felix Rieseberg's "Paper Desk" demo https://claude.ai/artifact/BKGBk584YpYtxBebEQsYSm on the
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Samples page: https://jungrok5.github.io/motion-skills/paper-desk/
