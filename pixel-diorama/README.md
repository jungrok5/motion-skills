# pixel-diorama

Animated pixel-art dioramas that loop forever — a cozy little world on a rainy or snowy night, drawn entirely in code on a
480×270 canvas and scaled up crisp to 1080p (or 4K): rain and lightning, fire sparks, drifting smoke, flickering window and
lantern light, warm pockets against a cold night. Each scene is one HTML page that also runs live in the browser; the
renderer writes a one-loop MP4 with no visible seam, and `extend.mjs` repeats it into a 10-hour video for a lofi stream.

```bash
cd examples/halloween-rain
node ../../scripts/render.mjs index.html --stills 3,17.3 --scale 2   # preview stills → out/halloween-rain-3.png …
node ../../scripts/render.mjs index.html --sheet 8                    # 8 moments across the loop → out/halloween-rain-sheet.png
node ../../scripts/loop-check.mjs index.html                          # seek(LOOP) === seek(0), seam is an ordinary step
node ../../scripts/render.mjs index.html                              # one 60 s loop → out/halloween-rain.mp4 (1920×1080)
node ../../scripts/extend.mjs out/halloween-rain.mp4 --hours 10       # → out/halloween-rain-10h.mp4 (stream copy, seconds)
node ../../scripts/new-scene.mjs ../../../my-cover                    # start your own (or --from first-snow)
```

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install; a 60 s loop renders in about two
minutes on a CPU. Size: ~3 Mbps at 1080p with heavy rain (60 s ≈ 24 MB, 10 h ≈ 14 GB); `--crf 20` makes it smaller.

Examples: `examples/halloween-rain/` (60 s — the prompt from an X post: a pixel-art Halloween diorama as the looping cover of a
10-hour lofi video) and `examples/first-snow/` (40 s — the same kit in winter: aurora, pines, snowman, snowfall).
Live pages: https://jungrok5.github.io/motion-skills/pixel-diorama/
