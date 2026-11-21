# manga-background-3d

A story's background sets built as 3D scenes in code, then drawn as manga backgrounds: pen lines found from the 3D
edges (hidden lines removed, overshoot at corners, bow, taper, ink dots — steady while the camera moves) over flat
screentone-like greys, white windows with glare, glowing lamps and beams at night. It films the reveal — each
location as a grey clay model, a vertical wipe into the manga background, letterbox, handwritten captions, a card —
and exports print-size background plates (lines and tones on separate layers) and a manga page from the same sets.
Give it a story or a place and it designs the locations, builds them, lights them and picks the shots.
three.js + Canvas, a prop kit, bundled font (Gaegu, OFL) and synthesised sound: one page plays live and renders to a
1920×1080 MP4.

```bash
cd examples/lighthouse
node ../../scripts/render.mjs index.html --shots --scale .5     # each shot: clay, mid-wipe, manga → out/lighthouse-shot-*.png
node ../../scripts/render.mjs index.html --page --scale .6      # a manga page from the sets → out/lighthouse-page.png
node ../../scripts/check.mjs index.html                         # film shape, ink, tone, line stability, camera, determinism …
node ../../scripts/render.mjs index.html --plates               # line / tone / full plates at 2400 px → out/plates/
node ../../scripts/render.mjs index.html                        # 23.8 s film with sound → out/lighthouse.mp4 (~3 min)
node ../../scripts/new-piece.mjs ../../../my-sets               # start your own (write BRIEF.md, build scenes.js)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.
To watch a page live, serve its folder (`python3 -m http.server`); it is an ES module.

Starter: `templates/` 「세탁소집 딸」 (27 s): a neighbourhood laundry shop (garment rail, press, sewing machine, tiled
floor), the rooftop room with its washing lines and water tank, the alley stairs between stepping houses, and the bus
stop at night with a lit shop row.
Worked example: `examples/lighthouse/` 「등대지기의 섬」 (23.8 s): a spiral stair seen down its open well, a plank pier with
two fishing boats on a stroked sea, and the lamp room at night — see-through lantern glass, a glowing lens, beams that
scrape the sky's tone.

Format after an X post by the manga artist ぬこー様ちゃん (@nukosama):
https://x.com/nukosama/status/2123025321620644032?a=LlKRf28dkLpGafIAw10&s=19
Its locations, captions, manga page and AI-made models are not used; the sets, code and pieces here are this repo's own.
Live pages: https://jungrok5.github.io/motion-skills/manga-background-3d/
