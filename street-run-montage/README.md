# street-run-montage

A one-minute anime montage of a ride: one rider on a skateboard and an animal running with them cross a town on a clear
day, cut to a new camera on the beat (down the street, at the wheels, under the jump, at the face, from above, round a
trick) with the background streaking behind a sharp subject. Cel-shaded three.js in code, a synthesised groove and every
board and animal sound; outputs a live page and a 1920×1080 MP4. Give it a topic and it designs the rider, the companion,
the town, the tricks, the shots and the tune.

```bash
node street-run-montage/scripts/new-run.mjs my-run --from ferry-bell
cd my-run
node ../street-run-montage/scripts/check.mjs cast.html                        # the cast sheet: joints, reach, facing
node ../street-run-montage/scripts/check.mjs index.html                       # the film: every rule, the numbers
node ../street-run-montage/scripts/render.mjs index.html --sheet 16 --scale .5    # out/my-run-sheet.jpg
node ../street-run-montage/scripts/score.mjs index.html                       # out/my-run.wav
node ../street-run-montage/scripts/render.mjs index.html --audio out/my-run.wav   # out/my-run.mp4
python3 -m http.server   # → http://localhost:8000/ plays live with sound (♪)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.

Source: made from keshi's post on X — https://x.com/keshiAIart/status/2122300022280823089?a=XFn7wiVQgUnXUe0tASY&s=19
(a 60 s clip of a skater and a black cat running through a sunny autumn town). The form is rebuilt in code; the cast,
town and shots are not reused. Worked example: `examples/ferry-bell` 「The Ferry Bell」 (36.8 s, 16 shots).
Samples: https://jungrok5.github.io/motion-skills/street-run-montage/
