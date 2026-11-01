# specimen-tour

Short vertical films that fly inside one specimen — a cut-open 3D model (three.js) toured part by part, the camera orbiting each
part and pulling back / pushing in between them, under a sci-fi HUD (title panel, live pill, typed caption card, locator, data rows),
with a rotating closed-specimen opening and an x-ray half-section. 9:16 shorts by default, `?ar=4:5` for the feed. Every frame is a
pure function of `t`: the page plays live in a browser and bakes to MP4 frame by frame. A Canvas 2D variant (painted plates) is included.

## Quick start
```bash
cp -r specimen-tour /tmp/try && cd /tmp/try
node scripts/render.mjs examples/plant-cell/index.html /tmp/try-stills --stills 1.4,7,21 --size 1080x1920
RENDER_ARGS='--size 1080x1920 --query rs=0.67' bash scripts/render-chunked.sh examples/plant-cell/index.html out/plant-cell.mp4 7 4
python3 -m http.server 8000   # then open http://localhost:8000/examples/plant-cell/
```

Requirements: Node 18+, Playwright + Chromium, ffmpeg.

Reference: `examples/plant-cell/` — a 28 s plant-cell tour, recreated in code from a reel whose pictures were AI-generated stills.
