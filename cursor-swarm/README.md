# cursor-swarm

Any document built live by a swarm of cursors — a website, a slide deck, a book, a poster. A prompt is typed into a HUD pill
in a dark design editor, dozens of coloured agent cursors burst out and build it in parallel: drag-select boxes with live
size tags and red snap guides, I-beam typing with a caret, picture files fetched from off-screen and dropped in, a pixel
cover or banner and a chart painted cell by cell by the whole swarm — while the camera scrolls down the page or pans from
slide to slide; then it publishes and the camera zooms out to everything. Canvas 2D only; a live page and an MP4 with a
synthesised click / typing sound. Give it a topic ("a dawn bakery's site", "a recipe booklet") and it designs the document
and the build; give it a .pptx or .pdf and it rebuilds that file.

```bash
# from this folder — three worked examples
cd examples/bakery && node ../../scripts/check.mjs index.html                 # a website (4:5, 35 s) — prints ok … ok
node ../../scripts/render.mjs index.html --sfx --workers 4                    # out/bakery.mp4 with sound
cd ../deck && node ../../scripts/render.mjs index.html --sheet 16 --scale .5  # 6 slides (16:9), rebuilt from source/*.pptx
cd ../book && node ../../scripts/render.mjs index.html --sfx                  # a cover + two spreads
python3 -m http.server 8000   # then open http://localhost:8000/ (live; click = pause)

# a new build from a topic: write BRIEF.md first (references/BRIEF.md), then build.html
node scripts/new-build.mjs ~/my-build                 # template (a festival page) + an empty BRIEF.md
node scripts/new-build.mjs ~/my-build --from deck     # start from the closest example: bakery | deck | book
# a build from an existing file (pip install python-pptx / pymupdf)
python3 scripts/import-doc.py ~/talk.pptx ~/my-talk   # → assets/, doc.json, BRIEF.md, a draft build.html that passes check
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install. Python 3 + python-pptx / pymupdf for importing.

Made from the clip AlexZ shared on X (https://x.com/blackanger/status/2118043007413104810), quoting harshit's
"Craziest Website Reveal ever" (https://x.com/hrstwt/status/2117947212936392958). Worked examples: `examples/bakery`
「새벽빵」, `examples/deck` 「밤의 도서관」, `examples/book` 「겨울 국물 한 그릇」; samples:
https://jungrok5.github.io/motion-skills/cursor-swarm/
