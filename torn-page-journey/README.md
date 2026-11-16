# torn-page-journey

A looping film in which one traveller rides a bicycle through a chain of feelings, each one painted in its own art medium:
a child's crayon drawing, a pencil sketchbook, flat gouache, a three-ink woodcut, grey charcoal in the rain, wet watercolour,
impasto oil and a chalkboard at night. Every chapter change is a new sheet torn in over the old one, so the rider is
briefly half in one style and half in the next. All of it is drawn in code on an HTML Canvas, with one theme re-scored per
feeling and every sound synthesised. Give it a topic and it designs the traveller, the arc of feelings, the media, the
places and the tune. One page plays live with sound and renders to a 1920×1080 MP4 at 24 fps.

```bash
cd examples/lemon-tree
node ../../scripts/check.mjs cast.html                                   # the traveller: every medium, both ways, gestures
node ../../scripts/check.mjs index.html                                  # rules, media change at every tear, loop, motion numbers
node ../../scripts/render.mjs cast.html --stills 0 --scale .5            # the cast sheet → out/cast-0.png
node ../../scripts/render.mjs index.html --sheet 24 --scale .5           # 24 moments → out/lemon-tree-sheet.jpg
node ../../scripts/score.mjs index.html                                  # the score → out/lemon-tree.wav
node ../../scripts/render.mjs index.html --workers 4 --audio out/lemon-tree.wav   # 60.5 s → out/lemon-tree.mp4
node ../../scripts/new-journey.mjs ../../../my-journey                   # start your own (or --from lemon-tree)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. To watch a page live, serve the skill
folder (`python3 -m http.server`) and open `examples/lemon-tree/`; press ♪ for the score.

Topic in, film out: the topic is first written as a brief (`references/BRIEF.md`). The traveller is designed as data and
reviewed on its cast sheet. Then each chapter (feeling × medium × place × gesture) is built from the kit, and the tune is
re-scored by every feeling.

Example: `examples/lemon-tree/` 「The Long Way Home」 (60.5 s, 8 chapters). A red fox carries a potted lemon tree home: joy in
crayon → curiosity in pencil → bustle in gouache → triumph in woodcut → sorrow in charcoal → relief in watercolour → awe
in oil → wonder in chalk → and back to the morning.

Source: made from Chetaslua's post on X, https://x.com/chetaslua/status/2121885449509851415?a=8qELAlUgdwW0YiWOrYE&s=19 (a
pure-JS film of a pelican riding a bike from one art style, one emotion, to the next). Everything here is this repo's own
code and design. Live pages: https://jungrok5.github.io/motion-skills/torn-page-journey/
