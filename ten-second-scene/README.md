# ten-second-scene

One ten-second scene in ONE HTML file, picture and motion drawn entirely in code — no video model, no image model, no
outside images — and the loop that keeps it from looking like a code demo: render → five random moments looked at at
100 % → judged on density, light, people/proportion, weight of motion and colour → fix → render again, until one round
passes all 25 cells. Canvas 2D, WebGL strokes or three.js, chosen per scene; a shared human rig with planted
footsteps, breathing idles and a cast sheet. Give it a topic and it writes a brief and designs a new scene.

```bash
cd examples/first-bus
node ../../scripts/render.mjs scene.html --stills 0,5,9.5          # three stills → out/first-bus-*.png
node ../../scripts/audit.mjs scene.html --status                    # where the audit rounds stand (9 rounds, passed)
node ../../scripts/check.mjs scene.html                             # one file, code-only, determinism, people, audit …
node ../../scripts/render.mjs scene.html --cast                     # the cast turned both ways → out/first-bus-cast.png
node ../../scripts/render.mjs scene.html                            # 10 s, 1080×1920 → out/first-bus.mp4 (~1 min)
node ../../scripts/new-scene.mjs ../../../my-scene --renderer webgl --title "제목"   # start your own: brief first
node ../../scripts/audit.mjs ../../../my-scene/scene.html           # one round of the loop (then fill AUDIT.md)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. Canvas and WebGL scenes open from
the file; a three.js scene is an ES module — serve its folder (`python3 -m http.server`).

Examples (topics the source does not have): `examples/first-bus` 「첫차」 — Canvas 2D, the first bus pulling into a snowy
stop at 5 a.m. (9 rounds) · `examples/sunflower-wind` 「바람의 들판」 — WebGL, one gust across a sunflower field in 160,490
oil strokes (5 rounds) · `examples/stadium-wave` 「파도 응원」 — three.js, a Mexican wave through 2,622 people (6 rounds).

Made from a Threads post by @yunseul_ai: https://www.threads.com/share/BAbvjED_BX — the method (one HTML file, code
only, "if it looks like a code demo it failed", five random frames at 100 % against five criteria, repeat). Its three
pictures are not remade. three.js r170 is bundled under its MIT licence (`vendor/LICENSE`).
Live: https://jungrok5.github.io/motion-skills/ten-second-scene/
