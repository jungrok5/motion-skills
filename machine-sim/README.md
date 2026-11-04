# machine-sim

Interactive 3D simulators of machines, built in three.js code: a walking tank, an engine, anything with joints. The page
is an engineering study sheet — white panels with live readouts computed from the same model that moves the parts, view
presets, and display modes (leader-line labels, solver overlay, x-ray, exploded view, isolate one part, orbit). A scripted
tour with a drawn cursor plays on load and bakes to a 1920×1080 MP4 frame by frame.

## Quick start
```bash
cp -r machine-sim /tmp/try && cd /tmp/try
python3 -m http.server 8000      # open http://localhost:8000/examples/walker/  (or /examples/engine/)
node scripts/render.mjs examples/walker/index.html /tmp/try-stills --stills 3,7.5,11.5,19.5,21.5
bash scripts/render-chunked.sh examples/walker/index.html out/walker.mp4 7 3 20
```

Requirements: Node 18+, Playwright + Chromium, ffmpeg.

Reference: `examples/walker/` recreates in code a screen recording of a three.js "quadruped tank" page posted on X;
`examples/engine/` is a single-cylinder four-stroke engine on the same kit.

Source (what this skill was made from): https://x.com/studio_oneroom/status/2116823414656618711
