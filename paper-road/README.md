# paper-road

Papercraft stop-motion road trips drawn entirely in code: a toy car drives a paper road that is made just ahead of it —
unrolled from a paper roll over hills and round a loop, or inked onto the paper floor by a fountain pen — while cut-paper
mountains fold up, clouds drop in and a paper sun rises against a teal paper wall. Poses hold on twos with a little
per-pose jitter, so it reads as hand-animated. Each film is one HTML page that also plays live in the browser; the
renderer writes a 1920×1080 MP4 (with a soundtrack if you give it one).

```bash
cd examples/draw-a-road
node ../../scripts/render.mjs index.html --stills 4.4,10.5,17   # preview stills → out/draw-a-road-4.4.png …
node ../../scripts/render.mjs index.html --sheet 12              # 12 moments → out/draw-a-road-sheet.jpg
node ../../scripts/check.mjs index.html                          # deterministic, held poses, the scene's own rules
node ../../scripts/render.mjs index.html                         # 30 s → out/draw-a-road.mp4 (1920×1080, 24 fps)
node ../../scripts/new-scene.mjs ../../../my-trip                # start your own (or --from draw-a-road)
```

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install; 30 s renders in about two minutes on
a CPU.

Example: `examples/draw-a-road/` (30 s — "if the road ends, draw a new one": road's end, a paper roll, a hill, a loop, a
pen, a pull-back). Idea from an AI papercraft clip shared on X by @Artedeingenio; everything here is this repo's own code.
Live pages: https://jungrok5.github.io/motion-skills/paper-road/

Source (what this skill was made from): https://x.com/Artedeingenio/status/2117001260205543520
