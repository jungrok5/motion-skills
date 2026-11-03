# knit-diorama

A little world made entirely of yarn — patchwork fields stitched together, a ribbed sea, fuzzy pom-pom trees, knitted
cottages, a striped lighthouse — and the film of it knitting itself out of a yarn ball: the loose end is tugged, the ball
lifts and spins, needles ride the growing edge, and every prop flies out of the ball as the knit front reaches it. Then it
can unravel back into the ball for a seamless loop. One three.js page per scene plays live (drag to pull the thread) and
renders frame by frame to a 1920×1080 MP4.

```bash
cd examples/harbour
node ../../scripts/render.mjs index.html --stills 3,6,12 --scale .5   # preview stills → out/harbour-3.png …
node ../../scripts/render.mjs index.html --sheet 16 --scale .5        # 16 moments → out/harbour-sheet.jpg
node ../../scripts/check.mjs index.html                               # loads clean, deterministic, loop seam, rules
node ../../scripts/render.mjs index.html --workers 4                  # 20 s → out/harbour.mp4 (1920×1080, 30 fps)
node ../../scripts/new-scene.mjs ../../../my-world                    # start your own (or --from harbour)
```

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg. No network, no npm install. Fast on a GPU; on a CPU-only box
SwiftShader takes ~3–7 s per 1080p frame, so preview with half-size stills and render the MP4 once in the background.
To view a page live, serve its folder (`python3 -m http.server`) — it is an ES module.

Example: `examples/harbour/` 「Knitted Harbour」 (20 s loop: ball → tug → a harbour island knits itself → boats, smoke,
windmill, lighthouse beam → it unravels back into the ball). Idea from Kris Yang's *Yarn World*
(https://yarn.krisyang.dev); everything here is this repo's own code. Live pages: https://jungrok5.github.io/motion-skills/knit-diorama/
