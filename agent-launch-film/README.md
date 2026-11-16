# agent-launch-film

An AI-agent product launch film: a mascot object with a dot-matrix face wakes up, an input is typed and clicked, and
glass UI cards — a stack of what it learned, a carousel with a counter, a chat where it proposes and the user answers,
a swarm of outputs, a row of results, a ready button, before / after bars — float in a bright 3D space with soft glows,
depth-of-field and motion blur, handing over scene to scene by moving, never cutting. HTML/CSS pieces drawn in code
for the topic on a projected stage → a live looping page + a synthesised soundtrack (UI clicks, ticks, pops, whooshes
over a soft synth bed) + an MP4. Give it a product, an app or an agent; it writes the brief, designs the mascot, the
cards and the lines.

```bash
cd agent-launch-film/examples/bori
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --mascot --scale .5     # out/film-mascot.jpg: every screen, both turns, the avatar
node ../../scripts/render.mjs index.html --sheet --scale .4      # out/film-sheet.jpg: two moments of every scene
node ../../scripts/score.mjs index.html --out out/film.wav       # the sound
node ../../scripts/render.mjs index.html --audio out/film.wav    # out/film.mp4 (1920 × 1080, 30 fps, ≈ 49 s)

node ../../scripts/new-film.mjs ~/my-film                        # a new film from the template (「Tally」)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from https://x.com/UseFastlane/status/2116024028708196432?a=3dL47zV5VgDkc5ipWFw&s=19 (Fastlane's launch
film for an AI ad-making product; its grammar is the style — its product, helmet mascot, ads and footage are not part
of this skill). Worked example: `examples/bori` 「보리」, a meal-planning agent with a rice-cooker mascot; starting film:
`templates/film.html` 「Tally」.
Samples: https://jungrok5.github.io/motion-skills/agent-launch-film/
