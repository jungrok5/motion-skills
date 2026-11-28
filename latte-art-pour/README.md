# latte-art-pour

Top-down latte-art films: a cup on its saucer, a steel pitcher, and milk that draws the figure through a simulated
surface — rosetta leaves from rocking, tulip stacks from punches, a stem from a thin high cut, details from an etching
pin. Give it a topic and it designs the drink, cup, table, figure (its pour score) and words, then renders a 1080×1920
MP4 with a synthesised pour sound. The live page also has a hands-on mode (`?play=1`).

```bash
node latte-art-pour/scripts/check.mjs latte-art-pour/starter                  # gates → "all checks passed"
node latte-art-pour/scripts/render.mjs latte-art-pour/starter --shots         # out/starter-shots.jpg
node latte-art-pour/scripts/render.mjs latte-art-pour/examples/matcha-tulip   # out/matcha-tulip.mp4 (17 s, with sound)
node latte-art-pour/scripts/new-film.mjs my-cup --title "Harvest moon"        # a new project (fill BRIEF.md first)
```

Requirements: Node + Playwright Chromium, ffmpeg (Python 3 only to serve a page: `python3 -m http.server`).

Made from the Threads post by @ujae_ — https://www.threads.com/share/BAJMYuMY94 (a latte-art pour simulator by a New
Zealand motion designer; see `references/SOURCE.md`). Samples: https://jungrok5.github.io/motion-skills/latte-art-pour/
