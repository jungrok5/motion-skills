# perspective-illusion

A ~10 s seamless illustrated 3D loop in the Japanese perspective-illusion style: a clean line-art place squashed flat by a
telephoto lens opens into depth with dolly zooms, swings round to corner views that read flat and then turn 3D, and
similar objects swap depth (a row becomes a diagonal) while the view is flat. Ink lines, two-tone shading, hatched cast
shadows, a painted sky, GPU anti-aliasing and motion blur. Plain three.js in a browser page → MP4 + live page. Give it a
topic; it designs the place.

```bash
cd perspective-illusion/examples/country-platform
node ../../scripts/check.mjs index.html                       # check OK
node ../../scripts/render.mjs index.html --sheet --scale .4   # out/scene-sheet.jpg: every key + every move's middle
node ../../scripts/render.mjs index.html --preview            # out/scene-preview.mp4 (960 × 540)
node ../../scripts/render.mjs index.html                      # out/scene.mp4 (1920 × 1080, 10 s)
node ../../scripts/blink.mjs out/scene.mp4                    # blink map of the final

node ../../scripts/new-scene.mjs ~/my-loop                    # a new loop from the template (Corner Street)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from https://github.com/dotslashsimran/simcraft/blob/main/skills/video/perspective-illusion/SKILL.md (the
simcraft skill; its method rebuilt here with new code — that repo has no license, so nothing was copied). Worked example:
`examples/country-platform`; starting scene: `templates/scene.html`.
Samples: https://jungrok5.github.io/motion-skills/perspective-illusion/
