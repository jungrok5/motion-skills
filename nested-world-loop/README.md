# nested-world-loop

An endless one-take film of worlds inside worlds, written in three.js with no outside assets: the camera pushes into
an object in a room, flies through the world inside it, goes through a window, door or hatch there — and arrives back
in the first room, on the first frame. Give it a topic; it designs the ring (2–4 worlds, each at its own scale and in
its own light), and the engine joins them so every hand-off is invisible and the loop never cuts.

```bash
cp -r nested-world-loop /tmp/try && cd /tmp/try
node nested-world-loop/scripts/check.mjs nested-world-loop/starter                 # the gates, on the 2-world starter
node nested-world-loop/scripts/render.mjs nested-world-loop/examples/lighthouse-bottle --sheet 12 --scale .5
node nested-world-loop/scripts/render.mjs nested-world-loop/examples/lighthouse-bottle   # → out/lighthouse-bottle.mp4
node nested-world-loop/scripts/new-loop.mjs my-loop --title "My loop"              # a new project: write BRIEF.md first
(cd nested-world-loop && python3 -m http.server) # → http://localhost:8000/examples/lighthouse-bottle/ plays it live
```

Requirements: Node + Playwright Chromium (runs on SwiftShader, no GPU), ffmpeg.

Source: made from https://x.com/cfenghub/status/2125403596757905720?a=_ZUllhPlhe0rXEGbREU&s=19 (CF长风), which shares
Rez's film https://x.com/RezAIT00/status/2125285225769164985/video/1 — a world within a watch, in three.js with no
external assets. Worked example: `examples/lighthouse-bottle` 「병 속의 등대」 (keeper's cabin → the sea in a bottle →
the lantern room → back down the hatch into the cabin; ×1/400 per loop).
Samples: https://jungrok5.github.io/motion-skills/nested-world-loop/
