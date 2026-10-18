# tech-motion-explainer

Technical explainer videos drawn entirely in code — a 60–110 s canvas animation of how a system works (a pipeline, a protocol,
a server loop), played live in the browser with chapters and speed control, plus a written explanation page, a glossary page and an
MP4 from the same file. Also: 9:16 vertical cuts, 3D ways of explaining (three.js), and pieces scroll-scrubbed inside another page.
See **SKILL.md** for the workflow and `references/` for the details. Quick start, from your project root:

```bash
S=.claude/skills/tech-motion-explainer                          # wherever this folder lives
cp -r $S/starter/assets assets && cp $S/starter/index.html index.html
mkdir my-topic && cp $S/template.html my-topic/index.html       # edit HEAD / scenes / notes; add a VIDEOS entry in index.html
node $S/scripts/render.mjs my-topic/index.html /tmp/stills --stills 3,10,20   # look at the PNGs
node $S/scripts/check-player.mjs my-topic/index.html
node $S/scripts/build-articles.mjs                               # → my-topic/article.html + terms.html
node $S/scripts/render.mjs my-topic/index.html out/my-topic.mp4  # or scripts/render-chunked.sh for long / 3D pages
```
Try it on the bundled references first: `cd starter && node ../scripts/render.mjs proto-bot-pipeline/index.html /tmp/s --stills 5,30`
(2D) or `… server-tick-inside-wide/index.html …` (3D), and open `starter/index.html` through any static server.

Requirements: Node + Playwright Chromium, ffmpeg. Full worked example (12 topics, vertical cuts, 3D approaches, MP4s):
github.com/jungrok5/motion-graphics · jungrok5.github.io/motion-graphics
