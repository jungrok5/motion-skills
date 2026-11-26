# embroidery-reel

A list, embroidered: a needle sews each item's satin-stitch patch into linen and stitches its name letter by letter, a
paper tag drops beside it, and one low gliding camera moves from item to item under leaf-dappled sun among spools and
scissors — ending with a gold cord couched through every item into an end card. Give it a topic; it designs every patch
from shapes that become real stitches, plus the palette, titles and tags. three.js, all from code.

```bash
cp -r embroidery-reel /tmp/try && cd /tmp/try
node embroidery-reel/scripts/check.mjs embroidery-reel/starter                       # the gates, on the 3-item starter
node embroidery-reel/scripts/render.mjs embroidery-reel/examples/bibimbap --items --scale .5   # one still per item
node embroidery-reel/scripts/render.mjs embroidery-reel/examples/bibimbap             # → out/bibimbap.mp4 (1080×1350)
node embroidery-reel/scripts/new-reel.mjs my-reel --title "My list"                   # a new project: write BRIEF.md first
(cd embroidery-reel && python3 -m http.server)  # → http://localhost:8000/examples/bibimbap/ plays it live
```

Requirements: Node + Playwright Chromium (runs on SwiftShader, no GPU), ffmpeg.

Source: made from https://x.com/flxrnc/status/2125681086722097551?a=cv8JTTCnpK--OKdJuUQ&s=19 (@flxrnc), a vertical film
that embroiders 15 animation repos on a sewing table. Worked example: `examples/bibimbap` 「비빔밥 한 그릇」 (six
ingredients, Korean titles and tags, 21 s).
Samples: https://jungrok5.github.io/motion-skills/embroidery-reel/
