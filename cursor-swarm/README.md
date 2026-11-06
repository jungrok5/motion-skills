# cursor-swarm

A web page built live by a swarm of cursors: a prompt is typed into a HUD pill in a dark design editor, dozens of coloured
agent cursors burst out and build the site in parallel — drag-select boxes with live size tags and red snap guides, I-beam
typing with a caret, picture files fetched from off-screen and dropped in, a pixel banner and a heat-map grid painted cell
by cell — while the camera scrolls down section by section; then the page publishes and the camera zooms out to the whole
site. Canvas 2D only; a live page and an MP4 with a synthesised click / typing sound. Give it a topic ("a dawn bakery's
site", "a midnight music festival") and it designs the site for it — brief, sections, copy, palette, pictures and the build.

```bash
# from this folder
cd examples/bakery
node ../../scripts/check.mjs index.html                          # prints ok … ok
node ../../scripts/render.mjs index.html --sheet 16 --scale .5   # out/bakery-sheet.jpg
node ../../scripts/render.mjs index.html --sfx --workers 4       # out/bakery.mp4 (1080×1350, 35 s, with sound)
python3 -m http.server 8000   # then open http://localhost:8000/ (live; click = pause)

# a new site: write BRIEF.md from the topic first (references/BRIEF.md), then site.html
node scripts/new-site.mjs ~/my-site                 # template (a festival page) + an empty BRIEF.md
node scripts/new-site.mjs ~/my-site --from bakery   # the example and its filled brief
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install.

Made from the clip AlexZ shared on X (https://x.com/blackanger/status/2118043007413104810), quoting harshit's
"Craziest Website Reveal ever" (https://x.com/hrstwt/status/2117947212936392958). Worked example: `examples/bakery`
「새벽빵 · Dawn Bakery」; samples: https://jungrok5.github.io/motion-skills/cursor-swarm/
