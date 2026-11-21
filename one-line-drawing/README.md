# one-line-drawing

A vertical film of a whole scene drawn in **one unbroken line** over a faded grey photo on a tablet. A white stylus
draws while the camera rides close behind the nib. The line outlines every subject with small loops at the corners,
steps along wires and ledges, zigzags across water and wet roads and down the reflections, and doubles back instead of
lifting. Then the photo fades and the clean line art sits on white with a looped signature. Everything is drawn in
code: the photo is painted from the same shapes the line traces, and people come from a jointed rig. Give it a topic
(a place with a person in it) and it designs a new scene and a new route for the line.

```bash
node one-line-drawing/scripts/new-piece.mjs my-piece            # starter 「Last Cast」 (or --from noodle-stall)
cd my-piece && python3 -m http.server 8000                      # watch live: http://localhost:8000/piece.html
node ../one-line-drawing/scripts/render.mjs piece.html --line   # the whole line by time, coverage gaps
node ../one-line-drawing/scripts/render.mjs piece.html --cast   # the figure turned four ways
node ../one-line-drawing/scripts/check.mjs piece.html           # one line, vocabulary, pace, camera, bodies
node ../one-line-drawing/scripts/render.mjs piece.html          # out/piece.mp4 (1080×1920, with sound)
```

Requirements: Node, Playwright Chromium, ffmpeg. No network, no npm install.

Source — made from an X post by 醉清风 (@Xin78787): https://x.com/Xin78787/status/2123707571890536673?a=HJt-M-U2a85DG5TpgNk&s=19
(a man with a double bass on a misty road, drawn in one line over the photo). Samples:
https://jungrok5.github.io/motion-skills/one-line-drawing/
